import type { ReactNode } from 'react';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Themes and icons',
  'Customize Unseen UI colors, spacing and icons. Build custom Modal headers and footers, compose Card content and export light and dark palettes.',
  '/docs/customization/',
);
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
