// Explicit HTTP fixtures verify the UI; isolated PostgreSQL tests verify storage.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const AxeBuilder = require(process.env.AXE_MODULE || '@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = process.env.BROWSER_REPORT_DIR || '/tmp/kanyi-phase2-browser-report';
const origin = process.env.APP_URL || 'http://127.0.0.1:5174';
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { scope: 'Local frontend with synthetic HTTP fixtures; not live collection', layouts: [], form: {}, navigation: {} };
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', route => route.fulfill({ status: 204, body: '' }));
      await page.goto(origin);
      await page.getByRole('heading', { name: 'Turn application logs into actionable incident insights.' }).waitFor();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => location.hash), '#main-content');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
      await page.getByLabel('Explore a scenario').selectOption('1');
      await page.getByText('Likely Noise', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Inspect source evidence' }).click();
      await page.getByText('This excerpt is copied directly from the selected synthetic log.', { exact: true }).waitFor();
      await page.getByLabel('Explore a scenario').selectOption('2');
      await page.getByText('Investigate', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Hide source evidence' }).click();
      await page.getByLabel('Explore a scenario').selectOption('0');
      await page.locator('#early-access').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('.primary').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      fs.writeFileSync(path.join(dir, `axe-${width}.json`), JSON.stringify(axe.violations, null, 2));
      assert.equal(axe.violations.length, 0, JSON.stringify(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))));
      await page.screenshot({ path: path.join(dir, `landing-${width}.png`), fullPage: true });
      await page.locator('#early-access').screenshot({ path: path.join(dir, `form-${width}.png`) });
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
      await page.goBack();
      await page.getByRole('heading', { name: /Turn application logs/ }).waitFor();
      assert.deepEqual(errors, []);
      report.layouts.push({ width, overflow: false, axeViolations: 0, keyboardSkipLink: true, demo: true, darkPreferenceReadable: true, reducedMotion: true });
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); let mode = 'failure'; let count = 0; let payload; let complete;
    await page.route('**/api/**', async route => {
      if (!route.request().url().endsWith('/api/early-access')) return route.fulfill({ status: 204, body: '' });
      count++; payload = route.request().postDataJSON();
      if (mode === 'network') return route.abort('failed');
      if (mode === 'pending') await new Promise(resolve => { complete = resolve; });
      const status = mode === 'invalid' ? 400 : mode === 'rate' ? 429 : mode === 'failure' ? 503 : 200;
      const body = mode === 'malformed' ? {} : status === 200 ? { received: true } : { message: 'Synthetic failure' };
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(origin);
    const submit = page.getByRole('button', { name: 'Submit Access Request' });
    await submit.click(); assert.equal(count, 0); // Browser required-field validation.
    assert.equal(await page.evaluate(() => document.activeElement.id), 'access-email');
    for (const id of ['access-role', 'access-use-case', 'access-company', 'access-team']) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), id);
      assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'solid');
    }
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.type), 'submit');
    report.form.keyboardOrderAndVisibleFocus = true;
    await page.getByLabel('Email *', { exact: true }).fill('engineer@example.test');
    await page.getByLabel('Professional role *', { exact: true }).selectOption('DevOps / SRE');
    await page.getByLabel('Primary use case *', { exact: true }).selectOption('Failed deployments');
    await page.getByLabel('Company or website', { exact: false }).fill('Synthetic company');
    for (const scenario of ['failure', 'invalid', 'rate', 'network', 'malformed']) {
      mode = scenario; await submit.click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByLabel('Email *', { exact: true }).inputValue(), 'engineer@example.test');
      assert.equal(await page.getByLabel('Company or website', { exact: false }).inputValue(), 'Synthetic company');
      assert.equal(await page.getByText('Your request has been received.', { exact: true }).count(), 0);
      report.form[scenario] = 'Error shown; values preserved; no false success';
    }
    mode = 'pending'; const before = count;
    await submit.evaluate(button => { button.click(); button.click(); });
    await page.getByRole('status').filter({ hasText: 'Waiting for confirmation' }).waitFor();
    assert.equal(count, before + 1);
    assert.equal(await page.getByRole('button', { name: /Submitting request/ }).isDisabled(), true);
    assert.equal(await page.getByText('Your request has been received.', { exact: true }).count(), 0);
    mode = 'success'; complete();
    await page.getByRole('heading', { name: 'Your request has been received.' }).waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'status');
    assert.equal(payload.email, 'engineer@example.test'); assert.equal(payload.website, '');
    assert.equal('log' in payload, false);
    await page.screenshot({ path: path.join(dir, 'success-390.png'), fullPage: true });
    const successAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.equal(successAxe.violations.length, 0);
    await page.reload();
    await page.getByLabel('Email *', { exact: true }).fill('engineer@example.test');
    await page.getByLabel('Professional role *', { exact: true }).selectOption('DevOps / SRE');
    await page.getByLabel('Primary use case *', { exact: true }).selectOption('Failed deployments');
    await submit.click(); await page.getByRole('heading', { name: 'Your request has been received.' }).waitFor();
    report.form.successAndDuplicateAcknowledgement = true;
    report.form.synchronousDuplicateGuard = true;
    report.form.noSuccessBeforeConfirmation = true;
    report.form.requiredFields = true;
    report.navigation.signInAndBrowserBack = true;
    await context.close();
    fs.writeFileSync(path.join(dir, 'landing-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
