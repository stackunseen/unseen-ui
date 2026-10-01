import process from 'node:process';
import { spawn } from 'node-pty';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout, clearTimeout } from 'node:timers';

// Only this owned helper loads the native addon and its terminal workers.
const program = fileURLToPath(new URL('./program.mjs', import.meta.url));
let terminal,
  timer,
  ended = false;
function send(value, finish) {
  if (process.connected) process.send(value, () => finish?.());
  else finish?.();
}
try {
  terminal = spawn(process.execPath, [program], {
    name: 'xterm-256color',
    cwd: fileURLToPath(new URL('./', import.meta.url)),
    env: process.env,
    cols: 80,
    rows: 12,
  });
  terminal.onData((data) => send({ type: 'data', data }));
  terminal.onExit((event) => {
    ended = true;
    clearTimeout(timer);
    send({ type: 'exit', exitCode: event.exitCode }, () => process.exit(0));
  });
  send({ type: 'ready' });
} catch {
  send({ type: 'failure' }, () => process.exit(1));
}
process.on('message', (message) => {
  if (!terminal || ended || !message || typeof message !== 'object') return;
  try {
    if (message.type === 'input' && typeof message.data === 'string' && message.data.length <= 1024)
      terminal.write(message.data);
    else if (
      message.type === 'resize' &&
      Number.isInteger(message.columns) &&
      Number.isInteger(message.rows) &&
      message.columns >= 20 &&
      message.columns <= 240 &&
      message.rows >= 6 &&
      message.rows <= 60
    )
      terminal.resize(message.columns, message.rows);
    else if (message.type === 'kill') terminal.kill();
  } catch {
    send({ type: 'failure' }, () => process.exit(1));
  }
});
process.on('disconnect', () => {
  if (!terminal || ended) {
    process.exit(0);
    return;
  }
  terminal.write('\u0003');
  timer = setTimeout(() => {
    terminal.kill();
  }, 2000);
});
