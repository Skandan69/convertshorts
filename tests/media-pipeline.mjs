import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { clipArguments, finalArguments, silenceWav } from '../studio/lib/video-pipeline.js';
import { appendPDFPage } from '../studio/lib/pdf-pages.js';
import { dimensions, fitFilter } from '../studio/lib/common.js';
const require = createRequire(import.meta.url);
const PDFLib = require('../studio/vendor/pdf-lib.min.js');
const dir = await mkdtemp(join(tmpdir(), 'convertshorts-test-'));
function ff(args, output) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args, output], { cwd: dir });
}
function probe(file) {
  return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { cwd: dir }));
}
assert.throws(() => dimensions(0, 100));
assert.throws(() => dimensions(5000, 100));
assert.deepEqual(dimensions(320, 180), { w: 320, h: 180 });
assert.match(fitFilter(180, 320, 'cover', 0.25, 0.75), /crop=180:320/);

const source = await PDFLib.PDFDocument.create();
const p1 = source.addPage([400, 200]);p1.drawText('First page', { x: 20, y: 50 });
const p2 = source.addPage([300, 500]);p2.drawText('Rotated page', { x: 20, y: 50 });p2.setRotation(PDFLib.degrees(90));
const merged = await PDFLib.PDFDocument.create();
await appendPDFPage(merged, source, 1, null, PDFLib);
await appendPDFPage(merged, source, 0, null, PDFLib);
const loaded = await PDFLib.PDFDocument.load(await merged.save());
assert.equal(loaded.getPageCount(), 2);
assert.equal(loaded.getPage(0).getRotation().angle, 90);
assert.equal(loaded.getPage(1).getWidth(), 400);
const resized = await PDFLib.PDFDocument.create();
await appendPDFPage(resized, source, 1, [595.28, 841.89], PDFLib);
assert.deepEqual(resized.getPage(0).getSize(), { width: 595.28, height: 841.89 });
assert.equal(resized.getPage(0).getRotation().angle, 0);
await writeFile(join(dir, 'resized.pdf'), await resized.save());
console.log('PASS PDF reorder/copy, rotated-page resize and dimension validation');

ff(['-f','lavfi','-i','testsrc2=size=320x180:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac'],'input.mp4');
ff(['-f','lavfi','-i','color=c=green:size=180x320:rate=30','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-an'],'silent.mp4');
// A red title overlay lets us assert that compositing affects real output pixels.
ff(['-f','lavfi','-i','color=c=red:size=320x180','-frames:v','1'],'title.png');
await writeFile(join(dir, 'silence.wav'), silenceWav());
const clip = { start: 0.5, end: 2, fit: 'contain', x: .5, y: .5, volume: .6, text: 'Title', transition: 'fade' };
ff(clipArguments(clip, { width: 320, height: 180, source: 'input.mp4', audio: true }), 'part0.mp4');
ff(clipArguments({ ...clip, start: 0, end: 1, text: '', fit: 'cover' }, { width: 320, height: 180, source: 'silent.mp4', audio: false }), 'part1.mp4');
for (const name of ['part0.mp4', 'part1.mp4']) {
  const info = probe(name);
  assert.equal(info.streams.find(s=>s.codec_type==='video').width, 320);
  assert.equal(info.streams.find(s=>s.codec_type==='video').height, 180);
  assert(info.streams.some(s=>s.codec_type==='audio'));
}
await writeFile(join(dir, 'parts.txt'), "file 'part0.mp4'\nfile 'part1.mp4'");
ff(['-f','concat','-safe','0','-i','parts.txt','-c','copy'], 'joined.mp4');
ff(['-f','lavfi','-i','sine=frequency=660:sample_rate=48000','-t','1','-c:a','pcm_s16le','-f','wav'], 'music-input');
for (const format of ['mp4', 'webm']) {
  ff(finalArguments({ duration: 2.5, format, quality: 26, bitrate: 0, musicVolume: .25 }), `final.${format}`);
  const info = probe(`final.${format}`);
  assert(Math.abs(Number(info.format.duration) - 2.5) < .2);
  assert.equal(info.streams.find(s=>s.codec_type==='video').width, 320);
  assert(info.streams.some(s=>s.codec_type==='audio'));
}
ff(finalArguments({ duration: 2.5, format: 'mp4', quality: 26, bitrate: 180, musicVolume: null }), 'compressed.mp4');
console.log('PASS trim, crop, PNG title overlay, fades, mixed audio/silent clips, concatenation, music, MP4/WebM and bitrate exports');
console.log(`Output fixtures: ${dir}`);
