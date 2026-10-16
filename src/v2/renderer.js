import { PaintedArt } from './sprites.js';
import { ArsenalVisuals } from './arsenal-visuals.js';
import { SwallowFeedback } from './swallow-feedback.js';
import { SKILLS, BUFF_ART, EVOLUTIONS, ENEMIES, createRng } from './data.js';
import { t } from '../i18n.js';
import { ROUTES, routeCapacity } from './skill-graph.js';
import { OPPORTUNITIES } from './expedition.js';
import { RouteVisuals } from './route-visuals.js';
import { BattleGuidance } from './guidance.js';
import { CombatVFX } from './combat-vfx.js';
import { castleStage } from './castle-appearance.js';
import {FormationVisuals} from './formation-visuals.js';

const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class BattleRenderer {
  constructor(canvas,images,settings){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.images=images;this.settings=settings;this.art=new PaintedArt(images);
    this.arsenalVisuals=new ArsenalVisuals(this);
    this.routeVisuals=new RouteVisuals(this);
    this.swallowFeedback=new SwallowFeedback(this);
    this.guidance=new BattleGuidance(this);this.combatVFX=new CombatVFX(this);
    this.formationVisuals=new FormationVisuals(this);
    this.camera={x:0,z:7};this.effects=[];this.particles=[];this.numbers=[];this.traces=[];
    this.shake=0;this.hurtFlash=0;this.time=0;this.timeTint=0;this.cityGrowth=null;
    this.resolutionScale=1;this.frameTotal=0;this.frameCount=0;this.fps=0;
    this.projectileSprites=new Map();
    this.terrainLayer=document.createElement('canvas');this.terrainCtx=this.terrainLayer.getContext('2d',{alpha:false});
    this.ground=this.terrainCtx.createPattern(images.terrain,'repeat');
    this.resize();window.addEventListener('resize',()=>this.resize());
    if(typeof ResizeObserver!=='undefined'){this.viewportObserver=new ResizeObserver(()=>{const box=this.canvas.getBoundingClientRect();if(Math.round(box.width)!==this.width||Math.round(box.height)!==this.height)this.resize(true);});this.viewportObserver.observe(this.canvas.parentElement);}
  }

  resize(preserveScale=false){
    if(!preserveScale)this.resolutionScale=1;
    const viewport=this.canvas.getBoundingClientRect();this.width=Math.max(1,Math.round(viewport.width));this.height=Math.max(1,Math.round(viewport.height));
    const pixelBudget=this.settings.quality==='balanced'?1200000:2000000;
    this.dpr=Math.min(devicePixelRatio||1,this.settings.quality==='balanced'?1.35:2,Math.sqrt(pixelBudget/(this.width*this.height)))*this.resolutionScale;
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.terrainLayer.width=Math.ceil((this.width+256)*this.dpr);this.terrainLayer.height=Math.ceil((this.height+256)*this.dpr);
    this.terrainCtx.setTransform(this.dpr,0,0,this.dpr,0,0);this.terrainView=null;
    this.baseScale=this.width<650?Math.max(21,this.width/17):clamp(Math.min(this.width/36,this.height/22),25,42);
    if(!preserveScale)this.scale=this.baseScale;
    this.sy=this.scale*.62;
    this.timeVignette=this.ctx.createRadialGradient(this.width*.5,this.height*.57,this.width*.18,this.width*.5,this.height*.57,Math.max(this.width,this.height)*.7);
    this.timeVignette.addColorStop(0,'#315b7500');this.timeVignette.addColorStop(.55,'#315b750b');this.timeVignette.addColorStop(1,'#315b7570');
  }

  observeFrame(milliseconds){
    if(milliseconds<=0||milliseconds>250)return;
    this.frameTotal+=milliseconds;this.frameCount++;
    if(this.frameCount<60)return;
    const average=this.frameTotal/this.frameCount;this.fps=Math.round(1000/average);
    this.frameTotal=0;this.frameCount=0;
    const pixels=this.canvas.width*this.canvas.height;
    if(average>25&&pixels>650000){
      this.resolutionScale*=Math.max(.8,Math.sqrt(600000/pixels));
      this.resize(true);
    }
  }

  performance(){return{fps:this.fps,pixelWidth:this.canvas.width,pixelHeight:this.canvas.height,resolutionScale:this.resolutionScale};}

  project(x,z,height=0){return{x:this.width*.5+(x-this.camera.x)*this.scale,y:this.height*.57+(z-this.camera.z)*this.sy-height*this.scale};}
  screenToWorld(x,y){return{x:this.camera.x+(x-this.width*.5)/this.scale,z:this.camera.z+(y-this.height*.57)/this.sy};}
  visible(point,margin=170){return point.x>-margin&&point.x<this.width+margin&&point.y>-margin&&point.y<this.height+margin;}
  clear(){this.effects=[];this.particles=[];this.numbers=[];this.traces=[];this.shake=0;this.timeTint=0;this.cityGrowth=null;this.arsenalVisuals.clear();this.routeVisuals.clear();this.combatVFX.clear();this.formationVisuals.clear();}

  event(event){
    const e=event;
    this.arsenalVisuals.event(e);
    this.routeVisuals.event(e);this.combatVFX.event(e);
    this.formationVisuals.event(e);
    if(e.type==='grow'&&castleStage(e.level)!==castleStage(e.previousLevel))this.cityGrowth={previousLevel:e.previousLevel||1,age:0,life:.65};
    if(e.type==='route-burst'){this.shake=Math.max(this.shake,.28);this.burst(e.x,e.z,ROUTES[e.route].color,18,1.25);}
    if(e.type==='meteor-impact'){this.effects.push({atlas:'skillEffects',row:0,x:e.x,z:e.z,size:e.size,age:0,life:.6});this.burst(e.x,e.z,'#ffc06c',e.phoenix?22:12,1.5);this.shake=Math.max(this.shake,e.phoenix?.4:.18);}
    if(e.type==='thunderstrike'){this.effects.push({atlas:'skillEffects',row:3,x:e.x,z:e.z,size:4.5,age:0,life:.5});this.shake=Math.max(this.shake,.4);this.burst(e.x,e.z,'#fff0ad',20,1.5);}
    if(e.type==='wind-pulse'||e.type==='frost-nova')this.effects.push({atlas:'skillEffects',row:e.type==='wind-pulse'?2:1,x:e.x,z:e.z,size:e.size||7,age:0,life:.65});
    if(e.type==='shot'){
      this.traces.push({type:'muzzle',...e,age:0,life:.13});
      this.burst(e.x,e.z,e.weapon==='ice'?'#b5edff':'#ffe1a1',5,.45);
    }
    if(e.type==='impact'||e.type==='kill'||e.type==='effect'||e.type==='freeze'){
      this.effects.push({atlas:['impact','kill','freeze'].includes(e.type)?'skillEffects':'effects',row:e.row??1,x:e.x,z:e.z,size:e.size||1.5,age:0,small:e.small,life:e.type==='kill'?.6:e.small?.23:.48});
      this.burst(e.x,e.z,e.row===1?'#92dafb':'#edb870',e.type==='kill'?18:5,e.elite?2:1);
      if(e.elite||e.type==='kill')this.shake=Math.max(this.shake,e.elite?.8:.14);
    }
    if(e.type==='damage'){
      if(this.numbers.length>32)this.numbers.shift();
      const grouped=this.numbers.find(n=>n.targetId===e.targetId&&n.age<.14&&!n.hurt&&!n.heal);
      if(grouped){grouped.amount+=e.amount;grouped.critical=grouped.critical||e.critical;}
      else this.numbers.push({...e,age:0,life:e.critical?.8:.55,jitter:(Math.random()-.5)*12});
    }
    if(e.type==='hurt'){this.shake=.7;this.hurtFlash=.5;this.numbers.push({...e,age:0,life:1.1,hurt:true,jitter:0});}
    if(e.type==='heal'){
      this.numbers.push({...e,age:0,life:1.35,heal:true,jitter:0});
      this.burst(e.x,e.z,'#4ac784',22,1.1);this.traces.push({type:'recovery',...e,age:0,life:.85});
    }
    if(e.type==='eat'){this.effects.push({row:3,x:e.x,z:e.z,size:Math.max(.6,e.radius*1.8),age:0,life:.3});this.burst(e.x,e.z,'#c8a3ee',4,.5);}
    if(e.type==='grow'||e.type==='upgrade'||e.type==='evolution'||e.type==='ward-break'||e.type==='victory'){
      this.effects.push({row:2,x:e.x||0,z:e.z||0,size:e.type==='evolution'?9:e.type==='victory'?13:4.5,age:0,life:1});
      this.burst(e.x||0,e.z||0,e.type==='ward-break'?'#c5a4ef':'#ffdb92',36,2);this.shake=Math.max(this.shake,.3);
    }
    if(e.type==='aim-warning'||e.type==='charge-warning')this.traces.push({...e,age:0});
    if(e.type==='beam'){this.traces.push({...e,age:0,life:.32});this.shake=.5;}
    if(e.type==='bullet-time-start')this.burst(e.x,e.z,'#c2ebe1',10,.65);
    if(e.type==='shield')this.effects.push({row:2,x:e.x,z:e.z,size:e.radius*2,age:0,life:.38});
    if(e.type==='spawn')this.traces.push({...e,age:0,life:.7});
    if(this.effects.length>65)this.effects.splice(0,this.effects.length-65);
    if(this.traces.length>90)this.traces.splice(0,this.traces.length-90);
  }

  burst(x,z,color,count,power){
    for(let i=0;i<count&&this.particles.length<400;i++){
      const a=Math.random()*TAU,speed=(.4+Math.random()*2.1)*power;
      this.particles.push({x,z,h:.25,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,vh:(.9+Math.random()*2)*power,life:.3+Math.random()*.5,color,size:1+Math.random()*2});
    }
  }

  terrain(){
    const w=this.width,h=this.height,view=this.terrainView;
    if(view){
      const ratio=this.scale/view.scale;
      const x=w*.5-(w*.5+128)*ratio+(view.x-this.camera.x)*this.scale;
      const y=h*.57-(h*.57+128)*ratio+(view.z-this.camera.z)*this.sy;
      if(ratio>.94&&ratio<1.06&&x<=0&&y<=0&&x+(w+256)*ratio>=w&&y+(h+256)*ratio>=h){
        this.ctx.drawImage(this.terrainLayer,x,y,(w+256)*ratio,(h+256)*ratio);return;
      }
    }
    const c=this.terrainCtx;
    c.save();c.translate(128,128);
    c.fillStyle='#acbe7d';c.fillRect(-128,-128,w+256,h+256);
    const tile=17*this.scale;
    this.ground.setTransform(new DOMMatrix([tile/this.images.terrain.width,0,0,tile*.62/this.images.terrain.height,w*.5-this.camera.x*this.scale,h*.57-this.camera.z*this.sy]));
    c.fillStyle=this.ground;c.fillRect(-128,-128,w+256,h+256);
    for(const district of [{x:-15,z:-14,color:'#c4ba7426'},{x:16,z:-10,color:'#d9986820'},{x:-14,z:16,color:'#75b8b523'}]){
      const p=this.project(district.x,district.z);c.fillStyle=district.color;c.beginPath();c.ellipse(p.x,p.y,this.scale*8.5,this.sy*7.5,.1,0,TAU);c.fill();
    }
    const paths=[[[0,-29],[1,-12],[-2,0],[1,14],[0,29]],[[-29,-10],[-12,-8],[0,-7],[15,-3],[29,0]],[[-29,18],[-12,13],[5,11],[29,17]]];
    c.lineJoin='round';c.lineCap='round';
    for(const path of paths){
      c.beginPath();path.forEach(([x,z],i)=>{const p=this.project(x,z);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
      c.strokeStyle='#ddc49990';c.lineWidth=this.scale*1.3;c.stroke();c.strokeStyle='#e8d6ae60';c.lineWidth=this.scale*.95;c.stroke();
    }
    // A visible stone boundary makes the arena limits part of the world.
    const corners=[[-28,-28],[28,-28],[28,28],[-28,28],[-28,-28]];
    c.beginPath();corners.forEach(([x,z],i)=>{const p=this.project(x,z);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
    c.strokeStyle='#748f5e';c.lineWidth=this.scale*.24;c.stroke();c.strokeStyle='#f2e8b766';c.lineWidth=2;c.stroke();
    c.restore();this.terrainView={x:this.camera.x,z:this.camera.z,scale:this.scale};
    this.ctx.drawImage(this.terrainLayer,-128,-128,w+256,h+256);
  }

  render(game,dt){
    const title=game.mode==='title';
    if(!title&&!['playing','feast'].includes(game.mode))dt=0;
    const worldDt=dt*game.worldTimeScale;
    this.time+=dt;const c=this.ctx,p=game.player;
    if(this.cityGrowth){this.cityGrowth.age+=dt;if(this.cityGrowth.age>=this.cityGrowth.life)this.cityGrowth=null;}
    this.timeTint+=((p.bulletTimeRemaining>0?1:0)-this.timeTint)*Math.min(1,dt*9);
    this.art.reducedMotion=this.settings.reducedMotion;
    const targetScale=this.baseScale*(title?1:this.width<650?1-Math.max(0,p.level-2)*.07:1-Math.max(0,p.level-3)*.045);
    this.scale+=(targetScale-this.scale)*Math.min(1,dt*2);this.sy=this.scale*.62;
    const target={x:title?0:p.x,z:title?0:p.z};
    const smooth=1-Math.exp(-dt*7);
    this.camera.x+=(target.x-this.camera.x)*smooth;this.camera.z+=(target.z-this.camera.z)*smooth;
    game.view.halfWidth=this.width/2/this.scale;
    game.view.halfHeight=this.height*.32/this.sy;
    this.shake=Math.max(0,this.shake-dt*3);this.hurtFlash=Math.max(0,this.hurtFlash-dt*1.6);
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(!this.settings.reducedMotion&&this.shake)c.translate(Math.sin(this.time*71)*this.shake*4,Math.cos(this.time*59)*this.shake*3);
    this.terrain();
    if(this.timeTint>.01){c.save();c.globalAlpha=this.timeTint*.12;c.fillStyle='#537d9c';c.fillRect(0,0,this.width,this.height);c.restore();}
    this.arsenalVisuals.ground(game);
    this.routeVisuals.ground(game);
    this.formationVisuals.ground(game);
    const pos=this.project(p.x,p.z);
    if(!title)this.art.drawPortal(c,pos.x,pos.y,p.visualRadius*this.scale,this.time,{evolution:p.evolution,pulse:p.recoil*.3});
    this.combatVFX.warnings(game,false);
    this.drawTraces('ground',dt,worldDt);
    const actors=game.entities.filter(e=>e.state!=='gone'&&this.visible(this.project(e.x,e.z))).map(e=>({z:e.z,entity:e}));
    for(const ally of game.arsenal.formation.guardians)if(ally.hp>0)actors.push({z:ally.z,ally});
    if(!title)actors.push({z:p.z,hero:true});actors.sort((a,b)=>a.z-b.z);
    for(const actor of actors){
      if(actor.ally){this.formationVisuals.guardian(actor.ally,game);continue;}
      if(actor.hero){
        const hero=this.project(p.x,p.z);
        this.combatVFX.core(game);
        const routePose={route:p.route,path:p.path,charge:Math.max(p.routeFlash,p.routeCharge/routeCapacity(p))};
        const rebuild=this.cityGrowth&&!this.settings.reducedMotion?this.cityGrowth:null;
        const bodyOptions={...routePose,modules:p.modules,evolution:p.evolution,level:p.level,evolutionRank:p.evolutionRank,core:p.core,recoil:p.recoil,moving:p.moving,portal:false,flash:p.invuln>.35?.1:0};
        if(rebuild)this.art.drawHero(c,hero.x,hero.y,p.visualRadius*this.scale,this.time,{...bodyOptions,level:rebuild.previousLevel,alpha:1-rebuild.age/rebuild.life});
        this.heroPose=this.art.drawHero(c,hero.x,hero.y,p.visualRadius*this.scale,this.time,{...bodyOptions,alpha:rebuild?rebuild.age/rebuild.life:1});
        this.combatVFX.rig(game);
        continue;
      }
      this.drawEntity(actor.entity,game);
    }
    if(title){
      const mx=this.width<650?this.width*.62:this.width*.74,my=this.height*(this.width<650?.73:.61),radius=this.width<650?this.width*.145:Math.min(this.width*.086,128);
      this.art.drawCityPreview(c,p.route,1,{[ROUTES[p.route].primary]:1},mx,my,radius,this.time);
      this.heroPose=null;
    }
    this.drawBullets(game,'player');
    this.drawTraces('top',0);
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.age+=dt;if(e.age>e.life){this.effects.splice(i,1);continue;}
      const v=this.project(e.x,e.z);
      c.save();c.globalAlpha=e.row===2?.55:e.small?.72:.88;this.art.drawEffect(c,e.row,e.age/e.life,v.x,v.y,e.size*this.scale,0,e.atlas||'effects');c.restore();
    }
    this.drawParticles(dt);
    this.arsenalVisuals.air(game,dt);
    this.routeVisuals.air(game,dt);
    this.formationVisuals.air(game,dt);
    this.combatVFX.air(game,dt,worldDt);
    this.combatVFX.warnings(game,true);
    this.drawBullets(game,'enemy');
    this.drawNumbers(dt);
    this.swallowFeedback.draw(game,dt);
    if(!title){
      this.drawWindBlades(game);
    }
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.guidance.draw(game);
    if(this.timeTint>.01){
      c.save();c.globalAlpha=this.timeTint;c.fillStyle=this.timeVignette;c.fillRect(0,0,this.width,this.height);
      c.strokeStyle=p.bulletTimeRemaining>0&&p.bulletTimeRemaining<=1?'#ead19399':'#b1dfd6aa';c.lineWidth=3;c.strokeRect(3,3,this.width-6,this.height-6);
      c.lineWidth=2;c.beginPath();
      for(let i=1;i<12;i++){const x=this.width*i/12,length=i%3===0?11:5;c.moveTo(x,5);c.lineTo(x,5+length);c.moveTo(x,this.height-5);c.lineTo(x,this.height-5-length);}
      c.stroke();c.restore();
    }
    if(this.hurtFlash&&!this.settings.reducedMotion){c.strokeStyle=`rgba(236,84,76,${this.hurtFlash*.65})`;c.lineWidth=14*this.hurtFlash;c.strokeRect(0,0,this.width,this.height);}
  }

  drawEntity(e,game){
    const c=this.ctx,v=this.project(e.x,e.z);let alpha=1,width=e.radius*this.scale*2.35,foot=v.y,angle=0;
    if(e.category==='prop'&&e.state==='alive'&&!e.fragment&&e.radius>.6){
      const p=game.player,front=e.z-p.z;
      if(front>-.1&&front<e.radius*2.3&&Math.abs(e.x-p.x)<e.radius*.85+p.visualRadius*.6)alpha=.32;
    }
    if(e.state==='eating'){
      const progress=e.eatTime/.52;
      width*=Math.max(.06,1-progress*.85);foot+=progress*progress*this.scale*1.7;angle=progress*.28;alpha=Math.max(0,1-progress*.8);
      c.save();c.beginPath();c.rect(0,0,this.width,v.y-this.scale*.15);
      const hole=this.project(game.player.x,game.player.z);c.ellipse(hole.x,hole.y,game.player.visualRadius*this.scale,game.player.visualRadius*this.sy,0,0,TAU);c.clip();
    }
    if(e.eventType){
      const event=OPPORTUNITIES[e.eventType],size=Math.max(58,width*2.1),atlas=this.art.frames.routes?'routes':'props',index=this.art.frames.routes?e.eventSprite:15;
      c.save();c.strokeStyle=event.color;c.fillStyle=event.color+'25';c.lineWidth=2;c.beginPath();c.ellipse(v.x,v.y,28,17,0,0,TAU);c.fill();c.stroke();c.restore();
      this.art.draw(c,atlas,index,v.x,foot,size,{alpha,angle,shadow:e.state==='alive'});
      if(e.state==='alive'){
        c.save();c.font='bold 11px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#fff8e5';c.fillStyle='#4d6742';
        const label=e.anchored?t('Wardens {{current}}/{{max}}',{current:game.expedition.active?.remaining||0,max:3}):t(event.name);
        c.strokeText(label,v.x,foot-size*.9);c.fillText(label,v.x,foot-size*.9);c.restore();
      }
    }else if(e.category==='enemy'){
      if(e.spawning>0)alpha*=Math.min(1,(.85-e.spawning)/.85);
      const bounce=e.frozen>0?0:e.moving?Math.sin(e.age*11)*2:Math.sin(e.age*2+e.id)*1.3;
      const anticipation=e.intent==='windup'?Math.sin(e.stateTimer*25)*2:0;
      const options={moving:e.moving,flip:e.facing>0,alpha:Math.max(0,alpha),flash:e.flash/.085*.72,frozen:e.frozen>0,angle:anticipation*.01+angle};
      if(e.atlas==='duels')this.art.drawPose(c,'duels',e.sprite+(e.attackFlash>0||e.intent==='charge'?2:e.intent==='windup'?1:e.intent==='recover'?3:0),v.x,foot,width,options);
      else if(['beetle','ram','mortar','mage'].includes(e.kind))this.art.drawEnemy(c,e.kind,v.x,foot+bounce,width,e.age+e.id*.2,options);
      else this.art.draw(c,'characters',e.sprite,v.x,foot+bounce,width,options);
      this.combatVFX.enemy(e,v,width);
      if(e.ward>0&&e.state==='alive'){
        c.save();c.translate(v.x,v.y-e.radius*this.scale*.58);c.scale(1,.8);c.strokeStyle='#c999f699';c.lineWidth=2;c.setLineDash([7,9]);c.beginPath();c.arc(0,0,width*.49,0,TAU);c.stroke();c.restore();
      }
      if(e.state==='alive'&&(e.kind==='herald'||e.conductive>0)){
        c.save();c.font='800 16px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#fff7df';c.fillStyle=e.kind==='herald'?'#9564b1':'#a87c29';const mark=e.kind==='herald'?'✦':'ϟ';c.strokeText(mark,v.x,foot-width-9);c.fillText(mark,v.x,foot-width-9);c.restore();
      }
      if(e.state==='alive'&&(e.hp<e.maxHp||e.elite||e.boss||e.veteran)){
        const top=v.y-width*.93;
        c.fillStyle='#07110ee6';c.fillRect(v.x-width*.28,top,width*.56,4);
        c.fillStyle=e.frozen>0?'#9adef1':e.elite||e.boss?'#d9a0ed':e.veteran?'#dfb352':'#eaa08b';c.fillRect(v.x-width*.28,top,width*.56*Math.max(0,e.hp/e.maxHp),4);
        if(e.veteran){c.save();c.fillStyle='#c7933b';c.strokeStyle='#fff2c6';c.lineWidth=1;c.beginPath();c.moveTo(v.x-width*.28-8,top-3);c.lineTo(v.x-width*.28-4,top+2);c.lineTo(v.x-width*.28-8,top+7);c.lineTo(v.x-width*.28-12,top+2);c.closePath();c.fill();c.stroke();c.restore();}
        if(e.ward>0){c.fillStyle='#b599df';c.fillRect(v.x-width*.28,top-4,width*.56*e.ward/e.maxWard,2);}
      }
    }else if(e.category==='shrine'){
      const art={atlas:'arsenal',sprite:12};
      const color='#b48c32';
      c.save();c.strokeStyle=color;c.globalAlpha=.9;c.lineWidth=2.5;c.beginPath();c.ellipse(v.x,v.y,28,17,0,0,TAU);c.stroke();c.globalAlpha=.15;c.fillStyle=color;c.fill();
      const beam=c.createLinearGradient(v.x,v.y-100,v.x,v.y);beam.addColorStop(0,color+'00');beam.addColorStop(1,color+'55');c.fillStyle=beam;c.globalAlpha=1;c.fillRect(v.x-13,v.y-100,26,100);c.restore();
      this.art.draw(c,art.atlas,art.sprite,v.x,foot+Math.sin(e.age*2)*3,Math.max(width,56),{alpha,shadow:true});
    }else if(e.category==='core'){
      c.save();c.translate(v.x,foot-12+Math.sin(e.age*3)*4);c.rotate(e.age*.5);c.shadowBlur=18;c.shadowColor='#c49bea';c.fillStyle='#d3a9f4';c.beginPath();c.moveTo(0,-17);c.lineTo(11,0);c.lineTo(0,17);c.lineTo(-11,0);c.closePath();c.fill();c.restore();
    }else{
      if(e.kind==='medkit'&&e.state==='alive'&&e.expiresAfter&&e.age>e.expiresAfter-8)alpha*=Math.max(.15,(e.expiresAfter-e.age)/8);
      if(e.harvest){width=Math.max(19,width*1.5);foot-=(e.stackLevel||0)*this.scale*.29*(e.state==='eating'?Math.max(0,1-e.eatTime/.52):1);}
      if(e.treasure){c.save();c.fillStyle='#fff0b8';c.strokeStyle='#c3a15b';c.lineWidth=2;c.beginPath();c.ellipse(v.x,v.y,width,width*.62,0,0,TAU);c.stroke();c.restore();}
      if(e.fragment)width=Math.max(13,width*1.3);
      if(e.healing&&e.state==='alive'){
        width=Math.max(width,e.kind==='medkit'?28:54);
        c.save();c.fillStyle='#3fac7860';c.strokeStyle='#27834f';c.lineWidth=2;c.beginPath();c.ellipse(v.x,v.y,width*.6,width*.32,0,0,TAU);c.fill();c.stroke();c.restore();
        foot-=Math.sin(e.age*2.2+e.id)*2;
      }
      const remainsTint=e.burningRemains?{color:'#ffc273',amount:.52}:e.frostedRemains?{color:'#c6f0f8',amount:.3}:null;
      this.art.draw(c,'props',e.sprite,v.x,foot,width,{alpha,angle:angle+(e.yaw||0),shadow:e.state==='alive',tint:remainsTint});
      if(e.burningRemains&&e.state==='alive'){c.save();c.fillStyle='#e9a348';c.globalAlpha=.8;c.beginPath();c.ellipse(v.x,foot-width*.7+Math.sin(e.age*4+e.id)*2,2.3,4.5,0,0,TAU);c.fill();c.restore();}
      if(e.healing&&e.state==='alive'){
        c.save();c.font='bold 13px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#fffdf0';c.fillStyle='#187c45';const label=`+${Math.round(e.healing*game.player.healPower)}`;c.strokeText(label,v.x,foot-width*.95);c.fillText(label,v.x,foot-width*.95);c.restore();
      }
    }
    if(e.state==='eating')c.restore();
  }

  drawBullets(game,side){
    const c=this.ctx;
    for(const b of game.bullets){
      if(b.side!==side)continue;
      const p=this.project(b.x,b.z,b.side==='enemy'?0:Math.max(.08,(b.height||.12)*(1-Math.min(1,(b.age||0)/.28))));if(!this.visible(p,30))continue;
      const angle=Math.atan2(b.vz*.62,b.vx);
      const radius=Math.max(3.7,Math.round(b.radius*this.scale*2)/2);
      const key=b.side==='player'?`${b.weapon}:${b.rank>=5}:${Boolean(b.routeShot)}`:`${b.shape}:${b.color}:${radius}`;
      let sprite=this.projectileSprites.get(key);
      if(!sprite){
        sprite=document.createElement('canvas');sprite.width=128;sprite.height=96;
        const c=sprite.getContext('2d');c.scale(2,2);c.translate(32,24);
        if(b.side==='player'){
          const ice=b.weapon==='ice';const color=b.routeShot?'#83dcc3':ice?'#a8efff':'#ffd49c';
          if(b.routeShot){c.scale(1.5,1.45);c.strokeStyle='#4e9f8c';c.lineWidth=7;c.beginPath();c.moveTo(-18,0);c.lineTo(0,0);c.stroke();}
          c.globalAlpha=.5;c.strokeStyle=color;c.lineWidth=ice?3:4;c.beginPath();c.moveTo(-16,0);c.lineTo(0,0);c.stroke();
          c.globalAlpha=1;c.fillStyle=ice?'#e0faff':'#fff4d6';c.shadowColor=color;c.shadowBlur=ice?10:14;
          if(ice){c.beginPath();c.moveTo(9,0);c.lineTo(-5,-3);c.lineTo(-2,0);c.lineTo(-5,3);c.closePath();c.fill();}
          else{c.beginPath();c.ellipse(0,0,b.rank>=5?6:4.6,b.rank>=5?3.5:2.8,0,0,TAU);c.fill();}
        }else{
          const r=radius;
          c.shadowColor=b.color;c.shadowBlur=10;c.fillStyle=b.color;c.strokeStyle='#361728';c.lineWidth=1.7;
          c.beginPath();
          if(b.shape==='seed')c.ellipse(0,0,r+1,r*.85,0,0,TAU);
          else if(b.shape==='petal'){c.moveTo(r+4,0);c.quadraticCurveTo(-1,-r*1.6,-r-2,0);c.quadraticCurveTo(-1,r*1.6,r+4,0);}
          else{c.moveTo(r+5,0);c.lineTo(-r,-r);c.lineTo(-r*.4,0);c.lineTo(-r,r);c.closePath();}
          c.fill();c.stroke();
          c.shadowBlur=0;c.fillStyle='#fff0e5';c.beginPath();c.arc(0,0,1.6,0,TAU);c.fill();
        }
        this.projectileSprites.set(key,sprite);
      }
      c.save();c.translate(p.x,p.y);c.rotate(angle);c.drawImage(sprite,-32,-24,64,48);c.restore();
    }
  }

  drawWindBlades(game){
    const p=game.player;if(p.modules.wind<2)return;
    const count=(p.modules.wind>=5?4:2)+(p.perks.satellites||0),c=this.ctx;
    for(let i=0;i<count;i++){
      const a=game.playerTime*2.5+i/count*TAU,r=p.radius+1.2;
      const v=this.project(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,.2);
      c.save();c.translate(v.x,v.y);c.rotate(Math.atan2(Math.cos(a)*.62,-Math.sin(a)));c.fillStyle='#c9ffec';c.strokeStyle='#449e8b';c.lineWidth=1.4;
      c.beginPath();c.moveTo(-16,5);c.quadraticCurveTo(-2,-16,21,-2);c.quadraticCurveTo(2,-7,-16,5);c.fill();c.stroke();
      c.strokeStyle='#efffe1';c.lineWidth=2;c.beginPath();c.moveTo(-9,0);c.quadraticCurveTo(2,-9,15,-3);c.stroke();c.restore();
    }
  }

  drawTraces(layer,dt,worldDt=dt){
    const c=this.ctx;
    for(let i=this.traces.length-1;i>=0;i--){
      const e=this.traces[i];if(layer==='ground')e.age+=['spawn','aim-warning','charge-warning'].includes(e.type)?worldDt:dt;
      if(e.age>e.life){this.traces.splice(i,1);continue;}
      const p=this.project(e.x,e.z,e.height||0),progress=e.age/e.life;
      if(layer==='ground'&&(e.type==='charge-warning'||e.type==='aim-warning')){
        const length=e.length||8,end=this.project(e.x+Math.cos(e.angle)*length,e.z+Math.sin(e.angle)*length);
        c.save();c.globalAlpha=e.type==='charge-warning'?.55:.35;c.strokeStyle='#ffb191';c.lineWidth=e.type==='charge-warning'?this.scale*.48:1.3;c.setLineDash(e.type==='charge-warning'?[10,8]:[4,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(end.x,end.y);c.stroke();c.restore();
      }else if(layer==='ground'&&e.type==='spawn'){
        c.save();c.globalAlpha=(1-progress)*.4;c.strokeStyle='#cb9bed';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,e.radius*this.scale*(1.4-progress*.4),e.radius*this.sy*(1.4-progress*.4),0,0,TAU);c.stroke();c.restore();
      }else if(layer==='top'&&e.type==='recovery'){
        c.save();c.globalAlpha=1-progress;c.strokeStyle='#239969';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,(25+progress*55),(15+progress*32),0,0,TAU);c.stroke();c.restore();
      }else if(layer==='top'&&e.type==='muzzle'){
        const a=Math.atan2(Math.sin(e.angle)*.62,Math.cos(e.angle));
        c.save();c.translate(p.x,p.y);c.rotate(a);c.globalAlpha=1-progress;c.fillStyle=e.weapon==='ice'?'#daf6ff':'#fff0b5';c.shadowBlur=20;c.shadowColor=e.weapon==='ice'?'#8adaff':'#ffb35d';c.beginPath();c.moveTo(30*(1-progress*.4),0);c.lineTo(6,-9);c.lineTo(9,0);c.lineTo(6,9);c.closePath();c.fill();c.restore();
      }else if(layer==='top'&&e.type==='beam'){
        const end=this.project(e.tx,e.tz,.15);c.save();c.globalAlpha=1-progress;c.lineCap='round';c.shadowBlur=20;c.shadowColor=e.color;c.strokeStyle=e.color;c.lineWidth=10*(1-progress);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(end.x,end.y);c.stroke();c.strokeStyle='#fff9e9';c.lineWidth=3*(1-progress);c.stroke();c.restore();
      }
    }
  }

  drawParticles(dt){
    const c=this.ctx;
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.h+=p.vh*dt;p.vh-=6*dt;if(p.h<0){p.h=0;p.vh*=-.25;}
      const v=this.project(p.x,p.z,p.h);c.globalAlpha=Math.min(1,p.life*3);c.fillStyle=p.color;c.fillRect(v.x,v.y,p.size,p.size);
    }c.globalAlpha=1;
  }

  drawNumbers(dt){
    const c=this.ctx;
    for(let i=this.numbers.length-1;i>=0;i--){const n=this.numbers[i];n.age+=dt;if(n.age>n.life){this.numbers.splice(i,1);continue;}
      const p=this.project(n.x,n.z,.8+n.age*1.7);
      c.save();c.globalAlpha=Math.min(1,(n.life-n.age)*4);c.font=`${n.critical?800:700} ${n.hurt?21:n.critical?23:n.routeShot?18:15}px 'Segoe UI',sans-serif`;c.textAlign='center';
      c.lineWidth=3;c.strokeStyle=n.heal?'#fffce8':'#344438';c.fillStyle=n.heal?'#18854e':n.hurt?'#ff9685':n.routeShot?'#a1f0d6':n.critical?'#ffe59f':n.weapon==='ice'?'#bdefff':'#fff3d1';
      const text=(n.heal?'+':n.hurt?'−':'')+n.amount;c.strokeText(text,p.x+n.jitter,p.y);c.fillText(text,p.x+n.jitter,p.y);c.restore();
    }
  }
}
