import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';

// Pinned upstream distributions, kept outside Git. Never download or run executables.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const JSZip = require('../studio/vendor/jszip.min.js');
const engines = JSON.parse(await fs.readFile(path.join(root, 'apps/engine-lock.json'), 'utf8'));
const cache = process.env.CREATIVE_APPS_CACHE || path.join(root, '.creative-cache');
await fs.mkdir(cache, { recursive: true });

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

for (const engine of engines) {
  const archive = path.join(cache, engine.name);
  let bytes;
  let downloaded = false;
  try { bytes = await fs.readFile(archive); } catch { bytes = await download(engine.url); downloaded = true; }
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (checksum !== engine.sha256) throw new Error(`Checksum mismatch for ${engine.id}; build stopped.`);
  if (downloaded) {
    const pending = archive + '.' + process.pid + '.pending';
    await fs.writeFile(pending, bytes);
    await fs.rename(pending, archive);
  }
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const prefix = `${engine.id}-web-${engine.version}/`;
  if (!zip.file(`${prefix}index.html`)) throw new Error(`Missing entrypoint: ${engine.id}`);
  const destination = path.join(root, 'apps/engines', engine.id);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  let count = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.startsWith(prefix)) continue;
    const relative = entry.name.slice(prefix.length);
    // LightCraft's official archive also includes Rust build output, examples and
    // precompressed duplicates. They are not runtime dependencies; do not deploy them.
    if (relative.startsWith('build/') || relative.startsWith('deps/') || relative.startsWith('examples/') || relative.startsWith('.') || /\.(gz|br)$/.test(relative) || ['.htaccess', '_headers'].includes(relative)) continue;
    const target = path.resolve(destination, relative);
    if (!target.startsWith(destination + path.sep)) throw new Error('Unsafe archive path');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, await entry.async('nodebuffer'));
    count++;
  }
  // Keep additional attribution with each unmodified app distribution.
  await fs.cp(path.join(root, 'apps/notices', engine.id), path.join(destination, 'notices'), { recursive: true });
  console.log(`Verified and installed ${engine.id} ${engine.version}: ${count} runtime/license files`);
}

// Exact MIT Three.js package files, checksum pinned and installed without scripts.
const three=JSON.parse(await fs.readFile(path.join(root,'apps/studio/three-lock.json'),'utf8'));
const threeArchive=path.join(cache,`three-${three.version}.tgz`);
let threeBytes;
try{threeBytes=await fs.readFile(threeArchive);}catch{threeBytes=await download(three.url);await fs.writeFile(threeArchive,threeBytes);}
if('sha512-'+createHash('sha512').update(threeBytes).digest('base64')!==three.integrity)throw new Error('Three.js checksum mismatch');
const tar=gunzipSync(threeBytes),wanted=new Set(three.files),threeDir=path.join(root,'apps/studio/vendor/three');
await fs.rm(threeDir,{recursive:true,force:true});
for(let offset=0;offset+512<=tar.length;){
 const header=tar.subarray(offset,offset+512);const name=header.subarray(0,100).toString().split('\0')[0];if(!name)break;
 const size=parseInt(header.subarray(124,136).toString().replace(/\0/g,'').trim()||'0',8);
 if(!Number.isFinite(size)||size<0||offset+512+size>tar.length)throw new Error('Invalid Three.js archive');
 const relative=name.replace(/^package\//,'');
 if(name.startsWith('package/')&&wanted.has(relative)){const target=path.join(threeDir,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,tar.subarray(offset+512,offset+512+size));wanted.delete(relative);}
 offset+=512+Math.ceil(size/512)*512;
}
if(wanted.size)throw new Error('Missing Three.js files: '+[...wanted].join(', '));
console.log('Verified and installed Three.js '+three.version+' with MIT license.');

// Pinned MIT Spark renderer, installed without package scripts.
const spark=JSON.parse(await fs.readFile(path.join(root,'apps/studio/spark-lock.json'),'utf8'));
const sparkArchive=path.join(cache,`spark-${spark.version}.tgz`);
let sparkBytes;try{sparkBytes=await fs.readFile(sparkArchive);}catch{sparkBytes=await download(spark.url);await fs.writeFile(sparkArchive,sparkBytes);}
if('sha512-'+createHash('sha512').update(sparkBytes).digest('base64')!==spark.integrity)throw new Error('Spark checksum mismatch');
const sparkTar=gunzipSync(sparkBytes),sparkFiles=new Set(spark.files),sparkDir=path.join(root,'apps/studio/vendor/spark');
await fs.rm(sparkDir,{recursive:true,force:true});
for(let offset=0;offset+512<=sparkTar.length;){const h=sparkTar.subarray(offset,offset+512),name=h.subarray(0,100).toString().split('\0')[0];if(!name)break;const size=parseInt(h.subarray(124,136).toString().replace(/\0/g,'').trim()||'0',8);if(!Number.isFinite(size)||size<0||offset+512+size>sparkTar.length)throw new Error('Invalid Spark archive');const rel=name.replace(/^package\//,'');if(name.startsWith('package/')&&sparkFiles.has(rel)){const target=path.join(sparkDir,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,sparkTar.subarray(offset+512,offset+512+size));sparkFiles.delete(rel);}offset+=512+Math.ceil(size/512)*512;}
if(sparkFiles.size)throw new Error('Missing Spark files');console.log('Verified and installed Spark '+spark.version+' with MIT license.');

await import('./build-studio-pages.mjs');

// Self-contained static output retains every existing converter and tool.
const output = path.join(root, 'dist');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
const excluded = new Set(['.git', '.github', '.openai', '.creative-cache', '.vercel', 'dist', 'tests', 'scripts', 'docs', 'node_modules', 'api', 'server', 'package.json', 'package-lock.json']);
for (const entry of await fs.readdir(root, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || excluded.has(entry.name)) continue;
  if (entry.name === 'apps') {
    await fs.mkdir(path.join(output, 'apps'), { recursive: true });
    for (const child of await fs.readdir(path.join(root, 'apps'))) {
      if (['engine-lock.json', 'README.md'].includes(child)) continue;
      await fs.cp(path.join(root, 'apps', child), path.join(output, 'apps', child), { recursive: true });
    }
  } else {
    await fs.cp(path.join(root, entry.name), path.join(output, entry.name), { recursive: true });
  }
}
console.log('Built dist with all existing tools and seven local creative engines.');
