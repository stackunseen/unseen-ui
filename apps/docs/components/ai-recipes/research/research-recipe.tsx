'use client';

import { useId, useReducer } from 'react';
import {
  Accordion,
  Citation,
  ContextBar,
  EvidenceGroup,
  GroundingStatus,
  Select,
} from '@stackunseen/ui';
import { MarkdownResponse } from '@stackunseen/ui/markdown';
import {
  inspectResearchLink,
  researchHostReducer,
  researchLinkLabels,
  researchScenarios,
  researchSnapshotIssue,
  suppliedResearchSnapshot,
} from './research-host';
import type { ResearchClaim, ResearchSnapshot } from './research-host';
import styles from './research-recipe.module.css';

function ResearchClaimAnswer({
  claim,
  snapshot,
}: {
  claim: ResearchClaim;
  snapshot: ResearchSnapshot;
}) {
  const links = snapshot.links.filter((link) => link.claimId === claim.id);
  return (
    <li className={styles.claim} data-claim-id={claim.id} data-claim-revision={claim.revision}>
      <MarkdownResponse text={claim.text} state="complete" headingLevel={3} />
      <div className={styles.citations}>
        {links.map((link) => {
          const inspected = inspectResearchLink(snapshot, claim, link);
          return (
            <div key={link.id} className={styles.citation} data-evidence-state={inspected.status}>
              <Citation
                number={link.number}
                source={inspected.source}
                reference={link.reference}
                variant="number"
              />
              <span>{researchLinkLabels[inspected.status]}</span>
            </div>
          );
        })}
        {!links.length && <span>No supplied claim-to-source mapping.</span>}
      </div>
      <Accordion
        type="single"
        collapsible
        region={false}
        headingLevel={3}
        items={[
          {
            value: claim.id,
            title: `Evidence for ${claim.id.replace('claim-', '')}`,
            content: (
              <div className={styles.detail}>
                <p>Claim revision {claim.revision}.</p>
                {links.map((link) => {
                  const inspected = inspectResearchLink(snapshot, claim, link);
                  return (
                    <div key={link.id}>
                      <p>
                        Reference [{link.number}] · {link.reference.version} ·{' '}
                        {link.reference.locator}. Bound to claim revision {link.claimRevision}.
                      </p>
                      <EvidenceGroup
                        variant="stack"
                        claim={researchLinkLabels[inspected.status]}
                        sources={inspected.source ? [inspected.source] : []}
                        relationships={
                          inspected.source
                            ? {
                                [inspected.source.id]:
                                  inspected.status === 'linked' ? 'supports' : 'related',
                              }
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    </li>
  );
}

/** No-props recipe. A production app replaces the local reducer with host snapshots. */
export function ResearchRecipe() {
  const [snapshot, dispatch] = useReducer(researchHostReducer, undefined, suppliedResearchSnapshot);
  const id = useId();
  const issue = researchSnapshotIssue(snapshot);
  const linked = issue
    ? 0
    : snapshot.claims.filter((claim) => {
        const links = snapshot.links.filter((link) => link.claimId === claim.id);
        return (
          links.length > 0 &&
          links.every((link) => inspectResearchLink(snapshot, claim, link).status === 'linked')
        );
      }).length;
  return (
    <section className={styles.recipe} aria-label="Research answer recipe">
      <p className={styles.disclosure}>
        <strong>Simulated host · synthetic supplied documents.</strong> Excerpts and support
        assessments are fixed fixtures, with no live retrieval or verification.
      </p>
      <div className={styles.toolbar}>
        <div className={styles.controls}>
          <label id={`${id}-scenario`}>Supplied evidence state</label>
          <Select
            aria-labelledby={`${id}-scenario`}
            value={snapshot.scenario}
            options={researchScenarios}
            onValueChange={(scenario) => dispatch({ type: 'select-snapshot', scenario })}
          />
        </div>
        <p
          className={styles.announcement}
          role="status"
          aria-label="Research evidence update"
          aria-live="polite"
          aria-atomic="true"
        >
          {linked} of {snapshot.claims.length} claims have a current supplied excerpt mapping.
          Partial evidence.
        </p>
      </div>
      {snapshot.error && (
        <p role="alert" className={styles.warning}>
          {snapshot.error}
        </p>
      )}
      {issue ? (
        <p role="alert">{issue} Evidence rendering stopped.</p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.answer}>
            <h2>What do the supplied notes say about the pilot rollout?</h2>
            <ol className={styles.claims} aria-label="Research claims">
              {snapshot.claims.map((claim) => (
                <ResearchClaimAnswer key={claim.id} claim={claim} snapshot={snapshot} />
              ))}
            </ol>
            <p className={styles.warning}>
              The resolution-time claim has no available supporting excerpt. Do not treat it as an
              established result.
            </p>
          </div>
          <aside className={styles.sources} aria-labelledby={`${id}-sources`}>
            <h2 id={`${id}-sources`}>Supplied sources</h2>
            <p className={styles.muted}>
              Open a numbered citation for its pinned reference, or read a supplied excerpt below.
            </p>
            <ul className={styles.sourceList}>
              {snapshot.sources.map(({ value, freshness }) => (
                <li key={value.id} className={styles.source}>
                  <h3>{value.title}</h3>
                  <p className={styles.muted}>
                    {value.locator} · {value.version}
                  </p>
                  <p className={styles.muted}>
                    Host freshness: {freshness}. Access: {value.access}.
                  </p>
                  {value.access === 'available' && value.excerpt ? (
                    <details className={styles.excerpt}>
                      <summary>Read supplied excerpt</summary>
                      <blockquote>{value.excerpt}</blockquote>
                    </details>
                  ) : (
                    <p className={styles.muted}>Content unavailable.</p>
                  )}
                </li>
              ))}
            </ul>
            <Accordion
              type="single"
              collapsible
              region={false}
              headingLevel={3}
              items={[
                {
                  value: 'request-context',
                  title: 'Context and host responsibility',
                  content: (
                    <div className={styles.detail}>
                      <p>Draft answer · {snapshot.revision}.</p>
                      <GroundingStatus
                        variant="text"
                        value={{
                          kind: 'qualitative',
                          label: 'How current mappings are counted',
                          method:
                            'Counts exact accessible references with current host freshness and a supplied support assessment, bound to the claim revision. This does not verify claim correctness.',
                        }}
                      />
                      <ContextBar
                        items={snapshot.sources.map(({ value }) => ({
                          id: value.id,
                          label: value.title,
                          state: value.access === 'available' ? 'selected' : 'excluded',
                          reason:
                            value.access === 'available'
                              ? 'Supplied to this example; model inclusion is not reported.'
                              : 'Content was not supplied.',
                        }))}
                      />
                      <p>
                        The host owns access checks, exact excerpts, immutable source versions,
                        freshness, claim revisions and support assessments. Source links alone
                        establish none of these.
                      </p>
                      <p>
                        Bounds: six claims, eight sources, sixteen links; 1,200 characters per claim
                        and 2,400 per exact excerpt. Oversized or ambiguous snapshots are rejected.
                      </p>
                    </div>
                  ),
                },
              ]}
            />
          </aside>
        </div>
      )}
    </section>
  );
}
