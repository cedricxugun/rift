import {ELITE_TIMES,BOSS_TIME} from './data.js';

const clamp=n=>Math.max(-24,Math.min(24,n));
export const OPPORTUNITIES={
  caravan:{name:'Supply caravan',description:'Catch the moving wagons before they leave.',sprite:12,color:'#7b9c68'},
  outpost:{name:'Guarded outpost',description:'Take an outpost for a free tactical blueprint.',sprite:13,color:'#b78a5c'},
  garden:{name:'Recovery garden',description:'Gather the garden cache to reveal recovery supplies.',sprite:14,color:'#72a698'},
};

export class Expedition{
  constructor(game){this.game=game;this.active=null;this.next=34;this.index=1;}

  update(dt){
    const g=this.game,p=g.player;
    if(g.bossSpawned){if(this.active)this.clear();return;}
    const active=this.active;
    if(active){
      active.life-=dt;
      if(active.type==='caravan'){
        for(const id of active.targets){const e=g.entities.find(e=>e.id===id);if(e?.state==='alive'){e.x=clamp(e.x+active.dx*dt*.65);e.z=clamp(e.z+active.dz*dt*.65);}}
        const leader=g.entities.find(e=>active.targets.includes(e.id)&&e.state==='alive');if(leader){active.x=leader.x;active.z=leader.z;}
      }
      if(active.type==='outpost'&&!active.unlocked){
        active.remaining=active.guards.filter(id=>g.entities.some(e=>e.id===id&&e.state==='alive')).length;
        if(active.remaining===0){
          active.unlocked=true;const cache=g.entities.find(e=>e.id===active.targets[0]);if(cache){cache.anchored=false;cache.ward=0;cache.kind='eventcache';cache.eventSprite=15;}
          g.emit('opportunity-open',{x:active.x,z:active.z});
        }
      }
      const targets=active.targets.map(id=>g.entities.find(e=>e.id===id)).filter(Boolean);
      if(targets.every(e=>e.state==='gone')){this.clear();return;}
      if(active.life<=0){this.clear(true);return;}
      return;
    }
    const nextDuel=ELITE_TIMES[g.eliteIndex]??BOSS_TIME;
    if(g.time<this.next||g.time>530||g.time<g.breatherUntil||nextDuel-g.time<=18||g.entities.some(e=>(e.elite||e.boss)&&e.state==='alive'))return;
    const type=['caravan','outpost','garden'][this.index%3];
    const direction=p.moveAim??p.aim;
    const choices=Array.from({length:8},(_,i)=>{const angle=direction+i*Math.PI/4;return{x:clamp(p.x+Math.cos(angle)*10),z:clamp(p.z+Math.sin(angle)*10)};});
    const point=choices.find(candidate=>Math.hypot(candidate.x-p.x,candidate.z-p.z)>7)||choices[0];this.index++;
    for(const fraction of [.33,.66])g.harvest.pile(p.x+(point.x-p.x)*fraction,p.z+(point.z-p.z)*fraction,3);
    const opportunity={type,x:point.x,z:point.z,targets:[],guards:[],remaining:0,unlocked:type!=='outpost',life:type==='caravan'?50:70,dx:point.x>0?-1:1,dz:point.z>0?-.25:.25,claimed:false};
    this.active=opportunity;
    const count=type==='caravan'?2:1;
    for(let i=0;i<count;i++){
      const cache=g.spawn({category:'prop',kind:type==='outpost'?'outpost':'eventcache',x:point.x+i*1.5,z:point.z,radius:.55,mass:type==='caravan'?22:32,eventType:type,eventSprite:OPPORTUNITIES[type].sprite,eventIndex:this.index,anchored:type==='outpost',ward:type==='outpost'?1:0});
      opportunity.targets.push(cache.id);
    }
    if(type==='outpost')for(let i=0;i<3;i++){
      const health=180+g.time*.6;
      const e=g.spawnEnemy(i===2?'mortar':'ram',{x:point.x+Math.cos(i/3*Math.PI*2)*2.5,z:point.z+Math.sin(i/3*Math.PI*2)*2.5,hp:health,maxHp:health,ward:health*.45,maxWard:health*.45,guard:true,guardHome:{...point},spawning:1.2});
      opportunity.guards.push(e.id);opportunity.remaining++;
    }
    g.emit('opportunity',{kind:type,x:point.x,z:point.z});
  }

  claim(entity){
    const g=this.game,active=this.active;
    if(!active||entity.eventIndex!==this.index||active.claimed)return;
    active.claimed=true;g.stats.eventsCompleted++;
    g.player.energy+=Math.min(70,g.player.energyCost*.35);g.checkSkillReward();
    if(active.type==='garden'||active.type==='outpost')g.prop('medkit',entity.x,entity.z+1,{healing:active.type==='garden'?28:18,recoverySource:'event'});
    if(active.type==='outpost'){g.spawn({category:'blueprint',kind:'blueprint',x:entity.x,z:entity.z-1,radius:.4,mass:0});g.emit('tactic',{label:'Blueprint recovered',x:entity.x,z:entity.z});}
    for(let i=0;i<4;i++)g.prop('crate',entity.x+Math.cos(i*Math.PI*.5)*1.8,entity.z+Math.sin(i*Math.PI*.5)*1.8,{mass:8});
    g.emit('opportunity-complete',{kind:active.type,x:entity.x,z:entity.z});
  }

  clear(expired=false){
    if(this.active){
      for(const id of this.active.targets){const e=this.game.entities.find(e=>e.id===id);if(e?.state==='alive')e.state='gone';}
      for(const id of this.active.guards){const e=this.game.entities.find(e=>e.id===id);if(e?.state==='alive'){e.guard=false;e.guardHome=null;}}
      if(expired&&this.active.type==='caravan'&&!this.active.claimed)this.game.emit('opportunity-expired');
    }
    this.active=null;this.next=this.game.time+42;
  }

  snapshot(){return this.active?{...this.active,targets:[...this.active.targets],guards:[...this.active.guards]}:null;}
}
