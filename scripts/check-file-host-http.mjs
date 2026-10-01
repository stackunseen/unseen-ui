import assert from 'node:assert/strict';
import console from 'node:console';
import { request } from 'node:http';
const origin = 'http://127.0.0.1:4176';
async function send(path, body, headers = {}) {
  return await new Promise((resolve, reject) => {
    const pending = request(
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
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('error', reject);
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(text) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    pending.on('error', reject);
    pending.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
const current = (await send('/api/files')).body;
const accessible = current.files.find((file) => file.access === 'available'),
  denied = current.files.find((file) => file.access === 'denied');
const intent = (file) => ({
  workspaceId: current.context.workspaceId,
  snapshotVersion: current.context.version,
  fileId: file.id,
  path: file.path,
  ...(file.version ? { fileVersion: file.version } : {}),
});
const checks = [];
async function verify(name, status, body, headers = {}) {
  const response = await send('/api/files/open', body, headers);
  assert.equal(response.status, status, name);
  const value = response.body;
  if (status !== 200) assert.equal('text' in value, false, `${name} withheld source`);
  checks.push({ name, status: response.status, passed: true });
}
assert.ok(accessible && denied, 'configured public/denied fixtures');
await verify('current read acknowledgement', 200, intent(accessible));
await verify('forged denied intent', 403, intent(denied));
await verify('foreign origin', 403, intent(accessible), { Origin: 'https://example.invalid' });
await verify('foreign Host', 403, intent(accessible), { Host: 'example.invalid' });
await verify('wrong content type', 405, intent(accessible), { 'Content-Type': 'text/plain' });
await verify('extra execution field', 400, { ...intent(accessible), execute: true });
await verify('traversal path', 409, { ...intent(accessible), path: '../README.md' });
await verify('unknown workspace', 409, { ...intent(accessible), workspaceId: 'other' });
await verify('overbound request', 413, { ...intent(accessible), padding: 'x'.repeat(4096) });
const invalid = await send('/api/files?pageSize=501');
assert.equal(invalid.status, 400);
checks.push({ name: 'invalid page size', status: invalid.status, passed: true });
console.log(
  JSON.stringify({
    checks,
    note: 'Live loopback HTTP checks against the dedicated public sample host; no production authentication or hostile OS sandbox claim.',
  }),
);
