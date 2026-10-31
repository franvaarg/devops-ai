// Exercise actual built artifacts, with no backend/database/provider running.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const AxeBuilder = require(process.env.AXE_MODULE || '@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const reportDir = process.env.BROWSER_REPORT_DIR || '/tmp/kanyi-public-mode-report';
function serve(dir) {
  assert.ok(fs.existsSync(path.join(dir, 'index.html')), `Missing build: ${dir}`);
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const candidate = path.resolve(dir, '.' + pathname);
    if (!candidate.startsWith(path.resolve(dir) + path.sep) && candidate !== path.resolve(dir)) { res.writeHead(403).end(); return; }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(dir, 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}
(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  const servers = []; let browser;
  const report = { scope: 'Built static artifacts; external APIs blocked or explicitly stubbed; no production services', marketing: [], productDisabled: {}, intakeEnabled: {} };
  try {
    for (const dir of [process.env.MARKETING_DIST, process.env.PRODUCT_DIST, process.env.INTAKE_DIST]) { assert.ok(dir); servers.push(await serve(dir)); }
    browser = await chromium.launch({ headless: true });
    const [marketing, product, intake] = servers;
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
      await context.addInitScript(() => {
        if (!sessionStorage.getItem('public-test-seeded')) {
          localStorage.setItem('token', 'stale-session-token'); localStorage.setItem('user', '{"name":"Previous user"}');
          sessionStorage.setItem('public-test-seeded', 'yes');
        }
        localStorage.setItem('analytics', 'yes');
      });
      const page = await context.newPage(); const apiCalls = []; const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== marketing.origin || url.pathname.startsWith('/api/') || ['fetch', 'xhr'].includes(route.request().resourceType())) { apiCalls.push(url.pathname); return route.abort('failed'); }
        return route.continue();
      });
      await page.goto(marketing.origin + '/#login');
      await page.getByRole('heading', { name: /Turn application logs/ }).waitFor();
      assert.doesNotMatch(await page.locator('body').innerText(), /early.access|waitlist|waiting list|tester recruitment|pricing|subscription/i);
      assert.equal(await page.locator('a,button').filter({ hasText: /sign in|register|forgot password|account|checkout|subscribe/i }).count(), 0);
      await page.locator('#demo').getByText(/not live AI analysis/).waitFor();
      assert.equal(await page.locator('form,input[type=email],input[type=password],input[type=file]').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).count(), 0);
      assert.equal(await page.getByRole('checkbox').count(), 0);
      assert.equal(await page.locator('a[href="#early-access"]').count(), 0);
      assert.equal(await page.getByText(/We could not reach your workspace/).count(), 0);
      assert.equal(await page.getByText(/Upgrade to Pro/).count(), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'stale-session-token');
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
      await page.keyboard.press('Enter'); assert.equal(new URL(page.url()).hash, '#main-content');
      await page.locator('.hero-actions').getByRole('link', { name: 'Try the Free Demo' }).click();
      await page.waitForURL(marketing.origin + '/demo');
      await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      assert.equal(await page.locator('.workspace-layout .log-editor').count(), 1);
      assert.equal(await page.getByLabel('Log content', { exact: true }).getAttribute('readonly'), '');
      assert.equal(await page.locator('input[type=file],input[type=password],input[type=email],form').count(), 0);
      await page.getByText(/Synthetic demonstration. Prepared sample assessments run locally/).waitFor();
      for (const [value, severity, confidence, summary] of [
        ['0', 'High', 'Medium', 'Orders are failing.'],
        ['1', 'Low', 'Low', 'The refresh recovered.'],
        ['2', 'Medium', 'Low', 'A timeout needs context'],
      ]) {
        await page.getByLabel('Choose sample logs', { exact: true }).selectOption(value);
        await page.locator('.assessment-empty').waitFor();
        await page.getByRole('button', { name: 'Show sample assessment', exact: true }).click();
        const result = page.locator('.assessment-result');
        assert.match(await result.innerText(), new RegExp(summary));
        const cards = result.locator('.decision-grid > div');
        assert.match(await cards.nth(1).innerText(), new RegExp(severity));
        assert.match(await cards.nth(2).innerText(), new RegExp(confidence));
        const evidence = await result.locator('.evidence-panel').filter({ has: page.getByRole('heading', { name: 'Observed Evidence', exact: true }) }).locator('li').innerText();
        assert.ok((await page.getByLabel('Log content', { exact: true }).inputValue()).includes(evidence));
        await result.getByRole('heading', { name: 'Suggested Steps', exact: true }).waitFor();
      }
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      assert.equal(await page.getByLabel('Log content', { exact: true }).inputValue(), '');
      await page.getByRole('button', { name: 'Show sample assessment', exact: true }).click();
      await page.getByText('Choose sample logs before showing an assessment.', { exact: true }).waitFor();
      await page.getByLabel('Choose sample logs', { exact: true }).selectOption('0');
      await page.getByRole('button', { name: 'Show sample assessment', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const demoAxe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      fs.writeFileSync(path.join(reportDir, `demo-axe-${width}.json`), JSON.stringify(demoAxe.violations, null, 2));
      assert.equal(demoAxe.violations.length, 0, JSON.stringify(demoAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))));
      await page.screenshot({ path: path.join(reportDir, `demo-workspace-${width}.png`), fullPage: true });
      await page.reload(); await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Back to Home', exact: true }).first().click();
      await page.waitForURL(marketing.origin + '/');
      await page.goBack(); await page.waitForURL(marketing.origin + '/demo');
      await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      await page.goForward(); await page.waitForURL(marketing.origin + '/');
      await page.getByRole('heading', { name: /Turn application logs/ }).waitFor();
      for (const suffix of ['/demo', '/demo/', '/demo?token=synthetic-stale-token']) {
        await page.goto(marketing.origin + suffix); await page.waitForURL(marketing.origin + '/demo');
        await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
        await page.reload(); await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      }
      await page.goto(marketing.origin + '/#demo');
      for (const [value, severity, confidence, recommendation] of [
        ['0', 'High', 'Medium', 'Check database health'],
        ['1', 'Low', 'Low', 'Confirm retries'],
        ['2', 'Medium', 'Low', 'Collect adjacent timestamps'],
      ]) {
        await page.getByLabel('Explore a scenario').selectOption(value);
        const cards = page.locator('.decision-grid > div');
        assert.match(await cards.nth(1).innerText(), new RegExp(severity));
        assert.match(await cards.nth(2).innerText(), new RegExp(confidence));
        await page.locator('#demo').getByText(new RegExp(recommendation)).waitFor();
        await page.locator('#demo').getByText(/Potential cause:/).waitFor();
        await page.getByRole('button', { name: 'Inspect source evidence' }).click();
        const evidence = await page.locator('#demo-evidence pre').innerText();
        assert.ok((await page.locator('#demo > pre').innerText()).includes(evidence));
        await page.getByRole('button', { name: 'Hide source evidence' }).click();
      }
      await page.getByLabel('Explore a scenario').selectOption('1'); await page.getByText('Likely Noise', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Inspect source evidence' }).click();
      await page.getByText('This excerpt is copied directly from the selected synthetic log.', { exact: true }).waitFor();
      await page.getByLabel('Explore a scenario').selectOption('2'); await page.getByText('Investigate', { exact: true }).waitFor();
      await page.locator('.hero-actions').getByRole('link', { name: 'Explore How It Works' }).click();
      assert.equal(new URL(page.url()).hash, '#how');
      await page.goBack(); assert.equal(new URL(page.url()).hash, '#demo');
      await page.getByRole('link', { name: 'Data handling', exact: true }).click();
      await page.getByText(/This synthetic demo does not accept or process your logs/).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('.hero-actions .primary').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      fs.writeFileSync(path.join(reportDir, `axe-${width}.json`), JSON.stringify(axe.violations, null, 2));
      assert.equal(axe.violations.length, 0, JSON.stringify(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))));
      await page.screenshot({ path: path.join(reportDir, `marketing-${width}.png`), fullPage: true });
      if (width === 1440) { await page.goto(marketing.origin); await page.screenshot({ path: path.join(reportDir, 'marketing-hero.png') }); }
      // Reset, billing-return and auth URLs cannot mount product screens.
      for (const suffix of ['/demo#login', '/demo/dashboard', '/#early-access', '/#login', '/login', '/register', '/forgot-password', '/reset-password?token=synthetic-reset-token', '/dashboard', '/history', '/account', '/billing', '/pricing', '/?billing=success#login', '/unknown#register']) {
        await page.goto(marketing.origin + suffix); await page.getByRole('heading', { name: /Turn application logs/ }).waitFor();
        assert.equal(await page.locator('form,input[type=file]').count(), 0);
        await page.waitForURL(marketing.origin + '/');
        await page.reload();
        await page.getByRole('heading', { name: /Turn application logs/ }).waitFor();
      }
      await page.evaluate(() => { location.hash = 'login'; });
      await page.waitForURL(marketing.origin + '/');
      await page.getByRole('link', { name: 'Data handling', exact: true }).click();
      await page.goBack(); await page.waitForURL(marketing.origin + '/');
      await page.goForward(); await page.waitForURL(marketing.origin + '/#data');
      await page.evaluate(() => localStorage.removeItem('token'));
      await page.goto(marketing.origin + '/demo'); await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      await page.reload(); await page.getByRole('heading', { name: 'KANYI', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
      assert.deepEqual(apiCalls, []); assert.deepEqual(errors, []);
      report.marketing.push({ width, apiCalls: 0, staleSessionIgnoredAndPreserved: true, cleanVisitor: true, consentDoesNotEnableAnalytics: true, intakeClosed: true, noFormOrAuthOrBilling: true, demoAndEvidence: true, fullWorkspaceDemo: true, demoDirectRefreshAndHistory: true, demoAxeViolations: 0, navigationAndBack: true, resetAndBillingLinksStayPublic: true, overflow: false, axeViolations: 0, keyboard: true, reducedMotion: true });
      await context.close();
    }
    // Default/product mode: disabled intake never appears operational. Session
    // outage behavior is deliberately retained for the authenticated product.
    const context = await browser.newContext(); const page = await context.newPage(); const calls = []; let outageStatus = 503;
    await page.route('**/api/**', route => { calls.push(new URL(route.request().url()).pathname); return route.fulfill({ status:outageStatus, contentType:'application/json', body:JSON.stringify({ message:'Synthetic outage' }) }); });
    await page.goto(product.origin); await page.getByRole('heading', { name:'Early access opening soon' }).waitFor();
    assert.equal(await page.locator('form').count(), 0); assert.deepEqual(calls, []);
    await page.getByRole('button', { name:'Sign in', exact:true }).click();
    await page.getByRole('heading', { name:'Welcome back' }).waitFor();
    await page.goBack(); await page.getByRole('heading', { name:/Turn application logs/ }).waitFor();
    await page.evaluate(() => localStorage.setItem('token','stale-product-token'));
    await page.reload(); await page.getByText('We could not reach your workspace. Your session has been kept.', { exact:true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'stale-product-token');
    assert.deepEqual(calls, ['/api/auth/me']);
    outageStatus = 401;
    await page.reload(); await page.getByRole('heading', { name:/Turn application logs/ }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    report.productDisabled = { defaultIntakeClosed: true, noLeadRequest: true, signInAndBack: true, existingSessionOutagePreserved: true, expiredProductSessionCleared: true };
    await context.close();
    const intakeContext = await browser.newContext(); const intakePage = await intakeContext.newPage(); let submitted;
    await intakePage.route('**/api/**', route => {
      assert.equal(new URL(route.request().url()).pathname, '/api/early-access'); submitted = route.request().postDataJSON();
      return route.fulfill({ status:200, contentType:'application/json', body:'{"received":true}' });
    });
    await intakePage.goto(intake.origin);
    await intakePage.getByLabel('Email *', { exact:true }).fill('synthetic@example.test');
    await intakePage.getByLabel('Professional role *', { exact:true }).selectOption('Founder');
    await intakePage.getByLabel('Primary use case *', { exact:true }).selectOption('Application errors');
    await intakePage.getByRole('button', { name:'Submit Access Request' }).click();
    await intakePage.getByRole('heading', { name:'Your request has been received.' }).waitFor();
    assert.equal(submitted.email, 'synthetic@example.test');
    report.intakeEnabled = { explicitOptInShowsForm: true, confirmedSubmission: true };
    await intakeContext.close();
    if (process.env.RUN_PRODUCT_REGRESSIONS === 'true') {
      report.productRegressions = [];
      for (const name of ['verify-landing.cjs', 'verify-journey.cjs', 'verify-resilience.cjs', 'verify-design.cjs']) {
        const evidenceDir = path.join(reportDir, name.replace('.cjs','')); fs.mkdirSync(evidenceDir, { recursive:true });
        const result = await execFile(process.execPath, [path.join(__dirname, name)], {
          env: { ...process.env, APP_URL:intake.origin, BROWSER_REPORT_DIR:evidenceDir, RESILIENCE_REPORT:path.join(evidenceDir, 'report.json') },
          timeout:600000, maxBuffer:1024*1024,
        });
        fs.writeFileSync(path.join(evidenceDir, 'run.log'), result.stdout + result.stderr);
        report.productRegressions.push({ script:name, passed:true });
      }
    }
    fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close();
    await Promise.all(servers.map(({ server }) => new Promise(resolve => server.close(resolve))));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
