import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {APPS} from '../apps/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lock=JSON.parse(await fs.readFile(path.join(root,'apps/engine-lock.json'),'utf8'));
const require=createRequire(import.meta.url);
const Zip=require('../studio/vendor/jszip.min.js');
assert.equal(APPS.length,7);
assert.equal(lock.length,6);
const cache=process.env.CREATIVE_APPS_CACHE || path.join(root,'.creative-cache');
for(const engine of lock){
  const archive=await fs.readFile(path.join(cache,engine.name));
  assert.equal(createHash('sha256').update(archive).digest('hex'),engine.sha256);
  const zip=await Zip.loadAsync(archive);
  const base=path.join(root,'apps/engines',engine.id);
  const prefix=`${engine.id}-web-${engine.version}/`;
  let wasmCount=0;
  for(const file of Object.values(zip.files)){
    const relative=file.name.slice(prefix.length);
    if(file.dir||!file.name.startsWith(prefix)||!file.name.endsWith('.wasm'))continue;
    const installed=await fs.readFile(path.join(base,relative));
    assert.equal(createHash('sha256').update(installed).digest('hex'),createHash('sha256').update(await file.async('nodebuffer')).digest('hex'));
    assert.equal(WebAssembly.validate(installed),true,engine.id+' wasm invalid');
    assert.ok(installed.byteLength<100*1024*1024,'Static file exceeds 100 MiB');
    wasmCount++;
  }
  assert.equal(wasmCount,1,engine.id);
  const html=await fs.readFile(path.join(base,'index.html'),'utf8');
  for(const match of html.matchAll(/(?:from\s+|module_or_path:\s*)['"]\.\/([^'"]+)['"]/g)) await fs.access(path.join(base,match[1]));
  for(const file of ['LICENSE-MIT','LICENSE-APACHE','notices/NOTICE','notices/attribution.txt']) await fs.access(path.join(base,file));
  for(const folder of ['build','deps']) await assert.rejects(fs.access(path.join(base,folder)));
  console.log(`PASS ${engine.id}: release checksum, unmodified valid WASM, runtime links and licenses`);
}
for(const app of APPS){
  const page=await fs.readFile(path.join(root,'apps',app.id,'index.html'),'utf8');
  assert.ok(page.includes(`data-app="${app.id}"`));
  assert.ok(page.includes('id="open-editor"'));
  assert.ok(page.includes('/apps/workspace.js'));
  await fs.access(path.join(root,'dist/apps',app.id,'index.html'));
}
for(const file of ['index.html','app.js','video-editor.html','image-tools.html','pdf-tools.html','qr-code.html','studio/app.js','canvas/index.html']) await fs.access(path.join(root,'dist',file));
const cfg=JSON.parse(await fs.readFile(path.join(root,'vercel.json'),'utf8'));
assert.equal(cfg.outputDirectory,'dist');
for(const privateDirectory of ['api','server']) await assert.rejects(fs.access(path.join(root,'dist',privateDirectory)),'Server source must not be public');
for(const file of ['build/three.module.js','build/three.core.js','examples/jsm/controls/OrbitControls.js','examples/jsm/controls/TransformControls.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/exporters/GLTFExporter.js','LICENSE'])await fs.access(path.join(root,'dist/apps/studio/vendor/three',file));
assert.ok(cfg.rewrites.some(r=>r.source==='/apps/engines/:engine/editor'&&r.destination==='/apps/engines/:engine'));
if(cfg.cleanUrls) assert.ok(cfg.rewrites.every(r=>!r.source.endsWith('.html')&&!r.destination.endsWith('.html')),'cleanUrls requires extensionless rewrite paths');
assert.ok(cfg.headers.some(h=>h.source==='/apps/:path*'&&h.headers.some(v=>v.key==='Cross-Origin-Embedder-Policy'&&v.value==='require-corp')));
console.log('PASS seven studio routes, preserved tools and hosting configuration');
