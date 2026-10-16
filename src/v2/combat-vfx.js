import { energyCoreRadius, weaponMount } from './weapon-rig.js';

const TAU = Math.PI * 2;

function star(c,x,y,size,angle=0){
  c.save();c.translate(x,y);c.rotate(angle);c.beginPath();
  c.moveTo(0,-size);c.quadraticCurveTo(size*.18,-size*.18,size,0);c.quadraticCurveTo(size*.18,size*.18,0,size);
  c.quadraticCurveTo(-size*.18,size*.18,-size,0);c.quadraticCurveTo(-size*.18,-size*.18,0,-size);c.fill();c.restore();
}

export class CombatVFX {
  constructor(renderer){this.r=renderer;this.items=[];this.firing={};this.harvestCount=0;this.harvestLife=0;}
  clear(){this.items=[];this.firing={};this.harvestCount=0;this.harvestLife=0;}
  event(e){
    if(e.type==='shot'||e.type==='weapon-fire')this.firing[e.weapon+':'+(e.muzzle||0)]={time:this.r.time,angle:e.angle};
    if(e.type==='wind-pulse')this.firing['wind:0']={time:this.r.time};
    if(e.type==='harvest-eat'){this.harvestCount=e.count;this.harvestLife=1.2;}
    if(!['wind-pulse','frost-nova','lightning','thunderstrike','steam','meteor-impact','enemy-impact','enemy-cast','ward-break','bullet-time-start','bullet-time-end','combo','core-pulse'].includes(e.type))return;
    this.items.push({...e,age:0,life:e.type==='lightning'?.28:e.type==='enemy-cast'?e.delay:e.type==='bullet-time-start'?.7:e.type==='thunderstrike'?.65:.62});
    if(this.items.length>56)this.items.splice(0,this.items.length-56);
  }

  rig(game){
    const r=this.r;
    r.art.drawWeaponRig(r.ctx,game.player,(x,z,h)=>r.project(x,z,h),r.scale,r.time,this.firing,r.settings.reducedMotion);
  }

  core(game){
    const r=this.r,c=r.ctx,p=game.player,v=r.project(p.x,p.z),radius=energyCoreRadius(p)*r.scale;
    const base=p.route==='furnace'?4:p.route==='frost'?8:0,tier=p.level===1?0:p.level<=3?1:p.level<=5?2:3;
    const index=base+tier,frame=r.art.frames.cores?.[index];
    if(!frame)return;
    const width=radius*2.25,height=width*frame.aspect;
    c.save();c.fillStyle='#102c35aa';c.beginPath();c.ellipse(v.x,v.y+radius*.45,radius*1.22,radius*.62,0,0,TAU);c.fill();
    r.art.draw(c,'cores',index,v.x,v.y+height*.5,width,{shadow:false,angle:0,flash:r.hurtFlash>.1?r.hurtFlash*.7:0});
    if(p.nexusShield>0){c.strokeStyle='#e3f7dd';c.lineWidth=2;c.globalAlpha=.7;c.beginPath();c.ellipse(v.x,v.y,radius*1.42,radius*1.1,0,0,TAU);c.stroke();}
    if(p.invuln>0){c.globalAlpha=Math.min(.7,p.invuln);c.fillStyle='#fff2ca';for(let j=0;j<3;j++){const a=game.playerTime*3+j*TAU/3;star(c,v.x+Math.cos(a)*radius*1.5,v.y+Math.sin(a)*radius*.8,3,a);}}
    c.restore();
  }

  warnings(game,top){
    const r=this.r,c=r.ctx;
    for(const w of game.warnings){
      const v=r.project(w.x,w.z),u=Math.min(1,w.age/w.delay);if(!r.visible(v,260))continue;
      c.save();c.lineJoin='round';c.lineCap='round';
      c.strokeStyle=top?'#7e304e':'#d06058';c.lineWidth=top?2.4:1.5;c.fillStyle=w.active?'#dc655540':'#d68a5322';
      if(w.kind==='line'){
        const a=w.angle,nx=-Math.sin(a)*w.radius,nz=Math.cos(a)*w.radius,end={x:w.x+Math.cos(a)*w.length,z:w.z+Math.sin(a)*w.length};
        const points=[[w.x+nx,w.z+nz],[end.x+nx,end.z+nz],[end.x-nx,end.z-nz],[w.x-nx,w.z-nz]];
        c.beginPath();points.forEach(([x,z],i)=>{const p=r.project(x,z);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.closePath();
        if(top){c.strokeStyle='#fff1d8';c.lineWidth=5;c.stroke();c.strokeStyle='#983c50';c.lineWidth=2;c.stroke();}
        else c.fill();
        if(w.active&&top){const e=r.project(end.x,end.z);c.strokeStyle='#ce5268';c.lineWidth=w.radius*r.scale*1.5;c.beginPath();c.moveTo(v.x,v.y);c.lineTo(e.x,e.y);c.stroke();c.strokeStyle='#fff0d0';c.lineWidth=3;c.stroke();}
      }else{
        const ring=w.kind==='ring',radius=ring&&w.active?Math.min(w.radius,(w.age-w.delay)/w.duration*w.radius):w.radius;
        c.beginPath();c.ellipse(v.x,v.y,Math.max(.1,radius*r.scale),Math.max(.1,radius*r.sy),0,0,TAU);
        if(!top&&!ring)c.fill();
        if(top){c.strokeStyle='#fff3dc';c.lineWidth=5;c.stroke();c.strokeStyle=w.active?'#c23d50':'#9d4b59';c.lineWidth=2.5;if(!w.active)c.setLineDash([8,5]);c.stroke();c.setLineDash([]);}
        if(!w.active&&!top){c.strokeStyle='#d97b57';c.lineWidth=4;c.beginPath();c.ellipse(v.x,v.y,w.radius*r.scale,w.radius*r.sy,0,-Math.PI/2,-Math.PI/2+u*TAU);c.stroke();}
        if(ring&&w.active&&top){c.globalAlpha=.28;c.strokeStyle='#d74b59';c.lineWidth=w.width*r.scale*2;c.stroke();}
        if(!ring&&top){c.strokeStyle='#8f3e4c';c.lineWidth=2;c.beginPath();c.moveTo(v.x-5,v.y);c.lineTo(v.x+5,v.y);c.moveTo(v.x,v.y-4);c.lineTo(v.x,v.y+4);c.stroke();}
      }
      c.restore();
    }
  }

  enemy(e,v,width){
    if(e.state!=='alive')return;
    const c=this.r.ctx,r=this.r;
    c.save();
    // All first-region guardians wear the same leaf/brass insignia.
    const x=v.x,y=v.y-width*.56,s=Math.max(4,width*.055);
    c.fillStyle=e.veteran?'#edc36d':'#a7c495';c.strokeStyle='#536c51';c.lineWidth=1.2;
    c.beginPath();c.ellipse(x,y,s,s*1.6,-.55,0,TAU);c.fill();c.stroke();
    if(e.intent==='windup'){
      c.strokeStyle='#fff3cd';c.lineWidth=4;c.beginPath();c.ellipse(v.x,v.y,width*.42,width*.2,0,0,TAU);c.stroke();c.strokeStyle='#bd6250';c.lineWidth=2;c.stroke();
      c.fillStyle='#ffe5aa';star(c,v.x,v.y-width*.9,6+Math.sin(e.stateTimer*20)*2);
    }
    if(e.intent==='recover'&&e.stateTimer<.75&&(e.elite||e.boss||e.kind==='ram')){
      c.strokeStyle='#4d9c94';c.lineWidth=2;for(let j=0;j<3;j++){const a=e.age*2+j*TAU/3;c.beginPath();c.ellipse(v.x+Math.cos(a)*width*.27,v.y-width*.7+Math.sin(a)*5,3,2,0,0,TAU);c.stroke();}
    }
    c.restore();
  }

  air(game,dt,worldDt=dt){
    const r=this.r,c=r.ctx;
    this.harvestLife=Math.max(0,this.harvestLife-dt);
    for(let i=this.items.length-1;i>=0;i--){
      const e=this.items[i];e.age+=e.type==='enemy-cast'||e.type==='enemy-impact'?worldDt:dt;if(e.age>=e.life){this.items.splice(i,1);continue;}
      const u=e.age/e.life,alpha=(1-u)**.7,v=r.project(e.x,e.z);
      if(!r.visible(v,220)&&e.type!=='lightning')continue;
      c.save();c.globalAlpha=alpha;c.lineCap='round';c.lineJoin='round';
      if(e.type==='lightning'){
        for(let k=0;k<e.segments.length;k++){
          const seg=e.segments[k],a=r.project(seg.x,seg.z,seg.height??.5),b=r.project(seg.tx,seg.tz,.35),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
          c.beginPath();c.moveTo(a.x,a.y);
          for(let j=1;j<=8;j++){const offset=j===8?0:Math.sin(j*13.7+k*6+Math.floor(e.age*24))*Math.min(14,length*.12);c.lineTo(a.x+dx*j/8-dy/length*offset,a.y+dy*j/8+dx/length*offset);}
          c.strokeStyle='#897dc166';c.lineWidth=10;c.stroke();c.strokeStyle='#edc96b';c.lineWidth=4.2;c.stroke();c.strokeStyle='#fffbe0';c.lineWidth=1.6;c.stroke();
          c.strokeStyle='#e8e7b9';c.lineWidth=1.2;c.beginPath();c.moveTo(a.x+dx*.55,a.y+dy*.55);c.lineTo(a.x+dx*.55+dy*.2,a.y+dy*.55-dx*.2);c.stroke();
          c.fillStyle='#fff9cf';star(c,b.x,b.y,8*alpha+3,u);
        }
      }else if(e.type==='thunderstrike'){
        c.beginPath();c.moveTo(v.x+28,v.y-240);c.lineTo(v.x-13,v.y-137);c.lineTo(v.x+17,v.y-148);c.lineTo(v.x-5,v.y-55);c.lineTo(v.x+12,v.y-70);c.lineTo(v.x,v.y);
        c.strokeStyle='#a793c444';c.lineWidth=28*alpha;c.stroke();c.strokeStyle='#ecc46b';c.lineWidth=11*alpha+2;c.stroke();c.strokeStyle='#fff9d7';c.lineWidth=4*alpha+1;c.stroke();
        c.strokeStyle='#e4bc60';c.lineWidth=3;c.beginPath();c.ellipse(v.x,v.y,15+u*90,8+u*50,0,0,TAU);c.stroke();c.fillStyle='#fff6c9';star(c,v.x,v.y,24*alpha,u);
      }else if(e.type==='wind-pulse'||e.type==='frost-nova'||e.type==='core-pulse'||e.type==='combo'){
        const ice=e.type==='frost-nova',radius=(e.size||8)*r.scale*.5*(.35+u*.65),color=ice?'#96dce9':'#72c9af';
        c.strokeStyle=color;c.lineWidth=8*alpha;c.beginPath();c.ellipse(v.x,v.y,radius,radius*.62,0,0,TAU);c.stroke();c.strokeStyle='#f0ffe4';c.lineWidth=2;c.stroke();
        for(let j=0;j<(ice?12:7);j++){const a=j/(ice?12:7)*TAU+u*(ice?.2:1.8),x=v.x+Math.cos(a)*radius,y=v.y+Math.sin(a)*radius*.62;c.save();c.translate(x,y);c.rotate(a);c.fillStyle=j%2?color:'#eaffdf';if(ice){c.beginPath();c.moveTo(14,0);c.lineTo(-5,-4);c.lineTo(-2,0);c.lineTo(-5,4);c.closePath();c.fill();}else{c.beginPath();c.moveTo(-18,4);c.quadraticCurveTo(0,-13,22,-2);c.quadraticCurveTo(5,-5,-18,4);c.fill();}c.restore();}
      }else if(e.type==='enemy-cast'){
        if(e.kind!=='bloom'){c.restore();continue;}
        const x=e.x+(e.tx-e.x)*u,z=e.z+(e.tz-e.z)*u,p=r.project(x,z,Math.sin(u*Math.PI)*5+.4);c.fillStyle='#ce6a57';c.beginPath();c.arc(p.x,p.y,6,0,TAU);c.fill();c.fillStyle='#ffeab4';star(c,p.x,p.y,4,u);
      }else if(e.type==='bullet-time-start'||e.type==='bullet-time-end'){
        const start=e.type==='bullet-time-start',radius=r.settings.reducedMotion?r.scale*2:r.scale*(start?1+u*8:1+(1-u)*2.5);
        c.strokeStyle=start?'#c6efdf':'#ebd1a2';c.lineWidth=2.5;c.beginPath();c.ellipse(v.x,v.y,radius,radius*.62,0,0,TAU);c.stroke();
        if(!r.settings.reducedMotion){c.strokeStyle='#fff2ca';c.lineWidth=2;for(let j=0;j<12;j++){const a=j/12*TAU;c.beginPath();c.moveTo(v.x+Math.cos(a)*radius,v.y+Math.sin(a)*radius*.62);c.lineTo(v.x+Math.cos(a)*(radius+7),v.y+Math.sin(a)*(radius+7)*.62);c.stroke();}}
      }else{
        const enemy=e.type==='enemy-impact',steam=e.type==='steam',radius=(e.size||3)*r.scale*.5;
        c.strokeStyle=enemy?'#d27470':steam?'#afdbd8':'#e8ba67';c.lineWidth=3*alpha;c.beginPath();c.ellipse(v.x,v.y,radius*(.2+u),radius*(.2+u)*.62,0,0,TAU);c.stroke();
        for(let j=0;j<6;j++){const a=j/6*TAU+e.x,reach=radius*(.25+u*.7);c.fillStyle=steam?(j%2?'#c8e8dd':'#ffedc8'):enemy?'#ffc795':j%2?'#ffeac0':'#f3b765';star(c,v.x+Math.cos(a)*reach,v.y+Math.sin(a)*reach*.62-u*10,(steam?14:9)*alpha,a+u);}
      }
      c.restore();
    }
    if(this.harvestLife>0&&game.time<24){const v=r.project(game.player.x,game.player.z);c.save();c.globalAlpha=Math.min(1,this.harvestLife*2);c.font='800 18px sans-serif';c.textAlign='center';c.strokeStyle='#fcf4d9';c.lineWidth=4;c.fillStyle='#447f67';c.strokeText('× '+this.harvestCount,v.x,v.y+43);c.fillText('× '+this.harvestCount,v.x,v.y+43);c.restore();}
  }
}
