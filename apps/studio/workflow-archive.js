import {scopedStorage,uid,downloadBlob,mediaAsset} from './storage.js';
import {normalizeWorkflow,WORKFLOW_FORMAT} from './workflow-core.js';

const MAX_FILE=150*1024*1024,MAX_TOTAL=300*1024*1024;
export async function exportWorkflow(flow){
 const store=scopedStorage(),zip=new window.JSZip(),clean=normalizeWorkflow(flow),assetIds=new Set(clean.nodes.filter(n=>n.type==='reference'&&n.assetId).map(n=>n.assetId));
 // Completed outputs can be taken along as library media, without transferring
 // runnable jobs, credentials, charged credits, or a previous execution state.
 for(const step of Object.values(flow.run?.steps||{}))if(step.assetId)assetIds.add(step.assetId);
 const files=[];let total=0;
 for(const id of assetIds){
  const item=await store.get('assets',id);if(!item||item.deleted)throw Error('A referenced file is missing or expired. Replace it before exporting.');
  let blob=item.blob;if(!blob){const asset=await mediaAsset(item),r=await fetch(asset.remote);if(!r.ok)throw Error('Could not download '+item.name+'. Try while signed in.');blob=await r.blob();}
  store.check();total+=blob.size;if(blob.size>MAX_FILE||total>MAX_TOTAL)throw Error('Workflow ZIPs support 150 MB per file and 300 MB in total.');
  const path='media/'+id;zip.file(path,blob);files.push({id,name:item.name,type:item.type,mime:item.mime||blob.type,path});
 }
 zip.file('workflow.json',JSON.stringify({format:WORKFLOW_FORMAT,workflow:clean,files},null,2));
 const blob=await zip.generateAsync({type:'blob',compression:'STORE'});store.check();downloadBlob(blob,flow.name.replace(/[^\w-]/g,'-')+'.zip');
}
export async function importWorkflow(file){
 const store=scopedStorage();if(file.size>MAX_TOTAL)throw Error('Choose a workflow ZIP smaller than 300 MB.');
 const zip=await window.JSZip.loadAsync(file),manifest=zip.file('workflow.json');
 if(!manifest||manifest._data?.uncompressedSize>2000000)throw Error('Choose a ConvertShorts workflow ZIP.');
 const text=await manifest.async('string');if(text.length>2000000)throw Error('Workflow metadata is too large.');
 const data=JSON.parse(text);if(data.format!==WORKFLOW_FORMAT||!Array.isArray(data.files)||data.files.length>80)throw Error('Unsupported workflow archive.');
 const clean=normalizeWorkflow(data.workflow,{id:uid()}),map=new Map(),assets=[];let total=0;
 for(const entry of data.files){
  if(!entry||typeof entry.id!=='string'||map.has(entry.id)||!/^media\/[a-zA-Z0-9_-]{1,100}$/.test(entry.path)||!['image','video'].includes(entry.type)||!(/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm))$/.test(entry.mime||'')))throw Error('Invalid workflow media.');
  const z=zip.file(entry.path);if(!z||z._data?.uncompressedSize>MAX_FILE)throw Error('Invalid or oversized workflow file.');
  total+=z._data?.uncompressedSize||0;if(total>MAX_TOTAL)throw Error('Expanded workflow media exceeds 300 MB.');
  const bytes=await z.async('uint8array');if(bytes.length>MAX_FILE)throw Error('Workflow file exceeds 150 MB.');
  const id=uid();map.set(entry.id,id);assets.push({id,name:String(entry.name||'Workflow media').replace(/[\\/]/g,'-').slice(0,200),type:entry.type,mime:entry.mime,blob:new Blob([bytes],{type:entry.mime}),created:Date.now(),workflowID:clean.id});
 }
 for(const node of clean.nodes)if(node.type==='reference'&&node.assetId){if(!map.has(node.assetId))throw Error('The ZIP does not include a required reference image.');node.assetId=map.get(node.assetId);}
 // Parse and validate every entry before any workspace writes.
 store.check();for(const asset of assets)await store.put('assets',asset);await store.put('projects',clean);return clean;
}
