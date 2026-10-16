import {test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';
import {BLUEPRINTS,packAt,blueprintRankPreview} from '../src/v2/blueprints.js';
import {eligiblePerks,applyPerk} from '../src/v2/perks.js';
import {segmentsNear} from '../src/v2/tactics.js';
import {equippedArt} from '../src/v2/castle-appearance.js';

function arena(modules={},perks={},seed=8){const g=new BattleGame(seed);g.start(seed);g.entities=[];Object.keys(g.player.modules).forEach(k=>g.player.modules[k]=modules[k]||0);Object.assign(g.player,{x:0,z:0,critChance:0,rewardLevel:3,perks:{...perks},moveAim:0,aim:0});g.nextSpawn=Infinity;g.supplyTime=Infinity;g.rewardCooldown=Infinity;g.expedition.next=Infinity;g.eliteIndex=3;g.arsenal.refresh();g.drainEvents();return g;}
const enemy=(g,x=5,z=0)=>g.spawnEnemy('golem',{x,z,hp:10000,maxHp:10000,spawning:0,cooldown:999,speed:0});

test('converted skill previews describe their actual unit and volley counts',()=>{
  const g=arena({cannon:2,summon:2,roots:2},{scatterBattery:1,wingedHive:1,rootMines:1});
  expect(blueprintRankPreview(g.player,'cannon',3).params.shots).toBe(18);
  expect(blueprintRankPreview(g.player,'summon',3)).toMatchObject({title:'Drone hangar',params:{count:6,damage:20.2,hp:37}});
  expect(blueprintRankPreview(g.player,'roots',4).params).toEqual({count:6,damage:273,radius:3.2});
  g.player.perks.brood=1;expect(blueprintRankPreview(g.player,'summon',5).params.count).toBe(10);
  g.upgrade('summon');const e=g.drainEvents().find(e=>e.type==='upgrade');expect(e.title).toBe('Drone hangar');expect(e.art).toEqual({atlas:'tactics',sprite:4});
});

test('blueprints require rank two and lock the competing plan for that weapon only',()=>{
  const g=arena({cannon:1,wind:2});expect(eligiblePerks(g.player)).not.toContain('fieldTurrets');g.player.modules.cannon=2;
  expect(applyPerk(g,'fieldTurrets','rare')).toBe(true);expect(eligiblePerks(g.player)).not.toContain('scatterBattery');expect(eligiblePerks(g.player)).toContain('windWheel');
  expect(equippedArt(g.player,'cannon')).toEqual({atlas:'tactics',frame:12});
});
test('the third normal draft contains a form-changing blueprint without duplicate cards',()=>{
  for(let seed=1;seed<=20;seed++){const g=arena({cannon:2,summon:2},{},seed);g.player.rewardLevel=2;const offers=g.rollSkillOffers();expect(offers).toHaveLength(3);expect(offers.some(e=>BLUEPRINTS[e.perk])).toBe(true);expect(new Set(offers.map(e=>e.skill||e.perk||e.buff)).size).toBe(3);}
});

test('both rerolls explore different eligible blueprints instead of returning to the first one',()=>{
  for(let seed=1;seed<=20;seed++){
    const g=arena({cannon:2,wind:2},{},seed);g.player.rewardLevel=2;g.mode='choosing';g.choiceOffers=g.rollSkillOffers();
    const seen=new Set();
    for(let i=0;i<3;i++){
      const plan=g.choiceOffers.find(e=>BLUEPRINTS[e.perk]);expect(plan).toBeDefined();expect(seen.has(plan.perk)).toBe(false);seen.add(plan.perk);
      if(i<2)expect(g.rerollShrine()).toBe(true);
    }
    expect(seen.size).toBe(3);
  }
});
test('field artillery deploys a real firing position and pays for it with weaker city fire',()=>{
  const g=arena({cannon:2}),kit=g.arsenal.tactics;enemy(g);g.cooldowns.cannon=0;g.weapons(0);const base=g.shots[0].damage;
  g.shots=[];g.player.perks.fieldTurrets=1;g.cooldowns.cannon=0;g.weapons(0);expect(g.shots[0].damage).toBeCloseTo(base*.75);
  g.standingTime=.6;kit.update(.3);expect(kit.turrets).toHaveLength(1);expect(g.bullets.some(b=>b.tactic==='fieldTurrets')).toBe(true);expect(g.stats.turretShots).toBe(1);
  const turret=kit.turrets[0];const b={px:turret.x-2,pz:turret.z,x:turret.x+2,z:turret.z,radius:.2,damage:500};expect(kit.intercept(b)).toBe(true);kit.update(.01);expect(kit.turrets).toHaveLength(0);
});
test('scatterguns create a short wide volley and do not shorten frost targeting',()=>{
  const g=arena({cannon:2,ice:2},{scatterBattery:1}),target=enemy(g,9);g.cooldowns.cannon=0;g.cooldowns.ice=0;g.weapons(0);
  expect(g.shots.filter(s=>s.weapon==='cannon')).toHaveLength(0);expect(g.shots.some(s=>s.weapon==='ice')).toBe(true);
  target.x=4;g.shots=[];g.cooldowns.cannon=0;g.weapons(0);expect(g.shots.filter(s=>s.weapon==='cannon')).toHaveLength(6);
  g.updateShots(0);expect(g.bullets.filter(b=>b.weapon==='cannon').every(b=>b.scatter&&b.life===.38)).toBe(true);
});
test('a shotgun volley pushes its target once so later pellets can still connect',()=>{
  const g=arena({cannon:2},{scatterBattery:1}),target=enemy(g,5);g.playerTime=1;
  g.bullets=Array.from({length:6},(_,i)=>({id:100+i,side:'player',weapon:'cannon',scatter:true,x:4.9,z:0,px:4.9,pz:0,vx:24,vz:0,radius:.23,life:1,damage:10,pierce:0,splash:0,hit:new Set(),rank:2}));
  g.updateBullets(1/60,1/60);expect(target.hp).toBe(9940);expect(target.x).toBeCloseTo(5.4);
});
test('guards near an outpost become the artillery target and a rally redirects the legion',()=>{
  const g=arena({cannon:2,summon:2}),ordinary=enemy(g,4),guard=enemy(g,5);guard.guard=true;g.expedition.active={type:'outpost',x:5,z:0};
  g.cooldowns.cannon=0;g.weapons(0);expect(g.shots[0].targetX).toBe(guard.x);
  const f=g.arsenal.formation;f.update(0);for(const ally of f.guardians)ally.targetId=ordinary.id;f.rallyArmy();expect(f.guardians.every(a=>a.targetId===guard.id)).toBe(true);
  ordinary.x=12;guard.x=3;f.guardians[0].targetId=ordinary.id;f.update(0);expect(f.guardians[0].targetId).toBe(guard.id);
});
test('movement charges thunderlances and stopping spends them in the chosen direction',()=>{
  const g=arena({lightning:2},{stormLance:1}),kit=g.arsenal.tactics;kit.update(0);g.player.moving=1;
  for(let i=0;i<125;i++){g.player.x+=.1;kit.update(1/60);}expect(kit.lanceCharge).toBe(2);const target=enemy(g,g.player.x+5);
  g.player.moving=0;g.standingTime=.4;kit.update(.01);expect(kit.lanceCharge).toBe(0);expect(g.stats.lancesReleased).toBe(2);expect(target.hp).toBeLessThan(10000);
});
test('a returning wheel cuts on both legs and actually draws wreckage home',()=>{
  const g=arena({wind:2},{windWheel:1}),kit=g.arsenal.tactics;enemy(g,5);const food=g.prop('ore',9,.2,{combatDrop:true,fragment:true});
  for(let i=0;i<6;i++)kit.consume({mass:2,category:'prop'});expect(kit.wheels).toHaveLength(1);
  for(let i=0;i<130;i++)kit.update(1/60);expect(g.stats.wheelHits).toBe(2);expect(food.x).toBeLessThan(3);expect(kit.wheels).toHaveLength(0);
});
test('mirror walls catch crossing projectiles and have a finite reflection budget',()=>{
  const g=arena({ice:2},{mirrorWall:1}),kit=g.arsenal.tactics;kit.deployMirror();
  expect(segmentsNear({x:8,z:0},{x:-2,z:0},{x:3,z:-3},{x:3,z:3},.2)).toBe(true);
  for(let i=0;i<4;i++)expect(kit.intercept({px:8,pz:0,x:-2,z:0,vx:-10,vz:0,radius:.2,damage:10})).toBe(true);
  expect(kit.intercept({px:8,pz:0,x:-2,z:0,vx:-10,vz:0,radius:.2,damage:10})).toBe(false);expect(g.bullets).toHaveLength(4);expect(g.bullets.every(b=>b.side==='player'&&b.vx>0)).toBe(true);
});
test('armed thorn mines chain only through nearby mines and are consumed after their burst',()=>{
  const g=arena({roots:2},{rootMines:1}),f=g.arsenal.formation;enemy(g,2);enemy(g,6);f.plantCooldown=99;
  f.gardens=[2,6,20].map((x,i)=>({id:100+i,x,z:0,radius:2.6,life:8,maxLife:8,tick:0,age:1,bloom:0}));f.update(0);
  expect(g.stats.minesDetonated).toBe(2);expect(f.gardens.find(m=>m.x===20).life).toBe(8);const before=g.stats.damageDealt;f.update(0);expect(g.stats.damageDealt).toBe(before);
});
test('bullet time primes mine detonation while a just-planted mine still has to arm',()=>{
  const g=arena({roots:2},{rootMines:1}),f=g.arsenal.formation;f.plantCooldown=99;f.gardens=[{id:100,x:0,z:0,radius:2.6,life:8,tick:9,age:0,bloom:0}];
  f.timeBurst();f.update(.2);expect(g.stats.minesDetonated).toBe(0);f.update(.6);expect(g.stats.minesDetonated).toBe(1);
});
test('hive conversion doubles the legion but removes its bullet-blocking role',()=>{
  const g=arena({summon:2},{wingedHive:1}),f=g.arsenal.formation;f.update(0);expect(f.guardians).toHaveLength(6);expect(f.guardians.every(a=>a.bee&&a.maxHp===32)).toBe(true);
  const a=f.guardians[0];a.spawnLift=0;expect(f.intercept({px:a.x-2,pz:a.z,x:a.x+2,z:a.z,radius:.3,damage:5})).toBe(false);
});
test('fire trails damage once per interval and ignite actual gardens',()=>{
  const g=arena({ember:2,roots:2},{cinderTrail:1}),kit=g.arsenal.tactics;const target=enemy(g,1);
  const garden={id:10,x:1,z:0,radius:2.6,life:8};g.arsenal.formation.gardens=[garden];kit.update(0);g.player.x=2;kit.update(0);
  expect(target.hp).toBeLessThan(10000);expect(garden.burning).toBe(true);const before=target.hp;kit.update(0);expect(target.hp).toBe(before);
});
test('combat wreckage fuels marching artillery but ordinary food does not',()=>{
  const g=arena({cannon:2,summon:2}),kit=g.arsenal.tactics;for(let i=0;i<5;i++)kit.consume({category:'prop',mass:2});expect(kit.turrets).toHaveLength(0);
  for(let i=0;i<5;i++)kit.consume({category:'prop',mass:2,combatDrop:true});kit.update(2);expect(kit.turrets).toHaveLength(0);expect(kit.siegeFood).toBe(5);
  enemy(g,5);kit.update(0);expect(kit.turrets).toHaveLength(1);expect(kit.turrets[0].combo).toBe('siegeLegion');
});
test('a rallied firewing legion uses a real cone and applies burning',()=>{
  const g=arena({summon:2,ember:2}),f=g.arsenal.formation;const target=enemy(g,4);f.update(0);const a=f.guardians[0];Object.assign(a,{x:3,z:0,spawnLift:0,cooldown:0});f.rallyArmy();a.cooldown=0;f.update(0);
  expect(target.burn).toBe(2);expect(g.stats.comboHits.emberLegion).toBeGreaterThan(0);expect(g.drainEvents().some(e=>e.type==='guardian-flame')).toBe(true);
});
test('seed cyclone pulls enemies into a garden instead of pulling them toward the city',()=>{
  const g=arena({wind:2,roots:2}),target=enemy(g,5);g.arsenal.formation.gardens=[{id:1,x:7,z:0,radius:2.6,life:8}];g.cooldowns.wind=0;g.weapons(0);
  expect(target.x).toBeGreaterThan(5);expect(g.stats.comboHits.seedCyclone).toBeGreaterThan(0);
});
test('plasma requires burning and respects its per-target cooldown',()=>{
  const g=arena({lightning:2,ember:2}),target=enemy(g,5);target.burn=2;g.arsenal.lightning(target,20,1);const after=target.hp;
  expect(g.stats.comboHits.plasmaArc).toBe(1);g.arsenal.lightning(target,20,1);expect(after-target.hp).toBe(20);expect(g.stats.comboHits.plasmaArc).toBe(1);
});
test('outpost blueprints preserve ordinary skill energy and an outstanding ruin',()=>{
  const g=arena({cannon:2,wind:2});g.rewardCooldown=0;g.player.energy=100;g.spawnShrine();const shrine=g.entities.find(e=>e.category==='shrine'),energy=g.player.energy,level=g.player.rewardLevel;
  const plan=g.spawn({category:'blueprint',kind:'blueprint',x:0,z:0,mass:0,radius:.4});g.beginEat(plan);g.finishEat(plan);expect(g.mode).toBe('choosing');expect(g.blueprintDraft).toBe(true);
  const choice=g.choiceOffers.find(e=>BLUEPRINTS[e.perk]);expect(choice).toBeDefined();g.chooseShrine(choice.id);
  expect(g.player.energy).toBe(energy);expect(g.player.rewardLevel).toBe(level);expect(g.rewardPending).toBe(true);expect(shrine.state).toBe('alive');expect(g.stats.blueprintsClaimed).toBe(1);expect(g.chooseShrine(choice.id)).toBe(false);
});
test('an outpost blueprint supplies its rank-two prerequisite without spending ordinary energy or adding a new weapon',()=>{
  const g=arena({cannon:2,summon:1},{scatterBattery:1});g.player.rewardLevel=1;g.player.energy=44;g.blueprintDraft=true;g.mode='choosing';g.choiceOffers=g.rollSkillOffers();
  const plan=g.choiceOffers.find(e=>e.perk==='wingedHive');expect(plan.raiseSkill).toBe('summon');g.chooseShrine(plan.id);
  expect(g.player.modules.summon).toBe(2);expect(g.player.perks.wingedHive).toBe(1);expect(g.player.energy).toBe(44);expect(g.player.rewardLevel).toBe(1);expect(g.arsenal.has('siegeLegion')).toBe(true);
});
test('a free blueprint can fill an open combat slot, but never grants a fourth weapon',()=>{
  const g=arena({cannon:2,summon:1},{scatterBattery:1});g.blueprintDraft=true;g.mode='choosing';g.choiceOffers=g.rollSkillOffers();
  expect(g.choiceOffers.every(e=>BLUEPRINTS[e.perk])).toBe(true);const newPlan=g.choiceOffers.find(e=>!g.player.modules[BLUEPRINTS[e.perk].requires]);expect(newPlan).toBeDefined();
  const weapon=BLUEPRINTS[newPlan.perk].requires;g.chooseShrine(newPlan.id);expect(g.player.modules[weapon]).toBe(2);expect(Object.values(g.player.modules).filter(Boolean)).toHaveLength(3);
  const remaining=eligiblePerks(g.player,{blueprintReward:true}).filter(id=>BLUEPRINTS[id]);expect(remaining.every(id=>g.player.modules[BLUEPRINTS[id].requires]>0)).toBe(true);
});
test('the first optional outpost awards exactly one physical blueprint after its guards fall',()=>{
  const g=arena({cannon:2});g.time=35;g.expedition.next=0;g.expedition.update(0);const event=g.expedition.active;expect(event.type).toBe('outpost');
  for(const id of event.guards)g.damage(g.entities.find(e=>e.id===id),99999);g.expedition.update(0);
  const cache=g.entities.find(e=>e.id===event.targets[0]);expect(cache.anchored).toBe(false);g.beginEat(cache);g.finishEat(cache);g.expedition.claim(cache);
  expect(g.entities.filter(e=>e.category==='blueprint')).toHaveLength(1);
});
test('opportunities stay a short trip away even near a map corner and provide a small food trail',()=>{
  for(const [x,z] of [[0,0],[24,24],[-24,-24],[16,-10]]){const g=arena();Object.assign(g.player,{x,z,moveAim:0});g.time=35;g.expedition.next=0;g.expedition.update(0);const a=g.expedition.active,trip=Math.hypot(a.x-x,a.z-z);expect(trip).toBeGreaterThan(7);expect(trip).toBeLessThanOrEqual(10.01);expect(g.entities.filter(e=>e.harvest)).toHaveLength(6);}
});
test('pincer waves approach on both flanks and stop completely for a special duel',()=>{
  const g=arena();g.seed=0;g.time=30;g.nextSpawn=0;g.director();const pack=g.entities.filter(e=>e.category==='enemy');expect(packAt(30,0)).toBe('pincer');expect(pack.map(e=>e.flankSide).sort()).toEqual([-1,1]);
  const elite=g.spawnEnemy('elite',{x:8,z:0});g.beginDuel(elite);g.time=66;g.nextSpawn=0;g.director();expect(g.entities.filter(e=>e.category==='enemy'&&e.state==='alive')).toEqual([elite]);
});
test('the first three attack phases remain distinct for every opening offset',()=>{
  for(let seed=0;seed<12;seed++)expect(new Set([22,46,70].map(time=>packAt(time,seed))).size).toBe(3);
});
test('collected rally energy waits through empty fields and is spent only when a threat enters',()=>{
  const g=arena({summon:2}),f=g.arsenal.formation;for(let i=0;i<5;i++)f.consume({category:'prop',mass:16});f.update(8);
  expect(f.charge).toBe(72);expect(f.rally).toBe(0);expect(g.stats.rallies).toBe(0);enemy(g,5);f.update(0);expect(f.rally).toBeGreaterThan(3);expect(f.charge).toBe(36);
});
