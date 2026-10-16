export const WORLD = { minX: -28, maxX: 28, minZ: -28, maxZ: 28 };
export const GROWTH = [
  { mass: 0, radius: .78 }, { mass: 35, radius: 1.02 },
  { mass: 105, radius: 1.28 }, { mass: 230, radius: 1.58 },
  { mass: 430, radius: 1.93 }, { mass: 740, radius: 2.3 },
];
export const BOSS_TIME = 600;
export const BULLET_TIME = { duration: 4, cooldown: 24, worldScale: .2 };
export const OPENING_TIME = 22;
export const ELITE_RECOVERY = 8;
export const ELITE_TIMES = [90, 270, 450];
export const ELITE_ROSTER = ['elite','eye','rootwarden','moth'];
export const SKILLS = {
  cannon: { name: 'Cannon', color: '#eab377', icon: 'cannon', sprite: 12, max: 8 },
  ice: { name: 'Frost', color: '#96dcef', icon: 'ice', sprite: 14, max: 6 },
  wind: { name: 'Tempest', color: '#86d7bb', icon: 'wind', sprite: 13, max: 6 },
  lightning: { name: 'Lightning', color: '#c8a246', icon: 'bolt', atlas: 'arsenal', sprite: 0, max: 5 },
  ember: { name: 'Ember', color: '#d77b48', icon: 'flame', atlas: 'arsenal', sprite: 4, max: 5 },
  summon: {name:'Summoning workshop',typeLabel:'Summoning skill',color:'#75b690',icon:'shield',atlas:'allies',sprite:8,max:5},
  roots: {name:'Briar gardens',typeLabel:'Ground skill',color:'#a4a85d',icon:'leaf',atlas:'allies',sprite:12,max:5},
};
export const BUFF_ART = {
  power: { atlas: 'characters', sprite: 15 }, haste: { atlas: 'props', sprite: 14 },
  speed: { atlas: 'characters', sprite: 13 }, health: { atlas: 'props', sprite: 12 },
  heal: { atlas: 'props', sprite: 12 },
};
export const CANNON_RANKS = [
  null,
  { title: 'Iron shot', detail: 'A heavy shell every second.', damage: 22, interval: 1.05, shots: 1, burst: 1, pierce: 0, splash: 0, range: 11 },
  { title: 'Twin barrels', detail: 'Two shells per volley. Double the impact.', damage: 22, interval: .95, shots: 2, burst: 1, pierce: 0, splash: 0, range: 12 },
  { title: 'Triple burst', detail: 'Three rapid twin volleys. Six shots in a burst.', damage: 21, interval: 1.3, shots: 2, burst: 3, pierce: 0, splash: 0, range: 13 },
  { title: 'Armor piercing', detail: 'Shells pierce two enemies and leave a blazing trail.', damage: 27, interval: 1.2, shots: 2, burst: 3, pierce: 1, splash: 0, range: 14 },
  { title: 'High explosive', detail: 'Every shell detonates in a wide explosion.', damage: 33, interval: 1.15, shots: 2, burst: 3, pierce: 1, splash: 1.65, range: 14 },
  { title: 'Grand battery', detail: 'Three barrels. Nine explosive shells per burst.', damage: 36, interval: 1.12, shots: 3, burst: 3, pierce: 1, splash: 1.9, range: 15 },
  { title: 'Ricochet storm', detail: 'Shells seek a second target after impact.', damage: 41, interval: 1.05, shots: 3, burst: 3, pierce: 1, splash: 2, range: 15 },
  { title: 'Citadel annihilator', detail: 'A piercing arcane lance joins your cannon barrage.', damage: 47, interval: .95, shots: 3, burst: 3, pierce: 2, splash: 2.3, range: 16 },
];
export const ICE_RANKS = [
  null, { title: 'Ice lance', detail: 'A piercing ice bolt slows the enemy.' },
  { title: 'Forked frost', detail: 'Three ice lances fan out through the crowd.' },
  { title: 'Deep freeze', detail: 'Repeated frost hits freeze enemies solid.' },
  { title: 'Shatter chain', detail: 'Frozen enemies explode into damaging shards.' },
  { title: 'Winter crown', detail: 'A freezing nova erupts around your city.' },
  { title: 'Absolute winter', detail: 'Large frost novas and five piercing ice lances.' },
];
export const WIND_RANKS = [
  null, { title: 'Gathering wind', detail: 'Pulls food inward and strikes nearby enemies.' },
  { title: 'Orbiting blades', detail: 'Two wind blades orbit the city and cut enemies.' },
  { title: 'Vortex field', detail: 'A moving vortex pulls and damages enemies.' },
  { title: 'Storm shield', detail: 'Wind pulses erase nearby hostile projectiles.' },
  { title: 'Eye of the storm', detail: 'Four orbiting blades and a much wider vortex.' },
  { title: 'Living hurricane', detail: 'A fierce hurricane tears through crowds and projectiles.' },
];
export const EVOLUTIONS = {
  vortex: { name: 'Tempest battery', description: 'Explosions pull enemies together. Wind feeds your artillery.', pair: ['cannon', 'wind'], color: '#99d9bb', sprite: 1 },
  shatter: { name: 'Glacier arsenal', description: 'Cannon hits freeze targets. Frozen kills trigger chain explosions.', pair: ['cannon', 'ice'], color: '#a1ddf5', sprite: 2 },
  blizzard: { name: 'Winter maelstrom', description: 'Wind carries ice shards. The freezing field devours enemy volleys.', pair: ['ice', 'wind'], color: '#b5a9e5', sprite: 3 },
  thunderheart: { name: 'Thunderheart citadel', description: 'Lightning leaps to two extra enemies. Charged cannon volleys light up the battlefield.', pair: ['cannon', 'lightning'], color: '#d9b963', atlas: 'arsenal', sprite: 8 },
  sunforge: { name: 'Sunforge city', description: 'Wider fire fields and frequent fire tornadoes. Turn the battlefield into a golden furnace.', pair: ['ember', 'wind'], color: '#e29959', atlas: 'arsenal', sprite: 11 },
};

export const LIGHTNING_RANKS = [
  null,
  {title:'Spark relay',detail:'Lightning jumps between two enemies.',damage:19,chains:2,interval:1.8},
  {title:'Forked current',detail:'Four linked targets in every lightning strike.',damage:25,chains:4,interval:1.65},
  {title:'Storm satellites',detail:'Two electric orbs orbit the city and zap nearby foes.',damage:30,chains:4,interval:1.5},
  {title:'Overload',detail:'Lightning electrifies enemies, making them take 20% more damage.',damage:37,chains:5,interval:1.4},
  {title:'Thunder crown',detail:'Six-target chain lightning and a colossal thunderstrike.',damage:46,chains:6,interval:1.2},
];
export const EMBER_RANKS = [
  null,
  {title:'Fire seed',detail:'Lobs a blazing fireball that explodes on landing.',damage:40,shots:1,interval:2.1,radius:1.5},
  {title:'Twin comets',detail:'Two arcing fireballs rain onto nearby enemies.',damage:47,shots:2,interval:2,radius:1.7},
  {title:'Molten ground',detail:'Explosions leave burning pools that keep dealing damage.',damage:56,shots:2,interval:1.95,radius:1.9},
  {title:'Cluster burst',detail:'Fireballs scatter smaller explosions around their impact.',damage:66,shots:2,interval:1.85,radius:2},
  {title:'Phoenix rain',detail:'Three phoenix comets sweep down and ignite broad fire fields.',damage:84,shots:3,interval:1.75,radius:2.3},
];
export const SUMMON_RANKS=[null,
  {title:'Acorn companions',detail:'Two guardians chase enemies and strike in melee. Fallen guardians return after 6 seconds.',count:2,damage:29,interval:1.05},
  {title:'Shield patrol',detail:'Three guardians intercept enemy shots and cleave nearby enemies.',count:3,damage:35,interval:1},
  {title:'Tree sentinels',detail:'Guardians grow into broad-bladed sentinels with wider melee attacks.',count:3,damage:48,interval:.9},
  {title:'Marching grove',detail:'Four sentinels flank the enemy. Swallowing supplies rallies the entire legion.',count:4,damage:60,interval:.84},
  {title:'Ancient vanguard',detail:'Five heavy guardians charge and cleave. Rally doubles their attack cadence.',count:5,damage:74,interval:.8},
];
export const ROOT_RANKS=[null,
  {title:'Seed trail',detail:'Plant gardens along your path. Roots strike enemies entering them.',radius:2.2,damage:48,interval:2.1,life:6},
  {title:'Snaring brambles',detail:'Wider gardens slow enemies. Lead pursuers through your planted path.',radius:2.6,damage:65,interval:1.9,life:6.5},
  {title:'Blooming ambush',detail:'Roots erupt twice and briefly hold ordinary enemies in place.',radius:2.9,damage:83,interval:1.7,life:7},
  {title:'Interwoven grove',detail:'Keep up to six gardens. Their overlapping blooms cover a broad escape route.',radius:3.2,damage:105,interval:1.5,life:8},
  {title:'Worldroot awakening',detail:'Huge root gardens erupt repeatedly. Bullet time wakes every planted garden at once.',radius:3.6,damage:132,interval:1.35,life:8},
];
export const WEAPON_RANKS={cannon:CANNON_RANKS,ice:ICE_RANKS,wind:WIND_RANKS,lightning:LIGHTNING_RANKS,ember:EMBER_RANKS,summon:SUMMON_RANKS,roots:ROOT_RANKS};
export const COMBOS = {
  siegeLegion:{name:'Marching artillery',description:'Five swallowed combat remains store a turret deployment. On contact, deploy a temporary cannon, up to two. Hold the ground it covers.',needs:{cannon:2,summon:2},color:'#c1a66e',atlas:'tactics',sprite:5},
  emberLegion:{name:'Firewing legion',description:'Rallied guardians breathe a wide flame cone instead of swinging their blades. Drones inherit the flame attack.',needs:{summon:2,ember:2},color:'#df9b55',atlas:'tactics',sprite:3},
  seedCyclone:{name:'Seed cyclone',description:'Wind pulses gather enemies into your nearest occupied garden. Thorn mines can turn the gathering into a chain explosion.',needs:{wind:2,roots:2},color:'#79bfa4',atlas:'tactics',sprite:6},
  plasmaArc:{name:'Plasma cascade',description:'Lightning detonates burning targets in amber plasma bursts. Each target can burst once every 1.4 seconds.',needs:{lightning:2,ember:2},color:'#d4aa64',atlas:'tactics',sprite:15},
  salvageVortex:{name:'Salvage vortex',description:'Every third cannon volley creates a wind funnel that draws wreckage toward your mouth.',needs:{cannon:3,wind:2},color:'#6aaa9b',sprite:12},
  thunderBattery:{name:'Thunder battery',description:'Every third cannon burst conducts chain lightning.',needs:{cannon:3,lightning:2},color:'#d7b448',sprite:8},
  thermalShock:{name:'Thermal shock',description:'Fire meets frost in a wide, explosive steam burst.',needs:{ice:2,ember:2},color:'#83bdd0',sprite:9},
  stormConduit:{name:'Storm conductor',description:'Wind pulses carry lightning through nearby enemies.',needs:{wind:2,lightning:2},color:'#6dac96',sprite:15},
  firestorm:{name:'Fire tornado',description:'A moving fire tornado scorches everything around the city.',needs:{wind:3,ember:2},color:'#de994c',sprite:11},
  shatterCircuit:{name:'Prismatic discharge',description:'Lightning striking frozen enemies launches eight ice shards.',needs:{ice:3,lightning:2},color:'#7abfd3',sprite:10},
  meteorForge:{name:'Meteor foundry',description:'Every third cannon burst calls down an extra heavy meteor.',needs:{cannon:3,ember:3},color:'#d07a46',sprite:13},
  stormLegion:{name:'Storm legion',description:'Rallied guardians form electric links. Enemies crossing the formation take lightning damage.',needs:{summon:2,lightning:1},color:'#a6cba3',atlas:'allies',sprite:10},
  livingGrove:{name:'Living grove',description:'Guardians focus enemies caught in gardens. Root blooms rally nearby guardians.',needs:{summon:2,roots:2},color:'#83b175',atlas:'allies',sprite:15},
  frostGarden:{name:'Winter thicket',description:'Garden blooms apply frost and create shattering ice eruptions around rooted enemies.',needs:{roots:2,ice:2},color:'#8dcaca',atlas:'allies',sprite:14},
  wildfireGarden:{name:'Wildfire orchard',description:'Fire ignites gardens. Burning gardens erupt in broad flame blasts instead of ordinary roots.',needs:{roots:2,ember:2},color:'#dca45e',atlas:'allies',sprite:14},
  shatterBattery:{name:'Glacier battery',description:'Cannon hits on chilled enemies release a broad ice blast. A target can trigger it once per second.',needs:{cannon:2,ice:2},color:'#8bc6dd',sprite:10},
  blizzardWard:{name:'Blizzard mantle',description:'Wind pulses freeze nearby enemies and erase two hostile shots. Fight along the edge of the cold ring.',needs:{wind:2,ice:2},color:'#9ed7cb',sprite:10},
};
export const COMBO_TACTICS={
  siegeLegion:'Collect combat remains, build a firing position, then fight inside its coverage.',
  emberLegion:'Swallow to rally and bring your guardians close enough to sweep the crowd with fire.',
  seedCyclone:'Lay a retreat garden, then let wind gather pursuers into its roots or mines.',
  plasmaArc:'Keep enemies in fire until lightning detonates their burning front line.',
  salvageVortex:'Collect combat wreckage to sustain up to 40% faster attacks for 3 seconds.',
  thunderBattery:'Lightning marks targets. Cannon hits on marked targets deal double ward damage.',
  thermalShock:'Burn slowed enemies or chill burning enemies to break wards and interrupt a windup.',
  stormConduit:'Activate bullet time near enemies to discharge lightning and erase up to six nearby shots.',
  firestorm:'Stay near the crowd and pull enemies through your moving fire ring.',
  shatterCircuit:'Freeze the front line so lightning spreads shards through the pack.',
  meteorForge:'Lure enemies into the impact zone; frost helps keep fast enemies inside.',
  stormLegion:'Swallow supplies or activate bullet time to rally. Move the legion so enemies cross its links.',
  livingGrove:'Plant a retreat path and draw enemies into it; your guardians hunt the trapped targets.',
  frostGarden:'Kite through your gardens to freeze pursuers and shatter the packed front line.',
  wildfireGarden:'Keep enemies inside a garden until a fireball ignites it. Each bloom becomes an explosion.',
  shatterBattery:'Chill the front enemy, then let your cannon break the packed line in one ice blast.',
  blizzardWard:'Stay near enemies to catch them in the freezing pulse, then collect their wreckage between attacks.',
};
export const COMBO_ROLES={salvageVortex:'Salvage sustain',thunderBattery:'Ward breaker',thermalShock:'Interrupt burst',stormConduit:'Time counter',firestorm:'Close pressure',shatterCircuit:'Frozen chain',meteorForge:'Zone control',stormLegion:'Formation damage',livingGrove:'Summon ambush',frostGarden:'Root and shatter',wildfireGarden:'Garden detonation',shatterBattery:'Packed-line breaker',blizzardWard:'Close-range defense'};
Object.assign(COMBO_ROLES,{siegeLegion:'Mobile strongpoint',emberLegion:'Flame breath',seedCyclone:'Trap gathering',plasmaArc:'Burning chain burst'});
export function activeCombos(modules){return Object.keys(COMBOS).filter(id=>Object.entries(COMBOS[id].needs).every(([skill,rank])=>modules[skill]>=rank));}
export const ENEMIES = {
  beetle: { name: 'Copper scarab', description: 'Aimed shots. Keep moving across its aim.', sprite: 4, radius: .84, hp: 78, speed: 3.1, damage: 11, mass: 4, score: 35 },
  ram: { name: 'Iron tusk', description: 'Locks a charge lane. Dodge sideways before it rushes.', sprite: 5, radius: 1.18, hp: 185, speed: 2.5, damage: 20, mass: 7, score: 65 },
  mortar: { name: 'Siege walker', description: 'Alternates fan shots and marked bombardment. Avoid the red ground after impact.', sprite: 6, radius: 1.32, hp: 205, speed: 1.55, damage: 13, mass: 9, score: 80 },
  mage: { name: 'Rune weaver', description: 'Expanding bullet rings. Find a gap instead of chasing.', sprite: 7, radius: .85, hp: 118, speed: 1.45, damage: 11, mass: 6, score: 65 },
  golem: { name: 'Rootbound colossus', description: 'Calls a blast under your core. Leave the marked circle.', sprite: 9, radius: 1.92, hp: 420, speed: 1.25, damage: 17, mass: 14, score: 130 },
  elite: { name: 'The gilded hunter', description: 'Warded elite. Alternates volleys and charges; drops an evolution core.', sprite: 8, radius: 2.65, hp: 1800, speed: 1.3, damage: 18, mass: 55, score: 650 },
  eye: { name: 'The clockwork oracle', description: 'Slow rings hide fast aimed shots. Save a dash for the overlap.', sprite: 11, radius: 2.6, hp: 2200, speed: 1.15, damage: 17, mass: 60, score: 800 },
  boss: { name: 'The hollow king', description: 'Three phases: fans, bombardment, spiral rings. Its final broken form can be swallowed.', atlas:'duels',sprite: 8, radius: 3.55, hp: 90000, speed: .8, damage: 20, mass: 260, score: 4500 },
  herald: { name: 'Bell lantern keeper', description: 'Relays wards to nearby enemies. Defeat it to break all linked wards.', sprite: 7, radius: 1.08, hp: 240, speed: 1.7, damage: 12, mass: 10, score: 120 },
  rootwarden: {name:'Briar gardener',description:'Root walls, sweeping branches and expanding shockwaves. Cross the gaps, then punish its recovery.',atlas:'duels',sprite:0,radius:2.7,hp:6000,speed:1.35,damage:19,mass:60,score:800},
  moth: {name:'Bellwing matriarch',description:'Alternates wing sweeps, petal traps and a locked dive. Move sideways when it marks a lane.',atlas:'duels',sprite:4,radius:2.5,hp:6000,speed:1.7,damage:18,mass:60,score:800},
};
export const PROP_DEFS = {
  crate: { sprite: 8, radius: .29, mass: 2 }, barrel: { sprite: 9, radius: .38, mass: 3 },
  ore: { sprite: 10, radius: .48, mass: 4 }, tree: { sprite: 2, radius: .63, mass: 5 },
  shrub: { sprite: 1, radius: .43, mass: 3 }, oak: { sprite: 3, radius: 1.15, mass: 7 },
  flowers: { sprite: 0, radius: .23, mass: 1 },
  house: { sprite: 4, radius: 1.1, mass: 10 }, tower: { sprite: 6, radius: 1.5, mass: 15 },
  ruin: { sprite: 7, radius: 1.8, mass: 20 }, cart: { sprite: 15, radius: .7, mass: 15 },
  forge: { sprite: 13, radius: .62, mass: 3, buff: 'power' },
  clock: { sprite: 14, radius: .63, mass: 3, buff: 'haste' },
  heal: { sprite: 12, radius: .55, mass: 1, healing: 30 },
  medkit: { sprite: 11, radius: .24, mass: 0, healing: 14 },
};

export function encounterPace(time, cycleStart=OPENING_TIME) {
  if (time >= BOSS_TIME) return { rest: false, remaining: 0, interval: 4.5, count: 2, cap: 7 };
  if (time < cycleStart) return { rest: true, remaining: cycleStart-time, interval: 3, count: 2, cap: 10 };
  const cycle = (time - cycleStart) % 48;
  return {
    rest: cycle >= 40, remaining: cycle >= 40 ? 48 - cycle : 40 - cycle,
    interval: time < 40 ? 3 : time < 90 ? 2.8 : time < 270 ? 2.4 : 2.1,
    count: time < 40 ? 2 : time < 90 ? 3 : time < 270 ? 4 : 5,
    cap: time < 40 ? 10 : time < 90 ? 14 : time < 270 ? 22 : 30,
  };
}

export function expeditionStage(time) {
  return time < OPENING_TIME ? 'Harvest awakening' : time < 90 ? 'Meadow patrol' : time < 270 ? 'Lantern crossfire' : time < 450 ? 'Rootguard siege' : time < BOSS_TIME ? 'The elder guard' : 'The hollow throne';
}

export function growthForMass(mass) {
  let index = GROWTH.findLastIndex(tier => mass >= tier.mass);
  index = Math.max(0, index);
  return { level: index + 1, ...GROWTH[index], next: GROWTH[index + 1]?.mass ?? null };
}
export function canSwallow(player, entity) {
  return player.radius >= entity.radius + .06 && !(entity.ward > 0) && !entity.anchored;
}
export function withinCombatView(player,entity,view){
  return Math.abs(entity.x-player.x)<=Math.max(4,view.halfWidth-.8)+entity.radius*.25&&Math.abs(entity.z-player.z)<=Math.max(4,view.halfHeight-.8)+entity.radius*.25;
}
export function attackCandidates(player, enemies, range, view) {
  // Being small enough to swallow does not make a distant enemy cease to be a threat.
  return enemies.filter(enemy => enemy.state === 'alive' && (!view||withinCombatView(player,enemy,view)) && Math.hypot(enemy.x - player.x, enemy.z - player.z) <= range + enemy.radius)
    .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
}
export function segmentHitsCircle(ax, az, bx, bz, cx, cz, radius) {
  const dx = bx - ax, dz = bz - az;
  const q = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / (dx * dx + dz * dz || 1)));
  return (ax + q * dx - cx) ** 2 + (az + q * dz - cz) ** 2 <= radius ** 2;
}
export function rankInfo(skill, rank) {
  return WEAPON_RANKS[skill][rank];
}
export function createRng(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
