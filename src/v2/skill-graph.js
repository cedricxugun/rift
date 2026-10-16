import { COMBOS } from './data.js';
export const MAX_WEAPONS=3;

export const ROUTES={
  harbor:{name:'Gale harbor',description:'Swallowed food and wreckage load a powerful cannon volley.',loop:'Break. Gather. Broadside.',primary:'cannon',partner:'wind',color:'#6da58b',icon:'cannon',sprite:0,evolution:'vortex',capacity:22},
  furnace:{name:'Living furnace',description:'Devouring burning wreckage heats the furnace for a fire eruption.',loop:'Ignite. Devour. Erupt.',primary:'ember',partner:'wind',color:'#d8864d',icon:'flame',sprite:4,evolution:'sunforge',capacity:25},
  frost:{name:'Frost garden',description:'Swallowing gathers guardian ice. Bullet time releases the stored shards.',loop:'Chill. Gather. Shatter.',primary:'ice',partner:'wind',color:'#79afc5',icon:'ice',sprite:8,evolution:'blizzard',capacity:10},
};

export const HOME_PLAYSTYLES={
  harbor:{title:'Cannon castle',style:'Ranged · First-run pick',attack:'Automatic cannon fire.',devour:'Fill the charge bar to fire a broadside automatically.'},
  furnace:{title:'Flame castle',style:'Close-range burst',attack:'Automatic fireballs.',devour:'Fill the heat bar to erupt around you. Burning wreckage charges faster.'},
  frost:{title:'Frost castle',style:'Control and defense',attack:'Automatic slowing ice bolts.',devour:'Store ice shards to soften hits. Activate bullet time to launch them.'},
};

export const BRANCHES={
  harbor_lance:{route:'harbor',name:'Harpoon battery',description:'Your loaded volley pierces three enemies and deals extra damage to wards.',icon:'target',sprite:1,mastery:'harbor_breach'},
  harbor_salvo:{route:'harbor',name:'Salvage broadside',description:'Load more quickly and release eight shells in a wide spread.',icon:'cannon',sprite:2,mastery:'harbor_recycle'},
  furnace_coals:{route:'furnace',name:'Ember gardens',description:'Furnace eruptions leave three lasting fire pools.',icon:'flame',sprite:5,mastery:'furnace_hearth'},
  furnace_eruption:{route:'furnace',name:'Sunburst chimney',description:'Release a wide explosion and rain six fireballs on nearby enemies.',icon:'sparkle',sprite:6,mastery:'furnace_echo'},
  frost_aegis:{route:'frost',name:'Guardian greenhouse',description:'Store six ice shards. A shard can halve an incoming hit.',icon:'shield',sprite:9,mastery:'frost_shelter'},
  frost_lances:{route:'frost',name:'Crystal spearheads',description:'Bullet time releases stronger piercing ice lances. Shards no longer absorb hits.',icon:'ice',sprite:10,mastery:'frost_split'},
};

export const MASTERY_NODES={
  harbor_breach:{path:'harbor_lance',name:'Keelbreaker',description:'Loaded harpoons deal 35% more damage and pierce two extra enemies.',icon:'target'},
  harbor_recycle:{path:'harbor_salvo',name:'Closed salvage loop',description:'Each loaded broadside returns 30% of its charge.',icon:'mouth'},
  furnace_hearth:{path:'furnace_coals',name:'Everglowing hearth',description:'Eruption fire pools last 2 seconds longer and become 25% wider.',icon:'flame'},
  furnace_echo:{path:'furnace_eruption',name:'Phoenix afterglow',description:'Eruptions launch three additional heavy fireballs.',icon:'sparkle'},
  frost_shelter:{path:'frost_aegis',name:'Winter shelter',description:'While ice shards are stored, erase up to two nearby bullets every 3 seconds.',icon:'shield'},
  frost_split:{path:'frost_lances',name:'Splintering horizon',description:'Each released guardian shard fires an additional ice lance.',icon:'ice'},
};

export const EVOLUTION_ASPECTS={
  armory:{name:'Expand the armory',description:'Upgrade your primary weapon and your strongest companion weapon.',icon:'cannon',sprite:12},
  engine:{name:'Tune the heart',description:'Movement speed +0.4. Swallowing charges your route 20% faster.',icon:'wind',sprite:13},
  garden:{name:'Grow a sanctuary',description:'Maximum health +20, healing effect +15%, and a recovery pack appears.',icon:'leaf',sprite:14},
};

export const ROUTE_COPY=[
  'Choose your traveling home','Traveling home','Change home','Three homes, three ways to devour.','Start with this home',
  'Choose a branch','This choice locks the other branch for this expedition.','Branch','Mastery','No branch chosen yet','Branch locked',
  'Keep improving your weapon','Your branch choices return at the next skill ruin.','Weapon slots {{current}}/{{max}}','Last weapon slot',
  'Reroll · {{count}} left','No rerolls left','Every expedition starts with two free rerolls.',
  '{{stat}}: {{before}} → {{after}}','Mouth growth','Healing effectiveness','Area size','Skill energy gain','Loaded volley','Furnace heat','Guardian ice',
  'Ready','Swallow to charge','Activate bullet time to release','Route bursts','Supplies recovered','Choose a city improvement',
  'Supply caravan','Guarded outpost','Recovery garden','Catch the moving wagons before they leave.','Defeat the wardens, then swallow the cache.','Gather the garden cache to reveal recovery supplies.',
  'Supplies secured','Outpost liberated','The caravan has departed','An opportunity nearby','Wardens {{current}}/{{max}}',
  'World opportunities','Devouring powers your traveling home.','Weapons share three slots. Choose a branch to shape your attacks.',
  'Different homes turn swallowed resources into volleys, eruptions, or guardian ice.','Three weapons maximum; the core has its own slot.',
  'A skill ruin pauses the fight. Choose one card or spend a free reroll.','Clear wardens to open an outpost; moving wagons can be swallowed immediately.',
  'Route charge','Opening loadout','Current branch','Primary weapon','Three weapon slots','Core ability','A new expedition, a different home.',
  'Movement speed',
  'Skill energy','Maximum integrity','Ruin found','Move closer to draw the ruin into your mouth.',
  'Follow the arrow to claim your skill. Extra energy is saved.',
  'Absorb the fallen core to choose a city improvement.',
  'The king can be devoured','Approach the broken king and swallow it to finish the battle.',
  'Unlocks {{name}}','Explosion radius: {{before}} → {{after}}',
  'Cooling {{seconds}}s','Primary weapon upgrades also strengthen your charged attacks.',
  'Loaded attacks seek visible threats and prioritize wards and elites.',
  'Stored energy {{current}}','Swallow charge efficiency','Salvage rush','Temporal discharge','Ward relay','Salvage haste +{{percent}}%',
];

export function ownedWeapons(player){return Object.keys(player.modules).filter(id=>player.modules[id]>0);}
export function canLearnWeapon(player,id){return player.modules[id]>0||ownedWeapons(player).length<MAX_WEAPONS;}
export function branchOffers(player){return Object.entries(BRANCHES).filter(([,node])=>node.route===player.route).map(([path])=>({path,kind:'branch',rarity:'rare'}));}
export function masteryFor(player){return player.path?BRANCHES[player.path].mastery:null;}
export function routeCapacity(player){return ROUTES[player.route].capacity*(player.path==='harbor_salvo'?.8:1);}
export function shardCapacity(player){return player.path==='frost_aegis'?6:4;}

export function comboRecommendations(player,skill){
  if(!skill)return [];
  const equipped=new Set(ownedWeapons(player));equipped.add(skill);
  const next={...player.modules,[skill]:player.modules[skill]+1};
  return Object.entries(COMBOS).filter(([,combo])=>combo.needs[skill]&&new Set([...equipped,...Object.keys(combo.needs)]).size<=MAX_WEAPONS).map(([id,combo])=>{
    const missing=Object.entries(combo.needs).reduce((n,[s,r])=>n+Math.max(0,r-player.modules[s]),0);
    const unlocks=missing>0&&Object.entries(combo.needs).every(([s,r])=>next[s]>=r);
    return {id,...combo,unlocks,order:unlocks?-100:missing===0?100:missing};
  }).sort((a,b)=>a.order-b.order||Object.keys(b.needs).filter(s=>player.modules[s]>0).length-Object.keys(a.needs).filter(s=>player.modules[s]>0).length);
}
