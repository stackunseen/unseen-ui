import type { Source } from '@stackunseen/ui-core';
import type { CitationReference } from '@stackunseen/ui';

export type ResearchScenario =
  | 'supplied'
  | 'source-changed'
  | 'source-missing'
  | 'claim-revised'
  | 'stale'
  | 'unknown-freshness'
  | 'error';

export interface ResearchClaim {
  id: string;
  revision: string;
  text: string;
}

export interface ResearchSource {
  value: Source;
  freshness: 'current' | 'stale' | 'unknown';
}

export interface ResearchLink {
  id: string;
  claimId: string;
  claimRevision: string;
  number: number;
  reference: CitationReference;
  assessment: 'supplied-support' | 'unassessed';
}

export interface ResearchSnapshot {
  scenario: ResearchScenario;
  revision: string;
  status: 'partial' | 'error';
  claims: readonly ResearchClaim[];
  sources: readonly ResearchSource[];
  links: readonly ResearchLink[];
  error?: string;
}

export const researchScenarios = [
  { value: 'supplied', label: 'Supplied snapshot' },
  { value: 'source-changed', label: 'Source version changed' },
  { value: 'source-missing', label: 'Source missing' },
  { value: 'claim-revised', label: 'Claim revised' },
  { value: 'stale', label: 'Stale evidence' },
  { value: 'unknown-freshness', label: 'Freshness unknown' },
  { value: 'error', label: 'Server snapshot error' },
] as const;

/** Synthetic supplied documents, not retrieved pages or real pilot results. */
export function suppliedResearchSnapshot(): ResearchSnapshot {
  return {
    scenario: 'supplied',
    revision: 'snapshot-1',
    status: 'partial',
    claims: [
      { id: 'claim-cohort', revision: '1', text: 'The pilot is limited to two support teams.' },
      {
        id: 'claim-training',
        revision: '1',
        text: 'Training must finish before access is enabled.',
      },
      { id: 'claim-outcome', revision: '1', text: 'The pilot reduced resolution time.' },
    ],
    sources: [
      {
        value: {
          id: 'source-rollout',
          title: 'Rollout memo',
          kind: 'document',
          version: 'memo-v1',
          locator: 'Page 2 · §2 Pilot scope',
          access: 'available',
          excerpt: 'The pilot includes two support teams. Expansion requires a separate review.',
        },
        freshness: 'current',
      },
      {
        value: {
          id: 'source-training',
          title: 'Operations note',
          kind: 'document',
          version: 'ops-v3',
          locator: '§4 Launch checklist',
          access: 'available',
          excerpt: 'Complete training for every pilot participant before enabling access.',
        },
        freshness: 'current',
      },
      {
        value: {
          id: 'source-outcome',
          title: 'Outcome appendix',
          kind: 'document',
          version: 'appendix-v1',
          locator: 'Page 4 · Results',
          access: 'missing',
        },
        freshness: 'unknown',
      },
    ],
    links: [
      {
        id: 'link-cohort',
        claimId: 'claim-cohort',
        claimRevision: '1',
        number: 1,
        reference: {
          sourceId: 'source-rollout',
          version: 'memo-v1',
          locator: 'Page 2 · §2 Pilot scope',
        },
        assessment: 'supplied-support',
      },
      {
        id: 'link-training',
        claimId: 'claim-training',
        claimRevision: '1',
        number: 2,
        reference: {
          sourceId: 'source-training',
          version: 'ops-v3',
          locator: '§4 Launch checklist',
        },
        assessment: 'supplied-support',
      },
      {
        id: 'link-outcome',
        claimId: 'claim-outcome',
        claimRevision: '1',
        number: 3,
        reference: {
          sourceId: 'source-outcome',
          version: 'appendix-v1',
          locator: 'Page 4 · Results',
        },
        assessment: 'unassessed',
      },
    ],
  };
}

/** Explicit local fixture selection; no retrieval, timer, retry or external side effect. */
export function researchHostReducer(
  state: ResearchSnapshot,
  event: { type: 'select-snapshot'; scenario: string },
): ResearchSnapshot {
  if (!researchScenarios.some((option) => option.value === event.scenario)) return state;
  const scenario = event.scenario as ResearchScenario;
  const next = suppliedResearchSnapshot();
  return {
    ...next,
    scenario,
    revision: `snapshot-${scenario}`,
    status: scenario === 'error' ? 'error' : 'partial',
    error:
      scenario === 'error'
        ? 'The simulated server could not supply a current snapshot. Previous excerpts are retained for inspection.'
        : undefined,
    claims: next.claims.map((claim) =>
      scenario === 'claim-revised' && claim.id === 'claim-cohort'
        ? { ...claim, revision: '2', text: 'The pilot is limited to three support teams.' }
        : claim,
    ),
    sources: next.sources
      .filter((source) => scenario !== 'source-missing' || source.value.id !== 'source-training')
      .map((source) => ({
        ...source,
        freshness:
          scenario === 'stale' || scenario === 'error'
            ? 'stale'
            : scenario === 'unknown-freshness'
              ? 'unknown'
              : source.freshness,
        value:
          scenario === 'source-changed' && source.value.id === 'source-rollout'
            ? {
                ...source.value,
                version: 'memo-v2',
                excerpt:
                  'The revised pilot includes three support teams. Expansion requires a separate review.',
              }
            : source.value,
      })),
  };
}

export const researchBounds = { claims: 6, sources: 8, links: 16, claimText: 1200, excerpt: 2400 };

/** Bounds reject a document rather than silently altering its exact supplied excerpt. */
export function researchSnapshotIssue(snapshot: ResearchSnapshot): string | undefined {
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
  const short = (value: string, max = 200) => value.length > 0 && value.length <= max;
  if (
    snapshot.claims.length > researchBounds.claims ||
    snapshot.sources.length > researchBounds.sources ||
    snapshot.links.length > researchBounds.links
  )
    return 'Snapshot exceeds recipe record limits.';
  if (
    !unique(snapshot.claims.map((claim) => claim.id)) ||
    !unique(snapshot.sources.map((source) => source.value.id)) ||
    !unique(snapshot.links.map((link) => link.id)) ||
    !unique(snapshot.links.map((link) => String(link.number)))
  )
    return 'Snapshot contains ambiguous claim, source or citation identities.';
  if (
    snapshot.claims.some(
      (claim) =>
        !short(claim.id) || !short(claim.revision) || !short(claim.text, researchBounds.claimText),
    ) ||
    snapshot.sources.some(
      ({ value }) =>
        !short(value.id) ||
        !short(value.title) ||
        !short(value.version) ||
        !short(value.locator) ||
        (value.excerpt !== undefined && !short(value.excerpt, researchBounds.excerpt)),
    ) ||
    snapshot.links.some(
      (link) =>
        !short(link.id) ||
        !short(link.claimId) ||
        !short(link.claimRevision) ||
        !short(link.reference.sourceId) ||
        !short(link.reference.version) ||
        !short(link.reference.locator) ||
        !Number.isSafeInteger(link.number) ||
        link.number < 1,
    )
  )
    return 'Snapshot contains invalid or oversized evidence text.';
  return undefined;
}

export function inspectResearchLink(
  snapshot: ResearchSnapshot,
  claim: ResearchClaim,
  link: ResearchLink,
): { status: keyof typeof researchLinkLabels; source: Source | undefined } {
  const record = snapshot.sources.find(({ value }) => value.id === link.reference.sourceId);
  const source = record?.value;
  const matched =
    source?.version === link.reference.version && source.locator === link.reference.locator;
  const status = researchSnapshotIssue(snapshot)
    ? 'invalid'
    : link.claimId !== claim.id || link.claimRevision !== claim.revision
      ? 'claim-revised'
      : !source || source.access !== 'available'
        ? 'source-missing'
        : !matched
          ? 'source-changed'
          : snapshot.status === 'error'
            ? 'error'
            : record.freshness === 'stale'
              ? 'stale'
              : record.freshness === 'unknown'
                ? 'unknown-freshness'
                : link.assessment !== 'supplied-support' || !source.excerpt
                  ? 'unassessed'
                  : 'linked';
  return { status, source: matched ? source : undefined };
}

export const researchLinkLabels = {
  linked: 'Supplied excerpt linked',
  'source-missing': 'Source unavailable',
  'source-changed': 'Source version or location changed',
  'claim-revised': 'Claim revision needs review',
  stale: 'Evidence marked stale by server',
  'unknown-freshness': 'Freshness not supplied',
  unassessed: 'No server support assessment',
  error: 'Current server snapshot unavailable',
  invalid: 'Evidence outside recipe limits',
} as const;
