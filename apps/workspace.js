import {APPS,previewSVG,remember} from './catalog.js';
const id=document.body.dataset.app;
const app=APPS.find(a=>a.id===id);
const intro=document.getElementById('editor-intro');
const stage=document.getElementById('editor-stage');
const open=document.getElementById('open-editor');
const full=document.getElementById('fullscreen');
const external=document.getElementById('open-external');
const status=document.getElementById('workspace-message');
const select=document.getElementById('studio-switch');
const help=document.getElementById('help-dialog');
document.getElementById('preview').innerHTML=previewSVG(id);
select.value=id;
select.addEventListener('change',()=>{if(stage.childElementCount&&!confirm('Download or save your current work before switching studios. Switch now?')){select.value=id;return;}location.assign(`/apps/${select.value}/`);});
let opened=false;
// An explicit route avoids clean-URL directory redirects breaking the original
// distributions' relative WASM and worker URLs.
const src=app.engine?`/apps/engines/${app.engine}/editor`:app.browser;
external.href=src;
open.addEventListener('click',()=>{
  if(opened)return;
  if(!globalThis.isSecureContext){status.textContent='Use HTTPS or localhost to open this editor.';return;}
  if(app.engine&&typeof WebAssembly==='undefined'){status.textContent='This browser does not support WebAssembly. Try a current Chrome or Edge browser.';return;}
  opened=true;remember(id);intro.hidden=true;stage.hidden=false;full.hidden=false;external.hidden=false;
  const frame=document.createElement('iframe');frame.className='editor-frame';frame.title=`${app.name} — ${app.engine || 'ConvertShorts'} editor`;frame.allow='fullscreen; clipboard-read; clipboard-write';frame.allowFullscreen=true;frame.src=src;
  frame.addEventListener('load',()=>{status.textContent=`${app.name} opened · use the editor’s File menu to save and export`;});
  frame.addEventListener('error',()=>{status.textContent='Editor could not load. Try opening it in a new tab.';});
  stage.append(frame);status.textContent='Loading the editor locally. The first load may take a moment…';
  if(id==='photo'){const compatibility=document.getElementById('compatibility');compatibility.hidden=false;compatibility.addEventListener('click',()=>{if(!confirm('Save your current work first. Reload the editor in compatibility mode?'))return;frame.src=src+'?webgl';external.href=frame.src;status.textContent='Reloading with WebGL compatibility mode…';});}
  addEventListener('beforeunload',e=>{e.preventDefault();e.returnValue='';});
});
full.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent='Fullscreen is unavailable here. Use Open in new tab for a larger workspace.';}});
document.getElementById('help').addEventListener('click',()=>help.showModal());
document.getElementById('close-help').addEventListener('click',()=>help.close());
help.addEventListener('click',e=>{if(e.target===help)help.close();});
document.getElementById('back-to-apps').addEventListener('click',e=>{if(opened&&!confirm('Save or export your current work before returning. Return to all apps?'))e.preventDefault();});
