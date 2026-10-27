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
import './editorial.css';
import { SiteShell } from '../components/site-shell';
import { pageMetadata, siteDescription, siteOrigin } from '../lib/site-seo';
import { navWidthScript } from '../lib/nav-width';
// Hanken Grotesk (SIL Open Font License, public/fonts/hanken-grotesk-OFL.txt), self-hosted:
// the variable Latin file from @fontsource-variable/hanken-grotesk 5.3.0.
const hankenGrotesk = localFont({
  src: './fonts/hanken-grotesk-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-unseen',
  fallback: ['Arial'],
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
    <html lang="en" className={`${hankenGrotesk.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: navWidthScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
