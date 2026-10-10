// Shared browser/server policy. Prices are reviewed against the linked Fal pages.
// A credit is one US cent of retail generation value, not a provider credit.
export const PRICING_VERSION = '2026-10-10-v1';
export const CREDIT_USD = 0.01;
export const MARKUP_PERCENT = 25;
export const CREDIT_PLANS = [
  {id:'starter-monthly',name:'Starter',mode:'subscription',amountCents:700,currency:'usd',credits:700,interval:'month'},
  {id:'creator-monthly',name:'Creator',mode:'subscription',amountCents:2400,currency:'usd',credits:2400,interval:'month'},
  {id:'studio-monthly',name:'Studio',mode:'subscription',amountCents:4200,currency:'usd',credits:4200,interval:'month'},
  {id:'topup-5',name:'Credit pack',mode:'payment',amountCents:500,currency:'usd',credits:500}
];
export const PRICE_SOURCES = [
  'https://fal.ai/models/fal-ai/flux/schnell',
  'https://fal.ai/models/fal-ai/nano-banana-2',
  'https://fal.ai/models/fal-ai/nano-banana-2/edit',
  'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video',
  'https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video'
];
export function supportsHostedPricing(model) { return PRICE_SOURCES.includes('https://fal.ai/models/'+model.endpoint); }
function integer(value,min,max,fallback) {
  const n=value===undefined||value===''?fallback:Number(value);
  if(!Number.isInteger(n)||n<min||n>max)throw Error('Check the generation settings before pricing.');
  return n;
}
export function quoteCredits(endpoint,input={}) {
  let providerMicros;
  if(endpoint==='fal-ai/flux/schnell') {
    // The offered presets fit within two billable megapixels. Arbitrary sizes
    // are not sold through this policy until their dimensions are costed.
    if(!['square','square_hd','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'].includes(input.image_size||'square_hd'))throw Error('This image size is not priced for hosted credits.');
    providerMicros=6000*integer(input.num_images,1,4,1);
  } else if(['fal-ai/nano-banana-2','fal-ai/nano-banana-2/edit'].includes(endpoint)) {
    const rates={'0.5K':60000,'1K':80000,'2K':120000,'4K':160000},resolution=input.resolution||'1K';
    if(!rates[resolution])throw Error('This resolution is not priced for hosted credits.');
    const extras=(input.enable_web_search||input.enable_google_search?15000:0)+(input.thinking_level==='high'?2000:0);
    providerMicros=(rates[resolution]+extras)*integer(input.num_images,1,4,1);
  } else if(/^fal-ai\/kling-video\/v2\.6\/pro\/(text-to-video|image-to-video)$/.test(endpoint)) {
    const seconds=integer(input.duration,5,10,5);
    if(![5,10].includes(seconds))throw Error('Choose a five or ten second video.');
    const audio=input.generate_audio!==false;
    const voices=Array.isArray(input.voice_ids)&&input.voice_ids.length>0;
    providerMicros=seconds*(audio?(voices?168000:140000):70000);
  } else throw Error('This model currently needs your own provider key.');
  const credits=Math.max(1,Math.ceil(providerMicros*(100+MARKUP_PERCENT)/1000000));
  return {credits,retailUsd:credits*CREDIT_USD,providerUsd:providerMicros/1000000,version:PRICING_VERSION};
}
export function quoteDraft(model,body={}) {
  if(model.adapter==='schema')return quoteCredits(model.endpoint,body.input||{});
  let endpoint=model.endpoint,input={};
  if(model.kind==='image'||model.kind==='edit') {
    input={num_images:body.count||1,resolution:body.resolution||'1K',image_size:'square_hd'};
    if(model.id.startsWith('nano')&&(body.reference||model.kind==='edit'))endpoint='fal-ai/nano-banana-2/edit';
  } else if(model.kind==='video') {
    input={duration:body.duration||5,generate_audio:body.audio===true};
    if(body.reference)endpoint='fal-ai/kling-video/v2.6/pro/image-to-video';
  }
  return quoteCredits(endpoint,input);
}
