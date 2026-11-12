// The root convention: every component takes `className` on its root, and passes the root's other
// attributes and `ref` through unless it is listed below with a reason. The manifest is generated from the published types, so
// this fails when a new component ships without it (run `pnpm manifest` after a build first).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArtifactDiff } from '../src/components/artifact-diff/artifact-diff.js';
import { ContextBar } from '../src/components/context-bar/context-bar.js';
import { MemoryControls } from '../src/components/memory-controls/memory-controls.js';
import { MemoryPanel } from '../src/components/memory-panel/memory-panel.js';
import { Persona } from '../src/components/persona/persona.js';
import { Plan } from '../src/components/plan/plan.js';
import { ToolCall } from '../src/components/tool-call/tool-call.js';

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

/** Components that take `className` but not the root's other attributes, and why. */
const classNameOnly: Record<string, string> = {
  ArtifactPanel: 'overlay: className goes to the dialog surface',
  Citation: 'overlay: className goes to the citation button',
  CommandPalette: 'overlay: className goes to the dialog surface',
  Modal: 'overlay: className goes to the dialog surface',
  ModelSelector: 'overlay: className goes to the trigger',
  ShortcutHelp: 'overlay: className goes to the dialog surface',
  OrgSwitcher: 'other props go to the select control',
  Chat: 'host and controlled props are read as a whole',
  CodeEditor: 'props are handed to the editor model as a whole',
  ArtifactEditor: 'wraps CodeEditor',
  BranchSwitcher: 'navigation state reads the props as a whole',
  MessageQueue: 'navigation state reads the props as a whole',
  ThreadList: 'navigation state reads the props as a whole',
  BackgroundStatus: 'the root is a button or a div depending on onOpen',
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

  it('comes with the root’s other attributes, except on the listed components', () => {
    const passes = new Map<string, boolean>();
    for (const entry of manifest.entries)
      for (const item of entry.exports) {
        if (item.kind !== 'component') continue;
        passes.set(item.name, passes.get(item.name) || !!item.inherits?.length);
      }
    const closed = [...passes].filter(([, ok]) => !ok).map(([name]) => name);
    expect(closed.sort()).toEqual(
      [...Object.keys(withoutRoot), ...Object.keys(classNameOnly)].sort(),
    );
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

  it('puts other attributes and the ref on the root, and keeps its own', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Plan
        title="Plan"
        ref={ref}
        id="mine"
        data-testid="plan"
        aria-describedby="note"
        data-part="x"
      />,
    );
    const root = container.firstElementChild!;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('id', 'mine');
    expect(root).toHaveAttribute('aria-describedby', 'note');
    expect(root).toHaveAttribute('data-part', 'plan');
  });

  it('merges a ref and focus handlers with the ones a component needs itself', () => {
    const seen: (HTMLDivElement | null)[] = [];
    let focusEvents = 0;
    const { container, unmount } = render(
      <MemoryControls
        items={[]}
        onRequest={() => {}}
        ref={(node) => {
          seen.push(node);
        }}
        onFocusCapture={() => {
          focusEvents += 1;
        }}
        role="region"
      />,
    );
    const root = container.firstElementChild as HTMLDivElement;
    expect(seen).toEqual([root]);
    expect(root).toHaveAttribute('role', 'group');
    fireEvent.focus(root);
    expect(focusEvents).toBe(1);
    unmount();
    expect(seen.at(-1)).toBeNull();
  });

  it('keeps a caller’s style beside the component’s own, and reaches both ToolCall roots', () => {
    const persona = render(<Persona state="idle" style={{ margin: 4 }} />).container
      .firstElementChild as HTMLElement;
    expect(persona.style.margin).toBe('4px');
    expect(persona.style.getPropertyValue('--ai-persona-size')).toBe('64px');
    for (const variant of ['row', 'card'] as const) {
      const { container } = render(
        <ToolCall value={{ name: 'search' }} variant={variant} data-testid="tool" />,
      );
      expect(container.firstElementChild).toHaveAttribute('data-testid', 'tool');
    }
  });
});
