import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ai-interaction/core/uploads': fileURLToPath(
        new URL('./packages/core/src/uploads.ts', import.meta.url),
      ),
      '@ai-interaction/react/upload': fileURLToPath(
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
      '@ai-interaction/core/history': fileURLToPath(
        new URL('./packages/core/src/history.ts', import.meta.url),
      ),
      '@ai-interaction/core/adapter': fileURLToPath(
        new URL('./packages/core/src/adapter.ts', import.meta.url),
      ),
      '@ai-interaction/react/layout': fileURLToPath(
        new URL('./packages/react/src/layout.ts', import.meta.url),
      ),
      '@ai-interaction/react/sidecar': fileURLToPath(
        new URL('./packages/react/src/sidecar.tsx', import.meta.url),
      ),
      '@ai-interaction/react/workspace': fileURLToPath(
        new URL('./packages/react/src/workspace-shell.tsx', import.meta.url),
      ),
      '@ai-interaction/react/viewport': fileURLToPath(
        new URL('./packages/react/src/viewport.tsx', import.meta.url),
      ),
      '@ai-interaction/core/conversation': fileURLToPath(
        new URL('./packages/core/src/conversation-validation.ts', import.meta.url),
      ),
      '@ai-interaction/core/schema': fileURLToPath(
        new URL('./packages/core/src/schema.ts', import.meta.url),
      ),
      '@ai-interaction/core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url),
      ),
      '@ai-interaction/react/theme': fileURLToPath(
        new URL('./packages/react/src/theme.ts', import.meta.url),
      ),
      '@ai-interaction/react/rich-markdown': fileURLToPath(
        new URL('./packages/react/src/rich-markdown.tsx', import.meta.url),
      ),
      '@ai-interaction/react/markdown': fileURLToPath(
        new URL('./packages/react/src/markdown.tsx', import.meta.url),
      ),
      '@ai-interaction/react/math': fileURLToPath(
        new URL('./packages/react/src/math.tsx', import.meta.url),
      ),
      '@ai-interaction/react/mermaid': fileURLToPath(
        new URL('./packages/react/src/mermaid.tsx', import.meta.url),
      ),
      '@ai-interaction/react/code': fileURLToPath(
        new URL('./packages/react/src/code.ts', import.meta.url),
      ),
      '@ai-interaction/react/highlight': fileURLToPath(
        new URL('./packages/react/src/highlight.tsx', import.meta.url),
      ),
      '@ai-interaction/react': fileURLToPath(
        new URL('./packages/react/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
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
