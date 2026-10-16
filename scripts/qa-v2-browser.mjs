import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chooseInput } from './v2-playtest.mjs';
import { canSwallow } from '../src/v2/data.js';

// Uses normal steering, bullet time and reward choices; no health, weapons or levels are granted.
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
const errors = [], requests = [], results = [];
const url = pathToFileURL(resolve('Riftbound.html')).href + '?qa=1';
await mkdir('.qa', { recursive: true });

function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor:2, offline: true });
  const page = await context.newPage();
  observe(page);
  await page.goto(url);
  await page.waitForFunction(() => window.__RIFTBOUND__?.qa);
  assert.deepEqual(await page.evaluate(() => window.__RIFTBOUND__.artIssues()), []);
  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>window.__RIFTBOUND__.performance().pixelWidth<3840);
  assert.ok(await page.evaluate(()=>{const c=document.getElementById('world');return c.width*c.height<=2005000&&c.getBoundingClientRect().width===3840;}),'high-DPI full-screen rendering stays within its pixel budget without shrinking the UI');
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>document.getElementById('world').getBoundingClientRect().width===1440);
  await page.screenshot({ path: '.qa/v2-menu.png' });
  await page.locator('[data-action="start"]').click();
  const before = await page.evaluate(() => window.__RIFTBOUND__.snapshot());
  await page.keyboard.down('w');
  await page.waitForTimeout(850);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await page.keyboard.up('w');
  const after = await page.evaluate(() => window.__RIFTBOUND__.snapshot());
  assert.ok(after.player.z < before.player.z - 2, 'keyboard movement reaches the simulation');
  assert.equal(after.stats.bulletTimes, 1, 'Space triggers the real bullet time');
  await page.locator('[data-action="pause"]').click();
  const pauseTime = await page.evaluate(() => window.__RIFTBOUND__.snapshot().time);
  await page.waitForTimeout(220);
  assert.equal(await page.evaluate(() => window.__RIFTBOUND__.snapshot().time), pauseTime);
  await page.locator('[data-action="resume"]').click();
  await page.locator('[data-action="weapon"][data-value="cannon"]').click();
  assert.equal(await page.locator('.rank-row').count(), 8);
  await page.screenshot({ path: '.qa/v2-weapon-guide.png' });
  await page.locator('.panel-close').click();

  await page.addScriptTag({ content: `window.canSwallow = ${canSwallow.toString()}; window.chooseInput = ${chooseInput.toString()};` });
  for (const [route, seed] of [['harbor_lance',73021],['harbor_salvo',29871],['furnace_coals',42017],['furnace_eruption',93217],['frost_aegis',11721],['frost_lances',28391]]) {
    await page.evaluate(({seed,route}) => window.__RIFTBOUND__.qa.start(seed,route.split('_')[0]), {seed,route});
    let state, evolutionChosen = false;
    const captured = new Set();
    for (let batch = 0; batch < 130; batch++) {
      state = await page.evaluate(route => {
        const api = window.__RIFTBOUND__;
        for (let step = 0; step < 144; step++) {
          const state = api.snapshot();
          if (!['playing', 'feast'].includes(state.mode)) return state;
          api.qa.advance(1 / 12, window.chooseInput(state, route));
        }
        return api.snapshot();
      }, route);
      if (state.mode === 'choosing') {
        assert.equal(await page.locator('.draft-card').count(), 3);
        if (!captured.has('choice')) {
          captured.add('choice');
          const frozenAt=state.time;
          await page.waitForTimeout(250);
          assert.equal(await page.evaluate(()=>window.__RIFTBOUND__.snapshot().time),frozenAt,'skill comparison pauses combat');
          if(route==='harbor_lance')await page.screenshot({path:'.qa/v6-skill-choice.png',animations:'disabled'});
        }
        const decision=chooseInput(state,route);
        await page.locator(`[data-action="choose-shrine"][data-value="${decision.choice}"]`).click();
        continue;
      }
      if (state.mode === 'evolving') {
        assert.equal(await page.locator('.evolution-choice').count(), 3);
        if (route === 'harbor_lance') await page.screenshot({ path: '.qa/v6-evolution.png', animations: 'disabled' });
        await page.locator(`[data-action="evolve"][data-value="${chooseInput(state,route).evolution}"]`).click();
        evolutionChosen = true;
        continue;
      }
      if (route === 'harbor_lance') {
        const capture = state.time >= 605 && !captured.has('boss') ? 'boss' : state.time >= 350 && !captured.has('combat') ? 'combat' : null;
        if (capture && state.mode === 'playing') {
          captured.add(capture);
          // Let normal rendering age accumulated effects before the actual gameplay capture.
          await page.evaluate(() => window.__RIFTBOUND__.qa.manual(false));
          await page.keyboard.down('d');
          await page.waitForTimeout(1350);
          await page.keyboard.up('d');
          await page.evaluate(() => { window.__RIFTBOUND__.qa.manual(true); window.__RIFTBOUND__.qa.paint(); });
          await page.screenshot({ path: `.qa/v2-${capture}.png` });
        }
      }
      if (batch % 10 === 0) console.log(`${route}: ${Math.round(state.time)}s, HP ${Math.round(state.player.hp)}, ranks ${JSON.stringify(state.player.modules)}`);
      if (state.mode === 'result') break;
    }
    assert.equal(state.mode, 'result', `${route} reaches a real result`);
    assert.equal(state.bossDefeated, true, `${route} can win through legitimate play`);
    assert.equal(evolutionChosen, true, `${route} uses the actual reward screen`);
    assert.ok(state.time >= 610 && state.time < 900, `${route} has a full ten-minute build phase and a boss fight`);
    assert.ok(state.stats.upgrades >= 12, `${route} provides repeated build choices`);
    assert.ok(state.stats.bossVolleys >= 3, `${route} boss gets to fight`);
    assert.ok(state.stats.shots > 500, `${route} keeps attacking after growth`);
    assert.equal(state.player.path,route,`${route} really locks its branch`);
    assert.ok(state.player.mastery,`${route} learns its branch successor`);
    assert.ok(Object.values(state.player.modules).filter(Boolean).length<=3,'three weapon slots stay enforced');
    assert.ok(state.stats.routeBursts>20,`${route} turns swallowing into combat`);
    assert.ok(state.stats.eventsCompleted>=3,`${route} completes world opportunities`);
    assert.ok(state.combos.length === 0 || state.stats.comboTriggers > 0, `${route} unlocked combinations actually trigger`);
    results.push({ route, time: state.time, stats: state.stats, modules: state.player.modules, combos:state.combos, perks:state.player.perks, core:state.player.core });
    console.log(`${route}: victory at ${state.time.toFixed(1)}s; ${state.stats.upgrades} upgrades; ${state.stats.bossVolleys} boss volleys.`);
    if (route === 'harbor_lance') await page.screenshot({ path: '.qa/v6-result.png', animations: 'disabled' });
  }

  assert.ok(results.filter(r=>r.stats.comboTriggers>0).length>=2,'multiple full routes activate weapon combinations');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, offline: true });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(url);
  await mobile.waitForFunction(() => window.__RIFTBOUND__?.qa);
  await mobile.screenshot({ path: '.qa/v2-mobile-menu.png' });
  await mobile.locator('[data-action="start"]').tap();
  const touchBefore = await mobile.evaluate(() => window.__RIFTBOUND__.snapshot());
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 95, y: 500 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 95, y: 420 }] });
  await mobile.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const touchAfter = await mobile.evaluate(() => window.__RIFTBOUND__.snapshot());
  assert.ok(touchAfter.player.z < touchBefore.player.z - 1.5, 'touch joystick moves the city');
  await mobile.locator('#time-button').tap();
  assert.equal(await mobile.evaluate(() => window.__RIFTBOUND__.snapshot().stats.bulletTimes), 1);
  await mobile.locator('[data-action="pause"]').tap();
  await mobile.locator('#panel [data-action="settings"]').tap();
  for (const language of ['en', 'fr', 'ja', 'ru', 'vi', 'zh']) {
    await mobile.locator('[data-setting="language"]').selectOption(language);
    await mobile.waitForFunction(language => document.documentElement.lang === language, language);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language} has no horizontal document overflow`);
  }
  await mobile.screenshot({ path: '.qa/v2-mobile-settings.png' });
  await mobile.locator('.panel-close').tap();
  await mobile.locator('[data-action="resume"]').tap();
  await mobile.screenshot({ path: '.qa/v2-mobile-play.png' });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.screenshot({ path: '.qa/v2-mobile-landscape.png' });

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.addScriptTag({ content: `window.canSwallow = ${canSwallow.toString()}; window.chooseInput = ${chooseInput.toString()};` });
  await mobile.evaluate(() => window.__RIFTBOUND__.qa.start(73021));
  let mobileState, mobileCombatCaptured = false;
  for (let batch = 0; batch < 130; batch++) {
    mobileState = await mobile.evaluate(() => {
      const api = window.__RIFTBOUND__;
      for (let step = 0; step < 144; step++) {
        const state = api.snapshot();
        if (!['playing', 'feast'].includes(state.mode)) return state;
        api.qa.advance(1 / 12, window.chooseInput(state, 'harbor_lance'));
      }
      api.qa.paint();
      return api.snapshot();
    });
    if (mobileState.mode === 'choosing') {
      const decision=chooseInput(mobileState,'harbor_lance');
      if(!mobileCombatCaptured&&mobileState.player.rewardLevel<2)await mobile.screenshot({path:'.qa/v5-mobile-choice.png',animations:'disabled'});
      await mobile.locator(`[data-action="choose-shrine"][data-value="${decision.choice}"]`).tap();
      continue;
    }
    if (mobileState.mode === 'evolving') {
      await mobile.locator(`[data-action="evolve"][data-value="${chooseInput(mobileState,'harbor_lance').evolution}"]`).tap();
      continue;
    }
    if (mobileState.time > 210 && !mobileCombatCaptured) {
      mobileCombatCaptured = true;
      await mobile.waitForTimeout(3300);
      await mobile.screenshot({ path: '.qa/v2-mobile-combat.png' });
    }
    if (mobileState.mode === 'result') break;
  }
  assert.equal(mobileState.mode, 'result', 'portrait route reaches the result screen');
  assert.ok(mobileState.time >= 610 && mobileState.time < 900, 'portrait run completes after the full build phase');
  assert.equal(mobileState.bossDefeated, true, 'portrait viewport permits a complete winning route');
  assert.ok(mobileState.stats.bossVolleys >= 3, 'the boss still fights in portrait');
  results.push({ route: 'mobile-harbor', time: mobileState.time, stats: mobileState.stats, modules: mobileState.player.modules });
  console.log(`Portrait: victory at ${mobileState.time.toFixed(1)}s.`);

  assert.deepEqual(errors, [], 'no console or runtime errors');
  assert.deepEqual(requests, [], 'the complete game makes no network requests');
  await writeFile('.qa/v2-browser-results.json', JSON.stringify({ results, keyboard: true, touch: true, pause: true, languages: 6, errors, networkRequests: requests }, null, 2));
  console.log('Offline browser QA passed: 6 complete branches, real keyboard/touch/bullet time, pause, 6 languages, zero network requests.');
} finally {
  await browser.close();
}
