// Bubbles above an avatar's head: thinking dots, a light bulb, Zzz, speech bubbles and question cards.
import * as THREE from 'three';
import { makeCanvas, roundRect } from './office.js';

const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

function wrap(g, text, maxW, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (g.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

export function createBubble() {
  const canvas = makeCanvas(640, 400);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 7;
  sprite.visible = false;
  sprite.userData.isBubble = true;
  let kind = null, data = null, key = '', t = 0, lastDraw = 0;
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function cloud(x, y, w, h, fill) {
    g.fillStyle = fill;
    const bumps = 7;
    g.beginPath();
    for (let i = 0; i < bumps; i++) {
      const a = (i / bumps) * Math.PI * 2;
      g.moveTo(x + w / 2 + Math.cos(a) * w * 0.36 + h * 0.3, y + h / 2 + Math.sin(a) * h * 0.3);
      g.arc(x + w / 2 + Math.cos(a) * w * 0.36, y + h / 2 + Math.sin(a) * h * 0.3, h * 0.3, 0, Math.PI * 2);
    }
    g.fill();
    g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.4, h * 0.36, 0, 0, Math.PI * 2); g.fill();
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    if (kind === 'think') {
      // thought cloud with "loading" dots
      cloud(150, 70, 340, 210, 'rgba(255,255,255,0.96)');
      g.fillStyle = 'rgba(255,255,255,0.96)';
      g.beginPath(); g.arc(300, 318, 20, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(318, 368, 11, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t * 3 - i * 0.35) % 1.4;
        const up = ph < 0.7 ? Math.sin((ph / 0.7) * Math.PI) : 0;
        g.fillStyle = up > 0.1 ? '#5b7cfa' : '#9aa6c7';
        g.beginPath(); g.arc(250 + i * 70, 178 - up * 26, 22, 0, Math.PI * 2); g.fill();
      }
      return;
    }
    if (kind === 'idea') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      const grd = g.createRadialGradient(320, 170, 10, 320, 170, 170);
      grd.addColorStop(0, `rgba(255,236,140,${0.75 + 0.2 * pulse})`);
      grd.addColorStop(1, 'rgba(255,236,140,0)');
      g.fillStyle = grd;
      g.fillRect(120, 0, 400, 360);
      g.strokeStyle = `rgba(255,214,80,${0.6 + 0.4 * pulse})`;
      g.lineWidth = 12; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const r0 = 118 + pulse * 6, r1 = 150 + pulse * 14;
        g.beginPath(); g.moveTo(320 + Math.cos(a) * r0, 170 + Math.sin(a) * r0); g.lineTo(320 + Math.cos(a) * r1, 170 + Math.sin(a) * r1); g.stroke();
      }
      g.font = `170px ${EMOJI_FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('💡', 320, 180);
      return;
    }
    if (kind === 'sleep') {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + i / 3) % 1;
        g.globalAlpha = Math.sin(ph * Math.PI);
        g.fillStyle = '#cfe0ff';
        g.font = `800 ${60 + ph * 70}px ${FONT}`;
        g.fillText('Z', 260 + ph * 140 + Math.sin(ph * 6) * 15, 340 - ph * 300);
      }
      g.globalAlpha = 1;
      return;
    }
    if (kind === 'say') {
      g.font = `600 44px ${FONT}`;
      const lines = wrap(g, data.text, 540, 4);
      const lw = Math.max(...lines.map((l) => g.measureText(l).width));
      const bw = Math.min(600, lw + 60), bh = lines.length * 54 + 40;
      const x = (W - bw) / 2, y = H - bh - 40;
      g.fillStyle = 'rgba(255,255,255,0.97)';
      roundRect(g, x, y, bw, bh, 30); g.fill();
      g.beginPath(); g.moveTo(W / 2 - 22, y + bh - 2); g.lineTo(W / 2, H - 6); g.lineTo(W / 2 + 22, y + bh - 2); g.fill();
      g.fillStyle = '#1d2233';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((l, i) => g.fillText(l, W / 2, y + 47 + i * 54));
      return;
    }
    if (kind === 'ask') {
      // question card: the question plus lettered options with live vote counts
      const { q, options, counts = [], mine } = data;
      g.font = `700 40px ${FONT}`;
      const qLines = wrap(g, '❓ ' + q, 560, 2);
      const rows = options.length;
      const bh = 34 + qLines.length * 48 + rows * 52 + 26;
      const y = H - bh - 36;
      g.fillStyle = 'rgba(28,32,48,0.95)';
      roundRect(g, 20, y, W - 40, bh, 30); g.fill();
      g.strokeStyle = '#f6c177'; g.lineWidth = 5; roundRect(g, 20, y, W - 40, bh, 30); g.stroke();
      g.fillStyle = 'rgba(28,32,48,0.95)';
      g.beginPath(); g.moveTo(W / 2 - 22, y + bh - 2); g.lineTo(W / 2, H - 4); g.lineTo(W / 2 + 22, y + bh - 2); g.fill();
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#fff';
      qLines.forEach((l, i) => g.fillText(l, 48, y + 42 + i * 48));
      const total = counts.reduce((s, n) => s + n, 0) || 1;
      g.font = `600 34px ${FONT}`;
      options.forEach((o, i) => {
        const ry = y + 34 + qLines.length * 48 + i * 52;
        const frac = (counts[i] || 0) / total;
        g.fillStyle = 'rgba(255,255,255,0.08)';
        roundRect(g, 44, ry - 2, W - 88, 44, 12); g.fill();
        if (counts[i]) { g.fillStyle = i === mine ? 'rgba(61,220,132,0.45)' : 'rgba(91,124,250,0.45)'; roundRect(g, 44, ry - 2, Math.max(24, (W - 88) * frac), 44, 12); g.fill(); }
        g.fillStyle = '#f6c177';
        g.fillText(String.fromCharCode(65 + i), 60, ry + 20);
        g.fillStyle = '#fff';
        const label = wrap(g, o, W - 230, 1)[0] || '';
        g.fillText(label, 100, ry + 20);
        g.textAlign = 'right';
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.fillText(String(counts[i] || 0), W - 60, ry + 20);
        g.textAlign = 'left';
      });
    }
  }

  const SIZES = { think: 0.9, idea: 0.85, sleep: 0.8, say: 1.55, ask: 1.75 };
  return {
    sprite,
    get kind() { return kind; },
    /** kind: null | 'think' | 'idea' | 'sleep' | 'say' | 'ask' */
    set(k, d = null) {
      const nk = k ? k + JSON.stringify(d) : '';
      if (nk === key) return;
      key = nk; kind = k; data = d; t = 0;
      sprite.visible = !!k;
      if (!k) return;
      const s = SIZES[k];
      sprite.scale.set(s, s * (H / W), 1);
      draw();
      tex.needsUpdate = true;
    },
    update(dt) {
      if (!kind) return;
      t += dt;
      if (kind === 'think' || kind === 'idea' || kind === 'sleep') {
        if (t - lastDraw > 0.06 || t < lastDraw) { lastDraw = t; draw(); tex.needsUpdate = true; }
      }
    },
    dispose() { tex.dispose(); mat.dispose(); sprite.removeFromParent(); },
  };
}
