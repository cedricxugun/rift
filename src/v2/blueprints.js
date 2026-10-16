import {CANNON_RANKS,SUMMON_RANKS,ROOT_RANKS,rankInfo} from './data.js';

export const BLUEPRINTS={
  fieldTurrets:{name:'Field artillery',description:'Stop briefly to deploy a cannon turret for 10 seconds. Keep up to two. Your ordinary cannon shots deal 25% less damage.',requires:'cannon',family:'cannon',sprite:12},
  scatterBattery:{name:'Breaching scatterguns',description:'Four extra pellets per ordinary cannon volley, each dealing 62% damage. Ordinary cannon range is halved. Fight close and knock enemies back.',requires:'cannon',family:'cannon',sprite:13},
  windWheel:{name:'Returning windwheel',description:'Every six swallowed supplies launch a giant returning windwheel. It cuts twice and sweeps wreckage toward your city.',requires:'wind',family:'wind',sprite:6},
  stormLance:{name:'Running thunderlance',description:'Moving stores up to three charges. Stop briefly to fire piercing lances along your last movement direction. Bullet time grants two charges.',requires:'lightning',family:'lightning',sprite:7},
  rootMines:{name:'Chain-burst seeds',description:'Gardens become single-use thorn mines with 2.6x damage. Nearby mines chain together. Bullet time detonates all armed mines.',requires:'roots',family:'roots',sprite:11},
  wingedHive:{name:'Drone hangar',description:'Replace guardians with twice as many swift flying drones, up to ten. Drones attack faster but deal 42% damage and cannot block bullets.',requires:'summon',family:'summon',sprite:4},
  cinderTrail:{name:'Blazing trail',description:'Moving leaves a damaging fire trail that ignites gardens. Each ordinary meteor volley launches one fewer fireball.',requires:'ember',family:'ember',sprite:9},
  mirrorWall:{name:'Crystal mirror walls',description:'Stop briefly to plant a five-second mirror wall. Each wall reflects four shots. Ordinary ice volleys fire one fewer lance.',requires:'ice',family:'ice',sprite:8},
};
for(const value of Object.values(BLUEPRINTS))Object.assign(value,{kind:'tactic',rarity:'rare',max:1,minLevel:2,minRank:2,blueprint:true,atlas:'tactics',icon:'gear'});
Object.entries({fieldTurrets:'Stop to place artillery, then circle inside its firing range.',scatterBattery:'Approach from the flank. Close shots scatter and push the front line.',windWheel:'Swallow six supplies, then steer the returning wheel through wreckage.',stormLance:'Move to charge. Face the enemy, stop briefly, and unleash thunder.',rootMines:'Plant a retreat path. Trigger a chain, or detonate with bullet time.',wingedHive:'Keep the drones near the fight. Swallow to rally the squadron.',cinderTrail:'Draw a fire path through the crowd, then circle back for wreckage.',mirrorWall:'Stop to place a mirror between you and the shooters. Ground attacks still pass.'}).forEach(([id,hint])=>BLUEPRINTS[id].hint=hint);
export const learnedBlueprint=(player,weapon)=>Object.keys(BLUEPRINTS).find(id=>player.perks?.[id]&&BLUEPRINTS[id].family===weapon);
export const blueprintCount=player=>Object.keys(BLUEPRINTS).filter(id=>player.perks[id]).length;

// Describe the form the player actually owns, including its retained base-rank effects.
export function blueprintRankPreview(player,weapon,rank){
  const base=rankInfo(weapon,rank),id=learnedBlueprint(player,weapon);
  if(!id||rank<2)return base;
  const info={...base,title:BLUEPRINTS[id].name,params:{}};
  if(id==='scatterBattery'){
    const n=CANNON_RANKS[rank];
    info.detail='{{shots}} short-range pellets per burst; {{damage}} base damage per pellet. Higher cannon effects are retained.';
    info.params={shots:(n.shots+4+(player.perks.frontShot||0))*n.burst,damage:+(n.damage*.62*Math.pow(.87,player.perks.frontShot||0)).toFixed(1)};
  }else if(id==='wingedHive'){
    const n=SUMMON_RANKS[rank];
    info.detail='{{count}} flying drones; {{damage}} base damage each, {{hp}} health. Rally accelerates attacks; drones cannot intercept shots.';
    info.params={count:Math.min(10,(n.count+(player.perks.brood||0))*2),damage:+(n.damage*.42).toFixed(1),hp:22+rank*5};
  }else if(id==='rootMines'){
    const n=ROOT_RANKS[rank];
    info.detail='Up to {{count}} single-use mines; {{damage}} base damage and {{radius}} blast radius. Nearby armed mines chain together.';
    info.params={count:rank>=4?6:4,damage:+(n.damage*2.6).toFixed(1),radius:n.radius};
  }else{
    info.title=base.title;
    info.extra=id==='fieldTurrets'?'Turret base damage {{damage}}; city cannon damage -25%.':id==='windWheel'?'Windwheel base damage {{damage}} on each leg.':id==='stormLance'?'Charged lance base damage {{damage}}, up to three lances.':id==='cinderTrail'?'Fire trail: {{damage}} base damage every 0.35 seconds; ordinary volley -1 fireball.':'Mirror reflection base damage {{damage}}; ordinary volley -1 ice lance.';
    info.params={damage:id==='fieldTurrets'?28+rank*7:id==='windWheel'?38+rank*15:id==='stormLance'?44+rank*16:id==='cinderTrail'?13+rank*6:28+rank*12};
  }
  return info;
}

export const PACKS={
  pincer:{name:'Pincer patrol',kinds:['ram','ram','beetle','beetle','beetle'],tip:'Charges approach from both flanks. Change direction before the lanes close.'},
  battery:{name:'Bombardment line',kinds:['mortar','beetle','mage','ram','beetle'],tip:'Break the ranged back line or lead its bombardment away from your supplies.'},
  relay:{name:'Lantern escort',kinds:['herald','beetle','golem','ram','beetle'],tip:'The lantern protects the formation. Break its ward relay first.'},
  swarm:{name:'Scarab harvest',kinds:['beetle','beetle','ram','beetle','beetle'],tip:'Thin the crowd, then collect its wreckage to fuel your next burst.'},
};
export function packAt(time,seed=0){const pool=['pincer','battery','swarm','relay'],id=pool[(Math.floor(Math.max(0,time-22)/24)+(seed>>>0)%3)%pool.length];return time<65&&id==='relay'?'battery':id;}
