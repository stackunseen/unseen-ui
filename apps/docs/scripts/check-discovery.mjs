import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, getComputedStyle, requestAnimationFrame, URL, location */

const output = resolve('output/playwright/unseen-discovery');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
const session = `unseen-discovery-${process.pid}`;
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
const commands = [];
async function command(args, timeout = 120000) {
  const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
    timeout,
    windowsHide: true,
    maxBuffer: 8_000_000,
  });
  commands.push({ args, ...result });
  return result.stdout;
}
async function review(page, { origin, output, group }, audit) {
  const checks = [],
    conditions = [],
    failures = [],
    errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (passed, label) => {
    if (!passed) throw Error(label);
    checks.push(label);
  };
  const go = async (route) => {
    const response = await page.goto(origin + route);
    check(response.status() === 200, 'Direct route returns 200');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.getByText('Loading example.', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  const scenario = async (name, action) => {
    try {
      await action();
    } catch (error) {
      failures.push({ name, message: error.message });
    }
  };
  await go('/');
  await page.evaluate(() => localStorage.clear());
  const themes = group.startsWith('flow') ? ['light'] : [group.split('-')[1]];
  const width = group.startsWith('flow') ? 390 : Number(group.split('-')[0]);
  await page.setViewportSize({ width, height: 960 });
  for (const appearance of themes) {
    await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
    await page.evaluate((mode) => localStorage.setItem('unseen-ui-appearance', mode), appearance);
    const routes = group.startsWith('flow')
      ? []
      : [
          '/components/',
          '/getting-started/',
          '/patterns/',
          '/patterns/recoverable-chat/',
          '/patterns/action-receipts/',
          '/patterns/research-answers/',
          '/patterns/agent-workbench/',
          '/patterns/coding-studio/',
        ];
    for (const route of routes)
      await scenario(`${width} ${appearance} ${route}`, async () => {
        await go(route);
        if (route.includes('recoverable-chat'))
          await page
            .getByRole('button', { name: 'Simulated host controls', exact: true })
            .waitFor();
        const result = await audit(page);
        const header = await page.locator('.web-header').boundingBox();
        check(header.x === 0 && Math.abs(header.width - width) < 1, 'Header fills the viewport');
        check((await page.locator('h1').count()) === 1, 'One semantic page heading');
        check(
          !result.horizontalOverflow && !result.violations.length,
          'No overflow or axe violations',
        );
        const geometry = await page.evaluate(() => {
          const main = document.querySelector('main');
          const heading = main.querySelector('.example-page-heading');
          const live = main.querySelector('.example-page-content');
          const box = (e) =>
            e
              ? {
                  x: e.getBoundingClientRect().x,
                  y: e.getBoundingClientRect().y,
                  width: e.getBoundingClientRect().width,
                  height: e.getBoundingClientRect().height,
                }
              : null;
          return {
            main: box(main),
            header: box(document.querySelector('.web-header')),
            heading: box(heading),
            live: box(live),
            padding: getComputedStyle(main).padding,
            innerPadding: live?.firstElementChild
              ? getComputedStyle(live.firstElementChild).padding
              : null,
          };
        });
        if (route.startsWith('/patterns/')) {
          check(
            geometry.heading.y - geometry.header.height >= 27,
            'Pattern introduction has space below the header',
          );
          check(geometry.heading.x >= 16, 'Pattern introduction has a responsive gutter');
          check(
            geometry.live.y - (geometry.heading.y + geometry.heading.height) >= 27,
            'Pattern example has space below its introduction',
          );
          if (
            !route.includes('coding-studio') &&
            !route.includes('agent-workbench') &&
            route !== '/patterns/'
          )
            check(parseFloat(geometry.innerPadding) >= 12, 'Recipe content has an internal inset');
          if (route.includes('coding-studio') || route.includes('agent-workbench'))
            check(geometry.main.width === width, 'Workspace uses the full page width');
        }
        if (route === '/components/') {
          check(
            (await page.locator('.directory-group li a').count()) === 112,
            'Directory renders all 112 distinct entries',
          );
          check(
            (await page.locator('.directory-collection').count()) === 4,
            'Four component collections are visible',
          );
        }
        if (route === '/getting-started/') {
          check(
            (await page.getByRole('textbox', { name: 'Your name' }).count()) === 1,
            'First working example is rendered',
          );
          check(
            (await page
              .locator('pre code')
              .first()
              .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >= 14,
            'Code text is readable',
          );
          check(
            (await page.locator('a[href="http://127.0.0.1:4175"]').count()) === 1,
            'Setup links to the correct static preview',
          );
        }
        conditions.push({ route, width, appearance, geometry, ...result });
        await page.screenshot({
          path: `${output}/${group}-${route.split('/').filter(Boolean).at(-1)}.png`,
        });
      });
  }
  if (group === 'flow-directory')
    await scenario('Directory queries, filters, keyboard and history', async () => {
      await go('/components/');
      const input = page.getByRole('searchbox', { name: 'Search the component catalog' });
      const names = ['UI components', 'AI components', 'Application patterns', 'Marketing blocks'];
      const counts = [46, 52, 6, 8];
      for (let i = 0; i < names.length; i++) {
        await page.getByRole('button', { name: `${names[i]} ${counts[i]}`, exact: true }).click();
        check(
          (await page.locator('.directory-group li a').count()) === counts[i],
          'Collection count matches visible unique entries',
        );
        check(
          (await page.evaluate(() => new URL(location.href).searchParams.get('collection'))) ===
            ['ui', 'ai', 'application', 'marketing'][i],
          'Collection has a direct URL',
        );
      }
      await page.goBack();
      check(
        (await page.locator('.directory-group li a').count()) === 6,
        'Back restores the prior collection',
      );
      await page.goForward();
      check(
        (await page.locator('.directory-group li a').count()) === 8,
        'Forward restores the collection',
      );
      await input.fill('input');
      check(
        !(await page.evaluate(() => new URL(location.href).searchParams.has('collection'))),
        'Typing switches to global search',
      );
      check(
        (await page
          .locator('.directory-group strong')
          .filter({ hasText: /^Input$/ })
          .count()) === 1,
        'Search finds UI input',
      );
      check(
        (await page
          .locator('.directory-group strong')
          .filter({ hasText: /^PromptInput$/ })
          .count()) === 1,
        'Search also finds AI input',
      );
      await input.fill('drawer');
      check(
        (await page
          .locator('.directory-group strong')
          .filter({ hasText: /^Modal$/ })
          .count()) === 1,
        'Familiar aliases are preserved',
      );
      await input.fill('definitely-no-component');
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();
      check(
        (await page.locator('.directory-group li a').count()) === 112,
        'Clear restores every collection',
      );
      check(
        await input.evaluate((e) => e === document.activeElement),
        'Clear returns focus to search',
      );
      await go('/components/?collection=marketing&q=hero');
      await page.reload();
      check(
        (await page.locator('.directory-group li a').count()) === 1,
        'Direct query survives refresh',
      );
      check((await input.inputValue()) === 'hero', 'Direct search value is restored');
      await page.getByRole('button', { name: 'Marketing blocks 8', exact: true }).focus();
      await page.keyboard.press('Tab');
      check(
        await page
          .locator('a[href="/components/marketing-hero/"]')
          .evaluate((e) => e === document.activeElement),
        'Keyboard reaches the filtered component',
      );
      conditions.push({ flow: 'directory', width, ...(await audit(page)) });
      for (const viewport of [320, 390])
        for (const appearance of ['light', 'dark']) {
          await page.setViewportSize({ width: viewport, height: 960 });
          await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
          await page.evaluate(
            (mode) => localStorage.setItem('unseen-ui-appearance', mode),
            appearance,
          );
          await go('/components/');
          const result = await audit(page);
          check(
            !result.horizontalOverflow && !result.violations.length,
            'Final mobile directory has no overflow or axe violations',
          );
          check(
            (await input.getAttribute('placeholder')) === 'Search all components',
            'Mobile search prompt stays concise',
          );
          conditions.push({
            route: '/components/',
            width: viewport,
            appearance,
            finalPrompt: true,
            ...result,
          });
          await page.screenshot({
            path: output + '/directory-final-' + viewport + '-' + appearance + '.png',
          });
        }
    });
  if (group === 'flow-explorer')
    await scenario('Explorer collections and global aliases', async () => {
      for (const viewport of [390, 1440]) {
        await page.setViewportSize({ width: viewport, height: 960 });
        const routes = [
          ['/components/button/', 'UI components', '46', 'Actions'],
          ['/components/prompt-input/', 'AI components', '52', 'Conversation'],
          ['/components/page-header/', 'Application patterns', '6', 'Page structure'],
          ['/components/marketing-hero/', 'Marketing blocks', '8', 'Website sections'],
        ];
        for (const [route, label, count, category] of routes) {
          await go(route);
          if (viewport === 390)
            await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
          const nav = page.getByRole('navigation', { name: 'Library sections', exact: true });
          check(
            (await nav.locator('[aria-current="page"]').innerText()).includes(label),
            'Component is in the correct sidebar collection',
          );
          check(
            (await page.locator('.library-count').innerText()).startsWith(count + ' entries'),
            'Sidebar has an accurate count',
          );
          check(
            (await page.locator('.catalog-groups').innerText()).includes(category),
            'Sidebar has the useful group label',
          );
          const result = await audit(page);
          check(
            !result.horizontalOverflow && !result.violations.length,
            'Explorer has no overflow or axe violations',
          );
          conditions.push({ route, width: viewport, ...result });
          await page.screenshot({
            path: `${output}/explorer-${viewport}-${route.split('/').filter(Boolean).at(-1)}.png`,
          });
        }
        const search = page.getByRole('searchbox', { name: 'Search components', exact: true });
        await search.fill('input');
        const results = page.getByRole('navigation', { name: 'Components', exact: true });
        check(
          (await results.getByRole('link', { name: 'Input', exact: true }).count()) === 1 &&
            (await results.getByRole('link', { name: 'PromptInput', exact: true }).count()) === 1,
          'Explorer search spans UI and AI',
        );
        await search.fill('saving navigation');
        check(
          (await results.getByRole('link', { name: 'SettingsSaveCancel', exact: true }).count()) ===
            1,
          'Explorer search uses the application groups',
        );
        await search.fill('drawer');
        check(
          (await results.getByRole('link', { name: 'Modal', exact: true }).count()) === 1,
          'Explorer familiar alias still works',
        );
        if (viewport === 390) {
          await page.keyboard.press('Escape');
          check(
            await page
              .getByRole('button', { name: 'Open navigation', exact: true })
              .evaluate((e) => e === document.activeElement),
            'Escape closes navigation and restores focus',
          );
        }
      }
      await go('/?view=components&component=DataGrid&state=Default&tab=code');
      check(
        (await page.evaluate(() => new URL(location.href).pathname)) === '/components/data-grid/',
        'Legacy component link redirects',
      );
      check(
        (await page.evaluate(() => new URL(location.href).searchParams.get('tab'))) === 'code',
        'Legacy tab is preserved',
      );
      await page.reload();
      check(
        (await page.locator('h1').innerText()) === 'DataGrid',
        'Legacy destination survives refresh',
      );
    });
  if (group === 'flow-setup')
    await scenario('Working setup, optional entries and keyboard scrolling', async () => {
      await go('/getting-started/');
      const name = page.getByRole('textbox', { name: 'Your name' });
      const lightField = await name.evaluate((e) => getComputedStyle(e).backgroundColor);
      await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
      check(
        (await name.evaluate((e) => getComputedStyle(e).backgroundColor)) !== lightField,
        'Working example follows the site appearance',
      );
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
      check(
        (await name.evaluate((e) => getComputedStyle(e).backgroundColor)) === lightField,
        'Appearance returns to the light example',
      );

      await page.getByRole('button', { name: 'Save locally', exact: true }).click();
      check(await name.evaluate((e) => !e.validity.valid), 'Required name uses native validation');
      await name.fill('Sam');
      await name.press('Enter');
      check(
        (await page.locator('.setup-live-example [role="status"]').innerText()) ===
          'Saved locally: Sam',
        'Enter saves the visible local value',
      );
      await name.fill('Sam Lee');
      check(
        (await page.locator('.setup-live-example [role="status"]').innerText()) ===
          'Saved locally: Sam',
        'Draft edits leave the saved value intact',
      );
      await page.locator('.setup-archives > summary').focus();
      await page.keyboard.press('Enter');
      check(
        await page.locator('.setup-archives').evaluate((e) => e.open),
        'Keyboard opens the archive setup',
      );
      await page.locator('.setup-entries > summary').focus();
      await page.keyboard.press('Enter');
      check(
        (await page.locator('.setup-entry-table table tbody tr').count()) === 10,
        'Optional requirements render as a real table',
      );
      const table = page.getByRole('region', { name: 'Optional entry requirements' });
      await table.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.setup-entry-table').scrollLeft > 0);
      check(
        await table.evaluate((e) => e.scrollLeft > 0),
        'Optional table scrolls with the keyboard',
      );
      const code = page.locator('pre').filter({ hasText: 'export function FirstExample()' });
      await code.focus();
      await page.keyboard.press('End');
      check(
        await code.evaluate(
          (e) => parseFloat(getComputedStyle(e.querySelector('code')).fontSize) >= 14,
        ),
        'The working source remains readable',
      );
      const result = await audit(page);
      check(
        !result.horizontalOverflow && !result.violations.length,
        'Expanded setup has no document overflow or axe violations',
      );
      conditions.push({ flow: 'setup-expanded', width, ...result });
      await page.screenshot({ path: `${output}/setup-expanded-390.png`, fullPage: true });
    });
  return { passed: !failures.length && !errors.length, checks, conditions, failures, errors };
}
try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const source = await readFile('scripts/audit-page.js', 'utf8');
  const allGroups = [
    ...['320', '390', '768', '1440'].flatMap((width) =>
      ['light', 'dark'].map((theme) => `${width}-${theme}`),
    ),
    'flow-directory',
    'flow-explorer',
    'flow-setup',
  ];
  const selected = process.env.DISCOVERY_BROWSER_GROUP;
  if (selected && !allGroups.includes(selected)) throw Error('Unknown browser group');
  const reports = [];
  for (const group of selected ? [selected] : allGroups) {
    const filename = resolve(output, `review-${group}.js`);
    await writeFile(
      filename,
      `async page=>{${source};return (${review.toString()})(page,${JSON.stringify({ origin, output: output.split(String.fromCharCode(92)).join('/'), group })},audit);}`,
    );
    const raw = await command(['run-code', `--filename=${filename}`, '--raw']);
    const report = JSON.parse(raw);
    reports.push(report);
    await writeFile(resolve(output, `report-${group}.json`), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({
        group,
        passed: report.passed,
        checks: report.checks.length,
        conditions: report.conditions.length,
        failures: report.failures,
        errors: report.errors,
      }),
    );
  }
  const combined = {
    passed: reports.every((report) => report.passed),
    checks: reports.flatMap((report) => report.checks),
    conditions: reports.flatMap((report) => report.conditions),
    failures: reports.flatMap((report) => report.failures),
    errors: reports.flatMap((report) => report.errors),
  };
  await writeFile(
    resolve(output, selected ? `result-${selected}.json` : 'report.json'),
    JSON.stringify(combined, null, 2),
  );
  if (!combined.passed) process.exitCode = 1;
} finally {
  try {
    await command(['close'], 10000);
  } catch (error) {
    const snapshot = await command(['snapshot']).catch((error) => error.stdout || error.message);
    const closed = snapshot.includes(`The browser '${session}' is not open`);
    commands.push({
      cleanup: closed ? 'closed-verified-after-timeout' : 'unconfirmed',
      message: error.message,
      snapshot,
    });
    if (!closed) process.exitCode = 1;
  }
  await writeFile(resolve(output, `commands-${session}.json`), JSON.stringify(commands, null, 2));
}
