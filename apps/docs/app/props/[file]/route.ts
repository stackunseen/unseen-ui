import { catalog } from '../../../lib/catalog';
import { manifestProps } from '../../../lib/component-props';
import { componentSlug } from '../../../lib/site-paths';

export const dynamic = 'force-static';
export const dynamicParams = false;

/** One small file per component, so a page fetches its props only when someone opens the list. */
export function generateStaticParams() {
  return catalog.map((entry) => ({ file: `${componentSlug(entry.name)}.json` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const entry = catalog.find((item) => `${componentSlug(item.name)}.json` === file);
  if (!entry) return new Response('Not found', { status: 404 });
  return Response.json(manifestProps(entry));
}
