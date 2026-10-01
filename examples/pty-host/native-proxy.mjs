import process from 'node:process';
import { fork } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

export function createNativeSession() {
  const env = { TERM: 'xterm-256color', LANG: 'en_US.UTF-8' };
  for (const key of ['SystemRoot', 'WINDIR', 'ComSpec'])
    if (process.env[key]) env[key] = process.env[key];
  const worker = fork(fileURLToPath(new URL('./native-session.mjs', import.meta.url)), [], {
    cwd: fileURLToPath(new URL('./', import.meta.url)),
    env,
    execArgv: [],
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const listeners = { data: new Set(), exit: new Set(), ready: new Set() };
  let exited = false,
    finish;
  const closed = new Promise((resolve) => {
    finish = resolve;
  });
  function end(exitCode) {
    if (exited) return;
    exited = true;
    listeners.exit.forEach((callback) => callback({ exitCode }));
  }
  worker.stdout.resume();
  worker.stderr.resume();
  worker.on('message', (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'data' && typeof message.data === 'string')
      listeners.data.forEach((callback) => callback(message.data));
    if (message.type === 'ready') listeners.ready.forEach((callback) => callback());
    if (message.type === 'exit')
      end(Number.isSafeInteger(message.exitCode) ? message.exitCode : undefined);
    if (message.type === 'failure') end(undefined);
  });
  worker.on('error', () => end(undefined));
  worker.on('exit', () => {
    end(undefined);
    finish();
  });
  function send(value) {
    if (!worker.connected || exited) throw new Error('Native session unavailable.');
    worker.send(value, (error) => {
      if (error) end(undefined);
    });
  }
  const subscribe = (kind, callback) => {
    listeners[kind].add(callback);
    return { dispose: () => listeners[kind].delete(callback) };
  };
  return {
    onData: (callback) => subscribe('data', callback),
    onExit: (callback) => subscribe('exit', callback),
    onReady: (callback) => subscribe('ready', callback),
    write: (data) => send({ type: 'input', data }),
    resize: (columns, rows) => send({ type: 'resize', columns, rows }),
    kill: () => send({ type: 'kill' }),
    whenClosed: () => closed,
  };
}
