import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {POST as generateWorld,GET as worldStatus} from '../api/worlds.mjs';
import {MODELS,prepareGeneration,validateQueueURL,normalizeMedia} from '../server/studio-core.mjs';
import {PRICING_VERSION} from '../apps/studio/pricing.js';
import {verifySignature,handleBilling} from '../server/billing-edge.ts';
const nativeFetch=globalThis.fetch,values={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public-test-key',SUPABASE_SERVICE_ROLE_KEY:'server-test-key',CONVERTSHORTS_STRIPE_SECRET_KEY:'sk_test_fixture',CONVERTSHORTS_STRIPE_WEBHOOK_SECRET:'whsec_fixture',CONVERTSHORTS_STRIPE_PLANS:JSON.stringify([{id:'creator-monthly',name:'Creator',mode:'subscription',price:'price_fixture',credits:100}]),CONVERTSHORTS_FAL_KEY:'test-provider-key',CONVERTSHORTS_HOSTED_ENABLED:'true'};
globalThis.Deno={env:{get:k=>values[k]}};
const headers={Origin:'https://convertshorts.com',Authorization:'Bearer fixture-account-token','Content-Type':'application/json'};
const user='11111111-1111-4111-8111-111111111111',jobs=[],events=[],dbCalls=[];
let phase='world',providerResult='good',priceAmount=2400;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),body=options.body?JSON.parse(options.headers?.['Content-Type']==='application/x-www-form-urlencoded'?'null':options.body):null;
 if(phase==='world'){
  assert.equal(options.headers['WLT-Api-Key'],'test-world-key');
  if(u.endsWith('worlds:generate')){assert.equal(body.permission.public,false);assert.equal(body.world_prompt.type,'text');assert.equal(body.world_prompt.text_prompt,'A garden');return Response.json({operation_id:'operation-123'});}
  if(u.endsWith('operations/operation-123'))return Response.json({done:true,response:{world_id:'world-123'}});
  if(u.endsWith('worlds/world-123'))return Response.json({id:'world-123',assets:{splats:{spz_urls:{'500k':'https://assets.worldlabs.ai/world.spz'}},mesh:{collider_mesh_url:'https://assets.worldlabs.ai/collider.glb'},imagery:{panorama_url:'https://assets.worldlabs.ai/panorama.png'}}});
  throw Error('Unexpected World API request: '+u);
 }
 if(u.endsWith('/auth/v1/user')){assert.equal(options.headers.Authorization,headers.Authorization);return Response.json({id:user,email:'fixture@example.invalid'});}
 if(u.includes('/rest/v1/')){
  dbCalls.push({u,body,method:options.method});assert.equal(options.headers.Authorization,'Bearer server-test-key');
  if(u.includes('convertshorts_billing_accounts'))return Response.json([]);
  if(u.includes('rpc/convertshorts_apply_billing_event')){events.push(body);return Response.json(true);}
  if(u.includes('rpc/convertshorts_reserve_credits')){jobs.push({id:body.j,user_id:body.u,model:body.m,status:'RESERVED',credits:body.amount});return Response.json(true);}
  if(u.includes('rpc/convertshorts_refund_generation')){jobs.find(j=>j.id===body.j).status='FAILED_REFUNDED';return Response.json(true);}
  if(u.includes('convertshorts_generation_requests')){const id=new URL(u).searchParams.get('id')?.slice(3),j=jobs.find(j=>j.id===id);if(options.method==='PATCH'){Object.assign(j,body);return Response.json([j]);}assert.ok(u.includes('user_id=eq.'+user),'Status must be owned by authenticated user');return Response.json(j?[j]:[]);}
  throw Error('Unexpected database request '+u);
 }
 if(u.includes('api.stripe.com')){
  assert.equal(options.headers.Authorization,'Bearer sk_test_fixture');
  if(u.includes('/prices/'))return Response.json({active:true,unit_amount:priceAmount,currency:'usd',recurring:{interval:'month',interval_count:1}});
  const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price]'),'price_fixture');assert.equal(form.get('client_reference_id'),user);assert.equal(form.get('subscription_data[metadata][convertshorts_user]'),user);assert.equal(form.get('success_url'),'https://convertshorts.com/apps/#billing');return Response.json({url:'https://checkout.stripe.com/fixture'});
 }
 if(u==='https://queue.fal.run/fal-ai/flux/schnell'){assert.equal(options.headers.Authorization,'Key test-provider-key');return Response.json({request_id:'fixture',status_url:'https://queue.fal.run/fal-ai/flux/requests/fixture/status',response_url:'https://queue.fal.run/fal-ai/flux/requests/fixture',status:'IN_QUEUE'});}
 if(u.endsWith('/status'))return Response.json({status:'COMPLETED'});
 if(u.endsWith('/requests/fixture'))return providerResult==='good'?Response.json({images:[{url:'https://fal.media/result.png'}]}):Response.json({detail:'Input rejected'},{status:422});
 throw Error('Unexpected request '+u);
};
for(const m of MODELS.filter(m=>m.adapter==='schema'))assert.ok(Object.keys(m.schema.properties).length>0,m.id+' has no parameters');

for(const m of MODELS.filter(m=>m.adapter==='schema')){assert.throws(()=>prepareGeneration({model:m.id,input:{untrusted_parameter:true}}),undefined,m.id);}
assert.equal(normalizeMedia({model_obj:{url:'https://fal.media/test.obj'}},'object')[0].type,'model');assert.equal(normalizeMedia({result_files:[{url:'https://fal.media/part.fbx',file_name:'part.fbx'}]},'object')[0].type,'model');assert.equal(normalizeMedia({model_mesh:{url:'https://fal.media/test.ply'}},'world')[0].type,'world');
validateQueueURL('https://queue.fal.run/bria/video/background-removal/requests/fixture/status');
assert.throws(()=>validateQueueURL('https://queue.fal.run/bria/video/requests/fixture/status?steal=true'));
try{
 const request=new Request('https://convertshorts.com/api/worlds',{method:'POST',headers:{'X-World-Key':'test-world-key',Origin:'https://convertshorts.com'},body:JSON.stringify({model:'worldlabs:marble-1.1',input:{prompt:'A garden'}})});
 const r=await generateWorld(request);assert.equal(r.status,202);const j=await r.json();const done=await worldStatus(new Request('https://convertshorts.com/api/worlds?token='+encodeURIComponent(j.token),{headers:{'X-World-Key':'test-world-key'}}));assert.deepEqual((await done.json()).media.map(m=>m.type),['world','model','image']);
 const rejected=await worldStatus(new Request('https://convertshorts.com/api/worlds?token='+encodeURIComponent(j.token+'broken'),{headers:{'X-World-Key':'test-world-key'}}));assert.equal(rejected.status,403);
 const wrongOrigin=await generateWorld(new Request('https://convertshorts.com/api/worlds',{method:'POST',headers:{Origin:'https://example.invalid','X-World-Key':'test-world-key'},body:'{}'}));assert.equal(wrongOrigin.status,403);
 phase='billing';
 const checkout=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers,body:JSON.stringify({action:'checkout',plan:'creator-monthly',credits:1000000,price:'attacker'})}));assert.equal(checkout.status,200);assert.equal((await checkout.json()).url,'https://checkout.stripe.com/fixture');
 priceAmount=999;const wrongPrice=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers,body:JSON.stringify({action:'checkout',plan:'creator-monthly'})}));assert.equal(wrongPrice.status,503);priceAmount=2400;
 const unknown=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers,body:JSON.stringify({action:'checkout',plan:'attacker'})}));assert.equal(unknown.status,400);
 const forged=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers:{'stripe-signature':'t=1,v1=wrong'},body:'{}'}));assert.equal(forged.status,400);assert.equal(events.length,0);
 const text='{"fixture":true}',time=Math.floor(Date.now()/1000),sig=createHmac('sha256','whsec_fixture').update(time+'.'+text).digest('hex');assert.ok(await verifySignature(text,`t=${time},v1=${sig}`,'whsec_fixture'));assert.ok(!await verifySignature(text+'x',`t=${time},v1=${sig}`,'whsec_fixture'));assert.ok(!await verifySignature(text,`t=${time-1000},v1=${sig}`,'whsec_fixture'));
 // Hosted generation works independently from merchant checkout configuration.
 delete values.CONVERTSHORTS_STRIPE_SECRET_KEY;delete values.CONVERTSHORTS_STRIPE_WEBHOOK_SECRET;
 const start=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers,body:JSON.stringify({action:'generate',generation:{model:'flux-fast',prompt:'A scene'},expectedCredits:1,pricingVersion:PRICING_VERSION,credits:0})}));assert.equal(start.status,202);const job=await start.json();assert.equal(jobs[0].credits,1);assert.ok(job.cloudJobID);assert.ok(!JSON.stringify(job).includes('test-provider-key'));
 const result=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing?action=status&job='+job.cloudJobID,{headers}));assert.equal((await result.json()).status,'COMPLETED');
 providerResult='failed';const second=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing',{method:'POST',headers,body:JSON.stringify({action:'generate',generation:{model:'flux-fast',prompt:'Another scene'},expectedCredits:1,pricingVersion:PRICING_VERSION})}));const job2=await second.json();const fail=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing?action=status&job='+job2.cloudJobID,{headers}));assert.equal(fail.status,422);assert.equal(jobs[1].status,'FAILED_REFUNDED');assert.ok(dbCalls.some(c=>c.u.endsWith('rpc/convertshorts_refund_generation')));
 const unauthorized=await handleBilling(new Request('https://fixture.supabase.co/functions/v1/convertshorts-billing'));assert.equal(unauthorized.status,401);
}finally{globalThis.fetch=nativeFetch;delete globalThis.Deno;}
console.log('PASS World Labs private generation and exports, schema validation, authenticated hosted generation, server-priced checkout, webhook signatures and failure refunds (HTTP mocked).');
