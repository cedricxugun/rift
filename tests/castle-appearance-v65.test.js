import {describe,test,expect} from 'bun:test';
import {BattleGame} from '../src/v2/game.js';
import {castleFrame,weaponFrame,weaponMountCount} from '../src/v2/castle-appearance.js';
import {weaponMount} from '../src/v2/weapon-rig.js';

describe('the visible castle grows with its actual loadout',()=>{
  test('learning a later companion does not move an existing gate to the opposite platform',()=>{
    const g=new BattleGame(7);g.start(7,{},'furnace');g.upgrade('summon');
    const before=weaponMount(g.player,'summon');g.upgrade('lightning');
    expect(weaponMount(g.player,'summon').bay).toBe(before.bay);
    expect(weaponMount(g.player,'lightning').bay).not.toBe(before.bay);
    g.upgrade('summon');expect(weaponMount(g.player,'summon').bay).toBe(before.bay);
    expect(g.player.weaponOrder).toEqual(['ember','summon','lightning']);
  });
  test('body expansion follows swallowed mass while learning another element preserves its home',()=>{
    const g=new BattleGame(65);g.start(65,{},'furnace');g.drainEvents();
    const small=castleFrame(g.player.route,g.player.level);
    g.addMass(35);const expanded=castleFrame(g.player.route,g.player.level);
    expect(expanded).not.toBe(small);
    expect(g.drainEvents().find(e=>e.type==='grow')).toMatchObject({previousLevel:1,level:2});
    g.player.modules.ice=5;
    expect(castleFrame(g.player.route,g.player.level)).toBe(expanded);
    g.addMass(195);const keep=castleFrame(g.player.route,g.player.level);expect(keep).not.toBe(expanded);
    g.addMass(510);expect(castleFrame(g.player.route,g.player.level)).not.toBe(keep);
  });

  test('mixed weapons have separate chassis bays and weapon rank changes hardware without changing the home',()=>{
    const g=new BattleGame(65);g.start(65,{},'frost');
    g.player.modules={cannon:0,ice:1,wind:2,lightning:3,ember:0};
    const mounts=['ice','wind','lightning'].map(w=>weaponMount(g.player,w));
    expect(new Set(mounts.map(m=>m.bay)).size).toBe(3);
    const body=castleFrame(g.player.route,g.player.level),basic=weaponFrame('ice',1);
    g.player.modules.ice=5;
    expect(weaponFrame('ice',g.player.modules.ice)).not.toBe(basic);
    expect(castleFrame(g.player.route,g.player.level)).toBe(body);
    expect(weaponMountCount(g.player,'cannon')).toBe(0);
  });

  test('the heavy three-gun battery emits its first volley from three corresponding painted muzzles',()=>{
    const g=new BattleGame(65);g.start(65);g.entities=[];g.player.x=0;g.player.z=0;
    g.player.level=6;g.player.radius=2.3;g.player.visualRadius=2.3;g.player.modules.cannon=6;g.cooldowns.cannon=0;
    g.spawnEnemy('golem',{x:10,z:0,hp:5000,maxHp:5000,ward:0,spawning:0,cooldown:999,speed:0});
    g.drainEvents();g.weapons(0);g.updateShots(0);
    const shots=g.drainEvents().filter(e=>e.type==='shot');
    expect(weaponMountCount(g.player,'cannon')).toBe(3);expect(shots).toHaveLength(3);
    expect(new Set(shots.map(e=>e.muzzle)).size).toBe(3);
    for(const shot of shots){
      const mount=weaponMount(g.player,'cannon',shot.muzzle,shot.angle);
      expect(shot.x).toBeCloseTo(mount.tipX,8);expect(shot.z).toBeCloseTo(mount.tipZ,8);expect(shot.height).toBeCloseTo(mount.height,8);
    }
  });

  test('equipment height scales linearly with the castle rather than drifting above it at large size',()=>{
    const g=new BattleGame(65);g.start(65,{},'furnace');g.player.x=0;g.player.z=0;g.player.level=4;
    for(const weapon of ['cannon','ice','wind','lightning','ember']){
      g.player.modules[weapon]=3;g.player.radius=1;g.player.visualRadius=1;const small=weaponMount(g.player,weapon);
      g.player.radius=2;g.player.visualRadius=2;const big=weaponMount(g.player,weapon);
      expect(big.height).toBeCloseTo(small.height*2,8);expect(big.baseHeight).toBeCloseTo(small.baseHeight*2,8);
      expect(big.x).toBeCloseTo(small.x*2,8);expect(big.z).toBeCloseTo(small.z*2,8);
      g.player.modules[weapon]=0;
    }
  });
});
