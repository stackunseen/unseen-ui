'use client';
import type { ComponentProps } from 'react';
import { CodeTabs } from '@stackunseen/ui/devtools';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';
import '@stackunseen/ui/devtools.css';

/** The homepage example files, with the same highlighting as the guides. */
export function HomeConnectCode(props: Omit<ComponentProps<typeof CodeTabs>, 'codeBlock'>) {
  return <CodeTabs {...props} codeBlock={HighlightedCodeBlock} />;
}
