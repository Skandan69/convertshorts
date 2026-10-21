import {CREDIT_PLANS,MARKUP_PERCENT} from './pricing.js';
let configPromise;
export const unavailableBilling=()=>({enabled:false,generationEnabled:false,paymentProvider:'razorpay',currency:'INR',markupPercent:MARKUP_PERCENT,plans:CREDIT_PLANS.map(p=>({...p,available:false})),usdInr:null});
export async function getBillingConfig({refresh=false}={}){
  if(refresh)configPromise=null;
  if(!configPromise)configPromise=(async()=>{let info=unavailableBilling();try{const response=await fetch('/api/billing?action=config',{signal:AbortSignal.timeout(12000)});if(response.ok)info=await response.json();}catch{}
    // Soft launch: the public config stays "coming soon". A signed-in account on the
    // owner allowlist gets the live config from the billing function instead.
    if(info.softLaunch)try{const {cloudState,cloudRequest}=await import('./cloud.js');if(cloudState().user)info=await cloudRequest('/functions/v1/convertshorts-billing?action=config');}catch{}
    return info;})();
  return configPromise;
}
