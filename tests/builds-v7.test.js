import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';
import {canSwallow} from '../src/v2/data.js';
import {hazardHits,warningAngle,warningRadius} from '../src/v2/hazards.js';

function arena(modules={}){
  const g=new BattleGame(701);g.start(701);g.entities=[];g.player.x=0;g.player.z=0;g.player.critChance=0;
  Object.keys(g.player.modules).forEach(key=>g.player.modules[key]=modules[key]||0);
  g.nextSpawn=Infinity;g.supplyTime=Infinity;g.rewardCooldown=Infinity;g.expedition.next=Infinity;g.eliteIndex=3;
  g.arsenal.refresh();g.drainEvents();return g;
}
function advance(g,seconds){for(let i=0;i<Math.round(seconds*60);i++)g.update(1/60);}

describe('V7 build behaviors',()=>{
  test('siege stance rewards stationary cannon fire without leaking its bonus to frost or moving shots',()=>{
    const g=arena({cannon:1,ice:1});g.spawnEnemy('golem',{x:7,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    const fire=()=>{g.shots=[];g.cooldowns.cannon=0;g.cooldowns.ice=0;g.weapons(0);return Object.fromEntries(g.shots.map(s=>[s.weapon,s.damage]));};
    const baseline=fire();g.player.perks.siegeStance=1;g.standingTime=.45;const still=fire();
    expect(still.cannon).toBeCloseTo(baseline.cannon*1.4);expect(still.ice).toBe(baseline.ice);
    g.standingTime=0;expect(fire()).toEqual(baseline);
  });
  test('root control and mass awakening unlock at their advertised ranks',()=>{
    for(const rank of [1,2,4,5]){
      const g=arena({roots:rank}),f=g.arsenal.formation;g.player.moveAim=0;
      const target=g.spawnEnemy('golem',{x:-1.5,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
      f.update(0);f.update(.4);expect((target.rootSlow||0)>0).toBe(rank>=2);
      const garden=f.gardens[0];garden.tick=99;f.timeBurst();expect(!!garden.forced).toBe(rank>=5);
    }
  });
  test('moving lays a garden trail while a short stop plants at a ranged enemy',()=>{
    const g=arena({roots:1});g.player.moveAim=0;
    const enemy=g.spawnEnemy('mortar',{x:7,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    advance(g,2.3);const gardens=g.arsenal.formation.gardens;
    expect(gardens[0].x).toBeLessThan(0);expect(gardens[1].x).toBe(enemy.x);expect(gardens[1].z).toBe(enemy.z);
    for(let i=0;i<120;i++)g.update(1/60,{x:1,z:0});
    expect(gardens.at(-1).x).toBeGreaterThan(enemy.x);expect(gardens.at(-1).x).toBeLessThan(g.player.x);
  });
  test('a guardian retains an engaged target while its player briefly moves out of view',()=>{
    const g=arena({summon:1});g.view.halfWidth=4;
    const enemy=g.spawnEnemy('golem',{x:3.5,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    g.arsenal.formation.update(.1);const ally=g.arsenal.formation.guardians[0];expect(ally.targetId).toBe(enemy.id);
    g.player.x=-5;g.arsenal.formation.update(.1);expect(ally.targetId).toBe(enemy.id);
  });
  test('guardians pursue and cleave without turning into player bullets',()=>{
    const g=arena({summon:1}),enemy=g.spawnEnemy('golem',{x:7,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    advance(g,3);
    expect(g.arsenal.formation.guardians).toHaveLength(2);expect(enemy.hp).toBeLessThan(3000);
    expect(g.stats.guardianStrikes).toBeGreaterThan(0);expect(g.stats.damageByWeapon.summon).toBeGreaterThan(0);
    expect(g.bullets.some(b=>b.side==='player')).toBe(false);
  });
  test('a fallen guardian stops attacking and returns from the gate after six seconds',()=>{
    const g=arena({summon:1}),f=g.arsenal.formation;f.update(0);const ally=f.guardians[0];
    f.hurtGuardian(ally,1000);expect(ally.hp).toBe(0);expect(g.stats.guardiansLost).toBe(1);
    advance(g,5.9);expect(ally.hp).toBe(0);advance(g,.2);expect(ally.hp).toBe(ally.maxHp);
    expect(g.drainEvents().filter(e=>e.type==='guardian-arrive').length).toBe(3);
  });
  test('shield patrol intercepts a crossing shot by losing real guardian health',()=>{
    const g=arena({summon:2}),f=g.arsenal.formation;f.update(0);g.player.x=8;
    for(const ally of f.guardians){ally.x=20;ally.z=20;ally.spawnLift=0;}
    const ally=f.guardians[0];ally.x=0;ally.z=0;const before=ally.hp;
    g.bullets=[{side:'enemy',x:-2,z:0,vx:10,vz:0,radius:.1,life:2,damage:12}];g.updateBullets(.4);
    expect(ally.hp).toBe(before-12);expect(g.bullets).toHaveLength(0);expect(g.player.hp).toBe(100);expect(g.stats.guardianIntercepts).toBe(1);
  });
  test('swallowing supplies rallies a legion and its heart promotes a real captain',()=>{
    const g=arena({summon:2}),f=g.arsenal.formation;g.player.core='legionHeart';
    f.consume({category:'prop',mass:16,combatDrop:true});f.consume({category:'prop',mass:16,combatDrop:true});f.update(0);
    expect(f.rally).toBeGreaterThan(3);expect(f.guardians.filter(a=>a.captain)).toHaveLength(1);
    expect(f.guardians[0].radius).toBeGreaterThan(f.guardians[1].radius);
    advance(g,3.3);expect(f.guardians.some(a=>a.captain)).toBe(false);
  });
  test('garden ambush has a real ground area, damages entering enemies and briefly roots them',()=>{
    const g=arena({roots:3});g.player.moveAim=0;
    const caught=g.spawnEnemy('golem',{x:-1.5,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    const outside=g.spawnEnemy('golem',{x:10,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    advance(g,.5);
    expect(caught.hp).toBeLessThan(3000);expect(caught.rooted).toBeGreaterThan(0);expect(outside.hp).toBe(3000);
    expect(g.stats.rootBlooms).toBe(1);expect(g.bullets.some(b=>b.side==='player')).toBe(false);
  });
  test('fire actually changes an existing garden bloom into a stronger explosion',()=>{
    const g=arena({roots:2,ember:2}),f=g.arsenal.formation;g.player.moveAim=0;
    const target=g.spawnEnemy('golem',{x:-1.5,z:0,hp:3000,maxHp:3000,spawning:0,cooldown:999,speed:0});
    f.update(0);f.update(.4);expect(target.hp).toBe(2935);
    f.ignite(-1.5,0,2);const before=target.hp;f.update(.2);
    expect(before-target.hp).toBeCloseTo(117,6);expect(g.stats.comboHits.wildfireGarden).toBe(1);
    expect(f.gardens[0].burning).toBe(true);
  });
  test('the frost garden combination can freeze at rank two, with bosses retaining control resistance',()=>{
    const g=arena({roots:2,ice:2}),f=g.arsenal.formation;g.player.moveAim=0;
    const target=g.spawnEnemy('golem',{x:-1.5,z:0,hp:10000,maxHp:10000,spawning:0,cooldown:999,speed:0});
    f.update(0);f.plantCooldown=999;f.update(.4);f.update(1.8);
    expect(target.frozen).toBeGreaterThan(0);expect(g.stats.comboHits.frostGarden).toBe(2);
    const boss=g.spawnEnemy('boss',{x:10,z:0,hp:10000,maxHp:10000,spawning:0,cooldown:999,speed:0});
    g.applyFrost(boss,3);expect(boss.frozen).toBe(.25);g.applyFrost(boss,3);expect(boss.controlLock).toBe(3.6);
  });
  test('rallied storm guardians damage enemies crossing their links',()=>{
    const g=arena({summon:2,lightning:1}),f=g.arsenal.formation;f.update(0);
    const enemy=g.spawnEnemy('golem',{x:4,z:0,radius:.8,hp:1000,maxHp:1000,spawning:0,cooldown:999,speed:0});
    for(const [i,ally] of f.guardians.entries()){ally.x=[2,6,4][i];ally.z=[-1,1,-2][i];ally.cooldown=99;}
    f.rallyArmy();for(const ally of f.guardians)ally.cooldown=99;f.update(0);
    expect(enemy.hp).toBeLessThan(1000);expect(g.stats.comboHits.stormLegion).toBeGreaterThan(0);
    expect(g.drainEvents().some(e=>e.type==='legion-link')).toBe(true);
  });
  test('upgrading to five guardians forms crossing links and cannot multiply one pulse on the same target',()=>{
    const g=arena({summon:5,lightning:1}),f=g.arsenal.formation;f.update(0);
    const enemy=g.spawnEnemy('golem',{x:4,z:0,radius:.8,hp:1000,maxHp:1000,spawning:0,cooldown:999,speed:0});
    for(const [i,ally] of f.guardians.entries()){const a=i/5*Math.PI*2;ally.x=4+Math.cos(a)*2;ally.z=Math.sin(a)*2;ally.cooldown=99;}
    f.rallyArmy();for(const ally of f.guardians)ally.cooldown=99;f.update(0);
    expect(enemy.hp).toBe(960);expect(g.stats.comboHits.stormLegion).toBe(1);
    expect(g.drainEvents().find(e=>e.type==='legion-link').segments).toHaveLength(5);
  });
  test('guardians and gardens keep normal cadence during bullet time and freeze during choices',()=>{
    const normal=arena({summon:1,roots:1}),slow=arena({summon:1,roots:1});
    for(const g of [normal,slow])g.spawnEnemy('golem',{x:4,z:0,hp:10000,maxHp:10000,spawning:0,cooldown:999,speed:0});
    normal.arsenal.formation.rallyArmy();slow.activateBulletTime();advance(normal,2);advance(slow,2);
    expect(slow.stats.guardianStrikes).toBe(normal.stats.guardianStrikes);expect(slow.stats.damageDealt).toBe(normal.stats.damageDealt);
    const before=slow.arsenal.formation.gardens[0].life;slow.mode='choosing';slow.update(5);expect(slow.arsenal.formation.gardens[0].life).toBe(before);
  });
  test('early offers expose a new attack form and a near-complete build receives its missing upgrade',()=>{
    const g=arena({cannon:1});g.eliteIndex=0;g.player.rewardLevel=0;
    expect(g.rollSkillOffers().some(e=>['summon','roots'].includes(e.skill))).toBe(true);
    g.player.rewardLevel=3;g.player.modules.summon=2;g.player.modules.roots=1;
    const offers=g.rollSkillOffers();expect(offers[0].skill).toBe('roots');expect(offers.some(e=>e.path)).toBe(false);
    expect(offers.every(e=>!e.skill||g.player.modules[e.skill]>0)).toBe(true);
  });
  test('damage readouts count actual damage, not overkill or imagined combination power',()=>{
    const g=arena(),enemy=g.spawnEnemy('golem',{x:5,z:0,hp:30,maxHp:30,ward:20,maxWard:20,spawning:0});
    g.damage(enemy,100,{weapon:'summon',combo:'livingGrove'});
    expect(g.stats.damageDealt).toBe(50);expect(g.stats.damageByWeapon.summon).toBe(50);expect(g.stats.comboDamage.livingGrove).toBe(50);expect(g.stats.comboHits.livingGrove).toBe(1);
  });
});

describe('V7 isolated special encounters',()=>{
  test('a new map event cannot be cut short by an imminent duel or interrupt the recovery window',()=>{
    const g=arena();g.eliteIndex=0;g.expedition.next=0;g.time=86;g.expedition.update(0);
    expect(g.expedition.active).toBe(null);
    g.time=90;g.director();expect(g.expedition.next).toBe(132);
    const special=g.entities.find(e=>e.elite&&e.state==='alive');g.damage(special,100000);
    g.expedition.next=0;g.expedition.update(0);expect(g.expedition.active).toBe(null);
    g.time=g.breatherUntil;g.expedition.update(0);expect(g.expedition.active).not.toBe(null);
  });
  test('ordinary packs ramp up after the first build window without raising individual enemy health for learned skills',()=>{
    const counts=[];
    for(const time of [30,45,150,300]){const g=arena();g.time=time;g.nextSpawn=0;g.director();counts.push(g.entities.filter(e=>e.category==='enemy'&&e.state==='alive').length);}
    expect(counts).toEqual([2,3,4,5]);
  });
  test('a scheduled elite dismisses ordinary enemies, clears their hazards, and blocks every refill',()=>{
    const g=arena();g.eliteIndex=0;g.time=90;g.nextSpawn=0;g.expedition.next=0;
    g.spawnEnemy('beetle',{x:5,z:0});g.bullets=[{side:'enemy',x:0,z:0}];g.warnings=[{x:0,z:0,delay:3}];g.director();
    const special=g.entities.find(e=>e.elite&&e.state==='alive');expect(special).toBeDefined();
    expect(g.stats.kills).toBe(0);expect(g.bullets).toHaveLength(0);expect(g.warnings).toHaveLength(0);
    for(const time of [100,270,450,600]){g.time=time;g.nextSpawn=0;g.director();g.expedition.update(1);expect(g.entities.filter(e=>e.category==='enemy'&&e.state==='alive')).toEqual([special]);}
    g.damage(special,100000);g.time+=9;g.director();
    expect(g.entities.filter(e=>e.category==='enemy'&&e.state==='alive')).toHaveLength(1);expect(g.bossSpawned).toBe(true);
    g.time+=30;g.director();expect(g.entities.filter(e=>e.category==='enemy'&&e.state==='alive')).toHaveLength(1);
  });
  test('four expedition seeds expose four distinct elites, including the new roots and wing patterns',()=>{
    const kinds=new Set();
    for(const seed of [40,41,42,43]){const g=new BattleGame(seed);g.start(seed);g.time=90;g.director();kinds.add(g.entities.find(e=>e.elite&&e.state==='alive').kind);}
    expect([...kinds].sort()).toEqual(['elite','eye','moth','rootwarden']);
  });
  test('boss phases include melee sectors, tracking impacts, rotating rays, reverse waves and walls without spawning adds',()=>{
    const g=arena(),boss=g.spawnEnemy('boss',{x:5,z:0,spawning:0,phase:3});
    const signatures=[];
    for(let attack=0;attack<6;attack++){
      g.warnings=[];g.bullets=[];g.enemyPatterns.pending=[];boss.attackIndex=attack;g.firePattern(boss);
      signatures.push({cones:g.warnings.some(w=>w.kind==='cone'),sweep:g.warnings.some(w=>w.sweep),inward:g.warnings.some(w=>w.inward),circles:g.warnings.some(w=>!w.kind),lines:g.warnings.some(w=>w.kind==='line'),bullets:g.bullets.length>0});
    }
    expect(signatures[0].cones).toBe(true);expect(signatures[1].circles).toBe(true);expect(signatures[2].sweep).toBe(true);expect(signatures[3].inward).toBe(true);expect(signatures[4].lines).toBe(true);expect(signatures[5].bullets).toBe(true);
    expect(g.entities.filter(e=>e.category==='enemy')).toEqual([boss]);expect(g.entities.filter(e=>e.duelSupply).length).toBeLessThanOrEqual(6);
  });
  test('cone gaps, sweeping rays and inward waves use their visible geometry for hits',()=>{
    const cone={kind:'cone',x:0,z:0,angle:0,arc:Math.PI/2,radius:6};
    expect(hazardHits(cone,{x:4,z:0},.4)).toBe(true);expect(hazardHits(cone,{x:0,z:4},.4)).toBe(false);expect(hazardHits(cone,{x:-4,z:0},.4)).toBe(false);
    const ray={kind:'line',x:0,z:0,angle:0,sweep:Math.PI/2,length:10,radius:.3,active:true,age:2,delay:1,duration:2};
    expect(warningAngle(ray)).toBeCloseTo(Math.PI/4);expect(hazardHits(ray,{x:4,z:4},.3)).toBe(true);expect(hazardHits(ray,{x:4,z:0},.3)).toBe(false);
    const ring={kind:'ring',x:0,z:0,radius:8,width:.4,active:true,inward:true,age:2,delay:1,duration:2};
    expect(warningRadius(ring)).toBe(4);expect(hazardHits(ring,{x:4,z:0},.2)).toBe(true);expect(hazardHits(ring,{x:0,z:0},.2)).toBe(false);
  });
  test('a large city must face the third phase before the final broken shell becomes edible',()=>{
    const g=arena();g.player.radius=2.3;const boss=g.spawnEnemy('boss',{x:8,z:0,hp:300,maxHp:1000,ward:0,spawning:0,cooldown:99,speed:0});
    g.enemyAI(boss,.01,8);expect(boss.phase).toBe(3);expect(canSwallow(g.player,boss)).toBe(false);
    boss.hp=120;g.enemyAI(boss,.01,8);expect(boss.broken).toBe(true);expect(canSwallow(g.player,boss)).toBe(true);
  });
});
