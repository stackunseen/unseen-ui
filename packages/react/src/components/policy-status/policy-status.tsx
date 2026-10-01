'use client';
import type { PolicyCheck } from '@ai-interaction/core';
import { policyAssessment } from '@ai-interaction/core';
import { Accordion } from '../accordion/accordion.js';
import { Panel } from '../panel/panel.js';
import { IconButton } from '../icon-button/icon-button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Skeleton } from '../skeleton/skeleton.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';

export interface PolicyStatusProps extends VariantProps<'PolicyStatus'> {
  checks: readonly PolicyCheck[];
  classification?: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function PolicyStatus({
  checks,
  classification,
  variant = 'list',
  loading = false,
  error,
  onRefresh,
}: PolicyStatusProps) {
  const assessments = checks.map(policyAssessment);
  const allPassed = checks.length > 0 && assessments.every((result) => result === 'pass');
  const blocked = assessments.includes('fail');
  const summary = loading
    ? 'Checking policies'
    : error
      ? 'Policy check unavailable'
      : !checks.length
        ? 'No policy results'
        : blocked
          ? 'A policy check blocked this scope'
          : allPassed
            ? 'All reported checks passed'
            : 'Some checks need attention';
  function badge(check: PolicyCheck) {
    const result = policyAssessment(check);
    return (
      <StatusBadge
        state={
          result === 'pass'
            ? 'succeeded'
            : result === 'fail'
              ? 'failed'
              : result === 'warn'
                ? 'pending'
                : result === 'stale'
                  ? 'superseded'
                  : 'unknown'
        }
        label={
          result === 'pass'
            ? 'Passed'
            : result === 'fail'
              ? 'Blocked'
              : result === 'warn'
                ? 'Warning'
                : result === 'stale'
                  ? 'Stale'
                  : 'Not verified'
        }
      />
    );
  }
  function details(check: PolicyCheck) {
    return (
      <div>
        {check.detail && <p>{check.detail}</p>}
        {check.attestation ? (
          <ul className={s.provenance}>
            <li>
              <span>Authority</span>
              <strong>{check.attestation.source || 'Unknown'}</strong>
            </li>
            <li>
              <span>Scope</span>
              <strong>{check.attestation.scope || 'Unknown'}</strong>
            </li>
            <li>
              <span>Policy version</span>
              <strong>{check.attestation.policyVersion || 'Unknown'}</strong>
            </li>
            <li>
              <span>Checked</span>
              <strong>
                <ObservationTime value={check.attestation.checkedAt} />
              </strong>
            </li>
          </ul>
        ) : (
          <p className={s.muted}>No verifiable attestation was supplied.</p>
        )}
        {check.freshness === 'stale' && (
          <p className={s.warning}>This result is historical. Refresh before relying on it.</p>
        )}
      </div>
    );
  }
  return (
    <Panel className={s.policyStatus} data-variant={variant}>
      <div className={s.row}>
        <strong className={s.grow}>
          <AIIcon name={allPassed && !error && !loading ? 'check' : 'info'} /> Policy checks
        </strong>
        {onRefresh && (
          <IconButton icon="retry" label="Refresh checks" onClick={onRefresh} disabled={loading} />
        )}
      </div>
      <p role="status" className={blocked && !loading ? s.error : s.muted}>
        {summary}
      </p>
      {classification && (
        <p className={s.muted}>
          Data classification: <strong>{classification}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {loading ? (
        <Skeleton label="Loading policy checks" />
      ) : !checks.length ? (
        <p className={s.emptyState}>The host has not supplied any policy attestations.</p>
      ) : variant === 'accordion' ? (
        <Accordion
          region={false}
          type="multiple"
          variant="divided"
          items={checks.map((check) => ({
            value: check.id,
            title: (
              <span className={s.summaryTitle}>
                {check.label}
                {badge(check)}
              </span>
            ),
            content: details(check),
          }))}
        />
      ) : (
        <ul className={s.inspectorList}>
          {checks.map((check) => (
            <li key={check.id}>
              <div className={s.row}>
                <strong className={s.grow}>{check.label}</strong>
                {badge(check)}
              </div>
              {details(check)}
            </li>
          ))}
        </ul>
      )}
      <p className={s.muted}>Reported by the host. Actions still require current authorization.</p>
    </Panel>
  );
}
