import manifest from '@stackunseen/ui/manifest.json';
import { catalog } from '../../../lib/catalog';
import { componentImport } from '../../../lib/component-import';
import { componentSlug } from '../../../lib/site-paths';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface Export {
  name: string;
  kind: string;
  props?: { name: string; required?: boolean; type: string; description?: string }[];
  inherits?: string[];
  sameAs?: string;
}
const entries = (manifest as { entries: { entry: string; exports: Export[] }[] }).entries;

/** One small file per component, so a page fetches its props only when someone opens the list. */
export function generateStaticParams() {
  return catalog.map((entry) => ({ file: `${componentSlug(entry.name)}.json` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const entry = catalog.find((item) => `${componentSlug(item.name)}.json` === file);
  if (!entry) return new Response('Not found', { status: 404 });
  const imported = componentImport(entry);
  const at = `@stackunseen/ui${imported.path}`;
  const find = (where: string): Export | undefined =>
    entries
      .find((item) => item.entry === where)
      ?.exports.find((x) => x.name === imported.exportName);
  let found = find(at);
  if (found?.sameAs) found = find(found.sameAs);
  return Response.json({
    name: imported.exportName,
    props: found?.props ?? [],
    inherits: found?.inherits ?? [],
  });
}
