import { describe, test, expect } from 'bun:test';
import { BattleGame } from '../src/v2/game.js';

function arena(route='harbor') {
  const game=new BattleGame(65);game.start(65,{},route);game.entities=[];
  game.player.x=0;game.player.z=0;game.player.critChance=0;
  game.nextSpawn=Infinity;game.supplyTime=Infinity;game.rewardCooldown=Infinity;game.expedition.next=Infinity;
  game.eliteIndex=3;
  return game;
}

describe('V6.5 independent player and world clocks',()=>{
  test('normal movement and stationary control replace dash movement without adding invulnerability',()=>{
    const normal=arena(),slowed=arena();
    slowed.activateBulletTime({x:1,z:0});slowed.update(.25);
    expect(slowed.player.x).toBe(0);expect(slowed.player.z).toBe(0);
    normal.update(.5,{x:1,z:0});slowed.update(.5,{x:1,z:0});
    expect(slowed.player.x).toBeCloseTo(normal.player.x,8);
    expect(slowed.player.x).toBeCloseTo(3.2,8);
    expect(slowed.player.invuln).toBe(0);
  });

  test('enemy movement and hostile projectile flight and lifetime advance at one fifth speed',()=>{
    const g=arena();g.player.modules.cannon=0;
    const enemy=g.spawnEnemy('golem',{x:10,z:0,speed:2,spawning:0,cooldown:99,ward:10});
    g.volley(enemy,0,1,0,5);const hostile=g.bullets[0];
    const friendly={id:g.nextId++,side:'player',weapon:'cannon',x:-10,z:10,vx:5,vz:0,radius:.1,life:6,damage:1,hit:new Set()};
    g.bullets.push(friendly);g.activateBulletTime();g.update(.5);
    expect(enemy.x).toBeCloseTo(9.8,8);expect(enemy.age).toBeCloseTo(.1,8);
    expect(hostile.x).toBeCloseTo(10.5,8);expect(hostile.life).toBeCloseTo(5.9,8);
    expect(friendly.x).toBeCloseTo(-7.5,8);expect(friendly.life).toBeCloseTo(5.5,8);
  });

  test('rotating enemy volleys turn on the same slowed clock as their travel',()=>{
    const g=arena();g.player.modules.cannon=0;
    const enemy=g.spawnEnemy('mage',{x:10,z:0,speed:0,spawning:0,cooldown:99});
    g.volley(enemy,0,1,0,5,'ring',null,1);const bullet=g.bullets[0];
    g.activateBulletTime();g.update(.5);
    expect(Math.atan2(bullet.vz,bullet.vx)).toBeCloseTo(.1,8);
    expect(Math.hypot(bullet.x-10,bullet.z)).toBeCloseTo(.5,8);
  });

  test('automatic weapon cadence, delayed shots, meteors and friendly fields stay at normal speed',()=>{
    const runs=[arena(),arena()];
    for(const [i,g] of runs.entries()){
      const enemy=g.spawnEnemy('golem',{x:6,z:0,hp:10000,maxHp:10000,speed:0,spawning:0,cooldown:99});
      g.arsenal.meteor(enemy,30,1,false);g.arsenal.field(6,0,2,4,10);
      if(i)g.activateBulletTime();
      for(let frame=0;frame<120;frame++)g.update(1/60);
    }
    expect(runs[1].stats.shots).toBe(runs[0].stats.shots);
    expect(runs[1].stats.damageDealt).toBeCloseTo(runs[0].stats.damageDealt,8);
    expect(runs[1].arsenal.meteors).toHaveLength(0);
    expect(runs[1].arsenal.fields[0].life).toBeCloseTo(2,8);
    expect(runs[1].time).toBeCloseTo(.4,8);expect(runs[1].playerTime).toBeCloseTo(2,8);
  });

  test('windups, queued follow-up shots and attack recovery all slow together',()=>{
    const g=arena();g.player.modules.cannon=0;
    const enemy=g.spawnEnemy('mortar',{x:12,z:0,spawning:0,cooldown:99,intent:'windup',nextAttack:'shoot',stateTimer:.5,attackIndex:2,lockAngle:0});
    g.enemyPatterns.queue(enemy,.3,0,1,0,4);g.activateBulletTime();g.update(1);
    expect(enemy.stateTimer).toBeCloseTo(.3,8);expect(g.stats.enemyVolleys).toBe(0);
    g.update(.6);expect(g.stats.enemyVolleys).toBe(1);expect(enemy.intent).toBe('windup');
    g.update(1);expect(enemy.intent).toBe('recover');expect(g.stats.enemyVolleys).toBe(2);
    g.update(.5);expect(enemy.stateTimer).toBeCloseTo(.75,8);
  });

  test('ground telegraphs and their damaging phase are slowed and still hurt the player',()=>{
    const g=arena();
    const warning={x:0,z:0,radius:1,age:0,delay:.4,duration:.4,damage:12};
    g.warnings.push(warning);g.activateBulletTime();g.update(1);
    expect(warning.age).toBeCloseTo(.2,8);expect(g.player.hp).toBe(100);
    g.update(1.1);expect(warning.active).toBe(true);expect(g.player.hp).toBe(88);
    g.update(1);expect(g.warnings).toContain(warning);
    g.update(1);expect(g.warnings).toHaveLength(0);
  });

  test('supply deadlines and dropped supplies age with the world, while swallowing stays responsive',()=>{
    const g=arena();g.time=4.8;g.supplyTime=5;
    const pack=g.prop('medkit',20,20,{expiresAfter:1});
    const food=g.prop('ore',0,0);g.beginEat(food);
    g.activateBulletTime();g.update(.5);
    expect(g.entities.some(e=>e.kind==='cart')).toBe(false);expect(pack.age).toBeCloseTo(.1,8);
    g.update(.1);expect(food.state).toBe('gone');
    g.update(.5);expect(g.entities.some(e=>e.kind==='cart')).toBe(true);
    expect(pack.state).toBe('alive');expect(pack.age).toBeCloseTo(.22,8);
  });

  test('four seconds of active time and twenty-four seconds between activations do not drift at the boundary',()=>{
    const g=arena();expect(g.activateBulletTime()).toBe(true);
    g.update(3.9);expect(g.worldTimeScale).toBe(.2);
    g.update(.2);expect(g.worldTimeScale).toBe(1);expect(g.time).toBeCloseTo(.9,8);
    expect(g.player.bulletTimeRemaining).toBe(0);expect(g.player.bulletTimeCooldown).toBeCloseTo(19.9,8);
    expect(g.activateBulletTime()).toBe(false);
    g.update(19.9);expect(g.activateBulletTime()).toBe(true);expect(g.stats.bulletTimes).toBe(2);
    expect(g.drainEvents().filter(e=>e.type==='bullet-time-end')).toHaveLength(1);
  });

  test('pause, rewards and other panels consume neither duration nor cooldown and cannot activate the ability',()=>{
    const g=arena();g.activateBulletTime();g.update(.5);
    for(const mode of ['paused','shrine','evolution','title','result']){
      g.mode=mode;g.update(10,{x:1,z:0,bulletTime:true});
      expect(g.player.bulletTimeRemaining).toBe(3.5);expect(g.player.bulletTimeCooldown).toBe(23.5);
      expect(g.time).toBeCloseTo(.1,8);expect(g.activateBulletTime()).toBe(false);
    }
    g.mode='playing';g.update(.5);expect(g.player.bulletTimeRemaining).toBe(3);
    g.start(65);expect(g.player.bulletTimeRemaining).toBe(0);expect(g.player.bulletTimeCooldown).toBe(0);
    expect(g.worldTimeScale).toBe(1);expect(g.playerTime).toBe(0);expect(g.stats.bulletTimes).toBe(0);
  });
});
