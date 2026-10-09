# ConvertShorts AI and visual studio

The `/apps/` entry point is now the dark creative studio requested from the
`app.getartcraft.com` reference. This is independently written code. ArtCraft's
web-platform fair-source license prohibits using that code for a competing
product, so no web frontend/backend code, trademarks or images from that platform
are copied here. The original MIT/Apache browser editors remain in `/apps/editors/`
and the existing studio routes, with their separate notices.

## Working local tools

- IndexedDB asset library: import images, video, audio, GLB/OBJ files; previews,
  downloads, search/type filters, favorites, project folders and recoverable trash.
- Moodboards: image references, draggable notes, automatic local saving, multiple
  boards and PNG export.
- Frame extractor: browser-decoded MP4/WebM timeline, timestamp/scrubber selection,
  original-resolution PNG/JPEG captures and library integration.
- Three.js scene editor: orbit camera, translate/rotate/scale gizmos, transform
  inspector, primitives, GLB/OBJ imports, alpha-image planes, material color,
  camera presets/FOV, lighting, stage/grid controls, duplicate/remove,
  automatic local project save, PNG capture, GLB export/reimport.
- PhotoCraft and the existing ConvertShorts video timeline open in the studio
  without a separate placeholder introduction. Export in the embedded engine
  before leaving; imported library assets are not automatically opened there.

## AI connection and job flow

`api/studio.mjs` exports Node.js Web handlers. `server/studio-core.mjs` contains
independent model adapters and validation. Production has no AI credential by
default. Settings lets users supply their own Fal key, kept in tab memory only.
Requests use a same-origin proxy; secrets never enter localStorage, IndexedDB or
the static build. Fal bills the user's account. No automatic test submits a paid
generation.

Optional owner-only deployment configuration requires **both** `FAL_KEY` and
`STUDIO_ACCESS_TOKEN`. A server key alone cannot expose a public generation
endpoint. The owner enters the access token in Settings, also kept only in memory.

Requests submit to the provider's durable queue and return an HMAC-signed job
token bound to that provider credential. Status/result/cancel URLs are validated
to the fixed Fal queue host and expected path. Browsers save tokens and metadata,
poll status while connected, and download completed files into IndexedDB where
CORS and size permit. Remote URLs remain a fallback; download important results
before the provider's expiration policy removes them. After a reload, reconnect
the same key to resume unfinished jobs. The server does not persist an account,
wallet, library or job database.

Supported adapters: FLUX Schnell, FLUX 2, Nano Banana 2 (generation/edit), Kling
2.6 Pro (text/image video), Stable Audio 2.5, Trellis 2, Hunyuan World, Bria
background removal and background change. The backend checks required inputs,
count, duration, resolution and URL/data-URI shape before sending a request.

## Explicit limits

This is not full ArtCraft feature parity. Shared cloud accounts/libraries,
collaboration, provider-credit wallets, subscription billing, proprietary
integrations, full FilmCraft desktop features, character posing/identity transfer
and Gaussian-splat world editing are not implemented. World generation returns
the provider's downloadable world file; the GLB scene editor accepts GLB/OBJ and
images. Browser codec/GPU support affects native editors. Local browser data can
be lost when site data is cleared.

## Build and verification

`node scripts/build-creative-apps.mjs` retains existing tools, installs six pinned
upstream browser engines and exact files from the pinned MIT Three.js 0.180.0 npm
archive. SHA-512 checks the Three.js archive; its license ships in the build.
Server source and API credentials are excluded from the static `dist` directory.

`node tests/studio-api.mjs` verifies the provider contract with mocked HTTP,
including cross-origin/credential gates, signed-job isolation and cancellation.
`tests/studio-browser.cjs` runs in CI with Chromium and FFmpeg: actual imported
files, persistent favorites/folders/moodboards, PNG exports, pixel-verified red
video frame capture, WebGL PNG capture, real GLB export/reimport/persistence and
the frontend job lifecycle with mocked provider responses. Existing engine
startup and PDF/video export tests remain separate.
