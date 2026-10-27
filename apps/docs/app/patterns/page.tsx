import Link from 'next/link';
import Image from 'next/image';
import { ExamplePage } from '../../components/example-page';
import { patternUsage } from '../../lib/pattern-usage';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Patterns',
  'Runnable recipes and application templates built with Unseen UI: AI SDK chat with approvals, recoverable chat, action receipts, research answers, agent operations, an agent workbench, a coding studio, workspace integrations, a SaaS admin, a marketing site and Relay.',
  '/patterns/',
);
interface Listing {
  href: string;
  title: string;
  description: string;
  /** File stem under public/previews/patterns, written by scripts/capture-pattern-previews.mjs. */
  preview: string;
}
const recipes: Listing[] = [
  {
    href: '/patterns/ai-sdk-chat/',
    title: 'Chat on the Vercel AI SDK',
    description:
      'Connect Chat to useChat. Tools marked needsApproval wait for a person; replies render as Markdown.',
    preview: 'ai-sdk-chat',
  },
  {
    href: '/patterns/recoverable-chat/',
    title: 'Recoverable chat',
    description:
      'Disconnect a local conversation, inspect an unknown submission and check the original receipt before continuing.',
    preview: 'recoverable-chat',
  },
  {
    href: '/patterns/action-receipts/',
    title: 'Approval and action receipts',
    description:
      'Review a version-bound action, then follow acceptance, execution and partial failure as separate states.',
    preview: 'action-receipts',
  },
  {
    href: '/patterns/research-answers/',
    title: 'Research answers',
    description:
      'Read an answer alongside the sources for each claim. Inspect unavailable evidence and supplied freshness.',
    preview: 'research-answers',
  },
  {
    href: '/patterns/agent-operations/',
    title: 'Agent operations',
    description:
      'An inbox of runs with live steps and cost, a lane per agent with hand-offs, a waterfall of one run and the tree of who started whom.',
    preview: 'agent-operations',
  },
];
const templates: (Listing & { kind: string })[] = [
  {
    href: '/patterns/agent-workbench/',
    title: 'Agent Workbench',
    description: 'Sessions, accounts, sources, review decisions and uncertain receipts.',
    preview: 'agent-workbench',
    kind: 'Workspace',
  },
  {
    href: '/patterns/coding-studio/',
    title: 'Coding Studio',
    description: 'Files, staged changes, tests and version-bound apply receipts.',
    preview: 'coding-studio',
    kind: 'Workspace',
  },
  {
    href: '/patterns/workspace-integrations/',
    title: 'Workspace integrations',
    description:
      'Controlled editing, file reviews, artifact drafts and conversation revisions with a bounded local host.',
    preview: 'workspace-integrations',
    kind: 'Workspace',
  },
  {
    href: '/templates/saas-admin/',
    title: 'SaaS admin',
    description: 'Customers, members, roles, settings and illustrative billing.',
    preview: 'saas-admin',
    kind: 'Application',
  },
  {
    href: '/templates/marketing/',
    title: 'Marketing website',
    description: 'Eight marketing blocks composed into a product site.',
    preview: 'marketing',
    kind: 'Website',
  },
  {
    href: '/templates/relay/',
    title: 'Relay',
    description: 'A customer dashboard with an assistant, run locally with Vite.',
    preview: 'relay',
    kind: 'Vite app',
  },
];
/** The library components each page imports, from the generated usage index. */
const componentsOf = (href: string) =>
  Object.entries(patternUsage)
    .filter(([, links]) => links.some((link) => link.href === href))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
const linkedComponents = new Set(
  [...recipes, ...templates].flatMap((entry) => componentsOf(entry.href)),
).size;
const two = (count: number) => String(count).padStart(2, '0');
function Preview({ preview, title }: { preview: string; title: string }) {
  return (
    <span className="pattern-preview" aria-hidden="true">
      <Image
        className="directory-thumb-light"
        src={`/previews/patterns/${preview}-light.webp`}
        alt=""
        width={1280}
        height={800}
        unoptimized
      />
      <Image
        className="directory-thumb-dark"
        src={`/previews/patterns/${preview}-dark.webp`}
        alt=""
        width={1280}
        height={800}
        unoptimized
      />
      <span className="pattern-preview-name">{title}</span>
    </span>
  );
}
export default function Page() {
  return (
    <ExamplePage
      title="Patterns"
      eyebrow="components put together"
      description="Recipes show one job end to end; templates are whole applications. Everything runs locally with sample data."
      listing
    >
      <dl className="pattern-facts" aria-label="At a glance">
        <div>
          <dt>Recipes</dt>
          <dd>{two(recipes.length)}</dd>
        </div>
        <div>
          <dt>Templates</dt>
          <dd>{two(templates.length)}</dd>
        </div>
        <div>
          <dt>Components in use</dt>
          <dd>{linkedComponents}</dd>
        </div>
        <div>
          <dt>Runs on</dt>
          <dd>sample data, no keys</dd>
        </div>
      </dl>
      <h2 className="patterns-heading" id="recipes">
        Recipes <span>one job, end to end</span>
      </h2>
      <ol className="pattern-rows">
        {recipes.map((recipe) => {
          const components = componentsOf(recipe.href);
          return (
            <li key={recipe.href}>
              <Link href={recipe.href}>
                <Preview preview={recipe.preview} title={recipe.title} />
                <span className="pattern-row-copy">
                  <h3>{recipe.title}</h3>
                  <p>{recipe.description}</p>
                  {components.length > 0 && (
                    <span className="pattern-row-stack">{components.join(', ')}</span>
                  )}
                  <span className="pattern-row-cta">Try the recipe</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <h2 className="patterns-heading" id="templates">
        Templates <span>whole applications</span>
      </h2>
      <ul className="pattern-templates">
        {templates.map((template) => {
          const count = componentsOf(template.href).length;
          return (
            <li key={template.href}>
              <Link href={template.href}>
                <Preview preview={template.preview} title={template.title} />
                <strong>{template.title}</strong>
                <span>{template.description}</span>
                <small>
                  {template.kind}
                  {count > 0 && `, ${count} components`}
                </small>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="collection-note">
        Reusable <Link href="/components/?collection=application">application patterns</Link> and{' '}
        <Link href="/components/?collection=marketing">marketing blocks</Link> have their own
        component guides.
      </p>
    </ExamplePage>
  );
}
