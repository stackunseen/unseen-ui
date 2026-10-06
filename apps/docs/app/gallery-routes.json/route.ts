import { catalog } from '../../lib/catalog';
import { componentHref, viewPaths } from '../../lib/site-paths';
export const dynamic = 'force-static';
export function GET() {
  return Response.json({
    views: viewPaths,
    components: Object.fromEntries(catalog.map((entry) => [entry.name, componentHref(entry.name)])),
  });
}
