import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResearchRecipe } from './research-recipe';
import {
  inspectResearchLink,
  researchBounds,
  researchHostReducer,
  researchSnapshotIssue,
  suppliedResearchSnapshot,
} from './research-host';
import type { ResearchScenario } from './research-host';

function scenario(value: ResearchScenario) {
  return researchHostReducer(suppliedResearchSnapshot(), {
    type: 'select-snapshot',
    scenario: value,
  });
}

describe('research host evidence mapping', () => {
  it('maps exact supplied excerpts by stable source identity, version and location', () => {
    const snapshot = suppliedResearchSnapshot();
    expect(researchSnapshotIssue(snapshot)).toBeUndefined();
    const inspected = inspectResearchLink(snapshot, snapshot.claims[0]!, snapshot.links[0]!);
    expect(inspected.status).toBe('linked');
    expect(inspected.source?.excerpt).toBe(
      'The pilot includes two support teams. Expansion requires a separate review.',
    );
    const reordered = {
      ...snapshot,
      sources: [...snapshot.sources].reverse(),
      links: [...snapshot.links].reverse(),
    };
    expect(inspectResearchLink(reordered, snapshot.claims[0]!, snapshot.links[0]!)).toEqual(
      inspected,
    );
    expect(reordered.links.find((link) => link.id === 'link-cohort')?.number).toBe(1);
  });

  it.each([
    ['source-changed', 0, 'source-changed'],
    ['source-missing', 1, 'source-missing'],
    ['claim-revised', 0, 'claim-revised'],
    ['stale', 0, 'stale'],
    ['unknown-freshness', 0, 'unknown-freshness'],
    ['error', 0, 'error'],
  ] as const)('does not carry support into %s', (state, index, status) => {
    const snapshot = scenario(state);
    expect(
      inspectResearchLink(snapshot, snapshot.claims[index]!, snapshot.links[index]!).status,
    ).toBe(status);
    expect(snapshot.links.map((link) => [link.id, link.number])).toEqual(
      suppliedResearchSnapshot().links.map((link) => [link.id, link.number]),
    );
  });

  it('rejects locator and source-ID mismatches rather than substituting another excerpt', () => {
    const snapshot = suppliedResearchSnapshot();
    const reference = snapshot.links[0]!.reference;
    expect(
      inspectResearchLink(snapshot, snapshot.claims[0]!, {
        ...snapshot.links[0]!,
        reference: { ...reference, locator: 'Page 3' },
      }),
    ).toMatchObject({ status: 'source-changed', source: undefined });
    expect(
      inspectResearchLink(snapshot, snapshot.claims[0]!, {
        ...snapshot.links[0]!,
        reference: { ...reference, sourceId: 'not-supplied' },
      }),
    ).toMatchObject({ status: 'source-missing', source: undefined });
  });

  it('keeps unavailable, unassessed and revoked evidence from being linked support', () => {
    const snapshot = suppliedResearchSnapshot();
    expect(inspectResearchLink(snapshot, snapshot.claims[2]!, snapshot.links[2]!).status).toBe(
      'source-missing',
    );
    expect(
      inspectResearchLink(snapshot, snapshot.claims[0]!, {
        ...snapshot.links[0]!,
        assessment: 'unassessed',
      }).status,
    ).toBe('unassessed');
    const revoked = {
      ...snapshot,
      sources: snapshot.sources.map((source) => ({
        ...source,
        value: { ...source.value, access: 'revoked' as const },
      })),
    };
    expect(inspectResearchLink(revoked, snapshot.claims[0]!, snapshot.links[0]!).status).toBe(
      'source-missing',
    );
  });

  it('invalidates a mapping belonging to a different claim even if its source matches', () => {
    const snapshot = suppliedResearchSnapshot();
    expect(inspectResearchLink(snapshot, snapshot.claims[1]!, snapshot.links[0]!).status).toBe(
      'claim-revised',
    );
  });

  it('rejects oversized excerpts and ambiguous IDs without truncating supplied evidence', () => {
    const snapshot = suppliedResearchSnapshot();
    const oversized = {
      ...snapshot,
      sources: snapshot.sources.map((source) => ({
        ...source,
        value: { ...source.value, excerpt: 'x'.repeat(researchBounds.excerpt + 1) },
      })),
    };
    expect(researchSnapshotIssue(oversized)).toContain('oversized');
    expect(inspectResearchLink(oversized, oversized.claims[0]!, oversized.links[0]!).status).toBe(
      'invalid',
    );
    expect(
      researchSnapshotIssue({ ...snapshot, sources: [...snapshot.sources, snapshot.sources[0]!] }),
    ).toContain('ambiguous');
    expect(
      researchSnapshotIssue({
        ...snapshot,
        claims: Array.from({ length: 7 }, (_, i) => ({ ...snapshot.claims[0]!, id: `claim-${i}` })),
      }),
    ).toContain('limits');
    expect(
      researchSnapshotIssue({
        ...snapshot,
        links: snapshot.links.map((link) => ({ ...link, number: 1 })),
      }),
    ).toContain('ambiguous');
  });

  it('ignores unknown fixture requests and preserves the original immutable snapshot', () => {
    const original = suppliedResearchSnapshot();
    expect(
      researchHostReducer(original, { type: 'select-snapshot', scenario: 'live-retrieval' }),
    ).toBe(original);
    researchHostReducer(original, { type: 'select-snapshot', scenario: 'claim-revised' });
    expect(original.claims[0]!.revision).toBe('1');
    expect(original.sources[0]!.value.version).toBe('memo-v1');
  });
});

describe('research answer composition', () => {
  it('discloses simulation and keeps the unsupported result visibly unassessed', () => {
    render(<ResearchRecipe />);
    expect(screen.getByText('Simulated host · synthetic supplied documents.')).toBeVisible();
    expect(screen.getByText('The pilot reduced resolution time.')).toBeVisible();
    expect(screen.getByText('Source unavailable')).toBeVisible();
    expect(
      screen.getByText(/The resolution-time claim has no available supporting excerpt/),
    ).toBeVisible();
    expect(screen.queryByText(/verified|confidence|\d+%/i)).toBeNull();
    expect(screen.getByRole('status', { name: 'Research evidence update' })).toHaveTextContent(
      '2 of 3 claims',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens exact excerpts with keyboard and returns focus to the same citation', async () => {
    const user = userEvent.setup();
    render(<ResearchRecipe />);
    const citation = screen.getByRole('button', { name: 'Source 1: Rollout memo' });
    citation.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Rollout memo' });
    expect(
      within(dialog).getByText(
        'The pilot includes two support teams. Expansion requires a separate review.',
      ),
    ).toBeVisible();
    expect(within(dialog).getAllByText(/Page 2 · §2 Pilot scope/).length).toBeGreaterThan(0);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(citation).toHaveFocus();
  });

  it('opens a missing-source citation on pointer input without fabricating an excerpt', async () => {
    const user = userEvent.setup();
    render(<ResearchRecipe />);
    const citation = screen.getByRole('button', { name: 'Source 3: Outcome appendix' });
    await user.click(citation);
    const dialog = screen.getByRole('dialog', { name: 'Outcome appendix' });
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Source missing. Content unavailable.',
    );
    expect(within(dialog).queryByRole('blockquote')).toBeNull();
    await user.keyboard('{Escape}');
    expect(citation).toHaveFocus();
  });

  it('marks revised claims and changed source references through explicit snapshot selection', async () => {
    const user = userEvent.setup();
    render(<ResearchRecipe />);
    await user.click(screen.getByRole('combobox', { name: 'Supplied evidence state' }));
    await user.click(screen.getByRole('option', { name: 'Claim revised' }));
    expect(screen.getByText('The pilot is limited to three support teams.')).toBeVisible();
    expect(screen.getByText('Claim revision needs review')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Research evidence update' })).toHaveTextContent(
      '1 of 3 claims',
    );
    await user.click(screen.getByRole('combobox', { name: 'Supplied evidence state' }));
    await user.click(screen.getByRole('option', { name: 'Source version changed' }));
    expect(screen.getByText('Source version or location changed')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Source 1: Source unavailable' }));
    const dialog = screen.getByRole('dialog', { name: 'Source unavailable' });
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Source version or location unavailable',
    );
    expect(within(dialog).queryByText(/revised pilot includes three/)).toBeNull();
  });

  it('preserves exact evidence disclosure and honest context inclusion state', async () => {
    const user = userEvent.setup();
    render(<ResearchRecipe />);
    await user.click(screen.getByRole('button', { name: 'Evidence for cohort' }));
    const evidence = screen.getByRole('group', { name: 'Evidence' });
    expect(within(evidence).getByText('supports')).toBeVisible();
    expect(screen.getByText(/Bound to claim revision 1/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Context and host responsibility' }));
    expect(screen.getByText('Context usage unknown')).toBeVisible();
    expect(screen.getAllByText(/model inclusion is not reported/)).toHaveLength(2);
    expect(screen.queryByText('included')).toBeNull();
  });

  it('shows host errors with retained excerpts and zero current mappings', async () => {
    const user = userEvent.setup();
    render(<ResearchRecipe />);
    await user.click(screen.getByRole('combobox', { name: 'Supplied evidence state' }));
    await user.click(screen.getByRole('option', { name: 'Host snapshot error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Previous excerpts are retained');
    expect(screen.getByRole('status', { name: 'Research evidence update' })).toHaveTextContent(
      '0 of 3 claims',
    );
    expect(screen.getAllByText('Current host snapshot unavailable')).toHaveLength(2);
    await user.click(screen.getAllByText('Read supplied excerpt', { selector: 'summary' })[0]!);
    expect(
      screen.getByText(
        'The pilot includes two support teams. Expansion requires a separate review.',
      ),
    ).toBeVisible();
  });
});
