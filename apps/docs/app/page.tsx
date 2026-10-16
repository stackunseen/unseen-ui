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
            <p className="home-intro-pill">Experimental alpha · React 19</p>
            <h1 id="home-title">
              The hard states, handled.
              <span>AI interfaces that wait for your server.</span>
            </h1>
            <p className="home-intro-description">
              {releaseCatalog.length} React components for chat, tools, approvals, forms and
              layouts. Streaming, failures, unknown outcomes and pending decisions each have a
              state, and nothing runs until your server says so.
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
              <code>npm install @stackunseen/ui</code>
            </p>
          </div>
          <HomeHeroDemo />
        </section>
        <section className="home-tasks" aria-labelledby="home-tasks-title">
          <div className="home-section-heading">
            <h2 id="home-tasks-title">Explore by what you are building</h2>
            <Link href="/tasks/">
              All tasks <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {componentTasks.slice(0, 8).map((task) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}/`}>
                  <strong>{task.label}</strong>
                  <span>{task.description}</span>
                  <small>{task.components.slice(0, 4).join(' · ')}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="home-why" aria-labelledby="home-why-title">
          <div className="home-section-heading">
            <h2 id="home-why-title">Why Unseen UI</h2>
          </div>
          <ul>
            <li>
              <strong>Approvals that wait for your server</strong>
              <span>
                A decision carries the proposal&apos;s version and digest, and the card stays
                pending until your server answers. Nothing is treated as approved because a button
                was clicked.
              </span>
              <Link href="/components/approval-card/">ApprovalCard</Link>
            </li>
            <li>
              <strong>States that do not pretend</strong>
              <span>
                Measured, estimated and unknown values read differently. An unknown outcome is never
                shown as a failure or a success, and stale data is marked.
              </span>
              <Link href="/components/usage-meter/">UsageMeter</Link>
            </li>
            <li>
              <strong>One package, no Tailwind</strong>
              <span>
                Install from npm and import a stylesheet. Scoped styles and theme tokens work in any
                React 19 app, and updates arrive as versions instead of copied files.
              </span>
              <Link href="/getting-started/">Getting started</Link>
            </li>
          </ul>
          <p className="home-why-evidence">
            Measured 17 October 2026: 2,154 unit and interaction tests passing · zero automated
            accessibility (axe) violations on the audited pages · base stylesheet 24 KiB gzip · Chat
            entry under 3 KiB gzip.
          </p>
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
