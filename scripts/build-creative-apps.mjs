import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

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

// Self-contained static output retains every existing converter and tool.
const output = path.join(root, 'dist');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
const excluded = new Set(['.git', '.github', '.openai', '.creative-cache', '.vercel', 'dist', 'tests', 'scripts', 'docs', 'node_modules']);
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
console.log('Built dist with all existing tools and six local creative engines.');
