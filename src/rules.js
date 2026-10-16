export const WORLD = { minX: -19, maxX: 19, minZ: -84, maxZ: 19 };
export const GROWTH = [
  { mass: 0, radius: 1.12 },
  { mass: 22, radius: 1.62 },
  { mass: 140, radius: 2.23 },
  { mass: 255, radius: 2.96 },
  { mass: 445, radius: 3.75 },
];

export const SKILLS = {
  cannon: { name: 'Cannon tower', tagline: 'Break the unbreakable', description: 'Automatically blasts large targets into edible fragments.', color: '#cf8456', icon: 'cannon', kind: 'cannonTower' },
  wind: { name: 'Windmill', tagline: 'Bring the feast closer', description: 'Pulls edible objects inward and damages nearby threats.', color: '#64a791', icon: 'wind', kind: 'windmill' },
  ice: { name: 'Frost spire', tagline: 'Catch what runs away', description: 'Freezes enemies and makes them take more damage.', color: '#78aeca', icon: 'ice', kind: 'iceTower' },
};

export const EVOLUTIONS = {
  vortex: { name: 'Tempest cannon', description: 'Explosive volleys shatter enemies. A powerful vortex gathers every fragment.', skills: ['cannon', 'wind'], icon: 'vortex', color: '#65ab99' },
  shatter: { name: 'Glacier mortar', description: 'Frozen targets shatter in a chain reaction. Heavy shells break the largest armor.', skills: ['cannon', 'ice'], icon: 'ice', color: '#85b5d8' },
  blizzard: { name: 'Winter maelstrom', description: 'A wide freezing vortex traps enemies and tears them into a feast.', skills: ['wind', 'ice'], icon: 'wind', color: '#9d9edb' },
};

export const ENEMIES = {
  beetle: { name: 'Ironback beetle', grade: 3, radius: 1.84, hp: 90, mass: 13, speed: 1.65, damage: 7 },
  ram: { name: 'Copper ram', grade: 3, radius: 1.9, hp: 125, mass: 17, speed: 1.8, damage: 11 },
  mortar: { name: 'Walking mortar', grade: 4, radius: 2.5, hp: 165, mass: 23, speed: .65, damage: 9 },
  boss: { name: 'The wandering keep', grade: 5, radius: 3.5, hp: 720, mass: 180, speed: .55, damage: 13 },
};

export function growthForMass(mass) {
  let index = 0;
  for (let i = 1; i < GROWTH.length; i++) if (mass >= GROWTH[i].mass) index = i;
  return { level: index + 1, radius: GROWTH[index].radius, floor: GROWTH[index].mass, next: GROWTH[index + 1]?.mass ?? null };
}

export function canSwallow(radius, targetRadius) {
  return radius >= targetRadius + 0.06;
}

export function evolutionFor(modules) {
  if (modules.cannon && modules.wind) return 'vortex';
  if (modules.cannon && modules.ice) return 'shatter';
  return 'blizzard';
}

export function rewardFor(entity) {
  return { mass: entity.mass || 0, core: entity.rewardCore || null, evolution: Boolean(entity.evolutionCore) };
}

export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
