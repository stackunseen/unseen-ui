import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, innerWidth, getComputedStyle, window */

const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const output = resolve('output/playwright/unseen-dialogs');
const session = `unseen-dialogs-${process.pid}`;
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
const commands = [];
await mkdir(output, { recursive: true });
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
    maxBuffer: 3_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}
async function check(page, { origin, output }, audit) {
  const conditions = [],
    flows = [],
    errors = [],
    failures = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    flows.push(label);
  };
  await page.goto(origin);
  await page.evaluate(() => localStorage.clear());
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const appearance of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
      for (const layout of ['dialog', 'sheet', 'fullscreen']) {
        for (const state of ['Long content', 'Custom header and footer']) {
          const name = `${width}/${appearance}/${layout}/${state}`;
          try {
            await page.goto(
              `${origin}/components/modal/?style=${layout}&state=${encodeURIComponent(state)}`,
            );
            await page.getByRole('button', { name: 'Open project details', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Project details', exact: true });
            await dialog.waitFor({ state: 'visible' });
            const measure = () =>
              dialog.evaluate((node) => {
                const box = (element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    height: rect.height,
                  };
                };
                const body = node.querySelector('[data-slot="modal-body"]');
                return {
                  dialog: box(node),
                  header: box(node.querySelector('[data-slot="modal-header"]')),
                  body: box(body),
                  footer: box(node.querySelector('[data-slot="modal-footer"]')),
                  bottomInset:
                    parseFloat(getComputedStyle(node).paddingBottom) +
                    parseFloat(getComputedStyle(node).borderBottomWidth),
                  scrollHeight: body.scrollHeight,
                  clientHeight: body.clientHeight,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                  focusContained: node.contains(document.activeElement),
                };
              });
            const before = await measure();
            assert(
              Math.abs(before.dialog.bottom - before.footer.bottom - before.bottomInset) <= 1.5,
              `${name}: footer reaches bottom padding`,
            );
            assert(
              before.body.top >= before.header.bottom - 1 &&
                before.body.bottom <= before.footer.top + 1,
              `${name}: body stays between header and footer`,
            );
            assert(
              before.dialog.left >= -1 && before.dialog.right <= width + 1 && !before.overflow,
              `${name}: surface fits viewport`,
            );
            assert(before.focusContained, `${name}: opening contains focus`);
            if (state === 'Long content') {
              await dialog.locator('[data-slot="modal-body"]').evaluate((node) => {
                node.scrollTop = node.scrollHeight;
              });
              const after = await measure();
              assert(
                Math.abs(after.footer.top - before.footer.top) <= 1 &&
                  Math.abs(after.header.top - before.header.top) <= 1,
                `${name}: scrolling keeps header and footer in place`,
              );
              if (before.scrollHeight > before.clientHeight + 1)
                assert(
                  await dialog
                    .locator('[data-slot="modal-body"]')
                    .evaluate((node) => node.scrollTop > 0),
                  `${name}: body scrolls`,
                );
            } else {
              assert(
                await dialog.getByText('Local draft', { exact: true }).isVisible(),
                `${name}: custom header renders`,
              );
              assert(
                await dialog
                  .getByText('Changes stay in this preview.', { exact: true })
                  .isVisible(),
                `${name}: custom footer renders`,
              );
            }
            for (let tab = 0; tab < 6; tab++) {
              await page.keyboard.press('Tab');
              assert(
                await dialog.evaluate((node) => node.contains(document.activeElement)),
                `${name}: Tab remains in dialog ${tab + 1}`,
              );
            }
            await dialog.locator('[data-slot="modal-body"]').focus();
            await page.getByRole('tooltip').waitFor({ state: 'hidden' });
            const accessibility = await audit(page);
            const activeDialog = await page.evaluate(async () => {
              const result = await window.axe.run(document.querySelector('[role="dialog"]'), {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
                },
              });
              return {
                violations: result.violations.map((rule) => ({
                  id: rule.id,
                  nodes: rule.nodes.map((node) => node.target),
                })),
                incomplete: result.incomplete.map((rule) => ({
                  id: rule.id,
                  nodes: rule.nodes.map((node) => ({
                    target: node.target,
                    summary: node.failureSummary,
                  })),
                })),
              };
            });
            conditions.push({
              name,
              width,
              appearance,
              layout,
              state,
              geometry: before,
              accessibility,
              activeDialog,
            });
            if (
              accessibility.violations.length ||
              activeDialog.violations.length ||
              accessibility.horizontalOverflow
            )
              throw Error(`Accessibility/overflow: ${JSON.stringify(accessibility.violations)}`);
            if (width === 1440 && layout === 'fullscreen')
              await page.screenshot({
                path: `${output}/${appearance}-${state === 'Long content' ? 'scrolling' : 'custom'}-fullscreen.png`,
              });
            if (width === 320 && layout === 'sheet' && state === 'Custom header and footer')
              await page.screenshot({ path: `${output}/${appearance}-custom-mobile.png` });
            await page.keyboard.press('Escape');
            assert((await dialog.count()) === 0, `${name}: Escape closes dialog`);
            await page.waitForFunction(() => {
              const opener = [...document.querySelectorAll('button')].find(
                (node) => node.textContent === 'Open project details',
              );
              return opener === document.activeElement;
            });
            assert(
              await page
                .getByRole('button', { name: 'Open project details' })
                .evaluate((node) => node === document.activeElement),
              `${name}: Escape restores trigger focus`,
            );
          } catch (error) {
            failures.push({ name, message: error.message });
          }
        }
      }
      try {
        await page.goto(`${origin}/components/modal/?style=sheet&state=Form`);
        await page.getByRole('button', { name: 'Open project details' }).click();
        const dialog = page.getByRole('dialog', { name: 'Project details' });
        await dialog.getByRole('textbox').fill('A new local name');
        await dialog.getByRole('button', { name: 'Save example' }).click();
        assert((await dialog.count()) === 0, `${width}/${appearance}: footer submits body form`);
        assert(
          await page
            .getByText('Project name updated to A new local name.', { exact: true })
            .isVisible(),
          `${width}/${appearance}: save acknowledged locally`,
        );
      } catch (error) {
        failures.push({ name: `${width}/${appearance}/Form`, message: error.message });
      }
    }
  }
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`${origin}/components/modal/`);
    const props = page.locator('#component-props');
    assert(
      await props.getByRole('heading', { name: 'Usage and props' }).isVisible(),
      'Props are visible without opening a disclosure',
    );
    assert(
      (await props.getByText('header', { exact: true }).isVisible()) &&
        (await props.getByText('footer', { exact: true }).isVisible()),
      'Custom header and footer props are explained',
    );
    await page.getByRole('link', { name: 'Usage and props', exact: true }).click();
    assert((await page.url()).endsWith('#component-props'), 'Props jump link reaches the section');
    await props.getByRole('button', { name: 'See the code example' }).click();
    assert(
      (await page.getByRole('tab', { name: 'Code', exact: true }).getAttribute('aria-selected')) ===
        'true',
      'Code button opens the usage example',
    );
    await props.getByRole('link', { name: 'Custom headers and footers' }).click();
    assert(
      await page
        .getByRole('heading', { name: 'Custom headers and footers', exact: true })
        .isVisible(),
      'Slot guidance link reaches customization example',
    );
    assert(
      (await page.url()).endsWith('#custom-headers-and-footers'),
      'Customization anchor is stable',
    );
    await page.screenshot({ path: `${output}/customization-guide.png`, fullPage: true });
    await page.goto(`${origin}/docs/integration/`);
    assert(
      await page
        .getByRole('heading', { name: 'Connect components to your app', exact: true })
        .isVisible(),
      'Integration guide uses a clear page title',
    );
    assert(
      await page.getByRole('heading', { name: 'Start with a value and a callback' }).isVisible(),
      'Integration guide explains state and callbacks',
    );
    await page.goto(`${origin}/components/modal/#component-props`);
    await page.locator('#component-props').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/visible-props.png` });
  } catch (error) {
    failures.push({ name: 'Documentation discovery', message: error.message });
  }
  return {
    passed: conditions.length === 36 && !errors.length && !failures.length,
    conditions,
    flows,
    errors,
    failures,
  };
}
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const audit = await readFile('scripts/audit-page.js', 'utf8');
  const filename = resolve(output, 'journeys.js');
  await writeFile(
    filename,
    `async page => {\n${audit}\nreturn (${check.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit);\n}`,
  );
  const report = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw'], 240000));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        conditions: report.conditions.length,
        assertions: report.flows.length,
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
    const snapshot = await command(['snapshot']).catch((error) => error.stdout || error.message);
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
  }
  await writeFile(resolve(output, 'commands.json'), JSON.stringify(commands, null, 2));
}
