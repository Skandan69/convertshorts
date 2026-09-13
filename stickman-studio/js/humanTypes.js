// ---------- human types registry: age presets, build presets, and skeleton scaling ----------
// This is the "different stickmans — ages, weights, heights" file. Three independent axes:
//   bodyType (age):  child / adult / elder  — changes proportions (head size, stoop) via BODY_PRESETS
//   build (weight):  slim / average / heavy — changes limb thickness via BUILD_PRESETS
//   sizeScale (height): a free 0.6x-1.6x slider, applied on top of both
// To add a new age or build preset: add one entry to the relevant object below — the character
// card's dropdowns and applyBodyScale() both read these registries, nothing else needs to change.
// headR/lw are deliberately larger than a "minimal" stick figure — bigger heads read more
// expressive faces, and thicker strokes give the bold-cartoon-outline look (vs. thin wireframe).
const BASE_GEOMETRY = { headR:22, neckLen:8, torsoLen:60, upperArm:28, foreArm:26, upperLeg:38, lowerLeg:38, lw:6, hipHeight:66 };
const BODY_PRESETS = {
  adult: { label:'Adult', scale:1.0,  headScale:1.0,  stoop:0 },
  child: { label:'Kid',   scale:0.62, headScale:1.28, stoop:0 },
  elder: { label:'Elderly', scale:0.97, headScale:0.97, stoop:0.16 }
};
const BUILD_PRESETS = {
  slim:    { label:'Slim',    buildMul:0.75 },
  average: { label:'Average', buildMul:1.0 },
  heavy:   { label:'Heavy',   buildMul:1.35 }
};

let HEAD_R = BASE_GEOMETRY.headR, NECK_LEN = BASE_GEOMETRY.neckLen, TORSO_LEN = BASE_GEOMETRY.torsoLen,
    UPPER_ARM = BASE_GEOMETRY.upperArm, FORE_ARM = BASE_GEOMETRY.foreArm,
    UPPER_LEG = BASE_GEOMETRY.upperLeg, LOWER_LEG = BASE_GEOMETRY.lowerLeg,
    LW = BASE_GEOMETRY.lw, HIP_HEIGHT = BASE_GEOMETRY.hipHeight;

function applyBodyScale(bodyType, sizeScale, build){
  const preset = BODY_PRESETS[bodyType] || BODY_PRESETS.adult;
  const buildPreset = BUILD_PRESETS[build] || BUILD_PRESETS.average;
  const sizeMul = sizeScale || 1;
  const s = preset.scale * sizeMul;
  HEAD_R = BASE_GEOMETRY.headR * s * preset.headScale;
  NECK_LEN = BASE_GEOMETRY.neckLen * s;
  TORSO_LEN = BASE_GEOMETRY.torsoLen * s;
  UPPER_ARM = BASE_GEOMETRY.upperArm * s;
  FORE_ARM = BASE_GEOMETRY.foreArm * s;
  UPPER_LEG = BASE_GEOMETRY.upperLeg * s;
  LOWER_LEG = BASE_GEOMETRY.lowerLeg * s;
  LW = Math.max(3, BASE_GEOMETRY.lw * (0.75 + 0.25*s) * buildPreset.buildMul);
  HIP_HEIGHT = BASE_GEOMETRY.hipHeight * s;
  return preset;
}
