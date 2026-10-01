import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type {
  GroupProps,
  PanelProps,
  SeparatorProps,
} from '../../../node_modules/react-resizable-panels/dist/react-resizable-panels.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SplitPane } from './split-pane.js';
import type { SplitPaneSizes } from './split-pane.js';

// Tests controlled props with a mocked primitive; resizing geometry needs browser tests.
const primitive = vi.hoisted(() => ({
  complete: undefined as ((sizes: SplitPaneSizes, user: boolean) => void) | undefined,
  applied: [] as SplitPaneSizes[],
  targets: undefined as GroupProps['resizeTargetMinimumSize'],
}));
vi.mock('react-resizable-panels', async () => {
  const { useImperativeHandle, useRef } = await import('react');
  return {
    Group({
      children,
      groupRef,
      defaultLayout = {},
      orientation,
      disabled,
      onLayoutChanged,
      resizeTargetMinimumSize,
    }: GroupProps) {
      const current = useRef(defaultLayout);
      const ids = Object.keys(defaultLayout);
      primitive.targets = resizeTargetMinimumSize;
      useImperativeHandle(groupRef, () => ({
        getLayout: () => current.current,
        setLayout: (layout) => {
          current.current = layout;
          primitive.applied.push([layout[ids[0]!]!, layout[ids[1]!]!]);
          onLayoutChanged?.(layout, { isUserInteraction: false });
          return layout;
        },
      }));
      primitive.complete = (sizes, user) => {
        current.current = { [ids[0]!]: sizes[0], [ids[1]!]: sizes[1] };
        onLayoutChanged?.(current.current, { isUserInteraction: user });
      };
      return (
        <div data-axis={orientation} data-locked={disabled}>
          {children}
        </div>
      );
    },
    Panel({ children, id, role, 'aria-label': label, 'aria-hidden': hidden }: PanelProps) {
      return (
        <div id={id} data-panel role={role} aria-label={label} aria-hidden={hidden}>
          {children}
        </div>
      );
    },
    Separator({ children, disabled, elementRef, ...rest }: SeparatorProps) {
      return (
        <div
          ref={elementRef}
          id={rest.id}
          role="separator"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          aria-label={rest['aria-label']}
          aria-describedby={rest['aria-describedby']}
        >
          {children}
        </div>
      );
    },
  };
});

const primary = {
  id: 'main',
  label: 'Main editor',
  children: <input aria-label="Document title" />,
  minSize: 30,
};
const secondary = {
  id: 'inspector',
  label: 'Inspector',
  children: <button>Inspect selected item</button>,
  minSize: 20,
  collapsible: true,
};
afterEach(() => {
  primitive.applied = [];
  primitive.complete = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SplitPane controlled boundary', () => {
  it('names both regions and the compact separator without inventing persistence', () => {
    const change = vi.fn();
    const storage = vi.spyOn(Storage.prototype, 'getItem');
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    expect(screen.getByRole('region', { name: 'Main editor' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toHaveAccessibleName('Resize Main editor and Inspector');
    expect(screen.getByRole('separator')).toHaveAccessibleDescription(/Left and Right arrow keys/);
    expect(primitive.targets).toEqual({ coarse: 44, fine: 16 });
    expect(change).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });
  it('emits only immutable completed user requests and reconciles an accepted layout', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    function Example() {
      const [sizes, setSizes] = useState<SplitPaneSizes>([70, 30]);
      return (
        <SplitPane
          label="Editor workspace"
          primary={primary}
          secondary={secondary}
          sizes={sizes}
          onSizesChange={(next, meta) => {
            change(next, meta);
            setSizes(next);
          }}
        />
      );
    }
    render(<Example />);
    act(() => primitive.complete?.([60, 40], false));
    expect(change).not.toHaveBeenCalled();
    act(() => primitive.complete?.([55, 45], true));
    expect(change).toHaveBeenCalledExactlyOnceWith([55, 45], {
      source: 'user',
      collapsedPanel: null,
    });
    expect(Object.isFrozen(change.mock.calls[0]![0])).toBe(true);
    expect(Object.isFrozen(change.mock.calls[0]![1])).toBe(true);
    act(() => vi.runOnlyPendingTimers());
    expect(primitive.applied).not.toContainEqual([70, 30]);
  });
  it('returns a declined resize to controlled props without acknowledging its result', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    act(() => primitive.complete?.([60, 40], true));
    expect(change).toHaveBeenCalledOnce();
    act(() => vi.runOnlyPendingTimers());
    expect(primitive.applied.at(-1)).toEqual([70, 30]);
    expect(change).toHaveBeenCalledOnce();
  });
  it('programmatic layouts never emit user requests', () => {
    const change = vi.fn();
    const { rerender } = render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    rerender(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[60, 40]}
        onSizesChange={change}
      />,
    );
    expect(primitive.applied.at(-1)).toEqual([60, 40]);
    expect(change).not.toHaveBeenCalled();
  });
  it.each([true, false])('locked=%s blocks primitive user requests', (disabled) => {
    const change = vi.fn();
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        disabled={disabled}
        onSizesChange={disabled ? change : undefined}
      />,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-disabled', 'true');
    act(() => primitive.complete?.([60, 40], true));
    expect(change).not.toHaveBeenCalled();
  });
  it('controlled collapse removes contents and restores focused actions to the separator', () => {
    const change = vi.fn();
    const { rerender } = render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    screen.getByRole('button', { name: 'Inspect selected item' }).focus();
    rerender(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[100, 0]}
        onSizesChange={change}
      />,
    );
    expect(screen.queryByRole('region', { name: 'Inspector' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect selected item' })).not.toBeInTheDocument();
    expect(screen.getByRole('separator')).toHaveFocus();
    expect(change).not.toHaveBeenCalled();
    rerender(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeInTheDocument();
  });
  it('does not steal focus outside the layout during host collapse', () => {
    const change = vi.fn();
    const fixture = (sizes: SplitPaneSizes) => (
      <>
        <button>Outside</button>
        <SplitPane
          label="Editor workspace"
          primary={primary}
          secondary={secondary}
          sizes={sizes}
          onSizesChange={change}
        />
      </>
    );
    const { rerender } = render(fixture([70, 30]));
    screen.getByRole('button', { name: 'Inspect selected item' }).focus();
    screen.getByRole('button', { name: 'Outside' }).focus();
    rerender(fixture([100, 0]));
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });
  it('rejects invalid and out of bounds primitive requests', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={change}
      />,
    );
    act(() => primitive.complete?.([90, 10], true));
    act(() => primitive.complete?.([NaN, 30], true));
    act(() => vi.runOnlyPendingTimers());
    expect(change).not.toHaveBeenCalled();
    expect(primitive.applied.at(-1)).toEqual([70, 30]);
  });
  it.each([
    { sizes: [60, 30] as SplitPaneSizes },
    { sizes: [NaN, 30] as SplitPaneSizes },
    { primary: { ...primary, id: secondary.id } },
    { primary: { ...primary, minSize: 75 } },
    { secondary: { ...secondary, maxSize: 25 } },
    { primary: { ...primary, id: 'bad id' } },
    { primary: { ...primary, label: '' } },
    { sizes: [0, 100] as SplitPaneSizes },
    { stackAt: 0 },
  ])('hides child content for invalid controlled configuration %#', (override) => {
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        {...override}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Split layout unavailable');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
  it('responsive stacking preserves the child node, draft and focus', () => {
    let resized: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resized = callback;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    render(
      <SplitPane
        label="Editor workspace"
        primary={primary}
        secondary={secondary}
        sizes={[70, 30]}
        onSizesChange={() => {}}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Document title' }) as HTMLInputElement;
    input.value = 'Uncommitted editor draft';
    input.focus();
    act(() =>
      resized?.([{ contentRect: { width: 360 } } as ResizeObserverEntry], {} as ResizeObserver),
    );
    expect(screen.getByRole('group', { name: 'Editor workspace' })).toHaveAttribute(
      'data-orientation',
      'vertical',
    );
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('Uncommitted editor draft');
    expect(input).toHaveFocus();
    expect(screen.getByRole('separator')).toHaveAccessibleDescription(/Up and Down arrow keys/);
    act(() =>
      resized?.([{ contentRect: { width: 900 } } as ResizeObserverEntry], {} as ResizeObserver),
    );
    expect(screen.getByRole('group', { name: 'Editor workspace' })).toHaveAttribute(
      'data-orientation',
      'horizontal',
    );
    expect(screen.getByRole('textbox')).toBe(input);
  });
  it.each(['split', 'stacked', 'responsive'] as const)(
    '%s presentation names its orientation and supports a custom grip',
    (presentation) => {
      render(
        <SplitPane
          label="Editor workspace"
          primary={primary}
          secondary={secondary}
          sizes={[70, 30]}
          presentation={presentation}
          grip={<span>Custom grip</span>}
          resizeLabel="Resize editor panels"
        />,
      );
      expect(screen.getByRole('separator')).toHaveAccessibleName('Resize editor panels');
      expect(screen.getByText('Custom grip').closest('[aria-hidden]')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(screen.getByRole('group')).toHaveAttribute(
        'data-orientation',
        presentation === 'stacked' ? 'vertical' : 'horizontal',
      );
    },
  );
});
