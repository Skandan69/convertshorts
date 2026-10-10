import assert from 'node:assert/strict';
import {CREDIT_PLANS,quoteCredits,quoteDraft,PRICING_VERSION} from '../apps/studio/pricing.js';
import {prepareGeneration,MODELS} from '../server/studio-core.mjs';
import {handleBilling} from '../server/billing-edge.ts';
for(const plan of CREDIT_PLANS)assert.equal(plan.amountCents,plan.credits,'Every plan must preserve the retail value of a credit');
for(const count of [1,2,3,4])for(const [resolution,credits] of [['1K',10],['2K',15],['4K',20]]) {
  const body={model:'nano-banana',prompt:'A garden',count,resolution},prepared=prepareGeneration(body);
  assert.equal(quoteDraft(prepared.model,body).credits,credits*count);
  assert.deepEqual(quoteDraft(prepared.model,body),quoteCredits(prepared.endpoint,prepared.input));
}
for(const [duration,audio,credits] of [[5,false,44],[10,false,88],[5,true,88],[10,true,175]])for(const reference of [undefined,'https://fal.media/reference.png']) {
  const body={model:'kling',prompt:'Slow ocean waves',duration,audio,reference},p=prepareGeneration(body);
  assert.equal(quoteDraft(p.model,body).credits,credits);
  assert.deepEqual(quoteDraft(p.model,body),quoteCredits(p.endpoint,p.input));
}
assert.equal(quoteCredits('fal-ai/flux/schnell',{num_images:4}).credits,3,'Batch price rounds once over the total cost');
assert.throws(()=>quoteCredits('fal-ai/flux/schnell',{image_size:{width:8192,height:8192}}));
assert.throws(()=>quoteCredits('fal-ai/trellis-2',{}));
assert.throws(()=>quoteCredits('fal-ai/nano-banana-2',{num_images:999}));
const previousFetch=globalThis.fetch,values={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture',CONVERTSHORTS_FAL_KEY:'provider-fixture',CONVERTSHORTS_HOSTED_ENABLED:'true'};
globalThis.Deno={env:{get:k=>values[k]}};
let reservations=0,submissions=0;
globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.endsWith('/auth/v1/user'))return Response.json({id:'11111111-1111-4111-8111-111111111111'});
  if(u.includes('convertshorts_billing_accounts'))return Response.json([]);
  if(u.endsWith('rpc/convertshorts_reserve_credits')){reservations++;assert.equal(JSON.parse(options.body).amount,80);return Response.json(true);}
  if(u.startsWith('https://queue.fal.run/')){submissions++;return Response.json({status:'IN_QUEUE',request_id:'quote-fixture',status_url:'https://queue.fal.run/fal-ai/nano-banana-2/requests/quote-fixture/status',response_url:'https://queue.fal.run/fal-ai/nano-banana-2/requests/quote-fixture'});}
  if(u.includes('convertshorts_generation_requests'))return Response.json([]);
  throw Error('Unexpected request '+u);
};
const request=body=>new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers:{Origin:'https://convertshorts.com',Authorization:'Bearer account-fixture'},body:JSON.stringify(body)});
try {
  const generation={model:'nano-banana',prompt:'A garden',count:4,resolution:'4K'};
  const quote=await handleBilling(request({action:'quote',generation}));assert.equal(quote.status,200);assert.equal((await quote.json()).credits,80);assert.equal(reservations,0);assert.equal(submissions,0);
  for(const body of [{expectedCredits:1,pricingVersion:PRICING_VERSION},{expectedCredits:80,pricingVersion:'old'},{}])assert.equal((await handleBilling(request({action:'generate',generation,...body}))).status,409);
  assert.equal(reservations,0);assert.equal(submissions,0);
  const started=await handleBilling(request({action:'generate',generation,expectedCredits:80,pricingVersion:PRICING_VERSION,credits:0}));assert.equal(started.status,202);assert.equal(reservations,1);assert.equal(submissions,1);
  assert.equal((await handleBilling(request({action:'generate',generation:{model:'trellis',reference:'https://fal.media/ref.png'},expectedCredits:1,pricingVersion:PRICING_VERSION}))).status,400);assert.equal(submissions,1);
  values.CONVERTSHORTS_HOSTED_ENABLED='false';assert.equal((await handleBilling(request({action:'quote',generation}))).status,503);
  const config=await(await handleBilling(new Request('https://fixture.supabase.co/?action=config'))).json();assert.equal(config.enabled,false);assert.equal(config.generationEnabled,false);assert.ok(!JSON.stringify(config).includes('provider-fixture'));
} finally {globalThis.fetch=previousFetch;delete globalThis.Deno;}
console.log('PASS batch/resolution/video/audio quotes, credit value, stale/tampered quote rejection, no-charge quotes, fail-closed unpriced models and disabled commerce (HTTP mocked).');
