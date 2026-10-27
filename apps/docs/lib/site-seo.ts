import { componentTasks } from './tasks';
import type { Metadata } from 'next';
import { releaseCatalog } from './first-release';
import { componentHref } from './site-paths';

export function parseSiteOrigin(value: string | undefined): string | undefined {
  if (!value?.trim()) return;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    /^127\./.test(url.hostname) ||
    url.hostname === '[::1]'
  ) {
    throw new Error(
      'SITE_ORIGIN must be the verified public HTTPS origin, without a path, credentials, query or fragment.',
    );
  }
  return url.origin;
}

// Build-time configuration. No guessed domain and no localhost canonical.
export const siteOrigin = parseSiteOrigin(process.env.SITE_ORIGIN);
export const siteDescription =
  'React components for application interfaces and AI workflows. Explore live examples, controlled APIs and scoped themes in Unseen UI by Stack Unseen.';
export const staticPaths = [
  '/',
  '/components/',
  '/docs/',
  '/getting-started/',
  '/docs/customization/',
  '/docs/tokens/',
  '/docs/integration/',
  '/docs/migrate-from-ai-elements/',
  '/docs/coding-agents/',
  '/docs/changelog/',
  '/patterns/',
  '/patterns/ai-sdk-chat/',
  '/patterns/agent-workbench/',
  '/patterns/coding-studio/',
  '/patterns/recoverable-chat/',
  '/patterns/action-receipts/',
  '/patterns/research-answers/',
  '/patterns/agent-operations/',
  '/templates/',
  '/templates/relay/',
  '/templates/saas-admin/',
  '/templates/evals/',
  '/templates/analytics/',
  '/templates/settings-billing/',
  '/templates/app-shells/',
  '/templates/marketing/',
  '/customize/',
  '/design/',
  '/legal/',
  '/tasks/',
  ...componentTasks.map((task) => `/tasks/${task.id}/`),
];
export const releasePagePaths = [
  '/',
  '/components/',
  '/docs/',
  '/getting-started/',
  '/docs/customization/',
  '/docs/tokens/',
  '/docs/integration/',
  '/docs/migrate-from-ai-elements/',
  '/docs/coding-agents/',
  '/docs/changelog/',
  '/templates/saas-admin/',
  '/customize/',
  '/design/',
  '/legal/',
  '/patterns/',
  '/patterns/ai-sdk-chat/',
  '/tasks/',
  ...componentTasks.map((task) => `/tasks/${task.id}/`),
];
// Additional examples retain their public URLs, but stay out of launch indexing.
export const indexablePaths = [
  ...releasePagePaths,
  ...releaseCatalog.map((entry) => componentHref(entry.name)),
];

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  origin = siteOrigin,
  /** A page-specific image, such as a component's captured preview; the site image otherwise. */
  pageImage?: { path: string; width: number; height: number; alt: string },
): Metadata {
  const fullTitle = `${title} | Unseen UI`;
  const image = origin ? `${origin}${pageImage?.path ?? '/social-preview.png'}` : undefined;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: origin ? { canonical: `${origin}${path}` } : undefined,
    robots: { index: Boolean(origin) && indexablePaths.includes(path), follow: Boolean(origin) },
    openGraph: {
      title: fullTitle,
      description,
      type: 'website',
      siteName: 'Unseen UI by Stack Unseen',
      locale: 'en_US',
      ...(origin ? { url: `${origin}${path}` } : {}),
      ...(image
        ? {
            images: [
              {
                url: image,
                width: pageImage?.width ?? 1200,
                height: pageImage?.height ?? 630,
                alt:
                  pageImage?.alt ??
                  'Unseen UI by Stack Unseen. React components for application interfaces and AI workflows.',
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
