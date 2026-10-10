import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {handleBilling,verifyHmac} from '../server/billing-edge.ts';
import {validRate,getExchangeRate} from '../server/billing-fx.mjs';
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const values={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',CONVERTSHORTS_HOSTED_ENABLED:'true',CONVERTSHORTS_FAL_KEY:'fal-fixture',CONVERTSHORTS_RAZORPAY_KEY_ID:'rzp_live_fixture',CONVERTSHORTS_RAZORPAY_KEY_SECRET:'payment-fixture',CONVERTSHORTS_RAZORPAY_WEBHOOK_SECRET:'webhook-fixture',CONVERTSHORTS_USD_INR:'100',CONVERTSHORTS_USD_INR_DATE:new Date().toISOString().slice(0,10)};
const original=fetch;globalThis.Deno={env:{get:k=>values[k]}};
const orders=new Map(),applied=new Set();let granted=0,paymentStatus='captured',paymentAmount=10000,paymentOwner=null,paymentCurrency='INR',refunded=0,counter=0,providerError=null,providerReads=0;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),body=options.body?JSON.parse(options.body):null;
 if(u.endsWith('/auth/v1/user'))return Response.json({id:options.headers.Authorization==='Bearer other'?other:user,email:'fixture@example.invalid'});
 if(u.includes('/rest/v1/')){
  assert.equal(options.headers.Authorization,'Bearer service-fixture');
  if(u.includes('convertshorts_billing_accounts'))return Response.json([]);
  if(u.includes('convertshorts_checkout_orders')){
   if(options.method==='POST'){orders.set(body.id,{...body});return Response.json([body]);}
   return Response.json([orders.get(new URL(u).searchParams.get('id').slice(3))].filter(Boolean));
  }
  if(u.endsWith('rpc/convertshorts_apply_razorpay_payment')){if(applied.has(body.o))return Response.json(false);applied.add(body.o);granted+=orders.get(body.o).amount_paise;return Response.json(true);}
  if(u.includes('convertshorts_credit_grants'))return Response.json([{remaining:granted}]);
  throw Error('Unexpected DB request '+u);
 }
 if(u.startsWith('https://api.razorpay.com/v1/')){
  assert.equal(options.headers.Authorization,'Basic '+btoa(values.CONVERTSHORTS_RAZORPAY_KEY_ID.trim()+':'+values.CONVERTSHORTS_RAZORPAY_KEY_SECRET.trim()));
  if(providerError)return Response.json({error:{description:providerError.description},privateData:'Do not expose payment-fixture or fixture@example.invalid'},{status:providerError.status});
  if(u.endsWith('/orders?count=1')){providerReads++;return Response.json({items:[]});}
  if(u.endsWith('/orders')){assert.equal(body.currency,'INR');assert.ok([10000,50000,100000].includes(body.amount));assert.equal(body.notes.user,user);counter++;return Response.json({id:'order_fixture'+counter,amount:body.amount,currency:'INR'});}
  const id=u.split('/').pop();return Response.json({id,order_id:paymentOwner||'order_fixture1',amount:paymentAmount,currency:paymentCurrency,status:paymentStatus,captured:paymentStatus==='captured',amount_refunded:refunded});
 }
 throw Error('Unexpected URL '+u);
};
const req=(body,token='fixture')=>new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers:{Origin:'https://convertshorts.com',Authorization:'Bearer '+token},body:JSON.stringify(body)});
const signature=(text,key)=>createHmac('sha256',key).update(text).digest('hex');
const verify=()=>req({action:'verify',orderId:'order_fixture1',paymentId:'pay_fixture1',signature:signature('order_fixture1|pay_fixture1','payment-fixture')});
const hook=(event,valid=true)=>{const raw=JSON.stringify(event);return new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing?action=webhook',{method:'POST',headers:{'x-razorpay-signature':valid?signature(raw,'webhook-fixture'):'invalid'},body:raw});};
try{
 const config=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(config.enabled,true);assert.equal(config.paymentApiStatus,'ready');assert.equal(config.markupPercent,20);assert.equal(config.currency,'INR');assert.equal(config.plans.length,3);assert.equal(config.plans.some(p=>p.mode==='subscription'),false);assert.ok(!JSON.stringify(config).includes('payment-fixture'));
 await Promise.all([handleBilling(new Request('https://fixture.supabase.co/?action=config')),handleBilling(new Request('https://fixture.supabase.co/?action=config'))]);assert.equal(providerReads,1,'Config calls must reuse the read-only credential check');
 const checkout=await handleBilling(req({action:'checkout',plan:'topup-100',amount:1,credits:999999,currency:'usd'}));assert.equal(checkout.status,200);const order=await checkout.json();assert.equal(order.amount,10000);assert.equal(order.currency,'INR');assert.equal(order.keyId,'rzp_live_fixture');assert.equal(granted,0);
 assert.equal((await handleBilling(req({action:'checkout',plan:'topup-1'}))).status,400);
 assert.equal((await handleBilling(req({action:'verify',orderId:order.orderId,paymentId:'pay_fixture1',signature:'forged'}))).status,400);assert.equal(granted,0);
 assert.equal((await handleBilling(req({action:'verify',orderId:order.orderId,paymentId:'pay_fixture1',signature:signature('order_fixture1|pay_fixture1','payment-fixture')},'other'))).status,403);
 paymentStatus='authorized';assert.equal((await handleBilling(verify())).status,409);assert.equal(granted,0);paymentStatus='captured';
 paymentAmount=1;assert.equal((await handleBilling(verify())).status,400);paymentAmount=10000;
 paymentCurrency='USD';assert.equal((await handleBilling(verify())).status,400);paymentCurrency='INR';
 paymentOwner='order_someoneElse';assert.equal((await handleBilling(verify())).status,400);paymentOwner=null;
 refunded=10000;assert.equal((await handleBilling(verify())).status,409);refunded=0;
 const event={event:'payment.captured',payload:{payment:{entity:{order_id:'order_fixture1',id:'pay_fixture1'}}}};
 assert.equal((await handleBilling(hook(event,false))).status,400);assert.equal(granted,0);
 assert.equal((await handleBilling(verify())).status,200);assert.equal(granted,10000);
 assert.equal((await handleBilling(hook(event))).status,200);assert.equal(granted,10000,'Callback/webhook replay cannot grant twice');
 assert.equal((await(await handleBilling(verify())).json()).alreadyCredited,true);
 const balance=await(await handleBilling(new Request('https://fixture.supabase.co/',{headers:{Authorization:'Bearer fixture'}}))).json();assert.equal(balance.balanceInr,100);
 values.CONVERTSHORTS_RAZORPAY_KEY_ID='rzp_test_fixture';values.CONVERTSHORTS_BILLING_TEST_MODE='true';
 const testConfig=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(testConfig.enabled,true);assert.equal(testConfig.generationEnabled,false);
 const testCheckout=await(await handleBilling(req({action:'checkout',plan:'topup-100'}))).json();paymentOwner=testCheckout.orderId;
 const testResult=await(await handleBilling(req({action:'verify',orderId:testCheckout.orderId,paymentId:'pay_test',signature:signature(testCheckout.orderId+'|pay_test','payment-fixture')}))).json();assert.equal(testResult.testMode,true);assert.equal(testResult.credited,false);assert.equal(granted,10000);
 const originalError=console.error,diagnostics=[];console.error=entry=>diagnostics.push(entry);
 try{
  const savedOrders=orders.size,savedCounter=counter;
  for(const [status,description,category,message] of [[401,'untrusted provider response','invalid_credentials','authenticate'],[400,'Authentication failed.','invalid_credentials','authenticate'],[403,'Access denied','access_denied','restricted'],[400,'Invalid amount','invalid_request','rejected'],[429,'Too many requests','unavailable','temporarily'],[500,'Internal error','unavailable','temporarily']]){
   providerError={status,description};const response=await handleBilling(req({action:'checkout',plan:'topup-100'})),data=await response.json();assert.equal(response.status,503);assert.ok(data.error.includes(message));assert.equal(JSON.parse(diagnostics.at(-1)).category,category);assert.ok(!JSON.stringify(data).includes('payment-fixture'));assert.ok(!diagnostics.at(-1).includes('fixture@example.invalid'));
  }
  assert.equal(orders.size,savedOrders);assert.equal(counter,savedCounter);assert.equal(granted,10000,'Failed checkout must never grant credits');
  values.CONVERTSHORTS_RAZORPAY_KEY_SECRET='different-fixture';providerError={status:400,description:'The API <key/secret> provided is invalid.'};
  const failedConfig=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(failedConfig.paymentApiStatus,'invalid_credentials');assert.equal(failedConfig.enabled,false);assert.ok(failedConfig.plans.every(p=>!p.available));
  providerError=null;values.CONVERTSHORTS_RAZORPAY_KEY_SECRET=' payment-fixture\n';values.CONVERTSHORTS_RAZORPAY_KEY_ID=' rzp_test_fixture\n';
  const fixedConfig=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(fixedConfig.enabled,true);assert.equal(fixedConfig.testMode,true);assert.equal(fixedConfig.generationEnabled,false,'Test payments cannot activate live AI');
 }finally{console.error=originalError;providerError=null;}
 delete values.CONVERTSHORTS_RAZORPAY_KEY_SECRET;assert.equal((await handleBilling(req({action:'checkout',plan:'topup-100'}))).status,503);
 assert.ok(await verifyHmac('hello',signature('hello','k'),'k'));assert.equal(await verifyHmac('hello!',signature('hello','k'),'k'),false);
 assert.throws(()=>validRate({rate:100,date:'2020-01-01'}));assert.throws(()=>validRate({rate:'NaN',date:new Date().toISOString()}));
 assert.equal((await getExchangeRate(k=>values[k])).rate,100);
 const liveFX=await getExchangeRate(()=>'',async()=>Response.json({base:'USD',quote:'INR',rate:91.25,date:new Date().toISOString().slice(0,10)}));assert.equal(liveFX.rate,91.25);
 console.log('PASS INR top-ups, server-owned order prices, capture checks, payment ownership, raw-body signatures, callback/webhook replay, balance display, isolated test mode and fresh FX validation (HTTP fixtures; no purchases).');
}finally{globalThis.fetch=original;delete globalThis.Deno;}
