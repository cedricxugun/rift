import {BLUEPRINTS,learnedBlueprint} from './blueprints.js';
import {canLearnWeapon} from './skill-graph.js';
export const RARITIES={
  common:{name:'Common',color:'#78947c',weight:9},
  uncommon:{name:'Uncommon',color:'#3caa68',weight:6},
  rare:{name:'Rare',color:'#4d91cc',weight:3},
  epic:{name:'Epic',color:'#9870cd',weight:1.6},
  legendary:{name:'Legendary',color:'#cf9c3b',weight:.55},
};
export const PERK_KINDS={stat:'Stat boost',barrage:'Barrage modifier',core:'Core ability',weapon:'Weapon upgrade',tactic:'Tactical modifier'};
export const QUALITY_MULTIPLIERS={common:1,uncommon:1.25,rare:1.5,epic:1.75};
export const STAT_LABELS={routeGain:'Swallow charge efficiency',power:'Damage bonus',haste:'Attack speed',maxHp:'Maximum integrity',critChance:'Critical chance',critMultiplier:'Critical damage',speed:'Movement speed',energyGain:'Skill energy gain',massGain:'Mouth growth',healPower:'Healing effectiveness',area:'Area size'};
export function formatStat(stat,value){return stat==='speed'||stat==='maxHp'?String(Number(value.toFixed(2))):Math.round((stat==='power'?value-1:value)*100)+'%';}
export function perkAmount(id,quality='common'){const amount=(PERKS[id].amount||0)*(QUALITY_MULTIPLIERS[quality]||1);return PERKS[id].stat==='maxHp'?Math.round(amount):amount;}
export const PERKS={
  ...BLUEPRINTS,
  brood:{name:'Brood banner',description:'Summon one additional guardian.',value:'+1',kind:'tactic',rarity:'rare',max:1,icon:'shield',requires:'summon',atlas:'allies',sprite:9},
  packTactics:{name:'Pack tactics',description:'Guardians move and attack 15% faster.',value:'+15%',kind:'stat',rarity:'uncommon',max:2,icon:'clock',requires:'summon'},
  deepRoots:{name:'Deep roots',description:'Gardens last 2 seconds longer.',value:'+2s',kind:'stat',rarity:'uncommon',max:2,icon:'leaf',requires:'roots'},
  germination:{name:'Hungry seeds',description:'Swallowing supplies speeds up the next garden and wakes nearby roots.',kind:'tactic',rarity:'rare',max:1,icon:'leaf',requires:'roots',atlas:'allies',sprite:14},
  siegeStance:{name:'Siege stance',description:'After standing still for 0.45 seconds, cannon damage increases by 40%. Moving ends the bonus.',kind:'tactic',rarity:'rare',max:1,icon:'cannon',requires:'cannon'},
  legionHeart:{name:'Legion heart',description:'During rally, one guardian becomes a giant captain with heavy sweeping strikes.',kind:'core',rarity:'epic',max:1,icon:'shield',requires:'summon',minLevel:4,atlas:'allies',sprite:6},
  nexusCapacitor:{name:'Nexus capacitor',description:'Swallowed resources grant 16% more home charge.',value:'+16%',kind:'stat',rarity:'uncommon',max:2,icon:'bolt',stat:'routeGain',amount:.16,nexus:true},
  nexusWard:{name:'Living core shell',description:'The nexus absorbs 18 damage. Its shell recharges every 12 seconds after a hit.',value:'18',kind:'barrage',rarity:'rare',max:1,icon:'shield',nexus:true,minLevel:3},
  might:{name:'Tempered steel',description:'All damage +12%.',value:'+12%',kind:'stat',rarity:'common',max:5,icon:'cannon',stat:'power',amount:.12},
  tempo:{name:'Quick gears',description:'Attack speed +10%.',value:'+10%',kind:'stat',rarity:'common',max:4,icon:'clock',stat:'haste',amount:.1},
  hull:{name:'Reinforced walls',description:'Maximum health +18.',value:'+18',kind:'stat',rarity:'common',max:4,icon:'shield',stat:'maxHp',amount:18},
  precision:{name:'Eagle eye',description:'Critical chance +6%.',value:'+6%',kind:'stat',rarity:'uncommon',max:4,icon:'target',stat:'critChance',amount:.06},
  ferocity:{name:'Heavy criticals',description:'Critical damage +30%.',value:'+30%',kind:'stat',rarity:'rare',max:3,icon:'star',stat:'critMultiplier',amount:.3},
  fleet:{name:'Light chassis',description:'Movement speed +7%.',value:'+7%',kind:'stat',rarity:'common',max:3,icon:'wind',stat:'speed',amount:.45},
  insight:{name:'Hungry scholar',description:'Energy gained from swallowing +15%.',value:'+15%',kind:'stat',rarity:'uncommon',max:3,icon:'book',stat:'energyGain',amount:.15},
  appetite:{name:'Growing appetite',description:'Mouth growth from food +15%.',value:'+15%',kind:'stat',rarity:'common',max:3,icon:'mouth',stat:'massGain',amount:.15},
  remedies:{name:'Better supplies',description:'Health packs and pavilions heal 35% more.',value:'+35%',kind:'stat',rarity:'rare',max:2,icon:'leaf',stat:'healPower',amount:.35},
  reach:{name:'Widening power',description:'Area effects become 16% wider.',value:'+16%',kind:'stat',rarity:'rare',max:3,icon:'vortex',stat:'area',amount:.16},
  frontShot:{name:'Extra projectile',description:'Cannon and frost fire +1 shot. Each shot deals 13% less damage.',value:'+1',kind:'barrage',rarity:'rare',max:2,icon:'cannon'},
  piercing:{name:'Piercing rounds',description:'Projectiles pass through one extra enemy.',value:'+1',kind:'barrage',rarity:'uncommon',max:2,icon:'arrow'},
  rebound:{name:'Bouncing rounds',description:'Projectiles bounce to another nearby enemy.',kind:'barrage',rarity:'epic',max:1,icon:'vortex',minLevel:3},
  rearShot:{name:'Rear guard',description:'Each cannon volley also fires a weaker shell behind you.',kind:'barrage',rarity:'rare',max:1,icon:'back'},
  fragmentation:{name:'Splinter shells',description:'Projectile kills release three smaller shots.',kind:'barrage',rarity:'epic',max:1,icon:'sparkle',minLevel:3},
  satellites:{name:'Extra satellite',description:'Add one wind blade and one electric orb to your unlocked orbits.',value:'+1',kind:'barrage',rarity:'rare',max:2,icon:'wind',orbit:true},
  explosive:{name:'Blast shells',description:'Cannon impacts explode in an additional small area.',kind:'barrage',rarity:'epic',max:1,icon:'flame',minLevel:3},
  conductors:{name:'Long conductor',description:'Lightning jumps to one additional target.',value:'+1',kind:'barrage',rarity:'rare',max:2,icon:'bolt',requires:'lightning'},
  overdrive:{name:'Overdrive heart',description:'Every 8 seconds, attack 80% faster for 2 seconds.',kind:'core',rarity:'epic',max:1,icon:'clock',minLevel:6},
  singularity:{name:'Singularity heart',description:'Every 8 seconds, pull enemies into a crushing gravity burst.',kind:'core',rarity:'epic',max:1,icon:'vortex',minLevel:6},
  execution:{name:'Judgment heart',description:'Three critical hits on one enemy call down a crushing strike.',kind:'core',rarity:'epic',max:1,icon:'target',minLevel:6},
};

export function eligiblePerks(player,options={}){
  const areaActive=player.modules.wind>0||player.modules.ember>0||player.modules.lightning>0||player.modules.roots>0||player.modules.summon>0||player.modules.cannon>=5||player.modules.ice>=5||player.perks.explosive||player.core==='singularity';
  return Object.keys(PERKS).filter(id=>{
    const perk=PERKS[id];
    if((player.perks[id]||0)>=perk.max||player.rewardLevel<(perk.minLevel||0)&&!(options.blueprintReward&&perk.blueprint))return false;
    if(perk.requires&&!player.modules[perk.requires]&&!(options.blueprintReward&&perk.blueprint&&canLearnWeapon(player,perk.requires)))return false;
    if(perk.blueprint&&(player.modules[perk.requires]<(options.blueprintReward?0:perk.minRank)||learnedBlueprint(player,perk.family)))return false;
    if(perk.orbit&&player.modules.wind<2&&player.modules.lightning<3)return false;
    if(perk.kind==='core'&&player.core)return false;
    if(['frontShot','piercing','rebound','fragmentation'].includes(id)&&!player.modules.cannon&&!player.modules.ice)return false;
    if(id==='rebound'&&player.modules.cannon>=7&&!player.modules.ice)return false;
    if(['rearShot','explosive'].includes(id)&&!player.modules.cannon)return false;
    if(id==='reach'&&!areaActive)return false;
    if(id==='appetite'&&player.level>=6)return false;
    return true;
  });
}

export function rewardCost(level){return level===0?18:level<5?44+level*14:130+(level-5)*35;}

export function weaponRarity(rank){return rank>=6?'epic':rank>=4?'rare':'uncommon';}

export function applyPerk(game,id,quality='common',options={}){
  const p=game.player,perk=PERKS[id];
  if(!perk||!eligiblePerks(p,options).includes(id))return false;
  p.perks[id]=(p.perks[id]||0)+1;
  const before=perk.stat?p[perk.stat]:null;
  if(perk.stat)p[perk.stat]+=perkAmount(id,quality);
  if(id==='nexusWard'){p.nexusShield=18;p.nexusShieldCooldown=0;}
  if(perk.kind==='core')p.core=id;
  game.stats.upgrades++;
  game.emit('perk',{id,quality,stat:perk.stat,before,after:perk.stat?p[perk.stat]:null,amount:perkAmount(id,quality),stack:p.perks[id],x:p.x,z:p.z});return true;
}
