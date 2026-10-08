import Link from 'next/link';
import { pageMetadata } from '../lib/site-seo';
export const metadata = {
  ...pageMetadata(
    'Page not found',
    'Find Unseen UI components and documentation from the catalog or homepage.',
    '/404/',
  ),
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};
export default function NotFound() {
  return (
    <main id="main-content" className="web-container missing-page" tabIndex={-1}>
      <p className="web-eyebrow">404</p>
      <h1>We could not find that page.</h1>
      <p>Browse the component catalog or pick up the getting started guide.</p>
      <div className="web-actions">
        <Link className="web-button primary" href="/components/">
          Browse components
        </Link>
        <Link className="web-button secondary" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
