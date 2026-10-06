import { describe, expect, it } from 'vitest';
import { createSaaSAdminHost, validateCustomer } from './mock-host';
import type { AdminCommand, CustomerDraft } from './types';

const draft: CustomerDraft = {
  name: 'New Customer',
  email: 'new@customer.example',
  company: 'New Company',
  status: 'trial',
  notes: 'A local note',
};
const create = (id = 'create-1'): AdminCommand => ({
  id,
  organizationId: 'northstar',
  kind: 'create-customer',
  draft: { ...draft },
});
const host = () => createSaaSAdminHost({ wait: async () => {} });

describe('local SaaS admin host', () => {
  it('binds local deletion to the record version and organization and deduplicates lost receipts', async () => {
    const service = host();
    const command: AdminCommand = {
      id: 'delete-1',
      organizationId: 'northstar',
      kind: 'delete-customer',
      customerId: 'cus-1',
      version: 1,
    };
    expect(
      (await service.submit({ ...command, id: 'delete-cross', organizationId: 'fieldwork' }))
        .status,
    ).toBe('rejected');
    expect((await service.submit({ ...command, id: 'delete-stale', version: 2 })).status).toBe(
      'rejected',
    );
    expect((await service.submit({ ...command, id: 'delete-reject' }, 'reject')).status).toBe(
      'rejected',
    );
    expect(service.read().organizations[0]!.customers).toHaveLength(6);
    expect((await service.submit(command, 'lose-receipt')).status).toBe('unknown');
    expect(service.read().organizations[0]!.customers).toHaveLength(5);
    expect((await service.receipt(command))?.status).toBe('acknowledged');
    expect((await service.submit(command)).status).toBe('acknowledged');
    expect(service.read().organizations[0]!.customers).toHaveLength(5);
    expect(service.read().organizations[1]!.customers).toHaveLength(1);
  });
  it('creates immutable scoped records only when the host completes', async () => {
    let release!: () => void;
    const service = createSaaSAdminHost({
      wait: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const pending = service.submit(create());
    expect(service.read().organizations[0]!.customers).toHaveLength(6);
    release();
    const receipt = await pending;
    expect(receipt.status).toBe('acknowledged');
    expect(service.read().organizations[0]!.customers).toHaveLength(7);
    expect(service.read().organizations[1]!.customers).toHaveLength(1);
    expect(Object.isFrozen(service.read())).toBe(true);
    expect(Object.isFrozen(service.read().organizations[0]!.customers)).toBe(true);
  });
  it('deduplicates concurrent and completed original actions without duplicating records', async () => {
    const service = host();
    const [first, second] = await Promise.all([service.submit(create()), service.submit(create())]);
    expect(first).toEqual(second);
    expect(await service.submit(create())).toEqual(first);
    expect(service.read().organizations[0]!.customers).toHaveLength(7);
    const collision = await service.submit({ ...create(), organizationId: 'fieldwork' });
    expect(collision.status).toBe('rejected');
  });
  it('captures input before waiting and binds receipt lookup to exact content and scope', async () => {
    const service = host();
    const input = create();
    const pending = service.submit(input);
    if (input.kind === 'create-customer') input.draft.name = 'Changed during save';
    const receipt = await pending;
    expect(receipt.command.kind === 'create-customer' && receipt.command.draft.name).toBe(
      'New Customer',
    );
    expect(await service.receipt(input)).toBeUndefined();
    expect(await service.receipt(receipt.command)).toEqual(receipt);
  });
  it('reconciles lost acknowledgements through the original receipt without replay', async () => {
    const service = host();
    const command = create('unknown');
    expect((await service.submit(command, 'lose-receipt')).status).toBe('unknown');
    const version = service.read().version;
    expect((await service.receipt(command))?.status).toBe('acknowledged');
    expect(service.read().version).toBe(version);
    expect(service.read().organizations[0]!.customers).toHaveLength(7);
  });
  it('retains rejected original receipts and leaves the saved snapshot unchanged', async () => {
    const service = host();
    const initial = service.read();
    const command = create('rejected');
    expect((await service.submit(command, 'reject')).status).toBe('rejected');
    expect(await service.receipt(command)).toMatchObject({ status: 'rejected' });
    expect(service.read()).toBe(initial);
  });
  it('validates fields, duplicate emails and unknown organizations at the host boundary', async () => {
    const service = host();
    expect(
      validateCustomer({
        ...draft,
        name: ' ',
        email: 'invalid',
        company: '',
        notes: 'x'.repeat(2001),
      }),
    ).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      company: expect.any(String),
      notes: expect.any(String),
    });
    expect(
      (
        await service.submit({
          ...create('dupe'),
          kind: 'create-customer',
          draft: { ...draft, email: 'ALEX@atlas.example' },
        })
      ).status,
    ).toBe('rejected');
    expect((await service.submit({ ...create('org'), organizationId: 'missing' })).status).toBe(
      'rejected',
    );
    expect(service.read().version).toBe(1);
  });
  it('rejects stale edits and cross-organization customer identities', async () => {
    const service = host();
    const command: AdminCommand = {
      id: 'edit-1',
      organizationId: 'northstar',
      kind: 'edit-customer',
      customerId: 'cus-1',
      version: 1,
      draft: { ...draft, email: 'alex@atlas.example' },
    };
    expect((await service.submit(command)).status).toBe('acknowledged');
    expect((await service.submit({ ...command, id: 'edit-stale' })).status).toBe('rejected');
    expect(
      (await service.submit({ ...command, id: 'edit-cross', organizationId: 'fieldwork' })).status,
    ).toBe('rejected');
  });
  it('keeps one demo owner and changes only the acknowledged member version', async () => {
    const service = host();
    const rejected: AdminCommand = {
      id: 'owner',
      organizationId: 'northstar',
      kind: 'change-role',
      memberId: 'mem-1',
      version: 1,
      role: 'viewer',
    };
    expect((await service.submit(rejected)).status).toBe('rejected');
    const accepted: AdminCommand = { ...rejected, id: 'member', memberId: 'mem-2', role: 'viewer' };
    expect((await service.submit(accepted)).status).toBe('acknowledged');
    expect(service.read().organizations[0]!.members[1]).toMatchObject({
      role: 'viewer',
      version: 2,
    });
    expect((await service.submit({ ...accepted, id: 'role-stale' })).status).toBe('rejected');
  });
  it('validates and versions organization settings and demo billing without payment claims', async () => {
    const service = host();
    const settings: AdminCommand = {
      id: 'settings',
      organizationId: 'northstar',
      kind: 'save-settings',
      version: 1,
      draft: { name: 'Updated Studio', email: 'team@updated.example', weeklyDigest: false },
    };
    expect((await service.submit(settings)).status).toBe('acknowledged');
    expect((await service.submit({ ...settings, id: 'settings-stale' })).status).toBe('rejected');
    const billing: AdminCommand = {
      id: 'billing',
      organizationId: 'northstar',
      kind: 'save-billing',
      version: 1,
      draft: { plan: 'business', seats: 2 },
    };
    expect((await service.submit(billing)).status).toBe('rejected');
    const result = await service.submit({
      ...billing,
      id: 'billing-valid',
      draft: { plan: 'business', seats: 12 },
    });
    expect(result.status).toBe('acknowledged');
    expect(result.message).toContain('No payment was made');
    expect(service.read().organizations[0]!.billing).toMatchObject({
      plan: 'business',
      seats: 12,
      version: 2,
    });
  });
});
