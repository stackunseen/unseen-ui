import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SplitPaneProps } from '@stackunseen/ui/layout';
import { AITheme } from '@stackunseen/ui';
import { Workbench } from './workbench';

// Exercise application state with real library controls and the real mock host.
// SplitPane geometry is excluded from jsdom; the site browser pass covers resizing.
vi.mock('@stackunseen/ui/layout', () => ({
  SplitPane({ primary, secondary, resizeLabel }: SplitPaneProps) {
    return (
      <div>
        <section aria-label={primary.label}>{primary.children}</section>
        <div role="separator" aria-label={resizeLabel} tabIndex={0} />
        <section aria-label={secondary.label}>{secondary.children}</section>
      </div>
    );
  },
}));

// Testing Library's async wrapper detects Jest timers but not Vitest timers.
// This scoped bridge lets it drain its final zero-delay task deterministically.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <AITheme appearance="light">
      <Workbench />
    </AITheme>,
  );
  return user;
}
async function ready(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('button', { name: 'Send message' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1900);
  });
  expect(screen.getByRole('button', { name: 'Approve action' })).toBeEnabled();
}

describe('Agent workbench template', () => {
  it('completes an approved review and reflects only acknowledged account changes', async () => {
    const user = setup();
    expect(screen.getByText('Simulated server · no external changes')).toBeInTheDocument();
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    expect(screen.getByText(/Review complete\. The inspector/)).toBeInTheDocument();
    expect(
      screen.getByText('Decision received. Whether the action ran is shown separately.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Archived in demo')).toHaveLength(3);
    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText('Review report prepared')).toBeInTheDocument();
  });

  it('retains an unknown decision across inspector/view/session navigation and reconciles the original', async () => {
    const user = setup();
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Recovery scenarios' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Lose the next decision acknowledgement' }),
    );
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    expect(screen.getByRole('button', { name: 'Check decision status' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset this review' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Inspector' }));
    await user.click(screen.getByRole('button', { name: 'Inspector' }));
    expect(screen.getByRole('button', { name: 'Check decision status' })).toBeEnabled();
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Unconfirmed')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'New review' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Local reviews' })).getByRole('button', {
        name: /Decision unconfirmed/,
      }),
    );
    expect(screen.getByRole('button', { name: 'Check decision status' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Check decision status' }));
    expect(screen.queryByRole('button', { name: 'Check decision status' })).not.toBeInTheDocument();
    expect(screen.getByText(/Review complete\. The inspector/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Archived in demo')).toHaveLength(3);
  });

  it('shows revised scope, rejects it and leaves all account records inactive', async () => {
    const user = setup();
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Recovery scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Revise scope' }));
    expect(
      screen.getByRole('heading', { name: 'Archive 2 inactive accounts' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Inactive')).toHaveLength(3);
    expect(screen.queryByText('Archived in demo')).not.toBeInTheDocument();
  });

  it('cancels an in-flight stream, retains partial text, and allows a fresh request', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await user.click(screen.getByRole('button', { name: 'Stop response' }));
    expect(screen.getByText(/Review stopped\. Your partial/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1900);
    });
    expect(screen.queryByRole('button', { name: 'Approve action' })).not.toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'Try the account review again',
    );
    await ready(user);
  });

  it('applies only the revised two-account scope after approval', async () => {
    const user = setup();
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Recovery scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Revise scope' }));
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Archived in demo')).toHaveLength(2);
    expect(screen.getAllByText('Inactive')).toHaveLength(1);
  });

  it('preserves an acknowledged result when the connection later becomes stale', async () => {
    const user = setup();
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    await user.click(screen.getByRole('button', { name: 'Recovery scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(screen.getByText('Approved', { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText('approved · stale')).toBeInTheDocument();
    expect(screen.queryByText('Outcome unknown')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    expect(screen.getAllByText('Archived in demo · stale')).toHaveLength(3);
  });

  it('retains per-review drafts and resets only the selected review', async () => {
    const user = setup();
    const message = screen.getByRole('textbox', { name: 'Message' });
    await user.clear(message);
    await user.type(message, 'Review Morgan’s accounts');
    await user.click(screen.getByRole('button', { name: 'New review' }));
    await user.clear(screen.getByRole('textbox', { name: 'Message' }));
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Review Avery’s accounts');
    const nav = screen.getByRole('navigation', { name: 'Local reviews' });
    await user.click(within(nav).getByRole('button', { name: 'Account review Draft' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Review Morgan’s accounts',
    );
    await user.click(screen.getByRole('button', { name: 'Reset this review' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Find inactive accounts and prepare them for review.',
    );
    await user.click(within(nav).getByRole('button', { name: 'New review 2 Draft' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Review Avery’s accounts');
  });

  it('filters records, opens details and recovers from an empty search', async () => {
    const user = setup();
    await user.click(screen.getByRole('tab', { name: 'Accounts' }));
    const search = screen.getByRole('searchbox', { name: 'Search demo accounts' });
    await user.type(search, 'Avery');
    expect(screen.getByRole('button', { name: 'Example Studio' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acme Sandbox' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Example Studio' }));
    expect(screen.getByRole('region', { name: 'Example Studio details' })).toHaveTextContent(
      '128 days ago',
    );
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.getByRole('button', { name: 'Example Studio' })).toHaveFocus();
    await user.clear(search);
    await user.type(search, 'no matching account');
    expect(screen.getByText('No accounts match “no matching account”.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('button', { name: 'Acme Sandbox' })).toBeInTheDocument();
  });

  it('supports arrow-key tab navigation and blocks actions after access revocation', async () => {
    const user = setup();
    screen.getByRole('tab', { name: 'Review' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Accounts' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    await ready(user);
    await user.click(screen.getByRole('button', { name: 'Recovery scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Revoke access' }));
    expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    expect(
      screen.getByText('Access was revoked. Start a new authorized review.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Context' }));
    expect(screen.getByText(/Excluded.*Access revoked by the demo server/)).toBeInTheDocument();
  });
});
