import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
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
  // Controls and helpers that optional entries render through the installed root, so one
  // LinkProvider, one copy hook and one stylesheet serve every entry.
  'components/chip/chip',
  'components/segmented-control/segmented-control',
  'components/kbd/kbd',
  'components/loading-indicator/loading-indicator',
  'components/dropdown-menu/dropdown-menu',
  'components/tooltip/tooltip',
  'components/icon-button/icon-button',
  'components/progress/progress',
  'components/link-button/link-button',
  'components/copy-button/copy-button',
  'components/input-group/input-group',
  'components/status-badge/status-badge',
  'components/execution-timeline/execution-timeline',
  'components/message/message',
  'components/message-content/message-content',
  'components/prompt-input/prompt-input',
  'components/suggestions/suggestions',
  'components/approval-card/approval-card',
  'components/tool-call/tool-call',
  'shared/link',
  'shared/copy',
]);

// Short, deterministic CSS Module names: the class name plus a per-file suffix.
// The same source file always maps to the same suffix, so root and optional
// builds stay consistent.
function scopedName(name: string, file: string) {
  const source = file.replaceAll('\\', '/').split('/src/').pop() ?? file;
  const hash = createHash('sha256').update(source).digest('hex');
  return `${name}_${hash.slice(0, 4)}`;
}

export default defineConfig(({ mode }) => {
  const optional = [
    'application',
    'marketing',
    'editor',
    'artifact-editor',
    'conversation-flow',
    'assistant',
    'devtools',
    'media',
    'navigation',
    'mcp-apps',
    'chat',
  ].includes(mode);
  return {
    css: { modules: { generateScopedName: scopedName } },
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
              [mode]: `src/${mode}.${['editor', 'artifact-editor', 'conversation-flow', 'mcp-apps', 'chat'].includes(mode) ? 'tsx' : 'ts'}`,
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
