import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global localStorage, document, getComputedStyle */

// Uses the repository's installed Playwright CLI, not a second browser test runtime.
const output = resolve('output/playwright/unseen-textareas');
await mkdir(output, { recursive: true });
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `unseen-textareas-${process.pid}`;
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
const commands = [];
async function command(args, timeout = 30000) {
  const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
    timeout,
    maxBuffer: 2_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}
async function checks(page, { origin, output }, audit) {
  const conditions = [],
    flows = [],
    errors = [],
    failures = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', (e) => errors.push(e.message));
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    flows.push(label);
  };
  const targets = [
    ...['Default', 'Invalid', 'Disabled', 'Read-only', 'Long value'].map((state) => ({
      route: '/components/textarea/',
      state,
      style: 'default',
      kind: 'textarea',
    })),
    ...['standard', 'compact', 'inline'].map((style) => ({
      route: '/components/prompt-input/',
      state: 'Default',
      style,
      kind: 'composer',
    })),
  ];
  await page.goto(origin);
  await page.evaluate(() => localStorage.clear());
  for (const width of [320, 1440])
    for (const appearance of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
      await page.goto(origin);
      await page.evaluate((mode) => {
        localStorage.clear();
        localStorage.setItem('unseen-ui-appearance', mode);
      }, appearance);
      for (const target of targets) {
        const label =
          width + '/' + appearance + '/' + target.kind + '/' + target.state + '/' + target.style;
        try {
          await page.goto(
            origin +
              target.route +
              '?state=' +
              encodeURIComponent(target.state) +
              '&style=' +
              target.style,
          );
          const control = page.locator('.preview-canvas textarea');
          await control.waitFor();
          assert(
            await control.evaluate((el) => getComputedStyle(el).resize === 'none'),
            label + ': native resize grip suppressed',
          );
          if (target.state === 'Disabled') {
            assert(await control.isDisabled(), label + ': disabled state retained');
          } else {
            await page.keyboard.press('Tab');
            await control.focus();
            const focus = await control.evaluate((el, kind) => {
              const frame = kind === 'composer' ? el.closest('form') : el;
              const css = getComputedStyle(frame);
              return {
                focused: document.activeElement === el,
                visible: el.matches(':focus-visible'),
                width: css.outlineWidth,
                offset: css.outlineOffset,
                style: css.outlineStyle,
                border: getComputedStyle(el).borderColor,
                invalid: el.getAttribute('aria-invalid'),
                describedby: el.getAttribute('aria-describedby'),
                height: el.clientHeight,
                scroll: el.scrollHeight,
              };
            }, target.kind);
            assert(
              focus.focused &&
                focus.visible &&
                focus.width === '2px' &&
                focus.style === 'solid' &&
                focus.offset === '-1px',
              label + ': attached keyboard focus ring',
            );
            if (target.kind === 'composer')
              assert(
                await control.evaluate((el) => getComputedStyle(el).outlineStyle === 'none'),
                label + ': wrapper owns the single focus ring',
              );
            if (target.state === 'Invalid') {
              assert(focus.invalid === 'true', label + ': invalid semantics retained');
              const danger = await control.evaluate((el) => {
                const node = document.createElement('span');
                node.style.color = 'var(--ai-danger)';
                el.parentElement.append(node);
                const color = getComputedStyle(node).color;
                node.remove();
                return color;
              });
              assert(focus.border === danger, label + ': validation border retained');
            }
            if (target.state === 'Read-only')
              assert(
                await control.evaluate((el) => el.readOnly),
                label + ': read-only state retained',
              );
            if (target.state === 'Default') {
              await control.fill(
                Array.from({ length: 70 }, (_, i) => 'Long sample line ' + i).join('\n'),
              );
              const scrolling = await control.evaluate((el) => {
                el.scrollTop = el.scrollHeight;
                return {
                  top: el.scrollTop,
                  height: el.clientHeight,
                  scroll: el.scrollHeight,
                  value: el.value,
                };
              });
              assert(
                scrolling.scroll > scrolling.height && scrolling.top > 0,
                label + ': long content remains scrollable',
              );
            }
            await page.getByRole('button', { name: 'Reset example', exact: true }).focus();
            const blurred = await control.evaluate(
              (el, kind) =>
                getComputedStyle(kind === 'composer' ? el.closest('form') : el).outlineStyle,
              target.kind,
            );
            assert(blurred === 'none', label + ': focus frame clears after blur');
          }
          const result = await audit(page);
          assert(
            !result.horizontalOverflow && !result.violations.length,
            label + ': responsive accessibility basics',
          );
          conditions.push({ label, ...result });
          if (target.state === 'Default' && target.style !== 'compact')
            await page.screenshot({
              path:
                output +
                '/' +
                width +
                '-' +
                appearance +
                '-' +
                target.kind +
                '-' +
                target.style +
                '.png',
              fullPage: true,
            });
        } catch (e) {
          failures.push({ label, message: e.message });
        }
      }
    }
  return {
    passed: !errors.length && !failures.length && conditions.length === 32,
    flows,
    conditions,
    errors,
    failures,
  };
}
let report;
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const audit = await readFile('scripts/audit-page.js', 'utf8');
  const filename = resolve(output, 'journeys.js');
  await writeFile(
    filename,
    `async page => {\n${audit}\nreturn (${checks.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit);\n}`,
  );
  report = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw'], 240000));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        flows: report.flows.length,
        conditions: report.conditions.length,
        errors: report.errors,
        failures: report.failures,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
} finally {
  try {
    await command(['close']);
  } catch (error) {
    // The CLI can time out after closing Chromium. Verify closure before accepting cleanup.
    const snapshot = await command(['snapshot']).catch(
      (snapshotError) => snapshotError.stdout || snapshotError.message,
    );
    const closed = snapshot.includes(`The browser '${session}' is not open`);
    commands.push({
      cleanup: closed ? 'closed-verified-after-timeout' : 'unconfirmed',
      error: error.message,
      snapshot,
    });
    if (!closed) {
      console.error(error.message);
      process.exitCode = 1;
    }
  } finally {
    await writeFile(resolve(output, 'commands.json'), JSON.stringify(commands, null, 2));
  }
}
