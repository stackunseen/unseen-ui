import type { ReactNode } from 'react';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Migrate from AI Elements',
  'Move from Vercel AI Elements to Unseen UI: a component-by-component map, connecting the AI SDK useChat hook, and what changes about styling and approvals.',
  '/docs/migrate-from-ai-elements/',
);
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
