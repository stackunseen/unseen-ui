// The component manifest: every public export of @stackunseen/ui, read from the built type
// declarations, with each component's own props and every --ai-* CSS variable the styles read.
// Agents and people look a component up here instead of guessing its API.
//
//   node scripts/component-manifest.mjs           writes packages/react/manifest.json
//   node scripts/component-manifest.mjs --check   fails when the file is out of date
//
// Run after `pnpm build:packages`; the declarations in packages/react/dist are the input.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(repo, 'packages/react');
const outFile = path.join(pkgDir, 'manifest.json');
const variablesFile = path.join(pkgDir, 'css-variables.json');
const conventionsFile = path.join(pkgDir, 'conventions.json');
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

const TYPE_LIMIT = 200;
const clip = (text, limit = TYPE_LIMIT) =>
  text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
const firstSentence = (text) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const end = flat.search(/[.!?](\s|$)/);
  return clip(end === -1 ? flat : flat.slice(0, end + 1), 240);
};

/** Entry points with their declaration files, in package order. */
function entries() {
  return Object.entries(pkg.exports)
    .filter(([, spec]) => typeof spec === 'object' && spec.types)
    .map(([key, spec]) => ({
      entry: key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`,
      file: path.join(pkgDir, spec.types),
    }));
}

/**
 * Where a prop is declared: this library's own props are listed; props a component passes
 * through from React's DOM attributes or a Radix primitive are summarised as `inherits`.
 */
function origin(symbol) {
  const file = symbol.declarations?.[0]?.getSourceFile().fileName.replaceAll('\\', '/') ?? '';
  if (file.includes('/@types/react') || file.includes('/csstype')) return 'HTML attributes';
  if (file.includes('/@radix-ui/')) return 'Radix primitive props';
  if (file.includes('/node_modules/') && !file.includes('/@stackunseen/'))
    return 'third-party props';
  return 'own';
}

/** Props of one or more prop shapes: a union, or a component's overloads, merged. */
function propsOf(checker, types, at) {
  const members = types.flatMap((type) => (type.isUnion() ? type.types : [type]));
  const merged = new Map();
  const inherits = new Set();
  for (const member of members) {
    for (const prop of checker.getPropertiesOfType(member)) {
      const from = origin(prop);
      if (from !== 'own') {
        inherits.add(from);
        continue;
      }
      const required = !(prop.flags & ts.SymbolFlags.Optional);
      const known = merged.get(prop.name);
      const text = checker.typeToString(
        checker.getTypeOfSymbolAtLocation(prop, at),
        at,
        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      );
      if (known) {
        // In a union of prop shapes a prop is required only when every shape requires it.
        known.required = known.required && required;
        if (!known.type.includes(text)) known.type = clip(`${known.type} | ${text}`);
        continue;
      }
      const doc = firstSentence(ts.displayPartsToString(prop.getDocumentationComment(checker)));
      merged.set(prop.name, {
        name: prop.name,
        required,
        type: clip(text.replace(/\s+/g, ' ')),
        ...(doc ? { description: doc } : {}),
      });
    }
  }
  if (members.length > 1)
    for (const prop of merged.values())
      if (members.some((m) => !checker.getPropertyOfType(m, prop.name))) prop.required = false;
  // Optional is the default: only required props say so, and "| undefined" goes from their types.
  for (const prop of merged.values()) {
    if (prop.required) continue;
    delete prop.required;
    prop.type = prop.type.replace(/ \| undefined$/, '');
  }
  return {
    props: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
    ...(inherits.size ? { inherits: [...inherits].sort() } : {}),
  };
}

function describe(checker, symbol, at) {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const name = symbol.name;
  const doc = firstSentence(ts.displayPartsToString(target.getDocumentationComment(checker)));
  const base = { name, ...(doc ? { description: doc } : {}) };
  if (!(target.flags & ts.SymbolFlags.Value)) return { ...base, kind: 'type' };
  const type = checker.getTypeOfSymbolAtLocation(target, at);
  const calls = type.getCallSignatures();
  if (/^use[A-Z]/.test(name)) return { ...base, kind: 'hook' };
  if (/^[A-Z]/.test(name) && calls.length) {
    // Overloads (a legacy and a scoped prop shape, say) are merged into one list.
    const shapes = calls
      .map((call) => call.getParameters()[0])
      .filter(Boolean)
      .map((param) => checker.getTypeOfSymbolAtLocation(param, at));
    return {
      ...base,
      kind: 'component',
      ...(shapes.length ? propsOf(checker, shapes, at) : { props: [] }),
      ...(calls.length > 1 ? { overloads: calls.length } : {}),
    };
  }
  if (/^[A-Z]/.test(name)) {
    // A compound component such as DropdownMenu: an object of parts.
    const parts = checker
      .getPropertiesOfType(type)
      .filter((p) => checker.getTypeOfSymbolAtLocation(p, at).getCallSignatures().length)
      .map((p) => p.name);
    if (parts.length && parts.every((p) => /^[A-Z]/.test(p)))
      return { ...base, kind: 'compound', parts };
    return { ...base, kind: 'constant' };
  }
  return { ...base, kind: calls.length ? 'function' : 'constant' };
}

/** Every --ai-* variable the stylesheets read, with its fallbacks and the files that read it. */
function cssUsage() {
  const usage = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.css')) {
        const css = readFileSync(full, 'utf8');
        const where = path.relative(path.join(pkgDir, 'src'), full).replaceAll('\\', '/');
        for (const match of css.matchAll(
          /var\((--ai-[a-z0-9-]+)\s*(?:,\s*([^;{}]*?))?\)(?=[\s;,)}])/g,
        )) {
          const entry = usage.get(match[1]) ?? { fallbacks: new Map(), files: new Set() };
          if (match[2] && !match[2].includes('var(')) {
            const fallback = match[2].trim();
            entry.fallbacks.set(fallback, (entry.fallbacks.get(fallback) ?? 0) + 1);
          }
          entry.files.add(where);
          usage.set(match[1], entry);
        }
      }
    }
  };
  walk(path.join(pkgDir, 'src'));
  return usage;
}

async function themeValues() {
  const theme = await import(pathToFileURL(path.join(pkgDir, 'dist/theme.js')).href);
  return theme.defaultTheme;
}

export async function buildManifest() {
  const list = entries();
  const program = ts.createProgram(
    list.map((e) => e.file),
    {
      strict: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      noEmit: true,
    },
  );
  const checker = program.getTypeChecker();
  const entryList = [];
  for (const { entry, file } of list) {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module)
      throw new Error(`No declarations for ${entry} at ${file}. Run pnpm build:packages.`);
    const exports = checker
      .getExportsOfModule(module)
      .map((symbol) => describe(checker, symbol, source))
      .sort((a, b) => a.name.localeCompare(b.name));
    entryList.push({ entry, exports });
  }
  // A component exported from several entries is described once, at its first entry.
  const first = new Map();
  for (const item of entryList)
    item.exports = item.exports.map((x) => {
      if (x.kind === 'type') return x;
      const key = `${x.kind}:${x.name}`;
      if (!first.has(key)) {
        first.set(key, item.entry);
        return x;
      }
      return { name: x.name, kind: x.kind, sameAs: first.get(key) };
    });

  const documented = JSON.parse(readFileSync(variablesFile, 'utf8'));
  const usage = cssUsage();
  const theme = await themeValues();
  const variables = Object.entries(documented.variables).map(([name, info]) => {
    const key = name.slice('--ai-'.length);
    const used = usage.get(name);
    const fallback = used && [...used.fallbacks.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      name,
      group: info.group,
      purpose: info.purpose,
      ...(theme.light[key] ? { light: theme.light[key], dark: theme.dark[key] } : {}),
      ...(info.default ? { default: info.default } : fallback ? { default: fallback } : {}),
      ...(info.setBy ? { setBy: info.setBy } : {}),
      readBy: used ? [...used.files].sort() : [],
    };
  });
  return {
    package: pkg.name,
    note: 'Generated by scripts/component-manifest.mjs from the published type declarations. Do not edit.',
    conventions: (({ $comment, ...rest }) => rest)(
      JSON.parse(readFileSync(conventionsFile, 'utf8')),
    ),
    entries: entryList,
    cssVariables: variables,
  };
}

/** Readable in a diff and compact: top-level keys indented, one export or variable per line. */
export function serialize(manifest) {
  const { entries: list, cssVariables, ...head } = manifest;
  const lines = Object.entries(head).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  const entryText = list
    .map(
      (item) =>
        `    { "entry": ${JSON.stringify(item.entry)}, "exports": [\n${item.exports.map((x) => `      ${JSON.stringify(x)}`).join(',\n')}\n    ] }`,
    )
    .join(',\n');
  lines.push(`  "entries": [\n${entryText}\n  ]`);
  lines.push(
    `  "cssVariables": [\n${cssVariables.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`,
  );
  return `{\n${lines.join(',\n')}\n}\n`;
}

/** Variables read by the styles but missing from css-variables.json, and documented ones nothing reads. */
export function variableDrift() {
  const variables = JSON.parse(readFileSync(variablesFile, 'utf8')).variables;
  const documented = new Set(Object.keys(variables));
  const used = new Set(cssUsage().keys());
  return {
    undocumented: [...used].filter((name) => !documented.has(name)).sort(),
    // Theme variables are public for hosts even when no library stylesheet reads them.
    unused: [...documented]
      .filter((name) => !used.has(name) && variables[name].setBy !== 'theme')
      .sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const drift = variableDrift();
  if (drift.undocumented.length) {
    console.error(
      `Document these CSS variables in packages/react/css-variables.json:\n  ${drift.undocumented.join('\n  ')}`,
    );
    process.exit(1);
  }
  if (drift.unused.length) {
    console.error(
      `No stylesheet reads these documented variables:\n  ${drift.unused.join('\n  ')}`,
    );
    process.exit(1);
  }
  const text = serialize(await buildManifest());
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(outFile, 'utf8');
    } catch {
      // Missing counts as stale.
    }
    if (current.replace(/\r\n/g, '\n') !== text) {
      console.error(
        'packages/react/manifest.json is out of date. Run `pnpm manifest` after `pnpm build:packages` and commit it.',
      );
      process.exit(1);
    }
    console.log('PASS: component manifest matches the published types and styles.');
  } else {
    writeFileSync(outFile, text);
    const kb = (Buffer.byteLength(text) / 1024).toFixed(1);
    console.log(`Wrote packages/react/manifest.json (${kb} KB).`);
  }
}
