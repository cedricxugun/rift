import { t } from '../i18n.js';
import { canSwallow } from './data.js';

const TAU = Math.PI * 2;
const COLORS = {
  size: { ink: '#806024', ring: '#cfad64', border: '#dcc58f', wash: '#f4e7c7' },
  ward: { ink: '#795798', ring: '#a986ca', border: '#cdb8df', wash: '#efe6f7' },
  full: { ink: '#39754d', ring: '#6da57a', border: '#adcca8', wash: '#e6f1df' },
};

export class SwallowFeedback {
  constructor(renderer) {
    this.renderer = renderer;
    this.target = null;
    this.reason = '';
    this.elapsed = 0;
    this.labelText = '';
    this.labelLimit = 0;
    this.lines = [];
    this.labelWidth = 0;
    this.labelHeight = 0;
  }

  draw(game, dt) {
    const player = game.player;
    if (!player || (game.mode !== 'playing' && game.mode !== 'feast')) {
      this.target = null;
      this.reason = '';
      this.elapsed = 0;
      return;
    }

    let target = null;
    let reason = '';
    let nearest = Infinity;
    for (const entity of game.entities) {
      if (entity.state !== 'alive' || (entity.category !== 'prop' && entity.category !== 'enemy') || entity.spawning > 0) continue;
      const dx = entity.x - player.x;
      const dz = entity.z - player.z;
      const distance = dx * dx + dz * dz;
      const range = player.radius + entity.radius * 0.5 + 0.75;
      if (distance > range * range || distance >= nearest) continue;

      let restriction = '';
      if (entity.healing && player.hp >= player.maxHp) restriction = 'full';
      else if (entity.ward > 0) restriction = 'ward';
      else if (!canSwallow(player, entity)) {
        if (entity.anchored) continue;
        restriction = 'size';
      }
      target = entity;
      reason = restriction;
      nearest = distance;
    }

    if (target !== this.target || reason !== this.reason) {
      this.target = target;
      this.reason = reason;
      this.elapsed = 0;
    }
    if (!target) return;
    this.elapsed += Math.max(0, Number(dt) || 0);

    const renderer = this.renderer;
    const ctx = renderer.ctx;
    const point = renderer.project(target.x, target.z);
    const radius = Math.max(11, Math.min(25, target.radius * renderer.scale * 0.7));
    const depth = renderer.sy / renderer.scale;
    if (!reason) {
      ctx.save();
      ctx.strokeStyle = '#67a977';
      ctx.globalAlpha *= 0.32;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius, radius * depth, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.elapsed <= 0.35) return;

    let text;
    if (reason === 'full') text = t('Full health — saved for later');
    else if (reason === 'ward') text = t(target.eventType==='outpost'?'Defeat the wardens, then swallow the cache.':'Break the ward first');
    else text = t('Too large for your mouth');

    const color = COLORS[reason];
    const opacity = Math.min(1, (this.elapsed - 0.35) / 0.12);
    const maxLabelWidth = Math.min(300, renderer.width - 24);
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    if (text !== this.labelText || maxLabelWidth !== this.labelLimit) {
      this.labelText = text;
      this.labelLimit = maxLabelWidth;
      this.lines = [];
      const textLimit = maxLabelWidth - 42;
      const words = /\s/.test(text) ? text.split(/\s+/) : Array.from(text);
      const separator = /\s/.test(text) ? ' ' : '';
      let line = '';
      for (const word of words) {
        const next = line ? `${line}${separator}${word}` : word;
        if (line && ctx.measureText(next).width > textLimit) {
          this.lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) this.lines.push(line);
      this.labelWidth = Math.min(maxLabelWidth, Math.max(...this.lines.map(value => ctx.measureText(value).width)) + 42);
      this.labelHeight = Math.max(30, this.lines.length * 15 + 12);
    }

    const width = this.labelWidth;
    const height = this.labelHeight;
    const portrait = renderer.height > renderer.width;
    const bottomReserve = portrait ? Math.min(235, renderer.height * 0.28) : 112;
    const bottom = renderer.height - bottomReserve;
    let x = Math.max(12, Math.min(renderer.width - width - 12, point.x - width * 0.5));
    let y = Math.max(32, Math.min(bottom - height, point.y + radius * depth + 9));
    const abilityLeft = renderer.width - 132;
    const abilityTop = renderer.height - (portrait ? 235 : 145);
    if (x + width > abilityLeft && y + height > abilityTop) {
      const playerPoint = renderer.project(player.x, player.z);
      x = Math.max(12, Math.min(renderer.width - width - 12, playerPoint.x - width * 0.5));
      y = Math.max(32, Math.min(abilityTop - height - 9, playerPoint.y + player.radius * renderer.sy + 13));
    }

    ctx.strokeStyle = color.ring;
    ctx.fillStyle = `${color.ring}15`;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radius, radius * depth, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fffcec';
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + width - 10, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + 10);
    ctx.lineTo(x + width, y + height - 10);
    ctx.quadraticCurveTo(x + width, y + height, x + width - 10, y + height);
    ctx.lineTo(x + 10, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - 10);
    ctx.lineTo(x, y + 10);
    ctx.quadraticCurveTo(x, y, x + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(x + 17, y + height * 0.5);
    ctx.fillStyle = color.wash;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (reason === 'ward') {
      ctx.moveTo(0, -7);
      ctx.lineTo(6, -4);
      ctx.lineTo(5, 2);
      ctx.quadraticCurveTo(3, 6, 0, 8);
      ctx.quadraticCurveTo(-3, 6, -5, 2);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.moveTo(1, -4);
      ctx.lineTo(-1, 0);
      ctx.lineTo(2, 1);
      ctx.lineTo(0, 5);
    } else if (reason === 'full') {
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-11, -1, -5, -10, 0, -4);
      ctx.bezierCurveTo(5, -10, 11, -1, 0, 6);
    } else {
      ctx.moveTo(-2, -6);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, -2);
      ctx.moveTo(2, -6);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, -2);
      ctx.moveTo(-2, 6);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-6, 2);
      ctx.moveTo(2, 6);
      ctx.lineTo(6, 6);
      ctx.lineTo(6, 2);
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = color.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textY = y + height * 0.5 - ((this.lines.length - 1) * 15) / 2;
    for (let i = 0; i < this.lines.length; i += 1) ctx.fillText(this.lines[i], x + 32, textY + i * 15);
    ctx.restore();
  }
}
