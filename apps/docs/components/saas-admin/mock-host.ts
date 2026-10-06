import type {
  AdminCommand,
  AdminReceipt,
  AdminSnapshot,
  CustomerDraft,
  DemoOrganization,
  FieldErrors,
  SaaSAdminHost,
  SubmissionResult,
} from './types';

const statuses = ['active', 'trial', 'paused'];
const roles = ['owner', 'admin', 'member', 'viewer'];
const plans = ['starter', 'team', 'business'];
export function validateCustomer(draft: CustomerDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim() || draft.name.trim().length > 100)
    errors.name = 'Enter a name between 1 and 100 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) || draft.email.length > 254)
    errors.email = 'Enter a valid email address, up to 254 characters.';
  if (!draft.company.trim() || draft.company.trim().length > 100)
    errors.company = 'Enter a company between 1 and 100 characters.';
  if (!statuses.includes(draft.status)) errors.status = 'Choose an available customer status.';
  if (draft.notes.length > 2000) errors.notes = 'Keep notes to 2,000 characters.';
  return errors;
}
export function validateSettings(draft: {
  name: string;
  email: string;
  weeklyDigest: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim() || draft.name.trim().length > 100)
    errors.name = 'Enter an organization name between 1 and 100 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) || draft.email.length > 254)
    errors.email = 'Enter a valid contact email address.';
  if (typeof draft.weeklyDigest !== 'boolean')
    errors.status = 'Choose whether to receive the demo digest.';
  return errors;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const customer = (
  id: string,
  name: string,
  email: string,
  company: string,
  status: CustomerDraft['status'],
  created: string,
) => ({ id, name, email, company, status, created, notes: '', version: 1 });
const seed: AdminSnapshot = freeze({
  version: 1,
  organizations: [
    {
      id: 'northstar',
      settings: {
        name: 'Northstar Studio',
        email: 'hello@northstar.example',
        weeklyDigest: true,
        version: 1,
      },
      billing: { plan: 'team', seats: 8, version: 1 },
      customers: [
        customer(
          'cus-1',
          'Alex Morgan',
          'alex@atlas.example',
          'Atlas Design',
          'active',
          '2026-09-18',
        ),
        customer(
          'cus-2',
          'Jamie Chen',
          'jamie@harbor.example',
          'Harbor Labs',
          'trial',
          '2026-09-21',
        ),
        customer('cus-3', 'Sam Rivera', 'sam@oak.example', 'Oak & Field', 'active', '2026-09-24'),
        customer(
          'cus-4',
          'Taylor Reed',
          'taylor@modern.example',
          'Modern Goods',
          'paused',
          '2026-09-26',
        ),
        customer(
          'cus-5',
          'Casey Park',
          'casey@signal.example',
          'Signal Works',
          'trial',
          '2026-09-29',
        ),
        customer(
          'cus-6',
          'Jordan Lee',
          'jordan@form.example',
          'Form Studio',
          'active',
          '2026-10-02',
        ),
      ],
      members: [
        {
          id: 'mem-1',
          name: 'Avery Brooks',
          email: 'avery@northstar.example',
          role: 'owner',
          version: 1,
        },
        {
          id: 'mem-2',
          name: 'Riley Quinn',
          email: 'riley@northstar.example',
          role: 'admin',
          version: 1,
        },
        {
          id: 'mem-3',
          name: 'Morgan Ellis',
          email: 'morgan@northstar.example',
          role: 'member',
          version: 1,
        },
      ],
    },
    {
      id: 'fieldwork',
      settings: {
        name: 'Fieldwork Collective',
        email: 'team@fieldwork.example',
        weeklyDigest: false,
        version: 1,
      },
      billing: { plan: 'starter', seats: 3, version: 1 },
      customers: [
        customer(
          'field-1',
          'Devon Kim',
          'devon@meadow.example',
          'Meadow Supply',
          'active',
          '2026-10-01',
        ),
      ],
      members: [
        {
          id: 'field-mem-1',
          name: 'Drew Lane',
          email: 'drew@fieldwork.example',
          role: 'owner',
          version: 1,
        },
      ],
    },
  ],
});

/** In-memory demonstration only. No identity, network, durable storage or payment operations. */
export function createSaaSAdminHost({
  wait = () => new Promise<void>((resolve) => setTimeout(resolve, 350)),
}: { wait?: () => Promise<void> } = {}): SaaSAdminHost {
  let snapshot = seed;
  let nextCustomer = 7;
  const receipts = new Map<string, AdminReceipt>();
  const running = new Map<string, { signature: string; result: Promise<SubmissionResult> }>();
  const signature = (command: AdminCommand) => JSON.stringify(command);
  const rejection = (command: AdminCommand, message: string, errors?: FieldErrors): AdminReceipt =>
    freeze({ status: 'rejected', command, message, ...(errors ? { errors } : {}) });

  function execute(command: AdminCommand): AdminReceipt {
    const org = snapshot.organizations.find((item) => item.id === command.organizationId);
    if (!org) return rejection(command, 'This demo organization is unavailable.');
    let updated: DemoOrganization = org;
    let customerId: string | undefined;
    let message: string;
    switch (command.kind) {
      case 'create-customer':
      case 'edit-customer': {
        const errors = validateCustomer(command.draft);
        if (Object.keys(errors).length)
          return rejection(command, 'Check the highlighted customer fields.', errors);
        const existing =
          command.kind === 'edit-customer'
            ? org.customers.find((item) => item.id === command.customerId)
            : undefined;
        if (command.kind === 'edit-customer' && (!existing || existing.version !== command.version))
          return rejection(command, 'The saved customer changed. Reload the record before saving.');
        const email = command.draft.email.trim().toLowerCase();
        if (
          org.customers.some(
            (item) => item.id !== existing?.id && item.email.toLowerCase() === email,
          )
        )
          return rejection(
            command,
            'This email already belongs to a customer in this organization.',
            { email: 'Choose a different customer email address.' },
          );
        customerId = existing?.id ?? `cus-${nextCustomer++}`;
        const saved = {
          ...command.draft,
          name: command.draft.name.trim(),
          email,
          company: command.draft.company.trim(),
          id: customerId,
          version: (existing?.version ?? 0) + 1,
          created: existing?.created ?? '2026-10-05',
        };
        updated = {
          ...org,
          customers: existing
            ? org.customers.map((item) => (item.id === existing.id ? saved : item))
            : [...org.customers, saved],
        };
        message = existing
          ? 'Customer changes saved in the local demo.'
          : 'Customer created in the local demo.';
        break;
      }
      case 'delete-customer': {
        const existing = org.customers.find((item) => item.id === command.customerId);
        if (!existing || existing.version !== command.version)
          return rejection(
            command,
            'The saved customer changed or is unavailable. Open its current version before deleting.',
          );
        updated = { ...org, customers: org.customers.filter((item) => item.id !== existing.id) };
        message = 'Customer deleted from the local demo. No external record was deleted.';
        break;
      }
      case 'change-role': {
        const member = org.members.find((item) => item.id === command.memberId);
        if (!member || member.version !== command.version)
          return rejection(command, 'The saved member changed. Reload before changing the role.');
        if (!roles.includes(command.role))
          return rejection(command, 'Choose an available demo role.');
        if (
          member.role === 'owner' &&
          command.role !== 'owner' &&
          org.members.filter((item) => item.role === 'owner').length === 1
        )
          return rejection(command, 'Keep at least one owner in this demo organization.');
        updated = {
          ...org,
          members: org.members.map((item) =>
            item.id === member.id
              ? { ...item, role: command.role, version: item.version + 1 }
              : item,
          ),
        };
        message = `Demo role updated for ${member.name}.`;
        break;
      }
      case 'save-settings': {
        if (org.settings.version !== command.version)
          return rejection(command, 'Organization settings changed. Reload before saving.');
        const errors = validateSettings(command.draft);
        if (Object.keys(errors).length)
          return rejection(command, 'Check the highlighted organization fields.', errors);
        updated = {
          ...org,
          settings: {
            ...command.draft,
            name: command.draft.name.trim(),
            email: command.draft.email.trim().toLowerCase(),
            version: org.settings.version + 1,
          },
        };
        message = 'Organization settings saved in the local demo.';
        break;
      }
      case 'save-billing': {
        if (org.billing.version !== command.version)
          return rejection(command, 'The demo plan changed. Reload before saving.');
        if (!plans.includes(command.draft.plan))
          return rejection(command, 'Choose an available demo plan.');
        if (
          !Number.isInteger(command.draft.seats) ||
          command.draft.seats < org.members.length ||
          command.draft.seats > 50
        )
          return rejection(
            command,
            `Choose between ${org.members.length} and 50 whole-number seats.`,
            { seats: `Seats must cover ${org.members.length} current members, up to 50.` },
          );
        updated = { ...org, billing: { ...command.draft, version: org.billing.version + 1 } };
        message = 'Demo plan saved. No payment was made.';
        break;
      }
    }
    snapshot = freeze({
      version: snapshot.version + 1,
      organizations: snapshot.organizations.map((item) => (item.id === org.id ? updated : item)),
    });
    return freeze({
      status: 'acknowledged',
      command,
      snapshot,
      message,
      ...(customerId ? { customerId } : {}),
    });
  }
  return {
    read: () => snapshot,
    submit(input, mode = 'none') {
      // Capture immutable command content before yielding; callers cannot alter a pending action.
      const command = freeze(structuredClone(input));
      if (!command.id.trim() || command.id.length > 120)
        return Promise.resolve(rejection(command, 'Use a valid local action identity.'));
      const previous = receipts.get(command.id);
      if (previous)
        return Promise.resolve(
          signature(previous.command) === signature(command)
            ? previous
            : rejection(command, 'This action identity was already used for different content.'),
        );
      const pending = running.get(command.id);
      if (pending)
        return pending.signature === signature(command)
          ? pending.result
          : Promise.resolve(
              rejection(command, 'This action identity is already pending with different content.'),
            );
      const result = (async (): Promise<SubmissionResult> => {
        await wait();
        const receipt =
          mode === 'reject'
            ? rejection(
                command,
                'The simulated host rejected this action. No saved record was changed.',
              )
            : execute(command);
        receipts.set(command.id, receipt);
        running.delete(command.id);
        return mode === 'lose-receipt'
          ? freeze({
              status: 'unknown',
              command,
              message:
                'The local host receipt was interrupted. The saved view may be stale; check the original receipt before continuing.',
            })
          : receipt;
      })();
      running.set(command.id, { signature: signature(command), result });
      return result;
    },
    async receipt(command) {
      await wait();
      const receipt = receipts.get(command.id);
      return receipt && signature(receipt.command) === signature(command) ? receipt : undefined;
    },
  };
}
