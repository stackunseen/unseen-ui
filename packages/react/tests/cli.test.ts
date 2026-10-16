import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error The CLI is plain JavaScript without declarations.
import { run } from '../bin/unseen-ui.mjs';

function project(dependencies: Record<string, string>, dirs: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'unseen-init-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'demo', dependencies }));
  for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true });
  return root;
}

describe('npx @stackunseen/ui init', () => {
  it('writes a local Chat into src/components for a Vite project and prints next steps', () => {
    const root = project({ react: '19.3.0', vite: '8.0.0' }, ['src']);
    const lines: string[] = [];
    expect(run(['init'], root, (line: string) => lines.push(line))).toBe(0);
    const file = readFileSync(join(root, 'src/components/assistant.tsx'), 'utf8');
    expect(file).toContain('useLocalHost');
    expect(file).toContain("import '@stackunseen/ui/chat.css';");
    expect(lines).toContain('Install: npm install @stackunseen/ui');
    expect(lines.some((line) => line.includes("from './components/assistant'"))).toBe(true);
  });

  it('writes the AI SDK component and a route in a Next.js app and keeps existing files', () => {
    const root = project({ next: '16.3.6', react: '19.3.0', '@stackunseen/ui': '0.1.0-alpha.7' }, [
      'app',
    ]);
    const lines: string[] = [];
    run(['init', '--ai-sdk'], root, (line: string) => lines.push(line));
    expect(readFileSync(join(root, 'components/assistant.tsx'), 'utf8')).toContain('useAiSdkChat');
    expect(readFileSync(join(root, 'app/api/chat/route.ts'), 'utf8')).toContain(
      'needsApproval: true',
    );
    expect(lines).toContain('Install: npm install @ai-sdk/react ai zod');
    writeFileSync(join(root, 'components/assistant.tsx'), 'mine');
    const again: string[] = [];
    run(['init'], root, (line: string) => again.push(line));
    expect(readFileSync(join(root, 'components/assistant.tsx'), 'utf8')).toBe('mine');
    expect(again.some((line) => line.startsWith('kept components'))).toBe(true);
  });

  it('dry runs without writing and refuses outside a project', () => {
    const root = project({ react: '19.3.0' });
    const lines: string[] = [];
    run(['init', '--dry-run'], root, (line: string) => lines.push(line));
    expect(existsSync(join(root, 'components/assistant.tsx'))).toBe(false);
    expect(lines[0]).toBe('would write components/assistant.tsx');
    const empty = mkdtempSync(join(tmpdir(), 'unseen-empty-'));
    expect(() => run(['init'], empty, () => {})).toThrow('No package.json here');
    expect(() => run(['init', '--nope'], root, () => {})).toThrow('Unknown option');
  });
});
