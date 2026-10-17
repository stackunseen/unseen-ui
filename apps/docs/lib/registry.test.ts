import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { registryItemNames, registryItemsFor } from './registry-items';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(docs, '../../packages/react/package.json'), 'utf8'))
  .version as string;

// The registry is generated before each docs build; build a fresh copy for these checks.
const out = mkdtempSync(join(tmpdir(), 'unseen-registry-'));
execFileSync(process.execPath, [join(docs, 'scripts/build-registry.mjs'), '--out', out], {
  stdio: 'pipe',
});
const read = (name: string) => JSON.parse(readFileSync(join(out, name), 'utf8'));
const cli = readFileSync(join(docs, '../../packages/react/bin/unseen-ui.mjs'), 'utf8');

describe('shadcn registry', () => {
  it('pins every item to this release and lists each one in the index', () => {
    const index = read('registry.json') as { items: { name: string }[] };
    expect(index.items.map((item) => item.name)).toEqual([...registryItemNames]);
    for (const name of registryItemNames) {
      const item = read(`${name}.json`) as {
        dependencies: string[];
        files: { content: string; target: string }[];
      };
      expect(item.dependencies).toContain(`@stackunseen/ui@${version}`);
      expect(item.files.some((file) => file.content.includes('@stackunseen/ui'))).toBe(true);
    }
  });

  it('writes the same chat code as npx @stackunseen/ui init', () => {
    const chat = read('chat.json') as { files: { content: string }[] };
    const line =
      "const host = useLocalHost({ suggestions: ['Summarize the plan', 'Search notes for renewals'] });";
    expect(chat.files[0]!.content).toContain(line);
    expect(cli).toContain(line);
  });

  it('offers only items that exist from component pages', () => {
    for (const items of Object.values(registryItemsFor))
      for (const item of items) expect(registryItemNames).toContain(item);
  });
});
