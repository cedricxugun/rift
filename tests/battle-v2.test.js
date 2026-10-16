import { describe,test,expect } from 'bun:test';
import { BattleGame } from '../src/v2/game.js';
import { attackCandidates,canSwallow,segmentHitsCircle,OPENING_TIME } from '../src/v2/data.js';
import { applyPerk, rewardCost, eligiblePerks } from '../src/v2/perks.js';
import { purchaseModification, expeditionParts } from '../src/v2/workshop.js';

describe('Riftbound battle regressions',()=>{
  test('growth never removes a distant edible enemy from weapon targeting',()=>{
    const p={x:0,z:0,radius:2.3};
    const enemy={id:1,x:7,z:0,radius:.84,state:'alive',ward:0};
    expect(canSwallow(p,enemy)).toBe(true);
    expect(attackCandidates(p,[enemy],11)).toEqual([enemy]);
    enemy.state='eating';expect(attackCandidates(p,[enemy],11)).toEqual([]);
  });
  test('a large city still fires and damages small enemies at range',()=>{
    const game=new BattleGame(17);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;
    game.player.x=0;game.player.z=0;game.player.radius=2.3;
    const target=game.spawnEnemy('mortar',{x:5,z:0,radius:.8,hp:1000,maxHp:1000,speed:0,cooldown:999,spawning:0});
    for(let i=0;i<120;i++)game.update(1/60);
    expect(game.stats.shots).toBeGreaterThan(0);expect(target.hp).toBeLessThan(1000);
  });
  test('second and third cannon ranks change projectile count, not only a number label',()=>{
    const counts=[];
    for(const rank of [1,2,3]){
      const game=new BattleGame(2);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.x=0;game.player.z=0;game.player.modules.cannon=rank;
      game.spawnEnemy('golem',{x:5,z:0,hp:100000,maxHp:100000,speed:0,cooldown:999,spawning:0});
      for(let i=0;i<180;i++)game.update(1/60);
      counts.push(game.stats.shots);
    }
    expect(counts[1]).toBeGreaterThanOrEqual(counts[0]*2);
    expect(counts[2]).toBeGreaterThan(counts[1]);
  });
  test('fast projectiles cannot pass through the small player hitbox between frames',()=>{
    expect(segmentHitsCircle(-3,0,3,0,0,0,.32)).toBe(true);
    expect(segmentHitsCircle(-3,.8,3,.8,0,0,.32)).toBe(false);
  });
  test('bullet time still requires dodging and grants no invulnerability',()=>{
    const game=new BattleGame(1);game.start();game.activateBulletTime({x:1,z:0});
    expect(game.player.invuln).toBe(0);game.hurt(20);expect(game.player.hp).toBe(80);
  });
  test('a visible ward blocks swallowing until it is broken',()=>{
    const p={radius:3},enemy={radius:2,ward:10};expect(canSwallow(p,enemy)).toBe(false);enemy.ward=0;expect(canSwallow(p,enemy)).toBe(true);
  });
  test('wind defense has a projectile budget so it cannot trivialize every barrage',()=>{
    const game=new BattleGame();game.start();game.bullets=Array.from({length:12},(_,id)=>({id,side:'enemy',x:0,z:0}));
    game.enemyBulletClear(0,0,5,4);expect(game.bullets.length).toBe(8);expect(game.stats.erasedBullets).toBe(4);
  });
  test('standing still eventually loses after the protected opening',()=>{
    const game=new BattleGame(73021);game.start();
    for(let i=0;i<180*60&&game.mode==='playing';i++)game.update(1/60);
    expect(game.mode).toBe('result');expect(game.result.won).toBe(false);expect(game.stats.damageTaken).toBeGreaterThanOrEqual(100);
  });
  test('continuous frost hits cannot permanently prevent a boss from attacking',()=>{
    const game=new BattleGame(44);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.modules.ice=6;game.player.x=0;game.player.z=0;
    const boss=game.spawnEnemy('boss',{x:7,z:0,hp:100000,maxHp:100000,ward:0,maxWard:0,spawning:0,cooldown:0,speed:0});
    for(let i=0;i<360;i++){game.applyFrost(boss,3);game.update(1/60,{x:0,z:0});}
    expect(game.drainEvents().some(e=>e.type==='enemy-cast'||e.type==='enemy-shot')).toBe(true);
  });
  test('defeats drop an actual health pack and healing requires collecting it',()=>{
    const game=new BattleGame(5);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.supplyTime=999;game.player.x=0;game.player.z=0;game.player.hp=40;
    for(let i=0;i<6;i++){const enemy=game.spawnEnemy('beetle',{x:8,z:0,spawning:0});game.damage(enemy,999);}
    const pack=game.entities.find(e=>e.kind==='medkit');expect(pack).toBeDefined();expect(game.player.hp).toBe(40);
    game.player.x=pack.x;game.player.z=pack.z;
    for(let i=0;i<40;i++)game.update(1/60);
    expect(game.player.hp).toBe(54);expect(game.stats.healed).toBe(14);expect(pack.state).toBe('gone');
  });
  test('a scarce recovery building is preserved at full health and cannot overheal',()=>{
    const game=new BattleGame(7);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;
    const building=game.prop('heal',game.player.x,game.player.z);
    for(let i=0;i<40;i++)game.update(1/60);
    expect(building.state).toBe('alive');game.hurt(9);
    for(let i=0;i<40;i++)game.update(1/60);
    expect(building.state).toBe('gone');expect(game.player.hp).toBe(100);expect(game.stats.healed).toBe(9);
  });
  test('a single swallowed ruin reveals three choices and selecting one grants one reward',()=>{
    const game=new BattleGame(8);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.spawnShrine();
    const relics=game.entities.filter(e=>e.category==='shrine');expect(relics.length).toBe(1);expect(game.choiceOffers).toEqual([]);
    game.player.x=relics[0].x;game.player.z=relics[0].z;
    for(let i=0;i<40;i++)game.update(1/60);
    expect(relics[0].state).toBe('gone');expect(game.choiceOffers.length).toBe(3);
    const chosen=game.choiceOffers.find(e=>e.skill);const previous=game.player.modules[chosen.skill];
    expect(game.mode).toBe('choosing');const time=game.time;game.update(10);expect(game.time).toBe(time);
    expect(game.chooseShrine(-1)).toBe(false);expect(game.mode).toBe('choosing');
    expect(game.chooseShrine(chosen.id)).toBe(true);
    for(let i=0;i<40;i++)game.update(1/60);
    expect(game.player.modules[chosen.skill]).toBe(previous+1);expect(game.stats.upgrades).toBe(1);expect(game.choiceOffers).toEqual([]);expect(game.chooseShrine(chosen.id)).toBe(false);
  });
  test('the opening is safe and recovery intervals do not spawn ordinary enemies',()=>{
    const game=new BattleGame(3);game.start();game.entities=[];game.rewardCooldown=999;
    game.time=OPENING_TIME-.1;game.director();expect(game.entities.some(e=>e.category==='enemy')).toBe(false);
    game.time=OPENING_TIME;game.director();expect(game.entities.filter(e=>e.category==='enemy')).toHaveLength(2);
    const before=game.entities.filter(e=>e.category==='enemy').length;
    for(const time of [OPENING_TIME+40,OPENING_TIME+42,OPENING_TIME+44,OPENING_TIME+47.9]){game.time=time;game.director();}
    expect(game.pacing.rest).toBe(true);expect(game.entities.filter(e=>e.category==='enemy').length).toBe(before);
  });
  test('a projectile defeating the boss safely clears the rest of the barrage',()=>{
    const game=new BattleGame(31);game.start();game.entities=[];
    game.spawnEnemy('boss',{x:3,z:0,hp:1,maxHp:1,ward:0,maxWard:0,spawning:0});
    game.bullets=[0,1].map(id=>({id,side:'player',weapon:'cannon',x:2,z:0,vx:24,vz:0,life:1,radius:.19,damage:20,pierce:0,splash:0,hit:new Set()}));
    expect(()=>game.updateBullets(1/60)).not.toThrow();expect(game.mode).toBe('feast');expect(game.bullets).toEqual([]);
  });
  test('chain lightning hits only the available number of living targets',()=>{
    const game=new BattleGame(9);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.x=0;game.player.z=0;
    const targets=[4,6,8].map(x=>game.spawnEnemy('beetle',{x,z:0,hp:100,maxHp:100,spawning:0,speed:0,cooldown:999}));
    game.arsenal.lightning(targets[0],20,2);
    expect(targets[0].hp).toBe(80);expect(targets[1].hp).toBeLessThan(100);expect(targets[2].hp).toBe(100);
  });
  test('ice and fire unlock a real bounded steam explosion',()=>{
    const game=new BattleGame(10);game.start();game.entities=[];game.player.modules.ice=2;game.player.modules.ember=2;game.arsenal.refresh();
    const target=game.spawnEnemy('golem',{x:0,z:0,hp:1000,maxHp:1000,burn:2,spawning:0});
    const neighbor=game.spawnEnemy('golem',{x:1,z:0,hp:1000,maxHp:1000,spawning:0});
    game.applyFrost(target,1);expect(target.hp).toBe(859);expect(neighbor.hp).toBe(859);expect(game.stats.comboTriggers).toBe(1);
    target.burn=2;game.applyFrost(target,1);expect(game.stats.comboTriggers).toBe(1);
  });
  test('a meteor lands before its fire field deals continuing damage',()=>{
    const game=new BattleGame(11);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.x=0;game.player.z=0;game.cooldowns.cannon=999;
    const target=game.spawnEnemy('golem',{x:5,z:0,hp:1000,maxHp:1000,spawning:0,speed:0,cooldown:999});
    game.arsenal.meteor(target,60,2,true);game.update(.1);expect(target.hp).toBe(1000);
    for(let i=0;i<40;i++)game.update(1/60);
    const landed=target.hp;expect(landed).toBeLessThanOrEqual(940);expect(game.arsenal.fields.length).toBe(1);
    for(let i=0;i<36;i++)game.update(1/60);
    expect(target.hp).toBeLessThan(landed);
  });
  test('swallowing a ruin as the boss dies cannot interrupt the victory result',()=>{
    const game=new BattleGame(12);game.start();game.entities=[];
    const ruin=game.spawn({category:'shrine',kind:'relic',x:game.player.x,z:game.player.z,mass:4});game.beginEat(ruin);game.win();
    for(let i=0;i<13*60;i++)game.update(1/60);
    expect(game.mode).toBe('result');expect(game.result.won).toBe(true);expect(game.choiceOffers).toEqual([]);
  });
  test('skill ruins require swallowed energy and preserve overflow without duplicate ruins',()=>{
    const game=new BattleGame(4);game.start();game.entities=[];game.time=100;game.director();
    expect(game.entities.some(e=>e.category==='shrine')).toBe(false);
    game.addMass(17);expect(game.entities.some(e=>e.category==='shrine')).toBe(false);
    game.addMass(1);const ruin=game.entities.find(e=>e.category==='shrine');expect(ruin).toBeDefined();
    game.addMass(100);game.checkSkillReward();expect(game.entities.filter(e=>e.category==='shrine').length).toBe(1);
    game.beginEat(ruin);game.finishEat(ruin);game.chooseShrine(game.choiceOffers[0].id);
    expect(game.player.energy).toBe(100);expect(game.player.energyCost).toBe(rewardCost(1));
    game.time+=2;game.checkSkillReward();expect(game.entities.filter(e=>e.category==='shrine'&&e.state==='alive').length).toBe(1);
  });
  test('common movement upgrades change movement and respect their stack limit',()=>{
    const game=new BattleGame(8);game.start();const initial=game.player.speed;
    for(let i=0;i<3;i++)expect(applyPerk(game,'fleet')).toBe(true);
    expect(game.player.speed).toBeCloseTo(initial+1.35,5);expect(applyPerk(game,'fleet')).toBe(false);
    game.entities=[];const before=game.player.x;game.update(.1,{x:1,z:0});expect(game.player.x-before).toBeCloseTo(game.player.speed*.1,5);
  });
  test('only one core can define a build',()=>{
    const game=new BattleGame(8);game.start();game.player.rewardLevel=6;
    expect(applyPerk(game,'overdrive')).toBe(true);expect(applyPerk(game,'singularity')).toBe(false);expect(game.player.core).toBe('overdrive');
  });
  test('releasing movement before bullet time preserves the ice burst direction',()=>{
    const game=new BattleGame(9);game.start();game.entities=[];game.update(.1,{x:-1,z:0});game.update(.1,{x:0,z:0});game.player.aim=0;
    game.player.route='frost';game.player.shards=1;game.activateBulletTime({x:0,z:0});
    expect(game.shots).toHaveLength(1);expect(Math.cos(game.shots[0].angle)).toBeCloseTo(-1,5);expect(Math.sin(game.shots[0].angle)).toBeCloseTo(0,5);
  });
  test('drafts contain a weapon and a numerical option without duplicate rewards',()=>{
    const game=new BattleGame(19);game.start();game.player.rewardLevel=6;game.player.path='harbor_lance';
    const offers=game.rollSkillOffers();expect(offers.length).toBe(3);expect(offers.some(e=>e.skill)).toBe(true);expect(offers.some(e=>e.kind==='stat')).toBe(true);
    expect(new Set(offers.map(e=>e.skill||e.perk||e.buff)).size).toBe(3);expect(offers.some(e=>e.kind==='core'&&e.rarity==='epic')).toBe(true);
    game.player.rewardLevel=0;const opening=game.rollSkillOffers();expect(opening.filter(e=>e.kind==='stat').length).toBe(1);expect(opening.filter(e=>e.kind==='weapon'||e.kind==='barrage').length).toBe(2);
  });
  test('barrage cards change the emitted projectiles',()=>{
    const game=new BattleGame(20);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.rewardLevel=3;game.player.critChance=0;
    applyPerk(game,'frontShot');applyPerk(game,'piercing');applyPerk(game,'rebound');
    game.spawnEnemy('golem',{x:game.player.x+6,z:game.player.z,hp:100000,maxHp:100000,speed:0,spawning:0,cooldown:999});
    game.cooldowns.cannon=0;game.update(1/60);
    const bullets=game.bullets.filter(b=>b.side==='player');expect(bullets.length).toBe(2);expect(bullets.every(b=>b.pierce===1&&b.ricochet)).toBe(true);
  });
  test('overdrive increases firing frequency rather than just adding a label',()=>{
    const counts=[];
    for(const core of [false,true]){
      const game=new BattleGame(21);game.start();game.entities=[];game.nextSpawn=999;game.rewardCooldown=999;game.player.rewardLevel=6;
      if(core)applyPerk(game,'overdrive');
      game.spawnEnemy('golem',{x:game.player.x+6,z:game.player.z,hp:100000,maxHp:100000,speed:0,spawning:0,cooldown:999});
      for(let i=0;i<240;i++)game.update(1/60);
      counts.push(game.stats.shots);
    }
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });
  test('workshop spending persists between runs while run modifiers reset',()=>{
    const profile={parts:100,workshop:{}};
    expect(purchaseModification(profile,'chassis')).toBe(true);expect(profile.parts).toBe(75);
    const game=new BattleGame(1);game.start(1,profile);expect(game.player.speed).toBeCloseTo(6.592,5);
    applyPerk(game,'fleet');expect(game.player.speed).toBeGreaterThan(6.592);
    game.start(2,JSON.parse(JSON.stringify(profile)));expect(game.player.speed).toBeCloseTo(6.592,5);expect(game.player.perks).toEqual({});
    profile.parts=0;expect(purchaseModification(profile,'armor')).toBe(false);expect(profile.parts).toBe(0);
  });
  test('expedition progress earns parts and victory has a larger reward',()=>{
    const stats={kills:90,elites:2};
    const lost=expeditionParts(300,stats,false),won=expeditionParts(300,stats,true);
    expect(lost).toBeGreaterThan(0);expect(won).toBe(lost+45);expect(expeditionParts(0,{kills:0,elites:0},false)).toBe(0);
  });
  test('drafts avoid growth at full size and area bonuses without an area weapon',()=>{
    const game=new BattleGame(22);game.start();
    expect(eligiblePerks(game.player)).not.toContain('reach');expect(eligiblePerks(game.player)).toContain('appetite');
    game.player.modules.wind=1;game.player.level=6;
    expect(eligiblePerks(game.player)).toContain('reach');expect(eligiblePerks(game.player)).not.toContain('appetite');
  });
});
