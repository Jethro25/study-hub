// Study Office 3D — realtime server
// Express serves the static client, Socket.IO handles presence, movement,
// chat, shared room state (presenter, slides, Pomodoro) and WebRTC signaling.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 8);
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000; // keep empty rooms 10 min so a refresh doesn't kill the room
const MAX_SLIDES = 80;
const MAX_SLIDES_BYTES = 40 * 1024 * 1024;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 45 * 1024 * 1024, // slide decks are sent as data URLs
  pingInterval: 20000,
  pingTimeout: 25000,
});

// ---------- static files ----------
const nm = (p) => path.join(__dirname, 'node_modules', p);
app.use('/vendor/three/build', express.static(nm('three/build'), { maxAge: '7d' }));
app.use('/vendor/three/addons', express.static(nm('three/examples/jsm'), { maxAge: '7d' }));
app.use('/vendor/pdfjs', express.static(nm('pdfjs-dist/build'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

// ICE servers: public STUN by default. Optional TURN via env vars for strict networks.
app.get('/config', (_req, res) => {
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL.split(',').map((s) => s.trim()),
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });
  }
  res.json({ iceServers, maxPlayers: MAX_PLAYERS });
});

// ---------- room state ----------
/** @type {Map<string, any>} */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function makeCode() {
  for (let tries = 0; tries < 1000; tries++) {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error('no codes left');
}

function newRoom(code) {
  return {
    code,
    players: new Map(),
    seats: new Map(), // seatId -> playerId
    presenterId: null,
    presenterBroadcast: true,
    screenStreamId: null,
    slides: [],
    slideIndex: 0,
    chat: [],
    pomo: { phase: 'focus', running: false, endsAt: 0, remaining: 25 * 60000, focusMin: 25, breakMin: 5, cycle: 1 },
    emptySince: null,
  };
}

const clampStr = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const num = (v, lo, hi, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

function sanitizeAvatar(a) {
  // Avatar is a small flat object of strings/numbers/booleans. Keep it bounded.
  const out = {};
  if (!a || typeof a !== 'object') return out;
  let count = 0;
  for (const [k, v] of Object.entries(a)) {
    if (++count > 40) break;
    const key = clampStr(k, 24);
    if (typeof v === 'string') out[key] = clampStr(v, 24);
    else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'boolean') out[key] = v;
  }
  return out;
}

function publicPlayer(p) {
  return {
    id: p.id, name: p.name, avatar: p.avatar, pos: p.pos, status: p.status,
    mic: p.mic, cam: p.cam, seat: p.seat, streamId: p.streamId, joinedAt: p.joinedAt,
  };
}

function roomSnapshot(room) {
  return {
    code: room.code,
    players: [...room.players.values()].map(publicPlayer),
    presenterId: room.presenterId,
    presenterBroadcast: room.presenterBroadcast,
    screenStreamId: room.screenStreamId,
    slides: room.slides,
    slideIndex: room.slideIndex,
    chat: room.chat,
    pomo: pomoPublic(room),
    serverNow: Date.now(),
  };
}

function pomoPublic(room) {
  return { ...room.pomo, serverNow: Date.now() };
}

function pushChat(room, msg) {
  room.chat.push(msg);
  if (room.chat.length > 60) room.chat.shift();
  io.to(room.code).emit('chat', msg);
}

function systemMsg(room, text) {
  pushChat(room, { id: Date.now() + Math.random(), system: true, text, t: Date.now() });
}

function releaseSeat(room, playerId) {
  for (const [seatId, pid] of room.seats) if (pid === playerId) room.seats.delete(seatId);
}

function endPresentation(room, reason) {
  if (!room.presenterId) return;
  room.presenterId = null;
  room.screenStreamId = null;
  io.to(room.code).emit('present', presentState(room));
  if (reason) systemMsg(room, reason);
}

function presentState(room) {
  return {
    presenterId: room.presenterId,
    presenterBroadcast: room.presenterBroadcast,
    screenStreamId: room.screenStreamId,
  };
}

// Pomodoro phase switching runs on the server so everybody stays in sync.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const p = room.pomo;
    if (p.running && now >= p.endsAt) {
      const wasFocus = p.phase === 'focus';
      p.phase = wasFocus ? 'break' : 'focus';
      if (!wasFocus) p.cycle += 1;
      const dur = (p.phase === 'focus' ? p.focusMin : p.breakMin) * 60000;
      p.endsAt = now + dur;
      p.remaining = dur;
      io.to(room.code).emit('pomo', { ...pomoPublic(room), chime: true });
      systemMsg(room, wasFocus ? '☕ Focus session done — time for a break!' : '📚 Break over — back to focus!');
    }
    if (room.players.size === 0 && room.emptySince && now - room.emptySince > EMPTY_ROOM_TTL_MS) {
      rooms.delete(room.code);
    }
  }
}, 500);

// ---------- sockets ----------
io.on('connection', (socket) => {
  let room = null;
  let me = null;

  const inRoom = () => room && me && room.players.has(socket.id);

  function join(code, payload, ack) {
    const r = rooms.get(code);
    if (!r) return ack?.({ ok: false, error: 'Room not found. Check the code, or create a new room.' });
    if (r.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: `Room is full (max ${MAX_PLAYERS}).` });
    if (room) leave();

    room = r;
    room.emptySince = null;
    me = {
      id: socket.id,
      name: clampStr(payload?.name, 24) || 'Guest',
      avatar: sanitizeAvatar(payload?.avatar),
      pos: { x: num(payload?.pos?.x, -20, 20, 0), y: 0, z: num(payload?.pos?.z, -20, 20, 4), ry: 0, a: 0 },
      status: 'Available',
      mic: !!payload?.mic,
      cam: !!payload?.cam,
      seat: null,
      streamId: clampStr(payload?.streamId, 100),
      joinedAt: Date.now(),
    };
    room.players.set(socket.id, me);
    socket.join(room.code);
    ack?.({ ok: true, selfId: socket.id, state: roomSnapshot(room) });
    socket.to(room.code).emit('peer:joined', publicPlayer(me));
    systemMsg(room, `${me.name} joined`);
  }

  function leave() {
    if (!room || !me) return;
    const r = room;
    r.players.delete(socket.id);
    releaseSeat(r, socket.id);
    socket.leave(r.code);
    socket.to(r.code).emit('peer:left', { id: socket.id });
    if (r.presenterId === socket.id) endPresentation(r, `${me.name} stopped presenting`);
    systemMsg(r, `${me.name} left`);
    if (r.players.size === 0) r.emptySince = Date.now();
    room = null;
    me = null;
  }

  socket.on('room:create', (payload, ack) => {
    const code = makeCode();
    rooms.set(code, newRoom(code));
    join(code, payload, ack);
  });

  socket.on('room:join', (payload, ack) => {
    const code = clampStr(payload?.code, 8).toUpperCase();
    // After a server restart (e.g. a redeploy) clients transparently re-create their room.
    if (payload?.rejoin && !rooms.has(code) && /^[A-Z2-9]{5}$/.test(code)) rooms.set(code, newRoom(code));
    join(code, payload, ack);
  });

  socket.on('room:leave', (_p, ack) => { leave(); ack?.({ ok: true }); });

  // Movement: relayed at the client's send rate (~15 Hz). Volatile = drop if congested.
  socket.on('s', (s) => {
    if (!inRoom() || !s) return;
    const p = me.pos;
    p.x = num(s.x, -40, 40, p.x);
    p.y = num(s.y, -2, 5, 0);
    p.z = num(s.z, -40, 40, p.z);
    p.ry = num(s.ry, -100, 100, p.ry);
    p.a = num(s.a, 0, 10, 0);
    socket.to(room.code).volatile.emit('s', { id: socket.id, x: p.x, y: p.y, z: p.z, ry: p.ry, a: p.a });
  });

  socket.on('avatar', (avatar) => {
    if (!inRoom()) return;
    me.avatar = sanitizeAvatar(avatar);
    socket.to(room.code).emit('avatar', { id: socket.id, avatar: me.avatar });
  });

  socket.on('profile', (data) => {
    if (!inRoom() || !data) return;
    if ('status' in data) me.status = clampStr(data.status, 24) || 'Available';
    if ('streamId' in data) me.streamId = clampStr(data.streamId, 100);
    if ('mic' in data) me.mic = !!data.mic;
    if ('cam' in data) me.cam = !!data.cam;
    if ('name' in data) me.name = clampStr(data.name, 24) || me.name;
    io.to(room.code).emit('profile', { id: socket.id, status: me.status, mic: me.mic, cam: me.cam, name: me.name, streamId: me.streamId });
  });

  socket.on('seat', (seatId, ack) => {
    if (!inRoom()) return ack?.({ ok: false });
    if (seatId == null) {
      releaseSeat(room, socket.id);
      me.seat = null;
      socket.to(room.code).emit('seat', { id: socket.id, seat: null });
      return ack?.({ ok: true });
    }
    const sid = clampStr(seatId, 24);
    const holder = room.seats.get(sid);
    if (holder && holder !== socket.id && room.players.has(holder)) return ack?.({ ok: false, error: 'Seat taken' });
    releaseSeat(room, socket.id);
    room.seats.set(sid, socket.id);
    me.seat = sid;
    socket.to(room.code).emit('seat', { id: socket.id, seat: sid });
    ack?.({ ok: true });
  });

  socket.on('chat', (text) => {
    if (!inRoom()) return;
    const t = clampStr(text, 500);
    if (!t) return;
    pushChat(room, { id: Date.now() + Math.random(), from: socket.id, name: me.name, text: t, t: Date.now() });
  });

  const EMOJIS = new Set(['👏', '😂', '❤️', '👍', '🎉', '🤔']);
  socket.on('react', (emoji) => {
    if (!inRoom() || !EMOJIS.has(emoji)) return;
    io.to(room.code).emit('react', { id: socket.id, emoji });
  });

  // WebRTC signaling relay (only between members of the same room).
  socket.on('signal', ({ to, data } = {}) => {
    if (!inRoom() || !room.players.has(to)) return;
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // ----- presenter -----
  socket.on('present:claim', (_p, ack) => {
    if (!inRoom()) return ack?.({ ok: false });
    if (room.presenterId && room.presenterId !== socket.id && room.players.has(room.presenterId)) {
      const other = room.players.get(room.presenterId);
      return ack?.({ ok: false, error: `${other.name} is presenting right now.` });
    }
    const wasPresenter = room.presenterId === socket.id;
    room.presenterId = socket.id;
    room.presenterBroadcast = true;
    io.to(room.code).emit('present', presentState(room));
    if (!wasPresenter) systemMsg(room, `🎤 ${me.name} started presenting`);
    ack?.({ ok: true });
  });

  socket.on('present:release', () => {
    if (inRoom() && room.presenterId === socket.id) endPresentation(room, `${me.name} stopped presenting`);
  });

  socket.on('present:broadcast', (on) => {
    if (!inRoom() || room.presenterId !== socket.id) return;
    room.presenterBroadcast = !!on;
    io.to(room.code).emit('present', presentState(room));
  });

  socket.on('screen:start', (streamId) => {
    if (!inRoom() || room.presenterId !== socket.id) return;
    room.screenStreamId = clampStr(streamId, 100) || null;
    io.to(room.code).emit('present', presentState(room));
  });

  socket.on('screen:stop', () => {
    if (!inRoom() || room.presenterId !== socket.id) return;
    room.screenStreamId = null;
    io.to(room.code).emit('present', presentState(room));
  });

  socket.on('slides:set', (images, ack) => {
    if (!inRoom() || room.presenterId !== socket.id) return ack?.({ ok: false, error: 'Only the presenter can upload slides.' });
    if (!Array.isArray(images)) return ack?.({ ok: false, error: 'Bad upload' });
    const list = images.slice(0, MAX_SLIDES).filter((s) => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(s));
    const bytes = list.reduce((n, s) => n + s.length, 0);
    if (bytes > MAX_SLIDES_BYTES) return ack?.({ ok: false, error: 'Slides are too large (40 MB max).' });
    room.slides = list;
    room.slideIndex = 0;
    io.to(room.code).emit('slides', { slides: room.slides, index: 0 });
    ack?.({ ok: true, count: list.length });
  });

  socket.on('slides:goto', (index) => {
    if (!inRoom() || room.presenterId !== socket.id || !room.slides.length) return;
    room.slideIndex = Math.round(num(index, 0, room.slides.length - 1, 0));
    io.to(room.code).emit('slides:index', room.slideIndex);
  });

  socket.on('slides:clear', () => {
    if (!inRoom() || room.presenterId !== socket.id) return;
    room.slides = [];
    room.slideIndex = 0;
    io.to(room.code).emit('slides', { slides: [], index: 0 });
  });

  // ----- Pomodoro (anyone in the room can control it) -----
  socket.on('pomo', (cmd) => {
    if (!inRoom() || !cmd) return;
    const p = room.pomo;
    const now = Date.now();
    const phaseDur = () => (p.phase === 'focus' ? p.focusMin : p.breakMin) * 60000;
    switch (cmd.action) {
      case 'start':
        if (!p.running) { p.running = true; p.endsAt = now + p.remaining; }
        break;
      case 'pause':
        if (p.running) { p.running = false; p.remaining = Math.max(0, p.endsAt - now); }
        break;
      case 'reset':
        p.running = false; p.phase = 'focus'; p.cycle = 1; p.remaining = p.focusMin * 60000;
        break;
      case 'skip':
        p.phase = p.phase === 'focus' ? 'break' : 'focus';
        if (p.phase === 'focus') p.cycle += 1;
        p.remaining = phaseDur();
        if (p.running) p.endsAt = now + p.remaining;
        break;
      case 'config':
        p.focusMin = Math.round(num(cmd.focusMin, 1, 120, 25));
        p.breakMin = Math.round(num(cmd.breakMin, 1, 60, 5));
        p.running = false; p.remaining = phaseDur();
        break;
      default: return;
    }
    io.to(room.code).emit('pomo', { ...pomoPublic(room), by: me.name, action: cmd.action });
  });

  socket.on('disconnect', () => leave());
});

server.listen(PORT, () => {
  console.log(`Study Office 3D running on http://localhost:${PORT}`);
});
