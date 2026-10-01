import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RelayApp } from './app';
import { sampleAccounts } from './data';

async function enterWorkspace() {
  const user = userEvent.setup();
  const view = render(<RelayApp />);
  await user.click(screen.getByRole('button', { name: 'Enter demo workspace' }));
  return { user, ...view };
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(screen.getByRole('option', { name: option }));
}

async function openAccount(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(screen.getByRole('searchbox', { name: 'Search accounts' }));
  await user.type(screen.getByRole('searchbox', { name: 'Search accounts' }), name);
  await user.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog', { name });
}

describe('Relay template workspace', () => {
  it('explains mock access, rejects a blank display name, and enters by keyboard', async () => {
    const user = userEvent.setup();
    render(<RelayApp />);
    expect(screen.getByText(/This is a mock login/)).toHaveTextContent(
      'It creates no account and checks no credentials.',
    );
    expect(screen.getByRole('textbox', { name: 'Demo workspace' })).toHaveAttribute('readonly');
    expect(document.querySelector('input[type="password"]')).toBeNull();
    const name = screen.getByRole('textbox', { name: 'Display name' });
    await user.clear(name);
    await user.type(name, '   ');
    await user.keyboard('{Enter}');
    expect(name).toHaveAccessibleDescription('Enter a display name.');
    expect(
      screen.queryByRole('navigation', { name: 'Workspace navigation' }),
    ).not.toBeInTheDocument();
    await user.clear(name);
    await user.type(name, ' Taylor Reed ');
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'A clear view of your accounts.' }),
      ).toHaveFocus(),
    );
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toHaveTextContent(
      'Taylor Reed',
    );
    expect(screen.getByRole('region', { name: 'AI assistant' })).toHaveTextContent('Simulated AI');
  });

  it('shows deterministic metrics and navigates the complete account list', async () => {
    const { user } = await enterWorkspace();
    expect(screen.getByText('$768,000')).toBeVisible();
    expect(screen.getByText('$228,000 in annual value')).toBeVisible();
    expect(screen.getByText('Make time for Meridian.')).toBeVisible();
    const table = screen.getByRole('table', { name: 'Customer accounts' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('1\u20136 of 8 accounts')).toBeVisible();
    expect(within(table).queryByRole('button', { name: 'Quotient' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('7\u20138 of 8 accounts')).toBeVisible();
    expect(within(table).getByRole('button', { name: 'Quotient' })).toBeVisible();
    await selectOption(user, 'Sort accounts', 'Renewal date');
    expect(screen.getByText('1\u20136 of 8 accounts')).toBeVisible();
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Meridian');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('combines search and health filters and recovers from an empty result', async () => {
    const { user } = await enterWorkspace();
    const search = screen.getByRole('searchbox', { name: 'Search accounts' });
    await user.type(search, '  ALEX  ');
    expect(screen.getByText('1\u20133 of 3 accounts')).toBeVisible();
    await selectOption(user, 'Filter by health', 'At risk');
    expect(screen.getByText('1\u20131 of 1 accounts')).toBeVisible();
    expect(screen.getByRole('table', { name: 'Customer accounts' })).toHaveTextContent('Meridian');
    await user.clear(search);
    await user.type(search, 'logistics');
    expect(screen.getByText('No matching accounts')).toBeVisible();
    expect(screen.getByText('0 accounts')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Filter by health' })).toHaveTextContent(
      'All health',
    );
    expect(screen.getByText('1\u20136 of 8 accounts')).toBeVisible();
    await user.type(search, 'logistics');
    expect(screen.getByRole('table', { name: 'Customer accounts' })).toHaveTextContent(
      'Orbit Works',
    );
  });

  it('saves an account and keeps its editor, table, and dashboard coherent', async () => {
    const { user } = await enterWorkspace();
    const dialog = await openAccount(user, 'Meridian');
    await selectOption(user, 'Account owner', 'Jamie Chen');
    await selectOption(user, 'Account health', 'Healthy');
    fireEvent.change(within(dialog).getByLabelText(/^Renewal date/), {
      target: { value: '2026-11-16' },
    });
    const notes = within(dialog).getByRole('textbox', { name: 'Next step' });
    await user.clear(notes);
    await user.type(notes, '  Confirm the revised rollout on Friday.  ');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Meridian updated')).toBeVisible();
    expect(screen.getByText('Saved in this demo session only.')).toBeVisible();
    const table = screen.getByRole('table', { name: 'Customer accounts' });
    expect(table).toHaveTextContent('Healthy');
    expect(table).toHaveTextContent('Jamie Chen');
    expect(table).toHaveTextContent('Nov 16');
    expect(screen.getByText('$144,000 in annual value')).toBeVisible();
    expect(screen.getByText('Make time for Goodkind.')).toBeVisible();
    expect(screen.getByRole('region', { name: 'AI assistant' })).toHaveTextContent('Meridian');
    await user.click(screen.getByRole('button', { name: 'Meridian' }));
    const reopened = await screen.findByRole('dialog', { name: 'Meridian' });
    expect(within(reopened).getByRole('textbox', { name: 'Next step' })).toHaveValue(
      'Confirm the revised rollout on Friday.',
    );
    expect(within(reopened).getByLabelText(/^Renewal date/)).toHaveValue('2026-11-16');
    expect(within(reopened).getByRole('combobox', { name: 'Account owner' })).toHaveTextContent(
      'Jamie Chen',
    );
    expect(sampleAccounts.find((account) => account.id === 'ac-101')).toMatchObject({
      owner: 'Alex Morgan',
      health: 'At risk',
      renewal: '2026-10-15',
    });
  });

  it('discards unsaved edits on Cancel and restores trigger focus after Escape', async () => {
    const { user } = await enterWorkspace();
    const dialog = await openAccount(user, 'Meridian');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Next step' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Next step' }), 'Unsaved draft');
    await selectOption(user, 'Account health', 'Healthy');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Meridian' })).toHaveFocus());
    expect(screen.queryByText('Meridian updated')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    const reopened = await screen.findByRole('dialog', { name: 'Meridian' });
    expect(within(reopened).getByRole('textbox', { name: 'Next step' })).toHaveValue(
      sampleAccounts[0]!.notes,
    );
    expect(within(reopened).getByRole('combobox', { name: 'Account health' })).toHaveTextContent(
      'At risk',
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Meridian' })).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps invalid notes in the dialog and associates the error with the focused field', async () => {
    const { user } = await enterWorkspace();
    const dialog = await openAccount(user, 'Meridian');
    const notes = within(dialog).getByRole('textbox', { name: 'Next step' });
    await user.clear(notes);
    await user.type(notes, '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(dialog).toBeVisible();
    expect(notes).toHaveFocus();
    expect(notes).toHaveAccessibleDescription(/Add a next step before saving/);
    expect(notes).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Meridian updated')).not.toBeInTheDocument();
    await user.type(notes, 'Confirm the sponsor.');
    expect(screen.queryByText('Add a next step before saving.')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Meridian updated')).toBeVisible();
  });

  it('requires reset confirmation and restores sample records and table controls', async () => {
    const { user } = await enterWorkspace();
    const dialog = await openAccount(user, 'Meridian');
    const notes = within(dialog).getByRole('textbox', { name: 'Next step' });
    await user.clear(notes);
    await user.type(notes, 'Saved before reset.');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    let reset = screen.getByRole('alertdialog', { name: 'Reset this workspace?' });
    await user.click(within(reset).getByRole('button', { name: 'Keep working' }));
    expect(screen.getByRole('searchbox', { name: 'Search accounts' })).toHaveValue('Meridian');
    expect(screen.getByText('Saved before reset.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    reset = screen.getByRole('alertdialog', { name: 'Reset this workspace?' });
    await user.click(within(reset).getByRole('button', { name: 'Reset demo' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Sample workspace restored')).toBeVisible();
    expect(screen.getByRole('searchbox', { name: 'Search accounts' })).toHaveValue('');
    expect(screen.getByText('1\u20136 of 8 accounts')).toBeVisible();
    expect(screen.queryByText('Saved before reset.')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'AI assistant' })).toHaveTextContent(
      'Portfolio overview',
    );
    const restored = await openAccount(user, 'Meridian');
    expect(within(restored).getByRole('textbox', { name: 'Next step' })).toHaveValue(
      sampleAccounts[0]!.notes,
    );
  });

  it('changes views and appearance through navigation and the profile menu, then leaves the session', async () => {
    const { user, container } = await enterWorkspace();
    await user.click(screen.getByRole('link', { name: 'Accounts' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Every relationship, in view.' }),
      ).toHaveFocus(),
    );
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Portfolio value')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Use dark appearance' }));
    expect(container.querySelector('[data-appearance]')).toHaveAttribute('data-appearance', 'dark');
    await user.click(screen.getByRole('link', { name: 'Overview' }));
    const dialog = await openAccount(user, 'Meridian');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Next step' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Next step' }),
      'This session only.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Leave demo' }));
    expect(screen.getByRole('heading', { name: 'Take a look around.' })).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enter demo workspace' }));
    const restored = await openAccount(user, 'Meridian');
    expect(within(restored).getByRole('textbox', { name: 'Next step' })).toHaveValue(
      sampleAccounts[0]!.notes,
    );
  });
});
