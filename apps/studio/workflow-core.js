import {quoteDraft} from './pricing.js';

// Deliberately bounded to the exact-priced launch adapters. Workflow nodes use
// the same request shape and price policy as the ordinary studio composer.
export const WORKFLOW_FORMAT='convertshorts-workflow-v1';
export const WORKFLOW_MODELS=[
 {id:'flux-fast',name:'FLUX Schnell',kind:'image',endpoint:'fal-ai/flux/schnell',reference:false},
 {id:'nano-banana',name:'Nano Banana 2',kind:'image',endpoint:'fal-ai/nano-banana-2',reference:true},
 {id:'nano-edit',name:'Nano Banana 2 Edit',kind:'edit',endpoint:'fal-ai/nano-banana-2/edit',reference:true},
 {id:'kling',name:'Kling 2.6 Pro',kind:'video',endpoint:'fal-ai/kling-video/v2.6/pro/text-to-video',reference:true}
];
export const NODE_TYPES={prompt:{label:'Prompt',output:'prompt'},reference:{label:'Reference image',output:'image'},image:{label:'Generate image',output:'image'},video:{label:'Generate video',output:'video'}};
export const generationNode=n=>n.type==='image'||n.type==='video';
const idOK=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const fail=m=>{throw Error(m);};
export function workflowModel(node){const m=WORKFLOW_MODELS.find(m=>m.id===node.model);if(!m||node.type==='video'&&m.kind!=='video'||node.type==='image'&&!['image','edit'].includes(m.kind))fail('Choose a supported model for '+node.name+'.');return m;}
export function normalizeWorkflow(raw,{id=raw?.id}={}){
 if(!raw||raw.recordType!=='workflow'||!Array.isArray(raw.nodes)||!Array.isArray(raw.edges)||raw.nodes.length>40||raw.edges.length>80)fail('Choose a valid workflow with up to 40 steps and 80 connections.');
 if(!idOK(id))fail('Invalid workflow identifier.');
 const nodes=raw.nodes.map((n,i)=>{
  if(!n||!idOK(n.id)||!NODE_TYPES[n.type])fail('Invalid workflow step.');
  const node={id:n.id,type:n.type,name:String(n.name||NODE_TYPES[n.type].label).slice(0,80),x:Math.max(0,Math.min(5000,Number(n.x)||0)),y:Math.max(0,Math.min(4000,Number(n.y)||0))};
  if(n.type==='reference'){if(n.assetId&&!idOK(n.assetId))fail('Invalid reference image.');node.assetId=n.assetId||'';}
  else node.prompt=String(n.prompt||'').slice(0,10000);
  if(generationNode(n)){
   Object.assign(node,{model:String(n.model|| (n.type==='video'?'kling':'nano-banana')),ratio:['1:1','16:9','9:16','4:3','3:4'].includes(n.ratio)?n.ratio:'16:9',resolution:['1K','2K','4K'].includes(n.resolution)?n.resolution:'1K',duration:[5,10].includes(Number(n.duration))?Number(n.duration):5,audio:n.audio===true,negative:String(n.negative||'').slice(0,2500)});
   workflowModel(node);
  }
  return node;
 });
 const ids=new Set(nodes.map(n=>n.id));if(ids.size!==nodes.length)fail('Workflow step identifiers must be unique.');
 const edges=raw.edges.map(e=>{if(!e||!idOK(e.id)||!ids.has(e.source)||!ids.has(e.target)||!['prompt','reference'].includes(e.input))fail('Invalid workflow connection.');return {id:e.id,source:e.source,target:e.target,input:e.input};});
 const flow={id,recordType:'workflow',name:String(raw.name||'Untitled workflow').slice(0,80),nodes,edges,created:Number(raw.created)||Date.now()};
 validateGraph(flow);return flow;
}
export function validateGraph(flow){
 const seen=new Set(),ports=new Set(),adj=new Map(flow.nodes.map(n=>[n.id,[]])),indegree=new Map(flow.nodes.map(n=>[n.id,0]));
 for(const e of flow.edges){
  const a=flow.nodes.find(n=>n.id===e.source),b=flow.nodes.find(n=>n.id===e.target);
  if(!a||!b||!generationNode(b)||NODE_TYPES[a.type]?.output!== (e.input==='prompt'?'prompt':'image'))fail('Connect a prompt to Prompt, or an image to Reference.');
  if(a.id===b.id)fail('A step cannot connect to itself.');
  if(seen.has(e.id)||ports.has(e.target+':'+e.input))fail('Each input accepts one connection. Disconnect it before choosing another.');
  seen.add(e.id);ports.add(e.target+':'+e.input);adj.get(a.id).push(b.id);indegree.set(b.id,indegree.get(b.id)+1);
 }
 let count=0;const queue=flow.nodes.filter(n=>!indegree.get(n.id)).map(n=>n.id);
 while(queue.length){const id=queue.shift();count++;for(const next of adj.get(id)){indegree.set(next,indegree.get(next)-1);if(!indegree.get(next))queue.push(next);}}
 if(count!==flow.nodes.length)fail('This connection creates a loop. Workflows must move forward.');
 return true;
}
export function workflowWaves(flow){
 validateGraph(flow);const remaining=new Set(flow.nodes.map(n=>n.id)),done=new Set(),waves=[];
 while(remaining.size){const next=flow.nodes.filter(n=>remaining.has(n.id)&&flow.edges.filter(e=>e.target===n.id).every(e=>done.has(e.source)));if(!next.length)fail('Workflow contains a loop.');const wave=next.filter(generationNode).map(n=>n.id);if(wave.length)waves.push(wave);for(const n of next){remaining.delete(n.id);done.add(n.id);}}
 return waves;
}
export function connectedNode(flow,node,input){const e=flow.edges.find(e=>e.target===node.id&&e.input===input);return e&&flow.nodes.find(n=>n.id===e.source);}
export function nodePrompt(flow,node){const source=connectedNode(flow,node,'prompt');return (source?source.prompt:node.prompt)?.trim()||'';}
export function workflowBody(flow,node,reference){
 const m=workflowModel(node),source=connectedNode(flow,node,'reference');
 if(source&&!m.reference)fail(m.name+' does not accept references. Choose Nano Banana 2.');
 if(m.kind==='edit'&&!source)fail('Connect a reference image to '+node.name+'.');
 return {model:m.id,prompt:nodePrompt(flow,node),ratio:node.ratio,count:1,resolution:node.resolution,duration:node.duration,audio:node.audio===true,negative:node.negative||'',...(source?{reference:reference||'https://workflow.invalid/reference.jpg'}:{})};
}
export function estimateWorkflow(flow,usdInr){
 validateGraph(flow);const steps=flow.nodes.filter(generationNode).map(node=>({nodeId:node.id,name:node.name,model:workflowModel(node),body:workflowBody(flow,node),quote:quoteDraft(workflowModel(node),workflowBody(flow,node),usdInr||null)}));
 return {steps,credits:usdInr?steps.reduce((n,s)=>n+s.quote.credits,0):null,retailInr:usdInr?steps.reduce((n,s)=>n+s.quote.credits,0)/100:null,providerUsd:steps.reduce((n,s)=>n+s.quote.providerUsd,0),retailUsd:steps.reduce((n,s)=>n+s.quote.retailUsd,0)};
}
export function validateReady(flow,assets){
 validateGraph(flow);if(!flow.nodes.some(generationNode))fail('Add an image or video generation step.');
 for(const n of flow.nodes.filter(generationNode)){
  if(!nodePrompt(flow,n))fail('Write or connect a prompt for '+n.name+'.');
  workflowBody(flow,n);
  const source=connectedNode(flow,n,'reference');if(source?.type==='reference'&&!assets.some(a=>a.id===source.assetId&&a.type==='image'&&!a.deleted))fail('Choose an available library image for '+source.name+'.');
 }
 return true;
}
export function buildPrompt({subject='',action='',setting='',style='',lighting='',camera='',exclude=''}={}){
 const parts=[subject.trim(),action.trim(),setting.trim()?'Setting: '+setting.trim():'',style.trim()?'Visual style: '+style.trim():'',lighting.trim()?'Lighting: '+lighting.trim():'',camera.trim()?'Camera: '+camera.trim():'',exclude.trim()?'Avoid: '+exclude.trim():''].filter(Boolean);
 if(!parts.length)fail('Add a subject or a scene detail first.');return parts.join('. ')+'.';
}
export const WORKFLOW_TEMPLATES=[
 {id:'cinematic',name:'Cinematic image → video',description:'Create a key image, then animate it into a five-second clip.'},
 {id:'product',name:'Product showcase',description:'Bring your product photo, create a scene, then animate the result.'},
 {id:'storyboard',name:'Three-shot story',description:'Create three images in parallel, then make a video from each.'}
];
export function makeWorkflow(template='cinematic',newId=()=>crypto.randomUUID()){
 const nodes=[],edges=[],add=(type,name,x,y,data={})=>{const n={id:newId(),type,name,x,y,...data};if(generationNode(n))Object.assign(n,{model:type==='image'?'nano-banana':'kling',ratio:'16:9',resolution:'1K',duration:5,audio:false,negative:'',...data});nodes.push(n);return n;};
 const link=(a,b,input)=>edges.push({id:newId(),source:a.id,target:b.id,input});
 if(template==='blank')return {id:newId(),recordType:'workflow',name:'Untitled workflow',nodes,edges,created:Date.now()};
 const flow={id:newId(),recordType:'workflow',name:WORKFLOW_TEMPLATES.find(t=>t.id===template)?.name||'Cinematic image → video',nodes,edges,created:Date.now()};
 const shots=template==='storyboard'?3:1;
 const ref=template==='product'?add('reference','Your product photo',60,520,{assetId:''}):null;
 for(let i=0;i<shots;i++){
  const y=60+i*590;
  const p=add('prompt',shots===1?'Describe the scene':'Shot '+(i+1)+' · scene',60,y,{prompt:template==='product'?'Premium studio photograph of the reference product on a sculptural stone pedestal, warm natural light, realistic materials, clean background.':shots===1?'A quiet Indian courtyard at sunrise, warm light across carved stone, cinematic composition, realistic detail.':['Wide establishing view of an Indian courtyard at sunrise, realistic cinema photography.','Medium shot of sunlight through carved stone arches in the same Indian courtyard, realistic cinema photography.','Close-up of a brass lamp on stone in the same Indian courtyard, warm sunrise light, realistic cinema photography.'][i]});
  const image=add('image',shots===1?'Create the key image':'Shot '+(i+1)+' · image',430,y);link(p,image,'prompt');if(ref)link(ref,image,'reference');
  const motion=add('prompt',shots===1?'Describe the movement':'Shot '+(i+1)+' · movement',430,y+330,{prompt:template==='product'?'Slow camera orbit around the product. Preserve its shape and label. Natural light and subtle reflections.':'Slow, steady camera movement. Preserve the architecture and lighting. Subtle natural movement, no sudden cuts.'});
  const video=add('video',shots===1?'Animate the image':'Shot '+(i+1)+' · video',800,y);link(image,video,'reference');link(motion,video,'prompt');
 }
 return flow;
}

// Runner has injected I/O so dependency, pause, failure and resumption behaviour
// can be verified without provider spend. Accepted jobs are never auto-retried.
export async function executeWorkflow(flow,run,io){
 let failed=false;const update=async(id,patch)=>{Object.assign(run.steps[id],patch);await io.save(run);io.onChange?.(id);};
 for(const wave of workflowWaves(flow)){
  for(let offset=0;offset<wave.length;offset+=2){
   if(io.shouldStop()||failed)break;
   const batch=wave.slice(offset,offset+2);
   await Promise.all(batch.map(async id=>{
    const node=flow.nodes.find(n=>n.id===id),step=run.steps[id];
    if(step.status==='complete')return;
    try{
     if(step.status==='uncertain')fail('Submission needs review. Check Generation History before starting another run.');
     const source=connectedNode(flow,node,'reference');let assetId=source?.assetId;
     if(source&&generationNode(source)){const upstream=run.steps[source.id];if(upstream.status!=='complete'||!upstream.assetId)fail('The upstream image is not ready.');assetId=upstream.assetId;}
     if(!step.jobId){
      if(step.status==='submitting')fail('Submission needs review. Check Generation History before starting another run.');
      if(io.shouldStop())return;
      const reference=assetId?await io.reference(assetId):undefined;
      if(io.shouldStop())return;
      await update(id,{status:'submitting',error:''});
      let job;
      try{job=await io.submit(node,workflowBody(flow,node,reference),run.quotes[id]);}
      catch(e){if(io.shouldStop()&&e.notSubmitted){await update(id,{status:'queued',error:''});return;}await update(id,{status:e.definiteRejection?'failed':'uncertain',error:e.message,...(e.jobId?{jobId:e.jobId}:{})});throw e;}
      // Persist the accepted job even if the route was closed while submitting.
      await update(id,{status:'running',jobId:job.id});
     }
     if(io.shouldStop())return;
     const asset=await io.wait(step.jobId);
     if(!asset){if(io.shouldStop())return;fail('The generation has no usable result yet.');}
     if(asset.type!==node.type)fail('The output type does not match this step. Check Generation History.');
     await update(id,{status:'complete',assetId:asset.id,error:''});
    }catch(e){failed=true;if(!['uncertain','submitting'].includes(step.status))await update(id,{status:'failed',error:e.message});else if(step.status==='submitting')await update(id,{status:'uncertain',error:e.message});}
   }));
  }
  if(io.shouldStop()||failed)break;
 }
 run.status=failed?'needs-review':io.shouldStop()?'paused':Object.values(run.steps).every(s=>s.status==='complete')?'complete':'paused';await io.save(run);io.onChange?.();return run;
}
