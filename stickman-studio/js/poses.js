// ---------- animation clips: pure functions of (localT, opts) -> BonePose ----------
// ---- gesture keyframe helpers: real 2D animation holds a pose then eases to the next one, rather
// than oscillating continuously — a pure sine (even several summed together) still reads as "vibrating
// in place" because it never actually STOPS anywhere. These pick a new target every `holdTime` seconds
// (deterministic pseudo-random per seed, so left/right arms and different characters don't sync) and
// smoothstep-ease between the current and next target, which is what makes it read as a natural,
// occasionally-shifting gesture instead of a mechanical wobble.
function smoothstep01(f){ return f*f*(3 - 2*f); }
function pseudoRandom01(i, seed){
  const v = Math.sin(i*127.1 + seed*311.7 + 0.7) * 43758.5453;
  return v - Math.floor(v);
}
// Eases between scalar keyframe values drawn from [-1,1], scaled by amplitude.
function keyframeDrift(t, seed, holdTime, amplitude){
  const period = t / holdTime, idx = Math.floor(period), frac = smoothstep01(period - idx);
  const a = pseudoRandom01(idx, seed) * 2 - 1, b = pseudoRandom01(idx+1, seed) * 2 - 1;
  return (a + (b - a) * frac) * amplitude;
}
// Eases between whole {shoulder, elbow} keyframes picked from a small palette — used for the talking
// gesture so it visibly changes shape (raised near chest / extended out / chopping down / palm up)
// instead of one position wobbling, the way a person's hands actually move while speaking.
function keyframeGesture(t, seed, holdTime, palette){
  const period = t / holdTime, idx = Math.floor(period), frac = smoothstep01(period - idx);
  const a = palette[Math.floor(pseudoRandom01(idx, seed) * palette.length) % palette.length];
  const b = palette[Math.floor(pseudoRandom01(idx+1, seed) * palette.length) % palette.length];
  // A pure linear lerp between two rest angles is what reads as "mechanical" — a real arm swing arcs
  // through the transition (follow-through) rather than tracing a straight line in angle-space. This
  // adds a small mid-transition bump to the elbow (peaks at frac=0.5, gone at both ends) so the gesture
  // gets a natural flick instead of a robotic point-to-point glide.
  const arc = Math.sin(frac * Math.PI) * 0.18;
  return { shoulder: a.shoulder + (b.shoulder - a.shoulder) * frac, elbow: a.elbow + (b.elbow - a.elbow) * frac - arc };
}
const TALK_GESTURE_PALETTE = [
  { shoulder: 1.05, elbow: -0.55 }, { shoulder: 0.7, elbow: -0.9 },
  { shoulder: 1.35, elbow: -0.3 },  { shoulder: 0.95, elbow: -1.05 },
  { shoulder: 1.15, elbow: -0.65 }
];
// Subtler palette for whichever character is NOT the current dialogue speaker but is still in the
// Talk pose (i.e. listening) — previously that arm barely moved (tiny drift only), which next to the
// speaker's big expressive gesture read as "frozen mannequin," the main source of the robotic look.
// Small natural listening adjustments (loosely resting, occasional shift) instead of near-zero motion.
const LISTEN_GESTURE_PALETTE = [
  { shoulder: 0.15, elbow: 0.15 }, { shoulder: 0.35, elbow: -0.1 },
  { shoulder: 0.05, elbow: 0.25 }, { shoulder: 0.4, elbow: 0.0 }
];
// Real standing people never lock both knees straight and centered — weight slowly drifts from one
// leg to the other with a small knee microbend that follows, plus a faint torso counter-lean. Perfectly
// straight, motionless legs under an already-subtle arm sway is what reads as "action figure on a
// stand" even once the arms move — this is very visible on a plain silhouette even at small amplitude,
// more so than most arm tweaks. `offset` (from evaluateScene's per-character `i*Math.PI`) decorrelates
// multiple characters sharing a scene so they don't sway in lockstep with each other.
function weightShift(t, seed, offset){
  const shift = keyframeDrift(t, seed + (offset||0), 3.2, 1); // -1..1, slow drift between legs
  return {
    leftHipAngle: 0.07 + shift*0.06, leftKneeBend: 0.06 + Math.max(0, shift)*0.07,
    rightHipAngle: -0.07 - shift*0.06, rightKneeBend: 0.06 + Math.max(0, -shift)*0.07,
    torsoLean: shift*0.02
  };
}
function poseIdle(t, offset){
  const o = offset||0;
  // Amplitudes raised significantly from the original 0.09/0.05 rad — that range read as an almost
  // imperceptible twitch rather than a relaxed natural sway, which was the main reason idle/talk
  // characters still looked stiff/robotic even with hold-and-ease timing already in place.
  const lArm = keyframeDrift(t, 1+o, 1.3, 0.22), rArm = keyframeDrift(t, 2+o, 1.5, 0.22);
  const ws = weightShift(t, 40, o);
  return {
    torsoLean: keyframeDrift(t, 3+o, 2.4, 0.03) + ws.torsoLean,
    headTilt: keyframeDrift(t, 4+o, 2.1, 0.05),
    bounceY: Math.sin(t*2)*1.4 + 0.4*Math.sin(t*0.87+0.4),
    leftShoulderAngle: lArm, leftElbowBend: 0.15 + keyframeDrift(t, 5+o, 1.4, 0.13),
    rightShoulderAngle: rArm, rightElbowBend: 0.15 + keyframeDrift(t, 6+o, 1.2, 0.13),
    leftHipAngle: ws.leftHipAngle, leftKneeBend: ws.leftKneeBend,
    rightHipAngle: ws.rightHipAngle, rightKneeBend: ws.rightKneeBend, mouthOpen:0
  };
}
function poseTalk(t, speaking, offset){
  const o = offset||0;
  const gesture = keyframeGesture(t, 7+o, 0.85, TALK_GESTURE_PALETTE);
  // The listening character (Talk pose, but not the current dialogue speaker) used to get only a
  // near-zero-amplitude drift on one arm and a flat, never-moving 0.15 elbow bend on the other — next
  // to the speaker's big expressive gesture that read as a frozen mannequin standing beside a puppet.
  // Give it the same keyframe-gesture treatment, just from a subtler "at rest / listening" palette.
  const listen = keyframeGesture(t, 14+o, 1.6, LISTEN_GESTURE_PALETTE);
  const ws = weightShift(t, 41, o);
  const mouthWave = Math.sin(t*9.2)*0.5 + Math.sin(t*13.7+1)*0.15;
  return {
    torsoLean: keyframeDrift(t, 8+o, 2.2, 0.025) + ws.torsoLean,
    headTilt: speaking ? keyframeDrift(t, 9+o, 0.9, 0.13) : keyframeDrift(t, 9+o, 2.3, 0.06),
    bounceY: Math.sin(t*2)*1.2 + 0.35*Math.sin(t*0.9+0.6),
    leftShoulderAngle: keyframeDrift(t, 10+o, 1.6, 0.16), leftElbowBend: 0.15 + keyframeDrift(t, 13+o, 1.7, 0.1),
    rightShoulderAngle: speaking ? gesture.shoulder : listen.shoulder,
    rightElbowBend: speaking ? gesture.elbow : listen.elbow,
    leftHipAngle: ws.leftHipAngle, leftKneeBend: ws.leftKneeBend,
    rightHipAngle: ws.rightHipAngle, rightKneeBend: ws.rightKneeBend,
    mouthOpen: speaking ? Math.max(0.12, Math.min(1, 0.55 + mouthWave)) : 0
  };
}
function poseKite(t){
  return {
    torsoLean: -0.08+0.06*Math.sin(t*1.5),
    headTilt: -0.35+0.05*Math.sin(t*2),
    bounceY: Math.abs(Math.sin(t*2))*2,
    leftShoulderAngle: 2.5+0.08*Math.sin(t*3), leftElbowBend: -0.2+0.1*Math.sin(t*3+1),
    rightShoulderAngle: 0.2*Math.sin(t*1.5), rightElbowBend: 0.2,
    leftHipAngle: 0.05*Math.sin(t*1.2), leftKneeBend: 0.05,
    rightHipAngle: -0.05*Math.sin(t*1.2), rightKneeBend: 0.05,
    mouthOpen: 0
  };
}
function poseWalk(t){
  const w = t*6;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0.03*Math.sin(w), bounceY: Math.abs(Math.sin(w))*4,
    leftShoulderAngle: -0.5*Math.sin(w), leftElbowBend: 0.3, rightShoulderAngle: 0.5*Math.sin(w), rightElbowBend: 0.3,
    leftHipAngle: 0.6*Math.sin(w), leftKneeBend: 0.9*Math.max(0, Math.sin(w+Math.PI)),
    rightHipAngle: -0.6*Math.sin(w), rightKneeBend: 0.9*Math.max(0, Math.sin(w)),
    mouthOpen: 0
  };
}
function poseRun(t){
  const w = t*10;
  return {
    torsoLean: 0.25 + 0.05*Math.sin(w), headTilt: 0.08*Math.sin(w), bounceY: Math.abs(Math.sin(w))*7,
    leftShoulderAngle: -0.9*Math.sin(w), leftElbowBend: 0.9, rightShoulderAngle: 0.9*Math.sin(w), rightElbowBend: 0.9,
    leftHipAngle: 0.9*Math.sin(w), leftKneeBend: 1.3*Math.max(0, Math.sin(w+Math.PI)),
    rightHipAngle: -0.9*Math.sin(w), rightKneeBend: 1.3*Math.max(0, Math.sin(w)),
    mouthOpen: 0
  };
}
// NOTE on fight/argue/hug/high-five: each character's pose is still computed independently (no
// cross-character contact solving, same as the existing 'dance' clip) — placing two characters
// close together with phase-offset motion reads as "interacting" without literal hand contact.
// True skeletal contact would need pose functions to receive the partner's transform, which the
// evaluateScene(scene,t) pipeline doesn't pass today.
function poseFight(t, offset){
  const w = t*6 + (offset||0);
  // Alternating jab/cross: each arm cycles from a raised guard (bent elbow, fist near chin) out to a
  // near-full extension "punch" — rather than one arm holding a static guard while only the other arm
  // makes a small swing, which read as vague arm-waving (dancing) with no visible opponent to punch at.
  // The torso lunges into whichever side is currently extending for a clearer sense of thrown weight.
  const punchR = Math.max(0, Math.sin(w));
  const punchL = Math.max(0, Math.sin(w + Math.PI));
  return {
    torsoLean: 0.18 + 0.14*(punchR - punchL), headTilt: -0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w*2))*3,
    leftShoulderAngle: 0.5 + 1.1*punchL, leftElbowBend: -1.2 + 1.0*punchL,
    rightShoulderAngle: 0.5 + 1.1*punchR, rightElbowBend: -1.2 + 1.0*punchR,
    leftHipAngle: 0.15, leftKneeBend: 0.3, rightHipAngle: -0.1, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function poseArgue(t, offset){
  const w = t*3 + (offset||0);
  return {
    torsoLean: 0.12*Math.sin(w), headTilt: 0.1*Math.sin(w*1.5), bounceY: Math.abs(Math.sin(w*2))*1.5,
    leftShoulderAngle: 0.2, leftElbowBend: 0.5,
    rightShoulderAngle: 1.1 + 0.3*Math.sin(w*2), rightElbowBend: -0.5,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: Math.sin(w*4) > 0 ? 1 : 0.2
  };
}
function poseHug(t){
  const settle = Math.min(1, t/0.6);
  return {
    torsoLean: 0.1*settle, headTilt: 0.05*Math.sin(t*1.5), bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 1.3*settle, leftElbowBend: -0.4*settle,
    rightShoulderAngle: 1.3*settle, rightElbowBend: -0.4*settle,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseHighFive(t){
  const cycle = t % 2;
  const raise = cycle < 1 ? Math.sin(cycle*Math.PI) : 0;
  return {
    torsoLean: 0.05*Math.sin(t*1.3), headTilt: 0.05*Math.sin(t*1.3), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15,
    rightShoulderAngle: 2.2*raise, rightElbowBend: -0.5*raise,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseShake(t){
  const settle = Math.min(1, t/0.5);
  const shake = t > 0.5 ? Math.sin((t-0.5)*14)*0.15 : 0;
  return {
    torsoLean: 0.08*settle, headTilt: 0.05*Math.sin(t*1.5), bounceY: Math.abs(Math.sin(t*2))*1,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15,
    rightShoulderAngle: 1.5*settle+shake, rightElbowBend: -0.6*settle,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseWave(t, offset){
  const ws = weightShift(t, 42, offset);
  return {
    torsoLean: 0.02*Math.sin(t*1.3) + ws.torsoLean, headTilt: 0.05*Math.sin(t*1.3), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15, rightShoulderAngle: 2.6+0.5*Math.sin(t*8), rightElbowBend: -0.3,
    leftHipAngle: ws.leftHipAngle, leftKneeBend: ws.leftKneeBend, rightHipAngle: ws.rightHipAngle, rightKneeBend: ws.rightKneeBend,
    mouthOpen: 0
  };
}
function poseDance(t, offset){
  const w = t*5+(offset||0);
  return {
    torsoLean: 0.15*Math.sin(w), headTilt: 0.1*Math.sin(w+1), bounceY: Math.abs(Math.sin(w*2))*5,
    leftShoulderAngle: 1.2+0.8*Math.sin(w), leftElbowBend: -0.3, rightShoulderAngle: 1.2-0.8*Math.sin(w), rightElbowBend: -0.3,
    leftHipAngle: 0.4*Math.sin(w), leftKneeBend: 0.3, rightHipAngle: -0.4*Math.sin(w), rightKneeBend: 0.3,
    mouthOpen: 0
  };
}

// 2-bone IK: given a target point (dx,dy) offset from the shoulder in the pose's local,
// pre-faceDir frame (same convention as upPoint/downPoint: x=sin(angle)*len, y=cos(angle)*len),
// solve for shoulderAngle/elbowBend so the hand actually reaches that point (law of cosines).
// 2-bone IK, generalized over bone lengths so the same law-of-cosines solve works for an arm
// (shoulder+elbow) or a leg (hip+knee) — armReachAngles/legReachAngles below are just this called with
// the two different bone-length pairs. Used both by the hand/food/phone reach poses above AND by the
// Pose Designer's drag-to-pose handles (js/ui.js), which is why this needed to stop being arm-specific.
function limbReachAngles(dx, dy, boneA, boneB){
  let dist = Math.sqrt(dx*dx + dy*dy);
  const maxReach = boneA + boneB - 1;
  const minReach = Math.abs(boneA - boneB) + 1;
  dist = Math.max(minReach, Math.min(maxReach, dist));
  const targetAngle = Math.atan2(dx, dy);
  const cosElbow = (boneA*boneA + boneB*boneB - dist*dist) / (2*boneA*boneB);
  const elbowInterior = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
  const cosShoulderOff = (boneA*boneA + dist*dist - boneB*boneB) / (2*boneA*dist);
  const shoulderOffset = Math.acos(Math.max(-1, Math.min(1, cosShoulderOff)));
  return { shoulderAngle: targetAngle - shoulderOffset, elbowBend: (Math.PI - elbowInterior) };
}
function armReachAngles(dx, dy){ return limbReachAngles(dx, dy, UPPER_ARM, FORE_ARM); }
// Leg IK for the Pose Designer's drag-to-pose foot handles — result fields are still named
// shoulderAngle/elbowBend (matching limbReachAngles' generic return shape) but map onto
// hipAngle/kneeBend for a leg; callers rename them on assignment.
function legReachAngles(dx, dy){ return limbReachAngles(dx, dy, UPPER_LEG, LOWER_LEG); }
function headPointsRelToShoulder(headTilt){
  const neckX = Math.sin(headTilt)*NECK_LEN, neckY = -Math.cos(headTilt)*NECK_LEN;
  const headX = neckX + Math.sin(headTilt)*(HEAD_R*0.9), headY = neckY - Math.cos(headTilt)*(HEAD_R*0.9);
  return { x: headX, y: headY };
}

function poseSit(t){
  return {
    torsoLean: 0.03*Math.sin(t*1.1), headTilt: 0.05*Math.sin(t*1.3),
    bounceY: -22 + Math.sin(t*1.5)*0.8,
    leftShoulderAngle: 0.15*Math.sin(t*1.2), leftElbowBend: 0.3,
    rightShoulderAngle: 0.15*Math.sin(t*1.2+1), rightElbowBend: 0.3,
    leftHipAngle: 1.3, leftKneeBend: -1.3, rightHipAngle: 1.3, rightKneeBend: -1.3,
    mouthOpen: 0
  };
}
function poseDrinkCoffee(t){
  const cycle = t % 4;
  const liftPhase = cycle < 1.2 ? Math.sin((cycle/1.2)*Math.PI) : 0;
  const base = poseSit(t);
  base.headTilt = base.headTilt + 0.06*liftPhase;
  const head = headPointsRelToShoulder(base.headTilt);
  const mouth = { x: head.x + 7.2, y: head.y + 9.6 }; // matches drawFace's mouth position (head.x+faceDir*6*S, head.y+8*S)
  const reach = armReachAngles(mouth.x, mouth.y);
  const restShoulder = 0.4, restElbow = 0.6; // relaxed, cup resting near the lap
  base.rightShoulderAngle = restShoulder + (reach.shoulderAngle - restShoulder) * liftPhase;
  base.rightElbowBend = restElbow + (reach.elbowBend - restElbow) * liftPhase;
  base.mouthOpen = liftPhase > 0.6 ? 1 : 0;
  return base;
}
function poseEat(t){
  const cycle = t % 3;
  const liftPhase = cycle < 1 ? Math.sin(cycle*Math.PI) : 0;
  const base = poseSit(t);
  base.headTilt = base.headTilt + 0.05*liftPhase;
  const head = headPointsRelToShoulder(base.headTilt);
  const mouth = { x: head.x + 7.2, y: head.y + 9.6 }; // matches drawFace's mouth position (head.x+faceDir*6*S, head.y+8*S)
  const reach = armReachAngles(mouth.x, mouth.y);
  const restShoulder = 0.4, restElbow = 0.6; // relaxed, food resting near the lap between bites
  base.rightShoulderAngle = restShoulder + (reach.shoulderAngle - restShoulder) * liftPhase;
  base.rightElbowBend = restElbow + (reach.elbowBend - restElbow) * liftPhase;
  base.mouthOpen = liftPhase > 0.5 ? 1 : 0;
  return base;
}
function posePhoneCall(t){
  const base = poseIdle(t);
  base.headTilt = base.headTilt + 0.15;
  const head = headPointsRelToShoulder(base.headTilt);
  const ear = { x: head.x + 13.2, y: head.y - 2.4 }; // side of the head, ear height (scaled with the bigger head — see drawFace's S)
  const reach = armReachAngles(ear.x, ear.y);
  base.rightShoulderAngle = reach.shoulderAngle + 0.03*Math.sin(t*2);
  base.rightElbowBend = reach.elbowBend;
  base.leftShoulderAngle = 0.1*Math.sin(t*1.1);
  base.leftElbowBend = 0.2;
  base.mouthOpen = Math.sin(t*9) > 0.2 ? 1 : 0.15;
  return base;
}

function poseJump(t){
  const cycle = 1.1;
  const phase = (t % cycle) / cycle;
  const height = Math.max(0, Math.sin(phase*Math.PI)) * 26;
  const crouch = phase < 0.12 ? (0.12-phase)/0.12 : (phase > 0.9 ? (phase-0.9)/0.1 : 0);
  return {
    torsoLean: -0.05 + 0.05*Math.sin(phase*Math.PI),
    headTilt: 0.05*Math.sin(phase*Math.PI),
    bounceY: height - crouch*8,
    leftShoulderAngle: -0.9 - crouch*0.4 + 0.5*Math.sin(phase*Math.PI), leftElbowBend: 0.4,
    rightShoulderAngle: 0.9 + crouch*0.4 - 0.5*Math.sin(phase*Math.PI), rightElbowBend: -0.4,
    leftHipAngle: crouch*0.7 - height*0.015, leftKneeBend: crouch*1.1 + height*0.02,
    rightHipAngle: crouch*0.7 - height*0.015, rightKneeBend: crouch*1.1 + height*0.02,
    mouthOpen: height > 18 ? 1 : 0
  };
}

function poseKick(t){
  const w = t*4;
  const kick = Math.max(0, Math.sin(w));
  return {
    torsoLean: 0.1, headTilt: 0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w*2))*3,
    leftShoulderAngle: 0.3*Math.sin(w), leftElbowBend: 0.4,
    rightShoulderAngle: -0.2*Math.sin(w), rightElbowBend: 0.4,
    leftHipAngle: -1.3*kick, leftKneeBend: 1.1*kick + 0.2,
    rightHipAngle: 0.15, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function poseThrow(t){
  const w = t*3;
  const wind = Math.sin(w);
  return {
    torsoLean: 0.15 + 0.15*Math.max(0,-wind), headTilt: 0.05*wind, bounceY: Math.abs(Math.sin(w*2))*2,
    leftShoulderAngle: 0.2, leftElbowBend: 0.3,
    rightShoulderAngle: -1.6*Math.max(0,wind) + 0.6*Math.max(0,-wind), rightElbowBend: -1.2*Math.max(0,wind) - 0.2,
    leftHipAngle: 0.1, leftKneeBend: 0.2, rightHipAngle: -0.1, rightKneeBend: 0.15,
    mouthOpen: 0
  };
}
// Swimming lies the figure flat, same "lying" trick as Sleep below (hip anchor drops near ground,
// torso/head angles sit near +-1.5rad for a horizontal line) — the earlier version stood the figure
// upright and just windmilled the arms, which read as dancing/waving rather than swimming.
// - Legs use a NEGATIVE baseline (~-1.5, opposite sign from torsoLean's ~+1.5) so they trail away
//   from the head instead of curling forward toward it — same convention Sleep uses just below
//   (torsoLean +1.5, hip angles -1.48/-1.52) to keep head-torso-hip-legs one continuous line.
// - bounceY carries a large constant lift (not just a small bob) so the figure floats up into the
//   body of "water" instead of sitting on GROUND_Y, which every background renders as solid
//   ground/seafloor — without this the swimmer visually reads as lying on the bottom, not swimming.
function poseSwim(t){
  const w = t*4.5;
  return {
    lying: true,
    torsoLean: 1.52, headTilt: 1.3, bounceY: 160 + Math.sin(w*2)*5,
    leftShoulderAngle: 1.5 + 1.3*Math.sin(w), leftElbowBend: -0.2-0.55*Math.max(0,Math.sin(w)),
    rightShoulderAngle: 1.5 + 1.3*Math.sin(w+Math.PI), rightElbowBend: -0.2-0.55*Math.max(0,Math.sin(w+Math.PI)),
    leftHipAngle: -1.5+0.3*Math.sin(w*2.2), leftKneeBend: 0.25+0.3*Math.max(0,Math.sin(w*2.2)),
    rightHipAngle: -1.5+0.3*Math.sin(w*2.2+Math.PI), rightKneeBend: 0.25+0.3*Math.max(0,Math.sin(w*2.2+Math.PI)),
    mouthOpen: 0
  };
}
// "Sleep" lies the figure flat on the ground: computeSkeleton (render.js) special-cases
// pose.lying to drop the hip anchor near ground level, and every angle here is set close to
// +-1.5rad (~90deg) so torso/head/legs form one coherent horizontal line — since joint angles in
// this engine are world-relative, not parent-relative, matching angles is what keeps segments
// visually connected instead of bending at a sharp disconnected joint.
function poseSleep(t){
  const breathe = Math.sin(t*1.2)*0.025;
  return {
    lying: true,
    torsoLean: 1.5 + breathe, headTilt: 1.42, bounceY: 0,
    leftShoulderAngle: -1.2, leftElbowBend: 0.4,
    rightShoulderAngle: -1.6, rightElbowBend: -0.3,
    leftHipAngle: -1.48, leftKneeBend: 0.15,
    rightHipAngle: -1.52, rightKneeBend: 0.08,
    mouthOpen: 0
  };
}
function poseRead(t){
  const turn = Math.sin(t*1.5)*0.15;
  return {
    torsoLean: 0.05, headTilt: 0.35, bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 0.75+turn, leftElbowBend: -1.0,
    rightShoulderAngle: 0.75-turn, rightElbowBend: -1.0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseClap(t){
  const w = t*6;
  return {
    torsoLean: 0.05, headTilt: 0.05*Math.sin(w*0.5), bounceY: Math.abs(Math.sin(w*0.5))*2,
    leftShoulderAngle: 0.6+0.35*Math.sin(w), leftElbowBend: -0.9,
    rightShoulderAngle: 0.6-0.35*Math.sin(w), rightElbowBend: -0.9,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseBow(t){
  const w = t*1.8;
  const bend = Math.max(0, Math.sin(w));
  return {
    torsoLean: 0.9*bend, headTilt: 0.9*bend, bounceY: 0,
    leftShoulderAngle: 0.1, leftElbowBend: 0.15,
    rightShoulderAngle: -0.1, rightElbowBend: 0.15,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

function poseYoga(t){
  const w = t*1.5;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0, bounceY: 0,
    leftShoulderAngle: 2.9, leftElbowBend: 0.3,
    rightShoulderAngle: -2.9, rightElbowBend: -0.3,
    leftHipAngle: -1.2, leftKneeBend: 1.8,
    rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseCry(t){
  const w = t*8;
  return {
    torsoLean: 0.15, headTilt: 0.5+0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w))*1.5,
    leftShoulderAngle: 0.7, leftElbowBend: -1.3,
    rightShoulderAngle: -0.7, rightElbowBend: -1.3,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function posePoint(t){
  const w = t*1.5;
  return {
    torsoLean: 0.05, headTilt: 0.05*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 0.1, leftElbowBend: 0.15,
    rightShoulderAngle: 1.55, rightElbowBend: -0.1,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseSalute(t){
  return {
    torsoLean: 0, headTilt: 0, bounceY: Math.sin(t*2)*0.6,
    leftShoulderAngle: 0.05, leftElbowBend: 0.1,
    rightShoulderAngle: 0.3, rightElbowBend: -2.0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseShrug(t){
  return {
    torsoLean: 0, headTilt: 0.1*Math.sin(t*2), bounceY: Math.abs(Math.sin(t*2))*2,
    leftShoulderAngle: 0.3, leftElbowBend: -0.9,
    rightShoulderAngle: -0.3, rightElbowBend: -0.9,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseStretch(t){
  const w = t*1.2;
  return {
    torsoLean: 0.15*Math.sin(w), headTilt: 0.1*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 3.0+0.2*Math.sin(w), leftElbowBend: 0,
    rightShoulderAngle: -3.0-0.2*Math.sin(w), rightElbowBend: 0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
// "Fall down" cycles a stumble into a sprawled lying moment (reusing the pose.lying anchor scheme
// from poseSleep) — the loop resetting back to the stumble at the top reads as "gets back up".
function poseFallDown(t){
  const cycle = 2.5;
  const phase = (t % cycle) / cycle;
  if(phase < 0.3){
    const stumble = phase/0.3;
    return {
      torsoLean: 0.3+0.9*stumble, headTilt: 0.2+0.7*stumble, bounceY: 0,
      leftShoulderAngle: -0.5, leftElbowBend: 0.3,
      rightShoulderAngle: 0.8, rightElbowBend: -0.3,
      leftHipAngle: 0.3*stumble, leftKneeBend: 0.5*stumble,
      rightHipAngle: -0.2*stumble, rightKneeBend: 0.3*stumble,
      mouthOpen: stumble>0.5 ? 1 : 0
    };
  }
  return {
    lying: true,
    torsoLean: 1.5, headTilt: 1.3, bounceY: 0,
    leftShoulderAngle: -0.6, leftElbowBend: 0.6,
    rightShoulderAngle: -2.2, rightElbowBend: -0.5,
    leftHipAngle: -1.9, leftKneeBend: 0.6,
    rightHipAngle: -1.1, rightKneeBend: -0.3,
    mouthOpen: 0
  };
}

// Push-up: lying-anchored (like sleep/fall) with the whole body oscillating up/down as elbows bend.
function posePushup(t){
  const w = t*3;
  const down = Math.max(0, Math.sin(w));
  return {
    lying: true,
    torsoLean: 1.5, headTilt: 1.4, bounceY: -down*4,
    leftShoulderAngle: -1.0, leftElbowBend: 0.3+1.2*down,
    rightShoulderAngle: -1.0, rightElbowBend: 0.3+1.2*down,
    leftHipAngle: -1.5, leftKneeBend: 0.1,
    rightHipAngle: -1.5, rightKneeBend: 0.1,
    mouthOpen: 0
  };
}
function poseCheer(t){
  const w = t*4;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0, bounceY: Math.abs(Math.sin(w))*5,
    leftShoulderAngle: 2.7+0.15*Math.sin(w), leftElbowBend: 0.1,
    rightShoulderAngle: -2.7-0.15*Math.sin(w), rightElbowBend: -0.1,
    leftHipAngle: 0.1*Math.sin(w), leftKneeBend: 0.3*Math.abs(Math.sin(w)),
    rightHipAngle: -0.1*Math.sin(w), rightKneeBend: 0.3*Math.abs(Math.sin(w)),
    mouthOpen: Math.sin(w) > 0.3 ? 1 : 0
  };
}
function poseDrum(t){
  const w = t*10;
  return {
    torsoLean: 0.05*Math.sin(t*2), headTilt: 0.08*Math.sin(t*2.5), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 1.1+0.5*Math.sin(w), leftElbowBend: -0.8+0.3*Math.sin(w),
    rightShoulderAngle: 1.1+0.5*Math.sin(w+Math.PI), rightElbowBend: -0.8+0.3*Math.sin(w+Math.PI),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseCartwheel(t){
  const cycle = 1.2;
  const phase = ((t % cycle) / cycle) * Math.PI*2;
  return {
    torsoLean: Math.sin(phase)*1.4,
    headTilt: Math.sin(phase)*1.2,
    bounceY: -Math.abs(Math.sin(phase))*12,
    leftShoulderAngle: 2.6+Math.sin(phase)*0.6, leftElbowBend: 0.1,
    rightShoulderAngle: -2.6-Math.sin(phase)*0.6, rightElbowBend: -0.1,
    leftHipAngle: Math.sin(phase)*1.3, leftKneeBend: 0.2,
    rightHipAngle: -Math.sin(phase)*1.3, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function posePaint(t){
  const w = t*3;
  return {
    torsoLean: 0.08, headTilt: 0.1*Math.sin(w*0.5), bounceY: 0,
    leftShoulderAngle: 0.4, leftElbowBend: -0.6,
    rightShoulderAngle: 0.7+0.5*Math.sin(w), rightElbowBend: -0.3+0.3*Math.sin(w*1.3),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseWrite(t){
  const w = t*5;
  return {
    torsoLean: 0.3, headTilt: 0.4, bounceY: 0,
    leftShoulderAngle: 0.6, leftElbowBend: -1.1,
    rightShoulderAngle: 0.9, rightElbowBend: -1.0+0.15*Math.sin(w),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseFish(t){
  const w = t*1.4;
  const tug = Math.sin(w*4) > 0.85 ? 1 : 0;
  return {
    torsoLean: 0.1+tug*0.15, headTilt: 0.05*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 0.9, leftElbowBend: -0.4,
    rightShoulderAngle: 1.2-tug*0.4, rightElbowBend: -0.7,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

function poseGuitar(t){
  const strum = t*8;
  return {
    torsoLean: 0.08, headTilt: 0.15, bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 0.5, leftElbowBend: -0.3,
    rightShoulderAngle: 0.9+0.3*Math.sin(strum), rightElbowBend: -0.7+0.2*Math.sin(strum),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseUmbrella(t){
  return {
    torsoLean: 0.03*Math.sin(t*1.2), headTilt: 0.05, bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.2), leftElbowBend: 0.15,
    rightShoulderAngle: 2.4, rightElbowBend: -0.2,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseSkateboard(t){
  const w = t*6;
  return {
    torsoLean: 0.15+0.05*Math.sin(w), headTilt: 0.05*Math.sin(w), bounceY: Math.sin(w)*1.5,
    leftShoulderAngle: -1.4, leftElbowBend: 0.2,
    rightShoulderAngle: 1.4, rightElbowBend: -0.2,
    leftHipAngle: -0.4, leftKneeBend: 0.7,
    rightHipAngle: 0.3, rightKneeBend: 0.5,
    mouthOpen: 0
  };
}
function poseLaptop(t){
  const w = t*10;
  return {
    torsoLean: 0.1, headTilt: 0.2, bounceY: 0,
    leftShoulderAngle: 0.7, leftElbowBend: -0.9,
    rightShoulderAngle: 0.7, rightElbowBend: -0.9+0.1*Math.sin(w),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
// Shared "seated, hands forward on a wheel/handlebar" pose for the drive/ride clips. Deliberately
// reuses poseSit's exact hip/knee angles and bounceY (-22) rather than inventing new ones — those
// numbers are already tuned so the feet land right at GROUND_Y (proven by the existing chair-seated
// clips), which the vehicle art below depends on to place the footwell/wheels correctly. Only the arms
// change, reaching forward onto a wheel/handlebar instead of resting at the sides.
function poseRide(t){
  const w = t*3;
  return {
    torsoLean: 0.03*Math.sin(w*0.5), headTilt: 0.03*Math.sin(w*0.7),
    bounceY: -22 + Math.sin(w)*1.1,
    leftShoulderAngle: 0.85, leftElbowBend: -0.75,
    rightShoulderAngle: 0.85, rightElbowBend: -0.75,
    leftHipAngle: 1.3, leftKneeBend: -1.3, rightHipAngle: 1.3, rightKneeBend: -1.3,
    mouthOpen: 0
  };
}
// Pilot pose for flyplane/flyhelicopter — reuses poseRide's proven seated leg geometry (feet land at
// the same hip-relative offset the vehicle art expects) but narrows the arm grip inward to read as
// gripping a center control stick/collective rather than a wide steering wheel.
function poseFly(t){
  const w = t*3;
  return {
    torsoLean: 0.03*Math.sin(w*0.5), headTilt: 0.03*Math.sin(w*0.6),
    bounceY: -22 + Math.sin(w)*1.1,
    leftShoulderAngle: 0.55, leftElbowBend: -0.35,
    rightShoulderAngle: 0.55, rightElbowBend: -0.35,
    leftHipAngle: 1.3, leftKneeBend: -1.3, rightHipAngle: 1.3, rightKneeBend: -1.3,
    mouthOpen: 0
  };
}
function poseCamera(t){
  return {
    torsoLean: 0.05, headTilt: 0, bounceY: Math.sin(t*2)*0.5,
    leftShoulderAngle: 1.6, leftElbowBend: -1.5,
    rightShoulderAngle: 1.6, rightElbowBend: -1.5,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

// ---------- shoot (pistol/AK47 aim+fire) and slash (sword/katana swing) ----------
function poseShoot(t){
  const cycle = 0.35;
  const phase = (t % cycle) / cycle;
  const recoil = phase < 0.25 ? (0.25-phase)/0.25 : 0;
  return {
    torsoLean: 0.06 - recoil*0.1, headTilt: 0.04, bounceY: Math.sin(t*2)*0.6,
    leftShoulderAngle: 1.1, leftElbowBend: -0.7,
    rightShoulderAngle: 1.55 - recoil*0.35, rightElbowBend: -0.15 + recoil*0.3,
    leftHipAngle: 0.1, leftKneeBend: 0.15, rightHipAngle: -0.05, rightKneeBend: 0.1,
    mouthOpen: 0
  };
}
function poseSlash(t){
  const cycle = 0.7;
  const phase = (t % cycle) / cycle;
  const angle = 2.6 - phase*2.4;
  return {
    torsoLean: 0.15*Math.sin(phase*Math.PI), headTilt: 0.05, bounceY: Math.abs(Math.sin(phase*Math.PI))*3,
    leftShoulderAngle: 0.3, leftElbowBend: 0.3,
    rightShoulderAngle: angle, rightElbowBend: -0.3 - 0.3*Math.sin(phase*Math.PI),
    leftHipAngle: 0.1, leftKneeBend: 0.2, rightHipAngle: -0.1, rightKneeBend: 0.15,
    mouthOpen: 0
  };
}
// "Hug from behind" — the one clip in this file where the pose ISN'T fully self-contained: this
// function only supplies the fallback/base pose (used when there's no one else in the scene to hug, or
// as the anchor pose before arm angles get overridden). The real arm-wrap IK, aimed at wherever the
// OTHER character's torso actually is that frame, is computed in js/scene.js's evaluateScene — as a
// second pass, after every character's own position/pose is already resolved — since that's the only
// place with access to both characters' real computed skeletons at once. See evaluateScene's
// "Hug from behind" block for the actual reach math (reuses armReachAngles, the same 2-bone IK the Pose
// Designer's drag-to-pose handles and the reach-for-a-coffee-cup poses above already use).
function poseHugBehind(t){
  const settle = Math.min(1, t/0.6);
  return {
    torsoLean: 0.1*settle, headTilt: 0.05*settle, bounceY: Math.sin(t*2)*0.8,
    leftShoulderAngle: 0.5, leftElbowBend: -0.3,
    rightShoulderAngle: 0.5, rightElbowBend: -0.3,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
const CLIPS = {
  idle: { label:'Idle', pose:(t,opts)=>poseIdle(t, opts&&opts.phase) },
  talk: { label:'Talk', pose:(t,opts)=>poseTalk(t, !!(opts&&opts.speaking), opts&&opts.phase) },
  walk: { label:'Walk', pose:(t)=>poseWalk(t) },
  wave: { label:'Wave', pose:(t,opts)=>poseWave(t, opts&&opts.phase) },
  dance:{ label:'Dance', pose:(t,opts)=>poseDance(t, opts&&opts.phase) },
  kite: { label:'Fly Kite', pose:(t)=>poseKite(t) },
  sit:  { label:'Sit (chair)', pose:(t)=>poseSit(t) },
  drink:{ label:'Drink Coffee', pose:(t)=>poseDrinkCoffee(t) },
  phone:{ label:'Talk on Phone', pose:(t)=>posePhoneCall(t) },
  jump: { label:'Jump', pose:(t)=>poseJump(t) },
  eat:  { label:'Eat', pose:(t)=>poseEat(t) },
  run:  { label:'Run', pose:(t)=>poseRun(t) },
  fight:{ label:'Fight', pose:(t,opts)=>poseFight(t, opts&&opts.phase) },
  argue:{ label:'Argue', pose:(t,opts)=>poseArgue(t, opts&&opts.phase) },
  hug:  { label:'Hug', pose:(t)=>poseHug(t) },
  highfive: { label:'High Five', pose:(t)=>poseHighFive(t) },
  kick: { label:'Kick', pose:(t)=>poseKick(t) },
  throw:{ label:'Throw', pose:(t)=>poseThrow(t) },
  swim: { label:'Swim', pose:(t)=>poseSwim(t) },
  sleep:{ label:'Sleep', pose:(t)=>poseSleep(t) },
  read: { label:'Read', pose:(t)=>poseRead(t) },
  clap: { label:'Clap', pose:(t)=>poseClap(t) },
  bow:  { label:'Bow', pose:(t)=>poseBow(t) },
  yoga: { label:'Yoga', pose:(t)=>poseYoga(t) },
  cry:  { label:'Cry', pose:(t)=>poseCry(t) },
  point:{ label:'Point', pose:(t)=>posePoint(t) },
  salute:{ label:'Salute', pose:(t)=>poseSalute(t) },
  shrug:{ label:'Shrug', pose:(t)=>poseShrug(t) },
  stretch:{ label:'Stretch', pose:(t)=>poseStretch(t) },
  fall: { label:'Fall Down', pose:(t)=>poseFallDown(t) },
  pushup: { label:'Push-up', pose:(t)=>posePushup(t) },
  cheer: { label:'Cheer', pose:(t)=>poseCheer(t) },
  drum: { label:'Play Drums', pose:(t)=>poseDrum(t) },
  cartwheel: { label:'Cartwheel', pose:(t)=>poseCartwheel(t) },
  paint: { label:'Paint', pose:(t)=>posePaint(t) },
  write: { label:'Write', pose:(t)=>poseWrite(t) },
  fish: { label:'Fish', pose:(t)=>poseFish(t) },
  shake: { label:'Shake Hands', pose:(t)=>poseShake(t) },
  guitar: { label:'Play Guitar', pose:(t)=>poseGuitar(t) },
  umbrella: { label:'Hold Umbrella', pose:(t)=>poseUmbrella(t) },
  skateboard: { label:'Skateboard', pose:(t)=>poseSkateboard(t) },
  laptop: { label:'Type on Laptop', pose:(t)=>poseLaptop(t) },
  camera: { label:'Take Photo', pose:(t)=>poseCamera(t) },
  drivecar: { label:'Drive a Car', pose:(t)=>poseRide(t) },
  drivesportscar: { label:'Drive a Sports Car', pose:(t)=>poseRide(t) },
  drivelimo: { label:'Drive a Limo', pose:(t)=>poseRide(t) },
  ridebike: { label:'Ride a Bicycle', pose:(t)=>poseRide(t) },
  ridemotorcycle: { label:'Ride a Motorcycle', pose:(t)=>poseRide(t) },
  flyplane: { label:'Fly a Plane', pose:(t)=>poseFly(t) },
  flyhelicopter: { label:'Pilot a Helicopter', pose:(t)=>poseFly(t) },
  shoot: { label:'Shoot', pose:(t)=>poseShoot(t) },
  slash: { label:'Sword Slash', pose:(t)=>poseSlash(t) },
  hugbehind: { label:'Hug from Behind', pose:(t)=>poseHugBehind(t) }
};
const CLIP_LIST = [
  {id:'idle', label:'Idle'}, {id:'talk', label:'Talk'}, {id:'walk', label:'Walk'},
  {id:'wave', label:'Wave'}, {id:'dance', label:'Dance'}, {id:'kite', label:'Fly Kite'},
  {id:'sit', label:'Sit (chair)'}, {id:'drink', label:'Drink Coffee'}, {id:'phone', label:'Talk on Phone'},
  {id:'jump', label:'Jump'}, {id:'eat', label:'Eat'}, {id:'run', label:'Run'},
  {id:'fight', label:'Fight'}, {id:'argue', label:'Argue'}, {id:'hug', label:'Hug'}, {id:'highfive', label:'High Five'},
  {id:'kick', label:'Kick'}, {id:'throw', label:'Throw'}, {id:'swim', label:'Swim'}, {id:'sleep', label:'Sleep'},
  {id:'read', label:'Read'}, {id:'clap', label:'Clap'}, {id:'bow', label:'Bow'},
  {id:'yoga', label:'Yoga'}, {id:'cry', label:'Cry'}, {id:'point', label:'Point'}, {id:'salute', label:'Salute'},
  {id:'shrug', label:'Shrug'}, {id:'stretch', label:'Stretch'}, {id:'fall', label:'Fall Down'},
  {id:'pushup', label:'Push-up'}, {id:'cheer', label:'Cheer'}, {id:'drum', label:'Play Drums'},
  {id:'cartwheel', label:'Cartwheel'}, {id:'paint', label:'Paint'}, {id:'write', label:'Write'}, {id:'fish', label:'Fish'},
  {id:'shake', label:'Shake Hands'},
  {id:'guitar', label:'Play Guitar'}, {id:'umbrella', label:'Hold Umbrella'}, {id:'skateboard', label:'Skateboard'},
  {id:'laptop', label:'Type on Laptop'}, {id:'camera', label:'Take Photo'},
  {id:'drivecar', label:'Drive a Car'}, {id:'drivesportscar', label:'Drive a Sports Car'}, {id:'drivelimo', label:'Drive a Limo'},
  {id:'ridebike', label:'Ride a Bicycle'}, {id:'ridemotorcycle', label:'Ride a Motorcycle'},
  {id:'flyplane', label:'Fly a Plane'}, {id:'flyhelicopter', label:'Pilot a Helicopter'},
  {id:'shoot', label:'Shoot'}, {id:'slash', label:'Sword Slash'}, {id:'hugbehind', label:'Hug from Behind'}
];
const SEATED_CLIPS = { sit:true, drink:true, phone:false, eat:true, read:true, write:true, laptop:true };
// Interactive clips read best when BOTH characters perform them together (like 'dance' already does) —
// resolveIndexedTimeline/parsePromptToScene special-case this instead of defaulting partner to idle.
const INTERACTIVE_CLIPS = { fight:true, argue:true, hug:true, highfive:true, dance:true, shake:true };

// ---------- Pose Designer keyframe interpolation ----------
// A user-authored move (js/ui.js's Pose Designer) isn't a hand-coded pose function like everything
// above — it's a plain list of BonePose snapshots ("keyframes") the user posed by hand via sliders,
// each with a hold/transition duration. evalKeyframePose is the one shared function that turns that
// data into a per-frame pose, exactly the same way a CLIPS entry's pose(t) would, so it can drop into
// evaluateScene (js/scene.js) as a peer of every other clip. Looping over the total duration of all
// keyframes, smoothstep-eased between each consecutive pair, so 3-4 posed keyframes (e.g. guard -> jab
// -> kick -> guard) already read as a real, deliberately-designed move rather than a jump-cut.
const POSE_LERP_FIELDS = ['torsoLean','headTilt','bounceY','leftShoulderAngle','leftElbowBend','rightShoulderAngle','rightElbowBend','leftHipAngle','leftKneeBend','rightHipAngle','rightKneeBend','mouthOpen'];
function evalKeyframePose(t, keyframes){
  if(!keyframes || !keyframes.length) return poseIdle(t, 0);
  if(keyframes.length === 1) return Object.assign({}, keyframes[0].pose);
  const total = keyframes.reduce((s,k)=> s + Math.max(0.1, k.duration || 1), 0);
  const tt = ((t % total) + total) % total;
  let acc = 0;
  for(let i=0;i<keyframes.length;i++){
    const k = keyframes[i];
    const d = Math.max(0.1, k.duration || 1);
    if(tt < acc + d || i === keyframes.length - 1){
      const next = keyframes[(i+1) % keyframes.length];
      const frac = Math.min(1, Math.max(0, (tt - acc) / d));
      const eased = frac*frac*(3 - 2*frac); // smoothstep
      const out = {};
      POSE_LERP_FIELDS.forEach(f=>{
        const a = (k.pose && k.pose[f] != null) ? k.pose[f] : 0;
        const b = (next.pose && next.pose[f] != null) ? next.pose[f] : 0;
        out[f] = a + (b - a) * eased;
      });
      return out;
    }
    acc += d;
  }
  return Object.assign({}, keyframes[keyframes.length - 1].pose);
}
