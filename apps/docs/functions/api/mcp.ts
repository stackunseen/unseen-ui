import { handleMcp } from '../../mcp/server';

/**
 * Cloudflare Pages Function at /api/mcp. Wrangler bundles this directory when `pages deploy`
 * runs from apps/docs; the static export is untouched. Site files are read through the
 * ASSETS binding, so the server always answers from the deployed pages.
 */
interface PagesContext {
  request: Request;
  env: { ASSETS: { fetch: (input: Request | string) => Promise<Response> } };
}
export const onRequest = (context: PagesContext) =>
  handleMcp(context.request, {
    fetchAsset: (path) => context.env.ASSETS.fetch(new URL(path, context.request.url).toString()),
  });
