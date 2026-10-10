# ConvertShorts Creative Studio

An independently implemented creative workspace at `/apps/`. The seven separately licensed Crafting Apps browser distributions retain their identities and attribution. ArtCraft's proprietary web application and backend source, branding and promotional assets are not copied.

## Available workflows

- Image, video, audio, object and world generation: 77 documented model adapters, including 63 schema-driven Fal models, 10 initial Fal adapters and four World Labs Marble models. The composer exposes the provider's supported parameters, image references, start/end frames, multiview inputs, audio/video reference uploads, resolution, duration, seed and other model-specific controls.
- PhotoCraft image editing; AI composition canvas with layers, brushes, erasing, shapes, text, masks and undo; guided generation and masked AI erasing.
- FilmCraft 0.4.0 browser editor: multi-track timeline, trimming, effects, transitions, grading, keyframes, audio mixing, captions, recovery and H.264 export. Library import and export retrieval are connected to the surrounding studio. The original quick timeline remains at `#quick-video`.
- 3D scenes: models, transparent image planes, Gaussian-splat environments, transforms, poseable mannequins/GLTF joints, camera bookmarks, scene undo, PNG/GLB export and saved project reopening. AI rendering can combine a camera composition with saved character portraits. GLB exports contain the mesh scene; Gaussian files remain separate assets referenced by scene projects.
- World Studio: PLY/SPLAT/SPZ/SOG/KSPLAT loading through Spark, orbit and fly controls, scale, rotation, cameras, original-file export and image capture.
- Video backgrounds: documented BiRefNet/Bria AI segmentation followed by image/color compositing; local chroma key; WebM export preserving source audio. Image removal/replacement tools remain at `#image-background`.
- Moodboards: boards, images, notes, colors, sections, ratings/search, paste/import, library references, grid/canvas/presentation modes and PNG export.
- Frame extraction: precise individual frames, burst capture, library input and ZIP downloads.
- Projects and shot lists, character references and prompt presets; generation history; library folders, tags, favorites, trash, bulk downloads and full workspace ZIP backup/restore.
- Email/password accounts, confirmation and recovery; private cloud media and project sync; workspace invitation links with editor/viewer roles, expiry/revocation and optimistic conflict preservation.
- Stripe checkout/portal, server-controlled prices, webhook verification/replay protection, monthly/annual credit grants, non-expiring packs, atomic generation credit reservations and idempotent failure refunds.

## Production configuration

Vercel publishes only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through `/api/cloud`. The database and private storage bucket are isolated with `convertshorts_` names. No service-role or provider key is returned to a browser. Existing project tables and Auth settings are preserved.

`server/cloud-schema.sql`, `server/billing-schema.sql` and `server/credit-schema.sql` document the applied schema. Authenticated users can read their own records; controlled RPCs enforce workspace writes and revisions. Billing and spending RPCs require the `service_role` claim and are not executable by anonymous or authenticated clients.

The deployed `convertshorts-billing` Supabase Edge Function uses its runtime service-role credential. Its JWT platform gate is disabled because the same endpoint receives Stripe webhooks. Every account operation independently verifies the user JWT with Supabase Auth; webhook requests independently verify the raw-body Stripe signature and timestamp.

Set these **ConvertShorts-specific** Edge Function secrets to activate commerce and hosted generation:

- `CONVERTSHORTS_STRIPE_SECRET_KEY`
- `CONVERTSHORTS_STRIPE_WEBHOOK_SECRET`
- `CONVERTSHORTS_STRIPE_PLANS`: a JSON array such as `[{"id":"starter-monthly","price":"price_FROM_YOUR_ACCOUNT"},{"id":"creator-monthly","price":"price_FROM_YOUR_ACCOUNT"},{"id":"studio-monthly","price":"price_FROM_YOUR_ACCOUNT"},{"id":"topup-5","price":"price_FROM_YOUR_ACCOUNT"}]`. The code controls the names, USD amounts and credit grants. Create monthly Stripe prices of $7/$24/$42 and a $5 one-time price, respectively. Checkout verifies the Stripe amount, currency and recurrence before redirecting. Do not use yearly prices for these monthly offers.
- `CONVERTSHORTS_FAL_KEY`
- `CONVERTSHORTS_HOSTED_ENABLED=true`: explicitly enable owner-funded generation after funding the provider account and verifying the launch flow.

`apps/studio/pricing.js` is shared by the browser and billing backend. One credit is $0.01 retail value. The first priced adapters are FLUX Schnell, Nano Banana 2 generation/editing and Kling 2.6 Pro text/image-to-video. Quotes account for output count, resolution, duration and audio with a 25% provider-cost markup and whole-credit rounding. Unsupported models remain own-key only. The backend recomputes the quote and rejects stale or tampered prices before reserving credits. Fixed `CONVERTSHORTS_MODEL_CREDITS` values are no longer used. Review actual provider invoices and current rates before activating prices. Monthly allowances are 700/2,400/4,200 credits; the 500-credit pack never expires. All hosted purchases remain unavailable while hosted generation is disabled.

Stripe webhook URL: `https://chrfgzbecjvjazdovmyk.supabase.co/functions/v1/convertshorts-billing`. Subscribe to `checkout.session.completed`, `invoice.paid`, and `customer.subscription.deleted`. Configure the Stripe customer portal separately. Hosted generation can operate independently of Stripe when credits have been provisioned through the verified server flow.

Customers can use their own funded Fal/World Labs keys immediately. Keys stay in tab memory. The initial Fal shared-server option remains gated by both `FAL_KEY` and `STUDIO_ACCESS_TOKEN` on Vercel. Large media references use private Supabase uploads and temporary signed URLs, or public HTTPS URLs supplied by the user.

Google login remains inactive until an owner configures the correct Google/Supabase OAuth callbacks and allows the ConvertShorts return URL, then sets `CONVERTSHORTS_GOOGLE_AUTH=true` on Vercel. Existing shared-project Auth settings are not changed automatically. Confirmation/recovery forms accept the full Supabase verification link copied from an email, or its code. This works with existing email templates without changing the shared project’s redirect settings; users can also follow their configured confirmation link and return to sign in.

## Reference-specific limitations

This is not a claim of identical ArtCraft platform parity. The following require additional provider access or capability and remain separate:

- Suno's official API portal requires a credentialed account and its actual API contract; the current music composer uses documented ACE-Step, MiniMax and Stable Audio adapters.
- Midjourney does not provide a generally available public API. Approved partner access would need a dedicated adapter.
- Beeble SwitchX's reference-conditioned background replacement and relighting are not equivalent to segmentation/compositing. The video background studio does not claim to implement SwitchX. A documented, authorized SwitchX API contract is still needed.
- Some exact reference model versions, especially the latest Seedance variants and newer proprietary endpoints, are not exposed by the verified public providers. Only verified endpoints are selectable.
- FilmCraft's web build is single-threaded. Its upstream browser build reports thread-dependent proxies, render previews, Project Manager and mask tracking as unavailable. Desktop CLI/MCP automation remains a separate native workflow.
- Character reference prompting is supported; it is not a guarantee of identity consistency or an implementation of ArtCraft's private identity-transfer service.
- Paid provider generations and real Stripe purchases cannot be verified without funded provider and merchant credentials. No test charges are created automatically.

## Verification

Run `node scripts/build-creative-apps.mjs`, `node tests/creative-apps.mjs`, `node tests/studio-api.mjs`, `node tests/studio-services.mjs` and `node tests/studio-pricing.mjs`.

GitHub Actions runs the browser suites with Playwright and FFmpeg: all seven engine startups, mobile layout, persisted assets, projects/characters/canvas, synthetic Gaussian-splat import, mixed scenes, actual frame pixels, burst ZIPs, video/audio compositing, workspace backup/restore, a real FilmCraft H.264 export, cloud push/restore and signed-out isolation. API/cloud billing HTTP tests use fixtures; they do not incur provider charges. `server/cloud-verify.sql` and `server/credit-verify.sql` verify database permissions and transaction behavior with rollback.
