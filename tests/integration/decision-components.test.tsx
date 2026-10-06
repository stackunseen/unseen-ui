import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { PermissionRequest, AgentHandoff } from '@stackunseen/ui';
import { permissionFixture, handoffFixture } from '../decision-fixtures.js';

afterEach(() => vi.useRealTimers());

it('keeps server markup stable if expiry crosses before hydration', () => {
  const permission = permissionFixture(),
    handoff = handoffFixture();
  permission.target.expiresAt = handoff.target.expiresAt = '2026-10-01T00:00:01Z';
  const views = (
    <>
      <PermissionRequest
        value={permission}
        commandId="permission"
        submission={{ state: 'idle' }}
        onDecision={vi.fn()}
      />
      <AgentHandoff
        value={handoff}
        commandId="handoff"
        submission={{ state: 'idle' }}
        onDecision={vi.fn()}
      />
    </>
  );
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
  const before = renderToString(views);
  vi.setSystemTime(new Date('2026-10-01T00:00:02Z'));
  expect(renderToString(views)).toBe(before);
  expect(before.match(/disabled=""/g)).toHaveLength(4);
});

it('preserves legacy callback inference and behavior', () => {
  const legacy = {
    id: 'legacy-handoff',
    version: '1',
    from: 'A',
    to: 'B',
    owner: 'A',
    context: 'Summary',
    scope: 'workspace',
    state: 'requested' as const,
  };
  render(
    <>
      <PermissionRequest
        resource="CRM"
        scopes={['read']}
        status="requested"
        onDecision={(allow) => {
          const accepted: boolean = allow;
          expect(accepted).toBe(true);
        }}
      />
      <AgentHandoff
        value={legacy}
        onDecision={(request, decision) => {
          expect(request.id).toBe('legacy-handoff');
          const accepted: 'accept' | 'decline' = decision;
          expect(accepted).toBe('accept');
        }}
      />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Allow access' }));
  fireEvent.click(screen.getByRole('button', { name: 'Accept handoff' }));
});

it('infers scoped callbacks from the controlled props', () => {
  render(
    <>
      <PermissionRequest
        value={permissionFixture()}
        commandId="permission"
        submission={{ state: 'idle' }}
        onDecision={(command) => {
          expect(command.target.requestId).toBe('permission-1');
          const decision: 'allow' | 'deny' = command.decision;
          expect(decision).toBe('allow');
        }}
      />
      <AgentHandoff
        value={handoffFixture()}
        commandId="handoff"
        submission={{ state: 'idle' }}
        onDecision={(command) => {
          expect(command.target.handoffId).toBe('handoff-1');
          const decision: 'accept' | 'decline' = command.decision;
          expect(decision).toBe('accept');
        }}
      />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Allow access' }));
  fireEvent.click(screen.getByRole('button', { name: 'Accept handoff' }));
});
