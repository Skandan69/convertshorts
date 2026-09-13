const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
try {
  const x = new XMLHttpRequest();
  x.open('GET', PDF_WORKER_URL, false);
  x.send();
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([x.responseText], { type: 'text/javascript' }));
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
}

let files = [];
let sourceKind = null;
let target = null;

const $ = id => document.getElementById(id);
const fileInput  = $('fileInput');
const dropZone   = $('dropZone');
const stage2     = $('stage2');
const fileListEl = $('fileList');
const targetGrid = $('targetGrid');
const optsBox    = $('optsBox');
const convertBtn = $('convertBtn');
const progressWrap = $('progressWrap');
const pfill        = $('pfill');
const progressLabel= $('progressLabel');
const resultsEl    = $('results');

const KINDS = {
  pdf:   { icon:'PDF' },
  image: { icon:'IMG' },
  docx:  { icon:'DOC' },
  sheet: { icon:'XLS' },
  json:  { icon:'JSN' },
  text:  { icon:'TXT' }
};

const TARGETS = {
  pdf:   [ {ext:'JPG', desc:'One image per page'},
           {ext:'PNG', desc:'Lossless, per page'},
           {ext:'DOC', desc:'Editable text'},
           {ext:'TXT', desc:'Plain text'} ],
  image: [ {ext:'JPG', desc:'Smaller file size'},
           {ext:'PNG', desc:'Lossless quality'},
           {ext:'WEBP',desc:'Modern, compact'},
           {ext:'PDF', desc:'Combine into one'} ],
  docx:  [ {ext:'PDF', desc:'Portable document'},
           {ext:'HTML',desc:'Web page'},
           {ext:'TXT', desc:'Plain text'} ],
  sheet: [ {ext:'CSV', desc:'Comma separated'},
           {ext:'XLSX',desc:'Excel workbook'},
           {ext:'TSV', desc:'Tab separated'},
           {ext:'JSON',desc:'Structured data'} ],
  json:  [ {ext:'CSV', desc:'Flat table'},
           {ext:'XLSX',desc:'Excel workbook'} ],
  text:  [ {ext:'PDF', desc:'Portable document'},
           {ext:'DOC', desc:'Word document'} ]
};

function detectKind(name) {
  const e = name.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'pdf';
  if (['jpg','jpeg','png','webp','bmp','gif','avif'].includes(e)) return 'image';
  if (['docx','doc'].includes(e)) return 'docx';
  if (['xlsx','xls','xlsm','csv','tsv'].includes(e)) return 'sheet';
  if (e === 'json') return 'json';
  if (['txt','md','log'].includes(e)) return 'text';
  return null;
}

fileInput.addEventListener('change', function () { addFiles(Array.from(this.files)); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--green)'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.style.borderColor = '';
  addFiles(Array.from(e.dataTransfer.files));
});

function addFiles(list) {
  if (!list.length) return;
  const kind = detectKind(list[0].name);
  if (!kind) { showError("That file type isn't supported yet. Try PDF, an image, Word, Excel, CSV, JSON or a text file."); stage2.classList.remove('hidden'); return; }
  if (kind === 'image' && sourceKind === 'image') {
    files = files.concat(list.filter(f => detectKind(f.name) === 'image'));
  } else {
    sourceKind = kind;
    files = kind === 'image' ? list.filter(f => detectKind(f.name) === 'image') : [list[0]];
  }
  target = null;
  convertBtn.disabled = true;
  convertBtn.textContent = 'Choose an output format';
  resultsEl.innerHTML = '';
  progressWrap.classList.add('hidden');
  stage2.classList.remove('hidden');
  renderFiles();
  renderTargets();
  renderOpts();
}

function renderFiles() {
  fileListEl.innerHTML = '';
  files.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'file-item';
    row.innerHTML =
      '<span class="ficon">' + KINDS[sourceKind].icon + '</span>' +
      '<span class="fname"></span>' +
      '<span class="fsize">' + fmtSize(f.size) + '</span>' +
      '<button class="fdel" type="button">X</button>';
    row.querySelector('.fname').textContent = f.name;
    row.querySelector('.fdel').addEventListener('click', () => {
      files.splice(i, 1);
      if (!files.length) { stage2.classList.add('hidden'); sourceKind = null; fileInput.value = ''; }
      else renderFiles();
    });
    fileListEl.appendChild(row);
  });
}

function renderTargets() {
  targetGrid.innerHTML = '';
  (TARGETS[sourceKind] || []).forEach(t => {
    const b = document.createElement('button');
    b.className = 'target-btn';
    b.type = 'button';
    b.innerHTML = '<div class="target-ext">' + t.ext + '</div><div class="target-desc">' + t.desc + '</div>';
    b.addEventListener('click', () => {
      target = t.ext.toLowerCase();
      Array.from(targetGrid.children).forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      convertBtn.disabled = false;
      convertBtn.textContent = 'Convert to ' + t.ext;
      renderOpts();
      resultsEl.innerHTML = '';
    });
    targetGrid.appendChild(b);
  });
}

function renderOpts() {
  optsBox.innerHTML = '';
  let html = '';
  if (sourceKind === 'pdf' && (target === 'jpg' || target === 'png')) {
    html = '<div class="opt-row"><label>Quality</label>' +
      '<input type="range" id="optScale" min="1" max="4" value="2" step="1">' +
      '<output id="optScaleOut">HD</output></div>';
  } else if (sourceKind === 'image' && target === 'pdf') {
    html = '<div class="opt-row"><label>Page size</label><select id="optPage">' +
      '<option value="a4">A4</option><option value="letter">Letter</option>' +
      '<option value="fit">Fit to image</option></select></div>' +
      '<div class="opt-row"><label>Orientation</label><select id="optOrient">' +
      '<option value="auto">Auto</option><option value="p">Portrait</option>' +
      '<option value="l">Landscape</option></select></div>';
  } else if (sourceKind === 'image' && (target === 'jpg' || target === 'webp')) {
    html = '<div class="opt-row"><label>Quality</label>' +
      '<input type="range" id="optQ" min="50" max="100" value="92" step="1">' +
      '<output id="optQOut">92%</output></div>';
  }
  if (!html) { optsBox.classList.add('hidden'); return; }
  optsBox.innerHTML = html;
  optsBox.classList.remove('hidden');
  const s = $('optScale');
  if (s) s.addEventListener('input', function () {
    $('optScaleOut').textContent = ['Low','SD','HD','4K'][this.value - 1];
  });
  const q = $('optQ');
  if (q) q.addEventListener('input', function () { $('optQOut').textContent = this.value + '%'; });
}

convertBtn.addEventListener('click', async () => {
  if (!files.length || !target) return;
  convertBtn.disabled = true;
  resultsEl.innerHTML = '';
  progressWrap.classList.remove('hidden');
  pfill.style.width = '0%';
  try {
    if (sourceKind === 'pdf' && (target === 'jpg' || target === 'png')) await pdfToImages();
    else if (sourceKind === 'pdf' && (target === 'doc' || target === 'txt')) await pdfToText();
    else if (sourceKind === 'image' && target === 'pdf') await imagesToPdf();
    else if (sourceKind === 'image') await imageToImage();
    else if (sourceKind === 'docx') await docxTo();
    else if (sourceKind === 'sheet' || sourceKind === 'json') await sheetTo();
    else if (sourceKind === 'text') await textTo();
  } catch (err) {
    progressLabel.textContent = '';
    showError(err.message || 'Something went wrong during conversion.');
    console.error(err);
  }
  convertBtn.disabled = false;
});

async function pdfToImages() {
  progressLabel.textContent = 'Reading PDF...';
  const pdf = await pdfjsLib.getDocument({ data: await files[0].arrayBuffer() }).promise;
  const scale = [1, 1.5, 2.5, 4][($('optScale') ? $('optScale').value : 2) - 1];
  const mime = target === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext  = target === 'jpg' ? 'jpg' : 'png';
  const base = files[0].name.replace(/\.pdf$/i, '');
  const grid = document.createElement('div');
  grid.className = 'preview-grid';
  for (let p = 1; p <= pdf.numPages; p++) {
    progressLabel.textContent = 'Rendering page ' + p + ' of ' + pdf.numPages + '...';
    pfill.style.width = Math.round((p / pdf.numPages) * 100) + '%';
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const url = c.toDataURL(mime, 0.95);
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = '<img src="' + url + '"><div class="plabel">Page ' + p + '</div>' +
      '<a href="' + url + '" download="' + base + '_page' + p + '.' + ext + '">Download</a>';
    grid.appendChild(item);
  }
  showOk(pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : '') + ' converted to ' + ext.toUpperCase(),
         'Click Download under each page below.');
  resultsEl.appendChild(grid);
  done();
}

async function pdfToText() {
  progressLabel.textContent = 'Extracting text...';
  const pdf = await pdfjsLib.getDocument({ data: await files[0].arrayBuffer() }).promise;
  const paras = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    progressLabel.textContent = 'Reading page ' + p + ' of ' + pdf.numPages + '...';
    pfill.style.width = Math.round((p / pdf.numPages) * 100) + '%';
    const tc = await (await pdf.getPage(p)).getTextContent();
    let lastY = null, line = '';
    tc.items.forEach(it => {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { if (line.trim()) paras.push(line.trim()); line = ''; }
      line += it.str + ' ';
      lastY = y;
    });
    if (line.trim()) paras.push(line.trim());
    if (p < pdf.numPages) paras.push('');
  }
  const base = files[0].name.replace(/\.pdf$/i, '');
  if (target === 'txt') {
    save(new Blob([paras.join('\n')], { type: 'text/plain;charset=utf-8' }), base + '.txt');
    showOk('Text extracted from ' + pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : ''), 'Your .txt file is downloading.');
  } else {
    const body = paras.map(t => t ? '<p>' + esc(t) + '</p>' : '<p>&nbsp;</p>').join('');
    const html = '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>' + body + '</body></html>';
    save(new Blob(['\ufeff', html], { type: 'application/msword' }), base + '.doc');
    showOk('Text extracted from ' + pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : ''),
           'Opens in Word, Google Docs or LibreOffice.<br><br><strong>Note:</strong> only text is carried over - images, tables and original layout are not preserved.');
  }
  done();
}

async function imagesToPdf() {
  const jsPDF = window.jspdf.jsPDF;
  const size   = $('optPage')   ? $('optPage').value   : 'a4';
  const orient = $('optOrient') ? $('optOrient').value : 'auto';
  let doc = null;
  for (let i = 0; i < files.length; i++) {
    progressLabel.textContent = 'Adding image ' + (i + 1) + ' of ' + files.length + '...';
    pfill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
    const dataUrl = await asDataURL(files[i]);
    const img = await loadImg(dataUrl);
    const o = orient === 'auto' ? (img.width > img.height ? 'l' : 'p') : orient;
    if (size === 'fit') {
      const w = img.width * 0.264583, h = img.height * 0.264583;
      if (!doc) doc = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'mm', format: [w, h] });
      else doc.addPage([w, h], w > h ? 'l' : 'p');
      doc.addImage(dataUrl, 0, 0, w, h);
    } else {
      if (!doc) doc = new jsPDF({ orientation: o, unit: 'mm', format: size });
      else doc.addPage(size, o);
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const r = Math.min(pw / img.width, ph / img.height);
      const w = img.width * r, h = img.height * r;
      doc.addImage(dataUrl, (pw - w) / 2, (ph - h) / 2, w, h);
    }
  }
  save(doc.output('blob'), files.length > 1 ? 'combined.pdf' : files[0].name.replace(/\.[^.]+$/, '') + '.pdf');
  showOk('PDF created from ' + files.length + ' image' + (files.length > 1 ? 's' : ''), 'Your PDF is downloading.');
  done();
}

async function imageToImage() {
  const mime = target === 'jpg' ? 'image/jpeg' : target === 'webp' ? 'image/webp' : 'image/png';
  const q = $('optQ') ? $('optQ').value / 100 : 0.92;
  const grid = document.createElement('div');
  grid.className = 'preview-grid';
  for (let i = 0; i < files.length; i++) {
    progressLabel.textContent = 'Converting ' + (i + 1) + ' of ' + files.length + '...';
    pfill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
    const img = await loadImg(await asDataURL(files[i]));
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    if (target === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0);
    const url = c.toDataURL(mime, q);
    const name = files[i].name.replace(/\.[^.]+$/, '') + '.' + target;
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = '<img src="' + url + '"><div class="plabel">' + img.width + 'x' + img.height + '</div>' +
      '<a href="' + url + '" download="' + name + '">Download</a>';
    grid.appendChild(item);
  }
  showOk(files.length + ' image' + (files.length > 1 ? 's' : '') + ' converted to ' + target.toUpperCase(),
         'Click Download under each image below.');
  resultsEl.appendChild(grid);
  done();
}

async function docxTo() {
  progressLabel.textContent = 'Reading document...';
  pfill.style.width = '40%';
  const buf = await files[0].arrayBuffer();
  const base = files[0].name.replace(/\.docx?$/i, '');
  if (target === 'txt') {
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    save(new Blob([r.value], { type: 'text/plain;charset=utf-8' }), base + '.txt');
    showOk('Text extracted', 'Your .txt file is downloading.'); return done();
  }
  const r = await mammoth.convertToHtml({ arrayBuffer: buf });
  if (target === 'html') {
    const page = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(base) +
      '</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.7;}</style></head><body>' +
      r.value + '</body></html>';
    save(new Blob([page], { type: 'text/html;charset=utf-8' }), base + '.html');
    showOk('HTML created', 'Your .html file is downloading.'); return done();
  }
  progressLabel.textContent = 'Building PDF...';
  pfill.style.width = '70%';
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const holder = document.createElement('div');
  holder.style.cssText = 'width:515px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#000;';
  holder.innerHTML = r.value;
  await doc.html(holder, { x: 40, y: 40, width: 515, windowWidth: 515, autoPaging: 'text' });
  save(doc.output('blob'), base + '.pdf');
  showOk('PDF created', 'Your PDF is downloading.<br><br><strong>Note:</strong> basic text formatting is preserved. Complex layouts, headers and embedded objects may shift.');
  done();
}

async function sheetTo() {
  progressLabel.textContent = 'Reading data...';
  pfill.style.width = '40%';
  const base = files[0].name.replace(/\.[^.]+$/, '');
  let wb;
  if (sourceKind === 'json') {
    const rows = JSON.parse(await files[0].text());
    const arr = Array.isArray(rows) ? rows : [rows];
    wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arr), 'Sheet1');
  } else {
    wb = XLSX.read(await files[0].arrayBuffer(), { type: 'array' });
  }
  const first = wb.SheetNames[0];
  const ws = wb.Sheets[first];
  pfill.style.width = '80%';
  if (target === 'csv' || target === 'tsv') {
    const sep = target === 'tsv' ? '\t' : ',';
    const out = XLSX.utils.sheet_to_csv(ws, { FS: sep });
    save(new Blob(['\ufeff', out], { type: 'text/plain;charset=utf-8' }), base + '.' + target);
    showOk(target.toUpperCase() + ' created', 'Exported sheet "' + first + '". Your file is downloading.');
  } else if (target === 'json') {
    const out = JSON.stringify(XLSX.utils.sheet_to_json(ws), null, 2);
    save(new Blob([out], { type: 'application/json;charset=utf-8' }), base + '.json');
    showOk('JSON created', 'Exported sheet "' + first + '". Your file is downloading.');
  } else if (target === 'xlsx') {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), base + '.xlsx');
    showOk('Excel file created', 'Your .xlsx file is downloading.');
  }
  done();
}

async function textTo() {
  progressLabel.textContent = 'Converting...';
  pfill.style.width = '50%';
  const txt = await files[0].text();
  const base = files[0].name.replace(/\.[^.]+$/, '');
  if (target === 'doc') {
    const body = txt.split(/\r?\n/).map(l => l.trim() ? '<p>' + esc(l) + '</p>' : '<p>&nbsp;</p>').join('');
    const html = '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>' + body + '</body></html>';
    save(new Blob(['\ufeff', html], { type: 'application/msword' }), base + '.doc');
    showOk('Word document created', 'Your .doc file is downloading.');
  } else {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica'); doc.setFontSize(11);
    const lines = doc.splitTextToSize(txt, 515);
    let y = 50;
    lines.forEach(l => {
      if (y > 790) { doc.addPage(); y = 50; }
      doc.text(l, 40, y); y += 15;
    });
    save(doc.output('blob'), base + '.pdf');
    showOk('PDF created', 'Your PDF is downloading.');
  }
  done();
}

function done() { pfill.style.width = '100%'; progressLabel.textContent = 'Done!'; }

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}

function showOk(title, body) {
  const d = document.createElement('div');
  d.className = 'result-box';
  d.innerHTML = '<div class="result-title">' + title + '</div><div class="result-body">' + body + '</div>';
  resultsEl.appendChild(d);
}

function showError(msg) {
  resultsEl.innerHTML = '<div class="result-box err"><div class="result-title">Conversion failed</div><div class="result-body"></div></div>';
  resultsEl.querySelector('.result-body').textContent = msg;
}

function asDataURL(file) {
  return new Promise(function (res, rej) {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function loadImg(src) {
  return new Promise(function (res, rej) {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not read that image.'));
    i.src = src;
  });
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function fmtSize(b) {
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1e3)) + ' KB';
}

document.querySelectorAll('.faq-q').forEach(function (btn) {
  btn.addEventListener('click', function () { btn.nextElementSibling.classList.toggle('open'); });
});
