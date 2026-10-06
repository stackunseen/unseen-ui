import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
/* global document, localStorage, getComputedStyle, innerWidth, scrollTo */

// Rendered color and interaction checks complement the site's axe/route checks.
const output = resolve('output/playwright/unseen-visibility');
await mkdir(output, { recursive: true });
const origin = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4175';
const session = `unseen-visibility-${process.pid}`;
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
    maxBuffer: 4_000_000,
    windowsHide: true,
  });
  commands.push({ args, stdout: result.stdout, stderr: result.stderr });
  return result.stdout;
}

function sample(node) {
  const rgb = (color) => {
    const values = color.match(/[\d.]+/g) || [];
    return [Number(values[0]), Number(values[1]), Number(values[2]), Number(values[3] ?? 1)];
  };
  const composite = (front, back) =>
    front.map((value, index) => (index < 3 ? value * front[3] + back[index] * (1 - front[3]) : 1));
  const background = (element) => {
    if (!element) return [255, 255, 255, 1];
    const color = rgb(getComputedStyle(element).backgroundColor);
    return color[3] === 1 ? color : composite(color, background(element.parentElement));
  };
  const luminance = (color) =>
    color
      .slice(0, 3)
      .map((value) => value / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = (front, back) => {
    const a = luminance(composite(front, back));
    const b = luminance(back);
    return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(3));
  };
  const style = getComputedStyle(node);
  const surface = background(node);
  const outer = background(node.parentElement);
  const placeholder = getComputedStyle(node, '::placeholder');
  const shadowColor = style.boxShadow.match(/rgba?\([^)]*\)/)?.[0];
  return {
    label:
      node.getAttribute('aria-label') ||
      node.labels?.[0]?.textContent.trim() ||
      node.textContent.trim().slice(0, 90) ||
      node.getAttribute('placeholder'),
    classes: node.className,
    role: node.getAttribute('role'),
    disabled: node.matches(':disabled,[aria-disabled="true"]'),
    surface,
    outer,
    color: style.color,
    textContrast: contrast(rgb(style.color), surface),
    placeholder: node.getAttribute('placeholder'),
    placeholderColor: placeholder.color,
    placeholderContrast: contrast(rgb(placeholder.color), surface),
    borderColor: style.borderTopColor,
    borderWidth: Number.parseFloat(style.borderTopWidth),
    borderStyle: style.borderTopStyle,
    borderContrast: contrast(rgb(style.borderTopColor), outer),
    bottomWidth: Number.parseFloat(style.borderBottomWidth),
    bottomContrast: contrast(rgb(style.borderBottomColor), surface),
    outlineColor: style.outlineColor,
    outlineWidth: Number.parseFloat(style.outlineWidth),
    outlineStyle: style.outlineStyle,
    outlineOffset: Number.parseFloat(style.outlineOffset),
    outlineContrast: contrast(rgb(style.outlineColor), outer),
    shadow: style.boxShadow,
    shadowContrast: shadowColor ? contrast(rgb(shadowColor), surface) : null,
    decoration: style.textDecorationLine,
    background: style.backgroundColor,
    focused: node === document.activeElement,
    focusVisible: node.matches(':focus-visible'),
    pressed: node.getAttribute('aria-pressed'),
    selected: node.getAttribute('aria-selected'),
    opacity: style.opacity,
    height: node.getBoundingClientRect().height,
    lineHeight: style.lineHeight,
    resize: style.resize,
  };
}

async function journeys(page, { origin, output }, sample) {
  const records = [],
    failures = [],
    errors = [];
  let assertions = 0;
  page.setDefaultTimeout(7000);
  page.on('pageerror', (error) => errors.push(error.message));
  const assert = (condition, message) => {
    assertions++;
    if (!condition) throw new Error(message);
  };
  const measure = (locator) => locator.evaluate(sample);
  const keyboardFocus = async (locator) => {
    await locator.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const value = await measure(locator);
    assert(value.focused && value.focusVisible, `${value.label}: keyboard focus`);
  };
  const searchStates = async (wrapper, input, record, name) => {
    await page.mouse.move(0, 0);
    await input.evaluate((node) => node.blur());
    const rest = await measure(wrapper);
    const text = await measure(input);
    assert(
      rest.borderWidth >= 1 && rest.borderStyle === 'solid',
      `${name}: visible resting border`,
    );
    assert(rest.borderContrast >= 3, `${name}: boundary contrast ${rest.borderContrast}`);
    assert(text.textContrast >= 4.5, `${name}: typed text contrast ${text.textContrast}`);
    assert(
      text.placeholderContrast >= 4.5,
      `${name}: placeholder contrast ${text.placeholderContrast}`,
    );
    const icon = await measure(wrapper.locator('svg').first());
    assert(icon.textContrast >= 3, `${name}: search icon contrast ${icon.textContrast}`);
    await wrapper.hover();
    const hover = await measure(wrapper);
    assert(
      hover.borderColor !== rest.borderColor && hover.borderContrast >= 3,
      `${name}: visible hover`,
    );
    await keyboardFocus(input);
    const focus = await measure(wrapper);
    const inner = await measure(input);
    assert(
      focus.outlineWidth === 2 && focus.outlineStyle === 'solid' && focus.outlineOffset === -1,
      `${name}: single aligned focus ring`,
    );
    assert(focus.outlineContrast >= 3, `${name}: focus contrast ${focus.outlineContrast}`);
    assert(
      inner.outlineStyle === 'none' || inner.outlineWidth === 0,
      `${name}: no nested input outline`,
    );
    record.states.push({ name, rest, text, icon, hover, focus, inner });
  };
  const routes = [
    ['home', '/'],
    ['index', '/components/'],
    ['detail', '/components/input/'],
    ['docs', '/docs/'],
    ['templates', '/templates/'],
    ['customize', '/customize/'],
    ['coding', '/patterns/coding-studio/'],
  ];
  for (const width of [320, 390, 1440]) {
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
      await page.goto(origin);
      await page.evaluate((mode) => {
        localStorage.clear();
        localStorage.setItem('unseen-ui-appearance', mode);
      }, mode);
      for (const [name, route] of routes) {
        const record = { name, route, width, mode, controls: [], states: [] };
        records.push(record);
        try {
          await page.goto(origin + route);
          await page.waitForFunction(() => {
            const headings = document.querySelectorAll('h1');
            return headings.length === 1 && headings[0].getBoundingClientRect().height > 0;
          });
          await page.locator('h1').waitFor({ state: 'visible' });
          if (name === 'customize') await page.locator('.theme-editor').waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.mouse.move(0, 0);
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${name}: no horizontal overflow`,
          );
          if (['detail', 'customize'].includes(name) && width < 780) {
            await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
          }
          const controls = page.locator(
            'input:not([type=checkbox]):not([type=range]):not([type=color]),textarea,[role=combobox],.home-finder-filters button,.directory-filters button,.home-accent-options button,[role=tab],.web-nav a,.web-footer nav a,.docs-links a strong,.pattern-list > a h2',
          );
          for (const control of await controls.all()) {
            if (!(await control.isVisible())) continue;
            const value = await measure(control);
            record.controls.push(value);
            if (value.disabled) continue;
            assert(
              value.textContrast >= 4.5,
              `${name}: ${value.label} text contrast ${value.textContrast}`,
            );
            if (value.placeholder)
              assert(
                value.placeholderContrast >= 4.5,
                `${name}: ${value.label} placeholder ${value.placeholderContrast}`,
              );
            if (
              value.borderWidth >= 1 &&
              value.borderStyle === 'solid' &&
              (await control.evaluate((node) => node.matches('input,textarea,[role=combobox]')))
            ) {
              assert(
                value.borderContrast >= 3,
                `${name}: ${value.label} field border ${value.borderContrast}`,
              );
            }
          }
          if (name === 'home' || name === 'index') {
            const wrapper = page.locator(name === 'home' ? '.home-search' : '.directory-search');
            await searchStates(wrapper, wrapper.locator('input'), record, `${name} search`);
            const filters = page.locator(
              name === 'home' ? '.home-finder-filters' : '.directory-filters',
            );
            const selected = filters.locator('button[aria-pressed="true"]');
            const active = await measure(selected);
            assert(
              active.shadow.includes('-2px') &&
                active.shadow.includes('inset') &&
                active.shadowContrast >= 3,
              `${name}: selected filter has a visible underline`,
            );
            const next = filters.getByRole('button', {
              name: name === 'home' ? 'UI · 44' : 'UI components',
              exact: true,
            });
            const before = await measure(next);
            await next.hover();
            const hovered = await measure(next);
            assert(
              hovered.background !== before.background || hovered.color !== before.color,
              `${name}: filter hover feedback`,
            );
            await keyboardFocus(next);
            const focused = await measure(next);
            assert(
              focused.outlineWidth >= 2 && focused.outlineContrast >= 3,
              `${name}: filter keyboard outline`,
            );
            await next.press('Enter');
            assert(
              (await next.getAttribute('aria-pressed')) === 'true',
              `${name}: filter keyboard activation`,
            );
            if (name === 'index')
              assert(
                (await page.locator('.directory-group li').count()) === 44,
                'Catalog UI filter has44 actual entries',
              );
            else
              assert(
                await page
                  .locator('.home-found-components a[href="/components/input/"]')
                  .isVisible(),
                'Home UI filter discovers Input',
              );
            record.states.push({
              name: 'filter',
              active,
              before,
              hovered,
              focused,
              selected: await measure(next),
            });
            if (name === 'home') {
              const forms = page.getByRole('tab', { name: 'Forms', exact: true });
              await keyboardFocus(page.getByRole('tab', { name: 'Composer', exact: true }));
              await page.keyboard.press('ArrowRight');
              await page.waitForFunction(() =>
                [...document.querySelectorAll('[role="tab"]')].some(
                  (node) =>
                    node.textContent === 'Forms' && node.getAttribute('aria-selected') === 'true',
                ),
              );
              assert(
                (await forms.getAttribute('aria-selected')) === 'true',
                'Tabs select Forms by keyboard',
              );
              const tab = await measure(forms);
              assert(
                tab.bottomWidth >= 2 && tab.bottomContrast >= 3,
                'Selected tab has a contrasting underline',
              );
              assert(
                tab.outlineWidth >= 2 && tab.outlineContrast >= 3,
                'Tab keyboard outline is visible',
              );
              record.states.push({ name: 'selected tab', value: tab });
            }
          }
          if (['detail', 'customize'].includes(name)) {
            const wrapper = page.locator('.explorer-sidebar .search-field');
            await searchStates(
              wrapper,
              wrapper.locator('input'),
              record,
              'Library navigation search',
            );
            if (width < 780) {
              await page.screenshot({
                path: `${output}/after-sidebar-${name}-${width}-${mode}.png`,
              });
              await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
            }
          }
          const hoverTarget =
            name === 'docs'
              ? page.locator('.docs-links a').first()
              : name === 'templates'
                ? page.locator('.pattern-list > a').first()
                : name === 'home'
                  ? page.locator('.home-finder-heading a')
                  : page.locator('.web-footer nav a').first();
          const label =
            name === 'docs'
              ? hoverTarget.locator('strong')
              : name === 'templates'
                ? hoverTarget.locator('h2')
                : hoverTarget;
          await hoverTarget.hover();
          const link = await measure(label);
          assert(link.decoration.includes('underline'), `${name}: link hover underline`);
          await keyboardFocus(hoverTarget);
          const linkFocus = await measure(hoverTarget);
          assert(
            linkFocus.outlineWidth >= 2 && linkFocus.outlineContrast >= 3,
            `${name}: link keyboard outline`,
          );
          record.states.push({ name: 'link', hover: link, focus: linkFocus });
          if (['home', 'index', 'customize'].includes(name) && width !== 320) {
            await page.mouse.move(0, 0);
            await page.evaluate(() => document.activeElement.blur());
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({ path: `${output}/after-${name}-${width}-${mode}.png` });
          }
        } catch (error) {
          failures.push({ name, route, width, mode, message: error.message });
        }
      }
    }
  }
  return {
    passed: !failures.length && !errors.length && records.length === 42,
    method:
      'WCAG relative luminance of rendered computed RGB colors, with alpha composited over ancestor backgrounds. Default light/dark palettes. Disabled fields excluded. Solid visible border widths and keyboard focus are checked independently of color ratios.',
    assertions,
    records,
    failures,
    errors,
  };
}

try {
  await command(['open', origin, `--config=${config}`, '--idle-timeout=600000']);
  const filename = resolve(output, 'check-journeys.js');
  await writeFile(
    filename,
    `async page => (${journeys.toString()})(page, ${JSON.stringify({ origin, output: output.replaceAll('\\', '/') })}, ${sample.toString()})`,
  );
  const report = JSON.parse(await command(['run-code', `--filename=${filename}`, '--raw'], 240000));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        assertions: report.assertions,
        conditions: report.records.length,
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
    const snapshot = await command(['snapshot'], 10000).catch(
      (error) => error.stdout || error.message,
    );
    const closed = snapshot.includes(`The browser '${session}' is not open`);
    commands.push({
      cleanup: closed ? 'closed-verified-after-timeout' : 'unconfirmed',
      error: error.message,
      snapshot,
    });
    if (!closed) process.exitCode = 1;
  } finally {
    await writeFile(resolve(output, 'commands.json'), JSON.stringify(commands, null, 2));
  }
}
