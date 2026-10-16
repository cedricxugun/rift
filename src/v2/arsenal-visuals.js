const TAU=Math.PI*2;

export class ArsenalVisuals {
  constructor(renderer){this.renderer=renderer;this.items=[];}
  clear(){this.items=[];}
  event(event){
    if(!['prism'].includes(event.type))return;
    this.items.push({...event,age:0,life:event.type==='lightning'?.3:event.type==='thunderstrike'?.6:.7});
    if(this.items.length>38)this.items.shift();
  }

  ground(game){
    const r=this.renderer,c=r.ctx;
    for(const f of game.arsenal.fields){
      const v=r.project(f.x,f.z),radius=f.radius*r.scale,fade=Math.min(1,f.life*.7);
      if(f.type==='salvage'){
        c.save();c.globalAlpha=fade*.7;c.strokeStyle='#579f94';c.lineWidth=3;
        for(let ring=0;ring<3;ring++){c.beginPath();c.ellipse(v.x,v.y, radius*(.3+ring*.25),radius*(.3+ring*.25)*.62,0,game.playerTime*3+ring*1.8,game.playerTime*3+ring*1.8+Math.PI*1.3);c.stroke();}
        c.restore();continue;
      }
      c.save();c.translate(v.x,v.y);c.scale(1,.62);c.globalAlpha=fade;
      const fill=c.createRadialGradient(0,0,radius*.28,0,0,radius);fill.addColorStop(0,'#ffaf2c05');fill.addColorStop(.7,'#ffd45b30');fill.addColorStop(1,'#ed932400');
      c.fillStyle=fill;c.beginPath();c.arc(0,0,radius,0,TAU);c.fill();
      c.strokeStyle='#ffc85e';c.lineWidth=2.5;c.setLineDash([8,11]);c.beginPath();c.arc(0,0,radius*.84,game.playerTime,game.playerTime+TAU);c.stroke();c.setLineDash([]);
      for(let i=0;i<(f.type==='firestorm'?9:6);i++){
        const angle=game.playerTime*(f.type==='firestorm'?3:1)+i/9*TAU,rr=radius*(.65+Math.sin(i+game.playerTime)*.12);
        const x=Math.cos(angle)*rr,y=Math.sin(angle)*rr;
        c.fillStyle=i%2?'#ffde80':'#f39a3c';c.beginPath();c.moveTo(x,y-10);c.quadraticCurveTo(x+9,y+5,x,y+9);c.quadraticCurveTo(x-7,y+3,x,y-10);c.fill();
      }
      c.restore();
      if(f.type==='firestorm'){
        c.save();c.lineWidth=4;
        for(let layer=0;layer<3;layer++){const phase=game.playerTime*4+layer*1.8;c.strokeStyle=layer===1?'#fff1b2':'#ffb84d';c.beginPath();c.ellipse(v.x,v.y-layer*13,radius*(.8-layer*.12),radius*.32,0,phase,phase+Math.PI*1.25);c.stroke();}
        c.restore();
      }
    }
  }

  air(game,dt){
    const r=this.renderer,c=r.ctx,p=game.player;
    for(const m of game.arsenal.meteors){
      const u=Math.min(1,m.age/m.delay),x=m.x+(m.tx-m.x)*u,z=m.z+(m.tz-m.z)*u,height=Math.sin(u*Math.PI)*4.5+(m.height||.4)*(1-u)+.2;
      const v=r.project(x,z,height),landing=r.project(m.tx,m.tz);
      c.save();c.strokeStyle='#eda84488';c.lineWidth=1.5;c.beginPath();c.ellipse(landing.x,landing.y,m.radius*r.scale*.5,m.radius*r.sy*.5,0,0,TAU);c.stroke();
      const tail=r.project(x-(m.tx-m.x)*.14,z-(m.tz-m.z)*.14,height+.4);
      c.strokeStyle='#ffc75e';c.lineWidth=m.phoenix?7:4;c.lineCap='round';c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(v.x,v.y);c.stroke();c.strokeStyle='#fff2bb';c.lineWidth=2;c.stroke();
      r.art.draw(c,'arsenal',m.phoenix?14:13,v.x,v.y,m.phoenix?60:33,{shadow:false});c.restore();
    }
    if(p.modules.lightning>=3&&game.mode!=='title'){
      const count=2+(p.perks.satellites||0);
      for(let i=0;i<count;i++){const a=game.playerTime*1.7+i/count*TAU;const v=r.project(p.x+Math.cos(a)*(p.radius+1.8),p.z+Math.sin(a)*(p.radius+1.8),.2);r.art.draw(c,'arsenal',15,v.x,v.y,28,{shadow:false});}
    }
    for(let i=this.items.length-1;i>=0;i--){
      const e=this.items[i];e.age+=dt;if(e.age>e.life){this.items.splice(i,1);continue;}
      const alpha=1-e.age/e.life;c.save();c.globalAlpha=alpha;c.lineCap='round';c.lineJoin='round';
      if(e.type==='lightning'){
        for(const segment of e.segments){
          const a=r.project(segment.x,segment.z,.5),b=r.project(segment.tx,segment.tz,.45),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
          c.beginPath();c.moveTo(a.x,a.y);
          for(let j=1;j<=6;j++){const t=j/6,offset=j===6?0:Math.sin(j*17+e.age*9)*Math.min(13,length*.12);c.lineTo(a.x+dx*t-dy/length*offset,a.y+dy*t+dx/length*offset);}
          c.strokeStyle='#eab94a';c.lineWidth=6;c.shadowColor='#ffeac0';c.shadowBlur=10;c.stroke();c.strokeStyle='#fff7d5';c.lineWidth=2;c.stroke();c.shadowBlur=0;
          c.fillStyle='#fff4be';c.beginPath();c.arc(b.x,b.y,5*alpha+2,0,TAU);c.fill();
        }
      }else{
        const v=r.project(e.x,e.z),progress=e.age/e.life;
        if(e.type==='thunderstrike'){
          c.beginPath();c.moveTo(v.x+22,v.y-220);c.lineTo(v.x-13,v.y-140);c.lineTo(v.x+15,v.y-149);c.lineTo(v.x-6,v.y-63);c.lineTo(v.x+12,v.y-76);c.lineTo(v.x,v.y);
          c.strokeStyle='#dfb844';c.lineWidth=16*alpha+4;c.stroke();c.strokeStyle='#fff5cb';c.lineWidth=6*alpha+2;c.stroke();
          c.strokeStyle='#ffe6a4';c.lineWidth=4;c.beginPath();c.ellipse(v.x,v.y,progress*100,progress*55,0,0,TAU);c.stroke();
        }else if(e.type==='steam'){
          for(let j=0;j<7;j++){const a=j/7*TAU,rr=progress*r.scale*2;c.fillStyle=j%2?'#e2f6ed':'#ffeed3';c.beginPath();c.arc(v.x+Math.cos(a)*rr,v.y+Math.sin(a)*rr*.5-progress*22,13+progress*14,0,TAU);c.fill();}
        }else{
          const color=e.type==='prism'?'#8ddbea':'#efbe56';c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.ellipse(v.x,v.y,(25+progress*90),(14+progress*50),0,0,TAU);c.stroke();
          for(let j=0;j<8;j++){const a=j/8*TAU;c.fillStyle=j%2?'#fff5c5':color;c.save();c.translate(v.x+Math.cos(a)*(25+progress*70),v.y+Math.sin(a)*(15+progress*40));c.rotate(a+progress);c.fillRect(-3,-3,6,6);c.restore();}
        }
      }
      c.restore();
    }
  }
}
