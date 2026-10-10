import {CREDIT_PLANS} from './pricing.js';
let configPromise;
export const unavailableBilling=()=>({enabled:false,generationEnabled:false,paymentProvider:'razorpay',currency:'INR',markupPercent:20,plans:CREDIT_PLANS.map(p=>({...p,available:false})),usdInr:null});
export async function getBillingConfig({refresh=false}={}){
  if(refresh)configPromise=null;
  if(!configPromise)configPromise=(async()=>{try{const response=await fetch('/api/billing?action=config',{signal:AbortSignal.timeout(12000)});if(response.ok)return await response.json();}catch{}return unavailableBilling();})();
  return configPromise;
}
