# ConvertShorts studio audit — 10 October 2026

## Result

ConvertShorts has working browser editors and an independently implemented creative studio. It does not yet have complete ArtCraft platform parity. The owner's successful image-to-video generation confirms that paid provider path; it does not prove every model, merchant purchase or cloud collaboration scenario.

The live public configuration before this update reported 77 model adapters, private cloud configuration enabled, Google login disabled, and both hosted generation and merchant checkout disabled. Six isolated `convertshorts_` tables had row-level security enabled. The existing billing Edge Function was active. The customer release now uses only merchant-funded, authenticated prepaid generation; customer key forms are removed. Legacy provider adapter contracts remain internal compatibility code.

## Coverage and evidence

| Area | Implemented | Verification and limits |
| --- | --- | --- |
| Seven Crafting Apps | PhotoCraft, VectorCraft, FilmCraft, LightCraft, PdfCraft, EffectCraft and DesignCraft; pinned local browser distributions and license notices | Release/checksum/runtime checks; CI exercises browser startup and representative real exports. Native CLI/MCP workflows remain separate. |
| Image/video/audio/3D/world AI | 77 adapters with model-specific inputs; reviewed hosted image/video/music launch; remaining model controls are planned previews | Input, request, polling, cancellation and response contracts tested with HTTP fixtures. Owner reports a successful real image-to-video request. Every paid model has not been run. |
| Canvas | Layers, drawing, erasing, shapes, text, masks, undo, persisted composition and PNG export; AI actions | Browser workflows and persistence tested. Paid canvas generations still need a funded, compatible provider key. |
| 3D and world studios | Mixed meshes, image planes, Gaussian environments, object/joint poses, cameras, scene persistence, PNG/mesh GLB export; PLY/SPLAT/SPZ/SOG/KSPLAT viewing | Browser tests use real WebGL, generated fixture splats and export/reimport. Gaussian assets remain separate from mesh GLB exports. |
| Video tools | Advanced FilmCraft timeline, quick editor, local chroma key and AI mask compositing, audio-preserving WebM, individual/burst frame extraction | Real H.264/AAC and WebM export checks; actual frame pixel checks and ZIP contents. Segmentation/compositing does not provide SwitchX's exact relighting service. |
| Assets/workflows | Library, Unfoldered filter, folders, tags, favorites/trash, bulk ZIPs, moodboards, projects/shot lists, characters, prompt presets, backup/restore | Browser persistence, PNGs, ZIPs and workspace restoration tested. Character references do not guarantee identity consistency. |
| Accounts/cloud | Email accounts, confirmation/recovery, private media/project sync, invitation links, roles, conflicts and sign-out isolation | Cloud lifecycle and authorization tested with fixtures; production RLS inspected. All real multi-user scenarios and Google OAuth are not certified. |
| Commerce | Razorpay prepaid checkout/webhooks, idempotent grants/refunds, credit reservation, server-recomputed generation quotes | HTTP fixtures cover price mismatches, stale/tampered quotes, replay and failed requests. Actual Razorpay checkout and owner-funded generation await merchant/provider setup. |

The seven engines are integrated from their separately licensed browser releases. ArtCraft's web platform and private backend are not reused. Engine-specific browser limitations include PhotoCraft's native recovery/server-document features, FilmCraft's thread-dependent proxies/render previews/Project Manager/mask tracking, LightCraft's unwired preset-file picker and platform-specific codecs, PDF features still incomplete upstream, and native font/automation or external plugin workflows.

Exact reference capabilities still missing include Suno's licensed music/remix/sound/sample service, Midjourney partner access, Beeble SwitchX relighting/replacement, ArtCraft's private identity-transfer service, newer model versions not yet integrated and verified, Marble's dedicated recaption toggle, and the reference's model-family/variant selection interface. Adapters are not a one-for-one model count comparison.

## Visible controls and first-use fixes

The follow-up audit found a real ACE-Step mapping bug: the main composer wrote a generic prompt while the adapter required `tags`. The composer now sends music style as `tags`, and lyrics, numeric duration and instrumental selection as their documented inputs. New audio composers start with ACE-Step. MiniMax has visible lyrics and style, while its model-selected length is stated explicitly. Speech shows text, voice and speed; sound effects show supported duration. Audio no longer shows an image aspect ratio. Compatible song models preserve lyrics when switching; local route changes retain duration drafts.

Video duration is visible before opening More settings, using each adapter's actual enum or numeric range. Hunyuan 3D input-image references and video start/end references are mapped to their endpoint-specific fields. Required media uploads remain usable through reference images; the form does not force a duplicate raw URL. VFX results stay associated with their workflow, and an unrelated completed job no longer replaces the current generator's result list.

Vocal preference and excluded styles for ACE-Step/MiniMax are added as **prompt guidance**. Their schemas have no hard singer-gender or negative-style field, so these preferences are not guaranteed. MiniMax's description/schema disagree on the maximum style length; the UI uses the conservative 300-character limit. ACE-Step accepts 5–240 seconds; MiniMax music has no duration parameter. Native audio playback on asset cards shows the actual decoded length.

Canvas is a transparent drawing surface, not a pre-generated scene. Its empty state now offers image import, a code-drawn editable example, drawing steps and mask instructions. The import/export toolbar remains visible while scrolling. Completed drawing actions save immediately, so a fast reload does not rely on the previous half-second save timer. Empty export/AI actions are disabled, and masked AI editing asks for a painted mask. The example, undo/redo, persistence, mobile fit and PNG workflow are covered by browser checks. A paid AI canvas output is still not certified.

The Quick guide now covers 20 workflows with input, action and output steps, and the individual tools have expandable guidance. The guide distinguishes local editing, provider AI and signed-in cloud sync.

| User-facing workflow | Compared with ArtCraft | Remaining limitation |
| --- | --- | --- |
| Image creation and AI editing | Prompts, references, model settings, results/library | Midjourney/private identity transfer and newer unintegrated model versions |
| Video creation | Visible duration, model-specific settings, image references and playback | ArtCraft's newer default Seedance 2.5 and its family/variant picker are not integrated |
| Music / speech / effects | Explicit lyrics, style and supported duration; vocal/exclusion guidance; output playback | Suno music/remix/sample services; guaranteed gender/exclusions are not supported by current song endpoints |
| AI canvas | Layered composition, imported images, masks and AI handoff | Independently implemented; model-dependent AI quality remains untested live |
| 3D object / scene / worlds | Generation adapters, import/view, transforms, poses, cameras and exports | Paid 3D/world generation not run in this audit; reference native/private platform features are separate |
| Video background / VFX / timeline | Local chroma key, AI mask contracts, compositing and actual media exports | SwitchX relighting is not replicated; AI video transforms require compatible source media and provider access |
| Moodboard / frames / assets / projects | Local workflows, persistence, PNG/ZIP exports, reuse and cloud interfaces | All real multi-user sync and invitation scenarios are not certified |
| Seven Crafting Apps | Browser engine startup and representative real export checks | Native automation, codecs, plugins and upstream browser restrictions listed above remain separate |

Verification combines real browser drawing/WebGL/media exports with mocked provider/cloud contracts. The new composer checks validate submitted bodies with the actual server adapters, check every configured video duration, and exercise song/speech/effect controls. No claim of universal live provider success is made.

Primary references: [ACE-Step API](https://fal.ai/models/fal-ai/ace-step/api), [MiniMax Music API](https://fal.ai/models/fal-ai/minimax-music/v2/api), [ArtCraft audio request builder](https://github.com/storytold/artcraft/blob/main/frontend/libs/omni-gen/src/lib/omni-gen-audio.ts), [ArtCraft video composer](https://github.com/storytold/artcraft/blob/main/frontend/libs/components/promptbox/src/lib/PromptBoxVideo.tsx). ArtCraft's public audio composer exposes style/instrumental controls but not every requested song parameter; the explicit lyrics and guidance controls here extend that behavior using supported providers.

## Pricing update: basic prepaid balance

The earlier proposed USD subscriptions were replaced at the owner's request. Free local tools stay available. Customer key entry has been removed and paid AI generation is marked Coming soon. The site now offers one-time **₹100, ₹500 and ₹1,000** top-ups, no automatic renewal and no expiry. One internal credit represents ₹0.01; customers see rupees.

| Generation | Reviewed Fal cost (USD) | ConvertShorts price before INR rounding (USD) |
| --- | --- | --- |
| FLUX Schnell 1024 × 1024 | $0.006 (two rounded-up MP) | $0.0072 |
| Nano Banana 2 1K / 2K / 4K | $0.08 / $0.12 / $0.16 | $0.096 / $0.144 / $0.192 |
| Kling 2.6 5s without audio | $0.35 | $0.42 |
| Kling 2.6 5s with audio | $0.70 | $0.84 |
| Kling 2.6 10s with audio | $1.40 | $1.68 |
| ACE-Step 60s music | $0.012 | $0.0144 |
| MiniMax Music 2 song | $0.03 | $0.036 |

The formula is Fal cost × **1.20**, then daily USD/INR conversion and one final round-up to the next paise. Cheap requests no longer have a whole-US-cent credit minimum. The hosted allowlist now includes the two priced song models. Other models are disabled, planned previews. Current rate availability and actual business credentials gate live checkout/generation.

A 20% markup leaves a 16.67% gross margin on selling price before expenses, not 20% net profit. At standard Razorpay 2% plus GST on its fee, ₹100 provider cost sold for ₹120 leaves about ₹17.17 after payment processing, before FX, hosting and other business/tax costs. Own-key generation earns no generation markup.

Razorpay orders are priced server-side, tied to the authenticated account and kept in a server-only RLS table. The browser callback and raw-body signed webhook both fetch/check a captured, unrefunded INR payment before a row-locked, idempotent credit transaction. Test payments award no live credits and disable hosted generation. The standalone checkout page avoids media-engine isolation headers.

Local HTTP tests validate fixed order amounts, account ownership, signature rejection, capture/currency/amount checks, callback/webhook replay and isolated test mode. Database transaction verification rolls back all fixtures. CI also checks the payment UI, precise composer quotes and mobile layout. Real purchases and funded Fal outputs are not certified without merchant/provider setup. Purchase refunds require owner reconciliation; full chargeback/debt automation is not included.

Activation instructions, exact secret names and webhook URL are in [studio setup](../apps/studio/README.md#simple-prepaid-pricing-and-razorpay-activation). Razorpay merchant secrets and the funded business Fal key have not been supplied, so live payments remain disabled.

## Primary references

- [ArtCraft apps](https://getartcraft.com/apps), [marketing pricing](https://getartcraft.com/pricing), [app monthly/annual pricing](https://app.getartcraft.com/pricing)
- [Storytold repositories](https://github.com/orgs/storytold/repositories?type=all), [ArtCraft reference](https://github.com/storytold/artcraft)
- [FLUX Schnell cost](https://fal.ai/models/fal-ai/flux/schnell)
- [Nano Banana 2 cost](https://fal.ai/models/fal-ai/nano-banana-2), [edit cost](https://fal.ai/models/fal-ai/nano-banana-2/edit)
- [Kling text-to-video cost](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video), [image-to-video cost](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video)
- [Razorpay fees](https://razorpay.com/pricing/), [checkout verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook signatures](https://razorpay.com/docs/webhooks/validate-test/)
- [ACE-Step pricing](https://fal.ai/models/fal-ai/ace-step), [MiniMax Music 2 pricing](https://fal.ai/models/fal-ai/minimax-music/v2)
- [Frankfurter daily FX API](https://frankfurter.dev/)

## Current premium/customer release

Rechecked `getartcraft.com/apps`, the live public ArtCraft navigation and `storytold/artcraft` main source. Seven browser editors are integrated, **not all 44 repositories in the Storytold organization**. Public ArtCraft navigation includes image/video/audio/object/world creation, image/3D/video editors, video background change, moodboard, frame extraction and asset folders. ConvertShorts has corresponding local workspace routes, but route presence does not establish paid AI feature parity.

| Capability | ConvertShorts current status |
| --- | --- |
| Seven Crafting Apps listed on the public apps page | Browser engines integrated and separately attributed; existing CI exercises import/export contracts |
| Image / image editing / text-to-video / image-to-video / music | Controls and credit backend implemented; coming soon until merchant credentials and real funded-output tests |
| Lyrics / style / excluded styles / vocal preference | Visible song controls; exclusion and voice preference are model prompt guidance, not guarantees |
| Video duration | Visible model-specific duration; first hosted Kling launch supports 5/10 seconds |
| Canvas / moodboard / frame extractor | Local layers, masks, undo, reference guidance, PNG/ZIP exports; native AI mask models planned |
| 3D scenes / worlds | Mesh and Gaussian viewing/composition, pose controls, cameras, file exports; world/object AI generation planned |
| Background change | Local chroma key/compositing with audio-preserving WebM; AI segmentation/VFX planned |
| Suno / Midjourney / SwitchX relighting | Missing; not advertised as included |
| Angles / Storyboard / image and video watermark-removal modules in ArtCraft source | No one-for-one equivalents; ConvertShorts shot lists are a simpler planning workflow |
| Native desktop integrations / full organization repository catalog | Not replicated |
| Accounts / cloud library | Email/password, recovery, private workspace sync, 500 MB media allowance, 150 MB/file, immutable 30-day record deadline and scheduled physical cleanup |
| Checkout | ₹100/500/1,000 prepaid balances, all same launch models; public purchases disabled while backend setup/testing continues |

Original generated artwork, premium studio and static public marketing pages were added. Home no longer waits for account/billing bootstrap, full cloud blobs are no longer eagerly fetched, media has on-demand URL renewal and library lists are paginated. This verifies the loading dependency change, not a universal customer-device speed claim. First-time native engine downloads remain large.

The 20% is a markup on generation cost, not net profit. Its gross margin is 16.67% of sales before processing fees, FX differences, storage, hosting and taxes. Free cloud storage has costs even for users who never buy AI balance; monitor usage before increasing the allowance.

Primary references: [ArtCraft apps](https://getartcraft.com/apps), [live studio](https://app.getartcraft.com/), [Storytold repositories](https://github.com/orgs/storytold/repositories?type=all), [MainApp source](https://github.com/storytold/artcraft/blob/main/frontend/apps/artcraft/app/src/pages/MainApp.tsx).
