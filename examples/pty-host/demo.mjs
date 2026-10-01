import console from 'node:console';
import { setTimeout as delay } from 'node:timers/promises';
import { createPtyHost } from './host.mjs';

const host = createPtyHost();
async function observe(predicate) {
  const deadline = Date.now() + 4000;
  while (!predicate(host.snapshot())) {
    if (Date.now() > deadline) throw new Error('Native demo observation timed out.');
    await delay(20);
  }
}
try {
  host.start({ requestId: 'demo-start' });
  await observe((snapshot) => snapshot.output.includes('stdinTTY=true stdoutTTY=true'));
  host.resize({ ...host.snapshot().context, requestId: 'demo-resize', columns: 64, rows: 18 });
  await delay(150);
  const input = { ...host.snapshot().context, requestId: 'demo-input', data: 'colors\rsize\r' };
  const receipt = host.input(input);
  const duplicate = host.input(input);
  await observe((snapshot) => snapshot.output.includes('Size 64x18'));
  const ansi = host.snapshot().output.includes('\x1b[32m');
  host.input({ ...host.snapshot().context, requestId: 'demo-exit', data: 'exit\r' });
  await observe((snapshot) => snapshot.state !== 'running');
  const snapshot = host.snapshot();
  console.log(
    JSON.stringify(
      {
        nativeTTY: true,
        ansi,
        dimensions: '64x18',
        duplicateReceipt: JSON.stringify(receipt) === JSON.stringify(duplicate),
        state: snapshot.state,
        exitCode: snapshot.exitCode,
        outputLength: snapshot.output.length,
      },
      null,
      2,
    ),
  );
} finally {
  await host.close();
}
