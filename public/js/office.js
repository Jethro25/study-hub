// The office: built from simple shapes, plus colliders, seats and the presentation screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BOUNDS = { minX: -18, maxX: 18, minZ: -12, maxZ: 12 }; // 36 x 24 m floor
export const WALL_H = 3.6;
export const SPAWN = { x: 0.5, z: 2.5 }; // lobby rug
export const SCREEN = { x: -4.87, y: 1.85, z: -7.5, w: 3.4, h: 1.9125 }; // meeting room west wall, facing +x

// ---------- canvas helpers ----------
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function woodTexture() {
  const c = makeCanvas(512, 512);
  const g = c.getContext('2d');
  const plankH = 64;
  for (let row = 0; row < 512 / plankH; row++) {
    let x = -((row * 137) % 300);
    while (x < 512) {
      const len = 220 + ((row * 53 + x) % 140);
      const l = 62 + ((row * 31 + Math.floor(x)) % 9) - 4;
      g.fillStyle = `hsl(30, 38%, ${l}%)`;
      g.fillRect(x, row * plankH, len, plankH);
      g.globalAlpha = 0.08;
      for (let i = 0; i < 10; i++) {
        g.fillStyle = i % 2 ? '#7a5634' : '#fff1dc';
        g.fillRect(x, row * plankH + 4 + i * 6 + ((x + i) % 3), len, 1.5);
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(80,50,25,0.35)';
      g.fillRect(x, row * plankH, 2, plankH);
      x += len;
    }
    g.fillStyle = 'rgba(80,50,25,0.3)';
    g.fillRect(0, row * plankH, 512, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function carpetTexture(base, line) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  if (line) {
    g.strokeStyle = line;
    g.lineWidth = 6;
    g.strokeRect(14, 14, 228, 228);
    g.lineWidth = 2;
    g.strokeRect(30, 30, 196, 196);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function monitorTexture(seed) {
  const c = makeCanvas(256, 160);
  const g = c.getContext('2d');
  g.fillStyle = '#1b1f2a';
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#252b3a';
  g.fillRect(0, 0, 256, 14);
  const cols = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#7dcfff', '#c0caf5'];
  let rnd = seed * 9301 + 49297;
  const r = () => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280);
  for (let y = 22; y < 150; y += 10) {
    let x = 10 + Math.floor(r() * 3) * 12;
    const n = 1 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const w = 12 + r() * 50;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.fillRect(x, y, w, 4);
      x += w + 6;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- the builder ----------
export function buildOffice(scene, renderer) {
  const root = new THREE.Group();
  root.name = 'office';
  scene.add(root);

  const colliders = []; // axis-aligned boxes in XZ
  const occluders = []; // meshes the camera should not pass through
  const clickables = []; // meshes with userData.seatIds
  const seats = new Map();
  const updaters = [];

  const mats = {};
  const M = (key, params) => (mats[key] ||= new THREE.MeshStandardMaterial({ roughness: 0.8, ...params }));
  const wallMat = M('wall', { color: '#f2ede6', roughness: 0.92 });
  const accentWall = M('accent', { color: '#2f4744', roughness: 0.9 });
  const trimMat = M('trim', { color: '#2a2c33', roughness: 0.5, metalness: 0.3 });
  const oak = M('oak', { color: '#d8b48c', roughness: 0.55 });
  const walnut = M('walnut', { color: '#8a5a3b', roughness: 0.55 });
  const metal = M('metal', { color: '#30323a', roughness: 0.35, metalness: 0.6 });
  const white = M('white', { color: '#f7f7f5', roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe7ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });
  const windowMat = new THREE.MeshStandardMaterial({ color: '#9fb6da', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false });

  const shadowed = (m, cast = true, receive = true) => { m.castShadow = cast; m.receiveShadow = receive; return m; };
  const rbGeo = new Map();
  const RB = (w, h, d, r = 0.03) => {
    const k = `${w}|${h}|${d}|${r}`;
    if (!rbGeo.has(k)) rbGeo.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
    return rbGeo.get(k);
  };
  function box(w, h, d, mat, x, y, z, parent = root, rounded = 0.02) {
    const g = rounded > 0 ? RB(w, h, d, rounded) : new THREE.BoxGeometry(w, h, d);
    const m = shadowed(new THREE.Mesh(g, mat));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function cylinder(rt, rb, h, mat, x, y, z, parent = root, seg = 20) {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  const collide = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ });
  const collideAround = (x, z, hw, hd) => collide(x - hw, x + hw, z - hd, z + hd);

  // ---------- night city: the office is the top floor of a high-rise ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color('#050916') },
        mid: { value: new THREE.Color('#16244a') },
        glow: { value: new THREE.Color('#6b4a7a') },
        moonDir: { value: new THREE.Vector3(-0.55, 0.42, -0.72).normalize() },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 glow; uniform vec3 moonDir; varying vec3 vP;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          float h = vP.y;
          vec3 c = mix(mid, top, smoothstep(0.02, 0.55, h));
          c = mix(c, glow, (1.0 - smoothstep(-0.05, 0.16, h)) * 0.75); // city light glow on the horizon
          // stars
          vec3 sp = floor(vP * 260.0);
          float s = hash(sp);
          c += vec3(step(0.9975, s) * smoothstep(0.08, 0.35, h) * (0.6 + 0.4 * hash(sp + 3.1)));
          // moon with a soft halo
          float m = dot(vP, moonDir);
          c += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9996, m);
          c += vec3(0.35, 0.38, 0.5) * pow(max(m, 0.0), 300.0) * 0.6;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog('#141c36', 60, 190);

  const FLOOR_DROP = 70; // street level is this far below the office floor
  // window-grid texture for the towers (dark facade, random lit windows)
  const towerTex = (() => {
    const c = makeCanvas(256, 512);
    const g = c.getContext('2d');
    g.fillStyle = '#0d1220';
    g.fillRect(0, 0, 256, 512);
    const lit = ['#ffd98a', '#ffe9b8', '#fff4dc', '#bcd7ff', '#ffc477'];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 4; y < 512; y += 16) {
      for (let x = 4; x < 256; x += 16) {
        const r = rnd();
        g.fillStyle = r < 0.36 ? lit[Math.floor(rnd() * lit.length)] : r < 0.5 ? '#1f2a44' : '#151c30';
        g.fillRect(x, y, 10, 11);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  })();
  const towerMat = new THREE.MeshBasicMaterial({ map: towerTex, fog: true });
  /** one tower as a box whose UVs tile the window grid at a fixed window size */
  const towerGeo = (w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const W = 1 / 16; // texture repeats every 16 m wide, 32 m tall (one window ≈ 1 m)
    for (let face = 0; face < 6; face++) {
      for (let k = 0; k < 4; k++) {
        const i = face * 4 + k;
        if (face === 2 || face === 3) { uv.setXY(i, 0.001, 0.999); continue; } // roofs: plain facade colour
        const fw = face < 2 ? d : w;
        uv.setXY(i, uv.getX(i) * fw * W + x * 0.37, uv.getY(i) * h / 32 + z * 0.11);
      }
    }
    g.translate(x, y, z);
    return g;
  };
  {
    const parts = [];
    // our own tower under the office
    parts.push(towerGeo(40, FLOOR_DROP, 28, 0, -FLOOR_DROP / 2 - 0.2, 0));
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const placed = [];
    for (let i = 0; i < 170 && placed.length < 110; i++) {
      const a = rnd() * Math.PI * 2;
      const dist = 38 + Math.pow(rnd(), 0.8) * 120;
      const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
      const w = 8 + rnd() * 14, d = 8 + rnd() * 14;
      if (placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 3 && Math.abs(p.z - z) < (p.d + d) / 2 + 3)) continue;
      // a few towers are taller than us, most are a bit below the office
      const h = FLOOR_DROP - 25 + rnd() * 50 + (rnd() < 0.18 ? 35 : 0);
      placed.push({ x, z, w, d, h });
      parts.push(towerGeo(w, h, d, x, h / 2 - FLOOR_DROP, z));
      // stepped crown on some towers
      if (rnd() < 0.35) parts.push(towerGeo(w * 0.6, 6 + rnd() * 10, d * 0.6, x, h - FLOOR_DROP + 4, z));
    }
    const city = new THREE.Mesh(mergeGeometries(parts), towerMat);
    city.matrixAutoUpdate = false;
    scene.add(city);
    // red aircraft-warning lights on the tallest roofs (they blink)
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#ff3b3b', fog: false });
    const beacons = [];
    for (const p of placed.filter((q) => q.h > FLOOR_DROP + 5)) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), beaconMat);
      b.position.set(p.x, p.h - FLOOR_DROP + 0.8, p.z);
      scene.add(b);
      beacons.push(b);
    }
    let bt = 0;
    updaters.push((dt) => { bt += dt; const on = bt % 1.6 < 0.5; beacons.forEach((b) => { b.visible = on; }); });
  }
  // streets far below: dark ground with glowing road grid
  {
    const c = makeCanvas(512, 512);
    const g = c.getContext('2d');
    g.fillStyle = '#0a0d16'; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#ffb35c';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 128, 0, 6, 512); g.fillRect(0, i * 128, 512, 6); }
    g.fillStyle = 'rgba(255,180,90,0.25)';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 128 - 6, 0, 18, 512); g.fillRect(0, i * 128 - 6, 512, 18); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 14);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ map: t, fog: true }));
    street.rotation.x = -Math.PI / 2;
    street.position.y = -FLOOR_DROP;
    scene.add(street);
  }
  // roof terrace slab around the office
  const slab = new THREE.Mesh(new THREE.BoxGeometry(40, 0.2, 28), M('slab', { color: '#3a3f4c', roughness: 0.9 }));
  slab.position.y = -0.11;
  slab.receiveShadow = true;
  root.add(slab);

  // =====================================================================
  // Layout from Claude Design "06 Office": 36 x 24 m top floor at night.
  // Plan coordinates (origin north-west corner, x east, y south) map to the
  // scene as X = x - 18, Z = y - 12.
  // =====================================================================
  const P = (x, y) => [x - 18, y - 12];
  const SILL = 0.25, HEAD = 2.9, T = 0.3; // exterior glass runs almost floor to ceiling

  // ---------- floors ----------
  const wood = woodTexture();
  wood.repeat.set(12, 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);
  const floorPatch = (x0, y0, x1, y1, tex, rep = 1) => {
    tex.repeat.set((x1 - x0) / 3 * rep, (y1 - y0) / 3 * rep);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    m.rotation.x = -Math.PI / 2;
    const [cx, cz] = P((x0 + x1) / 2, (y0 + y1) / 2);
    m.position.set(cx, 0.004, cz);
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  floorPatch(13, 0, 23, 9, carpetTexture('#4a5568'));                 // meeting room carpet
  floorPatch(0, 11, 7, 17, carpetTexture('#c9d3cf'));                 // library
  floorPatch(0, 17, 7, 24, carpetTexture('#7a8b8a'));                 // manager's office
  floorPatch(7, 19, 13, 24, carpetTexture('#8d97b0'));                // huddle rooms
  floorPatch(23, 13, 36, 24, carpetTexture('#e6e1d6', '#d3cbbb'), 2); // café tiles
  {
    // terrace decking
    const c = makeCanvas(256, 256);
    const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28, 30%, ${34 + (i % 3) * 3}%)`; g.fillRect(0, i * 32, 256, 30); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    floorPatch(30, 0, 36, 13, t, 1.5);
  }
  const rugAt = (x, y, w, d, col, line) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: carpetTexture(col, line), roughness: 1 }));
    r.rotation.x = -Math.PI / 2;
    const [cx, cz] = P(x, y);
    r.position.set(cx, 0.008, cz);
    r.receiveShadow = true;
    root.add(r);
  };
  rugAt(6.5, 5.5, 11, 2.6, '#d9c6a5', '#b5714f'); // workspace runner
  rugAt(26.5, 6.5, 3.6, 2.6, '#e8c9a0', '#c97a5b'); // lounge
  rugAt(3.5, 14.5, 2.6, 2, '#bfe0cf', '#7fa894'); // library reading rug

  // ---------- walls ----------
  // axis 'x' => wall runs along x at fixed z ; axis 'z' => along z at fixed x
  function wall(axis, fixed, from, to, windows = [], mat = wallMat, thick = T) {
    const seg = (a, b, y0, y1, m = mat) => {
      const len = b - a, mid = (a + b) / 2, h = y1 - y0;
      const mesh = axis === 'x'
        ? box(len, h, thick, m, mid, y0 + h / 2, fixed, root, 0)
        : box(thick, h, len, m, fixed, y0 + h / 2, mid, root, 0);
      occluders.push(mesh);
      return mesh;
    };
    let cursor = from;
    for (const [a, b] of windows) {
      if (a > cursor) seg(cursor, a, 0, WALL_H);
      seg(a, b, 0, SILL);
      seg(a, b, HEAD, WALL_H);
      const len = b - a, mid = (a + b) / 2;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, HEAD - SILL), windowMat);
      if (axis === 'z') glass.rotation.y = Math.PI / 2;
      glass.position.set(axis === 'x' ? mid : fixed, (SILL + HEAD) / 2, axis === 'x' ? fixed : mid);
      root.add(glass);
      // mullions every ~1.2 m
      const nM = Math.max(1, Math.round(len / 1.2));
      for (let i = 1; i < nM; i++) {
        const p = a + (len * i) / nM;
        if (axis === 'x') box(0.05, HEAD - SILL, 0.06, trimMat, p, (SILL + HEAD) / 2, fixed, root, 0);
        else box(0.06, HEAD - SILL, 0.05, trimMat, fixed, (SILL + HEAD) / 2, p, root, 0);
      }
      cursor = b;
    }
    if (cursor < to) seg(cursor, to, 0, WALL_H);
    if (axis === 'x') collide(from, to, fixed - thick / 2, fixed + thick / 2);
    else collide(fixed - thick / 2, fixed + thick / 2, from, to);
  }
  /** windows filling a span, leaving short piers between panes */
  const panes = (from, to, pane = 2.4, pier = 0.25) => {
    const out = [];
    for (let a = from + pier; a + 0.6 < to; a += pane + pier) out.push([a, Math.min(to - pier, a + pane)]);
    return out;
  };
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  // exterior: city-view glass all round, except the solid lobby wall with the lift
  wall('x', minZ, minX, 12, panes(minX, 12));                       // north
  wall('z', minX, minZ, maxZ, panes(minZ, maxZ));                   // west
  wall('x', maxZ, minX, -5, panes(minX, -5));                       // south (manager + huddle)
  wall('x', maxZ, -5, 5, [], accentWall);                           // lobby wall with the lift
  wall('x', maxZ, 5, maxX, panes(5, maxX));                         // south (café)
  wall('z', maxX, 1, maxZ, panes(1, maxZ));                         // east (café)

  // interior glass partitions (with a rail at 0.95 m); doors are gaps
  function glassWall(axis, fixed, from, to) {
    const len = to - from, mid = (from + to) / 2;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len, WALL_H - 0.1), glassMat);
    if (axis === 'z') g.rotation.y = Math.PI / 2;
    g.position.set(axis === 'x' ? mid : fixed, (WALL_H - 0.1) / 2, axis === 'x' ? fixed : mid);
    g.renderOrder = 2;
    root.add(g);
    for (const y of [0.04, WALL_H - 0.06, 0.95]) {
      const h = y === 0.95 ? 0.03 : 0.08;
      if (axis === 'x') box(len, h, 0.08, trimMat, mid, y, fixed, root, 0);
      else box(0.08, h, len, trimMat, fixed, y, mid, root, 0);
    }
    for (let p = from; p <= to + 0.01; p += len / Math.max(1, Math.round(len / 1.2))) {
      if (axis === 'x') box(0.05, WALL_H, 0.06, trimMat, p, WALL_H / 2, fixed, root, 0);
      else box(0.06, WALL_H, 0.05, trimMat, fixed, WALL_H / 2, p, root, 0);
    }
    if (axis === 'x') collide(from, to, fixed - 0.08, fixed + 0.08);
    else collide(fixed - 0.08, fixed + 0.08, from, to);
  }
  const solid = (axis, fixed, from, to) => wall(axis, fixed, from, to, [], wallMat, 0.12);
  // meeting room (x 13-23, y 0-9): solid west wall (screen inside, whiteboards outside), glass east + south, door at the south-east
  solid('z', -5, minZ, -3);
  glassWall('z', 5, minZ, -3);
  glassWall('x', -3, -5, 2.9);
  // library (x 0-7, y 11-17) and manager's office (x 0-7, y 17-24)
  solid('z', -11, -1, 3.6);            // library | printer, door at y 15.6-16.8
  solid('z', -11, 4.8, 5.2);
  solid('x', 5, minX, -12.2);          // library | manager, door at x 5.8-7
  solid('z', -11, 5, maxZ);            // manager | huddle
  // huddle rooms (x 7-13, y 19-24): two glass rooms with doors on their north side
  glassWall('x', 7, -11, -10.2);
  glassWall('x', 7, -9, -7.2);
  glassWall('x', 7, -6, -5);
  glassWall('z', -8, 7, maxZ);
  glassWall('z', -5, 7, maxZ);
  // terrace (x 30-36, y 0-13): glass to the lounge with a door, glass to the café, railing outside
  glassWall('z', 12, minZ, -6.2);
  glassWall('z', 12, -5, 1);
  glassWall('x', 1, 12, maxX);
  {
    const rail = M('rail', { color: '#8a5a3b', roughness: 0.6 });
    box(6, 0.06, 0.1, rail, 15, 1.0, minZ + 0.05, root, 0.02);
    box(0.1, 0.06, 13, rail, maxX - 0.05, 1.0, -5.5, root, 0.02);
    for (let x = 12; x <= maxX + 0.01; x += 1.5) box(0.06, 1.0, 0.06, metal, Math.min(x, maxX - 0.05), 0.5, minZ + 0.05, root, 0);
    for (let z = minZ; z <= 1.01; z += 1.5) box(0.06, 1.0, 0.06, metal, maxX - 0.05, 0.5, z, root, 0);
    collide(12, maxX, minZ - 0.3, minZ + 0.15);
    collide(maxX - 0.15, maxX + 0.3, minZ, 1);
  }

  // ---------- signs ----------
  function textPanel(w, h, draw, pxPerM = 256) {
    const c = makeCanvas(Math.round(w * pxPerM), Math.round(h * pxPerM));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    const redraw = (...args) => { draw(c.getContext('2d'), c.width, c.height, ...args); tex.needsUpdate = true; };
    redraw();
    return { mesh, redraw, canvas: c, tex };
  }
  const sign = (text, x, z, ry, w = 2.4) => {
    const s = textPanel(w, 0.4, (g, cw, ch) => {
      g.clearRect(0, 0, cw, ch);
      g.fillStyle = 'rgba(30,34,44,0.85)';
      roundRect(g, 0, 0, cw, ch, 40);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `600 ${ch * 0.44}px Inter, system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cw / 2, ch / 2 + 4);
    });
    s.mesh.position.set(x, 3.1, z);
    s.mesh.rotation.y = ry;
    root.add(s.mesh);
    const back = s.mesh.clone();
    back.rotation.y = ry + Math.PI;
    root.add(back);
  };
  sign('MEETING ROOM', 0, -2.92, 0, 2.6);
  sign('LIBRARY', -14.5, -0.95, 0, 1.6);
  sign('MANAGER', -14.5, 5.06, 0, 1.6);
  sign('HUDDLE', -8, 6.94, 0, 1.4);

  let roomCode = '';
  const welcome = textPanel(3.2, 1.0, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#2f4744';
    roundRect(g, 0, 0, w, h, 60);
    g.fill();
    g.fillStyle = '#f6c177';
    g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f4744';
    g.font = `700 ${h * 0.26}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('S', h * 0.5, h * 0.52);
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.font = `700 ${h * 0.3}px Inter, system-ui, sans-serif`;
    g.fillText('Study Hub', h * 0.92, h * 0.4);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.font = `500 ${h * 0.15}px Inter, system-ui, sans-serif`;
    g.fillText(roomCode ? `Room code  ${roomCode}` : 'Learn together · Present together', h * 0.92, h * 0.7);
  });
  welcome.mesh.position.set(-3.3, 2.0, maxZ - 0.07);
  welcome.mesh.rotation.y = Math.PI;
  root.add(welcome.mesh);

  // ---------- furniture helpers ----------
  const fabricBlue = M('fabricBlue', { color: '#3e4c63', roughness: 0.95 });
  const fabricTerracotta = M('fabricTerra', { color: '#c97a5b', roughness: 0.95 });
  const fabricCream = M('fabricCream', { color: '#ecd9bb', roughness: 0.95 });
  const fabricSage = M('fabricSage', { color: '#8aa88b', roughness: 0.95 });
  const lampLights = [];

  function addSeat(id, x, z, ry, opts = {}) {
    seats.set(id, { id, x, z, ry, y: opts.y ?? 0.5, type: opts.type || 'desk', typing: !!opts.typing });
  }
  /** an object you can click to use (coffee machine, bookshelf, printer…) */
  function useable(obj, kind) {
    obj.traverse((m) => { if (m.isMesh) { m.userData.interact = kind; clickables.push(m); } });
  }
  function tag(mesh, ids) {
    mesh.userData.seatIds = ids;
    clickables.push(mesh);
  }
  // office chair: local facing +z (person sits looking +z)
  function officeChair(x, z, ry, color = fabricBlue) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    const parts = [];
    parts.push(box(0.5, 0.08, 0.48, color, 0, 0.46, 0.02, g, 0.03));
    parts.push(box(0.48, 0.55, 0.07, color, 0, 0.82, -0.24, g, 0.03));
    parts[1].rotation.x = -0.08;
    cylinder(0.03, 0.03, 0.36, metal, 0, 0.26, 0, g, 10);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = box(0.3, 0.03, 0.04, metal, Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14, g, 0.01);
      leg.rotation.y = -a;
      cylinder(0.025, 0.025, 0.04, metal, Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28, g, 8);
    }
    for (const s of [-1, 1]) {
      box(0.04, 0.2, 0.04, metal, 0.26 * s, 0.58, 0, g, 0.01);
      box(0.06, 0.03, 0.28, metal, 0.26 * s, 0.68, 0.02, g, 0.01);
    }
    return { group: g, parts };
  }
  // simple 4-leg chair facing +z
  function sideChair(id, x, z, ry, mat, type = 'meeting') {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    const parts = [box(0.5, 0.08, 0.48, mat, 0, 0.46, 0.02, g, 0.03), box(0.5, 0.48, 0.06, mat, 0, 0.78, -0.24, g, 0.03)];
    for (const [lx, lz] of [[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.2], [0.21, 0.2]]) cylinder(0.018, 0.018, 0.44, metal, lx, 0.22, lz, g, 8);
    parts.forEach((p) => tag(p, [id]));
    addSeat(id, x, z, ry, { y: 0.5, type });
    return g;
  }
  function plant(x, z, size = 1, potMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    const pm = potMat || M('pot', { color: '#ece6dc', roughness: 0.7 });
    cylinder(0.24 * size, 0.18 * size, 0.42 * size, pm, 0, 0.21 * size, 0, g);
    cylinder(0.22 * size, 0.22 * size, 0.02, M('soil', { color: '#4b3a2c' }), 0, 0.42 * size, 0, g);
    const lm = [M('leafA', { color: '#4f8a4b', roughness: 0.8, flatShading: true }), M('leafB', { color: '#6aa556', roughness: 0.8, flatShading: true })];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const r = 0.1 + (i % 3) * 0.07;
      const blob = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry((0.2 + (i % 2) * 0.06) * size, 0), lm[i % 2]));
      blob.position.set(Math.cos(a) * r * size, (0.62 + (i / 7) * 0.55) * size, Math.sin(a) * r * size);
      blob.rotation.set(i, i * 2, 0);
      g.add(blob);
    }
    collideAround(x, z, 0.26 * size, 0.26 * size);
    return g;
  }
  const plantP = (x, y, s, pot) => { const [X, Z] = P(x, y); return plant(X, Z, s, pot); };
  function couch(x, z, ry, seatsN, mat, idPrefix) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    const w = seatsN * 0.75 + 0.3;
    const parts = [];
    parts.push(box(w, 0.32, 0.9, mat, 0, 0.26, 0, g, 0.06));
    parts.push(box(w, 0.55, 0.22, mat, 0, 0.6, -0.36, g, 0.08));
    for (const s of [-1, 1]) parts.push(box(0.18, 0.5, 0.9, mat, s * (w / 2 - 0.09), 0.4, 0, g, 0.07));
    const ids = [];
    for (let i = 0; i < seatsN; i++) {
      const cx = -((seatsN - 1) * 0.75) / 2 + i * 0.75;
      parts.push(box(0.72, 0.12, 0.66, mat, cx, 0.46, 0.08, g, 0.05));
      const pillow = box(0.42, 0.32, 0.12, fabricCream, cx + 0.05, 0.68, -0.2, g, 0.05);
      pillow.rotation.set(-0.25, 0.1 * (i - 1), 0.12 * (i % 2 ? 1 : -1));
      const local = new THREE.Vector3(cx, 0, 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const id = `${idPrefix}${i + 1}`;
      addSeat(id, x + local.x, z + local.z, ry, { y: 0.52, type: 'couch' });
      ids.push(id);
    }
    box(w - 0.2, 0.06, 0.7, metal, 0, 0.05, 0, g, 0.02);
    parts.forEach((p) => tag(p, ids));
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    collideAround(x, z, (w / 2) * c + 0.45 * s - 0.05, (w / 2) * s + 0.45 * c - 0.05);
  }
  function floorLamp(fx, fz) {
    cylinder(0.2, 0.22, 0.04, metal, fx, 0.02, fz, root);
    cylinder(0.02, 0.02, 1.6, metal, fx, 0.82, fz, root, 8);
    const shade = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.36, 24, 1, true), M('floorShade', { color: '#f8ecd8', side: THREE.DoubleSide, emissive: '#ffd59a', emissiveIntensity: 0.6, roughness: 0.9 })), false, false);
    shade.position.set(fx, 1.72, fz);
    root.add(shade);
    lampLights.push(new THREE.Vector3(fx, 1.6, fz));
    collideAround(fx, fz, 0.25, 0.25);
  }
  const bookColors = ['#c0392b', '#2f4744', '#f6c177', '#5b7cfa', '#8aa88b', '#e86f51', '#3e4c63', '#ecd9bb'];
  /** bookshelf 2 m wide along local x, books facing +z */
  function bookshelf(x, z, ry, kind = 'read') {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    for (const s of [-1, 1]) box(0.04, 2.0, 0.4, walnut, s * 1.0, 1.0, 0, g, 0.01);
    box(2.04, 2.0, 0.03, walnut, 0, 1.0, -0.19, g, 0.01);
    for (let i = 0; i < 5; i++) box(2.0, 0.04, 0.4, walnut, 0, 0.05 + i * 0.48, 0, g, 0.01);
    for (let i = 0; i < 4; i++) {
      let px = -0.92, k = i * 5 + Math.round(x * 3);
      while (px < 0.85) {
        const t = 0.04 + ((k * 7) % 5) * 0.012;
        const h = 0.3 + ((k * 3) % 4) * 0.03;
        box(t, h, 0.26, M(`bk${k % 8}`, { color: bookColors[k % 8], roughness: 0.8 }), px + t / 2, 0.07 + i * 0.48 + h / 2, 0.02, g, 0.005);
        px += t + 0.006;
        k++;
        if (k % 9 === 0) px += 0.15;
      }
    }
    useable(g, kind);
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    collideAround(x, z, 1.02 * c + 0.22 * s, 1.02 * s + 0.22 * c);
    return g;
  }
  const monitorMats = [0, 1, 2, 3].map((i) => new THREE.MeshBasicMaterial({ map: monitorTexture(i + 1), toneMapped: false }));
  const deskH = 0.75;
  /** desk with monitor + office chair; chair sits on the side the desk "faces" (ry = direction the person looks) */
  function workDesk(id, x, z, ry, w = 1.4, d = 0.75, n = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    const top = box(w, 0.05, d, oak, 0, deskH, 0, g, 0.015);
    for (const lx of [-1, 1]) box(0.05, deskH - 0.03, d - 0.08, metal, lx * (w / 2 - 0.06), (deskH - 0.03) / 2, 0, g, 0.01);
    box(w - 0.15, 0.3, 0.03, metal, 0, deskH - 0.25, d / 2 - 0.08, g, 0.01); // modesty panel at the far side
    const mon = new THREE.Group();
    mon.position.set(0, deskH + 0.03, d / 2 - 0.2);
    mon.rotation.y = Math.PI;
    g.add(mon);
    box(0.62, 0.38, 0.03, metal, 0, 0.36, 0, mon, 0.01);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), monitorMats[n % 4]);
    screen.position.set(0, 0.36, -0.017);
    screen.rotation.y = Math.PI;
    mon.add(screen);
    box(0.05, 0.16, 0.04, metal, 0, 0.1, 0.03, mon, 0.01);
    box(0.22, 0.015, 0.16, metal, 0, 0.01, 0.02, mon, 0.005);
    box(0.42, 0.02, 0.13, M('kb', { color: '#e6e6ea', roughness: 0.5 }), 0, deskH + 0.035, -0.12, g, 0.008);
    cylinder(0.04, 0.04, 0.1, M(`mug${n % 3}`, { color: ['#e86f51', '#f6c177', '#5b7cfa'][n % 3], roughness: 0.4 }), w / 2 - 0.2, deskH + 0.075, -0.15, g, 14);
    if (n % 2) bookColors.slice(0, 3).forEach((c, i) => box(0.22, 0.04, 0.16, M(`book${i}`, { color: c, roughness: 0.7 }), -w / 2 + 0.22, deskH + 0.045 + i * 0.042, 0.05, g, 0.008).rotation.y = i * 0.2);
    // chair behind the desk (toward -z local), person looks +z
    const back = new THREE.Vector3(0, 0, -(d / 2 + 0.38)).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const chair = officeChair(x + back.x, z + back.z, ry);
    addSeat(id, x + back.x, z + back.z, ry, { y: 0.5, type: 'desk', typing: true });
    tag(top, [id]);
    chair.parts.forEach((p) => tag(p, [id]));
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    collideAround(x, z, (w / 2) * c + (d / 2) * s, (w / 2) * s + (d / 2) * c);
  }

  // ---------- open workspace (x 0-13, y 0-11): 4 pods of 4 desks, chairs face each other ----------
  let deskN = 0;
  for (const [px, py] of [[3.6, 3], [9.4, 3], [3.6, 8.3], [9.4, 8.3]]) {
    const [cx, cz] = P(px, py);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        deskN++;
        // desks back to back along z; the person sits on the outer side looking toward the pod centre
        workDesk(`desk${deskN}`, cx + sx * 0.71, cz + sz * 0.375, sz < 0 ? 0 : Math.PI, 1.4, 0.75, deskN);
      }
    }
    box(2.86, 0.4, 0.04, M('divider', { color: '#9fb6ad', roughness: 0.95 }), cx, deskH + 0.2, cz, root, 0.015);
  }
  floorLamp(...P(0.6, 5.5));
  plantP(0.6, 0.6, 1.3);
  plantP(12.4, 0.6, 1.1);
  plantP(0.6, 10.4, 1.0, M('potTerra', { color: '#c46a4a' }));

  // whiteboard wall: on the meeting room's solid west wall, facing the workspace (x 7-13, y 0-9)
  for (const y of [2.2, 5.0]) {
    const [, wz] = P(13, y);
    const wb = new THREE.Group();
    wb.position.set(-5.08, 0, wz);
    wb.rotation.y = -Math.PI / 2;
    root.add(wb);
    box(2.4, 1.2, 0.04, M('wbFrame', { color: '#c9cbd6', metalness: 0.4, roughness: 0.3 }), 0, 1.55, 0, wb, 0.02);
    box(2.3, 1.1, 0.045, M('wbFace', { color: '#ffffff', roughness: 0.25 }), 0, 1.55, 0.005, wb, 0.01);
    box(1.0, 0.04, 0.08, M('wbTray', { color: '#9aa0aa' }), 0, 0.96, 0.04, wb, 0.01);
    ['#2b2e38', '#d8443c', '#4a6fd8'].forEach((c, i) => box(0.12, 0.022, 0.022, M(`marker${i}`, { color: c }), -0.2 + i * 0.18, 1.0, 0.05, wb, 0.008));
    useable(wb, 'whiteboard');
  }
  // Pomodoro board on the same wall
  const pomoBoard = textPanel(2.0, 1.02, () => {}, 300);
  {
    const [, bz] = P(13, 7.6);
    box(0.06, 1.12, 2.1, M('boardFrame', { color: '#2a2c33', roughness: 0.4 }), -5.09, 1.9, bz, root, 0.02).castShadow = false;
    pomoBoard.mesh.rotation.y = -Math.PI / 2;
    pomoBoard.mesh.position.set(-5.13, 1.9, bz);
    root.add(pomoBoard.mesh);
  }

  // ---------- meeting room (x 13-23, y 0-9): 16 seats round a 5.2 x 1.6 m table, 3.2 m screen on the west wall ----------
  const [mtx, mtz] = P(18.6, 4.5);
  {
    const t = box(5.2, 0.06, 1.6, walnut, mtx, 0.75, mtz, root, 0.25);
    t.receiveShadow = true;
    for (const lx of [-1.9, 1.9]) box(0.5, 0.72, 0.9, metal, mtx + lx, 0.36, mtz, root, 0.04);
    collideAround(mtx, mtz, 2.6, 0.8);
  }
  const meetingSeatIds = [];
  {
    let n = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        n++;
        const id = `meet${n}`;
        const x = mtx - 2.25 + i * 0.75, z = mtz + side * 1.25;
        // chairs face the table, turned a little toward the screen
        sideChair(id, x, z, side < 0 ? -0.35 : Math.PI + 0.35, i % 2 ? fabricBlue : fabricTerracotta);
        meetingSeatIds.push(id);
      }
    }
    for (const dz of [-0.4, 0.4]) {
      n++;
      const id = `meet${n}`;
      sideChair(id, mtx + 3.0, mtz + dz, -Math.PI / 2, fabricBlue);
      meetingSeatIds.push(id);
    }
  }
  // screen with bezel on the solid west wall, facing +x
  const bezel = box(0.05, SCREEN.h + 0.16, SCREEN.w + 0.16, M('bezel', { color: '#15161b', roughness: 0.3, metalness: 0.4 }), SCREEN.x - 0.04, SCREEN.y, SCREEN.z, root, 0.02);
  bezel.castShadow = false;
  const screenBack = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ color: '#050608', toneMapped: false }));
  screenBack.position.set(SCREEN.x - 0.005, SCREEN.y, SCREEN.z);
  screenBack.rotation.y = Math.PI / 2;
  root.add(screenBack);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat);
  screenMesh.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
  screenMesh.rotation.y = Math.PI / 2;
  screenMesh.userData.isScreen = true;
  root.add(screenMesh);
  const idleScreen = textPanel(SCREEN.w, SCREEN.h, (g, w, h, title = 'Meeting Room', sub = 'Press “Present” to share your screen or slides') => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1f2a44');
    grad.addColorStop(1, '#2f4744');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(246,193,119,0.9)';
    g.beginPath(); g.arc(w / 2, h * 0.36, h * 0.09, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f2a44';
    g.beginPath(); g.moveTo(w / 2 - h * 0.03, h * 0.31); g.lineTo(w / 2 + h * 0.045, h * 0.36); g.lineTo(w / 2 - h * 0.03, h * 0.41); g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${h * 0.1}px Inter, system-ui, sans-serif`;
    g.fillText(title, w / 2, h * 0.6);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.font = `500 ${h * 0.05}px Inter, system-ui, sans-serif`;
    g.fillText(sub, w / 2, h * 0.72);
  }, 260);
  const screenApi = {
    mesh: screenMesh,
    setTexture(tex, aspect) {
      const maxA = SCREEN.w / SCREEN.h;
      let w = SCREEN.w, h = SCREEN.h;
      if (aspect > maxA) h = w / aspect; else w = h * aspect;
      screenMesh.scale.set(w, h, 1);
      screenMat.map = tex;
      screenMat.needsUpdate = true;
    },
    setIdle(title, sub) {
      idleScreen.redraw(title, sub);
      this.setTexture(idleScreen.tex, SCREEN.w / SCREEN.h);
    },
  };
  screenApi.setIdle();
  // podium beside the screen, turned 60° toward the room
  {
    const [lx, lz] = P(14.2, 7.6);
    const pg = new THREE.Group();
    pg.position.set(lx, 0, lz);
    pg.rotation.y = Math.PI / 2 - Math.PI / 3;
    root.add(pg);
    box(0.6, 1.05, 0.45, walnut, 0, 0.525, 0, pg, 0.03);
    box(0.7, 0.05, 0.5, oak, 0, 1.07, 0.03, pg, 0.02).rotation.x = 0.12;
    collideAround(lx, lz, 0.32, 0.32);
  }
  plantP(22.4, 0.6, 1.0);
  plantP(22.4, 8.4, 0.9, M('potTerra', {}));

  // ---------- lounge (x 23-30, y 0-13) ----------
  {
    const [tx, tz] = P(26.5, 6.5);
    const t = box(1.4, 0.06, 0.8, oak, tx, 0.42, tz, root, 0.03);
    t.receiveShadow = true;
    for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cylinder(0.025, 0.02, 0.4, walnut, tx + lx, 0.2, tz + lz, root, 8);
    cylinder(0.05, 0.04, 0.1, M('mug0', {}), tx + 0.3, 0.5, tz, root, 14);
    box(0.3, 0.03, 0.22, M('book0', {}), tx - 0.3, 0.465, tz + 0.05, root, 0.005).rotation.y = 0.3;
    collideAround(tx, tz, 0.75, 0.45);
    couch(tx, tz + 1.55, Math.PI, 3, fabricTerracotta, 'sofaA');
    couch(tx - 1.9, tz, Math.PI / 2, 1, fabricSage, 'armL');
    couch(tx + 1.9, tz, -Math.PI / 2, 1, fabricBlue, 'armR');
    couch(tx, tz - 3.6, 0, 2, fabricSage, 'sofaB');
    floorLamp(...P(29.3, 9));
  }
  plantP(23.6, 0.6, 1.2, M('potTerra', {}));
  plantP(29.4, 0.6, 1.0);
  plantP(29.4, 12.4, 1.1);

  // ---------- terrace (x 30-36, y 0-13): benches facing the moon + high tables ----------
  {
    for (const bx of [31.8, 34.4]) {
      const [x, z] = P(bx, 1.0);
      box(1.8, 0.08, 0.45, oak, x, 0.45, z, root, 0.02);
      for (const s of [-1, 1]) box(0.08, 0.45, 0.4, metal, x + s * 0.8, 0.225, z, root, 0.01);
      collideAround(x, z, 0.9, 0.23);
      addSeat(`bench${bx < 33 ? 'A' : 'B'}1`, x - 0.4, z + 0.02, Math.PI, { y: 0.5, type: 'couch' });
      addSeat(`bench${bx < 33 ? 'A' : 'B'}2`, x + 0.4, z + 0.02, Math.PI, { y: 0.5, type: 'couch' });
    }
    for (const ty of [6.5, 10]) {
      const [x, z] = P(33, ty);
      cylinder(0.4, 0.4, 0.04, oak, x, 1.05, z, root, 24);
      cylinder(0.04, 0.04, 1.0, metal, x, 0.52, z, root, 10);
      cylinder(0.25, 0.25, 0.03, metal, x, 0.015, z, root, 20);
      collideAround(x, z, 0.35, 0.35);
      for (const s of [-1, 1]) {
        cylinder(0.18, 0.18, 0.05, fabricTerracotta, x + s * 0.7, 0.75, z, root, 18);
        cylinder(0.02, 0.02, 0.72, metal, x + s * 0.7, 0.37, z, root, 8);
      }
    }
    floorLamp(...P(35.3, 12.3));
  }

  // ---------- library corner (x 0-7, y 11-17) ----------
  {
    bookshelf(...P(0.4, 12.4), Math.PI / 2);
    bookshelf(...P(0.4, 14.8), Math.PI / 2);
    bookshelf(...P(2.4, 11.35), 0);
    bookshelf(...P(4.6, 11.35), 0);
    const [rx, rz] = P(3.6, 14.6);
    cylinder(0.35, 0.35, 0.04, oak, rx, 0.55, rz, root, 24);
    cylinder(0.04, 0.04, 0.53, metal, rx, 0.27, rz, root, 10);
    collideAround(rx, rz, 0.32, 0.32);
    couch(rx - 1.0, rz + 0.3, Math.PI / 2 + 0.4, 1, fabricTerracotta, 'libA');
    couch(rx + 1.0, rz + 0.3, -Math.PI / 2 - 0.4, 1, fabricTerracotta, 'libB');
    floorLamp(...P(1.2, 16.4));
  }

  // ---------- printer & supply (x 7-13, y 11-19) ----------
  {
    const [cx, cz] = P(7.5, 13.5);
    box(0.6, 0.85, 1.8, M('cabinet', { color: '#2f4744', roughness: 0.6 }), cx, 0.425, cz, root, 0.02);
    collideAround(cx, cz, 0.32, 0.92);
    const pr = box(0.5, 0.3, 0.55, M('printer', { color: '#e9eaee', roughness: 0.5 }), cx, 1.0, cz - 0.4, root, 0.03);
    box(0.36, 0.02, 0.3, M('paperTray', { color: '#ffffff', roughness: 0.9 }), cx + 0.05, 1.16, cz - 0.4, root, 0.005);
    box(0.02, 0.03, 0.12, M('printerLed', { color: '#3ddc84', emissive: '#3ddc84', emissiveIntensity: 0.8 }), cx + 0.26, 1.05, cz - 0.55, root, 0.005);
    useable(pr, 'papers');
    // supply shelves: click for office supplies
    const sup = new THREE.Group();
    sup.position.set(cx, 0, cz + 0.55);
    root.add(sup);
    const supCols = ['#ffe06b', '#4a6fd8', '#d8443c', '#8aa88b', '#f3e6c8'];
    for (let i = 0; i < 5; i++) box(0.24, 0.14, 0.3, M(`sup${i}`, { color: supCols[i], roughness: 0.8 }), 0, 0.92 + (i % 2) * 0.15, -0.3 + i * 0.16, sup, 0.02);
    useable(sup, 'supplies');
    const [sx, sz] = P(7.4, 17.4);
    const shelf = bookshelf(sx, sz, Math.PI / 2, 'supplies');
    shelf.scale.set(0.8, 0.9, 1);
    plantP(12.4, 11.6, 0.9);
  }

  // ---------- manager's office (x 0-7, y 17-24) ----------
  {
    const [dx, dz] = P(3.6, 20.4);
    workDesk('manager', dx, dz, Math.PI, 1.8, 0.9, 5);
    sideChair('mgrGuest1', dx - 0.45, dz - 1.15, 0, fabricBlue, 'chair');
    sideChair('mgrGuest2', dx + 0.45, dz - 1.15, 0, fabricBlue, 'chair');
    couch(...P(0.75, 20.5), Math.PI / 2, 2, fabricBlue, 'mgrSofa');
    bookshelf(...P(3.6, 23.6), Math.PI);
    plantP(6.4, 23.4, 1.0, M('potTerra', {}));
  }

  // ---------- huddle rooms ×2 (x 7-13, y 19-24) ----------
  for (const [hx, ab] of [[8.5, 'A'], [11.5, 'B']]) {
    const [x, z] = P(hx, 21.8);
    cylinder(0.45, 0.45, 0.04, oak, x, 0.75, z, root, 24);
    cylinder(0.05, 0.05, 0.73, metal, x, 0.37, z, root, 10);
    collideAround(x, z, 0.4, 0.4);
    sideChair(`huddle${ab}1`, x - 0.8, z, Math.PI / 2, fabricSage, 'chair');
    sideChair(`huddle${ab}2`, x + 0.8, z, -Math.PI / 2, fabricSage, 'chair');
  }

  // ---------- reception & lobby (x 13-23, y 9-24) ----------
  {
    // reception desk facing the lift
    const [rx, rz] = P(18, 18.2);
    const desk = box(3.0, 1.05, 0.7, M('recDesk', { color: '#f2ede6', roughness: 0.5 }), rx, 0.525, rz, root, 0.06);
    box(3.1, 0.05, 0.8, walnut, rx, 1.07, rz, root, 0.02);
    box(2.6, 0.08, 0.06, M('recStripe', { color: '#f6c177', emissive: '#f6c177', emissiveIntensity: 0.4 }), rx, 0.6, rz + 0.36, root, 0.01);
    collideAround(rx, rz, 1.5, 0.35);
    tag(desk, ['reception']);
    officeChair(rx, rz - 0.75, 0);
    addSeat('reception', rx, rz - 0.73, 0, { y: 0.5, type: 'desk', typing: true });
    // waiting sofa + side plant
    couch(...P(14.2, 14.5), Math.PI / 2, 3, fabricSage, 'lobby');
    plantP(13.6, 12.2, 1.2);
    plantP(22.4, 12.2, 1.2, M('potTerra', {}));
    plantP(13.8, 23.3, 1.0);
    plantP(22.2, 23.3, 1.0);
    floorLamp(...P(22.4, 16));
    // round rug where people arrive
    const [sx, sz] = [SPAWN.x, SPAWN.z];
    const spawnRug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshStandardMaterial({ color: '#e8c9a0', roughness: 1 }));
    spawnRug.rotation.x = -Math.PI / 2;
    spawnRug.position.set(sx, 0.009, sz);
    spawnRug.receiveShadow = true;
    root.add(spawnRug);
    const spawnRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.45, 64), new THREE.MeshBasicMaterial({ color: '#c97a5b' }));
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(sx, 0.011, sz);
    root.add(spawnRing);
    // lift doors in the solid lobby wall
    const lift = new THREE.Group();
    lift.position.set(0, 0, maxZ - 0.16);
    lift.rotation.y = Math.PI;
    root.add(lift);
    box(2.6, 2.6, 0.06, M('liftFrame', { color: '#8a8f9c', metalness: 0.5, roughness: 0.3 }), 0, 1.3, 0, lift, 0.02);
    for (const s of [-1, 1]) box(1.1, 2.3, 0.05, M('liftDoor', { color: '#c9ccd6', metalness: 0.6, roughness: 0.25 }), s * 0.56, 1.2, 0.03, lift, 0.01);
    box(0.5, 0.14, 0.04, M('liftLed', { color: '#f6c177', emissive: '#f6c177', emissiveIntensity: 0.8 }), 0, 2.48, 0.05, lift, 0.01);
    useable(lift, 'lift');
  }

  // ---------- café / pantry (x 23-36, y 13-24) ----------
  {
    // counter along the south wall with the coffee machine, then vending machine, water cooler and fridge
    const [kx, kz] = P(29.5, 23.45);
    box(4, 0.9, 0.65, M('cabinet', { color: '#2f4744', roughness: 0.6 }), kx, 0.45, kz, root, 0.02);
    box(4.05, 0.05, 0.7, M('counterTop', { color: '#efe9df', roughness: 0.3 }), kx, 0.925, kz, root, 0.01);
    collideAround(kx, kz, 2.02, 0.35);
    const machine = box(0.45, 0.5, 0.38, metal, kx - 1.2, 1.2, kz, root, 0.04);
    box(0.3, 0.1, 0.04, M('cm', { color: '#e86f51', emissive: '#e86f51', emissiveIntensity: 0.4 }), kx - 1.2, 1.32, kz - 0.2, root, 0.01);
    useable(machine, 'coffee');
    cylinder(0.18, 0.1, 0.08, white, kx + 0.4, 0.99, kz, root, 18);
    for (let i = 0; i < 5; i++) {
      const f = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M(`fruit${i % 3}`, { color: ['#e86f51', '#f6c177', '#9ece6a'][i % 3], roughness: 0.5 })));
      f.position.set(kx + 0.4 + Math.cos(i * 1.3) * 0.08, 1.05 + (i % 2) * 0.03, kz + Math.sin(i * 1.3) * 0.08);
      root.add(f);
    }
    // vending machine (glowing)
    const [vx, vz] = P(32.4, 23.4);
    const vend = new THREE.Group();
    vend.position.set(vx, 0, vz);
    root.add(vend);
    box(0.9, 1.9, 0.75, M('vend', { color: '#d8443c', roughness: 0.4 }), 0, 0.95, 0, vend, 0.04);
    box(0.6, 1.2, 0.02, M('vendGlass', { color: '#ffe2a6', emissive: '#ffe2a6', emissiveIntensity: 0.7 }), -0.08, 1.15, -0.38, vend, 0.01);
    useable(vend, 'vending');
    collideAround(vx, vz, 0.47, 0.4);
    lampLights.push(new THREE.Vector3(vx, 1.4, vz - 0.8));
    // water cooler
    const [wx, wz] = P(33.6, 23.5);
    const cooler = new THREE.Group();
    cooler.position.set(wx, 0, wz);
    root.add(cooler);
    box(0.38, 1.0, 0.38, white, 0, 0.5, 0, cooler, 0.04);
    cylinder(0.15, 0.15, 0.42, M('bottleWater', { color: '#8fd0ff', transparent: true, opacity: 0.75, roughness: 0.1 }), 0, 1.22, 0, cooler, 16);
    useable(cooler, 'water');
    collideAround(wx, wz, 0.2, 0.2);
    // fridge
    const [fx, fz] = P(35.2, 23.4);
    box(0.8, 2.0, 0.75, M('fridge', { color: '#dfe3e8', roughness: 0.35, metalness: 0.3 }), fx, 1.0, fz, root, 0.04);
    box(0.03, 0.6, 0.04, metal, fx - 0.3, 1.3, fz - 0.39, root, 0.01);
    collideAround(fx, fz, 0.4, 0.38);
    // café tables, 2 chairs each
    let c = 0;
    for (const ty of [18.5, 21.2]) {
      for (const tx of [27, 30.5, 34]) {
        if (ty > 20 && tx > 33) continue;
        const [x, z] = P(tx, ty);
        cylinder(0.38, 0.38, 0.04, oak, x, 0.75, z, root, 24);
        cylinder(0.04, 0.04, 0.73, metal, x, 0.37, z, root, 10);
        cylinder(0.22, 0.22, 0.02, metal, x, 0.01, z, root, 16);
        collideAround(x, z, 0.36, 0.36);
        c++;
        sideChair(`cafe${c}a`, x - 0.75, z, Math.PI / 2, fabricTerracotta, 'chair');
        sideChair(`cafe${c}b`, x + 0.75, z, -Math.PI / 2, fabricTerracotta, 'chair');
      }
    }
    // pendants over the tables
    for (const tx of [27, 30.5, 34]) {
      const [x, z] = P(tx, 19.8);
      cylinder(0.005, 0.005, 1.0, metal, x, 3.1, z, root, 4);
      const pend = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('pend', { color: '#2f4744', side: THREE.DoubleSide, roughness: 0.4 })), false, false);
      pend.position.set(x, 2.6, z);
      root.add(pend);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1d0', toneMapped: false }));
      bulb.position.set(x, 2.55, z);
      root.add(bulb);
    }
    { const [lx, lz] = P(30.5, 19.8); lampLights.push(new THREE.Vector3(lx, 2.5, lz)); }
    plantP(23.6, 23.4, 1.1, M('potTerra', {}));
    plantP(35.4, 13.6, 1.2);
  }

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight('#ffeedd', '#5c5066', 1.15); // warm interior light at night
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe2c2', 2.0); // ceiling lights (casts the soft shadows)
  sun.position.set(5, 22, 8);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 16; sc.bottom = -16; sc.near = 2; sc.far = 70;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  for (const p of lampLights) {
    const l = new THREE.PointLight('#ffc98a', 4, 7, 1.6);
    l.position.copy(p);
    scene.add(l);
  }
  const meetLight = new THREE.PointLight('#dfe9ff', 6, 12, 1.4);
  meetLight.position.set(0.6, 3.2, -7.5);
  scene.add(meetLight);

  return {
    root, colliders, occluders, clickables, seats, meetingSeatIds, screen: screenApi, pomoBoard,
    setRoomCode(code) { roomCode = code; welcome.redraw(); },
    update(dt) { for (const u of updaters) u(dt); },
  };
}

/** Resolve a circle (player) against axis-aligned boxes. Mutates pos. */
export function resolveCollisions(pos, radius, colliders) {
  for (let iter = 0; iter < 2; iter++) {
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // centre inside the box: push out along the shallowest axis
          const left = pos.x - c.minX, right = c.maxX - pos.x, up = pos.z - c.minZ, down = c.maxZ - pos.z;
          const m = Math.min(left, right, up, down);
          if (m === left) pos.x = c.minX - radius;
          else if (m === right) pos.x = c.maxX + radius;
          else if (m === up) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    }
  }
  pos.x = Math.max(BOUNDS.minX + 0.4, Math.min(BOUNDS.maxX - 0.4, pos.x));
  pos.z = Math.max(BOUNDS.minZ + 0.4, Math.min(BOUNDS.maxZ - 0.4, pos.z));
}
