import Link from 'next/link';
import { ExamplePage } from '../../components/example-page';
import {
  PatternPreview,
  TemplateCards,
  componentsOf,
  templateListings,
} from '../../components/template-cards';
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
const linkedComponents = new Set(
  [...recipes, ...templateListings].flatMap((entry) => componentsOf(entry.href)),
).size;
const two = (count: number) => String(count).padStart(2, '0');
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
          <dd>{two(templateListings.length)}</dd>
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
                <PatternPreview preview={recipe.preview} title={recipe.title} />
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
      <TemplateCards />
      <p className="collection-note">
        Reusable <Link href="/components/?collection=application">application patterns</Link> and{' '}
        <Link href="/components/?collection=marketing">marketing blocks</Link> have their own
        component guides.
      </p>
    </ExamplePage>
  );
}
