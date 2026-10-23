import { ArrowRightIcon } from '@radix-ui/react-icons';
import { pageMetadata } from '../../../lib/site-seo';
import { componentHref } from '../../../lib/site-paths';
export const metadata = pageMetadata(
  'Relay reference template',
  'Run and adapt Relay, a React/Vite customer-success dashboard with mock login, editable sample accounts and a simulated assistant built with Unseen UI.',
  '/templates/relay/',
);
export default function Page() {
  return (
    <main id="main-content" className="web-container relay-page" tabIndex={-1}>
      <header className="web-page-heading">
        <p className="web-eyebrow">Local reference application</p>
        <h1>Relay</h1>
        <p>
          A customer-success dashboard with an assistant at hand. Built from the same UI and AI
          components in the catalog.
        </p>
        <a className="web-text-link" href="#run-relay">
          Run it locally <ArrowRightIcon width={15} height={15} aria-hidden="true" />
        </a>
      </header>
      <section>
        <h2>A complete sample workflow</h2>
        <ol className="relay-workflow">
          <li>
            <strong>Review the portfolio</strong>
            <p>Enter the mock account, check the overview, then search and filter the table.</p>
          </li>
          <li>
            <strong>Update an account</strong>
            <p>Open account details, edit a field and see the local save confirmation.</p>
          </li>
          <li>
            <strong>Prepare a follow-up</strong>
            <p>Ask the simulated assistant, stop a response or retry a sample error.</p>
          </li>
        </ol>
      </section>
      <section id="run-relay">
        <h2>Run and adapt</h2>
        <p>From a clone of the repository, run these commands at the root:</p>
        <pre tabIndex={0} role="group" aria-label="Relay setup commands">
          <code>{'pnpm install --frozen-lockfile\npnpm build:packages\npnpm template:dev'}</code>
        </pre>
        <p>
          Open <code>http://127.0.0.1:4184/relay.html</code>. The source is in{' '}
          <code>examples/consumer/src/relay/</code>; its README maps the screens to library
          components. Use <code>pnpm template:preview</code> after the consumer build for a built
          preview.
        </p>
        <a className="web-text-link" href="/docs/customization/">
          Adapt the theme and icons <ArrowRightIcon width={15} height={15} aria-hidden="true" />
        </a>
      </section>
      <section>
        <h2>Built from the library</h2>
        <div className="quick-components">
          {['Card', 'Table', 'Modal', 'Toast', 'PromptInput', 'Message'].map((name) => (
            <a key={name} href={componentHref(name)}>
              {name}
            </a>
          ))}
        </div>
      </section>
      <section className="collection-note">
        <h2>Demo boundaries</h2>
        <p>
          Login does not authenticate. Accounts and AI responses are synthetic; edits last for the
          page session. Relay sends no messages and executes no external actions. Add server
          authentication, authorization, storage and a provider before production use.
        </p>
      </section>
    </main>
  );
}
