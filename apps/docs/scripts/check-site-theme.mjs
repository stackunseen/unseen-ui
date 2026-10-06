import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, window, localStorage, getComputedStyle, navigator, HTMLInputElement, Event */

const output = resolve('output/playwright/unseen-site-theme');
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `unseen-site-theme-${process.pid}`;
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
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}

async function review(page, { origin, output, group, preferences }, audit) {
  const checks = [],
    conditions = [],
    failures = [],
    errors = [],
    failedRequests = [];
  page.setDefaultTimeout(8000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedRequests.push({ url: response.url(), status: response.status() });
  });
  const check = (passed, label) => {
    if (!passed) throw Error(label);
    checks.push(label);
  };
  const loaded = async () => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Loading example.', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
  };
  const screenshot = async (path) => {
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({ path, fullPage: true });
  };
  const go = async (route) => {
    const response = await page.goto(origin + route);
    check(response.status() === 200, `Direct navigation ${route} returns 200`);
    await loaded();
  };
  const choose = async (label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  const saved = () =>
    page.evaluate(() => ({
      theme: JSON.parse(localStorage.getItem('unseen-ui-theme')),
      appearance: localStorage.getItem('unseen-ui-appearance'),
      icons: localStorage.getItem('unseen-ui-icons'),
    }));
  const colors = () =>
    page.locator('.unseen-web').evaluate((element) => {
      const style = getComputedStyle(element);
      const header = getComputedStyle(element.querySelector('.web-header'));
      return {
        canvas: style.getPropertyValue('--ai-canvas').trim(),
        surface: style.getPropertyValue('--ai-surface').trim(),
        primary: style.getPropertyValue('--ai-primary').trim(),
        radius: style.getPropertyValue('--ai-control-radius').trim(),
        surfaceRadius: style.getPropertyValue('--ai-radius').trim(),
        width: header.borderBottomWidth,
        background: style.backgroundColor,
        headerBackground: header.backgroundColor,
        appearance: element.getAttribute('data-site-appearance'),
      };
    });
  const colorInput = async (label, color) =>
    page.getByLabel(label, { exact: true }).evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, color);
  const auditCondition = async (name) => {
    const result = await audit(page);
    const header = await page.locator('.web-header').boundingBox();
    check(!result.horizontalOverflow, `${name}: no horizontal document overflow`);
    check(!result.violations.length, `${name}: no axe violations`);
    check(
      header.x === 0 && Math.abs(header.width - result.viewport.width) < 1,
      `${name}: full-width shared header`,
    );
    check((await page.locator('h1').count()) === 1, `${name}: one semantic page heading`);
    conditions.push({ name, ...result, theme: await colors() });
  };
  const follow = async (link, route) => {
    await page.evaluate(() => {
      window.__themeVisit = 'retained';
    });
    await link.click();
    await page.waitForURL(origin + route);
    await loaded();
    check(
      await page.evaluate(() => window.__themeVisit === 'retained'),
      `${route}: client navigation preserves the site provider`,
    );
    const state = await colors();
    check(
      state.width === '2px' && state.radius === '0px',
      `${route}: edited borders and corners retained`,
    );
    check(
      state.canvas === '#f4f7f1' || state.canvas === '#101810',
      `${route}: edited appearance palette retained`,
    );
    check((await page.title()) !== '', `${route}: route title present`);
  };
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    if (preferences && group !== 'flow') {
      await go('/');
      await page.evaluate(({ theme, appearance, icons }) => {
        localStorage.setItem('unseen-ui-theme', JSON.stringify(theme));
        localStorage.setItem('unseen-ui-appearance', appearance);
        localStorage.setItem('unseen-ui-icons', icons);
      }, preferences);
    }
    if (group === 'flow') {
      await go('/customize/');
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      const defaults = await saved();
      await choose('Border width', /^2px/);
      await page.getByRole('button', { name: 'Corners & motion', exact: true }).click();
      await page.getByRole('slider', { name: 'Control corners', exact: true }).focus();
      await page.keyboard.press('Home');
      await colorInput('Surface corners', '20');
      await choose('Density', 'Compact');
      await choose('Component icons', /^Lucide/);
      await page.getByRole('button', { name: 'Backgrounds and text', exact: true }).click();
      await choose('Edit palette', 'Light');
      await colorInput('light page background', '#f4f7f1');
      await colorInput('light surface', '#fffefd');
      await choose('Edit palette', 'Dark');
      await colorInput('dark page background', '#101810');
      await colorInput('dark surface', '#182318');
      await page.getByRole('textbox', { name: 'Primary hex', exact: true }).fill('#166534');
      const configured = await saved();
      check(
        configured.theme.light.canvas === '#f4f7f1' && configured.theme.dark.canvas === '#101810',
        'Brand edit preserves both individually edited palettes',
      );
      check(
        configured.theme.light.surface === '#fffefd' && configured.theme.dark.surface === '#182318',
        'Brand edit preserves both custom surfaces',
      );
      check(
        JSON.stringify(configured.theme.light.success) ===
          JSON.stringify(defaults.theme.light.success),
        'Status colors keep their meaning',
      );
      await auditCondition('configured Theme Studio');
      const primary = page.getByRole('button', { name: 'Primary action', exact: true });
      check(
        (await primary.evaluate((e) => getComputedStyle(e).borderRadius)) === '0px',
        'A real preview button adopts square corners',
      );
      await page.getByRole('button', { name: 'Preview dialog', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Surface preview', exact: true });
      check(
        (await dialog.evaluate((e) =>
          getComputedStyle(e).getPropertyValue('--ai-surface').trim(),
        )) === '#fffefd',
        'Portal dialog inherits the customized site surface',
      );
      check(
        (await dialog.evaluate((e) => getComputedStyle(e).borderRadius)) === '20px',
        'Portal dialog inherits surface corners',
      );
      await page.keyboard.press('Escape');
      check(
        await page
          .getByRole('button', { name: 'Preview dialog', exact: true })
          .evaluate((e) => e === document.activeElement),
        'Dialog Escape restores its trigger focus',
      );
      await screenshot(`${output}/theme-configured-1440.png`);
      await follow(
        page
          .getByRole('navigation', { name: 'Try your theme across the site' })
          .getByRole('link', { name: 'View homepage' }),
        '/',
      );
      await page.getByRole('button', { name: 'Forest primary', exact: true }).click();
      check(
        (await saved()).theme.light.canvas === '#f4f7f1',
        'Homepage primary shortcut preserves custom surfaces',
      );
      check(
        await page.getByText(/Screenshot in the sample theme/).isVisible(),
        'Homepage explains that template images use sample colors',
      );
      await screenshot(`${output}/home-configured-1440.png`);
      await follow(
        page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: 'Components', exact: true }),
        '/components/',
      );
      check(
        (await page
          .locator('.directory-search')
          .evaluate((e) => getComputedStyle(e).borderWidth)) === '2px',
        'Catalog search adopts the edited border width',
      );
      await follow(
        page.locator('.directory-group a[href="/components/button/"]').first(),
        '/components/button/',
      );
      await follow(
        page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: 'Templates', exact: true }),
        '/templates/',
      );
      await follow(
        page.locator('main a[href="/templates/saas-admin/"]').first(),
        '/templates/saas-admin/',
      );
      check(
        (await page
          .getByRole('combobox', { name: 'Organization', exact: true })
          .evaluate((e) => getComputedStyle(e).borderRadius)) === '0px',
        'Live SaaS template control adopts the site corners',
      );
      await auditCondition('configured SaaS template');
      await page.goBack();
      await loaded();
      await follow(
        page.locator('main a[href="/templates/marketing/"]').first(),
        '/templates/marketing/',
      );
      await auditCondition('configured marketing template');
      await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
      check(
        (await colors()).canvas === '#101810',
        'Dark appearance uses its independently configured canvas',
      );
      await screenshot(`${output}/marketing-configured-dark-1440.png`);
      await follow(
        page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: 'Theme Studio', exact: true }),
        '/customize/',
      );
      check(
        (await saved()).theme.light.canvas === '#f4f7f1',
        'Changing appearance preserves the other palette',
      );
      await page.reload();
      await loaded();
      check(
        (await colors()).canvas === '#101810' && (await colors()).width === '2px',
        'Direct refresh restores theme preferences without hydration errors',
      );
      preferences = await saved();
    } else if (group === 'export') {
      await go('/customize/');
      const before = await saved();
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async () => {
              throw Error('Test clipboard denied');
            },
          },
        });
      });
      await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
      check(
        JSON.stringify(
          JSON.parse(
            await page.getByRole('textbox', { name: 'JSON export', exact: true }).inputValue(),
          ),
        ) === JSON.stringify(before.theme),
        'JSON fallback matches both complete resolved palettes',
      );
      await page.getByRole('button', { name: 'Copy CSS', exact: true }).click();
      const css = await page.getByRole('textbox', { name: 'CSS export', exact: true }).inputValue();
      check(
        css.includes('--ai-canvas:#101810') &&
          css.includes('--ai-border-width:2px') &&
          css.includes('[data-ai-theme="brand"]'),
        'CSS fallback matches the selected dark palette and geometry',
      );
      await page.getByRole('button', { name: 'Copy TypeScript', exact: true }).click();
      const ts = await page
        .getByRole('textbox', { name: 'TypeScript export', exact: true })
        .inputValue();
      check(
        ts.includes('@stackunseen/ui/theme') && ts.includes('#f4f7f1') && ts.includes('#101810'),
        'TypeScript export includes the actual palettes and import API',
      );
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download JSON', exact: true }).click(),
      ]);
      check(
        download.suggestedFilename() === 'ai-theme.json',
        'Download uses the documented configuration filename',
      );
      await download.saveAs(`${output}/downloaded-theme.json`);
      await page.getByRole('button', { name: 'Import a theme', exact: true }).click();
      await page.getByRole('textbox', { name: 'Theme JSON', exact: true }).fill('invalid');
      await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
      check(
        JSON.stringify(await saved()) === JSON.stringify(before),
        'Invalid JSON leaves preferences untouched',
      );
      await page
        .getByRole('textbox', { name: 'Theme JSON', exact: true })
        .fill(JSON.stringify(before.theme));
      await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
      check(
        JSON.stringify(await saved()) === JSON.stringify(before),
        'Import round-trips both palettes and geometry',
      );
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      const reset = await saved();
      check(
        reset.appearance === 'light' &&
          reset.icons === 'default' &&
          reset.theme.seeds.borderWidth === 1 &&
          reset.theme.light.surface === '#ffffff',
        'Reset restores the established theme, appearance and icon defaults',
      );
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      check(
        JSON.stringify(await saved()) === JSON.stringify(before),
        'Undo restores the complete previous preference snapshot',
      );
      await page.getByRole('button', { name: 'Cobalt', exact: true }).click();
      check(
        (await saved()).theme.light.surface === '#ffffff',
        'Preset deliberately starts a fresh palette',
      );
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      check(
        JSON.stringify(await saved()) === JSON.stringify(before),
        'Undo recovers customized surfaces after a preset',
      );
      preferences = await saved();
    } else if (group.startsWith('taxonomy-')) {
      const entries =
        group === 'taxonomy-application'
          ? [
              ['PageHeader', 'page-header'],
              ['OrgSwitcher', 'org-switcher'],
              ['ListToolbar', 'list-toolbar'],
              ['MasterDetail', 'master-detail'],
              ['SettingsSaveCancel', 'settings-save-cancel'],
              ['UnsavedGuard', 'unsaved-guard'],
            ]
          : [
              ['MarketingHeader', 'marketing-header'],
              ['MarketingFooter', 'marketing-footer'],
              ['MarketingHero', 'marketing-hero'],
              ['MarketingFeatures', 'marketing-features'],
              ['MarketingPricing', 'marketing-pricing'],
              ['MarketingFAQ', 'marketing-faq'],
              ['MarketingContact', 'marketing-contact'],
              ['MarketingArticle', 'marketing-article'],
            ];
      for (const [name, slug] of entries) {
        await page.setViewportSize({
          width: name === 'MasterDetail' || name === 'MarketingHeader' ? 390 : 1440,
          height: 960,
        });
        await go(`/components/${slug}/`);
        const specimen = page.locator('.detail-specimen');
        check(await specimen.isVisible(), `${name}: actual specimen rendered`);
        if (name === 'OrgSwitcher') {
          await choose('Organization', 'Fieldwork');
          check(
            (await specimen
              .getByRole('combobox', { name: 'Organization', exact: true })
              .innerText()) === 'Fieldwork',
            'OrgSwitcher requests a controlled Select value',
          );
        } else if (name === 'ListToolbar') {
          await specimen
            .getByRole('searchbox', { name: 'Find customers', exact: true })
            .fill('Avery');
          check(
            await specimen.getByText('1 matching sample customers', { exact: true }).isVisible(),
            'ListToolbar reports a supplied search summary',
          );
        } else if (name === 'MasterDetail') {
          await specimen.getByRole('button', { name: 'Avery Chen', exact: true }).click();
          check(
            await specimen
              .getByRole('region', { name: 'Customer details', exact: true })
              .isVisible(),
            'MasterDetail changes the controlled mobile pane',
          );
          await specimen.getByRole('button', { name: 'Back to customers', exact: true }).click();
          await page.waitForFunction(() => document.activeElement?.textContent === 'Customers');
          check(
            await specimen
              .getByRole('heading', { name: 'Customers', exact: true })
              .evaluate((e) => e === document.activeElement),
            'MasterDetail specimen host restores list-heading focus',
          );
        } else if (name === 'SettingsSaveCancel') {
          await specimen
            .getByRole('textbox', { name: 'Organization name', exact: true })
            .fill('New local name');
          await specimen.getByRole('button', { name: 'Save changes', exact: true }).click();
          check(
            await specimen.getByText('Saved to local example state.', { exact: true }).isVisible(),
            'Save footer submits the host form',
          );
          await choose('Fixture state', 'Unknown');
          check(
            await specimen.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(),
            'Unknown save blocks cancellation',
          );
          check(
            (await specimen.getByRole('button', { name: 'Save changes', exact: true }).count()) ===
              0,
            'Unknown save removes the mutation submit action',
          );
          await specimen
            .getByRole('button', { name: 'Check original receipt', exact: true })
            .click();
          check(
            await specimen
              .getByText('Original sample receipt lookup requested. No mutation was resent.', {
                exact: true,
              })
              .isVisible(),
            'Unknown specimen emits only a lookup request',
          );
        } else if (name === 'UnsavedGuard') {
          await specimen.getByRole('button', { name: 'Leave this draft', exact: true }).click();
          check(
            await page
              .getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
              .isVisible(),
            'UnsavedGuard composes the existing alert dialog',
          );
          await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
          check(
            await specimen.getByText('Kept the local draft.', { exact: true }).isVisible(),
            'UnsavedGuard emits the host keep-editing decision',
          );
        } else if (name === 'MarketingHeader') {
          await specimen.getByRole('button', { name: 'Menu', exact: true }).click();
          check(
            await specimen
              .getByRole('navigation', { name: 'Sample website', exact: true })
              .isVisible(),
            'MarketingHeader opens a real mobile menu',
          );
          await specimen.getByRole('link', { name: 'Browse blocks', exact: true }).focus();
          await page.keyboard.press('Escape');
          check(
            await specimen
              .getByRole('button', { name: 'Menu', exact: true })
              .evaluate((e) => e === document.activeElement),
            'MarketingHeader Escape closes the menu and restores focus',
          );
        } else if (name === 'MarketingFAQ') {
          await specimen
            .getByRole('button', { name: 'Is this a working service?', exact: true })
            .click();
          check(
            await specimen
              .getByText(
                'This is a local component example. It does not create accounts or send requests.',
                { exact: true },
              )
              .isVisible(),
            'MarketingFAQ exposes the existing Accordion behavior',
          );
        } else if (name === 'MarketingPricing') {
          await specimen.getByRole('button', { name: 'Select sample plan', exact: true }).click();
          check(
            await specimen
              .getByText('Selected the sample plan. No subscription or payment was created.', {
                exact: true,
              })
              .isVisible(),
            'MarketingPricing uses the supplied host action',
          );
        } else if (name === 'MarketingContact') {
          await specimen
            .getByRole('textbox', { name: 'Email', exact: true })
            .fill('sample@example.test');
          await specimen.getByRole('textbox', { name: 'Message', exact: true }).fill('Local draft');
          await specimen.getByRole('button', { name: 'Save local draft', exact: true }).click();
          check(
            await specimen
              .getByText('Saved the contact draft in this page. Nothing was sent.', { exact: true })
              .first()
              .isVisible(),
            'MarketingContact submits the supplied native form handler',
          );
        }
        conditions.push({
          name,
          route: `/components/${slug}/`,
          previewText: await specimen.innerText(),
          width: page.viewportSize().width,
        });
        await specimen.screenshot({ path: `${output}/taxonomy-${slug}.png` });
      }
    } else if (group === 'storage') {
      await go('/customize/');
      await page.evaluate(() => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          value: {
            getItem: () => {
              throw Error('Denied');
            },
            setItem: () => {
              throw Error('Denied');
            },
          },
        });
      });
      await page.getByRole('textbox', { name: 'Primary hex', exact: true }).fill('#92400e');
      const before = await colors();
      await follow(
        page
          .getByRole('navigation', { name: 'Try your theme across the site' })
          .getByRole('link', { name: 'View homepage' }),
        '/',
      );
      check(
        (await colors()).primary === before.primary,
        'Client navigation keeps the live theme when persistence is unavailable',
      );
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          value: {
            getItem: () => {
              throw Error('Denied at boot');
            },
            setItem: () => {
              throw Error('Denied at boot');
            },
          },
        });
      });
      await page.reload();
      await loaded();
      const boot = await colors();
      check(
        boot.appearance === 'light' && boot.width === '1px',
        'Storage denied at boot still renders a usable default theme',
      );
      await page.getByRole('button', { name: 'Rose primary', exact: true }).click();
      const edited = await colors();
      check(edited.primary !== boot.primary, 'Theme edits work after storage is denied at boot');
      await page.getByRole('link', { name: 'Open Theme Studio', exact: true }).click();
      await page.waitForURL(origin + '/customize/');
      await loaded();
      check(
        (await colors()).primary === edited.primary,
        'Boot-denied storage does not lose the live theme during navigation',
      );
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      check((await colors()).primary === boot.primary, 'Reset works without browser storage');
      await auditCondition('storage unavailable from first mount');
    } else {
      const [widthText, appearance] = group.split('-');
      const width = Number(widthText);
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
      await go('/');
      await page.evaluate(
        ({ theme, icons, appearance }) => {
          localStorage.setItem('unseen-ui-theme', JSON.stringify(theme));
          localStorage.setItem('unseen-ui-icons', icons);
          localStorage.setItem('unseen-ui-appearance', appearance);
        },
        { ...preferences, appearance },
      );
      for (const route of [
        '/customize/',
        '/',
        '/components/',
        '/components/input/',
        '/templates/saas-admin/',
        '/templates/marketing/',
      ]) {
        await go(route);
        check(
          (await colors()).canvas === (appearance === 'light' ? '#f4f7f1' : '#101810'),
          `${route}: direct route restores the correct ${appearance} palette`,
        );
        await auditCondition(`${width} ${appearance} ${route}`);
        if (route === '/customize/' || (width === 390 && route === '/'))
          await screenshot(
            `${output}/${width}-${appearance}-${route === '/' ? 'home' : 'theme'}.png`,
          );
      }
      if (width <= 390) {
        const menu = page.getByRole('button', { name: 'Open site menu', exact: true });
        await menu.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          () => document.querySelector('.web-nav a') === document.activeElement,
        );
        check(
          await page
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Components', exact: true })
            .evaluate((e) => e === document.activeElement),
          'Keyboard opening the site menu focuses its first link',
        );
        await page.keyboard.press('Escape');
        check(
          await menu.evaluate((e) => e === document.activeElement),
          'Menu Escape restores the menu trigger',
        );
        await menu.click();
        await follow(
          page
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Theme Studio', exact: true }),
          '/customize/',
        );
        check(
          (await page
            .getByRole('button', { name: 'Open site menu', exact: true })
            .getAttribute('aria-expanded')) === 'false',
          'Client navigation closes the mobile site menu',
        );
        await page.getByRole('textbox', { name: 'Primary hex', exact: true }).focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        check(
          (await page
            .getByRole('textbox', { name: 'Primary hex', exact: true })
            .evaluate((e) => getComputedStyle(e).outlineStyle)) !== 'none',
          'Hex field has a visible keyboard focus outline',
        );
      }
    }
  } catch (error) {
    failures.push({ group, message: error.message });
  }
  return {
    passed: !failures.length && !errors.length && !failedRequests.length,
    group,
    checks,
    conditions,
    failures,
    errors,
    failedRequests,
    preferences,
  };
}

try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const auditSource = await readFile('scripts/audit-page.js', 'utf8');
  const groups = process.env.SITE_THEME_GROUP
    ? process.env.SITE_THEME_GROUP.split(',')
    : [
        'flow',
        'export',
        '320-light',
        '390-dark',
        '768-light',
        '1024-dark',
        '1440-light',
        '1440-dark',
        'taxonomy-application',
        'taxonomy-marketing',
        'storage',
      ];
  let preferences = JSON.parse(
    await readFile(resolve(output, 'preferences.json'), 'utf8').catch(() => 'null'),
  );
  const reports = [];
  for (const group of groups) {
    const filename = resolve(output, `review-${group}.js`);
    await writeFile(
      filename,
      `async page=>{${auditSource};return (${review.toString()})(page,${JSON.stringify({ origin, output: output.replaceAll('\\', '/'), group, preferences })},audit);}`,
    );
    const report = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw']));
    reports.push(report);
    await writeFile(resolve(output, `report-${group}.json`), JSON.stringify(report, null, 2));
    if (report.preferences) {
      preferences = report.preferences;
      await writeFile(resolve(output, 'preferences.json'), JSON.stringify(preferences, null, 2));
    }
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
    passed: reports.every((r) => r.passed),
    checks: reports.flatMap((r) => r.checks),
    conditions: reports.flatMap((r) => r.conditions),
    failures: reports.flatMap((r) => r.failures),
    errors: reports.flatMap((r) => r.errors),
    failedRequests: reports.flatMap((r) => r.failedRequests),
  };
  await writeFile(
    resolve(output, process.env.SITE_THEME_GROUP ? 'selected-report.json' : 'report.json'),
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
