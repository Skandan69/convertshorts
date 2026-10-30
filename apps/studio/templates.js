// Explore templates: ready-made starting points for the Creative Studio.
// Shared by the public /explore page (scripts/build-studio-pages.mjs) and the
// studio app, which pre-fills the composer from /apps/#<route>?template=<id>.
//
// Every template points at a real model id from the studio catalog
// (FALLBACK_MODELS in studio.js or apps/studio/model-catalog.json).
// `hosted: true` only for models in the hosted pricing allowlist
// (PRICE_SOURCES in pricing.js); tests/studio-templates.mjs enforces this.
//
// `preview` is optional: add '/assets/explore/<id>.webp' (or .mp4) once a real
// sample has been generated with the studio. Until then the card shows a
// designed poster, never a fake "output".

export const TEMPLATE_CATEGORIES = [
  {id: 'video', label: 'Video'},
  {id: 'image', label: 'Image'},
  {id: 'edit', label: 'Photo edit'},
  {id: 'music', label: 'Music'},
  {id: 'remix', label: 'Remix'}
];

export const TEMPLATES = [
  // ---------------------------------------------------------------- video
  {
    id: 'temple-dawn-orbit', category: 'video', title: 'Temple at Dawn Orbit',
    blurb: 'A slow aerial orbit around a hilltop temple as the sun rises.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '16:9', duration: 10},
    prompt: 'Slow cinematic drone orbit around an ancient stone temple on a misty hilltop at sunrise, golden light breaking through clouds, birds circling the tower, gentle haze in the valley below, smooth steady camera, realistic detail',
    colors: ['#f2b56b', '#4b2f5c']
  },
  {
    id: 'monsoon-chai-stall', category: 'video', title: 'Monsoon Chai Stall',
    blurb: 'Steam, rain and a warm roadside stall, made for Reels.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '9:16', duration: 5},
    prompt: 'Close-up of chai being poured from a height into small glass cups at a roadside stall during heavy monsoon rain, steam rising, rain dripping from a tin roof, warm bulb light, shallow depth of field, slow motion',
    colors: ['#d98a3a', '#1f3b4d']
  },
  {
    id: 'product-turntable', category: 'video', title: 'Product Turntable',
    blurb: 'A clean 360° spin for any product launch post.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '1:1', duration: 5},
    prompt: 'A luxury perfume bottle slowly rotating on a glossy turntable, soft studio lighting with a moving highlight, subtle reflections, dark gradient background, premium commercial look',
    colors: ['#c9b4fc', '#191a20']
  },
  {
    id: 'diwali-diyas', category: 'video', title: 'Diwali Diyas Glow',
    blurb: 'Flickering diyas with a soft rack focus for festive greetings.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '9:16', duration: 5},
    prompt: 'Rows of clay diyas flickering on a marble floor at night, rangoli patterns, slow rack focus from the nearest flame to fairy lights in the background, warm bokeh, festive and calm',
    colors: ['#ffb347', '#3a1430']
  },
  {
    id: 'anime-power-up', category: 'video', title: 'Anime Power-Up',
    blurb: 'A hero’s glowing ring awakens: an anime transformation beat.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '16:9', duration: 5},
    prompt: 'Anime style: a teenage hero in a navy school blazer stands in a ruined courtyard, a glowing ring above his head flares with golden light, wind lifts his hair and jacket, energy particles swirl upward, dramatic low camera angle, cel-shaded, high energy',
    colors: ['#ffd36b', '#1b2347']
  },
  {
    id: 'golden-hour-waves', category: 'video', title: 'Golden Hour Waves',
    blurb: 'Calm ocean waves for backgrounds, intros and music videos.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '16:9', duration: 10},
    prompt: 'Natural ocean waves rolling onto a quiet beach at golden hour, low camera just above the water, sun glinting on the surface, soft foam, peaceful and realistic',
    colors: ['#f7c873', '#1d4e6b']
  },
  {
    id: 'neon-rain-walk', category: 'video', title: 'Neon Rain Walk',
    blurb: 'A moody city stroll through rain and neon reflections.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '9:16', duration: 10},
    prompt: 'Handheld camera following a person with an umbrella through a neon-lit city street in gentle rain at night, reflections on wet pavement, glowing signs, cinematic moody colour grade',
    colors: ['#ff4fa3', '#10183a']
  },
  {
    id: 'biryani-steam-reveal', category: 'video', title: 'Biryani Steam Reveal',
    blurb: 'The lid lifts and the steam rolls out: food content that stops the scroll.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '9:16', duration: 5},
    prompt: 'Close-up of a copper handi lid being lifted to reveal fragrant biryani, thick steam rolling out, saffron rice and fried onions glistening, warm restaurant lighting, slow motion, mouth-watering food commercial',
    colors: ['#e8a33d', '#3b1e10']
  },
  {
    id: 'kite-festival', category: 'video', title: 'Rooftop Kite Festival',
    blurb: 'Colourful kites over a city skyline at Sankranti.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '9:16', duration: 5},
    prompt: 'Dozens of colourful kites flying over old city rooftops during a festival afternoon, a child on a terrace tugging a kite string, camera slowly tilting up to the sky, bright and joyful',
    colors: ['#ff6f61', '#2a6fdb']
  },
  {
    id: 'downhill-pov', category: 'video', title: 'Downhill Bike POV',
    blurb: 'Fast first-person mountain biking through a forest trail.',
    route: 'create-video', model: 'kling', modelName: 'Kling 2.6 Pro', hosted: true,
    settings: {ratio: '16:9', duration: 5},
    prompt: 'First-person POV of a mountain bike racing down a steep forest trail, roots and rocks rushing past, dappled sunlight through pine trees, motion blur, adrenaline action camera look',
    colors: ['#7fbf5a', '#20301a']
  },

  // ---------------------------------------------------------------- image
  {
    id: 'window-light-portrait', category: 'image', title: 'Window-Light Portrait',
    blurb: 'A soft, cinematic portrait with natural window light.',
    route: 'create-image', model: 'nano-banana', modelName: 'Nano Banana 2', hosted: true,
    settings: {ratio: '3:4'},
    prompt: 'Cinematic portrait of a woman by a tall window, soft natural side light, gentle shadows, film grain, muted warm palette, 85mm lens, shallow depth of field',
    colors: ['#d9b48f', '#2b2430']
  },
  {
    id: 'thumbnail-backdrop', category: 'image', title: 'Thumbnail Backdrop',
    blurb: 'A dramatic, text-ready background for YouTube thumbnails.',
    route: 'create-image', model: 'nano-banana', modelName: 'Nano Banana 2', hosted: true,
    settings: {ratio: '16:9'},
    prompt: 'Dramatic YouTube thumbnail background, explosive orange and teal lighting, bold depth, empty space on the left third for large title text, high contrast, no text',
    colors: ['#ff7b2e', '#0f6f73']
  },
  {
    id: 'pedestal-product', category: 'image', title: 'Pedestal Product Shot',
    blurb: 'Studio product photography on a sculptural pedestal.',
    route: 'create-image', model: 'nano-banana', modelName: 'Nano Banana 2', hosted: true,
    settings: {ratio: '1:1'},
    prompt: 'Studio product shot of a skincare bottle on a sculptural ivory pedestal, soft shadows, lavender gradient backdrop, premium editorial lighting, crisp detail',
    colors: ['#e9dcff', '#5b4a7a']
  },
  {
    id: 'courtyard-sunrise', category: 'image', title: 'Courtyard Sunrise',
    blurb: 'A quiet traditional Indian courtyard in the first light.',
    route: 'create-image', model: 'flux-fast', modelName: 'FLUX Schnell', hosted: true,
    settings: {},
    prompt: 'A quiet traditional Indian courtyard at sunrise, tulsi plant in the centre, carved wooden pillars, brass lamp, long soft shadows, peaceful morning atmosphere, photorealistic',
    colors: ['#f4c27a', '#5a3b2a']
  },
  {
    id: 'manga-character-sheet', category: 'image', title: 'Manga Character Sheet',
    blurb: 'Front, side and back views to keep a character consistent.',
    route: 'create-image', model: 'nano-banana', modelName: 'Nano Banana 2', hosted: true,
    settings: {ratio: '16:9'},
    prompt: 'Manga character turnaround sheet of a teenage hero with messy black hair and a navy school blazer with a red tie, front, side and back views on a plain white background, clean line art with flat colours, consistent proportions',
    colors: ['#f5f3f8', '#26314f']
  },
  {
    id: 'festive-greeting', category: 'image', title: 'Festive Greeting Card',
    blurb: 'An elegant greeting card background with space for your message.',
    route: 'create-image', model: 'nano-banana', modelName: 'Nano Banana 2', hosted: true,
    settings: {ratio: '3:4'},
    prompt: 'Elegant festive greeting card background, marigold garlands and soft diya glow framing an empty centre for text, deep maroon and gold palette, delicate paper texture, no text',
    colors: ['#f2a93b', '#5c1424']
  },
  {
    id: 'sticker-mascot', category: 'image', title: 'Sticker Mascot',
    blurb: 'A cute die-cut sticker character for your brand or channel.',
    route: 'create-image', model: 'flux-fast', modelName: 'FLUX Schnell', hosted: true,
    settings: {},
    prompt: 'Cute die-cut sticker of a cheerful cartoon tiger mascot giving a thumbs up, bold outline, white sticker border, flat vibrant colours, plain background',
    colors: ['#ffb24a', '#2f2a3a']
  },
  {
    id: 'miniature-city', category: 'image', title: 'Isometric Miniature City',
    blurb: 'A tiny, detailed city block in tilt-shift style.',
    route: 'create-image', model: 'flux-fast', modelName: 'FLUX Schnell', hosted: true,
    settings: {},
    prompt: 'Isometric miniature city block with tiny shops, auto-rickshaws and trees, tilt-shift photography look, soft daylight, highly detailed diorama',
    colors: ['#9fd8c7', '#2c4a5a']
  },

  // ---------------------------------------------------------------- photo edit
  {
    id: 'watercolor-restyle', category: 'edit', title: 'Watercolour Restyle',
    blurb: 'Turn your own photo into a soft watercolour painting.',
    route: 'ai-edit', model: 'nano-edit', modelName: 'Nano Banana 2 Edit', hosted: true, needsUpload: true,
    settings: {},
    prompt: 'Restyle this photo as a soft watercolour painting with visible paper texture and gentle colour bleeding, keep the people and composition the same',
    colors: ['#a7d3f2', '#3e5873']
  },
  {
    id: 'beach-background-swap', category: 'edit', title: 'Beach Background Swap',
    blurb: 'Keep the subject, move the scene to a sunny beach.',
    route: 'ai-edit', model: 'nano-edit', modelName: 'Nano Banana 2 Edit', hosted: true, needsUpload: true,
    settings: {},
    prompt: 'Replace the background with a sunny tropical beach at golden hour, keep the person exactly the same, match the lighting and shadows naturally',
    colors: ['#ffd27a', '#2a7a8c']
  },

  // ---------------------------------------------------------------- music
  {
    id: 'tanpura-lofi', category: 'music', title: 'Tanpura Lo-fi',
    blurb: 'A calm study beat with tanpura drone and soft percussion.',
    route: 'create-audio', model: 'fal:fal-ai/ace-step', modelName: 'ACE-Step', hosted: true,
    settings: {},
    prompt: 'lo-fi, instrumental, tanpura drone, soft tabla, warm vinyl crackle, mellow keys, relaxed, 75 bpm',
    colors: ['#c8a2ff', '#2a1f3d']
  },
  {
    id: 'devotional-phonk', category: 'music', title: 'Devotional Phonk',
    blurb: 'Heavy phonk bass under a devotional chant mood.',
    route: 'create-audio', model: 'fal:fal-ai/ace-step', modelName: 'ACE-Step', hosted: true,
    settings: {},
    prompt: 'phonk, devotional, deep 808 bass, cowbell, distorted drums, temple bells, choir chant atmosphere, energetic, 140 bpm',
    colors: ['#ff5d3b', '#1a0f1f']
  },
  {
    id: 'trailer-build', category: 'music', title: 'Cinematic Trailer Build',
    blurb: 'A rising orchestral build for trailers and intros.',
    route: 'create-audio', model: 'fal:fal-ai/ace-step', modelName: 'ACE-Step', hosted: true,
    settings: {},
    prompt: 'cinematic, orchestral, epic trailer build-up, taiko drums, rising strings, brass hits, tension and release, instrumental',
    colors: ['#e0c27a', '#1c1a2e']
  },
  {
    id: 'reels-jingle', category: 'music', title: 'Upbeat Reels Jingle',
    blurb: 'A bright, catchy song for short-form videos.',
    route: 'create-audio', model: 'fal:fal-ai/minimax-music/v2', modelName: 'MiniMax Music 2', hosted: true,
    settings: {},
    prompt: 'Upbeat pop jingle with handclaps, bright synths and a catchy whistled hook, happy summer mood, made for short videos',
    colors: ['#6ee7b7', '#13405a']
  },

  // ---------------------------------------------------------------- remix (planned models)
  {
    id: 'motion-transfer-dance', category: 'remix', title: 'Dance Motion Transfer',
    blurb: 'Keep the moves from a reference video, swap in your character.',
    route: 'video-vfx', model: 'fal:fal-ai/kling-video/v3/pro/motion-control', modelName: 'Kling 3 Motion Control', hosted: false, needsUpload: true,
    settings: {},
    prompt: 'Apply the dance movement from the reference video to the character in the image, keep the character’s face, outfit and proportions, smooth natural motion',
    colors: ['#b28dff', '#22163a']
  },
  {
    id: 'character-reference-scene', category: 'remix', title: 'Same Character, New Scene',
    blurb: 'Put your character into a new scene and keep the face consistent.',
    route: 'create-video', model: 'fal:minimax/h3-max/reference-to-video', modelName: 'MiniMax H3 Max', hosted: false, needsUpload: true,
    settings: {},
    prompt: 'The character from the reference images walks through a busy night market, looking around with curiosity, consistent face and outfit, cinematic tracking shot',
    colors: ['#ff9f6b', '#2b1b33']
  }
];

export const templateById = id => TEMPLATES.find(t => t.id === id) || null;

// Relative link into the studio composer. The studio looks the id up in this
// module, so prompts never travel through the URL and cannot be injected.
export const templateLink = t => `/apps/#${t.route}?template=${encodeURIComponent(t.id)}`;

// Draft object understood by apps/studio/generator.js.
export function templateDraft(t) {
  const draft = {model: t.model, prompt: t.prompt};
  if (t.settings?.ratio) draft.ratio = t.settings.ratio;
  if (t.settings?.duration) draft.duration = t.settings.duration;
  return draft;
}
