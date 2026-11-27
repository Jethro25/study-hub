// Study Hub — main client
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildOffice, resolveCollisions, SPAWN, SCREEN, BOUNDS } from './office.js';
import { buildAvatar, animateAvatar, normalizeAvatar, randomAvatar } from './avatar.js';
import { createVideoPanel, createNameLabel, createEmojiLayer, STATUSES, statusColor } from './labels.js';
import { createEditor, avatarThumbnail } from './editor.js';
import { RTCMesh } from './rtc.js';
import { filesToSlides, chime } from './slides.js';

// ====================================================================
// helpers
// ====================================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('studyhub.' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('studyhub.' + key, JSON.stringify(value)); } catch { /* private mode / quota */ }
  },
};

function toast(text, kind = '', ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, ms);
  return el;
}

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICONS = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  micOff: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18"/>'),
  cam: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>'),
  camOff: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3zM3 3l18 18"/>'),
  screen: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M9 10l3-3 3 3M12 7v6"/>'),
  present: svg('<path d="M3 4h18M5 4v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4M12 15v5M8.5 20h7"/><path d="M9 9.5l2 2 4-4"/>'),
  react: svg('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
  avatar: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  people: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
  leave: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>'),
  stand: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
};
const setIcon = (btn, name) => { const ic = btn.querySelector('.ic') || btn; ic.innerHTML = ICONS[name]; };

// ====================================================================
// renderer / scene
// ====================================================================
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(22, 16, 20);
camera.lookAt(0, 0, 0);

const office = buildOffice(scene, renderer);
const emojis = createEmojiLayer(scene);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ====================================================================
// app state
// ====================================================================
const state = {
  phase: 'lobby', // lobby | joining | room
  selfId: null,
  code: null,
  presenterId: null,
  presenterBroadcast: true,
  screenStreamId: null,
  slides: [],
  slideIndex: 0,
  pomo: null,
  pomoOffset: 0,
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
  maxPlayers: 8,
  unread: 0,
  sideTab: 'chat',
  sideOpen: false,
  statusBeforePresent: 'Available',
  autoStatus: false,
};

/** @type {Map<string, any>} */
const players = new Map();
let local = null; // local player object

let avatarCfg = normalizeAvatar(store.get('avatar', null) || randomAvatar());
store.set('avatar', avatarCfg);

fetch('/config').then((r) => r.json()).then((c) => {
  if (Array.isArray(c.iceServers)) state.iceServers = c.iceServers;
  if (c.maxPlayers) state.maxPlayers = c.maxPlayers;
  rtc.iceServers = state.iceServers;
}).catch(() => {});

// ====================================================================
// audio context (speaking indicators + chimes)
// ====================================================================
let actx = null;
function audioCtx() {
  if (!actx) {
    try { actx = new AudioContext(); } catch { return null; }
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
window.addEventListener('pointerdown', () => audioCtx(), { capture: true });
window.addEventListener('keydown', () => audioCtx(), { capture: true });

function makeAnalyser(stream) {
  const ctx = audioCtx();
  if (!ctx || !stream.getAudioTracks().length) return null;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    return { an, src, buf: new Uint8Array(an.fftSize), trackId: stream.getAudioTracks()[0].id };
  } catch { return null; }
}
function levelOf(a) {
  if (!a) return 0;
  a.an.getByteTimeDomainData(a.buf);
  let sum = 0;
  for (let i = 0; i < a.buf.length; i += 2) { const v = (a.buf[i] - 128) / 128; sum += v * v; }
  return Math.sqrt(sum / (a.buf.length / 2));
}

// ====================================================================
// local media (camera + mic)
// ====================================================================
const media = {
  audio: null, // MediaStreamTrack
  video: null,
  micOn: store.get('micOn', true),
  camOn: store.get('camOn', true),
  camId: store.get('camId', ''),
  micId: store.get('micId', ''),
  previewStream: new MediaStream(), // video only, for <video> previews
  analyser: null,
};

const VIDEO_CONSTRAINTS = { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 20, max: 24 }, facingMode: 'user' };
const AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

const rtc = new RTCMesh({
  signal: (to, data) => socket.emit('signal', { to, data }),
  selfId: '',
  iceServers: state.iceServers,
  onStream: (peerId, stream) => onRemoteStream(peerId, stream),
  onState: (peerId, st) => { const p = players.get(peerId); if (p) { p.rtcState = st; renderPeople(); } },
});

async function getTrack(kind) {
  const c = kind === 'video'
    ? { video: { ...VIDEO_CONSTRAINTS, ...(media.camId ? { deviceId: { ideal: media.camId } } : {}) } }
    : { audio: { ...AUDIO_CONSTRAINTS, ...(media.micId ? { deviceId: { ideal: media.micId } } : {}) } };
  const s = await navigator.mediaDevices.getUserMedia(c);
  return kind === 'video' ? s.getVideoTracks()[0] : s.getAudioTracks()[0];
}

function setLocalTrack(kind, track) {
  const old = media[kind];
  if (old && old !== track) old.stop();
  media[kind] = track;
  if (kind === 'video') {
    media.previewStream.getVideoTracks().forEach((t) => media.previewStream.removeTrack(t));
    if (track) media.previewStream.addTrack(track);
    const pv = $('previewVideo');
    pv.srcObject = track ? media.previewStream : null;
    if (track) pv.play().catch(() => {});
    if (local) {
      local.videoEl.srcObject = track ? media.previewStream : null;
      if (track) local.videoEl.play().catch(() => {});
    }
  } else {
    if (track) track.enabled = media.micOn;
    media.analyser = track ? makeAnalyser(new MediaStream([track])) : null;
  }
  rtc.setTrack(kind, track);
  updateMediaButtons();
}

async function initMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    $('mediaNote').textContent = 'Camera/mic need a secure page (https or localhost). You can still join without them.';
    updateMediaButtons();
    return;
  }
  const wantVideo = media.camOn, wantAudio = true;
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: wantVideo ? { ...VIDEO_CONSTRAINTS, ...(media.camId ? { deviceId: { ideal: media.camId } } : {}) } : false,
      audio: wantAudio ? { ...AUDIO_CONSTRAINTS, ...(media.micId ? { deviceId: { ideal: media.micId } } : {}) } : false,
    });
    if (s.getVideoTracks()[0]) setLocalTrack('video', s.getVideoTracks()[0]);
    if (s.getAudioTracks()[0]) setLocalTrack('audio', s.getAudioTracks()[0]);
  } catch (e) {
    // try separately so one missing device doesn't block the other
    if (wantVideo) { try { setLocalTrack('video', await getTrack('video')); } catch { media.camOn = false; } }
    try { setLocalTrack('audio', await getTrack('audio')); } catch { /* no mic */ }
    if (!media.video && !media.audio) {
      $('mediaNote').textContent = e?.name === 'NotAllowedError'
        ? 'Camera/mic blocked. Allow them in the address bar (🔒 icon), or join without them.'
        : 'No camera/mic found. You can still join, chat and watch.';
    }
  }
  await refreshDevices();
  updateMediaButtons();
}

async function refreshDevices() {
  let devs = [];
  try { devs = await navigator.mediaDevices.enumerateDevices(); } catch { return; }
  const fill = (sel, kind, current) => {
    const list = devs.filter((d) => d.kind === kind);
    sel.innerHTML = '';
    if (!list.length) { sel.innerHTML = `<option>${kind === 'videoinput' ? 'No camera' : 'No microphone'}</option>`; sel.disabled = true; return; }
    sel.disabled = false;
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}`;
      sel.appendChild(o);
    });
    if (current && list.some((d) => d.deviceId === current)) sel.value = current;
  };
  fill($('camSelect'), 'videoinput', media.video?.getSettings().deviceId || media.camId);
  fill($('micSelect'), 'audioinput', media.audio?.getSettings().deviceId || media.micId);
}
navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);

$('camSelect').onchange = async (e) => {
  media.camId = e.target.value; store.set('camId', media.camId);
  if (media.camOn) { try { setLocalTrack('video', await getTrack('video')); } catch { toast('Could not switch camera', 'error'); } }
};
$('micSelect').onchange = async (e) => {
  media.micId = e.target.value; store.set('micId', media.micId);
  try { setLocalTrack('audio', await getTrack('audio')); } catch { toast('Could not switch microphone', 'error'); }
};

async function toggleMic() {
  if (!media.audio) {
    try { media.micOn = true; setLocalTrack('audio', await getTrack('audio')); refreshDevices(); } catch { media.micOn = false; toast('Microphone not available — check browser permissions.', 'error'); }
  } else {
    media.micOn = !media.micOn;
    media.audio.enabled = media.micOn;
  }
  store.set('micOn', media.micOn);
  updateMediaButtons();
  sendProfile();
}

async function toggleCam() {
  if (media.camOn && media.video) {
    media.camOn = false;
    setLocalTrack('video', null); // stops the camera (light goes off)
  } else {
    try { media.camOn = true; setLocalTrack('video', await getTrack('video')); refreshDevices(); } catch { media.camOn = false; toast('Camera not available — check browser permissions.', 'error'); }
  }
  store.set('camOn', media.camOn);
  updateMediaButtons();
  sendProfile();
}

const micLive = () => !!(media.audio && media.micOn);
const camLive = () => !!(media.video && media.camOn);

function updateMediaButtons() {
  const m = micLive(), c = camLive();
  $('pvMic').innerHTML = m ? ICONS.mic : ICONS.micOff;
  $('pvCam').innerHTML = c ? ICONS.cam : ICONS.camOff;
  $('pvMic').classList.toggle('off', !m);
  $('pvCam').classList.toggle('off', !c);
  $('previewOff').hidden = c;
  setIcon($('micBtn'), m ? 'mic' : 'micOff');
  setIcon($('camBtn'), c ? 'cam' : 'camOff');
  $('micBtn').classList.toggle('off', !m);
  $('camBtn').classList.toggle('off', !c);
  $('micBtn').querySelector('.tx').textContent = m ? 'Mute' : 'Unmute';
  $('camBtn').querySelector('.tx').textContent = c ? 'Stop video' : 'Start video';
  if (local) { local.mic = m; local.cam = c; }
}
$('pvMic').onclick = toggleMic;
$('pvCam').onclick = toggleCam;

// ====================================================================
// socket
// ====================================================================
const socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });

function sendProfile() {
  if (state.phase !== 'room') return;
  socket.emit('profile', { mic: micLive(), cam: camLive(), status: local?.status, streamId: rtc.localStream.id });
}

// ====================================================================
// lobby
// ====================================================================
const editor = createEditor({ root: $('editorModal') });
const editorCanvas = () => document.getElementById('editorCanvas');

function refreshThumb() {
  try { $('avatarThumb').src = avatarThumbnail(avatarCfg, editorCanvas()); } catch (e) { console.warn(e); }
}

$('nameInput').value = store.get('name', '');
const urlCode = new URLSearchParams(location.search).get('room');
if (urlCode) {
  $('codeInput').value = urlCode.toUpperCase().slice(0, 5);
  $('createRoomBtn').classList.remove('primary');
}

$('codeInput').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
});
$('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinFromLobby('join'); });
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinFromLobby($('codeInput').value ? 'join' : 'create'); });

function openAvatarEditor() {
  editor.open(avatarCfg, (cfg) => {
    avatarCfg = cfg;
    store.set('avatar', cfg);
    refreshThumb();
    if (local) {
      rebuildAvatar(local, cfg);
      socket.emit('avatar', cfg);
      toast('Avatar updated for everyone ✨', 'ok');
    }
  });
}
$('editAvatarLobby').onclick = openAvatarEditor;
$('randomAvatarLobby').onclick = () => { avatarCfg = randomAvatar(); store.set('avatar', avatarCfg); refreshThumb(); };
$('createRoomBtn').onclick = () => joinFromLobby('create');
$('joinRoomBtn').onclick = () => joinFromLobby('join');

function lobbyError(msg) { $('lobbyError').textContent = msg || ''; }

function joinPayload(extra = {}) {
  const spawnJitter = () => (Math.random() - 0.5) * 1.6;
  const pos = local ? { x: local.pos.x, z: local.pos.z } : { x: SPAWN.x + spawnJitter(), z: SPAWN.z + spawnJitter() };
  return {
    name: $('nameInput').value.trim() || 'Guest',
    avatar: avatarCfg,
    mic: micLive(),
    cam: camLive(),
    streamId: rtc.localStream.id,
    pos,
    ...extra,
  };
}

function emitAck(event, payload, timeout = 10000) {
  return new Promise((resolve) => {
    socket.timeout(timeout).emit(event, payload, (err, res) => resolve(err ? { ok: false, error: 'Server did not respond. Is it waking up? Try again in a few seconds.' } : res));
  });
}

async function joinFromLobby(mode) {
  if (state.phase !== 'lobby') return;
  const name = $('nameInput').value.trim();
  if (!name) { lobbyError('Please enter a display name.'); $('nameInput').focus(); return; }
  const code = $('codeInput').value.trim().toUpperCase();
  if (mode === 'join' && code.length !== 5) { lobbyError('Room codes are 5 characters.'); $('codeInput').focus(); return; }
  store.set('name', name);
  lobbyError('');
  state.phase = 'joining';
  $('createRoomBtn').disabled = $('joinRoomBtn').disabled = true;
  if (!socket.connected) toast('Connecting to the server…');
  const res = await emitAck(mode === 'create' ? 'room:create' : 'room:join', joinPayload({ code }));
  $('createRoomBtn').disabled = $('joinRoomBtn').disabled = false;
  if (!res?.ok) { state.phase = 'lobby'; lobbyError(res?.error || 'Could not join.'); return; }
  enterRoom(res);
}

// ====================================================================
// players
// ====================================================================
function makePlayer(p, isLocal) {
  const pl = {
    id: p.id,
    name: p.name,
    cfg: normalizeAvatar(p.avatar),
    status: p.status || 'Available',
    mic: !!p.mic,
    cam: !!p.cam,
    seat: p.seat || null,
    streamId: p.streamId || '',
    isLocal,
    pos: new THREE.Vector3(p.pos?.x ?? SPAWN.x, 0, p.pos?.z ?? SPAWN.z),
    ry: p.pos?.ry ?? 0,
    vel: new THREE.Vector3(),
    buffer: [],
    lastPacket: 0,
    speed: 0,
    av: null,
    panel: createVideoPanel(),
    label: createNameLabel(),
    videoEl: document.createElement('video'),
    audioEl: null,
    stream: null,
    analyser: null,
    level: 0,
    speakingUntil: 0,
    volume: 0,
    rtcState: 'new',
  };
  pl.videoEl.muted = true;
  pl.videoEl.playsInline = true;
  pl.videoEl.autoplay = true;
  $('media').appendChild(pl.videoEl);
  if (!isLocal) {
    pl.audioEl = document.createElement('audio');
    pl.audioEl.autoplay = true;
    pl.audioEl.volume = 0;
    $('media').appendChild(pl.audioEl);
  }
  rebuildAvatar(pl, pl.cfg);
  scene.add(pl.panel.mesh, pl.label.sprite);
  players.set(pl.id, pl);
  return pl;
}

function rebuildAvatar(pl, cfg) {
  pl.cfg = normalizeAvatar(cfg);
  const anim = pl.av?.anim;
  pl.av?.dispose();
  pl.av = buildAvatar(pl.cfg);
  if (anim) Object.assign(pl.av.anim, anim);
  pl.av.root.userData.playerId = pl.id;
  scene.add(pl.av.root);
  pl.panel.setInitials(pl.name, pl.cfg.topColor);
  placeAvatar(pl);
  renderPeople();
}

function removePlayer(id) {
  const pl = players.get(id);
  if (!pl) return;
  pl.av?.dispose();
  pl.panel.dispose();
  pl.label.dispose();
  pl.videoEl.srcObject = null;
  pl.videoEl.remove();
  if (pl.audioEl) { pl.audioEl.srcObject = null; pl.audioEl.remove(); }
  try { pl.analyser?.src.disconnect(); } catch { /* ignore */ }
  players.delete(id);
}

let audioBlockedToastShown = false;
function playEl(el) {
  const p = el.play();
  if (p?.catch) p.catch(() => {
    if (el.tagName === 'AUDIO' && !audioBlockedToastShown) {
      audioBlockedToastShown = true;
      const t = toast('🔈 Click anywhere to enable audio', '', 8000);
      const unlock = () => { players.forEach((pl) => pl.audioEl?.play().catch(() => {})); window.removeEventListener('pointerdown', unlock); t.remove(); };
      window.addEventListener('pointerdown', unlock);
    }
  });
}

function onRemoteStream(peerId, stream) {
  const pl = players.get(peerId);
  if (state.screenStreamId && stream.id === state.screenStreamId) { refreshScreen(); return; }
  if (!pl) return;
  const isCam = pl.streamId ? stream.id === pl.streamId : !stream.getVideoTracks().some((t) => t.label?.includes('screen'));
  if (!isCam) { refreshScreen(); return; }
  attachCamStream(pl, stream);
}

function attachCamStream(pl, stream) {
  pl.stream = stream;
  if (pl.videoEl.srcObject !== stream) pl.videoEl.srcObject = stream;
  playEl(pl.videoEl);
  if (pl.audioEl) {
    if (pl.audioEl.srcObject !== stream) pl.audioEl.srcObject = stream;
    playEl(pl.audioEl);
  }
  pl.panel.setVideo(pl.videoEl, false);
  const at = stream.getAudioTracks()[0];
  if (at && (!pl.analyser || pl.analyser.trackId !== at.id)) pl.analyser = makeAnalyser(stream);
}

// ====================================================================
// entering / leaving a room
// ====================================================================
function applySnapshot(snap) {
  state.code = snap.code;
  state.presenterId = snap.presenterId;
  state.presenterBroadcast = snap.presenterBroadcast;
  state.screenStreamId = snap.screenStreamId;
  setSlides(snap.slides || [], snap.slideIndex || 0);
  applyPomo(snap.pomo);
  $('chatLog').innerHTML = '';
  (snap.chat || []).forEach((m) => appendChat(m, true));
  for (const p of snap.players) {
    if (p.id === state.selfId) continue;
    makePlayer(p, false);
    rtc.addPeer(p.id);
  }
}

function enterRoom(res) {
  state.phase = 'room';
  state.selfId = res.selfId;
  rtc.setSelfId(res.selfId);
  const me = res.state.players.find((p) => p.id === res.selfId);
  local = makePlayer({ ...me, mic: micLive(), cam: camLive() }, true);
  local.videoEl.srcObject = media.video ? media.previewStream : null;
  if (media.video) local.videoEl.play().catch(() => {});
  local.panel.setVideo(local.videoEl, true);
  local.ry = Math.PI; // face into the office
  cam.yaw = 0; cam.pitch = 0.42; cam.dist = 6;
  cam.introT = 0;

  applySnapshot(res.state);
  office.setRoomCode(state.code);
  $('roomCode').textContent = state.code;
  history.replaceState(null, '', `?room=${state.code}`);

  $('lobby').hidden = true;
  $('hud').hidden = false;
  buildStatusSelect();
  setStatus('Available');
  updateMediaButtons();
  applyPresent({ presenterId: state.presenterId, presenterBroadcast: state.presenterBroadcast, screenStreamId: state.screenStreamId });
  renderPeople();
  canvas.focus();
  toast(`Welcome to room ${state.code}! Share the code or the 🔗 Invite link.`, 'ok', 5000);
}

function teardownRemote() {
  for (const id of [...players.keys()]) if (id !== state.selfId) removePlayer(id);
  rtc.closeAll();
}

function leaveRoom() {
  if (state.phase !== 'room') return;
  stopShare(false);
  socket.emit('room:leave');
  teardownRemote();
  if (local) removePlayer(local.id);
  local = null;
  state.phase = 'lobby';
  state.selfId = null;
  state.presenterId = null;
  state.screenStreamId = null;
  setSlides([], 0);
  refreshScreen();
  office.setRoomCode('');
  $('hud').hidden = true;
  $('lobby').hidden = false;
  closeSide();
  $('presenterPanel').hidden = true;
  $('presentBanner').hidden = true;
  $('codeInput').value = state.code || '';
  history.replaceState(null, '', location.pathname);
  // the camera preview keeps running for the lobby
  const pv = $('previewVideo');
  pv.srcObject = media.video ? media.previewStream : null;
  if (media.video) pv.play().catch(() => {});
}

// Automatic recovery when the socket drops (wifi hiccup, server restart…)
socket.on('disconnect', () => {
  if (state.phase === 'room') $('reconnect').hidden = false;
});
socket.on('connect', async () => {
  if (state.phase !== 'room' || !local) return;
  const res = await emitAck('room:join', joinPayload({ code: state.code, rejoin: true }));
  $('reconnect').hidden = true;
  if (!res?.ok) { toast(res?.error || 'Could not rejoin the room', 'error', 6000); leaveRoom(); return; }
  teardownRemote();
  players.delete(local.id);
  local.id = res.selfId;
  players.set(local.id, local);
  state.selfId = res.selfId;
  rtc.setSelfId(res.selfId);
  applySnapshot(res.state);
  sendProfile();
  if (local.seat) { const s = local.seat; local.seat = null; sitAt(s, { quiet: true }); }
  socket.emit('avatar', avatarCfg);
  renderPeople();
  toast('Reconnected ✅', 'ok');
});

// ====================================================================
// socket events
// ====================================================================
socket.on('peer:joined', (p) => {
  if (state.phase !== 'room' || players.has(p.id)) return;
  makePlayer(p, false);
  rtc.addPeer(p.id);
  renderPeople();
});
socket.on('peer:left', ({ id }) => {
  rtc.removePeer(id);
  removePlayer(id);
  renderPeople();
});
socket.on('s', (s) => {
  const pl = players.get(s.id);
  if (!pl || pl.isLocal) return;
  const now = performance.now();
  if (now - pl.lastPacket > 300 && pl.buffer.length) {
    // after a pause, restart interpolation from where the avatar is now
    const last = pl.buffer[pl.buffer.length - 1];
    pl.buffer = [{ ...last, t: now - 70 }];
  }
  pl.lastPacket = now;
  pl.buffer.push({ t: now, x: s.x, z: s.z, ry: s.ry });
  if (pl.buffer.length > 30) pl.buffer.splice(0, pl.buffer.length - 30);
});
socket.on('avatar', ({ id, avatar }) => {
  const pl = players.get(id);
  if (pl && !pl.isLocal) rebuildAvatar(pl, avatar);
});
socket.on('profile', (d) => {
  const pl = players.get(d.id);
  if (!pl || pl.isLocal) return;
  const nameChanged = d.name && d.name !== pl.name;
  Object.assign(pl, { status: d.status, mic: d.mic, cam: d.cam, name: d.name || pl.name });
  if (d.streamId && d.streamId !== pl.streamId) {
    pl.streamId = d.streamId;
    const s = rtc.getStream(pl.id, pl.streamId);
    if (s) attachCamStream(pl, s);
  }
  if (nameChanged) pl.panel.setInitials(pl.name, pl.cfg.topColor);
  renderPeople();
});
socket.on('seat', ({ id, seat }) => {
  const pl = players.get(id);
  if (!pl || pl.isLocal) return;
  pl.seat = seat;
  if (!seat) {
    // keep interpolation from jumping: continue from the current position
    pl.buffer = [];
  }
});
socket.on('chat', (m) => appendChat(m));
socket.on('react', ({ id, emoji }) => {
  const pl = players.get(id);
  if (!pl) return;
  const p = pl.av.root.position;
  emojis.spawn(emoji, new THREE.Vector3(p.x, p.y + pl.av.headTop + 0.3, p.z));
});
socket.on('signal', ({ from, data }) => { if (state.phase === 'room') rtc.handleSignal(from, data); });
socket.on('present', (p) => applyPresent(p));
socket.on('slides', ({ slides, index }) => {
  setSlides(slides, index);
  refreshScreen();
  if (slides.length && state.presenterId !== state.selfId) toast(`📄 ${slides.length} slide${slides.length > 1 ? 's' : ''} shared`, 'ok');
});
socket.on('slides:index', (i) => { state.slideIndex = i; refreshScreen(); });
socket.on('pomo', (p) => {
  applyPomo(p);
  if (p.chime) chime('phase');
});

// ====================================================================
// input & camera
// ====================================================================
const keys = new Set();
const cam = { yaw: 0, pitch: 0.42, dist: 6, target: new THREE.Vector3(0, 1.4, 4), introT: 0 };
let moveTarget = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

const isTyping = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};
const modalOpen = () => editor.isOpen || $('screenModal').classList.contains('open');

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('screenModal').classList.contains('open')) closeScreenModal();
    else if (isTyping()) document.activeElement.blur();
    else if (!$('reactBar').hidden) $('reactBar').hidden = true;
    return;
  }
  if (state.phase !== 'room' || isTyping() || modalOpen()) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    keys.add(k);
    if (k !== 'shift') { moveTarget = null; if (local?.seat) standUp(); }
    if (k.startsWith('arrow')) e.preventDefault();
  } else if (k === 'enter') { openSide('chat'); $('chatInput').focus(); e.preventDefault(); }
  else if (k === 'm') toggleMic();
  else if (k === 'v') toggleCam();
  else if (k === ' ') { if (local?.seat) standUp(); e.preventDefault(); }
  else if ('123456'.includes(k) && k.length === 1) react(['👏', '😂', '❤️', '👍', '🎉', '🤔'][Number(k) - 1]);
  else if ((e.key === 'PageDown' || e.key === 'PageUp') && state.presenterId === state.selfId) {
    gotoSlide(state.slideIndex + (e.key === 'PageDown' ? 1 : -1));
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (state.phase !== 'room') return;
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 4) {
      cam.yaw -= dx * 0.006;
      cam.pitch = clamp(cam.pitch + dy * 0.004, 0.05, 1.3);
      canvas.style.cursor = 'grabbing';
    }
  } else {
    hoverPending = e;
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const click = drag.moved < 6 && performance.now() - drag.t < 500;
  drag = null;
  canvas.style.cursor = '';
  if (click) handleClick(e);
});
canvas.addEventListener('wheel', (e) => {
  if (state.phase !== 'room') return;
  cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 2.2, 13);
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function pickAt(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([...office.clickables, office.screen.mesh], false);
  return hits[0] || null;
}

let hoverPending = null, lastHover = 0;
function updateHover(now) {
  if (!hoverPending || now - lastHover < 90 || state.phase !== 'room') return;
  lastHover = now;
  const hit = pickAt(hoverPending);
  hoverPending = null;
  canvas.style.cursor = hit ? 'pointer' : '';
}

function handleClick(e) {
  const hit = pickAt(e);
  if (hit?.object.userData.isScreen) { openScreenModal(); return; }
  if (hit?.object.userData.seatIds) {
    const taken = occupiedSeats();
    const free = hit.object.userData.seatIds
      .filter((id) => !taken.has(id) || local.seat === id)
      .map((id) => office.seats.get(id))
      .sort((a, b) => (a.x - hit.point.x) ** 2 + (a.z - hit.point.z) ** 2 - ((b.x - hit.point.x) ** 2 + (b.z - hit.point.z) ** 2));
    if (!free.length) { toast('That seat is taken'); return; }
    if (free[0].id !== local.seat) sitAt(free[0].id);
    return;
  }
  // click on the floor = walk there
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) {
    if (p.x > BOUNDS.minX && p.x < BOUNDS.maxX && p.z > BOUNDS.minZ && p.z < BOUNDS.maxZ) {
      if (local.seat) standUp();
      moveTarget = p;
    }
  }
}

// ====================================================================
// seats
// ====================================================================
function occupiedSeats() {
  const s = new Set();
  players.forEach((p) => { if (p.seat && !p.isLocal) s.add(p.seat); });
  return s;
}

async function sitAt(seatId, { quiet = false, faceScreen = false } = {}) {
  const seat = office.seats.get(seatId);
  if (!seat || !local) return false;
  const res = await emitAck('seat', seatId, 5000);
  if (!res?.ok) { if (!quiet) toast(res?.error || 'Could not sit there'); return false; }
  local.seat = seatId;
  local.pos.set(seat.x, 0, seat.z);
  local.ry = seat.ry;
  local.vel.set(0, 0, 0);
  moveTarget = null;
  cam.yaw = seat.ry + Math.PI;
  if (faceScreen || seat.type === 'meeting') { cam.pitch = 0.1; cam.dist = 2.0; }
  $('standBtn').hidden = false;
  if (seat.type === 'desk' && local.status === 'Available') { setStatus('Studying'); state.autoStatus = true; }
  sendState(true);
  return true;
}

function standUp() {
  if (!local?.seat) return;
  const seat = office.seats.get(local.seat);
  local.seat = null;
  socket.emit('seat', null);
  $('standBtn').hidden = true;
  if (seat) {
    const dir = seat.type === 'couch' ? 1 : -1; // couches: step forward; chairs: step back
    local.pos.set(seat.x + Math.sin(seat.ry) * 0.75 * dir, 0, seat.z + Math.cos(seat.ry) * 0.75 * dir);
    resolveCollisions(local.pos, 0.3, office.colliders);
  }
  if (state.autoStatus && local.status === 'Studying') setStatus('Available');
  state.autoStatus = false;
  sendState(true);
}
$('standBtn').onclick = standUp;
setIcon($('standBtn'), 'stand');

function placeAvatar(pl) {
  const av = pl.av;
  const seat = pl.seat && office.seats.get(pl.seat);
  if (seat) {
    av.root.position.set(seat.x - Math.sin(seat.ry) * 0.08, seat.y + 0.07 - av.hipHeight, seat.z - Math.cos(seat.ry) * 0.08);
    av.root.rotation.y = seat.ry;
  } else {
    av.root.position.set(pl.pos.x, 0, pl.pos.z);
    av.root.rotation.y = pl.ry;
  }
}

// ====================================================================
// movement + networking tick
// ====================================================================
const WALK = 3.4, RUN = 6.2;
let lastSend = 0, lastSent = null;

function sendState(force = false) {
  if (state.phase !== 'room' || !local) return;
  const now = performance.now();
  const s = { x: +local.pos.x.toFixed(3), y: 0, z: +local.pos.z.toFixed(3), ry: +wrapAngle(local.ry).toFixed(3), a: local.seat ? 1 : 0 };
  const changed = !lastSent || Math.abs(s.x - lastSent.x) > 0.002 || Math.abs(s.z - lastSent.z) > 0.002 || Math.abs(s.ry - lastSent.ry) > 0.01 || s.a !== lastSent.a;
  if (force || (now - lastSend > 66 && changed) || now - lastSend > 1000) {
    socket.volatile.emit('s', s);
    lastSend = now;
    lastSent = s;
  }
}

function updateLocal(dt) {
  if (!local) return;
  const input = new THREE.Vector3();
  if (!isTyping() && !modalOpen()) {
    const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const r = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    input.addScaledVector(fwd, f).addScaledVector(right, r);
  }
  if (input.lengthSq() === 0 && moveTarget) {
    const d = new THREE.Vector3(moveTarget.x - local.pos.x, 0, moveTarget.z - local.pos.z);
    if (d.length() < 0.25) moveTarget = null; else input.copy(d);
  }
  if (input.lengthSq() > 0) input.normalize();
  const speed = keys.has('shift') ? RUN : WALK;
  const targetVel = local.seat ? new THREE.Vector3() : input.multiplyScalar(speed);
  local.vel.lerp(targetVel, damp(12, dt));
  if (!local.seat) {
    const before = local.pos.clone();
    local.pos.addScaledVector(local.vel, dt);
    resolveCollisions(local.pos, 0.3, office.colliders);
    const moved = local.pos.distanceTo(before) / Math.max(dt, 1e-4);
    if (moveTarget && moved < 0.2 && local.vel.length() > 1) moveTarget = null; // stuck against something
    local.speed = moved;
    if (local.vel.lengthSq() > 0.05) local.ry = lerpAngle(local.ry, Math.atan2(local.vel.x, local.vel.z), damp(12, dt));
  } else {
    local.speed = 0;
  }
  sendState();
}

const INTERP_DELAY = 110;
function updateRemote(pl, dt, now) {
  const b = pl.buffer;
  if (b.length) {
    const rt = now - INTERP_DELAY;
    let x, z, ry;
    if (rt <= b[0].t) ({ x, z, ry } = b[0]);
    else if (rt >= b[b.length - 1].t) ({ x, z, ry } = b[b.length - 1]);
    else {
      let i = 0;
      while (i < b.length - 2 && b[i + 1].t < rt) i++;
      const a = b[i], c = b[i + 1];
      const k = (rt - a.t) / Math.max(1, c.t - a.t);
      x = a.x + (c.x - a.x) * k;
      z = a.z + (c.z - a.z) * k;
      ry = lerpAngle(a.ry, c.ry, k);
    }
    const prevX = pl.pos.x, prevZ = pl.pos.z;
    pl.pos.set(x, 0, z);
    pl.ry = ry;
    const sp = Math.hypot(x - prevX, z - prevZ) / Math.max(dt, 1e-4);
    pl.speed += (Math.min(sp, 8) - pl.speed) * damp(10, dt);
    while (b.length > 2 && b[1].t < rt - 200) b.shift();
  } else {
    pl.speed *= 0.9;
  }
}

// Proximity audio: full volume up close, fading out with distance.
function proximityVolume(pl) {
  if (!local) return 0;
  if (state.presenterId === pl.id && state.presenterBroadcast) return 1;
  const d = Math.hypot(pl.pos.x - local.pos.x, pl.pos.z - local.pos.z);
  const NEAR = 2.0, FAR = 13;
  let v = d <= NEAR ? 1 : d >= FAR ? 0 : Math.pow(1 - (d - NEAR) / (FAR - NEAR), 1.6);
  const inMeet = (p) => p.x > 3 && p.z < -2;
  if (inMeet(pl.pos) !== inMeet(local.pos)) v *= 0.35; // glass walls muffle
  return v;
}

function updateCamera(dt) {
  if (state.phase !== 'room' || !local) {
    // slow cinematic orbit behind the lobby
    const t = performance.now() / 1000;
    camera.position.set(Math.sin(t * 0.04) * 24, 17 + Math.sin(t * 0.1), Math.cos(t * 0.04) * 20);
    camera.lookAt(0, 0, -1);
    return;
  }
  const h = local.av.root.position.y + local.av.headTop - 0.35;
  const target = new THREE.Vector3(local.av.root.position.x, h, local.av.root.position.z);
  cam.introT += dt;
  const follow = cam.introT < 2 ? 2.5 : 10;
  cam.target.lerp(target, damp(follow * 1.2, dt));
  const dir = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
  let dist = cam.dist;
  raycaster.set(cam.target, dir);
  raycaster.far = dist + 0.3;
  const hit = raycaster.intersectObjects(office.occluders, false)[0];
  raycaster.far = Infinity;
  if (hit) dist = Math.max(1.0, hit.distance - 0.3);
  const desired = cam.target.clone().addScaledVector(dir, dist);
  camera.position.lerp(desired, damp(cam.introT < 2 ? 2.5 : 14, dt));
  camera.lookAt(cam.target);
}

// ====================================================================
// presenter / big screen
// ====================================================================
const screenVideoEl = document.createElement('video');
screenVideoEl.muted = true;
screenVideoEl.playsInline = true;
screenVideoEl.autoplay = true;
$('media').appendChild(screenVideoEl);
let screenVideoTex = null;
const slideTex = new Map();
let screenMode = 'idle';

screenVideoEl.addEventListener('resize', () => { if (screenMode === 'screen') office.screen.setTexture(screenVideoTex, screenVideoEl.videoWidth / screenVideoEl.videoHeight || 16 / 9); });

function setSlides(slides, index) {
  slideTex.forEach((t) => t.dispose());
  slideTex.clear();
  state.slides = slides || [];
  state.slideIndex = clamp(index || 0, 0, Math.max(0, state.slides.length - 1));
}

function slideTexture(i, cb) {
  if (slideTex.has(i)) { const t = slideTex.get(i); if (t.image?.complete) cb?.(t); else t.userData.cbs.push(cb); return t; }
  const img = new Image();
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.cbs = cb ? [cb] : [];
  img.onload = () => { t.needsUpdate = true; t.userData.cbs.forEach((f) => f?.(t)); t.userData.cbs = []; };
  img.src = state.slides[i];
  slideTex.set(i, t);
  return t;
}

function currentScreenStream() {
  if (!state.presenterId || !state.screenStreamId) return null;
  if (state.presenterId === state.selfId) return rtc.screenStream;
  const s = rtc.getStream(state.presenterId, state.screenStreamId);
  return s && s.getVideoTracks().some((t) => t.readyState === 'live') ? s : null;
}

function refreshScreen() {
  const presenter = players.get(state.presenterId);
  const stream = currentScreenStream();
  if (stream) {
    if (screenVideoEl.srcObject !== stream) {
      screenVideoEl.srcObject = stream;
      screenVideoEl.play().catch(() => {});
      screenVideoTex?.dispose();
      screenVideoTex = new THREE.VideoTexture(screenVideoEl);
      screenVideoTex.colorSpace = THREE.SRGBColorSpace;
    }
    screenMode = 'screen';
    office.screen.setTexture(screenVideoTex, screenVideoEl.videoWidth / screenVideoEl.videoHeight || 16 / 9);
  } else if (state.screenStreamId) {
    screenMode = 'waiting';
    office.screen.setIdle(`${presenter?.name || 'Someone'} is sharing their screen`, 'Connecting…');
  } else if (state.slides.length) {
    screenMode = 'slides';
    const i = state.slideIndex;
    slideTexture(i, (t) => { if (state.slideIndex === i && screenMode === 'slides') office.screen.setTexture(t, t.image.width / t.image.height); });
    if (i + 1 < state.slides.length) slideTexture(i + 1);
  } else {
    screenMode = 'idle';
    if (screenVideoEl.srcObject) screenVideoEl.srcObject = null;
    if (presenter) office.screen.setIdle(`${presenter.name} is presenting`, 'Waiting for a screen share or slides…');
    else office.screen.setIdle();
  }
  $('slideCounter').textContent = `${state.slideIndex + 1} / ${state.slides.length}`;
  $('slideNav').hidden = !state.slides.length;
  updateScreenModal();
}

function applyPresent(p) {
  const wasMe = state.presenterId === state.selfId;
  state.presenterId = p.presenterId;
  state.presenterBroadcast = p.presenterBroadcast;
  state.screenStreamId = p.screenStreamId;
  const isMe = !!state.selfId && state.presenterId === state.selfId;
  if (wasMe && !isMe) {
    stopShare(false);
    if (local?.status === 'Presenting') setStatus(state.statusBeforePresent || 'Available');
  }
  $('presenterPanel').hidden = !isMe;
  $('broadcastToggle').checked = state.presenterBroadcast;
  const presenter = players.get(state.presenterId);
  $('presentBanner').hidden = !presenter || isMe;
  if (presenter && !isMe) $('presentText').textContent = `🎤 ${presenter.name} is presenting`;
  $('presentText').title = state.presenterBroadcast ? 'Everyone hears the presenter at full volume' : '';
  $('presentBtn').classList.toggle('live', isMe);
  $('presentBtn').querySelector('.tx').textContent = isMe ? 'Stop' : 'Present';
  $('shareBtn').classList.toggle('live', !!rtc.screenStream);
  refreshScreen();
  renderPeople();
}

async function claimPresenter() {
  if (state.presenterId === state.selfId) return true;
  const res = await emitAck('present:claim', null);
  if (!res?.ok) { toast(res?.error || 'Could not start presenting', 'error'); return false; }
  state.statusBeforePresent = local.status === 'Presenting' ? 'Available' : local.status;
  setStatus('Presenting');
  // walk up to the lectern, facing the audience
  if (local.seat) standUp();
  local.pos.set(5.05, 0, -8.5);
  local.ry = 0;
  cam.yaw = Math.PI * 0.75;
  cam.pitch = 0.35;
  cam.dist = 6;
  sendState(true);
  return true;
}

async function startShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) { toast('Screen sharing is not supported in this browser.', 'error'); return; }
  if (!(await claimPresenter())) return;
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 }, height: { max: 1080 } }, audio: false });
  } catch {
    toast('Screen share cancelled');
    return;
  }
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  track.contentHint = 'detail';
  track.addEventListener('ended', () => stopShare(true));
  rtc.startScreen(stream);
  socket.emit('screen:start', stream.id);
  state.screenStreamId = stream.id;
  $('shareBtn').classList.add('live');
  $('shareBtn').querySelector('.tx').textContent = 'Stop share';
  $('shareScreenBtn2').textContent = '⏹ Stop sharing';
  refreshScreen();
}

function stopShare(notify = true) {
  if (!rtc.screenStream) return;
  rtc.stopScreen();
  if (notify) socket.emit('screen:stop');
  if (state.presenterId === state.selfId) state.screenStreamId = null;
  $('shareBtn').classList.remove('live');
  $('shareBtn').querySelector('.tx').textContent = 'Share';
  $('shareScreenBtn2').textContent = '🖥 Share screen';
  refreshScreen();
}

function gotoSlide(i) {
  if (state.presenterId !== state.selfId || !state.slides.length) return;
  const n = clamp(i, 0, state.slides.length - 1);
  if (n === state.slideIndex) return;
  state.slideIndex = n;
  socket.emit('slides:goto', n);
  refreshScreen();
}

$('presentBtn').onclick = async () => {
  if (state.presenterId === state.selfId) { socket.emit('present:release'); return; }
  if (await claimPresenter()) toast('You are presenting. Share your screen or upload slides from the panel.', 'ok', 5000);
};
$('stopPresentBtn').onclick = () => socket.emit('present:release');
$('shareBtn').onclick = () => (rtc.screenStream ? stopShare(true) : startShare());
$('shareScreenBtn2').onclick = () => (rtc.screenStream ? stopShare(true) : startShare());
$('broadcastToggle').onchange = (e) => socket.emit('present:broadcast', e.target.checked);
$('uploadSlidesBtn').onclick = () => $('slidesInput').click();
$('prevSlide').onclick = () => gotoSlide(state.slideIndex - 1);
$('nextSlide').onclick = () => gotoSlide(state.slideIndex + 1);
$('clearSlides').onclick = () => socket.emit('slides:clear');
$('slidesInput').onchange = async (e) => {
  const files = e.target.files;
  if (!files?.length) return;
  const t = toast('Preparing slides…', '', 60000);
  try {
    const slides = await filesToSlides(files, (msg) => { t.textContent = msg; });
    if (!slides.length) { toast('No images or PDF pages found', 'error'); return; }
    t.textContent = `Uploading ${slides.length} slide${slides.length > 1 ? 's' : ''}…`;
    const res = await emitAck('slides:set', slides, 60000);
    if (!res?.ok) toast(res?.error || 'Upload failed', 'error');
    else {
      toast(`✅ ${res.count} slides on the big screen`, 'ok');
      if (rtc.screenStream) stopShare(true); // slides replace the screen share
    }
  } catch (err) {
    console.error(err);
    toast('Could not read that file. Try a PDF or PNG/JPG images.', 'error', 5000);
  } finally {
    t.remove();
    e.target.value = '';
  }
};

$('takeSeatBtn').onclick = async () => {
  const taken = occupiedSeats();
  const free = office.meetingSeatIds.find((id) => !taken.has(id));
  if (!free) { toast('All meeting seats are taken — stand anywhere in the room!'); return; }
  if (local.seat === free) return;
  await sitAt(free, { faceScreen: true });
};
$('viewScreenBtn').onclick = () => openScreenModal();

// Focus view: show the big screen as a normal 2D overlay for maximum readability.
function openScreenModal() {
  $('screenModal').classList.add('open');
  $('screenModal').setAttribute('aria-hidden', 'false');
  updateScreenModal();
}
function closeScreenModal() {
  $('screenModal').classList.remove('open');
  $('screenModal').setAttribute('aria-hidden', 'true');
  $('screenVideo').srcObject = null;
}
function updateScreenModal() {
  if (!$('screenModal').classList.contains('open')) return;
  const v = $('screenVideo'), img = $('screenImg');
  const stream = currentScreenStream();
  const isMe = state.presenterId === state.selfId;
  v.classList.toggle('show', !!stream);
  img.classList.toggle('show', !stream && !!state.slides.length);
  $('screenEmpty').hidden = !!stream || !!state.slides.length;
  if (stream) { if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); } }
  else v.srcObject = null;
  if (!stream && state.slides.length) img.src = state.slides[state.slideIndex];
  const showNav = !stream && state.slides.length > 0;
  $('screenCounter').hidden = !showNav;
  $('screenCounter').textContent = `${state.slideIndex + 1} / ${state.slides.length}`;
  $('screenPrev').hidden = $('screenNext').hidden = !(showNav && isMe);
  const presenter = players.get(state.presenterId);
  $('screenTitle').textContent = presenter ? `${presenter.isLocal ? 'You are' : presenter.name + ' is'} presenting` : 'Big screen';
}
$('screenClose').onclick = closeScreenModal;
$('screenPrev').onclick = () => gotoSlide(state.slideIndex - 1);
$('screenNext').onclick = () => gotoSlide(state.slideIndex + 1);
$('screenModal').addEventListener('click', (e) => { if (e.target === $('screenModal')) closeScreenModal(); });
document.addEventListener('keydown', (e) => {
  if ($('screenModal').classList.contains('open') && state.presenterId === state.selfId && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    gotoSlide(state.slideIndex + (e.key === 'ArrowRight' ? 1 : -1));
  }
});

// ====================================================================
// Pomodoro
// ====================================================================
function applyPomo(p) {
  if (!p) return;
  state.pomo = p;
  state.pomoOffset = p.serverNow - Date.now();
  $('pomoFocus').value = p.focusMin;
  $('pomoBreak').value = p.breakMin;
  lastPomoText = '';
  if (p.by && p.action && p.by !== local?.name) {
    const verb = { start: 'started', pause: 'paused', reset: 'reset', skip: 'skipped', config: 'changed' }[p.action];
    if (verb) toast(`⏱ ${p.by} ${verb} the timer`);
  }
}
function pomoRemaining() {
  const p = state.pomo;
  if (!p) return 0;
  return Math.max(0, p.running ? p.endsAt - (Date.now() + state.pomoOffset) : p.remaining);
}
const fmtTime = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
let lastPomoText = '';
function updatePomo() {
  const p = state.pomo;
  if (!p) return;
  const text = fmtTime(pomoRemaining());
  const key = text + p.phase + p.running + p.cycle + studyingCount();
  if (key === lastPomoText) return;
  lastPomoText = key;
  $('pomoTime').textContent = text;
  $('pomoPhase').textContent = p.phase === 'focus' ? `Focus #${p.cycle}` : 'Break';
  $('pomo').dataset.phase = p.phase;
  $('pomo').classList.toggle('running', p.running);
  $('pomoToggle').textContent = p.running ? '⏸' : '▶';
  drawPomoBoard(text, p);
}
function studyingCount() { let n = 0; players.forEach((p) => { if (p.status === 'Studying') n++; }); return n; }
function drawPomoBoard(text, p) {
  const { canvas: c, tex } = office.pomoBoard;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const focus = p.phase === 'focus';
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, focus ? '#1f2a44' : '#4a3520');
  grad.addColorStop(1, focus ? '#2f4744' : '#6b4a26');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = focus ? '#b8c6ff' : '#f6c177';
  g.font = `800 ${H * 0.1}px Inter, "Segoe UI", sans-serif`;
  g.fillText(focus ? `FOCUS · SESSION ${p.cycle}` : 'BREAK TIME ☕', W / 2, H * 0.17);
  g.fillStyle = p.running ? '#fff' : 'rgba(255,255,255,0.6)';
  g.font = `800 ${H * 0.42}px Inter, "Segoe UI", sans-serif`;
  g.fillText(text, W / 2, H * 0.52);
  // progress bar
  const total = (focus ? p.focusMin : p.breakMin) * 60000;
  const frac = 1 - pomoRemaining() / total;
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(W * 0.1, H * 0.78, W * 0.8, H * 0.03);
  g.fillStyle = focus ? '#5b7cfa' : '#f6c177';
  g.fillRect(W * 0.1, H * 0.78, W * 0.8 * clamp(frac, 0, 1), H * 0.03);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = `600 ${H * 0.065}px Inter, "Segoe UI", sans-serif`;
  const n = studyingCount();
  g.fillText(p.running ? `${n} studying now` : 'Paused — press ▶ at the top to start', W / 2, H * 0.9);
  tex.needsUpdate = true;
}
document.querySelectorAll('[data-pomo]').forEach((b) => {
  b.onclick = () => {
    const a = b.dataset.pomo;
    if (a === 'settings') { $('pomoSettings').hidden = !$('pomoSettings').hidden; return; }
    if (a === 'toggle') socket.emit('pomo', { action: state.pomo?.running ? 'pause' : 'start' });
    else socket.emit('pomo', { action: a });
  };
});
$('pomoApply').onclick = () => {
  socket.emit('pomo', { action: 'config', focusMin: Number($('pomoFocus').value), breakMin: Number($('pomoBreak').value) });
  $('pomoSettings').hidden = true;
};

// ====================================================================
// chat, people, reactions, status
// ====================================================================
function appendChat(m, history = false) {
  const log = $('chatLog');
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  const el = document.createElement('div');
  if (m.system) {
    el.className = 'msg system';
    el.textContent = m.text;
  } else {
    const mine = m.from === state.selfId;
    el.className = 'msg' + (mine ? ' me' : '');
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = mine ? 'You' : m.name;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = new Date(m.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const body = document.createElement('span');
    body.className = 'body';
    body.textContent = m.text;
    el.append(who, time, body);
    if (!history && !mine && !(state.sideOpen && state.sideTab === 'chat')) {
      state.unread++;
      $('unread').textContent = String(state.unread);
      $('unread').hidden = false;
      toast(`💬 ${m.name}: ${m.text.slice(0, 90)}`);
    }
  }
  log.appendChild(el);
  while (log.children.length > 200) log.firstChild.remove();
  if (nearBottom || history || m.from === state.selfId) log.scrollTop = log.scrollHeight;
}
$('chatForm').onsubmit = (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  socket.emit('chat', text);
  $('chatInput').value = '';
};
$('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.blur(); canvas.focus(); } });

function openSide(tab) {
  state.sideOpen = true;
  state.sideTab = tab;
  $('side').hidden = false;
  $('hud').classList.add('side-open');
  document.querySelectorAll('.side-tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.side-body').forEach((p) => { p.hidden = p.dataset.pane !== tab; });
  $('chatBtn').classList.toggle('active', tab === 'chat');
  $('peopleBtn').classList.toggle('active', tab === 'people');
  if (tab === 'chat') {
    state.unread = 0;
    $('unread').hidden = true;
    $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }
}
function closeSide() {
  state.sideOpen = false;
  $('side').hidden = true;
  $('hud').classList.remove('side-open');
  $('chatBtn').classList.remove('active');
  $('peopleBtn').classList.remove('active');
}
document.querySelectorAll('.side-tabs [data-tab]').forEach((b) => { b.onclick = () => openSide(b.dataset.tab); });
$('closeSide').onclick = closeSide;
$('chatBtn').onclick = () => (state.sideOpen && state.sideTab === 'chat' ? closeSide() : openSide('chat'));
$('peopleBtn').onclick = () => (state.sideOpen && state.sideTab === 'people' ? closeSide() : openSide('people'));

let peopleQueued = false;
function renderPeople() {
  if (peopleQueued) return;
  peopleQueued = true;
  requestAnimationFrame(() => {
    peopleQueued = false;
    const list = $('peopleList');
    list.innerHTML = '';
    const arr = [...players.values()].sort((a, b) => (b.isLocal - a.isLocal) || a.name.localeCompare(b.name));
    for (const p of arr) {
      const li = document.createElement('li');
      const av = document.createElement('div');
      av.className = 'av';
      av.style.background = p.cfg.topColor;
      av.textContent = p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      const dot = document.createElement('i');
      dot.style.background = statusColor(p.status);
      av.appendChild(dot);
      const info = document.createElement('div');
      info.className = 'info';
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = p.name;
      if (p.isLocal) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'you'; nm.appendChild(t); }
      if (state.presenterId === p.id) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'presenting'; nm.appendChild(t); }
      const st = document.createElement('div');
      st.className = 'st';
      st.textContent = p.status + (!p.isLocal && p.rtcState === 'failed' ? ' · video connection failed' : '');
      info.append(nm, st);
      const icons = document.createElement('div');
      icons.className = 'icons';
      icons.innerHTML = `<span class="${p.mic ? '' : 'off'}" title="${p.mic ? 'Mic on' : 'Muted'}">${p.mic ? '🎙' : '🔇'}</span><span class="${p.cam ? '' : 'off'}" title="${p.cam ? 'Camera on' : 'Camera off'}">${p.cam ? '📷' : '🚫'}</span>`;
      li.append(av, info, icons);
      if (!p.isLocal) {
        const go = document.createElement('button');
        go.className = 'mini-btn';
        go.textContent = 'Go to';
        go.title = `Teleport next to ${p.name}`;
        go.onclick = () => teleportNear(p);
        li.appendChild(go);
      }
      list.appendChild(li);
    }
    const n = players.size;
    $('peopleCount').textContent = String(n);
    $('peopleCount2').textContent = String(n);
  });
}

function teleportNear(p) {
  if (!local) return;
  if (local.seat) standUp();
  const angle = Math.random() * Math.PI * 2;
  local.pos.set(p.pos.x + Math.sin(angle) * 1.2, 0, p.pos.z + Math.cos(angle) * 1.2);
  resolveCollisions(local.pos, 0.3, office.colliders);
  local.ry = Math.atan2(p.pos.x - local.pos.x, p.pos.z - local.pos.z);
  cam.yaw = local.ry + Math.PI;
  sendState(true);
}

let lastReact = 0;
function react(emoji) {
  const now = performance.now();
  if (now - lastReact < 250 || state.phase !== 'room') return;
  lastReact = now;
  socket.emit('react', emoji);
}
$('reactBtn').onclick = () => { $('reactBar').hidden = !$('reactBar').hidden; };
$('reactBar').querySelectorAll('[data-emoji]').forEach((b) => { b.onclick = () => react(b.dataset.emoji); });

function buildStatusSelect() {
  const sel = $('statusSelect');
  if (sel.options.length) return;
  for (const s of STATUSES) {
    const o = document.createElement('option');
    o.value = o.textContent = s;
    sel.appendChild(o);
  }
  sel.onchange = () => { state.autoStatus = false; setStatus(sel.value); sel.blur(); };
}
function setStatus(s) {
  if (!local) return;
  local.status = s;
  $('statusSelect').value = s;
  $('statusDot').style.background = statusColor(s);
  sendProfile();
  renderPeople();
}

$('micBtn').onclick = toggleMic;
$('camBtn').onclick = toggleCam;
$('avatarBtn').onclick = openAvatarEditor;
$('leaveBtn').onclick = () => leaveRoom();
$('copyLink').onclick = async () => {
  const url = `${location.origin}/?room=${state.code}`;
  try { await navigator.clipboard.writeText(url); toast('Invite link copied 🔗', 'ok'); }
  catch { prompt('Copy this invite link:', url); }
};
$('hideHelp').onclick = () => { $('helpHint').hidden = true; store.set('hideHelp', true); };
if (store.get('hideHelp', false)) $('helpHint').hidden = true;
for (const [id, ic] of [['shareBtn', 'screen'], ['presentBtn', 'present'], ['reactBtn', 'react'], ['avatarBtn', 'avatar'], ['chatBtn', 'chat'], ['peopleBtn', 'people'], ['leaveBtn', 'leave']]) setIcon($(id), ic);
if (matchMedia('(pointer: coarse)').matches) {
  $('helpHint').hidden = false;
  $('helpText').textContent = 'Tap the floor to walk · drag to look · tap a chair to sit';
}

// ====================================================================
// main loop
// ====================================================================
const clock = new THREE.Clock();
let frames = 0;
let localLevelHold = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (state.phase === 'room' && local) {
    updateLocal(dt);
    updateHover(now);
    const localLevel = micLive() ? levelOf(media.analyser) : 0;
    if (localLevel > 0.035) localLevelHold = now + 300;
    for (const pl of players.values()) {
      if (!pl.isLocal) updateRemote(pl, dt, now);
      placeAvatar(pl);
      const seat = pl.seat && office.seats.get(pl.seat);
      animateAvatar(pl.av, dt, { speed: pl.speed, sitting: !!seat, typing: !!seat?.typing });
      // labels & video panel above the head
      const rp = pl.av.root.position;
      const top = rp.y + pl.av.headTop;
      pl.label.sprite.position.set(rp.x, top + 0.04, rp.z);
      pl.label.set({ name: pl.name, status: pl.status, mic: pl.isLocal ? micLive() : pl.mic, isLocal: pl.isLocal, presenter: state.presenterId === pl.id });
      pl.panel.mesh.scale.setScalar(pl.isLocal ? 0.75 : 1);
      pl.panel.mesh.position.set(rp.x, top + (pl.isLocal ? 0.62 : 0.72), rp.z);
      let speaking;
      if (pl.isLocal) speaking = now < localLevelHold;
      else {
        if (frames % 2 === 0) { const l = levelOf(pl.analyser); if (l > 0.035 && pl.mic) pl.speakingUntil = now + 300; }
        speaking = now < pl.speakingUntil;
        const v = proximityVolume(pl);
        pl.volume += (v - pl.volume) * damp(8, dt);
        if (pl.audioEl) pl.audioEl.volume = clamp(pl.volume, 0, 1);
      }
      const wantVideo = pl.isLocal ? camLive() : pl.cam;
      pl.panel.update(camera, wantVideo, speaking, state.presenterId === pl.id);
      const hideOwn = pl.isLocal && cam.dist < 2.6;
      pl.panel.mesh.visible = !hideOwn;
      pl.label.sprite.visible = !hideOwn;
    }
    updatePomo();
  }
  emojis.update(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  frames++;
  if (frames === 2) $('loading').classList.add('done');
  requestAnimationFrame(frame);
}

// lobby mic meter
function lobbyMeter() {
  if (state.phase === 'lobby') {
    const l = micLive() ? levelOf(media.analyser) : 0;
    $('micMeter').style.height = `${Math.min(100, l * 400)}%`;
  }
  setTimeout(lobbyMeter, 80);
}

// ====================================================================
// boot
// ====================================================================
updateMediaButtons();
refreshThumb();
requestAnimationFrame(frame);
lobbyMeter();
initMedia();
setTimeout(() => (urlCode ? $('nameInput') : $('nameInput')).focus(), 300);

// handy for debugging & automated tests
window.__app = { state, players, rtc, office, media, socket, camera, cam, sitAt, standUp, get local() { return local; }, get screenMode() { return screenMode; } };
