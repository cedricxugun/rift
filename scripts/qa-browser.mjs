import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Accelerated playthrough uses only steering and elapsed simulation time, never grants levels or rewards.
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const requests = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await mkdir('.qa', { recursive: true });
const results = [];

try {
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(resolve('Pocket-Citadel.html')).href + '?qa=1');
  await page.waitForFunction(() => window.__POCKET_CITADEL__?.qa, { timeout: 20000 });
  await page.evaluate(() => {
    const api = window.__POCKET_CITADEL__;
    window.qaWalk = (target, maxTime = 30) => {
      let elapsed = 0;
      while (elapsed < maxTime) {
        const state = api.snapshot();
        if (!['playing', 'feast'].includes(state.mode)) break;
        const goal = typeof target === 'number' ? state.entities.find(entity => entity.id === target) : target;
        if (!goal) break;
        const dx = goal.x - state.player.x, dz = goal.z - state.player.z;
        const dist = Math.hypot(dx, dz);
        if (dist < .2) break;
        const dt = Math.min(.2, dist / state.player.speed);
        api.qa.advance(dt, { x: dx / dist, z: dz / dist }); elapsed += dt;
      }
      api.qa.advance(.8);
      return api.snapshot();
    };
    window.qaGather = (level, minZ, maxZ) => {
      for (let i = 0; i < 65; i++) {
        const state = api.snapshot();
        if (state.player.level >= level || state.mode !== 'playing') return state;
        const food = state.entities.filter(entity => !entity.enemy && !entity.skill && !entity.anchor && !entity.evolutionCore && entity.z > minZ && entity.z < maxZ && entity.radius + .06 <= state.player.radius)
          .sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) - Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
        if (!food) return state;
        window.qaWalk(food.id);
      }
      return api.snapshot();
    };
    window.qaFight = (boss = false) => {
      for (let i = 0; i < 400; i++) {
        const state = api.snapshot();
        if (state.mode !== 'playing' || (boss ? state.flags.bossDown : state.flags.guardianDead)) return state;
        const enemy = state.entities.find(entity => boss ? entity.kind === 'boss' : entity.guardian);
        if (!enemy) return state;
        const angle = i * .105;
        const target = { x: enemy.x + Math.cos(angle) * 4.8, z: enemy.z + Math.sin(angle) * 4.8 };
        const dx = target.x - state.player.x, dz = target.z - state.player.z, dist = Math.hypot(dx, dz);
        api.qa.advance(.2, { x: dx / Math.max(1, dist), z: dz / Math.max(1, dist) });
      }
      return api.snapshot();
    };
  });

  for (const [first, second, evolution, seed] of [['cannon', 'wind', 'vortex', 17031], ['ice', 'cannon', 'shatter', 29871], ['wind', 'ice', 'blizzard', 42017]]) {
    const middle = await page.evaluate(({ first, second, seed }) => {
      const api = window.__POCKET_CITADEL__; api.qa.start(seed);
      window.qaWalk({ x: 0, z: 2 }); window.qaGather(2, -17, 19);
      let state = api.snapshot();
      window.qaWalk(state.entities.find(entity => entity.group === 'first' && entity.skill === first).id);
      window.qaWalk({ x: 0, z: -20 }); state = api.snapshot();
      window.qaWalk(state.entities.find(entity => entity.group === 'second' && entity.skill === second).id);
      window.qaWalk({ x: 0, z: -29 });
      const combatStart = api.snapshot();
      window.qaFight(); state = api.snapshot();
      const core = state.entities.find(entity => entity.evolutionCore);
      if (core) window.qaWalk(core.id);
      state = api.snapshot();
      return { mode: state.mode, evolution: state.player.evolution, levelBeforeFight: combatStart.player.level, levelAfterFight: state.player.level, kills: state.stats.kills, direct: state.stats.direct, flags: state.flags, elapsed: state.elapsed };
    }, { first, second, seed });
    assert.equal(middle.levelBeforeFight, 2, `${evolution}: midgame combat must precede whole-target swallowing`);
    assert.equal(middle.mode, 'awakening', `${evolution}: guardian reward must trigger evolution`);
    assert.equal(middle.evolution, evolution);
    assert.ok(middle.levelAfterFight >= 3);
    await page.locator('[data-action="awaken"]').click();
    const ending = await page.evaluate(({ evolution }) => {
      const api = window.__POCKET_CITADEL__;
      window.qaWalk({ x: 0, z: -49 });
      let state = api.snapshot();
      if (!state.flags.oldThreat) {
        const oldEnemy = state.entities.filter(entity => entity.enemy && entity.grade === 3).sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) - Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
        if (oldEnemy) window.qaWalk(oldEnemy.id);
      }
      if (evolution !== 'shatter') window.qaGather(4, -68, -46);
      state = api.snapshot();
      if (evolution === 'shatter') {
        window.qaWalk({ x: 0, z: -68 }); window.qaFight(true);
      } else {
        for (const anchor of state.entities.filter(entity => entity.anchor)) window.qaWalk(anchor.id);
        state = api.snapshot();
        const boss = state.entities.find(entity => entity.kind === 'boss');
        if (boss) window.qaWalk(boss.id, 18);
        if (api.snapshot().mode === 'playing') window.qaFight(true);
      }
      state = api.snapshot();
      if (state.mode === 'feast') { window.qaWalk({ x: 0, z: -74 }, 3); api.qa.advance(17); }
      state = api.snapshot(); api.qa.paint();
      return { mode: state.mode, evolution: state.player.evolution, stats: state.stats, flags: state.flags, elapsed: state.elapsed, score: state.score, hp: state.player.hp };
    }, { evolution });
    assert.equal(ending.mode, 'result', `${evolution}: expedition must reach its ending`);
    assert.equal(ending.flags.bossDown, true);
    assert.equal(ending.flags.oldThreat, true, `${evolution}: old threat must become directly edible`);
    assert.ok(ending.stats.direct >= 1);
    assert.ok(ending.hp > 0);
    await page.screenshot({ path: `.qa/${evolution}-complete.png` });
    results.push({ route: evolution, middle, ending });
    console.log(`${evolution}: complete in ${ending.elapsed.toFixed(1)} simulated seconds; ${ending.stats.direct} direct enemy swallows`);
  }

  await page.evaluate(() => {
    const api = window.__POCKET_CITADEL__; api.qa.start(41973);
    window.qaWalk({ x: 0, z: 2 }); window.qaGather(2, -17, 19);
    let state = api.snapshot();
    window.qaWalk(state.entities.find(entity => entity.group === 'first' && entity.skill === 'wind').id);
    window.qaWalk({ x: 0, z: -20 }); state = api.snapshot();
    window.qaWalk(state.entities.find(entity => entity.group === 'second' && entity.skill === 'ice').id);
    window.qaWalk({ x: 0, z: -29 }); window.qaFight(); state = api.snapshot();
    window.qaWalk(state.entities.find(entity => entity.evolutionCore).id);
  });
  await page.locator('[data-action="awaken"]').click();
  const failure = await page.evaluate(() => {
    window.qaWalk({ x: 12, z: -75 });
    window.__POCKET_CITADEL__.qa.advance(85);
    const state = window.__POCKET_CITADEL__.snapshot();
    return { mode: state.mode, hp: state.player.hp, damage: state.stats.damage, bossDown: state.flags.bossDown };
  });
  assert.equal(failure.mode, 'result', 'standing in telegraphed boss attacks must lead to a real failure');
  assert.equal(failure.hp, 0);
  assert.equal(failure.bossDown, false);
  assert.ok(failure.damage > 0);
  await page.screenshot({ path: '.qa/failure.png', animations: 'disabled' });
  await page.locator('[data-action="restart"]').click();
  assert.equal(await page.evaluate(() => window.__POCKET_CITADEL__.snapshot().player.hp), 110);
  await page.locator('[data-action="pause"]').click();
  await page.locator('#panel-layer [data-action="home"]').click();

  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-setting="language"]').selectOption('en');
  assert.equal(await page.locator('.game-panel h2').innerText(), 'Settings');
  await page.locator('[data-setting="language"]').selectOption('zh');
  await page.locator('[data-action="close"]').last().click();
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => window.__POCKET_CITADEL__.qa.manual(false));
  await page.locator('[data-action="pause"]').click();
  const pausedTime = await page.evaluate(() => window.__POCKET_CITADEL__.snapshot().elapsed);
  await page.evaluate(() => window.__POCKET_CITADEL__.qa.advance(3));
  assert.equal(await page.evaluate(() => window.__POCKET_CITADEL__.snapshot().elapsed), pausedTime);
  await page.locator('[data-action="resume"]').click();
  assert.equal(await page.evaluate(() => window.__POCKET_CITADEL__.snapshot().mode), 'playing');
  await page.locator('[data-action="pause"]').click();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await phone.setOffline(true);
  const mobile = await phone.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  mobile.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await mobile.goto(pathToFileURL(resolve('Pocket-Citadel.html')).href);
  await mobile.waitForFunction(() => window.__POCKET_CITADEL__);
  await mobile.screenshot({ path: '.qa/mobile-title.png', animations: 'disabled' });
  await mobile.locator('[data-action="start"]').tap();
  const cdp = await phone.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 555 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 475 }] });
  await mobile.waitForFunction(() => window.__POCKET_CITADEL__.snapshot().player.z < 7);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForFunction(() => window.__POCKET_CITADEL__.snapshot().stats.eaten >= 2);
  assert.equal(await mobile.locator('#joystick').evaluate(el => el.style.display), 'none');
  await mobile.screenshot({ path: '.qa/mobile-play.png', animations: 'disabled' });
  await mobile.locator('[data-action="pause"]').tap();
  await mobile.locator('#panel-layer [data-action="settings"]').tap();
  await mobile.locator('[data-setting="language"]').selectOption('fr');
  assert.equal(await mobile.locator('.game-panel').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await mobile.screenshot({ path: '.qa/mobile-settings-fr.png', animations: 'disabled' });
  await phone.close();
  assert.equal(requests.length, 0, 'the offline HTML must make no HTTP requests');
  assert.deepEqual(errors, []);
  await writeFile('.qa/report.json', JSON.stringify({ checkedAt: new Date().toISOString(), networkRequests: requests, consoleErrors: errors, routes: results, failure, mobileTouch: 'passed', mobileLayout: 'passed' }, null, 2));
  console.log('Offline boot, three routes, failure/retry, language switching, pause/resume, mobile touch and layout passed.');
} finally {
  await browser.close();
}
