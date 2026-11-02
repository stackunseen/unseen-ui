import type { ReactNode } from 'react';
import Link from 'next/link';
import { TemplateViewport } from './template-viewport';
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
  /** A short label above the title, such as the section the page belongs to. */
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  workspace?: boolean;
  listing?: boolean;
  children: ReactNode;
}) {
  // Whole applications get the device switch; their way back is the Templates page.
  const device = workspace && Boolean(backHref);
  const heading = (
    <header className="example-page-heading">
      {backHref && !device && (
        <Link prefetch={false} className="web-text-link" href={backHref}>
          {backLabel}
        </Link>
      )}
      {eyebrow && <p className="web-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
  const content = <div className="example-page-content">{children}</div>;
  return (
    <main
      id="main-content"
      className={`example-page ${workspace ? 'example-page-workspace template-app-mode' : 'web-container'} ${!workspace && !listing ? 'example-page-recipe' : ''}`}
      tabIndex={-1}
    >
      {device ? (
        <TemplateViewport backHref="/templates/" backLabel="All templates">
          {heading}
          {content}
        </TemplateViewport>
      ) : (
        <>
          {heading}
          {content}
        </>
      )}
    </main>
  );
}
