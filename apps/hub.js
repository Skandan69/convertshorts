import {APPS,previewSVG,getSaved} from './catalog.js';
const grid=document.getElementById('apps-grid');
const search=document.getElementById('app-search');
const resultLabel=document.getElementById('result-label');
let active='all';
let favorites=getSaved('cs-apps-favorites');

function render() {
  const query=search.value.trim().toLowerCase();
  const shown=APPS.filter(app=>(active==='all'||active==='favorites'&&favorites.includes(app.id)||app.category===active)&&[app.name,app.type,app.description,...app.features].join(' ').toLowerCase().includes(query));
  grid.innerHTML=shown.map(app=>`<article class="app-card" style="--tint:${app.tint};--accent:${app.accent}">
    <a class="app-visual" href="/apps/${app.id}/" aria-label="Open ${app.name}"><div class="preview-frame">${previewSVG(app.id)}</div></a>
    <div class="app-body"><div class="app-head"><span class="app-icon" aria-hidden="true">${app.symbol}</span><div><h3>${app.name}</h3><p class="app-type">${app.type}</p></div><button class="favorite" data-favorite="${app.id}" aria-label="Favorite ${app.name}" aria-pressed="${favorites.includes(app.id)}">${favorites.includes(app.id)?'★':'☆'}</button></div>
    <p class="card-description">${app.description}</p><div class="chips">${app.tags.map(tag=>`<span class="chip">${tag}</span>`).join('')}</div>
    <div class="card-bottom"><span class="availability">${app.engine?'Browser · Open-source engine':'Browser · ConvertShorts editor'}</span><a class="open-link" href="/apps/${app.id}/">Open studio<span aria-hidden="true">↗</span></a></div></div></article>`).join('') || '<div class="empty"><h3>No studios here yet</h3><p>Try another search, choose All apps, or star a studio to add it to Favorites.</p><button class="btn" id="clear-filters">Show all apps</button></div>';
  resultLabel.textContent=`${shown.length} ${shown.length===1?'studio':'studios'}${active==='favorites'?' in your favorites':''}`;
  document.getElementById('clear-filters')?.addEventListener('click',()=>{search.value='';selectFilter('all');});
}
function selectFilter(id){active=id;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===id)));render();}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>selectFilter(button.dataset.filter)));
search.addEventListener('input',render);
grid.addEventListener('click',e=>{const button=e.target.closest('[data-favorite]');if(!button)return;const id=button.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(f=>f!==id):[...favorites,id];try{localStorage.setItem('cs-apps-favorites',JSON.stringify(favorites));}catch{}render();grid.querySelector(`[data-favorite="${id}"]`)?.focus();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();search.focus();}if(e.key==='Escape'&&document.activeElement===search){search.value='';search.blur();render();}});
document.querySelectorAll('[data-preview]').forEach(el=>{el.innerHTML=previewSVG(el.dataset.preview);});
const recent=getSaved('cs-apps-recent');
if(recent.length){document.getElementById('recent').innerHTML='<span class="recent-label">Recently opened</span>'+recent.map(id=>{const a=APPS.find(a=>a.id===id);return `<a href="/apps/${id}/">${a.symbol} ${a.name} ↗</a>`;}).join('');}
render();
