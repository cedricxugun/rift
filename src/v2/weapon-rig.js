import { castleFrame, CASTLE_LAYOUTS, weaponGrade, weaponMountCount } from './castle-appearance.js';

// At a 393 px viewport the core footprint grows about 20 / 24 / 27 / 30 / 33 / 35 px.
// Compensates for the existing camera zoom without scaling to the entire castle silhouette.
export const NEXUS_RADII = [.44, .52, .63, .76, .9, 1.05];
export function energyCoreRadius(player) {
  return NEXUS_RADII[Math.max(0,Math.min(NEXUS_RADII.length-1,(player.level||1)-1))];
}

export function weaponMount(player, weapon, index = 0, angle = player.aim) {
  const radius = player.visualRadius || player.radius;
  const layout=CASTLE_LAYOUTS[castleFrame(player.route,player.level)];
  const equipped=[...new Set([...(player.weaponOrder||[]),...Object.keys(player.modules)])].filter(key=>player.modules[key]>0);
  const primary={harbor:'cannon',furnace:'ember',frost:'ice'}[player.route]||'cannon';
  const front=player.modules.cannon>0?'cannon':primary;
  const secondary=equipped.filter(key=>key!==front),slot=index%Math.max(1,weaponMountCount(player,weapon));
  const name=weapon===front?(slot===2?'crown':slot===1?'frontLeft':'frontRight'):secondary.indexOf(weapon)===0?'upperLeft':'upperRight';
  const anchor=layout[name],grade=weaponGrade(weapon,player.modules[weapon],player.path);
  const forward=name==='crown'?-1.1:name.startsWith('upper')?-.85:-.32;
  const moduleWidth=(weapon==='summon'?1.2+grade*.2:weapon==='roots'?1.15+grade*.15:weapon==='cannon'?1+grade*.15:weapon==='ice'?.95+grade*.12:.75+grade*.15)*radius;
  const pairedOffset=weapon!==front&&weaponMountCount(player,weapon)>1?(slot===0?.18:-.18)*radius:0;
  const baseX=player.x+(anchor[0]-layout.x)/layout.radius*radius+pairedOffset;
  const baseZ=player.z+forward*radius;
  const baseHeight=(forward*.62-(anchor[1]-layout.y)/layout.radius*(1261/1247))*radius;
  const directional=weapon==='cannon'||weapon==='ice'||weapon==='lightning'&&player.perks?.stormLance;
  const x=baseX+(weapon==='ember'?moduleWidth*.17:0),z=baseZ;
  const height=baseHeight+moduleWidth*(directional?.34:weapon==='wind'?.38:weapon==='ember'?.54:.7);
  const length=directional?moduleWidth*.58:0;
  return { x, z, height, angle,
    tipX: x + Math.cos(angle) * length, tipZ: z + Math.sin(angle) * length, length,
    baseX,baseZ,baseHeight,moduleWidth,bay:name };
}
