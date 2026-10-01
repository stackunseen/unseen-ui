'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Terminal, ITheme } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { TerminalOutput } from '../terminal-output/terminal-output.js';
import type {
  TerminalOutputProps,
  TerminalOutputRenderContext,
} from '../terminal-output/terminal-output.js';
import type { TerminalContext } from '../terminal-output/terminal-model.js';
import { terminalContextKey } from '../terminal-output/terminal-model.js';
import { useRendererTheme } from '../../providers/theme/theme-provider.js';
import { Accordion } from '../accordion/accordion.js';
import css from './terminal-emulator.module.css';
export interface TerminalInputRequest extends TerminalContext {
  data: string;
}
export interface TerminalResizeRequest extends TerminalContext {
  columns: number;
  rows: number;
}
export interface TerminalEmulatorProps extends Omit<TerminalOutputProps, 'renderOutput'> {
  onInput?: (request: TerminalInputRequest) => void;
  onResize?: (request: TerminalResizeRequest) => void;
  inputEnabled?: boolean;
}
/** Optional browser emulator. Transport, policy and execution remain in the host. */
export function TerminalEmulator({
  onInput,
  onResize,
  inputEnabled = false,
  ...props
}: TerminalEmulatorProps) {
  return (
    <TerminalOutput
      {...props}
      renderOutput={(view) => (
        <EmulatorView
          key={terminalContextKey(view.context)}
          view={view}
          onInput={onInput}
          onResize={onResize}
          inputEnabled={
            inputEnabled &&
            props.connection === 'connected' &&
            !['submitting', 'acknowledged', 'outcome-unknown'].includes(props.submission ?? 'idle')
          }
        />
      )}
    />
  );
}
function readTheme(node: HTMLElement): ITheme {
  const style = getComputedStyle(node),
    color = (name: string, fallback: string) =>
      style.getPropertyValue(`--ai-${name}`).trim() || fallback;
  const text = color('text', '#0f172a'),
    background = color('surface-subtle', '#f1f5f9'),
    muted = color('muted', '#475569'),
    primary = color('primary-text', '#1d4ed8'),
    secondary = color('secondary-text', '#6d28d9');
  return {
    foreground: text,
    background,
    cursor: primary,
    cursorAccent: background,
    selectionBackground: color('primary-soft', '#dbeafe'),
    selectionForeground: text,
    black: muted,
    brightBlack: muted,
    red: color('danger', '#991b1b'),
    brightRed: color('danger', '#991b1b'),
    green: color('success', '#166534'),
    brightGreen: color('success', '#166534'),
    yellow: color('warning', '#92400e'),
    brightYellow: color('warning', '#92400e'),
    blue: primary,
    brightBlue: primary,
    magenta: secondary,
    brightMagenta: secondary,
    cyan: secondary,
    brightCyan: secondary,
    white: text,
    brightWhite: text,
  };
}
function EmulatorView({
  view,
  onInput,
  onResize,
  inputEnabled,
}: {
  view: TerminalOutputRenderContext;
  onInput?: TerminalEmulatorProps['onInput'];
  onResize?: TerminalEmulatorProps['onResize'];
  inputEnabled: boolean;
}) {
  const rendererTheme = useRendererTheme(),
    node = useRef<HTMLDivElement>(null),
    terminal = useRef<Terminal | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [inputNotice, setInputNotice] = useState('');
  const latest = useRef({ view, onInput, onResize, inputEnabled });
  latest.current = { view, onInput, onResize, inputEnabled };
  const source = useRef(''),
    written = useRef(false),
    pump = useRef<(() => void) | undefined>(undefined),
    measure = useRef<(() => void) | undefined>(undefined),
    lastResize = useRef<string | undefined>(undefined);
  const permitted = useCallback(() => {
    const p = latest.current;
    return (
      p.inputEnabled &&
      p.view.status === 'ready' &&
      p.view.state === 'running' &&
      !!p.view.context &&
      !p.view.truncated &&
      !!p.onInput
    );
  }, []);
  useEffect(() => {
    if (view.truncated) return;
    let disposed = false,
      instance: Terminal | undefined,
      addon: FitAddon | undefined,
      observer: ResizeObserver | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: (() => void)[] = [];
    void Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')])
      .then(([xterm, fitModule]) => {
        if (disposed || !node.current) return;
        instance = new xterm.Terminal({
          cols: 80,
          rows: 12,
          scrollback: 1000,
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          cursorBlink: false,
          disableStdin: !permitted(),
          screenReaderMode: true,
          allowProposedApi: false,
          theme: readTheme(node.current),
          windowOptions: {},
        });
        addon = new fitModule.FitAddon();
        instance.loadAddon(addon);
        instance.open(node.current);
        terminal.current = instance;
        const textarea = instance.textarea;
        if (textarea) textarea.setAttribute('aria-label', 'Terminal keyboard input');
        // No output-driven clipboard, link, image, window-title or window-control actions.
        for (const code of [0, 1, 2, 8, 52, 1337]) {
          const subscription = instance.parser.registerOscHandler(code, () => true);
          cleanups.push(() => subscription.dispose());
        }
        const windowControl = instance.parser.registerCsiHandler({ final: 't' }, () => true);
        cleanups.push(() => windowControl.dispose());
        const data = instance.onData((value) => {
          const current = latest.current;
          if (!permitted() || !current.view.context) return;
          if (value.length > 1024) {
            setInputNotice('Input exceeds 1,024 characters. No input request was sent.');
            return;
          }
          try {
            current.onInput?.({ ...current.view.context, data: value });
            setInputNotice('');
          } catch {
            setInputNotice(
              'Input delivery outcome unknown. Reconcile with the host before resubmitting.',
            );
          }
        });
        cleanups.push(() => data.dispose());
        const scroll = instance.onScroll(() => {
          if (instance)
            latest.current.view.onFollowChange(
              instance.buffer.active.viewportY >= instance.buffer.active.baseY,
            );
        });
        cleanups.push(() => scroll.dispose());
        function resize() {
          if (!node.current || !instance || !addon || node.current.clientWidth <= 0) return;
          const dimensions = addon.proposeDimensions();
          if (!dimensions) return;
          const columns = Math.max(20, Math.min(240, dimensions.cols)),
            rows = Math.max(6, Math.min(60, dimensions.rows));
          if (instance.cols !== columns || instance.rows !== rows) instance.resize(columns, rows);
          const current = latest.current;
          if (
            current.view.context &&
            current.view.status === 'ready' &&
            current.view.state === 'running' &&
            current.inputEnabled &&
            current.onResize
          ) {
            const identity = JSON.stringify([
              terminalContextKey(current.view.context),
              columns,
              rows,
            ]);
            if (lastResize.current !== identity) {
              lastResize.current = identity;
              try {
                current.onResize({ ...current.view.context, columns, rows });
              } catch {
                setInputNotice(
                  'Resize delivery outcome unknown. Reconcile with the host before resubmitting.',
                );
              }
            }
          }
        }
        measure.current = resize;
        resize();
        observer = new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(resize, 100);
        });
        observer.observe(node.current);
        const themeChange = () => {
          if (node.current && instance) instance.options.theme = readTheme(node.current);
        };
        const media = matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', themeChange);
        cleanups.push(() => media.removeEventListener('change', themeChange));
        source.current = '';
        written.current = true;
        let writing = false;
        pump.current = () => {
          if (disposed || !instance || writing) return;
          const value = latest.current.view.raw,
            before = source.current;
          if (value === before) return;
          const append = value.startsWith(before);
          if (!append) instance.reset();
          writing = true;
          instance.write(append ? value.slice(before.length) : value, () => {
            if (disposed || !instance || terminal.current !== instance) return;
            writing = false;
            source.current = value;
            if (
              latest.current.view.raw === value &&
              latest.current.view.follow &&
              !instance.hasSelection()
            )
              instance.scrollToBottom();
            pump.current?.();
          });
        };
        pump.current();
        setStatus('ready');
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      instance?.dispose();
      terminal.current = undefined;
      written.current = false;
      pump.current = undefined;
      measure.current = undefined;
      lastResize.current = undefined;
    };
  }, [view.truncated, permitted]);
  useLayoutEffect(() => {
    const instance = terminal.current;
    if (!instance || !written.current) return;
    instance.options.disableStdin = !permitted();
    if (node.current) instance.options.theme = readTheme(node.current);
    measure.current?.();
    pump.current?.();
  }, [view, inputEnabled, onInput, rendererTheme, permitted]);
  useEffect(() => {
    if (view.follow && !terminal.current?.hasSelection()) terminal.current?.scrollToBottom();
  }, [view.jump, view.follow]);
  return (
    <div className={css.root} data-part="terminal-emulator" data-renderer-state={status}>
      {view.truncated ? (
        <p role="status">
          Emulator needs a complete bounded stream checkpoint. The retained plain transcript is
          available below.
        </p>
      ) : (
        <>
          <div
            ref={node}
            className={css.viewport}
            role="group"
            aria-label="ANSI terminal viewport"
            data-variant={view.variant}
          />
          {status === 'loading' && <p role="status">Loading optional terminal renderer.</p>}
          {status === 'error' && (
            <p role="status">Terminal renderer unavailable. Use the plain transcript.</p>
          )}
          <p className={css.notice}>
            {permitted()
              ? 'Keyboard input requests are sent to the host.'
              : 'Keyboard input unavailable. Output remains inspectable.'}
          </p>
        </>
      )}
      {inputNotice && (
        <p role="status" className={css.notice}>
          {inputNotice}
        </p>
      )}
      {status === 'ready' && !view.truncated ? (
        <Accordion
          type="single"
          collapsible
          defaultValue={view.variant === 'log' ? 'transcript' : undefined}
          items={[
            {
              value: 'transcript',
              title: 'Plain terminal transcript',
              content: (
                <pre
                  className={css.plain}
                  role="group"
                  aria-label="Plain terminal transcript"
                  tabIndex={0}
                >
                  {view.text || 'No output yet.'}
                </pre>
              ),
            },
          ]}
        />
      ) : (
        <pre className={css.plain} role="group" aria-label="Plain terminal transcript" tabIndex={0}>
          {view.text || 'No output yet.'}
        </pre>
      )}
    </div>
  );
}
