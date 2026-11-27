// Stylized avatars built entirely from Three.js primitives.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SKIN_TONES = ['#ffdbc4', '#f5c6a5', '#e8b48a', '#d29a6c', '#b07a4f', '#8d5a3b', '#6b4029', '#4a2c1d'];
export const HAIR_COLORS = ['#1f1a17', '#3b2a20', '#6a4426', '#a8723c', '#e0b872', '#c0392b', '#8e8e93', '#7b5cff'];

export const AVATAR_SCHEMA = [
  { section: 'Body', fields: [
    { key: 'skin', label: 'Skin tone', type: 'swatch', options: SKIN_TONES },
    { key: 'bodyType', label: 'Body type', type: 'choice', options: ['slim', 'regular', 'broad'] },
    { key: 'height', label: 'Height', type: 'range', min: 0.85, max: 1.15, step: 0.01 },
  ] },
  { section: 'Head', fields: [
    { key: 'faceShape', label: 'Face shape', type: 'choice', options: ['round', 'oval', 'square'] },
    { key: 'eyes', label: 'Eyes', type: 'choice', options: ['round', 'dots', 'happy', 'sleepy'] },
    { key: 'mouth', label: 'Expression', type: 'choice', options: ['smile', 'neutral', 'cool', 'open'] },
  ] },
  { section: 'Hair', fields: [
    { key: 'hair', label: 'Style', type: 'choice', options: ['short', 'long', 'curly', 'ponytail', 'bun', 'spiky', 'bob', 'bald'] },
    { key: 'hairColor', label: 'Color', type: 'color', presets: HAIR_COLORS },
  ] },
  { section: 'Clothes', fields: [
    { key: 'top', label: 'Top', type: 'choice', options: ['tshirt', 'hoodie', 'polo', 'blazer'], labels: { tshirt: 'T-shirt' } },
    { key: 'topColor', label: 'Top color', type: 'color' },
    { key: 'bottom', label: 'Bottom', type: 'choice', options: ['pants', 'shorts', 'skirt'] },
    { key: 'bottomColor', label: 'Bottom color', type: 'color' },
    { key: 'shoeColor', label: 'Shoes', type: 'color' },
  ] },
  { section: 'Accessories', fields: [
    { key: 'glasses', label: 'Glasses', type: 'toggle' },
    { key: 'cap', label: 'Cap', type: 'toggle' },
    { key: 'headphones', label: 'Headphones', type: 'toggle' },
    { key: 'backpack', label: 'Backpack', type: 'toggle' },
    { key: 'lanyard', label: 'Lanyard / ID', type: 'toggle' },
    { key: 'accColor', label: 'Accessory color', type: 'color' },
  ] },
];

export const DEFAULT_AVATAR = {
  skin: '#e8b48a', bodyType: 'regular', height: 1,
  faceShape: 'round', eyes: 'round', mouth: 'smile',
  hair: 'short', hairColor: '#3b2a20',
  top: 'hoodie', topColor: '#5b7cfa', bottom: 'pants', bottomColor: '#2f3545', shoeColor: '#f4f4f6',
  glasses: false, cap: false, headphones: false, backpack: false, lanyard: true, accColor: '#ff7a59',
};

const HEX = /^#[0-9a-f]{6}$/i;
const FIELDS = AVATAR_SCHEMA.flatMap((s) => s.fields);

/** Fill missing/invalid values with defaults so remote data can never break the builder. */
export function normalizeAvatar(cfg) {
  const out = { ...DEFAULT_AVATAR };
  if (!cfg || typeof cfg !== 'object') return out;
  for (const f of FIELDS) {
    const v = cfg[f.key];
    if (f.type === 'choice' && f.options.includes(v)) out[f.key] = v;
    else if ((f.type === 'color' || f.type === 'swatch') && typeof v === 'string' && HEX.test(v)) out[f.key] = v;
    else if (f.type === 'range' && Number.isFinite(v)) out[f.key] = Math.min(f.max, Math.max(f.min, v));
    else if (f.type === 'toggle' && typeof v === 'boolean') out[f.key] = v;
  }
  return out;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randColor = (s = 0.55, l = 0.55) => '#' + new THREE.Color().setHSL(Math.random(), s, l).getHexString();

export function randomAvatar() {
  const cfg = {};
  for (const f of FIELDS) {
    if (f.type === 'choice') cfg[f.key] = pick(f.options);
    else if (f.type === 'swatch') cfg[f.key] = pick(f.options);
    else if (f.type === 'range') cfg[f.key] = +(f.min + Math.random() * (f.max - f.min)).toFixed(2);
    else if (f.type === 'toggle') cfg[f.key] = Math.random() < 0.3;
  }
  cfg.hairColor = Math.random() < 0.8 ? pick(HAIR_COLORS.slice(0, 6)) : pick(HAIR_COLORS);
  cfg.topColor = randColor(0.6, 0.55);
  cfg.bottomColor = randColor(0.3, 0.3);
  cfg.shoeColor = pick(['#f4f4f6', '#22232a', '#8b5e3c', randColor(0.6, 0.5)]);
  cfg.accColor = randColor(0.75, 0.55);
  if (cfg.cap && cfg.headphones && Math.random() < 0.5) cfg.headphones = false;
  return normalizeAvatar(cfg);
}

// ---------- geometry cache (shared across all avatars) ----------
const geoCache = new Map();
function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}
const capsule = (r, len) => geo(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));
const sphere = (r, ws = 20, hs = 14) => geo(`sph${r}_${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const rbox = (w, h, d, r) => geo(`rb${w}_${h}_${d}_${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const cyl = (rt, rb, h, seg = 20, open = false, ts = 0, tl = Math.PI * 2) =>
  geo(`cy${rt}_${rb}_${h}_${seg}_${open}_${ts}_${tl}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl));
const torus = (r, t, arc = Math.PI * 2) => geo(`to${r}_${t}_${arc}`, () => new THREE.TorusGeometry(r, t, 10, 28, arc));
const hemi = (r, tl = Math.PI * 0.5) => geo(`hemi${r}_${tl}`, () => new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, tl));
const cone = (r, h) => geo(`cone${r}_${h}`, () => new THREE.ConeGeometry(r, h, 10));

const HEAD_R = 0.21;

/**
 * Build an avatar. Returns an object with the root group, the animatable pivots and helpers.
 * Faces +Z when root.rotation.y = 0.
 */
export function buildAvatar(rawCfg) {
  const cfg = normalizeAvatar(rawCfg);
  const materials = [];
  const M = (color, rough = 0.75, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
    materials.push(m);
    return m;
  };
  const skin = M(cfg.skin, 0.55);
  const skinDark = M(new THREE.Color(cfg.skin).multiplyScalar(0.88), 0.6);
  const top = M(cfg.topColor, 0.8);
  const bottom = M(cfg.bottomColor, 0.85);
  const shoe = M(cfg.shoeColor, 0.6);
  const hairM = M(cfg.hairColor, 0.65, { side: THREE.DoubleSide });
  const acc = M(cfg.accColor, 0.5);
  const dark = M('#1d1d24', 0.4);
  const white = M('#ffffff', 0.4);
  const mouthM = M('#5a2330', 0.6);
  const blush = M('#ff8f8f', 0.8, { transparent: true, opacity: 0.45 });

  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = false;
    parent.add(o);
    return o;
  };

  const w = { slim: 0.86, regular: 1, broad: 1.2 }[cfg.bodyType];
  const limbW = { slim: 0.88, regular: 1, broad: 1.15 }[cfg.bodyType];

  const root = new THREE.Group();
  root.name = 'avatar';
  const body = new THREE.Group(); // gets scaled by height
  body.scale.setScalar(cfg.height);
  root.add(body);
  const bob = new THREE.Group(); // vertical bob while walking
  body.add(bob);

  // ----- legs -----
  const legs = {};
  const shortsTop = cfg.bottom === 'shorts';
  const legUpperMat = cfg.bottom === 'skirt' ? skin : bottom;
  const legLowerMat = cfg.bottom === 'pants' ? bottom : skin;
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.1 * w * side, 0.88, 0);
    bob.add(hip);
    mesh(capsule(0.085 * limbW, 0.28), legUpperMat, hip, 0, -0.21, 0);
    if (shortsTop) mesh(cyl(0.098 * limbW, 0.094 * limbW, 0.12), bottom, hip, 0, -0.27, 0);
    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);
    mesh(capsule(0.074 * limbW, 0.26), legLowerMat, knee, 0, -0.2, 0);
    mesh(rbox(0.13, 0.085, 0.25, 0.035), shoe, knee, 0, -0.415, 0.045);
    legs[side < 0 ? 'L' : 'R'] = { hip, knee };
  }

  // ----- pelvis / skirt -----
  mesh(rbox(0.34 * w, 0.2, 0.23, 0.07), bottom, bob, 0, 0.92, 0);
  if (cfg.bottom === 'skirt') {
    const sk = mesh(cyl(0.19 * w, 0.28 * w, 0.32, 24, true), bottom, bob, 0, 0.78, 0);
    sk.material = M(cfg.bottomColor, 0.85, { side: THREE.DoubleSide });
    sk.scale.z = 0.8;
  }

  // ----- torso -----
  const torso = new THREE.Group();
  torso.position.set(0, 0.9, 0);
  bob.add(torso);
  const tW = 0.42 * w, tD = 0.26 * Math.min(w, 1.1);
  mesh(rbox(tW, 0.54, tD, 0.09), top, torso, 0, 0.27, 0);

  const front = tD / 2;
  if (cfg.top === 'hoodie') {
    const hood = mesh(torus(0.12 * w, 0.055), top, torso, 0, 0.54, -0.05);
    hood.rotation.x = Math.PI / 2 - 0.25;
    hood.scale.set(1, 1, 0.8);
    mesh(rbox(tW * 0.6, 0.14, 0.04, 0.02), top, torso, 0, 0.12, front + 0.005);
    for (const s of [-1, 1]) {
      const str = mesh(cyl(0.008, 0.008, 0.16, 6), white, torso, 0.04 * s, 0.4, front + 0.01);
      str.rotation.x = 0.05;
    }
  } else if (cfg.top === 'polo') {
    for (const s of [-1, 1]) {
      const c = mesh(rbox(0.1, 0.03, 0.07, 0.01), top, torso, 0.055 * s, 0.53, front - 0.02);
      c.rotation.set(0.5, 0, -0.45 * s);
    }
    mesh(rbox(0.05, 0.14, 0.01, 0.004), M(new THREE.Color(cfg.topColor).multiplyScalar(0.8)), torso, 0, 0.44, front + 0.002);
    for (const y of [0.47, 0.41]) mesh(sphere(0.009, 8, 6), white, torso, 0, y, front + 0.01);
  } else if (cfg.top === 'blazer') {
    mesh(rbox(0.12, 0.3, 0.02, 0.008), white, torso, 0, 0.39, front - 0.002);
    const tie = mesh(rbox(0.035, 0.2, 0.012, 0.005), acc, torso, 0, 0.38, front + 0.012);
    tie.rotation.z = 0.02;
    for (const s of [-1, 1]) {
      const l = mesh(rbox(0.07, 0.26, 0.02, 0.008), M(new THREE.Color(cfg.topColor).multiplyScalar(0.8)), torso, 0.075 * s, 0.4, front + 0.008);
      l.rotation.z = 0.28 * s;
    }
    for (const y of [0.17, 0.08]) mesh(sphere(0.012, 8, 6), dark, torso, 0, y, front + 0.01);
  } else {
    // t-shirt neckline
    const neck = mesh(torus(0.075, 0.015), skinDark, torso, 0, 0.535, 0.02);
    neck.rotation.x = Math.PI / 2;
  }

  // ----- arms -----
  const longSleeves = cfg.top === 'hoodie' || cfg.top === 'blazer';
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set((tW / 2 + 0.055) * side, 1.37, 0);
    shoulder.rotation.z = 0.08 * side;
    bob.add(shoulder);
    mesh(sphere(0.078 * limbW), top, shoulder, 0, 0, 0);
    mesh(capsule(0.068 * limbW, 0.18), top, shoulder, 0, -0.15, 0);
    if (!longSleeves) mesh(capsule(0.056 * limbW, 0.1), skin, shoulder, 0, -0.22, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    shoulder.add(elbow);
    mesh(capsule(0.06 * limbW, 0.17), longSleeves ? top : skin, elbow, 0, -0.12, 0);
    mesh(sphere(0.066), skin, elbow, 0, -0.29, 0.005);
    arms[side < 0 ? 'L' : 'R'] = { shoulder, elbow };
  }

  // ----- neck + head -----
  mesh(cyl(0.065, 0.07, 0.12), skin, bob, 0, 1.47, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.68, 0);
  bob.add(head);

  const shapeScale = { round: [1, 1, 1], oval: [0.9, 1.08, 0.95], square: [1, 1, 1] }[cfg.faceShape];
  const headInner = new THREE.Group();
  headInner.scale.set(...shapeScale);
  head.add(headInner);
  const square = cfg.faceShape === 'square';
  if (square) mesh(rbox(0.4, 0.42, 0.4, 0.11), skin, headInner);
  else mesh(sphere(HEAD_R, 32, 24), skin, headInner);

  // z on the face surface for feature placement
  const faceZ = (x, y) => (square ? 0.2 : Math.sqrt(Math.max(0, HEAD_R * HEAD_R - x * x - y * y)));

  // ears
  for (const s of [-1, 1]) {
    const ear = mesh(sphere(0.045, 12, 10), skin, headInner, (square ? 0.2 : 0.2) * s, -0.01, 0);
    ear.scale.set(0.5, 1, 0.8);
  }
  // nose
  mesh(sphere(0.026, 12, 10), skinDark, headInner, 0, -0.025, faceZ(0, -0.025) + 0.005);

  // eyes + brows
  for (const s of [-1, 1]) {
    const ex = 0.075 * s, ey = 0.035, ez = faceZ(ex, ey);
    if (cfg.eyes === 'round') {
      const w1 = mesh(sphere(0.036, 16, 12), white, headInner, ex, ey, ez - 0.006);
      w1.scale.z = 0.5;
      mesh(sphere(0.021, 12, 10), dark, headInner, ex, ey - 0.004, ez + 0.009).scale.z = 0.5;
      mesh(sphere(0.007, 8, 6), white, headInner, ex + 0.008, ey + 0.006, ez + 0.019);
    } else if (cfg.eyes === 'dots') {
      mesh(sphere(0.024, 12, 10), dark, headInner, ex, ey, ez).scale.z = 0.6;
    } else if (cfg.eyes === 'happy') {
      const a = mesh(torus(0.028, 0.008, Math.PI), dark, headInner, ex, ey - 0.012, ez + 0.002);
      a.rotation.y = s * Math.atan2(ex, ez) * 0.6;
    } else {
      const c = mesh(capsule(0.011, 0.04), dark, headInner, ex, ey - 0.005, ez + 0.002);
      c.rotation.z = Math.PI / 2;
      const lid = mesh(capsule(0.006, 0.045), skinDark, headInner, ex, ey + 0.012, ez + 0.002);
      lid.rotation.z = Math.PI / 2;
    }
    if (cfg.hair !== 'bald' || true) {
      const by = ey + 0.06;
      const brow = mesh(rbox(0.06, 0.014, 0.02, 0.006), M(cfg.hair === 'bald' ? new THREE.Color(cfg.skin).multiplyScalar(0.6) : cfg.hairColor, 0.7), headInner, ex, by, faceZ(ex, by) + 0.002);
      brow.rotation.z = cfg.mouth === 'cool' && s > 0 ? -0.25 : -0.08 * s;
    }
  }

  // mouth
  const my = -0.085, mz = faceZ(0, my);
  if (cfg.mouth === 'smile') {
    const m = mesh(torus(0.048, 0.011, Math.PI), mouthM, headInner, 0, my + 0.03, mz - 0.01);
    m.rotation.z = Math.PI;
    m.rotation.x = -0.25;
  } else if (cfg.mouth === 'neutral') {
    const m = mesh(capsule(0.01, 0.05), mouthM, headInner, 0, my, mz);
    m.rotation.z = Math.PI / 2;
  } else if (cfg.mouth === 'cool') {
    const m = mesh(torus(0.042, 0.01, Math.PI * 0.55), mouthM, headInner, 0.012, my + 0.03, mz - 0.008);
    m.rotation.z = Math.PI + 0.25;
    m.rotation.x = -0.2;
  } else {
    const m = mesh(sphere(0.034, 16, 12), mouthM, headInner, 0, my - 0.005, mz - 0.012);
    m.scale.set(1.15, 0.85, 0.5);
    mesh(sphere(0.018, 12, 10), M('#ff8a8a', 0.6), headInner, 0, my - 0.022, mz - 0.002).scale.set(1.2, 0.6, 0.4);
  }
  if (cfg.mouth === 'smile' || cfg.mouth === 'open') {
    for (const s of [-1, 1]) {
      const bx = 0.12 * s, byy = -0.045;
      const b = mesh(sphere(0.028, 12, 10), blush, headInner, bx, byy, faceZ(bx, byy) - 0.004);
      b.scale.set(1, 0.65, 0.35);
      b.castShadow = false;
    }
  }

  // ----- hair -----
  const hairGroup = new THREE.Group();
  headInner.add(hairGroup);
  const hr = square ? 0.235 : HEAD_R * 1.07;
  const addCap = (tl = Math.PI * 0.55, tilt = -0.42, r = hr) => {
    const c = mesh(hemi(r, tl), hairM, hairGroup);
    c.rotation.x = tilt;
    if (square) c.scale.set(1, 0.9, 1);
    return c;
  };
  const hairStyle = cfg.cap && ['spiky', 'curly', 'bun'].includes(cfg.hair) ? 'short' : cfg.hair;
  switch (hairStyle) {
    case 'short':
      addCap(Math.PI * 0.52);
      mesh(rbox(0.22, 0.06, 0.06, 0.025), hairM, hairGroup, 0.04, 0.16, faceZ(0.04, 0.16) - 0.01).rotation.z = -0.25;
      break;
    case 'long': {
      addCap(Math.PI * 0.56);
      const back = mesh(cyl(hr * 1.0, hr * 1.18, 0.46, 28, true, 0.95, Math.PI * 2 - 1.9), hairM, hairGroup, 0, -0.17, -0.01);
      back.castShadow = true;
      break;
    }
    case 'curly': {
      addCap(Math.PI * 0.5, -0.35, hr * 0.98);
      const n = 34;
      for (let i = 0; i < n; i++) {
        const yy = 1 - (i / (n - 1)) * 1.25;
        const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
        const th = i * 2.39996;
        const p = new THREE.Vector3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
        if (p.y < -0.25) continue;
        if (p.z > 0.35 && p.y < 0.45) continue; // keep the face clear
        const r = 0.062 + (i % 3) * 0.008;
        mesh(sphere(r, 12, 10), hairM, hairGroup, p.x * hr * 1.08, p.y * hr * 1.05 + 0.02, p.z * hr * 1.08);
      }
      break;
    }
    case 'ponytail': {
      addCap(Math.PI * 0.55);
      mesh(torus(0.035, 0.014), acc, hairGroup, 0, 0.07, -0.225);
      const tail = mesh(capsule(0.055, 0.22), hairM, hairGroup, 0, -0.08, -0.27);
      tail.rotation.x = 0.45;
      break;
    }
    case 'bun':
      addCap(Math.PI * 0.55);
      mesh(sphere(0.095, 18, 14), hairM, hairGroup, 0, 0.2, -0.13);
      mesh(torus(0.06, 0.014), acc, hairGroup, 0, 0.15, -0.105).rotation.x = -0.9;
      break;
    case 'spiky': {
      addCap(Math.PI * 0.48, -0.38);
      const spikes = [[0, 1, 0.2], [0.5, 0.85, 0.35], [-0.5, 0.85, 0.35], [0, 0.8, -0.6], [0.6, 0.7, -0.3], [-0.6, 0.7, -0.3], [0.25, 0.9, 0.5], [-0.25, 0.9, 0.5]];
      for (const [x, y, z] of spikes) {
        const d = new THREE.Vector3(x, y, z).normalize();
        const c = mesh(cone(0.06, 0.16), hairM, hairGroup, d.x * hr, d.y * hr, d.z * hr);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      }
      break;
    }
    case 'bob': {
      addCap(Math.PI * 0.55);
      mesh(cyl(hr * 1.02, hr * 1.12, 0.22, 28, true, 1.05, Math.PI * 2 - 2.1), hairM, hairGroup, 0, -0.05, 0);
      mesh(rbox(0.3, 0.06, 0.07, 0.03), hairM, hairGroup, 0, 0.15, faceZ(0, 0.15) - 0.005).rotation.x = -0.3;
      break;
    }
    default: break; // bald
  }

  // ----- accessories -----
  if (cfg.glasses) {
    const frame = M('#202028', 0.35);
    const lens = M('#9fd3ff', 0.1, { transparent: true, opacity: 0.25 });
    for (const s of [-1, 1]) {
      const ex = 0.075 * s, ey = 0.035, ez = faceZ(ex, ey) + 0.02;
      mesh(torus(0.045, 0.008), frame, headInner, ex, ey, ez);
      const l = mesh(geo('lens', () => new THREE.CircleGeometry(0.044, 20)), lens, headInner, ex, ey, ez - 0.002);
      l.castShadow = false;
      const arm = mesh(rbox(0.008, 0.008, 0.2, 0.003), frame, headInner, 0.118 * s, ey + 0.01, ez - 0.1);
      arm.rotation.y = 0.1 * s;
    }
    mesh(cyl(0.006, 0.006, 0.06, 6), frame, headInner, 0, 0.04, faceZ(0, 0.04) + 0.02).rotation.z = Math.PI / 2;
  }
  if (cfg.cap) {
    const capR = hr * 1.08;
    const c = mesh(hemi(capR, Math.PI * 0.5), acc, headInner, 0, 0.02, 0);
    c.rotation.x = -0.2;
    const brim = mesh(cyl(0.15, 0.15, 0.016, 24), acc, headInner, 0, 0.07, capR * 0.85);
    brim.scale.set(1, 1, 0.9);
    brim.rotation.x = 0.12;
    mesh(sphere(0.02, 8, 6), acc, headInner, 0, capR + 0.01, -0.04);
  }
  if (cfg.headphones) {
    const hpR = hr * (cfg.cap ? 1.2 : 1.12) + (cfg.hair === 'curly' && !cfg.cap ? 0.05 : 0);
    const band = mesh(torus(hpR, 0.018, Math.PI), dark, headInner, 0, 0, 0);
    band.rotation.z = 0;
    for (const s of [-1, 1]) {
      const cup = mesh(cyl(0.065, 0.065, 0.055, 18), acc, headInner, (hpR - 0.005) * s, -0.01, 0);
      cup.rotation.z = Math.PI / 2;
      const pad = mesh(cyl(0.05, 0.05, 0.02, 16), dark, headInner, (hpR - 0.035) * s, -0.01, 0);
      pad.rotation.z = Math.PI / 2;
    }
  }
  if (cfg.backpack) {
    mesh(rbox(0.34 * w, 0.42, 0.16, 0.06), acc, torso, 0, 0.27, -tD / 2 - 0.075);
    mesh(rbox(0.24 * w, 0.16, 0.05, 0.03), M(new THREE.Color(cfg.accColor).multiplyScalar(0.8)), torso, 0, 0.16, -tD / 2 - 0.165);
    for (const s of [-1, 1]) {
      const strap = mesh(rbox(0.045, 0.46, 0.02, 0.01), dark, torso, 0.11 * w * s, 0.3, tD / 2 + 0.005);
      strap.rotation.z = 0.04 * s;
    }
  }
  if (cfg.lanyard) {
    const ly = M(cfg.accColor, 0.6);
    for (const s of [-1, 1]) {
      const strip = mesh(rbox(0.018, 0.24, 0.006, 0.003), ly, torso, 0.055 * s, 0.43, front + 0.006);
      strip.rotation.z = -0.35 * s;
    }
    const neckRing = mesh(torus(0.085, 0.009), ly, bob, 0, 1.44, 0);
    neckRing.rotation.x = Math.PI / 2 - 0.25;
    mesh(rbox(0.085, 0.115, 0.012, 0.01), white, torso, 0, 0.27, front + 0.012);
    mesh(rbox(0.085, 0.03, 0.014, 0.008), ly, torso, 0, 0.315, front + 0.013);
    mesh(rbox(0.03, 0.035, 0.014, 0.005), M('#c9cbd6', 0.6), torso, -0.018, 0.26, front + 0.014);
  }

  const hipHeight = 0.88 * cfg.height;
  const headTop = (1.68 + HEAD_R * shapeScale[1] + 0.1 + (!cfg.cap && (cfg.hair === 'bun' || cfg.hair === 'spiky' || cfg.hair === 'curly') ? 0.06 : 0)) * cfg.height;

  const av = {
    cfg, root, body, bob, torso, head, legs, arms,
    hipHeight, headTop,
    anim: { walk: 0, phase: 0, sit: 0, typing: 0, t: Math.random() * 10 },
    dispose() {
      materials.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
  return av;
}

const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Drive the procedural animation.
 * @param {object} av avatar from buildAvatar
 * @param {number} dt seconds
 * @param {{speed:number, sitting:boolean, typing?:boolean}} state speed in m/s
 */
export function animateAvatar(av, dt, state) {
  const a = av.anim;
  a.t += dt;
  const k = 1 - Math.exp(-dt * 10);
  const targetWalk = state.sitting ? 0 : Math.min(1, state.speed / 3.2);
  a.walk = lerp(a.walk, targetWalk, k);
  a.sit = lerp(a.sit, state.sitting ? 1 : 0, 1 - Math.exp(-dt * 12));
  a.typing = lerp(a.typing, state.typing ? 1 : 0, k);
  a.phase += dt * (4 + 6 * a.walk) * (a.walk > 0.02 ? 1 : 0);

  const sw = Math.sin(a.phase);
  const walk = a.walk;
  const sit = a.sit;
  const breathe = Math.sin(a.t * 1.8) * 0.01;

  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const leg = av.legs[side];
    const walkHip = sw * 0.65 * s * walk;
    const walkKnee = Math.max(0, -sw * s) * 0.9 * walk + 0.05;
    leg.hip.rotation.x = lerp(walkHip, -Math.PI / 2 + 0.08, sit);
    leg.knee.rotation.x = lerp(walkKnee, Math.PI / 2 - 0.08, sit);
    leg.hip.rotation.z = lerp(0, 0.06 * -s, sit);

    const arm = av.arms[side];
    const typeJit = a.typing * Math.sin(a.t * 18 + s) * 0.05;
    const walkArm = -sw * 0.55 * s * walk;
    const sitArm = state.typing ? -0.45 + typeJit : -0.15;
    arm.shoulder.rotation.x = lerp(walkArm, sitArm, sit);
    arm.elbow.rotation.x = lerp(-0.15 - walk * 0.25, state.typing ? -1.05 : -0.9, sit);
    arm.shoulder.rotation.z = (0.08 + breathe * 2) * -s * (1 - sit) + 0.05 * -s * sit;
  }
  av.bob.position.y = Math.abs(Math.sin(a.phase)) * 0.045 * walk * (1 - sit) + breathe * (1 - walk);
  av.torso.rotation.x = 0.06 * walk * (1 - sit) - 0.04 * sit;
  av.head.rotation.y = Math.sin(a.t * 0.5) * 0.12 * (1 - walk);
  av.head.rotation.x = Math.sin(a.t * 0.7) * 0.03 + (state.typing ? 0.12 : 0) * sit;
}
