import Link from 'next/link';
import { CopyButton } from '@stackunseen/ui';
import { HomeBreadth } from '../components/home-breadth';
import { HomeConnect } from '../components/home-connect';
import { HomeAgents } from '../components/home-agents';
import { HomeFaq } from '../components/home-faq';
import { HomeTrace } from '../components/home-trace';
import { TemplateCards, templateListings } from '../components/template-cards';
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
            <p className="home-kicker">React components for AI agent apps</p>
            <h1 id="home-title">The screens your agent needs, with nothing faked.</h1>
            <p className="home-intro-description">
              {releaseCatalog.length} components for chat, tool calls, approvals, agent runs,
              sources and dashboards, plus {templateListings.length} whole applications. A click
              only sends a request; the screen shows done when your server says so.
            </p>
            <div className="home-intro-actions">
              <Link className="web-button primary" href="/components/">
                Browse components
              </Link>
              <Link className="web-button secondary" href="/getting-started/">
                Get started
              </Link>
            </div>
            <div className="home-intro-meta">
              <span className="home-install">
                <code>npm install @stackunseen/ui</code>
                <CopyButton
                  size="sm"
                  variant="ghost"
                  iconOnly
                  value="npm install @stackunseen/ui"
                  label="Copy install command"
                />
              </span>
            </div>
            <dl className="home-spec">
              <div>
                <dt>React</dt>
                <dd>19</dd>
              </div>
              <div>
                <dt>Styling</dt>
                <dd>Plain CSS, no Tailwind</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>MIT</dd>
              </div>
            </dl>
          </div>
          <HomeTrace />
        </section>
        <HomeBreadth />
        <section className="home-templates" aria-labelledby="home-templates-title">
          <div className="home-section-heading">
            <div>
              <h2 id="home-templates-title">Whole applications, running with sample data.</h2>
            </div>
            <Link href="/templates/">All templates</Link>
          </div>
          <TemplateCards exclude="/templates/relay/" />
        </section>
        <dl className="home-facts" aria-label="At a glance">
          <div>
            <dt>license</dt>
            <dd>MIT, examples included</dd>
          </div>
          <div>
            <dt>stack</dt>
            <dd>React 19 and TypeScript, no Tailwind needed</dd>
          </div>
          <div>
            <dt>install</dt>
            <dd>one npm package, one stylesheet import</dd>
          </div>
          <div>
            <dt>access</dt>
            <dd>keyboard and screen reader, documented</dd>
          </div>
        </dl>
        <HomeConnect />
        <HomeAgents />
        <section className="home-tasks" aria-labelledby="home-tasks-title">
          <div className="home-section-heading">
            <div>
              <h2 id="home-tasks-title">Start from what you&apos;re building</h2>
            </div>
            <Link href="/tasks/">All tasks</Link>
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
        <section className="home-why" aria-labelledby="home-why-title">
          <div className="home-section-heading">
            <div>
              <h2 id="home-why-title">What you get</h2>
            </div>
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
            <li>
              <strong>Ready for your coding agent</strong>
              <span>
                Add the MCP endpoint to Claude Code or Cursor, press Copy prompt on any component
                page, or point any tool at llms.txt and the Markdown page per component.
              </span>
              <Link href="/docs/coding-agents/">Set up your agent</Link>
            </li>
          </ul>
          <p className="home-why-evidence">
            Checked 28 October 2026: 2,298 tests pass, and automated accessibility checks (axe) find
            no violations on the pages we audit.
          </p>
        </section>
        <HomeFaq />
        <section className="home-start" aria-labelledby="home-start-title">
          <div>
            <h2 id="home-start-title">Add it to your app in three steps.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <Link href="/getting-started/">Install and set up</Link>
            </li>
            <li>
              <span>02</span>
              <Link href="/docs/integration/">Connect your data and actions</Link>
            </li>
            <li>
              <span>03</span>
              <Link href="/customize/">Make the theme yours</Link>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
