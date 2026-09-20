import { fitFilter } from './common.js';

/** Build the same deterministic FFmpeg commands for browser exports and tests. */
export function clipArguments(clip, { width, height, source, audio }) {
  const duration = clip.end - clip.start;
  const args = ['-ss', clip.start.toFixed(5), '-i', source,
    '-i', 'silence.wav'];
  const fit = fitFilter(width, height, clip.fit, clip.x, clip.y);
  let filters = `[0:v]${fit},fps=30,format=yuv420p[base]`;
  let output = 'base';
  if (clip.text) {
    args.push('-i', 'title.png');
    filters += ';[base][2:v]overlay=0:0[captioned]';
    output = 'captioned';
  }
  if (clip.transition === 'fade') {
    const fade = Math.min(0.3, duration / 3);
    filters += `;[${output}]fade=t=in:st=0:d=${fade},fade=t=out:st=${duration - fade}:d=${fade}[faded]`;
    output = 'faded';
  }
  args.push('-filter_complex', filters, '-map', `[${output}]`, '-map', audio ? '0:a:0' : '1:a:0',
    '-t', duration.toFixed(5), '-af', `volume=${clip.volume},apad`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
    '-video_track_timescale', '90000', '-map_metadata', '-1');
  return args;
}

export function finalArguments({ duration, format, quality, bitrate, musicVolume = null }) {
  const args = ['-i', 'joined.mp4'];
  if (musicVolume !== null) {
    args.push('-i', 'music-input', '-filter_complex',
      `[1:a]volume=${musicVolume},apad[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
      '-map', '0:v:0', '-map', '[a]');
  } else args.push('-map', '0:v:0', '-map', '0:a:0');
  args.push('-t', duration.toFixed(5));
  if (format === 'mp4') {
    args.push('-c:v', 'libx264', '-preset', 'fast', ...(bitrate ? ['-b:v', `${bitrate}k`] : ['-crf', String(quality)]),
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart');
  } else {
    args.push('-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8',
      ...(bitrate ? ['-b:v', `${bitrate}k`] : ['-b:v', '0', '-crf', String(Number(quality) + 8)]),
      '-c:a', 'libopus', '-b:a', '128k');
  }
  return [...args, '-pix_fmt', 'yuv420p', '-map_metadata', '-1'];
}

/** One second of silent PCM; apad extends this for silent clips.
 * FFmpeg WASM omits the lavfi input device available in desktop builds. */
export function silenceWav() {
  const samples = 48000, channels = 2, size = samples * channels * 2;
  const buffer = new ArrayBuffer(44 + size), view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + size, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, samples, true);
  view.setUint32(28, samples * channels * 2, true); view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, size, true);
  return new Uint8Array(buffer);
}
