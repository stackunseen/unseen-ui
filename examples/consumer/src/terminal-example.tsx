'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Select } from '@ai-interaction/react';
import type { SubmissionState } from '@ai-interaction/core';
import type { TerminalContext, TerminalProcessState } from '@ai-interaction/react';
import { TerminalEmulator } from '@ai-interaction/react/terminal';
import '@ai-interaction/react/terminal.css';

type Snapshot = {
  context: TerminalContext;
  output: string;
  revision: number;
  state: TerminalProcessState;
  status: 'ready' | 'denied';
  exitCode?: number;
  stopRequested: boolean;
  outputLimited: boolean;
};
type Intent = {
  action: 'start' | 'input' | 'resize' | 'stop' | 'clear';
  body: { requestId: string } & Record<string, string | number>;
};
const same = (a: TerminalContext, b: TerminalContext) =>
  a.sessionId === b.sessionId && a.streamId === b.streamId && a.version === b.version;
function context(value: unknown): value is TerminalContext {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return ['sessionId', 'streamId', 'version'].every(
    (k) =>
      typeof data[k] === 'string' &&
      data[k].trim().length > 0 &&
      data[k].length <= 160 &&
      !/[\p{Cc}\p{Cs}]/u.test(data[k]),
  );
}
function snapshot(value: unknown): Snapshot | undefined {
  if (!value || typeof value !== 'object') return;
  const data = value as Snapshot;
  if (
    !context(data.context) ||
    typeof data.output !== 'string' ||
    data.output.length > 64000 ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 0 ||
    !['idle', 'running', 'complete', 'failed', 'cancelled', 'unknown'].includes(data.state) ||
    !['ready', 'denied'].includes(data.status) ||
    typeof data.stopRequested !== 'boolean' ||
    typeof data.outputLimited !== 'boolean' ||
    (data.exitCode !== undefined && !Number.isSafeInteger(data.exitCode))
  )
    return;
  return data;
}
export function TerminalExample() {
  const [value, setValue] = useState<Snapshot>(),
    [connected, setConnected] = useState(false),
    [availability, setAvailability] = useState<'unknown' | 'ready' | 'denied' | 'error'>('unknown'),
    [phase, setPhase] = useState<SubmissionState>('idle'),
    [message, setMessage] = useState(''),
    [pending, setPending] = useState(0),
    [variant, setVariant] = useState<'console' | 'log' | 'compact'>('console');
  const current = useRef<Snapshot | undefined>(undefined),
    online = useRef(false),
    mounted = useRef(true),
    queue = useRef<Intent[]>([]),
    working = useRef(false),
    uncertain = useRef<Intent | undefined>(undefined),
    changingAccess = useRef(false),
    reading = useRef<Promise<void> | undefined>(undefined),
    generation = useRef(0);
  function publish(next: Snapshot) {
    current.current = next;
    setValue(next);
    setAvailability(next.status);
  }
  async function load() {
    if (changingAccess.current) return;
    if (reading.current) return reading.current;
    const token = generation.current;
    const task = (async () => {
      try {
        const response = await fetch('/api/terminal', { cache: 'no-store' });
        const next = response.ok ? snapshot(await response.json()) : undefined;
        if (!mounted.current || token !== generation.current) return;
        if (!next) throw new Error('Snapshot unavailable');
        publish(next);
      } catch {
        if (mounted.current && token === generation.current) {
          online.current = false;
          setConnected(false);
          setAvailability('error');
          setMessage(
            'Terminal connection unavailable. Reconnect explicitly to inspect host state.',
          );
        }
      }
    })();
    reading.current = task;
    try {
      await task;
    } finally {
      if (reading.current === task) reading.current = undefined;
    }
  }
  async function refresh() {
    await reading.current;
    await load();
  }
  const release = useCallback(() => {
    mounted.current = false;
    online.current = false;
    generation.current++;
    queue.current = [];
  }, []);
  useEffect(() => {
    mounted.current = true;
    return release;
  }, [release]);
  useEffect(() => {
    if (!connected) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await load();
      if (!cancelled && online.current) timer = setTimeout(poll, 300);
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // The example uses current refs to serialize polling across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);
  function disconnect() {
    online.current = false;
    generation.current++;
    setConnected(false);
    queue.current = [];
    setPending(0);
    setMessage('Disconnected locally. The host process may still be running.');
  }
  async function drain() {
    if (working.current) return;
    working.current = true;
    try {
      while (queue.current.length && online.current && !uncertain.current) {
        const intent = queue.current.shift()!;
        const before = current.current;
        if (
          intent.action !== 'start' &&
          (!before || !same(intent.body as unknown as TerminalContext, before.context))
        ) {
          queue.current = [];
          setPending(0);
          setPhase('failed');
          setMessage('Queued requests no longer match the host stream. They were not submitted.');
          break;
        }
        try {
          const response = await fetch(`/api/terminal/${intent.action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intent.body),
          });
          const receipt = await response.json();
          if (!mounted.current) return;
          if (!response.ok && response.status < 500) {
            queue.current = [];
            setPhase('failed');
            setMessage(`Host rejected ${intent.action}: ${String(receipt.message).slice(0, 300)}`);
            await load();
            break;
          }
          if (
            !response.ok ||
            receipt.requestId !== intent.body.requestId ||
            receipt.action !== intent.action ||
            receipt.status !== 'acknowledged' ||
            !context(receipt.context) ||
            (intent.action !== 'start' &&
              !same(receipt.context, intent.body as unknown as TerminalContext))
          )
            throw new Error('Unknown receipt');
          if (intent.action !== 'input' && intent.action !== 'resize') {
            await refresh();
            setPhase('idle');
          }
          setMessage(
            `Host received ${intent.action}. Process state and output are reported separately.`,
          );
        } catch {
          if (!mounted.current) return;
          uncertain.current = intent;
          queue.current = [];
          setPhase('outcome-unknown');
          setMessage(
            `${intent.action} outcome unknown. Check the original receipt before submitting another request.`,
          );
        }
        setPending(queue.current.length);
      }
    } finally {
      working.current = false;
      if (mounted.current) setPending(queue.current.length);
    }
  }
  function request(action: Intent['action'], data: Record<string, string | number> = {}) {
    if (!online.current || uncertain.current || current.current?.status !== 'ready') return;
    if (queue.current.length >= 32) {
      setMessage('Input queue is full. No additional request was submitted.');
      return;
    }
    const body = {
      requestId: crypto.randomUUID(),
      ...(action === 'start' ? {} : current.current.context),
      ...data,
    };
    queue.current.push({ action, body });
    setPending(queue.current.length);
    if (action !== 'input' && action !== 'resize') setPhase('submitting');
    void drain();
  }
  async function reconcile() {
    const intent = uncertain.current;
    if (!intent) return;
    try {
      const response = await fetch(
        `/api/terminal/receipt?requestId=${encodeURIComponent(intent.body.requestId)}`,
        { cache: 'no-store' },
      );
      const receipt = await response.json();
      if (!mounted.current || uncertain.current !== intent) return;
      if (
        response.ok &&
        receipt.requestId === intent.body.requestId &&
        receipt.action === intent.action &&
        receipt.status === 'acknowledged' &&
        context(receipt.context) &&
        (intent.action === 'start' ||
          same(receipt.context, intent.body as unknown as TerminalContext))
      ) {
        uncertain.current = undefined;
        await refresh();
        setPhase('idle');
        setMessage('Original request acknowledged. No request was resent.');
      } else setMessage('Original request remains unknown or inaccessible. No request was resent.');
    } catch {
      if (mounted.current) setMessage('Receipt unavailable. No request was resent.');
    }
  }
  async function access() {
    if (changingAccess.current) return;
    changingAccess.current = true;
    generation.current++;
    queue.current = [];
    setPending(0);
    setAvailability('unknown');
    try {
      const response = await fetch('/api/terminal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorized: value?.status === 'denied' }),
      });
      const next = response.ok ? snapshot(await response.json()) : undefined;
      if (!mounted.current) return;
      if (!next) throw new Error('Access unavailable');
      queue.current = [];
      setPending(0);
      publish(next);
      if (!uncertain.current && !working.current) setPhase('idle');
      setMessage('Host access snapshot updated. Revocation stops the owned public process.');
    } catch {
      if (mounted.current) setMessage('Access change outcome unknown. Refresh host state.');
    } finally {
      changingAccess.current = false;
    }
  }
  return (
    <section data-part="actual-terminal-example">
      <h2>Actual local terminal</h2>
      <p>
        Dedicated public program on port 4177. Commands: help, colors, size, exit. Connection does
        not launch a process.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button
          size="sm"
          variant="outline"
          aria-label={connected ? 'Disconnect terminal sample' : 'Connect terminal sample'}
          onClick={() => {
            if (connected) disconnect();
            else {
              online.current = true;
              generation.current++;
              setConnected(true);
            }
          }}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </Button>
        <Button
          size="sm"
          aria-label="Start public process"
          onClick={() => request('start')}
          disabled={
            !connected ||
            availability !== 'ready' ||
            ['running', 'unknown'].includes(value?.state ?? 'idle') ||
            phase === 'submitting' ||
            phase === 'outcome-unknown'
          }
        >
          Start process
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={value?.status === 'denied' ? 'Restore sample access' : 'Revoke sample access'}
          onClick={() => void access()}
          disabled={!connected}
        >
          {value?.status === 'denied' ? 'Restore access' : 'Revoke access'}
        </Button>
        <div style={{ width: 160, maxWidth: '100%', marginInlineStart: 'auto' }}>
          <Select
            aria-label="Terminal presentation"
            value={variant}
            onValueChange={(v) => setVariant(v as typeof variant)}
            options={['console', 'log', 'compact'].map((v) => ({ value: v, label: v }))}
          />
        </div>
        {uncertain.current && (
          <Button size="sm" variant="outline" onClick={() => void reconcile()}>
            Check terminal request
          </Button>
        )}
        {value?.state === 'unknown' && connected && availability === 'ready' && (
          <Button size="sm" variant="outline" onClick={() => request('stop')}>
            Stop owned session
          </Button>
        )}
      </div>
      <p role="status">
        {message} {pending ? `${pending} requests queued.` : ''}
      </p>
      <TerminalEmulator
        output={value?.output ?? ''}
        state={value?.state ?? 'unknown'}
        context={value?.context}
        status={availability}
        connection={connected ? 'connected' : 'disconnected'}
        submission={phase}
        command="fixed public Node program"
        exitCode={value?.exitCode}
        variant={variant}
        inputEnabled={connected && availability === 'ready' && !uncertain.current && pending < 32}
        onInput={(intent) => request('input', { ...intent })}
        onResize={(intent) => request('resize', { ...intent })}
        onRequestStop={(intent) => request('stop', { ...intent })}
        onRequestClear={(intent) => request('clear', { ...intent })}
      />
      {value?.stopRequested && <p>Stop requested. Waiting for actual process exit.</p>}
      {value?.outputLimited && <p>Output limit reached. The host stopped the public program.</p>}
    </section>
  );
}
