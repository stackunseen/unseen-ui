import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, window, getComputedStyle */

const output = resolve('output/playwright/lean-release');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `first-release-${process.pid}`;
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
async function command(args, timeout = 60000) {
  const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
    timeout,
    maxBuffer: 8_000_000,
    windowsHide: true,
  });
  commands.push({ args, ...result });
  return result.stdout;
}
async function review(page, { origin, output, group }, audit) {
  const checks = [],
    conditions = [],
    failures = [],
    errors = [],
    failedRequests = [];
  const check = (passed, label) => {
    if (!passed) throw Error(label);
    checks.push(label);
  };
  page.setDefaultTimeout(8000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedRequests.push({ url: response.url(), status: response.status() });
  });
  const loaded = async () => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Loading example.', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
  };
  const go = async (route) => {
    const response = await page.goto(origin + route);
    check(response.status() === 200, `Direct navigation ${route}`);
    await loaded();
  };
  const condition = async (label) => {
    const result = await audit(page);
    conditions.push({ label, ...result });
    check(!result.horizontalOverflow, `${label}: no document overflow`);
    check(!result.violations.length, `${label}: zero axe violations`);
    check(!result.incomplete.length, `${label}: zero axe incompletes`);
    check((await page.locator('h1').count()) === 1, `${label}: one H1`);
    const header = await page.locator('.web-header').boundingBox();
    check(
      Math.abs(header.width - (await page.viewportSize()).width) < 1,
      `${label}: full-width header`,
    );
  };
  const navigation = async () => {
    const expected = ['Components', 'Getting Started', 'Customize'];
    const main = page.locator('#site-navigation');
    const footer = page.getByRole('navigation', { name: 'Footer navigation', exact: true });
    check(
      JSON.stringify(await main.locator('a').allTextContents()) === JSON.stringify(expected),
      'Main navigation contains the three launch paths',
    );
    check(
      JSON.stringify(await footer.getByRole('link').allTextContents()) === JSON.stringify(expected),
      'Footer matches main navigation',
    );
    if ((await page.viewportSize()).width < 900) {
      const menu = page.getByRole('button', { name: 'Open site menu', exact: true });
      if (await menu.isVisible()) {
        await menu.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement?.textContent === 'Components');
        check(await main.isVisible(), 'Mobile menu opens with keyboard');
        await page.keyboard.press('Escape');
        await page.waitForFunction(
          () => document.activeElement?.getAttribute('aria-label') === 'Open site menu',
        );
        check(
          (await menu.getAttribute('aria-expanded')) === 'false',
          'Escape closes mobile menu and restores focus',
        );
      }
    }
  };
  const screenshot = async (name) => {
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({ path: output + '/' + name + '.png', fullPage: true });
  };
  try {
    const [kind, widthText, appearance] = group.split('-');
    const width = Number(widthText);
    await page.setViewportSize({ width, height: 1000 });
    await go('/');
    await page.evaluate((value) => {
      localStorage.clear();
      localStorage.setItem('unseen-ui-appearance', value);
    }, appearance);
    await page.reload();
    await loaded();
    if (kind === 'main') {
      await navigation();
      check(
        (await page.locator('.home-intro-description').innerText()).includes('98 components'),
        'Homepage counts release controls',
      );
      check(
        await page.getByRole('link', { name: 'Browse all 98', exact: false }).isVisible(),
        'Homepage links to full launch catalog',
      );
      const filters = page.getByRole('group', { name: 'Homepage component collection' });
      check(
        (await filters.getByRole('button', { name: 'UI · 46', exact: true }).count()) === 1,
        'Homepage UI count is derived',
      );
      check(
        (await filters.getByRole('button', { name: 'AI · 52', exact: true }).count()) === 1,
        'Homepage AI count is derived',
      );
      check(
        await page
          .getByRole('heading', { name: 'Explore a working admin app.', exact: true })
          .isVisible(),
        'Homepage features one working app',
      );
      check(
        (await page.locator('main a[href="/templates/"], main a[href^="/patterns/"]').count()) ===
          0,
        'No collection or recipe promotion on home',
      );
      const homeSearch = page.getByRole('searchbox', { name: 'Find a component in the library' });
      await homeSearch.fill('MarketingFAQ');
      await page.locator('.home-search-empty').waitFor();
      check(
        await page.locator('.home-search-empty').isVisible(),
        'Composition absent from home search',
      );
      await homeSearch.fill('dialog');
      await page.locator('.home-found-components a[href="/components/modal/"]').waitFor();
      check(
        (await page.locator('.home-found-components a[href="/components/modal/"]').count()) === 1,
        'Familiar overlay alias discovers Modal',
      );
      await homeSearch.fill('');
      await condition('Homepage');
      await screenshot(`home-${width}-${appearance}`);
      await go('/components/');
      await navigation();
      const buttons = page.getByRole('group', { name: 'Component collection' }).getByRole('button');
      check((await buttons.count()) === 3, 'Catalog filters contain All, UI and AI only');
      check(
        (await page.locator('.directory-count').innerText()) === '98 components',
        'Catalog default count is 98',
      );
      check(
        (await page.locator('.directory-collection li').count()) === 98,
        'Crawlable default directory contains 98 controls',
      );
      check(
        (await page
          .locator(
            'main a[href="/components/org-switcher/"], main a[href="/components/marketing-faq/"]',
          )
          .count()) === 0,
        'Compositions absent from default directory',
      );
      await condition('Component index');
      await page.getByRole('button', { name: 'UI components 46', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('.directory-count')?.textContent === '46 components',
      );
      check(
        (await page.locator('.directory-count').innerText()) === '46 components',
        'UI filter matches count',
      );
      await page.getByRole('button', { name: 'AI components 52', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('.directory-count')?.textContent === '52 components',
      );
      check(
        (await page.locator('.directory-count').innerText()) === '52 components',
        'AI filter matches count',
      );
      await page.goBack();
      await loaded();
      check(
        (await page.locator('.directory-count').innerText()) === '46 components',
        'Back restores the prior catalog filter',
      );
      const search = page.getByRole('searchbox', { name: 'Search the component catalog' });
      await search.fill('OrgSwitcher');
      await page.getByRole('heading', { name: 'No matching components', exact: true }).waitFor();
      check(
        await page
          .getByRole('heading', { name: 'No matching components', exact: true })
          .isVisible(),
        'Compositions absent from normal catalog search',
      );
      await search.fill('prompt');
      await page.locator('.directory-collection a[href="/components/prompt-input/"]').waitFor();
      check(
        (await page
          .locator('.directory-collection a[href="/components/prompt-input/"]')
          .count()) === 1,
        'Catalog discovers PromptInput',
      );
      await page.locator('.directory-collection a[href="/components/prompt-input/"]').click();
      await page.waitForURL('**/components/prompt-input/');
      await loaded();
      await page.getByRole('heading', { name: 'PromptInput', exact: true }).waitFor();
      check(
        await page.getByRole('heading', { name: 'PromptInput', exact: true }).isVisible(),
        'Component discovery opens the usage page',
      );
      const sections = page.locator('.workspace-nav');
      check(
        (await sections
          .locator(
            'a[href="/templates/"], a[href="/patterns/"], a[href="/components/org-switcher/"], a[href="/components/marketing-hero/"]',
          )
          .count()) === 0,
        'Sidebar omits recipe, template and block collections',
      );
      check(
        (await sections.getByText('UI components', { exact: true }).count()) === 1 &&
          (await sections.getByText('AI components', { exact: true }).count()) === 1,
        'Sidebar keeps UI and AI discovery',
      );
      if (width < 900)
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page
        .getByRole('searchbox', { name: 'Search components', exact: true })
        .fill('MarketingFAQ');
      await page.getByText('No matching components.', { exact: true }).waitFor();
      check(
        (await page.getByText('No matching components.', { exact: true }).count()) === 1,
        'Sidebar search excludes deferred compositions',
      );
      await page.getByRole('searchbox', { name: 'Search components', exact: true }).fill('');
      if (width < 900)
        await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
      await condition('Component detail');
      await go('/getting-started/');
      await navigation();
      check(
        (await page
          .locator(
            'main a[href="/templates/"], main a[href="/patterns/"], main a[href="/components/#application"], main a[href="/components/#marketing"]',
          )
          .count()) === 0,
        'Setup links stay within launch scope',
      );
      check(
        (await page.locator('main a[href="/templates/saas-admin/"]').count()) === 1,
        'Setup points to the featured app',
      );
      await condition('Getting Started');
      await go('/customize/');
      await navigation();
      check(
        (await page.getByRole('combobox', { name: 'Appearance', exact: true }).count()) === 1,
        'Customization controls remain available',
      );
      await condition('Customize');
      await screenshot(`customize-${width}-${appearance}`);
      await page.getByRole('button', { name: 'Forest', exact: true }).click();
      await page.getByText('Forest palette applied to this showcase.', { exact: true }).waitFor();
      const preference = await page.evaluate(() => localStorage.getItem('unseen-ui-theme'));
      const primary = await page
        .locator('.unseen-web')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('--ai-primary').trim());
      check(Boolean(preference) && Boolean(primary), 'Edited theme is stored and applied');
      await page
        .getByRole('navigation', { name: 'Footer navigation', exact: true })
        .getByRole('link', { name: 'Getting Started', exact: true })
        .click();
      await page.waitForURL('**/getting-started/');
      await loaded();
      check(page.url().endsWith('/getting-started/'), 'Primary setup link opens Getting Started');
      check(
        (await page.evaluate(() => localStorage.getItem('unseen-ui-theme'))) === preference,
        'Client navigation preserves edited theme',
      );
      check(
        (await page
          .locator('.unseen-web')
          .evaluate((element) =>
            getComputedStyle(element).getPropertyValue('--ai-primary').trim(),
          )) === primary,
        'Edited palette reaches the documentation',
      );
      await page.reload();
      await loaded();
      check(
        (await page.evaluate(() => localStorage.getItem('unseen-ui-theme'))) === preference,
        'Refresh preserves edited theme',
      );
      await go('/docs/integration/');
      for (const route of ['recoverable-chat', 'action-receipts', 'research-answers'])
        check(
          (await page.locator(`main a[href="/patterns/${route}/"]`).count()) === 1,
          `Relevant docs retain ${route} example`,
        );
      await condition('Integration docs');
    } else if (kind === 'compat') {
      for (const collection of ['application', 'marketing']) {
        await go(`/components/?collection=${collection}`);
        check(
          await page
            .getByText('Additional composition examples, kept at their existing URLs.', {
              exact: false,
            })
            .isVisible(),
          'Saved collection has an honest composition label',
        );
        check(
          (await page.locator('.directory-count').innerText()) ===
            (collection === 'application' ? '6 examples' : '8 examples'),
          'Saved collection preserves its examples',
        );
        check(
          (await page
            .getByRole('group', { name: 'Component collection' })
            .getByRole('button')
            .count()) === 3,
          'Saved collection is not added to default filter navigation',
        );
        await condition('Saved ' + collection + ' collection');
      }
      await go('/components/#marketing');
      await page.getByText('8 examples', { exact: true }).waitFor();
      check(page.url().includes('collection=marketing'), 'Saved marketing hash remains usable');
      const deferred = [
        'PageHeader',
        'OrgSwitcher',
        'ListToolbar',
        'MasterDetail',
        'SettingsSaveCancel',
        'UnsavedGuard',
        'MarketingHeader',
        'MarketingFooter',
        'MarketingHero',
        'MarketingFeatures',
        'MarketingPricing',
        'MarketingFAQ',
        'MarketingContact',
        'MarketingArticle',
      ];
      for (const name of deferred) {
        await go(`/?view=components&component=${name}&tab=code`);
        await page.waitForURL('**/components/**?tab=code');
        await loaded();
        check(
          await page.getByRole('heading', { name, exact: true }).isVisible(),
          `Saved ${name} link migrates`,
        );
        check(
          await page.getByText('Composition example', { exact: true }).isVisible(),
          `${name} is presented as composition`,
        );
        check(
          (await page
            .getByRole('tab', { name: 'Code', exact: true })
            .getAttribute('aria-selected')) === 'true',
          `${name} preserves selected tab`,
        );
        const response = await page.reload();
        check(response.status() === 200, `${name} refresh works`);
        await loaded();
      }
      await go('/components/marketing-faq/');
      await condition('Deferred FAQ example');
      await go('/components/org-switcher/');
      await condition('Deferred organization example');
      for (const route of [
        '/templates/',
        '/templates/marketing/',
        '/templates/relay/',
        '/patterns/agent-workbench/',
        '/patterns/coding-studio/',
        '/patterns/recoverable-chat/',
        '/patterns/action-receipts/',
        '/patterns/research-answers/',
      ]) {
        await go(route);
        check((await page.locator('main').count()) === 1, `Saved ${route} still renders`);
      }
    }
    check(!errors.length, 'No page errors');
    check(!failedRequests.length, 'No failed page or asset requests');
  } catch (error) {
    failures.push(error.message);
    await page.screenshot({ path: output + '/failure-' + group + '.png', fullPage: true });
  }
  return { group, passed: !failures.length, checks, conditions, failures, errors, failedRequests };
}
await command(['open', origin, '--config=' + config, '--idle-timeout=600000']);
try {
  const auditSource = await readFile('scripts/audit-page.js', 'utf8');
  const groups = process.env.FIRST_RELEASE_GROUP?.split(',') || [
    'main-320-light',
    'main-390-dark',
    'main-768-light',
    'main-1024-dark',
    'main-1440-light',
    'main-1440-dark',
    'compat-390-light',
    'compat-1440-dark',
  ];
  const reports = [];
  for (const group of groups) {
    const file = resolve(output, 'review-' + group + '.js');
    await writeFile(
      file,
      `async page=>{${auditSource};return (${review.toString()})(page,${JSON.stringify({ origin, output: output.replaceAll('\\', '/'), group })},audit);}`,
    );
    const report = JSON.parse(await command(['run-code', '--filename=' + file, '--raw']));
    reports.push(report);
    await writeFile(resolve(output, group + '.json'), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({
        group,
        passed: report.passed,
        checks: report.checks.length,
        conditions: report.conditions.length,
        failures: report.failures,
      }),
    );
    if (!report.passed) break;
  }
  const combined = {
    passed: reports.every((report) => report.passed),
    checks: reports.flatMap((report) => report.checks),
    conditions: reports.flatMap((report) => report.conditions),
    failures: reports.flatMap((report) => report.failures),
    errors: reports.flatMap((report) => report.errors),
    failedRequests: reports.flatMap((report) => report.failedRequests),
  };
  await writeFile(
    resolve(output, process.env.FIRST_RELEASE_GROUP ? 'selected-report.json' : 'report.json'),
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
  await writeFile(
    resolve(output, 'commands-' + session + '.json'),
    JSON.stringify(commands, null, 2),
  );
}
