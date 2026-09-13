// ---------- character model: appearance data + defaults (no rendering logic here) ----------
function makeCharacter(overrides){
  return Object.assign({
    id: charUid(), name: 'Stickman', outfit: '#1d4ed8', gender: 'male', skin: '#ffe0bd',
    hairStyle: 'short', hairColor: '#2b1b12', eyeStyle: 'dot', accessory: 'none', bodyType: 'adult',
    sizeScale: 1, emotion: 'neutral', build: 'average'
  }, overrides || {});
}
const DEFAULT_CHARACTER_PALETTE = [
  { name:'Alex', outfit:'#1d4ed8', gender:'male', hairStyle:'short', hairColor:'#2b1b12' },
  { name:'Sam', outfit:'#db2777', gender:'female', hairStyle:'long', hairColor:'#3a2317' },
  { name:'Jordan', outfit:'#16a34a', gender:'male', hairStyle:'mohawk', hairColor:'#111827' },
  { name:'Riley', outfit:'#f59e0b', gender:'female', hairStyle:'ponytail', hairColor:'#5c3a21' },
  { name:'Casey', outfit:'#7c3aed', gender:'male', hairStyle:'none', hairColor:'#000000' },
  { name:'Morgan', outfit:'#e11d48', gender:'female', hairStyle:'long', hairColor:'#111111' },
  { name:'Taylor', outfit:'#0891b2', gender:'male', hairStyle:'curly', hairColor:'#2b1b12' },
  { name:'Drew', outfit:'#a16207', gender:'female', hairStyle:'braids', hairColor:'#111827' }
];
function makeDefaultCharacter(index){
  return makeCharacter(DEFAULT_CHARACTER_PALETTE[index % DEFAULT_CHARACTER_PALETTE.length]);
}
