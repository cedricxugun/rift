import { weaponMount } from './weapon-rig.js';
import { LIGHTNING_RANKS, EMBER_RANKS, activeCombos, withinCombatView } from './data.js';
import { FormationCombat } from './formations.js';
import {TacticalCombat} from './tactics.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const TAU=Math.PI*2;

export class Arsenal {
  constructor(game){
    this.game=game;this.fields=[];this.meteors=[];this.comboIds=[];this.volley=0;
    this.cooldowns={lightning:.4,ember:.6,orb:.3,thunder:4,firestorm:0,prism:0,core:1};
    this.formation=new FormationCombat(game);
    this.tactics=new TacticalCombat(game);
  }

  has(id){return this.comboIds.includes(id);}

  strike(enemy,amount,weapon,combo=null){
    const g=this.game,critical=g.random()<g.player.critChance;
    g.damage(enemy,amount*(critical?g.player.critMultiplier:1),{weapon,critical,combo});
  }

  refresh(){
    const next=activeCombos(this.game.player.modules);
    for(const id of next)if(!this.has(id))this.game.emit('combo',{id,x:this.game.player.x,z:this.game.player.z});
    this.comboIds=next;
  }

  cannonBurst(target){
    this.volley++;
    if(this.volley%3)return;
    if(this.has('salvageVortex')){this.field(target.x,target.z,3*this.game.player.area,1.6,18*this.game.player.power,'salvage',false,'salvageVortex');this.game.stats.comboTriggers++;}
    if(this.has('thunderBattery')){this.lightning(target,34*this.game.player.power,3,this.game.player,'thunderBattery');this.game.stats.comboTriggers++;}
    if(this.has('meteorForge')){this.meteor(target,110*this.game.player.power,2.6,false,0,'meteorForge');this.game.stats.comboTriggers++;}
  }

  windPulse(){
    const g=this.game,p=g.player;
    if(this.has('blizzardWard')){
      const radius=(p.radius+3.4)*p.area;
      for(const e of g.entities)if(e.category==='enemy'&&e.state==='alive'&&distance(e,p)<radius){g.applyFrost(e,3);g.damage(e,36*p.power,{weapon:'ice',combo:'blizzardWard'});}
      g.enemyBulletClear(p.x,p.z,p.radius+2.3,2);g.stats.comboTriggers++;g.emit('frost-nova',{x:p.x,z:p.z,size:radius*2});
    }
    if(this.has('stormConduit')){
      const target=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&distance(e,p)<8).sort((a,b)=>distance(a,p)-distance(b,p))[0];
      if(target){this.lightning(target,24*p.power,3,p,'stormConduit');g.stats.comboTriggers++;}
    }
    if(this.has('firestorm')&&this.cooldowns.firestorm<=0){
      this.field(p.x,p.z,(p.radius+2.1)*p.area,4.2,21*p.power,'firestorm',true,'firestorm');
      this.cooldowns.firestorm=p.evolution==='sunforge'?5.1:7;g.stats.comboTriggers++;
      g.emit('firestorm',{x:p.x,z:p.z});
    }
  }

  thermalShock(enemy){
    if(!this.has('thermalShock')||enemy.steamLock>0)return false;
    const g=this.game;enemy.steamLock=1.8;enemy.burn=0;enemy.frozen=0;
    for(const e of g.entities)if(e.category==='enemy'&&e.state==='alive'&&distance(e,enemy)<2.6){
      g.damage(e,(85+g.player.modules.ice*14+g.player.modules.ember*14)*g.player.power,{weapon:'steam',wardBonus:2.5,combo:'thermalShock'});
      if(!e.boss&&e.intent==='windup'&&!(e.controlLock>0)){e.intent='recover';e.stateTimer=.65;e.controlLock=2.5;}
    }
    g.emit('steam',{x:enemy.x,z:enemy.z,size:5.2});g.stats.comboTriggers++;return true;
  }

  onFrost(enemy){if(enemy.burn>0)this.thermalShock(enemy);}

  cannonImpact(enemy){
    const g=this.game,p=g.player;
    if(!this.has('shatterBattery')||!(enemy.slow>0||enemy.frozen>0)||g.playerTime<(enemy.nextIceBlast||0))return;
    enemy.nextIceBlast=g.playerTime+1;
    for(const e of g.entities)if(e.category==='enemy'&&e.state==='alive'&&distance(e,enemy)<3.1*p.area)g.damage(e,(45+p.modules.cannon*8+p.modules.ice*8)*p.power,{weapon:'ice',combo:'shatterBattery'});
    g.stats.comboTriggers++;g.emit('frost-nova',{x:enemy.x,z:enemy.z,size:6.2*p.area});
  }

  lightning(target,damage,count,origin=this.game.player,combo=null){
    const g=this.game,p=g.player,segments=[],visited=new Set();let from={x:origin.x,z:origin.z,height:.3};
    if(origin===p){const mount=weaponMount(p,'lightning');from={x:mount.x,z:mount.z,height:mount.height};g.emit('weapon-fire',{weapon:'lightning',angle:p.aim});}
    if(target?.category!=='enemy'||target.state!=='alive')target=g.entities.find(e=>e.category==='enemy'&&e.state==='alive'&&distance(e,origin)<9);
    const total=count+(p.evolution==='thunderheart'?2:0)+(p.perks.conductors||0);
    for(let i=0;i<total&&target&&g.mode==='playing';i++){
      visited.add(target.id);segments.push({x:from.x,z:from.z,height:from.height??.35,tx:target.x,tz:target.z});
      if(target.frozen>0&&this.has('shatterCircuit')&&this.cooldowns.prism<=0){
        for(let j=0;j<8;j++){const a=j/8*TAU;g.bullets.push({id:g.nextId++,side:'player',weapon:'ice',x:target.x,z:target.z,px:target.x,pz:target.z,vx:Math.cos(a)*18,vz:Math.sin(a)*18,radius:.17,life:.65,damage:30*p.power,pierce:1+(p.perks.piercing||0),ricochet:Boolean(p.perks.rebound),splash:0,hit:new Set([target.id]),rank:3,combo:'shatterCircuit'});}
        this.cooldowns.prism=1.3;g.emit('prism',{x:target.x,z:target.z,size:4});g.stats.comboTriggers++;
      }
      if(p.modules.lightning>=4)target.electrified=2;
      if(this.has('thunderBattery'))target.conductive=3;
      const plasma=this.has('plasmaArc')&&target.burn>0&&g.playerTime>=(target.nextPlasma||0);
      if(plasma)target.nextPlasma=g.playerTime+1.4;
      this.strike(target,damage*Math.max(.5,1-i*.055),'lightning',combo);g.stats.shots++;
      if(plasma){for(const e of g.entities)if(g.mode==='playing'&&e.category==='enemy'&&e.state==='alive'&&distance(e,target)<2.5*p.area)g.damage(e,(42+p.modules.lightning*12)*p.power,{weapon:'lightning',combo:'plasmaArc'});g.emit('plasma-burst',{x:target.x,z:target.z,size:5*p.area});}
      from={x:target.x,z:target.z};
      target=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0&&!visited.has(e.id)&&distance(e,from)<6.2*p.area).sort((a,b)=>distance(a,from)-distance(b,from))[0];
    }
    if(segments.length)g.emit('lightning',{segments,x:origin.x,z:origin.z});
  }

  meteor(target,damage,radius,pool,delay=0,combo=null){
    const g=this.game,p=g.player;
    const muzzle=this.meteors.length%2,mount=weaponMount(p,'ember',muzzle);g.emit('weapon-fire',{weapon:'ember',muzzle,angle:p.aim});
    this.meteors.push({x:mount.x,z:mount.z,height:mount.height,tx:target.x,tz:target.z,age:0,delay:.62+delay,damage,radius:radius*p.area,pool,rank:p.modules.ember,phoenix:p.modules.ember>=5,combo});
    g.stats.shots++;
  }

  field(x,z,radius,life,damage,type='fire',follow=false,combo=null){
    if(this.fields.length>=14)this.fields.shift();
    this.fields.push({x,z,radius:radius*(type!=='salvage'&&this.game.player.evolution==='sunforge'?1.22:1),life,maxLife:life,damage,tick:0,type,follow,combo});
  }

  update(dt,worldDt=dt){
    const g=this.game,p=g.player;
    if(g.mode!=='playing'){this.fields=[];this.meteors=[];return;}
    this.tactics.update(dt);
    this.formation.update(dt);
    if(g.mode!=='playing'){this.fields=[];this.meteors=[];return;}
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]-=dt;
    const enemies=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0);
    p.salvageTimer=Math.max(0,p.salvageTimer-dt);if(p.salvageTimer===0)p.salvageStacks=0;
    p.overdrive=Math.max(0,p.overdrive-dt);
    for(const e of enemies){e.burn=Math.max(0,(e.burn||0)-worldDt);e.electrified=Math.max(0,(e.electrified||0)-worldDt);e.conductive=Math.max(0,(e.conductive||0)-worldDt);e.steamLock=Math.max(0,(e.steamLock||0)-worldDt);e.judgmentLock=Math.max(0,(e.judgmentLock||0)-worldDt);}
    const targets=enemies.filter(e=>distance(e,p)<14&&withinCombatView(p,e,g.view)).sort((a,b)=>distance(a,p)-distance(b,p));
    const target=targets[0],lightning=p.modules.lightning,ember=p.modules.ember;
    if(target&&p.core&&this.cooldowns.core<=0){
      if(p.core==='overdrive'){p.overdrive=2;g.emit('core-pulse',{x:p.x,z:p.z});}
      if(p.core==='singularity'){
        for(const e of targets)if(e.state==='alive'&&distance(e,p)<8*p.area){if(!e.boss){e.x+=(p.x-e.x)*.5;e.z+=(p.z-e.z)*.5;}g.damage(e,145*p.power,{weapon:'gravity'});}
        g.enemyBulletClear(p.x,p.z,5,12);g.emit('effect',{row:2,x:p.x,z:p.z,size:12});
      }
      this.cooldowns.core=8;
    }
    const haste=p.haste*(p.overdrive>0?1.8:1)*(1+p.salvageStacks*.08);
    if(target&&lightning&&this.cooldowns.lightning<=0){const rank=LIGHTNING_RANKS[lightning];this.lightning(target,rank.damage*p.power,rank.chains);this.cooldowns.lightning=rank.interval/haste;}
    if(lightning>=3&&this.cooldowns.orb<=0){
      const count=2+(p.perks.satellites||0);
      for(let i=0;i<count;i++){const a=g.playerTime*1.7+i/count*TAU,origin={x:p.x+Math.cos(a)*(p.radius+1.8),z:p.z+Math.sin(a)*(p.radius+1.8)};const e=targets.find(e=>e.state==='alive'&&distance(e,origin)<3);if(e)this.lightning(e,18*p.power,1,origin);}
      this.cooldowns.orb=.8;
    }
    if(target&&lightning>=5&&this.cooldowns.thunder<=0){
      for(const e of targets)if(e.state==='alive'&&distance(e,target)<2.8*p.area)this.strike(e,170*p.power,'lightning');
      g.emit('thunderstrike',{x:target.x,z:target.z,size:5.6*p.area});this.cooldowns.thunder=6/haste;
    }
    if(target&&ember&&this.cooldowns.ember<=0){
      const rank=EMBER_RANKS[ember];
      for(let i=0;i<Math.max(1,rank.shots-(p.perks.cinderTrail?1:0));i++){const e=targets[i%targets.length];this.meteor({x:e.x+(i?Math.cos(i*2.4)*.5:0),z:e.z+(i?Math.sin(i*2.4)*.5:0)},rank.damage*p.power,rank.radius,ember>=3,i*.13);}
      this.cooldowns.ember=rank.interval/haste;
    }
    if(g.mode!=='playing'){this.fields=[];this.meteors=[];return;}
    for(let i=this.meteors.length-1;i>=0;i--){
      const m=this.meteors[i];m.age+=dt;if(m.age<m.delay)continue;
      this.meteors.splice(i,1);
      for(const e of enemies)if(e.state==='alive'&&distance(e,{x:m.tx,z:m.tz})<m.radius+e.radius*.4){if(e.frozen>0||e.slow>0)this.thermalShock(e);e.burn=1.5;this.strike(e,m.damage,'ember',m.combo);}
      g.emit('meteor-impact',{x:m.tx,z:m.tz,size:m.radius*2.5,phoenix:m.phoenix});
      this.formation.ignite(m.tx,m.tz,m.radius);
      if(m.pool)this.field(m.tx,m.tz,m.radius,3.1,14*p.power);
      if(m.rank>=4)for(let j=0;j<3;j++){const a=j/3*TAU;const x=m.tx+Math.cos(a)*m.radius,z=m.tz+Math.sin(a)*m.radius;for(const e of enemies)if(e.state==='alive'&&distance(e,{x,z})<1.1)g.damage(e,22*p.power,{weapon:'ember'});g.emit('effect',{row:0,x,z,size:1.8,small:true});}
    }
    for(let i=this.fields.length-1;i>=0;i--){
      const f=this.fields[i];f.life-=dt;if(f.life<=0){this.fields.splice(i,1);continue;}
      if(f.follow){f.x=p.x;f.z=p.z;}
      if(f.type==='salvage'){
        for(const e of g.entities)if(e.state==='alive'&&e.fragment&&distance(e,f)<f.radius+2){
          const gap=distance(e,p),pull=Math.min(gap,8*dt);if(gap>.01){e.x+=(p.x-e.x)/gap*pull;e.z+=(p.z-e.z)/gap*pull;}
        }
        for(const e of enemies)if(e.state==='alive'&&!e.boss&&distance(e,f)<f.radius){e.x+=(f.x-e.x)*dt*.85;e.z+=(f.z-e.z)*dt*.85;}
      }
      f.tick-=dt;if(f.tick>0)continue;f.tick=.48;
      for(const e of enemies)if(e.state==='alive'&&distance(e,f)<f.radius+e.radius*.35){
        if(f.type==='salvage'){g.damage(e,f.damage,{weapon:'wind',combo:f.combo});continue;}
        if(e.frozen>0||e.slow>0)this.thermalShock(e);e.burn=1.3;g.damage(e,f.damage,{weapon:'ember',combo:f.combo});
      }
    }
    if(g.mode!=='playing'){this.fields=[];this.meteors=[];}
  }
}
