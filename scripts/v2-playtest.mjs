import { BattleGame } from '../src/v2/game.js';
import { canSwallow } from '../src/v2/data.js';
import { mkdir, writeFile } from 'node:fs/promises';

export function chooseInput(game, route = 'harbor_lance') {
  const p = game.player;
  const opportunity=game.opportunity||game.expedition?.active;
  if (game.mode === 'evolving') return { x: 0, z: 0, evolution: p.evolutionRank===1?'engine':p.hp<p.maxHp*.6?'garden':'armory' };
  const alive = game.entities.filter(e => e.state === 'alive');
  const distance = e => Math.hypot(e.x-p.x,e.z-p.z);
  const core = alive.filter(e => e.category === 'core').sort((a,b)=>distance(a)-distance(b))[0];
  const shrines = game.mode==='choosing'?game.choiceOffers:alive.filter(e=>e.category==='shrine');
  const desired = {
    harbor_lance:{cannon:8,wind:5,lightning:4},
    harbor_salvo:{cannon:8,wind:5,ember:5},
    furnace_coals:{ember:5,wind:6,ice:6},
    furnace_eruption:{ember:5,lightning:5,cannon:8},
    frost_aegis:{ice:6,wind:6,lightning:5},
    frost_lances:{ice:6,cannon:8,wind:6},
  }[route];
  const scoreShrine = e => {
    if(e.path)return e.path===route?200:-100;
    if(e.mastery)return 95;
    if(e.perk){
      if(['overdrive','singularity','execution'].includes(e.perk))return 85;
      const current=p.perks[e.perk]||0;
      const priorities={frontShot:45,piercing:22,rebound:42,rearShot:25,fragmentation:42,satellites:26,explosive:38,conductors:36,might:32,tempo:30,hull:14,precision:p.core==='execution'?48:22,ferocity:22,fleet:7,insight:p.rewardLevel<8?40:8,appetite:8,remedies:p.hp<p.maxHp*.6?38:8,reach:24};
      return (priorities[e.perk]||10)-current*10;
    }
    if(e.buff==='heal'||e.buff==='health')return p.hp<p.maxHp*.55?80:5;
    if(e.buff)return 9;
    if(!e.skill)return 0;
    const deficit=(desired[e.skill]||0)-p.modules[e.skill];
    const focus=p.route==='furnace'?'ember':p.route==='frost'?'ice':'cannon';
    return deficit>0 ? deficit*9+(e.skill===focus?15:0) : -5;
  };
  const shrine=shrines.sort((a,b)=>scoreShrine(b)-scoreShrine(a)||distance(a)-distance(b))[0];
  if(game.mode==='choosing')return{x:0,z:0,choice:shrine?.id};
  const healing=alive.filter(e=>e.healing&&canSwallow(p,e)).sort((a,b)=>distance(a)-distance(b))[0];
  let goal;
  if(p.hp<p.maxHp*.5&&healing)goal=healing;
  else if(core)goal=core;
  else if(shrine)goal=shrine;
  else {
    const boss=alive.find(e=>e.boss),elite=alive.find(e=>e.elite);
    const foodValue=e=>(e.fragment?1.8:1)*(e.eventType?2:1)*((p.route==='furnace'&&e.burningRemains)||(p.route==='frost'&&e.frostedRemains)?1.5:1);
    const food=alive.filter(e=>e.category==='prop'&&!e.healing&&canSwallow(p,e)).sort((a,b)=>distance(a)/foodValue(a)-distance(b)/foodValue(b))[0];
    const guards=alive.filter(e=>e.guard).sort((a,b)=>distance(a)-distance(b));
    if(boss||elite){const enemy=boss||elite;if(canSwallow(p,enemy))goal=enemy;else {const a=game.time*.38;goal={x:enemy.x+Math.cos(a)*6.7,z:enemy.z+Math.sin(a)*6.7};}}
    else if(opportunity?.type==='outpost'&&!opportunity.unlocked&&guards.length){const e=guards[0],a=game.time*.4;goal={x:e.x+Math.cos(a)*4.5,z:e.z+Math.sin(a)*4.5};}
    else if(food)goal=food;
    else goal={x:Math.cos(game.time*.1)*12,z:Math.sin(game.time*.1)*12};
  }
  goal={...goal,x:Math.max(-25,Math.min(25,goal.x)),z:Math.max(-25,Math.min(25,goal.z))};
  const gx=goal.x-p.x,gz=goal.z-p.z,goalDistance=Math.hypot(gx,gz);
  const bullets=game.bullets.filter(b=>b.side==='enemy'&&Math.hypot(b.x-p.x,b.z-p.z)<7);
  const threats=alive.filter(e=>e.category==='enemy'&&!canSwallow(p,e)&&distance(e)<6);
  const candidates=[{x:0,z:0}];
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;candidates.push({x:Math.cos(a),z:Math.sin(a)});}
  candidates.push({x:gx/Math.max(.001,goalDistance),z:gz/Math.max(.001,goalDistance)});
  let best=candidates[0],bestScore=-Infinity,bestRisk=0;
  for(const direction of candidates){
    const speed=p.speed;
    let risk=0;
    for(const horizon of [.12,.28,.46]){
      const x=p.x+direction.x*speed*horizon,z=p.z+direction.z*speed*horizon;
      if(Math.abs(x)>27||Math.abs(z)>27)risk+=20;
      for(const bullet of bullets){const bx=bullet.x+bullet.vx*horizon,bz=bullet.z+bullet.vz*horizon;const gap=Math.hypot(x-bx,z-bz);risk+=Math.max(0,1.08-gap)*18;}
      for(const enemy of threats){
        const xEnemy=enemy.x+(enemy.intent==='charge'?Math.cos(enemy.lockAngle)*12.5*horizon:0);
        const zEnemy=enemy.z+(enemy.intent==='charge'?Math.sin(enemy.lockAngle)*12.5*horizon:0);
        const gap=Math.hypot(x-xEnemy,z-zEnemy);risk+=Math.max(0,enemy.radius*.55+.8-gap)*12;
      }
      for(const warning of game.warnings)if(warning.delay-warning.age<horizon+.18&&Math.hypot(x-warning.x,z-warning.z)<warning.radius+.5)risk+=25;
    }
    const forward=goalDistance>.2?(direction.x*gx+direction.z*gz)/goalDistance:0;
    let score=forward*3.3-risk;
    if(goal.category==='shrine'&&goalDistance<.6&&direction.x===0&&direction.z===0)score+=8;
    if(goalDistance<.2&&direction.x===0&&direction.z===0)score+=2;
    if(score>bestScore){bestScore=score;best=direction;bestRisk=risk;}
  }
  const iceRelease=p.route==='frost'&&p.shards>=3&&alive.some(e=>e.category==='enemy'&&distance(e)<9);
  return {...best,bulletTime:(bestRisk>10||iceRelease)&&p.bulletTimeCooldown<=0};
}

if(typeof process!=='undefined'&&process.argv[1]?.endsWith('v2-playtest.mjs')){
  const results=[];
  for(const [route,seed] of [['harbor_lance',73021],['harbor_salvo',29871],['furnace_coals',42017],['furnace_eruption',93217],['frost_aegis',11721],['frost_lances',28391]]){
    const game=new BattleGame(seed);game.start(seed,{},route.split('_')[0]);
    const milestones=[],encounters=[];let nextMark=30,input={x:0,z:0};
    for(let frame=0;frame<900*60&&game.mode!=='result';frame++){
      if(frame%5===0||['evolving','choosing'].includes(game.mode))input=chooseInput(game,route);
      if(input.evolution){game.evolve(input.evolution);input={x:0,z:0};}
      if(input.choice){game.chooseShrine(input.choice);input={x:0,z:0};}
      game.update(1/60,input);
      for(const event of game.drainEvents())if(['elite','core-drop','boss','victory'].includes(event.type))encounters.push({type:event.type,time:Number(event.time.toFixed(2))});
      if(game.time>=nextMark){milestones.push({time:Math.round(game.time),hp:Math.round(game.player.hp),rank:{...game.player.modules},upgrades:game.stats.upgrades,rewards:game.player.rewardLevel,enemies:game.entities.filter(e=>e.category==='enemy'&&e.state==='alive').length,shots:game.stats.shots});nextMark+=30;}
    }
    const result={route,seed,mode:game.mode,won:game.result?.won||false,time:game.time,hp:game.player.hp,stats:game.stats,modules:game.player.modules,path:game.player.path,mastery:game.player.mastery,evolution:game.player.evolution,perks:game.player.perks,core:game.player.core,energyLevel:game.player.rewardLevel,milestones,encounters};
    results.push(result);console.log(JSON.stringify({...result,milestones:undefined}));
  }
  await mkdir('.qa',{recursive:true});await writeFile('.qa/v2-balance.json',JSON.stringify(results,null,2));
}
