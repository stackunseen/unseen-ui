import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const sharedPublicModules = new Set([
  'components/button/button',
  'components/checkbox/checkbox',
  'components/input/input',
  'components/field/field',
  'components/select/select',
  'components/popover/popover',
  'components/alert-dialog/alert-dialog',
  'components/card/card',
  'components/accordion/accordion',
  'components/textarea/textarea',
  'providers/theme/theme-provider',
  'providers/icons/icons',
]);

export default defineConfig(({ mode }) => {
  const optional = [
    'application',
    'marketing',
    'editor',
    'artifact-editor',
    'conversation-flow',
  ].includes(mode);
  return {
    plugins: [
      react(),
      {
        name: 'optional-shared-public-controls',
        enforce: 'pre',
        resolveId(source, importer) {
          if (!optional || !importer || !source.startsWith('.')) return;
          const target = resolve(dirname(importer), source).replaceAll('\\', '/');
          const module = target.split('/src/')[1]?.replace(/\.(?:js|tsx?|jsx)$/, '');
          // Reuse the installed root providers and controls. Duplicated contexts
          // would lose the originating theme/icon overrides in optional portals.
          if (module && sharedPublicModules.has(module))
            return { id: '@stackunseen/ui', external: true };
          if (mode === 'artifact-editor' && module === 'components/code-editor/code-editor')
            return { id: '@stackunseen/ui/editor', external: true };
          if (module === 'shared/overlay-direction')
            return { id: './_overlay-direction.js', external: true };
        },
      },
      {
        name: 'public-client-boundaries',
        generateBundle(_, bundle) {
          if (!optional)
            this.emitFile({
              type: 'asset',
              fileName: 'terminal.css',
              source: readFileSync(
                fileURLToPath(import.meta.resolve('@xterm/xterm/css/xterm.css')),
                'utf8',
              ),
            });
          for (const item of Object.values(bundle)) {
            if (item.type === 'chunk' && item.isEntry && item.name !== 'theme') {
              item.code = '"use client";\n' + item.code;
            }
          }
        },
      },
    ],
    build: {
      // Optional entries have their own CSS and chunks; the base graph stays unchanged.
      emptyOutDir: !optional,
      lib: {
        entry: optional
          ? {
              [mode]: `src/${mode}.${['editor', 'artifact-editor', 'conversation-flow'].includes(mode) ? 'tsx' : 'ts'}`,
            }
          : {
              index: 'src/index.ts',
              theme: 'src/theme.ts',
              status: 'src/status.tsx',
              markdown: 'src/markdown.tsx',
              'rich-markdown': 'src/rich-markdown.tsx',
              math: 'src/math.tsx',
              mermaid: 'src/mermaid.tsx',
              code: 'src/code.ts',
              highlight: 'src/highlight.tsx',
              terminal: 'src/terminal.tsx',
              viewport: 'src/viewport.tsx',
              layout: 'src/layout.ts',
              sidecar: 'src/sidecar.tsx',
              workspace: 'src/workspace-shell.tsx',
              upload: 'src/upload-attachment.tsx',
              // Internal relative dependency shared by root and optional portals.
              '_overlay-direction': 'src/shared/overlay-direction.ts',
            },
        formats: ['es'],
        cssFileName: optional ? mode : 'styles',
      },
      rolldownOptions: {
        ...(optional ? { output: { chunkFileNames: `optional/${mode}/[name]-[hash].js` } } : {}),
        external: [
          /^react(?:\/|$)/,
          /^react-dom(?:\/|$)/,
          /^@radix-ui\//,
          /^@xterm\//,
          /^@tanstack\//,
          /^@codemirror\//,
          /^react-resizable-panels(?:\/|$)/,
          /^@stackunseen\/ui(?:-core)?(?:\/|$)/,
          /^culori(?:\/|$)/,
          /^(?:cmdk|diff|strip-ansi|zod)(?:\/|$)/,
          /^(?:react-markdown|remark-gfm|remend|mermaid|katex|dompurify|remark-math|shiki)(?:\/|$)/,
        ],
      },
      sourcemap: true,
    },
  };
});
