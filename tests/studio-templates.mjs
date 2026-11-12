// Explore templates must point at real studio models, routes and controls,
// and only claim "hosted" for models in the hosted pricing allowlist.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {TEMPLATES, TEMPLATE_CATEGORIES, templateById, templateDraft, templateLink} from '../apps/studio/templates.js';
import {supportsHostedPricing} from '../apps/studio/pricing.js';

const studio = fs.readFileSync(new URL('../apps/studio/studio.js', import.meta.url), 'utf8');
const literal = studio.match(/const FALLBACK_MODELS=(\[.*?\]);/s);
assert.ok(literal, 'FALLBACK_MODELS literal not found in studio.js');
const fallback = new Function('return ' + literal[1])();
const catalog = JSON.parse(fs.readFileSync(new URL('../apps/studio/model-catalog.json', import.meta.url), 'utf8'));
const models = new Map(fallback.concat(catalog).map(m => [m.id, m]));

// Route → model kinds the composer offers on that route (see generator.js `choices`).
const routeKinds = {'create-video': ['video'], 'create-image': ['image'], 'create-audio': ['audio'], 'ai-edit': ['edit'], 'video-vfx': ['vfx', 'video']};
const categories = new Set(TEMPLATE_CATEGORIES.map(c => c.id));
const genericRatios = ['1:1', '16:9', '9:16', '3:2', '2:3', '4:3', '3:4'];
const ids = new Set();

for (const t of TEMPLATES) {
  assert.match(t.id, /^[a-z0-9-]+$/, `bad id ${t.id}`);
  assert.ok(!ids.has(t.id), `duplicate id ${t.id}`); ids.add(t.id);
  assert.ok(categories.has(t.category), `${t.id}: unknown category ${t.category}`);
  assert.ok(t.title && t.blurb && t.prompt.length > 30, `${t.id}: missing copy`);
  assert.ok(Array.isArray(t.colors) && t.colors.length === 2 && t.colors.every(c => /^#[0-9a-f]{6}$/i.test(c)), `${t.id}: colors`);
  const model = models.get(t.model);
  assert.ok(model, `${t.id}: model ${t.model} is not in the studio catalog`);
  assert.ok(routeKinds[t.route]?.includes(model.kind), `${t.id}: ${model.kind} model cannot open on #${t.route}`);
  assert.equal(t.hosted, supportsHostedPricing(model), `${t.id}: hosted flag must match the pricing allowlist`);
  const ratios = model.schema?.properties?.aspect_ratio?.enum || genericRatios;
  if (t.settings.ratio) assert.ok(ratios.includes(t.settings.ratio), `${t.id}: ratio ${t.settings.ratio} not offered by ${t.model}`);
  if (t.settings.duration) assert.ok(model.kind === 'video' && [5, 10].includes(t.settings.duration), `${t.id}: duration`);
  if (t.category === 'remix') assert.equal(t.hosted, false, `${t.id}: remix models are planned, not hosted`);
  if (t.preview) for (const w of [384, 768]) assert.ok(fs.existsSync(new URL(`..${t.preview}-${w}.webp`, import.meta.url)), `${t.id}: missing ${t.preview}-${w}.webp`);
  assert.equal(templateById(t.id), t);
  assert.equal(templateLink(t), `/apps/#${t.route}?template=${t.id}`);
  const draft = templateDraft(t);
  assert.equal(draft.model, t.model); assert.equal(draft.prompt, t.prompt);
}
for (const c of categories) assert.ok(TEMPLATES.some(t => t.category === c), `empty category ${c}`);
assert.equal(templateById('nope'), null);

// The built page lists every template with a working Recreate link.
const page = fs.readFileSync(new URL('../explore.html', import.meta.url), 'utf8');
for (const t of TEMPLATES) assert.ok(page.includes(`href="${templateLink(t)}"`), `explore.html misses ${t.id}; run scripts/build-studio-pages.mjs`);
assert.ok(!page.includes('undefined'), 'explore.html contains "undefined"');
console.log(`PASS explore templates: ${TEMPLATES.length} templates, ${TEMPLATES.filter(t => t.hosted).length} hosted, models/routes/ratios/links verified`);
