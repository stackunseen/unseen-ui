export type Health = 'Healthy' | 'Watch' | 'At risk';

export interface Account {
  id: string;
  name: string;
  sector: string;
  owner: string;
  health: Health;
  arr: number;
  renewal: string;
  notes: string;
  lastContact: string;
}

/** Fictional, fixed records. Dates and metrics never depend on the user's clock. */
export const sampleAccounts: readonly Account[] = [
  {
    id: 'ac-101',
    name: 'Meridian',
    sector: 'Design software',
    owner: 'Alex Morgan',
    health: 'At risk',
    arr: 84000,
    renewal: '2026-10-15',
    notes:
      'The rollout is paused while the team confirms its reporting requirements. Book a working session with Priya before the renewal review.',
    lastContact: '2026-09-28',
  },
  {
    id: 'ac-102',
    name: 'Layers',
    sector: 'Creative tools',
    owner: 'Sam Rivera',
    health: 'Healthy',
    arr: 126000,
    renewal: '2026-11-20',
    notes:
      'The design team completed onboarding. Share the adoption recap at the next monthly check-in.',
    lastContact: '2026-09-30',
  },
  {
    id: 'ac-103',
    name: 'Orbit Works',
    sector: 'Logistics',
    owner: 'Alex Morgan',
    health: 'Watch',
    arr: 96000,
    renewal: '2026-10-28',
    notes:
      'A new operations lead is joining this month. Introduce the support team and confirm the handover plan.',
    lastContact: '2026-09-25',
  },
  {
    id: 'ac-104',
    name: 'Quotient',
    sector: 'Analytics',
    owner: 'Jamie Chen',
    health: 'Healthy',
    arr: 180000,
    renewal: '2026-12-10',
    notes:
      'The second workspace is live. Schedule a review of permissions with the workspace administrator.',
    lastContact: '2026-09-29',
  },
  {
    id: 'ac-105',
    name: 'Goodkind',
    sector: 'Consumer goods',
    owner: 'Sam Rivera',
    health: 'At risk',
    arr: 48000,
    renewal: '2026-10-21',
    notes:
      'The sponsor has changed roles. Confirm a new decision maker and send the existing project brief for review.',
    lastContact: '2026-09-22',
  },
  {
    id: 'ac-106',
    name: 'Fable',
    sector: 'Publishing',
    owner: 'Jamie Chen',
    health: 'Healthy',
    arr: 72000,
    renewal: '2026-11-05',
    notes:
      'The editorial team is using the shared library. Collect feedback on the approval workflow.',
    lastContact: '2026-09-29',
  },
  {
    id: 'ac-107',
    name: 'Fieldwork',
    sector: 'Research',
    owner: 'Alex Morgan',
    health: 'Watch',
    arr: 60000,
    renewal: '2026-11-12',
    notes: 'Two research teams need an onboarding session. Agree on a date with their team leads.',
    lastContact: '2026-09-24',
  },
  {
    id: 'ac-108',
    name: 'Forma',
    sector: 'Architecture',
    owner: 'Sam Rivera',
    health: 'Healthy',
    arr: 102000,
    renewal: '2026-12-18',
    notes:
      'The pilot is complete. Review the final checklist before expanding to the remaining studios.',
    lastContact: '2026-09-30',
  },
];

export const healthOptions = ['Healthy', 'Watch', 'At risk'].map((value) => ({
  value,
  label: value,
}));
export const ownerOptions = ['Alex Morgan', 'Sam Rivera', 'Jamie Chen'].map((value) => ({
  value,
  label: value,
}));
export const money = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );

export function filterAccounts(accounts: readonly Account[], query: string, health: string) {
  const search = query.trim().toLowerCase();
  return accounts.filter(
    (account) =>
      (health === 'all' || account.health === health) &&
      [account.name, account.sector, account.owner].some((value) =>
        value.toLowerCase().includes(search),
      ),
  );
}
