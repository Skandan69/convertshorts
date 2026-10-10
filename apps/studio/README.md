# ConvertShorts Creative Studio

An independently implemented creative workspace at `/apps/`. The seven separately licensed Crafting Apps browser distributions retain their identities and attribution. ArtCraft's proprietary web application and backend source, branding and promotional assets are not copied.

## Launch status

Customer provider-key entry has been removed. Free editors and email/password accounts are available now. Paid AI generation and ₹100/₹500/₹1,000 prepaid balances are **Coming soon** until merchant credentials and funded-provider end-to-end testing are completed. Only reviewed image/video/music models are included in the initial hosted launch; unpriced adapters remain disabled control previews.

## Implemented workflows

- Visual Workflow Builder: typed prompt/reference/image/video connections, cinematic/product/three-shot templates, drag/pan/zoom and mobile List view, model controls and a free guided prompt builder. Workflows share the `projects` store with a `recordType: workflow` discriminator, so private workspace sync, 30-day retention and full workspace backups apply without a schema migration. Shot lists filter out workflow records.
- Workflow runs review a total budget, preflight the wallet and use the existing server-priced generation API. Independent branches are limited to two submissions at once. Dependent steps wait for their image output; confirmed failures stop future submissions. Pausing or leaving the tool stops future steps, while accepted jobs continue. Resume reuses recorded jobs and completed outputs. Browser Web Locks prevent the same workflow running in two tabs; they do not coordinate different devices.
- Portable workflow ZIPs contain the graph, reference files and completed outputs, with 150 MB per file / 300 MB total limits. Imports receive fresh workflow/media IDs and never transfer paid job state or credentials. Free planning is available now; AI generation retains the existing coming-soon gates.


- Image, video, audio, object and world generation: 77 documented model adapters, including 63 schema-driven Fal models, 10 initial Fal adapters and four World Labs Marble models. Adapter coverage is not a claim that all models are available in the hosted launch. The composer exposes the provider's supported parameters, image references, start/end frames, multiview inputs, audio/video reference uploads, resolution, duration, seed and other model-specific controls.
- PhotoCraft image editing; AI composition canvas with layers, brushes, erasing, shapes, text, masks and undo; guided generation and masked AI erasing.
- FilmCraft 0.4.0 browser editor: multi-track timeline, trimming, effects, transitions, grading, keyframes, audio mixing, captions, recovery and H.264 export. Library import and export retrieval are connected to the surrounding studio. The original quick timeline remains at `#quick-video`.
- 3D scenes: models, transparent image planes, Gaussian-splat environments, transforms, poseable mannequins/GLTF joints, camera bookmarks, scene undo, PNG/GLB export and saved project reopening. AI rendering can combine a camera composition with saved character portraits. GLB exports contain the mesh scene; Gaussian files remain separate assets referenced by scene projects.
- World Studio: PLY/SPLAT/SPZ/SOG/KSPLAT loading through Spark, orbit and fly controls, scale, rotation, cameras, original-file export and image capture.
- Video backgrounds: AI segmentation is planned separately; image/color compositing and local chroma key; WebM export preserving source audio. Image removal/replacement tools remain at `#image-background`.
- Moodboards: boards, images, notes, colors, sections, ratings/search, paste/import, library references, grid/canvas/presentation modes and PNG export.
- Frame extraction: precise individual frames, burst capture, library input and ZIP downloads.
- Projects and shot lists, character references and prompt presets; generation history; library folders, tags, favorites, trash, bulk downloads and full workspace ZIP backup/restore.
- Email/password accounts, confirmation and recovery; private cloud media and project sync; workspace invitation links with editor/viewer roles, expiry/revocation and optimistic conflict preservation.
- Razorpay checkout, server-controlled INR top-ups, raw-body webhook verification/replay protection, non-expiring prepaid balances, atomic generation credit reservations and idempotent failure refunds.

## Production configuration

Vercel publishes only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through `/api/cloud`. The database and private storage bucket are isolated with `convertshorts_` names. No service-role or provider key is returned to a browser. Existing project tables and Auth settings are preserved.

`server/cloud-schema.sql`, `server/billing-schema.sql` and `server/credit-schema.sql` document the applied schema. Authenticated users can read their own records; controlled RPCs enforce workspace writes and revisions. Billing and spending RPCs require the `service_role` claim and are not executable by anonymous or authenticated clients.

The deployed `convertshorts-billing` Supabase Edge Function uses its runtime service-role credential. Its JWT platform gate is disabled because the same endpoint receives Razorpay webhooks. Every account operation independently verifies the user JWT with Supabase Auth; webhook requests independently verify the raw-body Razorpay HMAC signature.

## Simple prepaid pricing and Razorpay activation

There are no subscriptions. The studio offers **₹100, ₹500 and ₹1,000** one-time top-ups, each awarding the same rupee amount of non-expiring generation balance. Internally, a credit is one INR paise (₹0.01). The earlier unused USD-cent ledger was empty when this currency change was verified and applied. `server/razorpay-schema.sql` refuses installation on a non-empty legacy ledger without an explicit currency migration.

Customer-facing **generation credits** use **1 credit = ₹1** (fractional credits allowed): ₹100 buys 100 credits, ₹500 buys 500, and ₹1,000 buys 1,000. The existing ledger remains in paise without a data migration; the API's legacy `credits` field is internal paise units, while `generationCredits` is the public balance. A ₹200 provider cost becomes 240 public credits (₹240) after the 20% markup, leaving 760 from a 1,000-credit balance. No markup is deducted again from the top-up.

`price-catalog.js` records the official reference rates for all **74 Fal endpoints** represented by the current studio adapters, including the alternate Kling image endpoint, across **194 rate variants** reviewed on 2026-10-10. The website and in-studio pricing page show provider rate × 1.20 and daily INR credit equivalents, with model/type search and an illustrative wallet calculator. This is not the entire Fal marketplace. Reviewed unit rates are not complete paid-job quotes: metered, tentative, conflicting and unverified prices are explicitly marked and remain unavailable for hosted charging. In particular, Seedance 1.5 uses video tokens; its roughly $0.26 example becomes roughly $0.312 before FX, not a guaranteed clip charge. Paid eligibility remains the initial seven exact-price endpoints while merchant/provider verification is outstanding. See [pricing review](../../docs/fal-pricing-2026-10-10.md).

Generation costs the reviewed, published Fal cost **× 1.20**, converted to INR and rounded up once to the next paise. Quotes include duration, audio, output count, resolution and priced extras. Current hosted coverage is FLUX Schnell, Nano Banana 2 generation/editing, Kling 2.6 Pro text/image-to-video, ACE-Step and MiniMax Music 2. Other adapters are planned previews and cannot submit customer generation requests. Fal rates are reviewed rates, not a claim of live provider-invoice synchronization. Update `apps/studio/pricing.js` and the deployed billing function when provider prices change. No arbitrary unpriced model is charged to the business key.

USD/INR comes from Frankfurter's daily reference-rate API, cached for six hours. Rates older than seven days or unavailable rates disable new hosted quotes and live checkout. An optional merchant rate override uses both `CONVERTSHORTS_USD_INR` and `CONVERTSHORTS_USD_INR_DATE` (YYYY-MM-DD), and also expires after seven days. Reference FX is a midpoint, so actual bank/provider conversion fees remain business expenses.

Set these **ConvertShorts-specific** secrets in the [existing Supabase Edge Function secrets](https://supabase.com/dashboard/project/chrfgzbecjvjazdovmyk/settings/functions). Do not put private secrets in chat, Git, browser storage or the frontend:

| Secret | Value / purpose |
| --- | --- |
| `CONVERTSHORTS_RAZORPAY_KEY_ID` | Dedicated Razorpay Key ID; `rzp_live_…` for live payments. Only this public identifier is sent to checkout. |
| `CONVERTSHORTS_RAZORPAY_KEY_SECRET` | Private Razorpay API secret. |
| `CONVERTSHORTS_RAZORPAY_WEBHOOK_SECRET` | A dedicated secret you choose when adding the webhook. |
| `CONVERTSHORTS_FAL_KEY` | Dedicated, funded business Fal API key. |
| `CONVERTSHORTS_HOSTED_ENABLED` | `true` after the live merchant and provider flow is ready. |

Generate the Razorpay ID/secret in **Dashboard → Account & Settings → API Keys**, selecting the intended Live or Test mode. Complete Razorpay account activation before live payments. Customers never enter a Fal key. A merchant API key alone cannot fund generation; the business Fal account must also be funded.

Razorpay webhook URL:

`https://chrfgzbecjvjazdovmyk.supabase.co/functions/v1/convertshorts-billing?action=webhook`

Subscribe to `payment.captured` and `order.paid`. Configure automatic payment capture. The backend verifies HMAC over the exact raw request body, then fetches the payment from Razorpay and checks the stored order, INR amount, capture state and absence of refunds. Customer callbacks also verify `order_id|payment_id` with the API secret. Both paths use the same row-locked, idempotent SQL transaction, so replay or a callback plus webhook cannot award balance twice. The order owner comes from verified Supabase Auth and the server's stored order; client-submitted amounts and credit counts are ignored.

Checkout opens at `/payments/checkout`, outside the media editors' cross-origin isolation headers, so third-party checkout frames and payment popups can work. The payment page initializes account authentication without downloading/syncing a user's media workspace. Checkout cancellation retries the same stored order. A captured payment with an interrupted callback can be fulfilled by the signed webhook.

For a **real Razorpay test checkout**, use `rzp_test_…` and its matching secret plus `CONVERTSHORTS_BILLING_TEST_MODE=true`. Test mode never awards spendable balance and always disables hosted Fal generation; it cannot fund live requests. Remove test mode and use Live keys only after verification. No live purchase or paid generation is made automatically by CI or audits.

A 20% markup is a 16.67% gross margin on selling price before costs. At Razorpay's standard domestic 2% fee plus 18% GST on that fee (2.36% effective), ₹100 provider cost sells for ₹120, incurs about ₹2.83 payment fees, and leaves about ₹17.17 before FX, hosting, taxes on the service, refunds and other costs. Actual fee schedules and tax treatment depend on the merchant account. The top-up amount shown is the charged checkout total; any business tax liability must be accounted for within that revenue. Customer-funded key generation is no longer offered.

Confirmed generation failures return the reserved balance idempotently. Uncertain submission timeouts require owner review to avoid duplicate paid requests. Refunds of prepaid purchases are handled by the owner: reconcile the remaining balance before issuing a Razorpay refund; refunded payments cannot be newly fulfilled. Full chargeback/refund-debt automation is not part of this initial integration.

Customer key forms are removed. Only the authenticated hosted billing route is used for customer AI generation. Legacy own-provider endpoints remain compatibility adapter code and are not invoked by the current UI. Large media references use private Supabase uploads and temporary signed URLs, or public HTTPS URLs.

Google login remains inactive until an owner configures the correct Google/Supabase OAuth callbacks and allows the ConvertShorts return URL, then sets `CONVERTSHORTS_GOOGLE_AUTH=true` on Vercel. Existing shared-project Auth settings are not changed automatically. Confirmation/recovery forms accept the full Supabase verification link copied from an email, or its code. This works with existing email templates without changing the shared project’s redirect settings; users can also follow their configured confirmation link and return to sign in.

## Reference-specific limitations

This is not a claim of identical ArtCraft platform parity. The following require additional provider access or capability and remain separate:

- Suno's official API portal requires a credentialed account and its actual API contract; the current music composer uses documented ACE-Step, MiniMax and Stable Audio adapters.
- Midjourney does not provide a generally available public API. Approved partner access would need a dedicated adapter.
- Beeble SwitchX's reference-conditioned background replacement and relighting are not equivalent to segmentation/compositing. The video background studio does not claim to implement SwitchX. A documented, authorized SwitchX API contract is still needed.
- Some exact reference model versions, especially the latest Seedance variants and newer proprietary endpoints, are not exposed by the verified public providers. Only verified endpoints are selectable.
- FilmCraft's web build is single-threaded. Its upstream browser build reports thread-dependent proxies, render previews, Project Manager and mask tracking as unavailable. Desktop CLI/MCP automation remains a separate native workflow.
- Character reference prompting is supported; it is not a guarantee of identity consistency or an implementation of ArtCraft's private identity-transfer service.
- Paid provider generations and real Razorpay purchases cannot be verified without funded provider and merchant credentials. No test charges are created automatically.

## Verification

Run `node scripts/build-creative-apps.mjs`, `node tests/creative-apps.mjs`, `node tests/studio-api.mjs`, `node tests/studio-services.mjs` `node tests/studio-pricing.mjs` and `node tests/studio-payments.mjs`.

GitHub Actions runs the browser suites with Playwright and FFmpeg: all seven engine startups, mobile layout, persisted assets, projects/characters/canvas, synthetic Gaussian-splat import, mixed scenes, actual frame pixels, burst ZIPs, video/audio compositing, workspace backup/restore, a real FilmCraft H.264 export, cloud push/restore and signed-out isolation. API/cloud billing HTTP tests use fixtures; they do not incur provider charges. `server/cloud-verify.sql` and `server/credit-verify.sql` verify database permissions and transaction behavior with rollback.

`server/razorpay-verify.sql` tests the real SQL grant/replay/spending/refund transaction inside a rollback. `tests/studio-payments-browser.cjs` verifies the prepaid UI, separate checkout page, SDK callback → authenticated verification flow, disabled commerce and mobile layout using fixtures. A live merchant capture and real funded generation still require the credentials above.

## Account storage and loading

Each owner has a 500 MB cloud media allowance across owned workspaces, with 150 MB per file. Files and synced records expire 30 days from upload/first save; editing preserves the original record deadline. Private Storage SELECT/UPDATE policies deny expired media. A ConvertShorts-scoped hourly `pg_cron` job calls the `convertshorts-retention` Edge Function using a token held in Vault; the server verifies the token, deletes physical objects through the Storage API, then prunes expired records. Account and credit tables are untouched. See `server/storage-retention.sql`, `server/storage-retention.ts`, and rollback verification.

The home paints before account/billing requests. Catalog loading blocks composers only; native engines load on demand. Cloud sync transfers metadata and batched short-lived URLs instead of downloading every blob. Editors refresh expired signed URLs on demand. Library lists initially render 24 items and video/audio previews do not preload their media. The large upstream native editor downloads remain a first-use cost; exact app performance must be measured on customer devices.

Public SEO pages: `/creative-studio`, `/creative-studio-pricing`, `/ai-image-generator`, `/ai-video-generator`, `/ai-music-generator`, `/ai-workflow-builder`. They contain static copy, canonical URLs, unique metadata, Open Graph/Twitter art, truthful structured data, internal links and sitemap entries. Build with `scripts/build-studio-pages.mjs`.

## Workflow Builder verification and scope

`tests/studio-workflow.mjs` verifies price totals using the shared 20% policy, typed edges and cycle rejection, dependency ordering, two-job concurrency, failure handling, pause/resume and uncertain submissions. `tests/studio-workflow-browser.cjs` exercises the actual customer UI, controls, archive round-trip, mobile layout, private sync, library outputs, server-quote matching and wallet preflight using HTTP fixtures. It does not spend provider credits or certify live merchant checkout.

The runner lives in the browser. Leaving the tool stops future submissions; reopening provides Check jobs / Resume. It is not an unattended server scheduler. A reload during an ambiguous submission requires review and never automatically resubmits. Each generation uses the existing individual atomic credit reservation; the whole workflow is not reserved as one transaction. A second device can intentionally start its own run, so cloud job orchestration/idempotency across devices remains future work.

Prompt guidance is a free form helper, not an LLM rewriting service. The first workflow generation models are FLUX Schnell, Nano Banana 2 generate/edit and Kling 2.6. Kie.ai, new model providers, and local Codex subscription routing are not added. The implementation is original code informed by a review of [HeliosGen](https://github.com/SegFault42/HeliosGen); no source files from that repository are copied.
