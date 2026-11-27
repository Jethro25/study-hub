// WebRTC peer-to-peer mesh using the "perfect negotiation" pattern.
// Every pair of players gets one RTCPeerConnection carrying camera+mic, and
// (when someone presents) their screen-share track as a second stream.

export class RTCMesh {
  /**
   * @param {object} o
   * @param {(to:string, data:any)=>void} o.signal send signaling data to a peer
   * @param {string} o.selfId
   * @param {RTCIceServer[]} o.iceServers
   * @param {(peerId:string, stream:MediaStream)=>void} o.onStream fired whenever a remote stream gains a track
   * @param {(peerId:string, state:string)=>void} [o.onState]
   */
  constructor({ signal, selfId, iceServers, onStream, onState }) {
    this.signal = signal;
    this.selfId = selfId;
    this.iceServers = iceServers;
    this.onStream = onStream;
    this.onState = onState || (() => {});
    this.peers = new Map();
    this.localStream = new MediaStream();
    this.screenStream = null;
  }

  setSelfId(id) { this.selfId = id; }

  _track(kind) { return this.localStream.getTracks().find((t) => t.kind === kind) || null; }

  addPeer(id) {
    if (this.peers.has(id)) return this.peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = {
      id, pc,
      polite: this.selfId > id, // deterministic: exactly one side is polite
      makingOffer: false,
      ignoreOffer: false,
      settingAnswer: false,
      senders: { audio: null, video: null },
      screenSenders: [],
      streams: new Map(),
      restartTimer: null,
      queue: Promise.resolve(), // signaling messages are applied strictly in order
      pendingCandidates: [],
      watchdog: null,
    };
    this.peers.set(id, peer);

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.signal(id, { description: pc.localDescription });
      } catch (e) {
        console.warn('[rtc] negotiation failed', e);
      } finally {
        peer.makingOffer = false;
      }
    };
    pc.onicecandidate = ({ candidate }) => { if (candidate) this.signal(id, { candidate }); };
    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      peer.streams.set(stream.id, stream);
      this.onStream(id, stream);
      ev.track.addEventListener('unmute', () => this.onStream(id, stream));
      stream.addEventListener?.('removetrack', () => this.onStream(id, stream));
    };
    // If the call hasn't come up after a while (lost candidates, flaky network), restart ICE.
    const armWatchdog = (ms = 10000) => {
      clearTimeout(peer.watchdog);
      peer.watchdog = setTimeout(() => {
        if (!this.peers.has(id) || pc.connectionState === 'connected' || pc.connectionState === 'closed') return;
        if (!pc.remoteDescription) return armWatchdog(ms);
        console.warn('[rtc] connection stuck in', pc.connectionState, '- restarting ICE');
        try { pc.restartIce(); } catch { /* ignore */ }
        armWatchdog(Math.min(ms * 1.5, 30000));
      }, ms);
    };
    peer.armWatchdog = armWatchdog;
    armWatchdog();
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      this.onState(id, st);
      clearTimeout(peer.restartTimer);
      if (st === 'connected') clearTimeout(peer.watchdog);
      else if (st !== 'closed') armWatchdog();
      if (st === 'failed') {
        try { pc.restartIce(); } catch { /* old browsers */ }
      } else if (st === 'disconnected') {
        // give it a few seconds to recover by itself, then restart ICE
        peer.restartTimer = setTimeout(() => {
          if (pc.connectionState === 'disconnected') { try { pc.restartIce(); } catch { /* ignore */ } }
        }, 4000);
      }
    };

    // Send what we already have.
    const a = this._track('audio');
    const v = this._track('video');
    if (a) peer.senders.audio = pc.addTrack(a, this.localStream);
    if (v) peer.senders.video = pc.addTrack(v, this.localStream);
    if (this.screenStream) {
      for (const t of this.screenStream.getTracks()) peer.screenSenders.push(pc.addTrack(t, this.screenStream));
    }
    return peer;
  }

  removePeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    clearTimeout(peer.restartTimer);
    clearTimeout(peer.watchdog);
    try { peer.pc.close(); } catch { /* ignore */ }
    this.peers.delete(id);
  }

  closeAll() {
    for (const id of [...this.peers.keys()]) this.removePeer(id);
  }

  handleSignal(from, data) {
    const peer = this.peers.get(from) || this.addPeer(from);
    // Chain onto the peer's queue so a candidate is never applied before the description it belongs to.
    peer.queue = peer.queue.then(() => this._applySignal(peer, from, data)).catch((e) => console.warn('[rtc] signal error', e));
    return peer.queue;
  }

  async _applySignal(peer, from, data) {
    const pc = peer.pc;
    if (pc.signalingState === 'closed') return;
    try {
      if (data.description) {
        const description = data.description;
        const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.settingAnswer);
        const offerCollision = description.type === 'offer' && !readyForOffer;
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;
        peer.settingAnswer = description.type === 'answer';
        await pc.setRemoteDescription(description);
        peer.settingAnswer = false;
        // candidates that arrived before any remote description
        for (const c of peer.pendingCandidates.splice(0)) { try { await pc.addIceCandidate(c); } catch { /* stale */ } }
        if (description.type === 'offer') {
          await pc.setLocalDescription();
          this.signal(from, { description: pc.localDescription });
        }
      } else if (data.candidate) {
        if (!pc.remoteDescription) { if (!peer.ignoreOffer) peer.pendingCandidates.push(data.candidate); return; }
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          if (!peer.ignoreOffer) console.warn('[rtc] addIceCandidate', e);
        }
      }
    } catch (e) {
      console.warn('[rtc] signal error', e);
    }
  }

  /** Replace (or add) the local camera/mic track for everyone. Pass null to stop sending. */
  setTrack(kind, track) {
    const old = this._track(kind);
    if (old && old !== track) this.localStream.removeTrack(old);
    if (track && !this.localStream.getTracks().includes(track)) this.localStream.addTrack(track);
    for (const peer of this.peers.values()) {
      const sender = peer.senders[kind];
      if (sender) {
        sender.replaceTrack(track).catch((e) => console.warn('[rtc] replaceTrack', e));
      } else if (track) {
        peer.senders[kind] = peer.pc.addTrack(track, this.localStream);
      }
    }
  }

  startScreen(stream) {
    this.stopScreen();
    this.screenStream = stream;
    for (const peer of this.peers.values()) {
      for (const t of stream.getTracks()) peer.screenSenders.push(peer.pc.addTrack(t, stream));
    }
  }

  stopScreen() {
    if (!this.screenStream) return;
    for (const peer of this.peers.values()) {
      for (const s of peer.screenSenders) { try { peer.pc.removeTrack(s); } catch { /* closed */ } }
      peer.screenSenders = [];
    }
    for (const t of this.screenStream.getTracks()) t.stop();
    this.screenStream = null;
  }

  getStream(peerId, streamId) {
    return this.peers.get(peerId)?.streams.get(streamId) || null;
  }

  stats() {
    return [...this.peers.values()].map((p) => ({ id: p.id, state: p.pc.connectionState, streams: [...p.streams.keys()] }));
  }
}
