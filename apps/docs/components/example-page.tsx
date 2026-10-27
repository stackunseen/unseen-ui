import type { ReactNode } from 'react';
import Link from 'next/link';
export function ExamplePage({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  workspace = false,
  listing = false,
  children,
}: {
  title: string;
  description: string;
  /** A short mono label above the title, such as the section the page belongs to. */
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  workspace?: boolean;
  listing?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className={`example-page ${workspace ? 'example-page-workspace template-app-mode' : 'web-container'} ${!workspace && !listing ? 'example-page-recipe' : ''}`}
      tabIndex={-1}
    >
      <header className="example-page-heading">
        {backHref && (
          <Link prefetch={false} className="web-text-link" href={backHref}>
            {backLabel}
          </Link>
        )}
        {eyebrow && <p className="web-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="example-page-content">{children}</div>
    </main>
  );
}
