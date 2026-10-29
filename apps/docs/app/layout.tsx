import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import '@stackunseen/ui/styles.css';
import './globals.css';
import '../components/explorer.css';
import './website.css';
import './typography.css';
import './home.css';
import './polish.css';
import './system.css';
import { SiteShell } from '../components/site-shell';
import { pageMetadata, siteDescription, siteOrigin } from '../lib/site-seo';
import { navWidthScript } from '../lib/nav-width';
// IBM Plex Sans (SIL Open Font License, public/fonts/ibm-plex-sans-OFL.txt), self-hosted: the Latin
// 400 to 700 static files from @fontsource/ibm-plex-sans 5.3.0. Static cuts carry TrueType hinting,
// so text stays dark and even on 1x Windows screens where unhinted variable fonts go soft.
const plexSans = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-unseen',
  fallback: ['Segoe UI', 'Arial'],
});
// IBM Plex Mono (SIL Open Font License, public/fonts/ibm-plex-mono-OFL.txt), self-hosted: the Latin
// 400 and 500 files from @fontsource/ibm-plex-mono 5.3.0. Labels, counts, versions and code.
const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-500.woff2', weight: '500', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-unseen-mono',
  fallback: ['Consolas', 'monospace'],
});
export const metadata: Metadata = {
  ...pageMetadata('React components for applications and AI', siteDescription, '/'),
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: navWidthScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
