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
