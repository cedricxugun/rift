export const MODIFICATIONS={
  chassis:{name:'Lightweight chassis',description:'Permanent movement speed +3% per level.',icon:'wind',max:5,cost:25,step:25},
  armor:{name:'Comfortable armor',description:'Start every expedition with 5 more health per level.',icon:'shield',max:5,cost:25,step:25},
  winch:{name:'Recovery winch',description:'Food and supplies are pulled from farther away.',icon:'mouth',max:4,cost:30,step:25},
  medicine:{name:'Careful packing',description:'Permanent healing supply effect +8% per level.',icon:'leaf',max:4,cost:30,step:25},
};

export function workshopLevel(profile,id){return Math.min(MODIFICATIONS[id]?.max||0,Math.max(0,Math.floor(Number(profile.workshop?.[id])||0)));}
export function modificationCost(profile,id){const d=MODIFICATIONS[id];return d?d.cost+d.step*workshopLevel(profile,id):Infinity;}

export function purchaseModification(profile,id){
  const d=MODIFICATIONS[id],cost=modificationCost(profile,id);
  if(!d||workshopLevel(profile,id)>=d.max||!(profile.parts>=cost))return false;
  profile.parts-=cost;profile.workshop={...profile.workshop,[id]:workshopLevel(profile,id)+1};return true;
}

export function equipWorkshop(player,profile){
  player.speed+=6.4*.03*workshopLevel(profile,'chassis');
  player.maxHp+=5*workshopLevel(profile,'armor');player.hp=player.maxHp;
  player.collectionBonus=.15*workshopLevel(profile,'winch');
  player.healPower+=.08*workshopLevel(profile,'medicine');
}

export function expeditionParts(time,stats,won){
  const earned=Math.floor(Math.max(0,time)/45)+Math.floor(Math.max(0,stats.kills)/15)+Math.max(0,stats.elites)*4;
  return Math.min(100,earned+(won?45:0));
}
