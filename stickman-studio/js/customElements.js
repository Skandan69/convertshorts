// ---------- custom user-uploaded images/characters: a free-floating "sticker" layer ----------
// Lets a user drop in literally any image (a hand-drawn character, a logo, a photo cutout) and animate
// it with simple one-click presets — deliberately NOT full skeleton posing (an arbitrary uploaded image
// has no joints for computeSkeleton to move), closer to how Canva animates an uploaded element: the
// whole image moves/scales/rotates/fades as one rigid layer. Each element has a fixed "home" transform
// (x, y, scale, rotation) set via the Custom Images panel (js/ui.js), and each segment can independently
// pick an animation preset for it — same per-segment-override pattern as a character's action.

const CUSTOM_ANIM_PRESETS = {
    none:  { label: 'Static (no animation)', fn: ()=> ({ offsetX:0, offsetY:0, scaleMul:1, rotationDeg:0, opacity:1 }) },
  fadeIn: {
    label: 'Fade In',
          fn: (t)=>{ const p = Math.min(1, t/0.6); return { offsetX:0, offsetY:0, scaleMul:1, rotationDeg:0, opacity:p }; }
},
  slideInLeft: {
    label: 'Slide In (from left)',
    fn: (t)=>{ const p = Math.min(1, t/0.6); const ease = 1-Math.pow(1-p,3); return { offsetX:(1-ease)*-260, offsetY:0, scaleMul:1, rotationDeg:0, opacity:Math.min(1,t/0.25) }; }
},
  slideInRight: {
    label: 'Slide In (from right)',
    fn: (t)=>{ const p = Math.min(1, t/0.6); const ease = 1-Math.pow(1-p,3); return { offsetX:(1-ease)*260, offsetY:0, scaleMul:1, rotationDeg:0, opacity:Math.min(1,t/0.25) }; }
},
  slideInTop: {
    label: 'Slide In (from top)',
    fn: (t)=>{ const p = Math.min(1, t/0.6); const ease = 1-Math.pow(1-p,3); return { offsetX:0, offsetY:(1-ease)*-200, scaleMul:1, rotationDeg:0, opacity:Math.min(1,t/0.25) }; }
},
  slideInBottom: {
    label: 'Slide In (from bottom)',
    fn: (t)=>{ const p = Math.min(1, t/0.6); const ease = 1-Math.pow(1-p,3); return { offsetX:0, offsetY:(1-ease)*200, scaleMul:1, rotationDeg:0, opacity:Math.min(1,t/0.25) }; }
},
  popIn: {
    label: 'Pop / Bounce In',
    fn: (t)=>{
      const dur = 0.55;
      if(t >= dur) return { offsetX:0, offsetY:0, scaleMul:1, rotationDeg:0, opacity:1 };
      const p = t/dur;
      const c1 = 1.70158, c3 = c1+1;
      const scaleMul = 1 + (c3*Math.pow(p-1,3) + c1*Math.pow(p-1,2));
      return { offsetX:0, offsetY:0, scaleMul: Math.max(0, scaleMul), rotationDeg:0, opacity: Math.min(1, t/0.2) };
}
},
  spin: {
    label: 'Spin (loops)',
    fn: (t)=> ({ offsetX:0, offsetY:0, scaleMul:1, rotationDeg: (t*180) % 360, opacity:1 })
},
  pulse: {
    label: 'Pulse (loops)',
    fn: (t)=> ({ offsetX:0, offsetY:0, scaleMul: 1 + Math.sin(t*4)*0.08, rotationDeg:0, opacity:1 })
}
};
const CUSTOM_ANIM_LIST = Object.keys(CUSTOM_ANIM_PRESETS).map(id=> ({ id, label: CUSTOM_ANIM_PRESETS[id].label }));

function evalCustomElementAnim(presetId, localT){
  const preset = CUSTOM_ANIM_PRESETS[presetId] || CUSTOM_ANIM_PRESETS.none;
  return preset.fn(localT);
}

function drawCustomElement(el){
  if(!el.img || !el.img.complete || !el.img.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, el.opacity));
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rotation * Math.PI/180);
  const w = el.img.naturalWidth * el.scale, h = el.img.naturalHeight * el.scale;
  ctx.drawImage(el.img, -w/2, -h/2, w, h);
  ctx.restore();
}
