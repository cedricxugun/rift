import {segmentHitsCircle} from './data.js';

export function warningRadius(w){
  if(w.kind!=='ring'||!w.active)return w.radius;
  const progress=Math.max(0,Math.min(1,(w.age-w.delay)/w.duration));
  return w.radius*(w.inward?1-progress:progress);
}

export function warningAngle(w){
  const progress=w.active?Math.max(0,Math.min(1,(w.age-w.delay)/w.duration)):0;
  return (w.angle||0)+(w.sweep||0)*progress;
}

export function hazardHits(w,target,radius){
  if(w.kind==='line'){
    const angle=warningAngle(w);
    return segmentHitsCircle(w.x,w.z,w.x+Math.cos(angle)*w.length,w.z+Math.sin(angle)*w.length,target.x,target.z,w.radius+radius);
  }
  const dx=target.x-w.x,dz=target.z-w.z,distance=Math.hypot(dx,dz);
  if(w.kind==='ring')return Math.abs(distance-warningRadius(w))<w.width+radius;
  if(w.kind==='cone'){
    if(distance> w.radius+radius)return false;
    if(distance<=radius)return true;
    const delta=Math.atan2(Math.sin(Math.atan2(dz,dx)-warningAngle(w)),Math.cos(Math.atan2(dz,dx)-warningAngle(w)));
    return Math.abs(delta)<(w.arc||Math.PI/2)*.5+Math.asin(Math.min(1,radius/distance));
  }
  return distance<w.radius+radius;
}
