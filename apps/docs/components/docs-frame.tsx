import type { ReactNode } from 'react';
const links = [
  ['Overview', '/docs/'],
  ['Getting started', '/getting-started/'],
  ['Themes and icons', '/docs/customization/'],
  ['Connect to your app', '/docs/integration/'],
  ['Design foundations', '/design/'],
] as const;
export function DocsFrame({ children }: { children: ReactNode }) {
  return (
    <div className="web-docs-layout">
      <aside className="web-docs-nav">
        <nav aria-label="Documentation">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <p>
          Experimental alpha
          <br />
          APIs may change.
        </p>
      </aside>
      <main id="main-content" className="web-article" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
