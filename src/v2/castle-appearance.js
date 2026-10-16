// Four structural rebuilds across six swallowing sizes. Weapon ranks are independent.
export const CASTLE_STAGES = [
  { level:1, name:'Wandering cottage', detail:'A small chassis with the first weapon mount.' },
  { level:2, name:'Armed homestead', detail:'Side decks and an upper floor make room for mixed weapons.' },
  { level:4, name:'Traveling keep', detail:'Reinforced wings and a lookout tower support heavier equipment.' },
  { level:6, name:'Roaming citadel', detail:'Layered bastions and a raised rear platform complete the fortress.' },
];
export const CASTLE_BASES = {harbor:0,furnace:4,frost:8};
export function castleStage(level=1) { return level>=6?3:level>=4?2:level>=2?1:0; }
export function castleFrame(route,level) { return (CASTLE_BASES[route]||0)+castleStage(level); }

// Normalized source-cell anchors measured on castle-growth-v65.png.
// Body rendering and combat hardpoints share these anchors, including camera depth.
export const CASTLE_LAYOUTS = Array.from({length:12},(_,index)=>{
  const family=Math.floor(index/4),stage=index%4;
  const y=[.925,.95,.94][family];
  const frontY=[.775,.82,.80][family];
  return {x:.50,y,radius:.23,core:[.50,y-.22],chimneys:[],
    frontRight:[.82,frontY],frontLeft:[.18,frontY],
    upperLeft:[.25,stage===0?frontY-.19:frontY-.25],
    upperRight:[.75,stage===0?frontY-.19:frontY-.25],
    crown:[.5,stage>=2?.29:.43]};
});

const WEAPON_BASES = {cannon:0,ice:3,wind:6,lightning:9,ember:12};
export function weaponAtlas(weapon){return weapon==='summon'||weapon==='roots'?'allies':'equipment';}
export function weaponGrade(weapon,rank=1,path=null) {
  if(weapon==='summon'||weapon==='roots')return rank>=4?2:rank>=2?1:0;
  if(weapon==='cannon')return rank>=6?2:rank>=4||path==='harbor_lance'?1:0;
  if(weapon==='ice')return rank>=5||path==='frost_lances'?2:rank>=2?1:0;
  if(weapon==='ember'&&['furnace_coals','furnace_eruption'].includes(path))return rank>=5?2:1;
  return rank>=5?2:rank>=3?1:0;
}
export function weaponFrame(weapon,rank,path) { return (weapon==='summon'?8:weapon==='roots'?12:WEAPON_BASES[weapon])+weaponGrade(weapon,rank,path); }
export function weaponMountCount(player,weapon) {
  const rank=player.modules[weapon]||0;
  if(!rank)return 0;
  if(weapon==='cannon')return rank>=6||player.path==='harbor_salvo'?3:rank>=2?2:1;
  return weapon==='ember'&&player.route==='furnace'&&player.path==='furnace_eruption'?2:1;
}
