import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AgentSteps,
  ApprovalCard,
  CodeDiff,
  EmptyState,
  Message,
  Modal,
  TerminalOutput,
  ToggleGroup,
  type ApprovalProposal,
  type MessageData,
  type Step,
} from '@stackunseen/ui';
import { Chat } from '@stackunseen/ui/chat';

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

  it('lets people edit a message, rate replies and switch versions in Chat', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onFeedback = vi.fn();
    const onBranchChange = vi.fn();
    const messages: MessageData[] = [
      { id: 'u1', role: 'user', state: 'complete', revision: 1, text: 'Find accounts' },
      { id: 'a1', role: 'assistant', state: 'complete', revision: 1, text: 'Found three.' },
    ];
    render(
      <Chat
        messages={messages}
        status="complete"
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        onEdit={onEdit}
        feedback={{ a1: 'helpful' }}
        onFeedback={onFeedback}
        branches={{ a1: { index: 1, total: 2 } }}
        onBranchChange={onBranchChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Not helpful' }));
    expect(onFeedback).toHaveBeenCalledWith('a1', false);
    expect(screen.getByText('2/2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous version' }));
    expect(onBranchChange).toHaveBeenCalledWith('a1', 0);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const box = screen.getByRole('textbox', { name: 'Edit message' });
    await user.clear(box);
    await user.type(box, 'Find inactive accounts');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onEdit).toHaveBeenCalledWith('u1', 'Find inactive accounts');
  });

  it('uses a custom start screen when the chat is empty', () => {
    render(
      <Chat
        messages={[]}
        status="idle"
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        emptyContent={<h1>What can I help with?</h1>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'What can I help with?' })).toBeInTheDocument();
  });

  it('shows reasoning as a disclosure and attached images safely', () => {
    const message: MessageData = {
      id: 'm1',
      role: 'assistant',
      state: 'complete',
      revision: 1,
      parts: [
        { id: 'r', type: 'reasoning', text: 'Checked the policy.', state: 'complete' },
        {
          id: 'f',
          type: 'file',
          name: 'chart.png',
          mediaType: 'image/png',
          url: 'data:image/png;base64,AA==',
        },
        { id: 'g', type: 'file', name: 'notes.csv', mediaType: 'text/csv' },
      ],
    };
    render(<Message value={message} />);
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'chart.png' })).toBeInTheDocument();
    expect(screen.getByText('notes.csv')).toBeInTheDocument();
  });

  it('opens a Modal without a trigger, from the host', () => {
    render(
      <Modal open onOpenChange={() => {}} title="Settings" description="Your preferences.">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('describes a toggle option instead of folding the description into its name', () => {
    render(
      <ToggleGroup
        type="multiple"
        label="Tools"
        options={[{ value: 'search', label: 'Search', description: 'Search the web' }]}
        value={[]}
        onValueChange={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toHaveAccessibleDescription('Search the web');
  });
});
