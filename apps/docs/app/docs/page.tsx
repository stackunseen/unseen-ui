import { ArrowRight } from 'lucide-react';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Documentation',
  'Set up Unseen UI locally, compose controlled React components, customize scoped themes and connect your application host.',
  '/docs/',
);
export default function Page() {
  return (
    <>
      <p className="web-eyebrow">Documentation</p>
      <h1>Build with Unseen UI.</h1>
      <p className="article-lead">
        Use React components for forms, navigation and AI workflows. Start with a component, then
        connect its values and callbacks to your app.
      </p>
      <div className="docs-links">
        <a href="/getting-started/">
          <strong>
            Getting started <ArrowRight size={17} aria-hidden="true" />
          </strong>
          <span>Local setup, package imports and a first component.</span>
        </a>
        <a href="/docs/customization/">
          <strong>
            Themes and icons <ArrowRight size={17} aria-hidden="true" />
          </strong>
          <span>Appearance, density, colors, styling and icon overrides.</span>
        </a>
        <a href="/docs/integration/">
          <strong>
            Connect to your app <ArrowRight size={17} aria-hidden="true" />
          </strong>
          <span>Use values and callbacks, save changes and handle server responses.</span>
        </a>
      </div>
      <h2>Explore while you read</h2>
      <p>
        The <a href="/components/">component catalog</a> puts live examples beside their props and
        code. The <a href="/templates/saas-admin/">SaaS admin example</a> combines them in a working
        app. <a href="/customize/">Customize</a> previews your theme and exports its configuration.
      </p>
      <h2>Current availability</h2>
      <p>
        The library is an experimental alpha. <code>@stackunseen/ui</code> and{' '}
        <code>@stackunseen/ui-core</code> are not yet published on npm. The source repository is
        private, so local setup requires access. The examples use synthetic data and a simulated
        host.
      </p>
    </>
  );
}
