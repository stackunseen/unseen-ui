import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, window, localStorage, getComputedStyle, matchMedia */

const output = resolve('output/playwright/compact-recipes');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = 'compact-recipes-' + process.pid;
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
async function command(args, timeout = 180000) {
  const result = await promisify(execFile)(process.execPath, [cli, '-s=' + session, ...args], {
    timeout,
    maxBuffer: 12_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}

async function review(page, options, audit) {
  const { origin, output, group, preferences } = options;
  let touchContext;
  if (group.startsWith('touch-')) {
    touchContext = await page.context().browser().newContext({ hasTouch: true, isMobile: true });
    page = await touchContext.newPage();
  }
  const checks = [],
    conditions = [],
    failures = [],
    errors = [],
    failedRequests = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedRequests.push({ url: response.url(), status: response.status() });
  });
  const check = (passed, label) => {
    if (!passed) throw Error(label);
    checks.push(label);
  };
  const button = (name) => page.getByRole('button', { name, exact: true });
  const click = async (name) => button(name).click();
  const choose = async (name, value) => {
    await page.getByRole('combobox', { name, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  };
  const ready = async () => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Loading example.', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
  };
  const go = async (route) => {
    check(
      (await page.goto(origin + '/patterns/' + route + '/')).status() === 200,
      route + ': direct navigation 200',
    );
    await ready();
  };
  const shot = async (name) => {
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({ path: output + '/' + group + '-' + name + '.png', fullPage: true });
  };
  const condition = async (name) => {
    const result = await audit(page);
    const entry = { name, ...result };
    conditions.push(entry);
    check(!result.horizontalOverflow, name + ': no overflow');
    check(!result.violations.length, name + ': axe has no violations');
    const savedScroll = await page.evaluate(() => ({
      page: window.scrollY,
      history: document.querySelector('[aria-label="Conversation history"]')?.scrollTop,
    }));
    const followups = [];
    const unresolved = [];
    for (const item of result.incomplete) {
      if (item.id === 'aria-hidden-focus' && (await page.getByRole('dialog').count()) === 1) {
        const traversal = [];
        for (const direction of ['Tab', 'Shift+Tab']) {
          for (let step = 0; step < 12; step++) {
            await page.keyboard.press(direction);
            traversal.push({
              direction,
              contained: await page
                .getByRole('dialog')
                .evaluate((e) => e.contains(document.activeElement)),
            });
          }
        }
        const contained = traversal.every((step) => step.contained);
        followups.push({
          rule: item.id,
          method: 'Check24 forward/backward keyboard moves while Radix hides background content.',
          traversal,
        });
        if (!contained) unresolved.push({ rule: item.id, traversal });
        continue;
      }
      if (item.id !== 'color-contrast') {
        unresolved.push(item);
        continue;
      }
      for (const node of item.nodes) {
        const target = page.locator(node.target.join(' ')).last();
        await target.evaluate((element) =>
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }),
        );
        const followup = await target.evaluate(async (element) => {
          const result = await window.axe.run(element, {
            runOnly: { type: 'rule', values: ['color-contrast'] },
          });
          return {
            violations: result.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
            })),
            incomplete: result.incomplete.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
            })),
            passedRules: result.passes.length,
          };
        });
        followups.push({
          target: node.target,
          method:
            'Scroll the clipped transcript node into view, then run axe color-contrast on that visible node.',
          ...followup,
        });
        if (followup.violations.length || followup.incomplete.length || !followup.passedRules)
          unresolved.push({ target: node.target, ...followup });
      }
    }
    await page.evaluate((saved) => {
      const history = document.querySelector('[aria-label="Conversation history"]');
      if (history && saved.history !== undefined) history.scrollTop = saved.history;
      window.scrollTo({ top: saved.page, behavior: 'instant' });
    }, savedScroll);
    entry.contrastFollowups = followups;
    entry.unresolved = unresolved;
    check(!unresolved.length, name + ': contrast checks resolve after revealing clipped text');
    check((await page.locator('h1').count()) === 1, name + ': one page heading');
    const layout = await page.evaluate(() => {
      const recipe = document.querySelector('main section[aria-label$="recipe"]');
      const firstClaim = document.querySelector('[data-claim-id]');
      const history = document.querySelector('[role="region"][aria-label="Conversation history"]');
      const firstMessage = history?.querySelector('p');
      const composer = document.querySelector('textarea[aria-label="Message"]');
      const recovery = document.querySelector('aside[aria-label="Recovery status"]');
      const rect = (element) =>
        element
          ? (() => {
              const r = element.getBoundingClientRect();
              return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
            })()
          : null;
      const header = document.querySelector('.web-header');
      return {
        pageHeight: document.documentElement.scrollHeight,
        recipe: rect(recipe),
        firstClaim: rect(firstClaim),
        firstMessage: rect(firstMessage),
        composer: rect(composer),
        recovery: rect(recovery),
        header: rect(header),
        visibleRecipeButtons: [...(recipe?.querySelectorAll('button') || [])].filter(
          (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden',
        ).length,
        canvas: getComputedStyle(document.querySelector('.unseen-web'))
          .getPropertyValue('--ai-canvas')
          .trim(),
      };
    });
    check(
      layout.header.x === 0 && Math.abs(layout.header.width - result.viewport.width) < 1,
      name + ': shared full-width header',
    );
    entry.layout = layout;
  };
  const focusGroup = async (name) => {
    const target = page.getByRole('group', { name, exact: true });
    await page.waitForFunction(
      (name) => document.activeElement?.getAttribute('aria-label') === name,
      name,
    );
    check(
      await target.evaluate((e) => e === document.activeElement),
      name + ': context keeps keyboard focus after step',
    );
  };
  const approveAccess = async () => {
    await click('Allow access');
    check(
      !(await button('Approve action').count()),
      'Host must acknowledge access before approval appears',
    );
    await click('Confirm access decision');
    await focusGroup('Action approval');
    check(
      (await button('Access decision details').getAttribute('aria-expanded')) === 'false',
      'Completed grant details are disclosed',
    );
    check(
      await page.getByText('Access granted:', { exact: true }).isVisible(),
      'Current access summary remains visible',
    );
  };
  try {
    const parts = group.split('-');
    const kind = parts[0],
      width = Number(parts[1]),
      appearance = parts[2];
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 960 });
    await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
    await page.goto(origin);
    await page.evaluate(
      ({ appearance, preferences }) => {
        localStorage.setItem('unseen-ui-appearance', appearance);
        if (preferences) localStorage.setItem('unseen-ui-theme', JSON.stringify(preferences.theme));
        else localStorage.removeItem('unseen-ui-theme');
      },
      { appearance, preferences: kind === 'custom' ? preferences : null },
    );
    if (kind === 'matrix' || kind === 'custom' || kind === 'touch') {
      for (const route of ['recoverable-chat', 'action-receipts', 'research-answers']) {
        await go(route);
        await condition(group + ' ' + route);
        if (kind === 'touch') {
          check(
            await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
            route + ': true coarse pointer',
          );
          if (route !== 'research-answers') await click('Simulated host controls');
          const sizes = await page.locator('main section[aria-label$="recipe"]').evaluate((e) =>
            [...e.querySelectorAll('button,summary')]
              .filter((b) => b.getClientRects().length)
              .map((b) => ({
                text: b.textContent.trim(),
                height: b.getBoundingClientRect().height,
              })),
          );
          check(
            sizes.every((b) => b.height >= 44),
            route + ': all visible button/disclosure touch heights >=44px',
          );
          if (route !== 'research-answers') await click('Simulated host controls');
        }
        if (width === 390 || width === 1440) await shot(route);
        if (kind === 'custom')
          check(
            (await page
              .locator('.unseen-web')
              .evaluate((e) => getComputedStyle(e).getPropertyValue('--ai-canvas').trim())) ===
              (appearance === 'light' ? '#f4f7f1' : '#101810'),
            route + ': edited palette is inherited',
          );
        if (route !== 'research-answers') {
          check(
            (await button('Simulated host controls').getAttribute('aria-expanded')) === 'false',
            route + ': optional host controls start closed',
          );
        } else {
          check(
            await page
              .getByRole('status', { name: 'Research evidence update' })
              .textContent()
              .then((t) => t.includes('2 of 3')),
            'Coverage is explicit',
          );
          check(
            await page
              .getByText('The resolution-time claim has no available supporting excerpt.', {
                exact: false,
              })
              .isVisible(),
            'Unsupported outcome stays visible',
          );
        }
      }
    }
    if (kind === 'flow') {
      await go('recoverable-chat');
      const history = page.getByRole('region', { name: 'Conversation history' });
      const draft = page.getByRole('textbox', { name: 'Message', exact: true });
      await draft.fill('Keep this draft through recovery.');
      await click('Simulated host controls');
      await history.evaluate((e) => {
        e.scrollTop = 120;
      });
      await button('Deliver next output').focus();
      await page.keyboard.press('Enter');
      check(
        (await history.evaluate((e) => e.scrollTop)) === 120,
        'New output does not move reading position',
      );
      check(
        await button('Deliver next output').evaluate((e) => e === document.activeElement),
        'Output delivery retains control focus',
      );
      await click('Disconnect transport');
      check(
        (await draft.inputValue()) === 'Keep this draft through recovery.',
        'Disconnect retains editable draft',
      );
      if (width === 390) {
        const statusBox = await page
          .getByRole('complementary', { name: 'Recovery status' })
          .boundingBox();
        const historyBox = await history.boundingBox();
        check(statusBox.y < historyBox.y, 'Mobile connection recovery precedes history and draft');
      }
      await click('Refresh snapshot');
      await click('Fail snapshot refresh');
      check(
        await page
          .locator('main')
          .getByRole('alert')
          .textContent()
          .then((t) => t.includes('snapshot refresh failed')),
        'Failed refresh remains explicit',
      );
      await condition(group + ' chat failed refresh');
      await shot('chat-failed-refresh');
      await click('Refresh snapshot');
      await click('Deliver refreshed snapshot');
      await choose('Next request acknowledgement', 'Lose acknowledgement');
      await click('Stop response');
      await click('Deliver request result');
      check(
        await page.getByText('Outcome unknown', { exact: true }).isVisible(),
        'Stop acknowledgement loss remains unknown',
      );
      await click('Simulated host controls');
      check(
        await button('Look up original receipt').isVisible(),
        'Essential chat receipt lookup stays outside host disclosure',
      );
      await condition(group + ' chat unknown stop');
      await shot('chat-unknown-stop');
      await click('Look up original receipt');
      await focusGroup('Original request');
      check(
        await page.getByText('Received by host', { exact: true }).isVisible(),
        'Receipt acknowledgement is separate from stop execution',
      );
      check(
        !(await page.getByText('Stopped by host', { exact: true }).count()),
        'Acknowledgement does not invent a stopped outcome',
      );
      await click('Simulated host controls');
      await click('Apply received request');
      check(
        await page.getByText('Stopped by host', { exact: true }).isVisible(),
        'Stop execution is explicit',
      );
      await choose('Next request acknowledgement', 'Reject request');
      await click('Retry as new attempt');
      await click('Deliver request result');
      check(
        await button('Retry as new attempt').isEnabled(),
        'Rejected retry leaves recovery available',
      );
      await choose('Next request acknowledgement', 'Deliver acknowledgement');
      await click('Continue in new attempt');
      await click('Deliver request result');
      await click('Apply received request');
      check(await page.getByText(/Attempt 2/).isVisible(), 'Continuation creates another attempt');
      check(
        (await draft.inputValue()) === 'Keep this draft through recovery.',
        'Recovery and new attempt retain draft',
      );
      await click('Replay last event');
      check(
        await page.getByText(/Attempt 2/).isVisible(),
        'Repeated event does not create another attempt',
      );
      await click('Fail response');
      check(
        await history
          .getByRole('alert')
          .textContent()
          .then((t) => t.includes('Received content retained')),
        'Failed response retains output',
      );
      await condition(group + ' chat failed response');
      await shot('chat-failed-response');
      await click('Jump to latest');
      check(
        await history.evaluate((e) => e === document.activeElement),
        'Explicit jump returns focus to history',
      );
      await condition(group + ' chat latest focus');

      await go('action-receipts');
      await approveAccess();
      await condition(group + ' actions approval ready');
      await shot('actions-approval-ready');
      await button('Approve action').focus();
      await page.keyboard.press('Enter');
      await click('Accept decision');
      await focusGroup('Action approval');
      await click('Start simulated execution');
      await click('Complete execution');
      await focusGroup('Command receipts');
      check(
        (await page.getByText('AC-104: applied', { exact: true }).isVisible()) &&
          (await page.getByText('AC-108: applied', { exact: true }).isVisible()),
        'Happy action shows both acknowledged effects',
      );
      check(
        await button('Start simulated execution').isDisabled(),
        'Successful action cannot execute twice',
      );
      await condition(group + ' actions succeeded');
      await click('Start a new simulation');
      await approveAccess();
      await click('Approve action');
      await click('Simulated host controls');
      await click('Lose decision acknowledgement');
      await click('Simulate receipt not found');
      await click('Simulated host controls');
      check(
        await button('Check decision status').isVisible(),
        'Unknown decision recovery stays in approval',
      );
      check(
        await button('Start simulated execution').isDisabled(),
        'Unknown decision blocks execution',
      );
      await condition(group + ' actions unknown decision');
      await click('Check decision status');
      await click('Start simulated execution');
      await click('Simulated host controls');
      await click('Lose result acknowledgement');
      await click('Simulated host controls');
      check(
        await page
          .getByText('Execution outcome unknown. Look up the original receipt.', { exact: true })
          .isVisible(),
        'Unknown execution is explicit',
      );
      check(
        await button('Look up original execution receipt').isVisible(),
        'Essential execution lookup stays outside fault disclosure',
      );
      await condition(group + ' actions unknown execution');
      await shot('actions-unknown-execution');
      await click('Look up original execution receipt');
      await focusGroup('Command receipts');
      check(
        await page
          .getByText(/Simulated executions:/)
          .textContent()
          .then((t) => t.trim() === 'Simulated executions: 1'),
        'Lookup retains one execution',
      );
      await click('Start a new simulation');
      await approveAccess();
      await click('Approve action');
      await click('Accept decision');
      await click('Start simulated execution');
      await click('Simulated host controls');
      await click('Report partial failure');
      await click('Simulated host controls');
      check(
        (await page.getByText('AC-104: applied', { exact: true }).isVisible()) &&
          (await page.getByText('AC-108: failed', { exact: true }).isVisible()),
        'Partial failure keeps individual effects',
      );
      check(
        await page
          .locator('main')
          .getByRole('alert')
          .textContent()
          .then((t) => t.includes('Partial failure')),
        'Partial failure remains explicit',
      );
      await condition(group + ' actions partial failure');
      await shot('actions-partial-failure');
      await click('Start a new simulation');
      await approveAccess();
      await click('Approve action');
      await click('Simulated host controls');
      await click('Change requested scope');
      await click('Simulated host controls');
      await click('Accept decision');
      await click('Inspect exact original binding');
      check(
        await page.getByText('accounts:archive / access-3', { exact: true }).isVisible(),
        'Rejected original exact binding remains available',
      );
      await condition(group + ' actions stale scope');
      await click('Review current action');
      await focusGroup('Action review');
      check(
        await page
          .getByText('Requested access: accounts:archive, accounts:export', { exact: true })
          .isVisible(),
        'Replacement requires expanded access review',
      );

      await go('research-answers');
      const citation = button('Source 1: Rollout memo');
      await citation.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Rollout memo', exact: true });
      check(
        await dialog
          .getByText(
            'The pilot includes two support teams. Expansion requires a separate review.',
            { exact: true },
          )
          .isVisible(),
        'Keyboard citation opens exact supplied excerpt',
      );
      await condition(group + ' research citation');
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Source 1: Rollout memo',
      );
      check(
        await citation.evaluate((e) => e === document.activeElement),
        'Citation Escape returns focus',
      );
      await click('Evidence for cohort');
      await click('Context and host responsibility');
      check(
        await page
          .getByRole('group', { name: 'Evidence', exact: true })
          .getByText('supports', { exact: true })
          .isVisible(),
        'Expanded evidence preserves supplied relationship',
      );
      check(
        await page.getByText('Context usage unknown', { exact: true }).isVisible(),
        'Context does not fabricate model inclusion',
      );
      await condition(group + ' research expanded');
      for (const label of [
        'Claim revised',
        'Source version changed',
        'Source missing',
        'Stale evidence',
        'Freshness unknown',
        'Host snapshot error',
      ]) {
        await choose('Supplied evidence state', label);
        const coverage = await page
          .getByRole('status', { name: 'Research evidence update' })
          .textContent();
        check(
          coverage.includes(
            label === 'Claim revised' ||
              label === 'Source version changed' ||
              label === 'Source missing'
              ? '1 of 3'
              : '0 of 3',
          ),
          label + ': current mapping count is honest',
        );
        await condition(group + ' research ' + label);
      }
      await page.getByText('Read supplied excerpt', { exact: true }).first().focus();
      await page.keyboard.press('Enter');
      check(
        await page
          .getByText(
            'The pilot includes two support teams. Expansion requires a separate review.',
            { exact: true },
          )
          .last()
          .isVisible(),
        'Host error preserves inspectable original excerpt',
      );
      await condition(group + ' research retained excerpt');
      await shot('research-host-error');
      await page.reload();
      await ready();
      check(
        await page
          .getByRole('status', { name: 'Research evidence update' })
          .textContent()
          .then((t) => t.includes('2 of 3')),
        'Reload resets the disclosed local fixture',
      );
    }
  } catch (error) {
    failures.push({ group, message: error.message });
  }
  if (touchContext) await touchContext.close();
  return {
    group,
    passed: !failures.length && !errors.length && !failedRequests.length,
    checks,
    conditions,
    failures,
    errors,
    failedRequests,
  };
}

try {
  await command(['open', origin, '--config=' + config, '--idle-timeout=600000']);
  const auditSource = (await readFile('scripts/audit-page.js', 'utf8')).replace(
    'incomplete: result.incomplete.map((v) => v.id)',
    'incomplete: result.incomplete.map((v) => ({id:v.id,nodes:v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary,any:n.any}))}))',
  );
  const preferences = JSON.parse(
    await readFile('output/playwright/unseen-site-theme/preferences.json', 'utf8'),
  );
  const groups = process.env.RECIPE_GROUP
    ? process.env.RECIPE_GROUP.split(',')
    : [
        ...[320, 390, 768, 1024, 1440].flatMap((width) =>
          ['light', 'dark'].map((theme) => 'matrix-' + width + '-' + theme),
        ),
        'flow-390-light',
        'flow-390-dark',
        'flow-1440-light',
        'flow-1440-dark',
        'touch-320-light',
        'touch-320-dark',
        'touch-390-light',
        'touch-390-dark',
        'custom-390-light',
        'custom-1440-dark',
      ];
  const reports = [];
  for (const group of groups) {
    const filename = resolve(output, 'review-' + group + '.js');
    await writeFile(
      filename,
      'async page=>{' +
        auditSource +
        ';return (' +
        review.toString() +
        ')(page,' +
        JSON.stringify({ origin, output: output.replaceAll('\\', '/'), group, preferences }) +
        ',audit);}',
    );
    const report = JSON.parse(await command(['run-code', '--filename=' + filename, '--raw']));
    reports.push(report);
    await writeFile(resolve(output, 'report-' + group + '.json'), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({
        group,
        passed: report.passed,
        checks: report.checks.length,
        conditions: report.conditions.length,
        failures: report.failures,
        errors: report.errors,
        failedRequests: report.failedRequests,
      }),
    );
    if (!report.passed) break;
  }
  const combined = {
    timestamp: new Date().toISOString(),
    passed: reports.every((r) => r.passed),
    checks: reports.flatMap((r) => r.checks),
    conditions: reports.flatMap((r) => r.conditions),
    failures: reports.flatMap((r) => r.failures),
    errors: reports.flatMap((r) => r.errors),
    failedRequests: reports.flatMap((r) => r.failedRequests),
  };
  await writeFile(
    resolve(output, process.env.RECIPE_GROUP ? 'selected-report.json' : 'report.json'),
    JSON.stringify(combined, null, 2),
  );
  if (!combined.passed) process.exitCode = 1;
} finally {
  try {
    await command(['close'], 10000);
  } catch (error) {
    const snapshot = await command(['snapshot'], 15000).catch(
      (error) => error.stdout || error.message,
    );
    const closed = snapshot.includes("The browser '" + session + "' is not open");
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
