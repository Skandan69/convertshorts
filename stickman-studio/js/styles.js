// ---------- art styles registry: alternate visual renderers for the same skeleton/pose ----------
// Every style calls the shared computeSkeleton(x,faceDir,appearance,pose) from js/render.js, so
// poses/actions/IK are identical no matter which style is selected — only the pixels differ. To add
// a new style: add one entry with a drawStickman(x,faceDir,appearance,pose) function that returns
// { leftHand, rightHand, head } (used to attach hand-held props like coffee cups/food); it
// automatically appears in the Art Style dropdown via STYLE_LIST.

const STYLES = {
  bold: {
    label: 'Bold Cartoon',
    // This is the original/default style — its full implementation lives in js/render.js
    // (drawStickman) since that's also what drawFace/drawHair/accessories etc. are tuned for.
    drawStickman: (x, faceDir, appearance, pose)=> drawStickman(x, faceDir, appearance, pose)
  },
  neon: {
    label: 'Neon Glow',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const glow = sk.outfit;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = glow; ctx.shadowBlur = 14;
      ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.fillStyle = glow;
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      // female-coded skirt accent, same shape/placement as the bold style's skirt (js/render.js)
      if(sk.gender === 'female'){
        ctx.beginPath();
        ctx.moveTo(sk.hip.x-13, sk.hip.y+2);
        ctx.lineTo(sk.hip.x+13, sk.hip.y+2);
        ctx.lineTo(sk.hip.x, sk.hip.y+40);
        ctx.closePath();
        ctx.fillStyle = glow + '33';
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand, sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
      });
      // head: dark-glass fill (glow silhouette look) with a glowing outline ring, THEN the same
      // shared hair/face/accessories every other style uses drawn on top — previously this was an
      // empty ring with no face at all; now eyes/hair/accessories show up against the dark fill while
      // the glow aesthetic (dark body, neon rim light) is preserved.
      ctx.fillStyle = 'rgba(8,10,20,0.88)';
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R*0.85, 0, Math.PI*2); ctx.fill();
      ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.strokeStyle = glow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R*0.85, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      drawHair(sk.head, faceDir, sk.hairStyle, sk.hairColor);
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);
      drawFace(sk.head, faceDir, sk.eyeStyle, sk.emotion, pose.mouthOpen);
      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      ctx.fillStyle = '#ddd'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  clipart: {
    label: 'Flat Clipart',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const limbW = LW * 2.2; // thicker capsule-style limbs for a flat-vector look, not thin stick lines
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = limbW;
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(p.x+faceDir*3, p.y, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW*1.3;
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();
      ctx.lineWidth = limbW;
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand].forEach(p=>{
        ctx.fillStyle = sk.skin; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
      });
      // businessman tie accent (GraphicMama-style clipart reference, purely decorative default look)
      // — skipped for female appearances, and layered UNDER the necktie/bowtie accessory if selected.
      if(sk.gender !== 'female' && sk.accessory !== 'necktie' && sk.accessory !== 'bowtie'){
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(sk.shoulder.x, sk.shoulder.y+2);
        ctx.lineTo(sk.shoulder.x-4, sk.shoulder.y+10);
        ctx.lineTo(sk.shoulder.x, sk.shoulder.y+26);
        ctx.lineTo(sk.shoulder.x+4, sk.shoulder.y+10);
        ctx.closePath(); ctx.fill();
      }
      // Body-worn accessories, shared with the bold style's drawStickman (js/render.js) so every
      // accessory works identically no matter which art style is selected.
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);
      ctx.fillStyle = sk.skin; ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      drawHair(sk.head, faceDir, sk.hairStyle, sk.hairColor);
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);
      drawFace(sk.head, faceDir, sk.eyeStyle, sk.emotion, pose.mouthOpen);
      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);
      ctx.fillStyle = '#333'; ctx.font = '13px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  bighead: {
    label: 'Big Head Comedy',
    // A much more detailed, exaggerated "reaction-comedy cartoon" look — big round head, big white
    // "googly" eyes, a thick furrowed eyebrow bar, and a chubby FILLED cartoon body/clothing instead of
    // thin stick limbs. Still built entirely from computeSkeleton()'s shared joint math (so every
    // pose/action/saved move lines up exactly the same as every other style) and the EMOTIONS registry's
    // browLeftY/browRightY/mouth/eyeScale fields (so every existing emotion, including the "Extreme"
    // reaction set, drives this face too) — only the actual shapes drawn are different. This is a
    // procedural APPROXIMATION of that art style (flat colors, no shading/folds/unique per-character
    // designs), not a pixel-for-pixel recreation of hand-animated reference art.
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const em = EMOTIONS[sk.emotion] || EMOTIONS.neutral;
      const HR = HEAD_R * 1.4; // the signature oversized head — drawn bigger than the skeleton's own
                                 // HEAD_R without touching it, so joint positions stay exactly where
                                 // every other style already puts them.
      const limbW = LW * 2.8; // thick, chubby capsule limbs instead of a thin stick line
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // legs: thick filled capsules
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.strokeStyle = '#3a4250'; ctx.lineWidth = limbW;
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(p.x+faceDir*4, p.y, 10, 6, 0, 0, Math.PI*2); ctx.fill();
      });

      // torso: one big rounded belly shape (not a thin line) spanning hip-to-shoulder, filled with outfit color
      const midX = (sk.hip.x+sk.shoulder.x)/2, midY = (sk.hip.y+sk.shoulder.y)/2;
      ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(midX, midY, TORSO_LEN*0.46, TORSO_LEN*0.62, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // female-coded skirt accent, flaring out below the belly — scaled up for this style's chubbier
      // proportions, same idea as the bold style's skirt (js/render.js)
      if(sk.gender === 'female'){
        ctx.beginPath();
        ctx.moveTo(sk.hip.x-22, sk.hip.y+4);
        ctx.lineTo(sk.hip.x+22, sk.hip.y+4);
        ctx.lineTo(sk.hip.x, sk.hip.y+55);
        ctx.closePath();
        ctx.fillStyle = sk.outfit;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2.5;
        ctx.fill(); ctx.stroke();
      }

      // arms: thick capsules, drawn over the torso
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW;
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand].forEach(p=>{
        ctx.fillStyle = sk.skin; ctx.beginPath(); ctx.arc(p.x, p.y, limbW*0.5, 0, Math.PI*2); ctx.fill();
      });

      // Body-worn accessories, shared with every other style's drawStickman.
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);

      // head: big filled circle
      ctx.fillStyle = sk.skin; ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HR, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // Simple messy hair "poof" using the character's own hair color — kept deliberately simple (one
      // shape, not the full hairStyle registry) since the reference art's hair reads as a single loose
      // silhouette rather than a distinct per-style haircut; hairColor customization still carries through.
      if(sk.hairStyle !== 'none'){
        ctx.fillStyle = sk.hairColor;
        ctx.beginPath();
        ctx.arc(sk.head.x - faceDir*HR*0.1, sk.head.y - HR*0.7, HR*0.95, Math.PI*1.02, Math.PI*1.98);
        ctx.fill();
      }
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);

      // face: big white "googly" eyes + one continuous furrowed eyebrow bar + an exaggerated mouth.
      // Reuses em.browLeftY/browRightY/mouth/eyeScale (js/emotions.js) exactly like drawFace does, so
      // every emotion (including the big "Extreme" reactions) drives this face the same way it drives
      // every other style's — only the shapes are bigger/rounder/filled instead of thin ink lines.
      const wide = Math.max(1, em.eyeScale || 1);
      const eyeY = sk.head.y - HR*0.05;
      const eyeSpacing = HR*0.4;
      const eyeCX = sk.head.x + faceDir*HR*0.12;
      const lEyeX = eyeCX - eyeSpacing, rEyeX = eyeCX + eyeSpacing;
      const r = 6.5*wide;
      [lEyeX, rEyeX].forEach(exx=>{
        ctx.beginPath(); ctx.ellipse(exx, eyeY, r*0.82, r, 0, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(exx, eyeY + r*0.15, r*0.34, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
      });
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(lEyeX - r*0.9, eyeY - r*1.0 + em.browLeftY*0.55);
      ctx.lineTo(rEyeX + r*0.9, eyeY - r*1.0 + em.browRightY*0.55);
      ctx.stroke();

      const mx = sk.head.x + faceDir*HR*0.08, my = sk.head.y + HR*0.62;
      ctx.lineWidth = 3;
      if(pose.mouthOpen > 0.4){
        ctx.beginPath(); ctx.ellipse(mx, my, 9*Math.max(1,wide*0.7), 11*Math.max(1,wide*0.7), 0, 0, Math.PI*2);
        ctx.fillStyle = '#7a2020'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(mx-8, my-10, 16, 4);
      } else if(em.mouth === 'smile'){
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(mx, my-5, 10, 0.1*Math.PI, 0.9*Math.PI); ctx.stroke();
      } else if(em.mouth === 'frown'){
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(mx, my+9, 10, 1.1*Math.PI, 1.9*Math.PI); ctx.stroke();
      } else if(em.mouth === 'o' || em.mouth === 'jawDrop' || em.mouth === 'grimace'){
        ctx.beginPath(); ctx.ellipse(mx, my, 8, em.mouth==='jawDrop'?13:9, 0, 0, Math.PI*2);
        ctx.fillStyle = '#7a2020'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
      } else {
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(mx-9,my); ctx.lineTo(mx+9,my); ctx.stroke();
      }

      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);

      ctx.fillStyle = '#333'; ctx.font = 'bold 13px "Comic Sans MS", cursive'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  ghost: {
    label: 'Doodle Ghost',
    // A minimal "cute AI-doodle mascot" look, inspired by the viral trend of a simple ghost/blob
    // character composited into real photos (see the reference request: a round head, plain black
    // oval eyes, no visible legs, soft blob body/arms ending in dark mitt hands). This style is meant
    // to be used together with the "Custom photo..." background (js/backgrounds.js), which already
    // lets a user upload their own photo — the doodle then reads like a simple sticker sitting on top
    // of it. Still driven entirely by computeSkeleton()'s shared joint math and the EMOTIONS registry
    // (mouth/eyeScale), so every existing pose/action/emotion still works — this style just skips
    // drawing legs (the reference character never has visible legs) and softens everything into
    // rounded blob shapes instead of thin stick lines.
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const em = EMOTIONS[sk.emotion] || EMOTIONS.neutral;
      const HR = HEAD_R * 1.15;
      const armW = LW * 2.4;
      const mittR = armW * 0.62;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // No legs/feet drawn (the reference character floats/sits without visible legs) — instead a
      // soft rounded "base" blob grounds the character where its feet would otherwise be.
      ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sk.hip.x, GROUND_Y - 6, HEAD_R*0.9, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // torso: one soft rounded blob spanning hip-to-shoulder (a "ghost body", not articulated limbs)
      const midX = (sk.hip.x+sk.shoulder.x)/2, midY = (sk.hip.y+sk.shoulder.y)/2;
      ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(midX, midY, TORSO_LEN*0.4, TORSO_LEN*0.58, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // arms: soft rounded capsules ending in dark mitt "hands" — always dark regardless of skin
      // tone/outfit, matching the reference art's contrast-mitt look.
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.strokeStyle = sk.outfit; ctx.lineWidth = armW;
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand].forEach(p=>{
        ctx.fillStyle = '#26262b'; ctx.beginPath(); ctx.arc(p.x, p.y, mittR, 0, Math.PI*2); ctx.fill();
      });

      // Body-worn accessories, shared with every other style's drawStickman.
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);

      // head: plain round white/light head, no hair drawn (the reference character is bald/hairless —
      // hairStyle 'none' is respected, but any other hairStyle is skipped here on purpose to keep the
      // silhouette reading as the simple ghost shape rather than a normal character with hair).
      ctx.fillStyle = '#fbfbfd'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);

      // face: two plain solid-black oval eyes (no sclera/pupil split, matching the reference's flat
      // "googly-less" look) plus a small, minimal mouth driven by the same em.mouth/pose.mouthOpen
      // every other style already uses, so emotions/talking still read even on this stripped-down face.
      const wide = Math.max(1, em.eyeScale || 1);
      const eyeY = sk.head.y - HR*0.05;
      const eyeSpacing = HR*0.38;
      const eyeCX = sk.head.x + faceDir*HR*0.1;
      ctx.fillStyle = '#111';
      [eyeCX-eyeSpacing, eyeCX+eyeSpacing].forEach(exx=>{
        ctx.beginPath(); ctx.ellipse(exx, eyeY, 4.2*wide, 7*wide, 0, 0, Math.PI*2); ctx.fill();
      });

      const mx = sk.head.x + faceDir*HR*0.08, my = sk.head.y + HR*0.5;
      if(pose.mouthOpen > 0.4){
        ctx.beginPath(); ctx.ellipse(mx, my, 6, 8, 0, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
      } else if(em.mouth === 'smile'){
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(mx, my-3, 6, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
      } else if(em.mouth === 'frown'){
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(mx, my+6, 6, 1.15*Math.PI, 1.85*Math.PI); ctx.stroke();
      } else if(em.mouth === 'o' || em.mouth === 'jawDrop' || em.mouth === 'grimace'){
        ctx.beginPath(); ctx.ellipse(mx, my, 4.5, em.mouth==='jawDrop'?7:5, 0, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
      } else {
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(mx, my, 3, 1.6, 0, 0, Math.PI*2); ctx.fill();
      }

      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);

      ctx.fillStyle = '#333'; ctx.font = '12px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  sketchy: {
    label: 'Hand-Drawn Sketch',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8;
      // deterministic pseudo-random jitter (seeded by position, not by frame time) so the wobble
      // reads as a consistent hand-drawn line rather than flickering noise between frames
      function jitter(seed){ const v = Math.sin(seed*12.9898)*43758.5453; return (v - Math.floor(v) - 0.5)*3; }
      function sketchLine(p1, p2, seed){
        for(let pass=0; pass<2; pass++){
          const jx1 = jitter(seed+pass*7.1), jy1 = jitter(seed+pass*3.3+1);
          const jx2 = jitter(seed+pass*5.7+2), jy2 = jitter(seed+pass*9.1+3);
          ctx.beginPath(); ctx.moveTo(p1.x+jx1, p1.y+jy1); ctx.lineTo(p2.x+jx2, p2.y+jy2); ctx.stroke();
        }
      }
      let seed = x*0.13;
      sketchLine(sk.hip, sk.lKnee, seed++); sketchLine(sk.lKnee, sk.lFoot, seed++);
      sketchLine(sk.hip, sk.rKnee, seed++); sketchLine(sk.rKnee, sk.rFoot, seed++);
      // female-coded skirt accent, sketched with the same jitter wobble as every other line here
      if(sk.gender === 'female'){
        const sj = seed++;
        ctx.beginPath();
        ctx.moveTo(sk.hip.x-13+jitter(sj), sk.hip.y+2+jitter(sj+1));
        ctx.lineTo(sk.hip.x+13+jitter(sj+2), sk.hip.y+2+jitter(sj+3));
        ctx.lineTo(sk.hip.x+jitter(sj+4), sk.hip.y+38+jitter(sj+5));
        ctx.closePath();
        ctx.stroke();
      }
      sketchLine(sk.hip, sk.shoulder, seed++);
      sketchLine(sk.shoulder, sk.lElbow, seed++); sketchLine(sk.lElbow, sk.lHand, seed++);
      sketchLine(sk.shoulder, sk.rElbow, seed++); sketchLine(sk.rElbow, sk.rHand, seed++);
      ctx.beginPath();
      const steps = 20;
      for(let i=0;i<=steps;i++){
        const ang = (i/steps)*Math.PI*2;
        const jr = 1.2*Math.sin(ang*3+seed);
        const px = sk.head.x + Math.cos(ang)*(HEAD_R+jr);
        const py = sk.head.y + Math.sin(ang)*(HEAD_R+jr);
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.stroke();
      // Fill the head with skin tone (a sketch is still a person, not just an outline) before the
      // shared drawHair/drawFace/accessory functions add hair, face, and accessories on top — this
      // gives full parity with the bold style for every customization option (skin/hair/eyes/accessory).
      ctx.fillStyle = sk.skin; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R-1, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Body-worn accessories, shared with the bold style's drawStickman (js/render.js).
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);
      drawHair(sk.head, faceDir, sk.hairStyle, sk.hairColor);
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);
      drawFace(sk.head, faceDir, sk.eyeStyle, sk.emotion, pose.mouthOpen);
      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8;
      [sk.lHand, sk.rHand].forEach(p=>{ ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.stroke(); });
      ctx.fillStyle = '#555'; ctx.font = 'italic 12px "Comic Sans MS", cursive'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  stickerDoodle: {
    label: 'Sticker Doodle',
    // A "hand-drawn sticker mascot" look with full arms/legs, a spiky messy hair crown, big round
    // googly eyes with separate expressive eyebrows (one per eye, not a single bar), crisp white
    // sneakers, and rounded fist hands — designed to read well as a sticker composited over a real
    // photo background (the "Custom photo..." option in js/backgrounds.js), same spirit as Doodle
    // Ghost but with a completely different, more standard mascot silhouette (visible limbs, not a
    // legless blob). Still driven entirely by computeSkeleton()'s shared joint math and the EMOTIONS
    // registry, so every existing pose/action/emotion (including headBoost/armPose "Extreme
    // reactions") drives this face/body the same way it drives every other style.
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const em = EMOTIONS[sk.emotion] || EMOTIONS.neutral;
      const limbW = LW * 1.7;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // legs: outfit-colored capsule limbs, black outline, ending in crisp white sneakers
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW;
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.fillStyle = '#fefefe'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(p.x+faceDir*4, p.y, 9, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });

      // female-coded skirt accent, same idea as every other style's skirt
      if(sk.gender === 'female'){
        ctx.beginPath();
        ctx.moveTo(sk.hip.x-14, sk.hip.y+2);
        ctx.lineTo(sk.hip.x+14, sk.hip.y+2);
        ctx.lineTo(sk.hip.x, sk.hip.y+42);
        ctx.closePath();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
        ctx.fill(); ctx.stroke();
      }

      // torso: thick outfit-colored capsule line with a thin black outline stroke on top
      ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW*1.3;
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();

      // arms: capsule limbs ending in rounded fists
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW;
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand].forEach(p=>{
        ctx.fillStyle = sk.skin; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });

      // Body-worn accessories, shared with every other style's drawStickman.
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      if(sk.accessory === 'sword') drawSword(sk.rHand, faceDir);
      if(sk.accessory === 'katana') drawKatana(sk.rHand, faceDir);
      if(sk.accessory === 'pistol') drawPistol(sk.rHand, faceDir);
      if(sk.accessory === 'ak47') drawAK47(sk.lHand, sk.rHand, faceDir);

      // head: skin-colored circle, black outline
      ctx.fillStyle = sk.skin; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // messy spiky "crown" of hair — the style's signature silhouette, kept as one simplified
      // zigzag shape (not the full hairStyle registry) so it always reads as this style's messy-doodle
      // look; hairColor customization still carries through, and 'none' still means no hair drawn.
      if(sk.hairStyle !== 'none'){
        ctx.fillStyle = sk.hairColor; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
        const spikes = 7;
        ctx.beginPath();
        ctx.moveTo(sk.head.x - HEAD_R*1.05, sk.head.y - HEAD_R*0.1);
        for(let i=0;i<=spikes;i++){
          const t = i/spikes;
          const ang = Math.PI*(1.08 - t*1.16);
          const baseX = sk.head.x + Math.cos(ang)*HEAD_R*1.05;
          const baseY = sk.head.y - Math.sin(ang)*HEAD_R*1.05;
          const tipLen = 1.55 + (i%2 ? 0.25 : 0);
          const tipX = sk.head.x + Math.cos(ang)*HEAD_R*tipLen;
          const tipY = sk.head.y - Math.sin(ang)*HEAD_R*tipLen;
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(baseX, baseY);
        }
        ctx.lineTo(sk.head.x + HEAD_R*1.05, sk.head.y - HEAD_R*0.1);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);

      // face: big round white googly eyes + two separate bold expressive eyebrows (one per eye) +
      // mouth — same em.browLeftY/browRightY/mouth/eyeScale fields every other style's face already
      // uses, so all existing emotions (including talking + Extreme reactions) drive this face too.
      const wide = Math.max(1, em.eyeScale || 1);
      const eyeY = sk.head.y - HEAD_R*0.08;
      const eyeSpacing = HEAD_R*0.4;
      const eyeCX = sk.head.x + faceDir*HEAD_R*0.1;
      const lEyeX = eyeCX - eyeSpacing, rEyeX = eyeCX + eyeSpacing;
      const r = 5.2*wide;
      [lEyeX, rEyeX].forEach(exx=>{
        ctx.beginPath(); ctx.ellipse(exx, eyeY, r*0.8, r, 0, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(exx + faceDir*r*0.15, eyeY + r*0.1, r*0.4, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
      });
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(lEyeX - r*0.9, eyeY - r*1.3 + em.browLeftY*0.4); ctx.lineTo(lEyeX + r*0.7, eyeY - r*1.6 + em.browLeftY*0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rEyeX - r*0.7, eyeY - r*1.6 + em.browRightY*0.4); ctx.lineTo(rEyeX + r*0.9, eyeY - r*1.3 + em.browRightY*0.4); ctx.stroke();

      const mx = sk.head.x + faceDir*HEAD_R*0.08, my = sk.head.y + HEAD_R*0.55;
      ctx.lineWidth = 2.4;
      if(pose.mouthOpen > 0.4){
        ctx.beginPath(); ctx.ellipse(mx, my, 6*Math.max(1,wide*0.7), 8*Math.max(1,wide*0.7), 0, 0, Math.PI*2);
        ctx.fillStyle = '#7a2020'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
      } else if(em.mouth === 'smile'){
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(mx, my-3, 7, 0.1*Math.PI, 0.9*Math.PI); ctx.stroke();
      } else if(em.mouth === 'frown'){
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(mx, my+6, 7, 1.1*Math.PI, 1.9*Math.PI); ctx.stroke();
      } else if(em.mouth === 'o' || em.mouth === 'jawDrop' || em.mouth === 'grimace'){
        ctx.beginPath(); ctx.ellipse(mx, my, 5, em.mouth==='jawDrop'?9:6, 0, 0, Math.PI*2);
        ctx.fillStyle = '#7a2020'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
      } else {
        ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(mx-6,my); ctx.lineTo(mx+6,my); ctx.stroke();
      }

      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);

      ctx.fillStyle = '#333'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  }
};
const STYLE_LIST = Object.keys(STYLES).map(id => ({ id, label: STYLES[id].label }));
