import { t, supportedLanguages } from './i18n.js';
import { SKILLS, EVOLUTIONS, ENEMIES, GROWTH } from './rules.js';

const shapes = {
  mouth: '<ellipse cx="12" cy="16" rx="9" ry="4"/><path d="M5 14V7h3V4h3v5h3V5h4v9M3 16v-5m18 5v-5"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  refresh: '<path d="M20 10a8 8 0 1 0-1 7M20 4v6h-6"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4Zm4 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4Zm5 4 5 6m0-6-5 6"/>',
  book: '<path d="M12 6C8 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-1-10 2Zm0 0v15"/>',
  gear: '<path d="m10 3-1 3-3 1-2-1-2 4 2 2v3l-1 2 3 3 3-1 3 1 1 2 4-1 1-3 3-2 2 1 1-4-2-2-1-3 1-2-4-2-2 2-3-1Z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  cannon: '<path d="M3 13h11l7-5-2-4-11 6H3Zm0 0 1 5h12M9 10l3 3"/><circle cx="7" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h18M5 16h10a3 3 0 1 1-3 3"/>',
  ice: '<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4m15 9-4 1 1 4M3 14l4 1-1 4m15-9-4-1 1-4"/>',
  vortex: '<path d="M21 12a9 9 0 1 0-9 9 6 6 0 0 0 6-6 4 4 0 0 0-8 0 2 2 0 0 0 4 0"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  leaf: '<path d="M20 3C7 2 1 9 5 16c5 8 15 0 15-13ZM4 21 16 8"/>',
  skull: '<path d="M8 18H5v-7a7 7 0 0 1 14 0v7h-3v4H8Z"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><path d="m10 17 2-2 2 2"/>',
  sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4m-2-2h4"/>',
  bolt: '<path d="m14 2-9 12h6l-1 8 9-13h-6Z"/>',
  flame: '<path d="M13 2c1 7 7 7 7 13a8 8 0 0 1-16 0c0-4 3-6 4-9 0 5 3 5 3 7 2-3 2-7 2-11Z"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.sparkle}</svg>`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function tr(key, options) { return escapeHtml(t(key, options)); }

export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export class GameUI {
  constructor(root, onAction) {
    this.root = root;
    this.onAction = onAction;
    this.modal = null;
    this.toastTimer = null;
    this.bannerTimer = null;
    this.lastModules = '';
    this.root.innerHTML = '<div id="title-screen"></div><div id="hud" hidden></div><div id="panel-layer" hidden></div><div id="world-labels"></div><div id="objective-arrow" hidden></div><div id="toast" role="status" aria-live="polite"></div><div id="chapter-banner" aria-live="polite"></div>';
    this.title = root.querySelector('#title-screen');
    this.hud = root.querySelector('#hud');
    this.panel = root.querySelector('#panel-layer');
    this.labels = root.querySelector('#world-labels');
    this.arrow = root.querySelector('#objective-arrow');
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      onAction(button.dataset.action, button.dataset.value);
    });
    root.addEventListener('change', event => {
      if (event.target.dataset.setting) onAction('setting', { key: event.target.dataset.setting, value: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
    });
    root.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || !this.modal) return;
      const focusable = [...this.panel.querySelectorAll('button:not(:disabled), input, select')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }

  showTitle(profile, settings) {
    this.hud.hidden = true;
    this.title.hidden = false;
    this.labels.innerHTML = '';
    this.arrow.hidden = true;
    this.hidePanel();
    this.title.innerHTML = `
      <header class="title-top"><div class="brand-mini">${icon('mouth')}<span>POCKET CITADEL</span></div><span class="offline-tag"><i></i>${tr('Offline · no account')}</span></header>
      <section class="title-copy"><div class="eyebrow"><span></span>${tr('An offline swallowing adventure')}</div>
      <h1>${tr('Pocket Citadel')}</h1><p class="title-tagline">${tr('Small city. Endless appetite.')}</p>
      <p class="title-intro">${tr('Every old threat can become your next meal.')}</p>
      <button class="primary title-play" data-action="start">${icon('play')}<span>${tr('Start journey')}</span>${icon('arrow')}</button>
      <label class="tutorial-toggle"><input type="checkbox" data-setting="tutorial" ${settings.tutorial ? 'checked' : ''}><span>${tr('First journey? Learn as you play.')}</span></label>
      <div class="title-tools"><button class="text-button" data-action="guide">${icon('book')}${tr('Field guide')}</button><button class="text-button" data-action="settings">${icon('gear')}${tr('Settings')}</button></div>
      </section>
      <div class="title-note"><span class="note-rune">${icon('vortex')}</span><span>${tr('Eat to grow')}<i>·</i>${tr('Build to fight')}<i>·</i>${tr('Hunt to evolve')}</span></div>
      <footer class="title-footer"><span>${tr('WASD / arrow keys to move')}<b>·</b>${tr('Hold and drag to move')}</span><span>${profile.best ? `${tr('Best score')} <strong>${profile.best.toLocaleString()}</strong>` : tr('The first expedition')}</span></footer>`;
  }

  startHUD(game) {
    this.title.hidden = true;
    this.hud.hidden = false;
    this.lastModules = '';
    this.hud.innerHTML = `
      <header class="hud-top"><div class="hud-brand">${icon('mouth')}<span>${tr('Pocket Citadel')}</span></div>
      <div class="chapter-track"><span id="chapter-name"></span><div class="chapter-dots"><i></i><i></i><i></i></div></div>
      <div class="hud-actions"><span id="run-time">00:00</span><button class="icon-button" data-action="sound" aria-label="${tr(game.settings.muted ? 'Sound off' : 'Sound on')}">${icon(game.settings.muted ? 'mute' : 'sound')}</button><button class="icon-button" data-action="pause" aria-label="${tr('Pause')}">${icon('pause')}</button></div></header>
      <section class="growth-panel"><div class="level-disc"><small>${tr('Mouth size')}</small><strong id="level-number">I</strong></div><div class="growth-detail"><div class="growth-caption"><span id="growth-caption">${tr('Next size')}</span><b id="mass-value"></b></div><div class="meter mass-meter"><i id="mass-bar"></i></div><div class="health-row">${icon('shield')}<div class="meter health-meter"><i id="health-bar"></i></div><span id="health-value"></span></div></div></section>
      <aside class="objective-panel"><span class="objective-mark">${icon('target')}</span><div><small>${tr('Objective')}</small><strong id="objective-title"></strong><p id="objective-detail"></p></div><span id="objective-progress"></span></aside>
      <aside class="minimap-wrap"><canvas id="minimap" width="124" height="150" aria-label="${tr('Objective')}"></canvas><span id="map-caption">${tr('The meadow')}</span></aside>
      <div id="boss-bar" hidden><span>${icon('skull')}${tr('The wandering keep')}</span><div class="meter"><i></i></div></div>
      <div class="bottom-hud"><div class="bottom-hint"><span class="keycap">W A S D</span><span>${tr('Hold and drag to move')}</span></div><div id="module-slots"></div><button class="icon-button guide-button" data-action="guide" aria-label="${tr('Field guide')}">${icon('book')}</button></div>
      <div id="feast-banner" hidden><small>${tr('The final feast')}</small><strong></strong></div>`;
    this.refs = Object.fromEntries([...this.hud.querySelectorAll('[id]')].map(el => [el.id, el]));
    this.minimap = this.refs.minimap.getContext('2d');
    this.updateHUD(game);
  }

  updateHUD(game) {
    if (this.hud.hidden || !game.player) return;
    const p = game.player;
    const r = this.refs;
    const objective = game.objective();
    r['run-time'].textContent = formatTime(game.elapsed);
    r['level-number'].textContent = ['I', 'II', 'III', 'IV', 'V'][p.level - 1];
    r['growth-caption'].textContent = t(p.level === 5 ? 'Maximum size' : 'Next size');
    const floor = GROWTH[p.level - 1].mass;
    const next = GROWTH[p.level]?.mass;
    r['mass-value'].textContent = next ? `${Math.floor(p.mass)} / ${next}` : Math.floor(p.mass).toString();
    r['mass-bar'].style.width = `${next ? Math.min(100, (p.mass - floor) / (next - floor) * 100) : 100}%`;
    r['health-bar'].style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    r['health-bar'].classList.toggle('low', p.hp < p.maxHp * .3);
    r['health-value'].textContent = `${Math.ceil(p.hp)}`;
    const chapterName = ['The meadow', 'The foundry', 'The citadel'][game.chapter];
    r['chapter-name'].textContent = t(chapterName);
    r['map-caption'].textContent = t(chapterName);
    this.hud.querySelectorAll('.chapter-dots i').forEach((el, i) => el.classList.toggle('active', i <= game.chapter));
    r['objective-title'].textContent = t(objective.title);
    r['objective-detail'].textContent = game.settings.tutorial ? t(objective.detail || '') : '';
    r['objective-progress'].textContent = objective.progress || '';
    const signature = JSON.stringify(p.modules) + p.evolution;
    if (signature !== this.lastModules) {
      this.lastModules = signature;
      const modules = Object.entries(p.modules).filter(([, rank]) => rank);
      r['module-slots'].innerHTML = modules.map(([key, rank]) => `<button class="module-slot" style="--module-color:${SKILLS[key].color}" data-action="module" data-value="${key}"><span class="module-icon">${icon(SKILLS[key].icon)}</span><span class="module-copy"><strong>${tr(SKILLS[key].name)}</strong><small>${tr('Lv. {{level}}', { level: rank })}</small></span><span class="module-pips">${[1, 2, 3].map(i => `<i class="${i <= rank ? 'filled' : ''}"></i>`).join('')}</span></button>`).join('') + Array.from({ length: Math.max(0, 2 - modules.length) }, () => `<div class="module-slot empty"><span class="module-icon">＋</span><span class="module-copy"><strong>${tr('Empty module')}</strong><small>${tr('Find your first tower')}</small></span></div>`).join('') + (p.evolution ? `<button class="evolution-chip" data-action="build" style="--module-color:${EVOLUTIONS[p.evolution].color}">${icon(EVOLUTIONS[p.evolution].icon)}<span>${tr(EVOLUTIONS[p.evolution].name)}</span></button>` : '');
    }
    const boss = game.entities.find(e => e.kind === 'boss' && e.state === 'alive');
    r['boss-bar'].hidden = !boss || game.chapter < 2 || game.player.z > -52;
    if (boss) r['boss-bar'].querySelector('.meter i').style.width = `${boss.hp / boss.maxHp * 100}%`;
    r['feast-banner'].hidden = game.mode !== 'feast';
    if (game.mode === 'feast') r['feast-banner'].querySelector('strong').textContent = t('{{seconds}} seconds of endless appetite', { seconds: Math.ceil(game.feastRemaining) });
    this.drawMinimap(game, objective);
  }

  drawMinimap(game, objective) {
    const c = this.minimap;
    c.clearRect(0, 0, 124, 150);
    c.fillStyle = '#e6e5d7'; c.fillRect(8, 5, 108, 140);
    c.fillStyle = '#d9dfc2'; c.fillRect(8, 100, 108, 45);
    c.fillStyle = '#e1d2b6'; c.fillRect(8, 56, 108, 44);
    c.fillStyle = '#c8d7d6'; c.fillRect(8, 5, 108, 51);
    const px = x => 62 + x * 2.55;
    const py = z => 7 + (z + 84) / 104 * 136;
    c.strokeStyle = '#faf5e7'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(62, 7); c.lineTo(62, 143); c.stroke();
    for (const entity of game.entities) {
      if (entity.state !== 'alive') continue;
      if (!(entity.enemy || entity.skill || entity.evolutionCore)) continue;
      c.fillStyle = entity.enemy ? '#b87861' : '#8d78b0';
      c.beginPath(); c.arc(px(entity.x), py(entity.z), entity.kind === 'boss' ? 4 : 2, 0, Math.PI * 2); c.fill();
    }
    if (objective.target) {
      c.strokeStyle = '#79659d'; c.lineWidth = 2;
      c.beginPath(); c.arc(px(objective.target.x), py(objective.target.z), 5, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#343b3b'; c.strokeStyle = '#fff9eb'; c.lineWidth = 2;
    c.beginPath(); c.arc(px(game.player.x), py(game.player.z), 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
  }

  showPanel(type, game, value) {
    this.modal = type;
    this.panel.hidden = false;
    const close = `<button class="icon-button panel-close" data-action="close" aria-label="${tr('Close')}">${icon('close')}</button>`;
    let content = '';
    let wide = false;
    if (type === 'pause') {
      content = `<div class="panel-emblem">${icon('mouth')}</div><p class="eyebrow">${tr('Pocket Citadel')}</p><h2>${tr('Pause')}</h2><p class="panel-subtitle">${tr('Every old threat can become your next meal.')}</p><button class="primary" data-action="resume">${icon('play')}${tr('Resume')}</button><button class="secondary" data-action="settings">${icon('gear')}${tr('Settings')}</button><button class="secondary" data-action="guide">${icon('book')}${tr('Field guide')}</button><div class="panel-links"><button data-action="restart">${tr('Restart journey')}</button><button data-action="home">${tr('Return to title')}</button></div>`;
    } else if (type === 'settings') {
      content = `<p class="eyebrow">POCKET CITADEL</p><h2>${tr('Settings')}</h2><div class="settings-list"><label><span>${icon('sound')}${tr('Music and effects')}</span><input type="checkbox" data-setting="sound" ${!game.settings.muted ? 'checked' : ''}></label><label><span>${icon('sparkle')}${tr('Reduced motion')}</span><input type="checkbox" data-setting="reducedMotion" ${game.settings.reducedMotion ? 'checked' : ''}></label><label><span>${icon('book')}${tr('Tutorial')}</span><input type="checkbox" data-setting="tutorial" ${game.settings.tutorial ? 'checked' : ''}></label><label><span>${tr('Quality')}</span><select data-setting="quality"><option value="high" ${game.settings.quality === 'high' ? 'selected' : ''}>${tr('High')}</option><option value="balanced" ${game.settings.quality === 'balanced' ? 'selected' : ''}>${tr('Balanced')}</option></select></label><label><span>${tr('Language')}</span><select data-setting="language">${supportedLanguages.map(lang => `<option value="${lang.code}" ${game.settings.language === lang.code ? 'selected' : ''}>${escapeHtml(lang.label)}</option>`).join('')}</select></label></div><p class="fine-print">${tr('Progress is saved on this device.')}</p><button class="primary" data-action="close">${tr('Continue')}${icon('arrow')}</button>`;
    } else if (type === 'guide') {
      wide = true;
      content = `<p class="eyebrow">THE LITTLE KINGDOM HANDBOOK</p><h2>${tr('Field guide')}</h2><div class="guide-rules"><div>${icon('mouth')}<strong>${tr('Eat to grow')}</strong><p>${tr('Small enough? Swallow it.')}</p></div><div>${icon('cannon')}<strong>${tr('Build to fight')}</strong><p>${tr('Too big? Break it, then feast.')}</p></div><div>${icon('sparkle')}<strong>${tr('Hunt to evolve')}</strong><p>${tr('Choose buildings to shape your abilities.')}</p></div></div><h3>${tr('Core buildings')}</h3><div class="guide-grid">${Object.entries(SKILLS).map(([id, skill]) => `<div class="guide-card" style="--module-color:${skill.color}"><span class="guide-icon">${icon(skill.icon)}</span><strong>${tr(skill.name)}</strong><p>${tr(skill.description)}</p></div>`).join('')}</div><h3>${tr('Enemy field notes')}</h3><div class="enemy-notes">${Object.values(ENEMIES).map(e => `<div>${icon('skull')}<span>${tr(e.name)}</span><b>${['I','II','III','IV','V'][e.grade - 1]}</b></div>`).join('')}</div><p class="fine-print">${tr('All three evolutions are available from your first journey.')}</p><button class="primary" data-action="close">${tr('Continue')}${icon('arrow')}</button>`;
    } else if (type === 'evolution') {
      const evo = EVOLUTIONS[game.player.evolution];
      content = `<div class="awakening-emblem" style="--module-color:${evo.color}">${icon(evo.icon)}<i></i><i></i></div><p class="eyebrow">${tr('Evolution unlocked')}</p><h2>${tr(evo.name)}</h2><div class="fusion-recipe">${evo.skills.map(id => `<span style="--module-color:${SKILLS[id].color}">${icon(SKILLS[id].icon)}${tr(SKILLS[id].name)}</span>`).join('<b>＋</b>')}</div><p class="panel-description">${tr(evo.description)}</p><p class="awakening-note">${tr('Your city has awakened.')}</p><button class="primary" data-action="awaken">${tr('Continue')}${icon('arrow')}</button>`;
    } else if (type === 'result') {
      const won = game.resultWon;
      content = `<div class="result-emblem ${won ? 'won' : ''}">${icon(won ? 'star' : 'mouth')}</div><p class="eyebrow">${tr(won ? 'Journey complete' : 'Journey ended')}</p><h2>${tr(won ? 'Victory' : 'The city needs a rest')}</h2><p class="panel-subtitle">${tr(won ? 'A little city. A very big appetite.' : 'Try another route')}</p><div class="result-score"><strong>${game.score.toLocaleString()}</strong>${game.newBest ? `<span>${tr('New best')}</span>` : ''}</div><div class="result-stats"><div><strong>${game.stats.eaten}</strong><span>${tr('Buildings swallowed')}</span></div><div><strong>${game.stats.kills}</strong><span>${tr('Enemies defeated')}</span></div><div><strong>${formatTime(game.elapsed)}</strong><span>${tr('Time')}</span></div></div>${game.player.evolution ? `<div class="result-build">${icon(EVOLUTIONS[game.player.evolution].icon)}${tr(EVOLUTIONS[game.player.evolution].name)}</div>` : ''}<button class="primary" data-action="restart">${tr('Play again')}${icon('arrow')}</button><button class="text-button centered" data-action="home">${tr('Return to title')}</button>`;
    } else if (type === 'module' || type === 'build') {
      const data = type === 'build' ? EVOLUTIONS[game.player.evolution] : SKILLS[value];
      if (!data) { this.hidePanel(); return; }
      content = `<div class="panel-emblem" style="color:${data.color}">${icon(data.icon)}</div><p class="eyebrow">${tr(type === 'build' ? 'Evolution' : 'Core buildings')}</p><h2>${tr(data.name)}</h2><p class="panel-description">${tr(data.description)}</p><div class="build-stats"><span>${tr('Power')}<b>${Math.round(game.player.power * 100)}%</b></span><span>${tr('Cooldown')}<b>${Math.round(game.player.haste * 100)}%</b></span><span>${tr('Mouth size')}<b>${game.player.level}</b></span></div><button class="primary" data-action="close">${tr('Continue')}${icon('arrow')}</button>`;
    }
    this.panel.innerHTML = `<div class="panel-backdrop"></div><section class="game-panel ${wide ? 'wide-panel' : ''}" role="dialog" aria-modal="true" aria-label="${tr(type === 'guide' ? 'Field guide' : type === 'settings' ? 'Settings' : 'Pocket Citadel')}">${type !== 'evolution' && type !== 'result' ? close : ''}${content}</section>`;
    const focusTarget = this.panel.querySelector('button.primary') || this.panel.querySelector('button');
    focusTarget?.focus({ preventScroll: true });
  }

  hidePanel() { this.modal = null; this.panel.hidden = true; this.panel.innerHTML = ''; }

  toast(key, options = {}, type = 'sparkle') {
    const el = this.root.querySelector('#toast');
    el.innerHTML = `${icon(type)}<span>${tr(key, options)}</span>`;
    el.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
  }

  banner(title, subtitle = '') {
    const el = this.root.querySelector('#chapter-banner');
    el.innerHTML = `<span></span><small>${subtitle ? tr(subtitle) : 'POCKET CITADEL'}</small><strong>${tr(title)}</strong><span></span>`;
    el.classList.add('visible');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('visible'), 2900);
  }
}
