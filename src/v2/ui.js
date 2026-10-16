import { t, supportedLanguages } from '../i18n.js';
import { icon, escapeHtml } from '../ui.js';
import { SKILLS, BUFF_ART, EVOLUTIONS, COMBOS, COMBO_TACTICS, COMBO_ROLES, ENEMIES, GROWTH, BOSS_TIME, OPENING_TIME, WEAPON_RANKS, CANNON_RANKS, rankInfo, activeCombos, canSwallow } from './data.js';
import { PERKS, RARITIES, PERK_KINDS, STAT_LABELS, formatStat, perkAmount } from './perks.js';
import { MODIFICATIONS, workshopLevel, modificationCost } from './workshop.js';
import { ROUTES, HOME_PLAYSTYLES, BRANCHES, MASTERY_NODES, EVOLUTION_ASPECTS, ownedWeapons, routeCapacity, shardCapacity, comboRecommendations } from './skill-graph.js';
import { expeditionStage, BULLET_TIME } from './data.js';
import { OPPORTUNITIES } from './expedition.js';
import { CASTLE_STAGES, castleStage, weaponFrame, weaponAtlas,equippedArt } from './castle-appearance.js';

import {BLUEPRINTS,learnedBlueprint,blueprintRankPreview,PACKS} from './blueprints.js';

const tr=(key,options)=>escapeHtml(t(key,options));
export const formatTime=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const thumb=(atlas,index,size=80)=>`<canvas data-atlas="${atlas}" data-sprite="${index}" width="${size}" height="${size}" aria-hidden="true"></canvas>`;
const cityThumb=(route,level=1,size=150,modules=null,path='',core='',perks={})=>`<canvas data-city="${route}" data-level="${level}" data-modules="${modules?escapeHtml(JSON.stringify(modules)):''}" data-path="${path||''}" data-core="${core||''}" data-perks="${escapeHtml(JSON.stringify(perks))}" width="${size}" height="${size}" aria-hidden="true"></canvas>`;
const cityModules=player=>Object.fromEntries([...new Set([...(player.weaponOrder||[]),...Object.keys(player.modules)])].map(key=>[key,player.modules[key]]));
const buffCopy={power:['Forge blessing','+18% attack damage'],haste:['Clockwork blessing','+12% attack speed'],speed:['Fleet blessing','+8% movement speed'],health:['Stone blessing','+15 maximum health and heal'],heal:['Restoration','Restore 30 health']};

export class BattleUI{
  constructor(root,art,settings,profile,action){
    this.root=root;this.art=art;this.settings=settings;this.profile=profile;this.action=action;this.modal=null;
    this.lastBuild='';this.toastTimeout=0;this.announceTimeout=0;this.previousFocus=null;
    root.innerHTML='<div id="menu"></div><div id="hud" hidden></div><div id="panel" hidden></div><div id="upgrade-banner" hidden></div><div id="announcement" hidden></div>';
    this.menu=root.querySelector('#menu');this.hud=root.querySelector('#hud');this.panel=root.querySelector('#panel');
    root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)action(button.dataset.action,button.dataset.value);});
    root.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-action="bullet-time"]');if(button&&!button.disabled&&e.pointerType!=='mouse'){e.preventDefault();action('bullet-time');}});
    root.addEventListener('change',e=>{if(e.target.dataset.setting)action('setting',{key:e.target.dataset.setting,value:e.target.type==='checkbox'?e.target.checked:e.target.value});});
    root.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||!this.modal)return;
      const items=[...this.panel.querySelectorAll('button:not(:disabled),select,input')];
      if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}
      else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}
    });
  }

  paintThumbs(scope=this.root){
    for(const canvas of scope.querySelectorAll('canvas[data-atlas]')){
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
      this.art.draw(ctx,canvas.dataset.atlas,Number(canvas.dataset.sprite),canvas.width/2,canvas.height*.94,canvas.width*.9,{shadow:false});
    }
    for(const canvas of scope.querySelectorAll('canvas[data-city]')){
      const c=canvas.getContext('2d'),level=Number(canvas.dataset.level),route=canvas.dataset.city,stage=castleStage(level);
      const modules=canvas.dataset.modules?JSON.parse(canvas.dataset.modules):{[ROUTES[route].primary]:[1,2,4,6][stage]};
      if(!canvas.dataset.modules){
        if(stage>=1)modules.wind=stage===3?5:2;
        if(stage>=2)modules.lightning=stage===3?5:2;
        if(route==='furnace')modules.ember=Math.min(5,modules.ember);
      }
      c.clearRect(0,0,canvas.width,canvas.height);
      this.art.drawCityPreview(c,route,level,modules,canvas.width*.5,canvas.height*.87,canvas.width*.205,0,canvas.dataset.path||null,canvas.dataset.core||null,JSON.parse(canvas.dataset.perks||'{}'));
    }
  }

  showMenu(){
    this.hidePanel();this.hud.hidden=true;this.menu.hidden=false;
    this.root.querySelector('#upgrade-banner').hidden=true;this.root.querySelector('#announcement').hidden=true;
    const title=t('Riftbound').split(/[:：]/);
    const home=ROUTES[this.profile.route]||ROUTES.harbor,playstyle=HOME_PLAYSTYLES[this.profile.route]||HOME_PLAYSTYLES.harbor;
    this.menu.innerHTML=`<header class="menu-top"><div class="brand">${icon('mouth')}<span>RIFTBOUND</span></div><div class="offline"><i></i>${document.documentElement.dataset.edition==='mobile-web'?tr('Mobile web edition'):tr('Offline edition')} · V8</div></header>
      <section class="menu-copy"><div class="eyebrow">${tr('Region I · Bellwind Meadow')}</div><h1><span>${escapeHtml(title[0])}</span>${title[1]?`<span>${escapeHtml(title[1])}</span>`:''}</h1><p class="subtitle">${tr('A city with an endless appetite.')}</p><p class="intro">${tr('Ten minutes to forge your build, then face the king.')}</p>
      <button class="home-selector" data-action="homes">${icon(home.icon)}<span><small>${tr('Traveling home')} · ${tr(playstyle.style)}</small><strong>${tr(playstyle.title)}</strong></span><b>${tr('Compare')} ›</b></button><button class="main-button" data-action="start">${icon('play')}<span>${tr('Begin expedition')}</span>${icon('arrow')}</button><div class="menu-actions"><button data-action="guide">${icon('book')}${tr('Combat manual')}</button><button data-action="garage">${icon('gear')}${tr('Workshop')}</button><button data-action="settings">${icon('gear')}${tr('Settings')}</button></div></section>
      <footer class="menu-bottom"><span>${tr('Move. Dodge. Devour. Evolve.')}</span><span>${this.profile.best?`${tr('Best score')} <b>${this.profile.best.toLocaleString()}</b>`:tr('The hollow kingdom is waking.')}</span></footer>`;
  }

  showHUD(game){
    this.menu.hidden=true;this.hud.hidden=false;this.lastBuild='';
    this.hud.innerHTML=`<header class="hud-top"><div class="identity">${icon('mouth')}<span>RIFTBOUND</span></div><div class="run-progress"><span id="phase-name"></span><strong id="timer">00:00</strong><div class="timeline"><i></i></div></div><div class="hud-buttons"><button id="combo-button" class="icon-button" data-action="combinations" title="${tr('Combinations')}" aria-label="${tr('Combinations')}">${icon('vortex')}</button><button class="icon-button" data-action="sound" aria-label="${tr(this.settings.muted?'Sound off':'Sound on')}">${icon(this.settings.muted?'mute':'sound')}</button><button class="icon-button" data-action="pause" aria-label="${tr('Pause')}">${icon('pause')}</button></div></header>
      <div class="health-block"><div class="health-label"><span>${icon('shield')}${tr('City integrity')}</span><b id="health-text"></b></div><div class="health-track"><i id="health-fill"></i></div><span id="healing-status" hidden>${tr('Health restored')}</span></div>
      <div class="growth-block"><div class="growth-label"><span>${tr('Skill energy')} <small class="mouth-badge">${tr('Mouth')} <b id="mouth-level">I</b></small></span><span id="mass-text"></span></div><div class="growth-track"><i id="mass-fill"></i></div></div>
      <aside class="objective-box"><strong id="objective-title"></strong><p id="objective-text"></p></aside>
      <div class="stats-ribbon"><span>${icon('skull')}<b id="kill-count">0</b></span><span>${icon('star')}<b id="score-count">0</b></span></div>
      <aside class="minimap"><canvas id="mini-map" width="112" height="112"></canvas></aside>
      <div id="boss-hud" hidden><div class="boss-caption"><strong id="boss-name"></strong><span id="boss-phase"></span></div><div class="ward-track"><i id="boss-ward"></i></div><div class="boss-track"><i id="boss-health"></i></div></div>
      <div class="bottom-bar"><button id="route-meter" data-action="combinations" class="route-meter"><span class="route-meter-name"></span><strong></strong><i></i></button><div class="controls-hint"><span>${(matchMedia('(pointer: coarse)').matches||window.__PHONE_PREVIEW__)?tr('Drag to move'):'W A S D'}</span><small>${tr('Attacks are automatic')}</small></div><div id="weapons"></div></div>
      <button id="time-button" data-action="bullet-time" aria-label="${tr('Bullet time')}" aria-describedby="time-state" title="${tr('Slow the world for 4 seconds. You move and attack normally, but can still take damage. Cooldown: 24 seconds.')}">${icon('clock')}<span class="time-label">${tr('Bullet time')}</span><span class="time-countdown"></span><span id="time-state" class="sr-only"></span></button>
      <div id="choice-preview" hidden><div class="preview-icon"></div><div class="preview-copy"><small>${tr('Choose one of three')}</small><strong></strong><p></p><span>${tr('Read the upgrade before choosing.')}</span></div></div>`;
    this.refs=Object.fromEntries([...this.hud.querySelectorAll('[id]')].map(el=>[el.id,el]));
    this.map=this.refs['mini-map'].getContext('2d');this.update(game);
  }

  update(game){
    if(this.hud.hidden)return;
    const p=game.player,r=this.refs;
    const special=game.entities.filter(e=>e.state==='alive'&&(e.boss||e.elite)).sort((a,b)=>Number(b.boss)-Number(a.boss))[0];
    r['timer'].textContent=formatTime(game.time);
    r['phase-name'].textContent=p.bulletTimeRemaining>0?t('Bullet time'):special?t(special.boss?'The hollow throne':'Elite incoming'):game.time<OPENING_TIME?t('Harvest awakening'):game.pacing.rest?t('Salvage interlude'):t(expeditionStage(game.time));
    this.hud.querySelector('.timeline i').style.width=`${Math.min(100,game.time/BOSS_TIME*100)}%`;
    r['health-text'].textContent=`${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    r['health-fill'].style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;
    r['health-fill'].classList.toggle('critical',p.hp<p.maxHp*.3);
    r['mouth-level'].textContent=['I','II','III','IV','V','VI'][p.level-1];
    r['mass-text'].textContent=`${Math.floor(p.energy)}/${p.energyCost}`;
    r['mass-text'].title=game.rewardPending?t('Stored energy {{current}}',{current:Math.floor(p.energy)}):t('Skill energy');
    r['mass-fill'].style.width=`${Math.min(100,p.energy/p.energyCost*100)}%`;
    r['mass-fill'].style.background=game.rewardPending?'#e6b640':'#a1ad57';
    r['kill-count'].textContent=game.stats.kills;r['score-count'].textContent=Math.round(game.score).toLocaleString();
    const route=ROUTES[p.route],meter=r['route-meter'],ratio=p.route==='frost'?p.shards/shardCapacity(p):Math.min(1,p.routeCharge/routeCapacity(p));
    meter.style.setProperty('--route-color',route.color);meter.querySelector('.route-meter-name').textContent=t(p.route==='frost'?'Guardian ice':p.route==='furnace'?'Furnace heat':'Loaded volley');
    meter.querySelector('strong').textContent=p.route==='frost'?`${p.shards}/${shardCapacity(p)}`:ratio>=1?(p.routeCooldown>0?t('Cooling {{seconds}}s',{seconds:p.routeCooldown.toFixed(1)}):t('Ready')):`${Math.floor(ratio*100)}%`;
    meter.querySelector('i').style.width=`${ratio*100}%`;meter.classList.toggle('charged',ratio>=1);
    const objective=this.objective(game);
    r['objective-title'].textContent=t(objective[0]);r['objective-text'].textContent=this.settings.tutorial?t(objective[1]):'';
    const signature=JSON.stringify(p.modules)+p.evolution+p.path+p.core+JSON.stringify(p.perks);
    if(signature!==this.lastBuild){
      this.lastBuild=signature;
      const owned=ownedWeapons(p);
      r['weapons'].innerHTML=owned.map(key=>{const data=SKILLS[key],look=equippedArt(p,key);return `<button class="weapon-card active" data-action="weapon" data-value="${key}" style="--weapon-color:${data.color}"><span class="weapon-icon">${thumb(look.atlas,look.frame,76)}</span><span class="weapon-copy"><strong>${tr(data.name)}</strong><small data-charge-for="${key}">${tr('Rank {{rank}}',{rank:p.modules[key]})}</small><span class="rank-dots">${Array.from({length:data.max},(_,i)=>`<i class="${i<p.modules[key]?'on':''}"></i>`).join('')}</span></span></button>`;}).join('')+Array.from({length:3-owned.length},()=>`<button class="weapon-card empty-slot" data-action="combinations" aria-label="${tr('Three weapon slots')}"><span>＋</span><small>${tr('Weapon slots {{current}}/{{max}}',{current:owned.length,max:3})}</small></button>`).join('');
      this.paintThumbs(r['weapons']);
    }
    const kit=game.arsenal.tactics;
    for(const node of r['weapons'].querySelectorAll('[data-charge-for]')){
      const id=learnedBlueprint(p,node.dataset.chargeFor);if(!id)continue;
      node.textContent=id==='fieldTurrets'?t('Turrets {{count}}/2',{count:kit.turrets.filter(e=>e.hp>0).length}):id==='windWheel'?t('Windwheel {{count}}/6',{count:kit.wheelFood}):id==='stormLance'?t('Lance charges {{count}}/3',{count:Math.floor(kit.lanceCharge)}):id==='rootMines'?t('Mines {{count}}',{count:game.arsenal.formation.gardens.filter(e=>e.life>0).length}):id==='wingedHive'?t('Drones {{count}}',{count:game.arsenal.formation.guardians.filter(e=>e.hp>0).length}):id==='mirrorWall'?t('Mirrors {{count}}/2',{count:kit.mirrors.length}):t(BLUEPRINTS[id].name);
    }
    const timeButton=r['time-button'],active=p.bulletTimeRemaining>0,cooling=p.bulletTimeCooldown>0;
    timeButton.querySelector('.time-countdown').textContent=active?`${p.bulletTimeRemaining.toFixed(1)}s`:cooling?`${Math.ceil(p.bulletTimeCooldown)}s`:t('Ready');
    timeButton.classList.toggle('active',active);timeButton.classList.toggle('cooling',cooling&&!active);
    timeButton.classList.toggle('ending',active&&p.bulletTimeRemaining<=1);
    timeButton.classList.toggle('ready',!cooling);
    timeButton.style.setProperty('--time-progress',`${(active?p.bulletTimeRemaining/BULLET_TIME.duration:1-p.bulletTimeCooldown/BULLET_TIME.cooldown)*360}deg`);
    timeButton.disabled=game.mode!=='playing'||cooling;
    r['time-state'].textContent=active?t('Bullet time active: {{seconds}}s',{seconds:p.bulletTimeRemaining.toFixed(1)}):cooling?t('Cooling {{seconds}}s',{seconds:Math.ceil(p.bulletTimeCooldown)}):t('Bullet time ready');
    r['boss-hud'].hidden=!special;
    if(special){r['boss-name'].textContent=t(special.name);r['boss-phase'].textContent=canSwallow(p,special)&&special.boss?t('The king can be devoured'):special.intent==='windup'&&special.attackName?t(special.attackName):special.intent==='recover'?t('Recovery window'):special.boss?t('Boss phase {{number}}',{number:special.phase}):t('Duel');r['boss-health'].style.width=`${Math.max(0,special.hp/special.maxHp*100)}%`;r['boss-ward'].style.width=`${special.maxWard?special.ward/special.maxWard*100:0}%`;}
    const shrine=game.entities.filter(e=>e.category==='shrine'&&e.state==='alive'&&Math.hypot(e.x-p.x,e.z-p.z)<7).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    const preview=r['choice-preview'];preview.hidden=!shrine||Boolean(this.modal);
    if(shrine){
      const art={atlas:'arsenal',sprite:12};
      if(this.previewId!==shrine.id){this.previewId=shrine.id;preview.querySelector('.preview-icon').innerHTML=thumb(art.atlas,art.sprite,90);this.paintThumbs(preview);}
      preview.querySelector('strong').textContent=t('Skill ruin');preview.querySelector('p').textContent=t('Move closer to draw the ruin into your mouth.');
    }
    this.drawMap(game);
  }

  objective(game){
    if(game.bossDefeated)return['A feast earned in battle','Old threats become food'];
    if(game.player.bulletTimeRemaining>0)return['Bullet time','The world slows. Keep moving and attacking; avoid touching enemy fire.'];
    const boss=game.entities.find(e=>e.boss&&e.state==='alive');
    if(boss&&canSwallow(game.player,boss))return['The king can be devoured','Approach the broken king and swallow it to finish the battle.'];
    if(game.player.hp<game.player.maxHp*.45)return['Find a health pack','Defeat enemies for health packs, or swallow a green recovery pavilion.'];
    if(game.time<OPENING_TIME&&!game.rewardPending)return['Harvest awakening','Sweep through the stacked supplies. Fill your first skill bar before the guards arrive.'];
    if(game.entities.some(e=>e.category==='blueprint'&&e.state==='alive'))return['Tactical blueprint','Outpost reward. Skill energy is not spent.'];
    if(game.entities.some(e=>e.category==='shrine'&&e.state==='alive'))return['Ruin ready','Follow the arrow to claim your skill. Extra energy is saved.'];
    if(game.time<OPENING_TIME)return['Learning the ropes','Breaks between attacks give you time to collect and choose.'];
    if(game.expedition.active){const event=OPPORTUNITIES[game.expedition.active.type];return[event.name,event.description];}
    const plan=learnedBlueprint(game.player,ROUTES[game.player.route].primary)||Object.keys(BLUEPRINTS).find(id=>game.player.perks[id]);
    if(plan&&!game.entities.some(e=>(e.elite||e.boss)&&e.state==='alive'))return[BLUEPRINTS[plan].name,BLUEPRINTS[plan].hint];
    if(game.time<34)return['Keep moving','The glowing nexus is your hitbox. It grows with the city. Use bullet time to find a gap.'];
    if(game.stats.bulletTimes===0&&game.time<50)return['Bullet time','Press Space or right click for bullet time. On touch, tap the clock button.'];
    if(game.entities.some(e=>e.category==='core'&&e.state==='alive'))return['Absorb the core','Absorb the fallen core to choose a city improvement.'];
    if(game.bossSpawned)return['The hollow throne','The king has three attack phases. Break its ward, dodge the gaps, then consume it.'];
    if(game.entities.some(e=>e.elite&&e.state==='alive'))return['Elite incoming','Elite enemies carry evolution cores. Their visible wards must be broken first.'];
    if(game.player.modules.summon&&!game.stats.rallies)return['Acorn legion','Swallow supplies to rally your guardians. Bullet time also commands a full charge.'];
    if(game.player.modules.roots&&!game.stats.rootBlooms)return['Briar gardens','Plant a path while moving, then lead enemies back through the roots.'];
    if(game.entities.some(e=>e.kind==='herald'&&e.state==='alive'))return[ENEMIES.herald.name,ENEMIES.herald.description];
    if(game.expedition.active){const event=OPPORTUNITIES[game.expedition.active.type];return[event.name,event.description];}
    if(game.player.route==='frost'&&game.player.shards>0)return['Guardian ice','Activate bullet time to release'];
    if(game.pacing.rest)return['Catch your breath',game.entities.some(e=>e.category==='enemy'&&e.state==='alive')||game.bullets.some(b=>b.side==='enemy')?'Breaks between attacks give you time to collect and choose.':'A quiet moment. Gather food and look for recovery.'];
    return[expeditionStage(game.time),game.time<90?'Break the guards, then swallow their wreckage to recharge.':game.time<270?'Silence the lantern keepers and dodge the petal volleys.':'Dodge the root waves. Strike while heavy guardians recover.'];
  }

  drawMap(game){
    const c=this.map;c.clearRect(0,0,112,112);c.fillStyle='#e4edc9';c.fillRect(0,0,112,112);
    c.strokeStyle='#6b845666';c.lineWidth=1;c.strokeRect(5,5,102,102);
    const pos=e=>({x:56+e.x*1.75,y:56+e.z*1.75});
    for(const e of game.entities){
      if(e.state!=='alive'||!e.healing&&!e.eventType&&!['enemy','shrine','core'].includes(e.category))continue;
      const v=pos(e);c.fillStyle=e.eventType?'#5079a5':e.healing?'#21945b':e.category==='enemy'?(e.elite||e.boss?'#9c3152':'#d5684c'):e.category==='shrine'?'#b27d32':'#7657c5';
      c.beginPath();
      if(e.category==='shrine'||e.category==='core'){
        c.moveTo(v.x,v.y-6);c.lineTo(v.x+5,v.y);c.lineTo(v.x,v.y+6);c.lineTo(v.x-5,v.y);c.closePath();c.strokeStyle='#fff7df';c.lineWidth=2;c.stroke();
      }else if(e.eventType)c.rect(v.x-3,v.y-3,6,6);
      else c.arc(v.x,v.y,e.healing||e.elite||e.boss?3:1.8,0,Math.PI*2);
      c.fill();
    }
    const p=pos(game.player);c.fillStyle='#243f39';c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();
  }

  healthPulse(){
    const node=this.refs?.['healing-status'];if(!node)return;
    node.hidden=false;clearTimeout(this.healTimeout);this.healTimeout=setTimeout(()=>node.hidden=true,1600);
  }

  upgradeBanner(event){
    const node=this.root.querySelector('#upgrade-banner');
    const perk=event.perk?PERKS[event.perk]:null;
    const mark=perk?(perk.atlas?thumb(perk.atlas,perk.sprite,80):icon(perk.icon)):event.art?thumb(event.art.atlas,event.art.sprite,80):(event.skill?thumb(weaponAtlas(event.skill),weaponFrame(event.skill,event.rank),80):thumb('characters',15,80));
    const heading=perk?`${tr(RARITIES[event.quality||perk.rarity].name)} · ${tr(PERK_KINDS[perk.kind])}`:`${tr('Upgraded')} · ${tr('Weapon rank {{rank}}',{rank:event.rank||''})}`;
    const detail=perk?.stat?tr('{{stat}}: {{before}} → {{after}}',{stat:t(STAT_LABELS[perk.stat]),before:formatStat(perk.stat,event.before),after:formatStat(perk.stat,event.after)}):tr(event.detail||'',event.params)+(event.extra?'<br>'+tr(event.extra,event.params):'');
    node.innerHTML=`<div class="upgrade-icon">${mark}</div><div><small>${heading}</small><h3>${tr(event.title||'Additional power')}</h3><p>${detail}</p></div><span class="upgrade-delta">${perk?`${event.stack}/${perk.max}`:`${event.previous??''} <b>→</b> ${event.rank??''}`}</span>`;
    this.paintThumbs(node);node.hidden=false;node.classList.remove('rank-pulse');void node.offsetWidth;node.classList.add('rank-pulse');
    clearTimeout(this.toastTimeout);this.toastTimeout=setTimeout(()=>node.hidden=true,3200);
  }

  announce(title,subtitle='',milestone=false){
    const node=this.root.querySelector('#announcement');node.innerHTML=`<span class="eyebrow">${subtitle?tr(subtitle):'RIFTBOUND'}</span><h2>${tr(title)}</h2>`;node.hidden=false;node.classList.toggle('milestone',milestone);
    clearTimeout(this.announceTimeout);this.announceTimeout=setTimeout(()=>node.hidden=true,milestone?1800:1500);
  }

  showPanel(kind,game,extra){
    this.modal=kind;this.panel.hidden=false;this.previousFocus=document.activeElement;
    let body='',wide=false;
    const routeAtlas=this.art.frames.routes?'routes':'travelers';
    const close=`<button class="icon-button panel-close" data-action="close" aria-label="${tr('Close')}">${icon('close')}</button>`;
    if(kind==='pause')body=`<div class="eyebrow">RIFTBOUND</div><h2>${tr('Paused')}</h2><p>${tr('Move. Dodge. Devour. Evolve.')}</p><div class="panel-actions"><button class="main-button" data-action="resume">${icon('play')}${tr('Resume')}</button><button class="secondary" data-action="settings">${icon('gear')}${tr('Settings')}</button><button class="secondary" data-action="guide">${icon('book')}${tr('Combat manual')}</button><button class="secondary" data-action="garage">${tr('Workshop')}</button><button class="subtle" data-action="home">${tr('Back to title')}</button></div>`;
    if(kind==='settings')body=`<div class="eyebrow">RIFTBOUND</div><h2>${tr('Settings')}</h2><label class="settings-row"><span>${tr('Music and sound effects')}</span><input type="checkbox" data-setting="sound" ${this.settings.muted?'':'checked'}></label><label class="settings-row"><span>${tr('Reduced motion')}</span><input type="checkbox" data-setting="reducedMotion" ${this.settings.reducedMotion?'checked':''}></label><label class="settings-row"><span>${tr('Show combat tips')}</span><input type="checkbox" data-setting="tutorial" ${this.settings.tutorial?'checked':''}></label><label class="settings-row"><span>${tr('Battle effects')}</span><select data-setting="quality"><option value="high" ${this.settings.quality==='high'?'selected':''}>${tr('High')}</option><option value="balanced" ${this.settings.quality==='balanced'?'selected':''}>${tr('Balanced')}</option></select></label><label class="settings-row"><span>${tr('Language')}</span><select data-setting="language">${supportedLanguages.map(l=>`<option value="${l.code}" ${this.settings.language===l.code?'selected':''}>${escapeHtml(l.label)}</option>`).join('')}</select></label><p class="fine-print">${tr('Saved locally on this device.')}</p><div class="panel-actions"><button class="main-button" data-action="close">${tr('Resume')}${icon('arrow')}</button></div>`;
    if(kind==='garage'){
      wide=true;
      body=`<div class="eyebrow">${tr('Permanent modifications')}</div><h2>${tr('Workshop')}</h2><div class="garage-balance">${icon('gear')}<b>${this.profile.parts}</b><span>${tr('Parts')}</span></div><p>${tr('Modifications apply to your next expedition.')}</p><div class="garage-grid">${Object.entries(MODIFICATIONS).map(([id,mod])=>{
        const level=workshopLevel(this.profile,id),cost=modificationCost(this.profile,id),max=level>=mod.max;
        return `<article class="garage-card"><div class="garage-icon">${icon(mod.icon)}</div><h3>${tr(mod.name)}</h3><p>${tr(mod.description)}</p><div class="garage-level">${tr('Level {{current}}/{{max}}',{current:level,max:mod.max})}</div><button class="main-button" data-action="buy-modification" data-value="${id}" ${max||this.profile.parts<cost?'disabled':''}>${max?tr('Maximum level'):tr('Upgrade for {{cost}} parts',{cost})}</button></article>`;
      }).join('')}</div><p class="fine-print">${tr('Expeditions earn parts, even when you fall.')}</p><div class="panel-actions"><button class="main-button" data-action="close">${tr('Close')}</button></div>`;
    }
    if(kind==='homes'){
      wide=true;body=`<div class="eyebrow">${tr('Opening loadout')}</div><h2>${tr('Choose your traveling home')}</h2><p class="home-explanation">${tr('Choose your starting weapon and how swallowing powers your castle. All homes can learn other weapons during the run.')}</p><div class="home-grid">${Object.entries(ROUTES).map(([id,route])=>{
        const style=HOME_PLAYSTYLES[id],selected=this.profile.route===id;
        return `<button class="home-choice ${selected?'selected':''}" data-action="choose-home" data-value="${id}" aria-pressed="${selected}" style="--home-color:${route.color}"><span class="home-art">${cityThumb(id,1,150)}</span><span class="home-details"><span class="home-style">${tr(style.style)}</span><strong>${tr(style.title)}</strong><span class="home-fact"><b>${tr('Attack')}</b>${tr(style.attack)}</span><span class="home-fact"><b>${tr('After swallowing')}</b>${tr(style.devour)}</span><span class="home-pick">${selected?'✓ '+tr('Selected'):tr('Use this castle')+' ›'}</span></span></button>`;
      }).join('')}</div><p class="fine-print">${tr('Try the cannon castle first. You can switch castles before every expedition.')}</p><button class="secondary growth-link" data-action="growth">${tr('Castle and weapon growth')} ›</button>`;
    }
    if(kind==='growth'){
      const inRun=game.mode!=='title',route=inRun?game.player.route:this.profile.route,primary=ROUTES[route].primary;
      const example=extra||(inRun?'current':'battery'),examples=[...(inRun?['current']:[]),'battery','legion','garden'];
      const labels={current:'Current loadout',battery:'Battery city',legion:'Legion city',garden:'Garden city'};
      const stages=CASTLE_STAGES.map((stage,index)=>{
        let modules=inRun&&example==='current'?cityModules(game.player):{[primary]:[1,2,4,primary==='cannon'?6:5][index]};
        if(example!=='current'){
          const partners=example==='legion'?['summon','lightning']:example==='garden'?['roots',primary==='ice'?'ember':'ice']:[primary==='cannon'?'wind':'cannon','lightning'];
          modules[partners[0]]=(partners[0]==='cannon'?[0,2,4,6]:[0,1,3,5])[index];modules[partners[1]]=[0,0,2,4][index];
        }
        const equipment=Object.entries(modules).filter(([,rank])=>rank>0).map(([id,rank])=>`<span>${tr(SKILLS[id].name)} ${rank}</span>`).join('');
        return `<article>${cityThumb(route,stage.level,220,modules,example==='current'?game.player.path:null,example==='current'?game.player.core:null,example==='current'?game.player.perks:{})}<small>${tr('Mouth')} ${stage.level}</small><h3>${tr(stage.name)}</h3><p>${tr(stage.detail)}</p><div class="growth-loadout">${equipment}</div></article>`;
      }).join('');
      wide=true;body=`<div class="eyebrow">${tr(HOME_PLAYSTYLES[route].title)}</div><h2>${tr('Castle and weapon growth')}</h2><p>${tr('Swallowing expands the chassis. Skill ranks upgrade its equipment. Both are visible on the same castle.')}</p><div class="growth-tabs">${examples.map(id=>`<button class="${id===example?'selected':''}" data-action="growth" data-value="${id}" aria-pressed="${id===example}">${tr(labels[id])}</button>`).join('')}</div><div class="growth-gallery">${stages}</div><p class="fine-print">${tr('Illustrated build examples. Extra weapon mounts do not grant skills; equipment appears only after you learn it.')}</p><div class="growth-rules"><p>${tr('Cannon: one barrel, twin barrels, then a heavy three-gun battery. Each gun fires from its own muzzle.')}</p><p>${tr('Summon gates grow from one bell to three. Seed racks grow into broad planters. Both share the castle with its other weapons.')}</p></div><button class="main-button" data-action="close">${tr('Close')}</button>`;
    }
    if(kind==='evolution'){
      const p=game.player,primary=ROUTES[p.route].primary;
      const companion=ownedWeapons(p).filter(s=>s!==primary).sort((a,b)=>p.modules[b]-p.modules[a])[0];
      const armory=[primary,companion].filter(Boolean).map(s=>`${tr(SKILLS[s].name)} ${p.modules[s]>=SKILLS[s].max?`${tr('Damage bonus')} +18%`:`${p.modules[s]} → ${p.modules[s]+1}`}`).join('<br>');
      wide=true;body=`<div class="eyebrow">${tr('Evolution ready')}</div><h2>${tr('Choose a city improvement')}</h2><p>${tr(ROUTES[p.route].name)}</p><div class="draft-grid">${Object.entries(EVOLUTION_ASPECTS).map(([id,evo])=>`<button class="draft-card evolution-choice" data-action="evolve" data-value="${id}" style="--rarity-color:#b29354"><span class="rarity-badge">${tr('Evolution ready')}</span><span class="card-kind">${tr('Traveling home')}</span><span class="draft-icon">${icon(evo.icon)}</span><strong class="draft-title">${tr(evo.name)}</strong><b class="draft-value">${p.evolutionRank} → ${p.evolutionRank+1}</b><span class="draft-description">${id==='armory'?armory:tr(evo.description)}</span></button>`).join('')}</div>`;
    }
    if(kind==='shrine'){
      const p=game.player,choices=game.choiceOffers;
      wide=true;
      const choosingBranch=choices.some(e=>e.path);
      body=`<div class="eyebrow">${tr('Choose one of three')} · ${tr('Weapon slots {{current}}/{{max}}',{current:ownedWeapons(p).length,max:3})}</div><h2>${tr(game.blueprintDraft?'Choose a tactical blueprint':choosingBranch?'Choose a branch':'Choose a skill')}</h2><p>${tr(game.blueprintDraft?'Outpost reward. Skill energy is not spent.':choosingBranch?'This choice locks the other branch for this expedition.':'Tap a card to choose.')}</p><div class="draft-grid">${choices.map(e=>{
        const rawPerk=e.perk?PERKS[e.perk]:null,perk=e.perk==='legionHeart'&&p.perks.wingedHive?{...rawPerk,atlas:'tactics',sprite:3,description:'During rally, one drone becomes a larger command drone with stronger, wider pulse strikes.'}:rawPerk,node=e.path?BRANCHES[e.path]:e.mastery?MASTERY_NODES[e.mastery]:null,rank=e.skill?p.modules[e.skill]:0,info=e.skill?blueprintRankPreview(p,e.skill,rank+1):null;
        const rarity=RARITIES[e.rarity||'common'];
        const title=node?.name||info?.title||perk?.name||buffCopy[e.buff][0];
        let description=tr(node?.description||info?.detail||perk?.description||buffCopy[e.buff][1],info?.params)+(info?.extra?'<br>'+tr(info.extra,info.params):'');
        if(perk?.stat)description=tr('{{stat}}: {{before}} → {{after}}',{stat:t(STAT_LABELS[perk.stat]),before:formatStat(perk.stat,p[perk.stat]),after:formatStat(perk.stat,p[perk.stat]+perkAmount(e.perk,e.rarity))});
        const art=e.path?thumb(routeAtlas,node.sprite,110):node?icon(node.icon):perk?.atlas?thumb(perk.atlas,perk.sprite,90):perk&&(perk.nexus||perk.kind==='core')?thumb('cores',(p.route==='furnace'?4:p.route==='frost'?8:0)+1,90):e.skill?thumb(learnedBlueprint(p,e.skill)?'tactics':weaponAtlas(e.skill),learnedBlueprint(p,e.skill)?BLUEPRINTS[learnedBlueprint(p,e.skill)].sprite:weaponFrame(e.skill,rank+1,p.path),90):perk?icon(perk.icon):thumb(BUFF_ART[e.buff].atlas,BUFF_ART[e.buff].sprite,90);
        const amount=perk?.stat?perkAmount(e.perk,e.rarity):0;
        const value=perk?.blueprint?tr('Form change'):e.skill?`${rank} → ${rank+1}`:perk?.stat?`+${['maxHp','speed'].includes(perk.stat)?Number(amount.toFixed(2)):Math.round(amount*100)}${['maxHp','speed'].includes(perk.stat)?'':'%'}`:perk?.value||'';
        const stack=e.raiseSkill?tr('{{weapon}} {{before}} → 2 included',{weapon:t(SKILLS[e.raiseSkill].name),before:p.modules[e.raiseSkill]}):perk?.blueprint?tr('{{weapon}} · one blueprint',{weapon:t(SKILLS[perk.requires].name)}):e.deferBranch?tr('Branch returns after two upgrades.'):e.path?`${tr('Mastery')} · ${tr(MASTERY_NODES[node.mastery].name)}`:e.mastery?tr('Mastery'):perk?tr('Stack {{current}}/{{max}}',{current:(p.perks[e.perk]||0)+1,max:perk.max}):e.skill?tr(SKILLS[e.skill].name):'';
        const related=comboRecommendations(p,e.skill);
        if(e.perk==='explosive')description=tr('Explosion radius: {{before}} → {{after}}',{before:formatStat('speed',(CANNON_RANKS[p.modules.cannon]?.splash||0)*p.area),after:formatStat('speed',((CANNON_RANKS[p.modules.cannon]?.splash||0)+.9)*p.area)});
        const kindLabel=perk?.blueprint?'Tactical blueprint':e.path?'Branch':e.mastery?'Mastery':perk?.nexus?'Nexus modification':e.skill&&SKILLS[e.skill].typeLabel?SKILLS[e.skill].typeLabel:PERK_KINDS[e.kind||'weapon'];
        const lastSlot=(e.skill&&!rank||e.raiseSkill&&!p.modules[e.raiseSkill])&&ownedWeapons(p).length===2;
        const revealed=related.some(c=>c.unlocks)?related.filter(c=>c.unlocks):related.slice(0,1);
        const synergy=revealed.length&&!choosingBranch?`<small class="draft-synergy ${revealed.some(c=>c.unlocks)?'unlocks':''}">${revealed.map(combo=>`${combo.unlocks?tr('Unlocks {{name}}',{name:t(combo.name)}):tr(combo.name)}${combo.unlocks?'':'<br>'+Object.entries(combo.needs).map(([s,n])=>tr(SKILLS[s].name)+' '+(p.modules[s]||0)+'/'+n).join(' + ')}<br><b>${tr(COMBO_ROLES[combo.id])}</b>`).join('<hr>')}</small>`:e.perk==='precision'&&p.core==='execution'?`<small class="draft-synergy">${tr(PERKS.execution.name)}</small>`:lastSlot?`<small class="draft-synergy">${tr('Last weapon slot')}</small>`:'';
        return `<button type="button" class="draft-card" data-action="choose-shrine" data-value="${e.id}" style="--rarity-color:${rarity.color}"><span class="rarity-badge">${tr(rarity.name)}</span><span class="card-kind">${tr(kindLabel)}</span><span class="draft-icon">${art}</span><strong class="draft-title">${tr(title)}</strong><b class="draft-value">${value}</b><span class="draft-description">${description}</span><small class="draft-stack">${stack}${lastSlot&&related[0]?` · ${tr('Last weapon slot')}`:''}</small>${synergy}</button>`;
      }).join('')}</div>${choosingBranch?'':`<div class="draft-footer"><button class="secondary" data-action="reroll" ${p.rerolls<=0?'disabled':''}>${icon('refresh')}${tr(p.rerolls?'Reroll · {{count}} left':'No rerolls left',{count:p.rerolls})}</button></div>`}`;
    }
    if(kind==='weapon'){
      const skill=SKILLS[extra],rank=game.player.modules[extra],list=WEAPON_RANKS[extra],blueprint=learnedBlueprint(game.player,extra),look=equippedArt(game.player,extra);
      body=`<div class="eyebrow">${tr('Your build')}</div><h2>${tr(skill.name)} · ${rank}</h2><div class="guide-weapon-art">${thumb(look.atlas,look.frame,110)}</div><h3>${tr('Tactical blueprint')}</h3><p class="fine-print">${tr('Rank two opens blueprint cards. Outpost rewards can supply the skill and its prerequisite. Choose one blueprint per weapon.')}</p>${Object.entries(BLUEPRINTS).filter(([,b])=>b.requires===extra).map(([id,b])=>`<article class="blueprint-note ${id===blueprint?'selected':''}">${thumb('tactics',b.sprite,60)}<div><strong>${id===blueprint?'✓ ':''}${tr(b.name)}</strong><p>${tr(b.description)}</p></div></article>`).join('')}<div class="rank-list">${list.slice(1).map((r,i)=>{r=blueprintRankPreview(game.player,extra,i+1);return `<div class="rank-row ${i+1===rank?'current':''} ${i+1<rank?'learned':''}"><b>${i+1}</b><span><strong>${tr(r.title)}</strong><p>${tr(r.detail,r.params)}${r.extra?'<br>'+tr(r.extra,r.params):''}</p></span>${i+1<=rank?icon('check'):''}</div>`;}).join('')}</div><div class="panel-actions"><button class="main-button" data-action="close">${tr('Resume')}</button></div>`;
    }
    if(kind==='guide'){
      wide=true;const tips=[['Traveling home','Different homes turn swallowed resources into volleys, eruptions, or guardian ice.'],['Choose one of three','A skill ruin pauses the fight. Choose one card or spend a free reroll.'],['Three weapon slots','Three weapons maximum; the core has its own slot.'],['World opportunities','Clear wardens to open an outpost; moving wagons can be swallowed immediately.'],['Restoration supplies','Ordinary packs are scarce, expire after 40 seconds, and stop dropping above 85% integrity. Elite rewards remain guaranteed.'],['Bullet time','Slow the world for 4 seconds. You move and attack normally, but can still take damage. Cooldown: 24 seconds.'],['Ward','Visible purple wards block swallowing. Damage cracks them open.'],['City integrity','The visible energy nexus grows with the city. Its rim is the collision boundary.']];
      body=`<div class="eyebrow">RIFTBOUND</div><h2>${tr('Combat manual')}</h2><div class="guide-grid">${tips.map(([title,desc],i)=>`<div class="guide-card">${icon(['mouth','cannon','wind','shield','target','ice'][i])}<h3>${tr(title)}</h3><p>${tr(desc)}</p></div>`).join('')}</div><h3 class="codex-title">${tr('Enemy codex')}</h3><div class="codex-grid">${Object.values(ENEMIES).map(e=>`<div>${thumb(e.atlas||'characters',e.sprite,90)}<strong>${tr(e.name)}</strong><p>${tr(e.description)}</p></div>`).join('')}</div><div class="panel-actions"><button class="main-button" data-action="close">${tr('Resume')}</button></div>`;
    }
    if(kind==='combinations'){
      wide=true;const unlocked=game.arsenal.comboIds,p=game.player;
      const stats=[['Damage bonus',`${Math.round((p.power-1)*100)}%`],['Attack speed',`${Math.round(p.haste*(1+p.salvageStacks*.08)*(p.overdrive>0?1.8:1)*100)}%`],['Critical chance',`${Math.round(p.critChance*100)}%`],['Critical damage',`${Math.round(p.critMultiplier*100)}%`],['Movement speed',formatStat('speed',p.speed)],['Swallow charge efficiency',`${Math.round(p.routeGain*100)}%`]];
      const damageTotals=new Map();
      for(const [weapon,amount] of Object.entries(game.stats.damageByWeapon)){const key=SKILLS[weapon]?.name||({lance:'Cannon',furnace:'Ember',shatter:'Frost',steam:'Thermal shock',gravity:'Singularity heart',judgment:'Judgment heart'}[weapon])||'Other damage';damageTotals.set(key,(damageTotals.get(key)||0)+amount);}
      const damageSum=[...damageTotals.values()].reduce((a,b)=>a+b,0);
      const ledger=damageSum?`<h3>${tr('Damage this run')}</h3><div class="damage-ledger">${[...damageTotals].sort((a,b)=>b[1]-a[1]).map(([name,amount])=>`<div><span>${tr(name)}</span><i style="--damage-share:${amount/damageSum*100}%"></i><b>${Math.round(amount/damageSum*100)}%</b></div>`).join('')}</div>`:'';
      const owned=new Set(ownedWeapons(p));
      const missing=combo=>Object.entries(combo.needs).reduce((sum,[skill,rank])=>sum+Math.max(0,rank-(p.modules[skill]||0)),0);
      const relevant=Object.entries(COMBOS).filter(([,combo])=>Object.keys(combo.needs).some(skill=>owned.has(skill))&&new Set([...owned,...Object.keys(combo.needs)]).size<=3).sort(([a,ca],[b,cb])=>Number(unlocked.includes(b))-Number(unlocked.includes(a))||missing(ca)-missing(cb));
      const other=Object.entries(COMBOS).filter(([id])=>!relevant.some(([key])=>key===id));
      const comboCards=entries=>entries.map(([id,combo])=>`<article class="combo-item ${unlocked.includes(id)?'unlocked':''}">${thumb(combo.atlas||'arsenal',combo.sprite,88)}<div><h3>${tr(combo.name)}</h3><p>${tr(combo.description)}</p><p class="combo-tactic"><b>${tr(COMBO_ROLES[id])}</b> · ${tr(COMBO_TACTICS[id])}</p><small>${tr('Requirements')}: ${Object.entries(combo.needs).map(([skill,rank])=>`${tr(SKILLS[skill].name)} ${Math.min(p.modules[skill]||0,rank)}/${rank}`).join(' + ')}</small>${unlocked.includes(id)?`<b class="synergy-badge">${tr('Unlocked')} · ${tr('Link hits {{count}}',{count:game.stats.comboHits[id]||0})}</b>`:''}</div></article>`).join('');
      const focus=relevant[0],targetCard=focus?`<aside class="build-target"><small>${tr(unlocked.includes(focus[0])?'Unlocked':'Next combination')}</small><strong>${tr(focus[1].name)}</strong><p>${tr(COMBO_TACTICS[focus[0]])}</p><b>${Object.entries(focus[1].needs).map(([skill,rank])=>`${tr(SKILLS[skill].name)} ${Math.min(p.modules[skill]||0,rank)}/${rank}`).join(' + ')}${missing(focus[1])===1?' · '+tr('One upgrade away'):''}</b></aside>`:'';
      const cityImprovements=Object.entries(p.cityImprovements).map(([id,count])=>`<span class="perk-chip" style="--rarity-color:#b29354">${icon(EVOLUTION_ASPECTS[id].icon)}${tr(EVOLUTION_ASPECTS[id].name)} ×${count}</span>`).join('');
      const modifiers=cityImprovements+Object.entries(p.perks).map(([id,count])=>`<span class="perk-chip" style="--rarity-color:${RARITIES[PERKS[id].rarity].color}">${icon(PERKS[id].icon)}${tr(PERKS[id].name)} ×${count}</span>`).join('');
      body=`<div class="eyebrow">${tr('Choose your build')}</div><h2>${tr('Build')}</h2>${targetCard}<div class="build-stats">${stats.map(([name,value])=>`<div><small>${tr(name)}</small><b>${value}</b></div>`).join('')}</div><p>${tr('Core slot')} · <strong>${tr(p.core?PERKS[p.core].name:'No core yet')}</strong></p><div class="perk-list">${modifiers||`<small>${tr('No modifiers yet')}</small>`}</div>${ledger}<h3>${tr('Combinations')}</h3><div class="combo-grid">${comboCards(relevant)}</div><details class="other-combos"><summary>${tr('Other combinations')}</summary><div class="combo-grid">${comboCards(other)}</div></details><div class="panel-actions"><button class="main-button" data-action="close">${tr('Resume')}</button></div>`;
    }
    if(kind==='result'){
      const result=game.result;body=`<div class="eyebrow">${tr(result.won?'An unbroken kingdom. A very hungry city.':'Try a different build')}</div><h2>${tr(result.won?'Victory':'The city falls')}</h2><div class="garage-balance">${icon('gear')}<b>+${result.parts}</b><span>${tr('Parts earned')}</span></div><div class="results-score">${Math.round(result.score).toLocaleString()}</div><div class="result-stats"><div><b>${formatTime(result.time)}</b><span>${tr('Survival time')}</span></div><div><b>${result.stats.kills}</b><span>${tr('Kills')}</span></div><div><b>${result.stats.upgrades}</b><span>${tr('Upgraded')}</span></div><div><b>${Math.round(result.stats.healed)}</b><span>${tr('Health recovered')}</span></div></div><p>${result.evolution?tr(EVOLUTIONS[result.evolution].name):tr('Your build')}</p><div class="panel-actions"><button class="main-button" data-action="start">${tr('Fight again')}${icon('arrow')}</button><button class="secondary" data-action="garage">${tr('Workshop')}</button><button class="subtle" data-action="home">${tr('Back to title')}</button></div>`;
    }
    if(kind==='combinations'){
      const p=game.player,route=ROUTES[p.route];
      const summary=`<article class="route-summary" style="--route-color:${route.color}">${cityThumb(p.route,p.level,150,cityModules(p),p.path,p.core,p.perks)}<div><h3>${tr(route.name)}</h3><p>${tr(route.loop)}</p><strong>${tr(p.path?BRANCHES[p.path].name:'No branch chosen yet')}</strong><p>${tr(p.path?BRANCHES[p.path].description:route.description)}</p>${p.mastery?`<small>${tr('Mastery')} · ${tr(MASTERY_NODES[p.mastery].name)}</small>`:''}<small>${tr('Weapon slots {{current}}/{{max}}',{current:ownedWeapons(p).length,max:3})}</small></div></article>`;
      const plans=Object.keys(BLUEPRINTS).filter(id=>p.perks[id]).map(id=>`<article class="blueprint-note">${thumb('tactics',BLUEPRINTS[id].sprite,60)}<div><strong>${tr(BLUEPRINTS[id].name)}</strong><p>${tr(BLUEPRINTS[id].description)}</p></div></article>`).join('');
      body=body.replace('<div class="build-stats">',summary+plans+`<button class="secondary growth-link" data-action="growth">${tr(CASTLE_STAGES[castleStage(p.level)].name)} · ${tr('Castle and weapon growth')} ›</button><p class="fine-print">${tr('Primary weapon upgrades also strengthen your charged attacks.')}${p.route==='harbor'?` ${tr('Loaded attacks seek visible threats and prioritize wards and elites.')}`:''}</p><div class="build-stats">`);
    }
    if(kind==='result')body=body.replace('<div class="panel-actions">',`<p class="route-results">${tr(ROUTES[game.player.route].name)} · ${tr(game.player.path?BRANCHES[game.player.path].name:'No branch chosen yet')}<br>${tr('Route bursts')} ${game.stats.routeBursts} · ${tr('Supplies recovered')} ${game.stats.eventsCompleted}</p><div class="panel-actions">`);
    this.panel.innerHTML=`<div class="scrim"></div><section class="panel ${wide?'wide':''} ${['shrine','evolution','homes'].includes(kind)?'draft-panel':''}" role="dialog" aria-modal="true">${['evolution','shrine','result'].includes(kind)?'':close}${body}</section>`;
    this.paintThumbs(this.panel);this.panel.querySelector('.draft-card,.main-button:not(:disabled)')?.focus({preventScroll:true});
  }

  hidePanel(){this.modal=null;this.panel.hidden=true;this.panel.innerHTML='';}
}
