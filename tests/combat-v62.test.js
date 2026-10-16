import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';

function arena(){
  const g=new BattleGame(62);g.start(62);g.entities=[];g.player.x=0;g.player.z=0;
  g.nextSpawn=9999;g.supplyTime=9999;g.rewardCooldown=9999;g.expedition.next=9999;
  for(const key of Object.keys(g.arsenal.cooldowns))g.arsenal.cooldowns[key]=999;
  return g;
}

describe('V6.2 combat decisions',()=>{
  test('destroying or swallowing a keeper removes only its remaining linked ward',()=>{
    for(const swallow of [false,true]){
      const g=arena(),keeper=g.spawnEnemy('herald',{x:3,z:0,spawning:0,ward:0});
      const ally=g.spawnEnemy('ram',{x:4,z:0,hp:100,maxHp:100,ward:15,spawning:0});
      g.firePattern(keeper);expect(ally.ward).toBe(47);
      g.damage(ally,10);expect(ally.ward).toBe(37);
      if(swallow)g.beginEat(keeper);else g.damage(keeper,99999);
      expect(ally.ward).toBe(15);expect(ally.hp).toBe(100);expect(ally.relayWard).toBe(0);
    }
  });
  test('a marked target makes the cannon a ward breaker, and the mark expires',()=>{
    const g=arena();g.player.modules.cannon=3;g.player.modules.lightning=2;g.arsenal.refresh();
    const target=g.spawnEnemy('golem',{x:6,z:0,hp:1000,maxHp:1000,ward:400,spawning:0});
    g.arsenal.lightning(target,10,1);const before=target.ward;
    g.damage(target,20,{weapon:'cannon'});expect(before-target.ward).toBe(40);
    g.arsenal.update(3.1);const after=target.ward;
    g.damage(target,20,{weapon:'cannon'});expect(after-target.ward).toBe(20);
  });
  test('salvage haste requires combat wreckage and expires when collection stops',()=>{
    const g=arena();g.player.modules.cannon=3;g.player.modules.wind=2;g.arsenal.refresh();
    g.routeMechanics.consume({category:'prop',mass:5});expect(g.player.salvageStacks).toBe(0);
    for(let i=0;i<8;i++)g.routeMechanics.consume({category:'prop',mass:1,combatDrop:true});
    expect(g.player.salvageStacks).toBe(5);
    g.arsenal.update(2.9);expect(g.player.salvageStacks).toBe(5);
    g.arsenal.update(.2);expect(g.player.salvageStacks).toBe(0);
  });
  test('storm conductor converts bullet-time activation into offense with a limited bullet clear',()=>{
    const g=arena();g.player.modules.wind=2;g.player.modules.lightning=2;g.arsenal.refresh();
    const target=g.spawnEnemy('golem',{x:5,z:0,hp:1000,maxHp:1000,spawning:0});
    g.bullets=Array.from({length:10},(_,id)=>({id,side:'enemy',x:0,z:2}));
    expect(g.activateBulletTime({x:1,z:0})).toBe(true);expect(target.hp).toBeLessThan(1000);expect(g.bullets).toHaveLength(4);
    const health=target.hp;expect(g.activateBulletTime({x:1,z:0})).toBe(false);expect(target.hp).toBe(health);
  });
  test('rank two frost can prime a fire impact to interrupt a non-boss windup',()=>{
    const g=arena();g.player.modules.ice=2;g.player.modules.ember=2;g.arsenal.refresh();
    const target=g.spawnEnemy('herald',{x:5,z:0,hp:1000,maxHp:1000,ward:400,spawning:0,intent:'windup',stateTimer:1});
    g.applyFrost(target,1);expect(target.frozen).toBe(0);
    g.arsenal.meteor(target,1,2,false);g.arsenal.update(.7);
    expect(target.intent).toBe('recover');expect(target.ward).toBeLessThan(300);expect(g.stats.comboTriggers).toBe(1);
  });
  test('mortar alternates marked ground denial and fan fire',()=>{
    const g=arena(),mortar=g.spawnEnemy('mortar',{x:6,z:0,spawning:0,attackIndex:1,lockAngle:0});
    g.firePattern(mortar);expect(g.warnings).toHaveLength(3);expect(g.bullets).toHaveLength(0);
    mortar.attackIndex=2;g.firePattern(mortar);expect(g.bullets).toHaveLength(5);
    expect(g.warnings.every(w=>w.delay>=1&&w.duration>0)).toBe(true);
  });
  test('marked danger is harmless before impact, remains dangerous afterward, and expires',()=>{
    const g=arena();g.warnings.push({x:0,z:0,age:0,radius:1,delay:.8,damage:10,duration:1.6});
    g.updateWarnings(.6);expect(g.player.hp).toBe(100);
    g.updateWarnings(.3);expect(g.player.hp).toBe(90);expect(g.warnings[0].active).toBe(true);
    g.player.x=3;g.updateWarnings(1);expect(g.player.hp).toBe(90);expect(g.warnings).toHaveLength(1);
    g.updateWarnings(.6);expect(g.warnings).toHaveLength(0);
  });
  test('mage rings leave a readable gap and enemy shot counts stay bounded',()=>{
    const g=arena(),mage=g.spawnEnemy('mage',{x:5,z:0,spawning:0,attackIndex:1,lockAngle:0});
    g.firePattern(mage);expect(g.bullets.length).toBeGreaterThan(6);
    expect(g.bullets.every(b=>Math.abs(Math.atan2(b.vz,b.vx))>=.43)).toBe(true);
    g.bullets=Array.from({length:175},()=>({side:'enemy'}));
    g.volley(mage,0,20,0,4,'ring');expect(g.bullets).toHaveLength(180);
  });
});
