// ---------- Stickman Duel: lightweight 2-player sparring demo ----------
// Deliberately NOT a real standalone game engine — it's a thin state machine (position/health/attack
// timing) wrapped around the SAME rendering pipeline the real animation tool already uses: fighters are
// just plain scene "characters" (appearance + x/faceDir/clipId/pose), and every frame gets handed to
// scene.js's existing renderFrame(frame), the exact function that draws normal scene playback. That's
// what makes the weapon effects (bullet sparks, blood splashes) "just work" here with zero duplicated
// code — renderFrame already scans frame.characters for a nearby facing opponent on clipId 'shoot'/
// 'slash' and draws the effect on them; Duel only has to set clipId correctly and it inherits that for
// free. Reuses the single shared #stage canvas by reparenting it into the overlay while open, same
// technique as the Pose Designer (js/ui.js) — see openPoseDesigner's block comment for why a second
// canvas isn't an option (every draw function in js/render.js closes over one module-level ctx/canvas).
const DUEL_WEAPONS = {
  '':      { label:'Fists',  clipId:'kick',  duration:0.45, impactT:0.16, cooldown:0.50, damage:8,  range:130 },
  sword:   { label:'Sword',  clipId:'slash', duration:0.55, impactT:0.30, cooldown:0.60, damage:16, range:170 },
  katana:  { label:'Katana', clipId:'slash', duration:0.55, impactT:0.30, cooldown:0.60, damage:16, range:170 },
  pistol:  { label:'Pistol', clipId:'shoot', duration:0.30, impactT:0.08, cooldown:0.55, damage:12, range:400 },
  ak47:    { label:'AK47',   clipId:'shoot', duration:0.30, impactT:0.08, cooldown:0.45, damage:18, range:420 }
};
const DUEL_MOVE_SPEED = 160; // px/sec
const DUEL_MIN_X = 60, DUEL_MAX_X = 740;

function makeDuelFighter(paletteIdx, x, faceDir){
  const appearance = makeCharacter(Object.assign({}, DEFAULT_CHARACTER_PALETTE[paletteIdx]));
  appearance.accessory = null;
  return {
    appearance: appearance, x: x, faceDir: faceDir, hp: 100, maxHp: 100,
    weapon: '', state: 'idle', stateT: 0, idleT: paletteIdx*1.7, cooldown: 0, impactApplied: false
  };
}

const duel = {
  active: false,
  phase: 'setup', // 'setup' | 'fighting' | 'ended'
  fighters: [ makeDuelFighter(0, 260, 1), makeDuelFighter(1, 540, -1) ],
  winnerIdx: null,
  stageOriginalParent: null, stageOriginalNextSibling: null,
  keysDown: {} // live-held movement keys, polled every tick for smooth motion
};

// Resets both fighters to starting position/health/weapon-selection-preserved state — used both when
// first opening the overlay and for the Rematch button (which deliberately keeps whatever weapons were
// last picked, since re-picking the same weapon for another round is the common case).
function resetDuelFighters(){
  const w0 = duel.fighters[0] ? duel.fighters[0].weapon : '';
  const w1 = duel.fighters[1] ? duel.fighters[1].weapon : '';
  duel.fighters = [ makeDuelFighter(0, 260, 1), makeDuelFighter(1, 540, -1) ];
  duel.fighters[0].weapon = w0; duel.fighters[1].weapon = w1;
  duel.winnerIdx = null;
}

function duelOpponent(i){ return duel.fighters[i === 0 ? 1 : 0]; }

// Starts a one-shot attack (kick/slash/shoot depending on the fighter's chosen weapon) if their
// cooldown has elapsed. Actual damage is applied later, once, at the weapon's impactT — see tickDuel —
// rather than the instant the key is pressed, so a hit reads as landing when the swing/shot visually
// connects rather than the moment you press the button.
function duelTryAttack(i){
  const f = duel.fighters[i];
  if(!f || duel.phase !== 'fighting' || f.cooldown > 0 || f.state === 'attack') return;
  const cfg = DUEL_WEAPONS[f.weapon] || DUEL_WEAPONS[''];
  f.state = 'attack'; f.stateT = 0; f.impactApplied = false;
}

document.addEventListener('keydown', (e)=>{
  if(!duel.active) return;
  const k = e.key.toLowerCase();
  if(['a','d','arrowleft','arrowright'].includes(k)) duel.keysDown[k] = true;
  if(k === 'f') duelTryAttack(0);
  if(k === 'l') duelTryAttack(1);
});
document.addEventListener('keyup', (e)=>{
  const k = e.key.toLowerCase();
  if(['a','d','arrowleft','arrowright'].includes(k)) duel.keysDown[k] = false;
});

// Builds one frame in the exact shape scene.js's renderFrame(frame) expects (see evaluateScene's
// return value) — this is what lets Duel reuse the real drawing/weapon-effect pipeline verbatim instead
// of reimplementing stickman rendering. localT only needs to be *a* number (used for prop/idle sway
// animation phase), not a meaningful scene timestamp, since Duel isn't driven by a timeline.
function buildDuelFrame(){
  const characters = duel.fighters.map((f, i)=>{
    const opp = duelOpponent(i);
    // Face the opponent dynamically rather than a fixed layout direction — if the two fighters cross
    // past each other while moving, facing should flip immediately, the way real fighting games do it.
    if(Math.abs(opp.x - f.x) > 1) f.faceDir = opp.x > f.x ? 1 : -1;
    const cfg = DUEL_WEAPONS[f.weapon] || DUEL_WEAPONS[''];
    let pose, clipId;
    if(f.state === 'attack'){
      clipId = cfg.clipId;
      pose = (CLIPS[clipId] || CLIPS.idle).pose(f.stateT, {});
    } else if(f.state === 'hitstun'){
      clipId = 'idle';
      pose = poseIdle(f.idleT, 0);
      // A brief backward flinch away from the opponent, easing out over the hitstun window — cheap but
      // reads clearly as "just got hit" without needing a dedicated pose function.
      const flinch = Math.max(0, 1 - f.stateT/0.28);
      pose.torsoLean += (-f.faceDir) * 0.35 * flinch;
      pose.headTilt += (-f.faceDir) * 0.2 * flinch;
    } else {
      clipId = 'idle';
      pose = poseIdle(f.idleT, 0);
    }
    return { id: f.appearance.id, x: f.x, faceDir: f.faceDir, appearance: f.appearance, clipId: clipId, pose: pose };
  });
  return {
    characters: characters, animals: [], vehicles: [], customElements: [],
    dialogue: null, background: 'stadium', weather: 'none',
    furniture: 'chair', food: 'sandwich', style: (typeof state !== 'undefined' && state.scene.style) || 'bold',
    localT: performance.now()/1000, totalDuration: 1, povDriver: null, activeSegmentId: null
  };
}

// Small canvas UI drawn on top of renderFrame's output: health bars, weapon labels, and a "POW"-style
// burst for unarmed hits (fists don't get a built-in effect from renderFrame the way shoot/slash do).
function drawDuelHud(){
  const barW = 260, barH = 16, pad = 24;
  ctx.save();
  ctx.font = 'bold 13px sans-serif'; ctx.textBaseline = 'middle';
  [0,1].forEach(i=>{
    const f = duel.fighters[i];
    const x = i === 0 ? pad : (canvas.width - pad - barW);
    const y = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x-2, y-2, barW+4, barH+4);
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(x, y, barW, barH);
    const pct = Math.max(0, f.hp / f.maxHp);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : (pct > 0.2 ? '#f59e0b' : '#ef4444');
    ctx.fillRect(x, y, barW*pct, barH);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = '#1b1f27';
    const label = 'P' + (i+1) + ' — ' + (DUEL_WEAPONS[f.weapon]||DUEL_WEAPONS['']).label;
    ctx.textAlign = i === 0 ? 'left' : 'right';
    ctx.fillText(label, i === 0 ? x : x+barW, y + barH + 14);
  });
  ctx.restore();
}

function drawDuelPow(f){
  const cfg = DUEL_WEAPONS[f.weapon] || DUEL_WEAPONS[''];
  if(cfg.clipId !== 'kick') return; // shoot/slash already get a real effect from renderFrame
  const opp = duelOpponent(duel.fighters.indexOf(f));
  ctx.save();
  ctx.translate((f.x + opp.x)/2, GROUND_Y - 180);
  ctx.rotate(-0.15);
  ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 4;
  ctx.strokeText('POW!', 0, 0); ctx.fillText('POW!', 0, 0);
  ctx.restore();
}

function endDuel(loserIdx){
  duel.phase = 'ended';
  duel.winnerIdx = loserIdx === 0 ? 1 : 0;
  const setupEl = document.getElementById('duelSetup');
  const resultEl = document.getElementById('duelResult');
  const winnerText = document.getElementById('duelWinnerText');
  if(setupEl) setupEl.style.display = 'none';
  if(resultEl) resultEl.style.display = '';
  if(winnerText) winnerText.textContent = 'Player ' + (duel.winnerIdx+1) + ' wins!';
}

// Called once per animation frame by the main loop (js/ui.js) whenever duel.active is true, instead of
// the normal scene render — see that loop's duel.active branch.
function tickDuel(dt){
  if(duel.phase === 'fighting'){
    duel.fighters.forEach((f, i)=>{
      f.idleT += dt;
      if(f.cooldown > 0) f.cooldown = Math.max(0, f.cooldown - dt);
      if(f.state === 'attack' || f.state === 'hitstun') f.stateT += dt;
      const cfg = DUEL_WEAPONS[f.weapon] || DUEL_WEAPONS[''];
      if(f.state === 'attack'){
        if(!f.impactApplied && f.stateT >= cfg.impactT){
          f.impactApplied = true;
          const opp = duelOpponent(i);
          const dist = Math.abs(opp.x - f.x);
          const facingOpp = Math.sign(opp.x - f.x) === f.faceDir || dist < 4;
          if(dist <= cfg.range && facingOpp && opp.hp > 0){
            opp.hp = Math.max(0, opp.hp - cfg.damage);
            opp.state = 'hitstun'; opp.stateT = 0;
            if(cfg.clipId === 'kick') drawDuelPow(f); // one-off burst; harmless if drawn slightly early
            if(opp.hp <= 0){ endDuel(i === 0 ? 1 : 0); }
          }
        }
        if(f.stateT >= cfg.duration){ f.state = 'idle'; f.stateT = 0; f.cooldown = cfg.cooldown; }
      } else if(f.state === 'hitstun'){
        if(f.stateT >= 0.28) f.state = 'idle';
      } else {
        // Movement only while standing (not mid-attack/hitstun) — P1: A/D, P2: Left/Right arrows.
        const left = i === 0 ? duel.keysDown['a'] : duel.keysDown['arrowleft'];
        const right = i === 0 ? duel.keysDown['d'] : duel.keysDown['arrowright'];
        if(left) f.x -= DUEL_MOVE_SPEED*dt;
        if(right) f.x += DUEL_MOVE_SPEED*dt;
        f.x = Math.max(DUEL_MIN_X, Math.min(DUEL_MAX_X, f.x));
      }
    });
  }
  renderFrame(buildDuelFrame());
  if(duel.phase !== 'setup') drawDuelHud();
}

function openDuelOverlay(){
  const overlay = document.getElementById('duelOverlay');
  const mount = document.getElementById('duelPreviewMount');
  if(!overlay || !mount) return;
  duel.active = true; duel.phase = 'setup';
  resetDuelFighters();
  const setupEl = document.getElementById('duelSetup');
  const resultEl = document.getElementById('duelResult');
  if(setupEl) setupEl.style.display = '';
  if(resultEl) resultEl.style.display = 'none';
  duel.stageOriginalParent = canvas.parentNode;
  duel.stageOriginalNextSibling = canvas.nextSibling;
  mount.insertBefore(canvas, mount.firstChild);
  overlay.style.display = 'flex';
  renderFrame(buildDuelFrame()); // paint an idle preview immediately, before Start is clicked
}
function closeDuelOverlay(){
  duel.active = false; duel.phase = 'setup';
  if(duel.stageOriginalParent){
    if(duel.stageOriginalNextSibling) duel.stageOriginalParent.insertBefore(canvas, duel.stageOriginalNextSibling);
    else duel.stageOriginalParent.appendChild(canvas);
  }
  const overlay = document.getElementById('duelOverlay');
  if(overlay) overlay.style.display = 'none';
  if(typeof forceRedraw === 'function') forceRedraw(); // repaint the real scene now that #stage is back
}

function initDuelWiring(){
  const openBtn = document.getElementById('startDuelBtn');
  const navBtn = document.getElementById('navDuelLink');
  const closeBtn = document.getElementById('duelCloseBtn');
  const startBtn = document.getElementById('duelStartBtn');
  const rematchBtn = document.getElementById('duelRematchBtn');
  const toCreateBtn = document.getElementById('duelToCreateBtn');
  const p1Sel = document.getElementById('duelP1Weapon');
  const p2Sel = document.getElementById('duelP2Weapon');
  if(openBtn) openBtn.addEventListener('click', openDuelOverlay);
  if(navBtn) navBtn.addEventListener('click', openDuelOverlay);
  if(closeBtn) closeBtn.addEventListener('click', closeDuelOverlay);
  if(p1Sel) p1Sel.addEventListener('change', (e)=>{ duel.fighters[0].weapon = e.target.value; duel.fighters[0].appearance.accessory = e.target.value || null; });
  if(p2Sel) p2Sel.addEventListener('change', (e)=>{ duel.fighters[1].weapon = e.target.value; duel.fighters[1].appearance.accessory = e.target.value || null; });
  if(startBtn) startBtn.addEventListener('click', ()=>{
    duel.fighters[0].appearance.accessory = duel.fighters[0].weapon || null;
    duel.fighters[1].appearance.accessory = duel.fighters[1].weapon || null;
    duel.phase = 'fighting';
    const setupEl = document.getElementById('duelSetup');
    if(setupEl) setupEl.style.display = 'none';
  });
  if(rematchBtn) rematchBtn.addEventListener('click', ()=>{
    resetDuelFighters();
    duel.fighters[0].appearance.accessory = duel.fighters[0].weapon || null;
    duel.fighters[1].appearance.accessory = duel.fighters[1].weapon || null;
    duel.phase = 'fighting';
    const resultEl = document.getElementById('duelResult');
    if(resultEl) resultEl.style.display = 'none';
  });
  if(toCreateBtn) toCreateBtn.addEventListener('click', ()=>{
    closeDuelOverlay();
    const sceneBtn = document.getElementById('startSceneDesignBtn');
    if(sceneBtn) sceneBtn.click();
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDuelWiring);
else initDuelWiring();
