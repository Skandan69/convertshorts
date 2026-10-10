const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const BASE=process.env.BASE_URL||'http://localhost:4173';
(async()=>{
 const {MODELS}=await import('../server/studio-core.mjs');
 const {CREDIT_PLANS,PRICING_VERSION}=await import('../apps/studio/pricing.js');
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}});
 let submissions=0;const errors=[];
 await context.route('**/api/cloud',r=>r.fulfill({contentType:'application/json',body:'{"enabled":false}'}));
 await context.route('**/api/studio**',r=>{
  if(r.request().method()!=='GET'){submissions++;throw Error('Signed-out quote must not submit a provider request');}
  return r.fulfill({contentType:'application/json',body:JSON.stringify({models:MODELS,sharedProviderConfigured:false})});
 });
 await context.route('**/api/billing**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({enabled:false,generationEnabled:true,pricingVersion:PRICING_VERSION,hostedModels:['flux-fast','nano-banana','nano-edit','kling'],plans:CREDIT_PLANS.map(p=>({...p,available:false}))})}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE+'/apps/#create-video');await page.locator('#generation-model').waitFor();
 await page.locator('#generation-model').selectOption('kling');
 const expectQuote=async credits=>{await page.waitForFunction(c=>document.querySelector('#model-hint')?.textContent.startsWith(c+' ConvertShorts credits'),credits);assert.ok((await page.locator('#generate').textContent()).includes(credits+' credits'));};
 await expectQuote(44);await page.locator('#advanced-toggle').click();
 await page.locator('#generation-audio').check();await expectQuote(88);
 await page.locator('#generation-duration').selectOption('10');await expectQuote(175);
 await page.goto(BASE+'/apps/#create-image');await page.locator('#generation-model').selectOption('nano-banana');
 await expectQuote(10);await page.locator('#advanced-toggle').click();
 await page.locator('#generation-resolution').selectOption('4K');await expectQuote(20);
 await page.locator('#generation-count').selectOption('4');await expectQuote(80);
 await page.locator('#generation-model').selectOption('flux-2');
 assert.ok((await page.locator('#model-hint').textContent()).includes('Connect your Fal key'));
 assert.equal((await page.locator('#generate').textContent()).includes('credits'),false,'Unpriced model must stay own-key only');
 await page.locator('#generation-model').selectOption('nano-banana');
 await page.locator('#generation-prompt').fill('A garden');await page.locator('#generate').click();
 await page.waitForURL('**/#account');assert.equal(submissions,0);
 assert.equal(errors.length,0,errors.join('\n'));
 const output=path.join(__dirname,'results/creative-apps/pricing');await fs.mkdir(output,{recursive:true});
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({videoDurationAndAudio:true,imageResolutionAndBatch:true,unpricedModelsOwnKeyOnly:true,signedOutSubmissionBlocked:true,providerRequests:submissions,errors},null,2));
 await browser.close();console.log('PASS composer credit updates, own-key model restriction and signed-out generation guard (config mocked).');
})().catch(e=>{console.error(e);process.exit(1);});
