import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        schema: 'src/schema.ts',
        conversation: 'src/conversation-validation.ts',
        history: 'src/history.ts',
        adapter: 'src/adapter.ts',
        uploads: 'src/uploads.ts',
        editing: 'src/editing.ts',
        'ai-sdk': 'src/ai-sdk.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: { external: [/^zod(?:\/|$)/] },
    sourcemap: true,
  },
});
