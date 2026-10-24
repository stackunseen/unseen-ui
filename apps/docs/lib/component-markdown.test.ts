import { describe, expect, it } from 'vitest';
import { catalog, catalogStyles } from './catalog';
import { componentMarkdown } from './component-markdown';
import { manifestProps } from './component-props';
import { componentUsage } from './component-usage';

const markdownFor = (name: string) => {
  const entry = catalog.find((item) => item.name === name)!;
  const { usage, packages } = componentUsage(
    entry,
    entry.states[0]!,
    catalogStyles(entry)?.[0] ?? '',
  );
  return componentMarkdown({
    entry,
    installLine: `npm install ${packages}`,
    usage,
    origin: 'https://unseenui.com',
    allProps: manifestProps(entry).props,
  });
};

describe('component Markdown for coding agents', () => {
  it('gives every component a default example with a real style', () => {
    for (const entry of catalog) {
      const { usage } = componentUsage(entry, entry.states[0]!, catalogStyles(entry)?.[0] ?? '');
      expect(usage, entry.name).not.toMatch(/="undefined"|(?:variant|layout|presentation)=""/);
    }
  });

  it('carries the page sections, the anatomy and every prop', () => {
    const chat = markdownFor('Chat');
    for (const heading of [
      '# Chat',
      '## Installation',
      '## Anatomy',
      '## Usage',
      '## All props',
      '## Keyboard',
    ])
      expect(chat).toContain(heading);
    expect(chat).toContain('<Chat variant="panel"');
    expect(chat).toContain('npx shadcn@latest add https://unseenui.com/r/chat.json');
    expect(chat).toContain('| `host` |');
  });

  it('keeps table cells on one row', () => {
    const rows = markdownFor('AgentHandoff')
      .split('\n')
      .filter((line) => line.startsWith('| `'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.split(/(?<!\\)\|/).length).toBe(5);
  });
});
