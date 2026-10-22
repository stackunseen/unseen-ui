'use client';
import {
  ArrowTopRightIcon,
  CheckIcon,
  CodeIcon,
  LayersIcon,
  Share2Icon,
} from '@radix-ui/react-icons';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle, Card } from '@stackunseen/ui';
import s from './templates.module.css';
import { componentHref } from '../lib/site-paths';

const componentGroups = [
  { label: 'Account workspace', components: ['Card', 'Table', 'Input', 'Select'] },
  { label: 'Details and edits', components: ['Modal', 'Button', 'DropdownMenu', 'Toast'] },
  { label: 'Assistant', components: ['PromptInput', 'Message', 'StreamingResponse'] },
];

export function Templates() {
  return (
    <article className={s.page}>
      <header className="page-heading">
        <span className="eyebrow">APPLICATION TEMPLATES</span>
        <h1>Templates</h1>
        <p>Try a complete local workflow, adapt its source and connect your services.</p>
      </header>

      <div className="pattern-list template-options">
        <Link prefetch={false} href="/templates/saas-admin/">
          <LayersIcon width={28} height={28} aria-hidden="true" />
          <div>
            <h2>SaaS admin</h2>
            <p>
              Manage sample customers, member roles, organization settings and plan details. Try
              rejected saves and lost acknowledgements.
            </p>
            <span>
              Open the local template{' '}
              <ArrowTopRightIcon width={16} height={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link prefetch={false} href="/templates/marketing/">
          <LayersIcon width={28} height={28} aria-hidden="true" />
          <div>
            <h2>Marketing website</h2>
            <p>
              A fictional product site with responsive navigation, plan cards, a FAQ and a contact
              form. Built from reusable marketing blocks.
            </p>
            <span>
              Open the local template{' '}
              <ArrowTopRightIcon width={16} height={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link prefetch={false} href="/patterns/agent-workbench/">
          <Share2Icon width={28} height={28} aria-hidden="true" />
          <div>
            <h2>Agent Workbench</h2>
            <p>
              Review accounts, inspect sources and manage version-bound decisions. Search, sessions,
              cancellation and recovery are interactive.
            </p>
            <span>
              Open the local template{' '}
              <ArrowTopRightIcon width={16} height={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link prefetch={false} href="/patterns/coding-studio/">
          <CodeIcon width={28} height={28} aria-hidden="true" />
          <div>
            <h2>Coding Studio</h2>
            <p>
              Edit sample files, stage changes and apply a reviewed patch. Test and terminal results
              use a disclosed local simulation.
            </p>
            <span>
              Open the local template{' '}
              <ArrowTopRightIcon width={16} height={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>

      <Card className={s.template} role="region" aria-labelledby="relay-template-title">
        <div className={s.summary}>
          <div className={s.identity}>
            <span className={s.mark} aria-hidden="true">
              <LayersIcon width={24} height={24} />
            </span>
            <span className={s.tag}>LOCAL REFERENCE APP</span>
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
              Explore Relay <ArrowTopRightIcon width={17} height={17} aria-hidden="true" />
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
            <CheckIcon width={16} height={16} aria-hidden="true" /> No external account or API key
            required
          </p>
        </div>
      </Card>

      <div className={s.details}>
        <section id="relay-setup" className={s.setup} aria-labelledby="relay-setup-title">
          <h2 id="relay-setup-title">Run and adapt</h2>
          <p>From the repository root, install dependencies, build the packages and start Relay.</p>
          <pre tabIndex={0} role="group" aria-label="Relay setup commands">
            <code>{`pnpm install --frozen-lockfile
pnpm build:packages
pnpm template:dev`}</code>
          </pre>
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
            Theme and icon customization{' '}
            <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
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
                      {component} <ArrowTopRightIcon width={13} height={13} aria-hidden="true" />
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
