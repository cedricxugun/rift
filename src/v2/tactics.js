import {segmentHitsCircle,withinCombatView} from './data.js';
import {weaponMount} from './weapon-rig.js';
import {hazardHits} from './hazards.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=n=>Math.max(-25,Math.min(25,n));
const TAU=Math.PI*2;
export function segmentsNear(a,b,c,d,radius){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,den=rx*sz-rz*sx;
  if(Math.abs(den)>1e-8){const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
  return segmentHitsCircle(a.x,a.z,b.x,b.z,c.x,c.z,radius)||segmentHitsCircle(a.x,a.z,b.x,b.z,d.x,d.z,radius)||segmentHitsCircle(c.x,c.z,d.x,d.z,a.x,a.z,radius)||segmentHitsCircle(c.x,c.z,d.x,d.z,b.x,b.z,radius);
}

export class TacticalCombat{
  constructor(game){this.game=game;this.turrets=[];this.wheels=[];this.trails=[];this.mirrors=[];this.turretCooldown=0;this.mirrorCooldown=0;this.lanceCooldown=0;this.wheelFood=0;this.siegeFood=0;this.lanceCharge=0;this.travel=0;this.lastPosition=null;this.trailStart=null;}
  enemies(){const g=this.game;return g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0&&withinCombatView(g.player,e,g.view));}
  consume(entity){
    const g=this.game,p=g.player;if(entity.healing||entity.mass<=0||['shrine','core','blueprint'].includes(entity.category))return;
    if(p.perks.windWheel&&++this.wheelFood>=6){this.wheelFood=0;this.launchWheel();}
    if(g.arsenal.has('siegeLegion')&&(entity.combatDrop||entity.category==='enemy'))this.siegeFood=Math.min(5,this.siegeFood+1);
  }
  timeBurst(){
    const p=this.game.player;
    if(p.perks.stormLance){this.lanceCharge=Math.min(3,this.lanceCharge+2);this.fireLances();}
    if(p.perks.windWheel)this.launchWheel();
    if(p.perks.fieldTurrets)this.deployTurret();
    if(p.perks.mirrorWall)this.deployMirror();
  }
  deployTurret(combo=false){
    const g=this.game,p=g.player;if(this.turrets.filter(t=>t.life>0&&t.hp>0).length>=2)return false;
    const a=p.moveAim??p.aim,side=this.turrets.length%2?1:-1,r=p.radius+1.4;
    const turret={id:g.nextId++,x:clamp(p.x+Math.cos(a)*r-Math.sin(a)*side*.8),z:clamp(p.z+Math.sin(a)*r+Math.cos(a)*side*.8),hp:55+p.modules.cannon*8,maxHp:55+p.modules.cannon*8,life:10,age:0,cooldown:.25,invuln:0,angle:a,recoil:0,combo:combo?'siegeLegion':null};
    this.turrets.push(turret);this.turretCooldown=6;g.stats.turretsPlaced++;g.emit('turret-deploy',{x:turret.x,z:turret.z});g.emit('tactic',{label:'Artillery deployed',x:turret.x,z:turret.z});return true;
  }
  launchWheel(){
    const g=this.game,p=g.player;if(this.wheels.length>=2)return;
    const mount=weaponMount(p,'wind'),a=p.moveAim??p.aim;
    this.wheels.push({x:p.x,z:p.z,origin:{x:p.x,z:p.z},angle:a,age:0,returning:false,radius:1.25*p.area,hitOut:new Set(),hitBack:new Set(),travel:0});
    g.stats.wheelsThrown++;g.emit('weapon-fire',{weapon:'wind',angle:a});g.emit('tactic',{label:'Windwheel away',x:mount.x,z:mount.z});
  }
  fireLances(){
    const g=this.game,p=g.player,count=Math.floor(this.lanceCharge);if(!count)return;
    const mount=weaponMount(p,'lightning',0,p.moveAim??p.aim),origin={x:mount.tipX,z:mount.tipZ},aim=p.moveAim??p.aim;
    for(let i=0;i<count;i++){
      const a=aim+(i-(count-1)/2)*.12,end={x:origin.x+Math.cos(a)*15,z:origin.z+Math.sin(a)*15};
      for(const e of this.enemies())if(g.mode==='playing'&&segmentHitsCircle(origin.x,origin.z,end.x,end.z,e.x,e.z,e.radius*.6+.45*p.area))g.damage(e,(44+p.modules.lightning*16)*p.power,{weapon:'lightning',wardBonus:1.8,tactic:'stormLance'});
      g.emit('lance-cast',{x:origin.x,z:origin.z,height:mount.height,tx:end.x,tz:end.z});
    }
    this.lanceCharge=0;this.travel=0;this.lanceCooldown=.8;g.stats.lancesReleased+=count;g.emit('weapon-fire',{weapon:'lightning',angle:aim});g.emit('tactic',{label:'Thunderlance released',x:p.x,z:p.z});
  }
  deployMirror(){
    const g=this.game,p=g.player;if(this.mirrors.length>=2)return;
    const a=p.aim,centre={x:clamp(p.x+Math.cos(a)*(p.radius+2)),z:clamp(p.z+Math.sin(a)*(p.radius+2))},half=2.6*p.area;
    this.mirrors.push({x:centre.x,z:centre.z,ax:centre.x-Math.sin(a)*half,az:centre.z+Math.cos(a)*half,bx:centre.x+Math.sin(a)*half,bz:centre.z-Math.cos(a)*half,angle:a,half,life:5,charge:4,flash:0});
    this.mirrorCooldown=5.5;g.emit('mirror-rise',centre);
  }
  intercept(bullet){
    const g=this.game,p=g.player;
    for(const wall of this.mirrors){
      if(wall.charge<=0||!segmentsNear({x:bullet.px,z:bullet.pz},bullet,{x:wall.ax,z:wall.az},{x:wall.bx,z:wall.bz},.24+bullet.radius))continue;
      wall.charge--;wall.flash=.22;if(!wall.charge)wall.life=Math.min(wall.life,.2);
      g.bullets.push({id:g.nextId++,side:'player',weapon:'ice',tactic:'mirrorWall',x:bullet.x,z:bullet.z,px:bullet.x,pz:bullet.z,vx:-bullet.vx*1.5,vz:-bullet.vz*1.5,radius:.18,life:1.6,damage:(28+p.modules.ice*12)*p.power,pierce:1,hit:new Set(),rank:p.modules.ice,height:.25,age:0});
      g.stats.reflectedShots++;g.emit('mirror-hit',{x:bullet.x,z:bullet.z});return true;
    }
    for(const turret of this.turrets)if(turret.hp>0&&turret.invuln<=0&&segmentHitsCircle(bullet.px,bullet.pz,bullet.x,bullet.z,turret.x,turret.z,.6+bullet.radius)){turret.hp-=bullet.damage;turret.invuln=.35;return true;}
    return false;
  }
  hazard(w){for(const turret of this.turrets)if(turret.hp>0&&turret.invuln<=0&&hazardHits(w,turret,.55)){turret.hp-=w.damage;turret.invuln=.5;}}
  update(dt){
    const g=this.game,p=g.player,enemies=this.enemies(),haste=p.haste*(p.overdrive>0?1.8:1)*(1+p.salvageStacks*.08);
    this.turretCooldown-=dt;this.mirrorCooldown-=dt;this.lanceCooldown-=dt;
    if(g.arsenal.has('siegeLegion')&&this.siegeFood>=5&&enemies.some(e=>distance(e,p)<10)&&this.deployTurret(true))this.siegeFood=0;
    const moved=this.lastPosition?Math.min(1,distance(p,this.lastPosition)):0;this.lastPosition={x:p.x,z:p.z};
    if(p.perks.stormLance){this.travel+=moved;while(this.travel>=6){this.travel-=6;this.lanceCharge=Math.min(3,this.lanceCharge+1);}if(p.moving<.05&&g.standingTime>=.35&&this.lanceCooldown<=0&&enemies.length)this.fireLances();}
    if(p.perks.fieldTurrets&&g.standingTime>=.6&&enemies.length&&this.turretCooldown<=0)this.deployTurret();
    if(p.perks.mirrorWall&&g.standingTime>=.5&&enemies.length&&this.mirrorCooldown<=0)this.deployMirror();
    for(let i=this.turrets.length-1;i>=0;i--){
      const t=this.turrets[i];t.life-=dt;t.age+=dt;t.cooldown-=dt;t.invuln=Math.max(0,t.invuln-dt);t.recoil=Math.max(0,t.recoil-dt*5);
      if(t.life<=0||t.hp<=0){this.turrets.splice(i,1);continue;}
      const target=enemies.filter(e=>e.state==='alive'&&distance(e,t)<11).sort((a,b)=>distance(a,t)-distance(b,t))[0];if(!target)continue;
      t.angle=Math.atan2(target.z-t.z,target.x-t.x);if(t.cooldown>0)continue;t.cooldown=.9/haste;t.recoil=1;
      const x=t.x+Math.cos(t.angle)*.8,z=t.z+Math.sin(t.angle)*.8;
      g.bullets.push({id:g.nextId++,side:'player',weapon:'cannon',tactic:'fieldTurrets',combo:t.combo,x,z,px:x,pz:z,vx:Math.cos(t.angle)*22,vz:Math.sin(t.angle)*22,radius:.2,life:.65,damage:(28+p.modules.cannon*7)*p.power,pierce:0,splash:.65,hit:new Set(),rank:1,height:.9,age:0});
      g.stats.turretShots++;g.emit('turret-shot',{x,z,angle:t.angle});
    }
    for(let i=this.wheels.length-1;i>=0;i--){
      const w=this.wheels[i];w.age+=dt;const before={x:w.x,z:w.z};
      if(!w.returning){w.x+=Math.cos(w.angle)*11*dt;w.z+=Math.sin(w.angle)*11*dt;w.travel+=11*dt;if(w.travel>=11||Math.abs(w.x)>=26||Math.abs(w.z)>=26)w.returning=true;}
      else{const d=distance(w,p),step=Math.min(d,17*dt);w.x+=(p.x-w.x)/(d||1)*step;w.z+=(p.z-w.z)/(d||1)*step;if(d<p.radius+.4||w.age>4){this.wheels.splice(i,1);continue;}}
      const hits=w.returning?w.hitBack:w.hitOut;
      for(const e of enemies)if(g.mode==='playing'&&e.state==='alive'&&!hits.has(e.id)&&segmentHitsCircle(before.x,before.z,w.x,w.z,e.x,e.z,w.radius+e.radius*.5)){hits.add(e.id);g.arsenal.strike(e,(38+p.modules.wind*15)*p.power,'wind');g.stats.wheelHits++;}
      if(w.returning)for(const item of g.entities)if(item.state==='alive'&&(item.combatDrop||item.fragment||item.harvest)&&distance(item,w)<w.radius+1.6){const d=distance(item,p),step=Math.min(d,18*dt);item.x+=(p.x-item.x)/(d||1)*step;item.z+=(p.z-item.z)/(d||1)*step;}
    }
    if(p.perks.cinderTrail){
      if(!this.trailStart)this.trailStart={x:p.x,z:p.z};
      if(distance(p,this.trailStart)>1.8){if(distance(p,this.trailStart)<5){this.trails.push({ax:this.trailStart.x,az:this.trailStart.z,bx:p.x,bz:p.z,life:3.4,age:0,radius:(.55+p.modules.ember*.07)*p.area});if(this.trails.length>12)this.trails.shift();}this.trailStart={x:p.x,z:p.z};}
    }
    for(let i=this.trails.length-1;i>=0;i--){const t=this.trails[i];t.life-=dt;t.age+=dt;if(t.life<=0){this.trails.splice(i,1);continue;}
      for(const e of enemies)if(e.state==='alive'&&g.mode==='playing'&&g.playerTime>=(e.nextTrailHit||0)&&segmentHitsCircle(t.ax,t.az,t.bx,t.bz,e.x,e.z,t.radius+e.radius*.4)){e.nextTrailHit=g.playerTime+.35;e.burn=2;g.damage(e,(13+p.modules.ember*6)*p.power,{weapon:'ember',tactic:'cinderTrail'});g.stats.trailHits++;}
      for(const garden of g.arsenal.formation.gardens)if(segmentHitsCircle(t.ax,t.az,t.bx,t.bz,garden.x,garden.z,t.radius+garden.radius))g.arsenal.formation.ignite(garden.x,garden.z,.1);
    }
    for(let i=this.mirrors.length-1;i>=0;i--){const w=this.mirrors[i];w.life-=dt;w.flash=Math.max(0,w.flash-dt);if(w.life<=0)this.mirrors.splice(i,1);}
  }
}
