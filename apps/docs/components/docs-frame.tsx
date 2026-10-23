import type { ReactNode } from 'react';
import { FrameLinks } from './frame-links';
import { NavResizer } from './nav-resizer';

type FrameLink = readonly [label: string, href: string];
const docsLinks: readonly FrameLink[] = [
  ['Overview', '/docs/'],
  ['Getting started', '/getting-started/'],
  ['Themes and icons', '/docs/customization/'],
  ['Design tokens', '/docs/tokens/'],
  ['Connect to your app', '/docs/integration/'],
  ['Migrate from AI Elements', '/docs/migrate-from-ai-elements/'],
  ['Changelog', '/docs/changelog/'],
  ['Design foundations', '/design/'],
];

/** Shared page frame: the same pinned sidebar and content inset as the component pages. */
export function DocsFrame({
  children,
  links = docsLinks,
  label = 'Documentation',
  mainClassName = 'web-article',
  rail,
}: {
  children: ReactNode;
  links?: readonly FrameLink[];
  label?: string;
  mainClassName?: string;
  /** Extra sidebar content under the links, such as a catalog's category list. */
  rail?: ReactNode;
}) {
  return (
    <div className="web-docs-layout">
      <aside className="web-docs-nav">
        <nav aria-label={label}>
          <FrameLinks links={links} />
        </nav>
        {rail}
        <p>
          Experimental alpha
          <br />
          APIs may change.
        </p>
        <NavResizer navSelector=".web-docs-nav" />
      </aside>
      <main id="main-content" className={mainClassName} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
