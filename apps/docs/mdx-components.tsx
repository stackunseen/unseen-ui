import type { ComponentProps } from 'react';
import { CodePanel } from './components/code-panel';
export function useMDXComponents() {
  return {
    a: (props: ComponentProps<'a'>) => <a {...props} />,
    pre: (props: ComponentProps<'pre'>) => <CodePanel {...props} />,
  };
}
