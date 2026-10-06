import type { MetadataRoute } from 'next';
import { siteOrigin } from '../lib/site-seo';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  return siteOrigin
    ? { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin}/sitemap.xml` }
    : { rules: { userAgent: '*', disallow: '/' } };
}
