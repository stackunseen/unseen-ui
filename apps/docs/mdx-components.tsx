import type { ComponentProps } from 'react';
import { CodePanel } from './components/code-panel';
import { textOf } from './lib/text-of';

/** "2. Render your first component" becomes "2-render-your-first-component". */
function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Guide sections get an id and link to themselves, so they can be shared and outlined. */
function SectionHeading({ id, children, ...props }: ComponentProps<'h2'>) {
  const anchor = id ?? slug(textOf(children));
  return (
    <h2 id={anchor} {...props}>
      <a className="heading-anchor" href={`#${anchor}`}>
        {children}
      </a>
    </h2>
  );
}

export function useMDXComponents() {
  return {
    a: (props: ComponentProps<'a'>) => <a {...props} />,
    h2: SectionHeading,
    pre: (props: ComponentProps<'pre'>) => <CodePanel {...props} />,
    // Guide tables scroll sideways on small screens, so the keyboard can reach them too.
    table: (props: ComponentProps<'table'>) => <table tabIndex={0} {...props} />,
  };
}
