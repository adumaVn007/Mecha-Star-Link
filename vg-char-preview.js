import * as THREE from 'three';

// Three.js r160, local procedural geometry only. The caller owns the selection UI.
const STYLES = ['traveler', 'martial', 'scholar', 'engineer', 'guardian'];
const UP = new THREE.Vector3(0, 1, 0);
const GOLD = '#e8c477';
const TEAL = '#477f89';
const TRANSITION_MS = 600;

function resourcePool() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const pool = {
    geometry(value) { geometries.add(value); return value; },
    material(value) { materials.add(value); return value; },
    texture(value) { textures.add(value); return value; },
    dispose() {
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      geometries.clear(); materials.clear(); textures.clear();
    }
  };
  pool.sphere = pool.geometry(new THREE.SphereGeometry(1, 18, 12));
  pool.box = pool.geometry(new THREE.BoxGeometry(1, 1, 1));
  pool.hairCap = pool.geometry(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.53));
  return pool;
}

function mesh(pool, parent, geometry, material, position, scale) {
  const value = new THREE.Mesh(geometry, material);
  if (position) value.position.set(...position);
  if (scale) value.scale.set(...scale);
  parent.add(value);
  return value;
}

function oval(pool, parent, material, position, scale) {
  return mesh(pool, parent, pool.sphere, material, position, scale);
}

function box(pool, parent, material, position, scale) {
  return mesh(pool, parent, pool.box, material, position, scale);
}

function segment(pool, parent, material, a, b, radiusA, radiusB = radiusA) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const geometry = pool.geometry(new THREE.CylinderGeometry(radiusB, radiusA, delta.length(), 12));
  const value = mesh(pool, parent, geometry, material);
  value.position.copy(start).add(end).multiplyScalar(0.5);
  value.quaternion.setFromUnitVectors(UP, delta.normalize());
  return value;
}

function band(pool, parent, material, a, b, width, depth = 0.025) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const value = box(pool, parent, material, null, [width, delta.length(), depth]);
  value.position.copy(start).add(end).multiplyScalar(0.5);
  value.quaternion.setFromUnitVectors(UP, delta.normalize());
  return value;
}

function garment(pool, parent, material, profile, depth = 0.64, start = 0, length = Math.PI * 2) {
  const geometry = pool.geometry(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24, start, length));
  return mesh(pool, parent, geometry, material, [0, 0, 0], [1, 1, depth]);
}

function panel(pool, parent, material, outline, z) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return mesh(pool, parent, pool.geometry(new THREE.ShapeGeometry(shape)), material, [0, 0, z]);
}

function palette(pool, colors) {
  function cloth(color, extra = {}) {
    return pool.material(new THREE.MeshStandardMaterial({ color, roughness: 0.87, side: THREE.DoubleSide, ...extra }));
  }
  return {
    main: cloth(colors.primary),
    second: cloth(colors.secondary),
    trim: cloth(colors.accent, { roughness: 0.55, metalness: 0.25 }),
    skin: cloth(colors.skin, { roughness: 0.87, side: THREE.FrontSide }),
    hair: cloth(colors.hair, { roughness: 0.92, side: THREE.FrontSide }),
    dark: cloth('#202b38'),
    leather: cloth('#594336'),
    sole: cloth('#17212b'),
    metal: cloth(colors.secondary, { roughness: 0.48, metalness: 0.53 }),
    eye: cloth('#ded2bc', { side: THREE.FrontSide }),
    pupil: cloth('#18262c', { side: THREE.FrontSide }),
    lip: cloth(new THREE.Color(colors.skin).multiplyScalar(0.64), { side: THREE.FrontSide }),
    glass: cloth('#74c3c6', { roughness: 0.22, metalness: 0.45 })
  };
}

function addHead(pool, upper, p, preset) {
  const head = new THREE.Group();
  head.position.set(0, 3.36, 0.015);
  upper.add(head);
  const female = preset.gender === 'nu';
  const width = female ? 0.245 : 0.26;
  oval(pool, upper, p.skin, [0, 2.99, 0], [0.115, 0.16, 0.11]);
  oval(pool, head, p.skin, [0, 0, 0], [width, 0.32, 0.225]);
  oval(pool, head, p.skin, [0, -0.145, 0.012], [width * 0.78, 0.16, 0.2]);
  for (const side of [-1, 1]) {
    oval(pool, head, p.skin, [side * width, -0.015, -0.005], [0.044, 0.085, 0.05]);
    oval(pool, head, p.eye, [side * 0.087, 0.023, 0.207], [0.044, 0.022, 0.014]);
    oval(pool, head, p.pupil, [side * 0.087, 0.022, 0.22], [0.016, 0.018, 0.007]);
    const brow = oval(pool, head, p.hair, [side * 0.088, 0.079, 0.211], [0.052, 0.009, 0.014]);
    brow.rotation.z = side * -0.07;
  }
  oval(pool, head, p.skin, [0, -0.037, 0.224], [0.037, 0.062, 0.055]);
  oval(pool, head, p.lip, [0, -0.131, 0.214], [0.052, 0.009, 0.008]);
  mesh(pool, head, pool.hairCap, p.hair, [0, 0.015, -0.018], [width + 0.018, 0.33, 0.242]);
  oval(pool, head, p.hair, [0, -0.015, -0.17], [width * 0.96, 0.235, 0.105]);

  const fringe = (side, long = false) => {
    const value = oval(pool, head, p.hair, [side * 0.075, 0.185, 0.178], [long ? 0.19 : 0.165, 0.065, 0.085]);
    value.rotation.z = side * 0.29;
  };
  const knot = (y, radius) => oval(pool, head, p.hair, [0, y, -0.06], [radius, radius * 1.05, radius]);
  switch (preset.style) {
    case 'traveler':
      fringe(-1, true);
      if (female) {
        for (const side of [-1, 1]) oval(pool, head, p.hair, [side * 0.225, -0.12, -0.035], [0.09, side < 0 ? 0.32 : 0.26, 0.18]);
        oval(pool, head, p.hair, [0, -0.16, -0.165], [0.255, 0.3, 0.11]);
      } else {
        oval(pool, head, p.hair, [-0.195, 0.02, -0.025], [0.07, 0.2, 0.16]);
      }
      break;
    case 'martial':
      knot(0.39, female ? 0.12 : 0.14);
      segment(pool, head, p.trim, [-0.08, 0.31, -0.06], [0.08, 0.31, -0.06], 0.025);
      if (female) {
        const tail = oval(pool, head, p.hair, [0.04, -0.04, -0.27], [0.135, 0.48, 0.13]);
        tail.rotation.x = -0.22;
        fringe(1);
      }
      break;
    case 'scholar':
      if (female) {
        knot(0.4, 0.16);
        segment(pool, head, p.trim, [-0.26, 0.41, -0.045], [0.28, 0.41, -0.045], 0.012);
        oval(pool, head, p.trim, [0.28, 0.41, -0.045], [0.035, 0.035, 0.035]);
      } else {
        oval(pool, head, p.hair, [0, -0.21, -0.16], [0.255, 0.43, 0.13]);
        knot(0.23, 0.1);
        for (const side of [-1, 1]) oval(pool, head, p.hair, [side * 0.21, -0.12, 0.015], [0.045, 0.29, 0.09]);
      }
      fringe(-1);
      break;
    case 'engineer':
      fringe(female ? 1 : -1, female);
      if (!female) {
        for (let i = 0; i < 5; i++) oval(pool, head, p.hair, [(i - 2) * 0.075, 0.285 + (i % 2) * 0.02, 0.025], [0.09, 0.065, 0.135]);
      } else {
        oval(pool, head, p.hair, [0.21, 0.04, -0.025], [0.072, 0.2, 0.15]);
      }
      for (const side of [-1, 1]) {
        const rim = pool.geometry(new THREE.TorusGeometry(0.071, 0.014, 8, 20));
        mesh(pool, head, rim, p.trim, [side * 0.098, 0.183, 0.225]);
        oval(pool, head, p.glass, [side * 0.098, 0.183, 0.222], [0.061, 0.061, 0.015]);
      }
      band(pool, head, p.leather, [-0.04, 0.183, 0.225], [0.04, 0.183, 0.225], 0.022);
      break;
    case 'guardian':
      fringe(1);
      if (female) {
        for (let i = 0; i < 7; i++) {
          oval(pool, head, p.hair, [0.23 + (i % 2) * 0.025, -0.12 - i * 0.115, 0.1 + i * 0.025], [0.065 - i * 0.003, 0.082, 0.06]);
        }
        oval(pool, head, p.trim, [0.245, -0.85, 0.28], [0.05, 0.028, 0.045]);
      } else {
        oval(pool, head, p.hair, [0, -0.25, -0.23], [0.11, 0.34, 0.1]);
        oval(pool, head, p.trim, [0, -0.03, -0.24], [0.115, 0.035, 0.08]);
      }
      break;
  }
  return head;
}

function addArms(pool, upper, p, style) {
  for (const side of [-1, 1]) {
    const wide = style === 'scholar';
    const shoulder = [side * 0.43, 2.73, 0];
    const elbow = [side * (wide ? 0.71 : 0.61), 2.25, 0.015];
    const wrist = [side * (wide ? 0.82 : 0.66), wide ? 1.91 : 1.78, 0.09];
    const sleeve = style === 'engineer' ? p.second : p.main;
    oval(pool, upper, sleeve, shoulder, [wide ? 0.235 : 0.195, 0.225, 0.205]);
    segment(pool, upper, sleeve, shoulder, elbow, wide ? 0.215 : 0.175, wide ? 0.26 : 0.14);
    if (style === 'engineer' || style === 'martial') {
      segment(pool, upper, p.skin, elbow, wrist, 0.105, 0.078);
      const end = new THREE.Vector3(...elbow).lerp(new THREE.Vector3(...wrist), 0.2).toArray();
      segment(pool, upper, style === 'engineer' ? p.main : p.second, elbow, end, 0.15, 0.15);
    } else {
      segment(pool, upper, sleeve, elbow, wrist, wide ? 0.26 : 0.135, wide ? 0.32 : 0.105);
    }
    if (style === 'guardian') {
      const end = new THREE.Vector3(...wrist).lerp(new THREE.Vector3(...elbow), 0.55).toArray();
      segment(pool, upper, p.metal, wrist, end, 0.11, 0.13);
      oval(pool, upper, p.metal, [side * 0.48, 2.78, 0.015], [0.245, 0.13, 0.235]);
    }
    if (style === 'martial') {
      for (let i = 0; i < 3; i++) {
        const t = 0.1 + i * 0.13;
        const a = new THREE.Vector3(...wrist).lerp(new THREE.Vector3(...elbow), t);
        const b = new THREE.Vector3(...wrist).lerp(new THREE.Vector3(...elbow), t + 0.075);
        segment(pool, upper, p.second, a.toArray(), b.toArray(), 0.096 + i * 0.004);
      }
    }
    oval(pool, upper, p.skin, [wrist[0], wrist[1] - 0.105, wrist[2] + 0.015], [0.077, 0.145, 0.07]);
    oval(pool, upper, p.skin, [wrist[0] - side * 0.065, wrist[1] - 0.08, wrist[2] + 0.055], [0.034, 0.08, 0.04]);
  }
}

function addLegs(pool, body, p, style) {
  for (const side of [-1, 1]) {
    const wide = style === 'martial';
    const hip = [side * 0.185, 1.77, 0];
    const knee = [side * 0.205, 1.02, side < 0 ? 0.055 : 0];
    const ankle = [side * 0.23, 0.25, 0.065];
    segment(pool, body, p.second, hip, knee, wide ? 0.24 : 0.17, wide ? 0.19 : 0.135);
    oval(pool, body, p.second, knee, [wide ? 0.19 : 0.136, 0.17, 0.145]);
    segment(pool, body, p.second, knee, ankle, wide ? 0.185 : 0.135, 0.09);
    segment(pool, body, p.leather, [side * 0.23, 0.24, 0.065], [side * 0.22, style === 'traveler' ? 0.68 : 0.5, 0.05], 0.118, 0.13);
    oval(pool, body, p.leather, [side * 0.23, 0.15, 0.145], [0.145, 0.145, 0.285]);
    box(pool, body, p.sole, [side * 0.23, 0.053, 0.155], [0.275, 0.065, 0.49]);
    if (style === 'guardian') {
      oval(pool, body, p.metal, [side * 0.22, 0.57, 0.16], [0.135, 0.265, 0.075]);
    }
    if (style === 'martial') {
      for (let i = 0; i < 3; i++) segment(pool, body, p.trim, [side * 0.22, 0.49 + i * 0.085, 0.05], [side * 0.22, 0.525 + i * 0.085, 0.05], 0.13);
    }
  }
}

function addOutfit(pool, upper, body, p, style) {
  garment(pool, upper, p.main, [[0.34, 1.67], [0.375, 1.88], [0.31, 2.18], [0.4, 2.59], [0.43, 2.76], [0.19, 2.93]]);
  garment(pool, upper, p.second, [[0.385, 1.91], [0.385, 2.035]]);
  box(pool, upper, p.trim, [0, 1.975, 0.26], [0.12, 0.105, 0.045]);
  switch (style) {
    case 'traveler':
      garment(pool, upper, p.second, [[0.64, 1.15], [0.6, 1.74], [0.53, 2.5], [0.25, 2.84]], 0.66, Math.PI * 0.42, Math.PI * 1.16);
      oval(pool, upper, p.second, [-0.37, 2.74, -0.025], [0.34, 0.17, 0.27]);
      garment(pool, upper, p.trim, [[0.2, 2.85], [0.215, 2.96]], 0.7);
      band(pool, upper, p.leather, [-0.32, 2.8, 0.29], [0.31, 1.9, 0.29], 0.075, 0.035);
      oval(pool, body, p.leather, [0.48, 1.63, 0.13], [0.235, 0.255, 0.13]);
      box(pool, body, p.trim, [0.48, 1.67, 0.262], [0.065, 0.08, 0.018]);
      panel(pool, upper, p.main, [[-0.35, 1.91], [-0.07, 1.89], [-0.13, 1.28], [-0.46, 1.25]], 0.23);
      break;
    case 'martial':
      band(pool, upper, p.second, [-0.19, 2.9, 0.19], [0.23, 2.26, 0.29], 0.12);
      band(pool, upper, p.trim, [0.19, 2.9, 0.19], [-0.12, 2.45, 0.29], 0.055);
      garment(pool, upper, p.trim, [[0.385, 1.9], [0.39, 2.04]]);
      panel(pool, upper, p.main, [[0.12, 1.94], [0.27, 1.94], [0.4, 1.28], [0.24, 1.33]], 0.285);
      panel(pool, upper, p.trim, [[0.25, 1.92], [0.33, 1.95], [0.51, 1.43], [0.42, 1.39]], 0.27);
      break;
    case 'scholar':
      garment(pool, body, p.main, [[0.57, 0.27], [0.55, 0.38], [0.44, 1.24], [0.365, 1.95]], 0.68);
      panel(pool, body, p.second, [[-0.075, 1.92], [0.075, 1.92], [0.285, 0.29], [-0.285, 0.29]], 0.383);
      band(pool, body, p.trim, [0, 0.34, 0.396], [0, 1.89, 0.396], 0.025);
      band(pool, upper, p.second, [-0.18, 2.91, 0.17], [0.16, 2.29, 0.3], 0.095);
      band(pool, upper, p.trim, [0.18, 2.91, 0.17], [-0.06, 2.46, 0.3], 0.045);
      segment(pool, body, p.second, [-0.43, 1.43, 0.15], [-0.43, 1.89, 0.15], 0.075);
      segment(pool, body, p.trim, [-0.43, 1.41, 0.15], [-0.43, 1.45, 0.15], 0.086);
      break;
    case 'engineer':
      panel(pool, upper, p.leather, [[-0.19, 2.5], [0.19, 2.5], [0.22, 2.05], [0.34, 1.28], [-0.34, 1.28], [-0.22, 2.05]], 0.307);
      for (const side of [-1, 1]) {
        band(pool, upper, p.leather, [side * 0.28, 2.82, 0.25], [side * 0.145, 2.38, 0.32], 0.063);
        box(pool, upper, p.main, [side * 0.17, 1.66, 0.335], [0.22, 0.23, 0.055]);
        box(pool, upper, p.trim, [side * 0.17, 1.78, 0.37], [0.2, 0.025, 0.02]);
      }
      band(pool, upper, p.trim, [-0.115, 2.35, 0.33], [0.115, 2.35, 0.33], 0.025);
      oval(pool, body, p.leather, [0.43, 1.83, 0.055], [0.16, 0.2, 0.13]);
      segment(pool, body, p.trim, [-0.43, 1.59, 0.08], [-0.43, 1.97, 0.08], 0.027);
      break;
    case 'guardian':
      oval(pool, upper, p.metal, [0, 2.5, 0.205], [0.365, 0.365, 0.17]);
      band(pool, upper, p.trim, [0, 2.22, 0.37], [0, 2.79, 0.33], 0.025);
      for (const side of [-1, 1]) {
        panel(pool, upper, p.main, [[side * 0.035, 1.92], [side * 0.34, 1.9], [side * 0.42, 1.12], [side * 0.07, 1.06]], 0.265);
        band(pool, upper, p.trim, [side * 0.075, 1.13, 0.285], [side * 0.38, 1.18, 0.285], 0.025);
        oval(pool, upper, p.trim, [side * 0.48, 2.8, 0.2], [0.08, 0.035, 0.023]);
      }
      garment(pool, upper, p.metal, [[0.205, 2.88], [0.205, 2.97]], 0.68);
      break;
  }
}

function makeFigure(pool, preset, index, shadowTexture) {
  const root = new THREE.Group();
  root.name = preset.id;
  root.userData.characterId = preset.id;
  const offset = index - 2;
  root.position.set(offset * 1.95, 0, -0.15 * offset * offset);
  const body = new THREE.Group();
  body.rotation.y = -offset * 0.065;
  body.scale.set(preset.gender === 'nu' ? 0.94 : 1, preset.gender === 'nu' ? 0.98 : 1, 1);
  root.add(body);
  const upper = new THREE.Group();
  body.add(upper);
  const p = palette(pool, preset.colors);
  addLegs(pool, body, p, preset.style);
  addOutfit(pool, upper, body, p, preset.style);
  addArms(pool, upper, p, preset.style);
  const head = addHead(pool, upper, p, preset);

  const platformMaterial = pool.material(new THREE.MeshStandardMaterial({ color: '#172e3b', metalness: 0.42, roughness: 0.68 }));
  mesh(pool, root, pool.geometry(new THREE.CylinderGeometry(0.78, 0.83, 0.13, 40)), platformMaterial, [0, -0.072, 0]);
  const shadowMaterial = pool.material(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.8, depthWrite: false }));
  const shadow = mesh(pool, root, pool.geometry(new THREE.PlaneGeometry(1.45, 1.25)), shadowMaterial, [0, 0.001, 0.035]);
  shadow.rotation.x = -Math.PI / 2;
  const ringMaterial = pool.material(new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.35, depthWrite: false }));
  const ring = mesh(pool, root, pool.geometry(new THREE.RingGeometry(0.705, 0.729, 64)), ringMaterial, [0, 0.009, 0]);
  ring.rotation.x = -Math.PI / 2;
  const surfaceColors = Object.values(p).map(material => [material, material.color.clone()]);
  return { root, body, upper, head, ring, preset, index, surfaceColors };
}

function contactTexture(pool) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5 - size / 2) / (size / 2);
    const dy = (y + 0.5 - size / 2) / (size / 2);
    const radius = dx * dx + dy * dy;
    data[(y * size + x) * 4 + 3] = Math.round(Math.max(0, Math.exp(-radius * 4.4) - 0.012) * 230);
  }
  const texture = pool.texture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Synchronous factory. Unsupported WebGL throws; runtime failures call onError(Error).
 * select is silent; only a pointer click/tap calls onSelect(id), then the parent selects.
 * Initial selectedId highlights a figure without leaving the all-five view.
 */
export function createCharacterPreview({ container, presets, gender = 'nam', selectedId, onSelect, onError, reducedMotion } = {}) {
  if (!container || typeof container.appendChild !== 'function' || !container.ownerDocument) throw new TypeError('A character preview container is required.');
  if (!Array.isArray(presets)) throw new TypeError('Character presets must be an array.');
  const all = presets.slice();
  if (all.length !== 10 || all.some(preset => !preset || typeof preset.id !== 'string')) throw new TypeError('The preview needs all ten character presets.');
  for (const value of ['nam', 'nu']) {
    const entries = all.filter(preset => preset && preset.gender === value);
    if (entries.length !== 5 || STYLES.some((style, i) => !entries.some(preset => preset.number === i + 1 && preset.style === style && typeof preset.id === 'string' && preset.colors))) {
      throw new TypeError('The preview needs five numbered appearance styles for each gender.');
    }
  }
  if (new Set(all.map(preset => preset && preset.id)).size !== all.length) throw new TypeError('Character preset ids must be unique.');
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  if (!win || typeof win.requestAnimationFrame !== 'function') throw new Error('This browser cannot display the 3D character preview.');
  const media = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduce = typeof reducedMotion === 'boolean' ? reducedMotion : Boolean(media && media.matches);
  let currentGender = gender === 'nu' ? 'nu' : 'nam';
  let selected = null;
  let focusedId = null;
  let hoveredId = null;
  let figures = [];
  let figurePool = null;
  let stagePool = null;
  let renderer = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let raf = 0;
  let disposed = false;
  let failed = false;
  let errorReported = false;
  let intersecting = true;
  let sized = false;
  let lastFrame = 0;
  let visibleTime = 0;
  let tween = null;
  let pointer = null;
  let creationMessage = '';
  const listeners = [];
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Năm mẫu nhân vật người trưởng thành. Bấm trực tiếp vào nhân vật ở giữa để chọn.');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:default;';
  const scene = new THREE.Scene();
  const lineup = new THREE.Group();
  scene.add(lineup);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const lookAt = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    listeners.push([target, type, listener, options]);
  }
  function stop() {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
  }
  function canRender() { return !disposed && !failed && sized && intersecting && !doc.hidden; }
  function schedule() { if (!raf && canRender()) raf = win.requestAnimationFrame(frame); }
  function notify(error) {
    if (errorReported) return;
    errorReported = true;
    if (typeof onError === 'function') {
      try { onError(error instanceof Error ? error : new Error(String(error))); }
      catch (callbackError) { win.console?.error(callbackError); }
    }
  }
  function fail(error) {
    if (disposed || failed) return;
    failed = true;
    stop();
    notify(error);
  }
  function updateViewMetadata() {
    canvas.dataset.view = focusedId ? 'focus' : 'wide';
    canvas.dataset.moving = tween ? 'true' : 'false';
    canvas.dataset.cameraX = camera.position.x.toFixed(4);
    canvas.dataset.cameraY = camera.position.y.toFixed(4);
    canvas.dataset.cameraZ = camera.position.z.toFixed(4);
  }
  function updateSelection() {
    canvas.dataset.selectedId = selected || '';
    figures.forEach(figure => {
      const active = figure.preset.id === selected;
      const hovered = !active && figure.preset.id === hoveredId;
      figure.surfaceColors.forEach(([material, original]) => {
        material.color.copy(original);
        if (!active) {
          const luminance = original.r * 0.2126 + original.g * 0.7152 + original.b * 0.0722;
          material.color.lerp(new THREE.Color(luminance, luminance, luminance), hovered ? 0.1 : 0.25).multiplyScalar(hovered ? 0.92 : 0.78);
        }
      });
      figure.ring.material.color.set(active ? GOLD : hovered ? '#88d5d8' : TEAL);
      figure.ring.material.opacity = active ? 1 : hovered ? 0.78 : 0.27;
      figure.ring.scale.setScalar(active ? 1.035 : hovered ? 1.02 : 1);
    });
    const preset = all.find(value => value.id === selected);
    canvas.setAttribute('aria-label', `Năm mẫu nhân vật ${currentGender === 'nu' ? 'nữ' : 'nam'} trưởng thành.${preset ? ` Đang chọn: ${preset.name}.` : ''} Bấm trực tiếp vào nhân vật ở giữa để chọn.`);
  }
  function matchingId(id, fallbackStyle) {
    const requested = all.find(value => value.id === id);
    const style = requested ? requested.style : fallbackStyle;
    return figures.find(figure => figure.preset.style === style)?.preset.id || figures[0].preset.id;
  }
  function rebuild(nextId, previousStyle) {
    hoveredId = null;
    lineup.clear();
    if (figurePool) figurePool.dispose();
    figurePool = resourcePool();
    figures = all.filter(value => value.gender === currentGender).sort((a, b) => a.number - b.number)
      .map((preset, i) => makeFigure(figurePool, preset, i, shadowTexture));
    figures.forEach(figure => lineup.add(figure.root));
    selected = matchingId(nextId, previousStyle);
    updateSelection();
    renderer.renderLists.dispose();
    scene.updateMatrixWorld(true);
  }
  function desiredView() {
    const figure = figures.find(value => value.preset.id === focusedId);
    // Use the unanimated full figure, including hair and platform, for reliable fitting.
    const bounds = new THREE.Box3().setFromObject(figure ? figure.root : lineup);
    bounds.expandByScalar(0.12);
    const center = bounds.getCenter(new THREE.Vector3());
    center.y -= figure ? 0.24 : 0.22;
    const size = bounds.getSize(new THREE.Vector3());
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const pad = figure ? 1.24 : 1.16;
    const distance = Math.max(size.y / (2 * vertical), size.x / (2 * vertical * camera.aspect)) * pad + size.z * 0.6;
    const direction = new THREE.Vector3(figure ? 0.065 : 0, 0.075, 1).normalize();
    // Tall, narrow containers need a distant camera without fog hiding the lineup.
    camera.far = Math.max(100, distance * 4);
    camera.updateProjectionMatrix();
    scene.fog.near = Math.max(17, distance * 1.35);
    scene.fog.far = Math.max(42, distance * 2.8);
    return { position: center.clone().addScaledVector(direction, distance), look: center };
  }
  function moveView(animate = true) {
    const destination = desiredView();
    canvas.dataset.view = focusedId ? 'focus' : 'wide';
    // Replacing this object cancels the previous target from its current interpolated view.
    tween = animate && !reduce ? {
      start: win.performance.now(), from: camera.position.clone(), fromLook: lookAt.clone(),
      to: destination.position, toLook: destination.look
    } : null;
    canvas.dataset.moving = tween ? 'true' : 'false';
    if (!tween) {
      camera.position.copy(destination.position);
      lookAt.copy(destination.look);
      camera.lookAt(lookAt);
      camera.updateMatrixWorld();
      updateViewMetadata();
    }
    schedule();
  }
  function resize(initial = false) {
    if (disposed || failed) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(0, Math.round(container.clientWidth || rect.width));
    const height = Math.max(0, Math.round(container.clientHeight || rect.height));
    sized = width > 0 && height > 0;
    if (!sized) { stop(); return; }
    const dpr = Math.min(Math.max(win.devicePixelRatio || 1, 1), 1.75);
    if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    moveView(!initial && Boolean(tween));
  }
  function frame(now) {
    raf = 0;
    if (!canRender()) { lastFrame = 0; return; }
    try {
      visibleTime += lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      if (tween) {
        const progress = THREE.MathUtils.clamp((now - tween.start) / TRANSITION_MS, 0, 1);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
        camera.position.lerpVectors(tween.from, tween.to, eased);
        lookAt.lerpVectors(tween.fromLook, tween.toLook, eased);
        if (progress === 1) {
          tween = null;
          updateViewMetadata();
        }
      }
      figures.forEach(figure => {
        figure.upper.scale.y = reduce ? 1 : 1 + Math.sin(visibleTime * 1.55 + figure.index * 0.8) * 0.003;
        figure.head.rotation.y = reduce ? 0 : Math.sin(visibleTime * 0.49 + figure.index) * 0.014;
      });
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    } catch (error) { fail(error); return; }
    if (!reduce || tween) schedule();
  }
  function clearPointer() {
    const id = pointer?.id;
    pointer = null;
    try {
      if (id !== undefined && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    } catch (_) { /* The browser may already have released a removed canvas. */ }
  }
  function pickCharacter(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    pointerNdc.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(figures.map(figure => figure.root), true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object && !object.userData.characterId) object = object.parent;
    return object ? object.userData.characterId : null;
  }
  function setHovered(id) {
    if (hoveredId === id) return;
    hoveredId = id;
    canvas.style.cursor = id ? 'pointer' : 'default';
    updateSelection();
    schedule();
  }
  function pointerDown(event) {
    if (disposed || failed || event.button !== 0 || event.isPrimary === false) { clearPointer(); return; }
    clearPointer();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: win.performance.now(), dragged: false };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* detached/unsupported capture */ }
  }
  function pointerMove(event) {
    if (pointer?.id === event.pointerId) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 7) pointer.dragged = true;
      return;
    }
    if (event.pointerType === 'mouse' && canRender() && !tween) setHovered(pickCharacter(event.clientX, event.clientY));
  }
  function pointerUp(event) {
    const start = pointer;
    if (!start || start.id !== event.pointerId) return;
    clearPointer();
    if (!canRender() || start.dragged || win.performance.now() - start.start > 750 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
    const id = pickCharacter(event.clientX, event.clientY);
    if (id && typeof onSelect === 'function') onSelect(id);
  }
  function select(modelId, options = { focus: true }) {
    if (disposed || failed || !figures.some(figure => figure.preset.id === modelId)) return false;
    selected = modelId;
    updateSelection();
    if (options?.focus !== false) {
      focusedId = modelId;
      moveView();
    } else {
      focusedId = null;
      moveView(false);
    }
    return true;
  }
  function setGender(value, modelId) {
    if (disposed || failed || (value !== 'nam' && value !== 'nu')) return false;
    const previousStyle = all.find(preset => preset.id === selected)?.style;
    const wasFocused = Boolean(focusedId);
    if (value !== currentGender) {
      currentGender = value;
      rebuild(modelId, previousStyle);
    } else {
      selected = matchingId(modelId, previousStyle);
      updateSelection();
    }
    focusedId = wasFocused ? selected : null;
    moveView();
    return true;
  }
  function resetView() {
    if (disposed || failed) return false;
    focusedId = null;
    moveView();
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    clearPointer();
    tween = null;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    listeners.forEach(([target, type, listener, options]) => target.removeEventListener(type, listener, options));
    listeners.length = 0;
    if (media && typeof reducedMotion !== 'boolean' && !media.removeEventListener) media.removeListener?.(motionChange);
    lineup.clear();
    figures = [];
    figurePool?.dispose();
    stagePool?.dispose();
    figurePool = null;
    stagePool = null;
    scene.clear();
    if (renderer) {
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer = null;
    }
    canvas.remove();
  }
  function motionChange(event) {
    reduce = Boolean(event.matches);
    if (reduce && tween) {
      camera.position.copy(tween.to);
      lookAt.copy(tween.toLook);
      tween = null;
      updateViewMetadata();
    }
    schedule();
  }

  let shadowTexture;
  try {
    listen(canvas, 'webglcontextcreationerror', event => { creationMessage = event.statusMessage || ''; });
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault();
      fail(new Error('WebGL character preview context was lost. Please use the 2D appearance selector.'));
    });
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    if (renderer.getContext().isContextLost()) throw new Error('WebGL context is unavailable.');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    scene.background = new THREE.Color('#081521');
    scene.fog = new THREE.Fog('#081521', 17, 42);
    stagePool = resourcePool();
    shadowTexture = contactTexture(stagePool);
    const floorMaterial = stagePool.material(new THREE.MeshStandardMaterial({ color: '#0d2430', roughness: 0.94, metalness: 0.15 }));
    const floor = mesh(stagePool, scene, stagePool.geometry(new THREE.PlaneGeometry(70, 70)), floorMaterial, [0, -0.145, 0]);
    floor.rotation.x = -Math.PI / 2;
    scene.add(new THREE.HemisphereLight('#bbdcf4', '#14232b', 1.65));
    const key = new THREE.DirectionalLight('#d8e9f8', 2.6);
    key.position.set(2, 7, 7); scene.add(key);
    const rim = new THREE.DirectionalLight('#47b8bb', 2.8);
    rim.position.set(-5, 5, -4); scene.add(rim);
    const warm = new THREE.DirectionalLight('#eac68a', 0.95);
    warm.position.set(6, 4, 2); scene.add(warm);
    rebuild(selectedId, null);
    updateViewMetadata();
    // The constructor always starts wide; selectedId affects only the foot ring.
    container.appendChild(canvas);
    resize(true);
    if (sized && !doc.hidden) {
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    }
    listen(canvas, 'pointerdown', pointerDown);
    listen(canvas, 'pointermove', pointerMove);
    listen(canvas, 'pointerup', pointerUp);
    listen(canvas, 'pointerleave', () => setHovered(null));
    listen(canvas, 'pointercancel', clearPointer);
    listen(canvas, 'lostpointercapture', clearPointer);
    listen(doc, 'visibilitychange', () => {
      clearPointer();
      if (doc.hidden) stop(); else { lastFrame = 0; schedule(); }
    });
    listen(win, 'resize', () => { try { resize(); } catch (error) { fail(error); } }, { passive: true });
    if (typeof win.ResizeObserver === 'function') {
      resizeObserver = new win.ResizeObserver(() => { try { resize(); } catch (error) { fail(error); } });
      resizeObserver.observe(container);
    }
    if (typeof win.IntersectionObserver === 'function') {
      intersectionObserver = new win.IntersectionObserver(entries => {
        intersecting = entries.some(entry => entry.isIntersecting);
        if (intersecting) schedule(); else { stop(); clearPointer(); }
      });
      intersectionObserver.observe(container);
    }
    if (media && typeof reducedMotion !== 'boolean') {
      if (media.addEventListener) listen(media, 'change', motionChange);
      else media.addListener?.(motionChange);
    }
    schedule();
  } catch (error) {
    dispose();
    const reason = new Error(`Cannot initialize the 3D character preview.${creationMessage ? ` ${creationMessage}` : ''}`, { cause: error });
    notify(reason);
    throw reason;
  }
  return { select, setGender, resetView, dispose };
}
