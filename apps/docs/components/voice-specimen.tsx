'use client';
import { useState } from 'react';
import { Button, VoiceControl, resolveVariant } from '@stackunseen/ui';
import type { VoiceCaptureSnapshot, VoiceContext, VoiceTranscription } from '@stackunseen/ui';

const same = (a: VoiceContext, b: VoiceContext) =>
  a.sessionId === b.sessionId && a.captureId === b.captureId && a.version === b.version;
export function VoiceSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const context = { sessionId: 'gallery-voice', captureId: 'capture-1', version: '1' };
  const [capture, setCapture] = useState<VoiceCaptureSnapshot>({
    context: state === 'Invalid context' ? { ...context, version: '' } : context,
    state:
      state === 'Listening' ||
      state === 'Muted' ||
      state === 'Unknown level' ||
      state === 'Invalid level'
        ? 'recording'
        : state === 'Requesting'
          ? 'requesting'
          : state === 'Stopping'
            ? 'stopping'
            : state === 'Cancelled' || state === 'Cancelled permission request'
              ? 'cancelled'
              : state === 'Interrupted'
                ? 'interrupted'
                : state === 'Unknown capture'
                  ? 'unknown'
                  : state === 'Error'
                    ? 'error'
                    : [
                          'Processing',
                          'Complete',
                          'Partial transcript',
                          'Complete transcript',
                          'Obsolete transcript',
                          'Long transcript',
                          'Live versions',
                        ].includes(state)
                      ? 'complete'
                      : 'idle',
    permission:
      state === 'Permission denied'
        ? 'denied'
        : state === 'Unsupported'
          ? 'unsupported'
          : state === 'Requesting'
            ? 'prompt'
            : 'not-required',
    source: 'synthetic',
    permissionRequestPending: state === 'Requesting' || state === 'Cancelled permission request',
    inputLevel: state === 'Invalid level' ? 2 : state === 'Listening' ? 0.45 : undefined,
    muted: state === 'Muted',
    error: state === 'Error' ? 'Synthetic capture failure. Continue typing.' : undefined,
  });
  const [device, setDevice] = useState(state === 'Missing device' ? 'missing-device' : 'default');
  const [access, setAccess] = useState<'ready' | 'denied'>('ready');
  const [transcription, setTranscription] = useState<VoiceTranscription>({
    context: state === 'Obsolete transcript' ? { ...context, version: 'old' } : context,
    state:
      state === 'Idle transcript'
        ? 'idle'
        : state === 'Transcription error'
          ? 'error'
          : state === 'Unknown transcript'
            ? 'unknown'
            : ['Processing', 'Partial transcript'].includes(state)
              ? 'streaming'
              : [
                    'Complete transcript',
                    'Obsolete transcript',
                    'Long transcript',
                    'Live versions',
                  ].includes(state)
                ? 'complete'
                : 'unavailable',
    error:
      state === 'Transcription error'
        ? 'Synthetic provider failure. Recorded audio is a separate server outcome.'
        : undefined,
    text:
      state === 'Transcript limit'
        ? 'x'.repeat(20001)
        : state === 'Long transcript'
          ? 'Review keyboard focus and the versioned search changes. '.repeat(300)
          : [
                'Processing',
                'Partial transcript',
                'Complete transcript',
                'Obsolete transcript',
                'Live versions',
              ].includes(state)
            ? 'Review keyboard focus in the search change.'
            : undefined,
  });
  const status =
    access === 'denied'
      ? 'denied'
      : state === 'Loading'
        ? 'loading'
        : state === 'Denied'
          ? 'denied'
          : state === 'Unavailable'
            ? 'unavailable'
            : state === 'Unknown availability'
              ? 'unknown'
              : state === 'Stale'
                ? 'stale'
                : 'ready';
  const devices =
    state === 'Duplicate devices'
      ? [
          { value: 'default', label: 'Default microphone' },
          { value: 'default', label: 'Duplicated microphone' },
        ]
      : state === 'Device limit'
        ? Array.from({ length: 51 }, (_, index) => ({
            value: `device-${index}`,
            label: `Device ${index}`,
          }))
        : [
            { value: 'default', label: 'Default microphone' },
            { value: 'headset', label: 'USB headset' },
          ];
  return (
    <>
      <VoiceControl
        label={`Voice input · ${resolveVariant('VoiceControl', presentation)}`}
        variant={resolveVariant('VoiceControl', presentation)}
        capture={capture}
        status={status}
        connection={state === 'Disconnected' ? 'disconnected' : 'connected'}
        submission={
          state === 'Pending'
            ? 'submitting'
            : state === 'Unknown action'
              ? 'outcome-unknown'
              : 'idle'
        }
        devices={devices}
        deviceId={device}
        transcription={transcription}
        onRequestStart={
          state === 'Read-only'
            ? undefined
            : (request) => {
                if (!same(request, capture.context)) return;
                const next = {
                  ...capture.context,
                  captureId: `capture-${Number(capture.context.version) + 1}`,
                  version: String(Number(capture.context.version) + 1),
                };
                setCapture({
                  context: next,
                  state: 'recording',
                  permission: 'not-required',
                  permissionRequestPending: false,
                  source: 'synthetic',
                });
                setTranscription({ context: next, state: 'unavailable' });
                onEvent('Simulated capture acknowledged. No audio source was opened.');
              }
        }
        onRequestStop={
          state === 'Read-only'
            ? undefined
            : (request) => {
                if (same(request, capture.context)) {
                  setCapture({
                    ...capture,
                    state: 'complete',
                    inputLevel: undefined,
                    muted: undefined,
                  });
                  onEvent('Simulated recording completion acknowledged.');
                }
              }
        }
        onRequestCancel={
          state === 'Read-only'
            ? undefined
            : (request) => {
                if (same(request, capture.context)) {
                  setCapture({
                    ...capture,
                    state: 'cancelled',
                    inputLevel: undefined,
                    permissionRequestPending: false,
                  });
                  setTranscription({ context: capture.context, state: 'unavailable' });
                }
              }
        }
        onRequestDeviceChange={
          state === 'Read-only'
            ? undefined
            : (request) => {
                if (!same(request, capture.context)) return;
                setDevice(request.deviceId);
                const next = {
                  ...capture.context,
                  version: String(Number(capture.context.version) + 1),
                };
                setCapture({
                  context: next,
                  state: 'idle',
                  permission: 'not-required',
                  permissionRequestPending: false,
                  source: 'synthetic',
                });
                setTranscription({ context: next, state: 'unavailable' });
                onEvent('Simulated device change acknowledged.');
              }
        }
      />
      {state === 'Live versions' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCapture({
                ...capture,
                context: {
                  ...capture.context,
                  version: String(Number(capture.context.version) + 1),
                },
              })
            }
          >
            Advance capture version
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAccess(access === 'ready' ? 'denied' : 'ready')}
          >
            {access === 'ready' ? 'Revoke voice access' : 'Restore voice access'}
          </Button>
        </div>
      )}
      <p className="specimen-feedback">
        Sample server samples. No microphone, generated audio or speech provider is opened.
      </p>
    </>
  );
}
