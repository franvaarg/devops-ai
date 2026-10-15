// Local browser API-boundary tests; explicit HTTP fixtures, no provider calls.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { writeFileSync } = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();let mode='malformed';const keys=[];let history=[];
  await page.addInitScript(()=>{
   localStorage.setItem('token','synthetic-token');localStorage.setItem('user',JSON.stringify({name:'Synthetic Tester',email:'tester@example.test'}));
   const timeout=AbortSignal.timeout.bind(AbortSignal);
   AbortSignal.timeout=ms=>timeout(ms>=30000?500:ms);
  });
  const result={id:1,severity:'Low',summary:'Synthetic assessment',evidence:['ERROR synthetic'],rootCause:'Possibly unavailable dependency',confidence:'Low',recommendation:'Check dependency health',steps:['Verify health'],missingInformation:['Impact unknown'],verificationSteps:['Inspect health'],originalLog:'ERROR synthetic',createdAt:new Date().toISOString()};
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={};let status=200;
   if(path.endsWith('/me'))body={user:{id:1,email:'tester@example.test'}};
   else if(path.endsWith('/plans'))body={available:false,pricing:null,freeLimit:50,proLimit:500,maxLogBytes:16384};
   else if(path.endsWith('/account'))body={account:{plan:'free',subscriptionStatus:'inactive',hasBillingCustomer:false},usage:{plan:'free',used:0,reserved:0,remaining:50,limit:50}};
   else if(path.endsWith('/history'))body=history;
   else if(path.endsWith('/analyze')){
    keys.push(route.request().headers()['idempotency-key']);
    if(mode==='timeout'){await new Promise(resolve=>setTimeout(resolve,1500));}
    if(mode==='malformed')body={summary:'Unvalidated fake success'};
    else {body=result;history=[result];}status=201;
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
  });
  await page.goto(process.env.APP_URL||'http://127.0.0.1:5174');
  await page.getByLabel('Log content',{exact:true}).fill('ERROR synthetic');
  // Two synchronous clicks exercise the ref guard before the disabled state commits.
  await page.getByRole('button',{name:'Assess incident',exact:true}).evaluate(button=>{button.click();button.click();});
  await page.getByText('The service returned an invalid analysis. Retry to recover the original request.',{exact:true}).waitFor();
  assert.equal(keys.length,1);
  assert.equal(await page.getByText('Unvalidated fake success',{exact:true}).count(),0);
  mode='valid';await page.getByRole('button',{name:'Assess incident',exact:true}).click();
  await page.getByText('Log analyzed successfully.',{exact:true}).waitFor();
  assert.equal(keys[0],keys[1]);
  await page.getByLabel('Log content',{exact:true}).fill('ERROR another synthetic');
  mode='timeout';await page.getByRole('button',{name:'Assess incident',exact:true}).click();
  await page.getByText('The request timed out. Retry to check the outcome; analysis retries reuse the same request key.',{exact:true}).waitFor();
  const lost=keys.at(-1);mode='valid';await page.getByRole('button',{name:'Assess incident',exact:true}).click();
  await page.getByRole('button',{name:'Assess incident',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>sessionStorage.getItem('kanyi-analysis-attempt')===null);
  assert.equal(keys.at(-1),lost);
  const report={syntheticHttpFixtures:true,liveProvider:false,duplicateSubmissionGuard:true,malformedSuccessRejected:true,sameKeyRecovery:true,boundedTimeoutRecovery:true};
  writeFileSync(process.env.RESILIENCE_REPORT||'/tmp/kanyi-browser-resilience.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
