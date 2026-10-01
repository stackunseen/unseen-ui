'use client';
import { useState } from 'react';
import {
  ConnectionStatus,
  ContextInspector,
  ModelControls,
  PolicyStatus,
  resolveVariant,
} from '@ai-interaction/react';
import {
  connectionInfo,
  contextInspection,
  modelCapabilities,
  modelSettings,
  modelUsage,
  policyChecks,
} from '../lib/inspection-fixtures';

export function InspectionSpecimen({
  name,
  state,
  presentation,
}: {
  name: 'ConnectionStatus' | 'ContextInspector' | 'ModelControls' | 'PolicyStatus';
  state: string;
  presentation?: string;
}) {
  const [settings, setSettings] = useState(() =>
    state === 'Unsupported'
      ? { ...modelSettings, modelId: 'atlas-research' }
      : state === 'Unavailable'
        ? { ...modelSettings, modelId: 'atlas-legacy' }
        : modelSettings,
  );
  const [notice, setNotice] = useState('');
  let content;
  if (name === 'ModelControls')
    content = (
      <ModelControls
        variant={resolveVariant(name, presentation)}
        value={settings}
        onValueChange={(value) => {
          setSettings(value);
          setNotice('Draft settings updated. No model call was made.');
        }}
        capabilities={modelCapabilities}
        usage={state === 'Usage unknown' ? undefined : modelUsage}
        status={state === 'Loading' ? 'loading' : state === 'Error' ? 'failed' : 'ready'}
        stale={state === 'Stale'}
        error={
          state === 'Error' ? 'The capability endpoint is unavailable in this fixture.' : undefined
        }
        onRefresh={() =>
          setNotice('Capability refresh requested. The host must return a new capability snapshot.')
        }
      />
    );
  if (name === 'ContextInspector')
    content = (
      <ContextInspector
        variant={resolveVariant(name, presentation)}
        value={{
          ...contextInspection,
          stale: state === 'Stale' || state === 'Error',
          items: state === 'Empty' ? [] : contextInspection.items,
          usage:
            state === 'Unknown usage' || state === 'Empty'
              ? undefined
              : state === 'Over limit'
                ? { ...contextInspection.usage!, used: 18000 }
                : contextInspection.usage,
        }}
        loading={state === 'Loading'}
        error={
          state === 'Error'
            ? 'Context refresh failed. The last supplied snapshot is shown.'
            : undefined
        }
        onRefresh={() => setNotice('Context refresh requested. No source selection was changed.')}
      />
    );
  if (name === 'ConnectionStatus')
    content = (
      <ConnectionStatus
        variant={resolveVariant(name, presentation)}
        value={{
          ...connectionInfo,
          state:
            state === 'Connected' ||
            state === 'Resumed' ||
            state === 'Connected stale' ||
            state === 'Connected unknown' ||
            state === 'Snapshot unavailable'
              ? 'connected'
              : state === 'Reconnecting'
                ? 'reconnecting'
                : 'disconnected',
          recovery:
            state === 'Incompatible' ? 'incompatible' : state === 'Resumed' ? 'resumed' : 'none',
          freshness:
            state === 'Connected stale'
              ? 'stale'
              : state === 'Connected unknown' || state === 'Snapshot unavailable'
                ? 'unknown'
                : undefined,
          resumedAt: state === 'Resumed' ? '2026-09-29T12:01:00Z' : undefined,
          detail:
            state === 'Connected'
              ? 'The simulated stream is connected.'
              : state === 'Resumed'
                ? 'The host resumed after sequence 42. No new attempt was created.'
                : connectionInfo.detail,
          adapter:
            state === 'Snapshot unavailable'
              ? { ...connectionInfo.adapter, resume: false, snapshot: false }
              : state === 'No replay'
                ? { ...connectionInfo.adapter, resume: false }
                : connectionInfo.adapter,
        }}
        submission={
          state === 'Unknown outcome'
            ? 'outcome-unknown'
            : state === 'Reconnecting'
              ? 'submitting'
              : state === 'Error'
                ? 'failed'
                : 'idle'
        }
        error={state === 'Error' ? 'Recovery failed in this fixture.' : undefined}
        onResume={
          state === 'Snapshot unavailable'
            ? undefined
            : (cursor) =>
                setNotice(
                  `Resume requested after ${cursor.streamId} sequence ${cursor.sequence}. Waiting for host acknowledgement.`,
                )
        }
        onRefresh={
          state === 'Snapshot unavailable'
            ? undefined
            : () =>
                setNotice('Snapshot refresh requested. The host supplies the current run state.')
        }
      />
    );
  if (name === 'PolicyStatus')
    content = (
      <PolicyStatus
        variant={resolveVariant(name, presentation)}
        checks={
          state === 'Empty'
            ? []
            : policyChecks.map((check, index) =>
                state === 'Stale'
                  ? { ...check, freshness: 'stale' }
                  : state === 'Unknown'
                    ? { ...check, attestation: undefined }
                    : state === 'Passed'
                      ? { ...check, result: 'pass' }
                      : state === 'Blocked' && index === 0
                        ? {
                            ...check,
                            result: 'fail',
                            detail: 'The selected records are under a retention hold.',
                          }
                        : check,
              )
        }
        loading={state === 'Loading'}
        error={
          state === 'Error'
            ? 'The policy authority did not respond. Existing attestations are shown.'
            : undefined
        }
        classification="Confidential · fixture"
        onRefresh={() =>
          setNotice('Policy refresh requested. The UI does not grant authorization.')
        }
      />
    );
  return (
    <>
      {content}
      {notice && (
        <p role="status" className="specimen-feedback">
          {notice}
        </p>
      )}
    </>
  );
}
