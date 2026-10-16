const TAU = Math.PI * 2;
const clamp = n => Math.max(-24, Math.min(24, n));

export class Harvest {
  constructor(game) { this.game = game; this.collected = 0; this.piles = 0; this.special = null; }

  opening() {
    const g = this.game, p = g.player;
    const starts = [[-9, 8], [9, 8], [-8, -8], [8, -8]];
    const start = starts[Math.floor(g.random() * starts.length)];
    p.x = start[0] + g.rng(-1.5, 1.5); p.z = start[1] + g.rng(-1.5, 1.5);
    g.entities = g.entities.filter(e => e.healing || e.buff || Math.hypot(e.x - p.x, e.z - p.z) > 8);
    this.pile(p.x, p.z - 1.3, 9, true);
    const count = 6 + Math.floor(g.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + i / count * TAU + g.rng(-.12, .12);
      const reach = g.rng(2.8, 5.4);
      this.pile(clamp(p.x + Math.cos(angle) * reach), clamp(p.z + Math.sin(angle) * reach), 5 + Math.floor(g.random() * 4));
    }
    if (g.random() < .18) {
      this.special = g.random() < .5 ? 'starSeed' : 'windFruit';
      g.prop('ore', p.x + 2.7, p.z - 2, { radius: .24, mass: 3, harvest: true, treasure: this.special });
    }
  }

  pile(x, z, count = 6, guaranteed = false) {
    const g = this.game, pileId = ++this.piles;
    for (let i = 0; i < count; i++) {
      const level = i < 4 ? 0 : i < 7 ? 1 : 2, angle = i * 2.4;
      const kind = ['crate', 'barrel', 'ore'][Math.floor(g.random() * 3)];
      g.prop(kind, x + Math.cos(angle) * (.18 + (2 - level) * .16), z + Math.sin(angle) * .35,
        { radius: .24, mass: guaranteed ? 2 : 1.4 + g.random() * .8, harvest: true, pileId, stackLevel: level, pileX: x, pileZ: z });
    }
  }

  collect(entity) {
    if (!entity.harvest) return;
    const g = this.game, p = g.player;
    this.collected++;
    g.emit('harvest-eat', { x: p.x, z: p.z, count: this.collected });
    if (entity.treasure === 'starSeed') { p.rerolls = Math.min(3, p.rerolls + 1); g.emit('treasure', { title: 'Star seed', detail: 'One extra skill reroll.' }); }
    if (entity.treasure === 'windFruit') { p.harvestRush = 12; g.emit('treasure', { title: 'Wind fruit', detail: 'Move and gather faster for 12 seconds.' }); }
  }

  recovery() {
    const g = this.game, p = g.player;
    if (g.entities.filter(e => e.harvest && e.state === 'alive').length > 35) return;
    const angle = g.rng(0, TAU);
    for (let i = 0; i < 2; i++) this.pile(clamp(p.x + Math.cos(angle + i * .6) * 4), clamp(p.z + Math.sin(angle + i * .6) * 4), 5);
  }
}
