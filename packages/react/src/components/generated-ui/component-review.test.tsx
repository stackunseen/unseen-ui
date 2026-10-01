import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { GeneratedUI } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('rejects excess generated nodes before schema validation reads their contents', () => {
    const text = vi.fn(() => 'value');
    render(
      <GeneratedUI
        surface={{
          id: 'surface',
          version: '1',
          nodes: Array.from({ length: 65 }, (_, index) => ({
            id: `${index}`,
            type: 'text',
            get text() {
              return text();
            },
          })),
        }}
        state="ready"
        onAction={() => {}}
      />,
    );
    expect(text).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('preview limits');
  });

  it.each([
    'duplicate-columns',
    'duplicate-rows',
    'unknown-cell',
    'too-many-cells',
    'empty-action',
  ])('rejects an ambiguous or unbounded generated surface: %s', (scenario) => {
    const node =
      scenario === 'empty-action'
        ? { id: 'action', type: 'action', label: 'Do it', actionId: '' }
        : {
            id: 'table',
            type: 'table',
            caption: 'Data',
            columns:
              scenario === 'duplicate-columns'
                ? [
                    { id: 'a', label: 'A' },
                    { id: 'a', label: 'Again' },
                  ]
                : [{ id: 'a', label: 'A' }],
            rows:
              scenario === 'duplicate-rows'
                ? [
                    { id: '1', cells: { a: 'A' } },
                    { id: '1', cells: { a: 'B' } },
                  ]
                : [
                    {
                      id: '1',
                      cells:
                        scenario === 'unknown-cell'
                          ? { hidden: 'Unlisted' }
                          : scenario === 'too-many-cells'
                            ? Object.fromEntries(
                                Array.from({ length: 21 }, (_, index) => [`${index}`, 'value']),
                              )
                            : { a: 'A' },
                    },
                  ],
          };
    render(
      <GeneratedUI
        surface={{ id: 'surface', version: '1', nodes: [node] }}
        state="ready"
        onAction={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
