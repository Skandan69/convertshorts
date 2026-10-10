import {scopedStorage,currentNamespace,uid} from './storage.js';
import {cloudRequest,cloudState} from './cloud.js';
import {getBillingConfig} from './config.js';
import {quoteDraft,supportsHostedPricing} from './pricing.js';

const polling=new Map();
const notice=()=>window.dispatchEvent(new Event('studio-generation-changed'));
export async function submitHostedGeneration(body,model,{expected,metadata={},guard=()=>true}={}){
 const store=scopedStorage(),config=await getBillingConfig();
 const check=()=>{store.check();if(!guard())throw Error('Workflow paused before submission.');if(!cloudState().user)throw Error('Sign in to generate.');};
 let price;
 try{
  check();if(!config.generationEnabled)throw Error('AI generation is coming soon. Save your workflow for launch.');
  if(!supportsHostedPricing(model))throw Error('This model is not available for hosted generation.');
  price=quoteDraft(model,body,config.usdInr||null);
  if(expected&&(price.credits!==expected.credits||price.version!==expected.version))throw Error('The price changed. Review the workflow budget again.');
  const latest=await cloudRequest('/functions/v1/convertshorts-billing',{method:'POST',body:{action:'quote',generation:body},beforeRequest:check});check();
  if(latest.credits!==price.credits||latest.version!==price.version)throw Error('The price changed. Review the workflow budget again.');
 }catch(e){e.definiteRejection=true;e.notSubmitted=true;throw e;}
 const jobId=uid();let submitted;
 try{submitted=await cloudRequest('/functions/v1/convertshorts-billing',{method:'POST',body:{action:'generate',generation:body,expectedCredits:price.credits,pricingVersion:price.version},beforeRequest:check});}
 catch(e){
  e.definiteRejection=e.notSubmitted===true||/Not enough balance|Insufficient|refunded|price changed|coming soon|Sign in|not priced|Invalid|not available/i.test(e.message);
  const uncertain=e.message.match(/review job ([0-9a-f-]{36})/i);
  if(uncertain&&store.isCurrent()){
   await store.put('jobs',{id:jobId,cloudJobID:uncertain[1],status:'WAITING',provider:'hosted',model:model.id,modelName:model.name,kind:model.kind,generationKind:model.kind,prompt:body.prompt||'',created:Date.now(),error:e.message,...metadata});e.jobId=jobId;notice();
  }
  throw e;
 }
 store.check();
 const job={...metadata,id:jobId,...submitted,prompt:body.prompt||'',modelName:model.name,model:model.id,kind:model.kind,generationKind:model.kind,provider:'hosted',created:Date.now(),quotedCredits:price.credits};
 await store.put('jobs',job);notice();return job;
}
export async function pollHostedJob(id){
 const namespace=currentNamespace(),key=namespace+':'+id;
 if(polling.has(key))return polling.get(key);
 const promise=(async()=>{
  const store=scopedStorage(),job=await store.get('jobs',id);if(!job)return;
  if(!job.cloudJobID||job.provider!=='hosted'||['COMPLETED','FAILED','CANCELLED'].includes(job.status))return job;
  try{
   const result=await cloudRequest('/functions/v1/convertshorts-billing?action=status&job='+encodeURIComponent(job.cloudJobID));store.check();
   job.queuePosition=result.queuePosition;job.error='';
   if(result.status==='COMPLETED'){
    if(!Array.isArray(result.media)||!result.media.length)throw Error('The completed request has no media. Check Generation History.');
    const assetIds=[];
    for(let i=0;i<result.media.length;i++){
     const media=result.media[i],assetId=job.id+'-'+i,prior=await store.get('assets',assetId);
     if(prior){assetIds.push(prior.id);continue;}
     const ext={image:'png',video:'mp4',audio:'wav',model:'glb',world:'zip'}[media.type]||'bin';
     const asset={id:assetId,name:media.name||`${job.modelName.replaceAll(' ','-')}-${job.id.slice(0,6)}.${ext}`,type:media.type,mime:media.mime,remote:media.url,prompt:job.prompt,generationKind:job.generationKind||job.kind,created:Date.now(),model:job.modelName,...(job.workflowID?{workflowID:job.workflowID,workflowRunID:job.workflowRunID,workflowNodeID:job.workflowNodeID}:{})};
     try{const r=await fetch(media.url,{signal:AbortSignal.timeout(30000)});if(r.ok&&Number(r.headers.get('content-length'))<100*1024*1024){const blob=await r.blob();if(blob.size<100*1024*1024)asset.blob=blob;}}catch{}
     store.check();await store.put('assets',asset);assetIds.push(asset.id);
    }
    job.assetIds=assetIds;
   }
   job.status=result.status;await store.put('jobs',job);notice();return job;
  }catch(e){
   store.check();job.error=e.message;
   // Transient status errors do not imply a provider failure or a refund.
   job.status=/Generation failed|credits refunded|produced no media|Provider rejected/i.test(e.message)?'FAILED':'WAITING';
   await store.put('jobs',job);notice();return job;
  }
 })();polling.set(key,promise);
 try{return await promise;}finally{polling.delete(key);}
}
