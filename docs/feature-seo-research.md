# Feature-page SEO research and implementation

Research date: 20 September 2026. Scope: the five new ConvertShorts feature pages. Existing converter and creative-tool content is unchanged.

## Method and limits

Reviewed ten relevant competitor landing pages across the five features, using live web searches and direct inspection of their page titles, headings, instructions, FAQs, links and product claims. The numbered sample below is an audit list, **not a verified Google top-ten ranking**. Search results vary by query, country, device and time. The search provider returned some irrelevant results; these were excluded. Direct product pages supplemented the results where needed.

No Keyword Planner, Search Console or paid keyword-volume dataset was available. Query priorities are qualitative search-intent choices, not measured monthly search volumes. No rankings, traffic gains or rich results are promised. Competitor wording, ratings and user counts were not copied into ConvertShorts.

Representative searches: “image resizer”, “merge PDF”, “video compressor”, “online video editor”, “compress image to 100kb”, “resize pdf pages”, and “youtube thumbnail maker”. Broader design searches were less specific, so thumbnail pages were used for the supported design use case.

## Ten-page audit

| # | Page reviewed | Observed search/content pattern | Application to ConvertShorts |
| --- | --- | --- | --- |
| 1 | [ImageResizer](https://imageresizer.com/) | Direct image-resizer title, immediate file action, dimensions workflow, privacy and related format links | Explain pixel resizing, local processing and actual format support; retain the editor near the top |
| 2 | [Adobe Express image resizer](https://www.adobe.com/express/feature/image/resize) | Photo resizing steps, social presets, format and mobile questions | Explain fit versus crop and our available presets; avoid promising every browser or format |
| 3 | [iLovePDF merge PDF](https://www.ilovepdf.com/merge_pdf) | Focused merge intent, choosing multiple files and ordering before export | Give specific instructions for our page selection, arrows and combined export |
| 4 | [Smallpdf merge PDF](https://smallpdf.com/merge-pdf) | Combine/merge terminology, reorder workflow, follow-on document actions | Explain combining documents and extracting pages; link to the existing document converter for other formats |
| 5 | [FreeConvert video compressor](https://www.freeconvert.com/video-compressor) | File-size goals, quality/bitrate choices, formats and compression explanations | Describe the approximate MB target, trimming first, and quality trade-offs; do not adopt their format coverage |
| 6 | [Clideo video compressor](https://clideo.com/compress-video) | Attachment use cases, short workflow, preview, quality and mobile FAQs | Add a practical strict-size-limit example, preview/download advice and realistic phone limitations |
| 7 | [Canva thumbnail maker](https://www.canva.com/create/youtube-thumbnails/) | Dedicated thumbnail intent, templates, text/images, sizes and export questions | Describe our thumbnail template and layer workflow, with accurate downloadable formats |
| 8 | [Adobe Express thumbnail maker](https://www.adobe.com/express/create/thumbnail/youtube) | Image choice, text, branding, canvas dimensions and step-by-step creation | Add a concise thumbnail/social design guide tied to our three starting templates and controls |
| 9 | [Kapwing video editor](https://www.kapwing.com/video-editor) | Timeline editing, trim/split, text, transitions, formats and export workflow | Explain our basic timeline and manual captions; do not claim AI subtitles, collaboration or 4K exports |
| 10 | [123apps online video editor](https://online-video-cutter.com/video-editor) | Browser editing, timeline assembly, framing, download and no-account questions | Explain joining clips and shared canvas dimensions; retain our actual project and memory limits |

These pages offer different products. Their paid plans, feature limits, security statements and performance claims are not facts about ConvertShorts.

## Query-to-page mapping

| Page | Primary intent | Supporting questions covered |
| --- | --- | --- |
| `/image-tools` | Free image resizer and compressor online | Resize in pixels, compress image to 50/100/200 KB, crop without stretching, WebP to JPG, PNG to JPG, transparency, quality and single-file limits |
| `/pdf-tools` | Merge, split, resize and compress PDF | Reorder/delete/extract pages, split to individual files, resize to A4/Letter, searchable text, image-based compression, exact-size limitations |
| `/video-tools` | Video compressor, trimmer and resizer | Reduce MP4 size, approximate MB targets, 9:16/16:9/square output, crop versus fit, MOV support, mobile export and quality |
| `/design-studio` | Online design and thumbnail maker | YouTube thumbnail template, social graphics, text on photos, layer order, output formats, dimensions and project persistence |
| `/video-editor` | Online video editor without watermark | Merge/split/trim clips, remove a middle section, add manual text/music, fade transitions, mixed dimensions and export limits |

The original `/` page keeps its scene-based aspect-ratio converter focus. `/pdf` remains the document/format converter. The new video utility focuses on one-clip preparation; the editor focuses on assembling multiple clips. Contextual links explain when to switch tools without duplicating their content.

## Implemented on each feature page

- Unique descriptive title and meta description, preserved after JavaScript mounts.
- Existing clean URL and self-referencing canonical retained.
- Static, visible H1 and introduction; one H1 before and after the editor loads.
- Three-step instructions, feature-specific explanations, an accessible format/dimension table and six FAQs.
- FAQs use native disclosure controls; their full answers are in the HTML.
- Related-tool links and visible breadcrumbs with matching structured breadcrumb data.
- Open Graph title, description, URL and site name; Twitter summary metadata.
- JSON-LD WebPage, WebApplication and BreadcrumbList data. Application features and zero-price offer reflect the actual free tool. No invented ratings, testimonials or awards.
- Sitemap last-modified dates updated for these five pages only.
- Scoped guide styles; editing workspaces stay before the long-form information.

FAQ content helps visitors. No FAQ or HowTo rich-result eligibility is claimed. WebApplication describes the product; it does not guarantee a software rich result. Social metadata currently provides text previews, not a bespoke share-image asset.

## Accuracy checks

Copy was checked against `studio/README.md` and the actual image, PDF, design and video modules. In particular:

- Image target size applies to JPG/WebP quality reduction and does not automatically lower dimensions. No AI upscaling or background removal.
- PDF split downloads a ZIP of individual pages; page ranges can be manually selected and combined. Raster compression removes searchable text. No OCR, exact KB target, password removal or signature-preservation claim.
- Video input is limited to playable files and 250 MB total. Output is re-encoded, 30 fps, up to 1920 px per side. Targets are approximate.
- The designer has three templates and flattened image downloads, not cloud projects or a stock library.
- The editor provides manually entered per-clip text, one music track and fades through black. No automated subtitles, advanced AI effects or CapCut/Canva account integration.
- Workspaces are temporary; users should download before leaving.

## Search guidance used

[Google’s SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) supports useful original content, clear structure, descriptive links and crawlable resources. [Google’s title guidance](https://developers.google.com/search/docs/appearance/title-link) informs descriptive, page-specific titles aligned with visible headings. [Google’s breadcrumb documentation](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) and [Schema.org WebApplication](https://schema.org/WebApplication) inform the structured data.

## Verification and measurement

`python tests/seo-pages.py` checks static headings/content, canonicals, metadata consistency, JSON-LD references, internal link targets and sitemap coverage. Browser CI also checks the JavaScript-rendered title/H1, FAQ interaction, mobile overflow and existing real file exports.

After Google recrawls, use a verified Search Console property to inspect the five URLs and monitor impressions, clicks and queries. Sitemap inclusion is completed in code; Search Console submission and indexing requests have not been performed. Use actual query data before creating additional landing pages; avoid near-duplicate pages for every keyword variation.
