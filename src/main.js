import { initI18n, setLanguage, t } from './i18n.js';
import { GameAudio } from './audio.js';
import { WorldRenderer } from './renderer.js';
import { GameInput } from './input.js';
import { GameUI, escapeHtml } from './ui.js';
import { CitadelGame } from './game.js';

async function boot() {
const DEFAULT_SETTINGS = { language: 'zh', muted: false, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, quality: window.innerWidth < 700 ? 'balanced' : 'high', tutorial: true };
let stored = {};
try { stored = JSON.parse(localStorage.getItem('pocket-citadel-v1') || '{}'); } catch { /* Private browsing and file URLs can restrict persistence. */ }
const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
if (!['high', 'balanced'].includes(settings.quality)) settings.quality = DEFAULT_SETTINGS.quality;
const profile = { best: 0, journeys: 0, wins: 0, discoveries: [], ...(stored.profile || {}) };
if (!Array.isArray(profile.discoveries)) profile.discoveries = [];
for (const key of ['best', 'journeys', 'wins']) if (!Number.isFinite(profile[key]) || profile[key] < 0) profile[key] = 0;
function persist() {
  try { localStorage.setItem('pocket-citadel-v1', JSON.stringify({ settings, profile })); } catch { /* The entire game still works without storage. */ }
}

const languageEngine = await initI18n(settings.language);
settings.language = languageEngine.language;
document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : settings.language;
document.body.classList.toggle('reduced-motion', settings.reducedMotion);
const audio = new GameAudio(); audio.setMuted(settings.muted);
const ui = new GameUI(document.getElementById('ui'), onAction);
let renderer;
try {
  renderer = new WorldRenderer(document.getElementById('world'), document.getElementById('effects'), settings);
} catch (error) {
  document.getElementById('loading').remove();
  document.getElementById('ui').innerHTML = `<section class="error-panel"><h1>${escapeHtml(t('Your browser could not start the 3D world.'))}</h1><p>${escapeHtml(t('Try opening this file in a recent Chrome, Edge, Firefox or Safari browser.'))}</p><button class="primary" onclick="location.reload()">${escapeHtml(t('Reload'))}</button></section>`;
  throw error;
}
const game = new CitadelGame(renderer, audio, ui, settings, profile, persist);
const input = new GameInput(document.getElementById('world'), renderer, () => onAction('pause'));
game.input = input;
ui.showTitle(profile, settings);
let lastTime = performance.now();
let renderTime = 0;
let manualSimulation = false;
let lastQaPaint = 0;
let previousPanelMode = 'playing';
let previousPanel = null;

async function onAction(action, value) {
  audio.play('click', .35);
  if (action === 'start' || action === 'restart') {
    audio.setPaused(false); await audio.unlock();
    game.extraCore = null;
    game.reset(Math.floor(Math.random() * 90000) + 10000);
    previousPanel = null;
  } else if (action === 'home') {
    input.clear(); game.extraCore = null; game.reset(7216, true);
    audio.setIntensity(0); audio.setPaused(true);
    ui.showTitle(profile, settings);
  } else if (action === 'pause') {
    if (game.mode === 'title' || game.mode === 'result' || game.mode === 'awakening') return;
    if (game.mode === 'paused') { await onAction('resume'); return; }
    previousPanelMode = game.mode; game.mode = 'paused'; input.clear(); audio.setPaused(true); ui.showPanel('pause', game);
  } else if (action === 'resume' || action === 'awaken') {
    ui.hidePanel(); game.mode = action === 'awaken' ? 'playing' : previousPanelMode;
    if (!['playing', 'feast'].includes(game.mode)) game.mode = 'playing';
    input.clear(); audio.setPaused(false); await audio.unlock();
    if (action === 'awaken') { audio.play('evolve', .65); ui.banner('Your city has awakened.'); }
    previousPanel = null;
  } else if (action === 'guide' || action === 'settings' || action === 'module' || action === 'build') {
    if (game.mode === 'playing' || game.mode === 'feast') { previousPanelMode = game.mode; game.mode = 'paused'; }
    previousPanel = ui.modal === 'pause' ? 'pause' : null;
    input.clear(); audio.setPaused(true); ui.showPanel(action, game, value);
  } else if (action === 'close') {
    if (previousPanel === 'pause') { previousPanel = null; ui.showPanel('pause', game); return; }
    ui.hidePanel();
    if (game.mode === 'paused') { game.mode = previousPanelMode; audio.setPaused(false); await audio.unlock(); }
  } else if (action === 'sound') {
    settings.muted = !settings.muted; audio.setMuted(settings.muted);
    if (!settings.muted) await audio.unlock();
    persist(); if (game.mode !== 'title') ui.startHUD(game);
  } else if (action === 'setting') {
    if (value.key === 'sound') { settings.muted = !value.value; audio.setMuted(settings.muted); }
    else settings[value.key] = value.value;
    if (value.key === 'language') {
      await setLanguage(value.value);
      document.documentElement.lang = value.value === 'zh' ? 'zh-CN' : value.value;
      if (game.mode === 'title') ui.showTitle(profile, settings); else ui.startHUD(game);
      ui.showPanel('settings', game);
    }
    if (value.key === 'reducedMotion') document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    if (value.key === 'quality') renderer.resize();
    persist();
  }
  input.enabled = ['playing', 'feast'].includes(game.mode) && !ui.modal;
}

function frame(now) {
  const dt = Math.min(.2, Math.max(.001, (now - lastTime) / 1000)); lastTime = now;
  renderTime += dt;
  input.enabled = ['playing', 'feast'].includes(game.mode) && !ui.modal;
  if (!manualSimulation) {
    const steps = Math.ceil(dt * 60);
    for (let i = 0; i < steps; i++) game.update(dt / steps);
  }
  const renderInterval = manualSimulation ? 300 : ['paused', 'awakening', 'result'].includes(game.mode) ? 250 : game.mode === 'title' ? 1000 / 30 : 1000 / 60;
  if (now - lastQaPaint >= renderInterval) {
    renderer.render(game, Math.min(dt, .1), renderTime);
    lastQaPaint = now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.getElementById('loading').style.opacity = '0';
setTimeout(() => document.getElementById('loading')?.remove(), 550);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['playing', 'feast'].includes(game.mode)) onAction('pause');
});
window.addEventListener('pagehide', event => { if (!event.persisted) audio.destroy(); });

// Read-only state helps inspect the demo; accelerated input is restricted to an explicit QA URL.
window.__POCKET_CITADEL__ = { snapshot: () => game.snapshot(), rendererInfo: () => ({ calls: renderer.renderer.info.render.calls, triangles: renderer.renderer.info.render.triangles }) };
if (new URLSearchParams(location.search).get('qa') === '1') {
  window.__POCKET_CITADEL__.qa = {
    manual(value = true) { manualSimulation = value; },
    start(seed = 17031) { manualSimulation = true; game.extraCore = null; game.reset(seed); input.enabled = true; renderer.look.set(0, 0, 10); renderer.render(game, .05, renderTime); },
    advance(seconds, direction = { x: 0, z: 0 }) {
      const steps = Math.ceil(seconds * 60);
      for (let i = 0; i < steps; i++) { game.update(1 / 60, direction); if (i % 12 === 0) renderer.render(game, .2, renderTime += .2, false); }
      renderer.render(game, .05, renderTime, false); ui.updateHUD(game);
      return game.snapshot();
    },
    paint() { renderer.render(game, .05, renderTime); },
  };
}
}

boot().catch(error => {
  console.error('Pocket Citadel could not start:', error);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = '<p>加载失败 · Could not load</p><button class="secondary" onclick="location.reload()">重新加载 / Reload</button>';
});
