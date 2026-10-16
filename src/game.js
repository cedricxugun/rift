import { WORLD, GROWTH, SKILLS, EVOLUTIONS, ENEMIES, createRng, growthForMass, canSwallow, evolutionFor, rewardFor } from './rules.js';
import { t } from './i18n.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class CitadelGame {
  constructor(renderer, audio, ui, settings, profile, persist) {
    this.renderer = renderer;
    this.audio = audio;
    this.ui = ui;
    this.settings = settings;
    this.profile = profile;
    this.persist = persist;
    this.input = null;
    this.entities = [];
    this.projectiles = [];
    this.warnings = [];
    this.mode = 'title';
    this.lastMode = 'playing';
    this.nextId = 1;
    this.reset(7216, true);
  }

  reset(seed, title = false) {
    this.renderer.clearActors();
    this.entities = []; this.projectiles = []; this.warnings = [];
    this.seed = seed; this.rng = createRng(seed); this.nextId = 1;
    this.mode = title ? 'title' : 'playing';
    this.elapsed = 0; this.chapter = 0; this.score = 0; this.uiClock = 0;
    this.flags = { moved: false, firstCore: false, secondCore: false, guardianDead: false, evolved: false, oldThreat: false, bossDown: false, anchors: 0 };
    this.stats = { eaten: 0, kills: 0, direct: 0, shattered: 0, damage: 0 };
    this.cooldowns = { base: .7, cannon: 0, wind: .5, ice: 1, hint: 0, dust: 0 };
    this.player = { x: 0, z: 12, radius: 1.12, drawRadius: 1.12, level: 1, mass: 0, hp: 110, maxHp: 110, speed: 5.5, power: 1, haste: 1, moving: 0, invulnerable: 0, lastHurt: -10, modules: { cannon: 0, wind: 0, ice: 0 }, evolution: null };
    this.aimTarget = null; this.feastRemaining = 0; this.resultWon = false; this.newBest = false;
    this.generateMeadow();
    this.generateFoundry();
    this.generateCitadel();
    if (title) {
      Object.assign(this.player, { x: 1.5, z: 7, radius: 2.4, drawRadius: 2.4, level: 3, modules: { cannon: 2, wind: 2, ice: 0 } });
      for (const entity of this.entities) {
        if (distance(entity, this.player) < 3.4) { entity.x += 6; entity.z -= 2; }
      }
    } else {
      this.profile.journeys += 1;
      this.persist();
      this.ui.hidePanel(); this.ui.startHUD(this);
      this.ui.banner('The meadow', 'The first expedition');
      this.input?.clear();
      this.audio.setIntensity(.15);
      this.renderer.look.set(0, 0, 10);
    }
  }

  random(min, max) { return min + this.rng() * (max - min); }

  spawn(data) {
    const entity = {
      id: this.nextId++, state: 'alive', x: 0, z: 0, homeX: data.x || 0, homeZ: data.z || 0,
      radius: .45, grade: 1, mass: 1, hp: 35, maxHp: 35, yaw: this.random(0, TAU),
      variant: Math.floor(this.rng() * 4), enemy: false, age: 0, frozen: 0, freezeTime: 0,
      intent: 'idle', cooldown: this.random(1.8, 3.5), moving: 0, ...data,
    };
    this.entities.push(entity);
    this.renderer.createActor(entity);
    return entity;
  }

  spawnEnemy(kind, x, z, options = {}) {
    const def = ENEMIES[kind];
    return this.spawn({ ...def, kind, x, z, maxHp: options.hp || def.hp, enemy: true, ...options });
  }

  generateMeadow() {
    const starterCrates = [[0, 10], [1.1, 8.8], [-.7, 7.8], [1.3, 6.5], [-1.1, 5.5], [0, 4.4], [1.3, 3.5], [-1, 2.4]];
    starterCrates.forEach(([x, z]) => this.spawn({ kind: 'crate', x, z, radius: .32, mass: 1.5 }));
    for (let i = 0; i < 10; i++) this.spawn({ kind: 'crate', x: this.random(-11, 11), z: this.random(-13, 12), radius: .33, mass: 1.1 });
    for (let i = 0; i < 8; i++) this.spawn({ kind: 'tree', x: this.random(-13, 13), z: this.random(-13, 12), radius: .55, mass: 2 });
    for (let i = 0; i < 8; i++) this.spawn({ kind: 'sheep', x: this.random(-9, 9), z: this.random(-9, 8), radius: .43, mass: 1.5 });
    [[-8, 1], [8, -3], [-10, -11], [9, 10]].forEach(([x, z]) => this.spawn({ kind: 'house', x, z, radius: 1.26, grade: 2, mass: 4, hp: 48, maxHp: 48 }));
    this.spawn({ kind: 'workshop', name: 'Power workshop', x: -5, z: -1, radius: .7, mass: 1, buff: 'power' });
    this.spawn({ kind: 'clock', name: 'Clockwork house', x: 6, z: 3, radius: .68, mass: 1, buff: 'haste' });
    this.spawn({ kind: 'workshop', name: 'Power workshop', x: 11, z: -11, radius: .7, mass: 1, buff: 'power' });
    this.spawn({ kind: 'clock', name: 'Clockwork house', x: -10, z: 8, radius: .68, mass: 1, buff: 'haste' });
    const order = Object.keys(SKILLS);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((skill, i) => this.spawn({ kind: SKILLS[skill].kind, skill, group: 'first', x: (i - 1) * 4.4, z: -7, radius: .68, mass: 3 }));
  }

  generateFoundry() {
    for (let i = 0; i < 8; i++) this.spawn({ kind: i % 2 ? 'rock' : 'crate', x: this.random(-12, 12), z: this.random(-39, -20), radius: .43, mass: 2 });
    this.spawn({ kind: 'healing', name: 'Healing spring', x: -9, z: -26, radius: .48, mass: 1, healing: 30 });
    this.spawn({ kind: 'healing', name: 'Healing spring', x: 9, z: -38, radius: .48, mass: 1, healing: 30 });
    this.spawn({ kind: 'workshop', name: 'Power workshop', x: -7, z: -33, radius: .7, mass: 1, buff: 'power' });
    this.spawn({ kind: 'clock', name: 'Clockwork house', x: 8, z: -23, radius: .7, mass: 1, buff: 'haste' });
    const guardianKind = this.rng() < .55 ? 'beetle' : 'ram';
    this.guardian = this.spawnEnemy(guardianKind, 0, -34, { guardian: true, hp: 330, maxHp: 330, radius: 1.94, mass: 24, evolutionCore: false, rewardEvolution: true, cooldown: 3.5 });
    this.spawnEnemy(guardianKind === 'beetle' ? 'ram' : 'beetle', 11, -36, { rare: true, rewardCore: 'random', hp: 145, maxHp: 145 });
  }

  generateCitadel() {
    this.spawnEnemy('beetle', 0, -48, { homeX: 0, homeZ: -48, cooldown: 4 });
    [[-7, -53], [8, -56], [-10, -61], [9, -65]].forEach(([x, z], i) => this.spawnEnemy(i % 2 ? 'ram' : 'beetle', x, z));
    this.spawnEnemy('mortar', -10, -66);
    for (let i = 0; i < 12; i++) this.spawn({ kind: 'house', x: this.random(-12, 12), z: this.random(-66, -48), radius: 1.83, grade: 3, mass: 8, hp: 70, maxHp: 70 });
    for (let i = 0; i < 9; i++) this.spawn({ kind: i % 2 ? 'sheep' : 'tree', x: this.random(-11, 11), z: this.random(-66, -48), radius: .55, mass: 2 });
    this.spawn({ kind: 'healing', name: 'Healing spring', x: 7, z: -60, radius: .48, mass: 1, healing: 35 });
    this.spawn({ kind: 'healing', name: 'Healing spring', x: -6, z: -72, radius: .48, mass: 1, healing: 35 });
    this.spawn({ kind: 'workshop', name: 'Power workshop', x: -7, z: -52, radius: .7, mass: 1, buff: 'power' });
    this.spawn({ kind: 'clock', name: 'Clockwork house', x: 10, z: -58, radius: .7, mass: 1, buff: 'haste' });
    this.spawn({ kind: 'relic', name: 'Anchor', x: -4.6, z: -71, radius: .68, mass: 6, anchor: true });
    this.spawn({ kind: 'relic', name: 'Anchor', x: 4.6, z: -71, radius: .68, mass: 6, anchor: true });
    this.boss = this.spawnEnemy('boss', 0, -75, { homeX: 0, homeZ: -75, cooldown: 3, attackIndex: 0 });
  }

  objective() {
    const p = this.player;
    const alive = this.entities.filter(e => e.state === 'alive');
    const nearest = predicate => alive.filter(predicate).sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (this.mode === 'title') return {};
    if (this.mode === 'feast' || this.flags.bossDown) return { title: 'Enjoy the final feast', detail: 'Every old threat can become your next meal.' };
    if (!this.flags.moved) return { title: 'Swallow small objects', detail: 'Move toward the little crates. Use WASD, arrow keys, or hold and drag.', target: { x: 0, z: 9 } };
    if (this.stats.eaten < 6) return { title: 'Swallow small objects', detail: 'Guide the hole under small objects. Six bites will get you started.', progress: `${this.stats.eaten} / 6`, target: nearest(e => !e.enemy && !e.skill && canSwallow(p.radius, e.radius)) };
    if (!this.flags.firstCore) return { title: 'Find your first tower', detail: 'The three towers offer different powers. Swallow one to choose your route.', target: nearest(e => e.group === 'first') };
    if (p.level < 2) return { title: 'Grow to size II', detail: 'Keep eating until your mouth reaches size II. Larger things will fit.', target: nearest(e => !e.enemy && !e.skill && canSwallow(p.radius, e.radius) && e.z > -17) };
    if (this.chapter === 0) return { title: 'Enter the foundry', detail: 'Follow the glowing trail', target: { x: 0, z: -19 } };
    if (!this.flags.secondCore) return { title: 'Choose a second ability', detail: 'The three towers offer different powers. Swallow one to choose your route.', target: nearest(e => e.group === 'second') };
    if (!this.flags.guardianDead) return { title: 'Defeat the core guardian', detail: 'Too large to swallow? Stay nearby. Your city attacks automatically while you dodge.', target: this.guardian.state === 'alive' ? this.guardian : undefined };
    if (!this.flags.evolved) return { title: 'Absorb the evolution core', detail: 'The guardian carries an evolution core. Break its armor, then collect the glowing core.', target: nearest(e => e.evolutionCore) };
    if (this.chapter < 2) return { title: 'Reach the wandering keep', detail: 'Follow the glowing trail', target: { x: 0, z: -47 } };
    if (!this.flags.oldThreat) return { title: 'Swallow an old threat', detail: 'Your hole is bigger now. Swallow a beetle that once made you fight.', target: nearest(e => e.enemy && e.grade === 3) };
    return { title: 'Bring down the wandering keep', detail: 'Destroy the two glowing anchors to weaken the keep, or defeat it with your evolved abilities.', target: this.flags.anchors < 2 ? nearest(e => e.anchor) : this.boss.state === 'alive' ? this.boss : undefined };
  }

  update(dt, control) {
    const p = this.player;
    p.drawRadius += ((this.mode === 'feast' ? Math.max(p.radius, 4.6) : p.radius) - p.drawRadius) * Math.min(1, dt * 5);
    if (!['playing', 'feast'].includes(this.mode)) { p.moving = 0; return; }
    this.elapsed += dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] -= dt;
    const direction = control || this.input?.direction(p) || { x: 0, z: 0 };
    p.moving = Math.hypot(direction.x, direction.z);
    const speed = p.speed + (this.mode === 'feast' ? 1.8 : 0);
    p.x = clamp(p.x + direction.x * speed * dt, WORLD.minX + 1, WORLD.maxX - 1);
    p.z = clamp(p.z + direction.z * speed * dt, WORLD.minZ + 2, WORLD.maxZ - 1);
    if (distance(p, { x: 0, z: 12 }) > 1.5) this.flags.moved = true;
    if (this.chapter === 0 && p.z < -17.6) {
      if (this.flags.firstCore && p.level >= 2) {
        this.chapter = 1; this.ui.banner('The foundry', 'New chapter'); this.audio.play('portal'); this.audio.setIntensity(.35);
      } else {
        p.z = -17.6;
        if (this.cooldowns.hint <= 0) { this.ui.toast(this.flags.firstCore ? 'Grow to size II' : 'Find your first tower'); this.cooldowns.hint = 3; }
      }
    }
    if (this.chapter < 2 && p.z < -45.5) {
      if (this.flags.evolved) {
        this.chapter = 2; this.ui.banner('The citadel', 'New chapter'); this.audio.play('portal'); this.audio.setIntensity(.65);
        const skill = Object.keys(p.modules).find(id => p.modules[id] > 0);
        if (!this.extraCore) { this.extraCore = this.spawn({ kind: SKILLS[skill].kind, skill, x: -6, z: -50, radius: .7, mass: 3 }); }
      } else {
        p.z = -45.5;
        if (this.cooldowns.hint <= 0) { this.ui.toast('Defeat the core guardian', {}, 'target'); this.cooldowns.hint = 3; }
      }
    }
    if (this.elapsed - p.lastHurt > 6 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + dt * 1.5);
    if (p.moving > .2 && this.cooldowns.dust < 0 && !this.settings.reducedMotion) {
      this.renderer.burst(p.x, p.z + p.radius, '#d2caa6', 1, .18, .12); this.cooldowns.dust = .1;
    }
    const activeRadius = this.mode === 'feast' ? Math.max(p.radius, 4.6) : p.radius;
    for (const entity of this.entities) {
      if (entity.state === 'gone') continue;
      entity.age += dt;
      if (entity.state === 'eating') {
        entity.eatAge += dt;
        entity.x += (p.x - entity.x) * dt * 5;
        entity.z += (p.z - entity.z) * dt * 5;
        if (entity.eatAge >= .65) this.award(entity);
        continue;
      }
      if (entity.group === 'second' && this.chapter === 0) continue;
      const dist = distance(entity, p);
      if (dist < activeRadius * .74 && canSwallow(activeRadius, entity.radius)) {
        this.beginSwallow(entity); continue;
      }
      if (dist < activeRadius + .8 && !canSwallow(activeRadius, entity.radius) && this.cooldowns.hint <= 0 && !entity.enemy) {
        this.renderer.float(t('Not big enough'), entity.x, entity.z, '#a47e64'); this.cooldowns.hint = 3.5;
      }
      if (entity.enemy) this.updateEnemy(entity, dt, dist);
      else if (entity.kind === 'sheep' && dist < 3.5 && dist > activeRadius * .6 && this.mode !== 'feast') {
        const flee = .8 * dt;
        entity.x += (entity.x - p.x) / Math.max(.1, dist) * flee;
        entity.z += (entity.z - p.z) / Math.max(.1, dist) * flee;
        entity.yaw = Math.atan2(entity.x - p.x, entity.z - p.z);
        entity.moving = 1;
      } else entity.moving = 0;
      if (entity.state === 'alive' && canSwallow(activeRadius, entity.radius)) {
        const suctionRange = activeRadius + (p.modules.wind ? 1.7 + p.modules.wind * .35 : .45);
        if (dist < suctionRange && dist > activeRadius * .55) {
          const pull = (p.modules.wind ? 3.2 + p.modules.wind : 2.1) * dt;
          entity.x += (p.x - entity.x) / dist * Math.min(pull, dist);
          entity.z += (p.z - entity.z) / dist * Math.min(pull, dist);
        }
      }
    }
    this.updateAttacks(dt);
    this.updateProjectiles(dt);
    this.updateWarnings(dt);
    if (this.mode === 'feast') {
      this.feastRemaining -= dt;
      if (this.feastRemaining <= 0) this.finish(true);
    }
    this.uiClock += dt;
    if (this.uiClock >= .12) { this.uiClock = 0; this.ui.updateHUD(this); }
  }

  beginSwallow(entity) {
    if (entity.state !== 'alive') return;
    entity.state = 'eating'; entity.eatAge = 0;
    if (entity.ring) entity.ring.visible = false;
    if (entity.skill && entity.group) {
      for (const other of this.entities) {
        if (other !== entity && other.group === entity.group && other.state === 'alive') {
          this.renderer.burst(other.x, other.z, '#bca2d0', 12, .5);
          this.removeEntity(other);
        }
      }
    }
    this.audio.play('eat', .7 + Math.min(entity.mass / 8, 1));
    this.renderer.wave(entity.x, entity.z, '#c4b1de', .8, .35);
  }

  removeEntity(entity) {
    entity.state = 'gone'; entity.mesh.visible = false;
    this.renderer.actors.remove(entity.mesh);
    if (entity.frostMesh) this.renderer.actors.remove(entity.frostMesh);
    if (entity.ring) { this.renderer.actors.remove(entity.ring); entity.ring.material.dispose(); entity.ring = null; }
  }

  award(entity) {
    const reward = rewardFor(entity);
    this.removeEntity(entity);
    this.stats.eaten += 1;
    this.score += Math.round(reward.mass * 12) + (entity.skill ? 80 : 0);
    this.addMass(reward.mass);
    if (entity.enemy) {
      this.stats.kills += 1; this.stats.direct += 1; this.score += 100;
      if (this.flags.evolved && entity.grade <= 3 && !this.flags.oldThreat) {
        this.flags.oldThreat = true; this.ui.toast('Every old threat can become your next meal.', {}, 'mouth');
      }
      this.enemyRewards(entity);
    }
    if (entity.skill) {
      this.gainSkill(entity.skill);
      if (entity.group === 'first') {
        this.flags.firstCore = true;
        const others = Object.keys(SKILLS).filter(key => key !== entity.skill);
        others.forEach((skill, index) => this.spawn({ kind: SKILLS[skill].kind, skill, group: 'second', x: index ? 4 : -4, z: -23, radius: .68, mass: 3 }));
        this.spawn({ kind: SKILLS[entity.skill].kind, skill: entity.skill, x: -11, z: -22, radius: .7, mass: 3 });
      }
      if (entity.group === 'second') this.flags.secondCore = true;
    }
    if (entity.buff === 'power') { this.player.power = Math.min(1.7, this.player.power + .12); this.ui.toast('Power increased', {}, 'cannon'); }
    if (entity.buff === 'haste') { this.player.haste = Math.min(1.65, this.player.haste + .1); this.ui.toast('Cooldown improved', {}, 'clock'); }
    if (entity.healing) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + entity.healing);
      this.renderer.float(`+${entity.healing}`, this.player.x, this.player.z, '#799c6c', true);
      this.audio.play('core', .6);
    }
    if (entity.anchor) {
      this.flags.anchors += 1;
      const previousRadius = this.boss.radius;
      this.boss.radius = this.flags.anchors >= 2 ? 2.74 : 3.14;
      this.boss.baseScale *= this.boss.radius / previousRadius;
      this.boss.grade = this.flags.anchors >= 2 ? 4 : 5;
      this.damage(this.boss, 115, true);
      this.renderer.wave(this.boss.x, this.boss.z, '#bba0d6', 5, 1.2);
      this.audio.play('core'); this.ui.toast('Power increased', {}, 'sparkle');
    }
    if (entity.evolutionCore && !this.flags.evolved) {
      this.flags.evolved = true;
      // Every legal two-module route gets a meaningful awakening, regardless of rare drops.
      if (Object.values(this.player.modules).filter(Boolean).length < 2) {
        const missing = Object.keys(SKILLS).find(key => !this.player.modules[key]);
        this.player.modules[missing] = 1;
      }
      this.player.evolution = evolutionFor(this.player.modules);
      for (const key of EVOLUTIONS[this.player.evolution].skills) this.player.modules[key] = Math.max(2, this.player.modules[key]);
      this.player.hp = this.player.maxHp;
      this.mode = 'awakening'; this.input?.clear();
      this.audio.play('evolve'); this.audio.setIntensity(.2);
      this.renderer.burst(this.player.x, this.player.z, EVOLUTIONS[this.player.evolution].color, 80, 2, 1.2);
      this.renderer.wave(this.player.x, this.player.z, '#c2a3e1', 8, 1.5);
      this.ui.showPanel('evolution', this);
      if (!this.profile.discoveries.includes(this.player.evolution)) { this.profile.discoveries.push(this.player.evolution); this.persist(); }
    }
  }

  addMass(amount) {
    this.player.mass += amount;
    const growth = growthForMass(this.player.mass);
    if (growth.level !== this.player.level) {
      this.player.level = growth.level; this.player.radius = growth.radius;
      this.player.maxHp = 110 + (growth.level - 1) * 18;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28);
      this.audio.play('grow');
      this.renderer.wave(this.player.x, this.player.z, '#c3b27a', growth.radius * 2, 1.1);
      this.renderer.burst(this.player.x, this.player.z, '#e1cd8e', 35, 1.4);
      this.renderer.float(t('Size {{level}}', { level: ['I','II','III','IV','V'][growth.level - 1] }), this.player.x, this.player.z, '#8b729a', true);
      this.ui.toast('Growth!', {}, 'mouth');
    }
  }

  gainSkill(skill) {
    const oldLevel = this.player.modules[skill];
    if (!oldLevel && Object.values(this.player.modules).filter(Boolean).length >= 3) { this.player.power += .05; return; }
    this.player.modules[skill] = Math.min(3, oldLevel + 1);
    if (oldLevel >= 3) this.player.power = Math.min(1.9, this.player.power + .05);
    this.ui.toast(oldLevel ? 'Module upgraded' : '{{skill}} acquired', { skill: t(SKILLS[skill].name) }, SKILLS[skill].icon);
    this.renderer.burst(this.player.x, this.player.z, SKILLS[skill].color, 30, 1.2, 1);
    this.audio.play('core');
  }

  enemyRewards(entity) {
    if (entity.guardian) {
      this.flags.guardianDead = true;
      this.spawn({ kind: 'core', name: 'Evolution core', x: entity.x, z: entity.z, radius: .42, mass: 100, evolutionCore: true });
      this.ui.toast('Core secured', {}, 'sparkle');
    }
    if (entity.rewardCore) {
      const owned = Object.keys(this.player.modules).filter(key => this.player.modules[key]);
      const skill = entity.rewardCore === 'random' ? owned[Math.floor(this.rng() * owned.length)] || 'cannon' : entity.rewardCore;
      this.spawn({ kind: SKILLS[skill].kind, skill, x: entity.x, z: entity.z, radius: .65, mass: 3 });
    }
    if (entity.kind === 'boss' && !this.flags.bossDown) this.startFeast();
  }

  damage(entity, amount, bypass = false) {
    if (!entity || entity.state !== 'alive') return;
    let damage = amount;
    if (entity.frozen > 0) damage *= this.player.evolution === 'shatter' ? 1.9 : 1.3;
    if (entity.kind === 'boss' && this.flags.anchors < 2 && !bypass) damage *= .62;
    entity.hp -= damage;
    this.renderer.float(Math.round(damage).toString(), entity.x, entity.z, entity.frozen > 0 ? '#658da4' : '#a17d54');
    this.renderer.burst(entity.x, entity.z, entity.frozen > 0 ? '#a9e5e8' : '#d9b585', 5, .6, 1);
    this.audio.play('impact', .6);
    if (entity.hp <= 0) {
      this.removeEntity(entity);
      this.stats.shattered += 1;
      if (entity.enemy) { this.stats.kills += 1; this.score += 100; }
      const pieces = entity.kind === 'boss' ? 10 : 5;
      for (let i = 0; i < pieces; i++) {
        const angle = i / pieces * TAU;
        this.spawn({ kind: 'rock', x: entity.x + Math.sin(angle) * .65, z: entity.z + Math.cos(angle) * .65, radius: .25, mass: entity.mass / pieces, fragment: true });
      }
      this.renderer.burst(entity.x, entity.z, entity.frozen > 0 ? '#abd7e4' : '#d5b98b', entity.kind === 'boss' ? 65 : 28, 1.7, 1.3);
      this.renderer.wave(entity.x, entity.z, '#d3bb8f', entity.radius * 2, .65);
      if (entity.enemy) this.enemyRewards(entity);
    }
  }

  updateAttacks(dt) {
    if (this.mode !== 'playing') return;
    const p = this.player;
    const accessibleZ = this.chapter === 0 ? -17.7 : this.chapter === 1 ? -45.6 : -Infinity;
    const targets = this.entities.filter(e => e.state === 'alive' && e.z >= accessibleZ && !e.skill && !e.anchor && !e.evolutionCore && !canSwallow(p.radius, e.radius) && distance(e, p) < (e.enemy ? 8.4 : 4.8) && (e.enemy || e.kind === 'house'));
    targets.sort((a, b) => Number(b.enemy) - Number(a.enemy) || distance(a, p) - distance(b, p));
    this.aimTarget = targets[0] || null;
    if (this.aimTarget && this.cooldowns.base <= 0) {
      this.shoot(this.aimTarget, 'base', (8 + p.level * 2.5) * p.power, .25);
      this.cooldowns.base = 1.15 / p.haste;
    }
    if (this.aimTarget && p.modules.cannon && this.cooldowns.cannon <= 0) {
      const rank = p.modules.cannon;
      this.shoot(this.aimTarget, 'cannon', (23 + rank * 10) * p.power * (p.evolution ? 1.45 : 1), .37);
      if (rank >= 3 && targets[1]) this.shoot(targets[1], 'cannon', 25 * p.power, .48);
      this.cooldowns.cannon = (1.32 - rank * .12) / p.haste;
      this.audio.play('shoot', p.evolution ? .9 : .65);
    }
    const nearEnemies = this.entities.filter(e => e.enemy && e.state === 'alive' && e.z >= accessibleZ && distance(e, p) < 7.5);
    if (p.modules.wind && this.cooldowns.wind <= 0 && nearEnemies.length) {
      const radius = p.evolution === 'blizzard' ? 7.4 : 5.4;
      this.renderer.wave(p.x, p.z, p.evolution === 'blizzard' ? '#a0b4e4' : '#8cbfaf', radius, 1);
      this.audio.play('wind', .55);
      for (const enemy of nearEnemies) {
        const dist = distance(enemy, p);
        if (dist > radius) continue;
        const pull = Math.min(1.25, dist * .2);
        enemy.x += (p.x - enemy.x) / Math.max(.1, dist) * pull;
        enemy.z += (p.z - enemy.z) / Math.max(.1, dist) * pull;
        this.damage(enemy, (10 + p.modules.wind * 6) * p.power * (p.evolution === 'blizzard' ? 1.9 : 1));
        if (p.evolution === 'blizzard') this.freeze(enemy, 1.5);
      }
      this.cooldowns.wind = (p.evolution ? 1.65 : 2.5) / p.haste;
    }
    if (p.modules.ice && this.cooldowns.ice <= 0 && nearEnemies.length) {
      this.renderer.wave(p.x, p.z, '#a6d9e5', 7, .7);
      this.audio.play('freeze', .6);
      for (const enemy of nearEnemies.slice(0, p.evolution ? 6 : 3)) {
        this.freeze(enemy, p.evolution ? 1.7 : 1.1);
        this.damage(enemy, (8 + p.modules.ice * 4) * p.power);
      }
      this.cooldowns.ice = (p.evolution ? 2.6 : 3.5) / p.haste;
    }
  }

  freeze(entity, duration) {
    if (entity.state !== 'alive') return;
    entity.frozen = duration * (entity.kind === 'boss' ? .35 : 1);
    entity.freezeTime = this.elapsed;
    this.renderer.burst(entity.x, entity.z, '#b1e1f0', 7, .45, 1);
  }

  shoot(target, type, damage, duration) {
    const bullet = { ...this.renderer.shotOrigin(type, this.player), tx: target.x, tz: target.z, target, type, damage, duration, age: 0 };
    this.projectiles.push(bullet); this.renderer.createProjectile(bullet);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const bullet = this.projectiles[i]; bullet.age += dt;
      if (bullet.age < bullet.duration) continue;
      const x = bullet.target?.x ?? bullet.tx, z = bullet.target?.z ?? bullet.tz;
      this.damage(bullet.target, bullet.damage);
      if (bullet.type === 'cannon' && this.player.evolution) {
        const radius = this.player.evolution === 'vortex' ? 3.3 : 2.6;
        this.renderer.wave(x, z, this.player.evolution === 'shatter' ? '#acdeea' : '#deb080', radius, .4);
        for (const entity of this.entities) {
          if (entity !== bullet.target && entity.enemy && entity.state === 'alive' && distance(entity, { x, z }) < radius) this.damage(entity, bullet.damage * .45);
        }
      }
      this.renderer.actors.remove(bullet.mesh);
      this.projectiles.splice(i, 1);
    }
  }

  warn(x, z, radius, delay, damage, owner) {
    const warning = { x, z, radius, delay, damage, age: 0, owner };
    this.warnings.push(warning); this.renderer.createWarning(warning);
    this.audio.play('warning', .35);
  }

  updateWarnings(dt) {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const warning = this.warnings[i]; warning.age += dt;
      if (warning.owner?.state !== 'alive') warning.cancelled = true;
      if (warning.age < warning.delay && !warning.cancelled) continue;
      if (!warning.cancelled) {
        this.renderer.burst(warning.x, warning.z, '#d79b6d', 24, 1.3);
        this.renderer.wave(warning.x, warning.z, '#c68a65', warning.radius * 1.1, .35);
        if (distance(warning, this.player) < warning.radius + .38) this.hurt(warning.damage);
        this.audio.play('impact', .65);
      }
      this.renderer.actors.remove(warning.mesh);
      warning.mesh.children.forEach(mesh => mesh.material.dispose());
      this.warnings.splice(i, 1);
    }
  }

  hurt(amount) {
    const p = this.player;
    if (amount <= 0 || p.invulnerable > 0 || this.mode !== 'playing') return;
    p.hp -= amount; p.lastHurt = this.elapsed; p.invulnerable = 1;
    this.stats.damage += amount;
    this.renderer.shake = .8;
    this.renderer.float(`−${amount}`, p.x, p.z, '#b57668', true);
    this.renderer.burst(p.x, p.z, '#e5b48e', 12, 1, 1.4);
    this.audio.play('hurt', .55);
    if (p.hp <= 0) { p.hp = 0; this.finish(false); }
  }

  updateEnemy(enemy, dt, dist) {
    const p = this.player;
    enemy.cooldown -= dt;
    enemy.frozen = Math.max(0, enemy.frozen - dt);
    if (this.mode === 'feast') { enemy.moving = 0; return; }
    if (enemy.frozen > 0) { enemy.moving = 0; return; }
    if (enemy.z < -46 && this.chapter < 2) return;
    if (enemy.z < -18 && this.chapter === 0) return;
    if (dist > 15) { enemy.moving = 0; return; }
    const nx = (p.x - enemy.x) / Math.max(.01, dist), nz = (p.z - enemy.z) / Math.max(.01, dist);
    if (canSwallow(p.radius, enemy.radius) && enemy.kind !== 'boss') {
      enemy.intent = 'flee'; enemy.moving = 1;
      const speed = Math.sin(enemy.age * 2) > -.5 ? 1.15 : .25;
      enemy.x -= nx * dt * speed; enemy.z -= nz * dt * speed;
      enemy.x = clamp(enemy.x, -17, 17); enemy.z = clamp(enemy.z, -80, 16);
      enemy.facing = Math.atan2(-nx, -nz); return;
    }
    enemy.facing = Math.atan2(nx, nz);
    if (enemy.intent === 'charge') {
      enemy.facing = Math.atan2(enemy.chargeX, enemy.chargeZ);
      enemy.chargeLeft -= dt;
      enemy.x += enemy.chargeX * dt * 10;
      enemy.z += enemy.chargeZ * dt * 10;
      enemy.moving = 3;
      if (distance(enemy, p) < 1.3) this.hurt(enemy.damage);
      if (enemy.chargeLeft <= 0) { enemy.intent = 'recover'; enemy.recovery = 1.7; }
      return;
    }
    if (enemy.intent === 'windup') {
      if (enemy.kind === 'ram') enemy.facing = Math.atan2(enemy.chargeX, enemy.chargeZ);
      enemy.windup -= dt; enemy.moving = 0;
      if (enemy.windup <= 0) {
        if (enemy.kind === 'ram') { enemy.intent = 'charge'; enemy.chargeLeft = .65; }
        else { enemy.intent = 'recover'; enemy.recovery = 1.2; }
      }
      return;
    }
    if (enemy.intent === 'recover') {
      enemy.recovery -= dt; enemy.moving = 0;
      if (enemy.recovery <= 0) enemy.intent = 'idle';
      return;
    }
    const screen = this.renderer.project(enemy.x, 0, enemy.z);
    const onScreen = screen.x > 0 && screen.x < this.renderer.width && screen.y > 35 && screen.y < this.renderer.height - 50;
    if (enemy.kind === 'boss') {
      if (dist < 14 && enemy.cooldown <= 0 && onScreen && this.warnings.length < 2) {
        enemy.attackIndex += 1; enemy.intent = 'windup'; enemy.windup = 1.6; enemy.cooldown = 4.4;
        if (enemy.attackIndex % 2) this.warn(p.x, p.z, 2.45, 1.6, 13, enemy);
        else { this.warn(p.x - 2, p.z, 1.9, 1.8, 11, enemy); this.warn(p.x + 2, p.z - 1, 1.9, 1.8, 11, enemy); }
      }
      enemy.moving = 0;
    } else if (enemy.kind === 'mortar') {
      if (dist < 12 && enemy.cooldown <= 0 && onScreen && this.warnings.length < 2) {
        enemy.intent = 'windup'; enemy.windup = 1.5; enemy.cooldown = 4.3;
        this.warn(p.x, p.z, 1.75, 1.7, enemy.damage, enemy);
      }
      enemy.moving = 0;
    } else if (enemy.kind === 'ram') {
      if (dist < 10 && enemy.cooldown <= 0 && onScreen && this.warnings.length < 2) {
        enemy.intent = 'windup'; enemy.windup = 1.3; enemy.cooldown = 4.8;
        enemy.chargeX = nx; enemy.chargeZ = nz;
        this.warn(enemy.x + nx * 5, enemy.z + nz * 5, 1.15, 1.3, 0, enemy);
      } else if (dist > 5 && dist < 10) { enemy.x += nx * dt * 1.3; enemy.z += nz * dt * 1.3; enemy.moving = 1; }
    } else {
      if (dist < 4.2 && enemy.cooldown <= 0 && onScreen && this.warnings.length < 2) {
        enemy.intent = 'windup'; enemy.windup = 1.2; enemy.cooldown = 3.7;
        this.warn(p.x, p.z, 1.7, 1.2, enemy.damage, enemy);
      } else if (dist > 3.1 && dist < 10 && distance(enemy, { x: enemy.homeX, z: enemy.homeZ }) < 6) {
        enemy.x += nx * dt * 1.3; enemy.z += nz * dt * 1.3; enemy.moving = 1;
      } else enemy.moving = 0;
    }
    enemy.x = clamp(enemy.x, -17, 17); enemy.z = clamp(enemy.z, -80, 16);
  }

  startFeast() {
    this.flags.bossDown = true;
    this.mode = 'feast'; this.feastRemaining = 15;
    this.score += 1500;
    this.player.hp = this.player.maxHp;
    this.audio.play('win'); this.audio.setIntensity(.8);
    this.ui.banner('The final feast', 'Victory');
    this.renderer.shake = 1;
    for (let i = 0; i < 38; i++) {
      const angle = this.rng() * TAU, radius = this.random(3, 12);
      this.spawn({ kind: i % 3 ? 'house' : 'sheep', x: clamp(this.player.x + Math.cos(angle) * radius, -17, 17), z: clamp(this.player.z + Math.sin(angle) * radius, -81, -49), radius: i % 3 ? 1.26 : .5, grade: 2, mass: 6 });
    }
    for (const warning of this.warnings) warning.cancelled = true;
  }

  finish(won) {
    if (this.mode === 'result') return;
    this.mode = 'result'; this.resultWon = won;
    this.newBest = this.score > this.profile.best;
    this.profile.best = Math.max(this.profile.best, this.score);
    if (won) this.profile.wins += 1;
    this.persist(); this.input?.clear();
    this.audio.setIntensity(.05); this.audio.play(won ? 'win' : 'lose');
    this.ui.showPanel('result', this);
  }

  snapshot() {
    return {
      mode: this.mode, seed: this.seed, elapsed: this.elapsed, chapter: this.chapter, score: this.score,
      player: { ...this.player, modules: { ...this.player.modules } }, flags: { ...this.flags }, stats: { ...this.stats },
      objective: this.objective().title,
      entities: this.entities.filter(e => e.state === 'alive').map(e => ({ id: e.id, kind: e.kind, x: e.x, z: e.z, radius: e.radius, grade: e.grade, hp: e.hp, mass: e.mass, enemy: e.enemy, skill: e.skill, group: e.group, guardian: e.guardian, evolutionCore: e.evolutionCore, anchor: e.anchor })),
    };
  }
}
