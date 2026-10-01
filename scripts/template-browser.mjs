import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { createDocsServer } from './serve-docs.mjs';
import { templateJourneys } from './template-browser-journeys.mjs';

const output = resolve('output/playwright/relay-template');
await mkdir(output, { recursive: true });
const session = `relay-${randomUUID().slice(0, 8)}`;
const config = resolve(output, 'config.json');
await writeFile(
  config,
  JSON.stringify({
    browser: {
      browserName: 'chromium',
      isolated: true,
      launchOptions: { headless: true, channel: 'chromium' },
    },
  }),
);
const server = createDocsServer('examples/consumer/dist');
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const logs = [];
async function command(args, timeout = 30000) {
  const result = await promisify(execFile)(
    process.execPath,
    [resolve('node_modules/@playwright/cli/playwright-cli.js'), `-s=${session}`, ...args],
    { timeout, maxBuffer: 4_000_000, windowsHide: true },
  );
  logs.push({ args, ...result });
  return result.stdout;
}
try {
  await command(['open', `${origin}/relay.html`, `--config=${config}`, '--idle-timeout=60000']);
  const script = resolve(output, 'journeys.js');
  await writeFile(
    script,
    `async (page) => {\n${await readFile('scripts/audit-page.js', 'utf8')}\nreturn (${templateJourneys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit);\n}`,
  );
  const raw = await command(['run-code', `--filename=${script}`, '--raw'], 180000);
  await writeFile(resolve(output, 'raw-result.txt'), raw);
  const report = JSON.parse(raw);
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  if (
    !report.passed ||
    report.errors.length ||
    report.conditions.length !== 16 ||
    report.checks.length < 50 ||
    report.conditions.some(
      (condition) => condition.horizontalOverflow || condition.violations.length,
    )
  )
    throw new Error('Incomplete or failing template browser evidence.');
  console.log(
    `PASS: ${report.conditions.length} browser conditions, ${report.checks.length} assertions; ${report.conditions.filter((condition) => condition.incomplete.length).length} conditions retain axe incompletes.`,
  );
} catch (error) {
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack || error.message}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
  );
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await command(['close']).catch(() => {});
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await writeFile(
    resolve(output, 'commands.json'),
    JSON.stringify({ session, origin, logs }, null, 2),
  );
}
