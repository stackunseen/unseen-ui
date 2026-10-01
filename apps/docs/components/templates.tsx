import { ArrowUpRight, Check, Layers3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Card } from '@ai-interaction/react';
import s from './templates.module.css';

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
        <p>Explore a working app, adapt its source and connect your services.</p>
      </header>

      <Card className={s.template} aria-labelledby="relay-template-title">
        <div className={s.summary}>
          <div className={s.identity}>
            <span className={s.mark} aria-hidden="true">
              <Layers3 size={24} />
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
            <a className={s.previewLink} href="http://127.0.0.1:4184/relay.html">
              Open Relay demo <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <a className={s.setupLink} href="#relay-setup">
              Run it locally
            </a>
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
          <pre tabIndex={0} aria-label="Relay setup commands">
            <code>{`pnpm install --frozen-lockfile
pnpm build:packages
pnpm template:dev`}</code>
          </pre>
          <p>
            Open <code>http://127.0.0.1:4184/relay.html</code>. The preview link above needs this
            local server running.
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
          <a className={s.textLink} href="/getting-started/#customize">
            Theme and icon customization <ArrowUpRight size={15} aria-hidden="true" />
          </a>
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
                    <a href={`?view=components&component=${component}`}>
                      {component} <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
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
