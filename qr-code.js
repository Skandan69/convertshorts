(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const canvas = $('#qrCanvas');
  const photoCanvas = $('#photoCanvas');
  const context = canvas.getContext('2d');
  const photoContext = photoCanvas.getContext('2d');

  const state = {
    mode: 'url',
    pattern: 'square',
    photoStyle: 'card',
    payload: 'https://convertshorts.com/',
    destination: 'https://convertshorts.com/',
    logo: null,
    logoData: '',
    photo: null,
    photoData: '',
    qrPosition: { x: 1, y: 1 },
    dragging: false,
    fun: ''
  };

  const panels = {
    url: $('#urlPanel'), payment: $('#paymentPanel'), logo: $('#logoPanel'),
    photo: $('#photoPanel'), fun: $('#funPanel')
  };

  function normaliseUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) return 'https://convertshorts.com/';
    try { return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).href; }
    catch { return trimmed; }
  }

  function makeQr(payload) {
    if (typeof qrcode !== 'function') throw new Error('QR library unavailable');
    let qr;
    try { qr = qrcode(0, 'H'); qr.addData(payload); qr.make(); }
    catch { qr = qrcode(0, 'Q'); qr.addData(payload); qr.make(); }
    return qr;
  }

  function isFinder(row, col, count) {
    return (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);
  }

  function drawTile(ctx, x, y, size, style, colour) {
    ctx.fillStyle = colour;
    if (style === 'dots') {
      ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size * .42, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'rounded') {
      const radius = size * .32;
      ctx.beginPath(); ctx.roundRect(x + size * .04, y + size * .04, size * .92, size * .92, radius); ctx.fill();
    } else ctx.fillRect(x, y, size + .35, size + .35);
  }

  function qrGeometry(qr, size) {
    const quiet = 4;
    const count = qr.getModuleCount();
    const cell = size / (count + quiet * 2);
    return { quiet, count, cell };
  }

  function drawQr(ctx, qr, size, options = {}) {
    const background = options.background || $('#backgroundColour').value;
    const primary = options.primary || $('#qrColour').value;
    const corner = options.corner || $('#cornerColour').value;
    const pattern = options.pattern || state.pattern;
    const { quiet, count, cell } = qrGeometry(qr, size);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!qr.isDark(row, col)) continue;
        const x = (col + quiet) * cell;
        const y = (row + quiet) * cell;
        const finder = isFinder(row, col, count);
        drawTile(ctx, x, y, cell, finder ? 'rounded' : pattern, finder ? corner : primary);
      }
    }
    return { quiet, count, cell };
  }

  function coverImage(ctx, image, size) {
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  }

  function drawLogo(ctx, size) {
    if (!state.logo) return;
    const box = size * .22;
    const x = (size - box) / 2;
    const y = (size - box) / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(x, y, box, box, box * .16); ctx.fill();
    const padding = box * .17;
    const max = box - padding * 2;
    const scale = Math.min(max / state.logo.naturalWidth, max / state.logo.naturalHeight);
    const width = state.logo.naturalWidth * scale;
    const height = state.logo.naturalHeight * scale;
    ctx.drawImage(state.logo, x + (box - width) / 2, y + (box - height) / 2, width, height);
  }

  function drawPhotoCard(qr) {
    const size = photoCanvas.width;
    photoContext.clearRect(0, 0, size, size);
    coverImage(photoContext, state.photo, size);
    const shade = photoContext.createLinearGradient(0, size * .55, 0, size);
    shade.addColorStop(0, 'rgba(20,8,38,0)'); shade.addColorStop(1, 'rgba(20,8,38,.28)');
    photoContext.fillStyle = shade; photoContext.fillRect(0, 0, size, size);

    const percent = Number($('#qrSize').value) / 100;
    const panel = size * percent;
    const margin = size * .035;
    const travel = size - panel - margin * 2;
    const x = margin + travel * state.qrPosition.x;
    const y = margin + travel * state.qrPosition.y;
    photoContext.fillStyle = 'rgba(255,255,255,.97)';
    photoContext.beginPath(); photoContext.roundRect(x, y, panel, panel, panel * .09); photoContext.fill();
    const qrTemp = document.createElement('canvas');
    qrTemp.width = qrTemp.height = 700;
    drawQr(qrTemp.getContext('2d'), qr, 700, { background: '#ffffff' });
    const pad = panel * .055;
    photoContext.drawImage(qrTemp, x + pad, y + pad, panel - pad * 2, panel - pad * 2);
    photoCanvas.dataset.qrBox = [x, y, panel].join(',');
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return { r: parseInt(value.slice(0,2),16), g: parseInt(value.slice(2,4),16), b: parseInt(value.slice(4,6),16) };
  }

  
function hiResQr(payload, minVersion){
  for(var v=minVersion; v<=20; v++){
    try{ var q=qrcode(v,"H"); q.addData(payload); q.make(); return q; }catch(e){}
  }
  var f=qrcode(0,"H"); f.addData(payload); f.make(); return f;
}

function drawPhotoInside(qr){
  var canvas=photoCanvas, ctx=photoContext, size=canvas.width;
  var detailEl=document.getElementById("photoDetail");
  var detail=detailEl?parseInt(detailEl.value,10):10;
  try{ qr = hiResQr(state.payload, detail); }catch(e){}
  var geo=qrGeometry(qr,size);
  var quiet=geo.quiet, count=geo.count, cell=geo.cell;
  var bgEl=document.getElementById("backgroundColour");
  var fgEl=document.getElementById("qrColour");
  var cornerEl=document.getElementById("cornerColour");
  var bg=bgEl?bgEl.value:"#ffffff", fg=fgEl?fgEl.value:"#000000";
  ctx.fillStyle=bg; ctx.fillRect(0,0,size,size);
  var img=state.photo;
  if(!img){ drawQr(ctx,qr,size,{}); return; }

  var sub=3, N=count*sub;
  var tmp=document.createElement("canvas"); tmp.width=N; tmp.height=N;
  var tctx=tmp.getContext("2d");
  var s=Math.min(img.width,img.height);
  tctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,N,N);
  var px=tctx.getImageData(0,0,N,N).data;

  var grey=new Float32Array(N*N), lo=255, hi=0, i;
  for(i=0;i<N*N;i++){
    var v=px[i*4]*0.299+px[i*4+1]*0.587+px[i*4+2]*0.114;
    grey[i]=v; if(v<lo)lo=v; if(v>hi)hi=v;
  }
  var span=Math.max(hi-lo,1);
  for(i=0;i<N*N;i++){
    var n=(grey[i]-lo)/span;
    grey[i]=Math.min(255,Math.max(0,n*255));
  }

  // soften sensor noise and fine texture so they do not become dither speckle
  var blur=new Float32Array(N*N);
  for(var by=0;by<N;by++){
    for(var bx=0;bx<N;bx++){
      var sum=0,cnt=0;
      for(var dy=-1;dy<=1;dy++){
        for(var dx=-1;dx<=1;dx++){
          var nx=bx+dx, ny=by+dy;
          if(nx<0||ny<0||nx>=N||ny>=N) continue;
          sum+=grey[ny*N+nx]; cnt++;
        }
      }
      blur[by*N+bx]=sum/cnt;
    }
  }

  // unsharp mask: push facial edges apart, then a contrast curve
  var strengthEl=document.getElementById("photoContrast");
  var amt=strengthEl?parseInt(strengthEl.value,10)/100:1.2;
  for(i=0;i<N*N;i++){
    var sharp=grey[i]+(grey[i]-blur[i])*1.1;
    var t=(sharp-128)/128;
    t=Math.tanh(t*amt);
    grey[i]=Math.min(255,Math.max(0,128+t*128));
  }

  function forced(gx,gy){ return (gx%sub===1)&&(gy%sub===1); }
  var outDark=new Uint8Array(N*N);
  for(var y=0;y<N;y++){
    for(var x=0;x<N;x++){
      var idx=y*N+x, old=grey[idx], dark;
      if(forced(x,y)) dark = qr.isDark(Math.floor(y/sub), Math.floor(x/sub));
      else dark = old < 128;
      outDark[idx]=dark?1:0;
      var err=old-(dark?0:255);
      if(x+1<N && !forced(x+1,y)) grey[idx+1] += err*7/16;
      if(y+1<N){
        if(x>0 && !forced(x-1,y+1))   grey[idx+N-1] += err*3/16;
        if(!forced(x,y+1))            grey[idx+N]   += err*5/16;
        if(x+1<N && !forced(x+1,y+1)) grey[idx+N+1] += err*1/16;
      }
    }
  }

  var sc=cell/sub;
  for(var r=0;r<count;r++){
    for(var c=0;c<count;c++){
      var bx=quiet+c*cell, by=quiet+r*cell;
      if(isFinder(r,c,count)){
        ctx.fillStyle=qr.isDark(r,c)?(cornerEl?cornerEl.value:fg):bg;
        ctx.fillRect(bx,by,cell,cell);
        continue;
      }
      var want=qr.isDark(r,c), darkCount=0;
      for(var sy=0;sy<sub;sy++){
        for(var sx=0;sx<sub;sx++){
          if(outDark[(r*sub+sy)*N + (c*sub+sx)]) darkCount++;
        }
      }
      // keep the module average on the correct side of mid-grey
      // leave the photo as much freedom as the bigger centre dot allows
      if(want && darkCount<1){
        var fi0=(r*sub+1)*N+(c*sub+0); outDark[fi0]=1; darkCount++;
      } else if(!want && darkCount>8){
        var gi0=(r*sub+1)*N+(c*sub+0); outDark[gi0]=0; darkCount--;
      }
      for(var sy=0;sy<sub;sy++){
        for(var sx=0;sx<sub;sx++){
          ctx.fillStyle = outDark[(r*sub+sy)*N + (c*sub+sx)] ? fg : bg;
          ctx.fillRect(bx+sx*sc, by+sy*sc, sc+0.5, sc+0.5);
        }
      }
      // centre dot sized so a blurred camera still reads the right polarity
      ctx.fillStyle = want ? fg : bg;
      ctx.beginPath();
      ctx.arc(bx+cell/2, by+cell/2, cell*0.38, 0, Math.PI*2);
      ctx.fill();
    }
  }
}
function drawFaceMosaic(qr) {
    const size = photoCanvas.width;
    const { quiet, count, cell } = qrGeometry(qr, size);
    const sample = document.createElement('canvas');
    sample.width = sample.height = count;
    const sampleContext = sample.getContext('2d', { willReadFrequently: true });
    coverImage(sampleContext, state.photo, count);
    const pixels = sampleContext.getImageData(0, 0, count, count).data;
    const rgb = hexToRgb($('#qrColour').value);
    const corner = $('#cornerColour').value;
    const visibility = (Number($('#qrSize').value) - 26) / 20;
    photoContext.clearRect(0, 0, size, size);
    photoContext.fillStyle = '#fff'; photoContext.fillRect(0, 0, size, size);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const index = (row * count + col) * 4;
        const lum = (.299 * pixels[index] + .587 * pixels[index + 1] + .114 * pixels[index + 2]) / 255;
        const x = (col + quiet) * cell;
        const y = (row + quiet) * cell;
        const dark = qr.isDark(row, col);
        const finder = isFinder(row, col, count);
        if (dark) {
          const multiplier = finder ? 1 : .23 + lum * (.48 - visibility * .08);
          const colour = finder ? corner : `rgb(${Math.round(rgb.r * multiplier)},${Math.round(rgb.g * multiplier)},${Math.round(rgb.b * multiplier)})`;
          drawTile(photoContext, x, y, cell, finder ? 'rounded' : state.pattern, colour);
        } else if (!finder && visibility > .1) {
          const strength = (.05 + (1 - lum) * .13) * visibility;
          const r = Math.round(255 - (255 - rgb.r) * strength);
          const g = Math.round(255 - (255 - rgb.g) * strength);
          const b = Math.round(255 - (255 - rgb.b) * strength);
          photoContext.fillStyle = `rgb(${r},${g},${b})`;
          photoContext.fillRect(x, y, cell + .2, cell + .2);
        }
      }
    }
  }

  function render() {
    try {
      const qr = makeQr(state.payload);
      const photoActive = state.mode === 'photo' && state.photo;
      canvas.classList.toggle('hidden', !!photoActive);
      photoCanvas.classList.toggle('hidden', !photoActive);
      $('#qrStage').classList.toggle('photo-active', !!photoActive && state.photoStyle === 'card');
      if (photoActive) {
        if (state.photoStyle === 'inside') drawPhotoInside(qr);
    else if (state.photoStyle === 'mosaic') drawFaceMosaic(qr); else drawPhotoCard(qr);
      } else {
        drawQr(context, qr, canvas.width);
        if (state.mode === 'logo') drawLogo(context, canvas.width);
      }
      $('#destination').textContent = state.destination;
      $('#previewMessage').textContent = $('#frameMessage').value.trim() || (state.mode === 'payment' ? 'Scan to pay' : 'Scan to open');
      const status = $('#scanStatus');
      status.className = 'scan-status safe';
      status.innerHTML = state.mode === 'payment'
        ? '<span>✓</span><strong>UPI QR ready · payer confirms recipient in their app</strong>'
        : state.photoStyle === 'mosaic' && state.mode === 'photo'
          ? '<span>✓</span><strong>Face mosaic ready · scan-test before printing</strong>'
          : '<span>✓</span><strong>QR ready · test once before printing</strong>';
    } catch (error) {
      $('#scanStatus').className = 'scan-status warning';
      $('#scanStatus').innerHTML = '<span>!</span><strong>Could not create this QR. Shorten the content and try again.</strong>';
    }
  }

  function setMode(mode) {
    state.mode = mode;
    $$('.mode-tab').forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    Object.entries(panels).forEach(([name, panel]) => panel.classList.toggle('hidden', name !== mode));
    $('#previewType').textContent = mode === 'payment' ? 'UPI' : mode.toUpperCase();
    $('#previewHeading').textContent = mode === 'payment' ? 'Ready to receive' : mode === 'photo' ? 'Make the memory scannable' : 'Ready for the camera';
    if (mode === 'payment') {
      $('#frameMessage').value = 'Scan to pay';
    } else if ($('#frameMessage').value === 'Scan to pay') $('#frameMessage').value = 'Scan to open';
    if (mode === 'url') generateUrl();
    if (mode === 'fun') generateFun();
    render();
  }

  function generateUrl() {
    state.payload = normaliseUrl($('#websiteUrl').value);
    state.destination = state.payload;
    render();
  }

  function generateFun() {
    state.payload = normaliseUrl($('#funUrl').value);
    state.destination = state.fun ? `${state.fun} · ${state.payload}` : state.payload;
    render();
  }

  function generatePayment() {
    const payee = $('#payeeName').value.trim();
    const upi = $('#upiId').value.trim();
    const amountValue = $('#upiAmount').value.trim();
    const note = $('#upiNote').value.trim();
    const validUpi = /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(upi);
    if (!payee || !validUpi) {
      $('#upiError').textContent = !payee ? 'Enter the recipient name.' : 'Enter a valid UPI ID, such as name@bank.';
      return;
    }
    const amount = amountValue ? Number(amountValue) : null;
    if (amountValue && (!Number.isFinite(amount) || amount <= 0 || amount > 100000)) {
      $('#upiError').textContent = 'Enter an amount between ₹1 and ₹1,00,000, or leave it blank.';
      return;
    }
    $('#upiError').textContent = '';
    const params = new URLSearchParams({ pa: upi, pn: payee, cu: 'INR' });
    if (amount) params.set('am', amount.toFixed(2));
    if (note) params.set('tn', note);
    state.payload = `upi://pay?${params.toString()}`;
    state.destination = amount ? `${upi} · ₹${amount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}` : `${upi} · payer enters amount`;
    $('#frameMessage').value = 'Scan to pay';
    render();
  }

  function loadImage(file, type) {
    if (!file || file.size > 8 * 1024 * 1024) {
      alert('Please choose an image smaller than 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (type === 'logo') { state.logo = image; state.logoData = reader.result; }
        else { state.photo = image; state.photoData = reader.result; $('#photoControls').classList.remove('hidden'); }
        render();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setQrPosition(x, y) {
    state.qrPosition = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    const exact = `${state.qrPosition.x},${state.qrPosition.y}`;
    $$('.position-buttons button').forEach(button => button.classList.toggle('active', button.dataset.position === exact));
    render();
  }

  function positionFromPointer(event) {
    if (!(state.mode === 'photo' && state.photo && state.photoStyle === 'card')) return;
    const rect = photoCanvas.getBoundingClientRect();
    const percent = Number($('#qrSize').value) / 100;
    const margin = .035;
    const travel = 1 - percent - margin * 2;
    const x = ((event.clientX - rect.left) / rect.width - margin - percent / 2) / travel;
    const y = ((event.clientY - rect.top) / rect.height - margin - percent / 2) / travel;
    setQrPosition(x, y);
  }

  function svgForCurrent() {
    if ((state.mode === 'photo' && state.photo) || (state.mode === 'logo' && state.logo)) {
      const source = state.mode === 'photo' ? photoCanvas : canvas;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 900 900"><image width="900" height="900" href="${source.toDataURL('image/png')}"/></svg>`;
    }
    const qr = makeQr(state.payload);
    const size = 900;
    const primary = $('#qrColour').value;
    const corner = $('#cornerColour').value;
    const background = $('#backgroundColour').value;
    const { quiet, count, cell } = qrGeometry(qr, size);
    const shapes = [`<rect width="900" height="900" fill="${background}"/>`];
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      const x = (col + quiet) * cell, y = (row + quiet) * cell;
      const colour = isFinder(row, col, count) ? corner : primary;
      if (state.pattern === 'dots' && !isFinder(row, col, count)) shapes.push(`<circle cx="${x + cell/2}" cy="${y + cell/2}" r="${cell*.42}" fill="${colour}"/>`);
      else shapes.push(`<rect x="${x}" y="${y}" width="${cell+.35}" height="${cell+.35}" rx="${state.pattern === 'rounded' ? cell*.28 : 0}" fill="${colour}"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">${shapes.join('')}</svg>`;
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $$('.mode-tab').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#generateUrl').addEventListener('click', generateUrl);
  $('#websiteUrl').addEventListener('keydown', event => { if (event.key === 'Enter') generateUrl(); });
  $('#generateFun').addEventListener('click', generateFun);
  $('#generatePayment').addEventListener('click', generatePayment);
  $('#logoInput').addEventListener('change', event => loadImage(event.target.files[0], 'logo'));
  $('#photoInput').addEventListener('change', event => loadImage(event.target.files[0], 'photo'));
  $$('.choice-row button').forEach(button => button.addEventListener('click', () => {
    state.pattern = button.dataset.pattern;
    $$('.choice-row button').forEach(item => item.classList.toggle('active', item === button));
    render();
  }));
  $$('.photo-style button').forEach(button => button.addEventListener('click', () => {
    state.photoStyle = button.dataset.photoStyle;
    $$('.photo-style button').forEach(item => item.classList.toggle('active', item === button));
    $('.range-row label').textContent = state.photoStyle === 'mosaic' ? 'Face visibility' : 'QR size';
    render();
  }));
  $$('.position-buttons button').forEach(button => button.addEventListener('click', () => {
    const [x,y] = button.dataset.position.split(',').map(Number); setQrPosition(x,y);
  }));
  $$('.fun-presets button').forEach(button => button.addEventListener('click', () => {
    state.fun = button.dataset.fun;
    $$('.fun-presets button').forEach(item => item.classList.toggle('active', item === button));
    const messages = { party:'Scan for the party', love:'Made with love', wedding:'Scan our story', birthday:'Birthday surprise' };
    $('#frameMessage').value = messages[state.fun];
    generateFun();
  }));
  ['qrColour','cornerColour','backgroundColour'].forEach(id => $('#' + id).addEventListener('input', event => {
    event.target.nextElementSibling.textContent = event.target.value.toUpperCase(); render();
  }));
  $('#frameMessage').addEventListener('input', render);
  $('#qrSize').addEventListener('input', event => { $('#qrSizeValue').textContent = `${event.target.value}%`; render(); });
  photoCanvas.addEventListener('pointerdown', event => { state.dragging = true; photoCanvas.setPointerCapture(event.pointerId); positionFromPointer(event); });
  photoCanvas.addEventListener('pointermove', event => { if (state.dragging) positionFromPointer(event); });
  photoCanvas.addEventListener('pointerup', () => { state.dragging = false; });
  photoCanvas.addEventListener('pointercancel', () => { state.dragging = false; });
  $('#downloadPng').addEventListener('click', () => {
    const source = state.mode === 'photo' && state.photo ? photoCanvas : canvas;
    source.toBlob(blob => download(state.mode === 'payment' ? 'upi-payment-qr.png' : 'convertshorts-qr.png', blob), 'image/png');
  });
  $('#downloadSvg').addEventListener('click', () => download(state.mode === 'payment' ? 'upi-payment-qr.svg' : 'convertshorts-qr.svg', new Blob([svgForCurrent()], { type:'image/svg+xml' })));

  render();
})();
