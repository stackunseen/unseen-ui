import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'public-client-boundaries',
      generateBundle(_, bundle) {
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
    lib: {
      entry: {
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
      },
      formats: ['es'],
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: [
        /^react(?:\/|$)/,
        /^react-dom(?:\/|$)/,
        /^@radix-ui\//,
        /^@xterm\//,
        /^@tanstack\//,
        /^react-resizable-panels(?:\/|$)/,
        /^@ai-interaction\//,
        /^culori(?:\/|$)/,
        /^(?:cmdk|diff|strip-ansi|zod)(?:\/|$)/,
        /^(?:react-markdown|remark-gfm|remend|mermaid|katex|dompurify|remark-math|shiki)(?:\/|$)/,
      ],
    },
    sourcemap: true,
  },
});
