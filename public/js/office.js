// The office: built from simple shapes, plus colliders, seats and the presentation screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BOUNDS = { minX: -15, maxX: 15, minZ: -11, maxZ: 11 };
export const WALL_H = 3.6;
export const SPAWN = { x: 0, z: 3.5 };
export const SCREEN = { x: 9, y: 1.95, z: -10.74, w: 5.2, h: 2.925 };

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
  const windowMat = new THREE.MeshStandardMaterial({ color: '#d9eeff', emissive: '#bfe1ff', emissiveIntensity: 0.25, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false });

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

  // ---------- sky, ground, fog ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#7fb6f0') }, mid: { value: new THREE.Color('#cfe4f7') }, bottom: { value: new THREE.Color('#fbe1c4') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bottom, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c,1.0);
        #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog('#e6eef4', 45, 140);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#a3c38c', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);
  // patio slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 26), M('slab', { color: '#d9d4cc', roughness: 0.95 }));
  slab.position.y = -0.11;
  slab.receiveShadow = true;
  root.add(slab);

  // trees outside
  const leaf = M('treeLeaf', { color: '#6b9e5a', roughness: 0.9, flatShading: true });
  const leaf2 = M('treeLeaf2', { color: '#86b469', roughness: 0.9, flatShading: true });
  const bark = M('bark', { color: '#7a5a40', roughness: 0.9 });
  const treeSpots = [[-22, -16], [-26, 2], [-21, 15], [-8, 18], [6, 19], [20, 16], [25, 2], [22, -14], [8, -18], [-6, -19], [-30, -10], [30, -6], [-14, 24], [15, 25]];
  for (const [x, z] of treeSpots) {
    const s = 0.8 + ((x * 7 + z * 13) % 10) / 20;
    cylinder(0.25 * s, 0.35 * s, 2.4 * s, bark, x, 1.2 * s, z);
    const crown = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(1.9 * s, 1), (x + z) % 2 ? leaf : leaf2));
    crown.position.set(x, 3.6 * s, z);
    root.add(crown);
    const c2 = crown.clone();
    c2.scale.setScalar(0.7);
    c2.position.set(x + 0.9 * s, 4.6 * s, z - 0.3);
    root.add(c2);
  }

  // ---------- floors ----------
  const wood = woodTexture();
  wood.repeat.set(10, 7.3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const meetCarpet = carpetTexture('#4a5568');
  meetCarpet.repeat.set(4, 3);
  const meetFloor = new THREE.Mesh(new THREE.PlaneGeometry(11.8, 8.8), new THREE.MeshStandardMaterial({ map: meetCarpet, roughness: 1 }));
  meetFloor.rotation.x = -Math.PI / 2;
  meetFloor.position.set(9.05, 0.005, -6.5);
  meetFloor.receiveShadow = true;
  root.add(meetFloor);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 4.6), new THREE.MeshStandardMaterial({ map: carpetTexture('#d9c6a5', '#b5714f'), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-8.7, 0.006, 6.1);
  rug.receiveShadow = true;
  root.add(rug);

  const studyRug = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.6), new THREE.MeshStandardMaterial({ map: carpetTexture('#c9d3cf'), roughness: 1 }));
  studyRug.rotation.x = -Math.PI / 2;
  studyRug.position.set(-8.5, 0.006, -6.5);
  studyRug.receiveShadow = true;
  root.add(studyRug);

  // ---------- walls ----------
  const SILL = 0.9, HEAD = 2.65, T = 0.3;
  // axis 'x' => wall runs along x at fixed z ; axis 'z' => along z at fixed x
  function wall(axis, fixed, from, to, windows = [], mat = wallMat) {
    const seg = (a, b, y0, y1, m = mat) => {
      const len = b - a, mid = (a + b) / 2, h = y1 - y0;
      const mesh = axis === 'x'
        ? box(len, h, T, m, mid, y0 + h / 2, fixed, root, 0)
        : box(T, h, len, m, fixed, y0 + h / 2, mid, root, 0);
      occluders.push(mesh);
      return mesh;
    };
    let cursor = from;
    for (const [a, b] of windows) {
      if (a > cursor) seg(cursor, a, 0, WALL_H);
      seg(a, b, 0, SILL);
      seg(a, b, HEAD, WALL_H);
      // glass + frame
      const len = b - a, mid = (a + b) / 2;
      const glass = axis === 'x'
        ? new THREE.Mesh(new THREE.PlaneGeometry(len, HEAD - SILL), windowMat)
        : new THREE.Mesh(new THREE.PlaneGeometry(len, HEAD - SILL), windowMat);
      if (axis === 'z') glass.rotation.y = Math.PI / 2;
      glass.position.set(axis === 'x' ? mid : fixed, (SILL + HEAD) / 2, axis === 'x' ? fixed : mid);
      root.add(glass);
      const fr = 0.06;
      const frames = [
        [len + 0.04, fr, SILL + fr / 2, mid], [len + 0.04, fr, HEAD - fr / 2, mid],
        [fr, HEAD - SILL, (SILL + HEAD) / 2, a + fr / 2], [fr, HEAD - SILL, (SILL + HEAD) / 2, b - fr / 2],
        [fr * 0.7, HEAD - SILL, (SILL + HEAD) / 2, mid],
      ];
      for (const [fw, fh, fy, fc] of frames) {
        if (axis === 'x') box(fw, fh, T + 0.02, trimMat, fc, fy, fixed, root, 0);
        else box(T + 0.02, fh, fw, trimMat, fixed, fy, fc, root, 0);
      }
      // sill ledge
      if (axis === 'x') box(len, 0.04, T + 0.16, white, mid, SILL, fixed, root, 0.01);
      else box(T + 0.16, 0.04, len, white, fixed, SILL, mid, root, 0.01);
      cursor = b;
    }
    if (cursor < to) seg(cursor, to, 0, WALL_H);
    if (axis === 'x') collide(from, to, fixed - T / 2, fixed + T / 2);
    else collide(fixed - T / 2, fixed + T / 2, from, to);
  }
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  wall('x', minZ, minX, 3, [[-14, -11.6], [-10.4, -8], [-6.8, -4.4], [-3.2, -0.8], [0.4, 2.4]]);
  wall('x', minZ, 3, maxX, [], accentWall); // meeting room screen wall
  wall('x', maxZ, minX, maxX, [[-14, -11.6], [-10.4, -8], [-6.8, -4.2], [4.2, 6.6], [7.8, 10.2], [11.4, 13.8]]);
  wall('z', minX, minZ, maxZ, [[1.6, 4], [5.2, 7.6], [8.6, 10.4]]);
  wall('z', maxX, minZ, maxZ, [[-9.6, -7.2], [-6, -3.6], [-0.8, 1.8]]);
  // skirting boards
  const skirt = M('skirt', { color: '#e2dbd0', roughness: 0.7 });
  box(30, 0.12, 0.04, skirt, 0, 0.06, minZ + T / 2 + 0.02, root, 0);
  box(30, 0.12, 0.04, skirt, 0, 0.06, maxZ - T / 2 - 0.02, root, 0);
  box(0.04, 0.12, 22, skirt, minX + T / 2 + 0.02, 0.06, 0, root, 0);
  box(0.04, 0.12, 22, skirt, maxX - T / 2 - 0.02, 0.06, 0, root, 0);

  // glass partitions for the meeting room (x 3..15, z -11..-2) with a door gap at x 7.6..10.4
  function glassWall(axis, fixed, from, to) {
    const len = to - from, mid = (from + to) / 2;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len, WALL_H - 0.1), glassMat);
    if (axis === 'z') g.rotation.y = Math.PI / 2;
    g.position.set(axis === 'x' ? mid : fixed, (WALL_H - 0.1) / 2, axis === 'x' ? fixed : mid);
    g.renderOrder = 2;
    root.add(g);
    for (const y of [0.04, WALL_H - 0.06, 1.1]) {
      const h = y === 1.1 ? 0.03 : 0.08;
      if (axis === 'x') box(len, h, 0.08, trimMat, mid, y, fixed, root, 0);
      else box(0.08, h, len, trimMat, fixed, y, mid, root, 0);
    }
    for (let p = from; p <= to + 0.01; p += len / Math.max(1, Math.round(len / 2.2))) {
      if (axis === 'x') box(0.06, WALL_H, 0.08, trimMat, p, WALL_H / 2, fixed, root, 0);
      else box(0.08, WALL_H, 0.06, trimMat, fixed, WALL_H / 2, p, root, 0);
    }
    if (axis === 'x') collide(from, to, fixed - 0.08, fixed + 0.08);
    else collide(fixed - 0.08, fixed + 0.08, from, to);
  }
  glassWall('z', 3, minZ + T / 2, -2);
  glassWall('x', -2, 3, 7.6);
  glassWall('x', -2, 10.4, maxX - T / 2);

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

  const meetingSign = textPanel(2.6, 0.42, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,34,44,0.85)';
    roundRect(g, 0, 0, w, h, 40);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `600 ${h * 0.46}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MEETING ROOM', w / 2, h / 2 + 4);
  });
  meetingSign.mesh.position.set(9, 3.05, -1.94);
  root.add(meetingSign.mesh);
  const meetingSignBack = meetingSign.mesh.clone();
  meetingSignBack.rotation.y = Math.PI;
  meetingSignBack.position.z = -2.06;
  root.add(meetingSignBack);

  let roomCode = '';
  const welcome = textPanel(5, 1.6, (g, w, h) => {
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
  welcome.mesh.position.set(0, 2.1, maxZ - T / 2 - 0.02);
  welcome.mesh.rotation.y = Math.PI;
  root.add(welcome.mesh);

  // ---------- furniture helpers ----------
  const fabricBlue = M('fabricBlue', { color: '#3e4c63', roughness: 0.95 });
  const fabricTerracotta = M('fabricTerra', { color: '#c97a5b', roughness: 0.95 });
  const fabricCream = M('fabricCream', { color: '#ecd9bb', roughness: 0.95 });
  const fabricSage = M('fabricSage', { color: '#8aa88b', roughness: 0.95 });

  function addSeat(id, x, z, ry, opts = {}) {
    seats.set(id, { id, x, z, ry, y: opts.y ?? 0.5, type: opts.type || 'desk', typing: !!opts.typing });
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

  function plant(x, z, size = 1, potMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    const pm = potMat || M('pot', { color: '#ece6dc', roughness: 0.7 });
    cylinder(0.24 * size, 0.18 * size, 0.42 * size, pm, 0, 0.21 * size, 0, g);
    cylinder(0.22 * size, 0.22 * size, 0.02, M('soil', { color: '#4b3a2c' }), 0, 0.42 * size, 0, g);
    const lm = [M('leafA', { color: '#4f8a4b', roughness: 0.8, flatShading: true }), M('leafB', { color: '#6aa556', roughness: 0.8, flatShading: true })];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4;
      const r = 0.1 + (i % 3) * 0.07;
      const blob = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry((0.2 + (i % 2) * 0.06) * size, 0), lm[i % 2]));
      blob.position.set(Math.cos(a) * r * size, (0.62 + (i / n) * 0.55) * size, Math.sin(a) * r * size);
      blob.rotation.set(i, i * 2, 0);
      g.add(blob);
    }
    collideAround(x, z, 0.26 * size, 0.26 * size);
    return g;
  }

  // ---------- study area: two pods of 4 desks ----------
  const monitorMats = [0, 1, 2, 3].map((i) => new THREE.MeshBasicMaterial({ map: monitorTexture(i + 1), toneMapped: false }));
  const deskW = 1.4, deskD = 0.75, deskH = 0.75;
  let deskN = 0;
  const lampLights = [];
  for (const pc of [-11, -6]) {
    const pz = -6.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        deskN++;
        const id = `desk${deskN}`;
        const dx = pc + sx * (deskW / 2 + 0.01);
        const dz = pz + sz * (deskD / 2);
        const top = box(deskW, 0.05, deskD, oak, dx, deskH, dz, root, 0.015);
        for (const lx of [-1, 1]) {
          box(0.05, deskH - 0.03, deskD - 0.08, metal, dx + lx * (deskW / 2 - 0.06), (deskH - 0.03) / 2, dz, root, 0.01);
        }
        // facing: chair on the outer side (sz) looking back toward the pod center
        const facing = sz < 0 ? 0 : Math.PI; // sz<0: chair at more negative z looking +z
        const outer = sz;
        // monitor
        const mz = dz - outer * 0.18;
        const mon = new THREE.Group();
        mon.position.set(dx, deskH + 0.03, mz);
        mon.rotation.y = facing + Math.PI;
        root.add(mon);
        box(0.62, 0.38, 0.03, metal, 0, 0.36, 0, mon, 0.01);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), monitorMats[deskN % 4]);
        screen.position.set(0, 0.36, 0.017);
        mon.add(screen);
        box(0.05, 0.16, 0.04, metal, 0, 0.1, -0.03, mon, 0.01);
        box(0.22, 0.015, 0.16, metal, 0, 0.01, -0.02, mon, 0.005);
        // keyboard, mug, books
        const kb = box(0.42, 0.02, 0.13, M('kb', { color: '#e6e6ea', roughness: 0.5 }), dx, deskH + 0.035, dz + outer * 0.12, root, 0.008);
        kb.rotation.y = facing;
        const mugMat = M(`mug${deskN % 3}`, { color: ['#e86f51', '#f6c177', '#5b7cfa'][deskN % 3], roughness: 0.4 });
        cylinder(0.04, 0.04, 0.1, mugMat, dx + sx * 0.5, deskH + 0.075, dz + outer * 0.15, root, 14);
        if (deskN % 2) {
          const bookCols = ['#c0392b', '#2f4744', '#f6c177'];
          bookCols.forEach((c, i) => box(0.22, 0.04, 0.16, M(`book${i}`, { color: c, roughness: 0.7 }), dx - sx * 0.48, deskH + 0.045 + i * 0.042, dz + outer * 0.05, root, 0.008).rotation.y = i * 0.2);
        } else {
          const p = new THREE.Group();
          p.position.set(dx - sx * 0.5, deskH + 0.025, dz);
          root.add(p);
          cylinder(0.06, 0.05, 0.1, M('smallPot', { color: '#c46a4a' }), 0, 0.05, 0, p, 12);
          const l = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), M('leafA', { color: '#4f8a4b', roughness: 0.8, flatShading: true })));
          l.position.y = 0.16;
          p.add(l);
        }
        const chairZ = dz + outer * (deskD / 2 + 0.38);
        const chair = officeChair(dx, chairZ, facing);
        addSeat(id, dx, chairZ + outer * 0.02, facing, { y: 0.5, type: 'desk', typing: true });
        tag(top, [id]);
        chair.parts.forEach((p) => tag(p, [id]));
      }
    }
    // divider between back-to-back desks
    const div = box(deskW * 2 + 0.04, 0.4, 0.04, M('divider', { color: '#9fb6ad', roughness: 0.95 }), pc, deskH + 0.2, pz, root, 0.015);
    div.castShadow = true;
    collide(pc - deskW - 0.05, pc + deskW + 0.05, pz - deskD - 0.02, pz + deskD + 0.02);
    // desk lamp
    const lamp = new THREE.Group();
    lamp.position.set(pc, deskH + 0.4, pz);
    root.add(lamp);
    const shade = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 18, 1, true), M('lampShade', { color: '#f6c177', roughness: 0.5, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.3 })), true, false);
    shade.position.y = 0.32;
    lamp.add(shade);
    cylinder(0.012, 0.012, 0.32, metal, 0, 0.16, 0, lamp, 8);
    lampLights.push(new THREE.Vector3(pc, deskH + 0.7, pz));
  }
  plant(-14.1, -10.1, 1.3);
  plant(-2.8, -10.1, 1.1);
  plant(-14.1, -2.6, 1);

  // Pomodoro board on the west wall facing +x
  const boardFrame = box(0.08, 1.5, 2.8, M('boardFrame', { color: '#2a2c33', roughness: 0.4 }), minX + T / 2 + 0.04, 1.9, -6.5, root, 0.02);
  boardFrame.castShadow = false;
  const pomoBoard = textPanel(2.66, 1.36, () => {}, 300);
  pomoBoard.mesh.rotation.y = Math.PI / 2;
  pomoBoard.mesh.position.set(minX + T / 2 + 0.09, 1.9, -6.5);
  root.add(pomoBoard.mesh);

  // bookshelf behind study area (against the west wall near lounge)
  {
    const sx = minX + T / 2 + 0.22, sz = -0.5;
    const shelfG = new THREE.Group();
    shelfG.position.set(sx, 0, sz);
    root.add(shelfG);
    box(0.4, 2.0, 0.04, walnut, 0, 1.0, -1.0, shelfG, 0.01);
    box(0.4, 2.0, 0.04, walnut, 0, 1.0, 1.0, shelfG, 0.01);
    for (let i = 0; i < 5; i++) box(0.4, 0.04, 2.0, walnut, 0, 0.05 + i * 0.48, 0, shelfG, 0.01);
    const bookColors = ['#c0392b', '#2f4744', '#f6c177', '#5b7cfa', '#8aa88b', '#e86f51', '#3e4c63', '#ecd9bb'];
    for (let i = 0; i < 4; i++) {
      let z = -0.92;
      let k = i * 5;
      while (z < 0.85) {
        const t = 0.04 + ((k * 7) % 5) * 0.012;
        const h = 0.3 + ((k * 3) % 4) * 0.03;
        box(0.26, h, t, M(`bk${k % 8}`, { color: bookColors[k % 8], roughness: 0.8 }), 0.02, 0.07 + i * 0.48 + h / 2, z + t / 2, shelfG, 0.005);
        z += t + 0.006;
        k++;
        if (k % 9 === 0) z += 0.15;
      }
    }
    collide(minX, sx + 0.22, sz - 1.02, sz + 1.02);
  }

  // ---------- lounge ----------
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
    const cushionMat = fabricCream;
    const ids = [];
    for (let i = 0; i < seatsN; i++) {
      const cx = -((seatsN - 1) * 0.75) / 2 + i * 0.75;
      parts.push(box(0.72, 0.12, 0.66, mat, cx, 0.46, 0.08, g, 0.05));
      const pillow = box(0.42, 0.32, 0.12, cushionMat, cx + 0.05, 0.68, -0.2, g, 0.05);
      pillow.rotation.set(-0.25, 0.1 * (i - 1), 0.12 * (i % 2 ? 1 : -1));
      // world position of this seat
      const local = new THREE.Vector3(cx, 0, 0.05);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const id = `${idPrefix}${i + 1}`;
      addSeat(id, x + local.x, z + local.z, ry, { y: 0.52, type: 'couch' });
      ids.push(id);
    }
    box(w - 0.2, 0.06, 0.7, metal, 0, 0.05, 0, g, 0.02);
    parts.forEach((p) => tag(p, ids));
    // collider (axis-aligned bounds of rotated box)
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w / 2) * c + 0.45 * s, hd = (w / 2) * s + 0.45 * c;
    collideAround(x, z, hw - 0.05, hd - 0.05);
  }
  couch(-9, 8.7, Math.PI, 3, fabricTerracotta, 'sofaA');
  couch(-12.6, 5.6, Math.PI / 2, 2, fabricSage, 'sofaB');
  // armchair
  couch(-5.2, 5.8, -Math.PI / 2, 1, fabricBlue, 'arm');
  // coffee table
  {
    const t = box(1.6, 0.06, 0.9, oak, -8.7, 0.42, 6, root, 0.03);
    t.receiveShadow = true;
    for (const [lx, lz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) cylinder(0.025, 0.02, 0.4, walnut, -8.7 + lx, 0.2, 6 + lz, root, 8);
    box(1.4, 0.03, 0.75, walnut, -8.7, 0.12, 6, root, 0.01);
    cylinder(0.05, 0.04, 0.1, M('mug0', {}), -8.3, 0.5, 5.9, root, 14);
    box(0.3, 0.03, 0.22, M('book0', {}), -9.1, 0.465, 6.1, root, 0.005).rotation.y = 0.3;
    box(0.28, 0.03, 0.2, M('book1', {}), -9.1, 0.495, 6.1, root, 0.005).rotation.y = 0.1;
    collideAround(-8.7, 6, 0.85, 0.5);
  }
  // floor lamp
  {
    const fx = -13.9, fz = 9.8;
    cylinder(0.2, 0.22, 0.04, metal, fx, 0.02, fz, root);
    cylinder(0.02, 0.02, 1.6, metal, fx, 0.82, fz, root, 8);
    const shade = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.36, 24, 1, true), M('floorShade', { color: '#f8ecd8', side: THREE.DoubleSide, emissive: '#ffd59a', emissiveIntensity: 0.5, roughness: 0.9 })), false, false);
    shade.position.set(fx, 1.72, fz);
    root.add(shade);
    lampLights.push(new THREE.Vector3(fx, 1.6, fz));
    collideAround(fx, fz, 0.25, 0.25);
  }
  plant(-14.1, 1.2, 1.2, M('potTerra', { color: '#c46a4a' }));
  plant(-3.4, 10.1, 1.4);
  plant(-6.3, 9.9, 0.9, M('potTerra', {}));

  // ---------- meeting room ----------
  // screen with bezel
  const bezel = box(SCREEN.w + 0.16, SCREEN.h + 0.16, 0.06, M('bezel', { color: '#15161b', roughness: 0.3, metalness: 0.4 }), SCREEN.x, SCREEN.y, minZ + T / 2 + 0.04, root, 0.02);
  bezel.castShadow = false;
  const screenBack = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ color: '#050608', toneMapped: false }));
  screenBack.position.set(SCREEN.x, SCREEN.y, SCREEN.z - 0.005);
  root.add(screenBack);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat);
  screenMesh.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
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

  // presenter lectern
  {
    const lx = 5.0, lz = -9.4;
    box(0.6, 1.05, 0.45, walnut, lx, 0.525, lz, root, 0.03);
    const t = box(0.7, 0.05, 0.5, oak, lx, 1.07, lz + 0.03, root, 0.02);
    t.rotation.x = 0.12;
    collideAround(lx, lz, 0.32, 0.25);
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: '#f6c177', transparent: true, opacity: 0.8 }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(lx + 0.05, 0.012, lz + 0.85);
    root.add(mark);
  }
  // audience: 3 rows x 4 chairs, facing the screen (-z)
  const meetingSeatIds = [];
  {
    const rows = [-7.1, -5.7, -4.3];
    const cols = [6.6, 8.2, 9.8, 11.4];
    let n = 0;
    rows.forEach((rz, ri) => {
      cols.forEach((cx) => {
        n++;
        const id = `meet${n}`;
        const g = new THREE.Group();
        g.position.set(cx, 0, rz);
        g.rotation.y = Math.PI;
        root.add(g);
        const mat = ri === 0 ? fabricTerracotta : fabricBlue;
        const parts = [
          box(0.5, 0.08, 0.48, mat, 0, 0.46, 0.02, g, 0.03),
          box(0.5, 0.48, 0.06, mat, 0, 0.78, -0.24, g, 0.03),
        ];
        for (const [lx, lz] of [[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.2], [0.21, 0.2]]) cylinder(0.018, 0.018, 0.44, metal, lx, 0.22, lz, g, 8);
        parts.forEach((p) => tag(p, [id]));
        addSeat(id, cx, rz - 0.02, Math.PI, { y: 0.5, type: 'meeting' });
        meetingSeatIds.push(id);
      });
    });
  }
  plant(14.1, -10.1, 1.3);
  plant(3.7, -10.1, 1.0);
  plant(14.1, -2.7, 1.0, M('potTerra', {}));
  // small side table in meeting room
  box(1.2, 0.06, 0.5, oak, 13.8, 0.75, -6, root, 0.02);
  for (const s of [-1, 1]) box(0.05, 0.72, 0.45, metal, 13.8 + s * 0.55, 0.36, -6, root, 0.01);
  collideAround(13.8, -6, 0.62, 0.28);

  // ---------- café / kitchenette ----------
  {
    const cx = maxX - T / 2 - 0.38;
    box(0.75, 0.9, 6, M('cabinet', { color: '#2f4744', roughness: 0.6 }), cx, 0.45, 6.2, root, 0.02);
    box(0.8, 0.05, 6.05, M('counterTop', { color: '#efe9df', roughness: 0.3 }), cx - 0.02, 0.925, 6.2, root, 0.01);
    collide(cx - 0.42, maxX, 3.15, 9.25);
    // coffee machine
    box(0.4, 0.45, 0.35, metal, cx, 1.18, 4.0, root, 0.04);
    box(0.3, 0.1, 0.05, M('cm', { color: '#e86f51', emissive: '#e86f51', emissiveIntensity: 0.4 }), cx - 0.18, 1.28, 4.0, root, 0.01).rotation.y = Math.PI / 2;
    // fruit bowl
    cylinder(0.18, 0.1, 0.08, white, cx, 0.99, 6.2, root, 18);
    for (let i = 0; i < 5; i++) {
      const f = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M(`fruit${i % 3}`, { color: ['#e86f51', '#f6c177', '#9ece6a'][i % 3], roughness: 0.5 })));
      f.position.set(cx + Math.cos(i * 1.3) * 0.08, 1.05 + (i % 2) * 0.03, 6.2 + Math.sin(i * 1.3) * 0.08);
      root.add(f);
    }
    // fridge
    box(0.8, 2.0, 0.8, M('fridge', { color: '#dfe3e8', roughness: 0.35, metalness: 0.3 }), cx, 1.0, 9.9, root, 0.04);
    box(0.03, 0.6, 0.04, metal, cx - 0.42, 1.3, 9.6, root, 0.01);
    collide(cx - 0.42, maxX, 9.45, maxZ);
    // high table + stools
    const tx = 10, tz = 6.4;
    cylinder(0.7, 0.7, 0.05, oak, tx, 1.05, tz, root, 32);
    cylinder(0.05, 0.05, 1.0, metal, tx, 0.52, tz, root, 10);
    cylinder(0.35, 0.35, 0.03, metal, tx, 0.015, tz, root, 24);
    collideAround(tx, tz, 0.55, 0.55);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const sx = tx + Math.cos(a) * 1.0, sz = tz + Math.sin(a) * 1.0;
      cylinder(0.2, 0.2, 0.06, fabricTerracotta, sx, 0.75, sz, root, 20);
      cylinder(0.025, 0.025, 0.72, metal, sx, 0.37, sz, root, 8);
      cylinder(0.18, 0.18, 0.02, metal, sx, 0.01, sz, root, 16);
    }
    lampLights.push(new THREE.Vector3(tx, 2.6, tz));
    // pendant over the table
    cylinder(0.005, 0.005, 1.0, metal, tx, 3.1, tz, root, 4);
    const pend = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('pend', { color: '#2f4744', side: THREE.DoubleSide, roughness: 0.4 })), false, false);
    pend.position.set(tx, 2.6, tz);
    root.add(pend);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1d0', toneMapped: false }));
    bulb.position.set(tx, 2.55, tz);
    root.add(bulb);
  }
  plant(4.3, 10.1, 1.2, M('potTerra', {}));
  plant(14.1, -1.2, 1.1);

  // ---------- central area ----------
  // low bench + planter separating zones
  {
    box(2.6, 0.45, 0.5, walnut, -0.5, 0.225, -6.5, root, 0.04);
    box(2.6, 0.06, 0.52, oak, -0.5, 0.48, -6.5, root, 0.02);
    collideAround(-0.5, -6.5, 1.3, 0.25);
    plant(-0.5, -8.6, 1.2);
    addSeat('bench1', -1.1, -6.45, Math.PI / 2 + Math.PI / 2, { y: 0.5, type: 'couch' });
    addSeat('bench2', 0.1, -6.45, 0, { y: 0.5, type: 'couch' });
  }
  // round rug at spawn
  const spawnRug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshStandardMaterial({ color: '#e8c9a0', roughness: 1 }));
  spawnRug.rotation.x = -Math.PI / 2;
  spawnRug.position.set(SPAWN.x, 0.006, SPAWN.z);
  spawnRug.receiveShadow = true;
  root.add(spawnRug);
  const spawnRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.45, 64), new THREE.MeshBasicMaterial({ color: '#c97a5b' }));
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.set(SPAWN.x, 0.008, SPAWN.z);
  root.add(spawnRing);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight('#fff6ea', '#8d7a66', 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe6c7', 2.6);
  sun.position.set(12, 22, 14);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -20; sc.right = 20; sc.top = 16; sc.bottom = -16; sc.near = 2; sc.far = 70;
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
  meetLight.position.set(9, 3.2, -5);
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
