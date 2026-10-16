import {SUMMON_RANKS,ROOT_RANKS,segmentHitsCircle,withinCombatView} from './data.js';
import {hazardHits} from './hazards.js';
import {weaponMount} from './weapon-rig.js';

const TAU=Math.PI*2;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=n=>Math.max(-26,Math.min(26,n));

export class FormationCombat{
  constructor(game){this.game=game;this.guardians=[];this.gardens=[];this.plantCooldown=0;this.linkCooldown=0;this.rally=0;this.charge=0;this.lastPlant=null;}

  consume(entity){
    const p=this.game.player;
    if(p.modules.roots&&p.perks.germination&&!entity.healing&&entity.mass>0){
      this.plantCooldown=Math.max(0,this.plantCooldown-.6);
      for(const garden of this.gardens)if(distance(garden,p)<5)garden.tick=Math.min(garden.tick,.12);
    }
    if(!p.modules.summon||entity.healing||['shrine','core'].includes(entity.category))return;
    this.charge+=Math.min(16,entity.mass||0)*(entity.combatDrop?1.4:1);
    if(this.charge>=36){this.charge-=36;this.rallyArmy();}
  }

  rallyArmy(){
    if(!this.game.player.modules.summon)return;
    this.rally=3.2;this.game.player.buildPulse=1;this.game.stats.rallies++;
    for(const ally of this.guardians)if(ally.hp>0)ally.cooldown=Math.min(ally.cooldown,.12);
    this.game.emit('legion-rally',{x:this.game.player.x,z:this.game.player.z});
    this.game.emit('weapon-fire',{weapon:'summon',angle:this.game.player.aim});
    this.game.emit('tactic',{label:this.game.player.core==='legionHeart'?'Captain deployed':'Legion rally',x:this.game.player.x,z:this.game.player.z});
  }

  timeBurst(){
    this.rallyArmy();
    if(this.game.player.modules.roots>=5&&this.gardens.length){
      for(const garden of this.gardens){garden.tick=0;garden.forced=true;}
      this.game.player.buildPulse=1;this.game.emit('tactic',{label:'Worldroot bloom',x:this.game.player.x,z:this.game.player.z});
      this.game.emit('weapon-fire',{weapon:'roots',angle:this.game.player.aim});
    }
  }

  hurtGuardian(ally,damage){
    if(ally.hp<=0||ally.invuln>0)return false;
    ally.hp=Math.max(0,ally.hp-damage);ally.invuln=.45;ally.flash=.18;
    if(!ally.hp){ally.respawn=6;this.game.stats.guardiansLost++;this.game.emit('guardian-fall',{x:ally.x,z:ally.z});}
    return true;
  }

  intercept(bullet){
    if(this.game.player.modules.summon<2)return false;
    for(const ally of this.guardians){
      if(ally.hp<=0||ally.invuln>0||ally.spawnLift>.3)continue;
      if(segmentHitsCircle(bullet.px,bullet.pz,bullet.x,bullet.z,ally.x,ally.z,ally.radius+bullet.radius)){
        this.hurtGuardian(ally,bullet.damage);this.game.stats.guardianIntercepts++;return true;
      }
    }
    return false;
  }

  hazard(w){for(const ally of this.guardians)if(ally.hp>0&&hazardHits(w,ally,ally.radius))this.hurtGuardian(ally,w.damage);}

  ignite(x,z,radius){
    if(!this.game.arsenal.has('wildfireGarden'))return;
    for(const garden of this.gardens)if(distance(garden,{x,z})<radius+garden.radius){garden.burning=true;garden.tick=Math.min(garden.tick,.12);}
  }

  update(dt){
    const g=this.game,p=g.player,summon=SUMMON_RANKS[p.modules.summon],roots=ROOT_RANKS[p.modules.roots];
    const haste=p.haste*(p.overdrive>0?1.8:1)*(1+p.salvageStacks*.08);
    this.rally=Math.max(0,this.rally-dt);this.linkCooldown-=dt;this.plantCooldown-=dt;
    const enemies=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0);
    const targets=enemies.filter(e=>withinCombatView(p,e,g.view));
    const count=summon?Math.min(6,summon.count+(p.perks.brood||0)):0;
    while(this.guardians.length<count){
      const gate=weaponMount(p,'summon');
      const hp=48+p.modules.summon*16;
      const ally={id:g.nextId++,x:gate.x,z:gate.z,spawnLift:gate.height,radius:.38,hp,maxHp:hp,respawn:0,cooldown:.2,age:0,strike:0,invuln:0,flash:0};
      this.guardians.push(ally);g.emit('guardian-arrive',{x:ally.x,z:ally.z,height:gate.height});g.emit('weapon-fire',{weapon:'summon',angle:p.aim});
    }
    if(this.guardians.length>count)this.guardians.length=count;
    for(let i=0;i<this.guardians.length;i++){
      const ally=this.guardians[i];ally.age+=dt;ally.cooldown-=dt;ally.strike=Math.max(0,ally.strike-dt);ally.invuln=Math.max(0,ally.invuln-dt);ally.flash=Math.max(0,ally.flash-dt);
      ally.spawnLift=Math.max(0,(ally.spawnLift||0)-dt*5);
      ally.radius=.35+p.level*.02+(p.modules.summon>=3?.1:0);
      ally.captain=p.core==='legionHeart'&&this.rally>0&&i===0;
      if(ally.captain)ally.radius*=1.6;
      const maxHp=48+p.modules.summon*16;
      if(maxHp>ally.maxHp){ally.hp+=maxHp-ally.maxHp;ally.maxHp=maxHp;}
      if(ally.hp<=0){ally.respawn-=dt;if(ally.respawn>0)continue;const gate=weaponMount(p,'summon');ally.hp=ally.maxHp;ally.x=gate.x;ally.z=gate.z;ally.spawnLift=gate.height;g.emit('guardian-arrive',{x:ally.x,z:ally.z,height:gate.height});g.emit('weapon-fire',{weapon:'summon',angle:p.aim});}
      const ordered=targets.filter(e=>e.state==='alive'&&distance(e,p)<13).sort((a,b)=>distance(a,ally)/(g.arsenal.has('livingGrove')&&a.rootSlow>0?3:1)-distance(b,ally)/(g.arsenal.has('livingGrove')&&b.rootSlow>0?3:1));
      const current=enemies.find(e=>e.id===ally.targetId&&e.state==='alive'&&distance(e,p)<18);
      const trappedFirst=g.arsenal.has('livingGrove')&&ordered[0]?.rootSlow>0;
      const target=current&&!trappedFirst?current:ordered[0],angle=i/Math.max(1,count)*TAU+g.playerTime*.2;
      ally.targetId=target?.id??null;
      const orbit=p.radius*1.8+1.25;
      const anchor=target?{x:target.x+Math.cos(angle)*(target.radius+.75),z:target.z+Math.sin(angle)*(target.radius+.75)}:{x:p.x+Math.cos(angle)*orbit,z:p.z+Math.sin(angle)*orbit};
      const gap=distance(anchor,ally),speed=(this.rally>0?13:8)*(1+(p.perks.packTactics||0)*.15),step=Math.min(gap,speed*dt);
      ally.moving=gap>.2;ally.facing=anchor.x<ally.x?-1:1;
      if(gap>.01){ally.x=clamp(ally.x+(anchor.x-ally.x)/gap*step);ally.z=clamp(ally.z+(anchor.z-ally.z)/gap*step);}
      if(distance(ally,p)>22){ally.x=p.x;ally.z=p.z;g.emit('guardian-arrive',{x:ally.x,z:ally.z});}
      if(!target||distance(ally,target)>target.radius+.95||ally.cooldown>0)continue;
      ally.cooldown=summon.interval/haste/(this.rally>0?(p.modules.summon>=5?2:1.65):1)/(1+(p.perks.packTactics||0)*.15);ally.strike=.28;
      const reach=(p.modules.summon>=3?2.1:1.5)*p.area*(ally.captain?1.55:1);
      for(const e of enemies){
        if(e.state!=='alive'||g.mode!=='playing'||distance(e,ally)>reach+e.radius*.9)continue;
        const ambush=g.arsenal.has('livingGrove')&&e.rootSlow>0;
        g.arsenal.strike(e,summon.damage*p.power*(this.rally>0?1.45:1)*(ambush?1.65:1)*(ally.captain?1.9:1),'summon',ambush?'livingGrove':null);
      }
      g.stats.guardianStrikes++;g.emit('guardian-strike',{x:ally.x,z:ally.z,angle:Math.atan2(target.z-ally.z,target.x-ally.x),size:reach*2});
    }
    if(roots&&this.plantCooldown<=0&&(!this.lastPlant||distance(p,this.lastPlant)>1.7||targets.length)){
      const angle=p.moveAim??p.aim;
      const aimed=g.standingTime>=.45?targets.filter(e=>distance(e,p)<12).sort((a,b)=>distance(a,p)-distance(b,p))[0]:null;
      const garden={id:g.nextId++,x:clamp(aimed?aimed.x:p.x-Math.cos(angle)*(p.radius+.5)),z:clamp(aimed?aimed.z:p.z-Math.sin(angle)*(p.radius+.5)),radius:roots.radius*p.area,life:roots.life+(p.perks.deepRoots||0)*2,maxLife:roots.life+(p.perks.deepRoots||0)*2,tick:.35,age:0,bloom:0,burning:false};
      const max=p.modules.roots>=4?6:4;
      if(this.gardens.length>=max)this.gardens.shift();
      this.gardens.push(garden);this.lastPlant={x:p.x,z:p.z};this.plantCooldown=roots.interval/haste;
      g.emit('weapon-fire',{weapon:'roots',angle:p.aim});
      const rack=weaponMount(p,'roots');g.emit('seed-plant',{x:rack.x,z:rack.z,height:rack.height,tx:garden.x,tz:garden.z});
    }
    for(let i=this.gardens.length-1;i>=0;i--){
      const garden=this.gardens[i];garden.life-=dt;garden.age+=dt;garden.bloom=Math.max(0,garden.bloom-dt);garden.tick-=dt;
      if(garden.life<=0){this.gardens.splice(i,1);continue;}
      if(!roots||garden.tick>0)continue;
      const caught=enemies.filter(e=>e.state==='alive'&&g.mode==='playing'&&distance(e,garden)<garden.radius+e.radius*.35);
      if(!caught.length&&!garden.forced){garden.tick=.15;continue;}
      garden.forced=false;garden.bloom=.65;garden.tick=(p.modules.roots>=3?1.1:1.7)/haste;
      for(const e of caught){
        if(p.modules.roots>=2)e.rootSlow=Math.max(e.rootSlow||0,1.6);
        if(p.modules.roots>=3&&!e.elite&&!e.boss)e.rooted=.5;
        let combo=null,amount=roots.damage*p.power;
        if(garden.burning){combo='wildfireGarden';amount*=1.8;e.burn=2;}
        else if(g.arsenal.has('frostGarden')){combo='frostGarden';g.applyFrost(e,2);amount*=1.35;}
        g.arsenal.strike(e,amount,'roots',combo);
      }
      if(g.arsenal.has('livingGrove')&&caught.length)for(const ally of this.guardians)if(ally.hp>0&&distance(ally,garden)<garden.radius+3){ally.cooldown=Math.min(ally.cooldown,.1);this.rally=Math.max(this.rally,1.2);}
      g.stats.rootBlooms++;g.emit('garden-bloom',{x:garden.x,z:garden.z,size:garden.radius*2,burning:garden.burning,frost:g.arsenal.has('frostGarden')&&!garden.burning});
    }
    if(this.rally>0&&g.arsenal.has('stormLegion')&&this.linkCooldown<=0){
      this.linkCooldown=.4/haste;const alive=this.guardians.filter(a=>a.hp>0);
      const segments=[],edges=new Set(),hit=new Set(),step=Math.max(1,Math.floor(alive.length/2));
      for(let i=0;i<alive.length;i++){
        const a=alive[i],b=alive[(i+step)%alive.length];if(a===b)continue;
        const edge=[a.id,b.id].sort((x,y)=>x-y).join(':');if(edges.has(edge))continue;edges.add(edge);
        segments.push({x:a.x,z:a.z,tx:b.x,tz:b.z});
        for(const e of enemies)if(e.state==='alive'&&!hit.has(e.id)&&segmentHitsCircle(a.x,a.z,b.x,b.z,e.x,e.z,e.radius*.8+.35)){
          hit.add(e.id);g.arsenal.strike(e,(28+p.modules.lightning*12)*p.power,'summon','stormLegion');
        }
      }
      if(segments.length)g.emit('legion-link',{segments,x:p.x,z:p.z});
    }
  }
}
