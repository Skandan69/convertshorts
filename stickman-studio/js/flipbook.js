// ---------- Flipbook Animator (standalone, frame-by-frame draw animation) ----------
// A simple hand-drawn flipbook tool: draw a frame, add another (with a faint "onion skin" of the
// previous one to help line things up), keep going, then play it back or export a real .webm video.
// This is completely independent from the rest of the app's character/pose/scene-timeline system —
// its own little canvas, its own frame list, no shared state with anything else on the page.
(function () {
  const W = 480, H = 320;
  let cv, ctx, ghost, gctx;
  let drawing = false, last = null;
  let brush = 'pencil', colour = '#1b1f27', size = 8;
  let frames = [{ url: null }];
  let cur = 0;
  let onion = 30; // 0-100
  let playTimer = null;
  let inited = false;

  const PALETTE = ['#1b1f27', '#e0483d', '#f5a524', '#2f6df6', '#12a150', '#8b5cf6', '#ffffff'];

  function $(id) { return document.getElementById(id); }

  function wipe(x) { x.clearRect(0, 0, W, H); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); }

  function paste(url, then) {
    if (!url) { wipe(ctx); if (then) then(); return; }
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0); if (then) then(); };
    img.src = url;
  }

  function at(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function dab(a, b) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (brush === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2.2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colour;
      ctx.lineWidth = size;
    }
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
  }

  function shootThumb() {
    frames[cur].url = cv.toDataURL('image/png');
    renderStrip();
  }

  function renderStrip() {
    const strip = $('flipStrip');
    if (!strip) return;
    strip.innerHTML = '';
    frames.forEach((f, i) => {
      const d = document.createElement('div');
      d.className = 'flip-frame' + (i === cur ? ' on' : '');
      const c = document.createElement('canvas');
      c.width = 80; c.height = 50;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 80, 50);
      if (f.url) {
        const img = new Image();
        img.onload = () => g.drawImage(img, 0, 0, 80, 50);
        img.src = f.url;
      }
      const b = document.createElement('b'); b.textContent = i + 1;
      d.appendChild(c); d.appendChild(b);
      d.addEventListener('click', () => gotoFrame(i));
      strip.appendChild(d);
    });
  }

  function drawOnion() {
    gctx.clearRect(0, 0, W, H);
    ghost.style.opacity = (onion / 100).toString();
    const prev = frames[cur - 1];
    if (onion > 0 && prev && prev.url) {
      const img = new Image();
      img.onload = () => { gctx.clearRect(0, 0, W, H); gctx.drawImage(img, 0, 0); };
      img.src = prev.url;
    }
  }

  function gotoFrame(i, skipSave) {
    if (!skipSave) shootThumb();
    cur = Math.max(0, Math.min(i, frames.length - 1));
    paste(frames[cur].url, () => { shootThumb(); drawOnion(); renderStrip(); });
  }

  function addFrame(duplicate) {
    shootThumb();
    const f = { url: duplicate ? frames[cur].url : null };
    frames.splice(cur + 1, 0, f);
    cur++;
    gotoFrame(cur, true);
  }

  function deleteFrame() {
    if (frames.length < 2) return;
    frames.splice(cur, 1);
    cur = Math.max(0, cur - 1);
    gotoFrame(cur, true);
  }

  function setBrush(id) {
    brush = id;
    if ($('flipBrushPencil')) $('flipBrushPencil').classList.toggle('on', id === 'pencil');
    if ($('flipBrushEraser')) $('flipBrushEraser').classList.toggle('on', id === 'eraser');
  }

  function setColour(c) {
    colour = c;
    document.querySelectorAll('.flip-sw').forEach(s => s.classList.toggle('on', s.dataset.c === c));
    if ($('flipColourPick')) $('flipColourPick').value = c;
  }

  function play() {
    if (playTimer) { stopPlay(); return; }
    shootThumb();
    if (frames.length < 2) { alert('Add a second frame first.'); return; }
    if ($('flipPlayBtn')) $('flipPlayBtn').textContent = 'Stop';
    ghost.style.opacity = '0';
    let i = 0;
    const fps = +($('flipFps') ? $('flipFps').value : 8);
    playTimer = setInterval(() => {
      paste(frames[i % frames.length].url);
      i++;
    }, 1000 / fps);
  }

  function stopPlay() {
    clearInterval(playTimer); playTimer = null;
    if ($('flipPlayBtn')) $('flipPlayBtn').textContent = 'Play';
    gotoFrame(cur, true);
  }

  async function exportVideo() {
    shootThumb();
    if (frames.length < 2) { alert('Draw at least two frames first.'); return; }
    if (!window.MediaRecorder) { alert("This browser can't record video."); return; }
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const o = out.getContext('2d');
    const stream = out.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'flipbook_animation.webm';
      a.click();
    };
    const imgs = await Promise.all(frames.map(f => new Promise(res => {
      if (!f.url) return res(null);
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = f.url;
    })));
    const fps = +($('flipFps') ? $('flipFps').value : 8);
    rec.start();
    const gap = 1000 / fps;
    for (let loop = 0; loop < 2; loop++) {
      for (const im of imgs) {
        o.fillStyle = '#fff'; o.fillRect(0, 0, W, H);
        if (im) o.drawImage(im, 0, 0);
        await new Promise(r => setTimeout(r, gap));
      }
    }
    rec.stop();
  }

  function initCanvas() {
    cv = $('flipCanvas'); ctx = cv.getContext('2d', { willReadFrequently: true });
    ghost = $('flipGhost'); gctx = ghost.getContext('2d');
    cv.width = W; cv.height = H; ghost.width = W; ghost.height = H;
    wipe(ctx);

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = at(e);
      drawing = true; last = p;
      cv.setPointerCapture(e.pointerId);
      dab(p, { x: p.x + 0.01, y: p.y });
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = at(e);
      dab(last, p);
      last = p;
    });
    addEventListener('pointerup', () => { if (drawing) { drawing = false; shootThumb(); } });

    const pal = $('flipPalette');
    if (pal) {
      pal.innerHTML = PALETTE.map(c => '<span class="flip-sw" data-c="' + c + '" style="background:' + c + '"></span>').join('');
      pal.addEventListener('click', e => {
        const sw = e.target.closest('.flip-sw');
        if (sw) setColour(sw.dataset.c);
      });
    }
    if ($('flipColourPick')) $('flipColourPick').addEventListener('input', e => setColour(e.target.value));
    if ($('flipBrushPencil')) $('flipBrushPencil').addEventListener('click', () => setBrush('pencil'));
    if ($('flipBrushEraser')) $('flipBrushEraser').addEventListener('click', () => setBrush('eraser'));
    if ($('flipSize')) $('flipSize').addEventListener('input', e => {
      size = +e.target.value;
      if ($('flipSizeVal')) $('flipSizeVal').textContent = size;
    });
    if ($('flipFps')) $('flipFps').addEventListener('input', e => {
      if ($('flipFpsVal')) $('flipFpsVal').textContent = e.target.value + ' fps';
    });
    if ($('flipOnion')) $('flipOnion').addEventListener('input', e => {
      onion = +e.target.value;
      if ($('flipOnionVal')) $('flipOnionVal').textContent = onion ? onion + '%' : 'off';
      drawOnion();
    });
    if ($('flipAddBtn')) $('flipAddBtn').addEventListener('click', () => addFrame(false));
    if ($('flipDupBtn')) $('flipDupBtn').addEventListener('click', () => addFrame(true));
    if ($('flipDelBtn')) $('flipDelBtn').addEventListener('click', deleteFrame);
    if ($('flipPlayBtn')) $('flipPlayBtn').addEventListener('click', play);
    if ($('flipExportBtn')) $('flipExportBtn').addEventListener('click', exportVideo);

    setColour(PALETTE[0]);
    renderStrip();
    inited = true;
  }

  function openFlipbook() {
    const overlay = $('flipbookOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    if (!inited) initCanvas();
  }
  function closeFlipbook() {
    if (playTimer) stopPlay();
    const overlay = $('flipbookOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function init() {
    const openBtn = $('startFlipbookBtn');
    const closeBtn = $('flipbookCloseBtn');
    if (openBtn) openBtn.addEventListener('click', openFlipbook);
    if (closeBtn) closeBtn.addEventListener('click', closeFlipbook);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
