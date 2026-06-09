// ─── STATE ───────────────────────────────────────────────────────────────────
let file = null;
let mode = 'l2p';            // 'l2p' = landscape→portrait, 'p2l' = portrait→landscape
let segments = [];           // [{start, end, cx, cy, zoom}]
let activeSeg = 0;
let videoDuration = 0;
let rafId = null;

// Drag state
let isDragging = false;
let hasSplit = false;
let dragStartX = 0, dragStartY = 0;
let dragOriginCX = 0, dragOriginCY = 0;

const COLORS = ['#1a9e6e','#378add','#d85a30','#7f77dd','#ba7517','#d4537e','#639922','#888780'];

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const fileInput   = document.getElementById('fileInput');
const dropZone    = document.getElementById('dropZone');
const editor      = document.getElementById('editor');
const vid         = document.getElementById('vid');
const outCanvas   = document.getElementById('outCanvas');
const ctx         = outCanvas.getContext('2d');
const ruler       = document.getElementById('ruler');
const rulerTrack  = document.getElementById('rulerTrack');
const playhead    = document.getElementById('playhead');
const segsList    = document.getElementById('segsList');
const timeDisplay = document.getElementById('timeDisplay');
const pfill       = document.getElementById('pfill');
const progressLabel = document.getElementById('progressLabel');
const progressWrap  = document.getElementById('progressWrap');
const exportNote    = document.getElementById('exportNote');

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
// The label[for="fileInput"] in HTML handles click natively — no JS needed for that.
// We just need drag-and-drop and the change event.

fileInput.addEventListener('change', function() {
  if (this.files && this.files[0]) loadFile(this.files[0]);
});

// Drag and drop onto drop zone
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--green)'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.style.borderColor = '';
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});

function loadFile(f) {
  console.log('Loading file:', f.name, f.type, f.size);
  file = f;

  const url = URL.createObjectURL(f);
  vid.src = url;

  vid.addEventListener('loadedmetadata', function onMeta() {
    vid.removeEventListener('loadedmetadata', onMeta);
    console.log('Video loaded:', vid.videoWidth, 'x', vid.videoHeight, vid.duration + 's');

    videoDuration = vid.duration;
    document.getElementById('fileInfo').textContent =
      `${f.name}  •  ${vid.videoWidth}×${vid.videoHeight}  •  ${formatTime(vid.duration)}  •  ${formatSize(f.size)}`;

    dropZone.style.display = 'none';
    editor.style.display = 'block';

    segments = [{ start: 0, end: vid.duration, cx: 0.5, cy: 0.5, zoom: 1.0 }];
    activeSeg = 0;
    setupCanvas();
    renderSegments();
    updatePanel();
    startPreviewLoop();
    vid.pause();
  });

  vid.addEventListener('error', function() {
    alert('Could not read this video. Please try an MP4 file.');
    file = null;
  });
}

document.getElementById('changeBtn').addEventListener('click', () => {
  editor.style.display = 'none';
  dropZone.style.display = 'block';
  if (rafId) cancelAnimationFrame(rafId);
  vid.src = '';
  file = null;
  segments = [];
  fileInput.value = '';
  exportNote.textContent = '';
  progressWrap.style.display = 'none';
});

// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────
function setupCanvas() {
  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (mode === 'l2p') {
    outCanvas.width  = Math.round(vh * 9 / 16);
    outCanvas.height = vh;
  } else {
    outCanvas.width  = vw;
    outCanvas.height = Math.round(vw * 9 / 16);
  }
  // Make canvas display correctly in the layout
  outCanvas.style.width = '100%';
  outCanvas.style.height = 'auto';
}

// ─── PREVIEW LOOP ─────────────────────────────────────────────────────────────
function startPreviewLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  function loop() {
    drawPreview();
    updatePlayheadUI();
    checkActiveSegment();
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

function drawPreview() {
  if (vid.readyState < 2) return;
  const seg = getCropForTime(vid.currentTime);
  const vw = vid.videoWidth, vh = vid.videoHeight;
  const ow = outCanvas.width, oh = outCanvas.height;
  const zoom = seg.zoom || 1;

  let sw, sh, sx, sy;
  if (zoom >= 1) {
    // Zoom in: sample smaller region, scale up
    sw = Math.max(2, Math.round(ow / zoom));
    sh = Math.max(2, Math.round(oh / zoom));
    sw = sw % 2 === 0 ? sw : sw - 1;
    sh = sh % 2 === 0 ? sh : sh - 1;
    sx = Math.round(Math.max(0, vw - sw) * seg.cx);
    sy = Math.round(Math.max(0, vh - sh) * seg.cy);
  } else {
    // Zoom out: use full frame, draw smaller with black padding
    sw = vw; sh = vh; sx = 0; sy = 0;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ow, oh);

  if (zoom >= 1) {
    ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, ow, oh);
  } else {
    const dw = Math.round(ow * zoom), dh = Math.round(oh * zoom);
    const dx = Math.round((ow - dw) / 2), dy = Math.round((oh - dh) / 2);
    ctx.drawImage(vid, 0, 0, vw, vh, dx, dy, dw, dh);
  }

  // Green crop border
  ctx.strokeStyle = 'rgba(26,158,110,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, ow - 2, oh - 2);
}

function updatePlayheadUI() {
  if (!videoDuration) return;
  const pct = (vid.currentTime / videoDuration) * 100;
  playhead.style.left = pct + '%';
  timeDisplay.textContent = formatTime(vid.currentTime) + ' / ' + formatTime(videoDuration);
}

let lastActiveSeg = -1;
function checkActiveSegment() {
  const t = vid.currentTime;
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t <= segments[i].end + 0.05) {
      if (i !== lastActiveSeg) {
        activeSeg = i;
        lastActiveSeg = i;
        renderSegments();
        updatePanel();
      }
      break;
    }
  }
}

// ─── DRAG ON OUTPUT CANVAS ────────────────────────────────────────────────────
outCanvas.addEventListener('mousedown', e => {
  isDragging = true;
  hasSplit = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const s = segments[activeSeg] || { cx: 0.5, cy: 0.5 };
  dragOriginCX = s.cx;
  dragOriginCY = s.cy;
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!isDragging || !segments[activeSeg]) return;
  const rect = outCanvas.getBoundingClientRect();
  const pxMoved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);

  // Auto-split: only once per drag, after 25px movement, while playing
  if (!hasSplit && pxMoved > 25 && !vid.paused) {
    const t = vid.currentTime;
    const seg = segments[activeSeg];
    if (t > seg.start + 0.3 && t < seg.end - 0.3) {
      hasSplit = true;
      const newSeg = { start: t, end: seg.end, cx: seg.cx, cy: seg.cy, zoom: seg.zoom || 1 };
      seg.end = t;
      segments.splice(activeSeg + 1, 0, newSeg);
      activeSeg++;
      dragOriginCX = segments[activeSeg].cx;
      dragOriginCY = segments[activeSeg].cy;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  }

  segments[activeSeg].cx = Math.max(0, Math.min(1, dragOriginCX + (e.clientX - dragStartX) / rect.width));
  segments[activeSeg].cy = Math.max(0, Math.min(1, dragOriginCY + (e.clientY - dragStartY) / rect.height));
  syncSlidersFromSeg();
});

document.addEventListener('mouseup', () => {
  if (isDragging) { isDragging = false; hasSplit = false; renderSegments(); }
});

// Scroll to zoom
outCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (!segments[activeSeg]) return;
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  segments[activeSeg].zoom = Math.max(0.5, Math.min(3, (segments[activeSeg].zoom || 1) + delta));
  syncSlidersFromSeg();
  renderSegments();
}, { passive: false });

// ─── PLAYBACK ─────────────────────────────────────────────────────────────────
document.getElementById('playBtn').addEventListener('click', () => {
  if (vid.paused) { vid.play(); document.getElementById('playBtn').textContent = '⏸'; }
  else { vid.pause(); document.getElementById('playBtn').textContent = '▶'; }
});

vid.addEventListener('ended', () => {
  vid.currentTime = 0;
  vid.pause();
  document.getElementById('playBtn').textContent = '▶';
});

ruler.addEventListener('click', e => {
  const rect = ruler.getBoundingClientRect();
  vid.currentTime = ((e.clientX - rect.left) / rect.width) * videoDuration;
});

// ─── SPLIT ────────────────────────────────────────────────────────────────────
document.getElementById('splitBtn').addEventListener('click', () => {
  const t = vid.currentTime;
  if (t < 0.1 || t > videoDuration - 0.1) return;
  let idx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (t > segments[i].start && t < segments[i].end) { idx = i; break; }
  }
  if (idx === -1) return;
  const orig = segments[idx];
  const newSeg = { start: t, end: orig.end, cx: orig.cx, cy: orig.cy, zoom: orig.zoom || 1 };
  orig.end = t;
  segments.splice(idx + 1, 0, newSeg);
  activeSeg = idx + 1;
  renderSegments();
  updatePanel();
});

// ─── ADD SEGMENT ──────────────────────────────────────────────────────────────
document.getElementById('addSegBtn').addEventListener('click', () => {
  const last = segments[segments.length - 1];
  if (last && last.end - last.start > 0.4) {
    const mid = (last.start + last.end) / 2;
    segments.push({ start: mid, end: last.end, cx: last.cx, cy: last.cy, zoom: last.zoom || 1 });
    last.end = mid;
    activeSeg = segments.length - 1;
  }
  renderSegments();
  updatePanel();
});

// ─── MODE SWITCH ─────────────────────────────────────────────────────────────
document.getElementById('mL2P').addEventListener('click', () => {
  mode = 'l2p';
  document.getElementById('mL2P').classList.add('active');
  document.getElementById('mP2L').classList.remove('active');
  if (file) setupCanvas();
});
document.getElementById('mP2L').addEventListener('click', () => {
  mode = 'p2l';
  document.getElementById('mP2L').classList.add('active');
  document.getElementById('mL2P').classList.remove('active');
  if (file) setupCanvas();
});

// ─── RENDER SEGMENTS ─────────────────────────────────────────────────────────
function renderSegments() {
  // Timeline ruler
  rulerTrack.innerHTML = '';
  segments.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'seg-block' + (i === activeSeg ? ' active-seg' : '');
    el.style.left   = (s.start / videoDuration * 100).toFixed(2) + '%';
    el.style.width  = ((s.end - s.start) / videoDuration * 100).toFixed(2) + '%';
    el.style.background = COLORS[i % 8];
    el.textContent = i + 1;
    el.addEventListener('click', e => { e.stopPropagation(); selectSeg(i); });
    rulerTrack.appendChild(el);
  });

  // List
  segsList.innerHTML = '';
  segments.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'seg-row' + (i === activeSeg ? ' active' : '');
    row.innerHTML = `
      <div class="seg-dot" style="background:${COLORS[i % 8]}"></div>
      <span class="seg-name">Seg ${i + 1}</span>
      <span class="seg-time">${formatTime(s.start)} → ${formatTime(s.end)}</span>
      <span class="seg-zoom">Z:${(s.zoom || 1).toFixed(1)}×</span>
      <div class="seg-actions">
        <button class="seg-btn" data-play="${i}">▶</button>
        ${segments.length > 1 ? `<button class="seg-btn del" data-del="${i}">✕</button>` : ''}
      </div>`;
    row.addEventListener('click', e => {
      if (e.target.dataset.play !== undefined) { selectSeg(+e.target.dataset.play); return; }
      if (e.target.dataset.del !== undefined) { deleteSeg(+e.target.dataset.del); return; }
      selectSeg(i);
    });
    segsList.appendChild(row);
  });
}

function selectSeg(i) {
  activeSeg = i;
  vid.currentTime = segments[i].start;
  lastActiveSeg = i;
  renderSegments();
  updatePanel();
}

function deleteSeg(i) {
  if (segments.length <= 1) return;
  if (i > 0) segments[i - 1].end = segments[i].end;
  else segments[1].start = 0;
  segments.splice(i, 1);
  activeSeg = Math.min(activeSeg, segments.length - 1);
  renderSegments();
  updatePanel();
}

// ─── PANEL ────────────────────────────────────────────────────────────────────
function updatePanel() {
  const s = segments[activeSeg];
  if (!s) return;
  document.getElementById('cpNum').textContent = activeSeg + 1;
  document.getElementById('cpTime').textContent = formatTime(s.start) + ' → ' + formatTime(s.end);
  document.getElementById('segStart').value = s.start.toFixed(1);
  document.getElementById('segEnd').value   = s.end.toFixed(1);
  document.getElementById('cx').value = Math.round(s.cx * 100);
  document.getElementById('cy').value = Math.round(s.cy * 100);
  document.getElementById('zoom').value = Math.round((s.zoom || 1) * 100);
  document.getElementById('cxv').textContent   = Math.round(s.cx * 100) + '%';
  document.getElementById('cyv').textContent   = Math.round(s.cy * 100) + '%';
  document.getElementById('zoomv').textContent = (s.zoom || 1).toFixed(2) + '×';
}

function syncSlidersFromSeg() {
  updatePanel();
  renderSegments();
}

document.getElementById('cx').addEventListener('input', function() {
  if (segments[activeSeg]) { segments[activeSeg].cx = +this.value / 100; document.getElementById('cxv').textContent = this.value + '%'; renderSegments(); }
});
document.getElementById('cy').addEventListener('input', function() {
  if (segments[activeSeg]) { segments[activeSeg].cy = +this.value / 100; document.getElementById('cyv').textContent = this.value + '%'; renderSegments(); }
});
document.getElementById('zoom').addEventListener('input', function() {
  if (segments[activeSeg]) { segments[activeSeg].zoom = +this.value / 100; document.getElementById('zoomv').textContent = (+this.value / 100).toFixed(2) + '×'; renderSegments(); }
});
document.getElementById('segStart').addEventListener('input', function() {
  if (!segments[activeSeg]) return;
  segments[activeSeg].start = Math.max(0, +this.value || 0);
  if (activeSeg > 0) segments[activeSeg - 1].end = segments[activeSeg].start;
  renderSegments(); updatePanel();
});
document.getElementById('segEnd').addEventListener('input', function() {
  if (!segments[activeSeg]) return;
  segments[activeSeg].end = Math.min(videoDuration, +this.value || 0);
  if (activeSeg < segments.length - 1) segments[activeSeg + 1].start = segments[activeSeg].end;
  renderSegments(); updatePanel();
});

window.setZoom = function(v) {
  if (!segments[activeSeg]) return;
  segments[activeSeg].zoom = v / 100;
  document.getElementById('zoom').value = v;
  document.getElementById('zoomv').textContent = (v / 100).toFixed(2) + '×';
  renderSegments();
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const ans = btn.nextElementSibling;
    ans.classList.toggle('open');
  });
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', async () => {
  if (!file) return;
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.disabled = true;
  progressWrap.style.display = 'block';
  pfill.style.width = '0%';
  exportNote.textContent = '';

  try {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ff = createFFmpeg({
      log: false,
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });

    progressLabel.textContent = 'Loading engine (first run ~15s)…';
    await ff.load();

    progressLabel.textContent = 'Reading video…';
    ff.FS('writeFile', 'input.mp4', await fetchFile(file));

    const vw = vid.videoWidth, vh = vid.videoHeight;
    let outW, outH;
    if (mode === 'l2p') { outW = Math.round(vh * 9 / 16); outH = vh; }
    else                { outW = vw; outH = Math.round(vw * 9 / 16); }
    // Must be even for libx264
    outW = outW % 2 === 0 ? outW : outW - 1;
    outH = outH % 2 === 0 ? outH : outH - 1;

    const total = segments.length;
    const segBuffers = [];

    for (let i = 0; i < total; i++) {
      const s = segments[i];
      const zoom = s.zoom || 1;
      const segDur = Math.max(0.1, s.end - s.start);
      const outName = `part${i}.mp4`;
      let vf;

      if (zoom >= 1) {
        let sw = Math.max(2, Math.round(outW / zoom));
        let sh = Math.max(2, Math.round(outH / zoom));
        sw = sw % 2 === 0 ? sw : sw - 1;
        sh = sh % 2 === 0 ? sh : sh - 1;
        const sx = Math.round(Math.max(0, vw - sw) * s.cx);
        const sy = Math.round(Math.max(0, vh - sh) * s.cy);
        vf = `crop=${sw}:${sh}:${sx}:${sy},scale=${outW}:${outH}:flags=lanczos`;
      } else {
        const scaleW = Math.round(outW * zoom) % 2 === 0 ? Math.round(outW * zoom) : Math.round(outW * zoom) - 1;
        const scaleH = Math.round(outH * zoom) % 2 === 0 ? Math.round(outH * zoom) : Math.round(outH * zoom) - 1;
        const padX = Math.round((outW - scaleW) / 2);
        const padY = Math.round((outH - scaleH) / 2);
        vf = `scale=${scaleW}:${scaleH}:flags=lanczos,pad=${outW}:${outH}:${padX}:${padY}:black`;
      }

      progressLabel.textContent = `Exporting segment ${i + 1} of ${total}…`;
      pfill.style.width = Math.round((i / total) * 85) + '%';

      await ff.run(
        '-ss', s.start.toFixed(3),
        '-i', 'input.mp4',
        '-t', segDur.toFixed(3),
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        outName
      );

      segBuffers.push(ff.FS('readFile', outName));
      ff.FS('unlink', outName);
    }

    pfill.style.width = '90%';

    let finalData;
    if (segBuffers.length === 1) {
      finalData = segBuffers[0];
    } else {
      progressLabel.textContent = 'Joining segments…';
      segBuffers.forEach((buf, i) => ff.FS('writeFile', `s${i}.mp4`, buf));
      const list = segBuffers.map((_, i) => `file 's${i}.mp4'`).join('\n');
      ff.FS('writeFile', 'list.txt', new TextEncoder().encode(list));
      await ff.run(
        '-f', 'concat', '-safe', '0', '-i', 'list.txt',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        'final.mp4'
      );
      finalData = ff.FS('readFile', 'final.mp4');
    }

    pfill.style.width = '100%';
    progressLabel.textContent = 'Done! Downloading…';

    const suffix = mode === 'l2p' ? '_portrait' : '_landscape';
    const outName = file.name.replace(/\.[^.]+$/, '') + suffix + '.mp4';
    const blob = new Blob([finalData.buffer], { type: 'video/mp4' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1000);

    exportNote.textContent = 'Processed entirely in your browser — your video was never uploaded.';

  } catch (err) {
    progressLabel.textContent = '';
    exportNote.textContent = '⚠ ' + err.message;
    console.error(err);
  }

  document.getElementById('exportBtn').disabled = false;
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function formatSize(b) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(0) + ' KB';
}
