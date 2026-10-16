import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolResult, ToolResultRegistryProvider } from './tool-result.js';
import type { ToolResultData, ToolResultRegistry } from './tool-result.js';

const registry: ToolResultRegistry = {
  match: (result) => (result.toolName === 'search_accounts' ? 'accounts' : undefined),
  renderers: {
    accounts: ({ result, label }) => (
      <ul aria-label={label}>
        {(result.data as { name: string }[]).map((row) => (
          <li key={row.name}>{row.name}</li>
        ))}
      </ul>
    ),
  },
};
const accounts: ToolResultData = {
  toolName: 'search_accounts',
  mediaType: 'application/json',
  data: [{ name: 'Acme Sandbox' }, { name: 'Example Studio' }],
};

describe('ToolResult renderer registry and partial results', () => {
  it('uses the host renderer only for results the host matches and falls back to bounded text otherwise', () => {
    const { rerender } = render(
      <ToolResultRegistryProvider registry={registry}>
        <ToolResult result={accounts} label="Accounts" />
      </ToolResultRegistryProvider>,
    );
    expect(screen.getByRole('list', { name: 'Accounts' })).toHaveTextContent('Acme Sandbox');
    expect(screen.queryByRole('group')).toBeNull();
    const other: ToolResultData = { toolName: 'other', data: { ok: true } };
    rerender(
      <ToolResultRegistryProvider registry={registry}>
        <ToolResult result={other} label="Other" />
      </ToolResultRegistryProvider>,
    );
    expect(screen.getByRole('group', { name: 'Other' })).toHaveTextContent('"ok": true');
    rerender(<ToolResult result={accounts} label="No registry" />);
    expect(screen.getByRole('group', { name: 'No registry' })).toHaveTextContent('Acme Sandbox');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('marks partial output with the host counts and never invents a total', () => {
    const { rerender } = render(
      <ToolResult
        text="row 1\nrow 2"
        partial={{
          received: { kind: 'measured', value: 2 },
          expected: { kind: 'measured', value: 40 },
          unit: 'rows',
        }}
      />,
    );
    const root = screen.getByRole('status').closest('[data-part="tool-result"]')!;
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveAttribute('data-partial', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Partial');
    expect(screen.getByRole('status')).toHaveTextContent('2 of 40 rows received.');
    rerender(
      <ToolResult
        partial={{ received: { kind: 'measured', value: 7 }, expected: { kind: 'unknown' } }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('7 items received so far; total unknown.');
    expect(screen.getByRole('group')).toHaveTextContent('Waiting for output…');
    rerender(<ToolResult partial={{ received: { kind: 'unknown', reason: 'no byte counts' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Receiving; count unknown.');
    rerender(<ToolResult text="done" />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-busy');
  });
});
