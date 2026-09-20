import {$,$$,clearDownloads} from './lib/common.js';
import {mountImage} from './image.js';
import {mountPDF} from './pdf.js';
import {mountDesign} from './design.js';
import {mountVideo} from './video.js';
let cleanup=()=>{};let busy=false;
export const setBusy=value=>{busy=value;};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
function route(){if(busy){history.replaceState(null,'',`#${document.body.dataset.tool}`);return;}clearDownloads();cleanup();const key=document.body.dataset.pageTool||location.hash.slice(1),tool=['image','pdf','video','design','editor'].includes(key)?key:'image';document.body.dataset.tool=tool;$$('[data-tool]').forEach(a=>{a.classList.toggle('active',a.dataset.tool===tool);if(a.dataset.tool===tool)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const mounts={image:mountImage,pdf:mountPDF,design:mountDesign,video:()=>mountVideo(false),editor:()=>mountVideo(true)};cleanup=mounts[tool]($('#workspace'))||(()=>{});document.title=`${({image:'Image Tools',pdf:'PDF Tools',design:'Design Studio',video:'Video Tools',editor:'Video Editor'})[tool]} | ConvertShorts`;}
if(!document.body.dataset.pageTool)window.addEventListener('hashchange',route);route();
