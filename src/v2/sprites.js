import { castleFrame, castleStage, CASTLE_LAYOUTS, weaponFrame, weaponAtlas, weaponMountCount,equippedArt } from './castle-appearance.js';
import { weaponMount } from './weapon-rig.js';
import {activeCombos,COMBOS} from './data.js';

const DEPTH = 0.6;
const TAU = Math.PI * 2;
const SHEET_SIZE = 4;
const WALK_ROWS = { beetle: 0, ram: 1, mortar: 2, mage: 3 };

// Measured against the bright 1254 px atlas, in fractions of the original cell.
// These are the empty mouth centers, not the centers of the tower silhouettes.
const HERO_LAYOUT = [
  { x: 0.530, y: 0.805, radius: 0.250, bottom: 0.995, core: [0.53, 0.42], muzzle: [[0.875, 0.622], [0.180, 0.622]] },
  { x: 0.510, y: 0.805, radius: 0.240, bottom: 0.995, core: [0.51, 0.42], muzzle: [[0.915, 0.610], [0.120, 0.608]] },
  { x: 0.507, y: 0.808, radius: 0.247, bottom: 0.995, core: [0.51, 0.19], muzzle: [[0.85, 0.64], [0.15, 0.64]] },
  { x: 0.500, y: 0.818, radius: 0.230, bottom: 0.995, core: [0.50, 0.40], muzzle: [[0.84, 0.64], [0.16, 0.64]] },
];

// Mouth, windows and chimney positions are measured in each nominal atlas cell.
// Cropping may move a cell edge; these anchors stay in the source grid instead.
const TRAVELER_LAYOUT = [
  { x: .575, y: .800, radius: .225, core: [.57, .60], chimneys: [[.63, .34]] },
  { x: .579, y: .790, radius: .240, core: [.60, .51], chimneys: [[.73, .18]] },
  { x: .539, y: .790, radius: .235, core: [.53, .45], chimneys: [[.61, .18]] },
  { x: .566, y: .795, radius: .235, core: [.55, .48], chimneys: [[.42, .18], [.68, .15]] },
  { x: .579, y: .790, radius: .225, core: [.57, .53], chimneys: [[.69, .24]], muzzle: [[.975, .646], [.140, .650]] },
  { x: .560, y: .790, radius: .230, core: [.55, .52], chimneys: [[.75, .26]] },
  { x: .546, y: .790, radius: .215, core: [.54, .53], chimneys: [] },
  { x: .551, y: .790, radius: .225, core: [.55, .56], chimneys: [[.74, .28]] },
  { x: .574, y: .765, radius: .240, core: [.55, .50], chimneys: [[.73, .23]] },
  { x: .557, y: .785, radius: .230, core: [.55, .53], chimneys: [[.50, .12]], muzzle: [[.934, .603], [.230, .618]] },
  { x: .542, y: .785, radius: .230, core: [.53, .53], chimneys: [[.71, .18]], muzzle: [[.938, .615], [.213, .615]] },
  { x: .566, y: .787, radius: .230, core: [.54, .52], chimneys: [] },
  { x: .541, y: .760, radius: .235, core: [.50, .48], chimneys: [[.78, .19]], muzzle: [[.985, .574], [.140, .584]] },
  { x: .560, y: .775, radius: .235, core: [.55, .51], chimneys: [[.75, .19]] },
  { x: .568, y: .760, radius: .240, core: [.56, .49], chimneys: [] },
  { x: .570, y: .760, radius: .235, core: [.56, .41], chimneys: [[.80, .23]] },
];

const TRAVELER_EVOLUTIONS = { vortex: 9, shatter: 10, blizzard: 11, thunderheart: 12, sunforge: 13 };
const TRAVELER_WEAPONS = { cannon: 4, ice: 5, wind: 6, lightning: 7, ember: 8 };
const TRAVELER_NATIVE = {
  cannon: new Set([4, 9, 10, 12]),
  ice: new Set([5, 10, 11]),
  wind: new Set([6, 9, 11, 13]),
  lightning: new Set([7, 12]),
  ember: new Set([8, 13]),
};

const ROUTE_BASES = { harbor: 0, furnace: 4, frost: 8 };
const ROUTE_PATHS = { harbor_lance: 1, harbor_salvo: 2, furnace_coals: 5, furnace_eruption: 6, frost_aegis: 9, frost_lances: 10 };
const ROUTE_LAYOUT = [
  { x: .554, y: .805, radius: .225, core: [.55, .56], chimneys: [[.72, .26]], muzzle: [[.905, .710], [.196, .707]] },
  { x: .551, y: .805, radius: .222, core: [.55, .55], chimneys: [[.72, .26]], muzzle: [[.966, .742], [.103, .739]] },
  { x: .512, y: .805, radius: .213, core: [.52, .55], chimneys: [[.68, .26]], muzzle: [[.916, .714], [.088, .704]] },
  { x: .511, y: .805, radius: .213, core: [.52, .55], chimneys: [[.68, .26]], muzzle: [[.880, .710], [.128, .710]] },
  { x: .545, y: .785, radius: .247, core: [.55, .54], chimneys: [[.35, .20], [.72, .20]] },
  { x: .538, y: .785, radius: .240, core: [.54, .40], chimneys: [[.65, .15]] },
  { x: .514, y: .785, radius: .240, core: [.52, .52], chimneys: [[.66, .18]], muzzle: [[.825, .345], [.190, .345]] },
  { x: .510, y: .785, radius: .240, core: [.51, .52], chimneys: [[.33, .21], [.69, .17]] },
  { x: .550, y: .750, radius: .245, core: [.55, .51], chimneys: [[.73, .15]] },
  { x: .543, y: .750, radius: .235, core: [.54, .51], chimneys: [] },
  { x: .515, y: .750, radius: .237, core: [.52, .50], chimneys: [[.66, .15]], muzzle: [[.969, .716], [.055, .730]] },
  { x: .522, y: .750, radius: .237, core: [.52, .50], chimneys: [[.70, .15]], muzzle: [[.960, .730], [.064, .730]] },
];

const PORTAL_COLORS = {
  base: { edge: '#a9a4c3', bright: '#e1d9ed', mist: '131, 129, 166', inner: '#293347' },
  vortex: { edge: '#a2cdad', bright: '#e3f2d9', mist: '107, 170, 133', inner: '#243f39' },
  shatter: { edge: '#97cbdc', bright: '#e4f4ff', mist: '117, 178, 201', inner: '#223d47' },
  blizzard: { edge: '#9acbc0', bright: '#e2f5e9', mist: '113, 182, 167', inner: '#24413d' },
  thunderheart: { edge: '#a4dce7', bright: '#e6f7ff', mist: '122, 182, 222', inner: '#25354b' },
  sunforge: { edge: '#e3bb77', bright: '#fff0c9', mist: '211, 151, 76', inner: '#3b3031' },
};

function surface(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function colorMask(image, frame, color) {
  const canvas = surface(frame.sw, frame.sh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, frame.sw, frame.sh);
  return canvas;
}

function occupiedBandRange(counts, gap = 5, minimumArea = .08) {
  const bands = [];
  let start = -1;
  let end = -1;
  let area = 0;
  for (let i = 0; i < counts.length; i += 1) {
    if (counts[i] < 2) continue;
    if (start < 0) start = i;
    else if (i - end > gap) {
      bands.push({ start, end, area });
      start = i;
      area = 0;
    }
    end = i;
    area += counts[i];
  }
  if (start >= 0) bands.push({ start, end, area });
  if (!bands.length) return [0, counts.length - 1];
  const largest = Math.max(...bands.map(band => band.area));
  const retained = bands.filter(band => band.area >= largest * minimumArea);
  return [retained[0].start, retained[retained.length - 1].end];
}

function atlasRowEdges(coverage, tolerance) {
  const height = coverage.length;
  const edges = Array.from({ length: 5 }, (_, row) => Math.floor((row * height) / SHEET_SIZE));
  for (let row = 1; row < 4; row += 1) {
    const expected = (row * height) / SHEET_SIZE;
    const spread = Math.round(height * tolerance);
    let best = Math.floor(expected);
    for (let y = Math.max(edges[row - 1] + 1, Math.floor(expected) - spread); y < Math.min(height, expected + spread); y += 1) {
      if (coverage[y] < coverage[best] || (coverage[y] === coverage[best] && Math.abs(y - expected) < Math.abs(best - expected))) best = y;
    }
    edges[row] = best;
  }
  return edges;
}

/** Runtime-only crops and overlays; the source atlases are never rewritten. */
export class PaintedArt {
  constructor(images) {
    this.images = images;
    this.frames = {};
    this.sheets = {};
    this.flashCache = new Map();
    this.tintCache = new Map();
    this.portalCache = new Map();
    this.walkRows = [];
    this.reducedMotion = false;
    this.issues = [];
    this.heroPose = { muzzles: [{ x: 0, y: 0 }], core: { x: 0, y: 0 }, atlasIndex: 0, atlasName: 'characters' };
    this.muzzlePoints = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

    for (const name of ['characters', 'props', 'effects', ...['walk','arsenal','travelers','routes','cores','castles','equipment','skillEffects','allies','duels','tactics'].filter(name=>images[name])]) {
      const image = images[name];
      const width = image?.naturalWidth || image?.width || 0;
      const height = image?.naturalHeight || image?.height || 0;
      if (!width || !height) throw new Error(`PaintedArt requires a loaded ${name} image.`);
      const canvas = surface(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      let pixels = null;
      try {
        pixels = ctx.getImageData(0, 0, width, height).data;
      } catch {
        this.issues.push(`${name}: alpha inspection unavailable; using full atlas cells.`);
      }
      let rowEdges = Array.from({ length: 5 }, (_, row) => Math.floor((row * height) / SHEET_SIZE));
      if (name === 'walk' && pixels) {
        const coverage = new Uint16Array(height);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (pixels[(y * width + x) * 4 + 3] > 8) coverage[y] += 1;
          }
        }
        rowEdges = atlasRowEdges(coverage, 0.09);
      }
      const columnRowEdges = Array.from({ length: 4 }, () => rowEdges);
      if (pixels && ['characters','props','arsenal','travelers','routes','cores','castles','equipment','allies','duels','tactics'].includes(name)) {
        for (let col = 0; col < 4; col += 1) {
          const coverage = new Uint16Array(height);
          const columnLeft = Math.floor((col * width) / SHEET_SIZE);
          const columnRight = Math.floor(((col + 1) * width) / SHEET_SIZE);
          for (let y = 0; y < height; y += 1) {
            for (let x = columnLeft; x < columnRight; x += 1) {
              if (pixels[(y * width + x) * 4 + 3] > 8) coverage[y] += 1;
            }
          }
          columnRowEdges[col] = atlasRowEdges(coverage, 0.065);
        }
      }
      const frames = [];
      let nonempty = 0;
      let transparentPixels = 0;
      for (let index = 0; index < 16; index += 1) {
        const col = index % SHEET_SIZE;
        const row = Math.floor(index / SHEET_SIZE);
        const cellX = Math.floor((col * width) / SHEET_SIZE);
        const cellY = columnRowEdges[col][row];
        const cellRight = Math.floor(((col + 1) * width) / SHEET_SIZE);
        const cellBottom = columnRowEdges[col][row + 1];
        // The frost-lance cell has a thin neighboring ice-petal sliver at its left edge.
        const scanLeft = cellX + (name === 'routes' && index === 10 ? Math.max(1, Math.round((cellRight - cellX) * .02)) : 1);
        const scanTop = cellY + 1;
        const scanRight = cellRight - 1;
        const scanBottom = name === 'characters' && index < 4
          ? Math.min(cellBottom - 1, cellY + Math.floor((cellBottom - cellY) * HERO_LAYOUT[index].bottom))
          : cellBottom - 1;
        let left = cellRight;
        let top = cellBottom;
        let right = cellX - 1;
        let bottom = cellY - 1;
        const rowCounts = new Uint16Array(cellBottom - cellY);
        if (pixels) {
          for (let y = cellY; y < cellBottom; y += 1) {
            for (let x = cellX; x < cellRight; x += 1) {
              const alpha = pixels[(y * width + x) * 4 + 3];
              if (alpha <= 8) {
                transparentPixels += 1;
                continue;
              }
              if (x < scanLeft || x >= scanRight || y < scanTop || y >= scanBottom) continue;
              rowCounts[y - cellY] += 1;
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        } else {
          left = cellX;
          top = cellY;
          right = cellRight - 1;
          bottom = cellBottom - 1;
        }
        const empty = right < left || bottom < top;
        if (empty) {
          left = cellX;
          top = cellY;
          right = cellRight - 1;
          bottom = cellBottom - 1;
          this.issues.push(`${name}: cell ${index} is transparent.`);
        } else {
          nonempty += 1;
          if (pixels && name !== 'effects') {
            // Tightly packed AI atlases occasionally include a tiny piece of an
            // adjacent cell. Detached edge bands are ignored by the crop metadata.
            const rowRange = occupiedBandRange(rowCounts);
            top = cellY + rowRange[0];
            bottom = cellY + rowRange[1];
            const columnCounts = new Uint16Array(cellRight - cellX);
            for (let y = top; y <= bottom; y += 1) {
              for (let x = scanLeft; x < scanRight; x += 1) {
                if (pixels[(y * width + x) * 4 + 3] > 8) columnCounts[x - cellX] += 1;
              }
            }
            const columnRange = occupiedBandRange(columnCounts, 3, .14);
            left = cellX + columnRange[0];
            right = cellX + columnRange[1];
          }
          left = Math.max(scanLeft, left - 1);
          top = Math.max(scanTop, top - 1);
          right = Math.min(scanRight - 1, right + 1);
          bottom = Math.min(scanBottom - 1, bottom + 1);
        }
        const frame = {
          index, sx: left, sy: top, sw: right - left + 1, sh: bottom - top + 1,
          cellX, cellY, cellWidth: cellRight - cellX, cellHeight: cellBottom - cellY,
          empty,
        };
        frame.aspect = frame.sh / frame.sw;
        frames.push(frame);
      }
      this.frames[name] = frames;
      this.sheets[name] = { width, height, frames, rowEdges, columnRowEdges, nonempty, transparentFraction: pixels ? transparentPixels / (width * height) : null };
      if (pixels && transparentPixels / (width * height) < 0.02) this.issues.push(`${name}: atlas has little transparency; inspect its background.`);
    }

    if (this.frames.walk) {
      for (let row = 0; row < 4; row += 1) {
        const frames = this.frames.walk.slice(row * 4, row * 4 + 4);
        const left = Math.min(...frames.map(frame => frame.sx - frame.cellX));
        const top = Math.min(...frames.map(frame => frame.sy - frame.cellY));
        const right = Math.max(...frames.map(frame => frame.sx - frame.cellX + frame.sw));
        const bottom = Math.max(...frames.map(frame => frame.sy - frame.cellY + frame.sh));
        this.walkRows.push({ left, top, right, bottom, width: right - left, height: bottom - top, centerX: (left + right) * 0.5, footY: bottom });
      }
    }

    const cannonCell = this.frames.characters[12];
    this.heroCannon = {
      sx: Math.floor(cannonCell.cellX + cannonCell.cellWidth * 0.255),
      sy: Math.floor(cannonCell.cellY + cannonCell.cellHeight * 0.07),
      sw: Math.floor(cannonCell.cellWidth * 0.53),
      sh: Math.floor(cannonCell.cellHeight * 0.40),
    };

    this.steamPuff = surface(64, 64);
    const steam = this.steamPuff.getContext('2d');
    steam.fillStyle = '#eee9dc';
    steam.strokeStyle = '#7e80735c';
    steam.lineWidth = .9;
    steam.beginPath();
    steam.moveTo(13, 47);
    steam.bezierCurveTo(3, 42, 4, 26, 17, 24);
    steam.bezierCurveTo(13, 7, 35, 3, 41, 20);
    steam.bezierCurveTo(61, 14, 67, 41, 52, 46);
    steam.bezierCurveTo(47, 57, 26, 59, 13, 47);
    steam.closePath();
    steam.fill();
    steam.stroke();
    steam.fillStyle = '#d9d5ca';
    steam.beginPath();
    steam.moveTo(13, 47);
    steam.bezierCurveTo(27, 53, 26, 40, 36, 42);
    steam.bezierCurveTo(48, 47, 51, 36, 57, 40);
    steam.bezierCurveTo(58, 50, 30, 61, 13, 47);
    steam.fill();

    for (const [name, colors] of Object.entries(PORTAL_COLORS)) {
      const canvas = surface(512, 352);
      const ctx = canvas.getContext('2d');
      ctx.translate(256, 176);
      ctx.scale(1, DEPTH);

      const mist = ctx.createRadialGradient(0, 0, 182, 0, 0, 251);
      mist.addColorStop(0, `rgba(${colors.mist}, 0)`);
      mist.addColorStop(0.5, `rgba(${colors.mist}, 0.08)`);
      mist.addColorStop(0.73, `rgba(${colors.mist}, 0.06)`);
      mist.addColorStop(1, `rgba(${colors.mist}, 0)`);
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.arc(0, 0, 251, 0, TAU);
      ctx.fill();

      const depth = ctx.createRadialGradient(-23, -12, 12, 0, 0, 220);
      depth.addColorStop(0, '#0a1420');
      depth.addColorStop(0.48, '#0d1826');
      depth.addColorStop(0.76, '#1b2738');
      depth.addColorStop(0.93, colors.inner);
      depth.addColorStop(1, '#566174');
      ctx.fillStyle = depth;
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = colors.bright;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 221, 0.12, Math.PI - 0.17);
      ctx.stroke();
      this.portalCache.set(name, canvas);
    }
  }

  draw(ctx, atlasName, index, x, footY, width, options = {}) {
    const frame = this.frames[atlasName]?.[index];
    if (!frame || frame.empty || width <= 0) return;
    const alpha = clamp(options.alpha ?? 1, 0, 1);
    if (alpha <= 0) return;
    const height = width * frame.aspect;
    const angle = options.angle || 0;
    const key = `${atlasName}:${index}`;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (options.shadow !== false) {
      ctx.fillStyle = 'rgba(48, 65, 42, 0.12)';
      ctx.beginPath();
      ctx.ellipse(x, footY - 1, width * 0.33, width * 0.085, 0, 0, TAU);
      ctx.fill();
    }
    ctx.translate(x, footY);
    if (angle) ctx.rotate(angle);
    if (options.flip) ctx.scale(-1, 1);
    ctx.drawImage(this.images[atlasName], frame.sx, frame.sy, frame.sw, frame.sh, -width * 0.5, -height, width, height);

    if (options.tint) {
      const color = typeof options.tint === 'string' ? options.tint : options.tint.color;
      const amount = typeof options.tint === 'string' ? 0.32 : clamp(options.tint.amount ?? 0.32, 0, 1);
      const tintKey = `${key}:${color}`;
      if (color && amount > 0) {
        if (!this.tintCache.has(tintKey)) this.tintCache.set(tintKey, colorMask(this.images[atlasName], frame, color));
        ctx.globalAlpha *= amount;
        ctx.drawImage(this.tintCache.get(tintKey), -width * 0.5, -height, width, height);
        ctx.globalAlpha /= amount;
      }
    }
    const flash = options.flash === true ? 0.9 : clamp(Number(options.flash) || 0, 0, 1);
    if (flash > 0) {
      if (!this.flashCache.has(key)) this.flashCache.set(key, colorMask(this.images[atlasName], frame, '#ffffff'));
      ctx.globalAlpha *= flash;
      ctx.drawImage(this.flashCache.get(key), -width * 0.5, -height, width, height);
    }
    ctx.restore();
  }

  drawEffect(ctx, row, progress, x, y, size, angle = 0, atlasName='effects') {
    const phase = clamp(progress, 0, 0.999999);
    const index = clamp(Math.floor(row), 0, 3) * 4 + Math.floor(phase * 4);
    const frame = this.frames[atlasName][index];
    if (!frame || size <= 0 || progress >= 1 || progress < 0) return;
    const height = size * frame.cellHeight / frame.cellWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha *= phase > 0.85 ? (1 - phase) / 0.15 : 1;
    ctx.drawImage(this.images[atlasName], frame.cellX, frame.cellY, frame.cellWidth, frame.cellHeight, -size * 0.5, -height * 0.5, size, height);
    ctx.restore();
  }

  drawModule(ctx,index,x,y,width,angle=0,flash=0,atlas='equipment'){
    const frame=this.frames[atlas]?.[index];if(!frame)return;
    const gridWidth=this.sheets[atlas].width/4,gridHeight=this.sheets[atlas].height/4;
    const directional=atlas==='equipment'&&index<6||atlas==='tactics'&&[7,12,13].includes(index),rotor=atlas==='equipment'&&index>=6&&index<=8||atlas==='tactics'&&index===6;
    const pivot=directional?[.28,.52]:rotor?[.5,.5]:[.5,.87];
    const scale=width/gridWidth;
    const cx=(frame.sx+frame.sw*.5-(index%4+pivot[0])*gridWidth)*scale;
    const foot=(frame.sy+frame.sh-(Math.floor(index/4)+pivot[1])*gridHeight)*scale;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    this.draw(ctx,atlas,index,cx,foot,frame.sw*scale,{shadow:false,flash:flash*.22});
    ctx.restore();
  }

  drawWeaponRig(ctx,player,project,scale,time,firing={},reducedMotion=false){
    const mounts=[];
    for(const [weapon,rank] of Object.entries(player.modules)){
      for(let i=0;i<weaponMountCount(player,weapon);i++){
        const fired=firing[weapon+':'+i],flash=Math.max(0,1-(time-(fired?.time??-10))/.18);
        const angle=flash>0?fired.angle??player.aim:player.aim;
        const mount=weaponMount(player,weapon,i,angle);
        const base=project(mount.baseX,mount.baseZ,mount.baseHeight),v=project(mount.x,mount.z,mount.height);
        mounts.push({weapon,rank,flash,angle,mount,base,v});
      }
    }
    // Rear equipment is painted first; front batteries read as part of the same chassis.
    mounts.sort((a,b)=>a.base.y-b.base.y);
    for(const id of activeCombos(player.modules)){
      const weapons=Object.keys(COMBOS[id].needs),a=mounts.find(m=>m.weapon===weapons[0]),b=mounts.find(m=>m.weapon===weapons[1]);
      if(!a||!b)continue;
      ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.base.x,a.base.y);ctx.quadraticCurveTo((a.base.x+b.base.x)*.5,Math.max(a.base.y,b.base.y)+player.visualRadius*scale*.24,b.base.x,b.base.y);
      ctx.strokeStyle='#5c674e';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle=player.buildPulse>0?COMBOS[id].color:'#c7ae73';ctx.lineWidth=2;ctx.stroke();
      if(player.buildPulse>0){ctx.globalAlpha=player.buildPulse*.65;ctx.strokeStyle='#fff5c8';ctx.lineWidth=1;ctx.stroke();}ctx.restore();
    }
    for(const {weapon,rank,flash,angle,mount,base,v} of mounts){
      const displayRank=weapon==='summon'&&player.core==='legionHeart'?Math.max(4,rank):rank;
      const look=equippedArt(player,weapon),index=look.atlas==='tactics'?look.frame:weaponFrame(weapon,displayRank,player.path),width=mount.moduleWidth*scale;
      this.drawModule(ctx,15,base.x,base.y+width*.04,width*.73);
      if(weapon==='cannon'||weapon==='ice'&&!player.perks?.mirrorWall||weapon==='lightning'&&player.perks?.stormLance){
        const tip=project(mount.tipX,mount.tipZ,mount.height),a=Math.atan2(tip.y-v.y,tip.x-v.x);
        const projectedWidth=Math.hypot(tip.x-v.x,tip.y-v.y)/.58;
        this.drawModule(ctx,index,v.x-Math.cos(a)*flash*width*.07,v.y-Math.sin(a)*flash*width*.07,projectedWidth,a,flash,look.atlas);
      }else if(weapon==='wind')this.drawModule(ctx,index,v.x,v.y,width,reducedMotion?0:time*(rank>=3?3.8:2),flash,look.atlas);
      else this.drawModule(ctx,index,base.x,base.y,width,weapon==='summon'&&flash?Math.sin(flash*14)*.06:0,flash,look.atlas);
    }
    if(player.path==='frost_aegis'){
      const v=project(player.x-player.visualRadius*1.2,player.z-.1,player.visualRadius*.25);
      this.draw(ctx,'castles',15,v.x,v.y,player.visualRadius*scale*.82,{shadow:false,alpha:.82});
    }
  }

  drawCityPreview(ctx,route,level,modules,x,y,radius,time=0,path=null,core=null,perks={}){
    const player={x:0,z:0,route,level,modules,weaponOrder:Object.keys(modules),radius,visualRadius:radius,aim:0,path,core,perks};
    const project=(wx,wz,h=0)=>({x:x+wx,y:y+wz*.62-h});
    const base=route==='furnace'?4:route==='frost'?8:0;
    this.drawPortal(ctx,x,y,radius,time);
    this.draw(ctx,'cores',base+castleStage(level),x,y+radius*.3,radius*.9,{shadow:false});
    this.drawHero(ctx,x,y,radius,time,{route,level,modules,portal:false});
    this.drawWeaponRig(ctx,player,project,1,time,{},true);
  }

  drawPose(ctx,atlas,index,x,footY,width,options={}){
    const frame=this.frames[atlas]?.[index];if(!frame)return;
    const gridWidth=this.sheets[atlas].width/4,gridHeight=this.sheets[atlas].height/4,scale=width/(gridWidth*.92);
    const cx=x+(frame.sx+frame.sw*.5-(index%4+.5)*gridWidth)*scale;
    const foot=footY+(frame.sy+frame.sh-(Math.floor(index/4)+.96)*gridHeight)*scale;
    this.draw(ctx,atlas,index,cx,foot,frame.sw*scale,options);
  }

  drawEnemy(ctx, kind, x, footY, width, time, options = {}) {
    const row = WALK_ROWS[kind];
    if (row === undefined || width <= 0) return;
    const tint = options.frozen ? { color: '#b9edff', amount: 0.38 } : options.tint;
    if (!this.frames.walk || !this.walkRows[row]) {
      this.draw(ctx, 'characters', 4 + row, x, footY, width, { ...options, tint });
      return;
    }
    const moving = options.moving && !options.frozen && !(options.reducedMotion ?? this.reducedMotion);
    const index = row * 4 + (moving ? Math.floor(Math.max(0, Number(time) || 0) * 7) % 4 : 0);
    const frame = this.frames.walk[index];
    const anchor = this.walkRows[row];
    const scale = width / anchor.width;
    const spriteX = (frame.sx - frame.cellX + frame.sw * 0.5 - anchor.centerX) * scale;
    const spriteFootY = (frame.sy - frame.cellY + frame.sh - anchor.footY) * scale;
    ctx.save();
    ctx.globalAlpha *= clamp(options.alpha ?? 1, 0, 1);
    if (options.shadow !== false) {
      ctx.fillStyle = 'rgba(48, 65, 42, 0.12)';
      ctx.beginPath();
      ctx.ellipse(x, footY - 1, width * 0.33, width * 0.085, 0, 0, TAU);
      ctx.fill();
    }
    ctx.translate(x, footY);
    if (options.angle) ctx.rotate(options.angle);
    if (options.flip) ctx.scale(-1, 1);
    this.draw(ctx, 'walk', index, spriteX, spriteFootY, frame.sw * scale, { shadow: false, flash: options.flash, tint });
    ctx.restore();
    return index;
  }

  drawPortal(ctx, x, y, radius, time, options = {}) {
    if (radius <= 0) return;
    const reducedMotion = options.reducedMotion ?? this.reducedMotion;
    const t = reducedMotion ? 0 : time;
    const theme = PORTAL_COLORS[options.evolution] ? options.evolution : 'base';
    const colors = PORTAL_COLORS[theme];
    const pulse = clamp(Number(options.pulse) || 0, 0, 1);
    const scale = radius / 220;
    ctx.save();
    const baseAlpha = ctx.globalAlpha * clamp(options.alpha ?? 1, 0, 1);
    ctx.globalAlpha = baseAlpha;
    ctx.drawImage(this.portalCache.get(theme), x - 256 * scale, y - 176 * scale, 512 * scale, 352 * scale);

    const rippleCount = options.evolution ? 3 : 2;
    for (let i = 0; i < rippleCount; i += 1) {
      const phase = (t * 0.18 + i / rippleCount) % 1;
      const r = radius * (0.96 + phase * 0.23);
      ctx.globalAlpha = baseAlpha * (1 - phase) * (0.09 + pulse * 0.16);
      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = 0.65 + pulse;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * DEPTH, 0, 0, TAU);
      ctx.stroke();
    }

    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = Math.max(0.65, radius * 0.009);
    for (let i = 0; i < 3; i += 1) {
      ctx.globalAlpha = baseAlpha * (0.07 + i * 0.02);
      const r = radius * (0.26 + i * 0.19);
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 0.5 + i) * radius * 0.025, y - radius * 0.025, r, r * DEPTH, 0, t * 0.4 + i, t * 0.4 + i + Math.PI * 1.25);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i += 1) {
      const phase = (t * 0.11 + i / 10) % 1;
      const angle = t * 0.55 + i * 2.39996;
      const r = radius * (0.97 - phase * 0.78);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r * DEPTH;
      ctx.globalAlpha = baseAlpha * Math.sin(phase * Math.PI) * 0.45;
      ctx.fillStyle = i % 4 ? colors.edge : '#f5d2a2';
      ctx.beginPath();
      ctx.ellipse(px, py, clamp(radius * 0.019, 0.8, 1.9), clamp(radius * 0.013, 0.6, 1.3), angle, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHero(ctx, x, y, radius, time, options = {}) {
    const modules = options.modules || {};
    const reducedMotion = options.reducedMotion ?? this.reducedMotion;
    const moving = options.moving ? 1 : 0;
    const recoil = clamp(Number(options.recoil) || 0, 0, 1);
    const cannonRank = Math.max(0, Number(modules.cannon) || 0);
    const iceRank = Math.max(0, Number(modules.ice) || 0);
    const windRank = Math.max(0, Number(modules.wind) || 0);
    const lightningRank = Math.max(0, Number(modules.lightning) || 0);
    const emberRank = Math.max(0, Number(modules.ember) || 0);
    const traveler = Boolean(this.frames.travelers);
    const route = this.frames.routes && Object.prototype.hasOwnProperty.call(ROUTE_BASES, options.route) ? options.route : null;
    const assembled=Boolean(route&&this.frames.castles);
    const living = traveler || Boolean(route);
    const charge = clamp(Number(options.charge) || 0, 0, 1);
    const hover = reducedMotion ? 0 : Math.sin(time * 2.2) * radius * 0.025;
    const bob = reducedMotion ? 0 : Math.sin(time * 8) * moving * radius * 0.009;
    const recoilY = recoil * radius * (reducedMotion ? 0.008 : 0.025);
    let index = 0;
    if (cannonRank || iceRank || windRank) {
      index = iceRank > cannonRank && iceRank >= windRank ? 2 : windRank > cannonRank && windRank > iceRank ? 3 : cannonRank >= 2 ? 1 : 0;
    }
    if (options.evolution === 'shatter') index = 2;
    if (options.evolution === 'blizzard') index = 3;
    if (options.evolution === 'vortex') index = 1;
    if (options.evolution === 'thunderheart') index = 1;
    if (options.evolution === 'sunforge') index = windRank > 0 ? 3 : 0;
    if (traveler) {
      const level = Math.max(1, Math.floor(Number(options.level) || 1));
      index = level === 1 ? 0 : level === 2 ? 1 : level < 5 ? 2 : 3;
      let dominant = 'cannon';
      let dominantRank = cannonRank;
      for (const skill in TRAVELER_WEAPONS) {
        const rank = Number(modules[skill]) || 0;
        if (rank > dominantRank) { dominant = skill; dominantRank = rank; }
      }
      if (level >= 3 && dominantRank >= 3) index = TRAVELER_WEAPONS[dominant];
      if (options.core === 'singularity') index = 14;
      if (options.core === 'overdrive') index = 15;
      if (TRAVELER_EVOLUTIONS[options.evolution] !== undefined) index = TRAVELER_EVOLUTIONS[options.evolution];
    }
    if (route) {
      const base = ROUTE_BASES[route];
      const branch = ROUTE_PATHS[options.path];
      index = Number.isInteger(branch) && Math.floor(branch / 4) * 4 === base ? branch : base;
      if(assembled)index=castleFrame(route,options.level);
      // Keep the same physical launch hardware while charging; light is handled by the rig.
    }
    if (options.portal !== false) this.drawPortal(ctx, x, y, radius, time, options);

    const atlasName = assembled?'castles':route ? 'routes' : traveler ? 'travelers' : 'characters';
    const frame = this.frames[atlasName][index];
    const layout = assembled?CASTLE_LAYOUTS[index]:route ? ROUTE_LAYOUT[index] : traveler ? TRAVELER_LAYOUT[index] : HERO_LAYOUT[index];
    const gridWidth = living ? this.sheets[atlasName].width / 4 : frame.cellWidth;
    const gridHeight = living ? this.sheets[atlasName].height / 4 : frame.cellHeight;
    const gridX = living ? (index % 4) * gridWidth : frame.cellX;
    const gridY = living ? Math.floor(index / 4) * gridHeight : frame.cellY;
    const pixelScale = radius / (gridWidth * layout.radius);
    const width = frame.sw * pixelScale;
    const anchorX = gridX + gridWidth * layout.x;
    const anchorY = gridY + gridHeight * layout.y;
    const centerX = x + (frame.sx + frame.sw * 0.5 - anchorX) * pixelScale;
    const footY = y + (frame.sy + frame.sh - anchorY) * pixelScale + hover + bob + recoilY;
    const breath = living && !reducedMotion ? Math.sin(time * 2.2 + index * .31) * .009 : 0;
    const stride = living && !reducedMotion ? Math.sin(time * 6.4) : 0;
    const sway = living && !reducedMotion ? stride * moving * .019 + Math.sin(time * .9) * .003 : 0;
    const bodyScaleX = 1 + breath * .6;
    const bodyScaleY = 1 + breath - Math.abs(stride) * moving * .012;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    ctx.scale(bodyScaleX, bodyScaleY);
    ctx.translate(-x, -y);
    this.draw(ctx, atlasName, index, centerX, footY, width, { shadow: false, alpha: options.alpha, flash: options.flash, tint: options.tint });

    // Functional parts are drawn by the shared world-space weapon rig.
    this.heroPose.muzzles.length = 0;
    this.heroPose.core.x = x + (layout.core[0] - layout.x) * gridWidth * pixelScale;
    this.heroPose.core.y = y + (layout.core[1] - layout.y) * gridHeight * pixelScale + hover;
    this.heroPose.atlasIndex = index;
    this.heroPose.atlasName = atlasName;

    if (living) {
      ctx.save();
      const effectAlpha = ctx.globalAlpha * clamp(options.alpha ?? 1, 0, 1);
      for (let chimneyIndex = 0; chimneyIndex < layout.chimneys.length; chimneyIndex += 1) {
        const chimney = layout.chimneys[chimneyIndex];
        const chimneyX = x + (chimney[0] - layout.x) * gridWidth * pixelScale;
        const chimneyY = y + (chimney[1] - layout.y) * gridHeight * pixelScale + hover + bob;
        const puffCount = reducedMotion ? 1 : options.core === 'overdrive' ? 4 : 3;
        for (let puff = 0; puff < puffCount; puff += 1) {
          const life = reducedMotion ? .25 : (time * (options.core === 'overdrive' ? .46 : .37) + puff / puffCount + chimneyIndex * .23) % 1;
          const size = radius * (.22 + life * .30);
          const drift = reducedMotion ? 0 : Math.sin(time * .8 + puff * 2) * radius * .025;
          ctx.globalAlpha = effectAlpha * (1 - life) * .74;
          ctx.drawImage(this.steamPuff, chimneyX + drift + life * radius * .15 - size * .5, chimneyY - life * radius * .75 - size, size, size);
        }
      }
      const icy = route === 'frost' || iceRank > 0 || lightningRank > 0;
      ctx.fillStyle = options.core === 'singularity' ? '#d7c7fa' : options.core === 'overdrive' ? '#ffe2aa' : icy ? '#d9f0e9' : options.core === 'execution' ? '#ffd491' : '#f9dda0';
      for (let mote = 0; mote < 5; mote += 1) {
        const phase = reducedMotion ? mote / 5 : (time * .12 + mote / 5) % 1;
        const side = mote % 2 ? -1 : 1;
        const px = x + side * radius * (1.04 + Math.sin(phase * TAU) * .21);
        const py = y - radius * (.73 + phase * .82) + hover;
        ctx.globalAlpha = effectAlpha * (.15 + Math.sin(phase * Math.PI) * .40);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(.7, radius * .014), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    const cosine = Math.cos(sway);
    const sine = Math.sin(sway);
    for (let i = 0; i <= this.heroPose.muzzles.length; i += 1) {
      const point = i === this.heroPose.muzzles.length ? this.heroPose.core : this.heroPose.muzzles[i];
      const px = (point.x - x) * bodyScaleX;
      const py = (point.y - y) * bodyScaleY;
      point.x = x + px * cosine - py * sine;
      point.y = y + px * sine + py * cosine;
    }
    return this.heroPose;
  }
}
