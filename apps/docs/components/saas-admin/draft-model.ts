import type {
  AdminLocation,
  AdminPage,
  Customer,
  CustomerDraft,
  DemoBilling,
  DemoOrganization,
  DemoRole,
  Member,
  OrganizationSettings,
} from './types';

export type Editor =
  | { kind: 'customer'; original?: Customer; draft: CustomerDraft }
  | {
      kind: 'settings';
      original: OrganizationSettings;
      draft: Omit<OrganizationSettings, 'version'>;
    }
  | { kind: 'billing'; original: DemoBilling; draft: { plan: DemoBilling['plan']; seats: string } }
  | { kind: 'role'; original: Member; draft: DemoRole };
export const pages: readonly { id: AdminPage; label: string; short: string }[] = [
  { id: 'overview', label: 'Overview', short: 'Overview' },
  { id: 'customers', label: 'Customers', short: 'Customers' },
  { id: 'members', label: 'Members & roles', short: 'Members' },
  { id: 'settings', label: 'Organization settings', short: 'Settings' },
  { id: 'billing', label: 'Plan & billing', short: 'Billing' },
];
const emptyCustomer = (): CustomerDraft => ({
  name: '',
  email: '',
  company: '',
  status: 'trial',
  notes: '',
});
const customerDraft = (customer: Customer): CustomerDraft => ({
  name: customer.name,
  email: customer.email,
  company: customer.company,
  status: customer.status,
  notes: customer.notes,
});
const settingsDraft = (settings: OrganizationSettings) => ({
  name: settings.name,
  email: settings.email,
  weeklyDigest: settings.weeklyDigest,
});
export function dirty(editor?: Editor) {
  if (!editor) return false;
  const original =
    editor.kind === 'customer'
      ? editor.original
        ? customerDraft(editor.original)
        : emptyCustomer()
      : editor.kind === 'settings'
        ? settingsDraft(editor.original)
        : editor.kind === 'billing'
          ? { plan: editor.original.plan, seats: String(editor.original.seats) }
          : editor.original.role;
  return JSON.stringify(editor.draft) !== JSON.stringify(original);
}
export function editorFor(
  location: AdminLocation,
  organization: DemoOrganization,
): Editor | undefined {
  if (location.page === 'settings')
    return {
      kind: 'settings',
      original: organization.settings,
      draft: settingsDraft(organization.settings),
    };
  if (location.page === 'billing')
    return {
      kind: 'billing',
      original: organization.billing,
      draft: { plan: organization.billing.plan, seats: String(organization.billing.seats) },
    };
  if (location.creating) return { kind: 'customer', draft: emptyCustomer() };
  const customer = organization.customers.find((item) => item.id === location.customerId);
  if (location.editing && customer)
    return { kind: 'customer', original: customer, draft: customerDraft(customer) };
  return undefined;
}
