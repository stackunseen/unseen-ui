'use client';
import { useState } from 'react';
import { AgentHandoff, Button, PermissionRequest, resolveVariant } from '@stackunseen/ui';
import {
  executeHandoff,
  executePermission,
  handoffFixture,
  lookupHandoff,
  lookupPermission,
  permissionFixture,
} from '../lib/decision-demo-host';

export function PermissionSpecimen({
  state,
  presentation,
}: {
  state: string;
  presentation?: string;
}) {
  const [host, setHost] = useState(() => permissionFixture(state));
  return (
    <div className="decision-specimen">
      <PermissionRequest
        variant={resolveVariant('PermissionRequest', presentation)}
        value={host.value}
        commandId="gallery-permission-1"
        submission={host.submission}
        onDecision={(original) =>
          setHost((current) => ({ ...current, submission: { state: 'submitting', original } }))
        }
        onReconcile={(original) => setHost((current) => lookupPermission(current, original))}
      />
      <div className="sample-host-controls">
        <p>
          Simulated host. Lost acknowledgement commits the change but withholds its response.
          Receipt lookup and snapshot refresh are separate read operations.
        </p>
        {host.submission.state === 'submitting' && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => executePermission(current, false))}
            >
              Simulate acknowledgement
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => executePermission(current, true))}
            >
              Simulate lost acknowledgement
            </Button>
          </div>
        )}
        {host.submission.state !== 'idle' && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => ({ ...current, value: current.snapshot }))}
            >
              Refresh host snapshot
            </Button>
            <span className="sample-host-count">Local host changes: {host.executions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
export function HandoffSpecimen({ state, presentation }: { state: string; presentation?: string }) {
  const [host, setHost] = useState(() => handoffFixture(state));
  return (
    <div className="decision-specimen">
      <AgentHandoff
        variant={resolveVariant('AgentHandoff', presentation)}
        value={host.value}
        commandId="gallery-handoff-1"
        submission={host.submission}
        onDecision={(original) =>
          setHost((current) => ({ ...current, submission: { state: 'submitting', original } }))
        }
        onReconcile={(original) => setHost((current) => lookupHandoff(current, original))}
      />
      <div className="sample-host-controls">
        <p>
          Simulated host. The recipient acknowledges the exact context and access version. Losing
          its response retains the committed transfer; looking up that receipt never transfers
          ownership again.
        </p>
        {host.submission.state === 'submitting' && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => executeHandoff(current, false))}
            >
              Simulate recipient acknowledgement
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => executeHandoff(current, true))}
            >
              Simulate lost acknowledgement
            </Button>
          </div>
        )}
        {host.submission.state !== 'idle' && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHost((current) => ({ ...current, value: current.snapshot }))}
            >
              Refresh host snapshot
            </Button>
            <span className="sample-host-count">Local host changes: {host.executions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
