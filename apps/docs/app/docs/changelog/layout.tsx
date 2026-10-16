import type { ReactNode } from 'react';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Changelog',
  'What changed in each Unseen UI prerelease, newest first, and what is ready for the next one.',
  '/docs/changelog/',
);
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
