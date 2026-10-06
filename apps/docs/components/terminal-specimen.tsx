'use client';
import { useState } from 'react';
import { Button, TerminalOutput, resolveVariant } from '@stackunseen/ui';
import type { TerminalContext, TerminalAvailability, TerminalProcessState } from '@stackunseen/ui';
import { TerminalEmulator } from '@stackunseen/ui/terminal';

import { emulatorStates } from '../lib/terminal-fixtures';
const sample =
  '\x1b[32mBuild complete\x1b[0m\r\n\x1b[34m3 tests passed\x1b[0m\r\nReady for review.\r\n> ';
export function TerminalSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [revision, setRevision] = useState(1),
    [denied, setDenied] = useState(false),
    [text, setText] = useState(
      state === 'Cursor updates' ? 'Progress 1%\rProgress 100%\x1b[K\r\nDone.\r\n' : sample,
    ),
    [message, setMessage] = useState(''),
    [stopped, setStopped] = useState(false);
  const context = {
    sessionId: 'gallery-terminal',
    streamId: `stream-${revision}`,
    version: String(revision),
  };
  const availability: TerminalAvailability =
    denied || state === 'Denied'
      ? 'denied'
      : state === 'Loading'
        ? 'loading'
        : state === 'Unavailable'
          ? 'unavailable'
          : state === 'Error'
            ? 'error'
            : state === 'Stale'
              ? 'stale'
              : 'ready';
  const processState: TerminalProcessState = stopped
    ? 'cancelled'
    : state === 'Failed'
      ? 'failed'
      : state === 'Unknown'
        ? 'unknown'
        : state === 'Empty'
          ? 'idle'
          : ['Running', ...emulatorStates].includes(state)
            ? 'running'
            : 'complete';
  const connection =
    state === 'Disconnected'
      ? 'disconnected'
      : state === 'Reconnecting'
        ? 'reconnecting'
        : 'connected';
  const submission =
    state === 'Action pending'
      ? 'submitting'
      : state === 'Unknown action'
        ? 'outcome-unknown'
        : 'idle';
  const output =
    state === 'Empty'
      ? ''
      : state === 'Long output' || state === 'Truncated ANSI'
        ? `${'Earlier output\r\n'.repeat(5000)}${text}`
        : state === 'Blocked controls'
          ? `${text}\x1b]0;Untrusted terminal title\x07\x1b]8;;https://example.com\x07link text\x1b]8;;\x07\x1b]52;c;Y2xpcGJvYXJk\x07`
          : text;
  const scoped = (request: TerminalContext) =>
    request.sessionId === context.sessionId &&
    request.streamId === context.streamId &&
    request.version === context.version;
  const View = emulatorStates.includes(state) ? TerminalEmulator : TerminalOutput;
  return (
    <div data-part="terminal-fixture">
      <p className="fixture-label">
        Synthetic host · optional xterm engine is real; process and acknowledgements are simulated.
      </p>
      {state === 'Live versions' && (
        <div className="specimen-controls">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRevision((v) => v + 1);
              setText(sample);
              setMessage('');
            }}
          >
            Next stream
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDenied((v) => !v);
              setRevision((v) => v + 1);
              setMessage('');
            }}
          >
            {denied ? 'Restore terminal access' : 'Revoke terminal access'}
          </Button>
        </div>
      )}
      <View
        variant={resolveVariant('TerminalOutput', presentation)}
        output={output}
        state={processState}
        context={state === 'Invalid context' ? { ...context, version: '' } : context}
        status={availability}
        error={state === 'Error' ? 'Public fixture output could not be loaded.' : undefined}
        command="public fixture"
        exitCode={state === 'Failed' ? 1 : state === 'Default' ? 0 : undefined}
        connection={connection}
        submission={submission}
        onRequestStop={(request) => {
          if (scoped(request)) {
            setStopped(true);
            onEvent('synthetic stop acknowledged');
          }
        }}
        onRequestClear={(request) => {
          if (scoped(request)) {
            setText('');
            setRevision((v) => v + 1);
            onEvent('synthetic clear acknowledged');
          }
        }}
        {...(View === TerminalEmulator
          ? {
              inputEnabled: state === 'Terminal input' || state === 'Live versions',
              onInput: (request: TerminalContext & { data: string }) => {
                if (!scoped(request) || availability !== 'ready') return;
                setText((value) => `${value}${request.data}`.slice(-60000));
                setMessage(`Synthetic input acknowledged for stream ${revision}.`);
              },
            }
          : {})}
      />
      {message && <p role="status">{message}</p>}
    </div>
  );
}
