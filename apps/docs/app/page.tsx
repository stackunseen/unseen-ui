import Link from 'next/link';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { HomeShowcase } from '../components/home-showcase';
import { HomeAppExample } from '../components/home-app-example';
import { HomeHeroDemo } from '../components/home-hero-demo';
import { componentTasks } from '../lib/tasks';
import { LegacyGalleryRedirect } from '../components/legacy-gallery-redirect';
import { releaseCatalog } from '../lib/first-release';
import { siteOrigin } from '../lib/site-seo';
export default function Page() {
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
            <h1 id="home-title">The React components your AI app needs.</h1>
            <p className="home-intro-description">
              {releaseCatalog.length} components for chat, tool calls, approvals, agent progress and
              forms. Install them from npm, style them to match your brand and connect them to your
              own server. People only see an action as done once your server confirms it.
            </p>
            <div className="home-intro-actions">
              <Link className="web-button primary" href="/components/">
                Browse components
              </Link>
              <Link className="web-button secondary" href="/getting-started/">
                Get started <ArrowRightIcon width={15} height={15} aria-hidden="true" />
              </Link>
            </div>
            <p className="home-intro-meta">
              <code>npm install @stackunseen/ui</code>
              <span>Early alpha · React 19</span>
            </p>
          </div>
          <HomeHeroDemo />
        </section>
        <section className="home-tasks" aria-labelledby="home-tasks-title">
          <div className="home-section-heading">
            <h2 id="home-tasks-title">Start from what you&apos;re building</h2>
            <Link href="/tasks/">
              All tasks <ArrowRightIcon width={15} height={15} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {componentTasks.slice(0, 8).map((task) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}/`}>
                  <strong>{task.label}</strong>
                  <span>{task.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <HomeShowcase />
        <section className="home-why" aria-labelledby="home-why-title">
          <div className="home-section-heading">
            <h2 id="home-why-title">What you get</h2>
          </div>
          <ul>
            <li>
              <strong>Your server stays in charge</strong>
              <span>
                When the AI asks to do something, the approval card waits for your server&apos;s
                answer. A click alone never marks an action as done.
              </span>
              <Link href="/components/approval-card/">See ApprovalCard</Link>
            </li>
            <li>
              <strong>Screens that tell the truth</strong>
              <span>
                If a request times out or a number is only an estimate, the screen says so, instead
                of showing a success or a failure that never happened.
              </span>
              <Link href="/components/usage-meter/">See UsageMeter</Link>
            </li>
            <li>
              <strong>One install, your theme</strong>
              <span>
                One npm package with its own stylesheet, for any React 19 app. No Tailwind needed,
                and you get fixes by updating a version, not by copying files again.
              </span>
              <Link href="/getting-started/">Read the setup guide</Link>
            </li>
          </ul>
          <p className="home-why-evidence">
            Checked 23 October 2026: 2,239 tests pass, and automated accessibility checks (axe) find
            no violations on the pages we audit.
          </p>
        </section>
        <HomeAppExample />
        <section className="home-start" aria-labelledby="home-start-title">
          <div>
            <h2 id="home-start-title">Add it to your app in three steps.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <Link href="/getting-started/">
                Install and set up <ArrowRightIcon width={15} height={15} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <span>02</span>
              <Link href="/docs/integration/">
                Connect your data and actions{' '}
                <ArrowRightIcon width={15} height={15} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <span>03</span>
              <Link href="/customize/">
                Make the theme yours <ArrowRightIcon width={15} height={15} aria-hidden="true" />
              </Link>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
