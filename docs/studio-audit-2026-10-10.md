# ConvertShorts studio audit — 10 October 2026

## Result

ConvertShorts has working browser editors and an independently implemented creative studio. It does not yet have complete ArtCraft platform parity. The owner's successful image-to-video generation confirms that paid provider path; it does not prove every model, merchant purchase or cloud collaboration scenario.

The live public configuration before this update reported 77 model adapters, private cloud configuration enabled, Google login disabled, and both hosted generation and merchant checkout disabled. Six isolated `convertshorts_` tables had row-level security enabled. The existing billing Edge Function was active. User-funded Fal generation and owner-funded credit generation are separate paths.

## Coverage and evidence

| Area | Implemented | Verification and limits |
| --- | --- | --- |
| Seven Crafting Apps | PhotoCraft, VectorCraft, FilmCraft, LightCraft, PdfCraft, EffectCraft and DesignCraft; pinned local browser distributions and license notices | Release/checksum/runtime checks; CI exercises browser startup and representative real exports. Native CLI/MCP workflows remain separate. |
| Image/video/audio/3D/world AI | 77 adapters with model-specific inputs; own-key Fal and separate World Labs access | Input, request, polling, cancellation and response contracts tested with HTTP fixtures. Owner reports a successful real image-to-video request. Every paid model has not been run. |
| Canvas | Layers, drawing, erasing, shapes, text, masks, undo, persisted composition and PNG export; AI actions | Browser workflows and persistence tested. Paid canvas generations still need a funded, compatible provider key. |
| 3D and world studios | Mixed meshes, image planes, Gaussian environments, object/joint poses, cameras, scene persistence, PNG/mesh GLB export; PLY/SPLAT/SPZ/SOG/KSPLAT viewing | Browser tests use real WebGL, generated fixture splats and export/reimport. Gaussian assets remain separate from mesh GLB exports. |
| Video tools | Advanced FilmCraft timeline, quick editor, local chroma key and AI mask compositing, audio-preserving WebM, individual/burst frame extraction | Real H.264/AAC and WebM export checks; actual frame pixel checks and ZIP contents. Segmentation/compositing does not provide SwitchX's exact relighting service. |
| Assets/workflows | Library, Unfoldered filter, folders, tags, favorites/trash, bulk ZIPs, moodboards, projects/shot lists, characters, prompt presets, backup/restore | Browser persistence, PNGs, ZIPs and workspace restoration tested. Character references do not guarantee identity consistency. |
| Accounts/cloud | Email accounts, confirmation/recovery, private media/project sync, invitation links, roles, conflicts and sign-out isolation | Cloud lifecycle and authorization tested with fixtures; production RLS inspected. All real multi-user scenarios and Google OAuth are not certified. |
| Commerce | Stripe checkout/portal/webhooks, idempotent grants/refunds, credit reservation, server-recomputed generation quotes | HTTP fixtures cover price mismatches, stale/tampered quotes, replay and failed requests. Actual Stripe checkout and owner-funded generation await merchant/provider setup. |

The seven engines are integrated from their separately licensed browser releases. ArtCraft's web platform and private backend are not reused. Engine-specific browser limitations include PhotoCraft's native recovery/server-document features, FilmCraft's thread-dependent proxies/render previews/Project Manager/mask tracking, LightCraft's unwired preset-file picker and platform-specific codecs, PDF features still incomplete upstream, and native font/automation or external plugin workflows.

Exact reference capabilities still missing include Suno's licensed music/remix/sound/sample service, Midjourney partner access, Beeble SwitchX relighting/replacement, ArtCraft's private identity-transfer service, certain latest model versions, Marble's dedicated recaption toggle, and the reference's model-family/variant selection interface. Adapters are not a one-for-one model count comparison.

## Pricing prepared in this update

ArtCraft's app pricing selector showed promotional monthly Basic $10, Pro $35 and Max $60. Its public marketing page showed annual effective rates $8/$28/$48, charged $96/$336/$576 yearly, with 1,000/3,750/6,600 monthly credits. Offers can change. Competitor credits are not equivalent to ConvertShorts credits.

| ConvertShorts offer | USD price | ConvertShorts credits |
| --- | --- | --- |
| Free local tools | $0 | Own-key AI uses the user's provider balance |
| Starter | $7/month | 700/month |
| Creator | $24/month | 2,400/month |
| Studio | $42/month | 4,200/month |
| Credit pack | $5 once | 500, no expiry |

Monthly allowances expire at the end of their grant period. One ConvertShorts credit represents $0.01 of retail generation value. These lower subscription prices also include lower retail allowances; they are not a promise of equivalent ArtCraft generation volume.

Own-key generation earns no ConvertShorts generation markup. Hosted credits use the business's server-side Fal key and a 25% provider-cost markup, then round the complete request up to whole credits. This corresponds to approximately 20% gross margin before payment/FX fees, hosting/storage, support, taxes, refunds and customer acquisition. It is not net profit. Low-cost image rounding and conservatively costed FLUX presets can have different margins. Actual provider invoices and business costs must be monitored.

The launch hosted allowlist covers FLUX Schnell, Nano Banana 2 generation/editing and Kling 2.6 Pro text/image-to-video. Other adapters remain own-key only until their parameter-dependent costs are verified. Examples: Nano Banana 1K/2K/4K costs 10/15/20 credits per image; Kling 5 seconds costs 44 without audio or 88 with audio, and 10 seconds with audio costs 175. Batch, resolution, duration and audio changes update the composer quote. A fresh server quote is checked before submission; the backend rejects a stale quote before reserving credits.

## Activation checklist

1. Use a dedicated, funded business Fal key as `CONVERTSHORTS_FAL_KEY` in the existing billing Edge Function's secret settings. Do not expose the key in client code or chat.
2. Create Stripe USD monthly prices of $7/$24/$42 and a one-time $5 pack. Add only their price IDs to `CONVERTSHORTS_STRIPE_PLANS` using the four documented offer IDs. Checkout checks amount, currency and recurrence.
3. Configure `CONVERTSHORTS_STRIPE_SECRET_KEY`, `CONVERTSHORTS_STRIPE_WEBHOOK_SECRET`, the documented webhook events and the Stripe customer portal. Review the account's payment/FX costs and applicable checkout/tax configuration.
4. Keep `CONVERTSHORTS_HOSTED_ENABLED` off until the business funds and tests the launch flow; set it to `true` when ready. Checkout requires hosted generation and merchant configuration. No paid test request or purchase is made by this audit.
5. World Labs credentials and Google OAuth are separate optional integrations. They are not activated by a Fal key or by Stripe setup.

See [studio setup](../apps/studio/README.md) for secret names and webhook URL. Provider submission timeouts may leave reserved credits for owner review; confirmed failures are refunded idempotently.

## Primary references

- [ArtCraft apps](https://getartcraft.com/apps), [marketing pricing](https://getartcraft.com/pricing), [app monthly/annual pricing](https://app.getartcraft.com/pricing)
- [Storytold repositories](https://github.com/orgs/storytold/repositories?type=all), [ArtCraft reference](https://github.com/storytold/artcraft)
- [FLUX Schnell cost](https://fal.ai/models/fal-ai/flux/schnell)
- [Nano Banana 2 cost](https://fal.ai/models/fal-ai/nano-banana-2), [edit cost](https://fal.ai/models/fal-ai/nano-banana-2/edit)
- [Kling text-to-video cost](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video), [image-to-video cost](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video)
- [Stripe India pricing](https://stripe.com/in/pricing)
