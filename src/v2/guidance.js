import { canSwallow } from './data.js';
import { OPPORTUNITIES } from './expedition.js';
import { t } from '../i18n.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function navigationGoal(game){
  const p=game.player,alive=game.entities.filter(e=>e.state==='alive');
  const boss=alive.find(e=>e.boss);
  if(boss&&canSwallow(p,boss))return{entity:boss,label:'The king can be devoured',color:'#3b8d65',reward:true};
  if(p.hp<p.maxHp*.5){
    const healing=alive.filter(e=>e.healing).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    if(healing)return{entity:healing,label:`+${Math.round(healing.healing*p.healPower)}`,color:'#267b51',literal:true,reward:true};
  }
  const core=alive.find(e=>e.category==='core');
  if(core)return{entity:core,label:'Absorb the core',color:'#8561aa',reward:true};
  const ruin=alive.find(e=>e.category==='shrine');
  if(ruin)return{entity:ruin,label:'Skill ruin',color:'#a06b32',reward:true};
  const special=boss||alive.find(e=>e.elite);
  if(special)return{entity:special,label:special.name,color:'#a8544e'};
  const event=game.expedition.active;
  if(event){const entity=alive.find(e=>event.targets.includes(e.id));if(entity)return{entity,label:OPPORTUNITIES[event.type].name,color:'#597fa7'};}
  return null;
}

export class BattleGuidance{
  constructor(renderer){this.renderer=renderer;}
  draw(game){
    if(!['playing','choosing','evolving','paused'].includes(game.mode)||game.bossDefeated)return;
    const goal=navigationGoal(game);if(!goal)return;
    const r=this.renderer,c=r.ctx,point=r.project(goal.entity.x,goal.entity.z),origin=r.project(game.player.x,game.player.z);
    const left=28,right=r.width-28,top=Math.min(215,r.height*.27),bottom=r.height-(r.height<500?108:210);
    const offscreen=point.x<left||point.x>right||point.y<top||point.y>bottom;
    if(!offscreen&&!goal.reward)return;
    let x=point.x,y=point.y;
    const dx=point.x-origin.x,dy=point.y-origin.y;
    if(offscreen){
      const tx=dx>0?(right-origin.x)/dx:dx<0?(left-origin.x)/dx:Infinity;
      const ty=dy>0?(bottom-origin.y)/dy:dy<0?(top-origin.y)/dy:Infinity;
      const factor=Math.max(0,Math.min(1,tx,ty));
      x=clamp(origin.x+dx*factor,left,right);y=clamp(origin.y+dy*factor,top,bottom);
    }
    c.save();c.strokeStyle='#fff9e6';c.fillStyle=goal.color;c.lineWidth=2.5;
    if(offscreen){
      c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.beginPath();c.moveTo(13,0);c.lineTo(-8,-9);c.lineTo(-4,0);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();
    }else{
      c.strokeStyle=goal.color;c.lineWidth=2.5;c.beginPath();c.ellipse(x,y,26,15,0,0,Math.PI*2);c.stroke();
      c.fillStyle=goal.color;c.beginPath();c.moveTo(x,y-16);c.lineTo(x-5,y-25);c.lineTo(x+5,y-25);c.closePath();c.fill();
    }
    const label=goal.literal?goal.label:t(goal.label);
    const labelX=clamp(x,16,r.width-16),labelY=y-(offscreen?18:31);
    c.font='700 12px -apple-system, sans-serif';c.textAlign=offscreen?(x>r.width/2?'right':'left'):'center';
    if(!offscreen)c.textAlign=x<110?'left':x>r.width-110?'right':'center';
    c.lineWidth=4;c.strokeStyle='#fff9e6';c.fillStyle=goal.color;c.strokeText(label,labelX,labelY,190);c.fillText(label,labelX,labelY,190);c.restore();
  }
}
