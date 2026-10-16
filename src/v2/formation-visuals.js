const TAU=Math.PI*2;

export class FormationVisuals{
  constructor(renderer){this.r=renderer;this.effects=[];this.links=[];}
  clear(){this.effects=[];this.links=[];}
  event(e){
    if(e.type==='legion-link'){this.links.push({...e,age:0,life:.38});if(this.links.length>4)this.links.shift();return;}
    if(['guardian-arrive','guardian-fall','legion-rally','seed-plant'].includes(e.type)){
      this.effects.push({...e,age:0,life:e.type==='seed-plant'?.35:e.type==='legion-rally'?.9:.55});if(this.effects.length>24)this.effects.shift();
    }
  }
  ground(game){
    const r=this.r,c=r.ctx;
    for(const garden of game.arsenal.formation.gardens){
      const v=r.project(garden.x,garden.z);if(!r.visible(v,garden.radius*r.scale))continue;
      c.save();c.globalAlpha=Math.min(.42,garden.life*1.5);
      const tint=garden.burning?{color:'#dc954e',amount:.44}:game.arsenal.has('frostGarden')?{color:'#b5e9e0',amount:.35}:null;
      c.translate(v.x,v.y);c.scale(1,.56);r.art.draw(c,'allies',15,0,garden.radius*r.sy*.65,garden.radius*r.scale*2,{shadow:false,tint});c.restore();
      c.save();c.globalAlpha=Math.min(.65,garden.life*1.5);c.strokeStyle=garden.burning?'#b87839':'#46856a';c.lineWidth=3;c.beginPath();c.ellipse(v.x,v.y,garden.radius*r.scale,garden.radius*r.sy,0,0,TAU);c.stroke();c.strokeStyle=garden.burning?'#f6d692':'#d8edbd';c.lineWidth=1.2;c.stroke();c.restore();
      if(garden.bloom>0){
        const atlas=garden.burning?'skillEffects':game.arsenal.has('frostGarden')?'skillEffects':'duels';
        const row=garden.burning?0:game.arsenal.has('frostGarden')?1:3;
        c.save();c.globalAlpha=.8;r.art.drawEffect(c,row,1-garden.bloom/.65,v.x,v.y,garden.radius*r.scale*2.25,0,atlas);c.restore();
      }
    }
  }
  guardian(ally,game){
    const r=this.r,c=r.ctx,v=r.project(ally.x,ally.z,ally.spawnLift||0);
    if(!r.visible(v))return;
    const upgraded=game.player.modules.summon>=3||ally.captain;
    const frame=(upgraded?4:0)+(ally.strike>0?2:ally.flash>0?3:ally.moving?Math.floor(ally.age*7)%2:0);
    const width=ally.radius*r.scale*4;
    c.save();c.fillStyle=ally.captain?'#edc56c55':'#74cfb45a';c.strokeStyle=ally.captain?'#f6d87d':'#bef0cb';c.lineWidth=1.5;c.beginPath();c.ellipse(v.x,v.y,width*.3,width*.16,0,0,TAU);c.fill();c.stroke();c.restore();
    r.art.drawPose(c,'allies',frame,v.x,v.y,width,{shadow:false,flash:ally.flash*.8});
    c.fillStyle='#3a5247';c.fillRect(v.x-width*.27,v.y-width-4,width*.54,3);c.fillStyle='#a2e3b2';c.fillRect(v.x-width*.27,v.y-width-4,width*.54*ally.hp/ally.maxHp,3);
  }
  air(game,dt){
    const r=this.r,c=r.ctx;
    for(let i=this.links.length-1;i>=0;i--){
      const e=this.links[i];e.age+=dt;if(e.age>=e.life){this.links.splice(i,1);continue;}
      c.save();c.globalAlpha=(1-e.age/e.life)*.85;c.lineJoin='round';
      for(const segment of e.segments){
        const a=r.project(segment.x,segment.z,.45),b=r.project(segment.tx,segment.tz,.45),dx=b.x-a.x,dy=b.y-a.y;
        c.beginPath();c.moveTo(a.x,a.y);for(let j=1;j<=6;j++){const pulse=j===6?0:Math.sin(j*7+Math.floor(e.age*18))*5;c.lineTo(a.x+dx*j/6+dy/(Math.hypot(dx,dy)||1)*pulse,a.y+dy*j/6-dx/(Math.hypot(dx,dy)||1)*pulse);}
        c.strokeStyle='#85b98c';c.lineWidth=7;c.stroke();c.strokeStyle='#fff2b9';c.lineWidth=2.2;c.stroke();
      }c.restore();
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.age+=dt;if(e.age>=e.life){this.effects.splice(i,1);continue;}
      if(e.type==='seed-plant'){
        const u=e.age/e.life,v=r.project(e.x+(e.tx-e.x)*u,e.z+(e.tz-e.z)*u,(e.height||0)*(1-u)+Math.sin(u*Math.PI)*1.4);
        c.save();c.fillStyle='#a6d292';c.strokeStyle='#fff0bf';c.lineWidth=1.4;c.beginPath();c.ellipse(v.x,v.y,4,6,u*3,0,TAU);c.fill();c.stroke();c.restore();continue;
      }
      const v=r.project(e.x,e.z,e.height||0),u=e.age/e.life,size=(e.type==='legion-rally'?3:1.4)*r.scale*(.65+u*.6);
      c.save();c.globalAlpha=(1-u)*.75;r.art.draw(c,'allies',11,v.x,v.y+size*.25,size,{shadow:false,angle:e.type==='guardian-fall'?u*.3:0});c.restore();
    }
  }
}
