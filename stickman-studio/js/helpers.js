// ---------- small shared helpers (geometry math, text wrapping, ids) ----------
function upPoint(origin, angle, len, faceDir){
  return { x: origin.x + Math.sin(angle)*len*faceDir, y: origin.y - Math.cos(angle)*len };
}
function downPoint(origin, angle, len, faceDir){
  return { x: origin.x + Math.sin(angle)*len*faceDir, y: origin.y + Math.cos(angle)*len };
}
function wrapText(context, text, maxWidth){
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for(const w of words){
    if(context.measureText(w).width > maxWidth){
      if(line){ lines.push(line); line = ''; }
      let chunk = '';
      for(const ch of w){
        const test = chunk + ch;
        if(context.measureText(test).width > maxWidth && chunk){
          lines.push(chunk); chunk = ch;
        } else { chunk = test; }
      }
      line = chunk;
      continue;
    }
    const test = line ? line + ' ' + w : w;
    if(context.measureText(test).width > maxWidth && line){
      lines.push(line); line = w;
    } else { line = test; }
  }
  if(line) lines.push(line);
  return lines;
}
function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function debounce(fn, wait){
  let t = null;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this, args), wait);
  };
}
let uidCounter = 1;
function uid(){ return 'seg' + (uidCounter++); }
let charUidCounter = 1;
function charUid(){ return 'char' + (charUidCounter++); }
const MAX_CHARACTERS = 8;
