# ConvertShorts Creative Tools

Entry point: `/studio` (Vercel clean URLs), with `#image`, `#pdf`, `#video`, `#design` and `#editor` workspaces. The existing converters remain intact. No backend, accounts, paid processing API, tracking script or file-upload service is added to this workspace.

## Features

- **Images:** JPG/PNG/WebP import and export, exact pixel dimensions, aspect lock, social presets, contain/cover crop with position controls, background/transparency and iterative JPG/WebP quality compression toward a requested size.
- **PDFs:** multiple-file import, page selection, reordering, deletion, merging, per-page split ZIP, A4/Letter/custom millimetre sizing, rotated-page handling and optional image-based compression. Original-size standard exports copy PDF page objects; resized pages embed the original text/vector content.
- **Design studio:** draggable text, rectangle, ellipse and image layers; numeric position/size, opacity, colours, font settings, layer order, duplication/deletion, three editable templates, undo/redo and PNG/JPG/WebP download. Selection outlines are excluded from export.
- **Video utilities:** trim, contain/cover resize and reposition, volume, MP4/H.264 and WebM/VP9 export, quality presets and approximate target-size bitrate.
- **Video editor:** ordered clip timeline, split at playhead, removal/reordering, per-clip trims/framing/audio, title/caption overlay, background music mixing and dip-to-black transitions. Silent clips receive a normalised silent audio track so mixed timelines join consistently.

These are original ConvertShorts tools, not integrations with or reproductions of the complete Canva or CapCut applications.

## Architecture and constraints

All file contents remain in browser memory and are processed locally. Downloads are user-initiated links. External FFmpeg JavaScript/WASM is fetched on the first video export; file contents are not sent to that CDN. Each video export uses a fresh engine and releases its filesystem afterwards. Workspaces are temporary: switching tools or reloading clears the project. Nothing is saved to a server.

- Images/designs: 4,096 px maximum per side, 16 megapixels maximum canvas. Large source images still require sufficient device memory. Browser format support can vary.
- Target image size preserves selected dimensions. If quality reduction cannot reach it, the UI reports that the user must reduce dimensions. PNG has no lossy quality control.
- PDFs: up to 100 MB per imported file. Protected PDFs and interactive forms are rejected. This is not a signature-preserving editor. Resizing discards interactive annotations/links. Image-based compression removes selectable text and may not reduce every file. Keep original documents.
- Video: 250 MB total inputs, up to 30 clips, 30 MB music, even output dimensions from 16–1,920 px. Browser-playable inputs only. Device memory and browser support still determine practical limits; long/high-resolution timelines can fail or be slow. Exports are 30 fps and 48 kHz stereo.
- MP4 and WebM are re-encoded. Target sizes use a one-pass bitrate estimate and are not guaranteed exact. Transitions fade through black rather than cross-dissolve overlapping clips. Background music plays once and is padded with silence if shorter than the timeline.
- Title overlays are rendered to PNG with Canvas, so exports do not depend on FFmpeg's drawtext/font build configuration.
- `vercel.json` adds COOP/COEP headers only to `/studio` and `/studio.html`, retaining existing converter headers. FFmpeg 0.11's multithreaded core needs cross-origin isolation and SharedArrayBuffer. Serve over HTTPS or localhost; `file://` does not work.

## Dependencies and notices

Locally vendored distributions and corresponding licenses:

- pdf-lib 1.17.1 — MIT (`vendor/pdf-lib-LICENSE.md`)
- JSZip 3.10.1 — used under MIT (`vendor/jszip-LICENSE.md`)
- PDF.js 5.6.205 — Apache-2.0 (`vendor/pdfjs-LICENSE`)

Video exports load the same wrapper generation used by the original site, pinned explicitly:

- `@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js` from jsDelivr — MIT wrapper
- `@ffmpeg/core@0.11.0/dist/ffmpeg-core.js` and associated WASM/worker — FFmpeg and its compiled libraries have their own licenses, including GPL components in this build. Preserve upstream licensing/source obligations if self-hosting or redistributing the core.

No premium stock assets, fonts, music or third-party templates are bundled.

## Development and verification

Run from the repository root:

```sh
python tests/serve.py
# Open http://localhost:4173/studio
node tests/media-pipeline.mjs
```

The pipeline test needs Node 22+ and native `ffmpeg`/`ffprobe`. It exercises the same command builders used by browser export, plus PDF page copy/resize handling. Native FFmpeg checks do not alone establish WASM/browser compatibility.

The `Creative tools exports` GitHub Actions workflow runs the native checks and headless browser tests with synthetic inputs, including actual image/PDF/video downloads and mobile overflow checks. It uploads output files, screenshots and failure details as `creative-tools-results`. Browser test dependencies are installed under `tests/` only; production remains a buildless static site.
