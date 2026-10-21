import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@stackunseen/ui/editor': fileURLToPath(
        new URL('./packages/react/src/editor.tsx', import.meta.url),
      ),
      '@stackunseen/ui/artifact-editor': fileURLToPath(
        new URL('./packages/react/src/artifact-editor.tsx', import.meta.url),
      ),
      '@stackunseen/ui/assistant': fileURLToPath(
        new URL('./packages/react/src/assistant.ts', import.meta.url),
      ),
      '@stackunseen/ui/devtools': fileURLToPath(
        new URL('./packages/react/src/devtools.ts', import.meta.url),
      ),
      '@stackunseen/ui/navigation': fileURLToPath(
        new URL('./packages/react/src/navigation.ts', import.meta.url),
      ),
      '@stackunseen/ui/chat': fileURLToPath(
        new URL('./packages/react/src/chat.tsx', import.meta.url),
      ),
      '@stackunseen/ui/mcp-apps': fileURLToPath(
        new URL('./packages/react/src/mcp-apps.tsx', import.meta.url),
      ),
      '@stackunseen/ui/media': fileURLToPath(
        new URL('./packages/react/src/media.ts', import.meta.url),
      ),
      '@stackunseen/ui/conversation-flow': fileURLToPath(
        new URL('./packages/react/src/conversation-flow.tsx', import.meta.url),
      ),
      '@stackunseen/ui-core/editing': fileURLToPath(
        new URL('./packages/core/src/editing.ts', import.meta.url),
      ),
      '@stackunseen/ui/application': fileURLToPath(
        new URL('./packages/react/src/application.ts', import.meta.url),
      ),
      '@stackunseen/ui/marketing': fileURLToPath(
        new URL('./packages/react/src/marketing.ts', import.meta.url),
      ),
      '@stackunseen/ui-core/uploads': fileURLToPath(
        new URL('./packages/core/src/uploads.ts', import.meta.url),
      ),
      '@stackunseen/ui/upload': fileURLToPath(
        new URL('./packages/react/src/upload-attachment.tsx', import.meta.url),
      ),
      '@xterm/xterm': fileURLToPath(
        new URL('./packages/react/node_modules/@xterm/xterm/lib/xterm.js', import.meta.url),
      ),
      '@xterm/addon-fit': fileURLToPath(
        new URL('./packages/react/node_modules/@xterm/addon-fit/lib/addon-fit.js', import.meta.url),
      ),
      'react-resizable-panels': fileURLToPath(
        new URL(
          './packages/react/node_modules/react-resizable-panels/dist/react-resizable-panels.js',
          import.meta.url,
        ),
      ),
      '@tanstack/react-virtual': fileURLToPath(
        new URL(
          './packages/react/node_modules/@tanstack/react-virtual/dist/esm/index.js',
          import.meta.url,
        ),
      ),
      '@stackunseen/ui-core/history': fileURLToPath(
        new URL('./packages/core/src/history.ts', import.meta.url),
      ),
      '@stackunseen/ui-core/ai-sdk': fileURLToPath(
        new URL('./packages/core/src/ai-sdk.ts', import.meta.url),
      ),
      '@stackunseen/ui-core/adapter': fileURLToPath(
        new URL('./packages/core/src/adapter.ts', import.meta.url),
      ),
      '@stackunseen/ui/layout': fileURLToPath(
        new URL('./packages/react/src/layout.ts', import.meta.url),
      ),
      '@stackunseen/ui/sidecar': fileURLToPath(
        new URL('./packages/react/src/sidecar.tsx', import.meta.url),
      ),
      '@stackunseen/ui/workspace': fileURLToPath(
        new URL('./packages/react/src/workspace-shell.tsx', import.meta.url),
      ),
      '@stackunseen/ui/viewport': fileURLToPath(
        new URL('./packages/react/src/viewport.tsx', import.meta.url),
      ),
      '@stackunseen/ui-core/conversation': fileURLToPath(
        new URL('./packages/core/src/conversation-validation.ts', import.meta.url),
      ),
      '@stackunseen/ui-core/schema': fileURLToPath(
        new URL('./packages/core/src/schema.ts', import.meta.url),
      ),
      '@stackunseen/ui-core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url),
      ),
      '@stackunseen/ui/theme': fileURLToPath(
        new URL('./packages/react/src/theme.ts', import.meta.url),
      ),
      '@stackunseen/ui/rich-markdown': fileURLToPath(
        new URL('./packages/react/src/rich-markdown.tsx', import.meta.url),
      ),
      '@stackunseen/ui/markdown': fileURLToPath(
        new URL('./packages/react/src/markdown.tsx', import.meta.url),
      ),
      '@stackunseen/ui/math': fileURLToPath(
        new URL('./packages/react/src/math.tsx', import.meta.url),
      ),
      '@stackunseen/ui/mermaid': fileURLToPath(
        new URL('./packages/react/src/mermaid.tsx', import.meta.url),
      ),
      '@stackunseen/ui/code': fileURLToPath(
        new URL('./packages/react/src/code.ts', import.meta.url),
      ),
      '@stackunseen/ui/highlight': fileURLToPath(
        new URL('./packages/react/src/highlight.tsx', import.meta.url),
      ),
      '@stackunseen/ui': fileURLToPath(new URL('./packages/react/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Times render in the viewer's zone; tests pin it so their expected text holds anywhere.
    env: { TZ: 'UTC' },
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.test.{ts,tsx}',
      'packages/**/src/**/*.test.{ts,tsx}',
      'packages/*/tests/**/*.test.{ts,tsx}',
      'apps/*/components/**/*.test.{ts,tsx}',
      'apps/*/lib/**/*.test.{ts,tsx}',
      'apps/*/tests/**/*.test.{ts,tsx}',
      'examples/consumer/src/**/*.test.{ts,tsx}',
      'examples/*/host.test.{ts,tsx}',
    ],
  },
});
