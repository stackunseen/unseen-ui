'use client';
import { useEffect, useState } from 'react';
import {
  ConfidenceNote,
  FeedbackCapture,
  ProvenanceBadge,
  UsageMeter,
  emptyFeedbackDraft,
  resolveVariant,
} from '@stackunseen/ui';
import type { FeedbackDraft } from '@stackunseen/ui';
import type { CommandReceipt, SubmissionState } from '@stackunseen/ui-core';

const at = '2026-10-16T09:30:00.000Z';

export function TrustSpecimen({
  name,
  state,
  presentation,
  onNotice,
}: {
  name: 'UsageMeter' | 'ProvenanceBadge' | 'ConfidenceNote' | 'FeedbackCapture';
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const [draft, setDraft] = useState<FeedbackDraft>(
    state === 'Not helpful' || state === 'Sending' || state === 'Acknowledged' || state === 'Failed'
      ? { helpful: false, reasons: ['incomplete'], correction: '' }
      : emptyFeedbackDraft,
  );
  const [submission, setSubmission] = useState<SubmissionState>(
    state === 'Sending'
      ? 'submitting'
      : state === 'Acknowledged'
        ? 'acknowledged'
        : state === 'Failed'
          ? 'failed'
          : state === 'Outcome unknown'
            ? 'outcome-unknown'
            : 'idle',
  );
  const [receipt, setReceipt] = useState<CommandReceipt | undefined>(
    state === 'Failed'
      ? { commandId: 'fb-1', status: 'failed', message: 'The feedback service timed out.' }
      : undefined,
  );
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setSubmission('acknowledged');
      setReceipt({ commandId: 'fb-2', status: 'acknowledged', at });
      setPending(false);
      onNotice('The simulated host recorded the feedback for message m1, revision 3.');
    }, 700);
    return () => clearTimeout(timer);
  }, [pending, onNotice]);

  switch (name) {
    case 'UsageMeter': {
      const variant = resolveVariant('UsageMeter', presentation);
      if (state === 'Cost')
        return (
          <UsageMeter
            variant={variant}
            label="Cost"
            unit="currency"
            value={{ kind: 'estimated', value: { used: 1.25, limit: 5 }, basis: 'list prices', at }}
          />
        );
      if (state === 'Near limit')
        return (
          <UsageMeter
            variant={variant}
            label="Context"
            value={{ kind: 'measured', value: { used: 27400, limit: 32000 }, at }}
          />
        );
      if (state === 'No limit')
        return (
          <UsageMeter
            variant={variant}
            label="Context"
            value={{ kind: 'measured', value: { used: 12400 }, at }}
          />
        );
      if (state === 'Unknown')
        return (
          <UsageMeter
            variant={variant}
            label="Context"
            value={{ kind: 'unknown', reason: 'the provider did not report usage' }}
          />
        );
      return (
        <UsageMeter
          variant={variant}
          label="Context"
          value={{ kind: 'measured', value: { used: 12400, limit: 32000 }, at }}
        />
      );
    }
    case 'ProvenanceBadge': {
      const variant = resolveVariant('ProvenanceBadge', presentation);
      if (state === 'Signed')
        return (
          <ProvenanceBadge
            variant={variant}
            origin="tool"
            source="search_accounts"
            manifest={{ issuer: 'Example connector CA', verifiedBy: 'host', at }}
          />
        );
      if (state === 'Tool')
        return <ProvenanceBadge variant={variant} origin="tool" source="search_accounts" />;
      if (state === 'Person')
        return <ProvenanceBadge variant={variant} origin="person" source="Priya" />;
      if (state === 'Imported')
        return <ProvenanceBadge variant={variant} origin="imported" source="handbook.pdf" />;
      return <ProvenanceBadge variant={variant} origin="model" source="demo-model" />;
    }
    case 'ConfidenceNote': {
      const variant = resolveVariant('ConfidenceNote', presentation);
      if (state === 'Unknown')
        return (
          <>
            <ConfidenceNote
              variant={variant}
              score={{ kind: 'unknown' }}
              scope="of claims matched a source"
              method="eval pass rate"
            />
            <p className="component-guidance">
              The host reported no calibration, so the note renders nothing. This caption is part of
              the example, not the component.
            </p>
          </>
        );
      if (state === 'Estimated')
        return (
          <ConfidenceNote
            variant={variant}
            score={{ kind: 'estimated', value: 0.6, basis: 'a sample of 5 reviewed runs', at }}
            scope="of answers were accepted by reviewers"
            method="reviewer sampling"
          />
        );
      return (
        <ConfidenceNote
          variant={variant}
          score={{ kind: 'measured', value: 0.82, at }}
          scope="of claims matched a cited source"
          method="eval pass rate over 40 runs"
        />
      );
    }
    case 'FeedbackCapture':
      return (
        <FeedbackCapture
          variant={resolveVariant('FeedbackCapture', presentation)}
          target={{ messageId: 'm1', revision: 3 }}
          value={draft}
          onValueChange={setDraft}
          submission={submission}
          receipt={receipt}
          onSubmit={(feedback) => {
            setSubmission('submitting');
            setReceipt(undefined);
            setPending(true);
            onNotice(
              `Feedback sent for message ${'messageId' in feedback.target ? feedback.target.messageId : ''}: ${feedback.helpful ? 'helpful' : 'not helpful'}${feedback.reasons.length ? ` (${feedback.reasons.join(', ')})` : ''}.`,
            );
          }}
        />
      );
  }
}
