import Link from 'next/link';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Documentation',
  'Install Unseen UI, compose controlled React components, connect the AI SDK, customize scoped themes and migrate from AI Elements.',
  '/docs/',
);
const guides = [
  [
    '/getting-started/',
    'Getting started',
    'Install from npm, render a first component, or let `init` write a chat.',
  ],
  [
    '/components/chat/',
    'Chat',
    'A complete chat on a local host or the Vercel AI SDK, with approvals.',
  ],
  [
    '/docs/integration/',
    'Connect to your app',
    'Values and callbacks, saving changes and handling server responses.',
  ],
  [
    '/docs/customization/',
    'Themes and icons',
    'Appearance, density, colors, styling and icon overrides.',
  ],
  [
    '/docs/migrate-from-ai-elements/',
    'Migrate from AI Elements',
    'A component-by-component map and the AI SDK hook-up.',
  ],
  ['/docs/changelog/', 'Changelog', 'What changed in each prerelease, and what comes next.'],
] as const;
export default function Page() {
  return (
    <>
      <p className="web-eyebrow">Documentation</p>
      <h1>Build with Unseen UI.</h1>
      <p className="article-lead">
        React components for forms, navigation and AI workflows. Start with a component, then
        connect its values and callbacks to your app.
      </p>
      <div className="docs-links">
        {guides.map(([href, title, description]) => (
          <Link key={href} href={href}>
            <strong>{title}</strong>
            <span>{description.replace(/`/g, '')}</span>
          </Link>
        ))}
      </div>
      <h2>Explore while you read</h2>
      <p>
        The <Link href="/components/">component catalog</Link> puts live examples beside their props
        and code. <Link href="/tasks/">Build by task</Link> groups them by what you are making.{' '}
        <Link href="/patterns/">Patterns</Link> show them working together, from an AI SDK chat to a
        SaaS admin app. <Link href="/customize/">Customize</Link> previews your theme and exports
        its configuration.
      </p>
      <h2>Current availability</h2>
      <p>
        The library is an experimental alpha. <code>@stackunseen/ui</code> and{' '}
        <code>@stackunseen/ui-core</code> are published on npm under the <code>alpha</code> tag; pin
        exact versions, because APIs may change between prereleases. The site&apos;s examples use
        synthetic data and simulated hosts; no model is called. Coding agents can read{' '}
        <a href="/llms.txt">llms.txt</a> and <a href="/llms-full.txt">llms-full.txt</a>, or one
        component at a time as Markdown, such as <a href="/llms/button.md">button.md</a>. Each
        component page links to its own.
      </p>
    </>
  );
}
