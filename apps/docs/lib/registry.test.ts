import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { registryItemNames, registryItemsFor } from './registry-items';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(docs, '../../packages/react/package.json'), 'utf8'))
  .version as string;

describe('shadcn registry', () => {
  it('is up to date with the init templates and the theme source', () => {
    expect(() =>
      execFileSync(process.execPath, [join(docs, 'scripts/build-registry.mjs'), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('pins every item to this release and lists each one in the index', () => {
    const index = JSON.parse(readFileSync(join(docs, 'public/r/registry.json'), 'utf8')) as {
      items: { name: string }[];
    };
    expect(index.items.map((item) => item.name)).toEqual([...registryItemNames]);
    for (const name of registryItemNames) {
      const item = JSON.parse(readFileSync(join(docs, `public/r/${name}.json`), 'utf8')) as {
        dependencies: string[];
        files: { content: string; target: string }[];
      };
      expect(item.dependencies).toContain(`@stackunseen/ui@${version}`);
      expect(item.files.some((file) => file.content.includes('@stackunseen/ui'))).toBe(true);
    }
  });

  it('offers only items that exist from component pages', () => {
    for (const items of Object.values(registryItemsFor))
      for (const item of items) expect(existsSync(join(docs, `public/r/${item}.json`))).toBe(true);
  });
});
