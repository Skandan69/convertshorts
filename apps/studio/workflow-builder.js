import {icon,escape as esc} from './icons.js';
import {scopedStorage,currentNamespace,uid,referenceData,downloadAsset} from './storage.js';
import {cloudState,cloudRequest,uploadReference} from './cloud.js';
import {getBillingConfig,unavailableBilling} from './config.js';
import {formatINR,formatCredits,formatUSD} from './pricing.js';
import {submitHostedGeneration,pollHostedJob} from './generation-service.js';
import {WORKFLOW_MODELS,WORKFLOW_TEMPLATES,NODE_TYPES,generationNode,workflowModel,normalizeWorkflow,validateGraph,validateReady,estimateWorkflow,connectedNode,nodePrompt,workflowBody,buildPrompt,makeWorkflow,executeWorkflow} from './workflow-core.js';
import {exportWorkflow,importWorkflow} from './workflow-archive.js';

const statusName={queued:'Ready',submitting:'Submitting',running:'Generating',complete:'Saved to library',failed:'Needs review',uncertain:'Check submission'};
const visual={prompt:'edit',reference:'image',image:'background',video:'video'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function mountWorkflowBuilder(view,{toast,assetURL,isActive=()=>true}){
 const store=scopedStorage(),scope=currentNamespace(),events=new AbortController();
 let workflows=(await store.all('projects')).filter(p=>p.recordType==='workflow'&&!p.deleted).flatMap(record=>{try{return [{...record,...normalizeWorkflow(record)}];}catch{return [];}}),assets=(await store.all('assets')).filter(a=>!a.deleted);
 if(!store.isCurrent()||!isActive())return ()=>{};
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 let active=workflows.find(f=>f.id===params.get('id'))||workflows[0],selected='',config=unavailableBilling();
 let disposed=false,busy=false,changing=false,stopRequested=false,saving=Promise.resolve(),saveTimer,drag,connectFrom='',pan={x:0,y:0,zoom:1},list=matchMedia('(max-width:760px)').matches;
 if(!document.getElementById('workflow-styles')){const link=document.createElement('link');link.id='workflow-styles';link.rel='stylesheet';link.href='/apps/studio/workflow.css';link.onload=()=>{if(!disposed&&store.isCurrent()&&isActive())fit();};document.head.append(link);}
 if(params.get('asset')&&assets.some(a=>a.id===params.get('asset')&&a.type==='image')){active=makeWorkflow('product');active.nodes.find(n=>n.type==='reference').assetId=params.get('asset');workflows.unshift(active);await store.put('projects',active);history.replaceState(null,'',location.pathname+'#workflow?id='+active.id);}
 if(!active){active=makeWorkflow();workflows.unshift(active);await store.put('projects',active);}
 const alive=()=>!disposed&&store.isCurrent()&&isActive();
 if(!alive())return ()=>{};
 function save(){
  const record=active;
  saving=saving.catch(()=>{}).then(async()=>{if(store.isCurrent())await store.put('projects',record);});
  saving.then(()=>{if(alive()){const s=view.querySelector('#wf-save-state');if(s)s.textContent='Saved';}}).catch(e=>{if(alive())toast(e.message);});return saving;
 }
 function schedule(){clearTimeout(saveTimer);const state=view.querySelector('#wf-save-state');if(state)state.textContent='Saving…';saveTimer=setTimeout(save,180);}
 const el=id=>view.querySelector('#'+id);
 const node=id=>active.nodes.find(n=>n.id===id);
 const selectedNode=()=>node(selected);
 const asset=id=>assets.find(a=>a.id===id);
 function estimate(){try{return estimateWorkflow(active,config.usdInr);}catch{return null;}}
 function totalLabel(q){return !q?'Connect valid steps':q.retailInr!==null?formatCredits(q.retailInr)+' · '+formatINR(q.retailInr):formatUSD(q.retailUsd)+' · INR rate unavailable';}
 async function reloadAssets(){assets=(await store.all('assets')).filter(a=>!a.deleted);}
 function select(id){selected=id;drawCanvas();drawInspector();}
 function layout(){
  if(!alive())return;connectFrom='';drag=null;history.replaceState(null,'',location.pathname+'#workflow?id='+active.id);
  view.innerHTML=`<section class="wf-page"><header class="wf-heading"><div><span class="eyebrow">BUILD A CREATIVE PROCESS</span><h1>Workflow Builder <span class="tag">FREE TO PLAN</span></h1><p>Connect your idea to an image, then turn it into a film.</p></div><div class="head-actions"><a class="outline-button" href="#guide">How to use</a><a class="outline-button" href="#library">My Library</a></div></header>
   <div class="wf-project-bar"><label class="wf-project-select">Your workflows<select id="wf-select" aria-label="Saved workflow">${workflows.map(f=>`<option value="${esc(f.id)}" ${f.id===active.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><input id="wf-name" maxlength="80" aria-label="Workflow name" value="${esc(active.name)}"><span id="wf-save-state" role="status">Saved</span><button class="outline-button" id="wf-new">+ New</button><button class="outline-button" id="wf-templates">Templates</button><button class="outline-button" id="wf-import">Import ZIP</button><button class="outline-button" id="wf-export">Export ZIP</button><button class="icon-button" id="wf-archive" aria-label="Archive workflow">${icon('trash',17)}</button></div>
   <div class="wf-controls"><div class="wf-add-buttons"><span>Add a step</span>${Object.entries(NODE_TYPES).map(([type,meta])=>`<button class="outline-button" data-wf-add="${type}">${icon(visual[type],15)} ${meta.label}</button>`).join('')}</div><div class="wf-run-actions"><button class="outline-button" id="wf-check" ${active.run?'':'hidden'}>Check jobs</button><button class="outline-button" id="wf-resume" ${active.run&&active.run.status!=='complete'?'':'hidden'}>Resume</button><button class="primary-button" id="wf-review">Review budget ${icon('arrow',16)}</button><button class="outline-button" id="wf-pause" hidden>Pause next steps</button></div></div>
   <div class="wf-layout"><div class="wf-stage"><div class="wf-stage-head"><span><i></i> YOUR CONNECTED WORKSPACE</span><button class="text-link" id="wf-list">${list?'Canvas view':'List view'}</button></div><div id="wf-viewport" class="wf-viewport ${list?'wf-list':''}" aria-label="Workflow canvas"><div id="wf-world" class="wf-world"><svg id="wf-wires" class="wf-wires" width="5600" height="4400" aria-hidden="true"></svg><div id="wf-nodes"></div></div><div class="wf-empty" id="wf-empty" ${active.nodes.length?'hidden':''}>${icon('board',36)}<h2>Every idea starts with a connection.</h2><p>Add a Prompt and Generate image step, or choose a ready-made template.</p><button class="outline-button" data-wf-template="cinematic">Try an editable example</button></div></div><footer class="wf-stage-foot"><span id="wf-canvas-tip">Drag a step to move it. Connect an output to a matching input.</span><div class="wf-zoom"><button class="icon-button" id="wf-zoom-out" aria-label="Zoom out">−</button><button class="outline-button" id="wf-fit">Fit</button><button class="outline-button" id="wf-reset-zoom" aria-label="Reset canvas zoom">100%</button><button class="icon-button" id="wf-zoom-in" aria-label="Zoom in">+</button></div></footer></div><aside class="wf-inspector" id="wf-inspector" aria-label="Step settings"></aside></div>
   <footer class="wf-budget"><div><span class="eyebrow">FULL WORKFLOW ESTIMATE</span><strong id="wf-total"></strong><p>Provider cost + 20%. Each submitted generation reserves its own credits. Free planning and prompt building.</p></div><div class="wf-launch-note" id="wf-launch-note"></div></footer><div id="wf-run-status" role="status" aria-live="polite"></div>
   <input type="file" id="wf-import-file" accept=".zip,application/zip" hidden><input type="file" id="wf-image-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><dialog id="wf-dialog" class="wf-dialog"></dialog></section>`;
  el('wf-name').oninput=e=>{active.name=e.target.value.trim()||'Untitled workflow';el('wf-select').selectedOptions[0].textContent=active.name;schedule();};
  el('wf-select').onchange=async e=>{await save();active=workflows.find(f=>f.id===e.target.value);selected='';pan={x:0,y:0,zoom:1};layout();fit();};
  el('wf-new').onclick=()=>create('blank');el('wf-templates').onclick=showTemplates;
  el('wf-import').onclick=()=>{el('wf-import-file').value='';el('wf-import-file').click();};
  el('wf-import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const flow=await importWorkflow(file);store.check();workflows.unshift(flow);active=flow;selected='';await reloadAssets();layout();fit();toast('Workflow and media imported. Previous paid jobs were not imported.');}catch(e){toast(e.message);}};
  el('wf-image-file').onchange=async e=>{const file=e.target.files[0],target=selectedNode();if(!file||target?.type!=='reference')return;try{const a=await store.importFile(file);store.check();target.assetId=a.id;delete active.run;await reloadAssets();await save();drawCanvas();drawInspector();}catch(e){toast(e.message);}};
  el('wf-export').onclick=async()=>{try{await save();await exportWorkflow(active);toast('Portable workflow ZIP downloaded.');}catch(e){toast(e.message);}};
  el('wf-archive').onclick=()=>{const d=el('wf-dialog');d.innerHTML=`<h2>Archive this workflow?</h2><p>Your generated files stay in My Library.</p><div class="row"><button class="outline-button" data-wf-close>Keep workflow</button><button class="primary-button" id="wf-confirm-archive">Archive</button></div>`;d.showModal();el('wf-confirm-archive').onclick=async()=>{active.deleted=true;await save();workflows=workflows.filter(f=>f!==active);if(!workflows.length){active=makeWorkflow('blank');workflows.push(active);await save();}else active=workflows[0];selected='';d.close();layout();fit();};};
  el('wf-list').onclick=()=>{list=!list;el('wf-viewport').classList.toggle('wf-list',list);el('wf-list').textContent=list?'Canvas view':'List view';drawWires();};
  el('wf-fit').onclick=()=>fit(true);el('wf-reset-zoom').onclick=()=>{pan.zoom=1;transform();};el('wf-zoom-in').onclick=()=>zoom(1.15);el('wf-zoom-out').onclick=()=>zoom(1/1.15);
  el('wf-review').onclick=()=>review(false);el('wf-resume').onclick=()=>review(true);el('wf-check').onclick=checkJobs;
  el('wf-pause').onclick=()=>{stopRequested=true;el('wf-pause').disabled=true;el('wf-run-status').textContent='Pausing future steps. Already submitted jobs continue and remain in Generation History.';};
  el('wf-viewport').addEventListener('pointerdown',pointerDown);el('wf-viewport').addEventListener('wheel',wheel,{passive:false});
  drawCanvas();drawInspector();budget();controls();
 }
 function controls(){
  if(!alive()||!el('wf-review'))return;
  for(const n of view.querySelectorAll('#wf-project-bar input,.wf-project-bar input,.wf-project-bar button,.wf-project-bar select,[data-wf-add],#wf-templates,#wf-review,#wf-resume,#wf-check,#wf-node-form input,#wf-node-form select,#wf-node-form textarea,#wf-node-form button'))n.disabled=busy||changing;
  el('wf-pause').hidden=!busy;el('wf-pause').disabled=stopRequested;
  el('wf-resume').hidden=!active.run||active.run.status==='complete';
  if(active.run?.status==='needs-review')el('wf-resume').disabled=true;
  el('wf-check').hidden=!active.run;
 }
 function budget(){
  if(!alive()||!el('wf-total'))return;
  const q=estimate();el('wf-total').textContent=totalLabel(q);
  el('wf-launch-note').innerHTML=config.generationEnabled?`<span class="tag">${cloudState().user?'ACCOUNT BALANCE':'SIGN IN TO GENERATE'}</span><a href="#billing">Plans & credits ↗</a>`:'<span class="tag soon">AI GENERATION COMING SOON</span><p>Build, save and share workflows now. Paid generation opens after backend testing.</p><a href="#billing">See launch pricing ↗</a>';
  const run=active.run;if(run){const complete=Object.values(run.steps||{}).filter(s=>s.status==='complete').length;el('wf-run-status').textContent=`${run.status==='complete'?'Workflow complete':run.status==='needs-review'?'Workflow needs review':busy?'Workflow running':'Workflow paused'} · ${complete} of ${Object.keys(run.steps||{}).length} generations saved. ${run.status==='needs-review'?'Check step details and Generation History. Submitted jobs are never automatically retried.':''}`;}else el('wf-run-status').textContent='';
 }
 function nodePreview(n){
  const step=active.run?.steps?.[n.id],a=asset(n.type==='reference'?n.assetId:step?.assetId);
  if(a?.type==='image')return `<img class="wf-node-media" crossorigin="anonymous" src="${esc(assetURL(a))}" alt="${esc(a.name)}" loading="lazy">`;
  if(a?.type==='video')return `<div class="wf-node-video">${icon('play',25)}<span>Video ready in My Library</span></div>`;
  if(n.type==='reference')return '<div class="wf-node-placeholder">'+icon('upload',23)+'<span>Choose or upload a reference</span></div>';
  return `<p class="wf-node-prompt">${esc(n.type==='prompt'?n.prompt||'Write your idea…':nodePrompt(active,n)||'Connect a prompt or write one…')}</p>`;
 }
 function drawCanvas(){
  if(!alive()||!el('wf-nodes'))return;
  const q=estimate();el('wf-nodes').innerHTML=active.nodes.map(n=>{
   const step=active.run?.steps?.[n.id],priced=q?.steps.find(s=>s.nodeId===n.id)?.quote;
   return `<article class="wf-node ${n.type} ${selected===n.id?'wf-selected':''}" data-wf-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px"><button class="wf-node-title" data-wf-select="${esc(n.id)}" aria-label="Edit ${esc(n.name)}">${icon(visual[n.type],17)}<span>${esc(n.name)}</span>${icon('edit',12)}</button><div class="wf-node-content">${nodePreview(n)}</div>${generationNode(n)?`<div class="wf-node-meta"><span>${esc(workflowModel(n).name)}</span><strong>${priced?.retailInr!==null&&priced?.retailInr!==undefined?formatCredits(priced.retailInr):priced?formatUSD(priced.retailUsd):'Check connections'}</strong></div><div class="wf-node-settings">${esc(n.ratio)}${n.type==='video'?' · '+n.duration+'s · '+(n.audio?'Audio on':'Silent'):n.model!=='flux-fast'?' · '+esc(n.resolution):''}</div>${step?`<div class="wf-step-state ${esc(step.status)}">${step.status==='running'||step.status==='submitting'?'<span class="spinner"></span>':''}${esc(statusName[step.status]||step.status)}</div>`:''}<div class="wf-inputs"><button class="wf-port wf-input ${connectedNode(active,n,'prompt')?'connected':''}" data-wf-input="prompt" data-wf-target="${esc(n.id)}" aria-label="Connect prompt to ${esc(n.name)}"><i></i><span>Prompt</span></button><button class="wf-port wf-input ${connectedNode(active,n,'reference')?'connected':''}" data-wf-input="reference" data-wf-target="${esc(n.id)}" aria-label="Connect reference to ${esc(n.name)}"><i></i><span>Reference</span></button></div>`:''}<button class="wf-port wf-output" data-wf-output="${esc(n.id)}" aria-label="Connect ${esc(NODE_TYPES[n.type].output)} output of ${esc(n.name)}"><span>${esc(NODE_TYPES[n.type].output)}</span><i></i></button></article>`;
  }).join('');
  el('wf-empty').hidden=!!active.nodes.length;transform();drawWires();
 }
 function transform(){if(el('wf-world'))el('wf-world').style.transform=`translate(${pan.x}px,${pan.y}px) scale(${pan.zoom})`;if(el('wf-reset-zoom'))el('wf-reset-zoom').textContent=Math.round(pan.zoom*100)+'%';}
 function drawWires(point){
  if(!el('wf-wires'))return;
  el('wf-wires').innerHTML=active.edges.map(e=>{const a=node(e.source),b=node(e.target);if(!a||!b)return '';const p1={x:a.x+286,y:a.y+82},p2={x:b.x-5,y:b.y+(e.input==='prompt'?105:137)};return `<path class="wf-wire ${e.input}" d="M${p1.x},${p1.y} C${p1.x+90},${p1.y} ${p2.x-90},${p2.y} ${p2.x},${p2.y}"/>`;}).join('')+(connectFrom&&point?`<path class="wf-wire wf-wire-draft" d="M${node(connectFrom).x+286},${node(connectFrom).y+82} L${point.x},${point.y}"/>`:'');
 }
 function fit(all=false){
  if(!alive()||!el('wf-viewport')||!active.nodes.length)return;const bounds=el('wf-viewport').getBoundingClientRect(),minX=Math.min(...active.nodes.map(n=>n.x)),minY=Math.min(...active.nodes.map(n=>n.y)),maxX=Math.max(...active.nodes.map(n=>n.x+286)),maxY=Math.max(...active.nodes.map(n=>n.y+250));
  pan.zoom=Math.max(all ? .2 : .65,Math.min(1,(bounds.width-60)/(maxX-minX),all?(bounds.height-60)/(maxY-minY):1));pan.x=(bounds.width-(maxX-minX)*pan.zoom)/2-minX*pan.zoom;pan.y=all?(bounds.height-(maxY-minY)*pan.zoom)/2-minY*pan.zoom:30-minY*pan.zoom;transform();
 }
 function zoom(factor,point){const r=el('wf-viewport').getBoundingClientRect(),px=point?point.x-r.left:r.width/2,py=point?point.y-r.top:r.height/2,z=Math.max(.35,Math.min(1.6,pan.zoom*factor));pan.x=px-(px-pan.x)*z/pan.zoom;pan.y=py-(py-pan.y)*z/pan.zoom;pan.zoom=z;transform();}
 function wheel(e){if(list)return;e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(e.deltaY>0?.94:1.06,{x:e.clientX,y:e.clientY});else{pan.x-=e.deltaX;pan.y-=e.deltaY;transform();}}
 function pointerDown(e){
  if(list||e.button!==0)return;const interactive=e.target.closest('button,input,select,textarea');if(interactive&&!interactive.classList.contains('wf-node-title'))return;
  const card=e.target.closest('[data-wf-node]');if(card){if(busy)return;const n=node(card.dataset.wfNode);drag={type:'node',id:n.id,x:e.clientX,y:e.clientY,startX:n.x,startY:n.y};}
  else drag={type:'pan',x:e.clientX,y:e.clientY,startX:pan.x,startY:pan.y};
  e.preventDefault();
 }
 function move(e){
  if(!alive())return;
  if(connectFrom&&!list){const r=el('wf-viewport').getBoundingClientRect();drawWires({x:(e.clientX-r.left-pan.x)/pan.zoom,y:(e.clientY-r.top-pan.y)/pan.zoom});}
  if(!drag)return;
  if(drag.type==='node'){const n=node(drag.id);n.x=Math.max(0,Math.min(5000,drag.startX+(e.clientX-drag.x)/pan.zoom));n.y=Math.max(0,Math.min(4000,drag.startY+(e.clientY-drag.y)/pan.zoom));const c=view.querySelector(`[data-wf-node="${n.id}"]`);c.style.left=n.x+'px';c.style.top=n.y+'px';drawWires();}
  else{pan.x=drag.startX+e.clientX-drag.x;pan.y=drag.startY+e.clientY-drag.y;transform();}
 }
 function up(e){
  if(!alive())return;
  if(drag?.type==='node'){selected=drag.id;schedule();drawInspector();drawCanvas();}drag=null;
  if(connectFrom){const port=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-wf-input]');if(port){connect(connectFrom,port.dataset.wfTarget,port.dataset.wfInput);connectFrom='';drawWires();}}
 }
 function connect(source,target,input){
  if(busy)return;const edge={id:uid(),source,target,input};active.edges.push(edge);
  try{validateGraph(active);if(input==='reference'&&!workflowModel(node(target)).reference)throw Error('Choose Nano Banana 2 for image references.');}catch(e){active.edges.pop();toast(e.message);return;}
  delete active.run;selected=target;connectFrom='';schedule();drawCanvas();drawInspector();budget();controls();
 }
 function field(label,key,value,type='input',extra=''){return `<label>${label}${type==='textarea'?`<textarea data-wf-field="${key}" rows="4" maxlength="${key==='negative'?2500:10000}" ${extra}>${esc(value)}</textarea>`:`<input data-wf-field="${key}" value="${esc(value)}" ${extra}>`}</label>`;}
 function choices(values,current){return values.map(v=>`<option value="${esc(v)}" ${String(v)===String(current)?'selected':''}>${esc(v)}</option>`).join('');}
 function drawInspector(){
  if(!alive()||!el('wf-inspector'))return;const n=selectedNode();
  if(!n){el('wf-inspector').innerHTML=`<div class="wf-inspector-intro"><span class="eyebrow">A PROCESS YOU CAN REUSE</span>${icon('board',38)}<h2>One idea. Connected steps.</h2><ol><li>Choose a template or add steps.</li><li>Click a step to write a prompt or choose a reference.</li><li>Connect matching ports, or use the dropdowns in Step settings.</li><li>Review the total before generating.</li></ol><p>Drag the empty canvas to pan. Use + / − to zoom. List view makes every step easy to read on a phone.</p><a href="#billing">Credits & launch details ↗</a></div>`;return;}
  const connected=connectedNode(active,n,'prompt'),step=active.run?.steps?.[n.id],result=asset(step?.assetId),incoming=active.edges.filter(e=>e.target===n.id);
  el('wf-inspector').innerHTML=`<div class="wf-inspector-head"><span class="eyebrow">STEP SETTINGS</span><span class="tag">${esc(NODE_TYPES[n.type].label)}</span></div><form id="wf-node-form">${field('Step name','name',n.name,'input','maxlength="80"')}
   ${n.type==='prompt'?field('Your prompt','prompt',n.prompt,'textarea'):n.type==='reference'?`<label>Library reference<select data-wf-field="assetId"><option value="">Choose an image…</option>${assets.filter(a=>a.type==='image').map(a=>`<option value="${esc(a.id)}" ${a.id===n.assetId?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label><button type="button" class="outline-button" id="wf-upload-image">${icon('upload',16)} Upload image</button><p class="wf-note">Reference images are sent to the generation provider when you run their connected steps.</p>`:`<label>Model<select data-wf-field="model">${WORKFLOW_MODELS.filter(m=>n.type==='video'?m.kind==='video':['image','edit'].includes(m.kind)).map(m=>`<option value="${m.id}" ${m.id===n.model?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><label>Prompt source<select data-wf-connect="prompt"><option value="">Write a prompt in this step</option>${active.nodes.filter(a=>a.type==='prompt').map(a=>`<option value="${a.id}" ${a.id===connected?.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>${connected?`<label>Connected prompt<textarea rows="4" readonly>${esc(connected.prompt)}</textarea></label><button type="button" class="text-link" data-wf-select="${connected.id}">Edit ${esc(connected.name)} →</button>`:field('Creation prompt','prompt',n.prompt,'textarea')}
    <label>Reference source<select data-wf-connect="reference"><option value="">${n.model==='nano-edit'?'Reference required':'No reference'}</option>${active.nodes.filter(a=>a.id!==n.id&&['reference','image'].includes(a.type)).map(a=>`<option value="${a.id}" ${a.id===connectedNode(active,n,'reference')?.id?'selected':''}>${esc(a.name)}${a.type==='image'?' · generated image':''}</option>`).join('')}</select></label><label>Aspect ratio<select data-wf-field="ratio">${choices(n.type==='video'?['1:1','16:9','9:16']:['1:1','16:9','9:16','4:3','3:4'],n.ratio)}</select></label>
    ${n.type==='image'&&n.model!=='flux-fast'?`<label>Resolution<select data-wf-field="resolution">${choices(['1K','2K','4K'],n.resolution)}</select></label>`:''}${n.type==='video'?`<label>Duration<select data-wf-field="duration"><option value="5" ${n.duration===5?'selected':''}>5 seconds</option><option value="10" ${n.duration===10?'selected':''}>10 seconds</option></select></label><label class="wf-checkbox"><input type="checkbox" data-wf-field="audio" ${n.audio?'checked':''}> Include generated audio</label>${field('Negative prompt','negative',n.negative,'textarea')}`:''}<p class="wf-note">One output per step. Duration, audio and resolution affect the price.</p>`}
   ${(n.type==='prompt'||generationNode(n)&&!connected)?'<button type="button" class="outline-button" id="wf-prompt-builder">'+icon('background',16)+' Guided prompt builder</button>':''}
   ${generationNode(n)?'<details class="wf-json"><summary>Request preview</summary><pre id="wf-json-preview"></pre><small>References resolve when the workflow runs.</small></details>':''}
   ${incoming.length?`<details class="wf-connections"><summary>Connections</summary>${incoming.map(e=>`<div><span>${esc(node(e.source).name)} → ${esc(e.input)}</span><button type="button" class="icon-button" data-wf-disconnect="${e.id}" aria-label="Disconnect ${esc(e.input)}">×</button></div>`).join('')}</details>`:''}
   <div class="wf-step-result">${step?`<strong>${esc(statusName[step.status]||step.status)}</strong>${step.error?`<p class="error-banner">${esc(step.error)}</p>`:''}`:''}${result?`<p>${esc(result.name)}</p><button type="button" class="outline-button" data-wf-download="${result.id}">${icon('download',15)} Download result</button><a class="text-link" href="#library">Open My Library ↗</a>`:''}</div>
   <div class="wf-inspector-bottom"><button type="button" class="outline-button" id="wf-duplicate-step">Duplicate</button><button type="button" class="outline-button" id="wf-delete-step">Remove step</button></div></form>`;
  for(const c of el('wf-node-form').querySelectorAll('input,textarea,select,button'))c.disabled=busy;
  if(generationNode(n)){let body;try{body=workflowBody(active,n);}catch(e){body={error:e.message};}el('wf-json-preview').textContent=JSON.stringify(body,null,2);}
  el('wf-node-form').onsubmit=e=>e.preventDefault();
  el('wf-node-form').oninput=e=>{const key=e.target.dataset.wfField;if(!key)return;n[key]=key==='audio'?e.target.checked:key==='duration'?Number(e.target.value):e.target.value;if(key!=='name')delete active.run;schedule();drawCanvas();budget();controls();if(generationNode(n)&&el('wf-json-preview')){try{el('wf-json-preview').textContent=JSON.stringify(workflowBody(active,n),null,2);}catch{}}};
  el('wf-node-form').onchange=e=>{
   const input=e.target.dataset.wfConnect;
   if(input){const old=active.edges;active.edges=active.edges.filter(edge=>!(edge.target===n.id&&edge.input===input));if(e.target.value)active.edges.push({id:uid(),source:e.target.value,target:n.id,input});try{validateGraph(active);if(input==='reference'&&e.target.value&&!workflowModel(n).reference)throw Error('Choose Nano Banana 2 for image references.');delete active.run;}catch(error){active.edges=old;toast(error.message);}schedule();drawCanvas();drawInspector();budget();controls();}
   else if(['model','assetId'].includes(e.target.dataset.wfField)){drawInspector();}
  };
  el('wf-upload-image')?.addEventListener('click',()=>{el('wf-image-file').value='';el('wf-image-file').click();});
  el('wf-prompt-builder')?.addEventListener('click',showPromptBuilder);
  el('wf-delete-step').onclick=()=>{active.nodes=active.nodes.filter(a=>a!==n);active.edges=active.edges.filter(e=>e.source!==n.id&&e.target!==n.id);delete active.run;connectFrom='';selected='';schedule();drawCanvas();drawInspector();budget();controls();};
  el('wf-duplicate-step').onclick=()=>{if(active.nodes.length>=40)return toast('A workflow supports up to 40 steps.');active.nodes.push({...n,id:uid(),name:n.name+' copy',x:Math.min(5000,n.x+45),y:Math.min(4000,n.y+260)});delete active.run;selected=active.nodes.at(-1).id;schedule();drawCanvas();drawInspector();budget();controls();};
 }
 async function create(template){if(busy||changing||!alive())return;changing=true;controls();try{await save();if(!alive())return;active=makeWorkflow(template);workflows.unshift(active);selected='';await save();layout();fit();}finally{changing=false;controls();}}
 function showTemplates(){const d=el('wf-dialog');d.innerHTML=`<div class="wf-dialog-head"><div><span class="eyebrow">A FASTER FIRST STEP</span><h2>Start with a workflow.</h2></div><button class="icon-button" data-wf-close aria-label="Close templates">×</button></div><div class="wf-template-grid">${WORKFLOW_TEMPLATES.map((t,i)=>`<button class="wf-template" data-wf-template="${t.id}"><span class="wf-template-number">0${i+1}</span>${icon(i===2?'frame':i===1?'image':'video',27)}<strong>${esc(t.name)}</strong><p>${esc(t.description)}</p><span>Create editable workflow ${icon('arrow',14)}</span></button>`).join('')}</div><p class="wf-note">Planning is free. AI generation uses your balance after launch.</p>`;d.showModal();}
 function showPromptBuilder(){
  const d=el('wf-dialog'),target=selectedNode();d.innerHTML=`<div class="wf-dialog-head"><div><span class="eyebrow">FREE GUIDED PROMPT BUILDER</span><h2>Give your idea more detail.</h2></div><button class="icon-button" data-wf-close aria-label="Close prompt builder">×</button></div><form id="wf-prompt-form" class="wf-prompt-form">${[['subject','Subject / product',target.prompt||''],['action','Action / movement',''],['setting','Setting / background',''],['style','Visual style',''],['lighting','Lighting',''],['camera','Camera / composition',''],['exclude','Things to avoid','']].map(([name,label,value])=>`<label>${label}<input name="${name}" value="${esc(value)}" maxlength="1200"></label>`).join('')}<p class="wf-note">This helper combines your instructions. It does not call a paid AI model. Avoidance instructions are guidance, not guaranteed exclusions.</p><button class="primary-button">Use this prompt</button></form>`;d.showModal();el('wf-prompt-form').onsubmit=async e=>{e.preventDefault();try{target.prompt=buildPrompt(Object.fromEntries(new FormData(e.target)));delete active.run;await save();d.close();drawCanvas();drawInspector();budget();controls();}catch(e){toast(e.message);}};
 }
 async function checkJobs(){
  if(!active.run)return;const b=el('wf-check');b.disabled=true;
  try{
   const jobs=await store.all('jobs');
   for(const [id,step] of Object.entries(active.run.steps)){
    if(!step.jobId){const found=jobs.find(j=>j.workflowRunID===active.run.id&&j.workflowNodeID===id);if(found)step.jobId=found.id;}
    if(!step.jobId)continue;const job=await pollHostedJob(step.jobId);store.check();
    if(job?.status==='COMPLETED'){const a=await store.get('assets',job.assetIds?.[0]||job.id+'-0');if(a){step.status='complete';step.assetId=a.id;step.error='';}}
    else if(job?.status==='FAILED'){step.status='failed';step.error=job.error;}
    else if(job){step.status='running';step.error=job.error||'';}
   }
   const steps=Object.values(active.run.steps);active.run.status=steps.every(s=>s.status==='complete')?'complete':steps.some(s=>['failed','uncertain','submitting'].includes(s.status))?'needs-review':'paused';
   await reloadAssets();await save();drawCanvas();drawInspector();budget();controls();toast('Submitted jobs checked. No new generation was submitted.');
  }catch(e){toast(e.message);}finally{if(b.isConnected)b.disabled=busy;}
 }
 async function review(resume){
  try{
   if(busy||changing)return;await save();await reloadAssets();const snapshot=normalizeWorkflow(active);validateReady(snapshot,assets);
   const estimate=estimateWorkflow(snapshot,config.usdInr),old=resume?active.run:null;
   if(resume&&!old)throw Error('There is no paused run to resume.');
   if(old&&Object.values(old.steps).some(s=>['failed','uncertain','submitting'].includes(s.status)))throw Error('Check submitted jobs and resolve the flagged steps before resuming.');
   const remaining=estimate.steps.filter(s=>!old?.steps[s.nodeId]?.jobId&&old?.steps[s.nodeId]?.status!=='complete');
   const credits=config.usdInr?remaining.reduce((n,s)=>n+s.quote.credits,0):null;
   const canRun=config.generationEnabled&&!!cloudState().user&&credits!==null&&!!navigator.locks;
   const d=el('wf-dialog');d.innerHTML=`<div class="wf-dialog-head"><div><span class="eyebrow">REVIEW BEFORE GENERATING</span><h2>${resume?'Resume this workflow':'Your workflow budget'}</h2></div><button class="icon-button" data-wf-close aria-label="Close budget">×</button></div><p>${resume?'Completed steps and submitted jobs will be reused. Only new submissions below need additional credits.':'Every image and video step produces one output.'}</p><div class="wf-budget-table"><table><thead><tr><th>Step</th><th>Model</th><th>Estimated cost</th></tr></thead><tbody>${estimate.steps.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.model.name)}</td><td>${old?.steps[s.nodeId]?.status==='complete'?'Already complete':old?.steps[s.nodeId]?.jobId?'Already submitted':s.quote.retailInr!==null?formatCredits(s.quote.retailInr):formatUSD(s.quote.retailUsd)}</td></tr>`).join('')}</tbody></table></div><div class="wf-confirm-total"><span>${resume?'Additional generation budget':'Total generation budget'}</span><strong>${credits!==null?formatCredits(credits/100)+' · '+formatINR(credits/100):formatUSD(remaining.reduce((n,s)=>n+s.quote.retailUsd,0))}</strong></div><p class="wf-note">Includes our 20% markup. Final server quotes must match this review. Each submitted step reserves its own credits; confirmed failures return their reservation. Pausing prevents future submissions, while accepted jobs keep running.</p>${active.run&&!resume?'<p class="wf-note">This starts a new run and generates new outputs. Your previous results remain in My Library. Check any unresolved previous submissions before continuing.</p>':''}<p id="wf-budget-error" class="error-banner" hidden></p><div class="row"><button class="outline-button" data-wf-close>Keep editing</button>${!config.generationEnabled?'<button class="primary-button" disabled>AI generation coming soon</button>':!cloudState().user?'<a class="primary-button" href="#account">Sign in to generate</a>':!navigator.locks?'<p>Use a current browser with Web Locks to run workflows.</p>':`<button class="primary-button" id="wf-confirm-run" ${canRun?'':'disabled'}>${resume?'Resume':'Run workflow'}${credits!==null?' · '+formatINR(credits/100):''}</button>`}</div>`;
   d.showModal();el('wf-confirm-run')?.addEventListener('click',async()=>{
    const button=el('wf-confirm-run');button.disabled=true;
    try{
     const wallet=await cloudRequest('/functions/v1/convertshorts-billing');store.check();if((wallet.credits??0)<credits)throw Error('Not enough balance for this workflow. Add a top-up in Plans & credits.');
     const run=old||{id:uid(),status:'running',started:Date.now(),steps:Object.fromEntries(snapshot.nodes.filter(generationNode).map(n=>[n.id,{status:'queued'}])),quotes:{}};
     for(const s of remaining)run.quotes[s.nodeId]=s.quote;run.status='running';
     await navigator.locks.request('convertshorts-workflow:'+scope+':'+active.id,{ifAvailable:true},async lock=>{
      if(!lock)throw Error('This workflow is already running in another browser tab.');
      if(!alive())return;d.close();active.run=run;busy=true;stopRequested=false;await save();drawCanvas();drawInspector();controls();budget();
      try{await executeWorkflow(snapshot,run,{
       shouldStop:()=>stopRequested||!alive(),
       save:async value=>{active.run=value;await save();},
       reference:async id=>{const a=await store.get('assets',id);if(!a||a.deleted||a.type!=='image')throw Error('The reference image is missing or expired.');const blob=a.blob||await(await fetch(a.remote)).blob();store.check();const ref=await referenceData(blob);store.check();return ref.length>2700000?uploadReference(await(await fetch(ref)).blob()):ref;},
       submit:(n,body,expected)=>submitHostedGeneration(body,workflowModel(n),{expected,metadata:{workflowID:active.id,workflowRunID:run.id,workflowNodeID:n.id},guard:()=>alive()&&!stopRequested}),
       wait:async id=>{
        const until=Date.now()+20*60*1000;
        while(alive()&&!stopRequested){
         const j=await pollHostedJob(id);store.check();if(j?.status==='FAILED')throw Error(j.error||'Generation failed.');
         if(j?.status==='COMPLETED'){const a=await store.get('assets',j.assetIds?.[0]||j.id+'-0');if(!a||a.deleted)throw Error('The generated output is missing or expired.');if(!assets.some(i=>i.id===a.id))assets.push(a);return a;}
         if(Date.now()>until){stopRequested=true;toast('Still waiting. Submitted jobs are saved; check jobs and resume later.');return;}
         await sleep(2000);
        }
       },
       onChange:()=>{if(alive()){drawCanvas();drawInspector();budget();}}
      });}finally{busy=false;if(alive()){await reloadAssets();drawCanvas();drawInspector();budget();controls();}}
     });
    }catch(e){if(alive()){const error=el('wf-budget-error');if(error&&d.open){error.hidden=false;error.textContent=e.message;button.disabled=false;}else toast(e.message);busy=false;controls();}}
   });
  }catch(e){toast(e.message);}
 }
 view.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;try{
  if(b.hasAttribute('data-wf-close')){el('wf-dialog').close();return;}
  if(b.dataset.wfTemplate){el('wf-dialog').close();await create(b.dataset.wfTemplate);return;}
  if(b.dataset.wfSelect){select(b.dataset.wfSelect);return;}
  if(b.dataset.wfAdd){if(busy)return;if(active.nodes.length>=40)return toast('A workflow supports up to 40 steps.');const type=b.dataset.wfAdd,n={id:uid(),type,name:NODE_TYPES[type].label,x:Math.max(40,(100-pan.x)/pan.zoom),y:Math.max(40,(100-pan.y)/pan.zoom),prompt:'',assetId:'',...(generationNode({type})?{model:type==='video'?'kling':'nano-banana',ratio:'16:9',resolution:'1K',duration:5,audio:false,negative:''}:{})};active.nodes.push(n);selected=n.id;delete active.run;await save();drawCanvas();drawInspector();budget();controls();return;}
  if(b.dataset.wfOutput&&!busy){connectFrom=b.dataset.wfOutput;el('wf-canvas-tip').textContent='Choose a matching input port. Escape cancels.';return;}
  if(b.dataset.wfInput&&connectFrom){connect(connectFrom,b.dataset.wfTarget,b.dataset.wfInput);return;}
  if(b.dataset.wfDisconnect&&!busy){active.edges=active.edges.filter(edge=>edge.id!==b.dataset.wfDisconnect);delete active.run;schedule();drawCanvas();drawInspector();budget();controls();return;}
  if(b.dataset.wfDownload){const a=await store.get('assets',b.dataset.wfDownload);if(a)await downloadAsset(a);}
  }catch(error){if(alive())toast(error.message);}
 },{signal:events.signal});
 // Drag connections from a port; click-to-connect also works with keyboard.
 view.addEventListener('pointerdown',e=>{const port=e.target.closest('[data-wf-output]');if(port&&!busy)connectFrom=port.dataset.wfOutput;},{signal:events.signal});
 window.addEventListener('pointermove',move,{signal:events.signal});window.addEventListener('pointerup',up,{signal:events.signal});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){connectFrom='';drag=null;drawWires();const tip=el('wf-canvas-tip');if(tip)tip.textContent='Drag a step to move it. Connect an output to a matching input.';}},{signal:events.signal});
 window.addEventListener('studio-pricing-ready',async()=>{config=await getBillingConfig();if(alive()){budget();drawCanvas();}},{signal:events.signal});
 layout();fit();getBillingConfig().then(info=>{config=info;if(alive()){budget();drawCanvas();}});
 return ()=>{disposed=true;stopRequested=true;clearTimeout(saveTimer);events.abort();el('wf-dialog')?.close();if(store.isCurrent())save();};
}
