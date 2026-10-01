import type { ReactNode } from 'react';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Getting started · Unseen UI' };
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <main className="docs-article">{children}</main>;
}
