import {timingSafeEqual} from 'node:crypto';
import {MODELS,StudioError,prepareGeneration,signJob,verifyJob,validateQueueURL,normalizeMedia} from '../server/studio-core.mjs';
import {WORLD_MODELS} from '../server/world-models.mjs';
export const maxDuration=60;
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>Response.json(data,{status,headers});
function credential(request){
  const personal=request.headers.get('x-provider-key');
  if(personal){if(personal.length<8||personal.length>512||!/^[\x21-\x7E]+$/.test(personal))throw new StudioError('Check your Fal API key.',401);return personal;}
  const secret=process.env.STUDIO_ACCESS_TOKEN,provided=request.headers.get('x-studio-token');
  if(secret&&provided&&provided.length===secret.length&&timingSafeEqual(Buffer.from(provided),Buffer.from(secret))&&process.env.FAL_KEY)return process.env.FAL_KEY;
  throw new StudioError('Connect your Fal API key in Settings to generate. Local editing tools work without a connection.',401);
}
function sameOrigin(request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new StudioError('Use the studio on this website.',403);}
async function provider(url,key,method='GET',body){
  const response=await fetch(url,{method,headers:{Authorization:'Key '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(40000)});
  let data;try{data=await response.json();}catch{throw new StudioError('The provider returned an unreadable response. Try checking the job again.',502);}
  if(!response.ok){const status=response.status===401||response.status===403?401:response.status===429?429:response.status===422?422:502;
    const message=status===401?'Fal rejected the API key. Reconnect a valid key in Settings.':status===429?'Fal rate limit reached. Wait before submitting again.':response.status===402?'Your Fal account needs a funded balance.':typeof data.detail==='string'?data.detail.slice(0,250):'The provider could not process this request. Check the inputs and your Fal dashboard.';
    throw new StudioError(message,status);
  }return data;
}
async function readBody(request){if(Number(request.headers.get('content-length'))>4200000)throw new StudioError('The reference image is too large.',413);const text=await request.text();if(text.length>4200000)throw new StudioError('The reference image is too large.',413);try{return JSON.parse(text);}catch{throw new StudioError('Send a JSON request.');}}
async function handle(request,action){
  try{sameOrigin(request);const url=new URL(request.url);
    if(action==='GET'&&url.searchParams.get('action')==='config')return reply({models:MODELS.concat(WORLD_MODELS),personalKeySupported:true,sharedProviderConfigured:!!(process.env.FAL_KEY&&process.env.STUDIO_ACCESS_TOKEN),storage:'local-and-optional-cloud'});
    const key=credential(request);
    if(action==='POST'){
      const body=await readBody(request),generation=prepareGeneration(body);
      const submitted=await provider('https://queue.fal.run/'+generation.endpoint,key,'POST',generation.input);
      if(!submitted.request_id||!submitted.status_url||!submitted.response_url)throw new StudioError('The provider did not return a job ID.',502);
      for(const field of ['status_url','response_url','cancel_url'])if(submitted[field])validateQueueURL(submitted[field]);
      const token=signJob({request_id:submitted.request_id,status_url:submitted.status_url,response_url:submitted.response_url,cancel_url:submitted.cancel_url,model:generation.model.id,kind:generation.model.kind},key);
      return reply({token,requestId:submitted.request_id,status:submitted.status||'IN_QUEUE'},202);
    }
    const job=verifyJob(url.searchParams.get('token'),key);
    if(action==='DELETE'){if(!job.cancel_url)throw new StudioError('This provider did not supply a cancel URL.');return reply(await provider(job.cancel_url,key,'PUT'));}
    const status=await provider(job.status_url,key);
    if(status.status==='COMPLETED'){const result=await provider(job.response_url,key);return reply({status:'COMPLETED',media:normalizeMedia(result,job.kind)});}
    return reply({status:status.status,queuePosition:status.queue_position});
  }catch(e){if(!(e instanceof StudioError))console.error('Studio provider request failed:',e.name);return reply({error:e instanceof StudioError?e.message:'The request timed out or the provider is unavailable. Your queued job can be checked again.'},e.status||502);}
}
export function GET(request){return handle(request,'GET');}
export function POST(request){return handle(request,'POST');}
export function DELETE(request){return handle(request,'DELETE');}
