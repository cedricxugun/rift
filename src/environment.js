import * as THREE from 'three';

const blockOutline = new THREE.Shape();
blockOutline.moveTo(-0.46, -0.46);
blockOutline.lineTo(0.46, -0.46);
blockOutline.lineTo(0.46, 0.46);
blockOutline.lineTo(-0.46, 0.46);
blockOutline.closePath();
const blockGeometry = new THREE.ExtrudeGeometry(blockOutline, {
  depth: 0.92, steps: 1, bevelEnabled: true,
  bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1,
}).translate(0, 0, -0.46);

const grassGeometry = new THREE.BufferGeometry();
grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.1, 0, 0, 0.09, 0, 0, -0.065, 0.37, 0.015,
  0, 0, -0.09, 0, 0, 0.08, 0.045, 0.29, 0.02,
  -0.055, 0, -0.055, 0.055, 0, 0.055, 0.13, 0.22, 0.07,
], 3));
grassGeometry.computeVertexNormals();

const geometry = {
  block: blockGeometry,
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 6),
  pyramid: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4),
  rock: new THREE.IcosahedronGeometry(1, 0),
  circle: new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2),
  ring: new THREE.TorusGeometry(1, 0.18, 5, 12),
  grass: grassGeometry,
};

const meadowColor = new THREE.Color(0xa9bf8c);
const foundryColor = new THREE.Color(0xc0ac8c);
const keepColor = new THREE.Color(0xaebfb3);

function random(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function biomeColor(z) {
  const color = meadowColor.clone();
  color.lerp(foundryColor, THREE.MathUtils.smoothstep(-z, 13, 21));
  color.lerp(keepColor, THREE.MathUtils.smoothstep(-z, 43, 52));
  return color;
}

function clipGround(material, holeUniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.environmentHoleCenter = holeUniforms.center;
    shader.uniforms.environmentHoleRadius = holeUniforms.radius;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 environmentWorldPosition;',
    ).replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vec4 environmentPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        environmentPosition = instanceMatrix * environmentPosition;
      #endif
      environmentWorldPosition = (modelMatrix * environmentPosition).xyz;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 environmentWorldPosition;
      uniform vec2 environmentHoleCenter;
      uniform float environmentHoleRadius;`,
    ).replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      if (distance(environmentWorldPosition.xz, environmentHoleCenter) < environmentHoleRadius) discard;`,
    );
  };
  material.customProgramCacheKey = () => 'pocket-citadel-environment-hole-v1';
  return material;
}

function roadRibbon(curve, width, y) {
  const positions = [];
  const indices = [];
  const uv = [];
  const count = 100;
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const halfWidth = width * (1 + Math.sin(t * 29) * 0.035) * 0.5;
    for (const side of [-1, 1]) {
      const x = point.x + normal.x * halfWidth * side;
      const z = point.z + normal.z * halfWidth * side;
      positions.push(x, y, z);
      uv.push(x / 10, z / 10);
    }
    if (i < count) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ribbon.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  ribbon.setIndex(indices);
  ribbon.computeVertexNormals();
  return ribbon;
}

function instance(batches, shape, material, position, scale, color, rotation = [0, 0, 0]) {
  const key = `${shape}:${material}`;
  if (!batches.has(key)) batches.set(key, { shape, material, items: [] });
  batches.get(key).items.push({ position, scale, color, rotation });
}

export function createEnvironment(holeUniforms) {
  const group = new THREE.Group();
  group.name = 'three-kingdom-island';
  const batches = new Map();

  const grainData = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i += 1) {
    const grain = 239 + Math.floor(random(i + 61) * 16);
    grainData.set([grain, grain, grain, 255], i * 4);
  }
  const grain = new THREE.DataTexture(grainData, 64, 64, THREE.RGBAFormat);
  grain.wrapS = THREE.RepeatWrapping;
  grain.wrapT = THREE.RepeatWrapping;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.needsUpdate = true;

  const materials = {
    ground: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: grain, roughness: 1 }),
    cliff: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true }),
    road: new THREE.MeshStandardMaterial({ color: 0xe8dcbf, map: grain, roughness: 1 }),
    roadEdge: new THREE.MeshStandardMaterial({ color: 0xb9aa8d, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
    vegetation: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true }),
    metal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.63, metalness: 0.2, flatShading: true }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffe9b3, emissive: 0xffc871, emissiveIntensity: 0.65, roughness: 0.5 }),
    patches: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  };
  for (const material of Object.values(materials)) clipGround(material, holeUniforms);

  const groundGeometry = new THREE.PlaneGeometry(42, 106, 14, 36).rotateX(-Math.PI / 2).translate(0, 0, -32);
  const groundColors = [];
  const groundPositions = groundGeometry.attributes.position;
  const groundUV = groundGeometry.attributes.uv;
  for (let i = 0; i < groundPositions.count; i += 1) {
    const x = groundPositions.getX(i);
    const z = groundPositions.getZ(i);
    const color = biomeColor(z).multiplyScalar(0.98 + random(i * 5 + 91) * 0.04);
    groundColors.push(color.r, color.g, color.b);
    groundUV.setXY(i, x / 11, z / 11);
  }
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));
  const ground = new THREE.Mesh(groundGeometry, materials.ground);
  ground.name = 'meadow-foundry-keep-ground';
  ground.receiveShadow = true;
  group.add(ground);

  // Only side faces: a bottom plane would incorrectly seal the swallow opening.
  const cliffPositions = [];
  const cliffColors = [];
  const cliffIndices = [];
  const perimeter = [];
  for (let i = 0; i <= 10; i += 1) perimeter.push(new THREE.Vector2(-21 + i * 4.2, 21));
  for (let i = 1; i <= 26; i += 1) perimeter.push(new THREE.Vector2(21, 21 - (i * 106) / 26));
  for (let i = 1; i <= 10; i += 1) perimeter.push(new THREE.Vector2(21 - i * 4.2, -85));
  for (let i = 1; i < 26; i += 1) perimeter.push(new THREE.Vector2(-21, -85 + (i * 106) / 26));
  for (let i = 0; i < perimeter.length; i += 1) {
    const point = perimeter[i];
    const next = perimeter[(i + 1) % perimeter.length];
    const depth = 1.45 + random(i + 37) * 0.42;
    const base = cliffPositions.length / 3;
    cliffPositions.push(point.x, 0, point.y, next.x, 0, next.y, point.x * 0.994, -depth, point.y, next.x * 0.994, -depth, next.y);
    cliffIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    const stone = biomeColor(point.y).lerp(new THREE.Color(0x7c807c), 0.58).multiplyScalar(0.94 + random(i + 101) * 0.12);
    const dark = stone.clone().multiplyScalar(0.72);
    cliffColors.push(stone.r, stone.g, stone.b, stone.r, stone.g, stone.b, dark.r, dark.g, dark.b, dark.r, dark.g, dark.b);
  }
  const cliffGeometry = new THREE.BufferGeometry();
  cliffGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cliffPositions, 3));
  cliffGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cliffColors, 3));
  cliffGeometry.setIndex(cliffIndices);
  cliffGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(cliffGeometry, materials.cliff));

  const road = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, 0, 21), new THREE.Vector3(-3.6, 0, 11),
    new THREE.Vector3(0.4, 0, 1), new THREE.Vector3(2.4, 0, -8),
    new THREE.Vector3(-1.8, 0, -19), new THREE.Vector3(-0.7, 0, -29),
    new THREE.Vector3(2.3, 0, -39), new THREE.Vector3(-1.8, 0, -49),
    new THREE.Vector3(0.3, 0, -60), new THREE.Vector3(0, 0, -72),
    new THREE.Vector3(0, 0, -85),
  ], false, 'catmullrom', 0.28);
  const roadEdge = new THREE.Mesh(roadRibbon(road, 3.0, 0.012), materials.roadEdge);
  const roadSurface = new THREE.Mesh(roadRibbon(road, 2.72, 0.024), materials.road);
  roadEdge.receiveShadow = true;
  roadSurface.receiveShadow = true;
  group.add(roadEdge, roadSurface);

  for (let i = 0; i < 85; i += 1) {
    const x = -19 + random(i * 7 + 23) * 38;
    const z = 18 - random(i * 11 + 19) * 100;
    const patchColor = biomeColor(z).multiplyScalar(i % 3 === 0 ? 0.94 : 1.035);
    instance(batches, 'circle', 'patches', [x, 0.004, z], [1.2 + random(i + 60) * 2.5, 1, 0.5 + random(i + 83) * 1.6], patchColor, [0, random(i + 73) * Math.PI, 0]);
  }

  for (let row = 0; row < 8; row += 1) {
    for (let col = -4; col <= 4; col += 1) {
      if (Math.abs(col) < 2 || random(row * 17 + col + 81) < 0.23) continue;
      const x = col * 3.05 + random(row + col + 89) * 0.17;
      const z = -53 - row * 3.75;
      const color = new THREE.Color(row % 3 ? 0xc2cbbd : 0xb9c5b8);
      instance(batches, 'box', 'plaster', [x, 0.022, z], [2.25, 0.044, 2.5], color);
    }
  }

  // Border furniture stays outside the arena, leaving the center for real pickups.
  const fireflyPositions = [];
  const steamPositions = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 29; i += 1) {
      const z = 18 - i * 3.5;
      const x = side * (16.15 + Math.sin(i * 1.8) * 0.1);
      const warm = z > -47 && z < -17;
      const curbColor = warm ? 0xb49c7a : z < -47 ? 0xc7cabc : 0xd1ccb0;
      instance(batches, 'block', 'plaster', [x, 0.1, z], [0.34, 0.2, 2.52], curbColor, [0, Math.sin(i * 1.8) * 0.025, 0]);
      if (i % 3 === 1) {
        const lampX = side * 17.5;
        instance(batches, 'cylinder', 'metal', [lampX, 0.52, z - 0.4], [0.035, 1.04, 0.035], 0x657469);
        instance(batches, 'block', 'lamp', [lampX, 1.12, z - 0.4], [0.18, 0.22, 0.18], 0xffffff);
        instance(batches, 'pyramid', 'metal', [lampX, 1.29, z - 0.4], [0.21, 0.14, 0.21], 0x477b74);
        instance(batches, 'cylinder', 'metal', [lampX, 0.045, z - 0.4], [0.15, 0.09, 0.15], 0x929c83);
      }
      if (z > -17 && i % 2 === 0) {
        const fenceX = side * 18.5;
        for (const dz of [-0.75, 0.75]) instance(batches, 'block', 'wood', [fenceX, 0.29, z + dz], [0.08, 0.58, 0.08], 0x9d8963);
        for (const y of [0.23, 0.44]) instance(batches, 'box', 'wood', [fenceX, y, z], [0.045, 0.075, 1.75], 0xc7b58a);
      }
      if (warm && i % 3 === 0) {
        const ventX = side * 19;
        instance(batches, 'block', 'plaster', [ventX, 0.16, z], [0.7, 0.32, 1.3], 0x9c8b73);
        instance(batches, 'cylinder', 'metal', [ventX, 0.54, z], [0.2, 0.66, 0.2], 0x9b6c4f);
        instance(batches, 'ring', 'metal', [ventX, 0.88, z], [0.22, 0.22, 0.22], 0xcc9b62, [Math.PI / 2, 0, 0]);
        for (let j = 0; j < 6; j += 1) steamPositions.push(ventX + (random(j + i) - 0.5) * 0.14, 0.94, z + (random(j * 2 + i) - 0.5) * 0.14);
      }
      if (z < -47 && i % 2 === 0) {
        const ruinX = side * (18.3 + random(i + 111) * 1.4);
        instance(batches, 'block', 'plaster', [ruinX, 0.12, z], [0.8, 0.24, 0.7], 0xb2beb3);
        instance(batches, 'cylinder', 'plaster', [ruinX, 0.6, z], [0.25, 0.8, 0.25], 0xd4d7c5);
        instance(batches, 'block', 'plaster', [ruinX, 1.0, z], [0.64, 0.14, 0.57], 0xd0d4bf, [0, random(i + 41), 0.06]);
        instance(batches, 'rock', 'plaster', [ruinX + side * 0.7, 0.12, z + 0.4], [0.33, 0.2, 0.26], 0xb2beb1);
      }
    }

    for (let i = 0; i < 220; i += 1) {
      const x = side * (16.6 + random(i * 5 + 43) * 3.7);
      const z = 19 - random(i * 7 + 61) * 103;
      const scale = 0.48 + random(i * 2 + 12) * 0.8;
      const grassColor = z > -17 ? (i % 2 ? 0x72966c : 0x8ca477) : z > -47 ? 0xa29675 : (i % 2 ? 0x8fa793 : 0x9ab39b);
      instance(batches, 'grass', 'vegetation', [x, 0.009, z], [scale, scale, scale], grassColor, [0, random(i * 3 + 7) * Math.PI, 0]);
      if (i % 4 === 0 && (z > -17 || z < -47)) {
        const flowerColor = i % 12 === 0 ? 0xe8c488 : z < -47 ? 0xc2cde0 : 0xc6afd0;
        instance(batches, 'rock', 'vegetation', [x, 0.18 * scale, z], [0.09 * scale, 0.05 * scale, 0.09 * scale], flowerColor);
        instance(batches, 'rock', 'vegetation', [x + 0.11, 0.15 * scale, z + 0.07], [0.07 * scale, 0.045 * scale, 0.07 * scale], flowerColor);
      }
      if (i % 19 === 0) {
        instance(batches, 'rock', 'plaster', [x, 0.11, z], [0.35, 0.2, 0.24], z < -47 ? 0x9fae9f : 0xa5a58b, [0, random(i + 34) * Math.PI, 0]);
      }
      if (i % 15 === 0) fireflyPositions.push(x, 0.4 + random(i + 67) * 0.6, z);
    }

    for (let i = 0; i < 14; i += 1) {
      const x = side * (19.7 + random(i + 8) * 0.7);
      const z = 15 - i * 7.2;
      if (z < -18 && z > -47) continue;
      const scale = 0.7 + random(i * 3 + 51) * 0.4;
      instance(batches, 'cylinder', 'wood', [x, 0.36 * scale, z], [0.11 * scale, 0.72 * scale, 0.11 * scale], 0x847658);
      instance(batches, 'cone', 'vegetation', [x, 0.9 * scale, z], [0.6 * scale, 1.1 * scale, 0.6 * scale], z > -18 ? 0x719572 : 0x7f9b91);
      instance(batches, 'cone', 'vegetation', [x, 1.35 * scale, z], [0.44 * scale, 0.84 * scale, 0.44 * scale], z > -18 ? 0x8fa676 : 0x9eb4a2);
    }
  }

  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (const [key, batch] of batches) {
    const mesh = new THREE.InstancedMesh(geometry[batch.shape], materials[batch.material], batch.items.length);
    mesh.name = `border-${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    for (let i = 0; i < batch.items.length; i += 1) {
      const item = batch.items[i];
      transform.position.set(...item.position);
      transform.scale.set(...item.scale);
      transform.rotation.set(...item.rotation);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      color.set(item.color);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  const ambientTime = { value: 0 };
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fireflyPositions, 3));
  const fireflyPhases = new Float32Array(fireflyPositions.length / 3);
  for (let i = 0; i < fireflyPhases.length; i += 1) fireflyPhases[i] = random(i + 13) * 6.28;
  fireflyGeometry.setAttribute('phase', new THREE.BufferAttribute(fireflyPhases, 1));
  const fireflyMaterial = new THREE.ShaderMaterial({
    uniforms: { time: ambientTime },
    transparent: true, depthWrite: false,
    vertexShader: `
      uniform float time;
      attribute float phase;
      varying float brightness;
      void main() {
        vec3 p = position;
        p.x += sin(time * 0.6 + phase) * 0.18;
        p.y += sin(time * 0.9 + phase) * 0.15;
        brightness = 0.35 + 0.5 * pow(sin(time * 0.6 + phase), 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 3.2;
      }`,
    fragmentShader: `
      varying float brightness;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = (1.0 - smoothstep(0.05, 0.5, d)) * brightness;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(1.0, 0.92, 0.63, alpha);
      }`,
  });
  group.add(new THREE.Points(fireflyGeometry, fireflyMaterial));

  if (steamPositions.length) {
    const steamGeometry = new THREE.BufferGeometry();
    steamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(steamPositions, 3));
    const steamPhases = new Float32Array(steamPositions.length / 3);
    for (let i = 0; i < steamPhases.length; i += 1) steamPhases[i] = random(i + 91);
    steamGeometry.setAttribute('phase', new THREE.BufferAttribute(steamPhases, 1));
    const steamMaterial = new THREE.ShaderMaterial({
      uniforms: { time: ambientTime },
      transparent: true, depthWrite: false,
      vertexShader: `
        uniform float time;
        attribute float phase;
        varying float life;
        void main() {
          life = fract(time * 0.18 + phase);
          vec3 p = position;
          p.y += life * 1.25;
          p.x += sin(life * 4.0 + phase * 12.0) * life * 0.15;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 6.0 + life * 10.0;
        }`,
      fragmentShader: `
        varying float life;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.05, 0.5, d)) * (1.0 - life) * 0.2;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(0.91, 0.87, 0.75, alpha);
        }`,
    });
    group.add(new THREE.Points(steamGeometry, steamMaterial));
  }

  group.userData.ambientTime = ambientTime;
  group.userData.holeUniforms = holeUniforms;
  group.userData.ground = ground;
  group.userData.road = roadSurface;
  group.userData.drawCalls = group.children.length;
  return group;
}

export function updateEnvironment(group, time = 0) {
  group.userData.ambientTime.value = time;
}
