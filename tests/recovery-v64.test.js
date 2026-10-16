import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';

function arena(){
  const g=new BattleGame(640);g.start(640);g.entities=[];g.player.x=0;g.player.z=0;
  g.nextSpawn=9999;g.supplyTime=9999;g.rewardCooldown=9999;g.expedition.next=9999;
  return g;
}

function killPack(g,count){
  for(let i=0;i<count;i++){const enemy=g.spawnEnemy('beetle',{x:8,z:0,spawning:0});g.damage(enemy,9999);}
}

function hostileShots(g){
  g.bullets=Array.from({length:5},(_,id)=>({id,side:'enemy',x:3,z:2,vx:0,vz:0,radius:.14,damage:10,life:5}));
}

function shell(id,extra={}){
  return {id,side:'player',weapon:'cannon',x:0,z:0,vx:10,vz:0,radius:.19,damage:20,life:1,pierce:0,splash:0,hit:new Set(),...extra};
}

describe('V6.4 elite cleanup cannot invalidate an in-flight projectile update',()=>{
  test('a lethal shell clears enemy shots, retains other friendly shots and defers fresh shards',()=>{
    const g=arena();g.player.perks.fragmentation=1;
    const elite=g.spawnEnemy('elite',{x:3,z:0,hp:1,maxHp:1,ward:0,maxWard:0,spawning:0});
    hostileShots(g);
    const survivor=shell(20,{x:20,z:20,vx:0,life:3});g.bullets.push(survivor,shell(10));
    expect(()=>g.updateBullets(.3)).not.toThrow();
    expect(elite.state).toBe('gone');expect(g.stats.elites).toBe(1);expect(g.stats.erasedBullets).toBe(5);
    expect(g.bullets.some(b=>b.side==='enemy'||b.id===10)).toBe(false);
    expect(g.bullets).toContain(survivor);expect(survivor.life).toBeCloseTo(2.7);
    const shards=g.bullets.filter(b=>b.splitShard);expect(shards).toHaveLength(3);
    expect(shards.every(b=>b.life===.45)).toBe(true);
    expect(g.entities.filter(e=>e.category==='core')).toHaveLength(1);
    const before=g.time;g.update(1/60);expect(g.time).toBeGreaterThan(before);expect(g.mode).toBe('playing');
  });
  test('splash and ice-shatter deaths can clear enemy shots during another hit',()=>{
    for(const shatter of [false,true]){
      const g=arena();g.player.modules.ice=shatter?4:0;
      g.spawnEnemy('beetle',{x:3,z:0,hp:shatter?1:1000,maxHp:1000,frozen:shatter?1:0,spawning:0});
      const elite=g.spawnEnemy('elite',{x:3.5,z:0,hp:1,maxHp:1,ward:0,maxWard:0,spawning:0});
      hostileShots(g);g.bullets.push(shell(10,{splash:shatter?0:2}));
      expect(()=>g.updateBullets(.3)).not.toThrow();
      expect(elite.state).toBe('gone');expect(g.bullets).toHaveLength(0);expect(g.mode).toBe('playing');
    }
  });
  test('a cleared shot in the frame snapshot cannot still hit the city',()=>{
    const g=arena();g.spawnEnemy('elite',{x:3,z:0,hp:1,maxHp:1,ward:0,maxWard:0,spawning:0});
    g.bullets=[{id:0,side:'enemy',x:-2,z:0,vx:10,vz:0,radius:.14,damage:90,life:5},shell(10)];
    g.updateBullets(.3);expect(g.player.hp).toBe(100);expect(g.stats.damageTaken).toBe(0);
  });
});

describe('scarce recovery supplies',()=>{
  test('high integrity and untouched swallowed fodder cannot stockpile health packs',()=>{
    const g=arena();killPack(g,20);expect(g.entities.some(e=>e.kind==='medkit')).toBe(false);
    g.player.hp=30;
    for(let i=0;i<12;i++){const e=g.spawnEnemy('beetle',{x:5,z:0,spawning:0});g.beginEat(e);}
    expect(g.entities.some(e=>e.kind==='medkit')).toBe(false);
    killPack(g,5);expect(g.entities.some(e=>e.kind==='medkit')).toBe(false);
    killPack(g,1);expect(g.entities.filter(e=>e.kind==='medkit')).toHaveLength(1);
  });
  test('normal and critical healing rates respect kill requirements and elapsed time',()=>{
    for(const [hp,kills,seconds] of [[60,12,28],[30,6,18]]){
      const g=arena();g.player.hp=hp;
      killPack(g,kills-1);expect(g.entities.some(e=>e.kind==='medkit')).toBe(false);
      killPack(g,1);expect(g.entities.filter(e=>e.kind==='medkit')).toHaveLength(1);
      killPack(g,kills*2);g.update(seconds-.1);killPack(g,1);
      expect(g.entities.filter(e=>e.kind==='medkit')).toHaveLength(1);
      g.update(.2);killPack(g,1);
      const packs=g.entities.filter(e=>e.kind==='medkit');expect(packs).toHaveLength(2);
      expect(packs.every(e=>e.healing===14)).toBe(true);
      g.update(seconds);killPack(g,kills);expect(g.entities.filter(e=>e.kind==='medkit'&&e.state==='alive').length).toBeLessThanOrEqual(2);
    }
  });
  test('combat supplies expire but paused time, elite rewards and recovery buildings do not',()=>{
    const g=arena(),pack=g.prop('medkit',8,0),reward=g.prop('medkit',9,0,{healing:30,recoverySource:'elite'}),building=g.prop('heal',10,0);
    g.mode='paused';g.update(60);expect(pack.age).toBe(0);
    g.mode='playing';g.update(39.9);expect(pack.state).toBe('alive');
    g.update(.2);expect(pack.state).toBe('gone');expect(reward.state).toBe('alive');expect(building.state).toBe('alive');
  });
  test('guaranteed rewards retain a slot and replace old ordinary medicine at the total cap',()=>{
    const g=arena(),old=g.prop('medkit',5,0);old.age=20;
    g.prop('medkit',6,0);
    g.eliteReward({x:8,z:0});
    let packs=g.entities.filter(e=>e.kind==='medkit'&&e.state==='alive');
    expect(packs).toHaveLength(3);expect(packs.some(e=>e.recoverySource==='elite'&&e.healing===30)).toBe(true);
    expect(g.prop('medkit',7,0)).toBeNull();
    g.prop('medkit',7,0,{healing:28,recoverySource:'event'});
    packs=g.entities.filter(e=>e.kind==='medkit'&&e.state==='alive');
    expect(packs).toHaveLength(3);expect(old.state).toBe('gone');
    expect(packs.filter(e=>e.healing===30||e.healing===28)).toHaveLength(2);
  });
});
