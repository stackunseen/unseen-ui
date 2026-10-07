import type { ReactNode } from 'react';
import { FrameLinks } from './frame-links';

type FrameLink = readonly [label: string, href: string];
const docsLinks: readonly FrameLink[] = [
  ['Overview', '/docs/'],
  ['Getting started', '/getting-started/'],
  ['Themes and icons', '/docs/customization/'],
  ['Connect to your app', '/docs/integration/'],
  ['Design foundations', '/design/'],
];

/** Shared page frame: the same pinned sidebar and content inset as the component pages. */
export function DocsFrame({
  children,
  links = docsLinks,
  label = 'Documentation',
  mainClassName = 'web-article',
}: {
  children: ReactNode;
  links?: readonly FrameLink[];
  label?: string;
  mainClassName?: string;
}) {
  return (
    <div className="web-docs-layout">
      <aside className="web-docs-nav">
        <nav aria-label={label}>
          <FrameLinks links={links} />
        </nav>
        <p>
          Experimental alpha
          <br />
          APIs may change.
        </p>
      </aside>
      <main id="main-content" className={mainClassName} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
