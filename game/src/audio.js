// All sound is synthesized with WebAudio — no audio files.
// The context is created on the first user gesture.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.6);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, when = 0) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    step(sneaking) {
      tone(sneaking ? 90 : 120, 0.06, 'triangle', sneaking ? 0.05 : 0.09);
    },
    alarm() {
      tone(660, 0.16, 'square', 0.12);
      tone(880, 0.22, 'square', 0.12, 0.16);
    },
    coinThrow() {
      tone(1200, 0.07, 'sine', 0.08);
    },
    coinLand() {
      tone(1560, 0.09, 'sine', 0.14);
      tone(2090, 0.14, 'sine', 0.12, 0.07);
    },
    shard() {
      tone(880, 0.1, 'sine', 0.14);
      tone(1318, 0.16, 'sine', 0.12, 0.08);
    },
    door() {
      tone(523, 0.12, 'sine', 0.12);
      tone(659, 0.12, 'sine', 0.12, 0.1);
      tone(784, 0.2, 'sine', 0.12, 0.2);
    },
    caught() {
      tone(220, 0.3, 'sawtooth', 0.14, 0, 110);
      tone(165, 0.4, 'sawtooth', 0.14, 0.22, 82);
    },
    smoke() {
      noise(0.5, 0.16, 900);
    },
    douse() {
      noise(0.25, 0.12, 1400);
      tone(520, 0.3, 'sine', 0.1, 0.05, 240);
    },
    tripwire() {
      tone(1240, 0.09, 'square', 0.14);
      tone(1240, 0.09, 'square', 0.14, 0.12);
    },
  };
}
