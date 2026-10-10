import {initializeCloud,cloudState,cloudRequest} from '/apps/studio/cloud.js';
import {CREDIT_PLANS,formatINR} from '/apps/studio/pricing.js';
import {openCheckout} from '/apps/studio/razorpay.js';
const message=document.querySelector('#payment-message'),button=document.querySelector('#pay-now');
const say=text=>message.textContent=text;
await initializeCloud({accountOnly:true,toast:say,onChange:()=>{if(!cloudState().user)button.disabled=true;}});
const pack=CREDIT_PLANS.find(p=>p.id===new URLSearchParams(location.search).get('pack'));
let order;
try{
 if(!pack)throw Error('Choose a top-up amount from the studio.');
 if(!cloudState().user)throw Error('Sign in in the studio, then return here to top up.');
 const r=await fetch('/api/billing?action=config'),info=await r.json();
 if(!info.enabled)throw Error('Razorpay payments are not activated yet. Your own Fal key is available in the studio.');
 document.querySelector('#payment-title').textContent='Add '+formatINR(pack.amountCents/100);
 document.querySelector('#payment-details').textContent=info.testMode?'Razorpay test mode. No real generation balance will be awarded.':formatINR(pack.amountCents/100)+' of prepaid AI balance. No subscription, no automatic renewal and no expiry.';
 button.disabled=false;
 button.onclick=async()=>{button.disabled=true;say('Opening secure checkout…');try{
  if(!order)order=await cloudRequest('/functions/v1/convertshorts-billing',{method:'POST',body:{action:'checkout',plan:pack.id}});
  const result=await openCheckout(order,{request:cloudRequest,email:cloudState().user?.email,onVerified:d=>{say(d.testMode?'Test payment verified. No real AI credits were added.':'Payment verified. '+formatINR(d.amountInr)+' is available in your studio.');button.hidden=true;}});
  if(!result)say('Checkout closed. You can retry with the same payment order.');
 }catch(e){say(e.message+' If payment was captured, the verified webhook can finish updating your balance.');}finally{if(!button.hidden)button.disabled=false;}};
}catch(e){say(e.message);document.querySelector('#payment-details').textContent='Your prepaid balance has not been changed.';}
