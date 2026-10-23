import type { ReactNode } from 'react';
import { DocsFrame } from '../../components/docs-frame';
export default function Layout({ children }: { children: ReactNode }) {
  return <DocsFrame guide>{children}</DocsFrame>;
}
