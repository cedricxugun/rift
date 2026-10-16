import { routeCapacity, shardCapacity } from './skill-graph.js';
import { withinCombatView } from './data.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const TAU=Math.PI*2;

export class RouteMechanics{
  constructor(game){this.game=game;this.shelterCooldown=0;this.blockCooldown=0;this.salvageCue=0;}

  consume(entity){
    const g=this.game,p=g.player;
    if(g.mode!=='playing'||entity.healing||entity.category==='shrine'||entity.category==='core')return;
    if(g.arsenal.has('salvageVortex')&&(entity.combatDrop||entity.category==='enemy')){
      p.salvageStacks=Math.min(5,p.salvageStacks+1);p.salvageTimer=3;
      if(p.salvageStacks===1||p.salvageStacks===5&&this.salvageCue<=g.playerTime){g.emit('tactic',{label:'Salvage rush',x:p.x,z:p.z});this.salvageCue=g.playerTime+2;}
    }
    let gain=Math.min(18,entity.mass||0);
    if(p.route==='harbor'&&(entity.combatDrop||entity.category==='enemy'))gain*=1.25;
    if(p.route==='furnace')gain*=entity.burn>0||entity.burningRemains?1.8:entity.combatDrop?1:.7;
    if(p.route==='frost')gain*=entity.frozen>0||entity.slow>0||entity.frostedRemains?1.65:.8;
    p.routeCharge=Math.min(routeCapacity(p)*1.2,p.routeCharge+gain*p.routeGain);
    if(p.route==='frost')this.storeShards();
  }

  storeShards(){
    const g=this.game,p=g.player,capacity=routeCapacity(p);
    while(p.routeCharge>=capacity&&p.shards<shardCapacity(p)){
      p.routeCharge-=capacity;p.shards++;g.emit('route-charge',{route:p.route,x:p.x,z:p.z,shards:p.shards});
    }
  }

  update(dt){
    const g=this.game,p=g.player;
    p.routeCooldown=Math.max(0,p.routeCooldown-dt);p.routeFlash=Math.max(0,p.routeFlash-dt*1.8);
    this.shelterCooldown-=dt;this.blockCooldown-=dt;
    if(p.route==='frost'){
      this.storeShards();
      if(p.mastery==='frost_shelter'&&p.shards>0&&this.shelterCooldown<=0){g.enemyBulletClear(p.x,p.z,3.2,2);this.shelterCooldown=3;}
      return;
    }
    if(p.routeCharge<routeCapacity(p)||p.routeCooldown>0)return;
    const targets=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0&&distance(e,p)<13&&withinCombatView(p,e,g.view)).sort((a,b)=>distance(a,p)/(a.elite||a.boss?1.8:a.ward>0?1.4:1)-distance(b,p)/(b.elite||b.boss?1.8:b.ward>0?1.4:1));
    if(!targets.length)return;
    p.routeCharge-=routeCapacity(p);p.routeCooldown=p.route==='harbor'?3.5:5;p.routeFlash=1;g.stats.routeBursts++;
    let burstAngle=p.aim;
    if(p.route==='harbor'){
      const chargePower=p.power*(1+Math.max(0,p.modules.cannon-1)*.25);
      const piercing=p.path==='harbor_lance',count=p.path==='harbor_salvo'?8:5;
      const angle=Math.atan2(targets[0].z-p.z,targets[0].x-p.x);
      burstAngle=angle;
      for(let i=0;i<count;i++)g.shots.push({wait:i*.055,weapon:'cannon',angle:angle+(i-(count-1)/2)*(piercing?.045:.13),targetX:targets[0].x,targetZ:targets[0].z,spread:(i-(count-1)/2)*(piercing?.045:.13),damage:(piercing?48:28)*chargePower*(p.mastery==='harbor_breach'?1.35:1),rank:Math.max(1,p.modules.cannon),muzzle:i%2,pierce: piercing?(p.mastery==='harbor_breach'?5:3):0,splash:piercing?0:1.15,wardBonus:piercing?1.6:1,routeShot:true,crit:g.random()<p.critChance});
      if(p.mastery==='harbor_recycle')p.routeCharge+=routeCapacity(p)*.3;
    }else{
      const chargePower=p.power*(1+Math.max(0,p.modules.ember-1)*.18);
      const coals=p.path==='furnace_coals',eruption=p.path==='furnace_eruption';
      const radius=(eruption?6.2:4.5)*p.area;
      for(const e of targets)if(e.state==='alive'&&distance(e,p)<radius){e.burn=3;g.damage(e,(eruption?110:75)*chargePower,{weapon:'furnace',routeShot:true});}
      const count=eruption?(p.mastery==='furnace_echo'?9:6):3;
      for(let i=0;i<count;i++){
        const e=targets[i%targets.length];g.arsenal.meteor({x:e.x+Math.cos(i*2.4)*.6,z:e.z+Math.sin(i*2.4)*.6},(eruption?45:35)*chargePower,1.6,coals,i*.07);
      }
      if(coals)for(let i=0;i<3;i++){const a=i/3*TAU;g.arsenal.field(p.x+Math.cos(a)*2,p.z+Math.sin(a)*2,(p.mastery==='furnace_hearth'?2.5:2)*p.area,p.mastery==='furnace_hearth'?6.2:4.2,20*chargePower);}
    }
    g.emit('route-burst',{route:p.route,path:p.path,x:p.x,z:p.z,angle:burstAngle});
  }

  timeBurst(){
    const g=this.game,p=g.player;
    if(g.arsenal.has('stormConduit')){
      const target=g.entities.filter(e=>e.category==='enemy'&&e.state==='alive'&&e.spawning<=0&&distance(e,p)<7).sort((a,b)=>distance(a,p)-distance(b,p))[0];
      if(target){g.arsenal.lightning(target,58*p.power,4);g.enemyBulletClear(p.x,p.z,4,6);g.stats.comboTriggers++;g.emit('tactic',{label:'Temporal discharge',x:p.x,z:p.z});}
    }
    if(p.route!=='frost'||p.shards<=0)return;
    const stored=p.shards,piercing=p.path==='frost_lances',count=stored*(p.mastery==='frost_split'?2:1);
    p.shards=0;p.routeFlash=1;g.stats.routeBursts++;
    const chargePower=p.power*(1+Math.max(0,p.modules.ice-1)*.14);
    for(let i=0;i<count;i++)g.shots.push({wait:i*.025,weapon:'ice',angle:p.moveAim+(i-(count-1)/2)*.13,damage:(piercing?70:42)*chargePower,rank:3,pierce:piercing?4:2,splash:0,routeShot:true,crit:g.random()<p.critChance});
    g.emit('route-burst',{route:'frost',path:p.path,x:p.x,z:p.z,angle:p.moveAim,count});
  }

  absorbHit(amount){
    const g=this.game,p=g.player;
    if(p.route!=='frost'||p.path==='frost_lances'||p.shards<=0||this.blockCooldown>0)return amount;
    p.shards--;this.blockCooldown=1.2;g.stats.guardianBlocks++;
    g.emit('guardian-block',{x:p.x,z:p.z});
    return amount*(p.path==='frost_aegis'?.5:.75);
  }
}
