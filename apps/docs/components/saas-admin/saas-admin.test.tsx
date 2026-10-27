import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '@stackunseen/ui';
import { createSaaSAdminHost } from './mock-host';
import { SaaSAdmin } from './saas-admin';
import type { SaaSAdminHost } from './types';

function setup(host: SaaSAdminHost = createSaaSAdminHost({ wait: async () => {} })) {
  const user = userEvent.setup();
  render(
    <AITheme appearance="light">
      <SaaSAdmin host={host} />
    </AITheme>,
  );
  return { user, host };
}
async function replace(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}
async function select(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(screen.getByRole('option', { name: option }));
}

describe('connected SaaS admin template', () => {
  it('confirms local deletion, preserves a rejected record, and reconciles an unknown delete once', async () => {
    const { user, host } = setup();
    const submit = vi.spyOn(host, 'submit');
    await user.click(screen.getByRole('button', { name: 'Demo behavior' }));
    await select(user, 'Next action result', 'Reject action');
    await user.click(screen.getByRole('button', { name: 'View Jordan Lee' }));
    await user.click(screen.getByRole('button', { name: 'Delete demo customer' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Delete Jordan Lee from the demo?');
    await user.click(within(dialog).getByRole('button', { name: 'Delete demo customer' }));
    expect(await screen.findByText(/simulated server rejected/)).toBeInTheDocument();
    expect(host.read().organizations[0]!.customers).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Keep customer' }));
    await select(user, 'Next action result', 'Interrupt receipt');
    await user.click(screen.getByRole('button', { name: 'Delete demo customer' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete demo customer' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Check if it went through' }));
    expect(
      await screen.findByText(
        'Customer deleted from the local demo. No external record was deleted.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Jordan Lee' })).not.toBeInTheDocument();
    expect(screen.getByText('5 of 5 customers')).toBeInTheDocument();
    expect(host.read().organizations[0]!.customers).toHaveLength(5);
    expect(submit).toHaveBeenCalledTimes(2);
  });
  it('keeps a missing original receipt unknown and never silently repeats the save', async () => {
    const initial = createSaaSAdminHost({ wait: async () => {} });
    const service: SaaSAdminHost = {
      read: () => initial.read(),
      submit: vi.fn(async (command) => ({
        status: 'unknown' as const,
        command,
        message: 'Receipt unavailable',
      })),
      receipt: vi.fn(async () => undefined),
    };
    const { user } = setup(service);
    await user.click(screen.getByRole('link', { name: 'Organization settings' }));
    await replace(user, /Organization name/, 'Unknown save');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(await screen.findByRole('button', { name: 'Check if it went through' }));
    expect(await screen.findByText(/original receipt is still unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-disabled', 'true');
    expect(service.submit).toHaveBeenCalledOnce();
    expect(service.receipt).toHaveBeenCalledOnce();
    expect(initial.read().organizations[0]!.settings.name).toBe('Northstar Studio');
  });
  it('opens a dashboard customer and saves an edit into list/detail views', async () => {
    const { user, host } = setup();
    expect(screen.getByText(/No auth or payment connection/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View Jordan Lee' }));
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit customer' }));
    await replace(user, /Customer name/, 'Jordan Lee Updated');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(
      await screen.findByText('Customer changes saved in the local demo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jordan Lee Updated' })).toBeInTheDocument();
    expect(
      host.read().organizations[0]!.customers.find((customer) => customer.id === 'cus-6')?.version,
    ).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Back to customers' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'Updated');
    expect(screen.getByRole('button', { name: 'View Jordan Lee Updated' })).toBeInTheDocument();
    expect(screen.getByText('1 of 6 customers')).toBeInTheDocument();
  });
  it('creates a validated record and focuses the first invalid field before server submission', async () => {
    const { user, host } = setup();
    const submit = vi.spyOn(host, 'submit');
    await user.click(screen.getByRole('link', { name: 'Customers' }));
    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText(/Customer name/), 'Robin Patel');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Email address/)).toHaveFocus();
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText(/Email address/), 'robin@coast.example');
    await user.type(screen.getByLabelText(/Company/), 'Coast Studio');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findByText('Customer created in the local demo.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Robin Patel' })).toBeInTheDocument();
    expect(submit).toHaveBeenCalledOnce();
    expect(host.read().organizations[0]!.customers).toHaveLength(7);
  });
  it('keeps and discards a draft through guarded navigation and organization changes', async () => {
    const { user, host } = setup();
    await user.click(screen.getByRole('link', { name: 'Organization settings' }));
    await replace(user, /Organization name/, 'Unsaved name');
    await user.click(screen.getByRole('link', { name: 'Customers' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText(/Organization name/)).toHaveValue('Unsaved name');
    await select(user, 'Organization', 'Fieldwork Collective');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Organization' })).toHaveTextContent(
      'Fieldwork Collective',
    );
    expect(host.read().organizations[0]!.settings.name).toBe('Northstar Studio');
    await user.click(screen.getByRole('link', { name: 'Customers' }));
    expect(screen.getByText('1 of 1 customers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Alex Morgan' })).not.toBeInTheDocument();
  });
  it('renders pending state without prematurely updating saved records and blocks navigation', async () => {
    let release!: () => void;
    const host = createSaaSAdminHost({
      wait: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const { user } = setup(host);
    await user.click(screen.getByRole('link', { name: 'Organization settings' }));
    await replace(user, /Organization name/, 'Saved Later');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(host.read().organizations[0]!.settings.name).toBe('Northstar Studio');
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText(/Organization name/)).toBeDisabled();
    expect(
      screen.queryByText('Organization settings saved in the local demo.'),
    ).not.toBeInTheDocument();
    await act(async () => {
      release();
    });
    expect(
      await screen.findByText('Organization settings saved in the local demo.'),
    ).toBeInTheDocument();
    expect(host.read().organizations[0]!.settings.name).toBe('Saved Later');
  });
  it('preserves a rejected draft and reconciles an interrupted save without replay', async () => {
    const { user, host } = setup();
    const submit = vi.spyOn(host, 'submit'),
      receipt = vi.spyOn(host, 'receipt');
    await user.click(screen.getByRole('button', { name: 'Demo behavior' }));
    await select(user, 'Next action result', 'Reject action');
    await user.click(screen.getByRole('link', { name: 'Organization settings' }));
    await replace(user, /Organization name/, 'Recovered Studio');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/simulated server rejected this action/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toHaveValue('Recovered Studio');
    expect(host.read().organizations[0]!.settings.name).toBe('Northstar Studio');
    await select(user, 'Next action result', 'Interrupt receipt');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/saved view may be stale/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-disabled', 'true');
    const version = host.read().version;
    await user.click(screen.getByRole('button', { name: 'Check if it went through' }));
    expect(
      await screen.findByText('Organization settings saved in the local demo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Organization' })).toHaveTextContent(
      'Recovered Studio',
    );
    expect(submit).toHaveBeenCalledTimes(2);
    expect(receipt).toHaveBeenCalledOnce();
    expect(host.read().version).toBe(version);
  });
  it('changes an acknowledged demo role and rejects removal of the only owner', async () => {
    const { user, host } = setup();
    await user.click(screen.getByRole('link', { name: 'Members & roles' }));
    await user.click(screen.getByRole('button', { name: 'Edit role for Riley Quinn' }));
    await select(user, 'Demo role', 'Viewer');
    await user.click(screen.getByRole('button', { name: 'Save demo role' }));
    expect(await screen.findByText('Demo role updated for Riley Quinn.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Riley Quinn/ })).getByText('Viewer'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit role for Avery Brooks' }));
    await select(user, 'Demo role', 'Member');
    await user.click(screen.getByRole('button', { name: 'Save demo role' }));
    expect(
      await screen.findByText('Keep at least one owner in this demo organization.'),
    ).toBeInTheDocument();
    expect(host.read().organizations[0]!.members[0]!.role).toBe('owner');
  });
  it('validates seats and updates only the local sample plan', async () => {
    const { user, host } = setup();
    await user.click(screen.getByRole('link', { name: 'Plan & billing' }));
    await replace(user, /Demo seats/, '2');
    await user.click(screen.getByRole('button', { name: 'Save demo plan' }));
    expect(screen.getByLabelText(/Demo seats/)).toHaveAttribute('aria-invalid', 'true');
    expect(host.read().organizations[0]!.billing.seats).toBe(8);
    await replace(user, /Demo seats/, '12');
    await select(user, 'Demo plan', 'Business');
    await user.click(screen.getByRole('button', { name: 'Save demo plan' }));
    expect(await screen.findByText('Demo plan saved. No payment was made.')).toBeInTheDocument();
    expect(screen.getByText('3 members / 12 seats')).toBeInTheDocument();
    expect(host.read().organizations[0]!.billing.plan).toBe('business');
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });
  it('wires controlled grid sorting, paging and empty-filter recovery', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('link', { name: 'Customers' }));
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search customers' }),
      'no record matches',
    );
    expect(screen.getByRole('heading', { name: 'No customers found' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Customer: Sort descending/ }));
    expect(screen.getByRole('columnheader', { name: /Customer/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getByRole('rowheader', { name: /Taylor Reed/ })).toBeInTheDocument();
  });
});
