import assert from 'node:assert/strict';
import { request } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import console from 'node:console';
const origin = 'http://127.0.0.1:4177',
  checks = [];
function send(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      origin + path,
      {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          Connection: 'close',
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (s) => (text += s));
        res.on('error', reject);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(text) });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
async function verify(name, status, path, body, headers) {
  const result = await send(path, body, headers);
  assert.equal(result.status, status, name);
  checks.push({ name, status: result.status, passed: true });
  return result.body;
}
async function observe(predicate) {
  const deadline = Date.now() + 5000;
  while (true) {
    const data = (await send('/api/terminal')).body;
    if (predicate(data)) return data;
    if (Date.now() > deadline) throw new Error('Native host observation timed out');
    await delay(30);
  }
}
const before = await observe((s) => ['idle', 'complete', 'cancelled'].includes(s.state));
assert.ok(
  ['idle', 'complete', 'cancelled'].includes(before.state),
  'Dedicated sample process is quiescent',
);
await verify(
  'foreign Origin',
  403,
  '/api/terminal/start',
  { requestId: randomUUID() },
  { Origin: 'https://example.invalid' },
);
await verify(
  'foreign Host',
  403,
  '/api/terminal/start',
  { requestId: randomUUID() },
  { Host: 'example.invalid' },
);
await verify(
  'wrong Content-Type',
  405,
  '/api/terminal/start',
  { requestId: randomUUID() },
  { 'Content-Type': 'text/plain' },
);
await verify(
  'no POST Origin',
  405,
  '/api/terminal/start',
  { requestId: randomUUID() },
  { Origin: '' },
);
await verify('arbitrary command field', 400, '/api/terminal/start', {
  requestId: randomUUID(),
  command: 'powershell',
});
await verify('overbound JSON body', 413, '/api/terminal/start', {
  requestId: randomUUID(),
  padding: 'x'.repeat(8193),
});
const receipt = await verify('explicit start receipt', 200, '/api/terminal/start', {
  requestId: randomUUID(),
});
await observe((s) => s.state === 'running' && s.output.includes('Commands:'));
const context = receipt.context,
  input = { ...context, requestId: randomUUID(), data: 'colors\r' };
const accepted = await verify('current scoped input', 200, '/api/terminal/input', input);
await observe((s) => s.output.includes('Green sample'));
await delay(100);
const settled = (await send('/api/terminal')).body.output;
assert.deepEqual(await verify('same ID deduplicated', 200, '/api/terminal/input', input), accepted);
await delay(100);
assert.equal(
  (await send('/api/terminal')).body.output,
  settled,
  'Duplicate ID does not produce further output in the observed window',
);
await verify('same ID different input', 409, '/api/terminal/input', { ...input, data: 'help\r' });
await verify('obsolete scope', 409, '/api/terminal/input', {
  ...context,
  version: 'obsolete',
  requestId: randomUUID(),
  data: 'help\r',
});
await verify('unknown execution field', 400, '/api/terminal/input', {
  ...context,
  requestId: randomUUID(),
  data: 'help\r',
  execute: true,
});
await verify('unsupported device report', 400, '/api/terminal/input', {
  ...context,
  requestId: randomUUID(),
  data: '\x1b[6n',
});
await verify('denied host access', 200, '/api/terminal/access', { authorized: false });
assert.equal((await send('/api/terminal')).body.output, '');
await verify(
  'receipt withheld after revocation',
  403,
  `/api/terminal/receipt?requestId=${input.requestId}`,
);
await verify('input withheld after revocation', 403, '/api/terminal/input', {
  ...context,
  requestId: randomUUID(),
  data: 'help\r',
});
await verify('restore new access version', 200, '/api/terminal/access', { authorized: true });
await observe((s) => s.state === 'cancelled');
await verify('old scope still rejected after restore', 409, '/api/terminal/stop', {
  ...context,
  requestId: randomUUID(),
});
console.log(
  JSON.stringify({
    checks,
    origin,
    final: (await send('/api/terminal')).body.state,
    note: 'Actual loopback/native fixed-program checks; no production authorization or arbitrary-command claim.',
  }),
);
