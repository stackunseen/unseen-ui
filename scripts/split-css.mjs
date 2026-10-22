// Per-entry stylesheets beside the full one (ADR 0028). The base build still writes styles.css
// with every base entry's styles; this adds dist/styles/core.css for the root entry and
// dist/styles/<entry>.css with only the rules that entry adds beyond core. Apps import core.css
// and the sheets for the entries they use, after it, instead of styles.css.
import { build } from 'vite';
import console from 'node:console';
import process from 'node:process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../packages/react/', import.meta.url));

// The base entries, read from the one list in vite.config.ts.
const configSource = await readFile(join(root, 'vite.config.ts'), 'utf8');
const entryBlock = configSource.slice(
  configSource.indexOf('export const baseEntries = {'),
  configSource.indexOf('} as const;'),
);
const baseEntries = Object.fromEntries(
  [...entryBlock.matchAll(/^\s*'?([a-z-]+)'?: '([^']+)'/gm)].map(([, name, path]) => [name, path]),
);
if (!baseEntries.index) throw new Error('Could not read baseEntries from vite.config.ts.');

/** Top-level rules, with at-rule blocks such as @media kept whole. */
function rules(css) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) {
      out.push(css.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return out;
}

const work = await mkdtemp(join(tmpdir(), 'ui-css-'));
const sheets = {};
try {
  for (const name of Object.keys(baseEntries)) {
    const outDir = join(work, name);
    process.env.UI_CSS_ENTRY = name;
    process.env.UI_CSS_OUT = outDir;
    await build({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'silent' });
    const files = await readdir(outDir);
    sheets[name] = files.includes('entry.css') ? await readFile(join(outDir, 'entry.css'), 'utf8') : '';
  }
} finally {
  delete process.env.UI_CSS_ENTRY;
  delete process.env.UI_CSS_OUT;
  await rm(work, { recursive: true, force: true });
}

const target = join(root, 'dist', 'styles');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const core = rules(sheets.index);
const inCore = new Set(core);
await writeFile(join(target, 'core.css'), core.join('\n') + '\n');
const written = ['core'];
for (const [name, css] of Object.entries(sheets)) {
  if (name === 'index') continue;
  const own = rules(css).filter((rule) => !inCore.has(rule));
  if (own.length === 0) continue;
  await writeFile(join(target, `${name}.css`), own.join('\n') + '\n');
  written.push(name);
}
console.log(`Per-entry stylesheets: ${written.join(', ')}`);
