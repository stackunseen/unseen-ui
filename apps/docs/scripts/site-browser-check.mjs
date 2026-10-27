import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global localStorage, document, getComputedStyle */

// Uses the repository's installed Playwright CLI, not a second browser test runtime.
const output = resolve('output/playwright/unseen-site');
await mkdir(output, { recursive: true });
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `unseen-check-${process.pid}`;
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
async function journeys(page, { origin, output }, audit) {
  const flows = [],
    conditions = [],
    errors = [],
    failures = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text());
  });
  const assert = (truth, label) => {
    if (!truth) throw new Error(label);
    flows.push(label);
  };
  const scenario = async (name, callback) => {
    try {
      await callback();
    } catch (error) {
      failures.push({ name, message: error.message });
    }
  };
  await page.goto(origin);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await scenario('Home controls and keyboard', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert(
      await page.locator('#main-content').evaluate((node) => node === document.activeElement),
      'Skip link reaches main content',
    );
    const tabs = page.getByRole('tablist', { name: 'Component examples by job' });
    assert(
      (await tabs.getByRole('tab').count()) === 5 &&
        (await page.locator('.home-tile').count()) === 2,
      'Home opens on the breadth strip with the agent runs tab',
    );
    await tabs.getByRole('tab', { name: 'Chat' }).click();
    const composer = page.locator('.home-hero-demo textarea');
    await composer.fill('Summarize');
    await composer.press('Enter');
    await page.waitForFunction(
      () =>
        /This page simulates the AI SDK/.test(
          document.querySelector('.home-hero-demo')?.textContent ?? '',
        ),
      null,
      { timeout: 8000 },
    );
    assert(
      await page.locator('.home-hero-demo').getByText('Summarize', { exact: true }).isVisible(),
      'Hero composer sends to the simulated chat and discloses that no model answered',
    );
    const hero = page.locator('.home-hero-demo');
    assert(
      (await hero.locator('[data-part="approval"]').count()) === 1 &&
        (await hero.getByRole('heading', { name: 'Run archive_accounts' }).isVisible()),
      'Hero shows a working chat with an approval waiting on a person',
    );
    await hero.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.waitForFunction(
      () =>
        /Nothing was archived/.test(document.querySelector('.home-hero-demo')?.textContent ?? ''),
      null,
      { timeout: 8000 },
    );
    assert(
      await hero.getByText('Denied', { exact: true }).isVisible(),
      'Hero rejection settles the simulated tool as denied',
    );
    await tabs.getByRole('tab', { name: 'Forms' }).click();
    await page.getByLabel('Workspace name', { exact: true }).fill('Review Sandbox');
    assert(
      (await page.getByLabel('Workspace name', { exact: true }).inputValue()) === 'Review Sandbox',
      'Forms tile is controlled locally',
    );
    const templates = page.locator('.home-templates .pattern-templates a');
    assert(
      (await templates.count()) === 6 &&
        (await templates.first().getAttribute('href')) === '/patterns/agent-workbench/',
      'Home lists the six templates',
    );
    const tasks = page.locator('.home-tasks li a');
    assert(
      (await tasks.count()) === 8 &&
        (await tasks.first().getAttribute('href')) === '/tasks/ai-chat/',
      'Homepage task cards open their task pages',
    );
    await page.getByRole('button', { name: 'Forest primary', exact: true }).click();
    assert(
      (await page.getByRole('button', { name: 'Forest primary' }).getAttribute('aria-pressed')) ===
        'true',
      'Primary swatch updates the actual shared theme',
    );
    await page.reload();
    assert(
      (await page.getByRole('button', { name: 'Forest primary' }).getAttribute('aria-pressed')) ===
        'true',
      'Validated theme preference survives refresh',
    );
  });
  await scenario('Catalog discovery', async () => {
    await page.goto(`${origin}/components/#component-search`);
    const search = page.getByRole('searchbox', { name: 'Search the component catalog' });
    assert(
      await search.evaluate((node) => document.activeElement === node),
      'Search deep link receives focus',
    );
    const announced = async () =>
      Number.parseInt((await page.locator('.directory-count').innerText()).trim(), 10);
    const total = await announced();
    assert(
      total > 100 &&
        (await page.locator('.directory-collection:not(.directory-featured) .directory-group li').count()) === total,
      'All announced entries are rendered in the catalog',
    );
    await page.getByRole('button', { name: /^AI components/ }).click();
    assert(
      (await announced()) < total &&
        (await page.locator('.directory-collection:not(.directory-featured) .directory-group li').count()) === (await announced()),
      'AI filter narrows to its announced count',
    );
    await search.fill('does-not-exist-xyz');
    assert(
      await page.getByRole('heading', { name: 'No matching components' }).isVisible(),
      'Search has an actionable empty state',
    );
    await page.getByRole('button', { name: 'Clear search' }).click();
    assert(
      (await page.locator('.directory-collection:not(.directory-featured) .directory-group li').count()) === total,
      'Clear search restores all entries',
    );
    const thumbs = page.locator(
      '.directory-collection:not(.directory-featured) .directory-thumb img.directory-thumb-light',
    );
    await thumbs.first().scrollIntoViewIfNeeded();
    assert(
      (await thumbs.count()) === total &&
        (await thumbs.first().evaluate((image) => image.complete && image.naturalWidth === 480)),
      'Gallery cards carry a loaded captured preview',
    );
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('.directory-group')?.getAttribute('data-view') === 'list',
      null,
      { timeout: 7000 },
    );
    const listState = {
      url: page.url(),
      rows: await page.locator('.directory-group[data-view="list"] li').count(),
      thumbs: await page.locator('.directory-thumb').count(),
      total,
    };
    assert(
      /[?&]view=list(?:[&#]|$)/.test(listState.url) &&
        listState.rows === total &&
        listState.thumbs === 0,
      `List view keeps every entry as a dense row and is addressable ${JSON.stringify(listState)}`,
    );
    await page.getByRole('button', { name: 'Gallery', exact: true }).click();
    await page.locator('.directory-thumb').first().waitFor();
    const rail = page.getByRole('navigation', { name: 'Component categories' });
    if (await rail.isVisible()) {
      const target = await rail.getByRole('link', { name: /^Overlays/ }).getAttribute('href');
      assert(
        target === '#group-ui-overlays' && (await page.locator(target).count()) === 1,
        'Category rail links reach their group',
      );
    }
    await search.fill('button');
    await page.locator('.directory-group a[href="/components/button/"]').click();
    await page.waitForURL((url) => url.pathname === '/components/button/');
    assert(
      page.url().split('?')[0] === `${origin}/components/button/`,
      'Catalog links open stable component routes',
    );
    await page.reload();
    assert(
      await page.getByRole('heading', { name: 'Button', exact: true, level: 1 }).isVisible(),
      'Component refresh retains the selected component',
    );
    assert(
      (await page.locator('.preview-widths').count()) === 0,
      'Obsolete width controls are absent',
    );
  });
  await scenario('Theme surfaces and recovery', async () => {
    await page.goto(`${origin}/customize/`);
    const mode = page.getByRole('button', { name: 'Switch to dark mode' });
    if (await mode.count()) await mode.click();
    await page.getByRole('button', { name: 'Backgrounds and text', exact: true }).click();
    const color = page.getByLabel('dark page background', { exact: true });
    await color.fill('#121214');
    assert(
      (await page
        .locator('.unseen-web')
        .evaluate((node) => getComputedStyle(node).getPropertyValue('--ai-canvas').trim())) ===
        '#121214',
      'Background token changes the actual page canvas',
    );
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('unseen-ui-theme')));
    assert(
      saved.dark.canvas === '#121214' && saved.light.canvas === '#fafafa',
      'Persistence includes separate light and dark palettes',
    );
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert((await color.inputValue()) === '#09090b', 'Undo restores the prior surface token');
    await page.getByRole('button', { name: 'Import a theme', exact: true }).click();
    await page.getByRole('textbox', { name: 'Theme JSON' }).fill('{"bad":true}');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    assert(
      (await color.inputValue()) === '#09090b',
      'Invalid theme import preserves the current palette',
    );
    await page.evaluate(() => localStorage.clear());
  });
  await scenario('Mobile discovery', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin);
    const tabs = page.getByRole('tablist', { name: 'Component examples by job' });
    const bounds = await tabs.boundingBox();
    assert(
      bounds && bounds.y < 844 * 2 && (await tabs.getByRole('tab').count()) === 5,
      'Breadth tabs sit within the first two mobile screens',
    );
    assert(
      (await page.locator('.home-templates .pattern-templates a').count()) === 6,
      'Six template links render on the phone layout',
    );
  });
  await scenario('Mobile menu keyboard', async () => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(origin);
    const opener = page.getByRole('button', { name: 'Open site menu', exact: true });
    await opener.focus();
    await opener.press('Enter');
    await page.waitForFunction(
      () => document.querySelector('#site-navigation a') === document.activeElement,
    );
    assert(
      await page
        .locator('#site-navigation a')
        .first()
        .evaluate((node) => document.activeElement === node),
      'Opening mobile menu focuses its first link',
    );
    await page.keyboard.press('Escape');
    assert(
      await opener.evaluate((node) => document.activeElement === node),
      'Escape closes mobile menu and returns focus',
    );
  });
  await scenario('Legacy URLs and404', async () => {
    await page.goto(`${origin}/?view=components&component=Button`);
    assert(
      page.url().split('?')[0] === `${origin}/components/button/`,
      'Legacy query component URL redirects to its stable route',
    );
    await page.goto(`${origin}/?view=coding`);
    assert(
      page.url().split('?')[0] === `${origin}/patterns/coding-studio/`,
      'Legacy workspace query URL redirects',
    );
    const response = await page.goto(`${origin}/components/not-an-entry/`);
    assert(response.status() === 404, 'Unknown component returns HTTP404');
    assert(
      await page
        .getByRole('heading', { name: 'We could not find that page.', exact: true })
        .isVisible(),
      '404 offers semantic recovery content',
    );
  });
  const routes = [
    '/',
    '/components/',
    '/components/button/',
    '/components/prompt-input/',
    '/components/chain-of-thought/',
    '/components/toggle-group/',
    '/components/tag/',
    '/components/avatar/',
    '/components/stat/',
    '/components/card/',
    '/components/marketing-article/',
    '/docs/',
    '/getting-started/',
    '/docs/customization/',
    '/docs/integration/',
    '/templates/',
    '/templates/relay/',
    '/patterns/',
    '/customize/',
    '/design/',
    '/patterns/agent-workbench/',
    '/patterns/coding-studio/',
  ];
  for (const width of [320, 1440]) {
    for (const appearance of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
      await page.goto(origin);
      await page.evaluate((mode) => {
        localStorage.clear();
        localStorage.setItem('unseen-ui-appearance', mode);
      }, appearance);
      for (const route of routes) {
        await scenario(`${route} ${width} ${appearance}`, async () => {
          const response = await page.goto(origin + route);
          await page.waitForFunction(() => {
            const headings = document.querySelectorAll('h1');
            return headings.length === 1 && headings[0].getBoundingClientRect().height > 0;
          });
          await page.locator('h1').waitFor({ state: 'visible' });
          assert(
            response.status() === 200,
            `${route} ${width} ${appearance}: direct navigation200`,
          );
          const result = await audit(page);
          const typography = await page
            .locator('.unseen-web')
            .evaluate((node) => getComputedStyle(node).fontFamily);
          conditions.push({ route, width, appearance, typography, ...result });
          if (result.horizontalOverflow || result.violations.length)
            throw new Error(
              JSON.stringify({
                overflow: result.horizontalOverflow,
                violations: result.violations,
              }),
            );
          if ((await page.locator('h1').count()) !== 1) throw new Error('Expected one H1');
          if (!typography.includes('plexSans'))
            throw new Error('The site does not use its self-hosted IBM Plex Sans family');
          const footer = await page.locator('.web-footer').boundingBox();
          if (route !== '/' && footer.height > (width === 320 ? 112 : 80))
            throw new Error('Internal footer is too tall');
          if (
            await page.getByRole('heading', { name: 'What your app handles', exact: true }).count()
          )
            throw new Error('Repeated generic integration heading remains');
          const header = await page.locator('.web-header').boundingBox();
          // The page reserves a stable scrollbar gutter, so compare with the body's layout width.
          const layoutWidth = await page.evaluate(
            () => document.body.getBoundingClientRect().width,
          );
          if (header.x !== 0 || Math.abs(header.width - layoutWidth) > 1)
            throw new Error('Shared header must span the viewport');
          if (
            (route === '/' || route === '/components/button/' || route === '/templates/') &&
            (width === 1440 || appearance === 'dark')
          ) {
            await page.screenshot({
              path: `${output}/${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-${width}-${appearance}.png`,
              fullPage: true,
            });
          }
        });
      }
    }
  }
  return {
    passed: !errors.length && !failures.length && conditions.length === routes.length * 4,
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
    `async page => {\n${audit}\nreturn (${journeys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, audit);\n}`,
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
