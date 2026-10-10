import {prepareGeneration,MODELS,StudioError,validateQueueURL,normalizeMedia} from './studio-core.mjs';
import {CREDIT_PLANS,PRICING_VERSION,MARKUP_PERCENT,quoteCredits,supportsHostedPricing} from '../apps/studio/pricing.js';
import {getExchangeRate} from './billing-fx.mjs';
// Supabase Edge Function. Private payment/provider secrets never reach the browser.
const env=(k:string)=>Deno.env.get(k)||'';
const base=()=>env('SUPABASE_URL'),secret=()=>env('SUPABASE_SERVICE_ROLE_KEY');
const cors=(req:Request)=>({'Access-Control-Allow-Origin':req.headers.get('origin')==='https://convertshorts.com'?'https://convertshorts.com':'null','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'});
const reply=(req:Request,value:unknown,status=200)=>Response.json(value,{status,headers:cors(req)});
const testMode=()=>env('CONVERTSHORTS_RAZORPAY_KEY_ID').startsWith('rzp_test_');
const hostedEnabled=()=>env('CONVERTSHORTS_HOSTED_ENABLED')==='true'&&!!env('CONVERTSHORTS_FAL_KEY')&&!testMode();
const merchantConfigured=()=>!!(env('CONVERTSHORTS_RAZORPAY_KEY_SECRET')&&env('CONVERTSHORTS_RAZORPAY_WEBHOOK_SECRET'))&&(/^rzp_live_\w+$/.test(env('CONVERTSHORTS_RAZORPAY_KEY_ID'))||testMode()&&env('CONVERTSHORTS_BILLING_TEST_MODE')==='true');
async function db(path:string,method='GET',body?:unknown){const r=await fetch(base()+'/rest/v1/'+path,{method,headers:{apikey:secret(),Authorization:'Bearer '+secret(),'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok){if(d.message==='Insufficient workspace credits')throw new StudioError('Not enough balance. Add a small top-up in Pricing & credits.',402);throw Error('Billing data request failed');}return d;}
async function razorpay(path:string,body?:unknown){const r=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa(env('CONVERTSHORTS_RAZORPAY_KEY_ID')+':'+env('CONVERTSHORTS_RAZORPAY_KEY_SECRET')),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Razorpay could not complete this request. Please retry.');return r.json();}
export async function verifyHmac(raw:string,signature:string,key:string){if(!key||! /^[0-9a-f]{64}$/.test(signature))return false;const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(raw)));const expected=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');let difference=0;for(let i=0;i<expected.length;i++)difference|=signature.charCodeAt(i)^expected.charCodeAt(i);return difference===0;}
async function checkoutOrder(id:string){if(!/^order_[a-zA-Z0-9]+$/.test(id||''))throw new StudioError('Invalid payment order.');const rows=await db('convertshorts_checkout_orders?id=eq.'+id);if(!rows[0])throw new StudioError('Payment order not found.',404);return rows[0];}
async function confirmPayment(order:any,paymentId:string){
 if(!/^pay_[a-zA-Z0-9]+$/.test(paymentId||''))throw new StudioError('Invalid payment reference.');
 if(order.test_mode!==testMode())throw new StudioError('This order belongs to a different payment mode.',409);
 const payment=await razorpay('payments/'+paymentId);
 if(payment.id!==paymentId||payment.order_id!==order.id||payment.currency!=='INR'||payment.amount!==order.amount_paise)throw new StudioError('Payment amount or order does not match.',400);
 if(payment.status!=='captured'||payment.captured!==true||Number(payment.amount_refunded||0)>0)throw new StudioError('Payment is not captured yet. The balance will update after capture.',409);
 // Real test payments never become spendable credits or fund live Fal jobs.
 if(order.test_mode)return {verified:true,testMode:true,credited:false};
 const applied=await db('rpc/convertshorts_apply_razorpay_payment','POST',{o:order.id,p:paymentId});
 return {verified:true,credited:true,alreadyCredited:applied===false,amountInr:order.amount_paise/100};
}
export async function handleBilling(req:Request){try{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors(req)});
 if(!['GET','POST'].includes(req.method))return reply(req,{error:'Unsupported method'},405);
 if(new URL(req.url).searchParams.get('action')==='config'){
  let fx=null;try{fx=await getExchangeRate(env);}catch{}
  const generationEnabled=hostedEnabled()&&!!fx,enabled=merchantConfigured()&&(testMode()||generationEnabled);
  return reply(req,{enabled,generationEnabled,paymentProvider:'razorpay',testMode:testMode(),currency:'INR',markupPercent:MARKUP_PERCENT,pricingVersion:PRICING_VERSION,usdInr:fx?.rate||null,fxDate:fx?.date||null,fxSource:fx?.source||null,hostedModels:MODELS.filter(supportsHostedPricing).map(m=>m.id),plans:CREDIT_PLANS.map(p=>({...p,available:enabled}))});
 }
 if(new URL(req.url).searchParams.get('action')==='webhook'){
  const key=env('CONVERTSHORTS_RAZORPAY_WEBHOOK_SECRET');if(!key)return reply(req,{error:'Webhook not configured'},503);
  const raw=await req.text();if(raw.length>1000000||!await verifyHmac(raw,req.headers.get('x-razorpay-signature')||'',key))return reply(req,{error:'Invalid signature'},400);
  const event=JSON.parse(raw);
  if(['payment.captured','order.paid'].includes(event.event)){
   const payment=event.payload?.payment?.entity;if(!payment?.order_id||!payment?.id)throw new StudioError('Missing payment event.');
   const order=await checkoutOrder(payment.order_id);await confirmPayment(order,payment.id);
  }
  return reply(req,{received:true});
 }
 const origin=req.headers.get('origin');if(origin&&origin!=='https://convertshorts.com')return reply(req,{error:'Use ConvertShorts'},403);
 const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply(req,{error:'Sign in first'},401);const userResponse=await fetch(base()+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:authorization},signal:AbortSignal.timeout(10000)});if(!userResponse.ok)return reply(req,{error:'Sign in again'},401);const user=await userResponse.json();
 const accounts=await db('convertshorts_billing_accounts?user_id=eq.'+user.id),account=accounts[0];
 if(new URL(req.url).searchParams.get('action')==='status'){
  const id=new URL(req.url).searchParams.get('job');if(!/^[0-9a-f-]{36}$/.test(id||''))return reply(req,{error:'Invalid job'},400);const jobs=await db('convertshorts_generation_requests?id=eq.'+id+'&user_id=eq.'+user.id),job=jobs[0];if(!job)return reply(req,{error:'Job not found'},404);if(job.status==='FAILED_REFUNDED')return reply(req,{error:'Generation failed. Workspace credits refunded.'},422);if(!job.provider)return reply(req,{error:'Submission status is uncertain. Ask the owner to review this request.'},409);
  const key=env('CONVERTSHORTS_FAL_KEY');for(const field of ['status_url','response_url'])validateQueueURL(job.provider[field]);const status=await fetch(job.provider.status_url,{headers:{Authorization:'Key '+key},signal:AbortSignal.timeout(30000)});if(!status.ok)return reply(req,{error:'Provider status temporarily unavailable'},502);const d=await status.json();if(d.status==='COMPLETED'){
   const result=await fetch(job.provider.response_url,{headers:{Authorization:'Key '+key},signal:AbortSignal.timeout(30000)});if(!result.ok){if([400,422].includes(result.status)){await db('rpc/convertshorts_refund_generation','POST',{j:id});return reply(req,{error:'Generation failed. Workspace credits refunded.'},422);}return reply(req,{error:'Provider result temporarily unavailable'},502);}
   let media;try{media=normalizeMedia(await result.json(),MODELS.find(m=>m.id===job.model)?.kind);}catch{await db('rpc/convertshorts_refund_generation','POST',{j:id});return reply(req,{error:'Generation produced no media. Workspace credits refunded.'},422);}await db('convertshorts_generation_requests?id=eq.'+id,'PATCH',{status:'COMPLETED'});return reply(req,{status:'COMPLETED',media});
  }if(['FAILED','CANCELLED','ERROR'].includes(d.status)){await db('rpc/convertshorts_refund_generation','POST',{j:id});return reply(req,{error:'Generation failed. Workspace credits refunded.'},422);}return reply(req,{status:d.status,queuePosition:d.queue_position});
 }
 if(req.method==='GET'){const grants=await db('convertshorts_credit_grants?user_id=eq.'+user.id+'&valid_from=lte.'+encodeURIComponent(new Date().toISOString()));const credits=grants.filter((g:any)=>!g.expires_at||Date.parse(g.expires_at)>Date.now()).reduce((n:number,g:any)=>n+g.remaining,0);return reply(req,{plan:account?.plan||'Free',credits,balanceInr:credits/100,currency:'INR'});}
 const raw=await req.text();if(raw.length>4200000)return reply(req,{error:'Request too large'},413);const body=JSON.parse(raw);
 if(body.action==='quote'||body.action==='generate'){
  if(!hostedEnabled())return reply(req,{error:'Hosted credits are not available yet. You can use your own provider key.'},503);const generation=prepareGeneration(body.generation);let quote;try{quote=quoteCredits(generation.endpoint,generation.input,(await getExchangeRate(env)).rate);}catch(e){throw new StudioError(e instanceof Error?e.message:'This model is not priced.');}
  if(body.action==='quote')return reply(req,quote);
  if(body.expectedCredits!==quote.credits||body.pricingVersion!==quote.version)return reply(req,{error:'The generation price changed. Review the current credits and submit again.',quote:{credits:quote.credits,version:quote.version}},409);
  const id=crypto.randomUUID();await db('rpc/convertshorts_reserve_credits','POST',{u:user.id,j:id,m:generation.model.id,amount:quote.credits});
  let response;try{response=await fetch('https://queue.fal.run/'+generation.endpoint,{method:'POST',headers:{Authorization:'Key '+env('CONVERTSHORTS_FAL_KEY'),'Content-Type':'application/json'},body:JSON.stringify(generation.input),signal:AbortSignal.timeout(40000)});}catch{return reply(req,{error:'Provider submission is uncertain. Credits are reserved; ask the owner to review job '+id},502);}
  if(!response.ok){await db('rpc/convertshorts_refund_generation','POST',{j:id});return reply(req,{error:'Provider rejected the request. Credits refunded.'},422);}const provider=await response.json();for(const key of ['status_url','response_url','cancel_url'])if(provider[key])validateQueueURL(provider[key]);await db('convertshorts_generation_requests?id=eq.'+id,'PATCH',{provider,status:provider.status||'IN_QUEUE'});return reply(req,{cloudJobID:id,requestId:provider.request_id,status:provider.status||'IN_QUEUE'},202);
 }

 if(body.action==='verify'){
  const order=await checkoutOrder(body.orderId);if(order.user_id!==user.id)return reply(req,{error:'Payment belongs to another account.'},403);
  if(!await verifyHmac(order.id+'|'+body.paymentId,body.signature||'',env('CONVERTSHORTS_RAZORPAY_KEY_SECRET')))return reply(req,{error:'Invalid payment signature'},400);
  return reply(req,await confirmPayment(order,body.paymentId));
 }
 if(body.action==='checkout'){
  const p=CREDIT_PLANS.find(p=>p.id===body.plan);if(!p)return reply(req,{error:'Unknown top-up amount'},400);
  if(!merchantConfigured()||(!testMode()&&!hostedEnabled()))return reply(req,{error:'Payments are not available yet. You can use your own Fal key.'},503);
  if(!testMode())await getExchangeRate(env);
  const order=await razorpay('orders',{amount:p.amountCents,currency:'INR',receipt:'cs_'+crypto.randomUUID().replaceAll('-',''),notes:{service:'convertshorts',pack:p.id,user:user.id}});
  if(!/^order_[a-zA-Z0-9]+$/.test(order.id||'')||order.amount!==p.amountCents||order.currency!=='INR')throw Error('The payment order could not be verified.');
  await db('convertshorts_checkout_orders','POST',{id:order.id,user_id:user.id,pack:p.id,amount_paise:p.amountCents,test_mode:testMode()});
  return reply(req,{provider:'razorpay',keyId:env('CONVERTSHORTS_RAZORPAY_KEY_ID'),orderId:order.id,amount:p.amountCents,currency:'INR',description:p.amountCents/100+' rupees of prepaid generation balance',testMode:testMode()});
 }
 return reply(req,{error:'Unsupported billing action'},400);
 }catch(e){return reply(req,{error:e instanceof Error?e.message:'Billing request failed'},e instanceof StudioError?e.status:502);}}
if(import.meta.main)Deno.serve(handleBilling);
