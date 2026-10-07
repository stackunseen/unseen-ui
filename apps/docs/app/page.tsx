import { ArrowRight } from 'lucide-react';
import { HomeShowcase } from '../components/home-showcase';
import { HomeFinder } from '../components/home-finder';
import { HomeAppExample } from '../components/home-app-example';
import { LegacyGalleryRedirect } from '../components/legacy-gallery-redirect';
import { aliases } from '../lib/catalog';
import { releaseCatalog } from '../lib/first-release';
import { componentSection, navigationGroup } from '../lib/gallery-navigation';
import { componentHref } from '../lib/site-paths';
import { siteOrigin } from '../lib/site-seo';
export default function Page() {
  const entries = releaseCatalog.map((entry) => ({
    name: entry.name,
    description: entry.description,
    href: componentHref(entry.name),
    section: componentSection(entry),
    group: navigationGroup(entry),
    terms: [
      entry.name,
      entry.description,
      entry.category,
      navigationGroup(entry),
      ...(entry.aliases ?? []),
      ...(aliases[entry.name] ?? []),
    ]
      .join(' ')
      .toLowerCase(),
  }));
  return (
    <>
      <LegacyGalleryRedirect />
      {siteOrigin && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Unseen UI',
              alternateName: 'Unseen UI by Stack Unseen',
              url: `${siteOrigin}/`,
              description: 'A React component library for application interfaces and AI workflows.',
              publisher: { '@type': 'Organization', name: 'Stack Unseen' },
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <main id="main-content" className="web-container home-page" tabIndex={-1}>
        <header className="home-intro">
          <p className="web-eyebrow">Unseen UI / React + TypeScript</p>
          <h1>Compose an interface.</h1>
          <p className="home-intro-description">
            {releaseCatalog.length} React components for forms, layouts and AI workflows.
            <br className="home-desktop-break" /> Try them below, then connect them to your app.
          </p>
          <div className="home-intro-meta">
            <span>Experimental alpha · On npm as @stackunseen/ui@alpha</span>
            <a href="/getting-started/">
              Getting started <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </header>
        <HomeShowcase />
        <HomeFinder entries={entries} />
        <HomeAppExample />
        <section className="home-start" aria-labelledby="home-start-title">
          <div>
            <h2 id="home-start-title">Bring it into your app.</h2>
            <p>Start with local setup. Add a controlled component, then make the theme your own.</p>
          </div>
          <ol>
            <li>
              <span>01</span>
              <a href="/getting-started/">
                Set up your workspace <ArrowRight size={17} aria-hidden="true" />
              </a>
            </li>
            <li>
              <span>02</span>
              <a href="/docs/integration/">
                Connect state and callbacks <ArrowRight size={17} aria-hidden="true" />
              </a>
            </li>
            <li>
              <span>03</span>
              <a href="/customize/">
                Customize the theme <ArrowRight size={17} aria-hidden="true" />
              </a>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
