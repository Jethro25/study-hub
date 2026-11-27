// Chibi anime-style avatars built entirely from Three.js primitives.
// Body: big round head, small slim body. Face: painted onto a canvas texture
// (big anime eyes, brows, mouth, blush). Hair: built from tapered "locks".
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SKIN_TONES = ['#ffe3d1', '#f8d0b4', '#eebd96', '#d9a06f', '#b9804f', '#94603c', '#6f442a', '#4c2e1e'];
export const HAIR_COLORS = ['#1f1a1c', '#3b2a24', '#6a4426', '#a8723c', '#f0cf8a', '#f3e6d3', '#d24b4b', '#ff9ec7', '#7b5cff', '#4aa3df'];
export const EYE_COLORS = ['#6b3e26', '#2b1d16', '#3d7be0', '#3aa26b', '#9a6b2f', '#8b5cf6', '#d23b5a', '#5d6b7a'];

const HAIR_STYLES = ['short', 'swept', 'curtains', 'spiky', 'manbun', 'bob', 'long', 'wavy', 'curly', 'ponytail', 'sidetail', 'bun', 'spacebuns', 'braid', 'bald'];
const HAIR_LABELS = { short: 'Messy short', swept: 'Side swept', curtains: 'Curtain bangs', spiky: 'Spiky', manbun: 'Man bun', bob: 'Fluffy bob', long: 'Long straight', wavy: 'Long wavy', curly: 'Curly', ponytail: 'Ponytail', sidetail: 'Side tail', bun: 'Messy bun', spacebuns: 'Space buns', braid: 'Side braid', bald: 'Bald' };

export const AVATAR_SCHEMA = [
  { section: 'Body', fields: [
    { key: 'skin', label: 'Skin tone', type: 'swatch', options: SKIN_TONES },
    { key: 'bodyType', label: 'Body type', type: 'choice', options: ['slim', 'regular', 'broad'] },
    { key: 'height', label: 'Height', type: 'range', min: 0.85, max: 1.15, step: 0.01 },
  ] },
  { section: 'Head', fields: [
    { key: 'faceShape', label: 'Face shape', type: 'choice', options: ['round', 'oval', 'square'], labels: { square: 'Soft square' } },
    { key: 'eyes', label: 'Eyes', type: 'choice', options: ['round', 'star', 'sharp', 'sleepy', 'happy', 'wink', 'squint', 'dots'], labels: { round: 'Sparkly', squint: '> <' } },
    { key: 'eyeColor', label: 'Eye color', type: 'color', presets: EYE_COLORS },
    { key: 'mouth', label: 'Mouth', type: 'choice', options: ['smile', 'open', 'grin', 'cat', 'fang', 'tongue', 'cool', 'neutral', 'wavy', 'pout', 'gasp', 'tri', 'sulk'], labels: { cool: 'Smirk', open: 'Happy open', grin: 'Big grin', cat: 'Cat ω', fang: 'Fang', tongue: 'Tongue out', wavy: 'Flustered ~', gasp: 'Gasp', tri: 'Tiny ▲', sulk: 'Sulky' } },
    { key: 'blush', label: 'Blush', type: 'toggle' },
  ] },
  { section: 'Hair', fields: [
    { key: 'hair', label: 'Style', type: 'choice', options: HAIR_STYLES, labels: HAIR_LABELS },
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
  skin: '#f8d0b4', bodyType: 'regular', height: 1,
  faceShape: 'round', eyes: 'round', eyeColor: '#6b3e26', mouth: 'smile', blush: true,
  hair: 'bob', hairColor: '#3b2a24',
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
    if (f.type === 'choice' || f.type === 'swatch') cfg[f.key] = pick(f.options);
    else if (f.type === 'range') cfg[f.key] = +(f.min + Math.random() * (f.max - f.min)).toFixed(2);
    else if (f.type === 'toggle') cfg[f.key] = Math.random() < 0.3;
  }
  if (cfg.hair === 'bald' && Math.random() < 0.8) cfg.hair = pick(HAIR_STYLES.slice(0, -1));
  cfg.blush = Math.random() < 0.7;
  cfg.eyes = Math.random() < 0.6 ? pick(['round', 'star', 'sharp']) : cfg.eyes;
  cfg.hairColor = Math.random() < 0.7 ? pick(HAIR_COLORS.slice(0, 6)) : pick(HAIR_COLORS);
  cfg.eyeColor = pick(EYE_COLORS);
  cfg.topColor = randColor(0.6, 0.6);
  cfg.bottomColor = randColor(0.3, 0.3);
  cfg.shoeColor = pick(['#f4f4f6', '#22232a', '#8b5e3c', randColor(0.6, 0.55)]);
  cfg.accColor = randColor(0.75, 0.6);
  if (cfg.cap && cfg.headphones) cfg.headphones = false;
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
const hemi = (r, tl = Math.PI * 0.5) => geo(`hemi${r}_${tl}`, () => new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, tl));
const cone = (r, h) => geo(`cone${r}_${h}`, () => new THREE.ConeGeometry(r, h, 12));

// A hair lock: unit sphere whose lower half tapers to a soft point (top is round).
const lockGeo = () => geo('lock', () => {
  const g = new THREE.SphereGeometry(1, 16, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) { const k = Math.pow(1 + y, 0.85) * 0.95 + 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  }
  g.computeVertexNormals();
  return g;
});

// ---------- the painted face ----------
const FACE_W = 512, FACE_H = 404; // 269 px per radian on the head sphere
const FACE_PHI = 0.95, FACE_THETA0 = 0.8, FACE_THETA_LEN = 1.5;
const PX = FACE_W / (FACE_PHI * 2);

function shade(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }

function drawFace(cfg) {
  const c = document.createElement('canvas');
  c.width = FACE_W; c.height = FACE_H;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ink = '#2b1b1b';
  const eyeY = (FACE_THETA0 + 0.12) * PX;
  const eyeDX = 0.41 * PX;
  const brow = cfg.hair === 'bald' ? shade(cfg.skin, 0.55) : shade(cfg.hairColor, 0.75);

  // blush (with little anime hatch lines)
  if (cfg.blush) {
    for (const s of [-1, 1]) {
      const bx = FACE_W / 2 + s * 0.47 * PX, by = eyeY + 0.2 * PX;
      const grd = g.createRadialGradient(bx, by, 2, bx, by, 34);
      grd.addColorStop(0, 'rgba(255,120,130,0.55)');
      grd.addColorStop(1, 'rgba(255,120,130,0)');
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(bx, by, 36, 20, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(220,80,90,0.55)';
      g.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(bx + i * 9 - 4, by + 7); g.lineTo(bx + i * 9 + 4, by - 6); g.stroke(); }
    }
  }

  const drawEye = (cx, cy, side, style) => {
    // side: -1 = image-left (avatar's right eye), +1 = image-right
    const W = 40, H = 48;
    g.save();
    if (style === 'happy') {
      g.strokeStyle = ink; g.lineWidth = 9;
      g.beginPath(); g.arc(cx, cy + 14, 30, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.restore(); return;
    }
    if (style === 'squint') {
      g.strokeStyle = ink; g.lineWidth = 9;
      g.beginPath();
      g.moveTo(cx - side * 28, cy - 22); g.lineTo(cx + side * 22, cy); g.lineTo(cx - side * 28, cy + 22);
      g.stroke(); g.restore(); return;
    }
    if (style === 'wink' && side > 0) {
      g.strokeStyle = ink; g.lineWidth = 9;
      g.beginPath(); g.arc(cx, cy - 18, 30, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 30, cy - 4); g.lineTo(cx + 42, cy - 10); g.stroke();
      g.restore(); return;
    }
    if (style === 'dots') {
      g.fillStyle = ink;
      g.beginPath(); g.ellipse(cx, cy + 4, 15, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx - 5, cy - 4, 5, 0, Math.PI * 2); g.fill();
      g.restore(); return;
    }
    const sharp = style === 'sharp';
    const h = sharp ? H * 0.72 : H;
    const tilt = sharp ? 0.18 * side : 0;
    // eye white + iris, clipped to the eye shape
    g.beginPath();
    g.ellipse(cx, cy + 4, W, h, tilt, 0, Math.PI * 2);
    g.save();
    g.clip();
    g.fillStyle = '#ffffff';
    g.fillRect(cx - W - 4, cy - h - 4, W * 2 + 8, h * 2 + 12);
    const irisR = sharp ? 30 : 32, irisH = sharp ? 36 : 42;
    const ig = g.createLinearGradient(0, cy - irisH, 0, cy + irisH);
    ig.addColorStop(0, shade(cfg.eyeColor, 0.35));
    ig.addColorStop(0.55, cfg.eyeColor);
    ig.addColorStop(1, shade(cfg.eyeColor, 1.6));
    g.fillStyle = ig;
    g.beginPath(); g.ellipse(cx + side * 2, cy + 8, irisR, irisH, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = shade(cfg.eyeColor, 0.3); g.lineWidth = 3;
    g.stroke();
    g.fillStyle = shade(cfg.eyeColor, 0.18);
    g.beginPath(); g.ellipse(cx + side * 2, cy + 6, 14, 20, 0, 0, Math.PI * 2); g.fill();
    // sleepy: heavy lid covers the top half
    if (style === 'sleepy') {
      g.fillStyle = cfg.skin;
      g.fillRect(cx - W - 4, cy - h - 6, W * 2 + 8, h * 0.95);
    }
    // highlights
    g.fillStyle = '#ffffff';
    if (style === 'star') {
      const sx = cx - 6, sy = cy - 2, R = 17;
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? R * 0.32 : R; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    } else {
      g.beginPath(); g.ellipse(cx - 10, cy - (style === 'sleepy' ? -4 : 10), 11, 13, -0.3, 0, Math.PI * 2); g.fill();
    }
    g.beginPath(); g.arc(cx + 12, cy + 24, 5.5, 0, Math.PI * 2); g.fill();
    g.restore();
    // upper lash line with a little wing
    g.strokeStyle = ink; g.fillStyle = ink;
    const lidY = style === 'sleepy' ? cy - 4 : cy - h + 8;
    g.lineWidth = sharp ? 9 : 8;
    g.beginPath();
    g.moveTo(cx - side * (W + 4), lidY + (sharp ? 10 : 14));
    g.quadraticCurveTo(cx - side * 6, lidY - (style === 'sleepy' ? 2 : 12) - (sharp ? -2 : 0), cx + side * (W + 6), lidY + (sharp ? -4 : 4));
    g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx + side * (W + 4), lidY + 4); g.lineTo(cx + side * (W + 15), lidY - 6); g.stroke();
    // lower lash hint
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(43,27,27,0.6)';
    g.beginPath(); g.moveTo(cx - 14, cy + h + 3); g.lineTo(cx + 14 + side * 6, cy + h + 1); g.stroke();
    g.restore();
  };

  for (const side of [-1, 1]) {
    const cx = FACE_W / 2 + side * eyeDX;
    g.save();
    g.translate(cx, eyeY); g.scale(1.32, 1.32); g.translate(-cx, -eyeY);
    drawEye(cx, eyeY, side, cfg.eyes);
    g.restore();
    // eyebrows
    g.strokeStyle = brow;
    g.lineWidth = 6;
    const by = eyeY - 86;
    const raise = cfg.mouth === 'cool' && side > 0 ? -8 : 0;
    g.beginPath();
    g.moveTo(cx - 26, by + 6 + raise * (side > 0 ? 0.3 : 0));
    g.quadraticCurveTo(cx, by - 6 + raise, cx + 28 * (side > 0 ? 1 : 1), by + 4 * (cfg.eyes === 'sharp' ? -side : 1) + raise);
    g.stroke();
  }

  // tiny nose
  g.strokeStyle = shade(cfg.skin, 0.72);
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(FACE_W / 2 - 3, eyeY + 0.22 * PX); g.lineTo(FACE_W / 2 + 2, eyeY + 0.25 * PX); g.stroke();

  // mouth
  const mx = FACE_W / 2, my = eyeY + 0.36 * PX;
  g.strokeStyle = '#6b2e35';
  g.fillStyle = '#7a2f3a';
  g.lineWidth = 4.5;
  switch (cfg.mouth) {
    case 'smile':
      g.beginPath(); g.arc(mx, my - 12, 15, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
    case 'neutral':
      g.beginPath(); g.moveTo(mx - 10, my); g.lineTo(mx + 10, my); g.stroke(); break;
    case 'cool':
      g.beginPath(); g.moveTo(mx - 12, my + 1); g.quadraticCurveTo(mx + 4, my + 4, mx + 15, my - 7); g.stroke(); break;
    case 'open':
      g.beginPath(); g.moveTo(mx - 20, my - 8); g.quadraticCurveTo(mx, my - 4, mx + 20, my - 8); g.quadraticCurveTo(mx + 14, my + 22, mx, my + 22); g.quadraticCurveTo(mx - 14, my + 22, mx - 20, my - 8); g.fill();
      g.fillStyle = '#ff8d96';
      g.beginPath(); g.ellipse(mx, my + 14, 10, 6, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'cat':
      g.beginPath(); g.arc(mx - 8, my - 2, 8, 0, Math.PI); g.stroke();
      g.beginPath(); g.arc(mx + 8, my - 2, 8, 0, Math.PI); g.stroke(); break;
    case 'pout':
      g.beginPath(); g.ellipse(mx, my, 7, 8, 0, 0, Math.PI * 2); g.stroke(); break;
    case 'grin': {
      // wide open D-shaped grin with teeth line and tongue
      g.beginPath(); g.moveTo(mx - 26, my - 10); g.lineTo(mx + 26, my - 10); g.quadraticCurveTo(mx + 22, my + 26, mx, my + 26); g.quadraticCurveTo(mx - 22, my + 26, mx - 26, my - 10); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(mx - 22, my - 10, 44, 6);
      g.fillStyle = '#ff8d96'; g.beginPath(); g.ellipse(mx, my + 17, 13, 7, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 4; g.beginPath(); g.moveTo(mx - 26, my - 10); g.lineTo(mx + 26, my - 10); g.stroke();
      break;
    }
    case 'fang':
      g.beginPath(); g.arc(mx, my - 12, 15, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#6b2e35'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(mx + 3, my + 1); g.lineTo(mx + 11, my); g.lineTo(mx + 7, my + 9); g.closePath(); g.fill(); g.stroke();
      break;
    case 'tongue':
      g.fillStyle = '#ff8d96';
      g.beginPath(); g.moveTo(mx - 7, my); g.lineTo(mx + 9, my); g.quadraticCurveTo(mx + 10, my + 16, mx + 1, my + 16); g.quadraticCurveTo(mx - 8, my + 16, mx - 7, my); g.fill();
      g.strokeStyle = '#c95a66'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx + 1, my + 3); g.lineTo(mx + 1, my + 10); g.stroke();
      g.strokeStyle = '#6b2e35'; g.lineWidth = 4.5;
      g.beginPath(); g.moveTo(mx - 16, my - 3); g.quadraticCurveTo(mx, my + 3, mx + 16, my - 3); g.stroke();
      break;
    case 'wavy':
      g.beginPath(); g.moveTo(mx - 18, my);
      for (let i = 1; i <= 6; i++) g.quadraticCurveTo(mx - 18 + i * 6 - 3, my + (i % 2 ? -6 : 6), mx - 18 + i * 6, my);
      g.stroke(); break;
    case 'gasp':
      g.beginPath(); g.ellipse(mx, my + 2, 9, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff8d96'; g.beginPath(); g.ellipse(mx, my + 8, 6, 4, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'tri':
      g.beginPath(); g.moveTo(mx - 7, my + 6); g.lineTo(mx + 7, my + 6); g.lineTo(mx, my - 5); g.closePath(); g.fill(); break;
    case 'sulk':
      g.beginPath(); g.arc(mx, my + 12, 13, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); break;
    default: break;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const R = 0.3; // head radius
const HEAD_Y = 1.3;

/**
 * Build an avatar. Returns an object with the root group, the animatable pivots and helpers.
 * Faces +Z when root.rotation.y = 0.
 */
export function buildAvatar(rawCfg) {
  const cfg = normalizeAvatar(rawCfg);
  const disposables = [];
  const M = (color, rough = 0.75, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
    disposables.push(m);
    return m;
  };
  const skin = M(cfg.skin, 0.6);
  const top = M(cfg.topColor, 0.8);
  const topDark = M(shade(cfg.topColor, 0.82), 0.8);
  const bottom = M(cfg.bottomColor, 0.85);
  const shoe = M(cfg.shoeColor, 0.55);
  const hairM = M(cfg.hairColor, 0.55, { side: THREE.DoubleSide });
  const hairShade = M(shade(cfg.hairColor, 0.82), 0.6);
  const acc = M(cfg.accColor, 0.5);
  const dark = M('#1d1d24', 0.4);
  const white = M('#ffffff', 0.45);

  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };

  const w = { slim: 0.86, regular: 1, broad: 1.22 }[cfg.bodyType];
  const limbW = { slim: 0.9, regular: 1, broad: 1.15 }[cfg.bodyType];

  const root = new THREE.Group();
  root.name = 'avatar';
  const body = new THREE.Group();
  body.scale.setScalar(cfg.height);
  root.add(body);
  const bob = new THREE.Group();
  body.add(bob);

  // ----- legs (hip pivot at 0.6) -----
  const HIP = 0.6;
  const legs = {};
  const legUpperMat = cfg.bottom === 'skirt' ? skin : bottom;
  const legLowerMat = cfg.bottom === 'pants' ? bottom : skin;
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.075 * w * side, HIP, 0);
    bob.add(hip);
    mesh(capsule(0.066 * limbW, 0.16), legUpperMat, hip, 0, -0.14, 0);
    if (cfg.bottom === 'shorts') mesh(cyl(0.078 * limbW, 0.074 * limbW, 0.12), bottom, hip, 0, -0.1, 0);
    const knee = new THREE.Group();
    knee.position.set(0, -0.29, 0);
    hip.add(knee);
    mesh(capsule(0.058 * limbW, 0.17), legLowerMat, knee, 0, -0.14, 0);
    mesh(rbox(0.11, 0.075, 0.2, 0.035), shoe, knee, 0, -0.272, 0.03);
    legs[side < 0 ? 'L' : 'R'] = { hip, knee };
  }

  // ----- pelvis / skirt -----
  mesh(rbox(0.25 * w, 0.15, 0.17, 0.06), bottom, bob, 0, 0.64, 0);
  if (cfg.bottom === 'skirt') {
    const sk = mesh(cyl(0.135 * w, 0.21 * w, 0.22, 24, true), M(cfg.bottomColor, 0.85, { side: THREE.DoubleSide }), bob, 0, 0.55, 0);
    sk.scale.z = 0.82;
  }

  // ----- torso -----
  const torso = new THREE.Group();
  torso.position.set(0, 0.62, 0);
  bob.add(torso);
  const tW = 0.29 * w, tD = 0.19 * Math.min(w, 1.12);
  mesh(rbox(tW, 0.37, tD, 0.075), top, torso, 0, 0.185, 0);
  const front = tD / 2;
  if (cfg.top === 'hoodie') {
    const hood = mesh(torus(0.085 * w, 0.042), top, torso, 0, 0.37, -0.035);
    hood.rotation.x = Math.PI / 2 - 0.3;
    hood.scale.set(1, 1, 0.8);
    mesh(rbox(tW * 0.62, 0.1, 0.03, 0.015), topDark, torso, 0, 0.08, front + 0.004);
    for (const s of [-1, 1]) mesh(cyl(0.006, 0.006, 0.11, 6), white, torso, 0.03 * s, 0.28, front + 0.008);
  } else if (cfg.top === 'polo') {
    for (const s of [-1, 1]) {
      const c = mesh(rbox(0.075, 0.025, 0.055, 0.01), top, torso, 0.04 * s, 0.365, front - 0.015);
      c.rotation.set(0.5, 0, -0.45 * s);
    }
    mesh(rbox(0.035, 0.1, 0.008, 0.003), topDark, torso, 0, 0.3, front + 0.002);
    for (const y of [0.32, 0.28]) mesh(sphere(0.007, 8, 6), white, torso, 0, y, front + 0.008);
  } else if (cfg.top === 'blazer') {
    mesh(rbox(0.09, 0.2, 0.015, 0.006), white, torso, 0, 0.27, front - 0.001);
    mesh(rbox(0.026, 0.14, 0.01, 0.004), acc, torso, 0, 0.26, front + 0.009);
    for (const s of [-1, 1]) {
      const l = mesh(rbox(0.05, 0.19, 0.016, 0.006), topDark, torso, 0.055 * s, 0.27, front + 0.006);
      l.rotation.z = 0.3 * s;
    }
    for (const y of [0.12, 0.06]) mesh(sphere(0.009, 8, 6), dark, torso, 0, y, front + 0.008);
  } else {
    const neck = mesh(torus(0.055, 0.012), M(shade(cfg.skin, 0.9), 0.6), torso, 0, 0.368, 0.012);
    neck.rotation.x = Math.PI / 2;
  }

  // ----- arms (small, slim) -----
  const longSleeves = cfg.top === 'hoodie' || cfg.top === 'blazer';
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set((tW / 2 + 0.035) * side, 0.95, 0);
    shoulder.rotation.z = 0.1 * side;
    bob.add(shoulder);
    mesh(sphere(0.056 * limbW), top, shoulder);
    mesh(capsule(0.05 * limbW, 0.11), top, shoulder, 0, -0.1, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.2, 0);
    shoulder.add(elbow);
    mesh(capsule(0.044 * limbW, 0.1), longSleeves ? top : skin, elbow, 0, -0.07, 0);
    if (!longSleeves) mesh(capsule(0.047 * limbW, 0.03), skin, shoulder, 0, -0.17, 0);
    mesh(sphere(0.048, 14, 10), skin, elbow, 0, -0.18, 0.004);
    arms[side < 0 ? 'L' : 'R'] = { shoulder, elbow };
  }

  // ----- neck + head -----
  mesh(cyl(0.042, 0.048, 0.1), skin, bob, 0, 1.01, 0);
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0);
  bob.add(head);
  const shapeScale = { round: [1, 0.96, 0.96], oval: [0.92, 1.03, 0.94], square: [1, 1, 1] }[cfg.faceShape];
  const headInner = new THREE.Group();
  headInner.scale.set(...shapeScale);
  head.add(headInner);
  const square = cfg.faceShape === 'square';
  if (square) mesh(rbox(0.57, 0.55, 0.54, 0.22), skin, headInner);
  else mesh(sphere(R, 40, 28), skin, headInner);

  // ears
  for (const s of [-1, 1]) {
    const ear = mesh(sphere(0.06, 12, 10), skin, headInner, (square ? 0.29 : R * 0.97) * s, -0.03, -0.01);
    ear.scale.set(0.45, 1, 0.75);
  }

  // painted face
  const faceTex = drawFace(cfg);
  disposables.push(faceTex);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  disposables.push(faceMat);
  if (square) {
    const fw = (FACE_PHI * 2) * R * 0.95, fh = FACE_THETA_LEN * R * 0.95;
    const plane = new THREE.Mesh(geo('facePlane', () => new THREE.PlaneGeometry(fw, fh)), faceMat);
    plane.position.set(0, (0.75 - FACE_THETA0) * R + 0.02, 0.281);
    headInner.add(plane);
  } else {
    const face = new THREE.Mesh(
      geo('faceShell', () => new THREE.SphereGeometry(R * 1.004, 40, 28, Math.PI / 2 - FACE_PHI, FACE_PHI * 2, Math.PI / 2 - FACE_THETA0, FACE_THETA_LEN)),
      faceMat,
    );
    headInner.add(face);
  }

  // ----- hair -----
  const hairGroup = new THREE.Group();
  headInner.add(hairGroup);
  if (square) hairGroup.scale.set(1.06, 1.02, 1.06);
  else if (cfg.faceShape === 'oval') hairGroup.scale.set(1.03, 1.0, 1.03);
  const hr = square ? R * 1.06 : R;
  let style = cfg.hair;
  if (cfg.cap && ['spiky', 'curly', 'bun', 'spacebuns', 'manbun'].includes(style)) style = 'short';

  const down = new THREE.Vector3(0, -1, 0);
  const basis = new THREE.Matrix4();
  /**
   * A tapered lock of hair rooted on the scalp.
   * az: 0 = front, + = avatar's left. el: elevation (radians, 0 = level with the ears).
   * opts.sway rotates it sideways, opts.straight pulls it toward hanging straight down, opts.out flares it outward.
   */
  function lock(az, el, len, width, depth, opts = {}) {
    const n = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const t = down.clone().addScaledVector(n, n.y);
    if (t.lengthSq() < 1e-6) t.set(-Math.sin(az), 0, -Math.cos(az));
    t.normalize();
    if (opts.sway) t.applyAxisAngle(n, opts.sway);
    if (opts.straight) t.lerp(down, opts.straight).normalize();
    if (opts.out) t.addScaledVector(n, opts.out).normalize();
    const center = n.clone().multiplyScalar(hr + (opts.lift || 0)).addScaledVector(t, len * 0.46).addScaledVector(n, depth * 0.3);
    const m = mesh(opts.spike ? cone(1, 2) : lockGeo(), opts.mat || hairM, hairGroup, center.x, center.y, center.z);
    // orient: local +Y = root direction (-t), local Z = scalp normal
    const yAx = t.clone().negate();
    const zAx = n.clone().addScaledVector(yAx, -n.dot(yAx)).normalize();
    const xAx = new THREE.Vector3().crossVectors(yAx, zAx);
    basis.makeBasis(xAx, yAx, zAx);
    m.quaternion.setFromRotationMatrix(basis);
    if (opts.spike) m.rotateX(Math.PI); // cone tip points away from the root
    m.scale.set(width, len / 2, depth);
    return m;
  }
  const capHair = (tilt = -0.45, tl = Math.PI * 0.56, k = 1.05) => {
    const c = mesh(hemi(hr * k, tl), hairM, hairGroup);
    c.rotation.x = tilt;
    return c;
  };
  const ahoge = (x = 0.02, rot = 0.4) => {
    const a = mesh(torus(0.06, 0.011, Math.PI * 1.1), hairM, hairGroup, x, hr * 1.04 + 0.045, -0.02);
    a.rotation.set(0, rot, 0.5);
  };
  /** A row of bangs across the forehead. kind: blunt | messy | swept | parted | spiky */
  const bangs = (kind, n = 9, baseLen = 0.2) => {
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5; // -0.5..0.5 (avatar right → left)
      const az = f * 2.0;
      const edge = Math.abs(f) * 2; // 0 center, 1 sides
      let len = baseLen + edge * 0.08, sway = 0, wid = 0.075;
      if (kind === 'messy') { len += (i % 2 ? -0.03 : 0.02); sway = (i % 3 - 1) * 0.25; }
      if (kind === 'swept') { sway = 0.55; len = baseLen * (0.85 + (f + 0.5) * 0.5); }
      if (kind === 'parted') { if (Math.abs(f) < 0.08) continue; sway = Math.sign(f) * 0.7; len += 0.02; }
      if (kind === 'blunt') { len = baseLen + edge * 0.02; wid = 0.085; }
      lock(az, 0.7 - edge * 0.25, len * 0.82, wid, 0.045, { sway, spike: kind === 'spiky' });
    }
  };
  const sideLocks = (len, el = 0.3, opts = {}) => {
    for (const s of [-1, 1]) {
      lock(s * 1.15, el, len, 0.07, 0.05, { straight: 0.5, ...opts });
      lock(s * 1.45, el + 0.05, len * 0.95, 0.075, 0.05, { straight: 0.5, ...opts });
    }
  };
  const backLocks = (len, count = 9, el = 0.3, opts = {}) => {
    for (let i = 0; i < count; i++) {
      const az = Math.PI + (i / (count - 1) - 0.5) * 2.7;
      lock(az, el + (i % 2) * 0.05, len * (0.94 + (i % 3) * 0.04), 0.11, 0.06, { straight: 0.55, ...opts });
    }
  };
  const bunAt = (x, y, z, r) => {
    const b = mesh(sphere(r, 20, 16), hairM, hairGroup, x, y, z);
    // a few swirl strands on the bun
    for (let i = 0; i < 3; i++) {
      const s = mesh(torus(r * (0.55 + i * 0.15), r * 0.12, Math.PI * 1.2), hairShade, hairGroup, x, y, z);
      s.lookAt(new THREE.Vector3(x, y, z).multiplyScalar(2));
      s.rotateZ(i * 1.3);
    }
    return b;
  };
  const curls = (spots, r = 0.045) => spots.forEach(([x, y, z]) => mesh(torus(r, r * 0.45), hairM, hairGroup, x, y, z).rotation.set(Math.PI / 2, 0, 0));

  switch (style) {
    case 'short':
      capHair(-0.45, Math.PI * 0.55);
      bangs('messy', 8, 0.17);
      sideLocks(0.17, 0.35);
      backLocks(0.2, 7, 0.35, { straight: 0.3 });
      ahoge();
      break;
    case 'swept':
      capHair(-0.45, Math.PI * 0.55);
      bangs('swept', 8, 0.2);
      sideLocks(0.16, 0.35);
      backLocks(0.19, 7, 0.38, { straight: 0.3 });
      break;
    case 'curtains':
      capHair(-0.45, Math.PI * 0.55);
      bangs('parted', 9, 0.22);
      sideLocks(0.2, 0.3);
      backLocks(0.2, 7, 0.36, { straight: 0.3 });
      ahoge(-0.03, -0.6);
      break;
    case 'spiky': {
      capHair(-0.4, Math.PI * 0.5);
      bangs('spiky', 7, 0.2);
      const spikes = [[0, 1, 0.1], [0.5, 0.8, 0.2], [-0.5, 0.8, 0.2], [0, 0.75, -0.6], [0.6, 0.6, -0.45], [-0.6, 0.6, -0.45], [0.3, 0.5, -0.8], [-0.3, 0.5, -0.8], [0.85, 0.35, -0.1], [-0.85, 0.35, -0.1]];
      for (const [x, y, z] of spikes) {
        const d = new THREE.Vector3(x, y, z).normalize();
        const c = mesh(cone(0.07, 0.2), hairM, hairGroup, d.x * hr * 1.02, d.y * hr * 1.02, d.z * hr * 1.02);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      }
      break;
    }
    case 'manbun':
      capHair(-0.5, Math.PI * 0.52, 1.03);
      bangs('swept', 6, 0.15);
      bunAt(0, hr * 0.82, -hr * 0.52, 0.08);
      mesh(torus(0.05, 0.014), acc, hairGroup, 0, hr * 0.74, -hr * 0.43).rotation.x = -0.9;
      break;
    case 'bob':
      capHair(-0.45, Math.PI * 0.57);
      bangs('blunt', 10, 0.2);
      sideLocks(0.3, 0.28, { out: 0.15 });
      backLocks(0.32, 11, 0.28, { out: 0.12 });
      ahoge();
      break;
    case 'long':
      capHair(-0.45, Math.PI * 0.57);
      bangs('blunt', 9, 0.21);
      sideLocks(0.55, 0.2);
      backLocks(0.62, 11, 0.25, { straight: 0.75 });
      break;
    case 'wavy': {
      capHair(-0.45, Math.PI * 0.57);
      bangs('messy', 9, 0.2);
      sideLocks(0.48, 0.2, { out: 0.12 });
      backLocks(0.52, 11, 0.25, { straight: 0.6, out: 0.08 });
      const ends = [];
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8 - 0.5) * 3.6; ends.push([Math.sin(a) * hr * 1.2, -0.38, Math.cos(a) * hr * 1.15]); }
      curls(ends, 0.05);
      ahoge();
      break;
    }
    case 'curly': {
      capHair(-0.4, Math.PI * 0.5, 1.0);
      const n = 46;
      for (let i = 0; i < n; i++) {
        const yy = 1 - (i / (n - 1)) * 1.45;
        const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
        const th = i * 2.39996;
        const p = new THREE.Vector3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
        if (p.z > 0.45 && p.y < 0.5) continue; // keep the face clear
        mesh(sphere(0.075 + (i % 3) * 0.01, 12, 10), hairM, hairGroup, p.x * hr * 1.08, p.y * hr * 1.05 + 0.02, p.z * hr * 1.08);
      }
      for (let i = 0; i < 6; i++) { const az = (i / 5 - 0.5) * 1.5; mesh(sphere(0.06, 12, 10), hairM, hairGroup, Math.sin(az) * hr * 0.95, hr * 0.62, Math.cos(az) * hr * 0.78); }
      break;
    }
    case 'ponytail': {
      capHair(-0.45, Math.PI * 0.56);
      bangs('messy', 8, 0.19);
      sideLocks(0.24, 0.3);
      mesh(torus(0.045, 0.016), acc, hairGroup, 0, hr * 0.55, -hr * 0.85).rotation.x = -0.5;
      const tail = lock(Math.PI, 0.55, 0.5, 0.13, 0.12, { straight: 0.7, lift: 0.04 });
      tail.position.z -= 0.06;
      break;
    }
    case 'sidetail': {
      capHair(-0.45, Math.PI * 0.56);
      bangs('swept', 8, 0.2);
      sideLocks(0.22, 0.3);
      backLocks(0.24, 7, 0.36, { straight: 0.3 });
      lock(1.45, 0.62, 0.48, 0.13, 0.12, { out: 0.2, straight: 0.35, lift: 0.03 });
      const bx = Math.sin(1.4) * hr * 0.95, by = hr * 0.62, bz = Math.cos(1.4) * hr * 0.6;
      for (const s of [-1, 1]) {
        const wing = mesh(sphere(0.05, 12, 10), acc, hairGroup, bx + 0.015, by + s * 0.045, bz);
        wing.scale.set(0.5, 1, 0.55);
        wing.rotation.x = s * 0.4;
      }
      mesh(sphere(0.022, 10, 8), acc, hairGroup, bx + 0.02, by, bz);
      break;
    }
    case 'bun':
      capHair(-0.45, Math.PI * 0.56);
      bangs('messy', 8, 0.2);
      sideLocks(0.3, 0.25, { sway: 0.2 });
      backLocks(0.22, 7, 0.38, { straight: 0.3 });
      bunAt(0, hr * 1.0, -hr * 0.3, 0.12);
      break;
    case 'spacebuns':
      capHair(-0.45, Math.PI * 0.56);
      bangs('blunt', 9, 0.19);
      sideLocks(0.28, 0.25, { out: 0.1 });
      backLocks(0.26, 9, 0.3, { straight: 0.5 });
      for (const s of [-1, 1]) bunAt(s * hr * 0.68, hr * 0.78, -hr * 0.12, 0.1);
      break;
    case 'braid': {
      capHair(-0.45, Math.PI * 0.56);
      bangs('swept', 8, 0.2);
      sideLocks(0.22, 0.3);
      backLocks(0.26, 9, 0.32, { straight: 0.5 });
      // braid over the avatar's right shoulder, in front
      let x = -hr * 0.78, y = -0.02, z = hr * 0.35;
      for (let i = 0; i < 6; i++) {
        const r = 0.055 - i * 0.004;
        const seg = mesh(sphere(r, 12, 10), i % 2 ? hairShade : hairM, hairGroup, x + (i % 2 ? 0.012 : -0.012), y, z);
        seg.scale.set(1, 1.15, 0.85);
        y -= 0.07; z += 0.012;
      }
      mesh(torus(0.026, 0.01), acc, hairGroup, x, y + 0.03, z).rotation.x = Math.PI / 2;
      const tip = mesh(lockGeo(), hairM, hairGroup, x, y - 0.03, z);
      tip.scale.set(0.035, 0.06, 0.03);
      break;
    }
    default: break; // bald
  }

  // ----- accessories -----
  const eyePos = (side) => {
    const az = side * 0.41, el = -0.12;
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  };
  if (cfg.glasses) {
    const frame = M('#26262e', 0.35);
    const lens = M('#bfe3ff', 0.1, { transparent: true, opacity: 0.22 });
    for (const s of [-1, 1]) {
      const n = eyePos(s);
      const p = n.clone().multiplyScalar(square ? 0.3 : R + 0.025);
      if (square) p.z = 0.3;
      const ring = mesh(torus(0.088, 0.009), frame, headInner, p.x, p.y, p.z);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), square ? new THREE.Vector3(0, 0, 1) : n);
      const l = mesh(geo('lens', () => new THREE.CircleGeometry(0.086, 24)), lens, headInner, p.x, p.y, p.z - 0.002);
      l.quaternion.copy(ring.quaternion);
      l.castShadow = false;
      const arm = mesh(rbox(0.008, 0.008, 0.26, 0.003), frame, headInner, s * R * 0.9, p.y + 0.01, -0.02);
      arm.rotation.y = 0.05 * s;
    }
    const bp = new THREE.Vector3(0, -0.08, 1).normalize().multiplyScalar(R + 0.03);
    mesh(cyl(0.006, 0.006, 0.07, 6), frame, headInner, 0, bp.y + 0.03, square ? 0.31 : bp.z).rotation.z = Math.PI / 2;
  }
  if (cfg.cap) {
    const capR = hr * 1.12;
    const c = mesh(hemi(capR, Math.PI * 0.52), acc, headInner, 0, -0.01, -0.01);
    c.rotation.x = -0.3;
    const brim = mesh(cyl(0.21, 0.21, 0.02, 28), acc, headInner, 0, 0.12, capR * 0.78);
    brim.scale.set(1, 1, 0.9);
    brim.rotation.x = 0.32;
    mesh(sphere(0.025, 8, 6), acc, headInner, 0, capR + 0.02, -0.05);
  }
  if (cfg.headphones) {
    const hpR = hr * (cfg.cap ? 1.22 : 1.14) + (style === 'curly' ? 0.05 : 0);
    mesh(torus(hpR, 0.022, Math.PI), dark, headInner, 0, 0, 0);
    for (const s of [-1, 1]) {
      const cup = mesh(cyl(0.085, 0.085, 0.07, 20), acc, headInner, (hpR - 0.01) * s, -0.02, 0);
      cup.rotation.z = Math.PI / 2;
      const pad = mesh(cyl(0.065, 0.065, 0.025, 18), dark, headInner, (hpR - 0.05) * s, -0.02, 0);
      pad.rotation.z = Math.PI / 2;
    }
  }
  if (cfg.backpack) {
    mesh(rbox(0.25 * w, 0.3, 0.13, 0.05), acc, torso, 0, 0.19, -tD / 2 - 0.06);
    mesh(rbox(0.18 * w, 0.11, 0.04, 0.02), M(shade(cfg.accColor, 0.8)), torso, 0, 0.11, -tD / 2 - 0.135);
    for (const s of [-1, 1]) {
      const strap = mesh(rbox(0.035, 0.34, 0.015, 0.008), dark, torso, 0.08 * w * s, 0.2, tD / 2 + 0.004);
      strap.rotation.z = 0.05 * s;
    }
  }
  if (cfg.lanyard) {
    const ly = M(cfg.accColor, 0.6);
    for (const s of [-1, 1]) {
      const strip = mesh(rbox(0.014, 0.17, 0.005, 0.002), ly, torso, 0.04 * s, 0.29, front + 0.005);
      strip.rotation.z = -0.35 * s;
    }
    const neckRing = mesh(torus(0.06, 0.007), ly, bob, 0, 0.995, 0);
    neckRing.rotation.x = Math.PI / 2 - 0.3;
    mesh(rbox(0.065, 0.085, 0.01, 0.008), white, torso, 0, 0.18, front + 0.01);
    mesh(rbox(0.065, 0.022, 0.012, 0.006), ly, torso, 0, 0.212, front + 0.011);
    mesh(rbox(0.024, 0.026, 0.012, 0.004), M('#c9cbd6', 0.6), torso, -0.014, 0.17, front + 0.012);
  }

  const tallHair = ['bun', 'spacebuns', 'spiky', 'curly', 'manbun'].includes(style) ? 0.08 : 0.03;
  const hipHeight = HIP * cfg.height;
  const headTop = (HEAD_Y + R * shapeScale[1] + tallHair + (cfg.cap ? 0.04 : 0)) * cfg.height;

  return {
    cfg, root, body, bob, torso, head, legs, arms,
    hipHeight, headTop,
    anim: { walk: 0, phase: 0, sit: 0, typing: 0, t: Math.random() * 10 },
    dispose() {
      disposables.forEach((d) => d.dispose());
      root.removeFromParent();
    },
  };
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
  a.phase += dt * (5 + 7 * a.walk) * (a.walk > 0.02 ? 1 : 0);

  const sw = Math.sin(a.phase);
  const walk = a.walk;
  const sit = a.sit;
  const breathe = Math.sin(a.t * 1.8) * 0.008;

  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const leg = av.legs[side];
    const walkHip = sw * 0.7 * s * walk;
    const walkKnee = Math.max(0, -sw * s) * 0.9 * walk + 0.04;
    leg.hip.rotation.x = lerp(walkHip, -Math.PI / 2 + 0.1, sit);
    leg.knee.rotation.x = lerp(walkKnee, Math.PI / 2 - 0.1, sit);
    leg.hip.rotation.z = lerp(0, 0.05 * -s, sit);

    const arm = av.arms[side];
    const typeJit = a.typing * Math.sin(a.t * 18 + s) * 0.06;
    const walkArm = -sw * 0.6 * s * walk;
    const sitArm = state.typing ? -0.55 + typeJit : -0.2;
    arm.shoulder.rotation.x = lerp(walkArm, sitArm, sit);
    arm.elbow.rotation.x = lerp(-0.15 - walk * 0.3, state.typing ? -1.1 : -0.9, sit);
    arm.shoulder.rotation.z = (0.12 + breathe * 2) * -s * (1 - sit) + 0.06 * -s * sit;
  }
  av.bob.position.y = Math.abs(Math.sin(a.phase)) * 0.04 * walk * (1 - sit) + breathe * (1 - walk);
  av.torso.rotation.x = 0.05 * walk * (1 - sit) - 0.03 * sit;
  // chibi heads bob and tilt a bit more
  av.head.rotation.y = Math.sin(a.t * 0.5) * 0.14 * (1 - walk);
  av.head.rotation.z = Math.sin(a.t * 0.8) * 0.04 * (1 - walk) + Math.sin(a.phase) * 0.04 * walk;
  av.head.rotation.x = Math.sin(a.t * 0.7) * 0.03 + (state.typing ? 0.15 : 0) * sit;
}
