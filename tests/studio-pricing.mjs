import assert from 'node:assert/strict';
import {CREDIT_PLANS,quoteCredits,quoteDraft,PRICING_VERSION,MARKUP_PERCENT,CUSTOMER_CREDIT_INR,retailFromProvider,formatCredits} from '../apps/studio/pricing.js';
import {MODEL_PRICE_CATALOG} from '../apps/studio/price-catalog.js';
import {prepareGeneration,MODELS} from '../server/studio-core.mjs';
import {handleBilling} from '../server/billing-edge.ts';
for(const plan of CREDIT_PLANS){assert.equal(plan.currency,'inr');assert.equal(plan.mode,'payment');assert.equal(plan.amountCents,plan.credits,'Every top-up preserves its INR paise value');assert.equal(plan.generationCredits,plan.amountCents/100,'Public credits are rupees, not internal paise units');}
assert.equal(MARKUP_PERCENT,20);
assert.equal(CUSTOMER_CREDIT_INR,1);
assert.equal(formatCredits(1000),'1,000 credits');
assert.equal(formatCredits(.72),'0.72 credits');
assert.equal(retailFromProvider(200),240);
assert.equal(1000-retailFromProvider(200),760);
assert.throws(()=>retailFromProvider(NaN));
assert.equal(MODEL_PRICE_CATALOG.length,74);
const pricedEndpoints=new Set(MODEL_PRICE_CATALOG.map(m=>m.endpoint));
assert.equal(pricedEndpoints.size,74);
for(const m of MODELS)assert.ok(pricedEndpoints.has(m.endpoint),'Missing price audit: '+m.endpoint);
for(const row of MODEL_PRICE_CATALOG){assert.equal(row.source,'https://fal.ai/models/'+row.endpoint);for(const rate of row.rates){assert.ok(rate.providerUsd>0);assert.ok(Math.abs(retailFromProvider(rate.providerUsd)-rate.providerUsd*1.2)<1e-10);}}
const seedance=MODEL_PRICE_CATALOG.find(m=>m.endpoint==='fal-ai/bytedance/seedance/v1.5/pro/text-to-video');
assert.equal(seedance.status,'metered');
assert.ok(Math.abs(retailFromProvider(seedance.rates.find(r=>r.unit==='estimated clip').providerUsd)-.312)<1e-10);
assert.throws(()=>quoteCredits(seedance.endpoint,{duration:5,resolution:'720p',generate_audio:true},100),'Unit rate preview must not allow unverified exact-job charging');
assert.equal(MODEL_PRICE_CATALOG.find(m=>m.endpoint==='fal-ai/birefnet/v2/video').rates.length,0,'Unverified zero-rate AI must not be sold as free');
for(const count of [1,2,3,4])for(const [resolution,credits] of [['1K',960],['2K',1440],['4K',1920]]) {
  const body={model:'nano-banana',prompt:'A garden',count,resolution},prepared=prepareGeneration(body);
  assert.equal(quoteDraft(prepared.model,body,100).credits,credits*count);
  assert.deepEqual(quoteDraft(prepared.model,body,100),quoteCredits(prepared.endpoint,prepared.input,100));
}
for(const [duration,audio,credits] of [[5,false,4200],[10,false,8400],[5,true,8400],[10,true,16800]])for(const reference of [undefined,'https://fal.media/reference.png']) {
  const body={model:'kling',prompt:'Slow ocean waves',duration,audio,reference},p=prepareGeneration(body);
  assert.equal(quoteDraft(p.model,body,100).credits,credits);
  assert.deepEqual(quoteDraft(p.model,body,100),quoteCredits(p.endpoint,p.input,100));
}
assert.equal(quoteCredits('fal-ai/flux/schnell',{num_images:4},100).credits,288,'Batch price rounds once over the total cost');
assert.throws(()=>quoteCredits('fal-ai/flux/schnell',{image_size:{width:8192,height:8192}}));
assert.throws(()=>quoteCredits('fal-ai/trellis-2',{}));
assert.throws(()=>quoteCredits('fal-ai/nano-banana-2',{num_images:999}));
assert.equal(quoteCredits('fal-ai/ace-step',{duration:60},100).credits,144);
assert.equal(quoteCredits('fal-ai/ace-step',{duration:60},100).generationCredits,1.44);
assert.equal(quoteCredits('fal-ai/minimax-music/v2',{},100).credits,360);
for(const size of ['square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'])assert.equal(quoteCredits('fal-ai/flux/schnell',{image_size:size},100).credits,36);
assert.throws(()=>quoteCredits('fal-ai/nano-banana-2',{limit_generations:false},100));
for(const [label,endpoint,input] of (await import('../apps/studio/pricing.js')).PRICE_EXAMPLES){const q=quoteCredits(endpoint,input,91.234567);assert.equal(q.retailUsd,q.providerUsd*1.2,label);assert.ok(q.retailInr>=q.retailUsd*91.234567-1e-10&&q.retailInr<q.retailUsd*91.234567+0.010000001,label);}
assert.equal(quoteCredits('fal-ai/flux/schnell',{image_size:'square_hd'}).retailUsd,0.0072);
assert.throws(()=>quoteCredits('fal-ai/ace-step',{duration:241},100));
const previousFetch=globalThis.fetch,values={CONVERTSHORTS_USD_INR:'100',CONVERTSHORTS_USD_INR_DATE:new Date().toISOString().slice(0,10),SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture',CONVERTSHORTS_FAL_KEY:'provider-fixture',CONVERTSHORTS_HOSTED_ENABLED:'true'};
globalThis.Deno={env:{get:k=>values[k]}};
let reservations=0,submissions=0;
globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.endsWith('/auth/v1/user'))return Response.json({id:'11111111-1111-4111-8111-111111111111'});
  if(u.includes('convertshorts_billing_accounts'))return Response.json([]);
  if(u.endsWith('rpc/convertshorts_reserve_credits')){reservations++;assert.equal(JSON.parse(options.body).amount,7680);return Response.json(true);}
  if(u.startsWith('https://queue.fal.run/')){submissions++;return Response.json({status:'IN_QUEUE',request_id:'quote-fixture',status_url:'https://queue.fal.run/fal-ai/nano-banana-2/requests/quote-fixture/status',response_url:'https://queue.fal.run/fal-ai/nano-banana-2/requests/quote-fixture'});}
  if(u.includes('convertshorts_generation_requests'))return Response.json([]);
  throw Error('Unexpected request '+u);
};
const request=body=>new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers:{Origin:'https://convertshorts.com',Authorization:'Bearer account-fixture'},body:JSON.stringify(body)});
try {
  const generation={model:'nano-banana',prompt:'A garden',count:4,resolution:'4K'};
  const quote=await handleBilling(request({action:'quote',generation}));assert.equal(quote.status,200);assert.equal((await quote.json()).credits,7680);assert.equal(reservations,0);assert.equal(submissions,0);
  for(const body of [{expectedCredits:1,pricingVersion:PRICING_VERSION+':100.000000'},{expectedCredits:7680,pricingVersion:'old'},{}])assert.equal((await handleBilling(request({action:'generate',generation,...body}))).status,409);
  assert.equal(reservations,0);assert.equal(submissions,0);
  const started=await handleBilling(request({action:'generate',generation,expectedCredits:7680,pricingVersion:PRICING_VERSION+':100.000000',credits:0}));assert.equal(started.status,202);assert.equal(reservations,1);assert.equal(submissions,1);
  assert.equal((await handleBilling(request({action:'generate',generation:{model:'trellis',reference:'https://fal.media/ref.png'},expectedCredits:1,pricingVersion:PRICING_VERSION+':100.000000'}))).status,400);assert.equal(submissions,1);
  values.CONVERTSHORTS_HOSTED_ENABLED='false';assert.equal((await handleBilling(request({action:'quote',generation}))).status,503);
  const config=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(config.enabled,false);assert.equal(config.generationEnabled,false);assert.ok(!JSON.stringify(config).includes('provider-fixture'));
} finally {globalThis.fetch=previousFetch;delete globalThis.Deno;}
console.log('PASS batch/resolution/video/audio quotes, credit value, stale/tampered quote rejection, no-charge quotes, fail-closed unpriced models and disabled commerce (HTTP mocked).');
