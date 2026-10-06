import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPicker, referenceUnavailableReason } from './command-picker.js';
import type { ReferenceOption } from './command-picker.js';
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
const item: ReferenceOption = {
  id: 'ref-1',
  label: 'search.ts',
  description: 'Selected symbol',
  kind: 'symbol',
  version: '1',
  target: { documentId: 'file-1', version: '1', range: { from: 0, to: 1 } },
  resource: { documentId: 'file-1', version: '1', text: 'A🙂B' },
};
describe('precise reference selection', () => {
  it('emits the exact resource and range and discloses UTF-16 meaning', () => {
    const select = vi.fn();
    render(
      <SearchPicker reference items={[item]} query="" onQueryChange={vi.fn()} onSelect={select} />,
    );
    fireEvent.click(screen.getByRole('option'));
    expect(select).toHaveBeenCalledExactlyOnceWith(item);
    expect(screen.getByRole('option')).toHaveTextContent('UTF-16 0–1 (end exclusive)');
  });
  it.each([
    { ...item, resource: { ...item.resource!, version: '2' } },
    { ...item, target: { ...item.target!, range: { from: 2, to: 3 } } },
    { ...item, resource: undefined },
    {
      ...item,
      target: { ...item.target!, digest: 'original' },
      resource: { ...item.resource!, digest: 'changed' },
    },
    { ...item, access: 'revoked' as const },
  ])('blocks invalid, stale or unavailable exact references', (option) => {
    const select = vi.fn();
    expect(referenceUnavailableReason(option)).toBeTruthy();
    render(
      <SearchPicker
        reference
        items={[option]}
        query=""
        onQueryChange={vi.fn()}
        onSelect={select}
      />,
    );
    expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('option'));
    expect(select).not.toHaveBeenCalled();
  });
  it('locks unknown searches and duplicate option identities', () => {
    const select = vi.fn();
    const { rerender } = render(
      <SearchPicker
        reference
        items={[item]}
        status="unknown"
        query=""
        onQueryChange={vi.fn()}
        onSelect={select}
      />,
    );
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    rerender(
      <SearchPicker
        reference
        items={[item, item]}
        query=""
        onQueryChange={vi.fn()}
        onSelect={select}
      />,
    );
    for (const option of screen.getAllByRole('option'))
      expect(option).toHaveAttribute('aria-disabled', 'true');
  });
});
