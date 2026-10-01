import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@ai-interaction/react/styles.css';
import '@ai-interaction/react/terminal.css';
import 'katex/dist/katex.min.css';
import './globals.css';
import '../components/explorer.css';
export const metadata: Metadata = {
  description:
    'Unseen UI by Stack Unseen: React components for conversations, tool execution, human review and application controls.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
