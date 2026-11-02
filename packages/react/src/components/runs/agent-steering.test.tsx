import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Run } from '@stackunseen/ui-core';
import { AgentSteering } from './agent-steering.js';
import { CostLedger } from './cost-ledger.js';

const run: Run = { id: 'r1', attemptId: 'a1', threadId: 't1', version: 4, lifecycle: 'running' };

describe('AgentSteering', () => {
  it('sends a note bound to the run version and keeps the draft until acknowledged', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <AgentSteering
        run={run}
        notes={[
          { id: 'n1', text: 'Skip the archive step', at: '2026-10-27T08:30:00Z', status: 'applied', detail: 'Step 4' },
          { id: 'n2', text: 'Use the EU region', at: '2026-10-27T08:31:00Z', status: 'rejected', detail: 'Run moved on' },
        ]}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Not applied')).toBeInTheDocument();
    const field = screen.getByLabelText('Note for the next step');
    const send = screen.getByRole('button', { name: 'Send to the next step' });
    expect(send).toBeDisabled();
    await user.type(field, 'Stop after the dry run');
    await user.click(send);
    expect(onSubmit).toHaveBeenCalledWith({ runId: 'r1', runVersion: 4, text: 'Stop after the dry run' });
    rerender(<AgentSteering run={run} notes={[]} onSubmit={onSubmit} submission="submitting" />);
    expect(field).toBeDisabled();
    expect(field).toHaveValue('Stop after the dry run');
    rerender(<AgentSteering run={run} notes={[]} onSubmit={onSubmit} submission="failed" />);
    expect(screen.getByRole('status')).toHaveTextContent('Not sent');
    expect(field).toHaveValue('Stop after the dry run');
    rerender(<AgentSteering run={run} notes={[]} onSubmit={onSubmit} submission="acknowledged" />);
    expect(field).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Received');
  });
  it('refuses notes for a finished run and says why', () => {
    render(<AgentSteering run={{ ...run, lifecycle: 'succeeded' }} notes={[]} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Note for the next step')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('The run has finished');
  });
});

describe('CostLedger', () => {
  const rows = [
    { id: 'a', title: 'Refund batch', agent: 'Orders', model: 'Opus', tokens: { kind: 'measured' as const, value: 6200 }, cost: { kind: 'measured' as const, value: { amount: 0.31, currency: 'USD' } } },
    { id: 'b', title: 'Translate', agent: 'Translator', cost: { kind: 'estimated' as const, value: { amount: 0.42, currency: 'USD' }, basis: 'token price list' } },
    { id: 'c', title: 'Image cache', cost: { kind: 'unknown' as const, reason: 'provider offline' } },
    { id: 'd', title: 'Payouts', cost: { kind: 'measured' as const, value: { amount: 0.02, currency: 'USD' } } },
  ];
  it('adds only measured rows and counts the rest', () => {
    render(<CostLedger rows={rows} period="today" />);
    const table = screen.getByRole('table', { name: /Cost ledger, today/ });
    expect(table).toHaveTextContent('$0.33');
    expect(table).toHaveTextContent('Measured across 2 of 4; 1 estimated, 1 unknown not included');
    expect(table).toHaveTextContent('~$0.42');
    expect(table).toHaveTextContent('Unknown (provider offline)');
  });
  it('prefers the host total and refuses to add mixed currencies', () => {
    const { rerender } = render(
      <CostLedger rows={rows} total={{ kind: 'measured', value: { amount: 1.5, currency: 'EUR' } }} />,
    );
    expect(screen.getByRole('table')).toHaveTextContent('Reported by your billing€1.50');
    rerender(
      <CostLedger
        variant="compact"
        rows={[rows[0]!, { ...rows[3]!, cost: { kind: 'measured', value: { amount: 1, currency: 'EUR' } } }]}
      />,
    );
    expect(screen.getByText(/more than one currency/)).toBeInTheDocument();
  });
});
