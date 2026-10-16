import { webkit } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chooseInput } from './v2-playtest.mjs';
import { canSwallow } from '../src/v2/data.js';

await mkdir('.qa',{recursive:true});
const browser=await webkit.launch({headless:true});
const errors=[],requests=[],sizes=[];
try{
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,hasTouch:true,isMobile:true,offline:true});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(resolve('iPhone-Demo.html')).href+'?qa=1');
  let frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForFunction(()=>window.__RIFTBOUND__?.qa);
  assert.deepEqual(await frame.evaluate(()=>window.__RIFTBOUND__.artIssues()),[]);
  await frame.locator('[data-action="start"]').tap();
  const before=await frame.evaluate(()=>window.__RIFTBOUND__.snapshot().player.z);
  await page.mouse.move(92,470);await page.mouse.down();await page.mouse.move(92,395);await page.waitForTimeout(550);await page.mouse.up();
  assert.ok(await frame.evaluate(()=>window.__RIFTBOUND__.snapshot().player.z)<before-1,'WebKit drag moves the city');
  await frame.locator('#time-button').tap();
  assert.equal(await frame.evaluate(()=>window.__RIFTBOUND__.snapshot().stats.bulletTimes),1);
  for(const [width,height] of [[393,852],[390,844],[375,667],[430,932]]){
    await page.setViewportSize({width,height});
    await frame.evaluate(()=>{window.__RIFTBOUND__.qa.manual(true);document.documentElement.style.setProperty('--safe-top','54px');document.documentElement.style.setProperty('--safe-bottom','28px');});
    const layout=await frame.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#weapons button,#time-button,#combo-button,#route-meter')].map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height,x:r.x,right:r.right,bottom:r.bottom};})}));
    assert.equal(layout.width,width);assert.equal(layout.height,height);assert.equal(layout.overflow,false);
    assert.ok(layout.buttons.every(b=>b.w>=43.9&&b.h>=43.9&&b.x>=0&&b.right<=width+.5&&b.bottom<=height+.5));
    sizes.push({width,height});
  }
  await page.setViewportSize({width:393,height:852});
  await frame.addScriptTag({content:`window.canSwallow=${canSwallow.toString()};window.chooseInput=${chooseInput.toString()};`});
  await frame.evaluate(()=>window.__RIFTBOUND__.qa.start(42017,'furnace'));
  let state,choiceCaptured=false,battleCaptured=false;
  for(let batch=0;batch<140;batch++){
    state=await frame.evaluate(()=>{const api=window.__RIFTBOUND__;for(let step=0;step<144;step++){const s=api.snapshot();if(!['playing','feast'].includes(s.mode))return s;api.qa.advance(1/12,window.chooseInput(s,'furnace_coals'));}api.qa.paint();return api.snapshot();});
    if(state.mode==='choosing'){
      assert.equal(state.entities.some(e=>e.category==='shrine'),false,'the physical ruin has been swallowed before choices appear');
      assert.equal(await frame.locator('.draft-card').count(),3);
      if(!choiceCaptured){
        choiceCaptured=true;
        for(const [width,height] of [[393,852],[390,844],[375,667],[430,932]]){
          await page.setViewportSize({width,height});
          await frame.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','54px');document.documentElement.style.setProperty('--safe-bottom','28px');});
          const cards=await frame.locator('.draft-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
          assert.ok(Math.max(...cards.map(c=>c.y))-Math.min(...cards.map(c=>c.y))<1,'three choices stay on one horizontal row');
          assert.ok(cards.every(c=>c.x>=0&&c.right<=width&&c.bottom<=height),'all three choices remain visible');
        }
        await page.setViewportSize({width:393,height:852});await page.screenshot({path:'.qa/iphone-webkit-choice.png',animations:'disabled'});
      }
      const decision=chooseInput(state,'furnace_coals');await frame.locator(`[data-action="choose-shrine"][data-value="${decision.choice}"]`).tap();continue;
    }
    if(state.mode==='evolving'){await frame.locator(`[data-action="evolve"][data-value="${chooseInput(state,'furnace_coals').evolution}"]`).tap();continue;}
    if(state.time>500&&!battleCaptured&&state.mode==='playing'){
      battleCaptured=true;await frame.evaluate(()=>window.__RIFTBOUND__.qa.manual(false));await page.waitForTimeout(850);await frame.evaluate(()=>window.__RIFTBOUND__.qa.manual(true));
      await page.screenshot({path:'.qa/iphone-webkit-combat.png',animations:'disabled'});
    }
    if(state.mode==='result')break;
  }
  await writeFile('.qa/iphone-webkit-build.json',JSON.stringify({mode:state.mode,time:state.time,combos:state.combos,player:state.player,stats:state.stats},null,2));
  assert.equal(state.mode,'result');assert.equal(state.bossDefeated,true);assert.ok(state.time>=610&&state.time<900);assert.ok(state.combos.length>=2,'a mobile run can combine weapon systems with numerical and core upgrades');assert.ok(Object.keys(state.player.perks).length>=3);assert.ok(state.player.core);assert.ok(state.stats.comboTriggers>10);
  const earnedProfile=await frame.evaluate(()=>JSON.parse(localStorage.getItem('riftbound-v2')).profile);
  assert.ok(state.entities.filter(e=>e.kind==='medkit').length<=9,'uncollected healing supplies do not flood the battlefield');
  assert.ok(earnedProfile.parts>=45,'a completed run awards spendable parts');
  await frame.locator('#panel [data-action="garage"]').tap();
  await frame.locator('[data-action="buy-modification"][data-value="chassis"]').tap();
  const purchasedProfile=await frame.evaluate(()=>JSON.parse(localStorage.getItem('riftbound-v2')).profile);
  assert.equal(purchasedProfile.parts,earnedProfile.parts-25);assert.equal(purchasedProfile.workshop.chassis,1);
  await page.screenshot({path:'.qa/iphone-webkit-workshop.png',animations:'disabled'});
  await frame.locator('.panel-close').tap();
  await frame.locator('#panel [data-action="start"]').tap();
  let next=await frame.evaluate(()=>window.__RIFTBOUND__.snapshot());
  assert.ok(Math.abs(next.player.speed-6.592)<.00001);assert.deepEqual(next.player.perks,{});
  await page.reload();frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForFunction(()=>window.__RIFTBOUND__?.qa);
  await frame.locator('[data-action="start"]').tap();
  next=await frame.evaluate(()=>window.__RIFTBOUND__.snapshot());
  assert.ok(Math.abs(next.player.speed-6.592)<.00001,'permanent chassis survives a full page reload');
  assert.deepEqual(next.player.perks,{});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  await writeFile('.qa/iphone-webkit-results.json',JSON.stringify({engine:'Playwright WebKit (not a physical iPhone)',sizes,won:state.bossDefeated,time:state.time,combos:state.combos,triggers:state.stats.comboTriggers,workshop:{earned:earnedProfile.parts,spent:25,chassis:1,persists:true,speed:next.player.speed},errors,requests},null,2));
  console.log(`WebKit iPhone QA passed: 4 viewports, drag/tap, swallowed ruin choices, ${state.combos.length} working combinations, victory ${state.time.toFixed(1)}s.`);
}finally{await browser.close();}
