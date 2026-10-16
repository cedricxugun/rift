const TAU=Math.PI*2;
export class TacticalVisuals{
  constructor(renderer){this.r=renderer;this.effects=[];}
  clear(){this.effects=[];}
  event(e){if(['lance-cast','mine-burst','plasma-burst','guardian-flame','turret-deploy','mirror-rise','mirror-hit'].includes(e.type)){this.effects.push({...e,age:0,life:e.type==='guardian-flame'?.38:e.type==='lance-cast'?.42:.6});if(this.effects.length>32)this.effects.shift();}}
  ground(game){
    const r=this.r,c=r.ctx,t=game.arsenal.tactics;
    for(const trail of t.trails){
      const a=r.project(trail.ax,trail.az),b=r.project(trail.bx,trail.bz);
      c.save();c.globalAlpha=Math.min(.75,trail.life);c.lineCap='round';c.strokeStyle='#aa764e';c.lineWidth=trail.radius*r.scale*2;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
      c.strokeStyle='#ffcb68';c.lineWidth=trail.radius*r.scale*.8;c.stroke();
      for(let i=0;i<3;i++){const u=i/2;r.art.draw(c,'tactics',9,a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,trail.radius*r.scale*2,{shadow:false,alpha:.6});}c.restore();
    }
    for(const wall of t.mirrors){
      const a=r.project(wall.ax,wall.az),b=r.project(wall.bx,wall.bz),v=r.project(wall.x,wall.z),length=Math.hypot(b.x-a.x,b.y-a.y);
      c.save();c.globalAlpha=Math.min(1,wall.life*2);c.strokeStyle='#9dcdd7';c.lineWidth=5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#efffff';c.lineWidth=1.5;c.stroke();
      c.translate(v.x,v.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.scale(1,.58);r.art.draw(c,'tactics',8,0,0,length,{shadow:false,flash:wall.flash});c.restore();
    }
  }
  turret(t){
    const r=this.r,c=r.ctx,v=r.project(t.x,t.z),base=r.project(t.x,t.z,.35),tip=r.project(t.x+Math.cos(t.angle)*.8,t.z+Math.sin(t.angle)*.8,.9);
    c.save();c.fillStyle='#73af8460';c.strokeStyle='#d9efb7';c.lineWidth=1.5;c.beginPath();c.ellipse(v.x,v.y,1.2*r.scale,.7*r.scale,0,0,TAU);c.fill();c.stroke();c.restore();
    const frame=r.art.frames.tactics[5],bodyWidth=2.4*r.scale,bodyHeight=bodyWidth*frame.aspect*.48;
    c.drawImage(r.art.images.tactics,frame.sx,frame.sy+frame.sh*.52,frame.sw,frame.sh*.48,v.x-bodyWidth*.5,v.y-bodyHeight,bodyWidth,bodyHeight);
    const pivot=r.project(t.x,t.z,.9),angle=Math.atan2(tip.y-pivot.y,tip.x-pivot.x),width=Math.hypot(tip.x-pivot.x,tip.y-pivot.y)/.58;
    r.art.drawModule(c,1,pivot.x-Math.cos(angle)*t.recoil*3,pivot.y-Math.sin(angle)*t.recoil*3,width,angle,t.recoil);
    c.fillStyle='#43634d';c.fillRect(base.x-14,base.y-35,28,3);c.fillStyle='#a8e7b1';c.fillRect(base.x-14,base.y-35,28*Math.max(0,t.hp/t.maxHp),3);
  }
  air(game,dt){
    const r=this.r,c=r.ctx;
    for(const wheel of game.arsenal.tactics.wheels){const v=r.project(wheel.x,wheel.z,.7);c.save();c.strokeStyle='#bde6bc99';c.lineWidth=3;c.beginPath();c.ellipse(v.x,v.y,wheel.radius*r.scale,wheel.radius*r.sy,0,0,TAU);c.stroke();r.art.drawModule(c,6,v.x,v.y,wheel.radius*r.scale*2.3,game.playerTime*9,0,'tactics');c.restore();}
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];if(['playing','feast'].includes(game.mode))e.age+=dt;if(e.age>=e.life){this.effects.splice(i,1);continue;}const u=e.age/e.life,v=r.project(e.x,e.z,e.height||0);
      c.save();c.globalAlpha=(1-u)*.95;
      if(e.type==='lance-cast'){
        const end=r.project(e.tx,e.tz);c.lineCap='round';c.beginPath();c.moveTo(v.x,v.y);c.lineTo(end.x,end.y);c.strokeStyle='#68764c';c.lineWidth=11*(1-u)+2;c.stroke();c.strokeStyle='#e6be66';c.lineWidth=7*(1-u)+1;c.stroke();c.strokeStyle='#fffbe5';c.lineWidth=2;c.stroke();
        r.art.draw(c,'tactics',15,end.x,end.y+22,48*(1-u*.5),{shadow:false});
      }else if(e.type==='guardian-flame'){
        for(const side of [-.35,0,.35])for(let j=1;j<=3;j++){const a=e.angle+side,reach=e.size*j/3,vf=r.project(e.x+Math.cos(a)*reach,e.z+Math.sin(a)*reach);r.art.drawEffect(c,0,u,vf.x,vf.y,Math.max(16,r.scale*(1+j*.3)),0,'skillEffects');}
      }else if(e.type==='mine-burst'||e.type==='plasma-burst'){
        const size=(e.size||4)*r.scale*(.7+u*.4);r.art.draw(c,'tactics',15,v.x,v.y+size*.3,size,{shadow:false});
        if(e.frost)r.art.drawEffect(c,1,u,v.x,v.y,size,0,'skillEffects');
        if(e.type==='plasma-burst')r.art.drawEffect(c,3,u,v.x,v.y,size,0,'skillEffects');
        c.strokeStyle=e.frost?'#d7fbff':'#fff0ba';c.lineWidth=2;c.beginPath();c.ellipse(v.x,v.y,size*.48*u,size*.3*u,0,0,TAU);c.stroke();
      }else{r.art.draw(c,'allies',11,v.x,v.y+15,55*(.7+u*.5),{shadow:false});}
      c.restore();
    }
  }
}
