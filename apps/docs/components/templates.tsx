'use client';
import { ArrowUpRight, Check, Layers } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle, Card } from '@stackunseen/ui';
import s from './templates.module.css';
import { componentHref } from '../lib/site-paths';
import { TemplateCards } from './template-cards';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';

const componentGroups = [
  { label: 'Account workspace', components: ['Card', 'Table', 'Input', 'Select'] },
  { label: 'Details and edits', components: ['Modal', 'Button', 'DropdownMenu', 'Toast'] },
  { label: 'Assistant', components: ['PromptInput', 'Message', 'StreamingResponse'] },
];

export function Templates() {
  return (
    <article className={s.page}>
      <header className="page-heading">
        <span className="eyebrow">Application templates</span>
        <h1>Templates</h1>
        <p>
          Whole applications built from the library. Open one in the browser, or run Relay locally,
          adapt its source and connect your services.
        </p>
      </header>

      <h2 className="patterns-heading" id="browser-templates">
        In the browser <span>sample data, no keys</span>
      </h2>
      <TemplateCards exclude="/templates/relay/" />
      <p className={s.patternsNote}>
        Smaller compositions, such as a recoverable chat or an agent operations screen, are on the{' '}
        <Link prefetch={false} href="/patterns/">
          Patterns page
        </Link>
        .
      </p>

      <h2 className="patterns-heading" id="relay">
        Relay <span>a reference app to run locally</span>
      </h2>
      <Card className={s.template} role="region" aria-labelledby="relay-template-title">
        <div className={s.summary}>
          <div className={s.identity}>
            <span className={s.mark} aria-hidden="true">
              <Layers width={30} height={30} />
            </span>
            <span className={s.tag}>Local reference app</span>
          </div>
          <Card.Title as="h2" id="relay-template-title" className={s.title}>
            Relay
          </Card.Title>
          <p className={s.subtitle}>Customer success, with an assistant at hand.</p>
          <p className={s.description}>
            Review accounts and draft follow-ups with a simulated assistant.
          </p>
          <div className={s.actions}>
            <Link prefetch={false} className={s.previewLink} href="/templates/relay/">
              Explore Relay <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link prefetch={false} className={s.setupLink} href="#relay-setup">
              Run it locally
            </Link>
          </div>
          <p className={s.meta}>React + TypeScript · Vite · Public library imports</p>
        </div>
        <div className={s.workflow}>
          <p className={s.workflowLabel}>Sample workflow</p>
          <ol>
            <li>
              <span className={s.step} aria-hidden="true">
                01
              </span>
              <div>
                <strong>Review the portfolio</strong>
                <p>Enter the demo, check account metrics, then search and filter the table.</p>
              </div>
            </li>
            <li>
              <span className={s.step} aria-hidden="true">
                02
              </span>
              <div>
                <strong>Update an account</strong>
                <p>Open its details, edit a field and see the local save confirmation.</p>
              </div>
            </li>
            <li>
              <span className={s.step} aria-hidden="true">
                03
              </span>
              <div>
                <strong>Prepare a follow-up</strong>
                <p>Ask the simulated assistant, stop a response or retry a sample error.</p>
              </div>
            </li>
          </ol>
          <p className={s.workflowFootnote}>
            <Check size={16} aria-hidden="true" /> No external account or API key required
          </p>
        </div>
      </Card>

      <div className={s.details}>
        <section id="relay-setup" className={s.setup} aria-labelledby="relay-setup-title">
          <h2 id="relay-setup-title">Run and adapt</h2>
          <p>From the repository root, install dependencies, build the packages and start Relay.</p>
          <HighlightedCodeBlock
            language="sh"
            code={`pnpm install --frozen-lockfile
pnpm build:packages
pnpm template:dev`}
          />
          <p>
            Open <code>http://127.0.0.1:4184/relay.html</code> while the local server is running.
          </p>
          <dl className={s.source}>
            <div>
              <dt>Source</dt>
              <dd>
                <code>examples/consumer/src/relay/</code>
              </dd>
            </div>
            <div>
              <dt>Setup and integration guide</dt>
              <dd>
                <code>examples/consumer/src/relay/README.md</code>
              </dd>
            </div>
          </dl>
          <p>
            Adapt the theme, icons and sample data. The source guide maps screens to components.
          </p>
          <Link prefetch={false} className={s.textLink} href="/getting-started/#customize">
            Theme and icon customization <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className={s.map} aria-labelledby="relay-components-title">
          <h2 id="relay-components-title">Built from the library</h2>
          <p>Explore the underlying controls and their supported states.</p>
          {componentGroups.map((group) => (
            <div className={s.componentGroup} key={group.label}>
              <h3>{group.label}</h3>
              <ul>
                {group.components.map((component) => (
                  <li key={component}>
                    <Link prefetch={false} href={componentHref(component)}>
                      {component} <ArrowUpRight width={13} height={13} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>

      <Alert tone="neutral">
        <AlertTitle>Demo boundaries</AlertTitle>
        <AlertDescription>
          Login does not authenticate. Accounts and AI responses are fixed samples; edits last for
          this page session. The demo sends no messages and executes no external actions. Add server
          authentication, authorization, storage and a provider before production use.
        </AlertDescription>
      </Alert>
    </article>
  );
}
