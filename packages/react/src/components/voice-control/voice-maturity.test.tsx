import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceControl } from '@ai-interaction/react';
import type { VoiceCaptureSnapshot, VoiceTranscription } from '@ai-interaction/react';
import { inspectVoiceCapture, inspectVoiceDevices, inspectVoiceText } from './voice-model.js';

const context = { sessionId: 'session', captureId: 'capture', version: '1' };
const capture: VoiceCaptureSnapshot = {
  context,
  state: 'idle',
  permission: 'unknown',
  permissionRequestPending: false,
};
const transcript: VoiceTranscription = {
  context,
  state: 'complete',
  text: 'Original transcript\r\nwith exact whitespace.',
};
describe('voice snapshot boundaries', () => {
  it('rejects invalid scopes, measurements, access and oversized device windows', () => {
    for (const value of [
      { ...capture, context: { ...context, version: '' } },
      { ...capture, context: { ...context, version: 'x\n' } },
      { ...capture, bytes: 1.5 },
      { ...capture, elapsedMs: Infinity },
      { ...capture, inputLevel: 0.3 },
      { ...capture, state: 'recording', permission: 'denied' },
    ])
      expect(inspectVoiceCapture(value)).toBeUndefined();
    expect(
      inspectVoiceCapture({
        ...capture,
        state: 'recording',
        permission: 'granted',
        inputLevel: 0.4,
      }),
    ).toBeDefined();
    expect(
      inspectVoiceDevices(
        Array.from({ length: 51 }, (_, index) => ({ value: String(index), label: 'Device' })),
      ),
    ).toBeUndefined();
    expect(
      inspectVoiceDevices([
        { value: 'a', label: 'A' },
        { value: 'a', label: 'B' },
      ]),
    ).toBeUndefined();
  });
  it('bounds transcript data without invoking accessors or throwing proxy traps', () => {
    const accessor = vi.fn();
    expect(
      inspectVoiceText(
        {
          context,
          state: 'complete',
          get text() {
            accessor();
            return 'Secret';
          },
        },
        true,
      ),
    ).toBeUndefined();
    expect(accessor).not.toHaveBeenCalled();
    expect(
      inspectVoiceText(
        new Proxy(
          {},
          {
            getPrototypeOf() {
              throw new Error('trap');
            },
          },
        ),
        true,
      ),
    ).toBeUndefined();
    expect(inspectVoiceText({ ...transcript, text: 'x'.repeat(20001) }, true)).toBeUndefined();
    expect(inspectVoiceText({ ...transcript, text: 'x'.repeat(20000) }, true)?.text).toHaveLength(
      20000,
    );
    expect(inspectVoiceText({ text: 'Legacy', final: true }, false)?.state).toBe('complete');
  });
});
describe.each(['panel', 'bar', 'compact'] as const)('%s voice presentation', (variant) => {
  it('requests the exact scope and waits for host capture before showing recording', async () => {
    const start = vi.fn();
    const { rerender } = render(
      <VoiceControl variant={variant} capture={capture} onRequestStart={start} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    expect(start).toHaveBeenCalledWith(context);
    expect(screen.getByRole('status')).toHaveTextContent('Ready to record');
    rerender(
      <VoiceControl
        variant={variant}
        capture={{ ...capture, state: 'recording', permission: 'granted' }}
        onRequestStop={start}
      />,
    );
    expect(screen.getByText('Input level not reported.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
    expect(start).toHaveBeenLastCalledWith(context);
  });
  it('keeps transcription distinct from a completed recording and hides obsolete text', () => {
    const { rerender } = render(
      <VoiceControl
        variant={variant}
        capture={{ ...capture, state: 'complete' }}
        transcription={{ context, state: 'unavailable' }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Recording complete');
    expect(screen.getByText('No transcription provider connected.')).toBeVisible();
    rerender(
      <VoiceControl
        variant={variant}
        capture={capture}
        transcription={{ ...transcript, context: { ...context, version: 'old' } }}
      />,
    );
    expect(screen.queryByText(/Original transcript/)).toBeNull();
    expect(screen.getByText(/obsolete capture/)).toBeVisible();
  });
  it('allows a missing selected device to be repaired without starting or selecting implicitly', async () => {
    const change = vi.fn(),
      start = vi.fn();
    render(
      <VoiceControl
        variant={variant}
        capture={capture}
        deviceId="gone"
        devices={[{ value: 'available', label: 'Available microphone' }]}
        onRequestDeviceChange={change}
        onRequestStart={start}
      />,
    );
    if (variant === 'compact')
      await userEvent.click(screen.getByRole('button', { name: 'Voice options' }));
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeDisabled();
    await userEvent.click(screen.getByRole('combobox', { name: 'Microphone' }));
    await userEvent.click(screen.getByRole('option', { name: 'Available microphone' }));
    expect(change).toHaveBeenCalledWith({ ...context, deviceId: 'available' });
    expect(start).not.toHaveBeenCalled();
  });
  it('does not retry while a cancelled permission request still awaits its browser result', () => {
    render(
      <VoiceControl
        variant={variant}
        capture={{ ...capture, state: 'cancelled', permissionRequestPending: true }}
        onRequestStart={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeDisabled();
    expect(screen.getByText(/browser permission request may still be pending/)).toBeVisible();
  });
});
describe('voice access, submission and clipboard', () => {
  it.each(['loading', 'denied', 'unavailable', 'error', 'unknown'] as const)(
    '%s availability hides transcripts, measured levels and device labels',
    (status) => {
      render(
        <VoiceControl
          capture={{ ...capture, state: 'recording', permission: 'granted', inputLevel: 0.5 }}
          transcription={transcript}
          devices={[{ value: 'private', label: 'Private microphone' }]}
          status={status}
        />,
      );
      expect(screen.queryByText(/Original transcript|Private microphone/)).toBeNull();
      expect(screen.queryByRole('meter')).toBeNull();
      expect(screen.queryByRole('combobox')).toBeNull();
    },
  );
  it.each(['submitting', 'acknowledged', 'outcome-unknown'] as const)(
    '%s command state locks capture and copying',
    (submission) => {
      render(
        <VoiceControl
          capture={capture}
          transcription={transcript}
          submission={submission}
          onRequestStart={vi.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: 'Start voice input' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Copy transcript' })).toBeDisabled();
    },
  );
  it('does not expose malformed legacy transcripts and blocks scoped device callbacks without scope', () => {
    render(
      <VoiceControl
        state="idle"
        transcript={{ text: 'x'.repeat(20001), final: true }}
        devices={[{ value: 'default', label: 'Default' }]}
        onRequestDeviceChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or excessive transcription');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
  it('copies exact completed text and discards an ABA or revoked clipboard result', async () => {
    let finish!: () => void;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              finish = resolve;
            }),
        ),
      },
    });
    const { rerender } = render(<VoiceControl capture={capture} transcription={transcript} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(transcript.text);
    rerender(<VoiceControl capture={capture} transcription={{ ...transcript, text: 'Changed' }} />);
    rerender(<VoiceControl capture={capture} transcription={transcript} />);
    await act(async () => {
      finish();
    });
    expect(screen.queryByText('Transcript copied.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    rerender(<VoiceControl capture={capture} transcription={transcript} status="denied" />);
    await act(async () => {
      finish();
    });
    expect(screen.queryByText('Transcript copied.')).toBeNull();
  });
});
