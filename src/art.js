import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Small, reusable architectural pieces keep the entire town self-contained.
const palette = {
  limestone: 0xe7d9b8,
  lightStone: 0xffedca,
  darkStone: 0xab977d,
  teal: 0x358a83,
  darkTeal: 0x215762,
  copper: 0xd38650,
  darkCopper: 0x92593a,
  iron: 0x39454c,
  wood: 0x785846,
  bark: 0x756146,
  leaf: 0x8aa86a,
  darkLeaf: 0x668461,
  lightLeaf: 0xb6bd79,
  lavender: 0xa18ad6,
  ice: 0xa3e8e5,
  gold: 0xf2c578,
};

const materials = Object.fromEntries(
  Object.entries(palette).map(([key, color]) => [key, new THREE.MeshStandardMaterial({
    color, roughness: key === 'iron' ? 0.48 : 0.83,
    metalness: ['copper', 'darkCopper', 'iron', 'gold'].includes(key) ? 0.25 : 0,
    flatShading: true,
  })]),
);
materials.window = new THREE.MeshStandardMaterial({ color: 0xffe8a2, emissive: 0xffc766, emissiveIntensity: 0.45, roughness: 0.6 });
materials.magic = new THREE.MeshStandardMaterial({ color: 0xd3b3ff, emissive: 0x9570dc, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.15, flatShading: true });
materials.frost = new THREE.MeshStandardMaterial({ color: 0x9aeeee, emissive: 0x47bfca, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.15, flatShading: true });
materials.healing = new THREE.MeshStandardMaterial({ color: 0xa6dda0, emissive: 0x6caf70, emissiveIntensity: 0.35, roughness: 0.4, flatShading: true });
materials.enemyEye = new THREE.MeshStandardMaterial({ color: 0xffc076, emissive: 0xff6e42, emissiveIntensity: 0.85, roughness: 0.4 });
materials.black = new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.9 });
materials.cloth = new THREE.MeshStandardMaterial({ color: 0xe88c66, roughness: 1, side: THREE.DoubleSide, flatShading: true });

const propCache = new Map();
const propMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.83, metalness: 0.06, flatShading: true });
propMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    '#include <common>\nattribute vec3 propEmission;\nvarying vec3 vPropEmission;',
  ).replace('#include <begin_vertex>', '#include <begin_vertex>\nvPropEmission = propEmission;');
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>', '#include <common>\nvarying vec3 vPropEmission;',
  ).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vPropEmission;');
};
propMaterial.customProgramCacheKey = () => 'pocket-citadel-vertex-color-emission-v1';

const bevelOutline = new THREE.Shape();
bevelOutline.moveTo(-0.44, -0.44);
bevelOutline.lineTo(0.44, -0.44);
bevelOutline.lineTo(0.44, 0.44);
bevelOutline.lineTo(-0.44, 0.44);
bevelOutline.closePath();
const bevelBlock = new THREE.ExtrudeGeometry(bevelOutline, {
  depth: 0.88, steps: 1, bevelEnabled: true,
  bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1,
}).translate(0, 0, -0.44);

const gable = new THREE.BufferGeometry();
gable.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5,
  -0.5, 0.5, 0, 0.5, 0.5, 0,
], 3));
gable.setIndex([0, 4, 5, 0, 5, 1, 2, 3, 5, 2, 5, 4, 0, 2, 4, 1, 5, 3, 0, 1, 3, 0, 3, 2]);
gable.computeVertexNormals();

const pennant = new THREE.BufferGeometry();
pennant.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, 0.34, 0, 0.035, 0, -0.12, 0], 3));
pennant.computeVertexNormals();

const geometry = {
  block: bevelBlock,
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  taper: new THREE.CylinderGeometry(0.73, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  roof: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.IcosahedronGeometry(1, 0),
  crystal: new THREE.OctahedronGeometry(1, 0),
  ring: new THREE.TorusGeometry(1, 0.12, 5, 16),
  slimRing: new THREE.TorusGeometry(1, 0.035, 4, 24),
  horn: new THREE.TorusGeometry(1, 0.22, 5, 12, Math.PI * 1.45),
  gable,
  pennant,
};

const crescentOutline = new THREE.Shape();
const arcSteps = 32;
for (let i = 0; i <= arcSteps; i += 1) {
  const angle = -1.98 + (3.96 * i) / arcSteps;
  const x = Math.sin(angle) * 1.25;
  const y = Math.cos(angle) * 1.25;
  if (i === 0) crescentOutline.moveTo(x, y);
  else crescentOutline.lineTo(x, y);
}
for (let i = arcSteps; i >= 0; i -= 1) {
  const angle = -1.98 + (3.96 * i) / arcSteps;
  crescentOutline.lineTo(Math.sin(angle) * 0.98, Math.cos(angle) * 0.98);
}
crescentOutline.closePath();
geometry.crescent = new THREE.ExtrudeGeometry(crescentOutline, {
  depth: 0.14, steps: 1, bevelEnabled: true,
  bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 1,
}).rotateX(-Math.PI / 2);

function piece(parent, shape, material, position, scale, rotation) {
  const mesh = new THREE.Mesh(geometry[shape], materials[material]);
  if (position) mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = !['window', 'magic', 'frost', 'enemyEye'].includes(material);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function windRotor(parent, y, z, size = 1) {
  const rotor = new THREE.Group();
  rotor.position.set(0, y, z);
  rotor.scale.setScalar(size);
  piece(rotor, 'box', 'wood', [0, 0, 0], [0.06, 1.02, 0.07], [0, 0, Math.PI / 4]);
  piece(rotor, 'box', 'wood', [0, 0, 0], [0.06, 1.02, 0.07], [0, 0, -Math.PI / 4]);
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    piece(rotor, 'box', 'lightStone', [Math.sin(angle) * 0.33, Math.cos(angle) * 0.33, 0.015], [0.2, 0.3, 0.045], [0, 0, -angle]);
  }
  piece(rotor, 'sphere', 'copper', [0, 0, 0.075], [0.105, 0.105, 0.07]);
  parent.add(rotor);
  return rotor;
}

function cannonAssembly(parent, position, size = 1) {
  const turret = new THREE.Group();
  turret.position.set(...position);
  turret.scale.setScalar(size);
  piece(turret, 'sphere', 'copper', [0, 0, 0], [0.24, 0.2, 0.24]);
  const barrel = piece(turret, 'cylinder', 'iron', [0, 0.07, 0.29], [0.125, 0.55, 0.125], [Math.PI / 2, 0, 0]);
  piece(turret, 'ring', 'copper', [0, 0.07, 0.57], [0.142, 0.142, 0.142]);
  piece(turret, 'cylinder', 'black', [0, 0.07, 0.568], [0.105, 0.006, 0.105], [Math.PI / 2, 0, 0]);
  turret.userData.barrel = barrel;
  turret.userData.muzzle = new THREE.Vector3(0, 0.07, 0.61);
  parent.add(turret);
  return turret;
}

function walkingLeg(parent, x, y, z, phase, size = 1, armor = 'darkCopper') {
  const leg = new THREE.Group();
  const side = x < 0 ? -1 : 1;
  leg.position.set(x, y, z);
  piece(leg, 'block', armor, [side * 0.12 * size, -0.065 * size, 0], [0.34 * size, 0.14 * size, 0.18 * size], [0, 0, -side * 0.28]);
  piece(leg, 'block', 'iron', [side * 0.25 * size, -0.27 * size, 0.04 * size], [0.16 * size, 0.36 * size, 0.22 * size], [0, 0, side * 0.16]);
  leg.userData.phase = phase;
  parent.add(leg);
  return leg;
}

function mergeStaticPropMeshes(parent, animatedMeshes = new Set()) {
  const meshes = parent.children.filter(child => child.isMesh && !animatedMeshes.has(child));
  if (!meshes.length) return;
  const bakedGeometry = [];
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const baked = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    baked.applyMatrix4(mesh.matrix);
    for (const attribute of Object.keys(baked.attributes)) {
      if (attribute !== 'position' && attribute !== 'normal') baked.deleteAttribute(attribute);
    }
    const count = baked.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const emission = new Float32Array(count * 3);
    const surfaceColor = mesh.material.color;
    const lightColor = mesh.material.emissive;
    const intensity = mesh.material.emissiveIntensity || 0;
    for (let i = 0; i < count; i += 1) {
      colors.set([surfaceColor.r, surfaceColor.g, surfaceColor.b], i * 3);
      if (lightColor && intensity) emission.set([lightColor.r * intensity, lightColor.g * intensity, lightColor.b * intensity], i * 3);
    }
    baked.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    baked.setAttribute('propEmission', new THREE.BufferAttribute(emission, 3));
    baked.clearGroups();
    bakedGeometry.push(baked);
  }
  const mergedGeometry = mergeGeometries(bakedGeometry, false);
  mergedGeometry.computeBoundingBox();
  mergedGeometry.computeBoundingSphere();
  const merged = new THREE.Mesh(mergedGeometry, propMaterial);
  merged.name = 'baked-prop';
  merged.castShadow = meshes.some(mesh => mesh.castShadow);
  merged.receiveShadow = true;
  parent.remove(...meshes);
  parent.add(merged);
  for (const baked of bakedGeometry) baked.dispose();
}

function clonePropAsset(template) {
  const group = template.clone(true);
  group.userData.rotors = [];
  group.userData.crystals = [];
  group.userData.cannonBarrels = [];
  group.traverse(node => {
    switch (node.userData.propRole) {
      case 'rotor':
        group.userData.rotors.push(node);
        break;
      case 'crystal':
        group.userData.crystals.push(node);
        break;
      case 'cannon':
        group.userData.cannonBarrels.push(node);
        node.userData.muzzle = new THREE.Vector3().fromArray(node.userData.muzzleCoordinates);
        break;
      case 'barrel':
        node.parent.userData.barrel = node;
        break;
      default:
        break;
    }
  });
  return group;
}

export function createProp(kind, variant = 0) {
  const cacheKey = `${kind}:${variant}`;
  const cached = propCache.get(cacheKey);
  if (cached) return clonePropAsset(cached);
  const group = new THREE.Group();
  group.name = kind;
  group.userData.kind = kind;
  group.userData.baseY = 0;
  group.userData.rotors = [];
  group.userData.crystals = [];
  group.userData.cannonBarrels = [];
  const roofMaterial = variant % 3 === 1 ? 'copper' : 'teal';

  switch (kind) {
    case 'tree': {
      piece(group, 'cylinder', 'bark', [0, 0.27, 0], [0.075, 0.54, 0.075]);
      if (variant % 3 === 1) {
        piece(group, 'sphere', 'leaf', [0, 0.67, 0], [0.38, 0.37, 0.36]);
        piece(group, 'sphere', 'lightLeaf', [-0.14, 0.76, 0.055], [0.25, 0.24, 0.26]);
      } else {
        piece(group, 'cone', 'darkLeaf', [0, 0.48, 0], [0.34, 0.53, 0.34]);
        piece(group, 'cone', 'leaf', [0, 0.71, 0], [0.27, 0.49, 0.27]);
        piece(group, 'cone', 'lightLeaf', [0, 0.91, 0], [0.18, 0.4, 0.18]);
      }
      break;
    }
    case 'house': {
      piece(group, 'block', 'darkStone', [0, 0.07, 0], [0.79, 0.13, 0.64]);
      piece(group, 'block', 'limestone', [0, 0.35, 0], [0.69, 0.53, 0.55]);
      piece(group, 'gable', roofMaterial, [0, 0.61, 0], [0.86, 0.67, 0.77]);
      piece(group, 'block', 'darkCopper', [0.1, 0.24, 0.29], [0.18, 0.29, 0.035]);
      piece(group, 'box', 'window', [-0.19, 0.43, 0.283], [0.12, 0.14, 0.025]);
      piece(group, 'box', 'window', [0.357, 0.42, 0.03], [0.025, 0.14, 0.15]);
      piece(group, 'block', 'darkStone', [-0.23, 0.83, -0.09], [0.105, 0.35, 0.125]);
      break;
    }
    case 'rock': {
      piece(group, 'rock', variant % 2 ? 'darkStone' : 'limestone', [0, 0.19, 0], [0.36, 0.28, 0.29], [0.1, variant * 0.7, 0.15]);
      piece(group, 'rock', 'darkStone', [0.23, 0.08, 0.08], [0.14, 0.12, 0.13]);
      break;
    }
    case 'crate': {
      piece(group, 'block', 'wood', [0, 0.21, 0], [0.4, 0.42, 0.38]);
      piece(group, 'box', 'copper', [-0.11, 0.21, 0], [0.035, 0.44, 0.4]);
      piece(group, 'box', 'copper', [0.11, 0.21, 0], [0.035, 0.44, 0.4]);
      break;
    }
    case 'sheep': {
      piece(group, 'sphere', 'lightStone', [0, 0.31, 0], [0.27, 0.22, 0.34]);
      piece(group, 'sphere', 'iron', [0, 0.32, 0.3], [0.14, 0.16, 0.16]);
      for (const x of [-0.15, 0.15]) {
        for (const z of [-0.16, 0.17]) piece(group, 'box', 'wood', [x, 0.115, z], [0.055, 0.23, 0.06]);
      }
      piece(group, 'box', 'iron', [0, 0.37, 0.29], [0.39, 0.055, 0.1]);
      break;
    }
    case 'workshop': {
      piece(group, 'block', 'darkStone', [0, 0.1, 0], [0.73, 0.2, 0.67]);
      piece(group, 'block', 'limestone', [0, 0.42, 0], [0.64, 0.52, 0.58]);
      piece(group, 'gable', 'copper', [0, 0.67, 0], [0.78, 0.42, 0.71]);
      piece(group, 'cylinder', 'iron', [-0.23, 0.82, -0.11], [0.092, 0.62, 0.092]);
      piece(group, 'cylinder', 'copper', [-0.23, 1.14, -0.11], [0.125, 0.09, 0.125]);
      piece(group, 'block', 'iron', [0, 0.34, 0.31], [0.29, 0.28, 0.08]);
      piece(group, 'box', 'window', [0, 0.35, 0.355], [0.19, 0.15, 0.015]);
      piece(group, 'ring', 'copper', [0.33, 0.43, 0.02], [0.19, 0.19, 0.19], [0, Math.PI / 2, 0]);
      break;
    }
    case 'clock': {
      piece(group, 'cylinder', 'darkStone', [0, 0.09, 0], [0.36, 0.18, 0.36]);
      piece(group, 'taper', 'limestone', [0, 0.57, 0], [0.26, 0.86, 0.26]);
      piece(group, 'cone', 'teal', [0, 1.14, 0], [0.4, 0.38, 0.4]);
      piece(group, 'cylinder', 'lightStone', [0, 0.77, 0.233], [0.16, 0.038, 0.16], [Math.PI / 2, 0, 0]);
      piece(group, 'box', 'iron', [0, 0.807, 0.258], [0.022, 0.095, 0.013]);
      piece(group, 'box', 'iron', [0.041, 0.763, 0.258], [0.1, 0.022, 0.013], [0, 0, -0.36]);
      piece(group, 'sphere', 'gold', [0, 1.35, 0], [0.06, 0.08, 0.06]);
      break;
    }
    case 'windmill': {
      piece(group, 'cylinder', 'darkStone', [0, 0.09, 0], [0.36, 0.18, 0.36]);
      piece(group, 'taper', 'limestone', [0, 0.57, 0], [0.29, 0.81, 0.29]);
      piece(group, 'cone', 'teal', [0, 1.09, 0], [0.36, 0.32, 0.36]);
      group.userData.rotors.push(windRotor(group, 0.9, 0.285));
      break;
    }
    case 'iceTower': {
      piece(group, 'cylinder', 'darkTeal', [0, 0.1, 0], [0.34, 0.2, 0.34]);
      piece(group, 'cylinder', 'lightStone', [0, 0.25, 0], [0.27, 0.12, 0.27]);
      group.userData.crystals.push(piece(group, 'crystal', 'frost', [0, 0.76, 0], [0.21, 0.61, 0.21], [0, 0.3, 0.08]));
      piece(group, 'crystal', 'ice', [-0.2, 0.46, 0.04], [0.1, 0.32, 0.11], [0, 0, 0.3]);
      piece(group, 'crystal', 'ice', [0.19, 0.42, 0.06], [0.1, 0.28, 0.1], [0, 0, -0.4]);
      piece(group, 'ring', 'gold', [0, 0.39, 0], [0.22, 0.22, 0.22], [Math.PI / 2, 0, 0]);
      break;
    }
    case 'cannonTower': {
      piece(group, 'cylinder', 'darkCopper', [0, 0.11, 0], [0.36, 0.22, 0.36]);
      piece(group, 'taper', 'limestone', [0, 0.4, 0], [0.29, 0.44, 0.29]);
      piece(group, 'cylinder', 'copper', [0, 0.65, 0], [0.32, 0.1, 0.32]);
      group.userData.cannonBarrels.push(cannonAssembly(group, [0, 0.81, 0]));
      break;
    }
    case 'healing': {
      piece(group, 'cylinder', 'darkStone', [0, 0.08, 0], [0.25, 0.16, 0.25]);
      piece(group, 'sphere', 'healing', [0, 0.37, 0], [0.22, 0.26, 0.22]);
      piece(group, 'cylinder', 'healing', [0, 0.6, 0], [0.09, 0.17, 0.09]);
      piece(group, 'cylinder', 'gold', [0, 0.7, 0], [0.115, 0.08, 0.115]);
      piece(group, 'box', 'lightStone', [0, 0.36, 0.214], [0.17, 0.055, 0.02]);
      piece(group, 'box', 'lightStone', [0, 0.36, 0.215], [0.055, 0.17, 0.02]);
      break;
    }
    case 'core': {
      piece(group, 'cylinder', 'darkTeal', [0, 0.1, 0], [0.32, 0.2, 0.32]);
      piece(group, 'cylinder', 'gold', [0, 0.23, 0], [0.25, 0.07, 0.25]);
      group.userData.crystals.push(piece(group, 'crystal', 'magic', [0, 0.68, 0], [0.25, 0.4, 0.25], [0, Math.PI / 4, 0]));
      piece(group, 'slimRing', 'gold', [0, 0.68, 0], [0.43, 0.43, 0.43], [Math.PI / 2.8, 0.2, 0]);
      break;
    }
    case 'relic': {
      piece(group, 'cylinder', 'darkStone', [0, 0.1, 0], [0.4, 0.2, 0.4]);
      piece(group, 'taper', 'limestone', [0, 0.4, 0], [0.25, 0.47, 0.25]);
      piece(group, 'ring', 'gold', [0, 0.95, 0], [0.37, 0.42, 0.37]);
      group.userData.crystals.push(piece(group, 'crystal', 'magic', [0, 0.95, 0], [0.18, 0.29, 0.18]));
      piece(group, 'sphere', 'frost', [-0.36, 0.95, 0], [0.07, 0.07, 0.07]);
      piece(group, 'sphere', 'frost', [0.36, 0.95, 0], [0.07, 0.07, 0.07]);
      break;
    }
    default:
      piece(group, 'rock', 'limestone', [0, 0.2, 0], [0.28, 0.25, 0.28]);
  }

  const animatedMeshes = new Set(group.userData.crystals);
  for (const rotor of group.userData.rotors) {
    rotor.userData.propRole = 'rotor';
    mergeStaticPropMeshes(rotor);
  }
  for (const crystal of group.userData.crystals) {
    crystal.userData.baseY = crystal.position.y;
    crystal.userData.propRole = 'crystal';
  }
  for (const turret of group.userData.cannonBarrels) {
    const barrel = turret.userData.barrel;
    barrel.userData.propRole = 'barrel';
    turret.userData.propRole = 'cannon';
    turret.userData.muzzleCoordinates = turret.userData.muzzle.toArray();
    delete turret.userData.barrel;
    delete turret.userData.muzzle;
    mergeStaticPropMeshes(turret, new Set([barrel]));
  }
  mergeStaticPropMeshes(group, animatedMeshes);
  group.userData = { kind, baseY: 0 };
  propCache.set(cacheKey, group);
  return clonePropAsset(group);
}

export function createPlayer() {
  const group = new THREE.Group();
  group.name = 'swallow-citadel';
  const citadel = new THREE.Group();
  group.add(citadel);
  const underside = piece(citadel, 'crescent', 'darkTeal', [0, 0.21, 0], [1, 1.35, 1]);
  const platform = piece(citadel, 'crescent', 'limestone', [0, 0.42, 0]);
  const trim = piece(citadel, 'crescent', 'copper', [0, 0.4, 0], [1.015, 0.2, 1.015]);
  const battlements = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = -1.84 + i * 0.46;
    const mesh = piece(citadel, 'block', 'lightStone', [0, 0.65, 0], [0.19, 0.16, 0.14], [0, -angle, 0]);
    mesh.userData.angle = angle;
    battlements.push(mesh);
  }

  const keep = new THREE.Group();
  piece(keep, 'taper', 'limestone', [0, 0.35, 0], [0.38, 0.7, 0.34]);
  piece(keep, 'cylinder', 'darkTeal', [0, 0.69, 0], [0.42, 0.12, 0.38]);
  piece(keep, 'cone', 'teal', [0, 0.91, 0], [0.52, 0.43, 0.47]);
  piece(keep, 'block', 'darkCopper', [0, 0.29, 0.32], [0.23, 0.4, 0.04]);
  piece(keep, 'box', 'window', [0, 0.41, 0.347], [0.095, 0.13, 0.02]);
  const orb = piece(keep, 'crystal', 'magic', [0, 1.24, 0], [0.14, 0.2, 0.14]);
  piece(keep, 'slimRing', 'gold', [0, 1.25, 0], [0.25, 0.25, 0.25], [Math.PI / 2.7, 0, 0]);
  citadel.add(keep);

  const wind = createProp('windmill');
  const cannon = createProp('cannonTower');
  const ice = createProp('iceTower');
  const moduleGroups = { wind, cannon, ice };
  const moduleAngles = { wind: -1.62, cannon: 1.62, ice: -0.76 };
  for (const [kind, module] of Object.entries(moduleGroups)) {
    module.userData.angle = moduleAngles[kind];
    module.userData.tierParts = [];
    module.visible = false;
    citadel.add(module);
  }
  const cannonTier = piece(cannon, 'box', 'copper', [0, 0.44, 0.29], [0.34, 0.16, 0.07]);
  cannon.userData.tierParts.push({ mesh: cannonTier, tier: 2 });
  const cannonCrystal = piece(cannon, 'crystal', 'magic', [0, 0.46, 0.35], [0.085, 0.13, 0.065]);
  cannon.userData.tierParts.push({ mesh: cannonCrystal, tier: 3 });
  const windTier = piece(wind, 'ring', 'gold', [0, 0.41, 0], [0.28, 0.28, 0.28], [Math.PI / 2, 0, 0]);
  wind.userData.tierParts.push({ mesh: windTier, tier: 2 });
  const windCrystal = piece(wind, 'crystal', 'frost', [0, 1.4, 0], [0.09, 0.19, 0.09]);
  wind.userData.tierParts.push({ mesh: windCrystal, tier: 3 });
  const iceTier = piece(ice, 'crystal', 'frost', [-0.17, 0.78, -0.09], [0.13, 0.47, 0.13], [0, 0, 0.25]);
  ice.userData.tierParts.push({ mesh: iceTier, tier: 2 });
  const iceCrown = piece(ice, 'ring', 'magic', [0, 0.92, 0], [0.31, 0.31, 0.31], [Math.PI / 2, 0, 0]);
  ice.userData.tierParts.push({ mesh: iceCrown, tier: 3 });

  const banner = new THREE.Group();
  piece(banner, 'cylinder', 'wood', [0, 0.39, 0], [0.025, 0.78, 0.025]);
  const flag = piece(banner, 'pennant', 'cloth', [0, 0.65, 0], [1, 1, 1]);
  citadel.add(banner);

  const evolutionGroup = new THREE.Group();
  const evolutionRings = [];
  for (let i = 0; i < 3; i += 1) {
    const ring = piece(evolutionGroup, 'slimRing', i === 1 ? 'frost' : 'magic', [0, 0, 0], [0.28 + i * 0.11, 0.28 + i * 0.11, 0.28 + i * 0.11], [Math.PI / 2, 0, 0]);
    evolutionRings.push(ring);
  }
  evolutionGroup.visible = false;
  citadel.add(evolutionGroup);

  group.userData = {
    baseY: 0, citadel, platform, underside, trim, battlements, keep, orb,
    moduleGroups, cannonBarrels: cannon.userData.cannonBarrels,
    windRotors: wind.userData.rotors, banner, flag, evolutionGroup, evolutionRings,
  };
  updatePlayer(group, { radius: 1.15, modules: {}, time: 0, moving: false, evolution: null });
  return group;
}

export function updatePlayer(group, { radius = 1.15, modules = {}, time = 0, moving = false, evolution = null } = {}) {
  const data = group.userData;
  const bodyScale = 0.68 + Math.min(radius, 4.5) * 0.19;
  data.citadel.position.y = Math.sin(time * 2.4) * 0.034;
  data.citadel.rotation.z = moving ? Math.sin(time * 7) * 0.012 : Math.sin(time * 1.7) * 0.008;
  data.platform.scale.set(radius, 1, radius);
  data.underside.scale.set(radius, 1.35, radius);
  data.trim.scale.set(radius * 1.015, 0.2, radius * 1.015);
  for (const merlon of data.battlements) {
    const angle = merlon.userData.angle;
    merlon.position.x = Math.sin(angle) * radius * 1.22;
    merlon.position.z = -Math.cos(angle) * radius * 1.22;
    merlon.scale.set(0.19 * bodyScale, 0.16 * bodyScale, 0.14 * bodyScale);
  }
  data.keep.position.set(0, 0.57, -radius * 1.12);
  data.keep.scale.set(bodyScale * 1.1, bodyScale * 1.22, bodyScale * 1.1);
  data.orb.rotation.y = time * 0.7;
  data.orb.position.y = 1.24 + Math.sin(time * 2) * 0.065;

  for (const [kind, module] of Object.entries(data.moduleGroups)) {
    const level = Number(modules[kind]) || 0;
    module.visible = level > 0;
    if (level <= 0) continue;
    const angle = module.userData.angle;
    module.position.set(Math.sin(angle) * radius * 1.12, 0.57 + Math.sin(time * 2.2 + angle) * 0.025, -Math.cos(angle) * radius * 1.12);
    const moduleScale = bodyScale * (0.64 + Math.min(level, 3) * 0.08);
    module.scale.set(moduleScale * 1.06, moduleScale * 1.18, moduleScale * 1.06);
    for (const part of module.userData.tierParts) part.mesh.visible = level >= part.tier;
    for (const crystal of module.userData.crystals) {
      crystal.rotation.y = time * 0.4;
      crystal.position.y = crystal.userData.baseY + Math.sin(time * 2.1) * 0.045;
    }
  }
  for (const rotor of data.windRotors) rotor.rotation.z = -time * (1.2 + (Number(modules.wind) || 1) * 0.3);
  data.banner.position.set(Math.sin(0.76) * radius * 1.16, 0.56, -Math.cos(0.76) * radius * 1.16);
  data.banner.scale.setScalar(bodyScale);
  data.flag.rotation.y = Math.sin(time * 5) * 0.17;

  data.evolutionGroup.visible = Boolean(evolution);
  if (evolution) {
    const target = evolution === 'vortex' ? data.moduleGroups.cannon : evolution === 'shatter' ? data.moduleGroups.ice : data.moduleGroups.wind;
    data.evolutionGroup.position.copy(target.position);
    data.evolutionGroup.position.y += 1.2 * bodyScale;
    data.evolutionGroup.scale.setScalar(bodyScale);
    data.evolutionGroup.rotation.y = time * 0.3;
    for (let i = 0; i < data.evolutionRings.length; i += 1) {
      const ring = data.evolutionRings[i];
      ring.rotation.x = Math.PI / 2 + Math.sin(time * 1.1 + i) * 0.3;
      ring.position.y = Math.sin(time * 1.6 + i * 1.7) * 0.12;
    }
  }
}

export function createEnemy(kind) {
  const group = new THREE.Group();
  group.name = kind;
  const body = new THREE.Group();
  group.add(body);
  const legs = [];
  const cannonBarrels = [];
  const eyes = [];

  switch (kind) {
    case 'beetle': {
      piece(body, 'sphere', 'copper', [0, 0.59, 0], [0.58, 0.35, 0.6]);
      piece(body, 'sphere', 'teal', [0, 0.77, -0.08], [0.47, 0.22, 0.47]);
      piece(body, 'box', 'gold', [0, 0.92, -0.05], [0.055, 0.035, 0.49]);
      piece(body, 'block', 'iron', [0, 0.47, 0.52], [0.54, 0.3, 0.31]);
      for (const x of [-0.16, 0.16]) {
        eyes.push(piece(body, 'sphere', 'enemyEye', [x, 0.49, 0.686], [0.065, 0.065, 0.045]));
        piece(body, 'cone', 'darkCopper', [x * 1.5, 0.71, 0.59], [0.055, 0.29, 0.055], [0.18, 0, x < 0 ? 0.4 : -0.4]);
      }
      for (const x of [-0.44, 0.44]) {
        for (const z of [-0.35, 0.32]) legs.push(walkingLeg(group, x, 0.45, z, (x < 0 ? 0 : Math.PI) + (z < 0 ? Math.PI : 0)));
      }
      break;
    }
    case 'ram': {
      piece(body, 'sphere', 'iron', [0, 0.66, -0.1], [0.56, 0.4, 0.75]);
      piece(body, 'sphere', 'copper', [0, 0.86, -0.23], [0.47, 0.25, 0.52]);
      piece(body, 'block', 'darkTeal', [0, 0.61, 0.62], [0.66, 0.46, 0.52]);
      piece(body, 'block', 'limestone', [0, 0.79, 0.7], [0.68, 0.19, 0.43], [-0.18, 0, 0]);
      piece(body, 'block', 'iron', [0, 0.43, 0.83], [0.4, 0.18, 0.2]);
      for (const x of [-0.43, 0.43]) {
        piece(body, 'horn', 'lightStone', [x, 0.75, 0.57], [0.23, 0.23, 0.23], [0, Math.PI / 2, x < 0 ? -0.3 : 0.3]);
        eyes.push(piece(body, 'sphere', 'enemyEye', [x * 0.63, 0.7, 0.888], [0.05, 0.048, 0.025]));
        for (const z of [-0.42, 0.34]) legs.push(walkingLeg(group, x * 0.87, 0.46, z, (x < 0 ? 0 : Math.PI) + (z < 0 ? Math.PI : 0), 1, 'darkTeal'));
      }
      break;
    }
    case 'mortar': {
      piece(body, 'cylinder', 'darkCopper', [0, 0.51, 0], [0.64, 0.35, 0.64]);
      piece(body, 'block', 'limestone', [0, 0.81, 0], [0.62, 0.42, 0.52]);
      piece(body, 'block', 'teal', [0, 1.02, 0], [0.72, 0.13, 0.6]);
      const turret = new THREE.Group();
      turret.position.set(0, 0.98, 0);
      turret.rotation.x = 0.72;
      piece(turret, 'cylinder', 'iron', [0, 0.28, 0], [0.19, 0.59, 0.19]);
      piece(turret, 'ring', 'copper', [0, 0.58, 0], [0.21, 0.21, 0.21], [Math.PI / 2, 0, 0]);
      piece(turret, 'cylinder', 'black', [0, 0.577, 0], [0.16, 0.008, 0.16]);
      body.add(turret);
      cannonBarrels.push(turret);
      eyes.push(piece(body, 'box', 'enemyEye', [0, 0.8, 0.269], [0.26, 0.068, 0.018]));
      for (const x of [-0.48, 0.48]) {
        for (const z of [-0.36, 0.36]) legs.push(walkingLeg(group, x, 0.43, z, (x < 0 ? 0 : Math.PI) + (z < 0 ? Math.PI : 0), 1, 'copper'));
      }
      break;
    }
    case 'boss': {
      piece(body, 'cylinder', 'darkTeal', [0, 0.84, 0], [1.22, 0.3, 1.1]);
      piece(body, 'taper', 'limestone', [0, 1.12, 0], [1.2, 0.53, 1.06]);
      piece(body, 'cylinder', 'copper', [0, 1.41, 0], [1.21, 0.13, 1.09]);
      piece(body, 'taper', 'limestone', [0, 1.92, -0.14], [0.7, 0.97, 0.67]);
      piece(body, 'cone', 'teal', [0, 2.65, -0.14], [1.02, 0.67, 0.96]);
      piece(body, 'sphere', 'gold', [0, 3.01, -0.14], [0.105, 0.105, 0.105]);
      piece(body, 'ring', 'gold', [0, 1.87, 0.535], [0.37, 0.39, 0.2]);
      const core = piece(body, 'crystal', 'magic', [0, 1.87, 0.59], [0.25, 0.32, 0.17]);
      eyes.push(core);
      for (const x of [-0.85, 0.85]) {
        piece(body, 'cylinder', 'lightStone', [x, 1.58, 0.07], [0.28, 0.73, 0.28]);
        piece(body, 'cone', 'darkTeal', [x, 2.1, 0.07], [0.39, 0.38, 0.39]);
        piece(body, 'box', 'window', [x, 1.7, 0.329], [0.11, 0.2, 0.02]);
        for (const z of [-0.63, 0.6]) legs.push(walkingLeg(group, x * 1.16, 0.78, z, (x < 0 ? 0 : Math.PI) + (z < 0 ? Math.PI : 0), 1.7, 'darkTeal'));
      }
      const flagpole = piece(body, 'cylinder', 'wood', [0.45, 2.72, -0.38], [0.027, 0.65, 0.027]);
      const flag = piece(body, 'pennant', 'cloth', [0.45, 2.96, -0.38], [1.2, 1.2, 1.2]);
      group.userData.flag = flag;
      group.userData.core = core;
      flagpole.castShadow = false;
      break;
    }
    default:
      piece(body, 'sphere', 'copper', [0, 0.45, 0], [0.5, 0.45, 0.5]);
  }

  group.userData.kind = kind;
  group.userData.baseY = 0;
  group.userData.body = body;
  group.userData.legs = legs;
  group.userData.eyes = eyes;
  group.userData.cannonBarrels = cannonBarrels;
  for (const eye of eyes) eye.userData.restDepth = eye.scale.z;
  return group;
}

export function updateEnemy(group, kind, time = 0, speed = 0, telegraph = 0) {
  const data = group.userData;
  const motion = Math.min(Math.abs(speed), 2.5);
  const stride = Math.min(motion * 0.17, 0.31);
  const cadence = kind === 'boss' ? 5 : kind === 'ram' ? 9 : 8;
  const phase = time * cadence;
  for (const leg of data.legs) {
    const wave = phase + leg.userData.phase;
    leg.rotation.x = Math.sin(wave) * stride;
    leg.rotation.z = Math.cos(wave) * stride * 0.3;
  }
  data.body.position.y = Math.sin(phase * 2) * motion * 0.018 + Math.sin(time * 2) * 0.012;
  data.body.rotation.z = Math.sin(phase) * motion * 0.018;
  data.body.rotation.x = kind === 'ram' ? -telegraph * 0.13 : 0;
  if (telegraph > 0) {
    data.body.position.y -= Math.min(telegraph, 1) * 0.08;
    data.body.rotation.z += Math.sin(time * 42) * telegraph * 0.015;
  }
  for (const eye of data.eyes) eye.scale.z = eye.userData.restDepth * (1 + (telegraph > 0 ? Math.sin(time * 18) * 0.15 : 0));
  if (kind === 'boss' && data.core) {
    data.core.rotation.y = Math.sin(time * 1.3) * 0.3;
    data.core.scale.set(0.25, 0.32, 0.17 + Math.sin(time * 2.3) * 0.015);
    data.flag.rotation.y = Math.sin(time * 4.2) * 0.2;
  }
}

export function createScenery(kind) {
  const group = new THREE.Group();
  group.name = `scenery-${kind}`;
  group.userData.baseY = 0;
  switch (kind) {
    case 'grass':
      piece(group, 'cone', 'darkLeaf', [-0.05, 0.12, 0], [0.045, 0.24, 0.025], [0, 0, 0.25]);
      piece(group, 'cone', 'leaf', [0.035, 0.08, 0.025], [0.03, 0.16, 0.02], [0, 0, -0.3]);
      break;
    case 'flower':
      piece(group, 'box', 'darkLeaf', [0, 0.115, 0], [0.021, 0.23, 0.021]);
      piece(group, 'sphere', 'lavender', [0, 0.23, 0], [0.09, 0.05, 0.09]);
      piece(group, 'sphere', 'gold', [0, 0.27, 0], [0.031, 0.02, 0.031]);
      break;
    case 'fence':
      piece(group, 'block', 'wood', [-0.35, 0.23, 0], [0.07, 0.46, 0.07]);
      piece(group, 'block', 'wood', [0.35, 0.23, 0], [0.07, 0.46, 0.07]);
      piece(group, 'box', 'darkStone', [0, 0.3, 0], [0.8, 0.085, 0.05]);
      piece(group, 'box', 'darkStone', [0, 0.13, 0], [0.8, 0.085, 0.05]);
      break;
    case 'lamp':
      piece(group, 'cylinder', 'iron', [0, 0.43, 0], [0.038, 0.86, 0.038]);
      piece(group, 'block', 'window', [0, 0.93, 0], [0.17, 0.22, 0.17]);
      piece(group, 'roof', 'darkTeal', [0, 1.08, 0], [0.19, 0.15, 0.19]);
      piece(group, 'cylinder', 'copper', [0, 0.82, 0], [0.13, 0.065, 0.13]);
      break;
    case 'banner':
      piece(group, 'cylinder', 'wood', [0, 0.53, 0], [0.027, 1.06, 0.027]);
      piece(group, 'pennant', 'cloth', [0, 0.92, 0], [1.5, 1.5, 1.5]);
      piece(group, 'sphere', 'gold', [0, 1.08, 0], [0.05, 0.05, 0.05]);
      break;
    case 'ruin':
      piece(group, 'block', 'darkStone', [0, 0.13, 0], [0.6, 0.26, 0.44]);
      piece(group, 'block', 'limestone', [-0.17, 0.45, 0.02], [0.24, 0.43, 0.35], [0, 0, 0.09]);
      piece(group, 'rock', 'darkStone', [0.34, 0.11, 0.2], [0.23, 0.15, 0.19]);
      break;
    default:
      break;
  }
  return group;
}
