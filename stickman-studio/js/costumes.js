// ---------- costumes registry: profession presets bundling outfit color + accessory ----------
// A costume is just a shortcut that sets a character's outfit color and accessory in one click —
// both fields stay freely editable afterward (a costume isn't a persistent field on the character).
// To add a new profession: add one entry here, and if it needs a new accessory shape, add a
// draw function for it in render.js (see drawChefHat/drawPoliceCap/drawHeadband/drawStethoscope)
// keyed by the same accessory id used below.
const COSTUMES = {
  none:    { label: 'None (custom)', outfit: null,      accessory: null },
  doctor:  { label: 'Doctor',        outfit: '#e5e7eb',  accessory: 'doctor' },
  chef:    { label: 'Chef',          outfit: '#f8fafc',  accessory: 'chefhat' },
  police:  { label: 'Police',        outfit: '#1e3a8a',  accessory: 'police' },
  athlete: { label: 'Athlete',       outfit: '#16a34a',  accessory: 'headband' },
  student: { label: 'Student',       outfit: '#7c3aed',  accessory: 'bag' },
  teacher:     { label: 'Teacher',     outfit: '#92400e', accessory: 'glasses' },
  firefighter: { label: 'Firefighter', outfit: '#dc2626', accessory: 'hat' },
  scientist:   { label: 'Scientist',   outfit: '#f1f5f9', accessory: 'glasses' },
  artist:      { label: 'Artist',      outfit: '#0891b2', accessory: 'bag' },
  superhero: { label: 'Superhero', outfit: '#dc2626', accessory: 'cape' },
  astronaut: { label: 'Astronaut', outfit: '#f1f5f9', accessory: 'helmet' },
  pirate:    { label: 'Pirate',    outfit: '#78350f', accessory: 'headband' },
  wizard:    { label: 'Wizard',    outfit: '#6d28d9', accessory: 'wizardhat' },
  ninja:     { label: 'Ninja',     outfit: '#1f2937', accessory: 'mask' },
  knight:    { label: 'Knight',    outfit: '#64748b', accessory: 'helmet' },
  robot:     { label: 'Robot',     outfit: '#94a3b8', accessory: 'helmet' },
  clown:     { label: 'Clown',     outfit: '#e0453f', accessory: 'bowtie' },
  fairy:     { label: 'Fairy',     outfit: '#f0abfc', accessory: 'crown' },
  vampire:   { label: 'Vampire',   outfit: '#1f2937', accessory: 'cape' },

  // ---- generic "famous character type" archetypes: recognizable character roles/tropes, not any
  // specific real person or copyrighted character — reuses the existing accessory shapes above,
  // combined with a distinct outfit color, to add more variety to pick from.
  cowboy:      { label: 'Cowboy',       outfit: '#a16207', accessory: 'hat' },
  detective:   { label: 'Detective',    outfit: '#44403c', accessory: 'glasses' },
  secretAgent: { label: 'Secret Agent', outfit: '#111827', accessory: 'necktie' },
  rockstar:    { label: 'Rockstar',     outfit: '#18181b', accessory: 'earrings' },
  viking:      { label: 'Viking',       outfit: '#57534e', accessory: 'helmet' },
  samurai:     { label: 'Samurai',      outfit: '#7f1d1d', accessory: 'headband' },
  alien:       { label: 'Alien',        outfit: '#22c55e', accessory: 'helmet' },
  zombie:      { label: 'Zombie',       outfit: '#4b5563', accessory: 'scarf' },
  mermaid:     { label: 'Mermaid',      outfit: '#0e7490', accessory: 'crown' },
  magician:    { label: 'Magician',     outfit: '#312e81', accessory: 'bowtie' },
  explorer:    { label: 'Explorer',     outfit: '#a8a29e', accessory: 'hat' },
  rapper:      { label: 'Rapper',       outfit: '#eab308', accessory: 'wristwatch' }
};
const COSTUME_LIST = Object.keys(COSTUMES).map(id => ({ id, label: COSTUMES[id].label }));
