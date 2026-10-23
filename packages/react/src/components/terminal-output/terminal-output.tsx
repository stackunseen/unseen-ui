'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { inspectTerminal } from './terminal-model.js';
import type {
  TerminalContext,
  TerminalAvailability,
  TerminalProcessState,
} from './terminal-model.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/coding.module.css';
import css from './terminal-output.module.css';
import { stateLabel } from '../../shared/labels.js';
export type {
  TerminalContext,
  TerminalAvailability,
  TerminalProcessState,
} from './terminal-model.js';
export interface TerminalOutputRenderContext {
  raw: string;
  text: string;
  truncated: boolean;
  context?: TerminalContext;
  state: TerminalProcessState;
  status: TerminalAvailability;
  variant: 'console' | 'log' | 'compact';
  follow: boolean;
  jump: number;
  onFollowChange: (follow: boolean) => void;
}
export interface TerminalOutputProps extends VariantProps<'TerminalOutput'> {
  output: string;
  state: TerminalProcessState;
  title?: string;
  command?: string;
  exitCode?: number;
  context?: TerminalContext;
  status?: TerminalAvailability;
  error?: string;
  connection?: 'connected' | 'disconnected' | 'reconnecting' | 'unknown';
  submission?: SubmissionState;
  onStop?: () => void;
  onClear?: () => void;
  onRequestStop?: (context: TerminalContext) => void;
  onRequestClear?: (context: TerminalContext) => void;
  /** Trusted renderer composition; terminal output never supplies executable callbacks. */
  renderOutput?: (view: TerminalOutputRenderContext) => ReactNode;
}
export function TerminalOutput({
  output,
  state,
  title = 'Terminal output',
  command,
  exitCode,
  context,
  status = 'ready',
  error,
  connection,
  submission = 'idle',
  onStop,
  onClear,
  onRequestStop,
  onRequestClear,
  renderOutput,
  variant = 'console',
}: TerminalOutputProps) {
  const root = useRef<HTMLDivElement>(null),
    pre = useRef<HTMLPreElement>(null),
    focused = useRef<HTMLElement | null>(null);
  const [follow, setFollow] = useState(true),
    [jump, setJump] = useState(0);
  const live = state === 'running' || state === 'unknown';
  const [feedback, setFeedback] = useState<{
    output: string;
    key: string;
    message: string;
    attempt: number;
  }>();
  const copyAttempt = useRef(0),
    mounted = useRef(true);
  const visible = status === 'ready' || status === 'stale';
  const model = useMemo(
    () => (visible ? inspectTerminal(output, state, context, exitCode) : undefined),
    [visible, output, state, context, exitCode],
  );
  const current = useRef({ output, key: model?.key, status });
  current.current = { output, key: model?.key, status };
  useLayoutEffect(() => {
    copyAttempt.current++;
  }, [output, model?.key, status]);
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
  useEffect(() => {
    const node = pre.current,
      selection = window.getSelection();
    if (
      node &&
      follow &&
      !(selection && !selection.isCollapsed && node.contains(selection.anchorNode))
    )
      node.scrollTop = node.scrollHeight;
  }, [model?.text, model?.key, follow, jump]);
  const label = typeof title === 'string' && title.trim() ? title.slice(0, 200) : 'Terminal output';
  const awaiting = ['submitting', 'acknowledged', 'outcome-unknown'].includes(submission);
  const interactive =
    status === 'ready' && !awaiting && (!connection || connection === 'connected');
  async function copy() {
    if (!model || status !== 'ready' || !model.text) return;
    const attempt = ++copyAttempt.current,
      snapshot = { output, key: model.key };
    let message = 'Output copied.';
    try {
      await navigator.clipboard.writeText(model.text);
    } catch {
      message = 'Copy unavailable. Select the output to copy.';
    }
    if (
      mounted.current &&
      attempt === copyAttempt.current &&
      current.current.output === snapshot.output &&
      current.current.key === snapshot.key &&
      current.current.status === 'ready'
    )
      setFeedback({ ...snapshot, message, attempt });
  }
  const readyStop =
    interactive && state === 'running' && (onRequestStop ? !!model?.context : !!onStop);
  const readyClear = interactive && (onRequestClear ? !!model?.context : !!onClear);
  return (
    <div
      ref={root}
      role="group"
      aria-label={`${label} panel`}
      tabIndex={-1}
      className={`${s.root} ${s.panel} ${css.root}`}
      data-part="terminal-output"
      data-variant={variant}
      data-state={state}
      data-status={status}
      onFocusCapture={(event) => {
        focused.current = event.target as HTMLElement;
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          focused.current = null;
      }}
    >
      <div className={s.header}>
        <strong>
          <AIIcon name="tool" /> {label}
        </strong>
        {model && (
          <span
            role="status"
            className={s.badge}
            data-tone={exitCode === undefined ? undefined : exitCode === 0 ? 'success' : 'danger'}
          >
            {stateLabel(state)}
            {exitCode !== undefined ? ` · Exit ${exitCode}` : ''}
          </span>
        )}
      </div>
      {!visible ? (
        <div className={s.body}>
          {status === 'loading' ? (
            <LoadingIndicator label="Loading terminal output" />
          ) : (
            <p role="status" className={s.muted}>
              {status === 'denied'
                ? 'Terminal access denied.'
                : status === 'unavailable'
                  ? 'Terminal unavailable.'
                  : status === 'error'
                    ? typeof error === 'string' && error.trim()
                      ? error.slice(0, 1000)
                      : 'Terminal could not be loaded.'
                    : 'Terminal availability is unknown.'}
            </p>
          )}
        </div>
      ) : !model ? (
        <p role="alert" className={s.notice}>
          Invalid terminal output, lifecycle, exit code or session identity.
        </p>
      ) : (
        <>
          {command && (
            <p className={`${s.notice} ${s.muted}`}>
              $ {typeof command === 'string' ? command.slice(0, 2000) : 'Command not supplied'}
            </p>
          )}
          <div className={css.provenance}>
            {/* A plain log has no session; say nothing rather than report a missing one. */}
            {model.context && (
              <p>
                Session: {model.context.sessionId} · Stream: {model.context.streamId} · Scope:{' '}
                {model.context.version}
              </p>
            )}
            {connection && (
              <p>Connection: {stateLabel(connection)}. Process lifecycle is reported separately.</p>
            )}
            {status === 'stale' && <p>Earlier output. Actions are paused.</p>}
          </div>
          {submission !== 'idle' && (
            <p className={s.notice} role="status">
              {submission === 'submitting'
                ? 'Requesting terminal action…'
                : submission === 'acknowledged'
                  ? 'Request received. Waiting for the terminal to update.'
                  : submission === 'outcome-unknown'
                    ? 'It’s not clear whether that worked. Check before trying again.'
                    : 'That didn’t work. The terminal is unchanged.'}
            </p>
          )}
          {model.truncated && <p className={s.notice}>Showing the last 64,000 characters.</p>}
          {model.omittedLines > 0 && (
            <p className={s.notice}>
              Transcript retains the last 1,000 lines; {model.omittedLines} earlier lines are
              omitted.
            </p>
          )}
          {renderOutput ? (
            renderOutput({
              raw: model.raw,
              text: model.text,
              truncated: model.truncated,
              context: model.context,
              state,
              status,
              variant,
              follow,
              jump,
              onFollowChange: setFollow,
            })
          ) : (
            <pre
              ref={pre}
              className={css.transcript}
              tabIndex={0}
              role="group"
              aria-label={label}
              onScroll={(event) => {
                const n = event.currentTarget;
                setFollow(n.scrollHeight - n.scrollTop - n.clientHeight < 20);
              }}
            >
              {variant === 'log' && model.text
                ? model.lines.map((line, index) => (
                    <span className={css.logLine} key={index}>
                      <span aria-hidden="true">{index + 1 + model.omittedLines}</span>
                      <span>{line || '\u00a0'}</span>
                      {index < model.lines.length - 1 ? '\n' : ''}
                    </span>
                  ))
                : model.text || 'No output yet.'}
            </pre>
          )}
          <div className={css.actions} role="group" aria-label="Terminal actions">
            <IconButton
              icon="copy"
              label="Copy output"
              disabled={status !== 'ready' || !model.text}
              onClick={() => {
                void copy();
              }}
            />
            {/* Following only means something while output is still arriving. */}
            {live && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-pressed={!follow}
                  onClick={() => setFollow((value) => !value)}
                >
                  {follow ? 'Pause following' : 'Resume following'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!model.text}
                  onClick={() => {
                    setFollow(true);
                    setJump((value) => value + 1);
                  }}
                >
                  Jump to latest
                </Button>
              </>
            )}
            {(onClear || onRequestClear) && (
              <IconButton
                icon="close"
                label="Clear output"
                disabled={!readyClear}
                onClick={() => {
                  if (onRequestClear && model.context) onRequestClear(model.context);
                  else onClear?.();
                }}
              />
            )}
            {state === 'running' && (onStop || onRequestStop) && (
              <Button
                className={css.stop}
                size="sm"
                variant="outline"
                disabled={!readyStop}
                onClick={() => {
                  if (onRequestStop && model.context) onRequestStop(model.context);
                  else onStop?.();
                }}
              >
                Stop process
              </Button>
            )}
          </div>
          {live && (
            <p className={css.follow}>
              {follow ? 'Following output.' : 'Following paused.'} Copy contains the retained plain
              transcript.
            </p>
          )}
          {feedback?.output === output &&
            feedback.key === model.key &&
            feedback.attempt === copyAttempt.current &&
            status === 'ready' && (
              <p role="status" className={s.notice}>
                {feedback.message}
              </p>
            )}
        </>
      )}
    </div>
  );
}
