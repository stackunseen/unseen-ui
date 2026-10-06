import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import '@stackunseen/ui/styles.css';
import './globals.css';
import '../components/explorer.css';
import './website.css';
import './typography.css';
import './home.css';
import { SiteShell } from '../components/site-shell';
import { pageMetadata, siteDescription, siteOrigin } from '../lib/site-seo';
const instrumentSans = localFont({
  src: './fonts/instrument-sans-latin.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-unseen',
  fallback: ['Arial'],
});
export const metadata: Metadata = {
  ...pageMetadata('React components for applications and AI', siteDescription, '/'),
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
