import { randomUUID } from 'node:crypto';
import { createNativeSession } from './native-proxy.mjs';
import { setTimeout, clearTimeout } from 'node:timers';

export class PtyHostError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const validId = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= 160 &&
  !/[\p{Cc}\p{Cs}]/u.test(value);
function fields(value, names) {
  if (
    !value ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new PtyHostError(400, 'Invalid demo request.');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== names.length ||
    names.some((name) => !descriptors[name] || !('value' in descriptors[name]))
  )
    throw new PtyHostError(400, 'Invalid demo request fields.');
  return value;
}
function scoped(value, extra = []) {
  fields(value, ['requestId', 'sessionId', 'streamId', 'version', ...extra]);
  if (!['requestId', 'sessionId', 'streamId', 'version'].every((key) => validId(value[key])))
    throw new PtyHostError(400, 'Invalid request identity.');
  return value;
}
/** Dedicated fixed-process example, not an OS sandbox or production authorization service. */
export function createPtyHost() {
  let context = { sessionId: randomUUID(), streamId: randomUUID(), version: '1' },
    version = 1;
  let output = '',
    revision = 0,
    state = 'idle',
    exitCode,
    processHandle,
    closed = false,
    allowed = true,
    stopRequested = false,
    outputLimited = false;
  let stopTimer;
  const resources = new Set();
  const receipts = new Map(),
    subscriptions = [];
  const scope = () => ({ ...context });
  function available() {
    if (closed) throw new PtyHostError(410, 'Demo host closed.');
    if (!allowed) throw new PtyHostError(403, 'Terminal access denied.');
  }
  function requireScope(value) {
    available();
    if (!['sessionId', 'streamId', 'version'].every((key) => context[key] === value[key]))
      throw new PtyHostError(
        409,
        'Terminal scope changed. Refresh before requesting another action.',
      );
  }
  function record(action, value, effect) {
    const signature = JSON.stringify([
        action,
        Object.getOwnPropertyNames(value)
          .sort()
          .map((key) => [key, value[key]]),
      ]),
      existing = receipts.get(value.requestId);
    if (existing) {
      if (existing.signature !== signature)
        throw new PtyHostError(409, 'Request ID was already used for a different action.');
      return { ...existing.receipt, context: { ...existing.receipt.context } };
    }
    if (receipts.size >= 200)
      throw new PtyHostError(
        429,
        'Demo receipt capacity reached. Do not retry input automatically.',
      );
    const receipt = {
      requestId: value.requestId,
      action,
      context: scope(),
      status: 'acknowledged',
    };
    // Record identity before the native call: failure after invocation may have an unknown effect.
    receipts.set(value.requestId, { signature, receipt });
    try {
      effect();
    } catch {
      receipt.status = 'outcome-unknown';
      receipt.message =
        'Native operation outcome unknown. Reconcile host state before submitting again.';
      if (action === 'start' && !processHandle) state = 'unknown';
    }
    if (action === 'start') receipt.context = scope();
    return { ...receipt, context: { ...receipt.context } };
  }
  function stop() {
    if (processHandle && !stopRequested) {
      stopRequested = true;
      const owned = processHandle;
      // This fixed program handles Ctrl+C. Give it time to exit and drain output;
      // retain a bounded native termination fallback for the same owned handle.
      stopTimer = setTimeout(() => {
        if (processHandle === owned) {
          try {
            owned.kill();
          } catch {
            state = 'unknown';
          }
        }
      }, 2000);
      owned.write('\u0003');
    }
  }
  const api = {
    snapshot() {
      return {
        context: scope(),
        output: allowed ? output : '',
        revision,
        state: allowed ? state : 'unknown',
        status: allowed ? 'ready' : 'denied',
        exitCode: allowed ? exitCode : undefined,
        stopRequested: allowed && stopRequested,
        outputLimited: allowed && outputLimited,
      };
    },
    start(value) {
      fields(value, ['requestId']);
      if (!validId(value.requestId)) throw new PtyHostError(400, 'Invalid request identity.');
      available();
      const old = receipts.get(value.requestId);
      if (old) return record('start', value, () => {});
      if (processHandle) throw new PtyHostError(409, 'A demo process is already running.');
      return record('start', value, () => {
        subscriptions.splice(0).forEach((item) => item.dispose());
        context = { sessionId: randomUUID(), streamId: randomUUID(), version: String(++version) };
        output = '';
        revision++;
        state = 'unknown';
        exitCode = undefined;
        stopRequested = false;
        outputLimited = false;
        const child = createNativeSession();
        processHandle = child;
        resources.add(child);
        void child.whenClosed().then(() => resources.delete(child));
        subscriptions.push(
          child.onReady(() => {
            if (processHandle === child) {
              state = 'running';
              revision++;
            }
          }),
        );
        subscriptions.push(
          child.onData((data) => {
            if (child !== processHandle || outputLimited) return;
            // Preserve a complete replayable stream instead of silently feeding a mid-escape tail.
            if (output.length + data.length > 64000) {
              outputLimited = true;
              revision++;
              stop();
              return;
            }
            output += data;
            revision++;
          }),
        );
        subscriptions.push(
          child.onExit((event) => {
            if (child !== processHandle) return;
            clearTimeout(stopTimer);
            processHandle = undefined;
            exitCode = Number.isSafeInteger(event.exitCode) ? event.exitCode : undefined;
            state =
              exitCode === undefined
                ? 'unknown'
                : stopRequested
                  ? 'cancelled'
                  : exitCode === 0
                    ? 'complete'
                    : 'failed';
            revision++;
          }),
        );
      });
    },
    input(value) {
      scoped(value, ['data']);
      if (
        typeof value.data !== 'string' ||
        value.data.length < 1 ||
        value.data.length > 1024 ||
        (!['\x1b[I', '\x1b[O'].includes(value.data) &&
          [...value.data].some((character) => {
            const code = character.charCodeAt(0);
            return (code < 32 || code > 126) && ![3, 8, 10, 13, 127].includes(code);
          }))
      )
        throw new PtyHostError(400, 'Input is outside the fixed demo character vocabulary.');
      available();
      if (receipts.has(value.requestId)) return record('input', value, () => {});
      requireScope(value);
      if (!processHandle || state !== 'running' || stopRequested || outputLimited)
        throw new PtyHostError(409, 'Process input is unavailable.');
      return record('input', value, () => processHandle.write(value.data));
    },
    resize(value) {
      scoped(value, ['columns', 'rows']);
      available();
      if (
        !Number.isInteger(value.columns) ||
        value.columns < 20 ||
        value.columns > 240 ||
        !Number.isInteger(value.rows) ||
        value.rows < 6 ||
        value.rows > 60
      )
        throw new PtyHostError(400, 'Invalid demo dimensions.');
      if (receipts.has(value.requestId)) return record('resize', value, () => {});
      requireScope(value);
      if (!processHandle || stopRequested)
        throw new PtyHostError(409, 'Process resizing unavailable.');
      return record('resize', value, () => processHandle.resize(value.columns, value.rows));
    },
    stop(value) {
      scoped(value);
      available();
      if (receipts.has(value.requestId)) return record('stop', value, () => {});
      requireScope(value);
      return record('stop', value, stop);
    },
    clear(value) {
      scoped(value);
      available();
      if (receipts.has(value.requestId)) return record('clear', value, () => {});
      requireScope(value);
      return record('clear', value, () => {
        output = '';
        context = { ...context, streamId: randomUUID() };
        revision++;
      });
    },
    receipt(requestId) {
      if (!validId(requestId)) throw new PtyHostError(400, 'Invalid receipt identity.');
      available();
      const value = receipts.get(requestId)?.receipt;
      return value ? { ...value, context: { ...value.context } } : { requestId, status: 'unknown' };
    },
    setAccess(value) {
      if (typeof value !== 'boolean' || closed)
        throw new PtyHostError(400, 'Invalid demo access setting.');
      if (allowed !== value) {
        allowed = value;
        context = { ...context, version: String(++version) };
        revision++;
        if (!value) stop();
      }
      return api.snapshot();
    },
    async close() {
      closed = true;
      allowed = false;
      const child = processHandle;
      if (!child) {
        subscriptions.splice(0).forEach((item) => item.dispose());
        await Promise.all([...resources].map((item) => item.whenClosed()));
        return;
      }
      let timer, done, listener;
      const exited = new Promise((resolve) => {
        done = resolve;
        listener = child.onExit(() => resolve());
      });
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Owned demo PTY termination not observed.')),
          3000,
        );
      });
      try {
        try {
          stop();
        } catch {
          if (processHandle === child) state = 'unknown';
        }
        await Promise.race([exited, deadline]);
        await child.whenClosed();
      } finally {
        clearTimeout(timer);
        listener?.dispose();
        done?.();
        if (!processHandle) subscriptions.splice(0).forEach((item) => item.dispose());
      }
    },
  };
  return api;
}
