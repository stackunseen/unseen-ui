import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon, Share2Icon } from '@radix-ui/react-icons';
import { ExamplePage } from '../../components/example-page';
import { pageMetadata } from '../../lib/site-seo';
export const metadata = pageMetadata(
  'Patterns',
  'Runnable recipes and application templates built with Unseen UI: AI SDK chat with approvals, recoverable chat, action receipts, research answers, an agent workbench, a coding studio and a SaaS admin.',
  '/patterns/',
);
const recipes = [
  {
    href: '/patterns/ai-sdk-chat/',
    title: 'Chat on the Vercel AI SDK',
    description:
      'Connect Chat to useChat. Tools marked needsApproval wait for a person; replies render as Markdown.',
  },
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
const templates = [
  {
    href: '/patterns/agent-workbench/',
    title: 'Agent Workbench',
    description: 'Sessions, accounts, sources, review decisions and uncertain receipts.',
    preview: 'workbench',
  },
  {
    href: '/patterns/coding-studio/',
    title: 'Coding Studio',
    description: 'Files, staged changes, tests and version-bound apply receipts.',
    preview: 'coding',
  },
  {
    href: '/templates/saas-admin/',
    title: 'SaaS admin',
    description: 'Customers, members, roles, settings and illustrative billing.',
    preview: 'saas-admin',
  },
  {
    href: '/templates/marketing/',
    title: 'Marketing website',
    description: 'Eight marketing blocks composed into a product site.',
  },
  {
    href: '/templates/relay/',
    title: 'Relay',
    description: 'A customer dashboard with an assistant, run locally with Vite.',
  },
];
export default function Page() {
  return (
    <ExamplePage
      title="Patterns"
      description="Components put together. Recipes show one job end to end; templates are whole applications. Everything runs locally with sample data."
      listing
    >
      <h2 className="patterns-heading">Recipes</h2>
      <div className="pattern-list">
        {recipes.map((recipe) => (
          <Link key={recipe.href} href={recipe.href}>
            <Share2Icon width={30} height={30} aria-hidden="true" />
            <div>
              <h3>{recipe.title}</h3>
              <p>{recipe.description}</p>
              <span>
                Try the recipe <ArrowRightIcon width={15} height={15} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <h2 className="patterns-heading">Templates</h2>
      <ul className="pattern-templates">
        {templates.map((template) => (
          <li key={template.href}>
            <Link href={template.href}>
              <span className="pattern-template-preview" aria-hidden="true">
                {template.preview ? (
                  <>
                    <Image
                      className="directory-thumb-light"
                      src={`/previews/${template.preview}-light.png`}
                      alt=""
                      width={688}
                      height={420}
                      unoptimized
                    />
                    <Image
                      className="directory-thumb-dark"
                      src={`/previews/${template.preview}-dark.png`}
                      alt=""
                      width={688}
                      height={420}
                      unoptimized
                    />
                  </>
                ) : (
                  <span>{template.title}</span>
                )}
              </span>
              <strong>{template.title}</strong>
              <span>{template.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="collection-note">
        Reusable <Link href="/components/?collection=application">application patterns</Link> and{' '}
        <Link href="/components/?collection=marketing">marketing blocks</Link> have their own
        component guides.
      </p>
    </ExamplePage>
  );
}
