# ConvertShorts Fal pricing and generation credits — 2026-10-10

Customer credits have a fixed value: **1 generation credit = ₹1**. Fractional credits are supported. Top-ups award their full value: ₹100 → 100 credits, ₹500 → 500, ₹1,000 → 1,000. The database and legacy API accounting remain INR paise; no grant or balance data is converted.

Every quoted generation uses **reviewed Fal cost × 1.20 × current USD/INR rate**, rounded up once to the final paise. A ₹200 provider cost consumes 240 generation credits (₹240), leaving 760 from 1,000. The markup is not also applied to top-ups and is not net profit.

## Scope and limitations

Official public pricing pages were fetched for all **74 Fal endpoints represented in the current studio catalog**, including the alternate Kling image endpoint. `apps/studio/price-catalog.js` is the reviewed unit-rate source for 194 price variants. Both pricing pages render and calculate retail rates from the shared markup helper. This does not inventory every endpoint in Fal's marketplace.

57 endpoints have reviewed unit rates; 12 need actual usage metering, two contain tentative rates, two have conflicting prices, and one displays an unverified zero rate. Unit rates, promotional figures, and image-output-only rates must never be used as an exact total without all billable inputs. The hosted allowlist remains the initial seven exact-priced endpoints. Catalog entries do not add new generation capabilities or certify real paid output.

Seedance 1.5 uses tokens = height × width × FPS × duration / 1024. Its provider example of roughly $0.26 for a five-second 720p clip with audio becomes roughly $0.312 before FX. Exact charging needs verified dimensions/FPS and provider reconciliation. Tripo provider credits are a different unit from ConvertShorts customer credits. GPT image token pricing needs actual text/reasoning/reference/image tokens. MiniMax H3 text-to-video shows inconsistent promotional dates/rates and stays blocked. BiRefNet video's $0/compute-second notice is not advertised as free AI.

The UI shows USD rates even if live FX is unavailable; it does not invent a rupee price. Daily INR unit equivalents are illustrative and rounded individually. Billing rounds complete requests once after summing the total, checks the price version and amount on the server, reserves balance atomically, and refunds confirmed failed jobs. Fal may charge some client-side failures; customer refunds then become an operating cost. Uncertain submission status requires owner reconciliation.

Payments and hosted AI remain Coming soon. No actual merchant purchase or funded business-provider generation has been performed as part of this review. Reviewed prices are snapshots, not automatic live invoice matching. Recheck prices, discounts, promotions and supported options before enabling any additional model.

## Sources

Each row in the live price catalog links directly to the corresponding official pricing page. The pages reviewed are:

- [fal-ai/flux/schnell](https://fal.ai/models/fal-ai/flux/schnell)
- [fal-ai/flux-2](https://fal.ai/models/fal-ai/flux-2)
- [fal-ai/nano-banana-2](https://fal.ai/models/fal-ai/nano-banana-2)
- [fal-ai/nano-banana-2/edit](https://fal.ai/models/fal-ai/nano-banana-2/edit)
- [fal-ai/kling-video/v2.6/pro/text-to-video](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video)
- [fal-ai/stable-audio-25/text-to-audio](https://fal.ai/models/fal-ai/stable-audio-25/text-to-audio)
- [fal-ai/trellis-2](https://fal.ai/models/fal-ai/trellis-2)
- [fal-ai/hunyuan_world/image-to-world](https://fal.ai/models/fal-ai/hunyuan_world/image-to-world)
- [fal-ai/bria/background/remove](https://fal.ai/models/fal-ai/bria/background/remove)
- [fal-ai/image-editing/background-change](https://fal.ai/models/fal-ai/image-editing/background-change)
- [fal-ai/kling-video/v2.6/pro/image-to-video](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video)
- [bytedance/seedream/v5/lite/text-to-image](https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image)
- [bytedance/seedream/v5/pro/edit](https://fal.ai/models/bytedance/seedream/v5/pro/edit)
- [bytedance/seedream/v5/pro/text-to-image](https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image)
- [fal-ai/ace-step](https://fal.ai/models/fal-ai/ace-step)
- [fal-ai/bria/eraser](https://fal.ai/models/fal-ai/bria/eraser)
- [fal-ai/bria/expand](https://fal.ai/models/fal-ai/bria/expand)
- [fal-ai/bytedance/seedance/v1.5/pro/image-to-video](https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/image-to-video)
- [fal-ai/bytedance/seedance/v1.5/pro/text-to-video](https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/text-to-video)
- [fal-ai/bytedance/seedream/v4.5/edit](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit)
- [fal-ai/bytedance/seedream/v4.5/text-to-image](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image)
- [fal-ai/clarity-upscaler](https://fal.ai/models/fal-ai/clarity-upscaler)
- [fal-ai/elevenlabs/sound-effects/v2](https://fal.ai/models/fal-ai/elevenlabs/sound-effects/v2)
- [fal-ai/elevenlabs/tts/multilingual-v2](https://fal.ai/models/fal-ai/elevenlabs/tts/multilingual-v2)
- [fal-ai/flux-2-pro](https://fal.ai/models/fal-ai/flux-2-pro)
- [fal-ai/flux-2-pro/edit](https://fal.ai/models/fal-ai/flux-2-pro/edit)
- [fal-ai/flux-2/edit](https://fal.ai/models/fal-ai/flux-2/edit)
- [fal-ai/flux-pro/kontext](https://fal.ai/models/fal-ai/flux-pro/kontext)
- [fal-ai/flux-pro/v1.1-ultra](https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra)
- [fal-ai/flux-pro/v1.1](https://fal.ai/models/fal-ai/flux-pro/v1.1)
- [fal-ai/flux/dev](https://fal.ai/models/fal-ai/flux/dev)
- [fal-ai/gpt-image-1.5](https://fal.ai/models/fal-ai/gpt-image-1.5)
- [fal-ai/gpt-image-1.5/edit](https://fal.ai/models/fal-ai/gpt-image-1.5/edit)
- [fal-ai/hunyuan-3d/v3.1/part](https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/part)
- [fal-ai/hunyuan-3d/v3.1/pro/image-to-3d](https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d)
- [fal-ai/hunyuan-3d/v3.1/pro/text-to-3d](https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/pro/text-to-3d)
- [fal-ai/hunyuan-3d/v3.1/rapid/image-to-3d](https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/rapid/image-to-3d)
- [fal-ai/hunyuan-3d/v3.1/rapid/text-to-3d](https://fal.ai/models/fal-ai/hunyuan-3d/v3.1/rapid/text-to-3d)
- [fal-ai/hunyuan3d/v2/multi-view](https://fal.ai/models/fal-ai/hunyuan3d/v2/multi-view)
- [fal-ai/ideogram/v3](https://fal.ai/models/fal-ai/ideogram/v3)
- [fal-ai/image-editing/object-removal](https://fal.ai/models/fal-ai/image-editing/object-removal)
- [fal-ai/kling-video/v1.6/pro/text-to-video](https://fal.ai/models/fal-ai/kling-video/v1.6/pro/text-to-video)
- [fal-ai/kling-video/v2.5-turbo/pro/image-to-video](https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video)
- [fal-ai/kling-video/v3/pro/image-to-video](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video)
- [fal-ai/kling-video/v3/pro/motion-control](https://fal.ai/models/fal-ai/kling-video/v3/pro/motion-control)
- [fal-ai/kling-video/v3/pro/text-to-video](https://fal.ai/models/fal-ai/kling-video/v3/pro/text-to-video)
- [fal-ai/meshy/v6/image-to-3d](https://fal.ai/models/fal-ai/meshy/v6/image-to-3d)
- [fal-ai/meshy/v6/text-to-3d](https://fal.ai/models/fal-ai/meshy/v6/text-to-3d)
- [fal-ai/minimax-music/v2](https://fal.ai/models/fal-ai/minimax-music/v2)
- [fal-ai/minimax/hailuo-2.3/standard/image-to-video](https://fal.ai/models/fal-ai/minimax/hailuo-2.3/standard/image-to-video)
- [fal-ai/nano-banana-pro](https://fal.ai/models/fal-ai/nano-banana-pro)
- [fal-ai/nano-banana-pro/edit](https://fal.ai/models/fal-ai/nano-banana-pro/edit)
- [fal-ai/triposplat](https://fal.ai/models/fal-ai/triposplat)
- [fal-ai/veo3.1](https://fal.ai/models/fal-ai/veo3.1)
- [fal-ai/veo3.1/fast](https://fal.ai/models/fal-ai/veo3.1/fast)
- [fal-ai/veo3.1/fast/image-to-video](https://fal.ai/models/fal-ai/veo3.1/fast/image-to-video)
- [fal-ai/veo3.1/image-to-video](https://fal.ai/models/fal-ai/veo3.1/image-to-video)
- [fal-ai/vidu/q3/text-to-video](https://fal.ai/models/fal-ai/vidu/q3/text-to-video)
- [fal-ai/wan-25-preview/text-to-video](https://fal.ai/models/fal-ai/wan-25-preview/text-to-video)
- [minimax/h3-max/reference-to-video](https://fal.ai/models/minimax/h3-max/reference-to-video)
- [minimax/h3-max/text-to-video](https://fal.ai/models/minimax/h3-max/text-to-video)
- [openai/gpt-image-2.5/flare/edit](https://fal.ai/models/openai/gpt-image-2.5/flare/edit)
- [openai/gpt-image-2.5/flare/text-to-image](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image)
- [openai/gpt-image-2.5/sunburst/edit](https://fal.ai/models/openai/gpt-image-2.5/sunburst/edit)
- [openai/gpt-image-2.5/sunburst/text-to-image](https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image)
- [openai/gpt-image-2](https://fal.ai/models/openai/gpt-image-2)
- [openai/gpt-image-2/edit](https://fal.ai/models/openai/gpt-image-2/edit)
- [tripo3d/p1/text-to-3d](https://fal.ai/models/tripo3d/p1/text-to-3d)
- [tripo3d/p2/image-to-3d](https://fal.ai/models/tripo3d/p2/image-to-3d)
- [tripo3d/triposplat](https://fal.ai/models/tripo3d/triposplat)
- [xai/grok-imagine-video/image-to-video](https://fal.ai/models/xai/grok-imagine-video/image-to-video)
- [xai/grok-imagine-video/text-to-video](https://fal.ai/models/xai/grok-imagine-video/text-to-video)
- [fal-ai/birefnet/v2/video](https://fal.ai/models/fal-ai/birefnet/v2/video)
- [bria/video/background-removal](https://fal.ai/models/bria/video/background-removal)
