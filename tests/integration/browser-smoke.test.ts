// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { request } from 'node:http';
import { assertSmokeReport } from '../../scripts/browser-smoke.mjs';
import { createDocsServer } from '../../scripts/serve-docs.mjs';

function reportFixture() {
  const conditions = [],
    flows = [];
  for (const profile of ['desktop-light', 'mobile-dark'])
    for (const family of ['PermissionRequest', 'AgentHandoff', 'ClarificationRequest', 'Select']) {
      conditions.push({
        profile,
        family,
        views: 3,
        audit: {
          horizontalOverflow: false,
          violations: [] as string[],
          incomplete: [] as string[],
        },
      });
      for (let presentation = 0; presentation < 3; presentation++)
        flows.push({ profile, family, presentation, passed: true });
    }
  return { passed: true, conditions, flows, errors: [] as string[] };
}
describe('browser CI evidence gate', () => {
  it('requires complete journeys and audit coverage, independent of the passed flag', () => {
    expect(() => assertSmokeReport(reportFixture())).not.toThrow();
    const report = reportFixture();
    report.flows.pop();
    expect(() => assertSmokeReport(report)).toThrow();
    expect(() => assertSmokeReport({ passed: true })).toThrow();
  });
  it('rejects duplicate coverage that masks an untested condition', () => {
    const report = reportFixture();
    report.conditions[1] = report.conditions[0]!;
    expect(() => assertSmokeReport(report)).toThrow();
  });
  it.each(['violations', 'overflow', 'pageerror', 'failed-flow', 'failed-report'])(
    'fails on %s',
    (kind) => {
      const report = reportFixture();
      if (kind === 'violations') report.conditions[0]!.audit.violations.push('button-name');
      if (kind === 'overflow') report.conditions[0]!.audit.horizontalOverflow = true;
      if (kind === 'pageerror') report.errors.push('hydration failed');
      if (kind === 'failed-flow') report.flows[0]!.passed = false;
      if (kind === 'failed-report') report.passed = false;
      expect(() => assertSmokeReport(report)).toThrow();
    },
  );
  it('retains incompletes without treating them as violations or erasing them', () => {
    const report = reportFixture();
    report.conditions[0]!.audit.incomplete.push('color-contrast');
    expect(() => assertSmokeReport(report)).not.toThrow();
    expect(report.conditions[0]!.audit.incomplete).toEqual(['color-contrast']);
  });
});

it('serves the built-route conventions on an owned ephemeral loopback port and rejects traversal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-docs-smoke-'));
  await writeFile(join(directory, 'index.html'), 'Index');
  await writeFile(join(directory, 'guide.html'), 'Guide');
  await mkdir(join(directory, 'nested'));
  await writeFile(join(directory, 'nested', 'index.html'), 'Nested');
  const server = createDocsServer(directory);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const get = (path: string) =>
    new Promise<{ status?: number; body: string }>((done, reject) => {
      request({ hostname: '127.0.0.1', port, path }, (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => done({ status: response.statusCode, body }));
      })
        .on('error', reject)
        .end();
    });
  try {
    expect(await get('/')).toEqual({ status: 200, body: 'Index' });
    expect(await get('/guide')).toEqual({ status: 200, body: 'Guide' });
    expect(await get('/nested/')).toEqual({ status: 200, body: 'Nested' });
    expect((await get('/..%2fsecret.txt')).status).toBe(403);
    expect((await get('/missing')).status).toBe(404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
    await rm(directory, { recursive: true, force: true });
  }
});
