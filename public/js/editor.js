// "Edit Avatar" modal: live, rotating 3D preview + controls generated from AVATAR_SCHEMA.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AVATAR_SCHEMA, DEFAULT_AVATAR, buildAvatar, animateAvatar, normalizeAvatar, randomAvatar } from './avatar.js';

const $ = (sel, el = document) => el.querySelector(sel);
const LABELS = { tshirt: 'T-shirt' };
const pretty = (s) => LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1);

let preview = null; // lazily created renderer + scene

function ensurePreview(canvas) {
  if (preview) return preview;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.25, 5.2);
  camera.lookAt(0, 1.0, 0);
  scene.add(new THREE.HemisphereLight('#fff5e8', '#7d6b5a', 1.2));
  const key = new THREE.DirectionalLight('#ffe9cf', 2.2);
  key.position.set(2.5, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#bcd4ff', 1.2);
  rim.position.set(-3, 2, -3);
  scene.add(rim);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.1, 48), new THREE.MeshStandardMaterial({ color: '#ece6dc', roughness: 0.6 }));
  ped.position.y = -0.05;
  ped.receiveShadow = true;
  scene.add(ped);
  const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(0.84, 48), new THREE.ShadowMaterial({ opacity: 0.25 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.002;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);
  const turntable = new THREE.Group();
  scene.add(turntable);
  preview = { renderer, scene, camera, turntable, avatar: null, running: false, yaw: 0.5, vel: 0, dragging: false };
  return preview;
}

function setPreviewAvatar(cfg) {
  if (!preview) return;
  preview.avatar?.dispose();
  const av = buildAvatar(cfg);
  preview.turntable.add(av.root);
  preview.avatar = av;
}

/** Render a static thumbnail (data URL) of an avatar, used in the lobby. */
export function avatarThumbnail(cfg, canvas) {
  const p = ensurePreview(canvas);
  const prevAv = p.avatar;
  const tmp = buildAvatar(cfg);
  if (prevAv) prevAv.root.visible = false;
  p.turntable.add(tmp.root);
  p.turntable.rotation.y = 0.45;
  animateAvatar(tmp, 0.016, { speed: 0, sitting: false });
  const size = new THREE.Vector2();
  p.renderer.getSize(size);
  p.renderer.setSize(320, 360, false);
  p.camera.aspect = 320 / 360;
  p.camera.position.set(0, 1.35, 4.3);
  p.camera.lookAt(0, 1.08, 0);
  p.camera.updateProjectionMatrix();
  p.renderer.render(p.scene, p.camera);
  const url = p.renderer.domElement.toDataURL('image/png');
  tmp.dispose();
  if (prevAv) prevAv.root.visible = true;
  return url;
}

export function createEditor({ root }) {
  root.innerHTML = `
    <div class="modal-card editor-card" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
      <div class="editor-preview">
        <canvas id="editorCanvas"></canvas>
        <div class="editor-preview-hint">Drag to rotate</div>
        <div class="editor-preview-actions">
          <button class="btn ghost" data-act="random" title="Randomize everything">🎲 Randomize</button>
          <button class="btn ghost" data-act="reset" title="Back to the default look">↺ Reset</button>
        </div>
      </div>
      <div class="editor-side">
        <div class="editor-head">
          <h2 id="editorTitle">Edit Avatar</h2>
          <button class="icon-btn" data-act="cancel" aria-label="Close">✕</button>
        </div>
        <div class="editor-tabs" role="tablist"></div>
        <div class="editor-fields"></div>
        <div class="editor-foot">
          <button class="btn ghost" data-act="cancel">Cancel</button>
          <button class="btn primary" data-act="save">Save avatar</button>
        </div>
      </div>
    </div>`;
  const canvas = $('#editorCanvas', root);
  const tabs = $('.editor-tabs', root);
  const fieldsEl = $('.editor-fields', root);
  let cfg = { ...DEFAULT_AVATAR };
  let original = cfg;
  let onSave = null;
  let activeSection = AVATAR_SCHEMA[0].section;
  let rebuildQueued = false;

  AVATAR_SCHEMA.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.textContent = s.section;
    b.setAttribute('role', 'tab');
    b.onclick = () => { activeSection = s.section; renderFields(); };
    tabs.appendChild(b);
  });

  function queueRebuild() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(() => { rebuildQueued = false; setPreviewAvatar(cfg); });
  }

  function set(key, value) {
    cfg = { ...cfg, [key]: value };
    queueRebuild();
  }

  function renderFields() {
    [...tabs.children].forEach((b) => b.classList.toggle('active', b.textContent === activeSection));
    const section = AVATAR_SCHEMA.find((s) => s.section === activeSection);
    fieldsEl.innerHTML = '';
    for (const f of section.fields) {
      const row = document.createElement('div');
      row.className = 'field';
      const label = document.createElement('label');
      label.textContent = f.label;
      row.appendChild(label);
      const ctl = document.createElement('div');
      ctl.className = 'field-ctl';
      if (f.type === 'choice') {
        ctl.classList.add('chips');
        for (const o of f.options) {
          const b = document.createElement('button');
          b.className = 'chip' + (cfg[f.key] === o ? ' active' : '');
          b.textContent = (f.labels && f.labels[o]) || pretty(o);
          b.onclick = () => { set(f.key, o); renderFields(); };
          ctl.appendChild(b);
        }
      } else if (f.type === 'swatch') {
        ctl.classList.add('swatches');
        for (const o of f.options) {
          const b = document.createElement('button');
          b.className = 'swatch' + (cfg[f.key] === o ? ' active' : '');
          b.style.background = o;
          b.title = o;
          b.onclick = () => { set(f.key, o); renderFields(); };
          ctl.appendChild(b);
        }
        const pick = document.createElement('input');
        pick.type = 'color';
        pick.value = cfg[f.key];
        pick.title = 'Custom';
        pick.oninput = () => set(f.key, pick.value);
        ctl.appendChild(pick);
      } else if (f.type === 'color') {
        ctl.classList.add('swatches');
        const pick = document.createElement('input');
        pick.type = 'color';
        pick.value = cfg[f.key];
        pick.oninput = () => set(f.key, pick.value);
        if (f.presets) {
          for (const o of f.presets) {
            const b = document.createElement('button');
            b.className = 'swatch' + (cfg[f.key] === o ? ' active' : '');
            b.style.background = o;
            b.onclick = () => { set(f.key, o); renderFields(); };
            ctl.appendChild(b);
          }
        }
        ctl.appendChild(pick);
      } else if (f.type === 'range') {
        const r = document.createElement('input');
        r.type = 'range';
        r.min = f.min; r.max = f.max; r.step = f.step;
        r.value = cfg[f.key];
        const out = document.createElement('span');
        out.className = 'range-out';
        const fmt = (v) => `${Math.round(v * 100)}%`;
        out.textContent = fmt(cfg[f.key]);
        r.oninput = () => { set(f.key, Number(r.value)); out.textContent = fmt(r.value); };
        ctl.append(r, out);
      } else if (f.type === 'toggle') {
        const t = document.createElement('button');
        t.className = 'switch' + (cfg[f.key] ? ' on' : '');
        t.setAttribute('role', 'switch');
        t.setAttribute('aria-checked', String(!!cfg[f.key]));
        t.innerHTML = '<span></span>';
        t.onclick = () => { set(f.key, !cfg[f.key]); renderFields(); };
        ctl.appendChild(t);
      }
      row.appendChild(ctl);
      fieldsEl.appendChild(row);
    }
  }

  // drag-to-rotate
  let lastX = 0;
  canvas.addEventListener('pointerdown', (e) => { preview.dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!preview?.dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    preview.yaw += dx * 0.012;
    preview.vel = dx * 0.012;
  });
  const endDrag = () => { if (preview) preview.dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    preview.renderer.setSize(r.width, r.height, false);
    preview.camera.aspect = r.width / r.height;
    preview.camera.position.set(0, 1.25, 5.2);
    preview.camera.lookAt(0, 1.0, 0);
    preview.camera.updateProjectionMatrix();
  }

  let lastT = 0;
  function loop(t) {
    if (!preview.running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!preview.dragging) {
      preview.vel *= 0.93;
      preview.yaw += preview.vel + dt * 0.35;
    }
    preview.turntable.rotation.y = preview.yaw;
    if (preview.avatar) animateAvatar(preview.avatar, dt, { speed: 0, sitting: false });
    preview.renderer.render(preview.scene, preview.camera);
    requestAnimationFrame(loop);
  }

  function close(save) {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    if (preview) preview.running = false;
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
    if (save) onSave?.(normalizeAvatar(cfg));
  }
  const onKey = (e) => { if (e.key === 'Escape') close(false); };

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (e.target === root) return close(false);
    if (act === 'cancel') close(false);
    else if (act === 'save') close(true);
    else if (act === 'random') { cfg = randomAvatar(); queueRebuild(); renderFields(); }
    else if (act === 'reset') { cfg = { ...DEFAULT_AVATAR }; queueRebuild(); renderFields(); }
  });

  return {
    open(initial, saveCb) {
      original = normalizeAvatar(initial);
      cfg = { ...original };
      onSave = saveCb;
      root.classList.add('open');
      root.setAttribute('aria-hidden', 'false');
      ensurePreview(canvas);
      resize();
      setPreviewAvatar(cfg);
      renderFields();
      preview.running = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
      window.addEventListener('keydown', onKey);
    },
    get isOpen() { return root.classList.contains('open'); },
  };
}
