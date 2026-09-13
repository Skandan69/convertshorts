// ---------- canvas setup (shared by every draw* function below and by ui.js for export) ----------
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = 380;

// ---------- background ----------
// Actual scenery lives in the BACKGROUNDS registry (js/backgrounds.js) — this just clears the
// canvas, delegates to the selected entry's draw(), then draws the shared ground line on top.
function drawBackground(bg){
  ctx.clearRect(0,0,W,H);
  const entry = BACKGROUNDS[bg] || BACKGROUNDS.white;
  entry.draw();
  ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
}

// ---------- face: eyebrows + eyes + mouth, driven by eyeStyle (shape) and emotion (expression) ----------
// Emotion shapes/angles come from the EMOTIONS registry (js/emotions.js) — this function just draws
// whatever that registry says, so adding a new emotion never requires touching this code.
function drawFace(head, faceDir, eyeStyle, emotion, mouthOpen){
  const em = EMOTIONS[emotion] || EMOTIONS.neutral;
  // S scales all the feature offsets/sizes below, which were originally tuned for the old, smaller
  // head radius — keeping them proportionate to today's bigger "bold cartoon" head (see humanTypes.js).
  // Extreme reaction emotions (mindBlown, terrifiedShock, etc.) also boost the head itself via
  // em.headBoost (see computeSkeleton) — folding the same factor in here keeps eyes/eyebrows/mouth
  // growing right along with the bigger head instead of looking tiny and lost on it.
  const S = 1.2 * (em.headBoost || 1);
  const ex = head.x + faceDir*7*S, ey = head.y - 3*S;
  const wide = em.eyeScale || 1;
  const INK = '#111';

  // eyebrow: angle communicates the emotion even though the eye shape stays the same
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ex - faceDir*5*S, ey + em.browLeftY*S);
  ctx.lineTo(ex + faceDir*5*S, ey + em.browRightY*S);
  ctx.stroke();

  // eye (shape controlled by eyeStyle, size bumped up for wide-eyed emotions like surprise)
  // Extreme reaction emotions push eyeScale way past what a normal small solid-black dot reads well
  // at (a big filled black blob just looks like an ink smudge) — past bigEyedThreshold, draw the
  // classic wide-eyed "reaction face" look instead: a white circle (sclera) with a black outline, plus
  // a smaller black pupil, matching the huge-white-eyed shocked/surprised characters this was modeled on.
  ctx.fillStyle = INK;
  const bigEyed = wide >= 1.7;
  if(eyeStyle === 'round'){
    if(bigEyed){
      const r = 3.5*wide*S;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, r*0.42, 0, Math.PI*2); ctx.fillStyle = INK; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(ex, ey, 3.5*wide*S, 0, Math.PI*2); ctx.fill();
    }
  } else if(eyeStyle === 'happy'){
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey, 3.5*wide*S, Math.PI, 0); ctx.stroke();
  } else if(eyeStyle === 'closed'){
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ex-3*S, ey); ctx.lineTo(ex+3*S, ey); ctx.stroke();
  } else if(eyeStyle === 'star'){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const ang = -Math.PI/2 + i*(Math.PI/5);
      const r = (i%2===0) ? 3.6*wide*S : 1.5*wide*S;
      const px = ex + Math.cos(ang)*r, py = ey + Math.sin(ang)*r;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill();
  } else if(eyeStyle === 'heart'){
    ctx.fillStyle = '#e11d48';
    const hr = 2.2*wide*S;
    ctx.beginPath();
    ctx.moveTo(ex, ey+hr*1.3);
    ctx.bezierCurveTo(ex-hr*1.6, ey-hr*0.6, ex-hr*0.4, ey-hr*1.8, ex, ey-hr*0.3);
    ctx.bezierCurveTo(ex+hr*0.4, ey-hr*1.8, ex+hr*1.6, ey-hr*0.6, ex, ey+hr*1.3);
    ctx.closePath(); ctx.fill();
  } else if(eyeStyle === 'wink'){
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey, 3.2*wide*S, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 1.2;
    [1,2,3].forEach(i=>{ ctx.beginPath(); ctx.moveTo(ex+3*S+i*1.5*S, ey-1*S); ctx.lineTo(ex+4*S+i*1.5*S, ey-1*S); ctx.stroke(); });
  } else if(eyeStyle === 'sleepy'){
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(ex, ey+1*S, 3.5*wide*S, Math.PI*1.05, Math.PI*1.95); ctx.stroke();
  } else if(eyeStyle === 'angry'){
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ex-3.5*S, ey+2*S); ctx.lineTo(ex+3.5*S, ey-2*S); ctx.stroke();
  } else if(eyeStyle === 'spiral'){
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for(let a=0; a<=Math.PI*4.5; a+=0.3){
      const r = a*0.55*S;
      const px = ex + Math.cos(a)*r, py = ey + Math.sin(a)*r;
      if(a===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
  } else {
    if(bigEyed){
      const r = 2.4*wide*S;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, r*0.42, 0, Math.PI*2); ctx.fillStyle = INK; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(ex, ey, 2.4*wide*S, 0, Math.PI*2); ctx.fill();
    }
  }

  // mouth: talking (mouthOpen) always wins so dialogue still reads clearly; otherwise the emotion's shape applies.
  // The talking-mouth ellipse also scales with how exaggerated the current emotion is (via `wide`, the
  // same eyeScale that drives the huge-eyed look above) — without this, every extreme reaction emotion
  // looked completely ordinary the moment a character actually spoke, since talking always drew the same
  // small fixed-size ellipse regardless of emotion, hiding all of the exaggeration mid-dialogue.
  const mx = head.x + faceDir*6*S, my = head.y + 8*S;
  const talkMouthScale = Math.max(1, wide*0.6);
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.5;
  if(mouthOpen > 0.5){
    ctx.beginPath(); ctx.ellipse(mx, my, 4*S*talkMouthScale, 3.5*S*talkMouthScale, 0, 0, Math.PI*2); ctx.fill();
  } else if(em.mouth === 'o'){
    ctx.beginPath(); ctx.arc(mx, my, 3*S, 0, Math.PI*2); ctx.fill();
  } else if(em.mouth === 'jawDrop'){
    // A tall vertical open oval (not a round "o") so "Jaw-Dropped" reads as the jaw literally hanging
    // open, rather than sharing the same round gasp shape as Mind-Blown/Terrified Shock.
    ctx.beginPath(); ctx.ellipse(mx, my+4*S, 3*S, 8*S, 0, 0, Math.PI*2); ctx.fill();
  } else if(em.mouth === 'smile'){
    ctx.beginPath(); ctx.arc(mx - faceDir*2*S, my-2*S, 6*S, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
  } else if(em.mouth === 'frown'){
    ctx.beginPath(); ctx.arc(mx - faceDir*2*S, my+5*S, 6*S, 1.15*Math.PI, 1.85*Math.PI); ctx.stroke();
  } else if(em.mouth === 'grimace'){
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(head.x+faceDir*2*S, head.y+9*S); ctx.lineTo(head.x+faceDir*10*S, head.y+7*S); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(head.x+faceDir*2*S, head.y+8*S); ctx.lineTo(head.x+faceDir*10*S, head.y+8*S); ctx.stroke();
  }
  ctx.lineWidth = LW;
}

// ---------- skeleton math: shared by every art style so poses/IK stay identical no matter how the
// figure is rendered. Also resolves appearance defaults (outfit/skin/hair/etc) in one place so each
// style's draw function can just read sk.* instead of repeating the same fallback logic.
function computeSkeleton(x, faceDir, appearance, pose){
  const outfit = appearance.outfit || appearance.color || '#1d4ed8';
  const gender = appearance.gender || 'male';
  const name = appearance.name || '';
  const skin = appearance.skin || '#ffe0bd';
  const hairStyle = appearance.hairStyle || (gender === 'female' ? 'long' : 'short');
  const hairColor = appearance.hairColor || '#2b1b12';
  const eyeStyle = appearance.eyeStyle || 'dot';
  const emotion = appearance.emotion || 'neutral';
  const accessory = appearance.accessory || 'none';
  const bodyPreset = applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build); // sets HEAD_R/TORSO_LEN/etc for THIS character
  // Extreme reaction emotions (js/emotions.js: mindBlown, terrifiedShock, etc.) enlarge just the head —
  // HEAD_R was only just set above for this one character by applyBodyScale, so bumping it here is
  // purely transient for this character's frame (the next character's computeSkeleton call resets it via
  // its own applyBodyScale), and happens before every joint/feature position below is computed from it.
  const em = EMOTIONS[appearance.emotion] || EMOTIONS.neutral;
  if(em.headBoost) HEAD_R *= em.headBoost;
  const stoop = bodyPreset.stoop || 0;
  const effTorsoLean = pose.torsoLean + stoop;
  const effHeadTilt = pose.headTilt + stoop*0.5;

  // "lying" poses (e.g. sleep) drop the hip anchor down to near ground level instead of standing
  // HIP_HEIGHT — the pose function is then responsible for setting torsoLean/headTilt/leg angles
  // close to +-1.5rad (~90deg) so the whole body reads as one coherent horizontal line, since every
  // joint angle here is world-relative rather than parent-relative.
  const hip = pose.lying
    ? { x: x, y: GROUND_Y - HEAD_R*0.6 - (pose.bounceY||0) - (pose.altitude||0) }
    : { x: x, y: GROUND_Y - HIP_HEIGHT - pose.bounceY - (pose.altitude||0) };
  const shoulder = upPoint(hip, effTorsoLean, TORSO_LEN, faceDir);
  const neck = upPoint(shoulder, effHeadTilt, NECK_LEN, faceDir);
  const head = upPoint(neck, effHeadTilt, HEAD_R*0.9, faceDir);

  const lKnee = downPoint(hip, pose.leftHipAngle, UPPER_LEG, faceDir);
  const lFoot = downPoint(lKnee, pose.leftHipAngle+pose.leftKneeBend, LOWER_LEG, faceDir);
  const rKnee = downPoint(hip, pose.rightHipAngle, UPPER_LEG, faceDir);
  const rFoot = downPoint(rKnee, pose.rightHipAngle+pose.rightKneeBend, LOWER_LEG, faceDir);

  // An extreme reaction emotion's armPose (js/emotions.js) overrides ONLY the arm angles used for IK
  // below — legs/torso/head above already came from the real pose untouched — so e.g. terrifiedShock's
  // hands-near-face gesture applies on top of whatever the character's current action is doing with its
  // legs (walking, standing, sitting, etc.), rather than replacing the whole pose.
  const armPose = em.armPose;
  const lShoulderA = armPose ? armPose.leftShoulderAngle : pose.leftShoulderAngle;
  const lElbowB = armPose ? armPose.leftElbowBend : pose.leftElbowBend;
  const rShoulderA = armPose ? armPose.rightShoulderAngle : pose.rightShoulderAngle;
  const rElbowB = armPose ? armPose.rightElbowBend : pose.rightElbowBend;
  const lElbow = downPoint(shoulder, lShoulderA, UPPER_ARM, faceDir);
  const lHand = downPoint(lElbow, lShoulderA+lElbowB, FORE_ARM, faceDir);
  const rElbow = downPoint(shoulder, rShoulderA, UPPER_ARM, faceDir);
  const rHand = downPoint(rElbow, rShoulderA+rElbowB, FORE_ARM, faceDir);

  return { outfit, gender, name, skin, hairStyle, hairColor, eyeStyle, emotion, accessory, bodyPreset,
    hip, shoulder, neck, head, lKnee, lFoot, rKnee, rFoot, lElbow, lHand, rElbow, rHand };
}

// ---------- "Bold Cartoon" stickman renderer (the default/original style) ----------
function drawStickman(x, faceDir, appearance, pose){
  const sk = computeSkeleton(x, faceDir, appearance, pose);
  const outfit = sk.outfit, gender = sk.gender, name = sk.name, skin = sk.skin,
    hairStyle = sk.hairStyle, hairColor = sk.hairColor, eyeStyle = sk.eyeStyle,
    emotion = sk.emotion, accessory = sk.accessory, color = outfit;
  const hip = sk.hip, shoulder = sk.shoulder, neck = sk.neck, head = sk.head,
    lKnee = sk.lKnee, lFoot = sk.lFoot, rKnee = sk.rKnee, rFoot = sk.rFoot,
    lElbow = sk.lElbow, lHand = sk.lHand, rElbow = sk.rElbow, rHand = sk.rHand;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = LW;

  [[hip,lKnee,lFoot],[hip,rKnee,rFoot]].forEach(seg=>{
    ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
  });
  drawShoeBlob(lFoot, faceDir);
  drawShoeBlob(rFoot, faceDir);

  if(gender === 'female'){
    ctx.beginPath();
    ctx.moveTo(hip.x-15, hip.y+4);
    ctx.lineTo(hip.x+15, hip.y+4);
    ctx.lineTo(hip.x, hip.y+48);
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath(); ctx.moveTo(hip.x,hip.y); ctx.lineTo(shoulder.x,shoulder.y); ctx.stroke();

  [[shoulder,lElbow,lHand],[shoulder,rElbow,rHand]].forEach(seg=>{
    ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
  });
  drawHandBlob(lHand, skin);
  drawHandBlob(rHand, skin);

  if(accessory === 'bag'){
    const bagAnchor = faceDir > 0 ? lHand : rHand;
    ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(shoulder.x - faceDir*4, shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
    ctx.fillStyle = outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
    ctx.lineWidth = LW;
  }
  if(accessory === 'backpack') drawBackpack(shoulder, hip, faceDir, outfit);
  if(accessory === 'scarf') drawScarf(neck, outfit);
  if(accessory === 'cape') drawCape(shoulder, hip, faceDir, outfit);
  if(accessory === 'necktie') drawNecktie(neck, outfit);
  if(accessory === 'bowtie') drawBowtie(neck, outfit);
  if(accessory === 'wristwatch') drawWristwatch(rHand);
  if(accessory === 'sword') drawSword(rHand, faceDir);
  if(accessory === 'katana') drawKatana(rHand, faceDir);
  if(accessory === 'pistol') drawPistol(rHand, faceDir);
  if(accessory === 'ak47') drawAK47(lHand, rHand, faceDir);

  // bold black head outline (like the reference "cartoon stickman" style) — outfit color stays on
  // the body/limbs for per-character identity, but the face itself always reads in high-contrast black
  ctx.beginPath(); ctx.arc(head.x, head.y, HEAD_R, 0, Math.PI*2);
  ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = LW*0.85; ctx.stroke();

  drawHair(head, faceDir, hairStyle, hairColor);
  if(accessory === 'hat') drawHat(head, hairColor);
  if(accessory === 'chefhat') drawChefHat(head);
  if(accessory === 'police') drawPoliceCap(head);
  if(accessory === 'headband') drawHeadband(head, outfit);
  if(accessory === 'crown') drawCrown(head);
  if(accessory === 'wizardhat') drawWizardHat(head);
  if(accessory === 'helmet') drawHelmet(head);
  ctx.strokeStyle = outfit; ctx.lineWidth = LW;

  drawFace(head, faceDir, eyeStyle, emotion, pose.mouthOpen);
  if(accessory === 'glasses') drawGlasses(head);
  if(accessory === 'doctor') drawStethoscope(neck);
  if(accessory === 'mask') drawMask(head);
  if(accessory === 'earrings') drawEarrings(head);

  ctx.fillStyle = '#444';
  ctx.font = '13px "Comic Sans MS", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, hip.x, GROUND_Y + 18);

  return { leftHand: lHand, rightHand: rHand, head: head };
}

function drawSpeechBubble(anchor, text, faceDir){
  ctx.font = '15px "Comic Sans MS", cursive, sans-serif';
  let lines = wrapText(ctx, text, 150);
  // A dialogue line long enough to wrap into many rows used to grow the bubble taller with no limit,
  // pushing its top edge (by, below) further and further above the canvas until the bubble — and all
  // its text — rendered partly or entirely off the top of the frame. Cap how many lines actually show;
  // anything beyond that collapses into an ellipsis on the last visible line instead of silently
  // growing the box past where anyone could ever see it.
  const MAX_BUBBLE_LINES = 5;
  if(lines.length > MAX_BUBBLE_LINES){
    const shown = lines.slice(0, MAX_BUBBLE_LINES);
    let last = shown[MAX_BUBBLE_LINES-1];
    while(last.length > 1 && ctx.measureText(last + '…').width > 150) last = last.slice(0, -1);
    shown[MAX_BUBBLE_LINES-1] = last + '…';
    lines = shown;
  }
  const lineH = 18;
  const boxW = Math.min(180, Math.max(...lines.map(l=>ctx.measureText(l).width)) + 24);
  const boxH = lines.length*lineH + 18;
  const bx = anchor.x - boxW/2 + faceDir*20;
  // Clamp so the bubble's top edge can never go above the canvas (y=0) even after the line cap above
  // — belt-and-suspenders for any bubble anchored high up (e.g. a tall character) with several lines.
  const by = Math.max(4, anchor.y - 55 - boxH);

  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx+10, by);
  ctx.lineTo(bx+boxW-10, by);
  ctx.quadraticCurveTo(bx+boxW, by, bx+boxW, by+10);
  ctx.lineTo(bx+boxW, by+boxH-10);
  ctx.quadraticCurveTo(bx+boxW, by+boxH, bx+boxW-10, by+boxH);
  ctx.lineTo(bx+boxW/2+8, by+boxH);
  ctx.lineTo(anchor.x, anchor.y-18);
  ctx.lineTo(bx+boxW/2-8, by+boxH);
  ctx.lineTo(bx+10, by+boxH);
  ctx.quadraticCurveTo(bx, by+boxH, bx, by+boxH-10);
  ctx.lineTo(bx, by+10);
  ctx.quadraticCurveTo(bx, by, bx+10, by);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#222'; ctx.textAlign = 'center';
  lines.forEach((l,i)=> ctx.fillText(l, bx+boxW/2, by+22+i*lineH));
}

function drawKiteProp(hand, t, anchor){
  const kx = anchor.x + 50*Math.sin(2*Math.PI*t/5) + 15*Math.sin(2*Math.PI*t/1.7);
  const ky = anchor.y + 25*Math.cos(2*Math.PI*t/4);
  const ctrl = { x: (hand.x+kx)/2 + 20*Math.sin(t*1.3), y: (hand.y+ky)/2 + 30 };
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo(ctrl.x, ctrl.y, kx, ky); ctx.stroke();
  for(let i=1;i<=4;i++){
    const dt = t - i*0.25;
    const tx = anchor.x + 50*Math.sin(2*Math.PI*dt/5) + 15*Math.sin(2*Math.PI*dt/1.7);
    const ty = anchor.y + 25*Math.cos(2*Math.PI*dt/4) + i*14;
    ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#22c55e';
    ctx.beginPath(); ctx.moveTo(tx-5,ty); ctx.lineTo(tx+5,ty); ctx.lineTo(tx,ty+8); ctx.closePath(); ctx.fill();
  }
  ctx.save(); ctx.translate(kx,ky);
  ctx.strokeStyle = '#e11d48'; ctx.fillStyle = 'rgba(225,29,72,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0,-26); ctx.lineTo(20,0); ctx.lineTo(0,32); ctx.lineTo(-20,0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(0,32); ctx.moveTo(-20,0); ctx.lineTo(20,0); ctx.stroke();
  ctx.restore();
}

function drawHair(head, faceDir, hairStyle, hairColor){
  if(hairStyle === 'none') return;
  ctx.save();
  ctx.strokeStyle = hairColor; ctx.fillStyle = hairColor;
  if(hairStyle === 'short'){
    ctx.beginPath();
    for(let i=-2;i<=2;i++){
      ctx.moveTo(head.x+i*7, head.y-HEAD_R+3);
      ctx.lineTo(head.x+i*8, head.y-HEAD_R-6);
    }
    ctx.lineWidth = LW-2; ctx.stroke();
  } else if(hairStyle === 'mohawk'){
    ctx.beginPath();
    for(let i=-1;i<=1;i++){
      ctx.moveTo(head.x+i*4, head.y-HEAD_R+2);
      ctx.lineTo(head.x+i*3, head.y-HEAD_R-12);
    }
    ctx.lineWidth = LW-1; ctx.stroke();
  } else if(hairStyle === 'curly'){
    for(let i=-3;i<=3;i++){
      const cx = head.x+i*6, cy = head.y-HEAD_R+2 - Math.abs(i)*1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
    }
  } else if(hairStyle === 'afro'){
    ctx.beginPath(); ctx.arc(head.x, head.y-2, HEAD_R+6, Math.PI*0.95, Math.PI*2.05); ctx.fill();
  } else if(hairStyle === 'bun'){
    ctx.beginPath();
    for(let i=-2;i<=2;i++){ ctx.moveTo(head.x+i*7, head.y-HEAD_R+3); ctx.lineTo(head.x+i*8, head.y-HEAD_R-4); }
    ctx.lineWidth = LW-2; ctx.stroke();
    ctx.beginPath(); ctx.arc(head.x - faceDir*HEAD_R*0.7, head.y-HEAD_R*0.6, 7, 0, Math.PI*2); ctx.fill();
  } else if(hairStyle === 'braids'){
    ctx.lineWidth = LW-1.5;
    [-1,1].forEach(side=>{
      ctx.beginPath();
      const bx = head.x+side*(HEAD_R-2), by0 = head.y-2;
      ctx.moveTo(bx,by0);
      for(let i=1;i<=4;i++){
        const zig = (i%2===0) ? 3 : -3;
        ctx.lineTo(bx+zig, by0+i*8);
      }
      ctx.stroke();
    });
  } else if(hairStyle === 'buzzcut'){
    for(let i=-3;i<=3;i++){
      ctx.beginPath(); ctx.arc(head.x+i*5, head.y-HEAD_R+2, 1.5, 0, Math.PI*2); ctx.fill();
    }
  } else if(hairStyle === 'spiky'){
    ctx.beginPath();
    for(let i=-3;i<=3;i++){
      const bx = head.x+i*5.5, by0 = head.y-HEAD_R+3;
      const spikeLen = 10 + (Math.abs(i)%2)*4;
      ctx.moveTo(bx-2, by0);
      ctx.lineTo(bx+i*1.5, by0-spikeLen);
      ctx.lineTo(bx+2, by0);
    }
    ctx.closePath(); ctx.fill();
  } else if(hairStyle === 'pigtails'){
    ctx.beginPath();
    for(let i=-2;i<=2;i++){ ctx.moveTo(head.x+i*7, head.y-HEAD_R+3); ctx.lineTo(head.x+i*8, head.y-HEAD_R-4); }
    ctx.lineWidth = LW-2; ctx.stroke();
    [-1,1].forEach(side=>{
      ctx.beginPath();
      ctx.ellipse(head.x+side*(HEAD_R+2), head.y-2, 5, 12, side*0.3, 0, Math.PI*2);
      ctx.fill();
    });
  } else if(hairStyle === 'dreadlocks'){
    ctx.lineWidth = LW+1; ctx.lineCap = 'round';
    for(let i=-3;i<=3;i++){
      const bx = head.x + i*6;
      ctx.beginPath();
      ctx.moveTo(bx, head.y-HEAD_R+4);
      ctx.lineTo(bx + i*1.5, head.y+18);
      ctx.stroke();
    }
  } else if(hairStyle === 'undercut'){
    for(let i=-3;i<=3;i++){
      ctx.beginPath(); ctx.arc(head.x+i*5, head.y-HEAD_R+2, 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(head.x-3, head.y-HEAD_R+2);
    ctx.quadraticCurveTo(head.x+8, head.y-HEAD_R-10, head.x+HEAD_R-2, head.y-HEAD_R+6);
    ctx.lineWidth = LW; ctx.lineCap='round'; ctx.stroke();
  } else if(hairStyle === 'sidepart'){
    ctx.beginPath();
    for(let i=-2;i<=3;i++){
      ctx.moveTo(head.x+i*6-4, head.y-HEAD_R+3);
      ctx.lineTo(head.x+i*7-6, head.y-HEAD_R-6);
    }
    ctx.lineWidth = LW-2; ctx.stroke();
  } else if(hairStyle === 'waves'){
    ctx.lineWidth = LW-2; ctx.lineCap = 'round';
    for(let i=-2;i<=2;i++){
      const bx = head.x+i*7, by0 = head.y-HEAD_R+2;
      ctx.beginPath();
      ctx.moveTo(bx, by0);
      ctx.quadraticCurveTo(bx+5, by0-6, bx, by0-11);
      ctx.stroke();
    }
  } else if(hairStyle === 'halfup'){
    ctx.beginPath();
    ctx.moveTo(head.x-HEAD_R+2, head.y-4);
    ctx.quadraticCurveTo(head.x-HEAD_R-6, head.y+18, head.x-HEAD_R+4, head.y+30);
    ctx.moveTo(head.x+HEAD_R-2, head.y-4);
    ctx.quadraticCurveTo(head.x+HEAD_R+6, head.y+18, head.x+HEAD_R-4, head.y+30);
    ctx.lineWidth = LW-1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(head.x, head.y-HEAD_R-5, 5, 0, Math.PI*2); ctx.fill();
  } else if(hairStyle === 'fauxhawk'){
    ctx.beginPath();
    for(let i=-1;i<=1;i++){
      const spikeLen = 8 - Math.abs(i)*2;
      ctx.moveTo(head.x+i*5-2, head.y-HEAD_R+2);
      ctx.lineTo(head.x+i*4, head.y-HEAD_R-6-spikeLen*0.5);
      ctx.lineTo(head.x+i*5+2, head.y-HEAD_R+2);
    }
    ctx.closePath(); ctx.fill();
  } else if(hairStyle === 'cornrows'){
    ctx.lineWidth = LW-2; ctx.lineCap = 'round';
    for(let i=-3;i<=3;i++){
      const bx = head.x+i*5;
      ctx.beginPath();
      ctx.moveTo(bx, head.y-HEAD_R+3);
      ctx.lineTo(bx*0.3+head.x*0.7, head.y+2);
      ctx.stroke();
    }
  } else if(hairStyle === 'bowlcut'){
    ctx.beginPath(); ctx.arc(head.x, head.y-2, HEAD_R+2, Math.PI*1.05, Math.PI*1.95); ctx.fill();
    ctx.strokeStyle = hairColor; ctx.lineWidth = LW-2;
    ctx.beginPath(); ctx.moveTo(head.x-HEAD_R-1, head.y-HEAD_R*0.3); ctx.lineTo(head.x+HEAD_R+1, head.y-HEAD_R*0.3); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(head.x-HEAD_R+2, head.y-4);
    ctx.quadraticCurveTo(head.x-HEAD_R-6, head.y+18, head.x-HEAD_R+4, head.y+30);
    ctx.moveTo(head.x+HEAD_R-2, head.y-4);
    ctx.quadraticCurveTo(head.x+HEAD_R+6, head.y+18, head.x+HEAD_R-4, head.y+30);
    ctx.lineWidth = LW-1.5; ctx.stroke();
    if(hairStyle === 'ponytail'){
      ctx.beginPath();
      ctx.moveTo(head.x - faceDir*HEAD_R*0.6, head.y-6);
      ctx.quadraticCurveTo(head.x - faceDir*HEAD_R*1.7, head.y+8, head.x - faceDir*HEAD_R*1.3, head.y+30);
      ctx.lineWidth = LW-1; ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(head.x-2, head.y-HEAD_R-2);
    ctx.lineTo(head.x-10, head.y-HEAD_R-9);
    ctx.lineTo(head.x-10, head.y-HEAD_R+5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(head.x+2, head.y-HEAD_R-2);
    ctx.lineTo(head.x+10, head.y-HEAD_R-9);
    ctx.lineTo(head.x+10, head.y-HEAD_R+5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- mitten hands + oval shoes (bold-cartoon look — replaces bare line-ends) ----------
function drawHandBlob(pos, skin){
  ctx.save();
  ctx.fillStyle = skin; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawShoeBlob(pos, faceDir){
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(pos.x + faceDir*3, pos.y, 9, 4.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGlasses(head){
  ctx.save();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.3;
  ctx.beginPath(); ctx.arc(head.x-7.2, head.y-2.4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(head.x+7.2, head.y-2.4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(head.x-1.2, head.y-2.4); ctx.lineTo(head.x+1.2, head.y-2.4); ctx.stroke();
  ctx.restore();
}

function drawHat(head, color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+3, HEAD_R+5, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.55, head.y-HEAD_R-13, HEAD_R*1.1, 14); ctx.fill();
  ctx.restore();
}

// ---------- costume accessories (chef/police/athlete/doctor) — used by the COSTUMES registry (js/costumes.js) ----------
function drawChefHat(head){
  ctx.save();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+2, HEAD_R+3, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.5, head.y-HEAD_R-24, HEAD_R, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R-24, HEAD_R*0.5, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawPoliceCap(head){
  ctx.save();
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+2, HEAD_R+2, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.6, head.y-HEAD_R-10, HEAD_R*1.2, 12); ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.beginPath(); ctx.arc(head.x, head.y-HEAD_R-4, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawHeadband(head, color){
  ctx.save();
  ctx.strokeStyle = color || '#dc2626'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(head.x, head.y-2, HEAD_R-1, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  ctx.restore();
}
function drawCrown(head){
  ctx.save();
  ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5;
  const baseY = head.y-HEAD_R-2;
  ctx.beginPath();
  ctx.moveTo(head.x-HEAD_R*0.6, baseY);
  ctx.lineTo(head.x-HEAD_R*0.6, baseY-8);
  ctx.lineTo(head.x-HEAD_R*0.3, baseY-2);
  ctx.lineTo(head.x, baseY-12);
  ctx.lineTo(head.x+HEAD_R*0.3, baseY-2);
  ctx.lineTo(head.x+HEAD_R*0.6, baseY-8);
  ctx.lineTo(head.x+HEAD_R*0.6, baseY);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.arc(head.x, baseY-11, 2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawBackpack(shoulder, hip, faceDir, color){
  ctx.save();
  const bx = shoulder.x - faceDir*10, by = (shoulder.y+hip.y)/2;
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(bx-9, by-14, 18, 26); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx-9, by-2); ctx.lineTo(bx+9, by-2); ctx.stroke();
  ctx.restore();
}
function drawCape(shoulder, hip, faceDir, color){
  ctx.save();
  const cx = shoulder.x - faceDir*6;
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx-8, shoulder.y-2);
  ctx.lineTo(cx+8, shoulder.y-2);
  ctx.quadraticCurveTo(cx+14, hip.y+20, cx, hip.y+34);
  ctx.quadraticCurveTo(cx-14, hip.y+20, cx-8, shoulder.y-2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawWizardHat(head){
  ctx.save();
  ctx.fillStyle = '#4c1d95'; ctx.strokeStyle = '#2e1065'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+2, HEAD_R+4, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(head.x-HEAD_R*0.5, head.y-HEAD_R);
  ctx.lineTo(head.x+6, head.y-HEAD_R-34);
  ctx.lineTo(head.x+HEAD_R*0.5, head.y-HEAD_R);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(head.x+6, head.y-HEAD_R-34, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawHelmet(head){
  ctx.save();
  ctx.fillStyle = 'rgba(203,213,225,0.9)'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(head.x, head.y-2, HEAD_R+3, Math.PI*1.05, Math.PI*1.95); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(head.x-HEAD_R-2, head.y-2); ctx.lineTo(head.x+HEAD_R+2, head.y-2); ctx.stroke();
  ctx.restore();
}
function drawScarf(neck, color){
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(neck.x, neck.y+2, 10, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(neck.x-4, neck.y+2, 8, 18); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawMask(head){
  ctx.save();
  ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(head.x+3, head.y+8, 7, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(head.x-4, head.y+3); ctx.lineTo(head.x-HEAD_R-3, head.y-4); ctx.stroke();
  ctx.restore();
}
function drawStethoscope(neck){
  ctx.save();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(neck.x, neck.y+4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(neck.x-5, neck.y+8); ctx.lineTo(neck.x-5, neck.y+22); ctx.stroke();
  ctx.beginPath(); ctx.arc(neck.x-5, neck.y+24, 3, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

function drawNecktie(neck, color){
  ctx.save();
  ctx.fillStyle = color || '#7f1d1d'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(neck.x-3, neck.y+2); ctx.lineTo(neck.x+3, neck.y+2); ctx.lineTo(neck.x+1.5, neck.y+8); ctx.lineTo(neck.x-1.5, neck.y+8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(neck.x-1.5, neck.y+8); ctx.lineTo(neck.x+1.5, neck.y+8); ctx.lineTo(neck.x+3.5, neck.y+22); ctx.lineTo(neck.x, neck.y+26); ctx.lineTo(neck.x-3.5, neck.y+22); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBowtie(neck, color){
  ctx.save();
  ctx.fillStyle = color || '#1e1e1e'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(neck.x, neck.y+3); ctx.lineTo(neck.x-8, neck.y-1); ctx.lineTo(neck.x-8, neck.y+7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(neck.x, neck.y+3); ctx.lineTo(neck.x+8, neck.y-1); ctx.lineTo(neck.x+8, neck.y+7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(neck.x, neck.y+3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawEarrings(head){
  ctx.save();
  ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(head.x-HEAD_R+1, head.y+3, 2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(head.x+HEAD_R-1, head.y+3, 2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawWristwatch(hand){
  ctx.save();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hand.x, hand.y, 4, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(hand.x, hand.y, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGuitarProp(leftHand, rightHand){
  ctx.save();
  ctx.strokeStyle = '#7c4a2d'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(leftHand.x, leftHand.y); ctx.lineTo(rightHand.x, rightHand.y-4); ctx.stroke();
  ctx.fillStyle = '#a97c3f'; ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(rightHand.x-2, rightHand.y+6, 10, 13, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(rightHand.x-2, rightHand.y+4, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.8;
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(leftHand.x+i*1.5, leftHand.y-2); ctx.lineTo(rightHand.x+i*1.5, rightHand.y+2); ctx.stroke(); }
  ctx.restore();
}
function drawUmbrellaProp(hand, t){
  ctx.save();
  const topY = hand.y - 46;
  ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x, topY); ctx.stroke();
  ctx.fillStyle = '#dc2626'; ctx.strokeStyle = '#8b2f2a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hand.x-24, topY);
  ctx.quadraticCurveTo(hand.x-24, topY-16, hand.x-8, topY-14);
  ctx.quadraticCurveTo(hand.x, topY-20, hand.x+8, topY-14);
  ctx.quadraticCurveTo(hand.x+24, topY-16, hand.x+24, topY);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8b2f2a'; ctx.lineWidth = 1;
  [-12,0,12].forEach(ox=>{ ctx.beginPath(); ctx.moveTo(hand.x+ox, topY); ctx.lineTo(hand.x+ox*0.4, topY-15); ctx.stroke(); });
  ctx.restore();
}
function drawSkateboardProp(x, groundY, faceDir, t){
  const wobble = Math.sin(t*6)*1.5;
  ctx.save();
  ctx.fillStyle = '#1f2937'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, groundY+4+wobble, 26, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9ca3af';
  [-18,18].forEach(ox=>{ ctx.beginPath(); ctx.arc(x+ox, groundY+8+wobble, 3.5, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();
}
function drawLaptopProp(leftHand, rightHand){
  ctx.save();
  const mx = (leftHand.x+rightHand.x)/2, my = (leftHand.y+rightHand.y)/2;
  ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(mx-14, my, 28, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.rect(mx-13, my-14, 26, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath(); ctx.rect(mx-11, my-12, 22, 10); ctx.fill();
  ctx.restore();
}
function drawCameraProp(leftHand, rightHand){
  ctx.save();
  const mx = (leftHand.x+rightHand.x)/2, my = (leftHand.y+rightHand.y)/2;
  ctx.fillStyle = '#1f2937'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(mx-11, my-7, 22, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#374151';
  ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.beginPath(); ctx.rect(mx-9, my-9, 3, 2); ctx.fill();
  ctx.restore();
}

function drawChairProp(x, groundY){
  const seatY = groundY - 20;
  ctx.strokeStyle = '#8b5e3c'; ctx.fillStyle = '#a97c50'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x-24, groundY); ctx.lineTo(x-24, seatY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+24, groundY); ctx.lineTo(x+24, seatY); ctx.stroke();
  ctx.fillRect(x-26, seatY-6, 52, 8);
  ctx.strokeRect(x-26, seatY-6, 52, 8);
  ctx.beginPath(); ctx.moveTo(x-24, seatY-6); ctx.lineTo(x-24, seatY-46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-24, seatY-46); ctx.lineTo(x+24, seatY-46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+24, seatY-46); ctx.lineTo(x+24, seatY-6); ctx.stroke();
}

function drawSofaProp(x, groundY){
  const seatY = groundY - 22;
  ctx.strokeStyle = '#6b4a30'; ctx.fillStyle = '#8a6a4a'; ctx.lineWidth = 3;
  ctx.fillRect(x-55, seatY-8, 110, 30); ctx.strokeRect(x-55, seatY-8, 110, 30);
  ctx.fillRect(x-55, seatY-46, 110, 20); ctx.strokeRect(x-55, seatY-46, 110, 20);
  ctx.fillRect(x-62, seatY-40, 12, 46); ctx.strokeRect(x-62, seatY-40, 12, 46);
  ctx.fillRect(x+50, seatY-40, 12, 46); ctx.strokeRect(x+50, seatY-40, 12, 46);
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x-45, groundY-2); ctx.lineTo(x-45, groundY+8); ctx.moveTo(x+45, groundY-2); ctx.lineTo(x+45, groundY+8); ctx.stroke();
}

function drawCoffeeCupProp(hand){
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7c5a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(hand.x-6, hand.y-4, 12, 10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(hand.x+9, hand.y+1, 4, -Math.PI/2, Math.PI/2); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,150,150,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hand.x-2, hand.y-6); ctx.quadraticCurveTo(hand.x-6, hand.y-14, hand.x-1, hand.y-20); ctx.stroke();
  ctx.restore();
}

function drawPhoneProp(hand){
  ctx.save();
  ctx.fillStyle = '#222';
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(hand.x-5, hand.y-9, 10, 18, 2); ctx.fill(); }
  else { ctx.fillRect(hand.x-5, hand.y-9, 10, 18); }
  ctx.restore();
}

// ---------- props for the newer action library (kick/throw/swim/sleep/read/clap/bow) ----------
function drawBookProp(leftHand, rightHand){
  ctx.save();
  const mx = (leftHand.x+rightHand.x)/2, my = (leftHand.y+rightHand.y)/2;
  ctx.fillStyle = '#e0453f'; ctx.strokeStyle = '#8b2f2a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(mx-11, my-8, 22, 15); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mx, my-8); ctx.lineTo(mx, my+7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx-8, my-4); ctx.lineTo(mx-2, my-4); ctx.moveTo(mx-8, my); ctx.lineTo(mx-2, my);
  ctx.moveTo(mx+2, my-4); ctx.lineTo(mx+8, my-4); ctx.moveTo(mx+2, my); ctx.lineTo(mx+8, my); ctx.stroke();
  ctx.restore();
}
function drawSleepZzz(head, t){
  ctx.save();
  ctx.fillStyle = '#7c7c7c'; ctx.font = 'bold 13px "Comic Sans MS", cursive, sans-serif'; ctx.textAlign = 'left';
  const drift = (t % 2)/2;
  ['z','Z','Z'].forEach((ch,i)=>{
    const lift = drift*14 - i*8;
    ctx.globalAlpha = Math.max(0, 1 - (lift+i*8)/22);
    ctx.font = (11+i*3) + 'px "Comic Sans MS", cursive, sans-serif';
    ctx.fillText(ch, head.x + 12 + i*6, head.y - HEAD_R - 6 - lift);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.restore();
}

// ---------- weapon accessories (sword/katana/pistol/ak47) + shoot/slash effects ----------
function drawSword(hand, faceDir){
  ctx.save();
  const tipX = hand.x + faceDir*12, tipY = hand.y - 50;
  const gx = hand.x + (tipX-hand.x)*0.14, gy = hand.y + (tipY-hand.y)*0.14;
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hand.x - faceDir*4, hand.y+4); ctx.lineTo(gx, gy); ctx.stroke();
  const dx = tipX-hand.x, dy = tipY-hand.y, dlen = Math.hypot(dx,dy) || 1;
  const px = -dy/dlen*9, py = dx/dlen*9;
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(gx-px, gy-py); ctx.lineTo(gx+px, gy+py); ctx.stroke();
  ctx.strokeStyle = '#d7dce1'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#98a0aa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.restore();
}
function drawKatana(hand, faceDir){
  ctx.save();
  const tipX = hand.x + faceDir*18, tipY = hand.y - 52;
  const ctrlX = hand.x + faceDir*5, ctrlY = hand.y - 28;
  const gx = hand.x + faceDir*1, gy = hand.y - 5;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hand.x - faceDir*14, hand.y+5); ctx.lineTo(gx, gy); ctx.stroke();
  ctx.fillStyle = '#7a1f1f'; ctx.beginPath(); ctx.arc(gx, gy, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#dfe3e7'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY); ctx.stroke();
  ctx.restore();
}
function drawPistol(hand, faceDir){
  ctx.save();
  ctx.fillStyle = '#292c30'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.rect(hand.x - (faceDir>0?3:18), hand.y-4, 21, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(hand.x - (faceDir>0?6:3), hand.y-3, 9, 16); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawAK47(leftHand, rightHand, faceDir){
  ctx.save();
  const bx = rightHand.x, by = rightHand.y;
  const tipX = bx + faceDir*46, tipY = by - 3;
  const stockX = bx - faceDir*22, stockY = by + 7;
  ctx.strokeStyle = '#25272a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(stockX, stockY); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(bx - faceDir*10, by+1); ctx.lineTo(stockX, stockY); ctx.stroke();
  ctx.strokeStyle = '#151617'; ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(bx + faceDir*4, by+3);
  ctx.quadraticCurveTo(bx + faceDir*10, by+27, bx + faceDir*3, by+39);
  ctx.stroke();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(tipX, tipY-6); ctx.lineTo(tipX, tipY+4); ctx.stroke();
  ctx.restore();
}
function drawGunFireEffect(hand, faceDir, t, isRifle, targetX){
  const cycle = 0.35;
  const phase = (t % cycle) / cycle;
  const muzzleX = hand.x + faceDir*(isRifle?32:15), muzzleY = hand.y - (isRifle?2:3);
  if(phase < 0.25){
    const flashScale = 1 - phase/0.25;
    ctx.save();
    ctx.translate(muzzleX, muzzleY);
    ctx.fillStyle = phase < 0.12 ? '#fff7cc' : '#ffcf4d';
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const ang = i*(Math.PI/4);
      const r = (i % 2 === 0 ? 10 : 4) * flashScale;
      const px = Math.cos(ang)*r, py = Math.sin(ang)*r;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const maxTravel = (typeof targetX === 'number') ? Math.max(20, Math.abs(targetX - muzzleX)) : 150;
  const travel = Math.min(maxTravel, phase * maxTravel * 1.15);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(muzzleX + faceDir*travel, muzzleY);
  ctx.lineTo(muzzleX + faceDir*(travel+12), muzzleY);
  ctx.stroke();
  ctx.restore();
  if(typeof targetX === 'number' && travel >= maxTravel - 4 && phase > 0.3){
    ctx.save();
    ctx.translate(muzzleX + faceDir*maxTravel, muzzleY);
    ctx.fillStyle = '#ffdd66';
    for(let i=0;i<5;i++){
      const ang = (i/5)*Math.PI*2;
      ctx.beginPath(); ctx.arc(Math.cos(ang)*5, Math.sin(ang)*5, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}
function drawBloodEffect(hand, faceDir, t, target){
  const cycle = 0.7, impact = 0.45, winW = 0.16;
  const phase = (t % cycle) / cycle;
  const dist = Math.abs(phase - impact);
  if(dist > winW) return;
  const alpha = 1 - dist/winW;
  const sx = target ? target.x : hand.x + faceDir*22;
  const sy = target ? target.y : hand.y - 8;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#c81e1e';
  for(let i=0;i<6;i++){
    const ang = (i/6)*Math.PI*2 + phase*10;
    const r = 6 + (i%3)*4;
    const px = sx + Math.cos(ang)*r, py = sy + Math.sin(ang)*r*0.6;
    ctx.beginPath(); ctx.arc(px, py, 2.2+(i%2), 0, Math.PI*2); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(sx, sy+4, 9, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
