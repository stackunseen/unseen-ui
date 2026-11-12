'use client';
import { useMergedRef } from '../../shared/use-merged-ref.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, SVGProps } from 'react';
import type { ConnectionState, SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Select } from '../select/select.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import {
  inspectVoiceCapture,
  inspectVoiceDevices,
  inspectVoiceText,
  voiceContextKey,
  sameVoiceContext,
} from './voice-model.js';
import type {
  VoiceState,
  VoiceContext,
  VoiceCaptureSnapshot,
  VoiceAvailability,
  VoiceTranscription,
  VoiceDeviceRequest,
  VoiceDevice,
} from './voice-model.js';
import type { VariantProps } from '../../shared/variants.js';
import css from './voice-control.module.css';
import actions from '../../shared/styles/action-layout.module.css';
export type {
  VoiceState,
  VoiceContext,
  VoiceCaptureState,
  VoicePermission,
  VoiceCaptureSnapshot,
  VoiceAvailability,
  VoiceTranscription,
  VoiceDeviceRequest,
  VoiceDevice,
} from './voice-model.js';
export interface VoiceControlProps extends VariantProps<'VoiceControl'>, ComponentProps<'div'> {
  /** Distinguishes multiple voice controls and their disclosure landmarks. */
  label?: string;
  /** Legacy aggregate state. Advanced hosts supply capture instead. */
  state?: VoiceState;
  capture?: VoiceCaptureSnapshot;
  status?: VoiceAvailability;
  connection?: ConnectionState | 'unknown';
  submission?: SubmissionState;
  onStart?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  onRequestStart?: (context: VoiceContext) => void;
  onRequestStop?: (context: VoiceContext) => void;
  onRequestCancel?: (context: VoiceContext) => void;
  transcript?: { text: string; final: boolean };
  transcription?: VoiceTranscription;
  inputLevel?: number;
  error?: string;
  devices?: readonly VoiceDevice[];
  deviceId?: string;
  onDeviceChange?: (id: string) => void;
  onRequestDeviceChange?: (request: VoiceDeviceRequest) => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
function Microphone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    </svg>
  );
}
const labels: Record<VoiceState, string> = {
  idle: 'Ready for voice',
  requesting: 'Waiting for microphone permission',
  listening: 'Listening',
  processing: 'Transcribing',
  denied: 'Microphone permission denied',
  unsupported: 'Voice input unavailable',
  error: 'Voice input failed',
};
const captureLabels = {
  idle: 'Ready to record',
  requesting: 'Requesting microphone access',
  recording: 'Recording',
  stopping: 'Finishing recording',
  complete: 'Recording complete',
  cancelled: 'Recording cancelled',
  interrupted: 'Capture interrupted',
  error: 'Capture failed',
  unknown: 'Capture outcome unknown',
};
export function VoiceControl({
  label = 'Voice input',
  state,
  capture,
  status = 'ready',
  connection,
  submission = 'idle',
  onStart,
  onStop,
  onCancel,
  onRequestStart,
  onRequestStop,
  onRequestCancel,
  transcript,
  transcription,
  inputLevel,
  error,
  devices,
  deviceId,
  onDeviceChange,
  onRequestDeviceChange,
  variant = 'panel',
  className = '',
  ref,
  onFocusCapture,
  onBlurCapture,
  ...rest
}: VoiceControlProps) {
  const root = useRef<HTMLDivElement>(null),
    focused = useRef<HTMLElement | null>(null),
    attempt = useRef(0),
    mounted = useRef(true);
  const rootRef = useMergedRef(root, ref);
  const [copied, setCopied] = useState<{ key: string; message: string; attempt: number }>();
  const visible = status === 'ready' || status === 'stale',
    advanced = capture !== undefined;
  const model = visible && advanced ? inspectVoiceCapture(capture) : undefined;
  const valid = advanced ? !!model : typeof state === 'string' && Object.hasOwn(labels, state);
  const hidden =
    !visible ||
    model?.permission === 'denied' ||
    model?.permission === 'unsupported' ||
    (!advanced && ['denied', 'unsupported'].includes(state ?? ''));
  const scope = model?.context,
    scopeKey = voiceContextKey(scope);
  const parsedDevices = !hidden && visible && devices ? inspectVoiceDevices(devices) : undefined;
  const selectedMissing =
    !!deviceId && !!parsedDevices && !parsedDevices.some((d) => d.value === deviceId);
  const parsedText =
    !hidden && valid
      ? inspectVoiceText(advanced ? transcription : transcript, advanced)
      : undefined;
  const obsolete = !!parsedText?.context && !!scope && !sameVoiceContext(parsedText.context, scope);
  const text = parsedText && !obsolete ? parsedText : undefined;
  const locked =
    status !== 'ready' ||
    hidden ||
    !valid ||
    ['submitting', 'acknowledged', 'outcome-unknown'].includes(submission) ||
    (connection !== undefined && connection !== 'connected');
  const recording = advanced ? model?.state === 'recording' : state === 'listening';
  const canStart =
    !locked &&
    !model?.permissionRequestPending &&
    (advanced
      ? ['idle', 'complete', 'cancelled', 'interrupted', 'error'].includes(model!.state)
      : state === 'idle' || state === 'error');
  const canCancel =
    !locked &&
    (advanced
      ? ['requesting', 'recording', 'stopping', 'unknown'].includes(model!.state)
      : ['requesting', 'listening', 'processing'].includes(state ?? ''));
  const canDevice = canStart && (onRequestDeviceChange ? !!scope : !!onDeviceChange);
  const level = advanced ? model?.inputLevel : inputLevel;
  const validLevel =
    recording && typeof level === 'number' && Number.isFinite(level) && level >= 0 && level <= 1;
  const textKey = JSON.stringify([
    scopeKey,
    text?.state,
    text?.text,
    status,
    hidden,
    connection,
    submission,
  ]);
  const current = useRef(textKey);
  current.current = textKey;
  useLayoutEffect(() => {
    attempt.current++;
  }, [textKey]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    if (focused.current && !focused.current.isConnected && document.activeElement === document.body)
      root.current?.focus({ preventScroll: true });
  });
  async function copy() {
    if (!text?.text || text.state !== 'complete' || locked) return;
    const version = ++attempt.current,
      key = textKey;
    let message = 'Transcript copied.';
    try {
      await navigator.clipboard.writeText(text.text);
    } catch {
      message = 'Copy unavailable. Select the transcript to copy.';
    }
    if (mounted.current && current.current === key && version === attempt.current)
      setCopied({ key, message, attempt: version });
  }
  const invoke = (
    scoped: ((context: VoiceContext) => void) | undefined,
    legacy: (() => void) | undefined,
  ) => {
    if (scoped && scope) scoped({ ...scope });
    else if (!scoped) legacy?.();
  };
  const startHandler = onRequestStart ? !!scope : !!onStart,
    stopHandler = onRequestStop ? !!scope : !!onStop,
    cancelHandler = onRequestCancel ? !!scope : !!onCancel;
  const title =
    advanced && model
      ? captureLabels[model.state]
      : state && labels[state]
        ? labels[state]
        : 'Voice input unavailable';
  const controls =
    visible && valid ? (
      <div className={`${actions.footer} ${css.actions}`} role="group" aria-label="Voice actions">
        {canCancel && cancelHandler && (
          <IconButton
            icon="close"
            label="Cancel voice"
            onClick={() => invoke(onRequestCancel, onCancel)}
          />
        )}
        <Button
          size={variant === 'panel' ? 'default' : 'sm'}
          variant={recording || variant === 'panel' ? 'primary' : 'outline'}
          disabled={
            recording
              ? locked || !stopHandler
              : !canStart ||
                !startHandler ||
                selectedMissing ||
                (devices !== undefined && !parsedDevices)
          }
          onClick={() =>
            recording ? invoke(onRequestStop, onStop) : invoke(onRequestStart, onStart)
          }
        >
          <AIIcon name={recording ? 'stop' : 'microphone'} fallbackIcon={Microphone} />
          {recording
            ? 'Stop recording'
            : state === 'error' && !advanced
              ? 'Try voice again'
              : 'Start voice input'}
        </Button>
      </div>
    ) : undefined;
  const selection =
    parsedDevices && parsedDevices.length > 0 ? (
      <div className={css.device}>
        <Select
          aria-label="Microphone"
          value={selectedMissing ? '' : (deviceId ?? '')}
          options={parsedDevices}
          disabled={!canDevice}
          onValueChange={(id) => {
            if (onRequestDeviceChange && scope) onRequestDeviceChange({ ...scope, deviceId: id });
            else if (!onRequestDeviceChange) onDeviceChange?.(id);
          }}
        />
      </div>
    ) : undefined;
  return (
    <div
      {...rest}
      ref={rootRef}
      role="group"
      aria-label={`${label} panel`}
      tabIndex={-1}
      data-part="voice-control"
      data-variant={variant}
      data-status={status}
      className={`${css.root} ${className}`}
      onFocusCapture={(e) => {
        onFocusCapture?.(e);
        focused.current = e.target as HTMLElement;
      }}
      onBlurCapture={(e) => {
        onBlurCapture?.(e);
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node))
          focused.current = null;
      }}
    >
      <div className={css.summary}>
        <div className={css.header}>
          <strong>
            <AIIcon name="microphone" fallbackIcon={Microphone} /> {label}
          </strong>
          <span role="status" className={css.badge}>
            {title}
          </span>
        </div>
        {variant === 'bar' && controls}
      </div>
      {!visible ? (
        <div className={css.body}>
          {status === 'loading' ? (
            <LoadingIndicator
              variant={variant === 'panel' ? 'dots' : variant === 'bar' ? 'bars' : 'spinner'}
              label="Loading voice input"
            />
          ) : (
            <p role="status">
              {status === 'denied'
                ? 'Voice access denied.'
                : status === 'error'
                  ? 'Voice data unavailable.'
                  : status === 'unavailable'
                    ? 'Voice input unavailable.'
                    : 'Voice availability unknown.'}
            </p>
          )}
        </div>
      ) : !valid ? (
        <p className={css.body} role="alert">
          Invalid voice capture snapshot.
        </p>
      ) : (
        <div className={css.content}>
          {status === 'stale' && (
            <p className={css.notice}>Historical voice snapshot. Capture requests are paused.</p>
          )}
          {connection && connection !== 'connected' && (
            <p className={css.notice}>
              {connection}. Capture and transcription outcomes remain host-reported.
            </p>
          )}
          {hidden ? (
            <p className={css.notice}>
              {model?.permission === 'denied' || state === 'denied'
                ? 'Microphone access denied. Allow access in browser settings or continue typing.'
                : 'Recording isn’t supported here.'}
            </p>
          ) : (
            <>
              {devices && !parsedDevices && (
                <p role="alert" className={css.notice}>
                  Invalid or excessive microphone list. No devices were displayed.
                </p>
              )}
              {selectedMissing && (
                <p role="status" className={css.notice}>
                  Selected microphone is no longer in this device list. Choose an available device
                  before starting.
                </p>
              )}
              {selection &&
                (variant === 'compact' ? (
                  <div className={css.body}>
                    <Accordion
                      type="single"
                      collapsible
                      items={[{ value: 'options', title: 'Voice options', content: selection }]}
                    />
                  </div>
                ) : (
                  <div className={css.body}>{selection}</div>
                ))}
              {recording && (
                <div className={css.level}>
                  {validLevel ? (
                    <>
                      <label>
                        Measured input amplitude{' '}
                        <meter aria-label="Microphone input level" min={0} max={1} value={level} />
                      </label>
                      <p className={css.muted}>
                        Normalized amplitude; not speech confidence or task progress.
                      </p>
                    </>
                  ) : (
                    <p className={css.muted}>Input level not reported.</p>
                  )}
                  {model?.muted && (
                    <p>Audio source is muted. Capture has not been reported stopped.</p>
                  )}
                </div>
              )}
              {model?.permissionRequestPending && (
                <p className={css.notice}>
                  A browser permission request may still be pending. A new request will not be
                  opened.
                </p>
              )}
            </>
          )}
          {submission !== 'idle' && (
            <p role="status" className={css.notice}>
              {submission === 'outcome-unknown'
                ? 'It’s not clear whether that worked. Check before trying again.'
                : submission === 'failed'
                  ? 'That didn’t work. Nothing changed.'
                  : submission === 'submitting'
                    ? 'Requesting voice action…'
                    : 'Request received. Waiting for an update.'}
            </p>
          )}
          {variant !== 'bar' && controls}
          {!hidden && (
            <>
              {obsolete && (
                <p role="status" className={css.notice}>
                  Transcript belongs to an obsolete capture. Its content is hidden.
                </p>
              )}
              {(advanced ? transcription : transcript) && !parsedText && (
                <p role="alert" className={css.notice}>
                  Invalid or excessive transcription data.
                </p>
              )}
              {text && (
                <div className={css.body}>
                  <div className={css.transcriptHeader}>
                    <strong>
                      {text.state === 'streaming'
                        ? 'Partial transcript'
                        : text.state === 'complete'
                          ? 'Transcript'
                          : 'Transcription'}
                    </strong>
                    {text.text && (
                      <IconButton
                        icon="copy"
                        label="Copy transcript"
                        disabled={locked || text.state !== 'complete'}
                        onClick={() => void copy()}
                      />
                    )}
                  </div>
                  {text.text && ['streaming', 'complete'].includes(text.state) ? (
                    <div
                      role="group"
                      aria-label="Voice transcript"
                      tabIndex={0}
                      className={css.transcript}
                    >
                      {text.text}
                    </div>
                  ) : (
                    <p className={css.muted}>
                      {text.state === 'unavailable'
                        ? 'No transcription provider connected.'
                        : text.state === 'error'
                          ? text.error || 'Transcription failed.'
                          : text.state === 'unknown'
                            ? 'Transcription outcome unknown.'
                            : text.state === 'idle'
                              ? 'No transcript reported.'
                              : 'Transcription has no text yet.'}
                    </p>
                  )}
                </div>
              )}
              {advanced && model && (
                <div className={css.body}>
                  <Accordion
                    key={scopeKey}
                    type="single"
                    collapsible
                    items={[
                      {
                        value: 'details',
                        title:
                          label === 'Voice input' ? 'Capture details' : `${label}: Capture details`,
                        content: (
                          <div className={css.details}>
                            <p>
                              Source:{' '}
                              {model.source === 'synthetic'
                                ? 'Generated test audio'
                                : model.source === 'microphone'
                                  ? 'Microphone'
                                  : 'Not reported'}
                            </p>
                            <p>Access: {model.permission}</p>
                            <p>
                              Elapsed capture time:{' '}
                              {model.elapsedMs === undefined
                                ? 'Not reported'
                                : `${Math.round(model.elapsedMs)} ms`}
                            </p>
                            <p>
                              Captured bytes:{' '}
                              {model.bytes === undefined ? 'Not reported' : model.bytes}
                            </p>
                            <p>
                              Session: {scope?.sessionId} · Capture: {scope?.captureId} · Version:{' '}
                              {scope?.version}
                            </p>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
              {((advanced && model?.state === 'error') || state === 'error') && (
                <p role="alert" className={css.error}>
                  {model?.error ||
                    (typeof error === 'string' ? error.slice(0, 1000) : undefined) ||
                    'Unable to capture audio. Continue typing.'}
                </p>
              )}
            </>
          )}
          {copied?.key === textKey && copied.attempt === attempt.current && !hidden && (
            <p role="status" className={css.notice}>
              {copied.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
