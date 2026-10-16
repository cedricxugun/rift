import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';
import {comboRecommendations} from '../src/v2/skill-graph.js';
import {eligiblePerks,applyPerk} from '../src/v2/perks.js';
import {navigationGoal} from '../src/v2/guidance.js';

function arena(route='harbor'){
  const g=new BattleGame(73);g.start(73,{},route);g.entities=[];g.player.x=0;g.player.z=0;
  g.nextSpawn=9999;g.supplyTime=9999;g.rewardCooldown=9999;g.expedition.next=9999;
  return g;
}

describe('V6.1 manual-play regressions',()=>{
  test('a nearby earned ruin is drawn into the mouth without pixel-perfect alignment',()=>{
    const g=arena();g.player.energy=95;g.rewardPending=true;
    const ruin=g.spawn({category:'shrine',kind:'relic',x:3.6,z:.7,radius:.45,mass:4,group:1});
    for(let i=0;i<120&&g.mode==='playing';i++)g.update(1/60);
    expect(ruin.state).toBe('gone');expect(g.mode).toBe('choosing');expect(g.choiceOffers).toHaveLength(3);
    g.chooseShrine(g.choiceOffers[0].id);expect(g.player.energy).toBe(77);
  });
  test('navigation keeps the outstanding reward discoverable and switches to emergency healing',()=>{
    const g=arena();const ruin=g.spawn({category:'shrine',kind:'relic',x:20,z:20,radius:.45});
    const pack=g.prop('medkit',-8,0);
    expect(navigationGoal(g).entity).toBe(ruin);g.player.hp=35;expect(navigationGoal(g).entity).toBe(pack);
    const boss=g.spawnEnemy('boss',{x:3,z:0,radius:.7,ward:0,spawning:0});
    expect(navigationGoal(g).entity).toBe(boss);expect(navigationGoal(g).label).toBe('The king can be devoured');
  });
  test('ranged weapons and loaded attacks wait until their target enters the combat view',()=>{
    const g=arena();g.view={halfWidth:8,halfHeight:12};g.cooldowns.cannon=0;g.player.routeCharge=22;
    const enemy=g.spawnEnemy('golem',{x:11,z:0,radius:1,hp:10000,maxHp:10000,spawning:0});
    g.weapons(0);g.routeMechanics.update(0);expect(g.shots).toHaveLength(0);expect(g.player.routeCharge).toBe(22);
    enemy.x=6;g.weapons(0);g.routeMechanics.update(0);expect(g.shots.length).toBeGreaterThan(1);expect(g.stats.routeBursts).toBe(1);
    const fire=arena('furnace');fire.view=g.view;fire.arsenal.cooldowns.ember=0;
    const far=fire.spawnEnemy('golem',{x:11,z:0,radius:1,spawning:0});fire.arsenal.update(0);expect(fire.arsenal.meteors).toHaveLength(0);
    far.x=6;fire.arsenal.update(0);expect(fire.arsenal.meteors).toHaveLength(1);
  });
  test('moving players meet enemies ahead, while edge spawns stay outside the player body',()=>{
    const g=arena();g.time=200;g.player.vx=1;g.random=()=>.5;
    expect(g.spawnEnemy('ram').x).toBeGreaterThan(g.player.x);
    for(const [x,z] of [[24,24],[-24,24],[24,-24],[-24,-24]]){
      g.player.x=x;g.player.z=z;const enemy=g.spawnEnemy('ram');
      expect(Math.hypot(enemy.x-x,enemy.z-z)).toBeGreaterThanOrEqual(6.2);
      expect(enemy.spawning).toBeGreaterThan(0);
    }
  });
  test('elite recovery ends after eight seconds without a second scheduled lull',()=>{
    const g=arena();g.time=501;g.eliteIndex=3;g.eliteReward({x:0,z:0});
    g.time=508.9;g.director();expect(g.pacing.rest).toBe(true);
    g.time=509;g.director();expect(g.pacing.rest).toBe(false);expect(g.entities.some(e=>e.category==='enemy')).toBe(true);
  });
  test('an ongoing elite fight never announces a safe breather',()=>{
    const g=arena();g.time=56;g.spawnEnemy('elite',{x:6,z:0,spawning:0});g.wasResting=false;g.drainEvents();g.director();
    expect(g.drainEvents().some(e=>e.type==='breather')).toBe(false);
  });
  test('cannon and wind form a real salvage loop that returns distant wreckage to the mouth',()=>{
    const g=arena();g.player.modules.cannon=3;g.player.modules.wind=2;g.arsenal.refresh();g.cooldowns.cannon=999;
    const enemy=g.spawnEnemy('golem',{x:7,z:0,hp:10000,maxHp:10000,spawning:0,speed:0,cooldown:999});
    const wreckage=g.prop('ore',8,0,{radius:.16,mass:4,fragment:true,combatDrop:true});
    g.arsenal.volley=2;g.arsenal.cannonBurst(enemy);
    for(let i=0;i<120;i++)g.update(1/60);
    expect(wreckage.state).toBe('gone');expect(g.player.routeCharge).toBeGreaterThan(0);
    expect(g.stats.comboTriggers).toBeGreaterThan(0);expect(enemy.burn||0).toBe(0);
  });
  test('combo hints exclude a fourth weapon and put immediate unlocks before existing combos',()=>{
    const g=arena();Object.assign(g.player.modules,{cannon:7,wind:4,ember:2});
    const cannon=comboRecommendations(g.player,'cannon');expect(cannon.some(c=>c.needs.lightning)).toBe(false);
    const fire=comboRecommendations(g.player,'ember');expect(fire[0].id).toBe('meteorForge');expect(fire[0].unlocks).toBe(true);
  });
  test('ricochet is not offered to a cannon that already ricochets, unless frost can use it',()=>{
    const g=arena();g.player.rewardLevel=9;g.player.modules.cannon=7;
    expect(eligiblePerks(g.player)).not.toContain('rebound');g.player.modules.ice=1;expect(eligiblePerks(g.player)).toContain('rebound');
    applyPerk(g,'hull','uncommon');expect(g.player.maxHp).toBe(123);
  });
  test('loaded cannon volleys scale with weapon growth and favor visible armored elites',()=>{
    const damage=[];
    for(const rank of [1,8]){
      const g=arena();g.player.modules.cannon=rank;g.player.routeCharge=22;
      g.spawnEnemy('beetle',{x:4,z:0,spawning:0});g.spawnEnemy('elite',{x:0,z:6,spawning:0,ward:200});
      g.routeMechanics.update(0);damage.push(g.shots[0].damage);
      expect(g.shots[2].angle).toBeCloseTo(Math.PI/2,5);
    }
    expect(damage[1]).toBeGreaterThan(damage[0]*2);
  });
  test('city improvements track only accepted choices and reset with the expedition',()=>{
    const g=arena();
    expect(g.evolve('engine')).toBe(false);
    expect(g.player.cityImprovements).toEqual({});
    for(const choice of ['engine','garden','engine']){
      g.mode='evolving';g.corePending=1;
      expect(g.evolve(choice)).toBe(true);
      expect(g.evolve(choice)).toBe(false);
    }
    expect(g.player.cityImprovements).toEqual({engine:2,garden:1});
    expect(g.player.speed).toBeCloseTo(7.2,6);
    expect(g.player.routeGain).toBeCloseTo(1.4,6);
    expect(g.player.maxHp).toBe(120);
    g.start(73);
    expect(g.player.cityImprovements).toEqual({});
    expect(g.player.speed).toBe(6.4);
    expect(g.player.routeGain).toBe(1);
  });
});
