import {createHmac, timingSafeEqual} from 'node:crypto';
import catalog from './model-catalog.json' with {type:'json'};

// Independently implemented adapters. No ArtCraft web-platform source is reused.
export const MODELS = [
  {id:'flux-fast',name:'FLUX Schnell',kind:'image',endpoint:'fal-ai/flux/schnell',note:'Fast image exploration',reference:false},
  {id:'flux-2',name:'FLUX 2',kind:'image',endpoint:'fal-ai/flux-2',note:'Detailed image generation',reference:false},
  {id:'nano-banana',name:'Nano Banana 2',kind:'image',endpoint:'fal-ai/nano-banana-2',note:'Image generation and reference editing',reference:true},
  {id:'nano-edit',name:'Nano Banana 2 Edit',kind:'edit',endpoint:'fal-ai/nano-banana-2/edit',note:'Prompted edits with references',reference:true},
  {id:'kling',name:'Kling 2.6 Pro',kind:'video',endpoint:'fal-ai/kling-video/v2.6/pro/text-to-video',note:'Text or image to video with optional audio',reference:true},
  {id:'stable-audio',name:'Stable Audio 2.5',kind:'audio',endpoint:'fal-ai/stable-audio-25/text-to-audio',note:'Music and sound effects',reference:false},
  {id:'trellis',name:'Trellis 2',kind:'object',endpoint:'fal-ai/trellis-2',note:'Image to a textured GLB model',reference:true},
  {id:'hunyuan-world',name:'Hunyuan World',kind:'world',endpoint:'fal-ai/hunyuan_world/image-to-world',note:'Image to a downloadable world asset',reference:true},
  {id:'remove-background',name:'Bria Background Removal',kind:'background',endpoint:'fal-ai/bria/background/remove',note:'Transparent subject cutouts',reference:true},
  {id:'replace-background',name:'Background Change',kind:'background',endpoint:'fal-ai/image-editing/background-change',note:'Prompt a new environment',reference:true}
].concat(catalog);
export class StudioError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const integer=(v,min,max,fallback)=>{const n=v===''||v==null?fallback:Number(v);if(!Number.isInteger(n)||n<min||n>max)throw new StudioError(`Choose a value between ${min} and ${max}.`);return n;};
function imageInput(value){
  if(!value||typeof value!=='string')throw new StudioError('Add an image reference first.');
  if(value.length>2500000)throw new StudioError('Reference is too large. Use a smaller image.');
  if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(url.hostname))return url.href;}catch{}
  throw new StudioError('Reference must be an image upload or a public HTTPS image URL.');
}
export function prepareGeneration(body){
  const model=MODELS.find(m=>m.id===body.model);if(!model)throw new StudioError('This model is not supported.');
  if(model.adapter==='schema'){const input=validateSchema(body.input,model.schema,'input');return {model,endpoint:model.endpoint,input};}
  const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
  if(prompt.length>10000)throw new StudioError('Keep the prompt under 10,000 characters.');
  if(!prompt&&!['object','world','background'].includes(model.kind))throw new StudioError('Describe what you want to create.');
  const ratio=['1:1','16:9','9:16','3:2','2:3','4:3','3:4'].includes(body.ratio)?body.ratio:'1:1';
  const input={};let endpoint=model.endpoint;
  if(model.kind==='image'||model.kind==='edit'){
    input.prompt=prompt;input.num_images=integer(body.count,1,4,1);
    if(model.id.startsWith('nano')){input.aspect_ratio=ratio;input.resolution=['1K','2K','4K'].includes(body.resolution)?body.resolution:'1K';input.output_format='png';
      if(body.reference||model.kind==='edit'){endpoint='fal-ai/nano-banana-2/edit';input.image_urls=(body.references?.length?body.references:[body.reference]).slice(0,6).map(imageInput);}
    }else{input.image_size={'1:1':'square_hd','16:9':'landscape_16_9','9:16':'portrait_16_9','3:2':'landscape_4_3','2:3':'portrait_4_3','4:3':'landscape_4_3','3:4':'portrait_4_3'}[ratio];input.output_format='png';}
    if(body.seed!==undefined&&body.seed!=='')input.seed=integer(body.seed,0,2147483647,0);
  }else if(model.kind==='video'){
    input.prompt=prompt;input.duration=String(integer(body.duration,5,10,5));if(!['5','10'].includes(input.duration))throw new StudioError('Video duration must be 5 or 10 seconds.');
    input.aspect_ratio=['1:1','16:9','9:16'].includes(ratio)?ratio:'16:9';input.generate_audio=body.audio===true;
    if(body.reference){endpoint='fal-ai/kling-video/v2.6/pro/image-to-video';input.image_url=imageInput(body.reference);}
    if(typeof body.negative==='string'&&body.negative.trim())input.negative_prompt=body.negative.slice(0,1000);
  }else if(model.kind==='audio'){input.prompt=prompt;input.seconds_total=integer(body.duration,10,190,30);}
  else if(model.kind==='object'){input.image_url=imageInput(body.reference);input.resolution=['512','1024','1536'].includes(body.resolution)?body.resolution:'512';}
  else if(model.kind==='world'){input.image_url=imageInput(body.reference);for(const key of ['labels_fg1','labels_fg2','classes']){input[key]=String(body[key]||'').trim().slice(0,200);if(!input[key])throw new StudioError('Enter foreground labels and scene classes for world generation.');}}
  else {input.image_url=imageInput(body.reference);if(model.id==='replace-background'){if(!prompt)throw new StudioError('Describe the new background.');input.prompt=prompt;input.output_format='png';}}
  return {model,endpoint,input};
}
const signature=(payload,key)=>createHmac('sha256',key).update(payload).digest('base64url');
export function signJob(data,key){const encoded=Buffer.from(JSON.stringify({...data,created:Date.now()})).toString('base64url');return encoded+'.'+signature(encoded,key);}
export function verifyJob(token,key){
  if(typeof token!=='string'||token.length>8000)throw new StudioError('Invalid job token.',403);
  const [encoded,sig]=token.split('.');const expected=signature(encoded||'',key);if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new StudioError('Reconnect the same provider key to access this job.',403);
  let data;try{data=JSON.parse(Buffer.from(encoded,'base64url').toString());}catch{throw new StudioError('Invalid job token.',403);}
  if(!Number.isFinite(data.created)||Date.now()-data.created>30*86400000)throw new StudioError('This job token has expired.',410);
  for(const field of ['status_url','response_url','cancel_url'])if(data[field])validateQueueURL(data[field]);return data;
}
export function validateQueueURL(value){const u=new URL(value);if(u.origin!=='https://queue.fal.run'||u.username||u.password||u.search||u.hash||!/^\/(?:fal-ai|tripo3d|bytedance|openai|minimax|xai|wan-ai|bria)\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\/requests\/[a-zA-Z0-9_-]+(?:\/status|\/cancel)?$/.test(u.pathname))throw new StudioError('Invalid provider job URL.',502);return u;}
export function validateSchema(value,schema,path='input',depth=0){
 if(depth>12)throw new StudioError('Parameters are nested too deeply.');
 if(schema.anyOf||schema.oneOf){for(const candidate of schema.anyOf||schema.oneOf){try{return validateSchema(value,candidate,path,depth+1);}catch{}}throw new StudioError('Check '+path+'.');}
 if(value===undefined){if(schema.default!==undefined)return schema.default;return undefined;}
 if(schema.enum&&!schema.enum.includes(value))throw new StudioError('Choose a supported value for '+path+'.');
 const type=schema.type;
 if(type==='object'||schema.properties){if(!value||Array.isArray(value)||typeof value!=='object')throw new StudioError('Check '+path+'.');const out={};for(const k of schema.required||[])if(value[k]===undefined||value[k]==='')throw new StudioError('Enter '+k.replaceAll('_',' ')+'.');for(const [k,v] of Object.entries(value)){if(!(k in (schema.properties||{})))throw new StudioError('Unknown parameter '+k+'.');out[k]=validateSchema(v,schema.properties[k],path+'.'+k,depth+1);}return out;}
 if(type==='array'){if(!Array.isArray(value)||value.length>Math.min(schema.maxItems||100,100)||value.length<(schema.minItems||0))throw new StudioError('Check '+path+'.');return value.map(v=>validateSchema(v,schema.items||{},path,depth+1));}
 if(type==='boolean'&&typeof value!=='boolean'||type==='null'&&value!==null)throw new StudioError('Check '+path+'.');
 if(type==='number'||type==='integer'){if(typeof value!=='number'||!Number.isFinite(value)||type==='integer'&&!Number.isInteger(value)||value<(schema.minimum??-1e12)||value>(schema.maximum??1e12))throw new StudioError('Check '+path+'.');}
 if(type==='string'){if(typeof value!=='string'||value.length>Math.min(schema.maxLength||(/(?:image|mask|video|audio|file).*url/.test(path)?2500000:10000),2500000)||value.length<(schema.minLength||0))throw new StudioError('Check '+path+'.');if(/(?:image|mask|video|audio|file).*url/.test(path)){if(value.startsWith('data:')){if(!/^data:(image\/(?:png|jpeg|webp)|audio\/[\w.+-]+|video\/[\w.+-]+);base64,[A-Za-z0-9+/=]+$/.test(value)||value.length>2500000)throw new StudioError('Check the media upload.');}else imageInput(value);}}
 return value;
}
export function normalizeMedia(result,kind){
  const entries=[];const add=(v,type)=>{if(!v)return;const url=typeof v==='string'?v:v.url;try{const u=new URL(url);if(u.protocol!=='https:')return;if(entries.some(e=>e.url===u.href))return;entries.push({url:u.href,type,name:typeof v==='object'?v.file_name:undefined,mime:typeof v==='object'?v.content_type:undefined});}catch{}};
  for(const v of result.images||[])add(v,'image');add(result.image,'image');add(result.video,'video');add(result.audio||result.audio_url||result.audio_file,'audio');add(result.model_glb||result.glb||result.model_urls?.glb||result.model||(kind==='object'?result.model_mesh:null),'model');add((kind==='world'?result.model_mesh:null)||result.world_file||result.gaussian_splat||result.gaussian_splat_file||result.splat||result.ply,'world');
  if(result.output&&typeof result.output==='object'){for(const key of ['model_glb','glb'])add(result.output[key],'model');for(const key of ['ply','splat'])add(result.output[key],'world');}
  for(const v of result.videos||[])add(v,'video');
  add(result.mask_video,'video');add(result.model_obj,'model');for(const [format,v] of Object.entries(result.model_urls||{}))add(v,['glb','fbx','obj'].includes(format)?'model':format==='texture'?'image':'file');for(const key of ['rigged_character_glb','rigged_character_fbx','animation_glb','animation_fbx'])add(result[key],'model');for(const v of result.result_files||[])add(v,/\.(glb|fbx|obj)$/i.test(v.file_name||v.url)?'model':'file');add(result.material_mtl,'file');add(result.texture,'image');
  if(!entries.length)throw new StudioError('The provider finished without a usable media file. Check the request in your Fal dashboard.',502);return entries;
}
