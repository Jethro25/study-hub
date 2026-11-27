// Avatar actions: gestures and office work, as procedural poses layered over the base animation,
// plus the little props (papers, pen, mug, phone, book…) the avatar holds while doing them.
import * as THREE from 'three';

/**
 * group: where the action shows in the Actions menu.
 * dur: seconds (one-shot) or 0 = keeps going until you move or pick something else.
 * carry: keeps going while walking (only the arms are posed).
 * emo: expression shown while the action plays. indicator: bubble above the head.
 */
export const ACTIONS = {
  wave: { group: 'Gestures', emoji: '👋', label: 'Wave', dur: 2.4, emo: 'happy' },
  clap: { group: 'Gestures', emoji: '👏', label: 'Clap', dur: 2.6, emo: 'happy' },
  cheer: { group: 'Gestures', emoji: '🙌', label: 'Cheer', dur: 2.6, emo: 'excited' },
  dance: { group: 'Gestures', emoji: '💃', label: 'Dance', dur: 0, emo: 'happy' },
  nod: { group: 'Gestures', emoji: '🙆', label: 'Nod yes', dur: 2, emo: 'happy' },
  shake: { group: 'Gestures', emoji: '🙅', label: 'Shake no', dur: 2, emo: 'sad' },
  shrug: { group: 'Gestures', emoji: '🤷', label: 'Shrug', dur: 2.2, emo: 'confused' },
  facepalm: { group: 'Gestures', emoji: '🤦', label: 'Facepalm', dur: 2.6, emo: 'sad' },
  bow: { group: 'Gestures', emoji: '🙇', label: 'Bow', dur: 2.4, emo: 'neutral' },
  point: { group: 'Gestures', emoji: '👉', label: 'Point', dur: 2.6, emo: 'neutral' },
  raise: { group: 'Gestures', emoji: '✋', label: 'Raise hand', dur: 0, emo: 'neutral' },
  stretch: { group: 'Gestures', emoji: '🙆‍♂️', label: 'Stretch', dur: 3.2, emo: 'sleepy' },

  think: { group: 'Think', emoji: '🤔', label: 'Thinking…', dur: 0, emo: 'thinking', indicator: 'think' },
  idea: { group: 'Think', emoji: '💡', label: 'Got an idea!', dur: 4, emo: 'excited', indicator: 'idea' },

  write: { group: 'Office work', emoji: '✍️', label: 'Write notes', dur: 0, emo: 'neutral' },
  sign: { group: 'Office work', emoji: '🖊️', label: 'Sign papers', dur: 0, emo: 'neutral' },
  read: { group: 'Office work', emoji: '📖', label: 'Read', dur: 0, emo: 'neutral' },
  type: { group: 'Office work', emoji: '⌨️', label: 'Type / text', dur: 0, emo: 'neutral' },
  listen: { group: 'Office work', emoji: '👂', label: 'Listen', dur: 0, emo: 'neutral' },
  phone: { group: 'Office work', emoji: '📞', label: 'Phone call', dur: 0, emo: 'neutral', talks: true },
  coffee: { group: 'Office work', emoji: '☕', label: 'Coffee break', dur: 0, emo: 'happy', carry: true },
  give: { group: 'Office work', emoji: '🤝', label: 'Hand item', dur: 2.2, emo: 'happy', needsTarget: true },
  sleep: { group: 'Office work', emoji: '😴', label: 'Nap', dur: 0, emo: 'sleepy', indicator: 'sleep' },
};

/** Things you can hold (Items tab). two: held with both hands. look: glance down at it. */
export const ITEMS = {
  papers: { emoji: '📄', label: 'Papers', prop: 'papers' },
  documents: { emoji: '🗂️', label: 'Documents folder', prop: 'folder', look: true },
  book: { emoji: '📕', label: 'Book', prop: 'bookClosed' },
  notebook: { emoji: '📓', label: 'Notebook', prop: 'notebook', look: true },
  clipboard: { emoji: '📋', label: 'Clipboard', prop: 'clipboard', look: true },
  pen: { emoji: '🖊️', label: 'Pen', prop: 'pen' },
  laptop: { emoji: '💻', label: 'Laptop', prop: 'laptop', two: true, look: true },
  tablet: { emoji: '📲', label: 'Tablet', prop: 'tablet', look: true },
  phone: { emoji: '📱', label: 'Phone', prop: 'phone' },
  mug: { emoji: '☕', label: 'Coffee mug', prop: 'mug' },
  bottle: { emoji: '🥤', label: 'Water bottle', prop: 'bottle' },
  sticky: { emoji: '🗒️', label: 'Sticky notes', prop: 'sticky' },
  calculator: { emoji: '🧮', label: 'Calculator', prop: 'calculator', look: true },
  stapler: { emoji: '📎', label: 'Stapler', prop: 'stapler' },
  envelope: { emoji: '✉️', label: 'Envelope', prop: 'envelope' },
  badge: { emoji: '🪪', label: 'ID card', prop: 'badge' },
  box: { emoji: '📦', label: 'File box', prop: 'filebox', two: true },
  // new items from Claude Design sheet 05
  headset: { emoji: '🎧', label: 'Headset', prop: 'headset' },
  marker: { emoji: '🖍️', label: 'Whiteboard marker', prop: 'marker' },
  binder: { emoji: '📒', label: 'Binder', prop: 'binder', look: true },
  sketchbook: { emoji: '🎨', label: 'Sketchbook', prop: 'sketchbook', look: true },
  snack: { emoji: '🍙', label: 'Snack (onigiri)', prop: 'onigiri' },
  umbrella: { emoji: '☂️', label: 'Umbrella', prop: 'umbrella', hang: true },
  keys: { emoji: '🔑', label: 'Keys', prop: 'keys', hang: true },
  plant: { emoji: '🪴', label: 'Plant pot', prop: 'plantpot', two: true },
};
for (const [id, it] of Object.entries(ITEMS)) {
  ACTIONS['hold_' + id] = { group: null, emoji: it.emoji, label: 'Holding: ' + it.label, dur: 0, emo: 'neutral', carry: true, item: id };
}
export const ACTION_IDS = Object.keys(ACTIONS);

// ---------- props (shared geometry + materials) ----------
const PM = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const paperMat = PM('#fbfaf6', { roughness: 0.9, side: THREE.DoubleSide });
const inkMat = PM('#2a2f45', { roughness: 0.4 });
const penMat = PM('#2d5bd7', { roughness: 0.3 });
const boardMat = PM('#a8784c');
const clipMat = PM('#c9cbd6', { metalness: 0.6, roughness: 0.3 });
const mugMat = PM('#f2efe9', { roughness: 0.35 });
const coffeeMat = PM('#5a3825', { roughness: 0.3 });
const phoneMat = PM('#1c1e26', { roughness: 0.25 });
const screenMat = new THREE.MeshBasicMaterial({ color: '#7ab8ff' });
const bookMat = PM('#c0392b');
const folderMat = PM('#e8c170', { side: THREE.DoubleSide });
const greyMat = PM('#b9bcc6', { metalness: 0.4, roughness: 0.35 });
const darkMat = PM('#2b2e38', { roughness: 0.4 });
const blueMat = PM('#4a6fd8');
const bottleMat = PM('#8fd0ff', { transparent: true, opacity: 0.7, roughness: 0.1 });
const yellowMat = PM('#ffe06b', { roughness: 0.9 });
const redMat = PM('#d8443c', { roughness: 0.4 });
const creamMat = PM('#f3e6c8', { roughness: 0.9 });
const cardboardMat = PM('#b88a5a', { roughness: 0.95 });
const G = {
  sheet: new THREE.BoxGeometry(0.16, 0.002, 0.22),
  stack: new THREE.BoxGeometry(0.16, 0.025, 0.22),
  line: new THREE.BoxGeometry(0.1, 0.0025, 0.006),
  pen: new THREE.CylinderGeometry(0.006, 0.004, 0.13, 8),
  board: new THREE.BoxGeometry(0.17, 0.01, 0.24),
  clip: new THREE.BoxGeometry(0.06, 0.016, 0.025),
  mug: new THREE.CylinderGeometry(0.035, 0.03, 0.08, 16),
  coffee: new THREE.CircleGeometry(0.03, 16),
  handle: new THREE.TorusGeometry(0.02, 0.006, 6, 12, Math.PI),
  phone: new THREE.BoxGeometry(0.05, 0.1, 0.01),
  screen: new THREE.PlaneGeometry(0.042, 0.085),
  cover: new THREE.BoxGeometry(0.13, 0.012, 0.18),
  page: new THREE.BoxGeometry(0.12, 0.014, 0.17),
};
const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
};
/** a flat thing held in front of the hand (like a sheet facing you) */
const held = (build, y = -0.06, z = 0.05, tilt = Math.PI / 2 - 0.35) => {
  const g = new THREE.Group();
  const b = new THREE.Group();
  b.position.set(0, y, z);
  b.rotation.set(tilt, 0, 0);
  g.add(b);
  build(b);
  return g;
};
const PROPS = {
  folder: () => held((b) => { add(b, new THREE.BoxGeometry(0.17, 0.012, 0.23), folderMat); add(b, G.sheet, paperMat, 0.005, 0.008, -0.015); }),
  bookClosed: () => held((b) => { add(b, new THREE.BoxGeometry(0.13, 0.035, 0.18), bookMat); add(b, new THREE.BoxGeometry(0.12, 0.03, 0.17), paperMat, 0.006, 0, 0); }),
  notebook: () => held((b) => { add(b, new THREE.BoxGeometry(0.11, 0.014, 0.15), blueMat); add(b, new THREE.BoxGeometry(0.006, 0.018, 0.15), darkMat, -0.056, 0, 0); }),
  tablet: () => held((b) => { add(b, new THREE.BoxGeometry(0.13, 0.008, 0.18), darkMat); const s = add(b, new THREE.PlaneGeometry(0.115, 0.16), screenMat, 0, 0.0045, 0); s.rotation.x = -Math.PI / 2; }),
  calculator: () => held((b) => { add(b, new THREE.BoxGeometry(0.075, 0.014, 0.115), darkMat); add(b, new THREE.BoxGeometry(0.06, 0.004, 0.025), new THREE.MeshBasicMaterial({ color: '#b8e0b0' }), 0, 0.008, -0.035); for (let i = 0; i < 12; i++) add(b, new THREE.BoxGeometry(0.012, 0.004, 0.01), greyMat, -0.02 + (i % 3) * 0.02, 0.008, -0.005 + Math.floor(i / 3) * 0.017); }),
  sticky: () => held((b) => { add(b, new THREE.BoxGeometry(0.075, 0.02, 0.075), yellowMat); }, -0.05, 0.04),
  envelope: () => held((b) => { add(b, new THREE.BoxGeometry(0.17, 0.004, 0.1), creamMat); const f = add(b, new THREE.BoxGeometry(0.12, 0.002, 0.07), PM('#e6d4ac'), 0, 0.003, -0.012); f.rotation.y = Math.PI / 4; f.scale.set(0.6, 1, 0.6); }),
  badge: () => held((b) => { add(b, new THREE.BoxGeometry(0.055, 0.004, 0.08), paperMat); add(b, new THREE.BoxGeometry(0.055, 0.005, 0.02), blueMat, 0, 0.001, -0.03); add(b, new THREE.BoxGeometry(0.022, 0.005, 0.026), PM('#f0c9a8'), -0.01, 0.002, 0.008); }, -0.05, 0.03),
  stapler() { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(0.035, 0.03, 0.12), redMat, 0, -0.05, 0.04); add(g, new THREE.BoxGeometry(0.037, 0.012, 0.12), darkMat, 0, -0.07, 0.04); return g; },
  bottle() { const g = new THREE.Group(); add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.16, 14), bottleMat, 0, -0.06, 0.04); add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12), blueMat, 0, 0.03, 0.04); return g; },
  laptop: () => held((b) => {
    add(b, new THREE.BoxGeometry(0.28, 0.015, 0.19), greyMat);
    const lid = new THREE.Group(); lid.position.set(0, 0.008, -0.095); lid.rotation.x = -1.9; b.add(lid);
    add(lid, new THREE.BoxGeometry(0.28, 0.01, 0.19), greyMat, 0, 0, 0.095);
    const s = add(lid, new THREE.PlaneGeometry(0.25, 0.16), screenMat, 0, -0.0055, 0.095); s.rotation.x = Math.PI / 2;
  }, -0.04, 0.09, 0.15),
  headset() { const g = new THREE.Group(); const band = add(g, new THREE.TorusGeometry(0.05, 0.007, 6, 16, Math.PI), darkMat, 0, -0.02, 0.04); band.rotation.z = Math.PI; for (const s of [-1, 1]) { const c = add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 14), blueMat, s * 0.05, -0.025, 0.04); c.rotation.z = Math.PI / 2; } return g; },
  marker() { const g = new THREE.Group(); const m = add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), paperMat, 0, -0.05, 0.02); m.rotation.x = 0.5; const cap = add(m, new THREE.CylinderGeometry(0.009, 0.009, 0.03, 8), redMat, 0, 0.04, 0); return g; },
  binder: () => held((b) => { add(b, new THREE.BoxGeometry(0.15, 0.04, 0.2), blueMat); add(b, new THREE.BoxGeometry(0.02, 0.042, 0.2), darkMat, -0.066, 0, 0); add(b, new THREE.BoxGeometry(0.06, 0.042, 0.03), paperMat, 0.02, 0.001, -0.06); }),
  sketchbook: () => held((b) => { add(b, new THREE.BoxGeometry(0.2, 0.012, 0.15), creamMat); add(b, new THREE.BoxGeometry(0.2, 0.016, 0.012), darkMat, 0, 0, -0.075); }),
  onigiri() { const g = new THREE.Group(); const r = add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.025, 3), paperMat, 0, -0.06, 0.045); r.rotation.set(Math.PI / 2, 0, Math.PI / 2); add(g, new THREE.BoxGeometry(0.03, 0.028, 0.027), darkMat, 0, -0.075, 0.045); return g; },
  umbrella() { const g = new THREE.Group(); add(g, new THREE.ConeGeometry(0.035, 0.5, 10), PM('#6b5bd8'), 0, -0.33, 0.0).rotation.x = Math.PI; add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), darkMat, 0, -0.04, 0); const h = add(g, new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), darkMat, 0.025, 0.01, 0); h.rotation.z = 0; return g; },
  keys() { const g = new THREE.Group(); const ring = add(g, new THREE.TorusGeometry(0.018, 0.003, 6, 14), greyMat, 0, -0.05, 0.01); ring.rotation.y = Math.PI / 2; add(g, new THREE.BoxGeometry(0.008, 0.045, 0.004), PM('#e0b84a', { metalness: 0.6 }), 0, -0.085, 0.01); add(g, new THREE.BoxGeometry(0.008, 0.04, 0.004), greyMat, 0.012, -0.08, 0.012).rotation.z = 0.4; return g; },
  plantpot: () => held((b) => { add(b, new THREE.CylinderGeometry(0.09, 0.07, 0.13, 16), PM('#c46a4a')); for (let i = 0; i < 4; i++) add(b, new THREE.IcosahedronGeometry(0.06, 0), PM('#4f8a4b', { flatShading: true }), Math.cos(i * 1.6) * 0.04, 0.11 + (i % 2) * 0.04, Math.sin(i * 1.6) * 0.04); }, -0.06, 0.12, 0),
  filebox: () => held((b) => { add(b, new THREE.BoxGeometry(0.3, 0.2, 0.22), cardboardMat); add(b, new THREE.BoxGeometry(0.06, 0.03, 0.005), darkMat, 0, 0.04, 0.112); }, -0.08, 0.12, 0),
  pen() { const g = new THREE.Group(); const p = add(g, G.pen, penMat, 0, -0.04, 0.02); p.rotation.x = 0.5; return g; },
  papers() {
    const g = new THREE.Group();
    const s = add(g, G.stack, paperMat, 0, -0.06, 0.04);
    s.rotation.x = Math.PI / 2;
    return g;
  },
  clipboard() {
    const g = new THREE.Group();
    const b = new THREE.Group();
    b.position.set(0, -0.05, 0.06);
    b.rotation.set(Math.PI / 2 - 0.35, 0, 0);
    g.add(b);
    add(b, G.board, boardMat);
    add(b, G.sheet, paperMat, 0, 0.007, 0.01);
    add(b, G.clip, clipMat, 0, 0.012, -0.105);
    for (let i = 0; i < 5; i++) add(b, G.line, inkMat, -0.02, 0.0095, -0.06 + i * 0.03);
    return g;
  },
  deskpaper() {
    const g = new THREE.Group();
    add(g, G.sheet, paperMat);
    for (let i = 0; i < 6; i++) add(g, G.line, inkMat, -0.01, 0.0015, -0.08 + i * 0.026);
    return g;
  },
  mug() {
    const g = new THREE.Group();
    add(g, G.mug, mugMat, 0, -0.06, 0.045);
    const c = add(g, G.coffee, coffeeMat, 0, -0.022, 0.045);
    c.rotation.x = -Math.PI / 2;
    const h = add(g, G.handle, mugMat, 0.035, -0.06, 0.045);
    h.rotation.z = -Math.PI / 2;
    return g;
  },
  phone() {
    const g = new THREE.Group();
    add(g, G.phone, phoneMat, 0, -0.06, 0.02);
    const s = add(g, G.screen, screenMat, 0, -0.06, 0.0255);
    s.castShadow = false;
    return g;
  },
  book() {
    const g = new THREE.Group();
    const b = new THREE.Group();
    b.position.set(0.0, -0.05, 0.07);
    b.rotation.set(Math.PI / 2 - 0.55, 0, 0);
    g.add(b);
    add(b, G.cover, bookMat).scale.x = 2.1;
    add(b, G.page, paperMat, 0, 0.01, 0).scale.x = 1.95;
    return g;
  },
};

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => x * x * (3 - 2 * x);
const S = Math.sin;

/**
 * The pose for an action at time t. Arms are described per side with:
 * x = swing forward (negative = forward/up), z = lift out to the side (negative = across the body),
 * ex = elbow bend, ez = forearm swing out to the side. head: x down, y turn, z tilt. lean: bend at the hips.
 */
function pose(id, t, c) {
  const down = { x: 0, z: 0.12, ex: 0.15 };
  switch (id) {
    case 'wave':
      return { R: { x: -0.25, z: 1.2, ex: 0.2, ez: 1.35 + 0.4 * S(t * 10) }, head: { z: 0.12, x: -0.05 } };
    case 'clap': {
      const k = 0.5 + 0.5 * S(t * 15);
      return { L: { x: -1.05, z: -0.25 - 0.22 * k, ex: 0.75 }, R: { x: -1.05, z: -0.25 - 0.22 * k, ex: 0.75 }, head: { x: -0.05 } };
    }
    case 'cheer': {
      const b = Math.abs(S(t * 7));
      return { L: { x: -0.2, z: 2.6 + 0.15 * b, ex: 0.25 }, R: { x: -0.2, z: 2.6 + 0.15 * b, ex: 0.25 }, head: { x: -0.2 }, bob: 0.05 * b };
    }
    case 'dance': {
      const s = S(t * 5.5), b = Math.abs(S(t * 11));
      return {
        L: { x: -0.4 - 0.5 * Math.max(0, s), z: 1.0 + 0.7 * s, ex: 1.3 },
        R: { x: -0.4 - 0.5 * Math.max(0, -s), z: 1.0 - 0.7 * s, ex: 1.3 },
        head: { z: -0.15 * s, x: -0.05 }, sway: 0.1 * s, bob: 0.035 * b,
        legs: c.sit ? null : { L: 0.25 * Math.max(0, s), R: 0.25 * Math.max(0, -s) },
      };
    }
    case 'nod': return { head: { x: 0.12 + 0.2 * S(t * 8) } };
    case 'shake': return { head: { y: 0.45 * S(t * 9), x: 0.05 } };
    case 'shrug': {
      const k = smooth(Math.min(1, t * 3));
      return { L: { x: -0.35, z: 0.55 * k, ex: 1.45 }, R: { x: -0.35, z: 0.55 * k, ex: 1.45 }, head: { z: 0.18 * k }, bob: 0.02 * k };
    }
    case 'facepalm':
      return { R: { x: -0.9, z: -0.3, ex: 2.45 }, L: down, head: { x: 0.32, z: -0.08 } };
    case 'bow': {
      const k = t < 0.5 ? smooth(t / 0.5) : t > 1.7 ? smooth(Math.max(0, 1 - (t - 1.7) / 0.6)) : 1;
      return { L: { x: 0.05, z: 0.05, ex: 0.1 }, R: { x: 0.05, z: 0.05, ex: 0.1 }, head: { x: 0.2 * k }, lean: c.sit ? 0.25 * k : 0.6 * k };
    }
    case 'point':
      return { R: { x: -1.45, z: 0.12, ex: 0.05 }, head: { y: -0.08 } };
    case 'raise':
      return { R: { x: -0.35, z: 2.55 + 0.06 * S(t * 3), ex: 0.2 }, head: { x: -0.1, z: 0.06 } };
    case 'stretch': {
      const k = t < 0.6 ? smooth(t / 0.6) : t > 2.5 ? smooth(Math.max(0, 1 - (t - 2.5) / 0.7)) : 1;
      return { L: { x: -0.3 * k, z: 2.8 * k, ex: 0.2 }, R: { x: -0.3 * k, z: 2.8 * k, ex: 0.2 }, head: { x: -0.3 * k }, lean: -0.08 * k, bob: 0.02 * k };
    }
    case 'think':
      return { R: { x: -0.75, z: -0.3, ex: 2.5 }, L: { x: -0.5, z: -0.55, ex: 1.45 }, head: { x: -0.12, z: 0.16 + 0.03 * S(t * 1.2), y: 0.12 } };
    case 'idea': {
      const k = smooth(Math.min(1, t * 2.5));
      return { R: { x: -0.4 * k, z: 2.2 * k, ex: 1.2 * k }, head: { x: -0.25 * k }, bob: 0.04 * Math.abs(S(t * 6)) * (t < 1.2 ? 1 : 0) };
    }
    case 'write':
    case 'sign': {
      const fast = id === 'sign' ? 1.6 : 1;
      const scr = S(t * 13 * fast) * 0.05, drift = S(t * 2.3) * 0.06;
      if (c.desk) {
        return { R: { x: -0.62 + drift * 0.3, z: -0.18 + scr, ex: 1.15 + scr }, L: { x: -0.55, z: -0.3, ex: 1.15 }, head: { x: 0.38, y: -0.05 }, lean: 0.12 };
      }
      return { L: { x: -0.55, z: -0.3, ex: 1.2 }, R: { x: -0.5 + drift * 0.4, z: -0.5 + scr, ex: 1.3 + scr }, head: { x: 0.4 } };
    }
    case 'read':
      return { L: { x: -0.6, z: -0.25, ex: 1.25 }, R: { x: -0.6, z: -0.25, ex: 1.25 }, head: { x: 0.38 + 0.03 * S(t * 0.8), y: 0.04 * S(t * 0.5) } };
    case 'type':
      if (c.desk) {
        const j = S(t * 18) * 0.06;
        return { L: { x: -0.55 + j, z: -0.1, ex: 1.1 }, R: { x: -0.55 - j, z: -0.1, ex: 1.1 }, head: { x: 0.15 } };
      }
      return { L: { x: -0.5, z: -0.4, ex: 1.4 + 0.05 * S(t * 16) }, R: { x: -0.5, z: -0.4, ex: 1.4 + 0.05 * S(t * 14 + 1) }, head: { x: 0.45 } };
    case 'listen':
      return { L: { x: -0.15, z: 1.25, ex: 0.2, ez: 2.35 }, head: { z: 0.2, x: 0.08 + 0.1 * Math.max(0, S(t * 2.6)) } };
    case 'phone':
      return { R: { x: -0.3, z: 0.42, ex: 2.5 }, head: { z: 0.16, y: 0.1 * S(t * 0.7) } };
    case 'coffee': {
      const cyc = t % 6;
      const sip = cyc > 2.5 && cyc < 4 ? smooth(Math.min(1, (cyc - 2.5) * 3, (4 - cyc) * 3)) : 0;
      return { R: { x: -0.45 - 0.25 * sip, z: -0.12 - 0.22 * sip, ex: 1.55 + 0.75 * sip }, head: { x: -0.18 * sip } };
    }
    case 'give':
      return { R: { x: -1.3, z: 0.05, ex: 0.25 }, head: { x: 0.05 }, lean: c.sit ? 0 : 0.08 };
    case 'sleep':
      if (c.sit) return { L: { x: -1.3, z: -0.55, ex: 1.75 }, R: { x: -1.3, z: -0.55, ex: 1.75 }, head: { x: 0.45, y: 0.5, z: 0.15 }, lean: c.desk ? 0.6 : 0.15 };
      return { L: down, R: down, head: { x: 0.4 + 0.05 * S(t * 1.1), z: 0.12 * S(t * 0.5) }, sway: 0.02 * S(t * 0.6) };
    default: {
      const it = ACTIONS[id]?.item && ITEMS[ACTIONS[id].item];
      if (!it) return null;
      const look = it.look ? 0.28 + 0.03 * S(t * 0.8) : 0.05;
      if (it.hang) return { R: { x: 0.05, z: 0.18, ex: 0.15 }, head: { x: 0.05 } };
      if (it.prop === 'filebox' || it.prop === 'plantpot') return { L: { x: -0.75, z: -0.05, ex: 1.05 }, R: { x: -0.75, z: -0.05, ex: 1.05 }, head: { x: 0.05 } };
      if (it.two) return { L: { x: -0.7, z: -0.28, ex: 1.25 }, R: { x: -0.7, z: -0.28, ex: 1.25 }, head: { x: look } };
      return { R: { x: -0.62, z: -0.2, ex: 1.35 }, head: { x: look } };
    }
  }
}

/** props shown per action: list of [propName, 'L'|'R'|'desk'] */
function propsFor(id, c) {
  switch (id) {
    case 'write': return c.desk ? [['pen', 'R'], ['deskpaper', 'desk']] : [['pen', 'R'], ['clipboard', 'L']];
    case 'sign': return c.desk ? [['pen', 'R'], ['deskpaper', 'desk']] : [['pen', 'R'], ['clipboard', 'L']];
    case 'read': return [['book', 'R']];
    case 'type': return c.desk ? [] : [['phone', 'L']];
    case 'phone': return [['phone', 'R']];
    case 'coffee': return [['mug', 'R']];
    case 'give': return [[ITEMS[c.item]?.prop || 'papers', 'R']];
    default: {
      const it = ACTIONS[id]?.item && ITEMS[ACTIONS[id].item];
      return it ? [[it.prop, 'R']] : [];
    }
  }
}

const tmpV = new THREE.Vector3();
/**
 * Layer the action pose over the base animation. Call right after animateAvatar().
 * st: { action, sitting, desk, moving }
 */
export function applyAction(av, dt, st) {
  const a = av.act || (av.act = { cur: null, w: 0, t: 0, props: {} });
  // reset joints the base animation never touches
  for (const k of ['L', 'R']) { av.arms[k].shoulder.rotation.y = 0; av.arms[k].elbow.rotation.z = 0; }
  av.bob.rotation.set(0, 0, 0);

  const want = st.action && ACTIONS[st.action] ? st.action : null;
  if (want !== a.cur) {
    // fade the old pose out first, then switch
    if (!a.cur || a.w < 0.04) { a.cur = want; a.t = 0; }
  }
  const active = a.cur && a.cur === want;
  a.w = lerp(a.w, active ? 1 : 0, 1 - Math.exp(-dt * 9));
  a.t += dt;
  const c = { sit: !!st.sitting, desk: !!st.desk, item: st.item };
  const def = a.cur && ACTIONS[a.cur];
  const P = def ? pose(a.cur, a.t, c) : null;
  const w = a.w;

  // props
  const wantProps = def && w > 0.35 ? propsFor(a.cur, c) : [];
  const keys = new Set(wantProps.map(([n, where]) => n + '@' + where));
  for (const [key, obj] of Object.entries(a.props)) obj.visible = keys.has(key);
  for (const [name, where] of wantProps) {
    const key = name + '@' + where;
    let obj = a.props[key];
    if (!obj) {
      obj = PROPS[name]();
      a.props[key] = obj;
      (where === 'desk' ? av.root : av.arms[where].hand).add(obj);
    }
    obj.visible = true;
  }

  if (!P || w < 0.001) return;
  const walkOnly = st.moving && def.carry; // walking with a mug / papers: arms only
  const arm = (k, s, p) => {
    if (!p) return;
    const { shoulder, elbow } = av.arms[k];
    shoulder.rotation.x = lerp(shoulder.rotation.x, p.x ?? 0, w);
    shoulder.rotation.z = lerp(shoulder.rotation.z, -s * (p.z ?? 0.12), w);
    shoulder.rotation.y = lerp(0, -s * (p.y ?? 0), w);
    elbow.rotation.x = lerp(elbow.rotation.x, -(p.ex ?? 0.15), w);
    elbow.rotation.z = lerp(0, -s * (p.ez ?? 0), w);
  };
  arm('L', 1, P.L);
  arm('R', -1, P.R);
  if (walkOnly) return;
  if (P.head) {
    const h = av.head.rotation;
    if (P.head.x != null) h.x = lerp(h.x, P.head.x, w);
    if (P.head.y != null) h.y = lerp(h.y, P.head.y, w);
    if (P.head.z != null) h.z = lerp(h.z, P.head.z, w);
  }
  if (P.bob) av.bob.position.y += P.bob * w;
  if (P.sway) av.bob.rotation.z = P.sway * w;
  if (P.lean) {
    // bend forward at the hips: rotate the upper body around the hip joint and keep the legs where they were
    const l = P.lean * w, HIP = 0.6;
    av.bob.rotation.x = l;
    av.bob.position.y += HIP - HIP * Math.cos(l);
    av.bob.position.z = -HIP * Math.sin(l);
    av.legs.L.hip.rotation.x -= l;
    av.legs.R.hip.rotation.x -= l;
  } else av.bob.position.z = 0;
  // gravity: hanging hair (ponytails, braids, long hair) keeps hanging down when the head tilts or the body leans
  const tiltX = av.head.rotation.x + (P.lean || 0) * w;
  const tiltZ = av.head.rotation.z + (P.sway || 0) * w;
  for (const d of av.dyn?.hair || []) {
    d.pivot.rotation.x -= tiltX * 0.9;
    d.pivot.rotation.z -= tiltZ * 0.9;
  }
  if (P.legs) {
    av.legs.L.knee.rotation.x += P.legs.L * w;
    av.legs.R.knee.rotation.x += P.legs.R * w;
  }
  // the desk sheet lies flat on the desk under the writing hand
  const dp = a.props['deskpaper@desk'];
  if (dp?.visible) {
    av.root.updateMatrixWorld(true);
    av.arms.R.hand.getWorldPosition(tmpV);
    av.root.worldToLocal(tmpV);
    dp.position.set(tmpV.x - 0.06, 0.781 - av.root.position.y, tmpV.z - 0.02);
  }
}
