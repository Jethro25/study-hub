// Billboarded webcam panels, name labels and floating emoji.
import * as THREE from 'three';
import { makeCanvas, roundRect } from './office.js';

const PANEL_W = 0.78, PANEL_H = 0.585;

const panelVertex = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const panelFragment = /* glsl */`
  uniform sampler2D map;
  uniform vec2 uvScale;
  uniform vec2 uvOffset;
  uniform float mirror;
  uniform float aspect;
  uniform float radius;
  uniform float border;
  uniform vec3 borderColor;
  uniform float opacity;
  varying vec2 vUv;
  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    float d = sdRoundRect(p, vec2(aspect * 0.5, 0.5), radius);
    float aa = max(fwidth(d), 0.002);
    float alpha = 1.0 - smoothstep(-aa, aa, d);
    vec2 uv = vUv;
    if (mirror > 0.5) uv.x = 1.0 - uv.x;
    uv = uv * uvScale + uvOffset;
    vec4 tex = texture2D(map, uv);
    float ring = smoothstep(-border - aa, -border + aa, d);
    vec3 col = mix(tex.rgb, borderColor, ring);
    gl_FragColor = vec4(col, alpha * opacity);
    #include <colorspace_fragment>
  }
`;

function initialsOf(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2);
  return s.toUpperCase();
}

export function createVideoPanel() {
  const initialsCanvas = makeCanvas(256, 192);
  const initialsTex = new THREE.CanvasTexture(initialsCanvas);
  initialsTex.colorSpace = THREE.SRGBColorSpace;

  const uniforms = {
    map: { value: initialsTex },
    uvScale: { value: new THREE.Vector2(1, 1) },
    uvOffset: { value: new THREE.Vector2(0, 0) },
    mirror: { value: 0 },
    aspect: { value: PANEL_W / PANEL_H },
    radius: { value: 0.12 },
    border: { value: 0.025 },
    borderColor: { value: new THREE.Color('#ffffff') },
    opacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: panelVertex, fragmentShader: panelFragment, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), mat);
  mesh.renderOrder = 5;

  let videoTex = null;
  let videoEl = null;
  let showingVideo = false;
  let wantMirror = 0;
  const idle = new THREE.Color('#ffffff');
  const speakingCol = new THREE.Color('#3ddc84');
  const presenterCol = new THREE.Color('#f6c177');

  const api = {
    mesh,
    setInitials(name, color = '#5b7cfa') {
      const g = initialsCanvas.getContext('2d');
      const w = initialsCanvas.width, h = initialsCanvas.height;
      const c = new THREE.Color(color);
      const c2 = c.clone().offsetHSL(0.06, 0, -0.15);
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#' + c.getHexString());
      grad.addColorStop(1, '#' + c2.getHexString());
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath(); g.arc(w / 2, h / 2, h * 0.36, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.font = `700 ${h * 0.32}px Inter, "Segoe UI", system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(initialsOf(name), w / 2, h / 2 + 4);
      initialsTex.needsUpdate = true;
    },
    setVideo(el, mirror = false) {
      if (el !== videoEl) {
        videoTex?.dispose();
        videoTex = el ? new THREE.VideoTexture(el) : null;
        if (videoTex) videoTex.colorSpace = THREE.SRGBColorSpace;
        videoEl = el;
      }
      wantMirror = mirror ? 1 : 0;
      uniforms.mirror.value = showingVideo ? wantMirror : 0;
    },
    /** call every frame */
    update(camera, wantVideo, speaking, presenter) {
      mesh.quaternion.copy(camera.quaternion);
      const ok = wantVideo && videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0;
      if (ok) {
        if (!showingVideo) { uniforms.map.value = videoTex; showingVideo = true; uniforms.mirror.value = wantMirror; }
        // cover-fit the video into the panel
        const va = videoEl.videoWidth / videoEl.videoHeight, pa = PANEL_W / PANEL_H;
        if (va > pa) { uniforms.uvScale.value.set(pa / va, 1); uniforms.uvOffset.value.set((1 - pa / va) / 2, 0); }
        else { uniforms.uvScale.value.set(1, va / pa); uniforms.uvOffset.value.set(0, (1 - va / pa) / 2); }
      } else if (showingVideo || uniforms.map.value !== initialsTex) {
        uniforms.map.value = initialsTex;
        uniforms.uvScale.value.set(1, 1);
        uniforms.uvOffset.value.set(0, 0);
        uniforms.mirror.value = 0; // initials are never mirrored
        showingVideo = false;
      }
      const target = speaking ? speakingCol : presenter ? presenterCol : idle;
      uniforms.borderColor.value.lerp(target, 0.25);
      uniforms.border.value += ((speaking ? 0.035 : 0.022) - uniforms.border.value) * 0.25;
    },
    dispose() {
      videoTex?.dispose();
      initialsTex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
      mesh.removeFromParent();
    },
  };
  return api;
}

const STATUS_COLORS = {
  Available: '#3ddc84', Studying: '#5b7cfa', 'On break': '#f6c177', Presenting: '#ff7a59', Busy: '#e5484d', Away: '#9aa0a6',
};
export const STATUSES = Object.keys(STATUS_COLORS);
export const statusColor = (s) => STATUS_COLORS[s] || '#9aa0a6';

export const ROLE_EMOJI = {
  Manager: '👔', 'Team Lead': '⭐', Employee: '💼', Intern: '🌱', HR: '🤝', Designer: '🎨',
  Developer: '💻', Secretary: '🗂️', Student: '📚', Teacher: '🍎', Guest: '👋',
};
export const ROLES = Object.keys(ROLE_EMOJI);

export function createNameLabel() {
  const canvas = makeCanvas(640, 160);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.28, 0.32, 1);
  sprite.renderOrder = 6;
  sprite.center.set(0.5, 0);
  let last = '';
  return {
    sprite,
    set({ name, status, mic, isLocal, presenter, role }) {
      const key = JSON.stringify([name, status, mic, isLocal, presenter, role]);
      if (role) status = `${ROLE_EMOJI[role] || ''} ${role} · ${status}`.trim();
      if (key === last) return;
      last = key;
      const g = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      g.clearRect(0, 0, W, H);
      g.font = '700 54px Inter, "Segoe UI", system-ui, sans-serif';
      const label = (presenter ? '🎤 ' : '') + name + (isLocal ? ' (you)' : '');
      const nameW = Math.min(g.measureText(label).width, 470);
      g.font = '600 34px Inter, "Segoe UI", system-ui, sans-serif';
      const stW = g.measureText(status).width;
      const micW = mic ? 0 : 52;
      const pillW = Math.min(W - 8, Math.max(nameW, stW + 36) + micW + 56);
      const x0 = (W - pillW) / 2;
      g.fillStyle = 'rgba(17,20,28,0.78)';
      roundRect(g, x0, 6, pillW, H - 12, 34);
      g.fill();
      g.fillStyle = '#fff';
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.font = '700 54px Inter, "Segoe UI", system-ui, sans-serif';
      const tx = x0 + 28;
      g.save();
      g.beginPath(); g.rect(tx, 0, pillW - 56 - micW, H); g.clip();
      g.fillText(label, tx, 58);
      g.restore();
      g.fillStyle = statusColor(status);
      g.beginPath(); g.arc(tx + 11, 116, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.78)';
      g.font = '600 34px Inter, "Segoe UI", system-ui, sans-serif';
      g.fillText(status, tx + 32, 117);
      if (!mic) {
        // muted mic icon
        const mx = x0 + pillW - 50, my = 80;
        g.fillStyle = '#ff6b6b';
        g.beginPath(); g.arc(mx, my, 22, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round';
        roundRect(g, mx - 6, my - 14, 12, 20, 6); g.stroke();
        g.beginPath(); g.moveTo(mx - 13, my + 13); g.lineTo(mx + 13, my - 13); g.stroke();
      }
      tex.needsUpdate = true;
    },
    dispose() { tex.dispose(); mat.dispose(); sprite.removeFromParent(); },
  };
}

const emojiTex = new Map();
function emojiTexture(e) {
  if (!emojiTex.has(e)) {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    g.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(e, 64, 72);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    emojiTex.set(e, t);
  }
  return emojiTex.get(e);
}

/** Floating emoji system. */
export function createEmojiLayer(scene) {
  const live = [];
  return {
    spawn(emoji, origin) {
      const mat = new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.renderOrder = 8;
      s.position.copy(origin);
      s.position.x += (Math.random() - 0.5) * 0.4;
      s.scale.setScalar(0.01);
      scene.add(s);
      live.push({ s, t: 0, drift: (Math.random() - 0.5) * 0.5, origin: s.position.clone() });
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.t += dt;
        const k = p.t / 2.2;
        const pop = Math.min(1, p.t / 0.18);
        const size = 0.55 * (pop < 1 ? pop * 1.25 : 1 + Math.sin(p.t * 6) * 0.04);
        p.s.scale.setScalar(size);
        p.s.position.set(p.origin.x + Math.sin(p.t * 3) * 0.12 + p.drift * k, p.origin.y + k * 1.6, p.origin.z);
        p.s.material.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
        if (k >= 1) { p.s.removeFromParent(); p.s.material.dispose(); live.splice(i, 1); }
      }
    },
  };
}
