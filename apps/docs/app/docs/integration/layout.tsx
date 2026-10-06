import type { ReactNode } from 'react';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Connect components to your app',
  'Learn how Unseen UI props and callbacks connect to React state and server actions, including approvals, errors and lost connections.',
  '/docs/integration/',
);
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
