import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checklist, checklistToMarkdown } from './checklist.js';
import type { ChecklistItem } from './checklist.js';
import { useStoredChecklist } from './use-stored-checklist.js';

afterEach(() => {
  cleanup();
  delete (navigator as { clipboard?: unknown }).clipboard;
  localStorage.clear();
});

const items: ChecklistItem[] = [
  { id: 'scope', title: 'Write the scope', group: 'Plan', eyebrow: 'Step 1' },
  { id: 'owner', title: 'Name an owner', group: 'Plan', detail: 'One person, not a team.' },
  { id: 'eval', title: 'Pick an eval set', group: 'Build' },
  { id: 'ship', title: 'Ship behind a flag' },
];

function Host({ initial = [] as string[], ...props }: { initial?: string[]; rowToggle?: boolean }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <Checklist
      items={items}
      label="Launch checklist"
      value={value}
      onValueChange={setValue}
      actions={{ copyMarkdown: true, reset: true }}
      {...props}
    />
  );
}

describe('Checklist', () => {
  it('ticks items through the host, groups consecutive items, and shows progress', async () => {
    const user = userEvent.setup();
    render(<Host initial={['scope']} />);
    const bar = screen.getByRole('progressbar', { name: 'Launch checklist progress' });
    expect(bar).toHaveAttribute('aria-valuetext', '1 of 4');
    const plan = screen.getByRole('region', { name: 'Plan' });
    expect(plan).toHaveTextContent('1 / 2');
    expect(within(plan).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Build' })).toBeInTheDocument();
    const owner = screen.getByRole('checkbox', { name: 'Name an owner' });
    await user.click(owner);
    expect(owner).toBeChecked();
    expect(bar).toHaveAttribute('aria-valuetext', '2 of 4');
    expect(plan).toHaveTextContent('2 / 2');
    expect(screen.getByText('Ship behind a flag').closest('ol')).toHaveAttribute('start', '4');
  });

  it('toggles from the row when asked, except on links, buttons, labels and the box', async () => {
    const user = userEvent.setup();
    render(<Host rowToggle />);
    const row = screen.getByText('Pick an eval set').closest('li')!;
    await user.click(screen.getByText('Pick an eval set'));
    expect(within(row).getByRole('checkbox')).toBeChecked();
    await user.click(within(row).getByRole('checkbox'));
    expect(within(row).getByRole('checkbox')).not.toBeChecked();
  });

  it('resets with undo, announces both, and copies Markdown with the real outcome', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Host initial={['scope', 'eval']} />);
    await user.click(screen.getByRole('button', { name: 'Copy as Markdown' }));
    expect(writeText).toHaveBeenCalledWith(
      '# Launch checklist\n\n## Plan\n\n- [x] Write the scope\n- [ ] Name an owner\n  One person, not a team.\n\n## Build\n\n- [x] Pick an eval set\n- [ ] Ship behind a flag\n',
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '0 of 4');
    expect(
      screen.getAllByRole('status').some((node) => node.textContent === 'Progress cleared'),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2 of 4');
    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some((node) => node.textContent === 'Progress restored'),
      ).toBe(true),
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('hides the Markdown action for rich titles and renders on the server', () => {
    const rich = [
      { id: 'a', title: <em>Rich</em> },
      { id: 'b', title: 'Plain' },
    ];
    render(
      <Checklist
        items={rich}
        label="Mixed"
        value={[]}
        onValueChange={() => {}}
        actions={{ copyMarkdown: true }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Copy as Markdown' })).toBeNull();
    const html = renderToString(
      <Checklist items={items} label="Server" value={['scope']} onValueChange={() => {}} />,
    );
    expect(html).toContain('Write the scope');
    expect(html).toContain('checked');
    expect(checklistToMarkdown('L', [{ id: 'x', title: 'Only' }], [])).toBe('# L\n\n- [ ] Only\n');
  });
});

describe('useStoredChecklist', () => {
  it('reads and writes a key, follows other tabs, and survives blocked storage', () => {
    localStorage.setItem('check:entry', JSON.stringify(['a', 'b', 7]));
    const { result } = renderHook(() => useStoredChecklist('check:entry'));
    expect(result.current[0]).toEqual(['a', 'b']);
    act(() => result.current[1](['b', 'c', 'c']));
    expect(result.current[0]).toEqual(['b', 'c']);
    expect(localStorage.getItem('check:entry')).toBe('["b","c"]');
    act(() => {
      localStorage.setItem('check:entry', '["z"]');
      window.dispatchEvent(new StorageEvent('storage', { key: 'check:entry' }));
    });
    expect(result.current[0]).toEqual(['z']);
    expect(renderToString(<Probe />)).toContain('0');
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      clear: () => {},
    };
    vi.stubGlobal('localStorage', blocked);
    const { result: offline } = renderHook(() => useStoredChecklist('check:blocked'));
    expect(offline.current[0]).toEqual([]);
    act(() => offline.current[1](['kept']));
    expect(offline.current[0]).toEqual(['kept']);
    vi.unstubAllGlobals();
  });
});

function Probe() {
  const [ids] = useStoredChecklist('check:entry');
  return <span>{ids.length}</span>;
}
