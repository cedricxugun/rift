import { ROUTES, routeCapacity, shardCapacity } from './skill-graph.js';
import { t } from '../i18n.js';

const TAU=Math.PI*2;
export class RouteVisuals{
  constructor(renderer){this.renderer=renderer;this.effects=[];}
  clear(){this.effects=[];}
  event(e){
    if(!['route-burst','guardian-block','route-charge','branch','mastery','opportunity-open','opportunity-complete','tactic','ward-relay'].includes(e.type))return;
    this.effects.push({...e,age:0,life:e.type==='route-burst'?.65:e.type==='guardian-block'?.4:.8});
    if(this.effects.length>20)this.effects.shift();
  }

  ground(game){
    if(!['playing','paused','choosing','evolving'].includes(game.mode))return;
    const r=this.renderer,c=r.ctx,p=game.player,v=r.project(p.x,p.z),radius=(p.visualRadius+.3)*r.scale;
    const ratio=p.route==='frost'?p.shards/shardCapacity(p):Math.min(1,p.routeCharge/routeCapacity(p));
    c.save();c.strokeStyle=ROUTES[p.route].color;c.lineWidth=2.4;c.globalAlpha=.35;c.beginPath();c.ellipse(v.x,v.y,radius,radius*.62,0,0,TAU);c.stroke();
    c.globalAlpha=.9;c.lineWidth=3.2;c.beginPath();c.ellipse(v.x,v.y,radius,radius*.62,0,-Math.PI*.5,-Math.PI*.5+ratio*TAU);c.stroke();c.restore();
    for(const ally of game.entities){
      if(ally.state!=='alive'||!(ally.relayWard>0))continue;
      const keeper=game.entities.find(e=>e.id===ally.wardSource&&e.state==='alive');if(!keeper)continue;
      const a=r.project(keeper.x,keeper.z,.8),b=r.project(ally.x,ally.z,.4);
      c.save();c.strokeStyle='#926bb8';c.lineWidth=2;c.globalAlpha=.65;c.setLineDash([5,7]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();
    }
  }

  air(game,dt){
    const r=this.renderer,c=r.ctx,p=game.player;
    if(p.salvageStacks>0){
      const v=r.project(p.x,p.z),label=t('Salvage haste +{{percent}}%',{percent:p.salvageStacks*8});
      c.save();c.font='800 12px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#fff9dc';c.fillStyle='#347f73';c.strokeText(label,v.x,v.y+48);c.fillText(label,v.x,v.y+48);c.restore();
    }
    if(p.route==='frost'&&game.mode!=='title')for(let i=0;i<p.shards;i++){
      const a=game.playerTime*1.15+i/Math.max(1,p.shards)*TAU,v=r.project(p.x+Math.cos(a)*(p.radius+.85),p.z+Math.sin(a)*(p.radius+.85),.38);
      c.save();c.translate(v.x,v.y);c.rotate(a+.5);c.fillStyle='#c7eced';c.strokeStyle='#6496a8';c.lineWidth=1.4;c.beginPath();c.moveTo(0,-11);c.lineTo(5,1);c.lineTo(0,8);c.lineTo(-5,1);c.closePath();c.fill();c.stroke();c.strokeStyle='#f8ffff';c.beginPath();c.moveTo(0,-8);c.lineTo(0,5);c.stroke();c.restore();
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.age+=dt;if(e.age>=e.life){this.effects.splice(i,1);continue;}
      const v=r.project(e.x,e.z),u=e.age/e.life,color=ROUTES[e.route||p.route].color;
      c.save();c.globalAlpha=(1-u)*.85;c.lineWidth=3;c.strokeStyle=color;
      if(e.type==='route-burst'&&e.route==='furnace'){
        for(let j=0;j<10;j++){
          const a=j/10*TAU,reach=(.8+u*4)*r.scale,x=v.x+Math.cos(a)*reach,y=v.y+Math.sin(a)*reach*.62-u*14;
          c.fillStyle=j%2?'#f5bb64':'#de8350';c.beginPath();c.moveTo(x,y-17*(1-u));c.quadraticCurveTo(x+12,y+9,x,y+10);c.quadraticCurveTo(x-10,y+4,x,y-17*(1-u));c.fill();
        }
      }else if(e.type==='route-burst'){
        const angle=e.angle||0;
        for(let j=0;j<3;j++){
          const reach=(1+u*(3+j*.4))*r.scale,x=v.x+Math.cos(angle)*reach*.3,y=v.y+Math.sin(angle)*reach*.18;
          c.strokeStyle=e.route==='frost'?(j%2?'#edfdfb':'#86b6cc'):(j%2?'#fff2bc':'#80b7a2');c.lineWidth=4-j;
          c.beginPath();c.ellipse(x,y,reach,reach*.62,0,angle-.65,angle+.65);c.stroke();
        }
      }else{
        const radius=(p.radius+.25+u*1.8)*r.scale;
        c.strokeStyle=e.type==='guardian-block'?'#b5edf3':color;c.beginPath();c.ellipse(v.x,v.y,radius,radius*.62,0,0,TAU);c.stroke();
        if(e.type!=='route-charge')for(let j=0;j<7;j++){const a=j/7*TAU;c.fillStyle=j%2?'#fff1c4':color;c.save();c.translate(v.x+Math.cos(a)*radius,v.y+Math.sin(a)*radius*.62);c.rotate(a+u);c.fillRect(-2,-5,4,10);c.restore();}
      }
      c.restore();
      if(e.type==='route-burst'||e.type==='tactic'||e.type==='ward-relay'){
        const label=t(e.label||(e.type==='ward-relay'?'Ward relay':e.route==='harbor'?'Loaded volley':e.route==='furnace'?'Route bursts':'Guardian ice'));
        c.save();c.globalAlpha=Math.min(1,(1-u)*2);c.font='800 12px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#fff8df';c.fillStyle='#376c62';c.strokeText(label,v.x,v.y+32-u*13);c.fillText(label,v.x,v.y+32-u*13);c.restore();
      }
    }
  }
}
