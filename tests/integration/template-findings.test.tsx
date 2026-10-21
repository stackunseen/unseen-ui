import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AgentSteps,
  ApprovalCard,
  CodeDiff,
  EmptyState,
  TerminalOutput,
  type ApprovalProposal,
  type Step,
} from '@stackunseen/ui';

// Issues found by building the Pro chat and coding-agent templates on the published API.

const proposal: ApprovalProposal = {
  id: 'p1',
  version: 1,
  runId: 'r1',
  toolCallId: 't1',
  actionDigest: 'd1',
  title: 'Open a pull request',
  target: 'main ← feature',
  scopes: [],
  impact: 'Pushes 2 files.',
  expiresAt: '',
  risk: 'unknown',
  status: 'pending',
};

describe('findings from the Pro templates', () => {
  it('lets EmptyState take a title and description directly', () => {
    render(<EmptyState title="No tasks yet" description="Describe a task to start." />);
    expect(screen.getByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument();
    expect(screen.getByText('Describe a task to start.')).toBeInTheDocument();
  });

  it('keeps unknown risk and missing scopes out of the approval summary but in Details', () => {
    render(<ApprovalCard proposal={proposal} submission="idle" onDecision={() => {}} />);
    expect(screen.queryByText(/No scopes supplied/)).toBeNull();
    expect(screen.queryByText(/Risk not assessed/)).toBeNull();
    expect(screen.getByText('main ← feature')).toBeInTheDocument();
    expect(screen.getByText('Scopes').nextElementSibling).toHaveTextContent('None supplied');
  });

  it('names a new file instead of counting zero removals, without a newline note', () => {
    render(
      <CodeDiff
        path="src/a.test.ts"
        before=""
        after={'one\ntwo\n'}
        baseVersion="main"
        nextVersion="turn 1"
      />,
    );
    expect(screen.getByText('New file · +2')).toBeInTheDocument();
    expect(screen.queryByText(/Trailing newline/)).toBeNull();
  });

  it('shows compact step progress with the marker and keeps the words for screen readers', () => {
    const steps: Step[] = [
      { id: 'a', label: 'Read', state: 'succeeded', dependencyIds: [] },
      { id: 'b', label: 'Edit', state: 'failed', dependencyIds: [] },
    ];
    const { container } = render(<AgentSteps steps={steps} variant="compact" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
    // Only the failed step keeps a visible badge.
    expect(container.querySelectorAll('[data-state]').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Failed/i).length).toBeGreaterThan(0);
  });

  it('does not report a missing session or offer following for a finished log', () => {
    render(<TerminalOutput output={'done'} state="complete" title="Logs" />);
    expect(screen.queryByText('Session identity not supplied.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause following' })).toBeNull();
  });
});
