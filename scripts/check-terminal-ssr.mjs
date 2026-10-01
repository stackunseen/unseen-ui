import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import console from 'node:console';
import { TerminalEmulator } from '../packages/react/dist/terminal.js';

if (typeof globalThis.window !== 'undefined')
  throw new Error('Expected a Node server environment.');
for (const variant of ['console', 'log', 'compact']) {
  const html = renderToString(
    createElement(TerminalEmulator, {
      variant,
      output: 'public transcript',
      state: 'running',
      context: { sessionId: 's', streamId: 'stream', version: '1' },
      connection: 'connected',
    }),
  );
  if (
    !html.includes('Plain terminal transcript') ||
    !html.includes('public transcript') ||
    !html.includes('Loading optional terminal renderer')
  )
    throw new Error(`SSR fallback missing: ${variant}`);
}
console.log(
  'PASS: three optional terminal styles render a plain SSR fallback without browser globals. No browser engine or packed-install claim.',
);
