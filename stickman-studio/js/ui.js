// ---------- main render loop ----------
let elapsed = 0, lastNow = performance.now();
// Cache of the most recently evaluated frame — used outside the render loop for canvas hit-testing
// (drag-to-reposition below) so we know exactly where each character was actually drawn this frame,
// rather than recomputing scene evaluation separately and risking it drifting out of sync.
let lastFrame = null;
function loop(now){
  const dt = (now - lastNow)/1000;
  lastNow = now;
  // Stickman Duel (js/duel.js) also takes over the single shared canvas while open, same reparenting
  // trick as the Pose Designer below — checked first since Duel and the Designer are never open at the
  // same time, but if they somehow were, the faster-paced game loop should win the canvas.
  if(typeof duel !== 'undefined' && duel.active){
    tickDuel(dt);
  } else if(typeof designer !== 'undefined' && designer.active){
    if(designer.playing) designer.elapsed += dt;
    const pose = designer.playing ? evalKeyframePose(designer.elapsed, designer.keyframes) : Object.assign({}, designer.currentPose);
    // altitude is deliberately left off this hand-authored pose - buildDesignerFrame below now
    // computes it live from the Movement controls (designer.vertSpeed/vertDir) plus whatever the
    // real scene already had, rather than trusting a stale value here.
    renderFrame(buildDesignerFrame(pose));
    // Drag handles only make sense over a single held pose, not mid-animation during Play sequence.
    if(!designer.playing && typeof drawDesignerHandles === 'function') drawDesignerHandles();
  } else {
    if(state.playing) elapsed += dt*state.speed;
    lastFrame = evaluateScene(state.scene, elapsed);
    renderFrame(lastFrame);
    if(canvasDrag) drawCanvasDragGhost();
    updateTimelineStripPlayhead();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Forces an immediate repaint outside the rAF loop. Needed because rAF is throttled/paused by the
// browser when the tab isn't focused/visible (and doesn't tick at all while playback is paused), so
// changing a dropdown (Art Style, Background, Weather, Furniture, Food) could otherwise sit invisibly
// in state until the next natural animation frame. Every listener that mutates state.scene outside of
// normal playback should call this right after.
function forceRedraw(){ lastFrame = evaluateScene(state.scene, elapsed); renderFrame(lastFrame); if(canvasDrag) drawCanvasDragGhost(); }

// ---------- Scene panel wiring ----------
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const generateStatus = document.getElementById('generateStatus');
const presetSelect = document.getElementById('presetSelect');
const bgSelect = document.getElementById('bgSelect');
const speedRange = document.getElementById('speedRange');
const speedLabel = document.getElementById('speedLabel');
const playPauseBtn = document.getElementById('playPauseBtn');
const restartBtn = document.getElementById('restartBtn');
const exportBtn = document.getElementById('exportBtn');
const previewVideo = document.getElementById('previewVideo');
const downloadLink = document.getElementById('downloadLink');
const segmentList = document.getElementById('segmentList');
const timelineStrip = document.getElementById('timelineStrip');
// Drag-and-drop segment reordering (Canva-style), layered on top of the existing up/down buttons
// rather than replacing them — dragging is faster once there are many segments, arrows still work
// for precise single-step moves or when a mouse drag isn't practical (touch/accessibility).
let dragSegId = null;
segmentList.addEventListener('dragstart', (e)=>{
  const card = e.target.closest('.segment-card');
  if(!card) return;
  dragSegId = card.getAttribute('data-seg-id');
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('dragging');
});
segmentList.addEventListener('dragend', (e)=>{
  const card = e.target.closest('.segment-card');
  if(card) card.classList.remove('dragging');
  dragSegId = null;
});
segmentList.addEventListener('dragover', (e)=>{
  e.preventDefault();
  const card = e.target.closest('.segment-card');
  if(card) card.classList.add('drag-over');
});
segmentList.addEventListener('dragleave', (e)=>{
  const card = e.target.closest('.segment-card');
  if(card) card.classList.remove('drag-over');
});
segmentList.addEventListener('drop', (e)=>{
  e.preventDefault();
  const card = e.target.closest('.segment-card');
  segmentList.querySelectorAll('.drag-over').forEach(el=> el.classList.remove('drag-over'));
  if(!card || !dragSegId) return;
  const targetId = card.getAttribute('data-seg-id');
  if(targetId === dragSegId) return;
  const fromIdx = state.scene.timeline.findIndex(s=> s.id === dragSegId);
  const toIdx = state.scene.timeline.findIndex(s=> s.id === targetId);
  if(fromIdx === -1 || toIdx === -1) return;
  const [moved] = state.scene.timeline.splice(fromIdx, 1);
  state.scene.timeline.splice(toIdx, 0, moved);
  renderSegmentList();
  forceRedraw();
});
const timelineTotal = document.getElementById('timelineTotal');
const addSegmentBtn = document.getElementById('addSegmentBtn');

function loadPreset(key){
  const p = PRESETS[key];
  if(!p) return;
  state.scene.timeline = resolveIndexedTimeline(p.timeline, p.charCount);
  renderCharacterList();
  renderSegmentList();
  elapsed = 0;
}
// Applies a scene-plan result — from EITHER source: the instant offline keyword parser
// (parsePromptToScene, js/scene.js) or the AI planner (POST /api/generate-scene) — through one shared
// path. Both sources are built to return the exact same shape (background/weather/furniture/food/
// bodyType/charCount/timeline/animals/vehicles/summary), so nothing downstream needs to know or care
// which one produced it.
function applyGeneratedScene(result, statusPrefix){
  state.scene.background = result.background;
  state.scene.furniture = result.furniture;
  state.scene.timeline = resolveIndexedTimeline(result.timeline, result.charCount);
  if(state.scene.characters[0]) state.scene.characters[0].bodyType = result.bodyType;
  bgSelect.value = result.background;
  furnitureSelect.value = result.furniture;
  if(result.food){ state.scene.food = result.food; foodSelect.value = result.food; }
  if(result.weather){ state.scene.weather = result.weather; weatherSelect.value = result.weather; }
  state.scene.animals = result.animals || [];
  state.scene.vehicles = result.vehicles || [];
  renderAnimalList();
  renderVehicleList();
  renderCharacterList();
  renderSegmentList();
  elapsed = 0;
  generateStatus.textContent = (statusPrefix||'Built') + ' ' + result.summary.actions.length + ' segment' + (result.summary.actions.length===1?'':'s') +
    ' (' + result.summary.actions.join(' → ') + '), ' + result.summary.totalDuration.toFixed(1) + 's total. Fine-tune in the Timeline panel.';
}
generateBtn.addEventListener('click', ()=>{
  const text = promptInput.value.trim();
  if(!text){ generateStatus.textContent = 'Type a description first.'; return; }
  applyGeneratedScene(parsePromptToScene(text), 'Built');
});
presetSelect.addEventListener('change', ()=> loadPreset(presetSelect.value));
const bgImageInput = document.getElementById('bgImageInput');
const furnitureSelect = document.getElementById('furnitureSelect');
const foodSelect = document.getElementById('foodSelect');
const styleSelect = document.getElementById('styleSelect');
const weatherSelect = document.getElementById('weatherSelect');
// Populate the Background/Food/Style/Weather dropdowns from their registries (js/backgrounds.js,
// js/food.js, js/styles.js, js/weather.js) — adding a new entry there is enough for it to show up
// here, no HTML edits needed.
bgSelect.innerHTML = BACKGROUND_LIST.map(b=> '<option value="'+b.id+'">'+escapeHtml(b.label)+'</option>').join('');
bgSelect.value = state.scene.background;
foodSelect.innerHTML = FOOD_LIST.map(f=> '<option value="'+f.id+'">'+escapeHtml(f.label)+'</option>').join('');
foodSelect.value = state.scene.food;
styleSelect.innerHTML = STYLE_LIST.map(s=> '<option value="'+s.id+'">'+escapeHtml(s.label)+'</option>').join('');
styleSelect.value = state.scene.style;
weatherSelect.innerHTML = WEATHER_LIST.map(w=> '<option value="'+w.id+'">'+escapeHtml(w.label)+'</option>').join('');
weatherSelect.value = state.scene.weather;
styleSelect.addEventListener('change', ()=> { state.scene.style = styleSelect.value; forceRedraw(); });
foodSelect.addEventListener('change', ()=> { state.scene.food = foodSelect.value; forceRedraw(); });
bgSelect.addEventListener('change', ()=> { state.scene.background = bgSelect.value; forceRedraw(); });
weatherSelect.addEventListener('change', ()=> { state.scene.weather = weatherSelect.value; forceRedraw(); });
furnitureSelect.addEventListener('change', ()=> { state.scene.furniture = furnitureSelect.value; forceRedraw(); });
bgImageInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  // Neither failure path here used to be handled at all: picking a non-image file (a .txt, a renamed
  // extension, a corrupted download) meant img.onload simply never fired and NOTHING happened — no
  // background change, no message, no way to tell the upload silently failed versus still being read.
  // Both now reset the file input (so re-selecting the same filename fires 'change' again) and tell
  // the person plainly what went wrong instead of leaving them guessing.
  reader.onerror = function(){
    alert('Could not read that file. Please try a different image.');
    bgImageInput.value = '';
  };
  reader.onload = function(ev){
    const img = new Image();
    img.onload = function(){
      state.scene.customBgImage = img;
      state.scene.background = 'custom';
      bgSelect.value = 'custom';
      forceRedraw();
    };
    img.onerror = function(){
      alert('That file doesn\'t look like a valid image. Please pick a JPG, PNG, or similar image file.');
      bgImageInput.value = '';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
speedRange.addEventListener('input', ()=>{
  state.speed = parseFloat(speedRange.value); speedLabel.textContent = state.speed.toFixed(1)+'x';
});
playPauseBtn.addEventListener('click', ()=>{
  state.playing = !state.playing;
  playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
});
restartBtn.addEventListener('click', ()=>{ elapsed = 0; });

// ---------- Character panel (dynamic list, any number of characters) ----------
const characterList = document.getElementById('characterList');
const addCharacterBtn = document.getElementById('addCharacterBtn');

function skinOptionsHtml(sel){
  return [['#ffe9dc','Porcelain'],['#ffe0bd','Light'],['#e8b98a','Medium'],['#c68642','Tan'],['#8d5524','Deep'],['#5c3a21','Ebony']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function eyeOptionsHtml(sel){
  return [['dot','Dot'],['round','Round'],['happy','Happy'],['closed','Closed'],['star','Star'],['heart','Heart'],
          ['wink','Wink'],['sleepy','Sleepy'],['angry','Angry'],['spiral','Spiral (Dizzy)']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function hairOptionsHtml(sel){
  return [['none','Bald'],['short','Short'],['long','Long'],['ponytail','Ponytail'],['mohawk','Mohawk'],
          ['curly','Curly'],['afro','Afro'],['bun','Bun'],['braids','Braids'],
          ['buzzcut','Buzzcut'],['spiky','Spiky'],['pigtails','Pigtails'],['dreadlocks','Dreadlocks'],
          ['undercut','Undercut'],['sidepart','Side Part'],['waves','Waves'],['halfup','Half-Up'],
          ['fauxhawk','Faux Hawk'],['cornrows','Cornrows'],['bowlcut','Bowl Cut']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function accessoryOptionsHtml(sel){
  return [['none','None'],['glasses','Glasses'],['hat','Hat'],['bag','Bag'],
          ['chefhat','Chef Hat'],['police','Police Cap'],['headband','Headband'],['doctor','Stethoscope'],
          ['crown','Crown'],['backpack','Backpack'],['scarf','Scarf'],['mask','Mask'],
          ['cape','Cape'],['wizardhat','Wizard Hat'],['helmet','Helmet'],
          ['necktie','Necktie'],['bowtie','Bow Tie'],['earrings','Earrings'],['wristwatch','Wristwatch'],['sword','Sword'],['katana','Katana'],['pistol','Pistol'],['ak47','AK47']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function costumeOptionsHtml(){
  return COSTUME_LIST.map(c=> '<option value="'+c.id+'">'+c.label+'</option>').join('');
}
// These three read straight from the registries (js/humanTypes.js, js/emotions.js) so adding a new
// age preset, build preset, or emotion there automatically shows up in the dropdown here.
function bodyTypeOptionsHtml(sel){
  return Object.keys(BODY_PRESETS).map(id=>
    '<option value="'+id+'"'+(id===sel?' selected':'')+'>'+BODY_PRESETS[id].label+'</option>'
  ).join('');
}
function buildOptionsHtml(sel){
  return Object.keys(BUILD_PRESETS).map(id=>
    '<option value="'+id+'"'+(id===sel?' selected':'')+'>'+BUILD_PRESETS[id].label+'</option>'
  ).join('');
}
function emotionOptionsHtml(sel){
  return EMOTION_LIST.map(e=>
    '<option value="'+e.id+'"'+(e.id===sel?' selected':'')+'>'+e.label+'</option>'
  ).join('');
}

function characterCardHtml(c, idx){
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>Character ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn" data-cact="save" data-cid="'+c.id+'" title="Save to Library">&#9733;</button>' +
          '<button type="button" class="icon-btn danger" data-cact="remove" data-cid="'+c.id+'" '+(state.scene.characters.length<=1?'disabled':'')+'>&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>Name</label><input type="text" data-cfield="name" data-cid="'+c.id+'" value="'+escapeHtml(c.name)+'"></div>' +
        '<div class="field"><label>Outfit</label><div class="color-row"><input type="color" data-cfield="outfit" data-cid="'+c.id+'" value="'+c.outfit+'"></div></div>' +
      '</div>' +
      '<div class="field gender-toggle">' +
        '<label><input type="radio" name="gender_'+c.id+'" data-cfield="gender" data-cid="'+c.id+'" value="male" '+(c.gender==='male'?'checked':'')+'> Male</label>' +
        '<label><input type="radio" name="gender_'+c.id+'" data-cfield="gender" data-cid="'+c.id+'" value="female" '+(c.gender==='female'?'checked':'')+'> Female</label>' +
      '</div>' +
      '<div class="field"><label>Costume (sets outfit + accessory)</label><select data-cfield="costume" data-cid="'+c.id+'">'+costumeOptionsHtml()+'</select></div>' +
      '<div class="row">' +
        '<div class="field"><label>Age</label><select data-cfield="bodyType" data-cid="'+c.id+'">'+bodyTypeOptionsHtml(c.bodyType)+'</select></div>' +
        '<div class="field"><label>Build</label><select data-cfield="build" data-cid="'+c.id+'">'+buildOptionsHtml(c.build)+'</select></div>' +
      '</div>' +
      '<div class="field"><label>Height <span class="size-val" data-sizeval="'+c.id+'">'+(c.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.6" max="1.6" step="0.05" data-cfield="sizeScale" data-cid="'+c.id+'" value="'+(c.sizeScale||1)+'"></div>' +
      '<div class="row">' +
        '<div class="field"><label>Skin tone</label><select data-cfield="skin" data-cid="'+c.id+'">'+skinOptionsHtml(c.skin)+'</select></div>' +
        '<div class="field"><label>Eyes</label><select data-cfield="eyeStyle" data-cid="'+c.id+'">'+eyeOptionsHtml(c.eyeStyle)+'</select></div>' +
      '</div>' +
      '<div class="field"><label>Emotion</label><select data-cfield="emotion" data-cid="'+c.id+'">'+emotionOptionsHtml(c.emotion)+'</select></div>' +
      '<div class="row">' +
        '<div class="field"><label>Hairstyle</label><select data-cfield="hairStyle" data-cid="'+c.id+'">'+hairOptionsHtml(c.hairStyle)+'</select></div>' +
        '<div class="field"><label>Hair color</label><div class="color-row"><input type="color" data-cfield="hairColor" data-cid="'+c.id+'" value="'+c.hairColor+'"></div></div>' +
      '</div>' +
      '<div class="field"><label>Accessory</label><select data-cfield="accessory" data-cid="'+c.id+'">'+accessoryOptionsHtml(c.accessory)+'</select></div>' +
    '</div>'
  );
}

function findCharacter(id){ return state.scene.characters.find(c=> c.id === id); }

function renderCharacterList(){
  characterList.innerHTML = state.scene.characters.map((c,idx)=> characterCardHtml(c, idx)).join('');
  characterList.querySelectorAll('[data-cfield]').forEach(el=>{
    const evt = (el.tagName === 'SELECT' || el.type === 'radio') ? 'change' : 'input';
    el.addEventListener(evt, onCharacterFieldChange);
  });
  characterList.querySelectorAll('[data-cact]').forEach(btn=> btn.addEventListener('click', onCharacterAction));
  addCharacterBtn.disabled = state.scene.characters.length >= MAX_CHARACTERS;
}

// A character's name is shown as the field label for that character in every segment card (and in
// the dialogue speaker dropdown), so renaming needs renderSegmentList() to keep those labels in sync
// — but the name field fires on every keystroke, and re-rendering every segment's full card on every
// single keystroke is the same kind of needless, scale-punishing rebuild flagged elsewhere in this
// file (see renderSegmentList's own comment): typing a 10-character name into a scene with many
// segments would otherwise trigger 10 full rebuilds back-to-back. Debouncing coalesces that into one
// rebuild after typing actually pauses, without changing what ends up on screen.
const debouncedRenderSegmentListForRename = debounce(()=> renderSegmentList(), 300);

function onCharacterFieldChange(e){
  const id = e.target.getAttribute('data-cid');
  const field = e.target.getAttribute('data-cfield');
  const c = findCharacter(id);
  if(!c) return;
  if(field === 'gender'){ if(e.target.checked) c.gender = e.target.value; }
  else if(field === 'name'){ c.name = e.target.value || 'Stickman'; debouncedRenderSegmentListForRename(); }
  else if(field === 'sizeScale'){
    c.sizeScale = parseFloat(e.target.value) || 1;
    const label = characterList.querySelector('[data-sizeval="'+id+'"]');
    if(label) label.textContent = c.sizeScale.toFixed(2) + 'x';
  }
  else if(field === 'costume'){
    // Costume is a one-shot shortcut (not a stored field): apply its outfit + accessory, then
    // re-render so the Outfit swatch and Accessory dropdown reflect the change immediately.
    const preset = COSTUMES[e.target.value];
    if(preset && preset.outfit !== null){
      c.outfit = preset.outfit;
      c.accessory = preset.accessory;
    }
    renderCharacterList();
  }
  else { c[field] = e.target.value; }
  forceRedraw();
}

function onCharacterAction(e){
  const id = e.currentTarget.getAttribute('data-cid');
  const act = e.currentTarget.getAttribute('data-cact');
  const c = findCharacter(id);
  if(!c) return;
  if(act === 'remove'){
    if(state.scene.characters.length <= 1) return;
    state.scene.characters = state.scene.characters.filter(ch=> ch.id !== id);
    state.scene.timeline.forEach(seg=>{
      if(seg.actions) delete seg.actions[id];
      if(seg.dialogue && seg.dialogue.speakerId === id) seg.dialogue = null;
    });
    renderCharacterList();
    renderSegmentList();
    forceRedraw();
  } else if(act === 'save'){
    const list = loadLibrary();
    const appearance = Object.assign({}, c);
    delete appearance.id;
    list.push({ label: c.name, appearance: appearance });
    saveLibrary(list);
    refreshLibSelect();
  }
}

addCharacterBtn.addEventListener('click', ()=>{
  if(state.scene.characters.length >= MAX_CHARACTERS) return;
  const newChar = makeDefaultCharacter(state.scene.characters.length);
  state.scene.characters.push(newChar);
  state.scene.timeline.forEach(seg=>{ if(seg.actions) seg.actions[newChar.id] = 'idle'; });
  renderCharacterList();
  renderSegmentList();
  forceRedraw();
});

// ---------- Animals panel (decorative scene creatures, simpler than characters: no customizer) ----------
const animalList = document.getElementById('animalList');
const animalTypeSelect = document.getElementById('animalTypeSelect');
const addAnimalBtn = document.getElementById('addAnimalBtn');
// Options come from the ANIMALS registry (js/animals.js) — add a new animal there and it shows up here.
animalTypeSelect.innerHTML = ANIMAL_LIST.map(a=> '<option value="'+a.id+'">'+escapeHtml(a.label)+'</option>').join('');

function animalCardHtml(a, idx){
  const label = (ANIMALS[a.type] && ANIMALS[a.type].label) || a.type;
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>' + escapeHtml(label) + ' ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn danger" data-aact="remove" data-aid="'+a.id+'">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Size <span class="size-val" data-asizeval="'+a.id+'">'+(a.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.5" max="1.8" step="0.05" data-afield="sizeScale" data-aid="'+a.id+'" value="'+(a.sizeScale||1)+'"></div>' +
    '</div>'
  );
}

function findAnimal(id){ return state.scene.animals.find(a=> a.id === id); }

function renderAnimalList(){
  animalList.innerHTML = state.scene.animals.map((a,idx)=> animalCardHtml(a, idx)).join('');
  animalList.querySelectorAll('[data-afield]').forEach(el=> el.addEventListener('input', onAnimalFieldChange));
  animalList.querySelectorAll('[data-aact]').forEach(btn=> btn.addEventListener('click', onAnimalAction));
}

function onAnimalFieldChange(e){
  const id = e.target.getAttribute('data-aid');
  const field = e.target.getAttribute('data-afield');
  const a = findAnimal(id);
  if(!a) return;
  if(field === 'sizeScale'){
    a.sizeScale = parseFloat(e.target.value) || 1;
    const label = animalList.querySelector('[data-asizeval="'+id+'"]');
    if(label) label.textContent = a.sizeScale.toFixed(2) + 'x';
  }
}

function onAnimalAction(e){
  const id = e.currentTarget.getAttribute('data-aid');
  const act = e.currentTarget.getAttribute('data-aact');
  if(act === 'remove'){
    state.scene.animals = state.scene.animals.filter(a=> a.id !== id);
    renderAnimalList();
  }
}

addAnimalBtn.addEventListener('click', ()=>{
  state.scene.animals.push({ id: uid(), type: animalTypeSelect.value, sizeScale: 1 });
  renderAnimalList();
});

// ---------- Vehicles panel (static scene props, same pattern as Animals) ----------
const vehicleList = document.getElementById('vehicleList');
const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
const addVehicleBtn = document.getElementById('addVehicleBtn');
// Options come from the VEHICLES registry (js/vehicles.js) — add a new vehicle there and it shows up here.
vehicleTypeSelect.innerHTML = VEHICLE_LIST.map(v=> '<option value="'+v.id+'">'+escapeHtml(v.label)+'</option>').join('');

function vehicleCardHtml(v, idx){
  const label = (VEHICLES[v.type] && VEHICLES[v.type].label) || v.type;
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>' + escapeHtml(label) + ' ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn danger" data-vact="remove" data-vid="'+v.id+'">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Size <span class="size-val" data-vsizeval="'+v.id+'">'+(v.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.5" max="1.8" step="0.05" data-vfield="sizeScale" data-vid="'+v.id+'" value="'+(v.sizeScale||1)+'"></div>' +
    '</div>'
  );
}

function findVehicle(id){ return state.scene.vehicles.find(v=> v.id === id); }

function renderVehicleList(){
  vehicleList.innerHTML = state.scene.vehicles.map((v,idx)=> vehicleCardHtml(v, idx)).join('');
  vehicleList.querySelectorAll('[data-vfield]').forEach(el=> el.addEventListener('input', onVehicleFieldChange));
  vehicleList.querySelectorAll('[data-vact]').forEach(btn=> btn.addEventListener('click', onVehicleAction));
}

function onVehicleFieldChange(e){
  const id = e.target.getAttribute('data-vid');
  const field = e.target.getAttribute('data-vfield');
  const v = findVehicle(id);
  if(!v) return;
  if(field === 'sizeScale'){
    v.sizeScale = parseFloat(e.target.value) || 1;
    const label = vehicleList.querySelector('[data-vsizeval="'+id+'"]');
    if(label) label.textContent = v.sizeScale.toFixed(2) + 'x';
  }
}

function onVehicleAction(e){
  const id = e.currentTarget.getAttribute('data-vid');
  const act = e.currentTarget.getAttribute('data-vact');
  if(act === 'remove'){
    state.scene.vehicles = state.scene.vehicles.filter(v=> v.id !== id);
    renderVehicleList();
  }
}

addVehicleBtn.addEventListener('click', ()=>{
  state.scene.vehicles.push({ id: uid(), type: vehicleTypeSelect.value, sizeScale: 1 });
  renderVehicleList();
});

// ---------- Character Library (saved to this browser via localStorage) ----------
const LIB_KEY = 'stickmanCharacterLibrary';
const libSelect = document.getElementById('libSelect');
function loadLibrary(){ try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch(e){ return []; } }
function saveLibrary(list){ try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch(e){} }
function refreshLibSelect(){
  const list = loadLibrary();
  libSelect.innerHTML = list.length
    ? list.map((c,i)=> '<option value="'+i+'">'+escapeHtml(c.label)+'</option>').join('')
    : '<option value="">(none saved yet)</option>';
}
document.getElementById('addFromLibBtn').addEventListener('click', ()=>{
  const list = loadLibrary();
  const idx = parseInt(libSelect.value, 10);
  if(isNaN(idx) || !list[idx]) return;
  if(state.scene.characters.length >= MAX_CHARACTERS){ alert('Scene already has the max of ' + MAX_CHARACTERS + ' characters.'); return; }
  const appearance = Object.assign(makeCharacter(), list[idx].appearance, { id: charUid(), name: list[idx].label });
  state.scene.characters.push(appearance);
  state.scene.timeline.forEach(seg=>{ if(seg.actions) seg.actions[appearance.id] = 'idle'; });
  renderCharacterList();
  renderSegmentList();
});
document.getElementById('deleteLibBtn').addEventListener('click', ()=>{
  const list = loadLibrary();
  const idx = parseInt(libSelect.value, 10);
if(isNaN(idx) || !list[idx]) return;
      if(!confirm('Delete the saved character "' + list[idx].label + '"? This cannot be undone.')) return;
      list.splice(idx,1);
  saveLibrary(list);
  refreshLibSelect();
});
refreshLibSelect();

// ---------- Custom Images panel: upload ANY image (hand-drawn character, logo, photo cutout) and drop
// it into the scene as a free-floating "sticker" layer (js/customElements.js) - positioned/sized/rotated
// via sliders here, then animated per-segment via a one-click preset dropdown added to segmentCardHtml
// below (Fade In, Slide In, Pop/Bounce, Spin, Pulse), mirroring the Animals/Vehicles panel pattern above.
const customImageInput = document.getElementById('customImageInput');
const customElementList = document.getElementById('customElementList');

if(customImageInput){
  customImageInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onerror = function(){
      alert('Could not read that file. Please try a different image.');
      customImageInput.value = '';
    };
    reader.onload = function(ev){
      const img = new Image();
      img.onload = function(){
        const longSide = Math.max(img.naturalWidth, img.naturalHeight) || 1;
        state.scene.customElements.push({ id: uid(), img: img, x: 400, y: 260, scale: Math.min(1, 160/longSide), rotation: 0 });
        renderCustomElementList();
        forceRedraw();
      };
      img.onerror = function(){
        alert("That file doesn't look like a valid image. Please pick a JPG, PNG, or similar image file.");
        customImageInput.value = '';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    customImageInput.value = '';
  });
}

function customElementCardHtml(el, idx){
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<img src="'+el.img.src+'" style="width:28px;height:28px;object-fit:contain;border-radius:4px;background:#f1f2f5;margin-right:6px;" alt="">' +
        '<strong>Image ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn danger" data-ecact="remove" data-eid="'+el.id+'">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>X position</label><input type="range" min="0" max="800" step="4" data-efield="x" data-eid="'+el.id+'" value="'+el.x+'"></div>' +
        '<div class="field"><label>Y position</label><input type="range" min="0" max="450" step="4" data-efield="y" data-eid="'+el.id+'" value="'+el.y+'"></div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>Size <span class="size-val" data-esizeval="'+el.id+'">'+(el.scale||1).toFixed(2)+'x</span></label><input type="range" min="0.1" max="3" step="0.05" data-efield="scale" data-eid="'+el.id+'" value="'+(el.scale||1)+'"></div>' +
        '<div class="field"><label>Rotation</label><input type="range" min="-180" max="180" step="1" data-efield="rotation" data-eid="'+el.id+'" value="'+(el.rotation||0)+'"></div>' +
      '</div>' +
    '</div>'
  );
}

function findCustomElement(id){ return state.scene.customElements.find(el=> el.id === id); }

function renderCustomElementList(){
  if(!customElementList) return;
  customElementList.innerHTML = state.scene.customElements.map((el,idx)=> customElementCardHtml(el, idx)).join('');
  customElementList.querySelectorAll('[data-efield]').forEach(el=> el.addEventListener('input', onCustomElementFieldChange));
  customElementList.querySelectorAll('[data-ecact]').forEach(btn=> btn.addEventListener('click', onCustomElementAction));
}

function onCustomElementFieldChange(e){
  const id = e.target.getAttribute('data-eid');
  const field = e.target.getAttribute('data-efield');
  const el = findCustomElement(id);
  if(!el) return;
  if(field === 'x') el.x = parseFloat(e.target.value) || 0;
  else if(field === 'y') el.y = parseFloat(e.target.value) || 0;
  else if(field === 'rotation') el.rotation = parseFloat(e.target.value) || 0;
  else if(field === 'scale'){
    el.scale = parseFloat(e.target.value) || 1;
    const label = customElementList.querySelector('[data-esizeval="'+id+'"]');
    if(label) label.textContent = el.scale.toFixed(2) + 'x';
  }
  forceRedraw();
}

function onCustomElementAction(e){
  const id = e.currentTarget.getAttribute('data-eid');
  const act = e.currentTarget.getAttribute('data-ecact');
  if(act === 'remove'){
    state.scene.customElements = state.scene.customElements.filter(el=> el.id !== id);
    state.scene.timeline.forEach(seg=>{ if(seg.elementAnims) delete seg.elementAnims[id]; });
    renderCustomElementList();
    renderSegmentList();
    forceRedraw();
  }
}
renderCustomElementList();

// ---------- Timeline / segment editor ----------
// 'customPose' is a reserved id, appended after the real CLIP_LIST entries — deliberately NOT added to
// CLIP_LIST itself, since that array is also read by the AI scene planner/Scene Engine schemas, and
// picking "Design your own..." only makes sense with per-segment keyframe data a human just posed by
// hand (see js/scene.js's evaluateScene + the Pose Designer below), not something an AI should ever
// pick blind.
function clipOptionsHtml(selected){
  // Saved Move Library entries (js/ui.js's designerSaveToLibBtn, further down) are appended as their
  // own options here — "record" a move once in the Pose Designer and it's immediately pickable on any
  // character/segment straight from this dropdown, no need to reopen the designer just to apply it.
  // Picking one is a one-shot "apply this move" action (handled in onSegmentFieldChange), not a value
  // that's ever actually stored in seg.actions — after applying, the dropdown re-renders showing
  // "Design your own..." selected instead, with the pencil edit button open to it for further tweaking.
  const libOptions = (typeof loadMoveLibrary === 'function' ? loadMoveLibrary() : []).map(m=>
    `<option value="customMove:${m.id}">&#9733; ${escapeHtml(m.label)}</option>`
  ).join('');
  return CLIP_LIST.map(c=> `<option value="${c.id}" ${c.id===selected?'selected':''}>${c.label}</option>`).join('')
    + `<option value="customPose" ${selected==='customPose'?'selected':''}>&#9998; Design your own...</option>`
    + libOptions;
}

// Builds the HTML for exactly ONE segment's card. Pulled out of renderSegmentList so a single
// field edit (picking an action, toggling dialogue, etc.) can regenerate just the one card that
// actually changed via updateSegmentCard() below, instead of every segment's card — see the perf
// note on renderSegmentList for why that distinction matters once a scene has many segments.
function segmentCardHtml(seg, idx){
    const actionFieldsHtml = state.scene.characters.map(c=>{
      const clipVal = (seg.actions&&seg.actions[c.id])||'idle';
      const kfCount = (seg.customPoses && seg.customPoses[c.id] && seg.customPoses[c.id].keyframes) ? seg.customPoses[c.id].keyframes.length : 0;
      const editBtn = clipVal === 'customPose'
        ? '<button type="button" class="icon-btn" data-designer-edit data-segid="'+seg.id+'" data-cid="'+c.id+'" title="Edit this move" style="width:auto; padding:0 6px; white-space:nowrap;">&#9998; ' + kfCount + '</button>'
        : '';
      return '<div class="field"><label>' + escapeHtml(c.name) + '</label>' +
        '<div class="row" style="align-items:center; gap:4px;">' +
          '<select data-field="action_'+c.id+'" data-id="'+seg.id+'" style="flex:1;">'+clipOptionsHtml(clipVal)+'</select>' +
          editBtn +
        '</div>' +
      '</div>';
    }).join('');
    const speakerOptions = state.scene.characters.map(c=>
      '<option value="'+c.id+'"'+(seg.dialogue&&seg.dialogue.speakerId===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>'
    ).join('');
    const dialogueHtml = seg.dialogue ? (
      '<div class="row">' +
        '<div class="field" style="max-width:100px;"><label>Speaker</label><select data-field="dialogueSpeaker" data-id="'+seg.id+'">'+speakerOptions+'</select></div>' +
        '<div class="field"><label>Line</label><input type="text" maxlength="200" data-field="dialogueText" data-id="'+seg.id+'" value="'+escapeHtml(seg.dialogue.text)+'"></div>' +
      '</div>'
    ) : '';
    // Per-segment background/weather overrides — "(Scene default)" means inherit the global Scene
    // panel setting; picking a real option only changes THIS segment, letting a "driving" sequence
    // cut between segments with different backgrounds/seasons to sell a journey without literal
    // point-to-point movement (js/scene.js: active.background||scene.background).
    const bgOverrideOptions = '<option value="">(Scene default)</option>' + BACKGROUND_LIST.map(b=>
      '<option value="'+b.id+'"'+(seg.background===b.id?' selected':'')+'>'+escapeHtml(b.label)+'</option>'
    ).join('');
    const weatherOverrideOptions = '<option value="">(Scene default)</option>' + WEATHER_LIST.map(w=>
      '<option value="'+w.id+'"'+(seg.weather===w.id?' selected':'')+'>'+escapeHtml(w.label)+'</option>'
    ).join('');
    const sceneOverrideHtml =
      '<div class="row">' +
        '<div class="field"><label>Background (this segment)</label><select data-field="segBackground" data-id="'+seg.id+'">'+bgOverrideOptions+'</select></div>' +
        '<div class="field"><label>Weather (this segment)</label><select data-field="segWeather" data-id="'+seg.id+'">'+weatherOverrideOptions+'</select></div>' +
      '</div>';
    // Direction override: "Auto" keeps each character's normal layout-assigned facing (inward toward
    // others); Right/Left forces which way they face AND, for a move/ride clip, which way they travel
    // this segment — this is what lets the same "walk"/"drivecar" action go either direction on screen.
    const directionFieldsHtml = state.scene.characters.map(c=>{
      const dirVal = (seg.directions && seg.directions[c.id]) || 'auto';
      const clipId = (seg.actions && seg.actions[c.id]) || 'idle';
      // Up/Down only apply to flying clips (flyplane/flyhelicopter) — climb/descend instead of
      // left/right travel. Shown only when relevant so the control doesn't confuse ground clips.
      const vertOptions = isFlyClip(clipId)
        ? '<option value="up"'+(dirVal==='up'?' selected':'')+'>Up &uarr; (climb)</option>' +
          '<option value="down"'+(dirVal==='down'?' selected':'')+'>Down &darr; (descend)</option>'
        : '';
      // A dragged end-position (task #28: drag the character directly on the canvas) overrides this
      // dropdown entirely for this character/segment — surface that as a small inline note + clear
      // button rather than letting the dropdown silently lie about what's actually happening.
      const dragNote = (seg.dragTargets && seg.dragTargets[c.id])
        ? '<div class="drag-target-note">Custom position set on canvas &middot; ' +
            '<button type="button" class="icon-btn" data-act="clearDrag" data-id="'+seg.id+'" data-char="'+c.id+'" title="Clear custom position">&times; Clear</button>' +
          '</div>'
        : '';
      return '<div class="field"><label>' + escapeHtml(c.name) + ' direction</label><select data-field="direction_'+c.id+'" data-id="'+seg.id+'">' +
        '<option value="auto"'+(dirVal==='auto'?' selected':'')+'>Auto</option>' +
        '<option value="right"'+(dirVal==='right'?' selected':'')+'>Right &rarr;</option>' +
        '<option value="left"'+(dirVal==='left'?' selected':'')+'>&larr; Left</option>' +
        vertOptions +
        '</select>' + dragNote + '</div>';
    }).join('');
    // One-click animation preset per uploaded custom image (js/customElements.js), same per-segment
    // per-entity override pattern as actions/directions above - only rendered when at least one custom
    // image actually exists, so scenes without any uploaded images show no extra clutter.
    const elementAnimFieldsHtml = state.scene.customElements.map((el, i)=>{
      const animVal = (seg.elementAnims && seg.elementAnims[el.id]) || 'none';
      const options = CUSTOM_ANIM_LIST.map(a=> '<option value="'+a.id+'"'+(a.id===animVal?' selected':'')+'>'+escapeHtml(a.label)+'</option>').join('');
      return '<div class="field"><label>Image ' + (i+1) + ' animation</label><select data-field="elementAnim_'+el.id+'" data-id="'+seg.id+'">'+options+'</select></div>';
    }).join('');
    return (
      '<div class="segment-card" draggable="true" data-seg-id="'+seg.id+'">' +
        '<div class="segment-head">' +
          '<span class="drag-handle" title="Drag to reorder">&#8942;&#8942;</span>' +
          '<strong>Segment ' + (idx+1) + '</strong>' +
          '<div class="segment-actions-row">' +
            '<button type="button" class="icon-btn" data-act="up" data-id="'+seg.id+'" '+(idx===0?'disabled':'')+'>&uarr;</button>' +
            '<button type="button" class="icon-btn" data-act="down" data-id="'+seg.id+'" '+(idx===state.scene.timeline.length-1?'disabled':'')+'>&darr;</button>' +
            '<button type="button" class="icon-btn" data-act="duplicate" data-id="'+seg.id+'" title="Duplicate">&#10697;</button>' +
            '<button type="button" class="icon-btn danger" data-act="remove" data-id="'+seg.id+'" '+(state.scene.timeline.length<=1?'disabled':'')+'>&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field"><label>Duration (s)</label><input type="number" min="0.5" max="120" step="0.5" value="'+seg.duration+'" data-field="duration" data-id="'+seg.id+'"></div>' +
          actionFieldsHtml +
        '</div>' +
        '<div class="row">' + directionFieldsHtml + '</div>' +
        (elementAnimFieldsHtml ? '<div class="row">' + elementAnimFieldsHtml + '</div>' : '') +
        sceneOverrideHtml +
        '<div class="checkbox-field"><input type="checkbox" data-field="povCamera" data-id="'+seg.id+'" '+(seg.povCamera?'checked':'')+'> <label>Driver POV camera (windshield view, if someone is riding/driving)</label></div>' +
        '<div class="checkbox-field"><input type="checkbox" data-field="hasDialogue" data-id="'+seg.id+'" '+(seg.dialogue?'checked':'')+'> <label>Dialogue in this segment</label></div>' +
        dialogueHtml +
      '</div>'
    );
}

// Wires up the interactive elements INSIDE a single segment card element (a click/change/input
// listener per button/select/input). Scoped to whatever root element is passed in — called with the
// whole segmentList after a full rebuild, or with just one freshly-swapped-in card after a targeted
// update, so listeners never get attached twice and never have to be attached to more nodes than
// actually changed.
function wireSegmentCard(root){
  root.querySelectorAll('[data-act]').forEach(btn=> btn.addEventListener('click', onSegmentAction));
  root.querySelectorAll('select[data-field]').forEach(el=> el.addEventListener('change', onSegmentFieldChange));
  root.querySelectorAll('input[data-field]').forEach(el=>{
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', onSegmentFieldChange);
  });
  root.querySelectorAll('[data-designer-edit]').forEach(btn=> btn.addEventListener('click', (e)=>{
    openPoseDesigner(e.currentTarget.getAttribute('data-segid'), e.currentTarget.getAttribute('data-cid'));
  }));
}

// Full rebuild: every segment's card HTML is regenerated and the whole list is reparsed/rewired.
// Correct for anything that changes segment COUNT or ORDER (add/remove/duplicate/reorder), but far
// more expensive than it needs to be for a single field edit on one existing segment — profiling
// during QA found this taking ~750ms on a stress-test scene (8 characters x ~100 segments), all spent
// re-parsing HTML and re-populating <select> options for segments that didn't actually change.
// updateSegmentCard() below is the targeted alternative used for those single-segment edits.
function renderSegmentList(){
  const total = evaluateScene(state.scene, 0).totalDuration;
  timelineTotal.textContent = 'Total: ' + total.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';

  segmentList.innerHTML = state.scene.timeline.map((seg, idx)=> segmentCardHtml(seg, idx)).join('');
  wireSegmentCard(segmentList);
  renderTimelineStrip();
}

// Targeted alternative to renderSegmentList() for edits that only affect ONE existing segment's own
// fields (action picked, dialogue toggled, direction changed) — regenerates just that segment's card
// and swaps it in place, instead of re-rendering every other untouched segment along with it. Falls
// back to a full renderSegmentList() if the card can't be found (shouldn't normally happen, but safer
// than silently doing nothing).
function updateSegmentCard(segId){
  const idx = state.scene.timeline.findIndex(s=> s.id === segId);
  const oldCard = segmentList.querySelector('.segment-card[data-seg-id="'+segId+'"]');
  if(idx === -1 || !oldCard){ renderSegmentList(); return; }
  const seg = state.scene.timeline[idx];
  const wrapper = document.createElement('div');
  wrapper.innerHTML = segmentCardHtml(seg, idx);
  const newCard = wrapper.firstElementChild;
  oldCard.replaceWith(newCard);
  wireSegmentCard(newCard);
  // The timeline strip's label for this block can depend on the first character's action (segLabel),
  // so keep it in sync too — updating just the one label span is still far cheaper than
  // renderTimelineStrip() rebuilding every block.
  const stripLabel = timelineStrip.querySelector('.timeline-strip-block[data-seg-id="'+segId+'"] .strip-label');
  if(stripLabel) stripLabel.textContent = (idx+1) + '. ' + segLabel(seg);
}

// Canva/CapCut-style visual timeline strip: same segments as the detailed cards below, rendered as
// proportionally-sized colored blocks with a live playhead — this is a real scrubbable timeline, not
// just a static overview: click-drag anywhere on the strip background to scrub playback, drag a
// block's ⋮⋮ handle to reorder it (shares dragSegId with the segment-card drag handlers above, since
// only one drag can be in flight at a time), and drag a block's right edge to trim its duration.
const STRIP_COLORS = ['#6366f1','#0891b2','#16a34a','#d97706','#db2777','#7c3aed','#dc2626','#0d9488','#4f46e5','#059669'];
function segLabel(seg){
  const firstChar = state.scene.characters[0];
  const clipId = (firstChar && seg.actions && seg.actions[firstChar.id]) || 'idle';
  if(clipId === 'customPose') return 'Custom move';
  const clip = (typeof CLIPS !== 'undefined' && CLIPS[clipId]) || null;
  return clip ? clip.label : 'Idle';
}
function stripTimeAt(clientX){
  const rect = timelineStrip.getBoundingClientRect();
  const total = state.scene.timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0) || 1;
  const frac = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  return frac * total;
}
function renderTimelineStrip(){
  timelineStrip.innerHTML = '';
  const timeline = state.scene.timeline;
  timeline.forEach((seg, idx)=>{
    const block = document.createElement('div');
    block.className = 'timeline-strip-block';
    block.style.flex = Math.max(0.1, seg.duration) + ' 1 0%';
    block.style.background = STRIP_COLORS[idx % STRIP_COLORS.length];
    block.title = 'Segment ' + (idx+1) + ' (' + seg.duration + 's)';
    block.setAttribute('data-seg-id', seg.id);

    const handle = document.createElement('span');
    handle.className = 'strip-drag-handle';
    handle.setAttribute('draggable', 'true');
    handle.title = 'Drag to reorder';
    handle.textContent = '⋮⋮';
    handle.addEventListener('mousedown', (e)=> e.stopPropagation());
    handle.addEventListener('dragstart', (e)=>{ e.stopPropagation(); dragSegId = seg.id; block.classList.add('dragging'); });
    handle.addEventListener('dragend', (e)=>{ e.stopPropagation(); block.classList.remove('dragging'); dragSegId = null; });
    block.appendChild(handle);

    const label = document.createElement('span');
    label.className = 'strip-label';
    label.textContent = (idx+1) + '. ' + segLabel(seg);
    block.appendChild(label);

    const resize = document.createElement('span');
    resize.className = 'strip-resize-handle';
    resize.title = 'Drag to trim duration';
    resize.addEventListener('mousedown', (e)=>{
      e.stopPropagation(); e.preventDefault();
      const total = state.scene.timeline.reduce((s,sg)=> s + Math.max(0.1, sg.duration), 0) || 1;
      const stripWidth = timelineStrip.getBoundingClientRect().width || 1;
      const secsPerPx = total / stripWidth;
      const startX = e.clientX, startDuration = seg.duration;
      // Dragging fires onMove dozens of times a second — calling the full renderTimelineStrip()/
      // renderSegmentList() rebuilds on every single one of those (as this used to) meant a drag on a
      // large scene (many segments) visibly stuttered, since every mousemove re-rendered every OTHER
      // segment's card/block too even though only this one's duration is actually changing. Only this
      // block's own flex-basis, this one segment's duration input (if its card happens to be open), and
      // the running total text need to update live; a single full re-render happens once on mouseup.
      function onMove(ev){
        seg.duration = Math.min(120, Math.max(0.5, startDuration + (ev.clientX - startX) * secsPerPx));
        block.style.flex = Math.max(0.1, seg.duration) + ' 1 0%';
        block.title = 'Segment ' + (idx+1) + ' (' + seg.duration + 's)';
        const durInput = segmentList.querySelector('input[data-field="duration"][data-id="'+seg.id+'"]');
        if(durInput) durInput.value = seg.duration;
        timelineTotal.textContent = 'Total: ' + evaluateScene(state.scene,0).totalDuration.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';
        forceRedraw();
      }
      function onUp(){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        renderTimelineStrip();
        renderSegmentList();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    block.appendChild(resize);

    block.addEventListener('dragover', (e)=>{ e.preventDefault(); block.classList.add('drag-over'); });
    block.addEventListener('dragleave', ()=> block.classList.remove('drag-over'));
    block.addEventListener('drop', (e)=>{
      e.preventDefault();
      block.classList.remove('drag-over');
      if(!dragSegId || dragSegId === seg.id) return;
      const fromIdx = state.scene.timeline.findIndex(s=> s.id === dragSegId);
      const toIdx = state.scene.timeline.findIndex(s=> s.id === seg.id);
      if(fromIdx === -1 || toIdx === -1) return;
      const [moved] = state.scene.timeline.splice(fromIdx, 1);
      state.scene.timeline.splice(toIdx, 0, moved);
      renderSegmentList();
      forceRedraw();
    });
    timelineStrip.appendChild(block);
  });
  const playhead = document.createElement('div');
  playhead.className = 'timeline-strip-playhead';
  playhead.id = 'timelineStripPlayhead';
  timelineStrip.appendChild(playhead);
  updateTimelineStripPlayhead();
}
// Click-drag scrubbing: mousedown anywhere on the strip's own background (not a block's drag/resize
// handle, which stopPropagation their own mousedowns) starts scrubbing — playback pauses for the
// duration of the drag, like a real editor, and resumes to wherever it was left (paused or not).
timelineStrip.addEventListener('mousedown', (e)=>{
  const wasPlaying = state.playing;
  state.playing = false;
  elapsed = stripTimeAt(e.clientX);
  forceRedraw(); updateTimelineStripPlayhead();
  function onMove(ev){ elapsed = stripTimeAt(ev.clientX); forceRedraw(); updateTimelineStripPlayhead(); }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    state.playing = wasPlaying;
    if(playPauseBtn) playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
function updateTimelineStripPlayhead(){
  const playhead = document.getElementById('timelineStripPlayhead');
  if(!playhead) return;
  const total = state.scene.timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0) || 1;
  const tt = ((elapsed % total) + total) % total;
  playhead.style.left = (tt/total*100) + '%';
}

function findSegment(id){ return state.scene.timeline.find(s=> s.id === id); }

// ---------- Canvas drag-to-reposition (task #28): click-drag a character (or whatever vehicle they're
// riding — the vehicle prop just follows the character's x) directly on the preview to pin where they
// should be by the END of whichever segment is currently on screen. This is the simplest of a few
// possible "direct manipulation" designs: it slides the character from wherever this segment started
// to the dropped point over the segment's duration (js/scene.js: seg.dragTargets), rather than
// authoring a full multi-point path. Dragging always edits the segment that's active at drag-start
// time, so scrub the strip/cards to the right segment first, then drag.
let canvasDrag = null; // { charId, segId, startX, x } while a drag is in progress
function canvasPointFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
// Generous hit box (the stickman silhouette is thin) — roughly head-to-feet vertically, centered on x,
// shifted up by however high a flying character currently is so mid-flight drags still land correctly.
function hitTestCharacterAt(px, py){
  if(!lastFrame || !lastFrame.characters) return null;
  let best = null, bestDist = Infinity;
  lastFrame.characters.forEach(c=>{
    const altitude = (c.pose && c.pose.altitude) || 0;
    const topY = GROUND_Y - altitude - 170, botY = GROUND_Y - altitude + 20;
    if(px >= c.x - 45 && px <= c.x + 45 && py >= topY && py <= botY){
      const d = Math.abs(px - c.x);
      if(d < bestDist){ bestDist = d; best = c; }
    }
  });
  return best;
}
// Drawn on top of the normal frame (by loop()/forceRedraw() above) while a drag is in progress: a
// dashed line from the drag's start x to the live cursor x, plus a small handle dot at the cursor.
function drawCanvasDragGhost(){
  if(!canvasDrag) return;
  ctx.save();
  ctx.setLineDash([6,5]);
  ctx.strokeStyle = 'rgba(37,99,235,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(canvasDrag.startX, GROUND_Y); ctx.lineTo(canvasDrag.x, GROUND_Y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(37,99,235,0.9)';
  ctx.beginPath(); ctx.arc(canvasDrag.x, GROUND_Y, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
canvas.addEventListener('mousedown', (e)=>{
  // The Pose Designer physically reparents this same canvas into its own overlay while open (see
  // openPoseDesigner below) and installs its own drag-to-pose handles on it — this listener's
  // "drag a character's end position" logic is for the NORMAL scene canvas and would otherwise
  // misfire against a stale `lastFrame` snapshot from before the designer opened.
  if(typeof designer !== 'undefined' && designer.active) return;
  if(!lastFrame) return;
  const pt = canvasPointFromEvent(e);
  const hit = hitTestCharacterAt(pt.x, pt.y);
  if(!hit) return;
  const seg = findSegment(lastFrame.activeSegmentId);
  if(!seg) return;
  const wasPlaying = state.playing;
  state.playing = false;
  if(playPauseBtn) playPauseBtn.textContent = 'Play';
  canvasDrag = { charId: hit.id, segId: seg.id, startX: hit.x, x: hit.x };
  canvas.style.cursor = 'grabbing';
  forceRedraw();
  function onMove(ev){
    const p = canvasPointFromEvent(ev);
    canvasDrag.x = clamp(p.x, 60, W-60);
    forceRedraw();
  }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const targetSeg = findSegment(canvasDrag.segId);
    if(targetSeg){
      if(!targetSeg.dragTargets) targetSeg.dragTargets = {};
      targetSeg.dragTargets[canvasDrag.charId] = { x: canvasDrag.x };
      // Drag replaces the direction dropdown for this character/segment — clearing it avoids the
      // dropdown showing a stale "Right"/"Left" that no longer reflects what's actually happening.
      if(targetSeg.directions) delete targetSeg.directions[canvasDrag.charId];
    }
    canvasDrag = null;
    canvas.style.cursor = '';
    state.playing = wasPlaying;
    if(playPauseBtn) playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
    renderSegmentList();
    forceRedraw();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
canvas.addEventListener('mousemove', (e)=>{
  if(typeof designer !== 'undefined' && designer.active) return; // designer installs its own cursor/hover logic
  if(canvasDrag) return; // an active drag is driven by the document-level listener installed above
  const pt = canvasPointFromEvent(e);
  canvas.style.cursor = hitTestCharacterAt(pt.x, pt.y) ? 'grab' : '';
});

function onSegmentAction(e){
  const id = e.currentTarget.getAttribute('data-id');
  const act = e.currentTarget.getAttribute('data-act');
  const idx = state.scene.timeline.findIndex(s=> s.id === id);
  if(idx === -1) return;
  if(act === 'remove'){
    if(state.scene.timeline.length > 1) state.scene.timeline.splice(idx, 1);
  } else if(act === 'up' && idx > 0){
    const tmp = state.scene.timeline[idx-1]; state.scene.timeline[idx-1] = state.scene.timeline[idx]; state.scene.timeline[idx] = tmp;
  } else if(act === 'down' && idx < state.scene.timeline.length-1){
    const tmp = state.scene.timeline[idx+1]; state.scene.timeline[idx+1] = state.scene.timeline[idx]; state.scene.timeline[idx] = tmp;
  } else if(act === 'duplicate'){
    const seg = state.scene.timeline[idx];
    const copy = { id: uid(), duration: seg.duration, actions: Object.assign({}, seg.actions), dialogue: seg.dialogue ? Object.assign({}, seg.dialogue) : null, background: seg.background, weather: seg.weather, directions: Object.assign({}, seg.directions), povCamera: !!seg.povCamera, dragTargets: Object.assign({}, seg.dragTargets), elementAnims: Object.assign({}, seg.elementAnims), customPoses: Object.fromEntries(Object.entries(seg.customPoses||{}).map(([cid,d])=>[cid, { keyframes: (d.keyframes||[]).map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })), moveSpeed: d.moveSpeed || 0, moveDir: d.moveDir || 1, vertSpeed: d.vertSpeed || 0, vertDir: d.vertDir || 1 }])) };
    state.scene.timeline.splice(idx+1, 0, copy);
  } else if(act === 'clearDrag'){
    const charId = e.currentTarget.getAttribute('data-char');
    const seg = state.scene.timeline[idx];
    if(seg.dragTargets) delete seg.dragTargets[charId];
  }
  renderSegmentList();
  forceRedraw();
}

function onSegmentFieldChange(e){
  const id = e.target.getAttribute('data-id');
  const field = e.target.getAttribute('data-field');
  const seg = findSegment(id);
  if(!seg) return;
  if(field === 'duration'){
    // Capped at 120s per segment — there was no upper bound before, so a typo (an extra zero, a
    // stray paste) could set a segment to thousands or millions of seconds. That doesn't crash the
    // editor, but hitting Export afterward starts a REAL-TIME recording sized to match: with no way to
    // cancel an in-progress export short of reloading the tab (losing the recording), a huge duration
    // could strand someone recording for hours/days with the export button stuck disabled. 120s/segment
    // is already generous for a single beat of a video; long videos are still possible via many segments.
    seg.duration = Math.min(120, Math.max(0.5, parseFloat(e.target.value) || 0.5));
    timelineTotal.textContent = 'Total: ' + evaluateScene(state.scene,0).totalDuration.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';
  } else if(field.indexOf('action_') === 0){
    const charId = field.slice('action_'.length);
    if(!seg.actions) seg.actions = {};
    // Captured BEFORE overwriting below — openPoseDesigner needs the TRUE prior action (e.g. 'idle')
    // to revert to if the user Cancels out of a freshly-opened designer. Reading seg.actions[charId]
    // from inside openPoseDesigner itself would see 'customPose' (already written a few lines down),
    // making Cancel a no-op on a fresh pick — that was a real bug, fixed by passing this through.
    const priorAction = seg.actions[charId] || 'idle';
    // A "⭐ <name>" option (a saved Move Library entry, see clipOptionsHtml) isn't a real clip id — it's
    // a one-shot "apply this saved move to this character/segment" action. Resolve it straight to
    // customPose + the library entry's keyframes/movement settings, exactly as if the user had loaded
    // it inside the Pose Designer and hit Save, without actually opening the designer.
    if(e.target.value.indexOf('customMove:') === 0){
      const moveId = e.target.value.slice('customMove:'.length);
      const entry = loadMoveLibrary().find(m=> m.id === moveId);
      if(entry){
        if(!seg.customPoses) seg.customPoses = {};
        seg.customPoses[charId] = {
          keyframes: entry.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })),
          moveSpeed: entry.moveSpeed || 0, moveDir: entry.moveDir || 1,
          vertSpeed: entry.vertSpeed || 0, vertDir: entry.vertDir || 1
        };
        seg.actions[charId] = 'customPose';
      }
      updateSegmentCard(seg.id);
      return;
    }
    seg.actions[charId] = e.target.value;
    // Selecting "Talk" with no dialogue set yet would otherwise render a silent, closed-mouth
    // character — poseTalk (js/poses.js) only opens the mouth and evaluateScene only draws a speech
    // bubble when a segment actually has dialogue text for that speaker. Presets/AI-generated scenes
    // already fill this in automatically; a manually-picked Talk action should "just work" the same
    // way instead of silently requiring a separate checkbox + text field to discover.
    if(e.target.value === 'talk' && !seg.dialogue){
      seg.dialogue = { speakerId: charId, text: "Hey, how's it going?" };
    }
    // Picking "Design your own..." opens the Pose Designer right away — with no keyframes saved yet
    // it'd otherwise silently fall back to idle (js/scene.js's evaluateScene) with no obvious next step.
    if(e.target.value === 'customPose'){
      openPoseDesigner(seg.id, charId, priorAction);
    }
    // Re-render just this card so the direction select's Up/Down (climb/descend) options show up
    // immediately when switching a character into flyplane/flyhelicopter, and disappear when
    // switching back out.
    updateSegmentCard(seg.id);
  } else if(field.indexOf('direction_') === 0){
    const charId = field.slice('direction_'.length);
    if(!seg.directions) seg.directions = {};
    seg.directions[charId] = e.target.value;
    // Direction and a dragged custom position (task #28) are mutually exclusive controls for the same
    // character/segment — picking a direction here means "go back to the normal auto-movement", so any
    // dragged end-position is cleared rather than silently overriding what the dropdown now shows.
    if(seg.dragTargets && seg.dragTargets[charId]){
      delete seg.dragTargets[charId];
      updateSegmentCard(seg.id);
    }
  } else if(field === 'povCamera'){
    seg.povCamera = e.target.checked;
  } else if(field === 'hasDialogue'){
    const firstId = state.scene.characters[0] && state.scene.characters[0].id;
    seg.dialogue = e.target.checked ? { speakerId: firstId, text: 'New line' } : null;
    updateSegmentCard(seg.id);
  } else if(field === 'dialogueSpeaker'){
    if(seg.dialogue) seg.dialogue.speakerId = e.target.value;
  } else if(field === 'dialogueText'){
    if(seg.dialogue) seg.dialogue.text = e.target.value || ' ';
  } else if(field === 'segBackground'){
    seg.background = e.target.value || null;
  } else if(field === 'segWeather'){
    seg.weather = e.target.value || null;
  } else if(field.indexOf('elementAnim_') === 0){
    const elId = field.slice('elementAnim_'.length);
    if(!seg.elementAnims) seg.elementAnims = {};
    seg.elementAnims[elId] = e.target.value;
  }
  forceRedraw();
}

addSegmentBtn.addEventListener('click', ()=>{
  const actions = {};
  state.scene.characters.forEach(c=> actions[c.id] = 'idle');
  state.scene.timeline.push(makeSegment(2.5, actions, null));
  renderSegmentList();
  forceRedraw();
});

// ---------- Pose Designer: general-purpose keyframe move builder ----------
// Lets a user build any custom action (a fight combo, a dance move, a sports move — not just combat)
// by hand: pose the character with per-limb sliders, save that pose as a keyframe, add another, and the
// tool smoothly interpolates between them in order (js/poses.js's evalKeyframePose), looping. This is
// how "the fight action looks like dancing" gets solved for good on a per-user basis: instead of only
// ever picking a hand-coded clip like Fight, a character/segment can point at a fully custom sequence
// the user designed themselves. Reuses the single shared #stage canvas for its live preview by
// physically reparenting it into the designer panel while open (js/render.js's ctx/canvas are
// module-level consts closed over by every draw function, so a second canvas would need a much bigger
// refactor to support — moving the one real canvas costs nothing and loses no 2D context state).
const designerOverlay = document.getElementById('poseDesignerOverlay');
const designerTitleEl = document.getElementById('designerTitle');
const designerPreviewMount = document.getElementById('designerPreviewMount');
const designerSlidersEl = document.getElementById('designerSliders');
const designerKeyframeListEl = document.getElementById('designerKeyframeList');
const designerAddKeyframeBtn = document.getElementById('designerAddKeyframeBtn');
const designerAddNewKeyframeBtn = document.getElementById('designerAddNewKeyframeBtn');
const designerPlayBtn = document.getElementById('designerPlayBtn');
const designerPreviewLabel = document.getElementById('designerPreviewLabel');
const designerCharSelect = document.getElementById('designerCharSelect');
if(designerCharSelect) designerCharSelect.addEventListener('change', (e)=> switchDesignerCharacter(e.target.value));
const designerSaveBtn = document.getElementById('designerSaveBtn');
const designerCancelBtn = document.getElementById('designerCancelBtn');
const designerCloseBtn = document.getElementById('designerCloseBtn');

// A light, neutral standing pose to start a brand-new move from — mirrors the engine's standingStance.
const DEFAULT_DESIGNER_POSE = {
  torsoLean: 0, headTilt: 0, bounceY: 0,
  leftShoulderAngle: 0.1, leftElbowBend: 0.15, rightShoulderAngle: 0.1, rightElbowBend: 0.15,
  leftHipAngle: 0.05, leftKneeBend: 0.06, rightHipAngle: -0.05, rightKneeBend: 0.06, mouthOpen: 0
};
// Ranges are generous enough to cover every hand-authored pose already in js/poses.js (checked against
// poseFight/poseKick/poseSleep/poseYoga's actual angle values) without letting a slider produce a
// physically nonsensical joint angle.
const DESIGNER_SLIDERS = [
  { field:'torsoLean', label:'Torso lean', min:-1.6, max:1.6, step:0.01 },
  { field:'headTilt', label:'Head tilt', min:-1.2, max:1.2, step:0.01 },
  { field:'bounceY', label:'Body height (crouch / lift)', min:-20, max:170, step:1 },
  { field:'leftShoulderAngle', label:'Left shoulder', min:-3.2, max:3.2, step:0.01 },
  { field:'leftElbowBend', label:'Left elbow bend', min:-2.5, max:2.5, step:0.01 },
  { field:'rightShoulderAngle', label:'Right shoulder', min:-3.2, max:3.2, step:0.01 },
  { field:'rightElbowBend', label:'Right elbow bend', min:-2.5, max:2.5, step:0.01 },
  { field:'leftHipAngle', label:'Left hip', min:-2, max:2, step:0.01 },
  { field:'leftKneeBend', label:'Left knee bend', min:-0.3, max:2.8, step:0.01 },
  { field:'rightHipAngle', label:'Right hip', min:-2, max:2, step:0.01 },
  { field:'rightKneeBend', label:'Right knee bend', min:-0.3, max:2.8, step:0.01 },
  { field:'mouthOpen', label:'Mouth open', min:0, max:1, step:0.05 }
];

const designer = {
  active: false, segId: null, charId: null, previousAction: 'idle',
  charStash: {}, // per-character in-progress state when posing multiple characters in one Designer session — see switchDesignerCharacter
  keyframes: [], currentPose: Object.assign({}, DEFAULT_DESIGNER_POSE), editingIdx: -1,
  playing: false, elapsed: 0, stageOriginalParent: null, stageOriginalNextSibling: null,
  // previewAnchor: { x, faceDir } for the character being edited, refreshed every frame by
  // buildDesignerFrame — the drag-to-pose handles (below) need this to know where on the canvas the
  // character's hip/shoulder actually are this frame, since that depends on the real scene layout.
  previewAnchor: null,
  // moveSpeed/moveDir: horizontal travel. moveSpeed is px/sec, 0 = stay in place (the default, matching
  // every existing saved move). moveDir is +1 forward (the way the character is facing) or -1 backward
  // (retreat while still facing the same way) — only meaningful when moveSpeed > 0. Lets a hand-designed
  // walk/run/approach/retreat-style move actually cross the screen instead of only animating in place —
  // see js/scene.js's evaluateScene and computeSegmentStartPositions, which read both alongside the
  // normal MOVE_SPEEDS mechanism.
  moveSpeed: 0, moveDir: 1,
  // vertSpeed/vertDir: independent vertical drift (jump, duck-and-rise, fly up/down mid-move) — px/sec
  // and +1 up / -1 down, 0 speed = no vertical drift (default). Unlike the fly-clip up/down direction
  // override, this can combine with horizontal travel at the same time (e.g. a jumping punch that also
  // moves forward) — see js/scene.js's evaluateScene and computeSegmentStartAltitudes.
  vertSpeed: 0, vertDir: 1
};

// Full-scene-context preview: rather than an isolated character floating on a plain background, reuse
// the real evaluateScene pipeline for the exact segment being edited — real background/weather, every
// other character in their normal pose (including their OWN saved custom move, if they have one),
// vehicles, furniture — and swap in only the one pose actually being designed. This is what lets you
// see, live, how a hand-designed move will actually look in the finished scene (e.g. two boxers facing
// off) instead of guessing from a blank-background single figure.
function buildDesignerFrame(pose){
  const seg = findSegment(designer.segId);
  let offset = 0;
  for(let i=0;i<state.scene.timeline.length;i++){
    if(state.scene.timeline[i].id === designer.segId) break;
    offset += Math.max(0.1, state.scene.timeline[i].duration);
  }
  const segDuration = seg ? Math.max(0.1, seg.duration) : 1;
  // Stay strictly inside this segment (never spill into the next one) regardless of how long the
  // in-progress move's Play-sequence loop runs.
  const localT = Math.min(segDuration - 0.02, Math.max(0, designer.elapsed));
  const frame = evaluateScene(state.scene, offset + localT);
  frame.characters = frame.characters.map(c=>{
    if(c.id !== designer.charId) return c;
    // Refresh where the drag-to-pose handles (below) should think this character's anchor is —
    // x/faceDir come from the real scene layout, so this must be re-read every frame, not just once.
    designer.previewAnchor = { x: c.x, faceDir: c.faceDir };
    // Preserve whatever altitude the real scene already computed for this character (e.g. mid-flight)
    // rather than forcing them back to ground level just because the designer's pose object has no
    // altitude field of its own.
    // Live-preview the Movement (forward/backward/up/down) controls here, on top of whatever x/altitude
    // the real scene already computed for this character. Without this, the sliders/checkboxes only took
    // effect once a hand-designed move was saved and actually applied to a segment - while still inside
    // the Designer, Play sequence looked completely static no matter what Movement was set to.
    const faceDir = c.faceDir || 1;
    const localT = designer.playing ? designer.elapsed : 0;
    const traveled = designer.moveSpeed ? designer.moveSpeed * localT * faceDir * (designer.moveDir || 1) : 0;
    const vertTraveled = designer.vertSpeed ? designer.vertSpeed * localT * (designer.vertDir || 1) : 0;
    const liveX = clamp(c.x + traveled, 60, W - 60);
    const liveAltitude = clamp((c.pose.altitude || 0) + vertTraveled, 0, MAX_ALTITUDE);
    return Object.assign({}, c, { x: liveX, pose: Object.assign({}, pose, { altitude: liveAltitude }) });
  });
  return frame;
}

// ---------- Drag-to-pose: pose the character by dragging its hands/feet/head directly on the preview,
// instead of only via the abstract sliders. Reuses the same 2-bone IK (limbReachAngles/armReachAngles/
// legReachAngles, js/poses.js) the "reach for a coffee cup" poses already use, just driven by a mouse
// position instead of a fixed target. Only active in static edit mode (not while Play sequence is
// animating, since there's no single pose to grab onto mid-animation). ----------
const DESIGNER_HANDLE_HIT_RADIUS = 30; // canvas-internal px (preview is displayed smaller via CSS)
const DESIGNER_HANDLE_DRAW_RADIUS = 12;
let designerDragPart = null; // 'leftHand'|'rightHand'|'leftFoot'|'rightFoot'|'head' while dragging
function designerLiveSkeleton(){
  if(!designer.active || !designer.previewAnchor) return null;
  const character = findCharacter(designer.charId);
  if(!character) return null;
  return computeSkeleton(designer.previewAnchor.x, designer.previewAnchor.faceDir, character, Object.assign({}, designer.currentPose, { altitude: 0 }));
}
function designerHandlePoints(){
  const sk = designerLiveSkeleton();
  if(!sk) return null;
  return { leftHand: sk.lHand, rightHand: sk.rHand, leftFoot: sk.lFoot, rightFoot: sk.rFoot, head: sk.head, shoulder: sk.shoulder, hip: sk.hip };
}
function designerHandleHitTest(px, py){
  if(!designer.active || designer.playing) return null;
  const pts = designerHandlePoints();
  if(!pts) return null;
  let best = null, bestDist = DESIGNER_HANDLE_HIT_RADIUS;
  ['leftHand','rightHand','leftFoot','rightFoot','head'].forEach(name=>{
    const d = Math.hypot(px - pts[name].x, py - pts[name].y);
    if(d < bestDist){ bestDist = d; best = name; }
  });
  return best;
}
// Reflects designer.currentPose back onto the slider inputs without a full innerHTML rebuild (cheap
// enough to call on every mousemove tick of a drag, unlike renderDesignerSliders' full re-render).
function syncDesignerSlidersFromCurrentPose(){
  DESIGNER_SLIDERS.forEach(s=>{
    const v = designer.currentPose[s.field] || 0;
    const inp = designerSlidersEl.querySelector('[data-designer-slider="'+s.field+'"]');
    const label = designerSlidersEl.querySelector('[data-valfor="'+s.field+'"]');
    if(inp) inp.value = v;
    if(label) label.textContent = v.toFixed(2);
  });
}
function applyDesignerDrag(part, canvasX, canvasY){
  const pts = designerHandlePoints();
  if(!pts) return;
  const faceDir = designer.previewAnchor.faceDir;
  const anchor = (part === 'leftHand' || part === 'rightHand' || part === 'head') ? pts.shoulder : pts.hip;
  // Local (pre-faceDir) offset — matches the convention downPoint/upPoint use internally (js/helpers.js:
  // x = origin.x + sin(angle)*len*faceDir), so dividing faceDir back out here (multiplying, since
  // faceDir is +-1) is what makes armReachAngles/legReachAngles solve the correct real-world direction
  // regardless of which way the character is currently facing.
  const localDx = (canvasX - anchor.x) * faceDir;
  const localDy = canvasY - anchor.y;
  if(part === 'leftHand'){
    const r = armReachAngles(localDx, localDy);
    designer.currentPose.leftShoulderAngle = r.shoulderAngle; designer.currentPose.leftElbowBend = r.elbowBend;
  } else if(part === 'rightHand'){
    const r = armReachAngles(localDx, localDy);
    designer.currentPose.rightShoulderAngle = r.shoulderAngle; designer.currentPose.rightElbowBend = r.elbowBend;
  } else if(part === 'leftFoot'){
    const r = legReachAngles(localDx, localDy);
    designer.currentPose.leftHipAngle = r.shoulderAngle; designer.currentPose.leftKneeBend = r.elbowBend;
  } else if(part === 'rightFoot'){
    const r = legReachAngles(localDx, localDy);
    designer.currentPose.rightHipAngle = r.shoulderAngle; designer.currentPose.rightKneeBend = r.elbowBend;
  } else if(part === 'head'){
    // Only the angle matters here (head/neck are a fixed-length chain from the shoulder), so this
    // ignores drag distance entirely and just points headTilt at wherever the cursor is.
    designer.currentPose.headTilt = Math.atan2(localDx, -localDy);
  }
  designer.playing = false;
  // NOTE: dragging a handle used to clear editingIdx here (treating any change as "now editing a
  // brand-new pose"), which meant the moment you dragged anything while a keyframe was loaded for
  // editing, the "Update keyframe N" option silently disappeared and only "+ Add keyframe" (as a
  // new one) remained — directly breaking the "select a keyframe, adjust it, then update it in
  // place" workflow this designer is supposed to support. editingIdx is left alone here on purpose:
  // the Update-vs-Add-as-new buttons already make the user's intent explicit, so there's no need to
  // guess by watching for pose changes.
  syncDesignerSlidersFromCurrentPose();
}
// Small purple handles drawn on top of the normal render at each draggable point — only shown in
// static edit mode (see loop() below), both so users can see exactly where to grab and to visually
// distinguish "this is an editable pose" from the normal read-only scene preview.
function drawDesignerHandles(){
  const pts = designerHandlePoints();
  if(!pts) return;
  ctx.save();
  ['leftHand','rightHand','leftFoot','rightFoot','head'].forEach(name=>{
    const p = pts[name];
    ctx.beginPath(); ctx.arc(p.x, p.y, DESIGNER_HANDLE_DRAW_RADIUS, 0, Math.PI*2);
    ctx.fillStyle = designerDragPart === name ? 'rgba(192,38,211,0.9)' : 'rgba(124,58,237,0.75)';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  });
  ctx.restore();
}
canvas.addEventListener('mousedown', (e)=>{
  if(!designer.active || designer.playing) return;
  const pt = canvasPointFromEvent(e);
  const handle = designerHandleHitTest(pt.x, pt.y);
  if(!handle) return;
  designerDragPart = handle;
  canvas.style.cursor = 'grabbing';
  applyDesignerDrag(handle, pt.x, pt.y);
  function onMove(ev){
    if(!designerDragPart) return;
    const p = canvasPointFromEvent(ev);
    applyDesignerDrag(designerDragPart, p.x, p.y);
  }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    designerDragPart = null;
    canvas.style.cursor = '';
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
canvas.addEventListener('mousemove', (e)=>{
  if(!designer.active || designerDragPart) return; // dragging is driven by the document-level listener above
  const pt = canvasPointFromEvent(e);
  canvas.style.cursor = designerHandleHitTest(pt.x, pt.y) ? 'grab' : '';
});

function renderDesignerSliders(){
  designerSlidersEl.innerHTML = DESIGNER_SLIDERS.map(s=>
    '<div class="designer-slider-row">' +
      '<label>' + s.label + ' <span class="designer-slider-val" data-valfor="'+s.field+'">' + (designer.currentPose[s.field]||0).toFixed(2) + '</span></label>' +
      '<input type="range" data-designer-slider="'+s.field+'" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'" value="'+(designer.currentPose[s.field]||0)+'">' +
    '</div>'
  ).join('');
  designerSlidersEl.querySelectorAll('[data-designer-slider]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const field = e.target.getAttribute('data-designer-slider');
      designer.currentPose[field] = parseFloat(e.target.value);
      designer.playing = false; // a manual slider tweak always drops back into live single-pose editing
      // editingIdx is intentionally left untouched here: this used to clear editingIdx on every slider
      // tweak (treating any change as "now editing a brand-new pose"), which meant the instant you
      // adjusted a slider while a keyframe was loaded, "Update keyframe N" silently disappeared and
      // you could only ever append a new keyframe — breaking the "select a keyframe, adjust it, then
      // save the change back" workflow. The Update-vs-Add-as-new buttons already make the user's
      // choice explicit, so there's no need to guess by watching for pose changes.
      designerPlayBtn.textContent = 'Play sequence';
      designerPreviewLabel.textContent = (designer.editingIdx >= 0)
        ? ('Editing keyframe ' + (designer.editingIdx+1) + ' — adjust sliders or drag the preview, then Update or Add as new')
        : 'Editing keyframe pose';
      const label = designerSlidersEl.querySelector('[data-valfor="'+field+'"]');
      if(label) label.textContent = designer.currentPose[field].toFixed(2);
    });
  });
}

// Keeps the Add-keyframe area unambiguous about what clicking it will do: when a keyframe is currently
// loaded (editingIdx>=0, i.e. its pose still exactly matches the sliders), the main button switches to
// "Update keyframe #N" and a second "+ Add as new (don't overwrite)" button appears — so the user never
// has to guess whether clicking will silently overwrite the loaded keyframe or append a new one.
function updateAddKeyframeUI(){
  if(!designerAddKeyframeBtn) return;
  const editing = designer.editingIdx >= 0 && designer.editingIdx < designer.keyframes.length;
  designerAddKeyframeBtn.textContent = editing ? ('Update keyframe ' + (designer.editingIdx+1)) : '+ Add keyframe from current pose';
  if(designerAddNewKeyframeBtn) designerAddNewKeyframeBtn.style.display = editing ? 'inline-block' : 'none';
}

function renderDesignerKeyframeList(){
  designerKeyframeListEl.innerHTML = designer.keyframes.length ? designer.keyframes.map((k,idx)=>
    '<div class="designer-kf-row'+(idx===designer.editingIdx?' active':'')+'" data-kf-row="'+idx+'" title="Click to load this keyframe onto the sliders/preview and edit it">' +
      '<span>'+(idx+1)+'.</span>' +
      '<input type="number" min="0.1" step="0.1" value="'+k.duration+'" data-kf-duration="'+idx+'" title="Seconds to hold/transition"><span class="designer-kf-s">s</span>' +
      '<button type="button" class="icon-btn" data-kf-load="'+idx+'" title="Load onto sliders to edit">&#9998;</button>' +
      '<button type="button" class="icon-btn" data-kf-up="'+idx+'" '+(idx===0?'disabled':'')+' title="Move earlier">&uarr;</button>' +
      '<button type="button" class="icon-btn" data-kf-down="'+idx+'" '+(idx===designer.keyframes.length-1?'disabled':'')+' title="Move later">&darr;</button>' +
      '<button type="button" class="icon-btn danger" data-kf-delete="'+idx+'" title="Delete">&times;</button>' +
    '</div>'
  ).join('') : '<p style="font-size:12px; color:var(--muted); margin:4px 0;">No keyframes yet — pose the character with the sliders, then "Add keyframe". A single keyframe just holds that pose; two or more animate between them, looping.</p>';

  function loadKeyframe(idx){
    designer.currentPose = Object.assign({}, designer.keyframes[idx].pose);
    designer.editingIdx = idx; designer.playing = false;
    designerPlayBtn.textContent = 'Play sequence'; designerPreviewLabel.textContent = 'Editing keyframe ' + (idx+1) + ' — adjust sliders or drag the preview, then Update or Add as new';
    renderDesignerSliders(); renderDesignerKeyframeList();
  }
  // Clicking anywhere on a keyframe row selects/loads it (not just the small pencil button) — makes it
  // obvious you can pick any keyframe, not only the first, and jump straight to editing it with the
  // preview already reflecting that exact pose.
  designerKeyframeListEl.querySelectorAll('[data-kf-row]').forEach(row=> row.addEventListener('click', e=>{
    if(e.target.closest('button, input')) return; // let the specific icon-buttons/duration input handle their own clicks
    loadKeyframe(parseInt(row.getAttribute('data-kf-row'),10));
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-duration]').forEach(inp=> inp.addEventListener('input', e=>{
    const idx = parseInt(e.target.getAttribute('data-kf-duration'),10);
    designer.keyframes[idx].duration = Math.max(0.1, parseFloat(e.target.value)||0.1);
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-load]').forEach(btn=> btn.addEventListener('click', e=>{
    loadKeyframe(parseInt(e.currentTarget.getAttribute('data-kf-load'),10));
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-up]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-up'),10);
    if(idx>0){ const t=designer.keyframes[idx-1]; designer.keyframes[idx-1]=designer.keyframes[idx]; designer.keyframes[idx]=t; if(designer.editingIdx===idx) designer.editingIdx=idx-1; else if(designer.editingIdx===idx-1) designer.editingIdx=idx; renderDesignerKeyframeList(); }
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-down]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-down'),10);
    if(idx<designer.keyframes.length-1){ const t=designer.keyframes[idx+1]; designer.keyframes[idx+1]=designer.keyframes[idx]; designer.keyframes[idx]=t; if(designer.editingIdx===idx) designer.editingIdx=idx+1; else if(designer.editingIdx===idx+1) designer.editingIdx=idx; renderDesignerKeyframeList(); }
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-delete]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-delete'),10);
    designer.keyframes.splice(idx,1);
    if(designer.editingIdx===idx) designer.editingIdx=-1;
    else if(designer.editingIdx>idx) designer.editingIdx -= 1;
    renderDesignerKeyframeList();
  }));
  updateAddKeyframeUI();
}

// Movement: off by default (every custom move just animates in place, matching every prior saved
// move). Turning it on makes the character actually travel across the stage while this move plays —
// same MOVE_SPEEDS-style px/sec mechanic every named clip like Walk/Run already uses, just editable
// per-move instead of being fixed per-action-id (js/scene.js's evaluateScene/computeSegmentStartPositions).
const designerMoveCheckbox = document.getElementById('designerMoveCheckbox');
const designerMoveSpeedRow = document.getElementById('designerMoveSpeedRow');
const designerMoveDirSelect = document.getElementById('designerMoveDirSelect');
const designerMoveSpeedSlider = document.getElementById('designerMoveSpeedSlider');
const designerMoveSpeedVal = document.getElementById('designerMoveSpeedVal');
const designerVertCheckbox = document.getElementById('designerVertCheckbox');
const designerVertSpeedRow = document.getElementById('designerVertSpeedRow');
const designerVertDirSelect = document.getElementById('designerVertDirSelect');
const designerVertSpeedSlider = document.getElementById('designerVertSpeedSlider');
const designerVertSpeedVal = document.getElementById('designerVertSpeedVal');
function renderDesignerMovementControl(){
  if(!designerMoveCheckbox) return;
  designerMoveCheckbox.checked = designer.moveSpeed > 0;
  designerMoveSpeedRow.style.display = designer.moveSpeed > 0 ? 'flex' : 'none';
  designerMoveDirSelect.value = (designer.moveDir === -1) ? 'backward' : 'forward';
  designerMoveSpeedSlider.value = designer.moveSpeed > 0 ? designer.moveSpeed : 45;
  designerMoveSpeedVal.textContent = (designer.moveSpeed > 0 ? designer.moveSpeed : 45) + ' px/s';
  if(!designerVertCheckbox) return;
  designerVertCheckbox.checked = designer.vertSpeed > 0;
  designerVertSpeedRow.style.display = designer.vertSpeed > 0 ? 'flex' : 'none';
  designerVertDirSelect.value = (designer.vertDir === -1) ? 'down' : 'up';
  designerVertSpeedSlider.value = designer.vertSpeed > 0 ? designer.vertSpeed : 45;
  designerVertSpeedVal.textContent = (designer.vertSpeed > 0 ? designer.vertSpeed : 45) + ' px/s';
}
if(designerMoveCheckbox){
  designerMoveCheckbox.addEventListener('change', ()=>{
    designer.moveSpeed = designerMoveCheckbox.checked ? parseInt(designerMoveSpeedSlider.value, 10) : 0;
    renderDesignerMovementControl();
  });
  designerMoveDirSelect.addEventListener('change', ()=>{
    designer.moveDir = designerMoveDirSelect.value === 'backward' ? -1 : 1;
  });
  designerMoveSpeedSlider.addEventListener('input', ()=>{
    designer.moveSpeed = parseInt(designerMoveSpeedSlider.value, 10);
    designerMoveSpeedVal.textContent = designer.moveSpeed + ' px/s';
  });
}
if(designerVertCheckbox){
  designerVertCheckbox.addEventListener('change', ()=>{
    designer.vertSpeed = designerVertCheckbox.checked ? parseInt(designerVertSpeedSlider.value, 10) : 0;
    renderDesignerMovementControl();
  });
  designerVertDirSelect.addEventListener('change', ()=>{
    designer.vertDir = designerVertDirSelect.value === 'down' ? -1 : 1;
  });
  designerVertSpeedSlider.addEventListener('input', ()=>{
    designer.vertSpeed = parseInt(designerVertSpeedSlider.value, 10);
    designerVertSpeedVal.textContent = designer.vertSpeed + ' px/s';
  });
}

// ---------- Multi-character posing: let one Designer session touch more than one character ----------
// Originally the Designer only ever edited designer.charId for its whole lifetime. To let a user pose
// BOTH stickmen in a scene (e.g. two boxers) without closing and reopening the overlay per character,
// switching characters here snapshots the character being left into designer.charStash, then either
// restores that character's own earlier-stashed progress (if they've already been visited this
// session) or loads their existing saved move from seg.customPoses (same logic openPoseDesigner uses
// for the very first character). saveDesignerMove/cancelPoseDesigner then walk every stashed character
// instead of only designer.charId, so all of them actually get saved or reverted together.
function stashCurrentDesignerChar(){
  if(!designer.charId) return;
  designer.charStash[designer.charId] = {
    keyframes: designer.keyframes, currentPose: designer.currentPose, editingIdx: designer.editingIdx,
    moveSpeed: designer.moveSpeed, moveDir: designer.moveDir, vertSpeed: designer.vertSpeed, vertDir: designer.vertDir,
    previousAction: designer.previousAction
  };
}
function switchDesignerCharacter(newCharId){
  if(!newCharId || newCharId === designer.charId) return;
  const seg = findSegment(designer.segId);
  const character = findCharacter(newCharId);
  if(!seg || !character) return;
  stashCurrentDesignerChar();
  designer.playing = false; designer.elapsed = 0;
  const stashed = designer.charStash[newCharId];
  if(stashed){
    designer.keyframes = stashed.keyframes; designer.currentPose = stashed.currentPose; designer.editingIdx = stashed.editingIdx;
    designer.moveSpeed = stashed.moveSpeed; designer.moveDir = stashed.moveDir; designer.vertSpeed = stashed.vertSpeed; designer.vertDir = stashed.vertDir;
    designer.previousAction = stashed.previousAction;
  } else {
    const existing = seg.customPoses && seg.customPoses[newCharId];
    designer.previousAction = (seg.actions && seg.actions[newCharId]) || 'idle';
    designer.keyframes = (existing && existing.keyframes && existing.keyframes.length)
      ? existing.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration }))
      : [];
    designer.currentPose = designer.keyframes.length ? Object.assign({}, designer.keyframes[0].pose) : Object.assign({}, DEFAULT_DESIGNER_POSE);
    designer.editingIdx = designer.keyframes.length ? 0 : -1;
    designer.moveSpeed = (existing && existing.moveSpeed) || 0;
    designer.moveDir = (existing && existing.moveDir) || 1;
    designer.vertSpeed = (existing && existing.vertSpeed) || 0;
    designer.vertDir = (existing && existing.vertDir) || 1;
  }
  designer.charId = newCharId;
  designerTitleEl.textContent = 'Design a Move — ' + character.name;
  designerPlayBtn.textContent = 'Play sequence';
  designerPreviewLabel.textContent = (designer.editingIdx >= 0)
    ? ('Editing keyframe ' + (designer.editingIdx+1) + ' — adjust sliders or drag the preview, then Update or Add as new')
    : 'Editing keyframe pose';
  renderDesignerSliders();
  renderDesignerKeyframeList();
  renderDesignerMovementControl();
  renderDesignerCharSelect();
}
// Only shown once a scene actually has more than one character — with a single character there's
// nothing to switch to, so the control would just be clutter.
function renderDesignerCharSelect(){
  if(!designerCharSelect) return;
  const chars = state.scene.characters;
  if(!chars || chars.length < 2){ designerCharSelect.style.display = 'none'; return; }
  designerCharSelect.style.display = '';
  designerCharSelect.innerHTML = chars.map(c=>{
    const kfCount = (c.id === designer.charId) ? designer.keyframes.length : ((designer.charStash[c.id] && designer.charStash[c.id].keyframes.length) || 0);
    return '<option value="'+c.id+'"'+(c.id===designer.charId?' selected':'')+'>'+c.name+(kfCount ? ' ('+kfCount+' kf)' : '')+'</option>';
  }).join('');
}

function openPoseDesigner(segId, charId, explicitPreviousAction){
  const seg = findSegment(segId);
  const character = findCharacter(charId);
  if(!seg || !character) return;
  designer.active = true; designer.segId = segId; designer.charId = charId;
  designer.playing = false; designer.elapsed = 0; designer.editingIdx = -1;
  designer.charStash = {}; // fresh multi-character stash for this Designer session
  // explicitPreviousAction is passed by the action-dropdown handler (onSegmentFieldChange), which
  // must capture the TRUE prior action before it overwrites seg.actions[charId] with 'customPose' —
  // reading seg.actions[charId] here directly would already see 'customPose' in that case, breaking
  // Cancel's revert-to-prior-action behavior. Callers that open the designer without having just
  // changed the action (the pencil edit button, the "Start designing" banner) omit this argument and
  // fall back to reading the current value, which is correct for them.
  designer.previousAction = explicitPreviousAction != null ? explicitPreviousAction : ((seg.actions && seg.actions[charId]) || 'idle');
  const existing = seg.customPoses && seg.customPoses[charId];
  designer.keyframes = (existing && existing.keyframes && existing.keyframes.length)
    ? existing.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration }))
    : [];
  designer.currentPose = designer.keyframes.length ? Object.assign({}, designer.keyframes[0].pose) : Object.assign({}, DEFAULT_DESIGNER_POSE);
  if(designer.keyframes.length) designer.editingIdx = 0;
  designer.moveSpeed = (existing && existing.moveSpeed) || 0;
  designer.moveDir = (existing && existing.moveDir) || 1;
  designer.vertSpeed = (existing && existing.vertSpeed) || 0;
  designer.vertDir = (existing && existing.vertDir) || 1;
  designerTitleEl.textContent = 'Design a Move — ' + character.name;
  designerPlayBtn.textContent = 'Play sequence';
  designerPreviewLabel.textContent = 'Editing keyframe pose';
  // Physically move the one shared canvas into the designer panel — see the block comment above.
  designer.stageOriginalParent = canvas.parentNode;
  designer.stageOriginalNextSibling = canvas.nextSibling;
  designerPreviewMount.insertBefore(canvas, designerPreviewMount.firstChild);
  renderDesignerSliders();
  renderDesignerKeyframeList();
  renderDesignerMovementControl();
  renderDesignerCharSelect();
  designerOverlay.style.display = 'flex';
}

function closePoseDesignerOverlay(){
  designer.active = false; designer.playing = false;
  if(designer.stageOriginalParent){
    if(designer.stageOriginalNextSibling) designer.stageOriginalParent.insertBefore(canvas, designer.stageOriginalNextSibling);
    else designer.stageOriginalParent.appendChild(canvas);
  }
  designerOverlay.style.display = 'none';
}

function cancelPoseDesigner(){
  const seg = findSegment(designer.segId);
  // Only snap the action back to whatever it was before opening if this was a fresh "Design your
  // own..." pick (previousAction wasn't already 'customPose') — cancelling out of re-editing an
  // existing saved move should leave that existing move exactly as it was, not revert to some earlier
  // unrelated action. Stash the currently-active character's in-progress state first so a multi-
  // character Designer session (see switchDesignerCharacter) reverts EVERY character touched this
  // session, not just whichever one happened to be selected when Cancel was clicked.
  stashCurrentDesignerChar();
  if(seg && seg.actions){
    Object.keys(designer.charStash).forEach(cid=>{
      const st = designer.charStash[cid];
      if(st.previousAction !== 'customPose') seg.actions[cid] = st.previousAction;
    });
  }
  closePoseDesignerOverlay();
  renderSegmentList();
  forceRedraw();
}

function saveDesignerMove(){
  const seg = findSegment(designer.segId);
  // Stash the currently-active character's latest edits first, then commit EVERY character touched
  // this session (see switchDesignerCharacter) — not just whichever one happened to be selected when
  // Save was clicked, so posing two characters in one Designer visit actually saves both moves.
  stashCurrentDesignerChar();
  if(seg){
    if(!seg.customPoses) seg.customPoses = {};
    if(!seg.actions) seg.actions = {};
    Object.keys(designer.charStash).forEach(cid=>{
      const st = designer.charStash[cid];
      if(!st.keyframes || st.keyframes.length === 0){
        // Saved with nothing posed — there's nothing to animate, so don't leave the action pointed at
        // an empty custom move; fall back to idle exactly like evaluateScene already would at render time.
        seg.actions[cid] = 'idle';
        delete seg.customPoses[cid];
      } else {
        seg.customPoses[cid] = { keyframes: st.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })), moveSpeed: st.moveSpeed || 0, moveDir: st.moveDir || 1, vertSpeed: st.vertSpeed || 0, vertDir: st.vertDir || 1 };
        seg.actions[cid] = 'customPose';
      }
    });
  }
  closePoseDesignerOverlay();
  renderSegmentList();
  forceRedraw();
}

designerAddKeyframeBtn.addEventListener('click', ()=>{
  // Clicking Add while "Play sequence" is running used to silently do nothing useful: designer.currentPose
  // stays frozen at whatever it was BEFORE Play was clicked (the render loop computes the animated
  // preview pose locally without writing it back), and editingIdx was still pointing at the last
  // keyframe you'd loaded/added — so a click here just re-saved that same old pose over itself, with no
  // visible change and no error, which read as "I can't add more than 2 keyframes." Fixed by treating
  // Add-while-playing as "grab the exact pose being shown RIGHT NOW out of the animation": pause
  // playback, snapshot the live interpolated pose into currentPose/sliders, and force the append path
  // below (this snapshot is inherently a new in-between pose, never something already saved verbatim).
  if(designer.playing){
    designer.currentPose = evalKeyframePose(designer.elapsed, designer.keyframes);
    designer.playing = false;
    designerPlayBtn.textContent = 'Play sequence';
    designerPreviewLabel.textContent = 'Editing keyframe pose';
    designer.editingIdx = -1;
    syncDesignerSlidersFromCurrentPose();
  }
  // editingIdx tracks which keyframe (if any) is currently loaded for editing — set right after
  // loading one (pencil button/row click) or right after appending one (below), and now stays put
  // across slider tweaks and preview drags (it used to be cleared the instant anything changed, which
  // silently blocked ever updating a keyframe's pose — see renderDesignerSliders' input handler and
  // applyDesignerDrag for the fuller explanation). This button always OVERWRITES keyframe editingIdx
  // when one is loaded; the separate "+ Add as new" button is the only way to append instead, so
  // there's no ambiguity about which action a click will take.
  if(designer.editingIdx >= 0 && designer.editingIdx < designer.keyframes.length){
    designer.keyframes[designer.editingIdx].pose = Object.assign({}, designer.currentPose);
  } else {
    designer.keyframes.push({ pose: Object.assign({}, designer.currentPose), duration: 0.6 });
    designer.editingIdx = designer.keyframes.length - 1;
  }
  designerPreviewLabel.textContent = 'Editing keyframe ' + (designer.editingIdx+1) + ' — adjust sliders or drag the preview, then Update or Add as new';
  renderDesignerKeyframeList();
});
// Only shown/enabled while a keyframe is loaded (editingIdx>=0) — lets you explicitly append the
// current pose as a brand new keyframe instead of it overwriting the one you loaded, without needing
// to nudge a slider first as a workaround. Explicit rather than relying on the user noticing the main
// button silently switches between "Update" and "Add" depending on hidden state.
if(designerAddNewKeyframeBtn){
  designerAddNewKeyframeBtn.addEventListener('click', ()=>{
    if(designer.playing){
      designer.currentPose = evalKeyframePose(designer.elapsed, designer.keyframes);
      designer.playing = false;
      designerPlayBtn.textContent = 'Play sequence';
      designerPreviewLabel.textContent = 'Editing keyframe pose';
      syncDesignerSlidersFromCurrentPose();
    }
    designer.keyframes.push({ pose: Object.assign({}, designer.currentPose), duration: 0.6 });
    designer.editingIdx = designer.keyframes.length - 1;
    designerPreviewLabel.textContent = 'Editing keyframe ' + (designer.editingIdx+1) + ' — adjust sliders or drag the preview, then Update or Add as new';
    renderDesignerKeyframeList();
  });
}
designerPlayBtn.addEventListener('click', ()=>{
  if(designer.keyframes.length < 2) return; // nothing to animate between yet
  designer.playing = !designer.playing;
  designer.elapsed = 0;
  designerPlayBtn.textContent = designer.playing ? 'Pause preview' : 'Play sequence';
  designerPreviewLabel.textContent = designer.playing ? 'Previewing full sequence (looping)' : 'Editing keyframe pose';
});
designerSaveBtn.addEventListener('click', saveDesignerMove);
designerCancelBtn.addEventListener('click', cancelPoseDesigner);
designerCloseBtn.addEventListener('click', cancelPoseDesigner);

// ---------- Move Library (saved to this browser via localStorage) ----------
// Mirrors the Character Library pattern above exactly (same localStorage approach, same
// select+load+delete shape) but for a reusable KEYFRAME SEQUENCE rather than a whole character — save
// a move once (e.g. "Boxing Jab-Cross"), then load it onto any character, in any scene, later.
const MOVE_LIB_KEY = 'stickmanMoveLibrary';
const designerMoveLibSelect = document.getElementById('designerMoveLibSelect');
const designerLoadMoveBtn = document.getElementById('designerLoadMoveBtn');
const designerDeleteMoveBtn = document.getElementById('designerDeleteMoveBtn');
const designerSaveToLibBtn = document.getElementById('designerSaveToLibBtn');
// Move Library entries get a stable id (rather than being referenced by array index) so they can be
// safely pointed at from elsewhere — specifically the main action dropdown's "saved move" options
// below, which must keep working even if the library list is reordered or another entry is deleted.
// Older entries saved before this id existed are migrated in place the first time they're loaded.
function genMoveId(){ return 'move_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
function loadMoveLibrary(){
  let list;
  try { list = JSON.parse(localStorage.getItem(MOVE_LIB_KEY) || '[]'); } catch(e){ list = []; }
  let migrated = false;
  list.forEach(m=>{ if(!m.id){ m.id = genMoveId(); migrated = true; } });
  if(migrated) saveMoveLibrary(list);
  return list;
}
function saveMoveLibrary(list){ try { localStorage.setItem(MOVE_LIB_KEY, JSON.stringify(list)); } catch(e){} }
function refreshMoveLibSelect(){
  const list = loadMoveLibrary();
  designerMoveLibSelect.innerHTML = list.length
    ? list.map(m=> '<option value="'+m.id+'">'+escapeHtml(m.label)+' ('+m.keyframes.length+' keyframes)</option>').join('')
    : '<option value="">(none saved yet)</option>';
}
designerSaveToLibBtn.addEventListener('click', ()=>{
  if(!designer.keyframes.length){ alert('Add at least one keyframe before saving this move to the library.'); return; }
  const name = (prompt('Name this move (e.g. "Boxing Jab-Cross"):', '') || '').trim();
  if(!name) return;
  const list = loadMoveLibrary();
  const id = genMoveId();
  list.push({ id: id, label: name, keyframes: designer.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })), moveSpeed: designer.moveSpeed || 0, moveDir: designer.moveDir || 1, vertSpeed: designer.vertSpeed || 0, vertDir: designer.vertDir || 1 });
  saveMoveLibrary(list);
  refreshMoveLibSelect();
  designerMoveLibSelect.value = id;
  // This saved move is now also directly pickable from every segment's action dropdown elsewhere in
  // the tool (clipOptionsHtml appends a "saved move" option per library entry) — refresh the timeline
  // so that shows up immediately instead of only after the next unrelated re-render.
  if(typeof renderSegmentList === 'function') renderSegmentList();
});
designerLoadMoveBtn.addEventListener('click', ()=>{
  const list = loadMoveLibrary();
  const entry = list.find(m=> m.id === designerMoveLibSelect.value);
  if(!entry) return;
  designer.keyframes = entry.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration }));
  designer.editingIdx = designer.keyframes.length ? 0 : -1;
  designer.currentPose = designer.keyframes.length ? Object.assign({}, designer.keyframes[0].pose) : Object.assign({}, DEFAULT_DESIGNER_POSE);
  designer.moveSpeed = entry.moveSpeed || 0;
  designer.moveDir = entry.moveDir || 1;
  designer.vertSpeed = entry.vertSpeed || 0;
  designer.vertDir = entry.vertDir || 1;
  designer.playing = false;
  designerPlayBtn.textContent = 'Play sequence'; designerPreviewLabel.textContent = 'Editing keyframe pose';
  renderDesignerSliders();
  renderDesignerKeyframeList();
  renderDesignerMovementControl();
});
designerDeleteMoveBtn.addEventListener('click', ()=>{
  const list = loadMoveLibrary();
  const idx = list.findIndex(m=> m.id === designerMoveLibSelect.value);
  if(idx < 0) return;
  if(!confirm('Delete the saved move "' + list[idx].label + '"? This cannot be undone.')) return;
  list.splice(idx, 1);
  saveMoveLibrary(list);
  refreshMoveLibSelect();
  // A deleted saved move must also disappear from every segment's action dropdown (clipOptionsHtml
  // reads the library fresh each render) so it can't be picked again after being removed.
  if(typeof renderSegmentList === 'function') renderSegmentList();
});
refreshMoveLibSelect();

// ---------- Design Your Own Scene: prominent entry point ----------
// A visible callout (rather than only a buried dropdown option) that jumps straight into the Pose
// Designer for the first character/segment — the fastest way to actually see what the feature does.
// Building a full multi-character scene from here is just: use this to try it once, then add more
// characters via the Characters panel and repeat per character/segment as described in the callout.
const startSceneDesignBtn = document.getElementById('startSceneDesignBtn');
if(startSceneDesignBtn){
  startSceneDesignBtn.addEventListener('click', ()=>{
    const seg = state.scene.timeline[0];
    const character = state.scene.characters[0];
    if(!seg || !character) return;
    const layoutEl = document.querySelector('.layout');
    if(layoutEl && layoutEl.scrollIntoView) layoutEl.scrollIntoView({ behavior:'smooth', block:'start' });
    openPoseDesigner(seg.id, character.id);
  });
}

// ---------- export ----------
// Exports at a higher resolution than the live editing canvas (which stays at its normal 800x450 the
// rest of the time, for snappy interactive editing/dragging). EXPORT_SCALE temporarily enlarges the
// shared canvas's backing pixel buffer to 800*EXPORT_SCALE x 450*EXPORT_SCALE (1920x1080 = standard
// Full HD) and applies a matching ctx.scale() — every existing draw call in render.js/scene.js only
// ever draws in the original 0-800/0-450 logical coordinate space (W/H there are constants captured
// once at page load, not re-read from the live canvas), so the scale transform is ALL that's needed to
// get a crisp, full-resolution export with zero changes anywhere else in the renderer.
const EXPORT_SCALE = 2.4; // 800x450 * 2.4 = 1920x1080
exportBtn.addEventListener('click', ()=>{
  if(!canvas.captureStream || !window.MediaRecorder){
    alert('Video export needs a Chrome/Edge browser (MediaRecorder API). Playback still works everywhere.');
    return;
  }
  const totalDur = evaluateScene(state.scene, 0).totalDuration;
  // Frame-by-frame export doesn't play the scene in real time at all, so the Playback Speed slider
  // and whatever the user was doing on-screen (playing, paused, mid-scrub) are irrelevant to the
  // recording itself - we just save them here and restore them once the export finishes so the
  // editor snaps back to exactly how the user left it.
  const origSpeedForExport = state.speed;
  const wasPlayingForExport = state.playing;
  const savedElapsedForExport = elapsed;
  state.speed = 1;
  state.playing = false;

  // Lock the ON-SCREEN displayed size to exactly what it already was (in CSS pixels) before touching
  // the backing resolution — canvas{max-width:100%} alone would otherwise let the browser stretch the
  // now-much-taller backing buffer to fill the container width, visibly distorting the aspect ratio for
  // the few seconds of recording. Capturing the current rendered box size and pinning it via inline
  // style keeps the visible preview looking completely unchanged while it secretly records much bigger.
  const displayW = canvas.offsetWidth, displayH = canvas.offsetHeight;
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  // A user dragging a character/timeline-scrub on the canvas mid-export would compute the wrong
  // position (canvasPointFromEvent divides by the now-larger canvas.width), so just disable pointer
  // interaction on the canvas for the brief recording window — export already disables the button, this
  // covers the canvas itself.
  canvas.style.pointerEvents = 'none';

  const origW = canvas.width, origH = canvas.height;
  // Frame-by-frame export re-encodes every single frame to WebP on the CPU (no GPU/hardware
  // encoder involved), and that cost scales with pixel count - at the full EXPORT_SCALE (1080p+)
  // resolution used elsewhere, encoding a single detailed frame can take multiple seconds, which
  // made a several-second animation take many minutes to export. Cap the export resolution at
  // 1280px wide (standard HD) for this path specifically so exports finish in a reasonable time;
  // still a clear upgrade over the original on-screen preview size.
  const frameExportScale = Math.min(EXPORT_SCALE, 1280 / origW);
  canvas.width = Math.round(origW * frameExportScale);
  canvas.height = Math.round(origH * frameExportScale);
  // Resizing a canvas element always resets its 2D context state (transform included) AND clears its
  // pixel content back to blank — the scale has to be (re)applied right after, and critically the
  // canvas needs an actual painted frame at the new size BEFORE captureStream() is called. Calling
  // captureStream() on a still-blank, just-resized canvas produced a stream that recorded zero frames
  // (a real bug caught by testing the export live: the resulting .webm was 0 bytes) — forcing one
  // synchronous redraw here first fixes that.
  ctx.scale(frameExportScale, frameExportScale); // must match the resize above, not the old EXPORT_SCALE
  forceRedraw();

  const FPS = 24; // lower than the on-screen 30fps preview - cuts total encode work by 20%
  // without a visually obvious difference for this style of animation, on top of the resolution cap.
  const totalFrames = Math.max(1, Math.round(totalDur * FPS));

  const restoreCanvas = () => {
    canvas.width = origW; canvas.height = origH;
    canvas.style.width = ''; canvas.style.height = ''; canvas.style.pointerEvents = '';
    forceRedraw();
  };

  if(!window.WebMWriter || !canvas.toDataURL){
    alert('Video export needs a Chrome/Edge browser (Canvas WebP support).');
    restoreCanvas();
    state.playing = wasPlayingForExport;
    elapsed = savedElapsedForExport;
    state.speed = origSpeedForExport;
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export Video (.webm)';
    return;
  }

  const writer = new window.WebMWriter({ quality: 0.85, frameRate: FPS });

  exportBtn.disabled = true;
  exportBtn.textContent = 'Rendering... 0%';

  // Frame-by-frame direct generation instead of real-time canvas.captureStream()/MediaRecorder.
  // Each frame is rendered by calling evaluateScene/renderFrame at an exact timestamp, then handed
  // straight to the WebM writer   there's no real-time playback involved at all, so this is
  // completely immune to the bugs that plagued the old recording-based approach: browsers throttling
  // or pausing requestAnimationFrame on unfocused/hidden tabs, wall-clock drift, and the Playback
  // Speed slider all used to be able to cut the export short or skew its length. None of that can
  // happen here because the loop below doesn't depend on real time passing at all   it runs exactly
  // totalFrames iterations, full stop, so the output duration always exactly matches the timeline.
  (async () => {
    try {
      for (let f = 0; f < totalFrames; f++) {
        const t = Math.min(f / FPS, Math.max(0, totalDur - 1 / FPS));
        const frameData = evaluateScene(state.scene, t);
        renderFrame(frameData);
        writer.addFrame(canvas);

        if (f % 6 === 0 || f === totalFrames - 1) {
          exportBtn.textContent = 'Rendering... ' + Math.round(((f + 1) / totalFrames) * 100) + '%';
          // Yield back to the browser periodically so the tab stays responsive and the percentage
          // label actually repaints between frames.
          await new Promise(r => setTimeout(r, 0));
        }
      }

      exportBtn.textContent = 'Finishing up...';
      // Give the browser a beat to repaint that label before the (potentially chunky, synchronous)
      // final file-assembly work below - otherwise "Rendering... 100%" can appear to hang for a
      // while with zero feedback on slower machines, even though nothing is actually stuck.
      await new Promise(r => setTimeout(r, 0));

      const blob = await writer.complete();

      restoreCanvas();
      state.playing = wasPlayingForExport;
      elapsed = savedElapsedForExport;
      state.speed = origSpeedForExport;

      const url = URL.createObjectURL(blob);
      previewVideo.src = url; previewVideo.style.display = 'block';
      downloadLink.href = url; downloadLink.download = 'stickman_video.webm';
      downloadLink.style.display = 'inline-block';
      downloadLink.textContent = 'Download stickman_video.webm';
      const tipEl = document.querySelector('.export-tip');
      if (tipEl) { tipEl.style.color = ''; tipEl.textContent = 'Saved as .webm - plays natively in Chrome, Firefox, Edge, and VLC. Windows\' built-in video player may not open it; use the browser or VLC if it looks stuck.'; }
    } catch (err) {
      // Don't rely on alert() for this: if the browser previously showed a dialog on this page and
      // the user checked "Prevent this page from creating additional dialogs" (a real Chrome option),
      // every subsequent alert() silently does nothing - which looks exactly like "export finished
      // but nothing happened", the exact bug this replaces. An on-page message can't be suppressed
      // that way, and console.error keeps a copy for debugging.
      console.error('Video export failed:', err);
      const tipEl = document.querySelector('.export-tip');
      if (tipEl) {
        tipEl.style.color = '#dc2626';
        tipEl.textContent = 'Export failed: ' + (err && err.message ? err.message : err) + ' - please try again. If it keeps happening, open the browser console (F12) and share what it shows.';
      }
      restoreCanvas();
      state.playing = wasPlayingForExport;
      elapsed = savedElapsedForExport;
      state.speed = origSpeedForExport;
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export Video (.webm)';
    }
  })();
});

// ---------- init ----------
renderCharacterList();
renderAnimalList();
renderVehicleList();
renderSegmentList();
