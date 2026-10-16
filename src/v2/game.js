import { WORLD, GROWTH, SKILLS, CANNON_RANKS, EVOLUTIONS, ENEMIES, PROP_DEFS, BOSS_TIME, OPENING_TIME, ELITE_RECOVERY, ELITE_TIMES, encounterPace, growthForMass, canSwallow, attackCandidates, withinCombatView, segmentHitsCircle, rankInfo, createRng } from './data.js';

const TAU = Math.PI * 2;
import { Arsenal } from './arsenal.js';
import { PERKS, RARITIES, eligiblePerks, rewardCost, weaponRarity, applyPerk } from './perks.js';
import { equipWorkshop, expeditionParts } from './workshop.js';
import { ROUTES, BRANCHES, MASTERY_NODES, EVOLUTION_ASPECTS, ownedWeapons, canLearnWeapon, branchOffers, masteryFor, comboRecommendations } from './skill-graph.js';
import { RouteMechanics } from './route-mechanics.js';
import { Expedition } from './expedition.js';
import { Harvest } from './harvest.js';
import { EnemyPatterns } from './enemy-patterns.js';
import { energyCoreRadius, weaponMount } from './weapon-rig.js';
import { expeditionStage, BULLET_TIME, ELITE_ROSTER } from './data.js';
import {hazardHits} from './hazards.js';
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class BattleGame {
  constructor(seed = 73021) {
    this.view = { halfWidth: 18, halfHeight: 16 };
    this.reset(seed);
  }

  reset(seed) {
    this.seed = seed; this.random = createRng(seed); this.nextId = 1;
    this.mode = 'title'; this.previousMode = 'playing'; this.time = 0;this.playerTime=0;
    this.entities = []; this.bullets = []; this.warnings = []; this.shots = []; this.events = [];
    this.wave = 0; this.nextSpawn = OPENING_TIME; this.eliteIndex = 0;this.pacingStart=OPENING_TIME;this.packIndex=0;
    this.rewardPending=false;this.rewardCooldown=0;this.coreOffered=false;
    this.bossSpawned = false; this.bossDefeated = false; this.feastTime = 0; this.corePending = 0;
    this.shrineGroups = 0; this.supplyTime = 70; this.killHealCooldown = 0;
    this.killsSinceHealthPack = 0; this.choiceOffers = []; this.breatherUntil = 0;
    this.arsenal=new Arsenal(this);
    this.routeMechanics=new RouteMechanics(this);this.expedition=new Expedition(this);
    this.harvest=new Harvest(this);this.enemyPatterns=new EnemyPatterns(this);this.stage=expeditionStage(0);
    this.pacing = encounterPace(0); this.wasResting = true;
    this.player = {
      x: 0, z: 7, radius: .78, visualRadius: .78, level: 1, mass: 0,
      hp: 100, maxHp: 100, power: 1, haste: 1, speed: 6.4,
      energy:0,energyCost:rewardCost(0),rewardLevel:0,energyGain:1,massGain:1,healPower:1,area:1,
      critChance:.1,critMultiplier:1.65,perks:{},core:null,overdrive:0,
      collectionBonus:0,
      salvageStacks:0,salvageTimer:0,harvestRush:0,branchDeferredUntil:0,nexusShield:0,nexusShieldCooldown:0,
      route:'harbor',path:null,mastery:null,routeCharge:0,routeGain:1,routeCooldown:0,routeFlash:0,shards:0,rerolls:2,
      modules: { cannon: 1, ice: 0, wind: 0, lightning: 0, ember: 0, summon:0, roots:0 }, weaponOrder:['cannon'], evolution: null, evolutionRank: 0, cityImprovements:{},
      moving: 0, vx: 0, vz: 0, aim: -Math.PI / 2, moveAim:-Math.PI/2,recoil: 0,
      invuln: 0, bulletTimeRemaining: 0, bulletTimeCooldown: 0,buildPulse:0,
    };
    this.cooldowns = { cannon: .3, ice: .8, wind: 1.2, nova: 5, lance: 4, blade: 0, shield: 6 };
    this.stats = { eaten: 0, kills: 0, direct: 0, shots: 0, enemyVolleys: 0, hostileShots: 0, bossVolleys: 0, damageTaken: 0, damageDealt: 0, bulletTimes: 0, erasedBullets: 0, upgrades: 0, elites: 0, healed: 0, healthPacks: 0 };
    this.stats.comboTriggers=0;this.stats.routeBursts=0;this.stats.guardianBlocks=0;this.stats.eventsCompleted=0;this.score = 0; this.standingTime = 0; this.longestIdle = 0; this.result = null;
    Object.assign(this.stats,{rallies:0,guardianStrikes:0,guardiansLost:0,guardianIntercepts:0,rootBlooms:0,damageByWeapon:{},comboDamage:{},comboHits:{}});
    this.generateWorld();
  }

  start(seed = this.seed,profile={},route=profile.route||'harbor') {
    this.reset(seed);this.player.route=ROUTES[route]?route:'harbor';
    for(const skill of Object.keys(this.player.modules))this.player.modules[skill]=0;
    this.player.modules[ROUTES[this.player.route].primary]=1;
    this.player.weaponOrder=[ROUTES[this.player.route].primary];
    equipWorkshop(this.player,profile);this.harvest.opening();this.rewardCooldown=7;this.mode='playing';this.emit('stage',{title:this.stage});
  }
  rng(min, max) { return min + this.random() * (max - min); }
  emit(type, payload = {}) { if (this.events.length < 650 || ['result','shrine-choice','evolution-choice','perk','upgrade','evolution','victory','branch','mastery'].includes(type)) this.events.push({ type, time: this.time, ...payload }); }
  drainEvents() { const events = this.events; this.events = []; return events; }

  spawn(entity) {
    const e = { id: this.nextId++, state: 'alive', x: 0, z: 0, radius: .35, mass: 0, hp: 0, maxHp: 0, ward: 0, maxWard: 0, spawning: 0, age: 0, flash: 0, frozen: 0, frostStacks: 0, slow: 0, ...entity };
    this.entities.push(e); return e;
  }

  prop(kind, x, z, extra = {}) {
    if(kind==='medkit'){
      const recoverySource=extra.recoverySource||'combat';
      const packs=this.entities.filter(e=>e.kind==='medkit'&&e.state==='alive');
      if(packs.length>=3){
        if(recoverySource==='combat')return null;
        const replaced=packs.sort((a,b)=>Number(a.recoverySource!=='combat')-Number(b.recoverySource!=='combat')||b.age-a.age)[0];
        replaced.state='gone';
      }
      extra={...extra,recoverySource,expiresAfter:recoverySource==='combat'?40:null};
    }
    const hp = kind === 'house' ? 120 : kind === 'tower' ? 220 : kind === 'ruin' ? 320 : kind==='oak'?65:0;
    return this.spawn({ category: 'prop', kind, ...PROP_DEFS[kind], x, z, hp, maxHp: hp, yaw: this.rng(-.05, .05), ...extra });
  }

  generateWorld() {
    const sceneRandom=createRng(6617);
    for(let i=0;i<36;i++)this.prop(i%3===0?'shrub':i%4===0?'oak':'flowers',(sceneRandom()-.5)*48,(sceneRandom()-.5)*48);
    [[0,5.6],[.6,4.5],[-.4,3.4],[.6,2.3],[-.6,1.5],[0,.3]].forEach(([x,z]) => this.prop('crate',x,z,{mass:3}));
    for (let i = 0; i < 48; i++) {
      const kind = ['crate','barrel','ore','tree'][Math.floor(this.random() * 4)];
      const x = this.rng(-24,24), z = this.rng(-23,24);
      if (Math.abs(x) < 2 && z > -2 && z < 10) continue;
      this.prop(kind,x,z);
    }
    for (let i = 0; i < 10; i++) this.prop(i % 5 === 0 ? 'tower' : 'house', this.rng(-23,23),this.rng(-24,23));
    [[-12,-12],[14,-14],[-15,13],[15,12]].forEach(([x,z],i) => {
      this.prop(i % 2 ? 'clock' : 'forge',x,z);
      if(i<3)this.prop('heal',x + 2,z + 2);
    });
    for (let i = 0; i < 3; i++) this.prop('ruin',this.rng(-25,25),this.rng(-25,25));
  }

  spawnEnemy(kind, options = {}) {
    const p=this.player,def=ENEMIES[kind];
    const special=kind==='boss'||ELITE_ROSTER.includes(kind)||options.elite;
    let angle=this.rng(0,TAU);
    if(!special&&options.x===undefined&&this.time>=20&&Math.hypot(p.vx,p.vz)>.1&&this.random()<.65)angle=Math.atan2(p.vz,p.vx)+this.rng(-1.15,1.15);
    const sx = Math.min(this.view.halfWidth + 1.5,16), sz = Math.min(this.view.halfHeight + 1,15);
    let x=0,z=0;
    for(let attempt=0;attempt<8;attempt++){
      x=clamp(p.x+Math.cos(angle)*sx,-25,25);z=clamp(p.z+Math.sin(angle)*sz,-25,25);
      if(Math.hypot(x-p.x,z-p.z)>=6.2)break;
      angle+=Math.PI/4;
    }
    const scale = 1 + this.time*.006 + this.time*this.time/90000;
    const hp = options.hp ?? def.hp * (special ? 1 : scale);
    const e = this.spawn({ category: 'enemy', kind, ...def, x, z, hp, maxHp: hp,
      damage:def.damage*(special?1:this.time<45?.75:this.time<120?.9:1),
      mass: def.mass, ward: special ? hp * .1 : 0, maxWard: special ? hp * .1 : 0,
      cooldown: this.rng(.9,1.5), intent: 'move', stateTimer: 0, facing: 0,
      spawning: .8, elite: special && kind !== 'boss', boss: kind === 'boss',
      attackIndex: 0, phase: 1, frostStacks: 0, controlLock: 0, bladeHit: 0, ...options });
    this.emit('spawn',{x:e.x,z:e.z,radius:e.radius});
    return e;
  }

  spawnShrine() {
    const p = this.player;
    const existing = this.entities.filter(e=>e.category==='shrine' && e.state!=='gone');
    if (existing.length||this.rewardPending||this.bossDefeated) return;
    this.shrineGroups++;
    const x=clamp(p.x+this.rng(-1.6,1.6),-21,21),z=clamp(p.z-4.8,-23,23);
    this.spawn({category:'shrine',kind:'relic',x,z,radius:.45,mass:4,group:this.shrineGroups});
    this.rewardPending=true;this.emit('shrine',{x,z});
  }

  checkSkillReward(){
    if(this.mode==='playing'&&!this.bossDefeated&&!this.rewardPending&&this.player.energy>=this.player.energyCost&&this.time>=this.rewardCooldown)this.spawnShrine();
  }

  pickWeighted(pool){
    if(!pool.length)return null;
    let remaining=this.random()*pool.reduce((sum,e)=>sum+(e.weight||RARITIES[e.rarity].weight),0);
    for(const entry of pool){remaining-=entry.weight||RARITIES[entry.rarity].weight;if(remaining<=0)return entry;}
    return pool.at(-1);
  }

  rollSkillOffers(excluded=[]){
    const p=this.player;
    const primary=ROUTES[p.route].primary;
    if(p.rewardLevel>=Math.max(4,p.branchDeferredUntil||0)&&!p.path){
      const perk=this.pickWeighted(eligiblePerks(p).filter(id=>PERKS[id].kind==='stat').map(perk=>({perk,rarity:PERKS[perk].rarity})))?.perk;
      const third=perk?{perk,kind:'stat',rarity:'uncommon',deferBranch:true}:{buff:'heal',kind:'stat',rarity:'common',deferBranch:true};
      return [...branchOffers(p),third].map(e=>({...e,id:this.nextId++}));
    }
    const weapons=Object.keys(SKILLS).filter(s=>p.modules[s]<SKILLS[s].max&&canLearnWeapon(p,s)).map(skill=>({skill,rarity:weaponRarity(p.modules[skill]+1),kind:'weapon'}));
    const perks=eligiblePerks(p).map(perk=>({perk,rarity:PERKS[perk].rarity,kind:PERKS[perk].kind}));
    const owned=weapons.filter(e=>p.modules[e.skill]>0);
    const offers=[];
    const completing=weapons.filter(e=>!excluded.includes(e.skill)&&comboRecommendations(p,e.skill).some(c=>c.unlocks));
    const shaping=owned.filter(e=>comboRecommendations(p,e.skill).some(c=>c.order>0&&c.order<=2&&Object.keys(c.needs).every(s=>p.modules[s]>0)));
    const weaponPool=completing.length?completing:shaping.length?shaping:owned.length&&this.random()<.65?owned:weapons;
    const freshWeapons=weaponPool.filter(e=>!excluded.includes(e.skill));
    const first=p.rewardLevel===0&&!excluded.includes(primary)?weapons.find(e=>e.skill===primary):this.pickWeighted(freshWeapons.length?freshWeapons:weaponPool);if(first)offers.push(first);
    const statPool=perks.filter(e=>e.kind==='stat'),freshStats=statPool.filter(e=>!excluded.includes(e.perk));
    const second=this.pickWeighted(freshStats.length?freshStats:statPool);if(second)offers.push(second);
    const cores=perks.filter(e=>e.kind==='core');
    if(cores.length&&(!this.coreOffered||this.random()<.2)){offers.push(this.pickWeighted(cores));this.coreOffered=true;}
    const mastery=masteryFor(p);
    if(offers.length<3&&mastery&&!p.mastery&&p.rewardLevel>=7)offers.push({mastery,kind:'mastery',rarity:'epic'});
    const pool=[...weapons,...perks.filter(e=>e.kind==='barrage'||e.kind==='tactic')].filter(e=>!offers.includes(e)&&!excluded.includes(e.skill||e.perk));
    if(offers.length<3&&p.rewardLevel<=1){
      const newForms=pool.filter(e=>['summon','roots'].includes(e.skill)&&p.modules[e.skill]===0);
      const partner=newForms.length?newForms[((this.seed>>>0)+p.rewardLevel)%newForms.length]:pool.find(e=>e.skill===ROUTES[p.route].partner);
      if(partner){offers.push(partner);pool.splice(pool.indexOf(partner),1);}
    }
    while(offers.length<3&&pool.length){
      const links=pool.filter(e=>e.skill&&comboRecommendations(p,e.skill).some(c=>c.needs[e.skill]>p.modules[e.skill]&&c.order<=2));
      const entry=this.pickWeighted(links.length&&this.random()<.65?links:pool);offers.push(entry);pool.splice(pool.indexOf(entry),1);
    }
    const remaining=perks.filter(e=>!offers.includes(e));
    while(offers.length<3&&remaining.length){const entry=this.pickWeighted(remaining);offers.push(entry);remaining.splice(remaining.indexOf(entry),1);}
    while(offers.length<3)offers.push({buff:['power','health','heal'][offers.length],rarity:'common',kind:'stat'});
    return offers.map(offer=>({id:this.nextId++,...offer,...(offer.perk&&PERKS[offer.perk].stat?{rarity:this.pickWeighted(Object.entries(RARITIES).filter(([id])=>id!=='legendary').map(([rarity])=>({rarity}))).rarity}:{})}));
  }

  rerollShrine(){
    if(this.mode!=='choosing'||this.player.rerolls<=0||this.choiceOffers.some(e=>e.path))return false;
    const excluded=this.choiceOffers.map(e=>e.skill||e.perk);this.player.rerolls--;this.choiceOffers=this.rollSkillOffers(excluded);return true;
  }

  chooseShrine(id) {
    if(this.mode!=='choosing')return false;
    const chosen=this.choiceOffers.find(e=>e.id===Number(id));
    if(!chosen)return false;
    const p=this.player;
    this.choiceOffers=[];this.mode='playing';p.invuln=Math.max(p.invuln,1.5);
    p.energy=Math.max(0,p.energy-p.energyCost);p.rewardLevel++;p.energyCost=rewardCost(p.rewardLevel);
    this.rewardPending=false;this.rewardCooldown=this.time+1.5;
    if(chosen.deferBranch)p.branchDeferredUntil=p.rewardLevel+2;
    if(chosen.path){p.path=chosen.path;this.stats.upgrades++;this.emit('branch',{id:p.path,x:p.x,z:p.z});}
    else if(chosen.mastery){p.mastery=chosen.mastery;this.stats.upgrades++;this.emit('mastery',{id:p.mastery,x:p.x,z:p.z});}
    else if(chosen.skill)this.upgrade(chosen.skill);else if(chosen.perk)applyPerk(this,chosen.perk,chosen.rarity);else this.gainBuff(chosen.buff);
    return true;
  }

  beginEat(entity) {
    if(entity.state!=='alive')return;
    entity.state='eating';entity.eatTime=0;
    entity.startX=entity.x;entity.startZ=entity.z;
    this.emit('eat',{x:entity.x,z:entity.z,radius:entity.radius});
    if(entity.category==='enemy') {
      this.releaseRelay(entity);
      this.stats.kills++;this.stats.direct++;this.score+=entity.score;
      if(entity.elite) this.eliteReward(entity);else if(!entity.boss)this.healthDrop(entity);
      if(entity.boss) this.win();
    }
    if(entity.category==='shrine') {
      for(const other of this.entities)if(other!==entity && other.group===entity.group && other.state==='alive')other.state='gone';
    }
  }

  finishEat(entity) {
    entity.state='gone';this.stats.eaten++;this.score+=Math.round(entity.mass*8);
    this.addMass(entity.mass,entity.category!=='shrine',entity.category==='enemy'||entity.combatDrop?2:1);
    this.routeMechanics.consume(entity);
    this.harvest.collect(entity);
    if(entity.eventType)this.expedition.claim(entity);
    if(entity.healing){this.heal(entity.healing*this.player.healPower);if(entity.kind==='medkit')this.stats.healthPacks++;}
    if(entity.buff)this.gainBuff(entity.buff);
    if(entity.skill)this.upgrade(entity.skill);
    if(entity.category==='shrine'){
      this.choiceOffers=this.rollSkillOffers();this.mode='choosing';this.player.moving=0;this.emit('shrine-choice');
    }
    if(entity.category==='core') {
      this.corePending++;
      this.mode='evolving';this.emit('evolution-choice');
    }
  }

  addMass(amount,awardEnergy=true,energyMultiplier=1) {
    const p=this.player;p.mass+=amount*p.massGain;
    if(awardEnergy)p.energy+=amount*p.energyGain*energyMultiplier;
    const growth=growthForMass(p.mass);
    if(growth.level>p.level){const previousLevel=p.level;p.level=growth.level;p.radius=this.mode==='feast'?Math.max(p.radius,growth.radius):growth.radius;p.maxHp+=8;this.emit('grow',{level:p.level,previousLevel,x:p.x,z:p.z,radius:p.radius});}
    this.checkSkillReward();
  }

  upgrade(skill) {
    const p=this.player,previous=p.modules[skill];
    if(!canLearnWeapon(p,skill))return false;
    if(previous>=SKILLS[skill].max){this.gainBuff('power');return;}
    if(previous===0&&!p.weaponOrder.includes(skill))p.weaponOrder.push(skill);
    p.modules[skill]++;this.stats.upgrades++;
    p.invuln=Math.max(p.invuln,1.3);
    this.cooldowns[skill]=.04;
    this.emit('upgrade',{skill,previous,rank:p.modules[skill],...rankInfo(skill,p.modules[skill]),x:p.x,z:p.z});
    this.arsenal.refresh();
  }

  gainBuff(buff){
    const p=this.player;
    if(buff==='power')p.power+=.18;
    if(buff==='haste')p.haste+=.12;
    if(buff==='speed')p.speed+=.35;
    if(buff==='health'){p.maxHp+=15;this.heal(25);}
    if(buff==='heal')this.heal(30);
    this.stats.upgrades++;
    this.emit('buff',{buff,x:p.x,z:p.z});
  }

  evolve(key){
    if(this.mode!=='evolving'||!this.corePending||!EVOLUTION_ASPECTS[key])return false;
    const p=this.player,route=ROUTES[p.route];p.evolution=route.evolution;p.evolutionRank++;this.corePending--;
    p.cityImprovements[key]=(p.cityImprovements[key]||0)+1;
    if(key==='armory'){
      this.upgrade(route.primary);
      const companion=ownedWeapons(p).filter(s=>s!==route.primary).sort((a,b)=>p.modules[b]-p.modules[a])[0];
      if(companion)this.upgrade(companion);
    }else if(key==='engine'){p.speed+=.4;p.routeGain+=.2;this.stats.upgrades++;}
    else{p.maxHp+=20;p.healPower+=.15;this.prop('medkit',p.x+1.5,p.z,{healing:24,recoverySource:'upgrade'});this.stats.upgrades++;}
    p.invuln=2;this.mode='playing';
    this.emit('evolution',{key:p.evolution,aspect:key,rank:p.evolutionRank,x:p.x,z:p.z});
    this.arsenal.refresh();
    this.enemyBulletClear(p.x,p.z,10);return true;
  }

  get worldTimeScale(){return this.player.bulletTimeRemaining>0?BULLET_TIME.worldScale:1;}

  activateBulletTime(input={}){
    const p=this.player;
    if(this.mode!=='playing'||p.bulletTimeCooldown>0||p.bulletTimeRemaining>0)return false;
    const x=input.x??p.vx,z=input.z??p.vz;
    if(Math.hypot(x,z)>.1)p.moveAim=Math.atan2(z,x);
    p.bulletTimeRemaining=BULLET_TIME.duration;p.bulletTimeCooldown=BULLET_TIME.cooldown;this.stats.bulletTimes++;
    this.emit('bullet-time-start',{x:p.x,z:p.z});
    this.routeMechanics.timeBurst();return true;
  }

  update(dt,input={x:0,z:0}){
    const p=this.player;
    p.visualRadius+=(p.radius-p.visualRadius)*Math.min(1,dt*6);
    if(!['playing','feast'].includes(this.mode)){p.moving=0;return;}
    if(input.bulletTime)this.activateBulletTime(input);
    const slowed=Math.min(dt,p.bulletTimeRemaining),worldDt=dt-slowed+slowed*BULLET_TIME.worldScale;
    const wasBulletTime=p.bulletTimeRemaining>0;
    p.bulletTimeRemaining=Math.max(0,p.bulletTimeRemaining-dt);
    if(p.bulletTimeRemaining<1e-8)p.bulletTimeRemaining=0;
    p.bulletTimeCooldown=Math.max(0,p.bulletTimeCooldown-dt);
    if(p.bulletTimeCooldown<1e-8)p.bulletTimeCooldown=0;
    if(wasBulletTime&&!p.bulletTimeRemaining)this.emit('bullet-time-end',{x:p.x,z:p.z});
    this.time+=worldDt;this.playerTime+=dt;
    p.invuln=Math.max(0,p.invuln-dt);p.recoil=Math.max(0,p.recoil-dt*7);
    p.buildPulse=Math.max(0,p.buildPulse-dt*2);
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]-=dt;
    this.killHealCooldown-=worldDt;
    p.nexusShieldCooldown=Math.max(0,p.nexusShieldCooldown-dt);
    if(p.perks.nexusWard&&p.nexusShieldCooldown===0)p.nexusShield=18;
    let dx=input.x||0,dz=input.z||0,length=Math.hypot(dx,dz);
    if(length>1){dx/=length;dz/=length;}
    p.harvestRush=Math.max(0,p.harvestRush-dt);
    let speed=p.speed*(p.harvestRush>0?1.18:1);
    p.vx=dx;p.vz=dz;p.moving=Math.hypot(dx,dz);
    if(p.moving>.1)p.moveAim=Math.atan2(dz,dx);
    p.x=clamp(p.x+dx*speed*dt,WORLD.minX+.6,WORLD.maxX-.6);
    p.z=clamp(p.z+dz*speed*dt,WORLD.minZ+.6,WORLD.maxZ-.6);
    this.standingTime=p.moving<.1?this.standingTime+dt:0;this.longestIdle=Math.max(this.longestIdle,this.standingTime);
    if(this.mode==='playing')this.director();
    for(const entity of this.entities){
      if(entity.state==='gone')continue;
      entity.age+=worldDt;entity.flash=Math.max(0,entity.flash-dt);
      if(entity.state==='alive'&&entity.expiresAfter&&entity.age>=entity.expiresAfter){entity.state='gone';continue;}
      if(entity.state==='eating'){
        entity.eatTime+=dt;entity.x+=(p.x-entity.x)*dt*7;entity.z+=(p.z-entity.z)*dt*7;
        if(entity.eatTime>.52){this.finishEat(entity);if(!['playing','feast'].includes(this.mode))return;}
        continue;
      }
      const distance=dist(entity,p);
      if(entity.category==='enemy')this.enemyAI(entity,worldDt,distance);
      if(entity.state!=='alive')continue;
      if(entity.category==='shrine'){
        if(distance<p.radius+.35)this.beginEat(entity);
        else if(distance<Math.max(4.2,p.radius+2.1)){
          const pull=Math.min(distance,8.5*dt);
          entity.x+=(p.x-entity.x)/distance*pull;entity.z+=(p.z-entity.z)/distance*pull;
        }
        continue;
      }
      if(entity.healing&&p.hp>=p.maxHp)continue;
      if(canSwallow(p,entity)&&(entity.category!=='enemy'||entity.spawning<=0)){
        if(distance<p.radius*.82){this.beginEat(entity);continue;}
        const range=p.radius+.55+(entity.category==='enemy'?0:p.collectionBonus)+(p.modules.wind?1.4+p.modules.wind*.35:0)+(entity.harvest?1.25:0)+(p.harvestRush>0?1:0);
        if(distance<range){const force=(entity.category==='enemy'?1.5:3.3)+(p.modules.wind*.55);entity.x+=(p.x-entity.x)/distance*force*dt;entity.z+=(p.z-entity.z)/distance*force*dt;}
      }
    }
    if(this.mode==='playing'){this.expedition.update(worldDt);this.weapons(dt);this.arsenal.update(dt,worldDt);if(this.mode==='playing')this.routeMechanics.update(dt);}
    this.enemyPatterns.update(worldDt);this.updateShots(dt);this.updateBullets(dt,worldDt);this.updateWarnings(worldDt);
    if(this.mode==='feast'){this.feastTime-=dt;if(this.feastTime<=0)this.finish(true);}
    if(this.entities.length>550)this.entities=this.entities.filter(e=>e.state!=='gone'&&!(e.fragment&&e.age>25&&dist(e,p)>20));
  }

  beginDuel(special){
    this.expedition.clear();
    for(const e of this.entities){
      if(e.category!=='enemy'||e===special||e.state!=='alive'||e.elite||e.boss)continue;
      this.releaseRelay(e);e.state='gone';
    }
    this.enemyBulletClear(this.player.x,this.player.z,100);
    this.warnings=[];this.enemyPatterns.pending=[];
    special.duel=true;this.nextSpawn=this.time+3;
    this.emit('duel',{kind:special.kind,x:special.x,z:special.z});
  }

  director(){
    const stage=expeditionStage(this.time);
    if(stage!==this.stage){this.stage=stage;this.emit('stage',{title:stage});}
    const wave=Math.floor(this.time/25)+1;
    if(wave!==this.wave){this.wave=wave;this.emit('wave',{wave,title:this.time<150?'The meadow wakes':this.time<330?'The hunt':this.time<BOSS_TIME?'The siege':'The hollow throne'});}
    this.checkSkillReward();
    if(this.time>=this.supplyTime){
      this.supplyTime=this.time+70;
      const x=clamp(this.player.x+this.rng(-6,6),-23,23),z=clamp(this.player.z+this.rng(-6,6),-23,23);
      this.prop('cart',x,z);
      this.emit('supply',{x,z});
    }
    const duelInProgress=this.entities.some(e=>e.category==='enemy'&&e.state==='alive'&&(e.elite||e.boss));
    if(!duelInProgress&&this.time>=BOSS_TIME&&!this.bossSpawned&&this.time>=this.breatherUntil){
      this.bossSpawned=true;
      this.boss=this.spawnEnemy('boss',{x:clamp(this.player.x,-12,12),z:clamp(this.player.z-11,-21,21),spawning:2});
      this.beginDuel(this.boss);this.emit('boss',{name:'The hollow king'});
    }else if(!duelInProgress&&!this.bossSpawned&&this.time>=this.breatherUntil&&this.eliteIndex<ELITE_TIMES.length&&this.time>=ELITE_TIMES[this.eliteIndex]){
      const kind=ELITE_ROSTER[((this.seed>>>0)+this.eliteIndex)%ELITE_ROSTER.length];
      const health=[6000,18000,30000][this.eliteIndex];
      const elite=this.spawnEnemy(kind,{hp:health,elite:true,...(this.eliteIndex===2?{radius:3.25,veteran:true}:{} )});
      this.beginDuel(elite);
      this.eliteIndex++;this.emit('elite',{kind});
    }
    const alive=this.entities.filter(e=>e.category==='enemy'&&e.state==='alive');
    const special=alive.find(e=>e.elite||e.boss);
    this.pacing=encounterPace(this.time,this.pacingStart);
    if(special)this.pacing={...this.pacing,rest:false,remaining:0};
    if(this.pacing.rest&&!this.wasResting&&!special){this.harvest.recovery();this.emit('breather');}
    if(!this.pacing.rest&&this.wasResting&&!special)this.emit('incoming');
    this.wasResting=this.pacing.rest;
    // Special encounters are duels. No ambient pack or event guard can refill them.
    if(special){this.nextSpawn=Math.max(this.nextSpawn,this.time+3);return;}
    if(this.pacing.rest||this.time<this.nextSpawn)return;
    this.nextSpawn=this.time+this.pacing.interval;this.packIndex++;
    const tier=Math.max(0,Math.min(3,Math.floor(this.time/140)));
    const limit=this.pacing.cap;
    const ordinary=alive.filter(e=>!e.elite&&!e.boss);
    let veteranCount=ordinary.filter(e=>e.veteran).length;
    let rangedCount=ordinary.filter(e=>['mage','mortar','golem','herald'].includes(e.kind)).length;
    let heraldCount=ordinary.filter(e=>e.kind==='herald').length;
    for(let i=0;i<this.pacing.count&&ordinary.length+i<limit;i++){
      const r=this.random();
      let kind=r<.42?'beetle':r<.66?'ram':r<.8?'mortar':r<.94?'mage':'golem';
      if(i===0&&this.time>=25)kind=['ram','mortar','mage','golem'][this.packIndex%4];
      if(kind==='golem'&&this.time<100)kind='ram';
      if(kind==='mage'&&this.time<55)kind='beetle';
      if(kind==='mortar'&&this.time<25)kind='beetle';
      if(this.time<18)kind='beetle';
      if(i===0&&this.time>=65&&!heraldCount&&this.packIndex%4===0){kind='herald';heraldCount++;}
      if(['mage','mortar','golem','herald'].includes(kind)&&rangedCount>=4)kind='ram';
      if(['mage','mortar','golem','herald'].includes(kind))rangedCount++;
      const veteran=kind!=='herald'&&tier>0&&veteranCount<(tier>=3?3:2)&&this.random()<.2+tier*.08;
      const hp=ENEMIES[kind].hp*(1+this.time*.006+this.time*this.time/90000)*(veteran?1.7:1);
      const armored=kind==='herald'||kind==='mage'||kind==='mortar'||kind==='golem'||veteran;
      const ward=armored?hp*(kind==='herald'?.45:veteran?.4:.22):0;
      if(veteran){
        veteranCount++;
        this.spawnEnemy(kind,{veteran:true,hp,maxHp:hp,ward,maxWard:ward,spawning:1.05,cooldown:1.15,radius:Math.min(3.15,ENEMIES[kind].radius*(tier>=2?1.6:1.35))});
      }else{
        this.spawnEnemy(kind,{hp,maxHp:hp,ward,maxWard:ward});
      }
    }
  }

  weapons(dt){
    const p=this.player,rank=p.modules.cannon,info=CANNON_RANKS[rank]||CANNON_RANKS[1],haste=p.haste*(p.overdrive>0?1.8:1)*(1+p.salvageStacks*.08),extra=p.perks.frontShot||0,shotPower=Math.pow(.87,extra),siegePower=p.perks.siegeStance&&this.standingTime>=.45?1.4:1;
    const enemies=this.entities.filter(e=>e.category==='enemy'&&e.spawning<=0&&withinCombatView(p,e,this.view));
    const targets=attackCandidates(p,enemies,info.range,this.view);
    const finisher=targets.find(e=>(e.elite||e.boss)&&e.hp/e.maxHp<.3);
    if(finisher)targets.splice(targets.indexOf(finisher),1),targets.unshift(finisher);
    if(!finisher&&this.arsenal.has('thunderBattery'))targets.sort((a,b)=>dist(a,p)/(a.conductive>0&&a.ward>0?2:1)-dist(b,p)/(b.conductive>0&&b.ward>0?2:1));
    const target=targets[0] || this.entities.filter(e=>e.category==='prop'&&e.state==='alive'&&e.hp>0&&!canSwallow(p,e)&&dist(p,e)<7).sort((a,b)=>dist(p,a)-dist(p,b))[0];
    if(target){
      p.aim=Math.atan2(target.z-p.z,target.x-p.x);
      if(rank&&this.cooldowns.cannon<=0){
        this.arsenal.cannonBurst(target);
        for(let burst=0;burst<info.burst;burst++)for(let shot=0;shot<info.shots+extra;shot++){
          const spread=(shot-(info.shots+extra-1)/2)*.105;
          this.shots.push({wait:burst*.105,weapon:'cannon',angle:p.aim+spread,targetX:target.x,targetZ:target.z,spread,damage:info.damage*p.power*shotPower*siegePower,rank,muzzle:shot,crit:this.random()<p.critChance});
        }
        if(p.perks.rearShot)this.shots.push({wait:0,weapon:'cannon',angle:p.aim+Math.PI,damage:info.damage*p.power*.65*siegePower,rank,muzzle:1,crit:this.random()<p.critChance});
        this.cooldowns.cannon=info.interval/haste;
      }
      if(rank>=8&&this.cooldowns.lance<=0){
        const mount=weaponMount(p,'cannon',2),angle=Math.atan2(target.z-mount.z,target.x-mount.x),end={x:mount.tipX+Math.cos(angle)*18,z:mount.tipZ+Math.sin(angle)*18};
        for(const enemy of enemies)if(enemy.state==='alive'&&segmentHitsCircle(mount.tipX,mount.tipZ,end.x,end.z,enemy.x,enemy.z,enemy.radius+.4))this.damage(enemy,165*p.power,{weapon:'lance',critical:true});
        this.emit('beam',{x:mount.tipX,z:mount.tipZ,height:mount.height,tx:end.x,tz:end.z,color:'#ffe6b4',width:.45});this.cooldowns.lance=3.5/haste;
      }
    }
    const ice=p.modules.ice;
    if(ice&&target&&this.cooldowns.ice<=0){
      const count=(ice>=6?5:ice>=2?3:1)+extra;
      for(let i=0;i<count;i++)this.shots.push({wait:i*.025,weapon:'ice',angle:p.aim+(i-(count-1)/2)*.22,targetX:target.x,targetZ:target.z,spread:(i-(count-1)/2)*.22,damage:(16+ice*8)*p.power*shotPower,rank:ice,crit:this.random()<p.critChance});
      this.cooldowns.ice=(1.75-ice*.1)/haste;
    }
    if(ice>=5&&this.cooldowns.nova<=0&&targets.length){
      const radius=(ice>=6?5.7:4.5)*p.area;
      this.emit('frost-nova',{x:p.x,z:p.z,size:radius*2});
      for(const enemy of enemies)if(enemy.state==='alive'&&dist(enemy,p)<radius){this.applyFrost(enemy,3);this.damage(enemy,95*p.power,{weapon:'ice'});}
      this.cooldowns.nova=5.4/haste;
    }
    const wind=p.modules.wind;
    if(wind&&this.cooldowns.wind<=0&&enemies.some(e=>e.state==='alive'&&dist(e,p)<8)){
      const radius=(wind>=5?7:4.5+wind*.35)*p.area;
      this.emit('wind-pulse',{x:p.x,z:p.z,size:radius*2,rank:wind});
      for(const enemy of enemies){
        const distance=dist(enemy,p);if(enemy.state!=='alive'||distance>radius)continue;
        if(!enemy.boss){enemy.x+=(p.x-enemy.x)/Math.max(.1,distance)*.7;enemy.z+=(p.z-enemy.z)/Math.max(.1,distance)*.7;}
        if(p.evolution==='blizzard')this.applyFrost(enemy,2);
        this.damage(enemy,(19+wind*12)*p.power*(p.evolution==='blizzard'?1.7:1),{weapon:'wind'});
      }
      if(wind>=4&&this.cooldowns.shield<=0){this.enemyBulletClear(p.x,p.z,radius,wind>=6?6:wind>=5?4:3);this.cooldowns.shield=2.8;}
      this.arsenal.windPulse();
      this.cooldowns.wind=(wind>=6?1.35:2.45-wind*.1)/haste;
    }
    if(wind>=2&&this.cooldowns.blade<=0){
      const count=(wind>=5?4:2)+(p.perks.satellites||0);
      for(let i=0;i<count;i++){
        const a=this.playerTime*2.5+i/count*TAU;
        const blade={x:p.x+Math.cos(a)*(p.radius+1.2),z:p.z+Math.sin(a)*(p.radius+1.2)};
        for(const enemy of enemies)if(enemy.state==='alive'&&dist(enemy,blade)<enemy.radius*.7+.45&&enemy.bladeHit<=0){this.damage(enemy,(14+wind*5)*p.power,{weapon:'wind'});enemy.bladeHit=.38;}
      }
      this.cooldowns.blade=.065;
    }
  }

  updateShots(dt){
    const p=this.player;
    for(let i=this.shots.length-1;i>=0;i--){
      const shot=this.shots[i];shot.wait-=dt;if(shot.wait>0)continue;
      this.shots.splice(i,1);
      if(this.mode!=='playing')continue;
      const base=weaponMount(p,shot.weapon,shot.muzzle||0,shot.angle);
      if(shot.targetX!==undefined)shot.angle=Math.atan2(shot.targetZ-base.z,shot.targetX-base.x)+(shot.spread||0);
      const mount=weaponMount(p,shot.weapon,shot.muzzle||0,shot.angle);
      const mx=mount.tipX,mz=mount.tipZ;
      const speed=shot.weapon==='ice'?19:24;
      const info=shot.weapon==='cannon'?CANNON_RANKS[shot.rank]:null;
      this.bullets.push({id:this.nextId++,side:'player',weapon:shot.weapon,x:mx,z:mz,px:mx,pz:mz,vx:Math.cos(shot.angle)*speed,vz:Math.sin(shot.angle)*speed,radius:shot.weapon==='ice'?.17:.19,life:shot.routeShot?1.15:.95,damage:shot.damage*(shot.crit?p.critMultiplier:1),pierce:(shot.pierce??info?.pierce??(shot.rank>=2?2:0))+(p.perks.piercing||0),splash:((shot.splash??info?.splash??0)+(shot.weapon==='cannon'&&p.perks.explosive?.9:0))*p.area,ricochet:Boolean(p.perks.rebound)||shot.weapon==='cannon'&&shot.rank>=7,hit:new Set(),rank:shot.rank,crit:shot.crit,muzzle:shot.muzzle||0,wardBonus:shot.wardBonus||1,routeShot:Boolean(shot.routeShot)});
      this.stats.shots++;p.recoil=1;
      const bullet=this.bullets.at(-1);bullet.height=mount.height;bullet.age=0;
      this.emit('shot',{x:mx,z:mz,height:mount.height,angle:shot.angle,weapon:shot.weapon,rank:shot.rank,muzzle:shot.muzzle||0});
    }
  }

  updateBullets(dt,worldDt=dt){
    const p=this.player;
    const enemies=this.entities.filter(e=>e.state==='alive'&&(e.category==='enemy'&&e.spawning<=0||e.category==='prop'&&e.hp>0));
    // A hit can clear hostile shots or spawn fragments. Keep this frame's identities stable.
    const frameBullets=this.bullets.slice();
    for(let i=frameBullets.length-1;i>=0;i--){
      if(this.mode==='feast'||this.mode==='result')break;
      const b=frameBullets[i];if(b.removed)continue;
      const bulletDt=b.side==='enemy'?worldDt:dt;
      b.life-=bulletDt;b.age=(b.age||0)+bulletDt;b.px=b.x;b.pz=b.z;
      if(b.turn){const a=Math.atan2(b.vz,b.vx)+b.turn*bulletDt,speed=Math.hypot(b.vx,b.vz);b.vx=Math.cos(a)*speed;b.vz=Math.sin(a)*speed;}
      b.x+=b.vx*bulletDt;b.z+=b.vz*bulletDt;
      if(b.life<=0||Math.abs(b.x)>33||Math.abs(b.z)>33){b.removed=true;continue;}
      if(b.side==='enemy'){
        if(this.arsenal.formation.intercept(b)){b.removed=true;continue;}
        if(p.invuln<=0&&segmentHitsCircle(b.px,b.pz,b.x,b.z,p.x,p.z,energyCoreRadius(p)+b.radius)){
          this.hurt(b.damage);this.emit('impact',{x:b.x,z:b.z,row:0,size:1.3});b.removed=true;
        }
        continue;
      }
      let remove=false;
      for(const enemy of enemies){
        if(enemy.state!=='alive'||b.hit.has(enemy.id)||!segmentHitsCircle(b.px,b.pz,b.x,b.z,enemy.x,enemy.z,enemy.radius*.57+b.radius))continue;
        b.hit.add(enemy.id);
        if(b.weapon==='ice'||p.evolution==='shatter'&&b.weapon==='cannon')this.applyFrost(enemy,b.weapon==='ice'?1:1);
        this.damage(enemy,b.damage,{weapon:b.weapon,critical:b.crit,projectile:true,splitShard:b.splitShard,wardBonus:b.wardBonus,routeShot:b.routeShot,angle:Math.atan2(b.vz,b.vx),combo:b.combo});
        if(b.weapon==='cannon')this.arsenal.cannonImpact(enemy);
        if(b.splash){
          this.emit('effect',{row:p.evolution==='shatter'?1:0,x:enemy.x,z:enemy.z,size:b.splash*2.2});
          for(const other of enemies)if(other!==enemy&&other.state==='alive'&&dist(other,enemy)<b.splash+other.radius*.35){
            this.damage(other,b.damage*.48,{weapon:b.weapon});
            if(p.evolution==='vortex'){other.x+=(enemy.x-other.x)*.13;other.z+=(enemy.z-other.z)*.13;}
          }
        }
        if(b.ricochet){
          const next=enemies.filter(e=>e.state==='alive'&&!b.hit.has(e.id)&&dist(e,enemy)<5).sort((a,c)=>dist(a,enemy)-dist(c,enemy))[0];
          if(next){const a=Math.atan2(next.z-b.z,next.x-b.x);b.vx=Math.cos(a)*24;b.vz=Math.sin(a)*24;b.ricochet=false;b.life=.45;this.emit('ricochet',{x:b.x,z:b.z});break;}
        }
        if(b.pierce>0)b.pierce--;else{remove=true;break;}
      }
      if(remove)b.removed=true;
    }
    this.bullets=this.bullets.filter(b=>!b.removed);
  }

  applyFrost(enemy,stacks){
    this.arsenal.onFrost(enemy);
    enemy.slow=2;enemy.frostStacks+=stacks;
    if(enemy.frostStacks>=3&&(this.player.modules.ice>=3||this.player.evolution==='blizzard'||this.arsenal.has('blizzardWard')||this.arsenal.has('frostGarden'))){
      enemy.frostStacks=0;
      if((enemy.controlLock||0)>0)return;
      enemy.frozen=enemy.boss?.25:enemy.elite||enemy.veteran?.45:1.7;
      enemy.controlLock=enemy.boss?3.6:enemy.elite||enemy.veteran?2:0;
      this.emit('freeze',{x:enemy.x,z:enemy.z,size:enemy.radius*2});
    }
  }

  damage(enemy,amount,source={}){
    if(enemy.state!=='alive')return;
    const p=this.player;
    if(enemy.intent==='recover'&&enemy.stateTimer<.75&&(enemy.elite||enemy.boss||enemy.kind==='ram'))amount*=1.35;
    if(enemy.electrified>0)amount*=1.2;
    if(enemy.frozen>0)amount*=p.evolution==='shatter'?1.6:1.2;
    const wardFactor=Math.max(1,source.wardBonus||1)*(source.weapon==='cannon'&&enemy.conductive>0&&this.arsenal.has('thunderBattery')?2:1),wardHit=Math.min(enemy.ward||0,amount*wardFactor);
    amount=Math.max(0,amount-wardHit/wardFactor);
    const actual=wardHit+Math.min(enemy.hp,amount);
    const weapon=source.weapon||'other';this.stats.damageByWeapon[weapon]=(this.stats.damageByWeapon[weapon]||0)+actual;
    if(source.combo){p.buildPulse=.7;this.stats.comboDamage[source.combo]=(this.stats.comboDamage[source.combo]||0)+actual;this.stats.comboHits[source.combo]=(this.stats.comboHits[source.combo]||0)+1;}
    this.stats.damageDealt+=actual;enemy.flash=.085;
    if(enemy.ward>0){enemy.ward-=wardHit;enemy.relayWard=Math.max(0,(enemy.relayWard||0)-wardHit);if(enemy.ward<=0)this.emit('ward-break',{x:enemy.x,z:enemy.z,size:enemy.radius*3});}
    enemy.hp-=amount;
    this.emit('damage',{targetId:enemy.id,x:enemy.x,z:enemy.z,amount:Math.round(actual),critical:source.critical,weapon:source.weapon,routeShot:source.routeShot});
    this.emit('impact',{x:enemy.x,z:enemy.z,row:source.weapon==='ice'?1:0,size:enemy.radius*.9+.65,small:true});
    if(enemy.hp>0){
      if(source.critical&&p.core==='execution'){
        enemy.judgment=(enemy.judgment||0)+1;
        if(enemy.judgment>=3&&!(enemy.judgmentLock>0)){enemy.judgment=0;enemy.judgmentLock=1.4;this.emit('thunderstrike',{x:enemy.x,z:enemy.z,size:4});this.damage(enemy,90*p.power+Math.min(450,enemy.maxHp*.035),{weapon:'judgment'});}
      }
      return;
    }
    enemy.state='gone';if(enemy.category==='enemy')this.stats.kills++;this.score+=enemy.score||Math.round(enemy.mass*5);
    this.releaseRelay(enemy);
    if(p.perks.fragmentation&&source.projectile&&!source.splitShard){
      for(let i=0;i<3;i++){const a=(source.angle||0)+(i-1)*.55;this.bullets.push({id:this.nextId++,side:'player',weapon:source.weapon,x:enemy.x,z:enemy.z,px:enemy.x,pz:enemy.z,vx:Math.cos(a)*18,vz:Math.sin(a)*18,radius:.13,life:.45,damage:amount*.3,pierce:p.perks.piercing||0,ricochet:Boolean(p.perks.rebound),splash:0,hit:new Set([enemy.id]),rank:1,splitShard:true});}
    }
    const pieces=enemy.elite||enemy.boss?7:3;
    for(let i=0;i<pieces;i++){const a=i/pieces*TAU;this.prop('ore',enemy.x+Math.cos(a)*.55,enemy.z+Math.sin(a)*.55,{radius:.16,mass:enemy.mass/pieces,fragment:true,combatDrop:enemy.category==='enemy',burningRemains:enemy.burn>0,frostedRemains:enemy.frozen>0||enemy.slow>0,sprite:10});}
    this.emit('kill',{x:enemy.x,z:enemy.z,row:enemy.frozen>0?1:0,size:enemy.radius*3.2,elite:enemy.elite||enemy.boss});
    if(enemy.frozen>0&&(p.modules.ice>=4||p.evolution==='shatter')){
      for(const other of this.entities)if(other!==enemy&&other.category==='enemy'&&other.state==='alive'&&dist(other,enemy)<2.7){
        // A shatter can spread damage once; it cannot recursively explode the same corpse.
        this.damage(other,38*p.power,{weapon:'shatter'});
      }
    }
    if(enemy.elite)this.eliteReward(enemy);else if(enemy.category==='enemy'&&!enemy.boss)this.healthDrop(enemy);
    if(enemy.boss)this.win();
  }

  heal(amount) {
    const p=this.player,restored=Math.max(0,Math.min(amount,p.maxHp-p.hp));
    if(!restored)return;
    p.hp+=restored;this.stats.healed+=restored;
    this.emit('heal',{amount:Math.round(restored),x:p.x,z:p.z});
  }

  healthDrop(enemy) {
    const p=this.player;
    // Directly eating untouched small enemies is food, not an unlimited source of medicine.
    if(enemy.hp>=enemy.maxHp&&enemy.ward>=enemy.maxWard)return;
    if(p.hp>p.maxHp*.85){this.killsSinceHealthPack=0;return;}
    this.killsSinceHealthPack++;
    const critical=p.hp<=p.maxHp*.4,threshold=critical?6:12;
    if(this.killHealCooldown>0||this.killsSinceHealthPack<threshold)return;
    if(this.entities.filter(e=>e.kind==='medkit'&&e.state!=='gone').length>=2)return;
    this.prop('medkit',enemy.x,enemy.z);this.killsSinceHealthPack=0;this.killHealCooldown=critical?18:28;
    this.emit('health-drop',{x:enemy.x,z:enemy.z});
  }

  eliteReward(enemy){
    this.stats.elites++;this.spawn({category:'core',kind:'core',x:enemy.x,z:enemy.z,radius:.3,mass:16,sprite:11});
    this.prop('medkit',enemy.x+1,enemy.z,{healing:30,recoverySource:'elite'});
    this.breatherUntil=Math.max(this.breatherUntil,this.time+ELITE_RECOVERY);this.pacingStart=this.breatherUntil;this.nextSpawn=this.breatherUntil;
    this.enemyBulletClear(enemy.x,enemy.z,10);
    this.warnings=this.warnings.filter(w=>dist(w,enemy)>10);
    this.enemyPatterns.pending=[];
    for(const e of this.entities)if(e.category==='enemy'&&e.state==='alive'&&!e.elite&&!e.boss){e.intent='recover';e.stateTimer=1.2;e.cooldown=Math.max(e.cooldown,3);}
    this.emit('core-drop',{x:enemy.x,z:enemy.z});
  }

  enemyBulletClear(x,z,radius,budget=Infinity){
    let erased=0;
    for(const b of this.bullets)if(!b.removed&&erased<budget&&b.side==='enemy'&&Math.hypot(b.x-x,b.z-z)<radius){b.removed=true;erased++;}
    this.bullets=this.bullets.filter(b=>!b.removed);
    this.stats.erasedBullets+=erased;
    if(erased)this.emit('shield',{x,z,radius});
  }

  releaseRelay(enemy){
    if(enemy.kind!=='herald')return;
    for(const ally of this.entities)if(ally.state==='alive'&&ally.wardSource===enemy.id){
      ally.ward=Math.max(0,ally.ward-(ally.relayWard||0));ally.relayWard=0;ally.wardSource=null;
      this.emit('ward-break',{x:ally.x,z:ally.z,size:ally.radius*2});
    }
  }

  volley(enemy,angle,count,spread,speed=5,pattern='fan',gapAngle=null,turn=0){
    let remaining=180-this.bullets.filter(b=>b.side==='enemy').length;
    if(remaining<=0)return;
    let fired=0;
    for(let i=0;i<count;i++){
      const a=pattern==='ring'?angle+i/count*TAU:angle+(i-(count-1)/2)*spread;
      if(gapAngle!==null&&Math.abs(Math.atan2(Math.sin(a-gapAngle),Math.cos(a-gapAngle)))<.56)continue;
      if(remaining--<=0)break;fired++;
      this.bullets.push({id:this.nextId++,side:'enemy',kind:enemy.kind,x:enemy.x,z:enemy.z,px:enemy.x,pz:enemy.z,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,radius:enemy.boss?.19:.14,damage:enemy.damage,life:6,turn,shape:pattern==='ring'?'petal':enemy.kind==='beetle'?'seed':'lance',color:enemy.kind==='mage'||enemy.kind==='eye'?'#b56abf':'#d96146'});
    }
    this.stats.enemyVolleys++;this.stats.hostileShots+=fired;if(enemy.boss)this.stats.bossVolleys++;
    this.emit('enemy-shot',{x:enemy.x,z:enemy.z,angle,count:fired});
  }

  enemyAI(e,dt,distance){
    const p=this.player;e.spawning=Math.max(0,e.spawning-dt);e.cooldown-=dt;e.frozen=Math.max(0,e.frozen-dt);e.controlLock=Math.max(0,(e.controlLock||0)-dt);e.slow=Math.max(0,e.slow-dt);e.bladeHit=Math.max(0,e.bladeHit-dt);
    e.rootSlow=Math.max(0,(e.rootSlow||0)-dt);e.rooted=Math.max(0,(e.rooted||0)-dt);
    e.attackFlash=Math.max(0,(e.attackFlash||0)-dt);
    e.disengaged=!e.elite&&!e.boss&&!e.guardHome&&distance>Math.max(22,this.view.halfWidth+6,this.view.halfHeight+6)?(e.disengaged||0)+dt:0;
    if(e.disengaged>6){this.releaseRelay(e);e.state='gone';return;}
    if(e.spawning>0||e.frozen>0||this.mode!=='playing'){e.moving=0;return;}
    const nx=(p.x-e.x)/Math.max(.01,distance),nz=(p.z-e.z)/Math.max(.01,distance);
    const angle=Math.atan2(nz,nx);e.facing=nx<0?-1:1;
    const visible=withinCombatView(p,e,this.view);
    if(e.boss){
      const phase=e.hp/e.maxHp>.67?1:e.hp/e.maxHp>.32?2:3;
      if(phase!==e.phase){e.phase=phase;e.cooldown=1;e.flash=.4;this.enemyBulletClear(p.x,p.z,4);this.emit('boss-phase',{phase});}
      if(e.hp/e.maxHp<=.12&&!e.broken){e.broken=true;e.radius=2.06;e.ward=0;this.emit('boss-phase',{phase:3});}
    }
    if(e.intent==='windup'){
      e.stateTimer-=dt;e.moving=0;
      if(e.stateTimer<=0){
        if(e.nextAttack==='charge'){e.intent='charge';e.stateTimer=.7;}
        else{this.firePattern(e);e.attackFlash=.3;e.intent='recover';e.stateTimer=e.boss?1.7:e.elite?1.65:.85;}
      }
      return;
    }
    if(e.intent==='charge'){
      e.x+=Math.cos(e.lockAngle)*12.5*dt;e.z+=Math.sin(e.lockAngle)*12.5*dt;e.stateTimer-=dt;e.moving=2;
      e.x=clamp(e.x,-27,27);e.z=clamp(e.z,-27,27);
      if(dist(e,p)<e.radius*.6+energyCoreRadius(p))this.hurt(e.damage);
      if(e.stateTimer<=0){e.intent='recover';e.stateTimer=1.6;this.emit('enemy-stagger',{x:e.x,z:e.z,size:e.radius*2});}
      return;
    }
    if(e.intent==='recover'){e.stateTimer-=dt;e.moving=0;if(e.stateTimer<=0)e.intent='move';return;}
    const edible=canSwallow(p,e);
    if(e.guardHome&&distance>13){const homeDistance=dist(e,e.guardHome);if(homeDistance>.5){e.x+=(e.guardHome.x-e.x)/homeDistance*e.speed*dt;e.z+=(e.guardHome.z-e.z)/homeDistance*e.speed*dt;}e.moving=homeDistance>.5?1:0;return;}
    let vx=0,vz=0;
    if(edible&&distance<3.5&&!e.elite&&!e.boss){vx=-nx*.7;vz=-nz*.7;}
    else if(e.kind==='mage'||e.kind==='mortar'||e.kind==='eye'||e.kind==='herald'){
      if(distance>8){vx=nx;vz=nz;}else if(distance<5.5){vx=-nx*.75;vz=-nz*.75;}else{vx=-nz*.35;vz=nx*.35;}
    }else if(distance>(e.boss?6.5:1.9)){vx=nx;vz=nz;}
    const speed=e.speed*(e.slow>0?.52:1)*(e.rooted>0?0:e.rootSlow>0?((e.elite||e.boss)?.8:.55):1);
    e.x=clamp(e.x+vx*speed*dt,-27,27);e.z=clamp(e.z+vz*speed*dt,-27,27);e.moving=Math.hypot(vx,vz);
    if(distance<e.radius*.5+energyCoreRadius(p)&&!edible)this.hurt(e.damage*.65);
    if(this.pacing.rest&&!e.elite&&!e.boss&&!this.entities.some(other=>other.state==='alive'&&(other.elite||other.boss)))return;
    if(e.cooldown>0||!visible||distance>18)return;
    if(e.kind!=='beetle'&&this.entities.filter(other=>other!==e&&other.category==='enemy'&&other.state==='alive'&&other.intent==='windup'&&other.kind!=='beetle').length>=2)return;
    const anticipation=e.veteran||e.kind==='mortar'?Math.min(.8,distance/5.5*.3+.2):0;
    e.lockAngle=anticipation?Math.atan2(p.z+p.vz*p.speed*anticipation-e.z,p.x+p.vx*p.speed*anticipation-e.x):angle;e.attackIndex++;
    e.nextAttack=e.kind==='ram'||['elite','moth'].includes(e.kind)&&e.attackIndex%3===0?'charge':'shoot';
    this.enemyPatterns.prepare(e);
    e.intent='windup';e.stateTimer=e.nextAttack==='charge'?1:e.kind==='beetle'?.65:1;
    e.cooldown=e.boss?3.9:e.elite?3.8:e.kind==='beetle'?3:e.kind==='herald'?4.4:3.5;
    if(e.nextAttack==='charge')this.emit('charge-warning',{x:e.x,z:e.z,angle:e.lockAngle,length:9,life:e.stateTimer});
    else this.emit('aim-warning',{x:e.x,z:e.z,angle:e.lockAngle,life:e.stateTimer});
  }

  firePattern(e){ this.enemyPatterns.fire(e); }

  updateWarnings(dt){
    const p=this.player,coreRadius=energyCoreRadius(p);
    for(let i=this.warnings.length-1;i>=0;i--){
      const w=this.warnings[i];w.age+=dt;
      if(!w.active&&w.source&&!this.entities.some(e=>e.id===w.source&&e.state==='alive')){this.warnings.splice(i,1);continue;}
      if(w.age<w.delay)continue;
      if(!w.active){w.active=true;w.tick=0;this.emit('enemy-impact',{x:w.x,z:w.z,size:w.radius*2,kind:w.kind});}
      w.tick-=dt;
      if(w.tick<=0){
        if(hazardHits(w,p,coreRadius))this.hurt(w.damage);
        this.arsenal.formation.hazard(w);
        w.tick=(w.kind==='ring'||w.sweep)?.05:.7;
      }
      if(w.age>=w.delay+(w.duration||0))this.warnings.splice(i,1);
    }
  }

  hurt(amount){
    const p=this.player;if(this.mode!=='playing'||p.invuln>0||amount<=0)return;
    amount=this.routeMechanics.absorbHit(amount);
    if(amount>0&&p.nexusShield>0){const absorbed=Math.min(amount,p.nexusShield);p.nexusShield-=absorbed;amount-=absorbed;p.nexusShieldCooldown=12;this.emit('shield',{x:p.x,z:p.z,radius:energyCoreRadius(p)});}
    if(amount<=0){p.invuln=Math.max(p.invuln,.16);return;}
    p.hp=Math.max(0,p.hp-amount);p.invuln=.72;this.stats.damageTaken+=amount;
    this.emit('hurt',{amount:Math.round(amount),x:p.x,z:p.z});
    if(p.hp<=0)this.finish(false);
  }

  win(){
    if(this.bossDefeated)return;
    this.bossDefeated=true;this.mode='feast';this.feastTime=12;this.score+=5000;
    this.player.radius=3.3;this.player.hp=this.player.maxHp;this.player.bulletTimeRemaining=0;
    this.bullets=[];this.warnings=[];
    for(const e of this.entities){
      if(e.category==='enemy'&&e.state==='alive')e.ward=0;
      if(e.category==='shrine'||e.category==='core')e.state='gone';
    }
    for(let i=0;i<24;i++){const a=this.rng(0,TAU),r=this.rng(2,9);this.prop('cart',clamp(this.player.x+Math.cos(a)*r,-25,25),clamp(this.player.z+Math.sin(a)*r,-25,25));}
    this.emit('victory',{x:this.player.x,z:this.player.z});
  }

  finish(won){
    if(this.mode==='result')return;
    this.player.bulletTimeRemaining=0;this.mode='result';this.result={won,score:Math.round(this.score),time:this.time,stats:{...this.stats},modules:{...this.player.modules},evolution:this.player.evolution,route:this.player.route,path:this.player.path,mastery:this.player.mastery,parts:expeditionParts(this.time,this.stats,won)};
    this.emit('result',this.result);
  }

  snapshot(){
    return {mode:this.mode,time:this.time,wave:this.wave,seed:this.seed,score:this.score,rewardPending:this.rewardPending,pacing:{...this.pacing},opportunity:this.expedition.snapshot(),choiceOffers:this.choiceOffers.map(e=>({...e})),combos:[...this.arsenal.comboIds],player:{...this.player,modules:{...this.player.modules},perks:{...this.player.perks},cityImprovements:{...this.player.cityImprovements}},stats:{...this.stats},bossSpawned:this.bossSpawned,bossDefeated:this.bossDefeated,
      entities:this.entities.filter(e=>e.state==='alive').map(({id,state,category,kind,x,z,radius,hp,maxHp,ward,anchored,skill,buff,group,elite,veteran,boss,phase,spawning,mass,healing,fragment,intent,lockAngle,speed,eventType,eventSprite,guard,burningRemains,frostedRemains})=>({id,state,category,kind,x,z,radius,hp,maxHp,ward,anchored,skill,buff,group,elite,veteran,boss,phase,spawning,mass,healing,fragment,intent,lockAngle,speed,eventType,eventSprite,guard,burningRemains,frostedRemains})),
      bullets:this.bullets.filter(b=>b.side==='enemy').map(({side,x,z,vx,vz,radius})=>({side,x,z,vx,vz,radius})),warnings:this.warnings.map(w=>({...w}))};
  }
}
