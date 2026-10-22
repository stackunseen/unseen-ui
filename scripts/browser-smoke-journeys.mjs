/* global document, requestAnimationFrame */
/** Trusted CLI payload. Keep helpers inside this function so it can be serialized. */
export async function browserSmokeJourneys(initialPage, options, auditPage) {
  const browser = initialPage.context().browser();
  const conditions = [],
    flows = [],
    errors = [];
  const profiles = [
    { name: 'desktop-light', width: 1440, dark: false, touch: false },
    { name: 'mobile-dark', width: 320, dark: true, touch: true },
  ];
  function check(value, message) {
    if (!value) throw new Error(message);
  }
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: 1000 },
      hasTouch: profile.touch,
      isMobile: profile.touch,
      colorScheme: profile.dark ? 'dark' : 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.setDefaultNavigationTimeout(15000);
    page.on('pageerror', (error) => errors.push({ profile: profile.name, message: error.message }));
    try {
      await page.goto(`${options.origin}/?view=theme`);
      await page.getByRole('combobox', { name: 'Appearance', exact: true }).click();
      await page
        .getByRole('option', { name: profile.dark ? 'Dark' : 'Light', exact: true })
        .click();
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      for (const family of [
        'PermissionRequest',
        'AgentHandoff',
        'ClarificationRequest',
        'Select',
      ]) {
        const state = family === 'ClarificationRequest' ? 'Text' : 'Default';
        await page.goto(`${options.origin}/?component=${family}&state=${state}&compare=true`);
        await page.locator('.variant-example').nth(2).waitFor();
        const examples = page.locator('.variant-example');
        check((await examples.count()) === 3, `${family}: expected three presentations`);
        for (let index = 0; index < 3; index++) {
          const example = examples.nth(index);
          if (family === 'PermissionRequest' || family === 'AgentHandoff') {
            const permission = family === 'PermissionRequest';
            const action = example.getByRole('button', {
              name: permission ? 'Allow access' : 'Accept handoff',
              exact: true,
            });
            await action.focus();
            await page.keyboard.press('Enter');
            check(await action.isDisabled(), `${family}: pending decision remained enabled`);
            await example
              .getByRole('button', { name: 'Simulate lost acknowledgement', exact: true })
              .click();
            await example.getByText('Local host changes: 1', { exact: true }).waitFor();
            await example
              .getByRole('button', {
                name: permission ? 'Check original decision' : 'Check original handoff',
                exact: true,
              })
              .click();
            await example.getByText(/The host confirmed the original decision/).waitFor();
            const before = permission
              ? 'Permission requested · unknown snapshot'
              : 'Last acknowledged owner: Implementation agent';
            await example.getByText(before, { exact: true }).waitFor();
            await example.getByText('Local host changes: 1', { exact: true }).waitFor();
            await example
              .getByRole('button', { name: 'Refresh host snapshot', exact: true })
              .click();
            await example
              .getByText(permission ? 'Permission granted' : 'Current owner: Review agent', {
                exact: true,
              })
              .waitFor();
            await example.getByText('Local host changes: 1', { exact: true }).waitFor();
            check(await action.isDisabled(), `${family}: applied decision became enabled`);
          } else if (family === 'ClarificationRequest') {
            await example.getByRole('button', { name: 'Continue', exact: true }).focus();
            await page.keyboard.press('Enter');
            const field = example.getByRole('textbox');
            await page.waitForFunction(
              () => document.activeElement?.getAttribute('aria-invalid') === 'true',
            );
            check(
              await field.evaluate(
                (node) =>
                  document.activeElement === node &&
                  node.getAttribute('aria-invalid') === 'true' &&
                  !!document
                    .getElementById(node.getAttribute('aria-describedby'))
                    ?.textContent.trim(),
              ),
              'Clarification validation must focus and describe the invalid field',
            );
          } else {
            const trigger = example.getByRole('combobox', { name: 'Environment', exact: true });
            await trigger.focus();
            await page.keyboard.press('Enter');
            await page.getByRole('listbox').waitFor();
            await page.keyboard.press('ArrowDown');
            await page.waitForFunction(
              () =>
                document.activeElement?.getAttribute('role') === 'option' &&
                document.activeElement?.textContent === 'Staging',
            );
            await page.keyboard.press('Enter');
            await page.getByRole('listbox').waitFor({ state: 'hidden' });
            await page.waitForFunction(
              () => document.activeElement?.getAttribute('role') === 'combobox',
            );
            check(
              (await trigger.textContent()).includes('Staging') &&
                (await trigger.evaluate((node) => document.activeElement === node)),
              'Select must retain the keyboard choice and return focus',
            );
          }
          flows.push({ profile: profile.name, family, presentation: index, passed: true });
        }
        const audit = await auditPage(page);
        conditions.push({ profile: profile.name, family, views: await examples.count(), audit });
        await page.screenshot({
          path: `${options.output}/${profile.name}-${family}.png`,
          fullPage: true,
        });
      }
    } catch (error) {
      errors.push({ profile: profile.name, message: error.message });
      await page
        .screenshot({ path: `${options.output}/${profile.name}-failure.png`, fullPage: true })
        .catch(() => {});
    } finally {
      await context.close();
    }
  }
  return {
    passed:
      conditions.length === 8 &&
      flows.length === 24 &&
      !errors.length &&
      conditions.every(({ audit }) => !audit.horizontalOverflow && !audit.violations.length),
    browser: browser.version(),
    conditions,
    flows,
    errors,
  };
}
