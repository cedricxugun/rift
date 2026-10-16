import { initI18n, setLanguage, t } from '../i18n.js';
import { BattleAudio } from './audio.js';
import { BattleGame } from './game.js';
import { BattleRenderer } from './renderer.js';
import { BattleInput } from './input.js';
import { BattleUI } from './ui.js';
import { EVOLUTIONS, COMBOS, canSwallow } from './data.js';
import { PERKS } from './perks.js';
import { purchaseModification } from './workshop.js';
import { ROUTES, BRANCHES, MASTERY_NODES, EVOLUTION_ASPECTS } from './skill-graph.js';
import { OPPORTUNITIES } from './expedition.js';
import { CASTLE_STAGES, castleStage } from './castle-appearance.js';
import {PACKS} from './blueprints.js';
import characters from '../../assets/characters.webp';
import props from '../../assets/props.webp';
import effects from '../../assets/effects.webp';
import terrain from '../../assets/terrain.webp';
import walk from '../../assets/walk.webp';
import arsenal from '../../assets/arsenal.webp';
import travelers from '../../assets/travelers.webp';
import routes from '../../assets/routes-v6.webp';
import cores from '../../assets/nexus-integrated-v63.webp';
import castles from '../../assets/castle-growth-v65.webp';
import equipment from '../../assets/weapon-modules-v65.webp';
import skillEffects from '../../assets/skill-effects-v65.webp';
import allies from '../../assets/allies-v7.webp';
import duels from '../../assets/duels-v7.webp';
import tactics from '../../assets/tactics-v8-mechanical.webp';

async function boot(){
  let saved={};try{saved=JSON.parse(localStorage.getItem('riftbound-v2')||'{}');}catch{}
  const settings={language:'zh',muted:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,quality:'balanced',tutorial:true,...saved.settings};
  const profile={best:0,journeys:0,wins:0,parts:0,workshop:{},route:'harbor',...saved.profile};
  if(!ROUTES[profile.route])profile.route='harbor';
  profile.parts=Math.max(0,Math.min(999999,Math.floor(Number(profile.parts)||0)));
  const language=await initI18n(settings.language);settings.language=language.language;document.documentElement.lang=settings.language;
  document.body.classList.toggle('reduced-motion',settings.reducedMotion);
  const loading=document.getElementById('loading');loading.querySelector('p').textContent=t('Preparing the illustrated world...');
  let loaded=0;const images={};
  const imageSources={characters,props,effects,terrain,walk,arsenal,travelers,routes,cores,castles,equipment,skillEffects,allies,duels,tactics};
  await Promise.all(Object.entries(imageSources).map(([key,src])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{images[key]=image;loaded++;loading.querySelector('.load-track i').style.width=`${loaded/Object.keys(imageSources).length*100}%`;resolve();};image.onerror=()=>reject(new Error('Asset decode failed: '+key));image.src=src;
  })));
  const audio=new BattleAudio();audio.setMuted(settings.muted);
  const renderer=new BattleRenderer(document.getElementById('world'),images,settings);
  const game=new BattleGame();
  game.player.route=profile.route;
  const ui=new BattleUI(document.getElementById('ui'),renderer.art,settings,profile,action);
  const input=new BattleInput(document.getElementById('world'),renderer,()=>action('pause'),()=>action('bullet-time'));
  let lastTime=performance.now(),lastPaint=0,nextPaint=0,paintInterval=0,lastUI=0,simulationTime=0,manual=false,returnMode='playing',parentPanel=null;
  function persist(){try{localStorage.setItem('riftbound-v2',JSON.stringify({settings,profile}));}catch{}}
  function processEvents(){
    for(const event of game.drainEvents()){
      renderer.event(event);
      if(event.type==='shot')audio.play(event.weapon==='ice'?'freeze':'shoot',event.rank>=3?1.1:.85);
      if(event.type==='damage')audio.play(event.critical?'critical':'impact',.7);
      if(event.type==='kill')audio.play('impact',event.elite?1.6:1);
      if(event.type==='eat')audio.play('eat',.8);
      if(event.type==='hurt')audio.play('hurt',1);
      if(event.type==='heal'){audio.play('heal',1);ui.healthPulse();}
      if(event.type==='health-drop'&&game.player.hp<game.player.maxHp*.5)ui.announce('A healing pack has dropped');
      if(event.type==='bullet-time-start')audio.play('timeStart',1);
      if(event.type==='bullet-time-end')audio.play('timeEnd',1);
      if(event.type==='enemy-shot')audio.play('enemyShot',.8);
      if(event.type==='beam')audio.play('laser',1);
      if(event.type==='wind-pulse'||event.type==='effect'&&event.row===2)audio.play('wind',.7);
      if(event.type==='upgrade'){ui.upgradeBanner(event);audio.play('rankup',1);}
      if(event.type==='perk'){const perk=PERKS[event.id];ui.upgradeBanner({...event,perk:event.id,title:perk.name,detail:perk.description});audio.play(perk.kind==='core'?'evolve':'rankup',1);}
      if(event.type==='branch'){ui.announce(BRANCHES[event.id].name,'Branch',true);audio.play('branchChoice',1);}
      if(event.type==='mastery'){ui.announce(MASTERY_NODES[event.id].name,'Mastery',true);audio.play('branchChoice',1);}
      if(event.type==='route-burst')audio.play(event.route==='harbor'?'harborBurst':event.route==='furnace'?'furnaceBurst':'frostRelease',1);
      if(event.type==='route-charge')audio.play('routeCharge',.7);
      if(event.type==='guardian-block')audio.play('guardianBlock',1);
      if(event.type==='guardian-strike')audio.play('impact',.4);
      if(event.type==='pack')ui.announce(PACKS[event.id].name,PACKS[event.id].tip);
      if(['lance-cast','mine-burst','plasma-burst','turret-shot'].includes(event.type))audio.play(event.type==='lance-cast'?'lightning':'impact',.6);
      if(event.type==='guardian-arrive')audio.play('routeCharge',.75);
      if(event.type==='legion-rally')audio.play('branchChoice',.6);
      if(event.type==='garden-bloom')audio.play(event.burning?'impact':event.frost?'freeze':'wind',.65);
      if(event.type==='duel')ui.announce('Duel begins','The crowd retreats. Defeat this guardian before the next wave.',true);
      if(event.type==='opportunity'){ui.announce(OPPORTUNITIES[event.kind].name,'An opportunity nearby');audio.play('opportunity',.8);}
      if(event.type==='opportunity-open')ui.announce('Outpost liberated');
      if(event.type==='opportunity-complete'){ui.announce('Supplies secured');audio.play('chest',.8);}
      if(event.type==='opportunity-expired')ui.announce('The caravan has departed');
      if(event.type==='buff'){ui.announce(event.buff==='power'?'Forge blessing':event.buff==='haste'?'Clockwork blessing':event.buff==='health'?'Stone blessing':'Restoration');audio.play('core',.8);}
      if(event.type==='grow'){
        const stage=CASTLE_STAGES[castleStage(event.level)];
        if(castleStage(event.level)!==castleStage(event.previousLevel))ui.announce(stage.name,stage.detail,true);
        else if(game.time>=22)ui.announce('Old threats become food');
        audio.play('grow',1);
      }
      if(event.type==='shrine'){ui.announce('Ruin found','Follow the arrow to claim your skill. Extra energy is saved.');audio.play('chest',.7);}
      if(event.type==='combo'){ui.announce(COMBOS[event.id].name,'Combination discovered',true);audio.play('combo',1);}
      if(event.type==='lightning'||event.type==='thunderstrike')audio.play('lightning',.8);
      if(event.type==='meteor-impact')audio.play('meteor',event.phoenix?1:.7);
      if(event.type==='shrine-choice'){input.clear();audio.setPaused(true);ui.showPanel('shrine',game);}
      if(event.type==='stage')ui.announce(event.title,'Region I · Bellwind Meadow',true);
      if(event.type==='treasure'){ui.announce(event.title,event.detail,true);audio.play('chest',1);}
      if(event.type==='enemy-impact')audio.play('impact',.65);
      if(event.type==='breather')ui.announce('Catch your breath');
      if(event.type==='incoming')ui.announce('Enemies approaching');
      if(event.type==='elite'){ui.announce('Elite incoming');audio.play('bossWarning',1);}
      if(event.type==='boss'){ui.announce('The king approaches','The hollow throne',true);audio.play('bossWarning',1.2);}
      if(event.type==='boss-phase'&&event.phase===3&&game.boss&&canSwallow(game.player,game.boss))ui.announce('The king can be devoured','Approach the broken king and swallow it to finish the battle.',true);
      if(event.type==='evolution-choice'){input.clear();audio.setPaused(true);ui.showPanel('evolution',game);}
      if(event.type==='evolution'){audio.play('evolve',1);ui.announce(event.aspect?EVOLUTION_ASPECTS[event.aspect].name:EVOLUTIONS[event.key].name,'Evolution ready',true);}
      if(event.type==='ward-break')audio.play('critical',1);
      if(event.type==='victory'){ui.announce('A feast earned in battle','Victory',true);audio.play('win',1);}
      if(event.type==='result'){
        profile.best=Math.max(profile.best,event.score);profile.parts+=event.parts;if(event.won)profile.wins++;persist();input.clear();ui.showPanel('result',game);audio.setIntensity(.1);audio.play(event.won?'win':'lose',1);
      }
    }
  }
  async function action(name,value){
    audio.play('click',.5);
    if(name==='start'){
      game.start(Math.floor(Math.random()*90000)+10000,profile);profile.journeys++;persist();renderer.clear();renderer.camera={x:game.player.x,z:game.player.z};input.clear();ui.hidePanel();ui.showHUD(game);audio.setPaused(false);await audio.unlock();audio.setIntensity(.25);parentPanel=null;
    }else if(name==='home'){
      game.reset();game.player.route=profile.route;renderer.clear();ui.showMenu();input.clear();audio.setPaused(true);parentPanel=null;
    }else if(name==='choose-home'){
      if(game.mode!=='title'||!ROUTES[value])return;
      profile.route=value;game.player.route=value;persist();ui.showMenu();parentPanel=null;
    }else if(name==='reroll'){
      if(game.rerollShrine())ui.showPanel('shrine',game);
    }else if(name==='bullet-time'){if(game.activateBulletTime(input.direction(game.player)))processEvents();
    }else if(name==='pause'){
      if(game.mode==='paused'){await action('resume');return;}
      if(!['playing','feast'].includes(game.mode))return;
      returnMode=game.mode;game.mode='paused';input.clear();audio.setPaused(true);ui.showPanel('pause',game);
    }else if(name==='resume'){
      ui.hidePanel();game.mode=returnMode;input.clear();audio.setPaused(false);await audio.unlock();parentPanel=null;
    }else if(name==='buy-modification'){
      if(!purchaseModification(profile,value))return;
      persist();audio.play('rankup',1);ui.showPanel('garage',game);
    }else if(['settings','guide','weapon','combinations','garage','homes','growth'].includes(name)){
      if(name==='growth'&&ui.modal==='growth'){ui.showPanel('growth',game,value);return;}
      parentPanel=['pause','result','homes','combinations'].includes(ui.modal)?ui.modal:null;
      if(['playing','feast'].includes(game.mode)){returnMode=game.mode;game.mode='paused';}
      input.clear();audio.setPaused(true);ui.showPanel(name,game,value);
    }else if(name==='close'){
      if(parentPanel){const panel=parentPanel;parentPanel=null;ui.showPanel(panel,game);return;}
      ui.hidePanel();if(game.mode==='paused'){game.mode=returnMode;audio.setPaused(false);await audio.unlock();}
    }else if(name==='evolve'){
      ui.hidePanel();game.evolve(value);input.clear();audio.setPaused(false);await audio.unlock();processEvents();
    }else if(name==='choose-shrine'){
      if(!game.chooseShrine(value))return;
      ui.hidePanel();input.clear();audio.setPaused(false);await audio.unlock();processEvents();
    }else if(name==='sound'){
      settings.muted=!settings.muted;audio.setMuted(settings.muted);if(!settings.muted)await audio.unlock();persist();ui.showHUD(game);
    }else if(name==='setting'){
      if(value.key==='sound'){settings.muted=!value.value;audio.setMuted(settings.muted);}else settings[value.key]=value.value;
      if(value.key==='language'){await setLanguage(value.value);document.documentElement.lang=value.value;if(game.mode==='title')ui.showMenu();else ui.showHUD(game);ui.showPanel('settings',game);}
      if(value.key==='quality'){renderer.resolutionScale=1;renderer.resize(true);}
      document.body.classList.toggle('reduced-motion',settings.reducedMotion);persist();
    }
    input.enabled=['playing','feast'].includes(game.mode)&&!ui.modal;
  }
  function frame(now){
    const dt=Math.min(.14,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    input.enabled=['playing','feast'].includes(game.mode)&&!ui.modal;
    const active=['playing','feast'].includes(game.mode);
    if(!manual&&active){simulationTime=Math.min(.14,simulationTime+dt);const direction=input.direction(game.player);while(simulationTime>=1/60){game.update(1/60,direction);simulationTime-=1/60;}processEvents();}else simulationTime=0;
    const interval=manual?180:!active&&game.mode!=='title'?250:game.mode==='title'?1000/30:1000/60;
    const elapsed=now-lastPaint;
    if(interval!==paintInterval){paintInterval=interval;nextPaint=now;}
    if(now>=nextPaint-.5){
      if(active&&!manual)renderer.observeFrame(elapsed);
      renderer.render(game,Math.min(.1,elapsed/1000));lastPaint=now;nextPaint+=interval;
      if(nextPaint<=now)nextPaint=now+interval;
    }
    if(now-lastUI>100){ui.update(game);audio.setIntensity(Math.min(1,.22+game.time/480));lastUI=now;}
    requestAnimationFrame(frame);
  }
  ui.showMenu();renderer.render(game,.016);loading.remove();requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','feast'].includes(game.mode))action('pause');});
  window.addEventListener('pagehide',e=>{if(!e.persisted)audio.destroy();});
  window.__RIFTBOUND__={snapshot:()=>game.snapshot(),artIssues:()=>renderer.art.issues,performance:()=>renderer.performance()};
  if(new URLSearchParams(location.search).get('qa')==='1'||window.__PHONE_QA__)window.__RIFTBOUND__.qa={
    start(seed=73021,route='harbor'){manual=true;game.start(seed,{},route);renderer.clear();renderer.camera={x:game.player.x,z:game.player.z};ui.hidePanel();ui.showHUD(game);renderer.render(game,.016);},
    advance(seconds,direction={x:0,z:0}){for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60,direction);processEvents();ui.update(game);return game.snapshot();},
    paint(){renderer.camera={x:game.player.x,z:game.player.z};renderer.render(game,.016);},
    evolve(key){game.evolve(key);ui.hidePanel();processEvents();},
    choose(id){game.chooseShrine(id);ui.hidePanel();processEvents();},
    manual(value=true){manual=value;},
  };
}

boot().catch(error=>{
  console.error(error);const loading=document.getElementById('loading');if(loading){loading.querySelector('p').textContent=t('Could not load game art. Please reopen the offline file.');const b=document.createElement('button');b.textContent=t('Retry');b.onclick=()=>location.reload();loading.appendChild(b);}
});
