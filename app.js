// ─── STATE ───────────────────────────────────────────────────────────────────
let file = null;
let mode = 'l2p';
let segments = [];
let activeSeg = 0;
let videoDuration = 0;
let rafId = null;
let isDragging = false;
let userSeeking = false;
let dragStartX = 0, dragStartY = 0;
let dragOriginCX = 0, dragOriginCY = 0;
let lastActiveSeg = -1;

const COLORS = ['#1a9e6e','#378add','#d85a30','#7f77dd','#ba7517','#d4537e','#639922','#888780'];

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const fileInput     = document.getElementById('fileInput');
const dropZone      = document.getElementById('dropZone');
const editor        = document.getElementById('editor');
const vid           = document.getElementById('vid');
const outCanvas     = document.getElementById('outCanvas');
const ctx           = outCanvas.getContext('2d');
const ruler         = document.getElementById('ruler');
const rulerTrack    = document.getElementById('rulerTrack');
const playhead      = document.getElementById('playhead');
const segsList      = document.getElementById('segsList');
const timeDisplay   = document.getElementById('timeDisplay');
const pfill         = document.getElementById('pfill');
const progressLabel = document.getElementById('progressLabel');
const progressWrap  = document.getElementById('progressWrap');
const exportNote    = document.getElementById('exportNote');
const exportBtn     = document.getElementById('exportBtn');

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
fileInput.addEventListener('change', function() {
  if (this.files && this.files[0]) loadFile(this.files[0]);
});
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--green)'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.style.borderColor = '';
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

function loadFile(f) {
  file = f;
  vid.src = URL.createObjectURL(f);
  vid.addEventListener('loadedmetadata', function onMeta() {
    vid.removeEventListener('loadedmetadata', onMeta);
    videoDuration = vid.duration;
    document.getElementById('fileInfo').textContent =
      `${f.name}  •  ${vid.videoWidth}×${vid.videoHeight}  •  ${fmtTime(vid.duration)}  •  ${fmtSize(f.size)}`;
    dropZone.style.display = 'none';
    editor.style.display = 'block';
    segments = [{ start: 0, end: vid.duration, cx: 0.5, cy: 0.5, zoom: 1.0 }];
    activeSeg = 0;
    setupCanvas(); renderSegments(); updatePanel(); startPreviewLoop(); vid.pause();
  });
  vid.addEventListener('error', () => { alert('Could not read this video. Please try an MP4 file.'); file = null; });
}

document.getElementById('changeBtn').addEventListener('click', () => {
  editor.style.display = 'none'; dropZone.style.display = 'block';
  if (rafId) cancelAnimationFrame(rafId);
  vid.src = ''; file = null; segments = []; fileInput.value = '';
  exportNote.textContent = ''; progressWrap.style.display = 'none';
});

// ─── CANVAS ───────────────────────────────────────────────────────────────────
function setupCanvas() {
  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (mode === 'l2p') {
    // Landscape → Portrait: tall output, width = height × 9/16
    outCanvas.width  = Math.round(vh * 9 / 16);
    outCanvas.height = vh;
  } else {
    // Portrait → Landscape: wide output, height = width × 9/16
    outCanvas.width  = vw;
    outCanvas.height = Math.round(vw * 9 / 16);
  }
  outCanvas.style.width = '100%';
  outCanvas.style.height = 'auto';
  console.log('Canvas set to:', outCanvas.width, 'x', outCanvas.height, 'mode:', mode);
}

// ─── PREVIEW LOOP ─────────────────────────────────────────────────────────────
function startPreviewLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  function loop() {
    drawFrame(getCropForTime(vid.currentTime));
    if (videoDuration) playhead.style.left = (vid.currentTime / videoDuration * 100) + '%';
    timeDisplay.textContent = fmtTime(vid.currentTime) + ' / ' + fmtTime(videoDuration);
    if (!userSeeking && !vid.paused) autoFollowSegment();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

function getCropForTime(t) {
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t <= segments[i].end + 0.05) return segments[i];
  }
  return segments[segments.length - 1] || { cx: 0.5, cy: 0.5, zoom: 1 };
}

function drawFrame(seg) {
  if (vid.readyState < 2) return;
  const vw = vid.videoWidth, vh = vid.videoHeight;
  const ow = outCanvas.width, oh = outCanvas.height;
  const zoom = seg.zoom || 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ow, oh);
  if (zoom >= 1) {
    let sw = Math.max(2, Math.round(ow / zoom));
    let sh = Math.max(2, Math.round(oh / zoom));
    sw = sw%2===0?sw:sw-1; sh = sh%2===0?sh:sh-1;
    ctx.drawImage(vid, Math.round(Math.max(0,vw-sw)*seg.cx), Math.round(Math.max(0,vh-sh)*seg.cy), sw, sh, 0, 0, ow, oh);
  } else {
    const dw=Math.round(ow*zoom), dh=Math.round(oh*zoom);
    ctx.drawImage(vid, 0, 0, vw, vh, Math.round((ow-dw)/2), Math.round((oh-dh)/2), dw, dh);
  }
  ctx.strokeStyle='rgba(26,158,110,0.7)'; ctx.lineWidth=2; ctx.strokeRect(1,1,ow-2,oh-2);
}

function autoFollowSegment() {
  const t = vid.currentTime;
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t <= segments[i].end + 0.05) {
      if (i !== lastActiveSeg) { activeSeg=i; lastActiveSeg=i; renderSegments(); updatePanel(); }
      break;
    }
  }
}

// ─── DRAG ─────────────────────────────────────────────────────────────────────
outCanvas.addEventListener('dblclick', splitAtCurrentTime);
outCanvas.addEventListener('mousedown', e => {
  if (e.detail > 1) return;
  isDragging=true; userSeeking=true;
  dragStartX=e.clientX; dragStartY=e.clientY;
  const s=segments[activeSeg]||{cx:.5,cy:.5}; dragOriginCX=s.cx; dragOriginCY=s.cy;
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!isDragging||!segments[activeSeg]) return;
  const rect=outCanvas.getBoundingClientRect();
  segments[activeSeg].cx=Math.max(0,Math.min(1,dragOriginCX+(e.clientX-dragStartX)/rect.width));
  segments[activeSeg].cy=Math.max(0,Math.min(1,dragOriginCY+(e.clientY-dragStartY)/rect.height));
  syncSlidersFromSeg();
});
document.addEventListener('mouseup', () => { if(isDragging){isDragging=false;userSeeking=false;renderSegments();} });
outCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (!segments[activeSeg]) return;
  segments[activeSeg].zoom=Math.max(0.5,Math.min(3,(segments[activeSeg].zoom||1)+(e.deltaY<0?.05:-.05)));
  syncSlidersFromSeg(); renderSegments();
}, { passive:false });

// ─── PLAYBACK ─────────────────────────────────────────────────────────────────
document.getElementById('playBtn').addEventListener('click', () => {
  if (vid.paused) { vid.play(); document.getElementById('playBtn').textContent='⏸'; }
  else { vid.pause(); document.getElementById('playBtn').textContent='▶'; }
});
vid.addEventListener('ended', () => { vid.currentTime=0; vid.pause(); document.getElementById('playBtn').textContent='▶'; });
ruler.addEventListener('click', e => {
  const rect=ruler.getBoundingClientRect();
  const t=((e.clientX-rect.left)/rect.width)*videoDuration;
  userSeeking=true; vid.currentTime=t;
  for (let i=0;i<segments.length;i++) {
    if (t>=segments[i].start&&t<=segments[i].end+.05){ activeSeg=i;lastActiveSeg=i;renderSegments();updatePanel();break; }
  }
  setTimeout(()=>{userSeeking=false;},300);
});

// ─── SPLIT ────────────────────────────────────────────────────────────────────
function splitAtCurrentTime() {
  const t=vid.currentTime;
  if (t<.1||t>videoDuration-.1) return;
  let idx=-1;
  for (let i=0;i<segments.length;i++) { if(t>segments[i].start&&t<segments[i].end){idx=i;break;} }
  if (idx===-1) return;
  const o=segments[idx];
  segments.splice(idx+1,0,{start:t,end:o.end,cx:o.cx,cy:o.cy,zoom:o.zoom||1});
  o.end=t; activeSeg=idx+1; lastActiveSeg=idx+1;
  renderSegments(); updatePanel();
}
document.getElementById('splitBtn').addEventListener('click', splitAtCurrentTime);
document.getElementById('addSegBtn').addEventListener('click', () => {
  const last=segments[segments.length-1];
  if (last&&last.end-last.start>.4) {
    const mid=(last.start+last.end)/2;
    segments.push({start:mid,end:last.end,cx:last.cx,cy:last.cy,zoom:last.zoom||1});
    last.end=mid; activeSeg=segments.length-1;
  }
  renderSegments(); updatePanel();
});

// ─── MODE ─────────────────────────────────────────────────────────────────────
document.getElementById('mL2P').addEventListener('click', () => {
  mode='l2p'; document.getElementById('mL2P').classList.add('active'); document.getElementById('mP2L').classList.remove('active'); if(file)setupCanvas();
});
document.getElementById('mP2L').addEventListener('click', () => {
  mode='p2l'; document.getElementById('mP2L').classList.add('active'); document.getElementById('mL2P').classList.remove('active'); if(file)setupCanvas();
});

// ─── SEGMENTS ─────────────────────────────────────────────────────────────────
function renderSegments() {
  rulerTrack.innerHTML='';
  segments.forEach((s,i) => {
    const el=document.createElement('div');
    el.className='seg-block'+(i===activeSeg?' active-seg':'');
    el.style.left=(s.start/videoDuration*100).toFixed(2)+'%';
    el.style.width=((s.end-s.start)/videoDuration*100).toFixed(2)+'%';
    el.style.background=COLORS[i%8]; el.textContent=i+1;
    el.addEventListener('click',e=>{e.stopPropagation();selectSeg(i);});
    rulerTrack.appendChild(el);
  });
  segsList.innerHTML='';
  segments.forEach((s,i) => {
    const row=document.createElement('div');
    row.className='seg-row'+(i===activeSeg?' active':'');
    row.innerHTML=`<div class="seg-dot" style="background:${COLORS[i%8]}"></div><span class="seg-name">Seg ${i+1}</span><span class="seg-time">${fmtTime(s.start)} → ${fmtTime(s.end)}</span><span class="seg-zoom">Z:${(s.zoom||1).toFixed(1)}×</span><div class="seg-actions"><button class="seg-btn" data-play="${i}">▶</button>${segments.length>1?`<button class="seg-btn del" data-del="${i}">✕</button>`:''}</div>`;
    row.addEventListener('click',e=>{
      if(e.target.dataset.play!==undefined){selectSeg(+e.target.dataset.play);return;}
      if(e.target.dataset.del!==undefined){deleteSeg(+e.target.dataset.del);return;}
      selectSeg(i);
    });
    segsList.appendChild(row);
  });
}
function selectSeg(i){activeSeg=i;lastActiveSeg=i;vid.currentTime=segments[i].start;renderSegments();updatePanel();}
function deleteSeg(i){
  if(segments.length<=1)return;
  if(i>0)segments[i-1].end=segments[i].end;else segments[1].start=0;
  segments.splice(i,1);activeSeg=Math.min(activeSeg,segments.length-1);
  renderSegments();updatePanel();
}

// ─── PANEL ────────────────────────────────────────────────────────────────────
function updatePanel(){
  const s=segments[activeSeg];if(!s)return;
  document.getElementById('cpNum').textContent=activeSeg+1;
  document.getElementById('cpTime').textContent=fmtTime(s.start)+' → '+fmtTime(s.end);
  document.getElementById('segStart').value=s.start.toFixed(1);
  document.getElementById('segEnd').value=s.end.toFixed(1);
  document.getElementById('cx').value=Math.round(s.cx*100);
  document.getElementById('cy').value=Math.round(s.cy*100);
  document.getElementById('zoom').value=Math.round((s.zoom||1)*100);
  document.getElementById('cxv').textContent=Math.round(s.cx*100)+'%';
  document.getElementById('cyv').textContent=Math.round(s.cy*100)+'%';
  document.getElementById('zoomv').textContent=(s.zoom||1).toFixed(2)+'×';
}
function syncSlidersFromSeg(){updatePanel();renderSegments();}
document.getElementById('cx').addEventListener('input',function(){if(segments[activeSeg]){segments[activeSeg].cx=+this.value/100;document.getElementById('cxv').textContent=this.value+'%';renderSegments();}});
document.getElementById('cy').addEventListener('input',function(){if(segments[activeSeg]){segments[activeSeg].cy=+this.value/100;document.getElementById('cyv').textContent=this.value+'%';renderSegments();}});
document.getElementById('zoom').addEventListener('input',function(){if(segments[activeSeg]){segments[activeSeg].zoom=+this.value/100;document.getElementById('zoomv').textContent=(+this.value/100).toFixed(2)+'×';renderSegments();}});
document.getElementById('segStart').addEventListener('input',function(){if(!segments[activeSeg])return;segments[activeSeg].start=Math.max(0,+this.value||0);if(activeSeg>0)segments[activeSeg-1].end=segments[activeSeg].start;renderSegments();updatePanel();});
document.getElementById('segEnd').addEventListener('input',function(){if(!segments[activeSeg])return;segments[activeSeg].end=Math.min(videoDuration,+this.value||0);if(activeSeg<segments.length-1)segments[activeSeg+1].start=segments[activeSeg].end;renderSegments();updatePanel();});
window.setZoom=v=>{if(!segments[activeSeg])return;segments[activeSeg].zoom=v/100;document.getElementById('zoom').value=v;document.getElementById('zoomv').textContent=(v/100).toFixed(2)+'×';renderSegments();};

// ─── FAQ ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.nextElementSibling.classList.toggle('open')));

// ─── EXPORT via FFmpeg ────────────────────────────────────────────────────────
exportBtn.addEventListener('click', async () => {
  if (!file) return;
  exportBtn.disabled = true;
  progressWrap.style.display = 'block';
  pfill.style.width = '0%';
  exportNote.textContent = '';

  try {
    // Step 1: Read file first — before loading FFmpeg
    progressLabel.textContent = 'Reading your video…';
    pfill.style.width = '10%';

    const uint8 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => { console.log('FileReader done, bytes:', e.target.result.byteLength); resolve(new Uint8Array(e.target.result)); };
      reader.onerror = e => { console.error('FileReader error', e); reject(new Error('FileReader failed')); };
      reader.readAsArrayBuffer(file);
    });

    pfill.style.width = '20%';
    progressLabel.textContent = 'Loading FFmpeg engine…';

    // Step 2: Load FFmpeg
    const { createFFmpeg } = FFmpeg;
    const ff = createFFmpeg({ log: true });

    ff.setProgress(({ ratio }) => {
      if (ratio > 0) pfill.style.width = Math.round(20 + ratio * 65) + '%';
    });

    await ff.load();
    console.log('FFmpeg loaded OK');

    // Step 3: Write file
    progressLabel.textContent = 'Writing to processor…';
    ff.FS('writeFile', 'input.mp4', uint8);
    console.log('File written, size:', uint8.length);

    // Strip any rotation metadata from input so crop is applied to actual pixels
    progressLabel.textContent = 'Preparing video…';
    pfill.style.width = '35%';
    await ff.run(
      '-i', 'input.mp4',
      '-c', 'copy',
      '-map_metadata', '-1',
      '-metadata:s:v', 'rotate=0',
      'input_norot.mp4'
    );
    console.log('Rotation stripped');
    pfill.style.width = '30%';

    // Step 4: Test FFmpeg works with a simple probe
    const vw = vid.videoWidth, vh = vid.videoHeight;
    let outW, outH;

    // l2p: landscape (wide) → portrait (tall)
    // Source: 1920×1080 → Output must be 9:16 ratio using the HEIGHT as reference
    // Portrait width = height × 9/16, height stays the same
    if (mode === 'l2p') {
      outH = vh;                          // keep source height
      outW = Math.round(vh * 9 / 16);    // width = height × 9/16 (narrow crop)
    } else {
      // p2l: portrait (tall) → landscape (wide)
      // Source: e.g. 1080×1920 → Output must be 16:9 ratio using WIDTH as reference
      outW = vw;                          // keep source width
      outH = Math.round(vw * 9 / 16);    // height = width × 9/16 (short crop)
    }
    outW = outW%2===0?outW:outW-1;
    outH = outH%2===0?outH:outH-1;
    console.log('Source:', vw, 'x', vh, '| Output:', outW, 'x', outH, '| Mode:', mode);

    const total = segments.length;
    const parts = [];

    for (let i = 0; i < total; i++) {
      const s = segments[i];
      const segDur = Math.max(0.1, s.end - s.start);
      const zoom = s.zoom || 1;
      const outName = `part${i}.mp4`;

      let vf;
      if (zoom >= 1) {
        // Crop a region from the source then scale to output
        // The crop region has the same aspect ratio as output
        let sw = Math.max(2, Math.round(outW / zoom));
        let sh = Math.max(2, Math.round(outH / zoom));
        sw = sw%2===0?sw:sw-1; sh = sh%2===0?sh:sh-1;
        // sx/sy position the crop within the source frame
        const maxSX = Math.max(0, vw - sw);
        const maxSY = Math.max(0, vh - sh);
        const sx = Math.round(maxSX * s.cx);
        const sy = Math.round(maxSY * s.cy);
        vf = `crop=${sw}:${sh}:${sx}:${sy},scale=${outW}:${outH}:flags=lanczos`;
      } else {
        let sw = Math.round(outW*zoom); let sh = Math.round(outH*zoom);
        sw = sw%2===0?sw:sw-1; sh = sh%2===0?sh:sh-1;
        vf = `scale=${sw}:${sh}:flags=lanczos,pad=${outW}:${outH}:${Math.round((outW-sw)/2)}:${Math.round((outH-sh)/2)}:black`;
      }
      console.log(`Seg ${i+1}: crop region sw=${Math.round(outW/(s.zoom||1))} sh=${Math.round(outH/(s.zoom||1))} → output ${outW}x${outH}`);

      progressLabel.textContent = `Exporting segment ${i+1} of ${total}…`;
      console.log(`Running segment ${i+1}: -ss ${s.start.toFixed(2)} -t ${segDur.toFixed(2)} -vf "${vf}"`);

      await ff.run(
        '-ss', s.start.toFixed(3),
        '-i', 'input_norot.mp4',
        '-t', segDur.toFixed(3),
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-map_metadata', '-1',        // strip all metadata including rotation
        '-metadata:s:v', 'rotate=0', // force no rotation
        outName
      );

      const data = ff.FS('readFile', outName);
      console.log(`Segment ${i+1} done, output size:`, data.length);
      if (data.length < 1000) throw new Error(`Segment ${i+1} output too small (${data.length} bytes) — FFmpeg may have failed. Check console.`);
      parts.push(data);
      ff.FS('unlink', outName);
      pfill.style.width = Math.round(30 + ((i+1)/total) * 55) + '%';
    }

    let finalData;
    if (parts.length === 1) {
      finalData = parts[0];
    } else {
      progressLabel.textContent = 'Joining segments…';
      parts.forEach((d,i) => ff.FS('writeFile', `s${i}.mp4`, d));
      const list = parts.map((_,i) => `file 's${i}.mp4'`).join('\n');
      ff.FS('writeFile', 'list.txt', new TextEncoder().encode(list));
      await ff.run(
        '-f', 'concat', '-safe', '0', '-i', 'list.txt',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-map_metadata', '-1',
        '-metadata:s:v', 'rotate=0',
        'final.mp4'
      );
      finalData = ff.FS('readFile', 'final.mp4');
      console.log('Final merged size:', finalData.length);
    }

    pfill.style.width = '100%';
    progressLabel.textContent = 'Done! Downloading…';

    const suffix = mode === 'l2p' ? '_portrait' : '_landscape';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([finalData.buffer], { type: 'video/mp4' }));
    a.download = file.name.replace(/\.[^.]+$/, '') + suffix + '.mp4';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1000);
    exportNote.textContent = '✓ Done! Processed entirely in your browser.';

  } catch (err) {
    progressLabel.textContent = 'Error — see details below';
    exportNote.textContent = '⚠ ' + err.message;
    console.error('Export failed:', err);
  }

  exportBtn.disabled = false;
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtTime(s) { return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function fmtSize(b) { return b>1e9?(b/1e9).toFixed(1)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':(b/1e3).toFixed(0)+' KB'; }
