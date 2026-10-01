import type { ComponentProps } from 'react';
export function useMDXComponents() {
  return {
    a: (props: ComponentProps<'a'>) => <a {...props} />,
    pre: (props: ComponentProps<'pre'>) => <pre tabIndex={0} {...props} />,
  };
}
