import { ExamplePage } from '../../components/example-page';
import { ArrowRight, Workflow } from 'lucide-react';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'AI recipes',
  'Explore three local AI recipes for recoverable chat, action receipts and claim-linked research evidence built with Unseen UI.',
  '/patterns/',
);
const recipes = [
  {
    href: '/patterns/recoverable-chat/',
    title: 'Recoverable chat',
    description:
      'Disconnect a local conversation, inspect an unknown submission and check the original receipt before continuing.',
  },
  {
    href: '/patterns/action-receipts/',
    title: 'Approval and action receipts',
    description:
      'Review a version-bound action, then follow acceptance, execution and partial failure as separate states.',
  },
  {
    href: '/patterns/research-answers/',
    title: 'Research answers',
    description:
      'Read an answer alongside the sources for each claim. Inspect unavailable evidence and supplied freshness.',
  },
];
export default function Page() {
  return (
    <ExamplePage
      title="AI recipes"
      description="Focused examples for chat recovery, action receipts and source evidence. Each recipe runs with a local simulated host."
      listing
    >
      <div className="pattern-list">
        {recipes.map((recipe) => (
          <a key={recipe.href} href={recipe.href}>
            <Workflow size={28} aria-hidden="true" />
            <div>
              <h2>{recipe.title}</h2>
              <p>{recipe.description}</p>
              <span>
                Try the recipe <ArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          </a>
        ))}
      </div>
      <p className="collection-note">
        Need a complete application? Explore <a href="/templates/">the templates</a>. Reusable{' '}
        <a href="/components/#application">application patterns</a> have their own component guides.
      </p>
    </ExamplePage>
  );
}
