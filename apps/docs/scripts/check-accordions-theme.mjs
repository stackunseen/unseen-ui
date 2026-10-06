import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, navigator */

const output = resolve('output/playwright/unseen-accordions');
await mkdir(output, { recursive: true });
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
const session = `unseen-disclosures-${process.pid}`;
const commands = [];
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
async function command(args, timeout = 30000) {
  const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
    timeout,
    maxBuffer: 4_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}
async function journeys(page, { origin, output }, audit) {
  const checks = [],
    conditions = [],
    failures = [],
    errors = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  const choose = async (label, value) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  };
  const saved = () =>
    page.evaluate(() => ({
      theme: JSON.parse(localStorage.getItem('unseen-ui-theme')),
      appearance: localStorage.getItem('unseen-ui-appearance'),
      icons: localStorage.getItem('unseen-ui-icons'),
    }));
  for (const width of [320, 390, 1440])
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
      await page.goto(origin);
      await page.evaluate((mode) => {
        localStorage.clear();
        localStorage.setItem('unseen-ui-appearance', mode);
      }, mode);
      for (const route of ['/patterns/coding-studio/', '/customize/']) {
        try {
          await page.goto(`${origin}${route}`);
          await page.waitForLoadState('networkidle');
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(() => document.querySelectorAll('h1').length === 1);
          if (route.includes('coding-studio')) {
            const trigger = page.getByRole('button', { name: 'Session settings', exact: true });
            await trigger.waitFor();
            await page.getByRole('button', { name: 'Run sample task', exact: true }).waitFor();
            check(
              (await trigger.getAttribute('aria-expanded')) === 'false',
              'Session settings starts closed',
            );
            check(
              (await page.locator('details,summary').count()) === 0,
              'Coding Studio uses shared Accordion rather than native summary',
            );
            check(
              (await page.getByRole('combobox', { name: 'Agent access', exact: true }).count()) ===
                0,
              'Closed access controls absent from accessibility queries',
            );
            check(
              await trigger.evaluate((node) => {
                const panel = node.parentElement.parentElement.querySelector('[role="group"]');
                return panel.hidden && panel.querySelector('input[type="checkbox"]');
              }),
              'Closed settings retain hidden mounted fields',
            );
            await trigger.focus();
            await page.keyboard.press('Tab');
            check(
              await page.evaluate(() => !document.activeElement.closest('[hidden]')),
              'Tab skips collapsed settings',
            );
            await trigger.focus();
            await page.keyboard.press('Enter');
            check(
              (await trigger.getAttribute('aria-expanded')) === 'true',
              'Enter expands settings',
            );
            check(
              await trigger.evaluate(
                (node) =>
                  document
                    .getElementById(node.getAttribute('aria-controls'))
                    ?.getAttribute('aria-labelledby') === node.id,
              ),
              'Expanded panel is labelled by its trigger',
            );
            check(
              (await trigger.locator('button,a,input').count()) === 0,
              'No nested interactive header elements',
            );
            await choose('Demo effort setting', 'High');
            await page
              .getByRole('checkbox', { name: 'Fail the next assistant request', exact: true })
              .check();
            await choose('Agent access', 'Read only');
            check(
              await page.getByRole('button', { name: 'Edit file', exact: true }).isEnabled(),
              'Unsent access draft does not change permissions',
            );
            await trigger.focus();
            await page.keyboard.press('Space');
            check(
              (await trigger.getAttribute('aria-expanded')) === 'false',
              'Space closes settings',
            );
            check(
              await trigger.evaluate((node) => node === document.activeElement),
              'Closing keeps focus on the trigger',
            );
            check(
              (await page
                .getByRole('button', { name: 'Request access change', exact: true })
                .count()) === 0,
              'Closed actions absent from accessibility tree',
            );
            await page.keyboard.press('Space');
            check(
              (await page
                .getByRole('combobox', { name: 'Demo effort setting', exact: true })
                .innerText()) === 'High',
              'Effort survives collapse',
            );
            check(
              await page
                .getByRole('checkbox', { name: 'Fail the next assistant request', exact: true })
                .isChecked(),
              'Failure setting survives collapse',
            );
            check(
              (await page
                .getByRole('combobox', { name: 'Agent access', exact: true })
                .innerText()) === 'Read only',
              'Unacknowledged access draft survives collapse',
            );
            await page.getByRole('button', { name: 'Request access change', exact: true }).click();
            await page
              .getByText(
                'Demo host acknowledged read-only access. Real permissions were not changed.',
                { exact: true },
              )
              .waitFor();
            check(
              await page.getByRole('button', { name: 'Edit file', exact: true }).isDisabled(),
              'Only explicit host acknowledgment changes permissions',
            );
            await choose('Agent access', 'Workspace access');
            await page.getByRole('button', { name: 'Request access change', exact: true }).click();
            await page.getByRole('button', { name: 'Run sample task', exact: true }).click();
            check(
              await page
                .getByRole('combobox', { name: 'Demo effort setting', exact: true })
                .isDisabled(),
              'Busy operation disables effort settings',
            );
            check(
              await page.getByRole('combobox', { name: 'Agent access', exact: true }).isDisabled(),
              'Busy operation disables access settings',
            );
            await page.getByRole('button', { name: 'Retry sample request', exact: true }).waitFor();
            await page.screenshot({
              path: `${output}/coding-${width}-${mode}.png`,
              fullPage: true,
            });
          } else {
            await page.getByRole('button', { name: 'Copy JSON', exact: true }).waitFor();
            check(
              await page
                .getByText(/Changing brand colours or presets rebuilds both palettes/)
                .isVisible(),
              'Palette reset guidance visible beside brand controls',
            );
            await choose('Appearance', mode === 'light' ? 'Dark' : 'Light');
            await choose('Component icons', /^Lucide/);
            const importTrigger = page.getByRole('button', { name: 'Import a theme', exact: true });
            await importTrigger.click();
            await page
              .getByRole('textbox', { name: 'Theme JSON', exact: true })
              .fill('Unfinished import');
            await importTrigger.click();
            await page.evaluate(() =>
              Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                  writeText: async () => {
                    throw new Error('Clipboard denied for regression');
                  },
                },
              }),
            );
            await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
            const jsonExport = page.getByRole('textbox', { name: 'JSON export', exact: true });
            await jsonExport.waitFor();
            check(
              (await importTrigger.getAttribute('aria-expanded')) === 'false' &&
                (await jsonExport.isVisible()),
              'Clipboard failure exposes export while Import stays closed',
            );
            const exported = JSON.parse(await jsonExport.inputValue());
            exported.light.surface = '#fffefd';
            exported.dark.surface = '#151518';
            await importTrigger.click();
            const importField = page.getByRole('textbox', { name: 'Theme JSON', exact: true });
            check(
              (await importField.inputValue()) === 'Unfinished import',
              'Copy fallback preserves the independent import draft',
            );
            await importField.fill(JSON.stringify(exported));
            await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
            const beforeReset = await saved();
            check(
              beforeReset.theme.light.surface === '#fffefd' &&
                beforeReset.theme.dark.surface === '#151518',
              'Import preserves independent mode colors',
            );
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            let state = await saved();
            check(
              state.appearance === 'light' &&
                state.icons === 'default' &&
                state.theme.light.surface === '#ffffff',
              'Reset restores all defaults',
            );
            await page.getByRole('button', { name: 'Undo', exact: true }).click();
            check(
              JSON.stringify(await saved()) === JSON.stringify(beforeReset),
              'Undo restores theme, appearance and icons together',
            );
            await page.getByRole('button', { name: 'Forest', exact: true }).click();
            state = await saved();
            check(
              state.theme.light.surface === '#ffffff' && state.theme.dark.surface === '#18181b',
              'Preset retains documented palette-regeneration behavior',
            );
            await page.getByRole('button', { name: 'Undo', exact: true }).click();
            check(
              JSON.stringify(await saved()) === JSON.stringify(beforeReset),
              'Undo recovers custom palettes after preset',
            );
            await page.getByRole('button', { name: 'Copy TypeScript', exact: true }).click();
            const ts = page.getByRole('textbox', { name: 'TypeScript export', exact: true });
            await ts.waitFor();
            const tsText = await ts.inputValue();
            const embedded = JSON.parse(tsText.slice(tsText.indexOf('importTheme(') + 12, -2));
            check(
              JSON.stringify(JSON.parse(embedded)) === JSON.stringify(beforeReset.theme),
              'TypeScript carries the complete exported theme',
            );
            await page.getByRole('button', { name: 'Copy CSS', exact: true }).click();
            const css = page.getByRole('textbox', { name: 'CSS export', exact: true });
            await css.waitFor();
            const cssText = await css.inputValue();
            check(
              cssText.includes('[data-ai-theme="brand"]') &&
                cssText.includes(
                  `--ai-surface:${beforeReset.theme[beforeReset.appearance].surface}`,
                ),
              'CSS uses documented scope and selected appearance',
            );
            check((await css.getAttribute('readonly')) !== null, 'Fallback text is read-only');
            await page.screenshot({ path: `${output}/theme-${width}-${mode}.png`, fullPage: true });
            await page.reload();
            await page.getByRole('button', { name: 'Copy JSON', exact: true }).waitFor();
            check(
              JSON.stringify(await saved()) === JSON.stringify(beforeReset),
              'Reload keeps complete theme and preferences',
            );
            await page.getByRole('button', { name: 'Borders & surfaces', exact: true }).click();
            check(
              (await page
                .getByRole('combobox', { name: 'Border strength', exact: true })
                .count()) === 0,
              'Existing borders panel still collapses',
            );
            await page.getByRole('button', { name: 'Borders & surfaces', exact: true }).click();
            check(
              await page
                .getByRole('combobox', { name: 'Border strength', exact: true })
                .isVisible(),
              'Existing borders panel reopens',
            );
          }
          const result = await audit(page);
          check(!result.horizontalOverflow, `${route} fits ${width}px`);
          check(!result.violations.length, `${route} has no scoped axe violations`);
          conditions.push({ width, mode, route, audit: result });
        } catch (error) {
          failures.push({ width, mode, route, message: error.message });
        }
      }
    }
  return {
    passed: !failures.length && !errors.length && conditions.length === 12,
    checks,
    conditions,
    failures,
    errors,
  };
}
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const filename = resolve(output, 'journeys.js');
  await writeFile(
    filename,
    `async page => { ${await readFile('scripts/audit-page.js', 'utf8')} return (${journeys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit); }`,
  );
  const report = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw'], 240000));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checks: report.checks.length,
        conditions: report.conditions.length,
        failures: report.failures,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
} finally {
  try {
    await command(['close'], 8000);
  } catch (error) {
    const snapshot = await command(['snapshot'], 10000).catch((e) => e.stdout || e.message);
    const closed = snapshot.includes(`The browser '${session}' is not open`);
    commands.push({
      cleanup: closed ? 'closed-verified-after-timeout' : 'unconfirmed',
      error: error.message,
      snapshot,
    });
    if (!closed) process.exitCode = 1;
  }
  await writeFile(resolve(output, 'commands.json'), JSON.stringify(commands, null, 2));
}
