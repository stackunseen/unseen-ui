// The styling convention: every component takes `className` on its root, either as its own prop
// or by passing HTML attributes through. The manifest is generated from the published types, so
// this fails when a new component ships without it (run `pnpm manifest` after a build first).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArtifactDiff } from '../src/components/artifact-diff/artifact-diff.js';
import { ContextBar } from '../src/components/context-bar/context-bar.js';
import { MemoryControls } from '../src/components/memory-controls/memory-controls.js';
import { MemoryPanel } from '../src/components/memory-panel/memory-panel.js';
import { Plan } from '../src/components/plan/plan.js';

interface ManifestExport {
  name: string;
  kind: string;
  props?: { name: string }[];
  inherits?: string[];
}
const manifest = JSON.parse(readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8')) as {
  entries: { exports: ManifestExport[] }[];
};

/** Components with no element of their own to style, and why. */
const withoutRoot: Record<string, string> = {
  AILocale: 'context provider',
  IconsProvider: 'context provider',
  LinkProvider: 'context provider',
  RuntimeProvider: 'context provider',
  ToolResultRegistryProvider: 'context provider',
  UnsavedGuard: 'renders only a confirmation dialog it owns',
  ConversationMessageActions: 'renders MessageActions and its dialogs as siblings',
};

describe('className on the root', () => {
  it('is accepted by every component except the ones with no root of their own', () => {
    // A component re-exported from a second entry is listed there without its props.
    const accepts = new Map<string, boolean>();
    for (const entry of manifest.entries)
      for (const item of entry.exports) {
        if (item.kind !== 'component') continue;
        const own = item.props?.some((prop) => prop.name === 'className') ?? false;
        accepts.set(item.name, accepts.get(item.name) || own || !!item.inherits?.length);
      }
    const missing = [...accepts].filter(([, ok]) => !ok).map(([name]) => name);
    expect(missing.sort()).toEqual(Object.keys(withoutRoot).sort());
  });

  it('lands on the root element, after the component’s own classes', () => {
    const version = { id: 'v1', label: 'V1', text: 'a', author: 'A', access: 'available' as const };
    const cases = [
      <Plan key="plan" title="Plan" className="mine" />,
      <ContextBar key="bar" items={[]} className="mine" />,
      <MemoryControls key="controls" items={[]} onRequest={() => {}} className="mine" />,
      <MemoryPanel
        key="panel"
        entries={[]}
        query=""
        onQueryChange={() => {}}
        onRequest={() => {}}
        className="mine"
      />,
      <ArtifactDiff
        key="diff"
        path="a.md"
        versions={[version]}
        beforeId="v1"
        afterId="v1"
        onVersionsChange={() => {}}
        className="mine"
      />,
    ];
    for (const element of cases) {
      const { container, unmount } = render(element);
      const root = container.firstElementChild!;
      expect(root).toHaveClass('mine');
      expect(root.className.trim().split(/\s+/).at(-1)).toBe('mine');
      expect(container.querySelectorAll('.mine')).toHaveLength(1);
      unmount();
    }
  });
});
