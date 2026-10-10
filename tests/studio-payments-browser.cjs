const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const BASE=process.env.BASE_URL||'http://localhost:4173';
(async()=>{
 const {MODELS}=await import('../server/studio-core.mjs'),{CREDIT_PLANS,PRICING_VERSION}=await import('../apps/studio/pricing.js');
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
 const info={enabled:true,generationEnabled:true,paymentProvider:'razorpay',usdInr:100,fxDate:'2026-10-10',fxSource:'Fixture reference rate',pricingVersion:PRICING_VERSION,plans:CREDIT_PLANS.map(p=>({...p,available:true})),hostedModels:['flux-fast','nano-banana','nano-edit','kling']};
 let orders=0,verifications=0,providerRequests=0;
 await context.addInitScript(()=>localStorage.setItem('convertshorts-auth',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}})));
 await context.route('**/api/cloud',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({enabled:true,url:'https://fixture.supabase.co',publishableKey:'public-fixture',bucket:'fixture'})}));
 await context.route('**/api/billing**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(info)}));
 await context.route('**/api/studio**',r=>{if(r.request().method()!=='GET')providerRequests++;return r.fulfill({contentType:'application/json',body:JSON.stringify({models:MODELS,sharedProviderConfigured:false})});});
 await context.route('https://fixture.supabase.co/**',r=>{
  const u=new URL(r.request().url());let d=[];
  if(u.pathname==='/auth/v1/user')d={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'};
  else if(u.pathname.includes('convertshorts_workspaces'))d=[{id:'22222222-2222-4222-8222-222222222222',name:'Fixture workspace',owner_id:'11111111-1111-4111-8111-111111111111'}];
  else if(u.pathname.includes('/functions/v1/convertshorts-billing')){
   if(r.request().method()==='GET')d={balanceInr:0,credits:0};
   else {const b=r.request().postDataJSON();if(b.action==='checkout'){orders++;assert.equal(b.plan,'topup-100');d={keyId:'rzp_live_fixture',orderId:'order_fixture',amount:10000,currency:'INR',description:'100 rupees of prepaid generation balance'};}
    else if(b.action==='verify'){verifications++;assert.equal(b.orderId,'order_fixture');assert.equal(b.paymentId,'pay_fixture');assert.equal(b.signature,'fixture-signature');d={verified:true,credited:true,amountInr:100};}
    else throw Error('Unexpected payment action '+b.action);
   }
  }
  return r.fulfill({contentType:'application/json',body:JSON.stringify(d)});
 });
 await context.route('https://checkout.razorpay.com/v1/checkout.js',r=>r.fulfill({contentType:'application/javascript',body:`window.Razorpay=class {constructor(options){this.options=options;}on(){}open(){const d=this.options;if(d.amount!==10000||d.currency!=='INR'||d.order_id!=='order_fixture')throw Error('Wrong checkout options');d.handler({razorpay_order_id:d.order_id,razorpay_payment_id:'pay_fixture',razorpay_signature:'fixture-signature'});}};`}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE+'/apps/#billing');await page.getByRole('heading',{name:'Simple pay-as-you-go'}).waitFor();
 assert.equal(await page.locator('[data-checkout]').count(),3);await page.waitForFunction(()=>document.querySelectorAll('[data-checkout]:disabled').length===0);assert.ok((await page.locator('.pricing-grid').textContent()).includes('₹1,000.00'));assert.equal(await page.getByRole('button',{name:'Manage subscription'}).count(),0);
 assert.ok((await page.locator('.credit-table').textContent()).includes('$0.0144'),'Cheap song price must retain its 20% markup precision');
 assert.equal(orders,0);await page.locator('[data-checkout="topup-100"]').click();await page.waitForURL('**/payments/checkout?pack=topup-100');
 await page.getByRole('heading',{name:'Add ₹100.00'}).waitFor();assert.equal(await page.evaluate(()=>crossOriginIsolated),false,'Razorpay checkout must run outside the isolated media editor');
 await page.getByRole('button',{name:'Pay with Razorpay'}).click();await page.getByRole('status').filter({hasText:'Payment verified. ₹100.00'}).waitFor();assert.equal(orders,1);assert.equal(verifications,1);assert.equal(providerRequests,0);
 const output=path.join(__dirname,'results/creative-apps/payments');await fs.mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'checkout-verified.png')});
 info.enabled=false;info.plans=info.plans.map(p=>({...p,available:false}));
 await page.goto(BASE+'/apps/#billing');await page.getByRole('heading',{name:'Simple pay-as-you-go'}).waitFor();assert.equal(await page.locator('[data-checkout]:disabled').count(),3);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'prepaid-mobile.png')});const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.page,.settings-grid,.panel,.table-scroll')].map(e=>({class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))}));assert.ok(dimensions.scroll<=dimensions.width+1,JSON.stringify(dimensions));assert.equal(errors.length,0,errors.join('\n'));
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({prepaidAmounts:[100,500,1000],subscriptionRemoved:true,standaloneCheckout:true,orderThenServerVerification:true,disabledWithoutCredentials:true,mobileFits:true,providerRequests,errors},null,2));
 await browser.close();console.log('PASS prepaid pricing, standalone Razorpay checkout, authenticated server verification, missing-key availability and mobile fit (HTTP/SDK fixtures; no purchases).');
})().catch(e=>{console.error(e);process.exit(1);});
