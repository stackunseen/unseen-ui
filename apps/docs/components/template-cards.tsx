import Image from 'next/image';
import Link from 'next/link';
import { patternUsage } from '../lib/pattern-usage';

export interface TemplateListing {
  href: string;
  title: string;
  description: string;
  /** File stem under public/previews/patterns, written by scripts/capture-pattern-previews.mjs. */
  preview: string;
  kind: string;
}

/** Whole applications built from the library, in the order the Patterns and Templates pages list them. */
export const templateListings: TemplateListing[] = [
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
    href: '/templates/evals/',
    title: 'Evaluations',
    description: 'Scores per suite and model over time, failing cases and a two-run comparison.',
    preview: 'evals',
    kind: 'Screen',
  },
  {
    href: '/templates/analytics/',
    title: 'Analytics',
    description: 'Requests, latency, tool health, spend per agent and context-window use.',
    preview: 'analytics',
    kind: 'Screen',
  },
  {
    href: '/templates/settings-billing/',
    title: 'Settings and billing',
    description: 'General settings, model budgets, API keys shown once, plan, usage and invoices.',
    preview: 'settings-billing',
    kind: 'Screen',
  },
  {
    href: '/templates/app-shells/',
    title: 'App shells',
    description: 'A dashboard with an inspector, a chat app with collapsing navigation, a contained tool.',
    preview: 'app-shells',
    kind: 'Layouts',
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

/** Recipes: one job end to end, in the order the Patterns page lists them. */
export const recipeListings: TemplateListing[] = [
  {
    href: '/patterns/ai-sdk-chat/',
    title: 'Chat on the Vercel AI SDK',
    description:
      'Connect Chat to useChat. Tools marked needsApproval wait for a person; replies render as Markdown.',
    preview: 'ai-sdk-chat',
    kind: 'Recipe',
  },
  {
    href: '/patterns/recoverable-chat/',
    title: 'Recoverable chat',
    description:
      'Disconnect a local conversation, inspect an unknown submission and check the original receipt before continuing.',
    preview: 'recoverable-chat',
    kind: 'Recipe',
  },
  {
    href: '/patterns/action-receipts/',
    title: 'Approval and action receipts',
    description:
      'Review a version-bound action, then follow acceptance, execution and partial failure as separate states.',
    preview: 'action-receipts',
    kind: 'Recipe',
  },
  {
    href: '/patterns/research-answers/',
    title: 'Research answers',
    description:
      'Read an answer alongside the sources for each claim. Inspect unavailable evidence and supplied freshness.',
    preview: 'research-answers',
    kind: 'Recipe',
  },
  {
    href: '/patterns/agent-operations/',
    title: 'Agent operations',
    description:
      'A board of runs with live steps and cost, a lane per agent with hand-offs, a waterfall of one run and the tree of who started whom.',
    preview: 'agent-operations',
    kind: 'Recipe',
  },
];

/** The library components a page imports, from the generated usage index. */
export const componentsOf = (href: string) =>
  Object.entries(patternUsage)
    .filter(([, links]) => links.some((link) => link.href === href))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));

/** The page's own first screen, light or dark to match the site. */
export function PatternPreview({ preview, title }: { preview: string; title: string }) {
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

/** A hairline grid of template thumbnails; `exclude` leaves out one that the page features elsewhere. */
export function TemplateCards({ exclude }: { exclude?: string }) {
  return (
    <ul className="pattern-templates">
      {templateListings
        .filter((template) => template.href !== exclude)
        .map((template) => {
          const count = componentsOf(template.href).length;
          return (
            <li key={template.href}>
              <Link href={template.href}>
                <PatternPreview preview={template.preview} title={template.title} />
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
  );
}
