/** Runs in the repository's Playwright CLI browser, against built public-package consumers. */
export async function templateJourneys(parentPage, settings, audit) {
  const browser = parentPage.context().browser();
  const report = { passed: false, checks: [], conditions: [], errors: [], screenshots: [] };
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    report.checks.push(message);
  };
  for (const profile of [
    { name: 'desktop', width: 1440, height: 1000, hasTouch: false },
    { name: 'mobile', width: 320, height: 900, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: profile.hasTouch,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (error) => report.errors.push(error.message));
    const capture = async (name) => {
      const path = `${settings.output}/${profile.name}-${name}.png`;
      await page.screenshot({ path, fullPage: true });
      report.screenshots.push(path);
    };
    const inspect = async (name) => {
      const result = await audit(page);
      report.conditions.push({ name: `${profile.name}-${name}`, ...result });
      check(!result.horizontalOverflow, `${profile.name}/${name}: no page overflow`);
      check(result.violations.length === 0, `${profile.name}/${name}: no axe violations`);
    };
    try {
      await page.goto(`${settings.origin}/relay.html`);
      await page.getByRole('heading', { name: 'Take a look around.' }).waitFor();
      await inspect('login');
      await capture('login');
      await page.getByRole('textbox', { name: 'Display name' }).focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      check(
        await page
          .getByRole('button', { name: 'Enter demo workspace' })
          .evaluate((node) => node === document.activeElement),
        `${profile.name}: keyboard reaches demo login`,
      );
      await page.keyboard.press('Enter');
      await page.getByRole('heading', { name: 'A clear view of your accounts.' }).waitFor();
      check(
        await page
          .getByRole('heading', { level: 1 })
          .evaluate((node) => node === document.activeElement),
        `${profile.name}: login restores workspace focus`,
      );
      await inspect('overview');
      await capture('overview');
      const search = page.getByRole('searchbox', { name: 'Search accounts' });
      await search.fill('not-a-customer');
      await page.getByRole('heading', { name: 'No matching accounts' }).waitFor();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
      check(
        await page.getByRole('button', { name: 'Quotient', exact: true }).isVisible(),
        `${profile.name}: controlled pagination changes rows`,
      );
      await page.getByRole('button', { name: 'Previous page', exact: true }).click();
      const healthFilter = page.getByRole('combobox', { name: 'Filter by health' });
      await healthFilter.focus();
      await page.keyboard.press('Space');
      await page.getByRole('option', { name: 'At risk', exact: true }).click();
      check(
        (await page
          .getByRole('table', { name: 'Customer accounts', exact: true })
          .getByRole('row')
          .count()) === 3,
        `${profile.name}: health filter returns the two at-risk accounts`,
      );
      await search.fill('Meridian');
      const accountButton = page.getByRole('button', { name: 'Meridian', exact: true });
      await accountButton.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Meridian', exact: true });
      await dialog.waitFor();
      for (let step = 0; step < 10; step++) await page.keyboard.press('Tab');
      check(
        await dialog.evaluate((node) => node.contains(document.activeElement)),
        `${profile.name}: edit dialog keeps keyboard focus inside`,
      );
      await inspect('details');
      await capture('details');
      const notes = dialog.getByRole('textbox', { name: 'Next step' });
      const original = await notes.inputValue();
      await notes.fill('A draft to discard');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(
        (id) => !!id && document.activeElement?.id === id,
        await accountButton.getAttribute('id'),
      );
      check(
        await accountButton.evaluate((node) => node === document.activeElement),
        `${profile.name}: dialog returns focus to account trigger`,
      );
      await accountButton.click();
      check(
        (await notes.inputValue()) === original,
        `${profile.name}: closing the editor discards unsaved edits`,
      );
      await notes.fill('   ');
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('Add a next step before saving.', { exact: true }).waitFor();
      check(
        await notes.evaluate((node) => node === document.activeElement),
        `${profile.name}: invalid next step focuses its associated error`,
      );
      await notes.fill('Confirm the reporting workshop with Priya on October 8.');
      await dialog.getByRole('combobox', { name: 'Account health' }).click();
      await page.getByRole('option', { name: 'Healthy', exact: true }).click();
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByText('Meridian updated', { exact: true }).waitFor();
      const notificationArea = page
        .getByRole('region', { name: 'Notifications (F8)' })
        .locator('ol');
      check(
        await notificationArea.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return document.elementFromPoint(rect.left + 1, rect.top + 1) !== node;
        }),
        `${profile.name}: toast viewport padding does not intercept underlying content`,
      );
      await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
      check(
        await notificationArea.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return document.elementFromPoint(rect.left + 1, rect.top + 1) !== node;
        }),
        `${profile.name}: dismissed toast viewport leaves underlying content clickable`,
      );
      await page.getByRole('heading', { name: 'No matching accounts' }).waitFor();
      check(true, `${profile.name}: edit changes filtering and produces a toast`);
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.getByRole('button', { name: 'Prepare a briefing' }).click();
      await page.getByRole('button', { name: 'Summarize this account' }).click();
      await page.getByRole('button', { name: 'Stop response' }).waitFor();
      await page.getByRole('button', { name: 'Stop response' }).waitFor({ state: 'hidden' });
      const conversation = page.getByRole('region', { name: 'Assistant conversation' });
      check(
        (await conversation.innerText()).includes(
          'Confirm the reporting workshop with Priya on October 8.',
        ),
        `${profile.name}: assistant uses the edited sample record`,
      );
      await page.getByRole('button', { name: 'Simulate error', exact: true }).click();
      const composer = page.getByRole('textbox', { name: 'Message', exact: true });
      await composer.fill('Draft a follow-up');
      await composer.press('Enter');
      await page
        .getByText('Simulated error. Retry the same prompt to finish the response.', {
          exact: true,
        })
        .waitFor();
      await inspect('assistant-error');
      await page.getByRole('button', { name: 'Retry response' }).click();
      await page.getByRole('button', { name: 'Stop response' }).waitFor({ state: 'hidden' });
      check(
        (await conversation.innerText()).includes('Nothing has been sent.'),
        `${profile.name}: error retry completes the same local draft`,
      );
      await composer.fill('Summarize this account');
      await composer.press('Enter');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-state="streaming"]')].some((node) =>
          node.textContent.includes('Meridian'),
        ),
      );
      await page.getByRole('button', { name: 'Stop response' }).click();
      await page
        .getByText('Canceled. Your partial response is kept above.', { exact: true })
        .waitFor();
      const canceled = await conversation.innerText();
      await page.waitForTimeout(350);
      check(
        (await conversation.innerText()) === canceled,
        `${profile.name}: canceled output stays stopped`,
      );
      await inspect('assistant-canceled');
      await capture('assistant-canceled');
      await page.getByRole('button', { name: 'All accounts', exact: true }).click();
      check(
        (await page.getByRole('region', { name: 'Assistant conversation' }).count()) === 0,
        `${profile.name}: changing context clears previous conversation`,
      );
      await page.getByRole('button', { name: 'Open profile menu' }).click();
      await page.getByRole('menuitem', { name: 'Use dark appearance' }).click();
      await inspect('dark');
      await capture('dark');
      await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
      const reset = page.getByRole('alertdialog');
      await reset.waitFor();
      for (let step = 0; step < 5; step++) await page.keyboard.press('Tab');
      check(
        await reset.evaluate((node) => node.contains(document.activeElement)),
        `${profile.name}: reset dialog keeps keyboard focus inside`,
      );
      await inspect('reset');
      await reset.getByRole('button', { name: 'Keep working' }).click();
      await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
      await reset.getByRole('button', { name: 'Reset demo', exact: true }).click();
      await search.fill('Meridian');
      await accountButton.click();
      check(
        (await notes.inputValue()) === original,
        `${profile.name}: reset restores original account`,
      );
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(
        (id) => !!id && document.activeElement?.id === id,
        await accountButton.getAttribute('id'),
      );
      await page.getByRole('link', { name: 'Accounts', exact: true }).click();
      await page.getByRole('heading', { name: 'Every relationship, in view.' }).waitFor();
      await page.getByRole('button', { name: 'Open profile menu' }).focus();
      await page.keyboard.press('Space');
      await page.getByRole('menuitem', { name: 'Leave demo' }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('heading', { name: 'Take a look around.' }).waitFor();
      check(true, `${profile.name}: keyboard menu leaves the mock session`);
    } catch (error) {
      report.errors.push(`${profile.name}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
  for (const width of [768, 1024]) {
    await parentPage.setViewportSize({ width, height: 1000 });
    await parentPage.goto(`${settings.origin}/relay.html`);
    await parentPage.getByRole('button', { name: 'Enter demo workspace' }).click();
    await parentPage.getByRole('heading', { name: 'A clear view of your accounts.' }).waitFor();
    const result = await audit(parentPage);
    report.conditions.push({ name: `tablet-${width}`, ...result });
    if (result.horizontalOverflow || result.violations.length)
      report.errors.push(`${width}px: reflow or axe failure`);
    else check(true, `${width}px: reflow and axe pass`);
  }
  if (!report.errors.length) check(true, 'No browser page errors');
  report.passed = report.errors.length === 0;
  return report;
}
