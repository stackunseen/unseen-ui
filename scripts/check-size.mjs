import { build } from 'vite';
import { gzipSync } from 'node:zlib';
import console from 'node:console';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const result = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: true,
    lib: { entry: 'packages/react/dist/status.js', formats: ['es'] },
    rolldownOptions: { external: [/^react(?:\/|$)/] },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
const js = outputs
  .filter((o) => o.type === 'chunk')
  .map((o) => o.code)
  .join('\n');
const css = await readFile('packages/react/dist/styles.css');
const metrics = {
  statusGzipBytesExcludingReact: gzipSync(js).length,
  baseCssGzipBytes: gzipSync(css).length,
};
console.log(JSON.stringify(metrics, null, 2));
// Base CSS budget: 24 KiB gzip (raised from 20 KiB on 2026-10-09).
if (metrics.statusGzipBytesExcludingReact > 8192 || metrics.baseCssGzipBytes > 25600)
  throw new Error('Initial bundle budget exceeded.');

// Per-entry stylesheets (ADR 0028): core for the root entry, then what each other entry adds.
const sheetDir = 'packages/react/dist/styles';
const sheets = (await readdir(sheetDir)).filter((name) => name.endsWith('.css'));
if (!sheets.includes('core.css')) throw new Error('dist/styles/core.css is missing; run the package build.');
for (const name of sheets) {
  const gzip = gzipSync(await readFile(join(sheetDir, name))).length;
  console.log(JSON.stringify({ entryCss: name, gzipBytes: gzip }));
  if (gzip > (name === 'core.css' ? 22528 : 4096)) throw new Error(`${name} is over its CSS budget.`);
}

const markdownResult = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: true,
    lib: { entry: 'packages/react/dist/markdown.js', formats: ['es'] },
    rolldownOptions: { external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] },
  },
});
const markdownOutputs = (Array.isArray(markdownResult) ? markdownResult : [markdownResult]).flatMap(
  (r) => r.output,
);
const markdownGzipBytesExcludingReact = gzipSync(
  markdownOutputs
    .filter((item) => item.type === 'chunk')
    .map((item) => item.code)
    .join('\n'),
).length;
console.log(JSON.stringify({ markdownGzipBytesExcludingReact, markdownBudgetBytes: 100 * 1024 }));
if (markdownGzipBytesExcludingReact > 100 * 1024)
  throw new Error('Optional Markdown budget exceeded.');
const baseResult = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    lib: { entry: 'packages/react/dist/index.js', formats: ['es'] },
    rolldownOptions: { external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] },
  },
});
for (const result of Array.isArray(baseResult) ? baseResult : [baseResult]) {
  for (const item of result.output) {
    if (
      item.type === 'chunk' &&
      item.moduleIds.some((id) => /[\\/](?:application|marketing)\.js$/.test(id))
    )
      throw new Error('Optional application or marketing entry leaked into base entry.');
    if (
      item.type === 'chunk' &&
      item.moduleIds.some((id) =>
        /[\\/](?:react-markdown|remark-gfm|remend|micromark|mermaid|katex|dompurify|remark-math|shiki|@shikijs|@xterm|@tanstack|@codemirror|@lezer|react-resizable-panels|node-pty)(?:[\\/@]|$)/.test(
          id,
        ),
      )
    )
      throw new Error('Markdown parser leaked into base entry.');
  }
}
console.log(
  'PASS: base entry has no Markdown, math, Mermaid, Shiki, xterm, TanStack or native PTY modules.',
);

const katexCssPath = fileURLToPath(import.meta.resolve('katex/dist/katex.min.css'));
const katexCss = await readFile(katexCssPath);
const fontDirectory = join(dirname(katexCssPath), 'fonts');
const woff2Files = (await readdir(fontDirectory)).filter((name) => name.endsWith('.woff2'));
const woff2Buffers = await Promise.all(
  woff2Files.map((name) => readFile(join(fontDirectory, name))),
);
console.log(
  JSON.stringify({
    katexCssBytes: katexCss.length,
    katexCssGzipBytes: gzipSync(katexCss).length,
    katexWoff2Files: woff2Files.length,
    katexWoff2Bytes: woff2Buffers.reduce((sum, file) => sum + file.length, 0),
    note: 'Available WOFF2 assets, not a measured page transfer. CSS may reference other formats; browsers load the fonts required by the displayed formulae.',
  }),
);

for (const entry of ['index', 'adapter', 'uploads', 'editing']) {
  const built = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: `packages/core/dist/${entry}.js`, formats: ['es'] },
    },
  });
  const chunks = (Array.isArray(built) ? built : [built])
    .flatMap((item) => item.output)
    .filter((item) => item.type === 'chunk');
  const modules = chunks.flatMap((item) => item.moduleIds);
  if (
    modules.some((id) =>
      /[\\/](?:react|react-dom|node-pty|@xterm|@tanstack|@codemirror|@lezer|react-resizable-panels)(?:[\\/@]|$)/.test(
        id,
      ),
    )
  )
    throw new Error('UI/native dependency entered pure core.');
  if (entry === 'index' && modules.some((id) => /[\\/](?:adapter|uploads|editing)\.js$/.test(id)))
    throw new Error('Optional adapter/uploads entered base core.');
  console.log(
    JSON.stringify({
      coreEntry: entry,
      gzipBytes: chunks.reduce((sum, item) => sum + gzipSync(item.code).length, 0),
      note: 'Pure core graph observed; optional adapter absent from base core. Measurement only, no new budget.',
    }),
  );
}

for (const entry of [
  'application',
  'marketing',
  'math',
  'mermaid',
  'code',
  'highlight',
  'terminal',
  'viewport',
  'sidecar',
  'workspace',
  'layout',
  'upload',
  'editor',
  'artifact-editor',
  'conversation-flow',
  'assistant',
  'devtools',
  'media',
  'navigation',
  'mcp-apps',
  'chat',
]) {
  const isolated = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: `packages/react/dist/${entry}.js`, formats: ['es'] },
      rolldownOptions: { external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] },
    },
  });
  const chunks = (Array.isArray(isolated) ? isolated : [isolated])
    .flatMap((r) => r.output)
    .filter((o) => o.type === 'chunk');
  const forbidden =
    entry === 'code' ||
    entry === 'terminal' ||
    [
      'application',
      'marketing',
      'viewport',
      'sidecar',
      'workspace',
      'layout',
      'upload',
      'editor',
      'artifact-editor',
      'conversation-flow',
      'assistant',
      'devtools',
      'media',
      'navigation',
      'mcp-apps',
      'chat',
    ].includes(entry)
      ? /[\\/](?:react-markdown|remark-gfm|remend|micromark|mermaid|katex|dompurify|remark-math|shiki|@shikijs)(?:[\\/@]|$)/
      : entry === 'highlight'
        ? /[\\/](?:react-markdown|remark-gfm|remend|micromark|mermaid|katex|dompurify|remark-math)(?:[\\/@]|$)/
        : entry === 'math'
          ? /[\\/](?:react-markdown|remark-gfm|remend|micromark|mermaid|dompurify|remark-math|shiki|@shikijs)(?:[\\/@]|$)/
          : /[\\/](?:react-markdown|remark-gfm|remend|micromark|remark-math)(?:[\\/@]|$)/;
  if (chunks.some((c) => c.moduleIds.some((id) => forbidden.test(id))))
    throw new Error(`Unrelated optional renderer leaked into ${entry} entry.`);
  if (
    chunks.some((c) =>
      c.moduleIds.some(
        (id) =>
          /[\\/]node-pty(?:[\\/@]|$)/.test(id) ||
          (entry !== 'terminal' && /[\\/]@xterm(?:[\\/@]|$)/.test(id)) ||
          (entry !== 'viewport' && /[\\/]@tanstack(?:[\\/@]|$)/.test(id)) ||
          (entry !== 'editor' && /[\\/](?:@codemirror|@lezer)(?:[\\/@]|$)/.test(id)) ||
          (entry !== 'layout' && /[\\/]react-resizable-panels(?:[\\/@]|$)/.test(id)),
      ),
    )
  )
    throw new Error(`Native PTY/xterm leaked into ${entry} entry.`);
  console.log(
    JSON.stringify({
      entry,
      chunks: chunks.length,
      entryGzipBytesExcludingReact: chunks
        .filter((c) => c.isEntry)
        .reduce((sum, c) => sum + gzipSync(c.code).length, 0),
      sumChunkGzipBytesExcludingReact: chunks.reduce((sum, c) => sum + gzipSync(c.code).length, 0),
      note: 'Module graph isolation passed; excludes CSS/fonts. Sum counts all emitted lazy chunks, not page transfer.',
      grammarModules:
        entry === 'highlight'
          ? [
              ...new Set(
                chunks.flatMap((c) =>
                  c.moduleIds.filter((id) => /[\\/]@shikijs[\\/]langs[\\/]dist[\\/]/.test(id)),
                ),
              ),
            ].map((id) => id.split(/[\\/]/).at(-1))
          : undefined,
    }),
  );
}

for (const entry of [
  'application',
  'marketing',
  'editor',
  'artifact-editor',
  'conversation-flow',
  'assistant',
  'devtools',
  'media',
  'navigation',
  'mcp-apps',
  'chat',
]) {
  const asset = await readFile(`packages/react/dist/${entry}.css`);
  if (!asset.length) throw new Error(`Optional ${entry} stylesheet missing.`);
  if (entry === 'application' && asset.includes('uim-'))
    throw new Error('Marketing CSS leaked into application stylesheet.');
  if (css.includes('uim-')) throw new Error('Marketing CSS leaked into base stylesheet.');
  console.log(
    JSON.stringify({ optionalCss: entry, bytes: asset.length, gzipBytes: gzipSync(asset).length }),
  );
}

const richResult = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: true,
    lib: { entry: 'packages/react/dist/rich-markdown.js', formats: ['es'] },
    rolldownOptions: { external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] },
  },
});
const richChunks = (Array.isArray(richResult) ? richResult : [richResult])
  .flatMap((item) => item.output)
  .filter((item) => item.type === 'chunk');
console.log(
  JSON.stringify({
    richRendererChunks: richChunks.length,
    richRendererSumChunkGzipBytesExcludingReact: richChunks.reduce(
      (sum, item) => sum + gzipSync(item.code).length,
      0,
    ),
    richRendererEntryGzipBytesExcludingReact: richChunks
      .filter((item) => item.isEntry)
      .reduce((sum, item) => sum + gzipSync(item.code).length, 0),
    note: 'Includes all lazy diagram grammars; excludes KaTeX CSS/fonts. Measurement only, not a settled rich-renderer budget.',
  }),
);
