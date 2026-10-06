import type { MetadataRoute } from 'next';
import { indexablePaths, siteOrigin } from '../lib/site-seo';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return siteOrigin ? indexablePaths.map((path) => ({ url: `${siteOrigin}${path}` })) : [];
}
