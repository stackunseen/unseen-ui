import type { ReactNode } from 'react';
import { DocsFrame } from '../../components/docs-frame';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Getting started',
  'Set up a local Unseen UI build or matching package archives, render a working React example, and choose the right imports, stylesheets and optional peers.',
  '/getting-started/',
);
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsFrame>{children}</DocsFrame>;
}
