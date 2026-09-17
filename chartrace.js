/* Bar chart race — parse, animate, export. Runs entirely in the browser. */

const PALETTE = ['#2f9be3','#e24b8f','#a45cd8','#f0812c','#1fa8a0','#2f6fe3','#d94f4f',
                 '#e0b429','#6c63d8','#3fa64a','#d84f9e','#7a8794','#c45c2e','#2fa8d8'];

const $ = id => document.getElementById(id);

let rows = [];        // [{name, color, avatar(Image|null), values:[]}]
let labels = [];      // column headers
let state = [];       // per-row animation state
let rafId = null;
let playing = false;

const cv = $('stage');
const ctx = cv.getContext('2d');

const SIZES = {
  landscape: [1920, 1080],
  portrait:  [1080, 1920],
  square:    [1080, 1080]
};

// ─── parsing ──────────────────────────────────────────────────────────────────
function parseTable(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Need a header row and at least one data row.');
  const sep = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',';
  const split = l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));

  const head = split(lines[0]);
  labels = head.slice(1);
  if (!labels.length) throw new Error('Add at least one column of numbers after the name column.');

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const c = split(lines[i]);
    if (!c[0]) continue;
    const vals = labels.map((_, j) => {
      const n = parseFloat(String(c[j + 1] || '').replace(/[, ]/g, ''));
      return isFinite(n) ? n : 0;
    });
    parsed.push({ name: c[0], values: vals, color: PALETTE[parsed.length % PALETTE.length], avatar: null });
  }
  if (!parsed.length) throw new Error('No data rows found.');

  // keep avatars/colours already chosen for matching names
  const old = new Map(rows.map(r => [r.name, r]));
  rows = parsed.map(r => {
    const prev = old.get(r.name);
    return prev ? { ...r, color: prev.color, avatar: prev.avatar } : r;
  });
  resetState();
}

function resetState() {
  state = rows.map((r, i) => ({ y: i, value: r.values[0] || 0 }));
}

// ─── row editor ───────────────────────────────────────────────────────────────
function renderRowList() {
  const box = $('rowList');
  box.innerHTML = '';
  rows.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'row-item';
    el.innerHTML =
      '<input type="color" value="' + r.color + '" title="Bar colour">' +
      '<span class="row-name"></span>' +
      '<label class="av-btn">' + (r.avatar ? 'Change' : 'Photo') +
      '<input type="file" accept="image/*" hidden></label>' +
      (r.avatar ? '<button class="av-clear" title="Remove photo">&times;</button>' : '');
    el.querySelector('.row-name').textContent = r.name;
    el.querySelector('input[type=color]').addEventListener('input', e => {
      rows[i].color = e.target.value; draw(currentT());
    });
    el.querySelector('input[type=file]').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = ev => {
        const im = new Image();
        im.onload = () => { rows[i].avatar = im; renderRowList(); draw(currentT()); };
        im.src = ev.target.result;
      };
      rd.readAsDataURL(f);
    });
    const clr = el.querySelector('.av-clear');
    if (clr) clr.addEventListener('click', () => { rows[i].avatar = null; renderRowList(); draw(currentT()); });
    box.appendChild(el);
  });
}

// ─── drawing ──────────────────────────────────────────────────────────────────
function currentT() { return parseFloat($('scrub').value) || 0; }

function valuesAt(t) {
  const maxI = labels.length - 1;
  const i = Math.min(Math.floor(t), maxI);
  const f = Math.min(Math.max(t - i, 0), 1);
  return rows.map(r => {
    const a = r.values[i] ?? 0;
    const b = r.values[Math.min(i + 1, maxI)] ?? a;
    return a + (b - a) * f;
  });
}

function labelAt(t) {
  const i = Math.min(Math.round(t), labels.length - 1);
  return labels[Math.max(i, 0)] || '';
}


function drawLines(t, order, vals, g) {
  const W=g.W,H=g.H,pad=g.pad,topN=g.topN;
  const fg=$("fg").value;
  const maxI=labels.length-1;
  const shown=order.slice(0,topN);
  let peak=1;
  shown.forEach(function(i){ rows[i].values.forEach(function(v){ if(v>peak) peak=v; }); });
  const left=pad+Math.round(W*0.10);
  const right=W-pad-Math.round(W*0.16);
  const top=g.areaTop+Math.round(H*0.02);
  const bottom=g.areaTop+g.areaH-Math.round(H*0.05);
  const plotW=right-left, plotH=bottom-top;
  const fs=Math.max(11,Math.round(H*0.018));
  const X=function(i){ return left+(maxI?(i/maxI)*plotW:plotW/2); };
  const Y=function(v){ return bottom-(v/peak)*plotH; };
  ctx.strokeStyle=fg; ctx.lineWidth=1;
  ctx.font="500 "+fs+"px Inter, system-ui, sans-serif";
  ctx.textAlign="right"; ctx.textBaseline="middle";
  for(let s=0;s<=4;s++){
    const v=(peak/4)*s, yy=Y(v);
    ctx.globalAlpha=0.13;
    ctx.beginPath(); ctx.moveTo(left,yy); ctx.lineTo(right,yy); ctx.stroke();
    ctx.globalAlpha=0.55; ctx.fillStyle=fg;
    ctx.fillText(Math.round(v).toLocaleString(), left-W*0.012, yy);
  }
  ctx.globalAlpha=1;
  ctx.textAlign="center"; ctx.textBaseline="top"; ctx.globalAlpha=0.55; ctx.fillStyle=fg;
  const everyN=Math.ceil(labels.length/Math.max(2,Math.round(plotW/(W*0.10))));
  labels.forEach(function(lb,i){ if(i%everyN===0||i===maxI) ctx.fillText(lb,X(i),bottom+H*0.012); });
  ctx.globalAlpha=1;
  const whole=Math.floor(t), frac=t-whole;
  shown.forEach(function(i){
    const r=rows[i];
    ctx.strokeStyle=r.color; ctx.lineWidth=Math.max(2.5,H*0.0042);
    ctx.lineJoin="round"; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(X(0),Y(r.values[0]||0));
    for(let k=1;k<=whole&&k<=maxI;k++) ctx.lineTo(X(k),Y(r.values[k]||0));
    let hx=X(Math.min(whole,maxI)), hy=Y(r.values[Math.min(whole,maxI)]||0);
    if(whole<maxI&&frac>0){
      const a=r.values[whole]||0,b=r.values[whole+1]||a;
      hx=X(whole+frac); hy=Y(a+(b-a)*frac); ctx.lineTo(hx,hy);
    }
    ctx.stroke();
    ctx.fillStyle=r.color;
    ctx.beginPath(); ctx.arc(hx,hy,Math.max(4,H*0.006),0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=$("bg").value; ctx.lineWidth=Math.max(1.5,H*0.002); ctx.stroke();
    ctx.fillStyle=r.color;
    ctx.font="700 "+Math.round(fs*1.15)+"px Inter, system-ui, sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="middle";
    var _lx = hx + W*0.012;
    if (r.avatar && $("showLeader") && $("showLeader").value !== "off") {
      var _lr = Math.max(9, H*0.013);
      ctx.save();
      ctx.beginPath(); ctx.arc(_lx+_lr, hy, _lr, 0, Math.PI*2); ctx.closePath(); ctx.clip();
      var _s = Math.min(r.avatar.width, r.avatar.height);
      ctx.drawImage(r.avatar, (r.avatar.width-_s)/2, (r.avatar.height-_s)/2, _s, _s, _lx, hy-_lr, _lr*2, _lr*2);
      ctx.restore();
      ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1.5, _lr*0.16);
      ctx.beginPath(); ctx.arc(_lx+_lr, hy, _lr, 0, Math.PI*2); ctx.stroke();
      _lx += _lr*2 + W*0.008;
      ctx.fillStyle = r.color;
    }
    ctx.fillText(r.name+"  "+Math.round(vals[i]).toLocaleString(), _lx, hy);
  });
  drawBigPeriod(t, W, H, pad);
  drawLeaderCard(t, order, vals, W, H, pad);
  drawFooter(t,order,vals,W,H,pad,g.footH,topN);
}


function drawBigPeriod(t, W, H, pad) {
  if (!$("bigPeriod") || $("bigPeriod").value === "off") return;
  const lbl = labelAt(t); if (!lbl) return;
  ctx.fillStyle = $("fg").value;
  ctx.font = "800 " + Math.round(H*0.055) + "px Inter, system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText(lbl, W - pad, pad * 0.9);
}

function drawLeaderCard(t, order, vals, W, H, pad) {
  if (!$("showLeader") || $("showLeader").value === "off") return;
  const li = order[0]; if (li === undefined) return;
  const r = rows[li]; if (!r) return;
  const fg = $("fg").value;
  let held = 0;
  for (let k = Math.floor(t); k >= 0; k--) {
    let best = -Infinity, bi = -1;
    rows.forEach(function (rr, ii) { const v = rr.values[k]; if (v > best) { best = v; bi = ii; } });
    if (bi === li) held++; else break;
  }
  const cw = Math.round(W * 0.40), ch = Math.round(H * 0.085);
  const cx = pad, cy = pad * 0.8;
  ctx.save();
  ctx.globalAlpha = 0.10; ctx.fillStyle = fg;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx, cy, cw, ch, ch*0.16); else ctx.rect(cx, cy, cw, ch);
  ctx.fill(); ctx.globalAlpha = 1;
  const ph = ch * 0.74, px = cx + ch*0.13, py = cy + (ch-ph)/2;
  if (r.avatar) {
    ctx.save(); ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, ph, ph, ph*0.14); else ctx.rect(px, py, ph, ph);
    ctx.closePath(); ctx.clip();
    const s = Math.min(r.avatar.width, r.avatar.height);
    ctx.drawImage(r.avatar, (r.avatar.width-s)/2, (r.avatar.height-s)/2, s, s, px, py, ph, ph);
    ctx.restore();
  } else {
    ctx.fillStyle = r.color; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, ph, ph, ph*0.14); else ctx.rect(px, py, ph, ph);
    ctx.fill();
  }
  const tx = px + ph + ch*0.16;
  ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = fg;
  ctx.font = "700 " + Math.round(ch*0.30) + "px Inter, system-ui, sans-serif";
  ctx.fillText(r.name, tx, cy + ch*0.16);
  ctx.globalAlpha = 0.72;
  ctx.font = "600 " + Math.round(ch*0.21) + "px Inter, system-ui, sans-serif";
  ctx.fillText("Leading with " + Math.round(vals[li]).toLocaleString(), tx, cy + ch*0.50);
  ctx.globalAlpha = 0.5;
  ctx.font = "500 " + Math.round(ch*0.18) + "px Inter, system-ui, sans-serif";
  ctx.fillText(held <= 1 ? "just took the lead" : "in front for " + held + " steps", tx, cy + ch*0.75);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawFooter(t, order, vals, W, H, pad, footH, topN) {
  const statMode=(($("statMode")||{}).value)||"total";
  const fg=$("fg").value;
  if(statMode!=="none"){
    const vis=order.slice(0,topN);
    const sum=rows.reduce(function(s,r,i){ return s+state[i].value; },0);
    const nf=function(n){ return Math.round(n).toLocaleString(); };
    let statText="";
    if(statMode==="total") statText="Total: "+nf(sum);
    if(statMode==="average") statText="Average: "+nf(sum/Math.max(rows.length,1));
    if(statMode==="leader") statText="Leader: "+(rows[order[0]]?rows[order[0]].name:"");
    if(statMode==="highest") statText="Highest: "+nf(state[order[0]]?state[order[0]].value:0);
    if(statMode==="gap") statText="Lead by: "+nf((state[order[0]]?state[order[0]].value:0)-(state[order[1]]?state[order[1]].value:0));
    if(statMode==="count") statText=rows.length+" entries";
    if(statMode==="visible") statText="Top "+vis.length+" of "+rows.length;
    ctx.fillStyle=fg;
    ctx.font="800 "+Math.round(footH*0.42)+"px Inter, system-ui, sans-serif";
    ctx.textAlign="right"; ctx.textBaseline="alphabetic";
    ctx.fillText(statText,W-pad,H-pad*0.9);
  }
  const lbl=labelAt(t);
  if(lbl){
    ctx.fillStyle=fg; ctx.globalAlpha=0.55;
    ctx.font="600 "+Math.round(footH*0.26)+"px Inter, system-ui, sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    ctx.fillText(lbl,pad,H-pad*0.9); ctx.globalAlpha=1;
  }
}
function draw(t, ease) {
  if (!rows.length) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
  const topN   = parseInt($('topN').value, 10);
  const vals   = valuesAt(t);
  const order  = rows.map((r, i) => i).sort((a, b) => vals[b] - vals[a]);
  const rank   = new Map(order.map((idx, pos) => [idx, pos]));

  // ease bars toward their target rank/value so overtakes glide
  const k = ease === false ? 1 : 0.18;
  rows.forEach((r, i) => {
    const target = rank.get(i);
    state[i].y += (target - state[i].y) * k;
    state[i].value += (vals[i] - state[i].value) * (ease === false ? 1 : 0.30);
  });

  const W = cv.width, H = cv.height;
  const portrait = H > W;
  const pad      = Math.round(W * (portrait ? 0.05 : 0.035));
  const titleH   = $('title').value.trim() ? Math.round(H * 0.075) : Math.round(H * 0.02);
  const footH    = Math.round(H * (portrait ? 0.11 : 0.14));
  const areaTop  = titleH + pad * 0.4;
  const areaH    = H - areaTop - footH;
  const slot     = areaH / topN;
  const barH     = slot * 0.74;
  const fs       = barH * 0.42;

  ctx.fillStyle = $('bg').value;
  ctx.fillRect(0, 0, W, H);

  const title = $('title').value.trim();
  if (title) {
    ctx.fillStyle = $('fg').value;
    ctx.font = '700 ' + Math.round(titleH * 0.52) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(title, pad, titleH * 0.58);
  }

  if ((($("chartType")||{}).value) === "lines") {
    drawLines(t, order, vals, { W:W, H:H, pad:pad, areaTop:areaTop, areaH:areaH, footH:footH, topN:topN });
    return;
  }
  const shown = order.slice(0, topN);
  const maxV  = Math.max(...shown.map(i => state[i].value), 1);
  const nameW = Math.round(W * (portrait ? 0.30 : 0.20));
  const trackL = pad + (portrait ? W * 0.07 : 0);
  const _avsR = parseFloat(($("avSize")||{}).value || "0.44");
  const _anyAvatar = rows.some(function(rr){ return !!rr.avatar; });
  const _reserve = (portrait ? 0.17 : 0.10) + (_anyAvatar ? _avsR * 0.10 : 0);
  const trackR = W - pad - Math.round(W * _reserve);
  const trackW = trackR - trackL;

  shown.forEach(i => {
    const r = rows[i], st = state[i];
    const y = areaTop + st.y * slot + (slot - barH) / 2;
    if (y + barH < areaTop - slot || y > H) return;
    const w = Math.max((st.value / maxV) * trackW, barH * 0.55);
    const rad = barH / 2;

    // rank number (portrait style)
    if (portrait) {
      ctx.fillStyle = $('fg').value;
      ctx.font = '700 ' + Math.round(fs * 0.95) + 'px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(String(rank.get(i) + 1), trackL - W * 0.015, y + barH / 2);
    }

    // bar
    ctx.fillStyle = r.color;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(trackL, y, w, barH, rad); ctx.fill(); }
    else { ctx.fillRect(trackL, y, w, barH); }

    // name inside bar
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(trackL, y, w, barH, rad); else ctx.rect(trackL, y, w, barH);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.font = '600 ' + Math.round(fs) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(r.name, trackL + barH * 0.32, y + barH / 2);
    ctx.restore();

    // avatar at the end of the bar
    if (r.avatar) {
      const avScale = parseFloat(($("avSize")||{}).value || "0.44");
      const ar = barH * avScale, ax = trackL + w - ar - barH * 0.10, ay = y + barH / 2;
      ctx.save();
      ctx.beginPath(); ctx.arc(ax + ar, ay, ar, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      const s = Math.min(r.avatar.width, r.avatar.height);
      ctx.drawImage(r.avatar, (r.avatar.width - s) / 2, (r.avatar.height - s) / 2, s, s,
                    ax, ay - ar, ar * 2, ar * 2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(2, ar * 0.10);
      ctx.beginPath(); ctx.arc(ax + ar, ay, ar, 0, Math.PI * 2); ctx.stroke();
    }

    // value to the right of the bar
    ctx.fillStyle = $('fg').value;
    ctx.font = '600 ' + Math.round(fs * 0.92) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    var _avs = parseFloat(($("avSize")||{}).value || "0.44");
    var _vx = trackL + w + W * 0.012;
    if (r.avatar) _vx = trackL + w + barH * _avs - barH * 0.10 + W * 0.016;
    ctx.fillText(Math.round(st.value).toLocaleString(), _vx, y + barH / 2);
  });

  // footer: running total + current column label
  const statMode = ($("statMode")||{}).value || "total";
  if (statMode !== "none") {
    const vis = order.slice(0, topN);
    const sum = rows.reduce(function(s, r, i){ return s + state[i].value; }, 0);
    const nf = function(n){ return Math.round(n).toLocaleString(); };
    let statText = "";
    if (statMode === "total")   statText = "Total: " + nf(sum);
    if (statMode === "average") statText = "Average: " + nf(sum / Math.max(rows.length, 1));
    if (statMode === "leader")  statText = "Leader: " + (rows[order[0]] ? rows[order[0]].name : "");
    if (statMode === "highest") statText = "Highest: " + nf(state[order[0]] ? state[order[0]].value : 0);
    if (statMode === "gap")     statText = "Lead by: " + nf((state[order[0]] ? state[order[0]].value : 0) - (state[order[1]] ? state[order[1]].value : 0));
    if (statMode === "count")   statText = rows.length + " entries";
    if (statMode === "visible") statText = "Top " + vis.length + " of " + rows.length;
    ctx.fillStyle = $('fg').value;
    ctx.font = '800 ' + Math.round(footH * 0.42) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(statText, W - pad, H - pad * 0.9);
  }
  drawBigPeriod(t, W, H, pad);
  drawLeaderCard(t, order, vals, W, H, pad);
  const lbl = labelAt(t);
  if (lbl) {
    ctx.fillStyle = $('fg').value;
    ctx.globalAlpha = 0.55;
    ctx.font = '600 ' + Math.round(footH * 0.26) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(lbl, pad, H - pad * 0.9);
    ctx.globalAlpha = 1;
  }
}

// ─── playback ─────────────────────────────────────────────────────────────────
function setupCanvas() {
  const [w, h] = SIZES[$('ratio').value];
  cv.width = w; cv.height = h;
  cv.style.aspectRatio = w + ' / ' + h;
}

function totalDuration() {
  return Math.max(labels.length - 1, 1) * parseFloat($('stepSecs').value);
}

function play() {
  if (!rows.length) return;
  playing = true;
  $('playBtn').textContent = '❚❚ Pause';
  const span = Math.max(labels.length - 1, 0.001);
  const dur = totalDuration() * 1000;
  let t0 = performance.now() - (currentT() / span) * dur;
  function loop() {
    if (!playing) return;
    const p = Math.min((performance.now() - t0) / dur, 1);
    const t = p * span;
    $('scrub').value = t;
    draw(t);
    if (p >= 1) { stop(); return; }
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

function stop() {
  playing = false;
  $('playBtn').textContent = '▶ Play';
  if (rafId) cancelAnimationFrame(rafId);
}

// ─── export ───────────────────────────────────────────────────────────────────
async function exportVideo() {
  if (!rows.length) return;
  const btn = $('exportBtn');
  btn.disabled = true;
  $('exportNote').textContent = 'Recording — keep this tab visible until it finishes.';
  stop();
  resetState();

  const fps = 30;
  const span = Math.max(labels.length - 1, 0.001);
  const durMs = totalDuration() * 1000 + 900;   // small tail so the last frame lands
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9' : 'video/webm';

  const stream = cv.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start(100);

  await new Promise(done => {
    const t0 = performance.now();
    (function step() {
      const el = performance.now() - t0;
      const p = Math.min(el / durMs, 1);
      const t = Math.min(p * span * (durMs / (durMs - 900)), span);
      $('scrub').value = t;
      draw(t);
      $('exportNote').textContent = 'Recording… ' + Math.round(p * 100) + '%  (keep this tab visible)';
      if (p >= 1) { done(); return; }
      requestAnimationFrame(step);
    })();
  });

  rec.stop();
  await new Promise(r => { rec.onstop = r; });

  const blob = new Blob(chunks, { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ($('title').value.trim() || 'chart-race').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') + '.webm';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);

  $('exportNote').innerHTML = '✓ Downloaded. WebM plays in Chrome, Edge, Firefox and VLC, and uploads straight to YouTube, Reels and TikTok.';
  btn.disabled = false;
}

// ─── wiring ───────────────────────────────────────────────────────────────────
function loadFromTextarea() {
  try {
    parseTable($('data').value);
    $('dataErr').textContent = '';
    $('scrub').max = Math.max(labels.length - 1, 0.001);
    $('scrub').value = 0;
    renderRowList();
    setupCanvas();
    draw(0, false);
    $('meta').textContent = rows.length + ' rows · ' + labels.length + ' steps · ' +
      totalDuration().toFixed(1) + 's video';
  } catch (e) {
    $('dataErr').textContent = e.message;
  }
}

['ratio'].forEach(id => $(id).addEventListener('change', () => { setupCanvas(); draw(currentT(), false); }));
['topN','bg','fg','title','statMode','avSize','chartType','bigPeriod','showLeader'].forEach(id =>
  $(id).addEventListener('input', () => draw(currentT(), false)));
$('stepSecs').addEventListener('input', () => {
  $('stepSecsOut').textContent = parseFloat($('stepSecs').value).toFixed(1) + 's';
  if (rows.length) $('meta').textContent = rows.length + ' rows · ' + labels.length + ' steps · ' +
    totalDuration().toFixed(1) + 's video';
});
$('topN').addEventListener('input', () => $('topNOut').textContent = $('topN').value);
$('avSize').addEventListener('input', function(){ $('avSizeOut').textContent = Math.round(parseFloat(this.value)*100) + '%'; });
$('scrub').addEventListener('input', () => { stop(); draw(currentT()); });
$('loadBtn').addEventListener('click', loadFromTextarea);
$('playBtn').addEventListener('click', () => { if (playing) stop(); else { if (currentT() >= (labels.length - 1)) { $('scrub').value = 0; resetState(); } play(); } });
$('exportBtn').addEventListener('click', exportVideo);

$('csvFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = ev => { $('data').value = ev.target.result; loadFromTextarea(); };
  rd.readAsText(f);
});

document.querySelectorAll('.faq-q').forEach(b =>
  b.addEventListener('click', () => b.nextElementSibling.classList.toggle('open')));


// sample CSV template
function downloadSample(){
  var rows = [
    "Name,Jan,Feb,Mar,Apr,May,Jun",
    "Alice,120,340,610,980,1450,2100",
    "Ben,90,410,720,1180,1620,1950",
    "Chandra,150,300,540,860,1390,2320",
    "Divya,60,220,480,900,1510,2040",
    "Emeka,30,180,390,700,1120,1680"
  ];
  var csv = rows.join(String.fromCharCode(10)) + String.fromCharCode(10);
  var blob = new Blob([String.fromCharCode(65279) + csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chart-race-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 30000);
}
var _sb = document.getElementById("sampleBtn");
if (_sb) _sb.addEventListener("click", downloadSample);
// start with something on screen
loadFromTextarea();
