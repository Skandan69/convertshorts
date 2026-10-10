// Daily mid-market reference rates. Never silently invent a conversion rate.
export const FX_URL='https://api.frankfurter.dev/v2/rate/USD/INR';
let cached=null,pending=null;
export function validRate(data,now=Date.now()) {
  const time=Date.parse(data?.date),rate=Number(data?.rate);
  if(data?.base&&String(data.base).toUpperCase()!=='USD'||data?.quote&&String(data.quote).toUpperCase()!=='INR')throw Error('The currency pair does not match.');
  if(!Number.isFinite(time)||time>now+86400000||now-time>7*86400000||!Number.isFinite(rate)||rate<1||rate>1000)throw Error('A current USD/INR rate is unavailable.');
  return {rate:Number(rate.toFixed(6)),date:data.date,source:data.source||'Frankfurter daily reference rate'};
}
export async function getExchangeRate(env,fetcher=fetch) {
  const manual=env('CONVERTSHORTS_USD_INR');
  if(manual)return validRate({rate:Number(manual),date:env('CONVERTSHORTS_USD_INR_DATE'),source:'Merchant conversion rate'});
  if(cached&&Date.now()-cached.fetched<6*3600000)return validRate(cached);
  if(!pending)pending=(async()=>{const r=await fetcher(FX_URL,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Currency conversion is temporarily unavailable.');const d=await r.json();const result=validRate(d);cached={...result,fetched:Date.now()};return result;})().finally(()=>pending=null);
  return pending;
}
