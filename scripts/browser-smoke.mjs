import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { createDocsServer } from './serve-docs.mjs';
import { browserSmokeJourneys } from './browser-smoke-journeys.mjs';

const profiles = ['desktop-light', 'mobile-dark'];
const families = ['PermissionRequest', 'AgentHandoff', 'ClarificationRequest', 'Select'];

/** Do not trust CLI exit zero or a report's passed flag alone. */
export function assertSmokeReport(report) {
  if (
    !report ||
    report.passed !== true ||
    !Array.isArray(report.conditions) ||
    !Array.isArray(report.flows) ||
    !Array.isArray(report.errors) ||
    report.errors.length ||
    report.conditions.length !== 8 ||
    report.flows.length !== 24
  )
    throw new Error('Browser smoke failed or returned incomplete evidence.');
  for (const profile of profiles)
    for (const family of families) {
      const conditions = report.conditions.filter(
        (entry) => entry.profile === profile && entry.family === family,
      );
      if (
        conditions.length !== 1 ||
        conditions[0].views !== 3 ||
        conditions[0].audit?.horizontalOverflow !== false ||
        !Array.isArray(conditions[0].audit?.violations) ||
        conditions[0].audit.violations.length ||
        !Array.isArray(conditions[0].audit?.incomplete)
      )
        throw new Error(`Invalid or failing browser audit: ${profile}/${family}`);
      for (let presentation = 0; presentation < 3; presentation++) {
        const flows = report.flows.filter(
          (entry) =>
            entry.profile === profile &&
            entry.family === family &&
            entry.presentation === presentation,
        );
        if (flows.length !== 1 || flows[0].passed !== true)
          throw new Error(
            `Missing or failing keyboard/recovery journey: ${profile}/${family}/${presentation}`,
          );
      }
    }
}

export async function runBrowserSmoke() {
  await access('apps/docs/out/index.html');
  const session = `ci-smoke-${process.pid}-${randomUUID().slice(0, 8)}`;
  const output = resolve('output/playwright/ci-smoke', session);
  await mkdir(output, { recursive: true });
  console.log(`Browser smoke artifacts: ${output}`);
  const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
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
  const server = createDocsServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const logs = [];
  async function command(args, timeout = 30000) {
    try {
      const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
        timeout,
        maxBuffer: 2_000_000,
        windowsHide: true,
        env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
      });
      logs.push({ args, stdout: result.stdout, stderr: result.stderr });
      return result.stdout;
    } catch (error) {
      logs.push({ args, error: error.message, stdout: error.stdout, stderr: error.stderr });
      throw error;
    }
  }
  let failure;
  try {
    await command(['open', origin, `--config=${config}`, '--idle-timeout=60000']);
    const audit = await readFile('scripts/audit-page.js', 'utf8');
    const filename = resolve(output, 'journeys.js');
    await writeFile(
      filename,
      `async (page) => {\n${audit}\nreturn (${browserSmokeJourneys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit);\n}`,
    );
    const raw = await command(['run-code', `--filename=${filename}`, '--raw'], 150000);
    const report = JSON.parse(raw);
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    assertSmokeReport(report);
    const incomplete = report.conditions.filter(({ audit }) => audit.incomplete.length).length;
    console.log(
      `PASS: 8 browser conditions / 24 keyboard and recovery journeys; ${incomplete} conditions retain axe incompletes. These are not a WCAG acceptance pass.`,
    );
  } catch (error) {
    failure = error;
    await writeFile(resolve(output, 'failure.txt'), error.stack || error.message);
  } finally {
    // Close only the unique session and server created here. Never touch a user's preview/browser.
    try {
      await command(['close'], 15000);
    } catch (error) {
      failure ??= error;
    }
    server.closeAllConnections();
    await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
    await writeFile(
      resolve(output, 'commands.json'),
      JSON.stringify({ session, origin, logs }, null, 2),
    );
  }
  if (failure) throw failure;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await runBrowserSmoke();
  } catch (error) {
    console.error(
      `Browser smoke failed: ${error.message.split('\n')[0]}. See output/playwright/ci-smoke for details.`,
    );
    process.exitCode = 1;
  }
}
