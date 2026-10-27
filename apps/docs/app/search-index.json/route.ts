import { buildSearchIndex } from '../../lib/search-index';
export const dynamic = 'force-static';
/** The command palette fetches this once per visit instead of bundling the catalog. */
export function GET() {
  return Response.json(buildSearchIndex());
}
