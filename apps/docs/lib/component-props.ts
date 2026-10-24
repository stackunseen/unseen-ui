import manifest from '@stackunseen/ui/manifest.json';
import type { CatalogEntry } from './catalog';
import { componentImport } from './component-import';
import type { ManifestProp } from './component-markdown';

interface Export {
  name: string;
  kind: string;
  props?: ManifestProp[];
  inherits?: string[];
  sameAs?: string;
}
const entries = (manifest as { entries: { entry: string; exports: Export[] }[] }).entries;

/** A component's full prop list from the package manifest, following re-exports to the source. */
export function manifestProps(entry: CatalogEntry) {
  const imported = componentImport(entry);
  const at = `@stackunseen/ui${imported.path}`;
  const find = (where: string): Export | undefined =>
    entries
      .find((item) => item.entry === where)
      ?.exports.find((x) => x.name === imported.exportName);
  let found = find(at);
  if (found?.sameAs) found = find(found.sameAs);
  return {
    name: imported.exportName,
    props: found?.props ?? [],
    inherits: found?.inherits ?? [],
  };
}
