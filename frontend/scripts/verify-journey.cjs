// UI checks use explicit network fixtures. Real SQL/billing boundaries are tested separately.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const AxeBuilder = require(process.env.AXE_MODULE || require.resolve('@axe-core/playwright', {paths:[process.env.PLAYWRIGHT_MODULE || process.cwd()]})).default;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  const dir = process.env.BROWSER_REPORT_DIR || '/tmp/kanyi-browser-report'; fs.mkdirSync(dir,{recursive:true});
  for (const [name, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
    const context = await browser.newContext({ viewport:{width,height} });
    const page = await context.newPage();
    const accessibility = {};
    async function checkAccessibility(stage) {
      await page.waitForTimeout(350);
      const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      accessibility[stage] = result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}));
      if(result.violations.length) fs.writeFileSync(`${dir}/${name}-accessibility.json`,JSON.stringify(accessibility,null,2));
      assert.equal(result.violations.length,0,JSON.stringify(accessibility[stage]));
    }
    const errors = []; page.on('pageerror',e=>errors.push(e.message));
    let logoutCalls=0; let history=[]; let used=0; let fail=false; let sent; let paid=false;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path=url.pathname;
      let body; let status=200;
      const analysis={id:1,severity:'High',summary:'Orders are failing',evidence:['10:43 GET /orders 503'],rootCause:'Possibly database unavailability',confidence:'Medium',recommendation:'Check database health',steps:['Verify connectivity'],actionability:'Action Required',falsePositiveRisk:'Low',noiseAssessment:'Legacy warning may be unrelated.',inputSignals:{lineCount:1,duplicateLineCount:0,timestampedLineCount:0,olderThanSevenDaysCount:0,futureTimestampCount:0},originalLog:'10:43 GET /orders 503',createdAt:new Date().toISOString()};
      if(path.endsWith('/billing/plans')) body={available:true,freeLimit:50,proLimit:500,maxLogBytes:16384,pricing:{amount:2900,currency:'usd',interval:'month'}};
      else if(path.endsWith('/account')) body={account:{plan:paid?'pro':'free',subscriptionStatus:paid?'active':'inactive',hasBillingCustomer:paid,currentPeriodEnd:paid?new Date(Date.now()+86400000).toISOString():null,cancelAtPeriodEnd:paid},usage:{plan:paid?'pro':'free',used,limit:paid?500:50,reserved:0,remaining:(paid?500:50)-used}};
      else if(path.endsWith('/register')||path.endsWith('/login')) body={token:'browser-test-token',user:{id:1,name:'Test Developer',email:'test@example.test'}};
      else if(path.endsWith('/logout')) {logoutCalls++;status=204;body=null;}
      else if(path.endsWith('/me')) body={user:{id:1,email:'test@example.test'}};
      else if(path.endsWith('/analyze')) { sent=route.request().postDataJSON(); if(fail){status=502;body={error:{code:'AI_PROVIDER_ERROR',message:'Analysis is unavailable right now. Please try again shortly; unsuccessful analyses do not use your monthly allowance.'}};} else {body=analysis;history=[analysis];used++;} }
      else if(path.endsWith('/history')) body=history;
      else if(path.endsWith('/billing/checkout')) {status=502;body={error:{code:'BILLING_ERROR',message:'Billing could not be completed. Please retry; your plan has not been changed.'}};}
      else if(path.endsWith('/events')) {status=204;body=null;}
      else if(path.includes('/history/')) {history=[];body={message:'Analysis deleted'};}
      else {status=404;body={message:'Not found'};}
      await route.fulfill({status,contentType:'application/json',body:body===null?'':JSON.stringify(body)});
    });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:5174');
    await page.getByRole('heading',{name:/Find the incident/}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.tagName),'A');
    await page.getByLabel('Explore a scenario').selectOption('1');
    await page.getByText('Likely Noise', {exact:true}).waitFor();
    await page.getByRole('button', {name:'Inspect source evidence'}).click();
    await page.getByText('This excerpt is copied directly from the selected synthetic log.', {exact:true}).waitFor();
    await page.getByLabel('Explore a scenario').selectOption('2');
    await page.getByText('Investigate', {exact:true}).waitFor();
    await checkAccessibility('landing');
    await page.screenshot({path:`${dir}/${name}-landing.png`,fullPage:true});
    await page.getByRole('button',{name:'Analyze your first log free →'}).click();
    await page.getByRole('button',{name:'Register',exact:true}).click();
    await checkAccessibility('signup');
    await page.getByLabel('Full name').fill('Test Developer');
    await page.getByLabel('Email address').fill('test@example.test');
    await page.getByLabel('Password',{exact:true}).fill('a-long-unique-browser-passphrase');
    // Signup UI uses a confirmation field.
    const confirm=page.getByLabel('Confirm password',{exact:true}); if(await confirm.count()) await confirm.fill('a-long-unique-browser-passphrase');
    await page.locator('form button[type=submit]').click();
    await page.getByRole('button',{name:'Load safe example logs'}).waitFor();
    await page.getByRole('button',{name:'Load safe example logs'}).click();
    await page.getByLabel('Operational context (optional)').fill('Staging; legacy cache warnings are expected');
    await page.getByRole('button',{name:'Assess incident',exact:true}).click();
    await page.getByText('Action Required',{exact:true}).first().waitFor();
    assert.match(sent.context,/Staging/);
    await page.getByText('Free · 1 / 50 analyses used',{exact:true}).waitFor();
    await page.screenshot({path:`${dir}/${name}-workspace.png`,fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:/View full analysis/}).click();
    await checkAccessibility('workspace');
    await page.getByRole('button',{name:/Dark Mode/}).click();
    await checkAccessibility('workspace-dark');
    await page.getByRole('button',{name:/Light Mode/}).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button',{name:'Export PDF',exact:true}).click();
    const download = await downloadPromise;
    const pdfPath = `${dir}/${name}-analysis.pdf`; await download.saveAs(pdfPath);
    assert.equal(fs.readFileSync(pdfPath).subarray(0,4).toString(),'%PDF');
    assert.ok(fs.statSync(pdfPath).size>1000);

    fail=true; await page.getByRole('button',{name:'Assess incident',exact:true}).click();
    await page.getByText('Analysis is unavailable right now. Please try again shortly; unsuccessful analyses do not use your monthly allowance.',{exact:true}).waitFor();
    await page.getByRole('button',{name:/Upgrade to Pro/}).click();
    await page.getByText('Billing could not be completed. Please retry; your plan has not been changed.',{exact:true}).waitFor();
    const file=page.locator('#log-file'); await file.setInputFiles({name:'unsafe.bin',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});
    await page.getByText('Choose a .log or .txt file up to 16 KiB.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Delete analysis',exact:true}).click();
    await page.getByRole('button',{name:'Yes, delete analysis',exact:true}).click();
    await page.getByText('Analysis deleted successfully.',{exact:true}).waitFor();
    assert.equal(history.length,0);
    used=50; await page.reload(); await page.getByText(/You have reached your monthly limit/).waitFor();
    await page.goto((process.env.APP_URL || 'http://127.0.0.1:5174')+'/?billing=success');
    await page.getByText(/We are waiting for verified subscription confirmation/).waitFor();
    paid=true; await page.reload(); await page.getByText('Your Pro subscription is active.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Manage subscription'}).waitFor();
    await page.getByText(/Cancellation scheduled/).waitFor();
    await page.route('**/api/billing/plans', route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Billing temporarily unavailable'})}));
    await page.reload(); await page.getByRole('button',{name:'Manage subscription'}).waitFor();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.getByRole('heading',{name:/Find the incident/}).waitFor();
    assert.equal(logoutCalls,1);
    await page.getByRole('button',{name:'Sign in / Start free',exact:true}).click();
    await page.getByRole('heading',{name:'Welcome back',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null);
    await page.getByLabel('Email address').fill('test@example.test');
    await page.getByLabel('Password',{exact:true}).fill('a-long-unique-browser-passphrase');
    await page.locator('form button[type=submit]').click();
    await page.getByRole('button',{name:'Manage subscription'}).waitFor();
    // Service failures preserve the session; they must not masquerade as expiration.
    await page.route('**/api/auth/me', route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporarily unavailable'})}));
    await page.reload(); await page.getByText('We could not reach your workspace. Your session has been kept.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('token')),'browser-test-token');
    assert.deepEqual(errors,[]);
    report.push({viewport:name,landing:true,interactiveDemo:true,signup:true,returningLogin:true,serverLogout:true,sample:true,analysis:true,context:true,history:true,pdfDownload:true,deleteAnalysis:true,planUsage:true,providerError:true,billingError:true,uploadValidation:true,quota:true,pendingPayment:true,paidPlanDisplay:true,cancellationDisplay:true,portalDuringPriceFailure:true,sessionOutage:true,horizontalOverflow:false,pageErrors:errors,keyboardFocus:true,accessibility});
    await context.close();
  }
  fs.writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2)); await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
