# ConvertShorts Creative Apps

Seven studio entry points at `/apps/`: Photo, Vector, Video, Light, PDF, Motion and Layout.
The six upstream web distributions are integrated as original, locally hosted applications;
the ConvertShorts hub and workspace shell are new. Existing converters and editors remain available.

## Scope and feature parity

| Studio | Engine | Available here | Separate desktop capabilities |
| --- | --- | --- | --- |
| Photo | PhotoCraft 0.5.0 | Original browser build: layered image editing, masks, adjustments, brushes, type and PSD workflows | Native GPU, filesystem, platform-specific integrations and native automation |
| Vector | VectorCraft 0.7.0 | Original browser build: illustration paths, shapes, appearance and SVG workflows | Native font/filesystem access and native automation |
| Video | Existing ConvertShorts editor | Trim, split, reorder, framing, manual titles, music, MP4/WebM export | FilmCraft 0.4.0 full native timeline, scopes, codecs and professional audio are desktop downloads |
| Light | LightCraft 0.4.0 | Original browser build: local catalog, RAW development, adjustments, masking and backup | Some model/preset integrations and native control channel |
| PDF | PdfCraft 0.4.0 | Original browser PDF workbench | Native filesystem/integrations and automation differ |
| Motion | EffectCraft 0.6.0 | Original browser composition and animation engine | Browser codec/render support differs; desktop export workflow remains separate |
| Layout | DesignCraft 0.4.0 | Original browser layout engine | Native font access, filesystem and automation differ |

This is not a claim of complete desktop feature parity. The current upstream projects are early
releases. No native desktop binary is executed by the website, and the site does not expose desktop
CLI/MCP servers, accounts, cloud project syncing, payments or an automatic cross-app project format.

## Build

Node 22+ (24 on the existing Vercel project):

```sh
node scripts/generate-app-pages.mjs
node scripts/build-creative-apps.mjs
node tests/creative-apps.mjs
```

The build uses the existing vendored JSZip distribution, with no additional production npm
dependencies. `apps/engine-lock.json` pins release URLs, versions and SHA-256 checksums. Each ZIP
is verified before extraction. Application JS/WASM and index pages are left unchanged. The
LightCraft release includes Rust `build/` and `deps/` output; those files are excluded along with
examples and precompressed duplicates. Browser worker files and EffectCraft snippets/PWA files
are retained. The source repository excludes generated binary engines and `dist/`.

`dist/` is a self-contained static deployment, with all the existing site tools. Vercel runs the
build command and serves `dist`, using the preserved clean-URL settings and added app isolation,
WASM MIME and revalidation headers. The cached download location can be set using
`CREATIVE_APPS_CACHE` for local builds. Cold builds need access to the pinned GitHub releases.

## User behavior

- The hub supports feature search, category filters, browser-local favorites and recent studios.
- Workspace pages load one engine only after the visitor presses Open. Engines are not loaded on
  the hub, reducing network/memory cost.
- Guides, fullscreen, open in a separate tab, and a studio switcher are available. Navigating away
  from an open workspace prompts visitors to save. Photo Studio offers a WebGL compatibility reload.
- The native app's File menu handles imports, project saves and exports. Files are processed locally.
  Light Studio retains a catalog/originals in browser storage and has a backup command; clearing site
  data may remove it. Preserve originals and backups. Other apps have their own storage behavior.

## Attribution

Original distributions retain their original identities. `apps/notices/` contains version-pinned
MIT/Apache licenses, required NOTICE texts, font/icon/asset licenses and asset attribution from
upstream. Original ZIP licenses are also retained with the deployed engines. The wrapper does not
use the ArtCraft logo or wordmark. The original engine is credited on every workspace and at
`/apps/notices/`. Source URLs and hashes are in the engine lock.

## Validation

`tests/creative-apps.mjs` checks every archive checksum, byte-identical installed WASM, WASM
validation, runtime-relative links, notices, route packaging, existing tools and hosting settings.
`tests/creative-apps-browser.cjs` exercises category search/favorites/mobile layout, opens each
browser engine, checks initialization and records screenshots in CI. Existing export checks are
retained. Passing packaging tests alone does not prove every upstream feature or browser export.
