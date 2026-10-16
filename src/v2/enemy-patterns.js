const TAU = Math.PI * 2;
const clamp = n => Math.max(-26, Math.min(26, n));

// Delayed volleys belong to their caster: killing it cancels the pending attack.
export class EnemyPatterns {
  constructor(game) { this.game = game; this.pending = []; }
  queue(e, delay, angle, count, spread, speed, pattern = 'fan', gap = null, turn = 0) {
    if (this.pending.length >= 28) return;
    this.pending.push({ source: e.id, delay, angle, count, spread, speed, pattern, gap, turn });
  }
  update(dt) {
    const g = this.game;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const shot = this.pending[i];
      const e = g.entities.find(e => e.id === shot.source && e.state === 'alive');
      if (!e || g.mode !== 'playing') { this.pending.splice(i, 1); continue; }
      shot.delay -= dt;
      if (shot.delay > 0) continue;
      this.pending.splice(i, 1);
      if (e.frozen > 0 || e.controlLock > 0) continue;
      g.volley(e, shot.angle, shot.count, shot.spread, shot.speed, shot.pattern, shot.gap, shot.turn);
    }
  }
  danger(e, warning) {
    const g = this.game;
    if (g.warnings.length >= 12) return;
    g.warnings.push({ x: e.x, z: e.z, radius: 1.3, age: 0, delay: 1.15, damage: e.damage, source: e.id, ...warning });
    g.emit('enemy-cast', { x: e.x, z: e.z, tx: warning.x ?? e.x, tz: warning.z ?? e.z, delay: warning.delay || 1.15, kind: warning.kind || 'bloom' });
  }
  prepare(e){
    const index=e.attackIndex;
    if(e.boss)e.attackName=['Royal cleave','Root chase','Crown sweep','Hollow shockwave','Crossing roots','Petal storm'][index%6];
    else if(e.kind==='rootwarden')e.attackName=['Briar walls','Branch sweep','Root shockwave','Garden collapse'][index%4];
    else if(e.kind==='moth')e.attackName=['Locked dive','Wing sweep','Petal traps'][index%3];
    else if(e.kind==='eye')e.attackName=['Oracle sweep','Petal rings','Crossing rays'][index%3];
    else if(e.kind==='elite')e.attackName=['Locked charge','Hunter cleave','Hunter volley'][index%3];
  }
  fire(e) {
    const g = this.game, p = g.player, a = e.lockAngle || 0, index = e.attackIndex;
    if (e.kind === 'beetle') {
      g.volley(e, a, g.time > 180 ? 3 : 1, .23, 4.6);
      if (g.time > 40) this.queue(e, .3, a, e.veteran ? 3 : 1, .24, 5.6);
    } else if (e.kind === 'mortar') {
      if (index % 3 === 0) {
        for (let i = 0; i < 4; i++) this.danger(e, { x: clamp(p.x + Math.cos(a) * (i - 1) * 2.2), z: clamp(p.z + Math.sin(a) * (i - 1) * 2.2), radius: 1.15, delay: 1.05 + i * .24, duration: .6 });
      } else if (index % 2 === 0) g.volley(e, a, 5, .28, 5.4);
      else for (let i = 0; i < 3; i++) this.danger(e, { x: clamp(p.x + p.vx * 1.4 + (i - 1) * 2.5), z: clamp(p.z + p.vz * 1.4 + (i - 1) * .8), radius: 1.2, delay: 1.2 + i * .23, duration: 1 });
    } else if (e.kind === 'mage') {
      if (index % 3 === 0) {
        g.volley(e, a - .65, 5, .3, 3.6, 'fan', null, .32);
        this.queue(e, .55, a + .65, 5, .3, 3.6, 'fan', null, -.32);
      } else if (index % 2) g.volley(e, a + Math.PI, e.veteran ? 16 : 12, 0, 3.6, 'ring', a);
      else { g.volley(e, a - .4, 3, .23, 5.1); this.queue(e, .42, a + .4, 3, .23, 5.1); }
    } else if (e.kind === 'herald') {
      const allies = g.entities.filter(other => other !== e && other.category === 'enemy' && other.state === 'alive' && !other.elite && !other.boss && Math.hypot(other.x - e.x, other.z - e.z) < 8).sort((a,b) => Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)).slice(0,3);
      for (const ally of allies) { const added = Math.max(0, ally.maxHp * .32 - (ally.relayWard || 0)); ally.ward += added; ally.relayWard = (ally.relayWard || 0) + added; ally.wardSource = e.id; ally.maxWard = Math.max(ally.maxWard, ally.ward); }
      g.emit('ward-relay', { x: e.x, z: e.z });
      g.volley(e, a, 3, .4, 4.2);
      if (g.time > 270) this.queue(e, .65, a, 8, 0, 3.4, 'ring', a);
    } else if (e.kind === 'golem') {
      if (index % 2) this.danger(e, { kind: 'ring', radius: 6.5, width: .44, delay: 1.2, duration: 1.4 });
      else for (let i = 0; i < 4; i++) this.danger(e, { x: clamp(e.x + Math.cos(a) * (2 + i * 2)), z: clamp(e.z + Math.sin(a) * (2 + i * 2)), radius: 1.25, delay: 1 + i * .22, duration: .55 });
    } else if(e.kind==='rootwarden'){
      if(index%4===0){
        for(const side of [-1,1])this.danger(e,{x:clamp(p.x+side*3),z:clamp(p.z-5),kind:'line',angle:Math.PI/2,length:10,radius:.65,delay:1.2,duration:2.4});
      }else if(index%4===1)this.danger(e,{kind:'cone',angle:a,arc:Math.PI*1.15,radius:8,delay:.9,duration:.28});
      else if(index%4===2){this.danger(e,{kind:'ring',radius:9,width:.6,delay:1,duration:2});this.danger(e,{kind:'ring',radius:7,width:.5,inward:true,delay:2.4,duration:1.6});}
      else for(let i=0;i<4;i++)this.danger(e,{x:clamp(p.x+(i%2?2.5:-2.5)),z:clamp(p.z+(i<2?-2.5:2.5)),radius:2.1,delay:1.1+i*.2,duration:1.2});
    } else if(e.kind==='moth'){
      if(index%3===1){this.danger(e,{kind:'cone',angle:a,arc:Math.PI*.9,radius:8,delay:.85,duration:.35});this.danger(e,{kind:'cone',angle:a+Math.PI,arc:Math.PI*.55,radius:6,delay:1.65,duration:.35});}
      else if(index%3===2)for(let i=0;i<5;i++){const angle=i/5*TAU;this.danger(e,{x:clamp(p.x+Math.cos(angle)*4.5),z:clamp(p.z+Math.sin(angle)*4.5),radius:1.6,delay:1.2+i*.12,duration:2.1});}
      else g.volley(e,a,7,.28,4.7,'fan',null,.25);
    } else if (e.kind === 'elite') {
      if (index % 3 === 0) this.danger(e, { kind: 'line', angle: a, length: 14, radius: .48, delay: 1.15, duration: .28 });
      else if (index % 3 === 1) this.danger(e,{kind:'cone',angle:a,arc:Math.PI*1.15,radius:7.5,delay:.85,duration:.35});
      else { g.volley(e, a - .35, 5, .2, 5.6); this.queue(e, .45, a + .35, 5, .2, 5.6); }
    } else if (e.kind === 'eye') {
      if (index % 3 === 0) {
        this.danger(e,{kind:'line',angle:a-.55,sweep:1.1,length:15,radius:.42,delay:1.1,duration:2.1});
      } else if(index%3===2){
        for(const offset of [-.55,.55])this.danger(e,{kind:'line',angle:a+offset,length:15,radius:.55,delay:1.25,duration:.65});
      } else {
        g.volley(e, a + Math.PI, 16, 0, 3.6, 'ring', a);
        this.queue(e, .68, a + Math.PI + .15, 16, 0, 4.1, 'ring', a + .42);
      }
    } else if (e.boss) {
      const attack = index % 6;
      if (attack === 0) {
        this.danger(e,{kind:'cone',angle:a,arc:Math.PI*1.25,radius:9,delay:1.1,duration:.4});
        if(e.phase>=2)this.danger(e,{kind:'cone',angle:a+Math.PI,arc:Math.PI*.85,radius:8,delay:2,duration:.35});
      } else if (attack === 1) {
        for(let i=0;i<4+e.phase;i++)this.danger(e,{x:clamp(p.x+p.vx*i*1.7),z:clamp(p.z+p.vz*i*1.7),radius:1.55,delay:1.15+i*.27,duration:.65});
      } else if (attack === 2) {
        this.danger(e,{kind:'line',angle:a-.75,sweep:1.5,length:17,radius:.52,delay:1.3,duration:2.4});
        if(e.phase===3)this.danger(e,{kind:'line',angle:a+Math.PI-.75,sweep:1.5,length:14,radius:.42,delay:1.3,duration:2.4});
      } else if(attack===3){
        this.danger(e,{kind:'ring',radius:11,width:.55,delay:1.1,duration:2});
        if(e.phase>=2)this.danger(e,{kind:'ring',radius:9,width:.55,inward:true,delay:2.5,duration:1.7});
      } else if(attack===4){
        for(const side of [-1,1])this.danger(e,{x:clamp(p.x+side*3.5),z:clamp(p.z-6),kind:'line',angle:Math.PI/2,length:12,radius:.72,delay:1.2,duration:2});
        this.danger(e,{x:p.x,z:p.z,radius:2,delay:2.3,duration:.4});
      }else{
        g.volley(e,a+Math.PI,16+e.phase*2,0,3.7,'ring',a);
        this.queue(e,.7,a+Math.PI+.22,14+e.phase*2,0,4.2,'ring',a+.4);
      }
    }
    if((e.elite||e.boss)&&index%2===0&&g.entities.filter(item=>item.duelSupply&&item.state!=='gone').length<6){
      for(const side of [-1,1])g.prop('ore',clamp(e.x+Math.cos(a+side*1.2)*5),clamp(e.z+Math.sin(a+side*1.2)*5),{mass:6,radius:.22,fragment:true,combatDrop:true,duelSupply:true});
      g.emit('duel-supplies',{x:e.x,z:e.z});
    }
  }
}
