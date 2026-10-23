import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  AITheme,
  ApprovalCard,
  ArtifactPanel,
  GroundingStatus,
  LoadingIndicator,
  PromptInput,
  Skeleton,
  SourceCard,
  StreamingResponse,
  ToolCall,
  ToolGroup,
  componentVariants,
} from '@stackunseen/ui';
import { artifact, proposal, source, tool } from '../../../../apps/docs/lib/fixtures';

describe('presentation variants preserve meaning and actions', () => {
  it.each(componentVariants.PromptInput)(
    '%s composer preserves IME and cancellation semantics',
    async (variant) => {
      const submit = vi.fn();
      const cancel = vi.fn();
      const { rerender } = render(
        <PromptInput variant={variant} value="Draft" onValueChange={() => {}} onSubmit={submit} />,
      );
      const input = screen.getByRole('textbox', { name: 'Message' });
      fireEvent.compositionStart(input);
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(submit).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(submit).toHaveBeenCalledOnce();
      rerender(
        <PromptInput
          variant={variant}
          value="Draft"
          onValueChange={() => {}}
          onSubmit={submit}
          busy
          onCancel={cancel}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Stop response' }));
      expect(cancel).toHaveBeenCalledOnce();
    },
  );
  it.each(componentVariants.ApprovalCard)(
    '%s approval keeps scope visible and blocks stale decisions',
    (variant) => {
      const decide = vi.fn();
      render(
        <ApprovalCard
          variant={variant}
          proposal={proposal}
          submission="idle"
          onDecision={decide}
          stale
        />,
      );
      expect(screen.getByText(proposal.impact)).toBeVisible();
      expect(screen.getByText(proposal.scopes.join(', '))).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    },
  );
  it.each(componentVariants.SourceCard)(
    '%s source never exposes revoked content or a link',
    (variant) => {
      render(
        <SourceCard
          variant={variant}
          source={{
            ...source,
            access: 'revoked',
            excerpt: 'Restricted excerpt',
            url: 'https://example.com/private',
          }}
        />,
      );
      expect(screen.getByText('Source revoked. Content unavailable.')).toBeVisible();
      expect(screen.queryByText('Restricted excerpt')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    },
  );
  it.each(componentVariants.ToolCall)(
    '%s tool exposes unknown outcome instead of retrying or reporting success',
    (variant) => {
      render(
        <ToolCall
          variant={variant}
          value={{ ...tool, state: 'outcome-unknown', output: undefined }}
        />,
      );
      expect(screen.getByText('Outcome unknown')).toBeVisible();
      expect(screen.getByText(/Check before trying again/)).toBeVisible();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    },
  );
  it.each(componentVariants.ToolGroup)(
    '%s tool group keeps individual failure discoverable',
    async (variant) => {
      render(
        <ToolGroup
          variant={variant}
          tools={[
            tool,
            {
              ...tool,
              id: 'failed',
              name: 'failing_tool',
              state: 'failed',
              error: 'Connector failure',
            },
          ]}
        />,
      );
      expect(screen.getByText(/Contains failures/)).toBeVisible();
      if (variant === 'accordion')
        await userEvent.click(screen.getByRole('button', { name: /failing_tool/ }));
      expect(screen.getByRole('alert')).toHaveTextContent('Connector failure');
    },
  );
  it.each(componentVariants.GroundingStatus)(
    '%s grounding never invents a numeric measurement',
    (variant) => {
      render(<GroundingStatus variant={variant} value={{ kind: 'unknown' }} />);
      expect(screen.getByText('Not measured')).toBeVisible();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    },
  );
  it.each(componentVariants.ArtifactPanel)(
    '%s artifact remains a labelled modal and returns focus',
    async (variant) => {
      function Demo() {
        const [open, setOpen] = useState(false);
        return (
          <AITheme>
            <ArtifactPanel
              variant={variant}
              artifact={artifact}
              open={open}
              onOpenChange={setOpen}
            />
          </AITheme>
        );
      }
      const user = userEvent.setup();
      render(<Demo />);
      const trigger = screen.getByRole('button', { name: `Open ${artifact.title}` });
      await user.click(trigger);
      const dialog = screen.getByRole('dialog', { name: artifact.title });
      expect(within(dialog).getByText(`Version ${artifact.version}`)).toBeVisible();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
    },
  );
  it.each(componentVariants.StreamingResponse)(
    '%s streaming retains partial text when interrupted',
    (variant) => {
      const { rerender } = render(
        <StreamingResponse variant={variant} text="Partial answer" state="streaming" />,
      );
      expect(screen.getByText('Partial answer')).toBeVisible();
      rerender(<StreamingResponse variant={variant} text="Partial answer" state="interrupted" />);
      expect(screen.getByText('Partial answer')).toBeVisible();
      expect(screen.getByRole('status')).toHaveTextContent('Response interrupted');
    },
  );
  it.each(componentVariants.LoadingIndicator)(
    '%s activity exposes an indeterminate label, not a fake percentage',
    (variant) => {
      render(<LoadingIndicator variant={variant} label="Searching" />);
      expect(screen.getByRole('status')).toHaveTextContent('Searching');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    },
  );
  it.each(componentVariants.Skeleton)(
    '%s skeleton has one announcement with decorative placeholders',
    (variant) => {
      render(
        <Skeleton variant={variant} label="Loading report" lines={Number.POSITIVE_INFINITY} />,
      );
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(screen.getByRole('status')).toHaveTextContent('Loading report');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    },
  );
});
