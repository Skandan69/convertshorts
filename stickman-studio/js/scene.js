// ---------- scene / timeline domain model ----------
// background/weather default to null, meaning "inherit the scene-wide setting" — set them to a real
// id to override just this segment (e.g. so a multi-segment "driving" sequence can cut from a summer
// street to a snowy highway to sell a long journey without any literal point-to-point movement).
// dragTargets: { charId: { x } } — set by dragging a character/rider on the canvas (js/ui.js) to pin
// where they should END UP by the end of THIS segment. When present for a character, it overrides the
// normal direction/speed-based movement entirely for that character this segment: they linearly slide
// from wherever the previous segment left them to dragTargets[charId].x over the segment's duration.
function makeSegment(duration, actions, dialogue, background, weather, directions, povCamera, dragTargets){
    return { id: uid(), duration: duration, actions: actions || {}, dialogue: dialogue || null, background: background || null, weather: weather || null, directions: directions || {}, povCamera: !!povCamera, dragTargets: dragTargets || {} };
}
// Resolves a character's effective facing/movement direction for a segment: an explicit per-segment
// override ('left'/'right') if the user set one, else the character's normal layout-assigned faceDir
// (characters face "inward" toward each other by default — see computePositions below).
function resolveFaceDir(seg, charId, homeFaceDir){
    const override = seg && seg.directions && seg.directions[charId];
    return override === 'left' ? -1 : override === 'right' ? 1 : homeFaceDir;
}
// Clips that actually translate the character's x position across the segment (as opposed to
// animating in place). px/sec — tuned so a default ~4s segment covers a believable chunk of the
// 800px-wide stage without a character needing several segments just to cross it. Ride/drive clips
// move too (a limo is heavier/slower than a sports car; a bike is slower than a motorcycle) — for a
// really long journey, pair a move segment with a per-segment background/weather override (task #14)
// to cut to a new backdrop rather than relying on one segment to cross the whole stage.
const MOVE_SPEEDS = { walk: 45, run: 100, skateboard: 130, drivecar: 180, drivesportscar: 230, drivelimo: 150, ridebike: 90, ridemotorcycle: 190, flyplane: 200, flyhelicopter: 140, swim: 55 };
function isMoveClip(clipId){ return Object.prototype.hasOwnProperty.call(MOVE_SPEEDS, clipId); }
// flyplane/flyhelicopter additionally support vertical travel: px/sec climb-or-descend rate, used only
// when the segment's direction override for that character is 'up' or 'down' (see resolveVerticalDir).
// When vertical movement is active for a segment, horizontal movement pauses for that segment (a plane
// climbing straight up doesn't also cruise forward) — see computeSegmentStartPositions/evaluateScene.
const VERTICAL_SPEEDS = { flyplane: 90, flyhelicopter: 110 };
// Kept low enough that a character's head still has clear headroom below the top of the 450px-tall
// canvas even at max altitude (verified live: HIP_HEIGHT/torso/neck/head add up to ~254px above
// GROUND_Y=380, so altitude much past ~180 starts crowding the top edge).
const MAX_ALTITUDE = 180;
function isFlyClip(clipId){ return Object.prototype.hasOwnProperty.call(VERTICAL_SPEEDS, clipId); }
function resolveVerticalDir(seg, charId){
    const override = seg && seg.directions && seg.directions[charId];
    return override === 'up' ? 1 : override === 'down' ? -1 : 0;
}
// Ride/drive clips pair the seated "steering" pose (poseRide) with a vehicle prop drawn right behind
// the character. 'car'-kind rides use drawRideCarProp (js/vehicles.js) — purpose-built, larger, and
// with a footwell/wheel layout matched to poseRide's actual leg geometry so feet never overlap a
// wheel. 'generic'-kind rides reuse the existing decorative VEHICLES.bicycle/motorcycle art at a
// bigger scale, since those already read fine at rider scale (unlike the tiny decorative car).
const RIDE_VEHICLES = {
    drivecar: { kind:'car', variant:'sedan' },
    drivesportscar: { kind:'car', variant:'sports' },
    drivelimo: { kind:'car', variant:'limo' },
    ridebike: { kind:'generic', type:'bicycle', scale:1.5 },
    ridemotorcycle: { kind:'generic', type:'motorcycle', scale:1.7 },
    flyplane: { kind:'fly', type:'airplane' },
    flyhelicopter: { kind:'fly', type:'helicopter' }
};
// Only used to avoid double-placing a decorative vehicle prop when the character is already riding
// that same kind of vehicle (see parsePromptToScene below) — maps each ride clip to the VEHICLES.js
// registry key it visually corresponds to, regardless of which draw function actually renders it.
const RIDE_DECORATIVE_TYPE = { drivecar:'car', drivesportscar:'car', drivelimo:'car', ridebike:'bicycle', ridemotorcycle:'motorcycle', flyplane:'airplane', flyhelicopter:'helicopter' };
// Presets are templates: actions/speakers are keyed by CHARACTER INDEX (0,1,...), not by id,
// since the actual character list is open-ended now. resolveIndexedTimeline() below translates
// indices into whichever real character ids currently occupy those slots (growing the list if needed).
const PRESETS = {
    talk: { charCount:2, timeline:[
      { duration:2.5, actions:{0:'talk', 1:'idle'}, dialogue:{speakerIdx:0, text:'Hi! Nice day, right?'} },
      { duration:2.5, actions:{0:'idle', 1:'talk'}, dialogue:{speakerIdx:1, text:'It sure is! Coffee?'} },
      { duration:2.5, actions:{0:'talk', 1:'idle'}, dialogue:{speakerIdx:0, text:"Sounds great, let's go!"} }
        ]},
    kite: { charCount:1, timeline:[ { duration:10, actions:{0:'kite'}, dialogue:null } ]},
    walk: { charCount:1, timeline:[ { duration:8, actions:{0:'walk'}, dialogue:null } ]},
    wave: { charCount:1, timeline:[ { duration:4, actions:{0:'wave'}, dialogue:null } ]},
    dance:{ charCount:2, timeline:[ { duration:6, actions:{0:'dance', 1:'dance'}, dialogue:null } ]}
};

function resolveIndexedTimeline(indexedSegments, charCount){
    while(state.scene.characters.length < charCount) state.scene.characters.push(makeDefaultCharacter(state.scene.characters.length));
    const ids = state.scene.characters.map(c=>c.id);
    return indexedSegments.map(s=>({
          id: uid(),
          duration: s.duration,
          actions: Object.fromEntries(Object.entries(s.actions||{}).map(([idx,clip])=>[ids[idx], clip])),
          dialogue: s.dialogue ? { speakerId: ids[s.dialogue.speakerIdx], text: s.dialogue.text } : null,
          background: s.background || null,
          weather: s.weather || null,
          directions: {},
          povCamera: !!s.povCamera,
          dragTargets: {}
    }));
}

// ---------- prompt -> scene understanding (rule-based keyword NLU, runs fully offline) ----------
// Stems (e.g. 'walk') deliberately match inflections via substring ('walks','walking') —
// multi-word phrases are used where a bare stem would be ambiguous (e.g. 'call' alone is too generic).
const ACTION_KEYWORDS = [
  { clipId:'sit',   words:['sit','take a seat','takes a seat'] },
  { clipId:'drink', words:['drink','sip'] },
  { clipId:'eat',   words:['eat','ate','eating','bites into','takes a bite','has lunch','has dinner'] },
  { clipId:'phone', words:['on the phone','on a call','phone call','answers the phone','makes a call','calling','phone'] },
  { clipId:'wave',  words:['wav','says hello','says hi'] },
  { clipId:'dance', words:['danc'] },
  { clipId:'kite',  words:['kite'] },
  { clipId:'jump',  words:['jump'] },
  { clipId:'run',   words:['run','runs','running','sprint','sprints','sprinting'] },
  { clipId:'fight', words:['fight','fights','fighting','punch','punches','battle'] },
  { clipId:'argue', words:['argue','argues','arguing','yell at','yells at','shout at'] },
  { clipId:'hug',   words:['hug','hugs','hugging','embrace','embraces'] },
  { clipId:'highfive', words:['high five','high-five','high fives'] },
  { clipId:'kick',  words:['kick','kicks','kicking'] },
  { clipId:'throw', words:['throw','throws','throwing','pitches'] },
  { clipId:'swim',  words:['swim','swims','swimming'] },
  { clipId:'sleep', words:['sleep','sleeps','sleeping','naps','takes a nap','dozes off'] },
  { clipId:'read',  words:['read','reads','reading a book','reads a book'] },
  { clipId:'clap',  words:['clap','claps','clapping','applause'] },
  { clipId:'bow',   words:['bows','bowing','takes a bow'] },
  { clipId:'yoga',  words:['yoga','meditates','meditating'] },
  { clipId:'cry',   words:['cry','cries','crying','sobs','sobbing'] },
  { clipId:'point', words:['point','points','pointing'] },
  { clipId:'salute',words:['salute','salutes','saluting'] },
  { clipId:'shrug', words:['shrug','shrugs','shrugging'] },
  { clipId:'stretch',words:['stretch','stretches','stretching'] },
  { clipId:'fall',  words:['falls down','falling down','trips and falls','stumbles and falls'] },
  { clipId:'pushup', words:['push-up','push up','pushups','push-ups','does push-ups'] },
  { clipId:'cheer', words:['cheer','cheers','cheering'] },
  { clipId:'drum',  words:['drum','drums','drumming','plays the drums'] },
  { clipId:'cartwheel', words:['cartwheel','cartwheels'] },
  { clipId:'paint', words:['paint','paints','painting'] },
  { clipId:'write', words:['writ','writes','writing'] },
  { clipId:'fish',  words:['fish','fishes','fishing'] },
  { clipId:'shake', words:['shake hands','shakes hands','shaking hands','handshake'] },
  { clipId:'guitar', words:['guitar','plays the guitar','playing guitar'] },
  { clipId:'umbrella', words:['umbrella'] },
  { clipId:'skateboard', words:['skateboard','skateboards','skateboarding'] },
  { clipId:'laptop', words:['laptop','types on a laptop','typing on a laptop','works on a laptop'] },
  { clipId:'camera', words:['takes a photo','takes a picture','photographs','snaps a photo'] },
  { clipId:'drivesportscar', words:['drives a sports car','driving a sports car','drives a sportscar','drives a race car','driving a race car','drives a ferrari','drives a lamborghini'] },
  { clipId:'drivelimo', words:['drives a limo','driving a limo','rides in a limo','riding in a limo','drives a limousine','riding in a limousine'] },
  { clipId:'drivecar', words:['drives a car','driving a car','drives the car','drives his car','drives her car','drives a luxury car','driving a luxury car'] },
  { clipId:'ridebike', words:['rides a bike','riding a bike','rides a bicycle','riding a bicycle','rides his bike','rides her bike','rides the bike'] },
  { clipId:'ridemotorcycle', words:['rides a motorcycle','riding a motorcycle','rides a motorbike','riding a motorbike','rides the motorcycle'] },
  { clipId:'flyplane', words:['flies a plane','flying a plane','pilots a plane','flies the plane','flies an airplane','flying an airplane','flies a jet'] },
  { clipId:'flyhelicopter', words:['flies a helicopter','flying a helicopter','pilots a helicopter','flies the helicopter','flies a chopper','flying a chopper'] },
  { clipId:'walk',  words:['walk','comes in','comes into','enters','arrives'] },
  { clipId:'talk',  words:['talks to','talking to','chats with','chatting with','has a conversation','conversation with'] },
  { clipId:'idle',  words:['stand','wait','relax'] }
  ];

function findActionSequence(text){
    const found = [];
    ACTION_KEYWORDS.forEach(entry=>{
          let bestIdx = -1;
          entry.words.forEach(w=>{
                  const idx = text.indexOf(w);
                  if(idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
          });
          if(bestIdx !== -1) found.push({ clipId: entry.clipId, idx: bestIdx });
    });
    found.sort((a,b)=> a.idx - b.idx);
    const seq = [];
    found.forEach(f=>{ if(!seq.length || seq[seq.length-1] !== f.clipId) seq.push(f.clipId); });
    return seq;
}

function detectBackground(text){
    if(/(cafe|café|coffee shop|coffeeshop)/.test(text)) return 'cafe';
    if(/(office|desk|workplace|cubicle)/.test(text)) return 'office';
    if(/(bedroom|bed room)/.test(text)) return 'bedroom';
    if(/(street|sidewalk|city)/.test(text)) return 'street';
    if(/(beach|seaside|ocean|sea shore|shoreline)/.test(text)) return 'beach';
    if(/(forest|woods)/.test(text)) return 'forest';
    if(/(gym|gymnasium|workout)/.test(text)) return 'gym';
    if(/(classroom|school)/.test(text)) return 'school';
    if(/(space|outer space|galaxy|planet|astronaut)/.test(text)) return 'space';
    if(/(restaurant|diner)/.test(text)) return 'restaurant';
    if(/(farm|barn|farmyard)/.test(text)) return 'farm';
    if(/(mountain|mountains)/.test(text)) return 'mountain';
    if(/(lake|pond)/.test(text)) return 'lake';
    if(/(desert|dunes)/.test(text)) return 'desert';
    if(/(castle)/.test(text)) return 'castle';
    if(/(stadium|arena)/.test(text)) return 'stadium';
    if(/(underwater|under the sea|ocean floor)/.test(text)) return 'underwater';
    if(/(park|outside|outdoor|garden)/.test(text)) return 'sky';
    if(/(grid|graph paper)/.test(text)) return 'grid';
    if(/(airport|terminal|runway)/.test(text)) return 'airport';
    if(/(hospital|clinic|er room)/.test(text)) return 'hospital';
    if(/(library|bookshelf)/.test(text)) return 'library';
    if(/(jungle|rainforest)/.test(text)) return 'jungle';
    if(/(volcano|lava)/.test(text)) return 'volcano';
    if(/(carnival|fair|fairground|amusement park)/.test(text)) return 'carnival';
    return 'white';
}

function detectWeather(text){
    if(/(rain|raining|rainy|downpour|storm)/.test(text)) return 'rain';
    if(/(snow|snowing|snowy|blizzard)/.test(text)) return 'snow';
    if(/(fog|foggy|misty|haze)/.test(text)) return 'fog';
    if(/(sunny|sunshine|sun rays|bright sun)/.test(text)) return 'sunny';
    if(/(autumn|fall leaves|falling leaves)/.test(text)) return 'autumn';
    return null; // no explicit weather mentioned -> leave whatever's already selected alone
}

function detectDuration(text){
    const m = text.match(/(\d+(\.\d+)?)\s*(minute|min|second|sec)s?/i);
    if(!m) return null;
    const n = parseFloat(m[1]);
    const seconds = /^min/i.test(m[3]) ? n*60 : n;
    return Math.max(2, Math.min(300, seconds));
}

function detectFurniture(text){
    return /(sofa|couch)/.test(text) ? 'sofa' : 'chair';
}

function detectBodyType(text){
    if(/(kid|child|little (boy|girl)|young boy|young girl|toddler)/.test(text)) return 'child';
    if(/(old man|old woman|elderly|grandpa|grandma|grandfather|grandmother|senior citizen)/.test(text)) return 'elder';
    return 'adult';
}

function detectFood(text){
    if(/(pizza)/.test(text)) return 'pizza';
    if(/(burger|hamburger)/.test(text)) return 'burger';
    if(/(apple)/.test(text)) return 'apple';
    if(/(hot dog|hotdog)/.test(text)) return 'hotdog';
    if(/(ice cream|icecream)/.test(text)) return 'icecream';
    if(/(cake)/.test(text)) return 'cake';
    if(/(donut|doughnut)/.test(text)) return 'donut';
    if(/(taco)/.test(text)) return 'taco';
    if(/(sushi)/.test(text)) return 'sushi';
    if(/(popcorn)/.test(text)) return 'popcorn';
    if(/(waffle)/.test(text)) return 'waffle';
    if(/(sandwich)/.test(text)) return 'sandwich';
    if(/(watermelon)/.test(text)) return 'watermelon';
    if(/(banana)/.test(text)) return 'banana';
    if(/(cookie)/.test(text)) return 'cookie';
    if(/(pretzel)/.test(text)) return 'pretzel';
    return null; // no explicit food mentioned -> leave whatever's already selected alone
}

function detectTwoCharacters(text){
    return /(two stickmen|another stickman|his friend|her friend|each other|a friend|duo|both stickmen|fight|argue|hug|high five|high-five|shake hands|shakes hands|handshake)/.test(text);
}


// ---------- animals: decorative scene creatures, detected independently of the character count ----------
const ANIMAL_KEYWORDS = [
  { type:'dog',      words:['dog','puppy','puppies'] },
  { type:'cat',      words:['cat','kitten'] },
  { type:'bird',     words:['bird','parrot','pigeon'] },
  { type:'rabbit',   words:['rabbit','bunny'] },
  { type:'horse',    words:['horse','pony'] },
  { type:'cow',      words:['cow','cattle'] },
  { type:'sheep',    words:['sheep','lamb'] },
  { type:'elephant', words:['elephant'] },
  { type:'fish',     words:['fish','goldfish'] },
  { type:'snake',    words:['snake'] },
  { type:'chicken',  words:['chicken','hen','rooster'] },
  { type:'pig',      words:['pig','piglet'] },
  { type:'monkey',   words:['monkey'] },
  { type:'lion',     words:['lion'] },
  { type:'turtle',   words:['turtle','tortoise'] },
  { type:'frog',     words:['frog'] },
  { type:'deer',     words:['deer'] },
  { type:'bear',     words:['bear'] },
  { type:'penguin',  words:['penguin'] },
  { type:'owl',      words:['owl'] },
  { type:'giraffe',  words:['giraffe'] },
  { type:'zebra',    words:['zebra'] },
  { type:'kangaroo', words:['kangaroo'] },
  { type:'panda',    words:['panda'] },
  { type:'fox',      words:['fox'] },
  { type:'wolf',     words:['wolf'] }
  ];
function detectAnimals(text){
    const found = [];
    ANIMAL_KEYWORDS.forEach(entry=>{
          if(entry.words.some(w=> text.indexOf(w) !== -1)) found.push({ id: uid(), type: entry.type, sizeScale: 1 });
    });
    return found;
}

// ---------- vehicles: static scene props, detected independently of the character count ----------
const VEHICLE_KEYWORDS = [
  { type:'car',        words:['car','drives','driving'] },
  { type:'bicycle',    words:['bicycle','bike','bikes'] },
  { type:'bus',        words:['bus','buses'] },
  { type:'truck',      words:['truck'] },
  { type:'motorcycle', words:['motorcycle','motorbike'] },
  { type:'train',      words:['train'] },
  { type:'airplane',   words:['airplane','plane','jet'] },
  { type:'boat',       words:['boat','ship','sailboat'] },
  { type:'helicopter', words:['helicopter','chopper'] },
  { type:'scooter',    words:['scooter'] },
  { type:'tractor',    words:['tractor'] },
  { type:'ambulance',  words:['ambulance'] },
  { type:'submarine',  words:['submarine'] },
  { type:'hotairballoon', words:['hot air balloon','hotairballoon','balloon'] }
  ];
function detectVehicles(text){
    const found = [];
    VEHICLE_KEYWORDS.forEach(entry=>{
          if(entry.words.some(w=> text.indexOf(w) !== -1)) found.push({ id: uid(), type: entry.type, sizeScale: 1 });
    });
    return found;
}

function extractQuotedLines(text){
    const lines = [];
    const re = /"([^"]+)"/g;
    let m;
    while((m = re.exec(text))){ lines.push(m[1]); }
    return lines;
}


  function parsePromptToScene(rawText){
      const text = rawText.toLowerCase();
      let seq = findActionSequence(text);
      if(!seq.length) seq = ['idle'];
      const bg = detectBackground(text);
      const weather = detectWeather(text);
      const furniture = detectFurniture(text);
      const food = detectFood(text);
      const bodyType = detectBodyType(text);
      const explicitDuration = detectDuration(rawText);
      const enableB = detectTwoCharacters(text);
      const animals = detectAnimals(text);
      // If a character is already driving/riding (seq includes drivecar/ridebike/ridemotorcycle), don't
  // also spawn a redundant decorative copy of that same vehicle type floating separately in the scene.
  const rideVehicleTypes = seq.filter(id=> RIDE_DECORATIVE_TYPE[id]).map(id=> RIDE_DECORATIVE_TYPE[id]);
      const vehicles = detectVehicles(text).filter(v=> !rideVehicleTypes.includes(v.type));
      const quoted = extractQuotedLines(rawText);

  const minPerSeg = 1.5;
      const count = seq.length;
      let total = explicitDuration || Math.max(count*4, 6);
      total = Math.max(total, count*minPerSeg);
      const perSeg = total / count;

  let quoteIdx = 0;
      const charCount = enableB ? 2 : 1;
      const timeline = seq.map((clipId)=>{
            let dialogue = null;
            if(clipId === 'phone'){
                    dialogue = { speakerIdx:0, text: quoted[quoteIdx] ? quoted[quoteIdx++] : "Hey! What's up?" };
            } else if(clipId === 'talk'){
                    dialogue = { speakerIdx:0, text: quoted[quoteIdx] ? quoted[quoteIdx++] : 'Hey, good to see you!' };
            }
            // Interactive clips (fight/argue/hug/highfive/dance) read best with BOTH characters performing
                                   // the same clip together, rather than character 1 defaulting to idle.
                                   const pairSame = charCount === 2 && INTERACTIVE_CLIPS[clipId];
            const actions = charCount === 2 ? { 0: clipId, 1: pairSame ? clipId : 'idle' } : { 0: clipId };
            return { duration: Math.round(perSeg*10)/10, actions: actions, dialogue: dialogue };
      });

  return {
        background: bg, weather: weather, furniture: furniture, food: food, bodyType: bodyType, charCount: charCount, timeline: timeline,
        animals: animals,
        vehicles: vehicles,
        summary: { actions: seq, totalDuration: Math.round(total*10)/10 }
  };
  }

const state = {
    playing: true,
    speed: 1,
    scene: {
          background: 'white',
          weather: 'none',
          customBgImage: null,
          customElements: [],
          furniture: 'chair',
          food: 'sandwich',
          animals: [],
          vehicles: [],
          style: 'bold',
          characters: [
                  makeCharacter(Object.assign({}, DEFAULT_CHARACTER_PALETTE[0])),
                  makeCharacter(Object.assign({}, DEFAULT_CHARACTER_PALETTE[1]))
                ],
          timeline: []
    }
};
state.scene.timeline = resolveIndexedTimeline(PRESETS.talk.timeline, PRESETS.talk.charCount);


// Spread N characters evenly across the stage, left half facing right and right half facing left
// (so groups naturally face "inward" toward each other), shrinking spacing as the group grows.
function computePositions(n){
    if(n <= 1) return [{ x: 400, faceDir: 1 }];
    const spacing = Math.min(180, 620 / (n - 1));
    const startX = 400 - (spacing * (n - 1)) / 2;
    const positions = [];
    for(let i=0;i<n;i++){
          positions.push({ x: startX + spacing*i, faceDir: i < Math.ceil(n/2) ? 1 : -1 });
    }
    return positions;
}

// Animals are spread out lower-priority than characters — smaller stage footprint, no facing-inward
// logic needed since they're decorative rather than conversational.
function computeAnimalPositions(n){
    if(n <= 0) return [];
    const spacing = Math.min(120, 500 / Math.max(1, n));
    const startX = 400 - (spacing * (n - 1)) / 2;
    const positions = [];
    for(let i=0;i<n;i++){ positions.push({ x: startX + spacing*i, faceDir: i % 2 === 0 ? 1 : -1 }); }
    return positions;
}

// Vehicles get even wider spacing than animals since their sprites are bigger (car/bus width).
function computeVehiclePositions(n){
    if(n <= 0) return [];
    const spacing = Math.min(170, 620 / Math.max(1, n));
    const startX = 400 - (spacing * (n - 1)) / 2;
    const positions = [];
    for(let i=0;i<n;i++){ positions.push({ x: startX + spacing*i, faceDir: i % 2 === 0 ? 1 : -1 }); }
    return positions;
}

// Walks the whole timeline once (independent of playback time) to figure out each character's x
// position at the START of every segment: movement clips (walk/run/skateboard) push them forward by
// duration*speed in whichever direction they're already facing, every other clip leaves them in place.
// This is what makes movement continue across consecutive walk/run segments instead of snapping back
// to the static layout position each segment, while non-movement segments (talk, sit, etc.) just hold
// the position they already reached.
function computeSegmentStartPositions(scene, timeline, homePositions){
    const runningX = scene.characters.map((c,i)=> homePositions[i].x);
    return timeline.map(seg=>{
          const startX = runningX.slice();
          scene.characters.forEach((c,i)=>{
                  const clipId = (seg.actions && seg.actions[c.id]) || 'idle';
                  // A dragged end position (js/ui.js: drag a character on the canvas to pin where they land by the
                                         // end of this segment) takes priority over everything else, including for non-movement clips like
                                         // idle/talk — it's a direct position override, not just another kind of "movement".
                                         const dragTarget = seg.dragTargets && seg.dragTargets[c.id];
                  if(dragTarget){
                            runningX[i] = clamp(dragTarget.x, 60, W-60);
                  } else if(isMoveClip(clipId)){
                            // A flying character in a climb/descend segment (direction 'up'/'down') travels vertically
                    // instead of horizontally this segment — see computeSegmentStartAltitudes for the altitude side.
                    const vdir = isFlyClip(clipId) ? resolveVerticalDir(seg, c.id) : 0;
                            if(vdir === 0){
                                        const dir = resolveFaceDir(seg, c.id, homePositions[i].faceDir);
                                        const dist = MOVE_SPEEDS[clipId] * Math.max(0.1, seg.duration);
                                        runningX[i] = clamp(runningX[i] + dist*dir, 60, W-60);
                            }
                  } else if(clipId === 'customPose'){
                            // Hand-designed moves (js/ui.js Pose Designer) carry their own moveSpeed/moveDir instead of
                            // living in MOVE_SPEEDS — read from seg.customPoses[charId] (js/poses.js's evalKeyframePose
                            // consumes the same object for the actual per-frame pose, wired up in evaluateScene below).
                            const cp = seg.customPoses && seg.customPoses[c.id];
                            if(cp && cp.moveSpeed){
                                        const dir = resolveFaceDir(seg, c.id, homePositions[i].faceDir) * (cp.moveDir || 1);
                                        const dist = cp.moveSpeed * Math.max(0.1, seg.duration);
                                        runningX[i] = clamp(runningX[i] + dist*dir, 60, W-60);
                            }
                  }
          });
          return startX;
    });
}


// Parallels computeSegmentStartPositions but for altitude (vertical offset above ground, in px) —
// only flyplane/flyhelicopter clips ever change it, via an explicit 'up'/'down' direction override.
// Every other clip (including flying horizontally with direction auto/left/right) holds altitude flat,
// so a plane can cruise at a chosen height across several segments without drifting back to the ground.
function computeSegmentStartAltitudes(scene, timeline){
    const running = scene.characters.map(()=> 0);
    return timeline.map(seg=>{
          const startAlt = running.slice();
          scene.characters.forEach((c,i)=>{
                  const clipId = (seg.actions && seg.actions[c.id]) || 'idle';
                  if(isFlyClip(clipId)){
                            const vdir = resolveVerticalDir(seg, c.id);
                            if(vdir !== 0){
                                        const dAlt = VERTICAL_SPEEDS[clipId] * Math.max(0.1, seg.duration) * vdir;
                                        running[i] = clamp(running[i] + dAlt, 0, MAX_ALTITUDE);
                            }
                  } else if(clipId === 'customPose'){
                            const cp = seg.customPoses && seg.customPoses[c.id];
                            if(cp && cp.vertSpeed){
                                        const dAlt = cp.vertSpeed * Math.max(0.1, seg.duration) * (cp.vertDir || 1);
                                        running[i] = clamp(running[i] + dAlt, 0, MAX_ALTITUDE);
                            }
                  }
          });
          return startAlt;
    });
}

function evaluateScene(scene, t){
    const timeline = scene.timeline.length ? scene.timeline : [makeSegment(1, {}, null)];
    const total = timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0);
    const tt = ((t % total) + total) % total;
    let acc = 0, active = timeline[0], activeIdx = 0, localT = 0;
    for(let i=0;i<timeline.length;i++){
          const seg = timeline[i];
          const d = Math.max(0.1, seg.duration);
          if(tt < acc + d){ active = seg; activeIdx = i; localT = tt - acc; break; }
          acc += d;
    }
    const positions = computePositions(scene.characters.length);
    const segStartPositions = computeSegmentStartPositions(scene, timeline, positions);
    const activeStartX = segStartPositions[activeIdx];
    const segStartAltitudes = computeSegmentStartAltitudes(scene, timeline);
    const activeStartAlt = segStartAltitudes[activeIdx];

  const characters = scene.characters.map((appearance, i)=>{
        const clipId = (active.actions && active.actions[appearance.id]) || 'idle';
        const speaking = clipId === 'talk' && active.dialogue && active.dialogue.speakerId === appearance.id;
        const preset = applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build); // must be active before the pose is computed (arm IK reads current geometry)
                                              // A hand-designed move (js/ui.js Pose Designer) isn't in CLIPS — it's a saved keyframe
                                              // list in active.customPoses[charId], interpolated by js/poses.js's evalKeyframePose (the same
                                              // function the Designer's own in-modal preview uses), so a saved custom move actually plays back
                                              // here instead of silently falling through to idle.
                                              const customPose = clipId === 'customPose' ? (active.customPoses && active.customPoses[appearance.id]) : null;
                                              const pose = customPose ? evalKeyframePose(localT, customPose.keyframes) : (CLIPS[clipId]||CLIPS.idle).pose(localT, { speaking: speaking, phase: i*Math.PI });
        pose.bounceY *= preset.scale * (appearance.sizeScale || 1); // keep jump/idle/sit bounce proportional to body size
                                              const faceDir = resolveFaceDir(active, appearance.id, positions[i].faceDir);
        // Flying characters climbing/descending this segment (vdir!=0) hold x still and travel on the
                                              // y-axis instead — see computeSegmentStartAltitudes. Otherwise altitude just holds whatever was
                                              // reached previously (so cruising horizontally at height, or idling mid-air, keeps that height).
                                              const vdir = isFlyClip(clipId) ? resolveVerticalDir(active, appearance.id) : 0;
        // A dragged end position (js/ui.js) wins over both the direction-based movement and the fly
                                              // climb/descend logic below — the character eases from wherever they started this segment straight
                                              // toward the dragged point, linearly over the segment's duration, however long that takes.
                                              const dragTarget = active.dragTargets && active.dragTargets[appearance.id];
        let x, altitude;
        if(dragTarget){
                const dragFrac = Math.min(1, localT / Math.max(0.1, active.duration));
                const targetX = clamp(dragTarget.x, 60, W-60);
                x = activeStartX[i] + (targetX - activeStartX[i]) * dragFrac;
                altitude = activeStartAlt[i];
        } else if(vdir !== 0){
                x = clamp(activeStartX[i], 60, W-60);
                altitude = clamp(activeStartAlt[i] + VERTICAL_SPEEDS[clipId]*localT*vdir, 0, MAX_ALTITUDE);
        } else {
                // customPose's own moveSpeed/moveDir/vertSpeed/vertDir (set via the Pose Designer's forward/
                // backward + up/down controls) drive travel the same way MOVE_SPEEDS/VERTICAL_SPEEDS do for
                // built-in clips like walk/run/flyplane.
                const travelled = isMoveClip(clipId) ? MOVE_SPEEDS[clipId]*localT*faceDir
                                    : (customPose && customPose.moveSpeed) ? customPose.moveSpeed*localT*faceDir*(customPose.moveDir||1) : 0;
                const vertTravelled = (customPose && customPose.vertSpeed) ? customPose.vertSpeed*localT*(customPose.vertDir||1) : 0;
                x = clamp(activeStartX[i] + travelled, 60, W-60);
                altitude = clamp(activeStartAlt[i] + vertTravelled, 0, MAX_ALTITUDE);
        }
        pose.altitude = altitude; // read by computeSkeleton (js/render.js) to lift the whole skeleton
                                              return { id: appearance.id, x: x, faceDir: faceDir, appearance: appearance, clipId: clipId, pose: pose };
  });

  // ---------- Hug from behind: real cross-character IK contact (second pass) ----------
  // Every pose above is computed fully independently per character (see poseFight's NOTE on why) — this
  // is the one deliberate exception. A character whose action is 'hugbehind' needs to know exactly where
  // ANOTHER character's torso actually ended up this frame so their arms can reach around and wrap it for
  // real, which only works once every character's own x/faceDir/pose is already resolved above — hence a
  // second pass rather than folding it into the first. Reuses armReachAngles (js/poses.js) — the same
  // 2-bone IK the Pose Designer's drag-to-pose handles and the reach-for-a-coffee-cup poses already use —
  // just aimed at a moving target's torso instead of a mouse position or a fixed offset from the head.
  const HUG_BEHIND_GAP = 26; // px between the hugger's anchor and the huggee's back
  characters.forEach(c=>{
        if(c.clipId !== 'hugbehind') return;
        const target = characters.find(o=> o.id !== c.id);
        if(!target) return; // nobody else in the scene — keep the standalone fallback pose as-is
        // Stand directly behind the target, facing the same way they are, close enough for arms to reach.
        c.faceDir = target.faceDir;
        c.x = clamp(target.x - target.faceDir*HUG_BEHIND_GAP, 60, W-60);
        // Hip/shoulder anchors come from x/faceDir/torsoLean/headTilt/bounceY, not from arm angles, so
        // re-deriving the hugger's skeleton at the corrected position is safe — only the arm fields below
        // get overwritten afterward.
        const huggerSkel = computeSkeleton(c.x, c.faceDir, c.appearance, c.pose);
        const targetSkel = computeSkeleton(target.x, target.faceDir, target.appearance, target.pose);
        const wrapPoint = { x: (targetSkel.hip.x + targetSkel.shoulder.x)/2, y: (targetSkel.hip.y + targetSkel.shoulder.y)/2 };
        const localDx = (wrapPoint.x - huggerSkel.shoulder.x) * c.faceDir;
        const localDy = wrapPoint.y - huggerSkel.shoulder.y;
        const reach = armReachAngles(localDx, localDy);
        c.pose.leftShoulderAngle = reach.shoulderAngle; c.pose.leftElbowBend = reach.elbowBend;
        c.pose.rightShoulderAngle = reach.shoulderAngle; c.pose.rightElbowBend = reach.elbowBend;
        c.pose.torsoLean = (c.pose.torsoLean||0) + 0.12; // lean into the hug slightly
  });

  const animalPositions = computeAnimalPositions((scene.animals || []).length);
    const animals = (scene.animals || []).map((a, i)=> ({ id: a.id, type: a.type, x: animalPositions[i].x, faceDir: animalPositions[i].faceDir, sizeScale: a.sizeScale || 1 }));

  const vehiclePositions = computeVehiclePositions((scene.vehicles || []).length);
    const vehicles = (scene.vehicles || []).map((v, i)=> ({ id: v.id, type: v.type, x: vehiclePositions[i].x, faceDir: vehiclePositions[i].faceDir, sizeScale: v.sizeScale || 1 }));

  // Driver POV camera (task #25): only meaningful if the segment has it toggled on AND at least one
  // character is actually in a ride/drive clip this frame — first such character found becomes "the
  // driver" whose seat we're viewing from. speed feeds the scrolling-road animation.
  // Fly-kind rides are excluded from POV: the driver-POV cockpit (road/windshield/mirror) is built for
  // ground vehicles and would look wrong with a plane/helicopter in open sky.
  const povChar = active.povCamera ? characters.find(c=> RIDE_VEHICLES[c.clipId] && RIDE_VEHICLES[c.clipId].kind !== 'fly') : null;
    const povDriver = povChar ? { speed: MOVE_SPEEDS[povChar.clipId] || 0, faceDir: povChar.faceDir, clipId: povChar.clipId } : null;

  // Custom user-uploaded images/characters (js/customElements.js): each has a fixed "home" transform
  // (x/y/scale/rotation, set in the Your Own Images panel) and an optional per-segment animation preset
  // (seg.elementAnims[el.id]) — same per-segment-override pattern as a character's action. The preset's
  // offset/scale/rotation/opacity is computed from this segment's local elapsed time and layered on top
  // of the home transform, exactly like CLIPS[clipId].pose(localT,...) drives a stickman's pose above.
  const customElements = (scene.customElements || []).map(el=>{
        const presetId = (active.elementAnims && active.elementAnims[el.id]) || 'none';
        const anim = evalCustomElementAnim(presetId, localT);
        return {
                id: el.id,
                img: el.img,
                x: el.x + anim.offsetX,
                y: el.y + anim.offsetY,
                scale: (el.scale || 1) * anim.scaleMul,
                rotation: (el.rotation || 0) + anim.rotationDeg,
                opacity: anim.opacity
        };
  });

  return { characters: characters, animals: animals, vehicles: vehicles, customElements: customElements, dialogue: active.dialogue, background: active.background || scene.background, weather: active.weather || scene.weather || 'none', furniture: scene.furniture || 'chair', food: scene.food || 'sandwich', style: scene.style || 'bold', localT: localT, totalDuration: total, povDriver: povDriver, activeSegmentId: active.id };
}

function renderFrame(frame){
    if(frame.povDriver){
          // First-person cockpit view replaces the whole normal scene render for this frame — no side-view
      // stickman/background to draw, just the windshield/road/mirror (weather still overlays on top so
      // rain/snow reads as falling in front of the windshield).
      drawDriverPOV(frame.localT, frame.povDriver.speed, frame.povDriver.faceDir, frame.weather);
          drawWeatherOverlay(frame.weather, frame.localT);
          return;
    }
    drawBackground(frame.background);
    drawWeatherOverlay(frame.weather, frame.localT);
    frame.vehicles.forEach(v=> drawVehicleProp(v.x, v.faceDir, v.type, frame.localT, v.sizeScale));
    frame.animals.forEach(a=> drawAnimalProp(a.x, a.faceDir, a.type, frame.localT, a.sizeScale));
    frame.characters.forEach(c=>{
          if(SEATED_CLIPS[c.clipId]){
                  if(frame.furniture === 'sofa') drawSofaProp(c.x, GROUND_Y); else drawChairProp(c.x, GROUND_Y);
          }
          const rv = RIDE_VEHICLES[c.clipId];
          if(rv){
                  if(rv.kind === 'car') drawRideCarProp(c.x, c.faceDir, frame.localT, 1, rv.variant);
                  else if(rv.kind === 'fly') drawRideFlyProp(c.x, c.faceDir, frame.localT, rv.type, c.pose.altitude || 0);
                  else drawVehicleProp(c.x, c.faceDir, rv.type, frame.localT, rv.scale);
          }
    });
    const activeStyle = STYLES[frame.style] || STYLES.bold;
    const handsById = {};
    frame.characters.forEach(c=>{
          const res = activeStyle.drawStickman(c.x, c.faceDir, c.appearance, c.pose);
          handsById[c.id] = res;
    });
    frame.characters.forEach(c=>{
          if(c.clipId === 'kite'){
                  const anchor = { x: c.x + 220*c.faceDir, y: 90 };
                  drawKiteProp(handsById[c.id].leftHand, frame.localT, anchor);
          }
          if(c.clipId === 'drink') drawCoffeeCupProp(handsById[c.id].rightHand);
          if(c.clipId === 'phone') drawPhoneProp(handsById[c.id].rightHand);
          if(c.clipId === 'eat') drawFoodProp(handsById[c.id].rightHand, frame.food);
          if(c.clipId === 'read') drawBookProp(handsById[c.id].leftHand, handsById[c.id].rightHand);
          if(c.clipId === 'sleep') drawSleepZzz(handsById[c.id].head, frame.localT);
          if(c.clipId === 'guitar') drawGuitarProp(handsById[c.id].leftHand, handsById[c.id].rightHand);
          if(c.clipId === 'umbrella') drawUmbrellaProp(handsById[c.id].rightHand, frame.localT);
          if(c.clipId === 'skateboard') drawSkateboardProp(c.x, GROUND_Y, c.faceDir, frame.localT);
          if(c.clipId === 'laptop') drawLaptopProp(handsById[c.id].leftHand, handsById[c.id].rightHand);
          if(c.clipId === 'camera') drawCameraProp(handsById[c.id].leftHand, handsById[c.id].rightHand);
          if(c.clipId === 'shoot' && (c.appearance.accessory === 'pistol' || c.appearance.accessory === 'ak47')){
            const opp = frame.characters.find(o=> o.id !== c.id && Math.sign(o.x - c.x) === c.faceDir && Math.abs(o.x - c.x) < 260);
            drawGunFireEffect(handsById[c.id].rightHand, c.faceDir, frame.localT, c.appearance.accessory === 'ak47', opp ? opp.x : null);
          }
          if(c.clipId === 'slash' && (c.appearance.accessory === 'sword' || c.appearance.accessory === 'katana')){
            const opp = frame.characters.find(o=> o.id !== c.id && Math.sign(o.x - c.x) === c.faceDir && Math.abs(o.x - c.x) < 220);
            drawBloodEffect(handsById[c.id].rightHand, c.faceDir, frame.localT, opp ? { x: opp.x, y: handsById[c.id].rightHand.y } : null);
          }
    });
    (frame.customElements || []).forEach(el=> drawCustomElement(el));
    if(frame.dialogue){
          const res = handsById[frame.dialogue.speakerId];
          if(res){
                  const speaker = frame.characters.find(c=>c.id===frame.dialogue.speakerId);
                  drawSpeechBubble(res.head, frame.dialogue.text, speaker ? speaker.faceDir : 1);
          }
    }
}
