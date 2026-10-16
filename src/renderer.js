import * as THREE from 'three';
import { createPlayer, updatePlayer, createProp, createEnemy, updateEnemy } from './art.js';
import { createEnvironment, updateEnvironment } from './environment.js';
import { canSwallow, SKILLS, EVOLUTIONS } from './rules.js';
import { t } from './i18n.js';
import { escapeHtml, icon } from './ui.js';

const temp = new THREE.Vector3();
const actorBounds = new THREE.Box3();
const actorSize = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const ringGeometry = new THREE.RingGeometry(.91, 1, 48);
const discGeometry = new THREE.CircleGeometry(1, 48);

export class WorldRenderer {
  constructor(canvas, overlay, settings) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.ctx = overlay.getContext('2d');
    this.settings = settings;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = settings.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e7e5d7');
    this.scene.fog = new THREE.Fog('#e7e5d7', 48, 98);
    this.camera = new THREE.OrthographicCamera(-15, 15, 12, -12, .1, 160);
    this.camera.position.set(0, 30, 24);
    this.camera.lookAt(0, 0, 0);
    this.look = new THREE.Vector3(window.innerWidth < 650 ? 0 : -6.3, 0, window.innerWidth < 650 ? 2 : 8);
    this.scene.add(new THREE.HemisphereLight('#fff6de', '#889575', 2.7));
    this.sun = new THREE.DirectionalLight('#fff3d8', 3.25);
    this.sun.position.set(-18, 32, 16);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 27, bottom: -27, near: 1, far: 85 });
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.bias = -.0004;
    this.sun.shadow.normalBias = .045;
    this.scene.add(this.sun, this.sun.target);
    this.holeUniforms = { center: { value: new THREE.Vector2(0, 7) }, radius: { value: 1.12 } };
    this.environment = createEnvironment(this.holeUniforms);
    this.scene.add(this.environment);
    this.actors = new THREE.Group(); this.scene.add(this.actors);
    this.hero = createPlayer(); this.scene.add(this.hero);
    this.portal = new THREE.Mesh(discGeometry, new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color('#8972b5') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float time; uniform vec3 tint; void main(){vec2 q=vUv-.5;float r=length(q)*2.; float a=atan(q.y,q.x);float swirl=pow(max(0.,sin(a*3.+r*15.-time*.9)),9.)*.07;vec3 col=mix(vec3(.035,.035,.060),tint*.35,pow(r,5.));col+=tint*swirl*smoothstep(.1,.85,r);gl_FragColor=vec4(col,1.);}',
      side: THREE.DoubleSide,
    }));
    this.portal.rotation.x = -Math.PI / 2;
    this.portal.position.y = -.11;
    this.portal.renderOrder = 0;
    this.scene.add(this.portal);
    this.rim = new THREE.Mesh(new THREE.TorusGeometry(1, .024, 5, 80), new THREE.MeshBasicMaterial({ color: '#b8a3db', transparent: true, opacity: .68, depthWrite: false }));
    this.rim.rotation.x = -Math.PI / 2; this.rim.position.y = .035; this.scene.add(this.rim);
    this.marker = new THREE.Group();
    const markerRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#cab1ec', transparent: true, opacity: .7, depthWrite: false }));
    markerRing.rotation.x = -Math.PI / 2; markerRing.position.y = .06; this.marker.add(markerRing);
    const markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(.06, .18, 3.5, 6), new THREE.MeshBasicMaterial({ color: '#d6c2ee', transparent: true, opacity: .16, depthWrite: false }));
    markerBeam.position.y = 1.75; this.marker.add(markerBeam); this.scene.add(this.marker);
    this.trail = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.045, 0), new THREE.MeshBasicMaterial({ color: '#b097cb', transparent: true, opacity: .5, depthWrite: false }), 14);
    this.trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trail.frustumCulled = false;
    this.trailTransform = new THREE.Object3D();
    this.scene.add(this.trail);
    this.particles = [];
    this.particlePositions = new Float32Array(600 * 3);
    this.particleColors = new Float32Array(600 * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.particleMesh = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ size: .105, vertexColors: true, transparent: true, opacity: .9, sizeAttenuation: true, depthWrite: false }));
    this.particleMesh.frustumCulled = false; this.scene.add(this.particleMesh);
    this.floatingText = [];
    this.waves = [];
    this.shake = 0;
    this.labelFrame = 0;
    this.bulletGeometry = new THREE.IcosahedronGeometry(.16, 1);
    this.bulletMaterials = {
      cannon: new THREE.MeshStandardMaterial({ color: '#ffd999', emissive: '#efb168', emissiveIntensity: 1.1 }),
      ice: new THREE.MeshStandardMaterial({ color: '#a5edf0', emissive: '#75d1ee', emissiveIntensity: .8 }),
      base: new THREE.MeshBasicMaterial({ color: '#dfc5fc' }),
    };
    this.frostGeometry = new THREE.IcosahedronGeometry(1, 0);
    this.frostMaterial = new THREE.MeshStandardMaterial({ color: '#b6ecf5', emissive: '#4b93b4', emissiveIntensity: .22, transparent: true, opacity: .28, roughness: .18, flatShading: true, depthWrite: false });
    this.gates = [-17.65, -45.55].map(z => {
      const group = new THREE.Group();
      group.position.z = z;
      const stone = new THREE.MeshStandardMaterial({ color: '#ddcdaa', roughness: .9, flatShading: true });
      const roof = new THREE.MeshStandardMaterial({ color: '#558c80', roughness: .75, flatShading: true });
      for (const x of [-5.5, 5.5]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.3, .7), stone);
        pillar.position.set(x, 1.15, 0); pillar.castShadow = true; group.add(pillar);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(.64, .6, 4), roof);
        cap.position.set(x, 2.65, 0); cap.rotation.y = Math.PI / 4; cap.castShadow = true; group.add(cap);
      }
      const barrier = new THREE.Mesh(new THREE.PlaneGeometry(37, 1.8), new THREE.MeshBasicMaterial({ color: '#b9a5d5', transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }));
      barrier.position.y = .9; group.add(barrier);
      const seal = new THREE.Mesh(new THREE.TorusGeometry(.45, .025, 4, 24), new THREE.MeshBasicMaterial({ color: '#b29dce', transparent: true, opacity: .7, depthWrite: false }));
      seal.position.y = 1.2; group.add(seal);
      this.scene.add(group); return { group, barrier, seal };
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.settings.quality === 'high' ? 1.7 : 1.1);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.overlay.width = Math.round(this.width * this.dpr);
    this.overlay.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderer.shadowMap.enabled = this.settings.quality === 'high';
  }

  clearActors() {
    this.actors.traverse(mesh => { if (mesh.userData.ownedMaterial) mesh.material.dispose(); });
    this.actors.clear();
    this.waves.forEach(w => { this.scene.remove(w.mesh); w.mesh.material.dispose(); });
    this.waves = []; this.particles = []; this.floatingText = [];
  }

  createActor(entity) {
    const model = entity.enemy ? createEnemy(entity.kind) : createProp(entity.kind, entity.variant || 0);
    actorBounds.setFromObject(model); actorBounds.getSize(actorSize);
    const spread = Math.max(actorSize.x, actorSize.z, .1);
    entity.baseScale = entity.radius * 1.68 / spread;
    model.scale.setScalar(entity.baseScale);
    model.position.set(entity.x, 0, entity.z);
    entity.mesh = model;
    entity.modelHeight = actorSize.y * entity.baseScale;
    this.actors.add(model);
    if (entity.enemy) {
      const shell = new THREE.Mesh(this.frostGeometry, this.frostMaterial);
      shell.visible = false;
      entity.frostMesh = shell; this.actors.add(shell);
    }
    if (entity.enemy || entity.skill || entity.evolutionCore || entity.anchor) {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: entity.enemy ? '#d8a48a' : '#b298d1', transparent: true, opacity: .3, depthWrite: false }));
      ring.userData.ownedMaterial = true;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(entity.x, .04, entity.z);
      ring.scale.setScalar(entity.radius * 1.12);
      entity.ring = ring; this.actors.add(ring);
    }
  }

  createProjectile(projectile) {
    projectile.mesh = new THREE.Mesh(this.bulletGeometry, this.bulletMaterials[projectile.type] || this.bulletMaterials.base);
    this.actors.add(projectile.mesh);
  }

  shotOrigin(type, player) {
    const barrel = this.hero.userData.cannonBarrels?.[0];
    if (type !== 'cannon' || !barrel) return { x: player.x, y: 1.65, z: player.z };
    this.hero.updateMatrixWorld(true);
    const muzzle = barrel.localToWorld(new THREE.Vector3(0, .07, .61));
    return { x: muzzle.x + player.x - this.hero.position.x, y: muzzle.y, z: muzzle.z + player.z - this.hero.position.z };
  }

  createWarning(warning) {
    const group = new THREE.Group();
    const fill = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({ color: '#e79370', transparent: true, opacity: .14, depthWrite: false }));
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#c87859', transparent: true, opacity: .72, depthWrite: false }));
    fill.userData.ownedMaterial = true;
    ring.userData.ownedMaterial = true;
    fill.rotation.x = ring.rotation.x = -Math.PI / 2;
    fill.position.y = .055; ring.position.y = .06;
    group.add(fill, ring); group.position.set(warning.x, 0, warning.z);
    warning.mesh = group; this.actors.add(group);
  }

  burst(x, z, color, count = 15, power = 1, y = .3) {
    const parsed = new THREE.Color(color);
    for (let i = 0; i < count && this.particles.length < 590; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (.6 + Math.random() * 1.8) * power;
      this.particles.push({ x, y, z, vx: Math.cos(angle) * speed, vy: (1 + Math.random() * 2.4) * power, vz: Math.sin(angle) * speed, life: .45 + Math.random() * .55, color: parsed });
    }
  }

  wave(x, z, color, radius = 3, duration = .7) {
    const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .11, z); this.scene.add(mesh);
    this.waves.push({ mesh, radius, duration, age: 0 });
  }

  float(text, x, z, color = '#78618c', big = false) {
    if (this.floatingText.length > 26) this.floatingText.shift();
    this.floatingText.push({ text, x, z, color, age: 0, life: big ? 1.4 : .95, big });
  }

  screenToWorld(x, y) {
    raycaster.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, -(y / this.height) * 2 + 1), this.camera);
    const point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, point) ? { x: point.x, z: point.z } : null;
  }

  project(x, y, z) {
    temp.set(x, y, z).project(this.camera);
    return { x: (temp.x * .5 + .5) * this.width, y: (-temp.y * .5 + .5) * this.height, visible: temp.z < 1 };
  }

  render(game, dt, time, paint = true) {
    const p = game.player;
    const title = game.mode === 'title';
    const portrait = this.width < 650;
    const target = title ? { x: portrait ? 0 : -6.3, z: portrait ? 2 : 8 } : { x: p.x, z: p.z - (portrait ? 3.4 : 1.7) };
    const smooth = 1 - Math.exp(-dt * (title ? 2 : 5));
    this.look.x += (target.x - this.look.x) * smooth;
    this.look.z += (target.z - this.look.z) * smooth;
    const viewHeight = title ? (portrait ? 28 : 21) : (portrait ? 32 : 23) + (p.level - 1) * .85;
    const aspect = this.width / this.height;
    this.camera.left = -viewHeight * aspect / 2; this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2; this.camera.bottom = -viewHeight / 2; this.camera.updateProjectionMatrix();
    this.shake = Math.max(0, this.shake - dt * 2.8);
    const shake = this.settings.reducedMotion ? 0 : this.shake * .12;
    this.camera.position.set(this.look.x + Math.sin(time * 61) * shake, 31, this.look.z + 27);
    this.camera.lookAt(this.look.x, 0, this.look.z);
    this.camera.updateMatrixWorld();
    if (!paint) return;
    this.sun.position.set(this.look.x - 17, 31, this.look.z + 14);
    this.sun.target.position.set(this.look.x, 0, this.look.z);
    this.holeUniforms.center.value.set(p.x, p.z);
    this.holeUniforms.radius.value = p.drawRadius;
    this.portal.position.set(p.x, -.1, p.z); this.portal.scale.setScalar(p.drawRadius);
    this.portal.material.uniforms.time.value = time;
    this.rim.position.set(p.x, .026, p.z); this.rim.scale.setScalar(p.drawRadius * (1 + Math.sin(time * 2) * .004));
    this.hero.position.set(p.x, 0, p.z);
    updatePlayer(this.hero, { radius: p.drawRadius, modules: p.modules, time, moving: p.moving, evolution: p.evolution });
    if (game.aimTarget && this.hero.userData.cannonBarrels?.[0]) this.hero.userData.cannonBarrels[0].rotation.y = Math.atan2(game.aimTarget.x - p.x, game.aimTarget.z - p.z);
    updateEnvironment(this.environment, time);
    this.gates.forEach((gate, index) => {
      const locked = index === 0 ? !(game.flags.firstCore && p.level >= 2) : !game.flags.evolved;
      gate.barrier.visible = gate.seal.visible = locked && !title;
      gate.seal.rotation.z = time * .2;
      gate.barrier.material.opacity = .1 + Math.sin(time * 2) * .025;
    });
    for (const entity of game.entities) {
      if (!entity.mesh) continue;
      const visible = entity.state !== 'gone' && Math.abs(entity.z - this.look.z) < 32 && Math.abs(entity.x - this.look.x) < 36;
      entity.mesh.visible = visible;
      if (entity.frostMesh) {
        entity.frostMesh.visible = visible && entity.frozen > 0 && entity.state === 'alive';
        entity.frostMesh.position.set(entity.x, entity.modelHeight * .43, entity.z);
        entity.frostMesh.scale.set(entity.radius * 1.05, entity.modelHeight * .65, entity.radius * 1.05);
      }
      if (entity.ring) entity.ring.visible = visible && entity.state === 'alive';
      if (!visible) continue;
      entity.mesh.position.set(entity.x, 0, entity.z);
      if (entity.state === 'eating') {
        const age = entity.eatAge;
        const factor = Math.max(.03, 1 - Math.pow(age / .65, 1.4));
        entity.mesh.scale.setScalar(entity.baseScale * factor);
        entity.mesh.position.y = -.05 - age * age * 4;
        entity.mesh.rotation.x = Math.sin(entity.id) * age * 1.4;
        entity.mesh.rotation.z = Math.cos(entity.id) * age * .8;
      } else {
        entity.mesh.scale.setScalar(entity.baseScale);
        if (entity.enemy) {
          entity.mesh.rotation.y = entity.facing || 0;
          updateEnemy(entity.mesh, entity.kind, entity.frozen > 0 ? entity.freezeTime : time, entity.moving || 0, entity.intent === 'windup' ? 1 : 0);
          if (entity.frozen > 0) entity.mesh.position.y = Math.sin(time * 12) * .009;
        } else {
          entity.mesh.rotation.y = entity.yaw || 0;
          if (entity.kind === 'sheep') entity.mesh.position.y = Math.abs(Math.sin(time * 8 + entity.id)) * .035 * (entity.moving || 0);
          if (entity.skill || entity.evolutionCore) entity.mesh.position.y = .06 + Math.sin(time * 2 + entity.id) * .07;
          entity.mesh.userData.rotors?.forEach(rotor => { rotor.rotation.z = time * 1.5; });
        }
      }
      if (entity.ring) {
        entity.ring.position.set(entity.x, .035, entity.z);
        entity.ring.material.color.set(entity.enemy ? (canSwallow(p.radius, entity.radius) ? '#a6b879' : entity.frozen > 0 ? '#83cde2' : '#d38f75') : '#b096cb');
        entity.ring.material.opacity = .22 + Math.sin(time * 2 + entity.id) * .07;
      }
    }
    for (const bullet of game.projectiles) {
      if (!bullet.mesh) continue;
      const ratio = Math.min(1, bullet.age / bullet.duration);
      const end = bullet.target?.state === 'alive' ? bullet.target : { x: bullet.tx, z: bullet.tz };
      bullet.mesh.position.set(THREE.MathUtils.lerp(bullet.x, end.x, ratio), THREE.MathUtils.lerp(bullet.y || 1.3, 1.1, ratio) + Math.sin(ratio * Math.PI) * (bullet.type === 'cannon' ? 1.5 : .3), THREE.MathUtils.lerp(bullet.z, end.z, ratio));
      bullet.mesh.scale.setScalar(bullet.type === 'cannon' && p.evolution ? 1.5 : 1);
    }
    for (const warning of game.warnings) {
      if (!warning.mesh) continue;
      warning.mesh.position.set(warning.x, 0, warning.z);
      warning.mesh.scale.setScalar(warning.radius);
      warning.mesh.children[0].scale.setScalar(Math.min(1, warning.age / warning.delay));
      warning.mesh.children[0].material.opacity = .13 + warning.age / warning.delay * .19;
    }
    const objective = game.objective();
    this.marker.visible = !title && Boolean(objective.target) && !game.ui.modal && game.mode !== 'result';
    this.trail.visible = this.marker.visible;
    if (objective.target) {
      this.marker.position.set(objective.target.x, 0, objective.target.z);
      this.marker.children[0].scale.setScalar(1 + Math.sin(time * 2.4) * .12);
      const dx = objective.target.x - p.x, dz = objective.target.z - p.z;
      const length = Math.hypot(dx, dz);
      const count = Math.min(14, Math.floor(Math.max(0, length - p.radius) / .8));
      this.trail.count = count;
      for (let i = 0; i < count; i++) {
        const along = p.radius + .65 + i * .8;
        this.trailTransform.position.set(p.x + dx / length * along, .15 + Math.sin(time * 2 - i * .5) * .035, p.z + dz / length * along);
        this.trailTransform.rotation.y = time + i;
        this.trailTransform.scale.setScalar(1 + Math.sin(time * 3 - i * .6) * .25);
        this.trailTransform.updateMatrix(); this.trail.setMatrixAt(i, this.trailTransform.matrix);
      }
      this.trail.instanceMatrix.needsUpdate = true;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) { this.particles.splice(i, 1); continue; }
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.z += particle.vz * dt; particle.vy -= dt * 5;
      if (particle.y < .04) { particle.y = .04; particle.vy *= -.3; }
    }
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      this.particlePositions.set([particle.x, particle.y, particle.z], i * 3);
      this.particleColors.set([particle.color.r, particle.color.g, particle.color.b], i * 3);
    }
    this.particleMesh.geometry.setDrawRange(0, this.particles.length);
    this.particleMesh.geometry.attributes.position.needsUpdate = true;
    this.particleMesh.geometry.attributes.color.needsUpdate = true;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i]; wave.age += dt;
      if (wave.age > wave.duration) { this.scene.remove(wave.mesh); wave.mesh.material.dispose(); this.waves.splice(i, 1); continue; }
      const progress = wave.age / wave.duration;
      wave.mesh.scale.setScalar(.2 + progress * wave.radius);
      wave.mesh.material.opacity = .45 * (1 - progress);
    }
    this.renderer.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (let i = this.floatingText.length - 1; i >= 0; i--) {
      const text = this.floatingText[i]; text.age += dt;
      if (text.age > text.life) { this.floatingText.splice(i, 1); continue; }
      const point = this.project(text.x, 2 + text.age * 1.2, text.z);
      this.ctx.globalAlpha = Math.min(1, (text.life - text.age) * 3);
      this.ctx.font = `${text.big ? 650 : 600} ${text.big ? 19 : 12}px "Segoe UI", "Microsoft YaHei", sans-serif`;
      this.ctx.textAlign = 'center'; this.ctx.fillStyle = text.color;
      this.ctx.shadowColor = '#fff9ed'; this.ctx.shadowBlur = 3;
      this.ctx.fillText(text.text, point.x, point.y);
    }
    this.ctx.globalAlpha = 1; this.ctx.shadowBlur = 0;
    if (++this.labelFrame % 4 === 0) this.renderLabels(game, objective);
  }

  renderLabels(game, objective) {
    if (game.mode === 'title' || game.mode === 'result' || game.ui.modal) {
      game.ui.labels.innerHTML = ''; game.ui.arrow.hidden = true; return;
    }
    const player = game.player;
    const labels = [];
    for (const entity of game.entities) {
      if (entity.state !== 'alive' || !entity.mesh.visible) continue;
      if (!(entity.enemy || entity.skill || entity.evolutionCore || entity.anchor)) continue;
      const distance = Math.hypot(entity.x - player.x, entity.z - player.z);
      if (distance > 18) continue;
      const point = this.project(entity.x, entity.modelHeight + .48, entity.z);
      if (point.x < 20 || point.x > this.width - 20 || point.y < 48 || point.y > this.height - 85) continue;
      const edible = canSwallow(player.radius, entity.radius);
      const name = entity.skill ? SKILLS[entity.skill].name : entity.name || (entity.evolutionCore ? 'Evolution core' : 'Anchor');
      const health = entity.enemy && entity.hp < entity.maxHp ? `<div class="mini-health"><i style="width:${entity.hp / entity.maxHp * 100}%"></i></div>` : '';
      labels.push(`<div class="world-label ${entity.skill || entity.evolutionCore ? 'skill' : edible ? 'edible' : 'danger'}" style="left:${point.x.toFixed(1)}px;top:${point.y.toFixed(1)}px">${health}<span class="label-name">${escapeHtml(t(name))}${entity.guardian || entity.rare ? ' ◆' : ''}</span>${entity.skill ? `<span class="skill-label-hint">${escapeHtml(t(SKILLS[entity.skill].tagline))}</span>` : ''}${entity.enemy ? `<span class="level-tag">${escapeHtml(t(edible ? 'Edible' : 'Need size {{level}}', { level: ['I','II','III','IV','V'][entity.grade - 1] }))}</span>` : ''}<span class="label-arrow"></span></div>`);
    }
    game.ui.labels.innerHTML = labels.slice(0, 18).join('');
    if (!objective.target || game.mode === 'feast') { game.ui.arrow.hidden = true; return; }
    const point = this.project(objective.target.x, .4, objective.target.z);
    const minY = this.width < 650 ? 230 : 160;
    const offscreen = point.x < 55 || point.x > this.width - 55 || point.y < minY || point.y > this.height - 140;
    game.ui.arrow.hidden = !offscreen;
    if (offscreen) {
      const x = THREE.MathUtils.clamp(point.x, 55, this.width - 55);
      const y = THREE.MathUtils.clamp(point.y, minY, this.height - 145);
      const angle = Math.atan2(point.y - this.height * .55, point.x - this.width * .5) * 180 / Math.PI;
      game.ui.arrow.style.left = `${x}px`; game.ui.arrow.style.top = `${y}px`;
      game.ui.arrow.innerHTML = `<span class="arrow-disc"><span style="transform:rotate(${angle}deg)">${icon('arrow')}</span></span><span>${escapeHtml(t('Follow the glowing trail'))}</span>`;
    }
  }
}
