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

const TOPS = ['tshirt', 'hoodie', 'zipup', 'sweater', 'cardigan', 'striped', 'raglan', 'polo', 'blazer', 'varsity', 'track', 'cami', 'offshoulder'];
const TOP_LABELS = { tshirt: 'T-shirt', zipup: 'Zip hoodie', striped: 'Striped tee', raglan: 'Raglan tee', varsity: 'Varsity jacket', track: 'Track jacket', cami: 'Cami top', offshoulder: 'Off-shoulder' };
const BOTTOMS = ['pants', 'wide', 'cargo', 'joggers', 'track', 'shorts', 'skirt', 'ruffle', 'long', 'sundress', 'pinafore', 'overalls'];
const BOTTOM_LABELS = { wide: 'Wide-leg jeans', cargo: 'Cargo pants', track: 'Track pants', skirt: 'Pleated skirt', ruffle: 'Ruffle skirt', long: 'Long skirt', sundress: 'Sundress', pinafore: 'Pinafore dress' };
const SHOES = ['sneakers', 'hightops', 'maryjanes', 'platforms', 'boots', 'bunny'];
const SHOE_LABELS = { hightops: 'High-tops', maryjanes: 'Mary Janes', bunny: 'Bunny slippers' };
const HATS = ['none', 'cap', 'beanie', 'bucket', 'frog', 'bunny', 'cat'];
const HAT_LABELS = { bucket: 'Bucket hat', frog: 'Frog hat', bunny: 'Bunny ears', cat: 'Cat ears' };
const PATTERNS = ['plain', 'stripes', 'plaid', 'dots', 'hearts', 'stars', 'flowers'];
const PRINTS = ['none', 'heart', 'star', 'bow', 'cat', 'frog', 'cloud', 'flower', 'strawberry'];
export const CLOTH_COLORS = ['#f7f3ea', '#ffc8d8', '#f49ac1', '#fde7a8', '#b9e4a8', '#6fbf73', '#a9cdf2', '#5b7cfa', '#c8b6f0', '#c9a27e', '#7a5a45', '#9aa0a6', '#3a3d46', '#1f2026'];

export const AVATAR_SCHEMA = [
  { section: 'Body', fields: [
    { key: 'gender', label: 'Body shape', type: 'choice', options: ['female', 'male'], labels: { female: 'Female', male: 'Male' } },
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
  { section: 'Top', fields: [
    { key: 'top', label: 'Style', type: 'choice', options: TOPS, labels: TOP_LABELS },
    { key: 'topColor', label: 'Color', type: 'color', presets: CLOTH_COLORS },
    { key: 'topPattern', label: 'Pattern', type: 'choice', options: PATTERNS },
    { key: 'print', label: 'Chest print', type: 'choice', options: PRINTS },
  ] },
  { section: 'Bottom', fields: [
    { key: 'bottom', label: 'Style', type: 'choice', options: BOTTOMS, labels: BOTTOM_LABELS },
    { key: 'bottomColor', label: 'Color', type: 'color', presets: CLOTH_COLORS },
    { key: 'bottomPattern', label: 'Pattern', type: 'choice', options: PATTERNS },
  ] },
  { section: 'Shoes', fields: [
    { key: 'shoeStyle', label: 'Shoes', type: 'choice', options: SHOES, labels: SHOE_LABELS },
    { key: 'shoeColor', label: 'Shoe color', type: 'color', presets: CLOTH_COLORS },
    { key: 'socks', label: 'Socks', type: 'choice', options: ['none', 'ankle', 'long', 'legwarmers'], labels: { long: 'Knee socks', legwarmers: 'Leg warmers' } },
  ] },
  { section: 'Extras', fields: [
    { key: 'hat', label: 'Hat', type: 'choice', options: HATS, labels: HAT_LABELS },
    { key: 'glasses', label: 'Glasses', type: 'toggle' },
    { key: 'headphones', label: 'Headphones', type: 'toggle' },
    { key: 'hairbow', label: 'Hair bow', type: 'toggle' },
    { key: 'backpack', label: 'Backpack', type: 'toggle' },
    { key: 'crossbody', label: 'Crossbody bag', type: 'toggle' },
    { key: 'lanyard', label: 'Lanyard / ID', type: 'toggle' },
    { key: 'accColor', label: 'Accessory color', type: 'color', presets: CLOTH_COLORS },
  ] },
];

export const DEFAULT_AVATAR = {
  gender: 'female', skin: '#f8d0b4', bodyType: 'regular', height: 1,
  faceShape: 'round', eyes: 'round', eyeColor: '#6b3e26', mouth: 'smile', blush: true,
  hair: 'bob', hairColor: '#3b2a24',
  top: 'hoodie', topColor: '#a9cdf2', topPattern: 'plain', print: 'star',
  bottom: 'wide', bottomColor: '#5d7290', bottomPattern: 'plain',
  shoeStyle: 'sneakers', shoeColor: '#f7f3ea', socks: 'none',
  hat: 'none', glasses: false, headphones: false, hairbow: false, backpack: false, crossbody: false, lanyard: false, accColor: '#f49ac1',
};

const HEX = /^#[0-9a-f]{6}$/i;
const FIELDS = AVATAR_SCHEMA.flatMap((s) => s.fields);

/** Fill missing/invalid values with defaults so remote data can never break the builder. */
export function normalizeAvatar(cfg) {
  const out = { ...DEFAULT_AVATAR };
  if (!cfg || typeof cfg !== 'object') return out;
  if (cfg.cap === true && !cfg.hat) out.hat = 'cap'; // older saved avatars
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
  if (cfg.gender === 'male') {
    if (Math.random() < 0.85) cfg.hair = pick(['short', 'swept', 'curtains', 'spiky', 'manbun', 'curly']);
    if (['skirt', 'ruffle', 'long', 'sundress', 'pinafore'].includes(cfg.bottom) && Math.random() < 0.85) cfg.bottom = pick(['pants', 'wide', 'cargo', 'joggers', 'track', 'shorts']);
    if (['cami', 'offshoulder'].includes(cfg.top)) cfg.top = pick(['tshirt', 'hoodie', 'polo']);
  }
  cfg.hairColor = Math.random() < 0.7 ? pick(HAIR_COLORS.slice(0, 6)) : pick(HAIR_COLORS);
  cfg.eyeColor = pick(EYE_COLORS);
  cfg.topColor = Math.random() < 0.75 ? pick(CLOTH_COLORS) : randColor(0.6, 0.6);
  cfg.bottomColor = pick(CLOTH_COLORS);
  cfg.shoeColor = pick(CLOTH_COLORS);
  cfg.accColor = pick(CLOTH_COLORS.slice(1, 9));
  cfg.topPattern = Math.random() < 0.7 ? 'plain' : pick(PATTERNS);
  cfg.bottomPattern = Math.random() < 0.7 ? 'plain' : pick(PATTERNS);
  cfg.print = Math.random() < 0.5 ? 'none' : pick(PRINTS);
  cfg.hat = Math.random() < 0.65 ? 'none' : pick(HATS);
  if (cfg.hat !== 'none' && cfg.headphones) cfg.headphones = false;
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
const FACE_W = 512, FACE_H = 471; // 269 px per radian on the head sphere
const FACE_PHI = 0.95, FACE_THETA0 = 0.6, FACE_THETA_LEN = 1.75;
const PX = FACE_W / (FACE_PHI * 2);

function shade(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }

function drawFace(cfg) {
  const c = document.createElement('canvas');
  c.width = FACE_W; c.height = FACE_H;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ink = '#2b1b1b';
  const eyeY = (FACE_THETA0 + 0.44) * PX;
  const eyeDX = 0.42 * PX;
  const brow = cfg.hair === 'bald' ? shade(cfg.skin, 0.55) : shade(cfg.hairColor, 0.75);

  // blush (with little anime hatch lines)
  if (cfg.blush) {
    for (const s of [-1, 1]) {
      const bx = FACE_W / 2 + s * 0.55 * PX, by = eyeY + 0.2 * PX;
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
    g.translate(cx, eyeY); g.scale(1.42, 1.42); g.translate(-cx, -eyeY);
    drawEye(cx, eyeY, side, cfg.eyes);
    g.restore();
    // eyebrows
    g.strokeStyle = brow;
    g.lineWidth = 6;
    const by = eyeY - 102;
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
  const mx = FACE_W / 2, my = eyeY + 0.4 * PX;
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

// ---------- fabric patterns + chest prints (canvas textures, shared) ----------
const texCache = new Map();
function luminance(hex) { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 0.9, y - s * 0.2, x - s * 0.35, y - s * 0.85, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.35, y - s * 0.85, x + s * 0.9, y - s * 0.2, x, y + s * 0.35);
  g.closePath();
}
function starPath(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
function flowerAt(g, x, y, r, petal, center) {
  g.fillStyle = petal;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = center;
  g.beginPath(); g.arc(x, y, r * 0.35, 0, Math.PI * 2); g.fill();
}

function patternTexture(base, pat) {
  const key = `${base}|${pat}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  const light = luminance(base) > 0.55;
  const ink = light ? shade(base, 0.72) : 'rgba(255,255,255,0.8)';
  const ink2 = light ? shade(base, 0.85) : 'rgba(255,255,255,0.35)';
  g.fillStyle = ink;
  switch (pat) {
    case 'stripes':
      for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 14);
      break;
    case 'plaid':
      g.globalAlpha = 0.45;
      g.fillStyle = ink; g.fillRect(0, 0, 128, 40); g.fillRect(0, 64, 128, 40);
      g.fillRect(0, 0, 40, 128); g.fillRect(64, 0, 40, 128);
      g.globalAlpha = 0.8;
      g.fillStyle = ink2;
      g.fillRect(0, 50, 128, 4); g.fillRect(0, 114, 128, 4); g.fillRect(50, 0, 4, 128); g.fillRect(114, 0, 4, 128);
      g.globalAlpha = 1;
      break;
    case 'dots':
      for (const [x, y] of [[16, 16], [80, 16], [48, 64], [112, 64], [16, 112], [80, 112]]) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
      break;
    case 'hearts':
      g.fillStyle = light ? '#f06f8d' : '#ffc8d8';
      for (const [x, y] of [[32, 32], [96, 96]]) { heartPath(g, x, y, 22); g.fill(); }
      g.fillStyle = ink2;
      for (const [x, y] of [[96, 30], [30, 96]]) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
      break;
    case 'stars':
      g.fillStyle = light ? '#f2b84b' : '#ffe08a';
      for (const [x, y, r] of [[32, 32, 16], [96, 90, 16], [96, 26, 7], [26, 100, 7]]) { starPath(g, x, y, r); g.fill(); }
      break;
    case 'flowers':
      for (const [x, y] of [[32, 32], [96, 96]]) flowerAt(g, x, y, 20, light ? '#ffffff' : 'rgba(255,255,255,0.9)', '#f6c177');
      flowerAt(g, 96, 30, 9, light ? '#f49ac1' : '#ffc8d8', '#fff1b8');
      flowerAt(g, 30, 98, 9, light ? '#f49ac1' : '#ffc8d8', '#fff1b8');
      break;
    default: break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

function printTexture(kind, color) {
  const key = `print|${kind}|${color}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  const outline = '#3a2a2a';
  const stroke = () => { g.lineWidth = 5; g.strokeStyle = outline; g.stroke(); };
  switch (kind) {
    case 'heart': heartPath(g, 64, 70, 58); g.fillStyle = color; g.fill(); stroke(); break;
    case 'star': starPath(g, 64, 66, 52); g.fillStyle = color; g.fill(); stroke(); break;
    case 'bow':
      g.fillStyle = color;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(64, 60); g.quadraticCurveTo(64 + s * 70, 10, 64 + s * 52, 70); g.quadraticCurveTo(64 + s * 30, 80, 64, 60); g.fill(); stroke();
        g.beginPath(); g.moveTo(64, 66); g.lineTo(64 + s * 30, 118); g.lineTo(64 + s * 14, 112); g.closePath(); g.fill(); stroke();
      }
      g.beginPath(); g.arc(64, 62, 12, 0, Math.PI * 2); g.fill(); stroke();
      break;
    case 'cat':
    case 'frog': {
      const face = kind === 'frog' ? '#8fd16a' : color;
      g.fillStyle = face;
      if (kind === 'cat') {
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64 + s * 46, 30); g.lineTo(64 + s * 50, 72); g.lineTo(64 + s * 14, 50); g.closePath(); g.fill(); stroke(); }
      } else {
        for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * 28, 42, 20, 0, Math.PI * 2); g.fill(); stroke(); }
      }
      g.beginPath(); g.ellipse(64, 74, 50, 40, 0, 0, Math.PI * 2); g.fill(); stroke();
      g.fillStyle = outline;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * (kind === 'frog' ? 28 : 20), kind === 'frog' ? 42 : 70, 6, 0, Math.PI * 2); g.fill(); }
      g.lineWidth = 4; g.strokeStyle = outline;
      g.beginPath(); g.arc(57, 82, 7, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(71, 82, 7, 0, Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,120,140,0.6)';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * 34, 86, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'cloud':
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(40, 76, 24, Math.PI * 0.5, Math.PI * 1.5); g.arc(58, 48, 26, Math.PI, Math.PI * 1.85); g.arc(88, 56, 24, Math.PI * 1.2, Math.PI * 0.5);
      g.closePath(); g.fill(); stroke();
      g.fillStyle = '#f2b84b';
      for (const [x, y, r] of [[22, 26, 9], [106, 24, 11], [112, 92, 7]]) { starPath(g, x, y, r); g.fill(); }
      break;
    case 'flower':
      flowerAt(g, 64, 64, 50, color, '#f6c177');
      g.beginPath(); g.arc(64, 64, 17, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = outline; g.stroke();
      break;
    case 'strawberry':
      g.fillStyle = '#e8485c';
      g.beginPath(); g.moveTo(64, 116); g.bezierCurveTo(14, 80, 22, 34, 64, 38); g.bezierCurveTo(106, 34, 114, 80, 64, 116); g.fill(); stroke();
      g.fillStyle = '#5fb35c';
      starPath(g, 64, 34, 22); g.fill(); stroke();
      g.fillStyle = '#ffe8a8';
      for (const [x, y] of [[50, 62], [76, 60], [62, 82], [44, 86], [82, 86], [64, 102]]) { g.beginPath(); g.ellipse(x, y, 3, 4.5, 0, 0, Math.PI * 2); g.fill(); }
      break;
    default: break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

// ---------- sculpted body shapes (smooth lathe surfaces, like a single base mesh) ----------
// Torso silhouettes [world y, half-width], measured from the reference base model
// (head = 1/3 of the height, narrow chest, tiny waist, wide hips for female).
const BODY_PROFILES = {
  female: [
    [0.55, 0.0], [0.56, 0.1], [0.6, 0.162], [0.66, 0.18], [0.71, 0.16], [0.76, 0.112], [0.8, 0.098], [0.84, 0.1],
    [0.89, 0.116], [0.93, 0.126], [0.97, 0.124], [0.995, 0.112], [1.012, 0.085], [1.024, 0.05], [1.032, 0.0],
  ],
  male: [
    [0.55, 0.0], [0.56, 0.1], [0.6, 0.145], [0.66, 0.152], [0.71, 0.144], [0.76, 0.13], [0.8, 0.126], [0.84, 0.13],
    [0.89, 0.142], [0.93, 0.152], [0.97, 0.156], [0.995, 0.148], [1.012, 0.115], [1.026, 0.06], [1.036, 0.0],
  ],
};
function profileAt(P, y) {
  if (y <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) {
    if (y <= P[i][0]) {
      const [y0, r0] = P[i - 1], [y1, r1] = P[i];
      const t = (y - y0) / (y1 - y0);
      const s = t * t * (3 - 2 * t); // smooth between samples
      return r0 + (r1 - r0) * s;
    }
  }
  return 0;
}
/** A slice of the torso surface between y0 and y1, pushed out by `inflate` (for clothes). */
function bodySlice(gender, y0, y1, inflate = 0) {
  const P = BODY_PROFILES[gender];
  return geo(`slice${gender}${y0}_${y1}_${inflate}`, () => {
    const pts = [];
    const n = Math.max(6, Math.round((y1 - y0) / 0.01));
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      const r = profileAt(P, y);
      if (r < 0.0005 && (i === 0 || i === n)) { pts.push(new THREE.Vector2(0, y)); continue; }
      pts.push(new THREE.Vector2(r + inflate, y));
    }
    const g = new THREE.LatheGeometry(pts, 40);
    g.computeVertexNormals();
    return g;
  });
}
/** Smooth tapered capsule (rounded ends), centered on its local origin, along Y. */
function taper(rt, rb, len, seg = 20) {
  return geo(`taper${rt}_${rb}_${len}_${seg}`, () => {
    const pts = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(rt * Math.sin(a), len / 2 + rt * Math.cos(a))); }
    for (let i = 0; i <= steps; i++) { const a = Math.PI / 2 + (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(rb * Math.sin(a), -len / 2 + rb * Math.cos(a))); }
    pts.reverse();
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  });
}
/** Open tapered tube (for flared trouser legs, sleeves, skirts). */
function tube(rt, rb, len, seg = 24) {
  return geo(`tube${rt}_${rb}_${len}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, len, seg, 1, true));
}
/** Chibi head shape: the lower half narrows into soft cheeks and a small chin. Applied to the head and the face shell. */
function chibiDeform(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 0.3;
    if (y < 0) { const k = 1 - 0.16 * Math.pow(-y, 2.2); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (1 - 0.08 * Math.pow(-y, 2))); }
    else p.setZ(i, p.getZ(i) * (1 + 0.04 * y)); // fuller cranium
  }
  g.computeVertexNormals();
  return g;
}
const headGeo = () => geo('chibiHead', () => chibiDeform(new THREE.SphereGeometry(0.3, 48, 36)));

const R = 0.3; // head radius
const HEAD_Y = 1.35;

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
  /** A cute ribbon bow (two loops + knot), facing +z of its parent frame. */
  function bow(parent, x, y, z, scale, mat, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    parent.add(g);
    for (const s of [-1, 1]) {
      const loop = mesh(sphere(1, 14, 10), mat, g, s * 0.022, 0, 0);
      loop.scale.set(0.024, 0.016, 0.009);
      loop.rotation.z = s * 0.35;
      const tail = mesh(rbox(0.008, 0.026, 0.004, 0.002), mat, g, s * 0.008, -0.018, 0);
      tail.rotation.z = s * 0.35;
    }
    mesh(sphere(0.009, 10, 8), mat, g, 0, 0, 0.004);
    return g;
  }

  const w = { slim: 0.86, regular: 1, broad: 1.22 }[cfg.bodyType];
  const limbW = { slim: 0.9, regular: 1, broad: 1.15 }[cfg.bodyType];

  const root = new THREE.Group();
  root.name = 'avatar';
  const body = new THREE.Group();
  body.scale.setScalar(cfg.height);
  root.add(body);
  const bob = new THREE.Group();
  body.add(bob);

  // ----- clothing materials -----
  const pattern = (hex, pat, rough, extra = {}) => {
    if (!pat || pat === 'plain') return M(hex, rough, extra);
    return M('#ffffff', rough, { map: patternTexture(hex, pat), ...extra });
  };
  const topPat = cfg.top === 'striped' && cfg.topPattern === 'plain' ? 'stripes' : cfg.topPattern;
  const topMat = pattern(cfg.topColor, topPat, 0.8, { side: THREE.DoubleSide });
  const bottomMat = pattern(cfg.bottomColor, cfg.bottomPattern, 0.85, { side: THREE.DoubleSide });
  const pleatMat = pattern(cfg.bottomColor, cfg.bottomPattern, 0.85, { side: THREE.DoubleSide, flatShading: true });
  const bottomDark = M(shade(cfg.bottomColor, 0.78), 0.85);
  const rib = M(shade(cfg.topColor, 0.82), 0.9);
  const cream = M('#f5eee1', 0.8, { side: THREE.DoubleSide });
  const sockMat = M('#f7f4ef', 0.9);
  const sole = M('#f7f7f5', 0.6);
  const shoeGloss = M(cfg.shoeColor, 0.25);
  const gold = M('#f0c75e', 0.3, { metalness: 0.4 });

  // ----- sculpted torso (female / male silhouettes) -----
  const G = cfg.gender;
  const P = BODY_PROFILES[G];
  const rAt = (y) => profileAt(P, y);
  const male = G === 'male';
  const TOPY = P[P.length - 1][0]; // base of the neck
  const SH_Y = 0.99; // shoulder joints
  const TY = 0.62; // torso pivot height (it leans while walking)
  const wz = (male ? 0.7 : 0.68) * Math.min(w, 1.1);
  const frontAt = (y, inf = 0) => (rAt(y) + inf) * wz;
  const torso = new THREE.Group();
  torso.position.set(0, TY, 0);
  bob.add(torso);
  /** body-shaped shell between world heights y0..y1 */
  const shell = (y0, y1, inf, mat, parent = torso) => {
    const m = mesh(bodySlice(G, y0, y1, inf), mat, parent, 0, parent === torso ? -TY : 0, 0);
    m.scale.set(w, 1, wz);
    return m;
  };
  /** a vertical strip that hugs the body (zips, plackets, lapels, straps). angle 0 = front centre */
  const strip = (y0, y1, inf, angle, halfWidth, mat, parent = torso) => {
    const g = geo(`strip${G}${y0}_${y1}_${inf}_${angle}_${halfWidth}`, () => {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const y = y0 + ((y1 - y0) * i) / 10; pts.push(new THREE.Vector2(rAt(y) + inf, y)); }
      return new THREE.LatheGeometry(pts, 4, angle - halfWidth, halfWidth * 2);
    });
    const m = mesh(g, mat, parent, 0, parent === torso ? -TY : 0, 0);
    m.scale.set(w, 1, wz);
    return m;
  };
  /** an elliptical ring hugging the body at height y (hems, necklines, waistbands) */
  const ring = (y, inf, thick, mat, parent = torso) => {
    const r0 = rAt(y) + inf;
    const m = mesh(torus(+r0.toFixed(3), thick), mat, parent, 0, y - (parent === torso ? TY : 0), 0);
    m.rotation.x = Math.PI / 2;
    m.scale.set(w, wz, 1);
    return m;
  };
  const dot = (y, inf, mat, r = 0.008, x = 0) => mesh(sphere(r, 8, 6), mat, torso, x, y - TY, frontAt(y, inf) + r * 0.5);
  shell(0.55, 0.8, 0, skin, bob);
  shell(0.76, TOPY, 0, skin);

  // ----- legs: thick, straight, close together, flaring a little at the ankle -----
  const HIP = 0.6;
  const B = cfg.bottom;
  const T = cfg.top;
  const pantsLike = ['pants', 'wide', 'cargo', 'joggers', 'track', 'overalls'].includes(B);
  const longSock = cfg.socks === 'long' || cfg.socks === 'legwarmers';
  const legs = {};
  const SY = -0.27; // shoe height in the knee frame

  const buildShoe = (knee) => {
    switch (cfg.shoeStyle) {
      case 'hightops':
        mesh(rbox(0.1, 0.06, 0.16, 0.03), shoe, knee, 0, SY, 0.022);
        mesh(rbox(0.104, 0.022, 0.165, 0.01), sole, knee, 0, SY - 0.026, 0.022);
        mesh(taper(0.066, 0.066, 0.04, 18), shoe, knee, 0, SY + 0.045, 0);
        mesh(sphere(0.04, 12, 10), sole, knee, 0, SY - 0.004, 0.085).scale.set(1.1, 0.7, 0.8);
        break;
      case 'maryjanes':
      case 'platforms': {
        const lift = cfg.shoeStyle === 'platforms' ? 0.03 : 0;
        mesh(rbox(0.095, 0.05, 0.155, 0.025), shoeGloss, knee, 0, SY + lift, 0.022);
        mesh(rbox(0.1, 0.01, 0.02, 0.004), shoeGloss, knee, 0, SY + lift + 0.03, 0.03);
        mesh(sphere(0.007, 8, 6), sole, knee, 0.047, SY + lift + 0.03, 0.03);
        if (lift) mesh(rbox(0.1, 0.045, 0.16, 0.012), M(shade(cfg.shoeColor, 0.6), 0.5), knee, 0, SY - 0.024, 0.022);
        break;
      }
      case 'boots':
        mesh(taper(0.068, 0.068, 0.1, 18), shoe, knee, 0, SY + 0.07, 0);
        mesh(rbox(0.1, 0.06, 0.16, 0.028), shoe, knee, 0, SY, 0.022);
        mesh(rbox(0.104, 0.024, 0.165, 0.01), M('#22232a', 0.6), knee, 0, SY - 0.026, 0.022);
        break;
      case 'bunny': {
        const s = mesh(sphere(1, 18, 14), shoe, knee, 0, SY - 0.002, 0.03);
        s.scale.set(0.066, 0.048, 0.1);
        for (const e of [-1, 1]) {
          const ear = mesh(taper(0.015, 0.013, 0.035), shoe, knee, e * 0.026, SY + 0.056, 0.0);
          ear.rotation.set(-0.35, 0, -e * 0.25);
          mesh(sphere(0.007, 8, 6), dark, knee, e * 0.024, SY + 0.018, 0.122);
        }
        mesh(sphere(0.008, 8, 6), M('#ff8fa3', 0.6), knee, 0, SY + 0.003, 0.132);
        break;
      }
      default: // sneakers
        mesh(rbox(0.1, 0.06, 0.16, 0.03), shoe, knee, 0, SY, 0.022);
        mesh(rbox(0.104, 0.022, 0.165, 0.01), sole, knee, 0, SY - 0.026, 0.022);
        mesh(rbox(0.05, 0.01, 0.05, 0.004), sole, knee, 0, SY + 0.033, 0.055);
    }
  };

  const tR = (male ? 0.084 : 0.09) * limbW, kR = 0.072 * limbW, aR = 0.075 * limbW; // thigh / knee / ankle
  const legX = (male ? 0.078 : 0.088) * w;
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(legX * side, HIP, 0);
    bob.add(hip);
    mesh(taper(tR, kR, 0.2), pantsLike ? bottomMat : skin, hip, 0, -0.15, 0).scale.setScalar(pantsLike ? 1.12 : 1);
    if (B === 'shorts') mesh(tube(tR + 0.014, tR + 0.008, 0.13), bottomMat, hip, 0, -0.06, 0);
    if (B === 'cargo') mesh(rbox(0.024, 0.07, 0.06, 0.01), bottomDark, hip, side * (tR + 0.012), -0.17, 0);
    if (B === 'track') mesh(rbox(0.01, 0.24, 0.016, 0.004), white, hip, side * (tR + 0.006), -0.14, 0);
    const knee = new THREE.Group();
    knee.position.set(0, -0.3, 0);
    hip.add(knee);
    const shinMat = pantsLike ? bottomMat : longSock ? sockMat : skin;
    mesh(taper(kR, aR, 0.19), shinMat, knee, 0, -0.135, 0).scale.setScalar(pantsLike ? 1.15 : longSock ? 1.08 : 1);
    if (B === 'wide') mesh(tube(kR + 0.012, aR + 0.04, 0.25), bottomMat, knee, 0, -0.135, 0);
    if (B === 'joggers') mesh(tube(aR + 0.01, aR + 0.01, 0.035, 16), bottomDark, knee, 0, -0.235, 0);
    if (B === 'cargo') mesh(torus(aR + 0.01, 0.012), bottomDark, knee, 0, -0.23, 0).rotation.x = Math.PI / 2;
    if (B === 'track') mesh(rbox(0.01, 0.2, 0.014, 0.004), white, knee, side * (kR + 0.006), -0.13, 0);
    if (!pantsLike && cfg.socks === 'ankle') mesh(tube(aR + 0.006, aR + 0.006, 0.045, 16), sockMat, knee, 0, -0.235, 0);
    if (!pantsLike && cfg.socks === 'legwarmers') {
      [-0.08, -0.14, -0.2].forEach((y) => mesh(torus(kR + 0.006, 0.015), sockMat, knee, 0, y, 0).rotation.x = Math.PI / 2);
    }
    buildShoe(knee);
    legs[side < 0 ? 'L' : 'R'] = { hip, knee };
  }

  // ----- bottoms around the hips -----
  const st = (rAt(0.63) + 0.016) * w; // skirts start where the hips are widest
  if (pantsLike || B === 'shorts') shell(0.55, 0.81, 0.008, bottomMat, bob);
  else shell(0.62, 0.81, 0.012, bottomMat, bob);
  if (B === 'skirt') mesh(tube(st, st * 1.32, 0.15, 16), pleatMat, bob, 0, 0.555, 0).scale.z = 0.82;
  else if (B === 'ruffle') {
    mesh(tube(st, st * 1.16, 0.08), bottomMat, bob, 0, 0.59, 0).scale.z = 0.82;
    mesh(tube(st * 1.1, st * 1.42, 0.09), bottomMat, bob, 0, 0.51, 0).scale.z = 0.82;
    const lace = mesh(torus(+(st * 1.4).toFixed(3), 0.011), M('#fffaf2', 0.9), bob, 0, 0.465, 0);
    lace.rotation.x = Math.PI / 2; lace.scale.y = 0.82;
  } else if (B === 'long') mesh(tube(st, st * 1.55, 0.4), bottomMat, bob, 0, 0.43, 0).scale.z = 0.82;
  else if (B === 'sundress') mesh(tube(st, st * 1.5, 0.22), bottomMat, bob, 0, 0.52, 0).scale.z = 0.82;
  else if (B === 'pinafore') mesh(tube(st, st * 1.42, 0.19, 16), pleatMat, bob, 0, 0.535, 0).scale.z = 0.82;

  // ----- tops -----
  const oversize = ['sweater', 'hoodie', 'zipup', 'varsity'].includes(T) ? 1.08 : 1;
  const inf = oversize > 1 ? 0.022 : 0.013; // how far the top sits off the body
  const bareShoulders = T === 'cami' || T === 'offshoulder';
  const bodyTopMat = T === 'raglan' ? cream : topMat;
  const NECK = TOPY - 0.008;
  if (bareShoulders) shell(0.7, T === 'cami' ? 0.965 : 0.955, inf, topMat);
  else shell(0.7, TOPY - 0.002, inf, bodyTopMat);
  const hood = () => {
    const h = mesh(torus(+(0.07 * w).toFixed(3), 0.036), topMat, torso, 0, NECK - TY, -0.035);
    h.rotation.x = Math.PI / 2 - 0.3;
    h.scale.set(1, 1, 0.8);
  };
  const hem = (mat = rib) => ring(0.705, inf + 0.002, 0.014, mat);
  const neck = (mat) => ring(NECK - 0.004, 0.003, 0.011, mat);
  switch (T) {
    case 'hoodie':
      hood(); hem();
      strip(0.72, 0.8, inf + 0.003, 0, 0.42, rib);
      for (const s of [-1, 1]) mesh(taper(0.005, 0.005, 0.09, 6), white, torso, 0.026 * s, 0.33, frontAt(0.96, inf) + 0.006);
      break;
    case 'zipup':
      hood(); hem();
      strip(0.71, NECK, inf + 0.002, 0, 0.12, cream);
      strip(0.71, NECK, inf + 0.004, 0.03, 0.025, M('#d9d9de', 0.3, { metalness: 0.5 }));
      for (const s of [-1, 1]) strip(0.72, 0.79, inf + 0.003, s * 0.6, 0.22, rib);
      break;
    case 'polo':
      for (const s of [-1, 1]) {
        const c = mesh(rbox(0.055, 0.02, 0.042, 0.008), topMat, torso, 0.032 * s, NECK - TY - 0.005, frontAt(1.0, inf) - 0.015);
        c.rotation.set(0.5, 0, -0.45 * s);
      }
      strip(0.9, NECK, inf + 0.002, 0, 0.06, rib);
      for (const y of [0.985, 0.945]) dot(y, inf + 0.004, white, 0.006);
      break;
    case 'blazer':
      strip(0.86, NECK, inf + 0.001, 0, 0.3, white);
      strip(0.83, NECK - 0.01, inf + 0.004, 0, 0.055, acc);
      for (const s of [-1, 1]) strip(0.83, NECK - 0.005, inf + 0.003, s * 0.27, 0.1, rib);
      for (const y of [0.8, 0.75]) dot(y, inf + 0.002, dark, 0.008);
      break;
    case 'cardigan':
      hem();
      strip(0.89, NECK, inf + 0.001, 0, 0.22, cream);
      strip(0.71, 0.89, inf + 0.002, 0.03, 0.02, rib);
      for (const y of [0.87, 0.82, 0.77]) dot(y, inf + 0.003, cream, 0.008);
      break;
    case 'sweater':
      hem(); neck(rib);
      break;
    case 'raglan':
      neck(topMat);
      break;
    case 'varsity': {
      const stripeMat = M(shade(cfg.topColor, 0.6), 0.85);
      hem(stripeMat);
      ring(0.722, inf + 0.004, 0.006, cream);
      neck(stripeMat);
      strip(0.71, NECK, inf + 0.002, 0, 0.1, cream);
      for (const y of [0.95, 0.89, 0.83, 0.77]) dot(y, inf + 0.004, cream, 0.008, 0.03);
      break;
    }
    case 'track':
      neck(topMat);
      strip(0.71, NECK, inf + 0.003, 0, 0.022, white);
      hem();
      break;
    case 'cami':
      ring(0.965, inf, 0.008, M('#fffaf2', 0.9));
      for (const s of [-1, 1]) {
        strip(0.955, TOPY - 0.004, inf - 0.002, s * 0.48, 0.05, topMat);
        strip(0.955, TOPY - 0.004, inf - 0.002, Math.PI + s * 0.48, 0.05, topMat);
      }
      bow(torso, 0, 0.335, frontAt(0.955, inf) + 0.01, 0.32, acc);
      break;
    case 'offshoulder':
      ring(0.955, inf + 0.01, 0.022, topMat);
      bow(torso, 0, 0.325, frontAt(0.945, inf) + 0.03, 0.3, acc);
      break;
    default: // tshirt, striped
      neck(M(shade(cfg.skin, 0.9), 0.6));
  }

  // dresses / overalls go over the top
  if (B === 'sundress') {
    shell(0.73, 0.94, inf + 0.012, bottomMat);
    for (const s of [-1, 1]) {
      strip(0.92, TOPY - 0.004, inf + 0.01, s * 0.5, 0.06, bottomMat);
      strip(0.92, TOPY - 0.004, inf + 0.01, Math.PI + s * 0.5, 0.06, bottomMat);
    }
    bow(torso, 0, 0.31, frontAt(0.93, inf + 0.012) + 0.01, 0.3, M('#fffaf2', 0.8));
  } else if (B === 'pinafore' || B === 'overalls') {
    shell(0.71, 0.8, inf + 0.012, bottomMat);
    strip(0.79, 0.93, inf + 0.014, 0, 0.5, bottomMat);
    if (B === 'overalls') strip(0.83, 0.88, inf + 0.018, 0, 0.18, bottomDark);
    for (const s of [-1, 1]) {
      strip(0.91, TOPY - 0.004, inf + 0.012, s * 0.42, 0.07, bottomMat);
      strip(0.78, TOPY - 0.004, inf + 0.012, Math.PI + s * 0.42, 0.07, bottomMat);
      mesh(sphere(0.01, 8, 6), gold, torso, Math.sin(s * 0.42) * (rAt(0.91) + inf + 0.02) * w, 0.91 - TY, frontAt(0.91, inf + 0.02) * Math.cos(0.42));
    }
  }

  // chest print (a decal on the chest)
  const tW = rAt(0.93) * 2 * w, tD = frontAt(0.93) * 2;
  const front = frontAt(0.9, inf);
  if (cfg.print !== 'none' && B !== 'overalls' && B !== 'pinafore') {
    const small = ['zipup', 'blazer', 'cardigan', 'varsity', 'track', 'polo'].includes(T);
    const size = small ? 0.055 : 0.1;
    const py = bareShoulders ? 0.84 : B === 'sundress' ? 0.87 : small ? 0.94 : 0.88;
    const ang = small ? -0.42 : 0;
    const pinf = inf + (B === 'sundress' ? 0.014 : 0) + 0.004;
    const pmat = new THREE.MeshStandardMaterial({ map: printTexture(cfg.print, cfg.accColor), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    disposables.push(pmat);
    const plane = new THREE.Mesh(geo(`print${size}`, () => new THREE.PlaneGeometry(size, size)), pmat);
    plane.position.set(Math.sin(ang) * (rAt(py) + pinf) * w, py - TY, Math.cos(ang) * frontAt(py, pinf));
    plane.rotation.y = ang * 0.8;
    torso.add(plane);
  }

  // ----- arms: thin and tapered, held slightly out (A-pose) with little fingers -----
  const shortSleeve = ['tshirt', 'polo'].includes(T);
  const sleeveMat = T === 'varsity' ? cream : topMat;
  const cuffs = ['hoodie', 'zipup', 'sweater', 'cardigan', 'varsity', 'track'].includes(T);
  const aw = limbW * (male ? 1.15 : 1);
  const sR = 0.036 * aw, eR = 0.03 * aw, wR = 0.026 * aw; // shoulder / elbow / wrist radii
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set((rAt(SH_Y) * w + (male ? 0.02 : 0.016)) * side, SH_Y, 0);
    bob.add(shoulder);
    const sleeved = !bareShoulders || T === 'offshoulder';
    mesh(sphere(sR + 0.006, 16, 12), bareShoulders ? skin : sleeveMat, shoulder).scale.setScalar(bareShoulders ? 1 : 1.2);
    mesh(taper(sR, eR, 0.155), skin, shoulder, 0, -0.112, 0);
    if (sleeved && !shortSleeve) mesh(taper(sR, eR, 0.155), sleeveMat, shoulder, 0, -0.112, 0).scale.set(1.3, 1.02, 1.3);
    if (shortSleeve) mesh(tube(sR + 0.013, sR + 0.017, 0.08, 18), topMat, shoulder, 0, -0.035, 0);
    if (T === 'track') mesh(rbox(0.009, 0.15, 0.009, 0.004), white, shoulder, side * (sR + 0.009), -0.1, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.225, 0);
    shoulder.add(elbow);
    mesh(taper(eR, wR, 0.145), skin, elbow, 0, -0.098, 0);
    if (sleeved && !shortSleeve) mesh(taper(eR, wR, 0.145), sleeveMat, elbow, 0, -0.095, 0).scale.set(1.35, 1.04, 1.35);
    if (cuffs) mesh(tube(wR + 0.013, wR + 0.013, 0.026, 16), T === 'varsity' ? M(shade(cfg.topColor, 0.6), 0.85, { side: THREE.DoubleSide }) : rib, elbow, 0, -0.18, 0);
    if (T === 'track') mesh(rbox(0.009, 0.11, 0.009, 0.004), white, elbow, side * (eR + 0.009), -0.098, 0);
    // small hand: palm, thumb and three splayed fingers
    const hand = new THREE.Group();
    hand.position.set(0, -0.21, 0);
    elbow.add(hand);
    mesh(sphere(1, 14, 10), skin, hand, 0, -0.022, 0).scale.set(0.024 * aw, 0.03, 0.014);
    const thumb = mesh(taper(0.0075, 0.0065, 0.018, 8), skin, hand, -side * 0.02, -0.018, 0.006);
    thumb.rotation.set(0.2, 0, side * 0.9);
    for (let f = 0; f < 3; f++) {
      const fx = (f - 1) * 0.012 * aw;
      const finger = mesh(taper(0.0062, 0.0055, 0.024, 8), skin, hand, fx, -0.062, 0.0);
      finger.rotation.z = (f - 1) * -0.25 * side * -1;
    }
    arms[side < 0 ? 'L' : 'R'] = { shoulder, elbow };
  }

  // ----- neck + head -----
  mesh(taper(male ? 0.034 : 0.028, male ? 0.04 : 0.034, 0.08, 16), skin, bob, 0, 1.065, 0);
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0);
  bob.add(head);
  const shapeScale = { round: [0.88, 0.9, 0.88], oval: [0.82, 0.95, 0.85], square: [0.86, 0.88, 0.86] }[cfg.faceShape];
  const headInner = new THREE.Group();
  headInner.scale.set(...shapeScale);
  head.add(headInner);
  const square = cfg.faceShape === 'square';
  if (square) mesh(rbox(0.6, 0.6, 0.6, 0.24), skin, headInner);
  else mesh(headGeo(), skin, headInner);

  // ears
  // big round ears that stick out, like the reference
  const earInner = M(shade(cfg.skin, 0.86), 0.65);
  for (const s of [-1, 1]) {
    const ex = (0.262 * shapeScale[0] / 0.88 + 0.04) * s;
    const ear = mesh(sphere(0.085, 18, 14), skin, head, ex, -0.045, -0.01);
    ear.scale.set(0.5, 1, 0.82);
    ear.rotation.y = s * 0.35;
    const inner = mesh(sphere(0.058, 14, 10), earInner, head, ex + s * 0.02, -0.045, 0.014);
    inner.scale.set(0.3, 0.78, 0.6);
    inner.rotation.y = s * 0.35;
  }

  // painted face
  const faceTex = drawFace(cfg);
  disposables.push(faceTex);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  disposables.push(faceMat);
  if (square) {
    const fw = (FACE_PHI * 2) * R * 0.95, fh = FACE_THETA_LEN * R * 0.95;
    const plane = new THREE.Mesh(geo('facePlane', () => new THREE.PlaneGeometry(fw, fh)), faceMat);
    plane.position.set(0, (FACE_THETA0 - FACE_THETA_LEN / 2) * R, 0.302);
    headInner.add(plane);
  } else {
    const face = new THREE.Mesh(
      geo('faceShell', () => chibiDeform(new THREE.SphereGeometry(R * 1.004, 44, 32, Math.PI / 2 - FACE_PHI, FACE_PHI * 2, Math.PI / 2 - FACE_THETA0, FACE_THETA_LEN))),
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
  const hatCovers = ['cap', 'beanie', 'bucket', 'frog'].includes(cfg.hat);
  if (hatCovers && ['spiky', 'curly', 'bun', 'spacebuns', 'manbun'].includes(style)) style = 'short';
  if (hatCovers) hairGroup.scale.multiplyScalar(0.93); // keep hair tucked under the hat

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
    if (['cap', 'beanie', 'bucket', 'frog'].includes(cfg.hat)) return;
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
      const under = hatCovers; // with a hat, bangs start just below its rim
      lock(az, under ? 0.4 - edge * 0.2 : 0.7 - edge * 0.25, len * (under ? 0.62 : 0.82), wid, 0.04, { sway, spike: kind === 'spiky' });
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
      ends.forEach(([x, y, z]) => mesh(sphere(0.05, 12, 10), hairM, hairGroup, x, y, z).scale.set(1, 1.25, 1));
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
    const az = side * 0.42, el = -0.44;
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  };
  if (cfg.glasses) {
    const frame = M('#26262e', 0.35);
    const lens = M('#bfe3ff', 0.1, { transparent: true, opacity: 0.22 });
    for (const s of [-1, 1]) {
      const n = eyePos(s);
      const p = n.clone().multiplyScalar(square ? 0.3 : R + 0.025);
      if (square) p.z = 0.3;
      const ring = mesh(torus(0.078, 0.009), frame, headInner, p.x, p.y, p.z);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), square ? new THREE.Vector3(0, 0, 1) : n);
      const l = mesh(geo('lens', () => new THREE.CircleGeometry(0.076, 24)), lens, headInner, p.x, p.y, p.z - 0.002);
      l.quaternion.copy(ring.quaternion);
      l.castShadow = false;
      const arm = mesh(rbox(0.008, 0.008, 0.26, 0.003), frame, headInner, s * R * 0.9, p.y + 0.01, -0.02);
      arm.rotation.y = 0.05 * s;
    }
    const bp = new THREE.Vector3(0, -0.42, 1).normalize().multiplyScalar(R + 0.03);
    mesh(cyl(0.006, 0.006, 0.07, 6), frame, headInner, 0, bp.y + 0.03, square ? 0.31 : bp.z).rotation.z = Math.PI / 2;
  }
  // ----- hats -----
  const H = cfg.hat;
  if (H === 'cap') {
    const capR = hr * 1.16;
    const c = mesh(hemi(capR, Math.PI * 0.52), acc, headInner, 0, -0.035, -0.01);
    c.rotation.x = -0.3;
    const brim = mesh(cyl(0.21, 0.21, 0.02, 28), acc, headInner, 0, 0.1, capR * 0.8);
    brim.scale.set(1, 1, 0.9);
    brim.rotation.x = 0.32;
    mesh(sphere(0.025, 8, 6), acc, headInner, 0, capR + 0.02, -0.05);
  } else if (H === 'beanie') {
    const c = mesh(hemi(hr * 1.17, Math.PI * 0.5), acc, headInner, 0, -0.03, -0.01);
    c.rotation.x = -0.32;
    mesh(cyl(hr * 1.2, hr * 1.2, 0.08, 36, false), M(shade(cfg.accColor, 0.82), 0.9), c, 0, 0.03, 0);
    mesh(sphere(0.065, 14, 12), M('#fffaf2', 0.95), c, 0, hr * 1.17 + 0.03, 0);
  } else if (H === 'bucket' || H === 'frog') {
    const c = mesh(hemi(hr * 1.17, Math.PI * 0.5), acc, headInner, 0, -0.01, -0.01);
    c.rotation.x = -0.22;
    mesh(cyl(hr * 1.19, hr * 1.55, 0.08, 36, true), M(cfg.accColor, 0.6, { side: THREE.DoubleSide }), c, 0, -0.03, 0);
    mesh(cyl(hr * 1.185, hr * 1.185, 0.035, 36, true), M(shade(cfg.accColor, 0.75), 0.8, { side: THREE.DoubleSide }), c, 0, 0.03, 0);
    if (H === 'frog') {
      for (const s of [-1, 1]) {
        mesh(sphere(0.06, 14, 12), acc, c, s * 0.11, hr * 1.1, 0.1);
        mesh(sphere(0.045, 12, 10), white, c, s * 0.11, hr * 1.12, 0.135);
        mesh(sphere(0.022, 10, 8), dark, c, s * 0.11, hr * 1.12, 0.172);
      }
      // little smile + blush on the hat
      const sm = mesh(torus(0.05, 0.008, Math.PI), dark, c, 0, hr * 0.6, hr * 0.98);
      sm.rotation.set(-0.5, 0, Math.PI);
    }
  } else if (H === 'bunny' || H === 'cat') {
    const band = mesh(torus(hr * 1.11, 0.02, Math.PI), acc, headInner, 0, 0, 0.03);
    band.rotation.x = -0.25;
    const pink = M('#ffb3c7', 0.7);
    for (const s of [-1, 1]) {
      if (H === 'bunny') {
        const ear = mesh(capsule(0.042, 0.2), acc, headInner, s * 0.085, hr * 1.05 + 0.12, 0.0);
        ear.rotation.set(-0.15, 0, -s * 0.18);
        const inner = mesh(capsule(0.022, 0.15), pink, ear, 0, 0, 0.025);
        inner.scale.z = 0.5;
      } else {
        const ear = mesh(cone(0.08, 0.15), acc, headInner, s * 0.15, hr * 1.02, 0.02);
        ear.rotation.set(-0.1, 0, -s * 0.35);
        ear.scale.z = 0.55;
        const inner = mesh(cone(0.042, 0.08), pink, ear, 0, -0.012, 0.022);
        inner.scale.z = 0.4;
      }
    }
  }
  if (cfg.hairbow) {
    if (style === 'ponytail') bow(hairGroup, 0, hr * 0.62, -hr * 0.9, 1.4, acc, 0);
    else if (style === 'sidetail') { /* side tail already has a bow */ }
    else bow(hairGroup, hr * 0.62, hr * 0.68, -hr * 0.28, 1.5, acc, 1.1);
  }
  if (cfg.crossbody) {
    const strapF = mesh(rbox(0.016, 0.44, 0.008, 0.003), dark, torso, 0, 0.26, front + 0.012);
    strapF.rotation.z = 0.72;
    const strapB = mesh(rbox(0.016, 0.44, 0.008, 0.003), dark, torso, 0, 0.26, -front - 0.012);
    strapB.rotation.z = -0.72;
    const bx = -(tW * oversize) / 2 - 0.02;
    mesh(rbox(0.04, 0.09, 0.1, 0.02), acc, torso, bx, 0.09, 0.02);
    mesh(rbox(0.044, 0.04, 0.104, 0.015), M(shade(cfg.accColor, 0.8), 0.6), torso, bx, 0.12, 0.02);
    mesh(sphere(0.01, 8, 6), M('#f0c75e', 0.3, { metalness: 0.4 }), torso, bx - 0.022, 0.105, 0.02);
  }
  if (cfg.headphones) {
    const hpR = hr * (hatCovers ? 1.22 : 1.14) + (style === 'curly' ? 0.05 : 0);
    mesh(torus(hpR, 0.022, Math.PI), dark, headInner, 0, 0, 0);
    for (const s of [-1, 1]) {
      const cup = mesh(cyl(0.085, 0.085, 0.07, 20), acc, headInner, (hpR - 0.01) * s, -0.02, 0);
      cup.rotation.z = Math.PI / 2;
      const pad = mesh(cyl(0.065, 0.065, 0.025, 18), dark, headInner, (hpR - 0.05) * s, -0.02, 0);
      pad.rotation.z = Math.PI / 2;
    }
  }
  if (cfg.backpack) {
    mesh(rbox(0.25 * w, 0.3, 0.13, 0.05), acc, torso, 0, 0.25, -tD / 2 - 0.07);
    mesh(rbox(0.18 * w, 0.11, 0.04, 0.02), M(shade(cfg.accColor, 0.8)), torso, 0, 0.17, -tD / 2 - 0.145);
    for (const s of [-1, 1]) {
      const strap = mesh(rbox(0.03, 0.34, 0.015, 0.008), dark, torso, 0.075 * w * s, 0.26, front + 0.004);
      strap.rotation.z = 0.05 * s;
    }
  }
  if (cfg.lanyard) {
    const ly = M(cfg.accColor, 0.6);
    for (const s of [-1, 1]) {
      const strip = mesh(rbox(0.014, 0.17, 0.005, 0.002), ly, torso, 0.04 * s, 0.33, front + 0.005);
      strip.rotation.z = -0.35 * s;
    }
    const neckRing = mesh(torus(0.05, 0.007), ly, bob, 0, 1.03, 0);
    neckRing.rotation.x = Math.PI / 2 - 0.3;
    mesh(rbox(0.065, 0.085, 0.01, 0.008), white, torso, 0, 0.23, front + 0.01);
    mesh(rbox(0.065, 0.022, 0.012, 0.006), ly, torso, 0, 0.262, front + 0.011);
    mesh(rbox(0.024, 0.026, 0.012, 0.004), M('#c9cbd6', 0.6), torso, -0.014, 0.22, front + 0.012);
  }

  const tallHair = ['bun', 'spacebuns', 'spiky', 'curly', 'manbun'].includes(style) ? 0.08 : 0.03;
  const hipHeight = HIP * cfg.height;
  const headTop = (HEAD_Y + R * shapeScale[1] + tallHair + (hatCovers ? 0.05 : cfg.hat === 'bunny' ? 0.25 : cfg.hat === 'cat' ? 0.08 : 0)) * cfg.height;

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
    arm.shoulder.rotation.z = (0.56 + breathe * 2) * -s * (1 - sit) + 0.1 * -s * sit;
  }
  av.bob.position.y = Math.abs(Math.sin(a.phase)) * 0.04 * walk * (1 - sit) + breathe * (1 - walk);
  av.torso.rotation.x = 0.05 * walk * (1 - sit) - 0.03 * sit;
  // chibi heads bob and tilt a bit more
  av.head.rotation.y = Math.sin(a.t * 0.5) * 0.14 * (1 - walk);
  av.head.rotation.z = Math.sin(a.t * 0.8) * 0.04 * (1 - walk) + Math.sin(a.phase) * 0.04 * walk;
  av.head.rotation.x = Math.sin(a.t * 0.7) * 0.03 + (state.typing ? 0.15 : 0) * sit;
}

// ---------- small images for the editor's option tiles ----------
function tileCanvas(w = 160, h = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Crop of the painted face (part: 'eyes' | 'mouth') on a skin-colored tile. */
export function faceThumb(rawCfg, part) {
  const cfg = normalizeAvatar(rawCfg);
  const tex = drawFace(cfg);
  const src = tex.image;
  const eyeY = (FACE_THETA0 + 0.44) * PX;
  const c = tileCanvas();
  const g = c.getContext('2d');
  g.fillStyle = cfg.skin;
  g.fillRect(0, 0, 160, 160);
  if (part === 'eyes') g.drawImage(src, FACE_W / 2 - 170, eyeY - 160, 340, 340, 0, 0, 160, 160);
  else g.drawImage(src, FACE_W / 2 - 60, eyeY + 0.4 * PX - 60, 120, 120, 0, 0, 160, 160);
  tex.dispose();
  return c.toDataURL('image/png');
}

export function patternSwatch(color, pat) {
  const c = tileCanvas();
  const g = c.getContext('2d');
  if (!pat || pat === 'plain') { g.fillStyle = color; g.fillRect(0, 0, 160, 160); }
  else { g.fillStyle = g.createPattern(patternTexture(color, pat).image, 'repeat'); g.fillRect(0, 0, 160, 160); }
  return c.toDataURL('image/png');
}

export function printSwatch(kind, accColor, bg) {
  const c = tileCanvas();
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 160, 160);
  if (kind === 'none') {
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 6;
    g.beginPath(); g.arc(80, 80, 34, 0, Math.PI * 2); g.moveTo(56, 104); g.lineTo(104, 56); g.stroke();
  } else g.drawImage(printTexture(kind, accColor).image, 24, 24, 112, 112);
  return c.toDataURL('image/png');
}
