import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HomeShowcase } from '../components/home-showcase';
import { HomeFinder } from '../components/home-finder';
import { HomeAppExample } from '../components/home-app-example';
import { HomeHeroDemo } from '../components/home-hero-demo';
import { componentTasks } from '../lib/tasks';
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
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-intro">
            <p className="web-eyebrow">Unseen UI / React + TypeScript</p>
            <h1 id="home-title">Compose an interface.</h1>
            <p className="home-intro-description">
              {releaseCatalog.length} React components for forms, layouts and AI workflows, with
              approvals that wait for your server before anything runs.
            </p>
            <div className="home-intro-actions">
              <Link className="web-button primary" href="/components/">
                Browse components
              </Link>
              <Link className="web-button secondary" href="/getting-started/">
                Get started <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className="home-intro-meta">
              <span>Experimental alpha · npm install @stackunseen/ui</span>
            </p>
          </div>
          <HomeHeroDemo />
        </section>
        <section className="home-tasks" aria-labelledby="home-tasks-title">
          <div className="home-section-heading">
            <h2 id="home-tasks-title">Explore by what you are building</h2>
            <Link href="/components/">
              All components <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {componentTasks.slice(0, 8).map((task) => (
              <li key={task.id}>
                <Link href={`/components/?q=${encodeURIComponent(task.label)}`}>
                  <strong>{task.label}</strong>
                  <span>{task.description}</span>
                  <small>{task.components.slice(0, 4).join(' · ')}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
              <Link href="/getting-started/">
                Set up your workspace <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <span>02</span>
              <Link href="/docs/integration/">
                Connect state and callbacks <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <span>03</span>
              <Link href="/customize/">
                Customize the theme <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
