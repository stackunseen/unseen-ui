import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, getComputedStyle, requestAnimationFrame */

const output = resolve('output/playwright/unseen-expansion');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `unseen-expansion-${process.pid}`;
const cli = resolve('node_modules/@playwright/cli/playwright-cli.js');
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
async function command(args, timeout = 30000) {
  const result = await promisify(execFile)(process.execPath, [cli, `-s=${session}`, ...args], {
    timeout,
    maxBuffer: 8_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}

async function journeys(page, { origin, output, group }, audit) {
  const checks = [],
    conditions = [],
    failures = [],
    errors = [];
  page.setDefaultTimeout(8000);
  page.on('pageerror', (error) => errors.push(error.message));
  if (group.startsWith('flow')) {
    if (page.__unseenDialogHandler) page.off('dialog', page.__unseenDialogHandler);
    page.__unseenDialogHandler = async (dialog) => {
      if (dialog.type() === 'beforeunload') await dialog.accept();
      else {
        errors.push(`Unexpected browser dialog: ${dialog.type()}`);
        await dialog.dismiss();
      }
    };
    page.on('dialog', page.__unseenDialogHandler);
  }
  const check = (value, label) => {
    if (!value) throw new Error(label);
    checks.push(label);
  };
  const scenario = async (name, action) => {
    const flowNames = {
      'flow-coding': 'Coding Studio narrow default and explicit explorer',
      'flow-workbench': 'Workbench readable local table',
      'flow-grid': 'Controlled grid paging sorting and selection',
      'flow-theme': 'Optional portal shares root theme and icons',
      'flow-recovery': 'Recoverable chat retains draft and reconciles original',
      'flow-actions': 'Approval unknown result and partial failure',
      'flow-research': 'Research references preserve claim binding',
      'flow-crud': 'SaaS customer CRUD, draft protection and receipt recovery',
      'flow-settings': 'SaaS roles, organization settings and illustrative billing',
      'flow-marketing': 'Marketing plan and contact draft stay local',
    };
    if (group.startsWith('flow-') && flowNames[group] !== name) return;
    try {
      await action();
    } catch (error) {
      failures.push({ name, message: error.message });
    }
  };
  const button = (name) => page.getByRole('button', { name, exact: true });
  const choose = async (name, value) => {
    await page.getByRole('combobox', { name, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  };
  const go = async (route) => {
    await page.goto(origin + route);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.getByText('Loading example.', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  await go('/');
  await page.evaluate(() => localStorage.clear());
  const components = [
    'data-grid',
    'combobox',
    'multi-select',
    'calendar',
    'date-range-picker',
    'page-header',
    'org-switcher',
    'list-toolbar',
    'master-detail',
    'settings-save-cancel',
    'unsaved-guard',
    'marketing-header',
    'marketing-footer',
    'marketing-hero',
    'marketing-features',
    'marketing-pricing',
    'marketing-faq',
    'marketing-contact',
    'marketing-article',
  ];
  const templates = [
    '/templates/saas-admin/',
    '/templates/marketing/',
    '/patterns/recoverable-chat/',
    '/patterns/action-receipts/',
    '/patterns/research-answers/',
    '/patterns/coding-studio/',
    '/patterns/agent-workbench/',
  ];
  for (const width of group.startsWith('flow') ? [] : [Number(group.split('-')[0])])
    for (const appearance of [group.split('-')[1]]) {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
      await page.evaluate((mode) => localStorage.setItem('unseen-ui-appearance', mode), appearance);
      for (const route of [...components.map((slug) => `/components/${slug}/`), ...templates])
        await scenario(`${width} ${appearance} ${route}`, async () => {
          await go(route);
          if (route.includes('recoverable-chat')) await button('Simulated host controls').waitFor();
          const result = await audit(page);
          const header = await page.locator('.web-header').boundingBox();
          check(
            header.x === 0 && Math.abs(header.width - width) < 1,
            'Shared header fills the viewport',
          );
          check((await page.locator('h1').count()) === 1, 'Route has one page heading');
          check(
            !result.horizontalOverflow && !result.violations.length,
            'Rendered route has no document overflow or axe violations',
          );
          if (route.includes('/components/')) {
            const optional = route.includes('/marketing-') ? 'marketing' : 'application';
            check(
              (await page.locator('#component-props').innerText()).includes(
                `@stackunseen/ui/${optional}.css`,
              ),
              'Usage includes the matching optional stylesheet',
            );
          }
          conditions.push({ route, width, appearance, ...result });
          if (
            templates.includes(route) ||
            ['combobox', 'data-grid', 'calendar', 'marketing-hero'].some(
              (slug) => route === `/components/${slug}/`,
            )
          ) {
            await page.screenshot({
              path: `${output}/${route.split('/').filter(Boolean).join('-')}-${width}-${appearance}.png`,
              fullPage:
                templates.includes(route) &&
                !route.includes('coding') &&
                !route.includes('workbench'),
            });
          }
        });
    }
  if (!group.startsWith('flow'))
    return {
      passed: !failures.length && !errors.length && conditions.length === 26,
      checks,
      conditions,
      failures,
      errors,
    };
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await scenario('Coding Studio narrow default and explicit explorer', async () => {
    await go('/patterns/coding-studio/');
    const files = button('Files');
    check(
      (await files.getAttribute('aria-expanded')) === 'false',
      'Mobile explorer begins collapsed',
    );
    check(
      await button('Edit file').isVisible(),
      'Editor is available without scrolling through the tree',
    );
    await files.focus();
    await page.keyboard.press('Enter');
    check(
      (await files.getAttribute('aria-expanded')) === 'true',
      'Keyboard opens the mobile explorer',
    );
    await page.keyboard.press('Enter');
    check(
      await files.evaluate((node) => document.activeElement === node),
      'Explorer toggle retains focus',
    );
  });
  await scenario('Workbench readable local table', async () => {
    await go('/patterns/agent-workbench/');
    await page.getByRole('tab', { name: 'Accounts', exact: true }).click();
    const table = page
      .getByRole('region', { name: 'Demo accounts table', exact: true })
      .locator('table');
    const metrics = await table.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      font: parseFloat(getComputedStyle(node).fontSize),
    }));
    check(
      metrics.width >= 640 && metrics.font >= 13,
      'Mobile account table keeps readable columns and type',
    );
    check(
      await page.getByText('Scroll sideways to see every column.', { exact: true }).isVisible(),
      'Local horizontal scrolling is explained',
    );
  });
  await scenario('Controlled grid paging sorting and selection', async () => {
    await go('/components/data-grid/');
    const table = page.getByRole('table', { name: 'Sample customers' });
    const sort = table.getByRole('button', { name: /Name/ });
    await sort.click();
    check(
      (await table.locator('th[aria-sort="ascending"]').count()) === 1,
      'Host receives and applies ascending sort',
    );
    const first = table.getByRole('checkbox').nth(1);
    await first.check();
    await button('Next page').click();
    check(
      await page.getByText('Page 2 of 2', { exact: true }).isVisible(),
      'Host applies the requested page',
    );
    check(
      (await page.getByRole('status').allTextContents()).some(
        (text) => text.includes('1 selected') && text.includes('0 on this page'),
      ),
      'Off-page selection remains explicit',
    );
  });
  await scenario('Optional portal shares root theme and icons', async () => {
    await go('/customize/');
    await button('Forest').click();
    await choose('Component icons', 'Lucide · outline');
    await page.evaluate(() => localStorage.setItem('unseen-ui-appearance', 'dark'));
    await go('/components/combobox/');
    const input = page.getByRole('combobox', { name: 'Team', exact: true });
    await input.focus();
    await page.keyboard.press('ArrowDown');
    const list = page.getByRole('listbox', { name: 'Team options' });
    await list.waitFor();
    const theme = await list.evaluate((node) => {
      const root = document.querySelector('.unseen-web');
      const surface = node.closest('[data-ai-theme]');
      return {
        root: root.dataset.aiTheme,
        portal: surface?.dataset.aiTheme,
        primary: getComputedStyle(root).getPropertyValue('--ai-primary').trim(),
        portalPrimary: getComputedStyle(node).getPropertyValue('--ai-primary').trim(),
        mode: surface?.dataset.appearance,
      };
    });
    check(
      theme.root === theme.portal && theme.primary === theme.portalPrimary && theme.mode === 'dark',
      'Optional selection portal shares the exact root theme scope and palette',
    );
    check(
      await page
        .locator('.detail-specimen [data-ai-icon="close"] svg')
        .getAttribute('class')
        .then((value) => value?.includes('lucide')),
      'Optional clear action uses the root Lucide icon override',
    );
    await page.keyboard.press('Enter');
    check(
      await input.evaluate((node) => document.activeElement === node),
      'Selection leaves focus in the search input',
    );
    await page.screenshot({ path: `${output}/custom-theme-combobox.png` });
    await go('/components/date-range-picker/');
    await page.locator('.detail-specimen button[aria-haspopup="dialog"]').click();
    const popup = page.getByRole('dialog');
    check(
      await popup.evaluate(
        (node) =>
          node.closest('[data-ai-theme]')?.dataset.aiTheme ===
          document.querySelector('.unseen-web').dataset.aiTheme,
      ),
      'Optional date popup uses the same root theme provider',
    );
    await page.keyboard.press('Escape');
  });
  await scenario('Recoverable chat retains draft and reconciles original', async () => {
    await go('/patterns/recoverable-chat/');
    await button('Simulated host controls').click();
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Keep this local draft');
    await choose('Next request acknowledgement', 'Lose acknowledgement');
    await button('Stop response').click();
    await button('Deliver request result').click();
    await button('Disconnect transport').click();
    check(
      (await page.getByRole('textbox', { name: 'Message', exact: true }).inputValue()) ===
        'Keep this local draft',
      'Disconnected chat keeps the editable draft',
    );
    await button('Refresh snapshot').click();
    await button('Deliver refreshed snapshot').click();
    await button('Look up original receipt').click();
    check(
      await page.getByText('Received by host', { exact: true }).isVisible(),
      'Original receipt is received without claiming execution',
    );
    await button('Apply received request').click();
    check(
      await page.getByText('Stopped by host', { exact: true }).isVisible(),
      'Separate host event confirms stopped execution',
    );
    check(
      await page.getByText(/Requests dispatched: 1.*original receipt lookups: 1/).isVisible(),
      'Receipt recovery sends no duplicate command',
    );
  });
  await scenario('Approval unknown result and partial failure', async () => {
    await go('/patterns/action-receipts/');
    await button('Allow access').click();
    await button('Confirm access decision').click();
    await button('Approve action').click();
    await button('Lose decision acknowledgement').click();
    await button('Check decision status').click();
    await button('Start simulated execution').click();
    await button('Lose result acknowledgement').click();
    await button('Look up original execution receipt').click();
    check(
      await page.getByText('AC-108: applied', { exact: true }).isVisible(),
      'Original terminal effects are recovered',
    );
    check(
      await button('Start simulated execution').isDisabled(),
      'The completed execution cannot start again',
    );
    await button('Start a new simulation').click();
    await button('Allow access').click();
    await button('Confirm access decision').click();
    await button('Approve action').click();
    await button('Accept decision').click();
    await button('Start simulated execution').click();
    await button('Report partial failure').click();
    check(
      await page.getByText('AC-108: failed', { exact: true }).isVisible(),
      'Partial failure retains the failed effect',
    );
  });
  await scenario('Research references preserve claim binding', async () => {
    await go('/patterns/research-answers/');
    await choose('Supplied evidence state', 'Source version changed');
    check(
      (await page.locator('[data-evidence-state="source-changed"]').count()) > 0,
      'Changed source version invalidates its pinned claim evidence',
    );
    await choose('Supplied evidence state', 'Source missing');
    check(
      (await page.locator('[data-evidence-state="source-missing"]').count()) > 0,
      'Missing source remains explicitly unavailable',
    );
  });
  await scenario('SaaS customer CRUD, draft protection and receipt recovery', async () => {
    await go('/templates/saas-admin/');
    const app = page.locator('[data-template="saas-admin"]');
    const action = (name) => app.getByRole('button', { name, exact: true });
    await action('Customers').click();
    await action('Create customer').click();
    await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Robin Example');
    await page
      .getByRole('textbox', { name: 'Email address', exact: true })
      .fill('robin@example.test');
    await page.getByRole('textbox', { name: 'Company', exact: true }).fill('Example Studio');
    await action('Organization settings').click();
    const guard = page.getByRole('alertdialog');
    await guard.getByRole('button', { name: 'Keep editing', exact: true }).click();
    check(
      await action('Organization settings').evaluate((node) => document.activeElement === node),
      'Draft guard restores its requesting navigation control',
    );
    check(
      (await page.getByRole('textbox', { name: 'Customer name', exact: true }).inputValue()) ===
        'Robin Example',
      'Cancelled navigation preserves the customer draft',
    );
    await action('Save customer').click();
    await page.getByText('Customer created in the local demo.', { exact: true }).waitFor();
    check(
      await page.getByRole('heading', { name: 'Robin Example', exact: true }).isVisible(),
      'Acknowledged create opens the saved customer',
    );
    await action('Edit customer').click();
    await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Robin Updated');
    await action('Demo behavior').click();
    await choose('Next action result', 'Interrupt receipt');
    await action('Save customer').click();
    await action('Check original receipt').waitFor();
    check(
      await action('Customers').isDisabled(),
      'Unknown save blocks navigation until the original receipt is checked',
    );
    await action('Check original receipt').click();
    await page.getByText('Customer changes saved in the local demo.', { exact: true }).waitFor();
    check(
      await page.getByRole('heading', { name: 'Robin Updated', exact: true }).isVisible(),
      'Original receipt recovery applies the updated customer',
    );
    await choose('Next action result', 'Acknowledge action');
    await action('Delete demo customer').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Keep customer', exact: true })
      .click();
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === 'Delete demo customer',
    );
    check(
      await action('Delete demo customer').evaluate((node) => document.activeElement === node),
      'Delete cancellation returns focus to its control',
    );
    await action('Delete demo customer').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete demo customer', exact: true })
      .click();
    await page
      .getByText('Customer deleted from the local demo. No external record was deleted.', {
        exact: true,
      })
      .waitFor();
    check(
      (await app.getByRole('button', { name: 'View Robin Updated', exact: true }).count()) === 0,
      'Acknowledged deletion removes the customer from the local list',
    );
    await page.screenshot({ path: `${output}/saas-crud-receipt.png` });
  });
  await scenario('SaaS roles, organization settings and illustrative billing', async () => {
    await go('/templates/saas-admin/');
    const app = page.locator('[data-template="saas-admin"]');
    const action = (name) => app.getByRole('button', { name, exact: true });
    await action('Members & roles').click();
    await action('Edit role for Riley Quinn').click();
    await choose('Demo role', 'Viewer');
    await action('Save demo role').click();
    await page.getByText('Demo role updated for Riley Quinn.', { exact: true }).waitFor();
    check(
      (await app.getByRole('row').filter({ hasText: 'Riley Quinn' }).innerText()).includes(
        'Viewer',
      ),
      'The acknowledged role appears in the member row',
    );
    await action('Organization settings').click();
    await page
      .getByRole('textbox', { name: 'Organization name', exact: true })
      .fill('Northstar Updated');
    await action('Save changes').click();
    await page
      .getByText('Organization settings saved in the local demo.', { exact: true })
      .waitFor();
    check(
      (
        await page.getByRole('combobox', { name: 'Organization', exact: true }).innerText()
      ).includes('Northstar Updated'),
      'Saved organization name updates the scope switcher',
    );
    await action('Plan & billing').click();
    await choose('Demo plan', 'Business');
    await page.getByRole('spinbutton', { name: 'Demo seats', exact: true }).fill('10');
    await action('Save demo plan').click();
    await page.getByText('Demo plan saved. No payment was made.', { exact: true }).waitFor();
    check(
      await page.getByText('3 members / 10 seats', { exact: true }).isVisible(),
      'Saved local plan displays the chosen seat count',
    );
    check(
      await page.getByText('Not connected', { exact: true }).isVisible(),
      'Billing remains explicit about the missing payment connection',
    );
    await page.screenshot({ path: `${output}/saas-billing-receipt.png` });
  });
  await scenario('Marketing plan and contact draft stay local', async () => {
    await go('/templates/marketing/');
    await button('Explore Studio').click();
    check(
      await page
        .getByText('Studio selected in this preview. No subscription was created.', { exact: true })
        .isVisible(),
      'Plan feedback does not claim a subscription',
    );
    await button('Prepare a draft').click();
    check(
      await page
        .getByRole('textbox', { name: 'Your name', exact: true })
        .evaluate((node) => document.activeElement === node),
      'Contact validation focuses the first invalid field',
    );
    await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Robin Example');
    await page
      .getByRole('textbox', { name: 'Email address', exact: true })
      .fill('robin@example.test');
    await page
      .getByRole('textbox', { name: 'About your project', exact: true })
      .fill('A small project workspace.');
    await button('Prepare a draft').click();
    check(
      await page
        .getByText('Draft prepared locally. Nothing was sent.', { exact: true })
        .isVisible(),
      'Contact preparation describes the local outcome',
    );
    await page.screenshot({ path: `${output}/marketing-local-draft.png` });
  });
  return {
    passed: !failures.length && !errors.length,
    checks,
    conditions,
    failures,
    errors,
  };
}

try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const source = await readFile('scripts/audit-page.js', 'utf8');
  const reports = [];
  const groups = [
    '390-light',
    '390-dark',
    '1440-light',
    '1440-dark',
    'flow-coding',
    'flow-workbench',
    'flow-grid',
    'flow-theme',
    'flow-recovery',
    'flow-actions',
    'flow-research',
    'flow-crud',
    'flow-settings',
    'flow-marketing',
  ];
  const selectedGroup = process.env.EXPANSION_BROWSER_GROUP;
  if (selectedGroup && selectedGroup !== 'flows' && !groups.includes(selectedGroup))
    throw new Error('Unknown browser group');
  for (const group of selectedGroup === 'flows'
    ? groups.filter((g) => g.startsWith('flow'))
    : selectedGroup
      ? [selectedGroup]
      : groups) {
    const filename = resolve(output, `journeys-${group}.js`);
    const reportFile = resolve(output, `report-${session}-${group}.json`);
    await writeFile(
      filename,
      `async page => {\n${source}\nreturn (${journeys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/'), group })}, audit);\n}`,
    );
    const raw = await command(['run-code', `--filename=${filename}`, '--raw'], 180000);
    reports.push(JSON.parse(raw));
    await writeFile(reportFile, JSON.stringify(reports.at(-1), null, 2));
    console.log(
      JSON.stringify({ group, passed: reports.at(-1).passed, failures: reports.at(-1).failures }),
    );
  }
  const report = {
    passed: reports.every((r) => r.passed),
    checks: reports.flatMap((r) => r.checks),
    conditions: reports.flatMap((r) => r.conditions),
    failures: reports.flatMap((r) => r.failures),
    errors: reports.flatMap((r) => r.errors),
  };
  await writeFile(
    resolve(output, selectedGroup ? `report-${selectedGroup}.json` : 'report.json'),
    JSON.stringify(report, null, 2),
  );
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
    await command(['close'], 10000);
  } catch (error) {
    const snapshot = await command(['snapshot']).catch((error) => error.stdout || error.message);
    const closed = snapshot.includes(`The browser '${session}' is not open`);
    commands.push({
      cleanup: closed ? 'closed-verified-after-timeout' : 'unconfirmed',
      error: error.message,
      snapshot,
    });
    if (!closed) process.exitCode = 1;
  }
  await writeFile(resolve(output, `commands-${session}.json`), JSON.stringify(commands, null, 2));
}
