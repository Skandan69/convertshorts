// Shared browser/server policy. Prices are reviewed against the linked Fal pages.
// Wallet accounting uses INR paise. Customer-facing balances and quotes show rupees.
export const PRICING_VERSION = '2026-10-10-inr-v2';
export const CREDIT_INR = 0.01;
export const MARKUP_PERCENT = 20;
export const formatINR = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
export const formatUSD = n => '$'+Number(n).toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
export const CREDIT_PLANS = [
  {id:'topup-100',name:'Start small',mode:'payment',amountCents:10000,currency:'inr',credits:10000},
  {id:'topup-500',name:'Keep creating',mode:'payment',amountCents:50000,currency:'inr',credits:50000},
  {id:'topup-1000',name:'Create more',mode:'payment',amountCents:100000,currency:'inr',credits:100000}
];
export const PRICE_SOURCES = [
  'https://fal.ai/models/fal-ai/flux/schnell',
  'https://fal.ai/models/fal-ai/nano-banana-2',
  'https://fal.ai/models/fal-ai/nano-banana-2/edit',
  'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video',
  'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video',
  'https://fal.ai/models/fal-ai/ace-step',
  'https://fal.ai/models/fal-ai/minimax-music/v2'
];
export function supportsHostedPricing(model) { return PRICE_SOURCES.includes('https://fal.ai/models/'+model.endpoint); }
function integer(value,min,max,fallback) {
  const n=value===undefined||value===''?fallback:Number(value);
  if(!Number.isInteger(n)||n<min||n>max)throw Error('Check the generation settings before pricing.');
  return n;
}
export function quoteCredits(endpoint,input={},usdInr=null) {
  let providerMicros;
  if(endpoint==='fal-ai/flux/schnell') {
    // The offered presets fit within two billable megapixels. Arbitrary sizes
    // are not sold through this policy until their dimensions are costed.
    if(!['square','square_hd','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'].includes(input.image_size||'square_hd'))throw Error('This image size is not priced for hosted credits.');
    providerMicros=((input.image_size||'square_hd')==='square_hd'?6000:3000)*integer(input.num_images,1,4,1);
  } else if(['fal-ai/nano-banana-2','fal-ai/nano-banana-2/edit'].includes(endpoint)) {
    if(input.limit_generations===false)throw Error('Unlimited image outputs are not priced for hosted generation.');
    const rates={'0.5K':60000,'1K':80000,'2K':120000,'4K':160000},resolution=input.resolution||'1K';
    if(!rates[resolution])throw Error('This resolution is not priced for hosted credits.');
    const extras=(input.enable_web_search||input.enable_google_search?15000:0)+(input.thinking_level==='high'?2000:0);
    providerMicros=(rates[resolution]+extras)*integer(input.num_images,1,4,1);
  } else if(/^fal-ai\/kling-video\/v2\.6\/pro\/(text-to-video|image-to-video)$/.test(endpoint)) {
    const seconds=integer(input.duration,5,10,5);
    if(![5,10].includes(seconds))throw Error('Choose a five or ten second video.');
    const audio=input.generate_audio!==false;
    const voices=endpoint.endsWith('/image-to-video')&&Array.isArray(input.voice_ids)&&input.voice_ids.length>0;
    providerMicros=seconds*(audio?(voices?168000:140000):70000);
  } else if(endpoint==='fal-ai/ace-step') {
    providerMicros=200*integer(input.duration,5,240,60);
  } else if(endpoint==='fal-ai/minimax-music/v2') {
    providerMicros=30000;
  } else throw Error('This model currently needs your own provider key.');
  const providerUsd=providerMicros/1000000,retailUsd=providerUsd*(100+MARKUP_PERCENT)/100;
  if(usdInr===null)return {providerUsd,retailUsd,credits:null,retailInr:null,version:PRICING_VERSION};
  if(!Number.isFinite(usdInr)||usdInr<1||usdInr>1000)throw Error('The currency rate is unavailable. Please try again later.');
  // Round up only at the final paise boundary; avoid the previous whole-US-cent minimum.
  const credits=Math.max(1,Math.ceil(retailUsd*usdInr*100-1e-9));
  return {credits,retailInr:credits*CREDIT_INR,providerUsd,retailUsd,usdInr,version:PRICING_VERSION+':'+usdInr.toFixed(6)};
}
export function quoteDraft(model,body={},usdInr=null) {
  if(model.adapter==='schema')return quoteCredits(model.endpoint,body.input||{},usdInr);
  let endpoint=model.endpoint,input={};
  if(model.kind==='image'||model.kind==='edit') {
    input={num_images:body.count||1,resolution:body.resolution||'1K',image_size:{'1:1':'square_hd','16:9':'landscape_16_9','9:16':'portrait_16_9','3:2':'landscape_4_3','2:3':'portrait_4_3','4:3':'landscape_4_3','3:4':'portrait_4_3'}[body.ratio||'1:1']||'square_hd'};
    if(model.id.startsWith('nano')&&(body.reference||model.kind==='edit'))endpoint='fal-ai/nano-banana-2/edit';
  } else if(model.kind==='video') {
    input={duration:body.duration||5,generate_audio:body.audio===true};
    if(body.reference)endpoint='fal-ai/kling-video/v2.6/pro/image-to-video';
  }
  return quoteCredits(endpoint,input,usdInr);
}

export const PRICE_EXAMPLES = [
  ['FLUX Schnell · 1024 × 1024 image','fal-ai/flux/schnell',{image_size:'square_hd'}],
  ['Nano Banana 2 · 1K image','fal-ai/nano-banana-2',{resolution:'1K'}],
  ['Nano Banana 2 · 2K image','fal-ai/nano-banana-2',{resolution:'2K'}],
  ['Nano Banana 2 · 4K image','fal-ai/nano-banana-2',{resolution:'4K'}],
  ['Kling 2.6 · 5 seconds · no audio','fal-ai/kling-video/v2.6/pro/text-to-video',{duration:5,generate_audio:false}],
  ['Kling 2.6 · 5 seconds · audio','fal-ai/kling-video/v2.6/pro/text-to-video',{duration:5,generate_audio:true}],
  ['Kling 2.6 · 10 seconds · audio','fal-ai/kling-video/v2.6/pro/text-to-video',{duration:10,generate_audio:true}],
  ['ACE-Step · 60 seconds of music','fal-ai/ace-step',{duration:60}],
  ['MiniMax Music 2 · one song','fal-ai/minimax-music/v2',{}]
];
