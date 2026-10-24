import { catalog, catalogStyles } from '../../../lib/catalog';
import { manifestProps } from '../../../lib/component-props';
import { componentMarkdown } from '../../../lib/component-markdown';
import { componentUsage } from '../../../lib/component-usage';
import { registryOrigin } from '../../../lib/registry-items';
import { componentSlug } from '../../../lib/site-paths';

export const dynamic = 'force-static';
export const dynamicParams = false;

/**
 * Each component page as Markdown at /llms/<component>.md, for coding agents: the same text as the
 * page's "Copy page", with the example in its first state and style, plus every prop.
 */
export function generateStaticParams() {
  return catalog.map((entry) => ({ file: `${componentSlug(entry.name)}.md` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const entry = catalog.find((item) => `${componentSlug(item.name)}.md` === file);
  if (!entry) return new Response('Not found', { status: 404 });
  // Components without style options have no style list; their example takes no style prop.
  const { usage, packages } = componentUsage(
    entry,
    entry.states[0] ?? 'Default',
    catalogStyles(entry)?.[0] ?? '',
  );
  const body = componentMarkdown({
    entry,
    installLine: `npm install ${packages}`,
    usage,
    origin: registryOrigin,
    allProps: manifestProps(entry).props,
  });
  return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
