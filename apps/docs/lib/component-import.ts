import type { CatalogEntry } from './catalog';

/** Entries that live in their own optional entry rather than the one their category implies. */
const entryPaths: Record<string, string> = {
  MarkdownCodeBlock: '/code',
  MarkdownResponse: '/markdown',
  MathFormula: '/math',
  MermaidDiagram: '/mermaid',
  RichMarkdownResponse: '/rich-markdown',
};
/** Catalog names that differ from the exported component. */
const exportNames: Record<string, string> = {
  ScopeGrant: 'ScopeGrantList',
};
/** Entries whose stylesheet is separate from the base one. */
const styledEntries = new Set([
  '/application',
  '/marketing',
  '/navigation',
  '/conversation-flow',
  '/mcp-apps',
  '/chat',
]);

/** Where a catalog entry is imported from and under which name. */
export function componentImport(entry: Pick<CatalogEntry, 'name' | 'importPath'>) {
  const path = entryPaths[entry.name] ?? entry.importPath ?? '';
  const exportName = exportNames[entry.name] ?? entry.name;
  return {
    path,
    exportName,
    line: `import { ${exportName} } from '@stackunseen/ui${path}';`,
    stylesheet: styledEntries.has(path) ? `@stackunseen/ui${path}.css` : undefined,
  };
}

/** Import lines for several entries, one per entry point, base stylesheet first. */
export function importBlock(entries: readonly Pick<CatalogEntry, 'name' | 'importPath'>[]) {
  const byPath = new Map<string, string[]>();
  const sheets = new Set<string>(['@stackunseen/ui/styles.css']);
  for (const entry of entries) {
    const { path, exportName, stylesheet } = componentImport(entry);
    byPath.set(path, [...(byPath.get(path) ?? []), exportName]);
    if (stylesheet) sheets.add(stylesheet);
  }
  return [
    ...[...byPath.entries()].map(
      ([path, names]) =>
        `import { ${[...new Set(names)].join(', ')} } from '@stackunseen/ui${path}';`,
    ),
    ...[...sheets].map((sheet) => `import '${sheet}';`),
  ].join('\n');
}
