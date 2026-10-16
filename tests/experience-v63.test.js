import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';
import {energyCoreRadius} from '../src/v2/weapon-rig.js';
import {navigationGoal} from '../src/v2/guidance.js';
import {OPENING_TIME} from '../src/v2/data.js';
import {applyPerk} from '../src/v2/perks.js';

function arena(){
  const g=new BattleGame(63);g.start(63);g.entities=[];g.player.x=0;g.player.z=0;
  g.nextSpawn=9999;g.supplyTime=9999;g.rewardCooldown=9999;g.expedition.next=9999;
  return g;
}

describe('V6.3 harvest, weapon rig and guardian encounters',()=>{
  test('seeded openings contain a reachable first reward, real stacks and differing layouts',()=>{
    const layouts=[];
    for(const seed of [6,19,63]){
      const g=new BattleGame(seed);g.start(seed);
      const supplies=g.entities.filter(e=>e.harvest);
      expect(supplies.length).toBeGreaterThanOrEqual(39);
      expect(supplies.some(e=>e.stackLevel===2)).toBe(true);
      const first=supplies.filter(e=>e.pileId===1);
      expect(first.reduce((mass,e)=>mass+e.mass,0)).toBeGreaterThanOrEqual(g.player.energyCost);
      expect(first.every(e=>Math.hypot(e.x-g.player.x,e.z-g.player.z)<2)).toBe(true);
      g.time=OPENING_TIME-.01;g.director();expect(g.entities.some(e=>e.category==='enemy')).toBe(false);
      layouts.push([g.player.x,g.player.z,supplies.length]);
    }
    expect(new Set(layouts.map(JSON.stringify)).size).toBe(3);
  });
  test('postponing a branch grants a disclosed stat and cannot guarantee repeated primary ranks',()=>{
    const g=arena();g.player.rewardLevel=2;g.player.modules.cannon=3;
    g.choiceOffers=g.rollSkillOffers();g.mode='choosing';
    const defer=g.choiceOffers.find(e=>e.deferBranch);
    expect(defer.perk).toBeDefined();expect(defer.skill).toBeUndefined();
    expect(g.chooseShrine(defer.id)).toBe(true);expect(g.player.modules.cannon).toBe(3);
    expect(g.player.perks[defer.perk]).toBe(1);
    expect(g.rollSkillOffers().some(e=>e.path)).toBe(false);
    g.player.rewardLevel+=2;expect(g.rollSkillOffers().filter(e=>e.path)).toHaveLength(2);
  });
  test('opening collection has seven uninterrupted seconds and saves all earned energy',()=>{
    const g=new BattleGame(63);g.start(63);g.addMass(30);
    expect(g.player.energy).toBe(30);expect(g.rewardPending).toBe(false);
    g.time=6.9;g.checkSkillReward();expect(g.rewardPending).toBe(false);
    g.time=7;g.checkSkillReward();expect(g.rewardPending).toBe(true);expect(g.player.energy).toBe(30);
  });
  test('off-centre barrels still hit small targets on all four sides of a grown city',()=>{
    for(const [x,z] of [[7,0],[-7,0],[0,7],[0,-7]]){
      const g=arena();g.player.radius=2.3;g.player.visualRadius=2.3;g.player.level=6;
      const enemy=g.spawnEnemy('mortar',{x,z,radius:.7,hp:2000,maxHp:2000,spawning:0,cooldown:999,speed:0});
      for(let i=0;i<100;i++)g.update(1/60);
      expect(enemy.hp).toBeLessThan(2000);
    }
  });
  test('the growing visible nexus changes bullet and ground-danger collisions',()=>{
    for(const level of [1,6]){
      const g=arena();g.player.level=level;
      g.bullets=[{side:'enemy',x:-2,z:.7,vx:10,vz:0,radius:.1,damage:10,life:1}];
      g.updateBullets(.4);expect(g.player.hp).toBe(level===1?100:90);
      g.player.hp=100;g.player.invuln=0;
      g.warnings=[{x:1.6,z:0,radius:1,age:0,delay:1,damage:10}];
      g.updateWarnings(1);expect(g.player.hp).toBe(level===1?100:90);
    }
    expect(energyCoreRadius({level:100})).toBe(1.05);
  });
  test('killing a caster cancels its queued volley and untriggered ground attack',()=>{
    const g=arena(),mage=g.spawnEnemy('mage',{x:6,z:0,spawning:0,attackIndex:3,lockAngle:0});
    g.firePattern(mage);expect(g.enemyPatterns.pending.length).toBeGreaterThan(0);
    g.enemyPatterns.danger(mage,{x:0,z:0});g.damage(mage,99999);
    g.bullets=[];g.enemyPatterns.update(1);g.updateWarnings(2);
    expect(g.bullets).toHaveLength(0);expect(g.warnings).toHaveLength(0);expect(g.player.hp).toBe(100);
  });
  test('a root shockwave has a safe centre, a damaging moving rim, and an expiry',()=>{
    const g=arena();g.warnings=[{kind:'ring',x:0,z:0,radius:6,width:.4,age:0,delay:1,duration:2,damage:10}];
    g.updateWarnings(1.5);expect(g.player.hp).toBe(100);
    g.player.x=1.8;g.updateWarnings(.1);expect(g.player.hp).toBe(90);
    g.updateWarnings(2);expect(g.warnings).toHaveLength(0);
  });
  test('a locked lane hits along its length but leaves the side safe',()=>{
    const g=arena();g.player.x=5;g.player.z=2;
    g.warnings=[{kind:'line',x:0,z:0,angle:0,length:10,radius:.5,age:0,delay:1,duration:.3,damage:10}];
    g.updateWarnings(.8);expect(g.player.hp).toBe(100);
    g.updateWarnings(.21);expect(g.player.hp).toBe(100);
    g.player.z=0;g.warnings[0].tick=0;g.updateWarnings(.05);expect(g.player.hp).toBe(90);
  });
  test('emergency recovery stays marked even when the pack is under the city',()=>{
    const g=arena();g.player.hp=30;const pack=g.prop('medkit',.5,0);
    expect(navigationGoal(g)).toMatchObject({entity:pack,reward:true,literal:true});
  });
  test('core shielding absorbs damage, exhausts, and recharges only after its cooldown',()=>{
    const g=arena();g.player.rewardLevel=3;
    expect(applyPerk(g,'nexusWard')).toBe(true);g.hurt(12);
    expect(g.player.hp).toBe(100);expect(g.player.nexusShield).toBe(6);
    g.player.invuln=0;g.hurt(10);expect(g.player.hp).toBe(96);expect(g.player.nexusShield).toBe(0);
    g.update(6);expect(g.player.nexusShield).toBe(0);g.update(6);expect(g.player.nexusShield).toBe(18);
  });
  test('elite rewards clear nearby hazards and ordinary enemies cannot start new casts in a breather',()=>{
    const g=arena(),elite=g.spawnEnemy('elite',{x:0,z:0,spawning:0}),mage=g.spawnEnemy('mage',{x:5,z:0,spawning:0,cooldown:0});
    g.bullets=[{side:'enemy',x:2,z:0}];g.warnings=[{x:2,z:0,radius:1,age:0,delay:1,damage:10}];
    elite.state='gone';g.eliteReward(elite);expect(g.bullets).toHaveLength(0);expect(g.warnings).toHaveLength(0);
    g.director();mage.intent='move';mage.cooldown=0;g.enemyAI(mage,.1,5);expect(mage.intent).toBe('move');
  });
});
