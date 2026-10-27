import type { ReactNode } from 'react';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Use it with a coding agent',
  'How Claude Code, Cursor, ChatGPT or v0 can read Unseen UI: llms.txt, a Markdown page per component, the Copy prompt button, the component manifest and the MCP endpoint.',
  '/docs/coding-agents/',
);
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
