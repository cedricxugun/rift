const TAU = Math.PI * 2;
const clamp = n => Math.max(-26, Math.min(26, n));

// Delayed volleys belong to their caster: killing it cancels the pending attack.
export class EnemyPatterns {
  constructor(game) { this.game = game; this.pending = []; }
  queue(e, delay, angle, count, spread, speed, pattern = 'fan', gap = null, turn = 0) {
    if (this.pending.length >= 28) return;
    this.pending.push({ source: e.id, delay, angle, count, spread, speed, pattern, gap, turn });
  }
  update(dt) {
    const g = this.game;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const shot = this.pending[i];
      const e = g.entities.find(e => e.id === shot.source && e.state === 'alive');
      if (!e || g.mode !== 'playing') { this.pending.splice(i, 1); continue; }
      shot.delay -= dt;
      if (shot.delay > 0) continue;
      this.pending.splice(i, 1);
      if (e.frozen > 0 || e.controlLock > 0) continue;
      g.volley(e, shot.angle, shot.count, shot.spread, shot.speed, shot.pattern, shot.gap, shot.turn);
    }
  }
  danger(e, warning) {
    const g = this.game;
    if (g.warnings.length >= 12) return;
    g.warnings.push({ x: e.x, z: e.z, radius: 1.3, age: 0, delay: 1.15, damage: e.damage, source: e.id, ...warning });
    g.emit('enemy-cast', { x: e.x, z: e.z, tx: warning.x ?? e.x, tz: warning.z ?? e.z, delay: warning.delay || 1.15, kind: warning.kind || 'bloom' });
  }
  fire(e) {
    const g = this.game, p = g.player, a = e.lockAngle || 0, index = e.attackIndex;
    if (e.kind === 'beetle') {
      g.volley(e, a, g.time > 180 ? 3 : 1, .23, 4.6);
      if (g.time > 40) this.queue(e, .3, a, e.veteran ? 3 : 1, .24, 5.6);
    } else if (e.kind === 'mortar') {
      if (index % 3 === 0) {
        for (let i = 0; i < 4; i++) this.danger(e, { x: clamp(p.x + Math.cos(a) * (i - 1) * 2.2), z: clamp(p.z + Math.sin(a) * (i - 1) * 2.2), radius: 1.15, delay: 1.05 + i * .24, duration: .6 });
      } else if (index % 2 === 0) g.volley(e, a, 5, .28, 5.4);
      else for (let i = 0; i < 3; i++) this.danger(e, { x: clamp(p.x + p.vx * 1.4 + (i - 1) * 2.5), z: clamp(p.z + p.vz * 1.4 + (i - 1) * .8), radius: 1.2, delay: 1.2 + i * .23, duration: 1 });
    } else if (e.kind === 'mage') {
      if (index % 3 === 0) {
        g.volley(e, a - .65, 5, .3, 3.6, 'fan', null, .32);
        this.queue(e, .55, a + .65, 5, .3, 3.6, 'fan', null, -.32);
      } else if (index % 2) g.volley(e, a + Math.PI, e.veteran ? 16 : 12, 0, 3.6, 'ring', a);
      else { g.volley(e, a - .4, 3, .23, 5.1); this.queue(e, .42, a + .4, 3, .23, 5.1); }
    } else if (e.kind === 'herald') {
      const allies = g.entities.filter(other => other !== e && other.category === 'enemy' && other.state === 'alive' && !other.elite && !other.boss && Math.hypot(other.x - e.x, other.z - e.z) < 8).sort((a,b) => Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)).slice(0,3);
      for (const ally of allies) { const added = Math.max(0, ally.maxHp * .32 - (ally.relayWard || 0)); ally.ward += added; ally.relayWard = (ally.relayWard || 0) + added; ally.wardSource = e.id; ally.maxWard = Math.max(ally.maxWard, ally.ward); }
      g.emit('ward-relay', { x: e.x, z: e.z });
      g.volley(e, a, 3, .4, 4.2);
      if (g.time > 270) this.queue(e, .65, a, 8, 0, 3.4, 'ring', a);
    } else if (e.kind === 'golem') {
      if (index % 2) this.danger(e, { kind: 'ring', radius: 6.5, width: .44, delay: 1.2, duration: 1.4 });
      else for (let i = 0; i < 4; i++) this.danger(e, { x: clamp(e.x + Math.cos(a) * (2 + i * 2)), z: clamp(e.z + Math.sin(a) * (2 + i * 2)), radius: 1.25, delay: 1 + i * .22, duration: .55 });
    } else if (e.kind === 'elite') {
      if (index % 4 === 0) this.danger(e, { kind: 'line', angle: a, length: 14, radius: .48, delay: 1.15, duration: .28 });
      else if (index % 2) { g.volley(e, a + Math.PI, 14, 0, 4.1, 'ring', a); this.queue(e, .65, a + Math.PI + .18, 14, 0, 3.5, 'ring', a + .25); }
      else { g.volley(e, a - .35, 5, .2, 5.6); this.queue(e, .45, a + .35, 5, .2, 5.6); }
    } else if (e.kind === 'eye') {
      if (index % 3 === 0) {
        for (let i = 0; i < 5; i++) this.queue(e, i * .22, a - .75 + i * .38, 3, .19, 5.5);
      } else {
        g.volley(e, a + Math.PI, 16, 0, 3.6, 'ring', a);
        this.queue(e, .68, a + Math.PI + .15, 16, 0, 4.1, 'ring', a + .42);
      }
    } else if (e.boss) {
      const attack = index % (e.phase === 1 ? 3 : 4);
      if (attack === 0) {
        for (let i = 0; i < 5; i++) this.queue(e, i * .2, a - .64 + i * .32, 3, .2, 5.6);
      } else if (attack === 1) {
        g.volley(e, a + Math.PI, 18, 0, 4, 'ring', a);
        this.queue(e, .7, a + Math.PI + .17, 18, 0, 4.3, 'ring', a + .38);
      } else if (attack === 2) {
        this.danger(e, { kind: 'line', angle: a - .42, length: 15, radius: .5, delay: 1.25, duration: .3 });
        this.danger(e, { kind: 'line', angle: a + .42, length: 15, radius: .5, delay: 1.25, duration: .3 });
      } else {
        this.danger(e, { kind: 'ring', radius: 9, width: .5, delay: 1.25, duration: 1.65 });
        for (let i = 0; i < 3; i++) this.danger(e, { x: clamp(p.x + (i-1)*3), z: clamp(p.z + (i%2 ? 2 : -1)), radius: 1.3, delay: 1.65 + i*.2, duration: .4 });
      }
    }
  }
}
