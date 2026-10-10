import assert from 'node:assert/strict';
import {makeWorkflow,normalizeWorkflow,workflowWaves,validateGraph,validateReady,estimateWorkflow,workflowBody,buildPrompt,executeWorkflow} from '../apps/studio/workflow-core.js';

let counter=0;const id=()=> 'step-'+(++counter);
const cinema=makeWorkflow('cinematic',id),gens=cinema.nodes.filter(n=>['image','video'].includes(n.type)),image=gens[0],video=gens[1];
assert.deepEqual(workflowWaves(cinema),[[image.id],[video.id]]);
validateReady(cinema,[]);
const quote=estimateWorkflow(cinema,100);
assert.equal(quote.credits,5160);assert.equal(quote.retailInr,51.6);
assert.equal(quote.steps[1].body.reference,'https://workflow.invalid/reference.jpg');
video.duration=10;video.audio=true;
assert.equal(estimateWorkflow(cinema,100).retailInr,177.6);
const realistic=estimateWorkflow(makeWorkflow('cinematic',id),96.64);
assert.equal(realistic.retailInr,49.87,'Sum separately rounded server reservations');
assert.equal(estimateWorkflow(cinema,null).credits,null);
const storyboard=makeWorkflow('storyboard',id);
assert.deepEqual(workflowWaves(storyboard).map(w=>w.length),[3,3]);
const product=makeWorkflow('product',id);
assert.throws(()=>validateReady(product,[]),/available library image/);
product.nodes.find(n=>n.type==='reference').assetId='asset-1';
validateReady(product,[{id:'asset-1',type:'image'}]);
assert.throws(()=>validateReady(product,[{id:'asset-1',type:'image',deleted:true}]),/available library image/);
const loop=makeWorkflow('blank',id);loop.nodes=[{id:id(),type:'image',name:'A',model:'nano-banana'},{id:id(),type:'image',name:'B',model:'nano-banana'}];loop.edges=[{id:id(),source:loop.nodes[0].id,target:loop.nodes[1].id,input:'reference'},{id:id(),source:loop.nodes[1].id,target:loop.nodes[0].id,input:'reference'}];
assert.throws(()=>validateGraph(loop),/loop/);
const invalid=structuredClone(cinema);invalid.edges.push({...invalid.edges[0],id:id()});assert.throws(()=>validateGraph(invalid),/one connection/);
invalid.edges.pop();invalid.edges[0].source=video.id;assert.throws(()=>validateGraph(invalid),/Connect a prompt/);
const empty=structuredClone(cinema);empty.nodes.find(n=>n.type==='prompt').prompt='';image.prompt='A stale local prompt';assert.throws(()=>validateReady(empty,[]),/Write or connect/);
const flux=structuredClone(product);flux.nodes.find(n=>n.type==='image').model='flux-fast';assert.throws(()=>estimateWorkflow(flux,100),/does not accept references/);
const edit=structuredClone(cinema);edit.nodes.find(n=>n.type==='image').model='nano-edit';assert.throws(()=>workflowBody(edit,edit.nodes.find(n=>n.type==='image')),/Connect a reference/);
const malicious={...cinema,nodes:[{...cinema.nodes[0],id:'"><script>'}]};assert.throws(()=>normalizeWorkflow(malicious),/Invalid workflow step/);
assert.throws(()=>normalizeWorkflow({...cinema,nodes:Array.from({length:41},()=>cinema.nodes[0])}),/40 steps/);
assert.throws(()=>normalizeWorkflow({...cinema,nodes:cinema.nodes.map(n=>n.type==='video'?{...n,model:'unpriced-new-model'}:n)}),/supported model/);
assert.equal(buildPrompt({subject:'A product',lighting:'Warm light',exclude:'Blur'}),'A product. Lighting: Warm light. Avoid: Blur.');

function newRun(flow){return {id:id(),status:'running',steps:Object.fromEntries(flow.nodes.filter(n=>['image','video'].includes(n.type)).map(n=>[n.id,{status:'queued'}])),quotes:{}};}
function fixture(flow,{failNode,uncertainNode,pauseNode,wrongType}={}){
 const submitted=[],references=[],saved=[],results=new Map();let active=0,maxActive=0,stopped=false;
 const io={save:async r=>saved.push(structuredClone(r)),shouldStop:()=>stopped,onChange:()=>{},reference:async assetId=>{references.push(assetId);return 'data:image/png;base64,reference';},submit:async(n,body)=>{
  submitted.push({node:n.id,body});if(n.id===uncertainNode)throw Error('Submission timeout');
  const job={id:'job-'+n.id};results.set(job.id,{id:'asset-'+n.id,type:wrongType||n.type});if(n.id===pauseNode)stopped=true;return job;
 },wait:async jobId=>{active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));active--;const n=jobId.replace(/^job-/,'');if(n===failNode)throw Error('Confirmed provider failure');return results.get(jobId);}};
 return {io,submitted,references,saved,results,get maxActive(){return maxActive;},resume:()=>stopped=false};
}
let flow=makeWorkflow('cinematic',id),run=newRun(flow),f=fixture(flow);await executeWorkflow(flow,run,f.io);
assert.equal(run.status,'complete');assert.equal(f.submitted.length,2);assert.equal(f.references[0],'asset-'+flow.nodes.find(n=>n.type==='image').id);
assert.equal(f.submitted[1].body.reference,'data:image/png;base64,reference');
flow=makeWorkflow('storyboard',id);run=newRun(flow);f=fixture(flow);await executeWorkflow(flow,run,f.io);assert.equal(f.submitted.length,6);assert.equal(f.maxActive,2,'Provider batches must be bounded to two simultaneous jobs');
flow=makeWorkflow('cinematic',id);run=newRun(flow);const first=flow.nodes.find(n=>n.type==='image').id;f=fixture(flow,{failNode:first});await executeWorkflow(flow,run,f.io);assert.equal(run.status,'needs-review');assert.equal(f.submitted.length,1,'A failed image must never launch a video');
flow=makeWorkflow('cinematic',id);run=newRun(flow);f=fixture(flow,{uncertainNode:flow.nodes.find(n=>n.type==='image').id});await executeWorkflow(flow,run,f.io);assert.equal(run.status,'needs-review');assert.equal(f.submitted.length,1);await executeWorkflow(flow,run,f.io);assert.equal(f.submitted.length,1,'An ambiguous submission must never auto-retry');
flow=makeWorkflow('cinematic',id);run=newRun(flow);f=fixture(flow,{pauseNode:flow.nodes.find(n=>n.type==='image').id});await executeWorkflow(flow,run,f.io);assert.equal(run.status,'paused');assert.equal(f.submitted.length,1);assert.ok(Object.values(run.steps)[0].jobId,'Persist accepted job while pausing');f.resume();await executeWorkflow(flow,run,f.io);assert.equal(run.status,'complete');assert.equal(f.submitted.length,2,'Resume reuses the already submitted image job');
flow=makeWorkflow('cinematic',id);run=newRun(flow);f=fixture(flow,{wrongType:'audio'});await executeWorkflow(flow,run,f.io);assert.equal(run.status,'needs-review');assert.equal(f.submitted.length,1);
flow=makeWorkflow('cinematic',id);run=newRun(flow);run.steps[flow.nodes.find(n=>n.type==='image').id].status='submitting';f=fixture(flow);await executeWorkflow(flow,run,f.io);assert.equal(f.submitted.length,0);assert.equal(run.status,'needs-review','Reloading during submission cannot silently charge again');
console.log('PASS workflow pricing, typed connections, dependency order, bounded parallel execution, failure guard, pause/resume and uncertain-submission protection.');

const ratioFlow=makeWorkflow();ratioFlow.nodes.find(n=>n.type==='video').ratio='4:3';assert.throws(()=>estimateWorkflow(ratioFlow,100),/Kling video supports/);
