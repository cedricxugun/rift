import { describe,test,expect } from 'bun:test';
import { BattleGame } from '../src/v2/game.js';
import { canSwallow } from '../src/v2/data.js';
import { applyPerk } from '../src/v2/perks.js';
import { ownedWeapons } from '../src/v2/skill-graph.js';

function battlefield(route='harbor'){
  const game=new BattleGame(43);game.start(43,{},route);game.entities=[];
  game.player.x=0;game.player.z=0;game.nextSpawn=9999;game.rewardCooldown=9999;game.supplyTime=9999;game.expedition.next=9999;
  return game;
}

describe('V6 route and expedition contracts',()=>{
  test('homes start with different attacks and city improvements never add a fourth weapon',()=>{
    for(const [route,primary] of [['harbor','cannon'],['furnace','ember'],['frost','ice']]){
      const g=battlefield(route);expect(ownedWeapons(g.player)).toEqual([primary]);
      for(const id of Object.keys(g.player.modules).filter(id=>id!==primary).slice(0,2))g.upgrade(id);
      const locked=Object.keys(g.player.modules).find(id=>!g.player.modules[id]);
      expect(g.upgrade(locked)).toBe(false);g.mode='evolving';g.corePending=1;
      expect(g.evolve('armory')).toBe(true);expect(ownedWeapons(g.player)).toHaveLength(3);
      expect(g.rollSkillOffers().every(e=>!e.skill||g.player.modules[e.skill]>0)).toBe(true);
    }
  });
  test('a branch excludes its sibling and only offers its own successor',()=>{
    const g=battlefield();g.player.rewardLevel=4;g.choiceOffers=g.rollSkillOffers();g.mode='choosing';
    const choice=g.choiceOffers.find(e=>e.path==='harbor_lance');expect(choice).toBeDefined();
    expect(g.rerollShrine()).toBe(false);expect(g.chooseShrine(choice.id)).toBe(true);
    g.player.rewardLevel=7;g.coreOffered=true;g.player.core='overdrive';
    const offers=g.rollSkillOffers();expect(offers.some(e=>e.path)).toBe(false);
    expect(offers.find(e=>e.mastery)?.mastery).toBe('harbor_breach');
    g.choiceOffers=offers;g.mode='choosing';g.chooseShrine(offers.find(e=>e.mastery).id);
    expect(g.rollSkillOffers().some(e=>e.mastery)).toBe(false);
  });
  test('rerolls keep combat frozen, spend exactly once, and invalidate the old cards',()=>{
    const g=battlefield();g.choiceOffers=g.rollSkillOffers();g.mode='choosing';const old=g.choiceOffers[0].id;
    expect(g.rerollShrine()).toBe(true);expect(g.player.rerolls).toBe(1);
    g.update(5);expect(g.time).toBe(0);expect(g.chooseShrine(old)).toBe(false);
    expect(g.rerollShrine()).toBe(true);expect(g.player.rerolls).toBe(0);expect(g.rerollShrine()).toBe(false);
    expect(g.chooseShrine(g.choiceOffers[0].id)).toBe(true);expect(g.player.rewardLevel).toBe(1);
  });
  test('numerical rarity changes the actual stat and records the exact before/after values',()=>{
    const g=battlefield();applyPerk(g,'might','epic');expect(g.player.power).toBeCloseTo(1.21,6);
    const event=g.drainEvents().find(e=>e.type==='perk');expect(event.before).toBe(1);expect(event.after).toBeCloseTo(1.21,6);
    applyPerk(g,'fleet','rare');expect(g.player.speed).toBeCloseTo(7.075,6);
  });
  test('a maxed armory converts its upgrade to damage without reducing an already strong build',()=>{
    const g=battlefield();g.player.modules.cannon=8;g.player.modules.wind=6;g.player.power=3.1;g.mode='evolving';g.corePending=1;
    expect(g.evolve('armory')).toBe(true);expect(g.player.power).toBeCloseTo(3.46,6);
    expect(g.player.modules.cannon).toBe(8);expect(g.player.modules.wind).toBe(6);
  });
  test('swallowing charges a real piercing harbor volley and ward damage carries over correctly',()=>{
    const g=battlefield();g.player.path='harbor_lance';g.player.critChance=0;
    const enemy=g.spawnEnemy('golem',{x:5,z:0,hp:1000,maxHp:1000,ward:100,maxWard:100,spawning:0,speed:0,cooldown:999});
    g.damage(enemy,100,{wardBonus:2});expect(enemy.ward).toBe(0);expect(enemy.hp).toBe(950);
    g.routeMechanics.consume({category:'prop',mass:18});g.routeMechanics.consume({category:'prop',mass:18});
    g.routeMechanics.update(0);expect(g.stats.routeBursts).toBe(1);expect(g.shots).toHaveLength(5);
    for(let i=0;i<30;i++){g.updateShots(1/60);g.updateBullets(1/60);}
    expect(enemy.hp).toBeLessThan(950);expect(g.player.routeCharge).toBeLessThan(22);
  });
  test('burning wreckage produces more furnace heat and eruptions create damaging fields',()=>{
    const g=battlefield('furnace');g.routeMechanics.consume({category:'prop',mass:5,combatDrop:true});const ordinary=g.player.routeCharge;
    g.player.routeCharge=0;g.routeMechanics.consume({category:'prop',mass:5,combatDrop:true,burningRemains:true});expect(g.player.routeCharge).toBeGreaterThan(ordinary);
    g.player.path='furnace_coals';g.player.routeCharge=25;
    const enemy=g.spawnEnemy('golem',{x:2,z:0,hp:1000,maxHp:1000,spawning:0,speed:0,cooldown:999});
    g.routeMechanics.update(0);expect(enemy.hp).toBe(925);expect(g.arsenal.fields).toHaveLength(3);
    expect(g.arsenal.fields.every(f=>f.damage>0&&f.life>4)).toBe(true);
  });
  test('guardian ice must be collected and can be spent on defense or a directional bullet-time burst',()=>{
    const g=battlefield('frost');g.player.path='frost_aegis';
    for(let i=0;i<8;i++)g.routeMechanics.consume({category:'prop',mass:10,frostedRemains:true});
    expect(g.player.shards).toBe(6);g.hurt(20);expect(g.player.hp).toBe(90);expect(g.player.shards).toBe(5);
    g.player.path='frost_lances';g.player.invuln=0;g.hurt(20);expect(g.player.hp).toBe(70);expect(g.player.shards).toBe(5);
    g.player.mastery='frost_split';g.activateBulletTime({x:1,z:0});expect(g.player.shards).toBe(0);expect(g.shots).toHaveLength(10);
    expect(g.shots.every(s=>s.damage===70&&s.pierce===4&&Math.abs(s.angle)<1)).toBe(true);
  });
  test('outposts unlock only when every guard is defeated and grant one physical reward',()=>{
    const g=battlefield();g.expedition.index=1;g.expedition.next=0;g.time=60;g.expedition.update(0);
    const active=g.expedition.active,cache=g.entities.find(e=>e.id===active.targets[0]);
    g.player.radius=3;expect(canSwallow(g.player,cache)).toBe(false);
    for(const id of active.guards.slice(0,2))g.damage(g.entities.find(e=>e.id===id),9999);
    g.expedition.update(0);expect(canSwallow(g.player,cache)).toBe(false);
    g.damage(g.entities.find(e=>e.id===active.guards[2]),9999);g.expedition.update(0);expect(canSwallow(g.player,cache)).toBe(true);
    g.beginEat(cache);g.finishEat(cache);const energy=g.player.energy;g.expedition.claim(cache);
    expect(g.stats.eventsCompleted).toBe(1);expect(g.player.energy).toBe(energy);
    expect(g.entities.some(e=>e.kind==='medkit'&&e.healing===18)).toBe(true);
  });
  test('both caravan wagons are food but their special reward cannot be doubled',()=>{
    const g=battlefield();g.expedition.index=0;g.expedition.next=0;g.expedition.update(0);const active=g.expedition.active;
    for(const id of active.targets){const e=g.entities.find(e=>e.id===id);g.beginEat(e);g.finishEat(e);}
    expect(g.stats.eventsCompleted).toBe(1);expect(g.player.mass).toBe(44);
    expect(g.entities.filter(e=>e.kind==='crate'&&!e.harvest)).toHaveLength(4);
  });
});
