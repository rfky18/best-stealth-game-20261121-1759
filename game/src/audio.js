// EMBERWATCH: Night Shift — audio.js
// Semua bunyi disintesis WebAudio, tanpa file.
// AudioContext dibuat saat interaksi pertama; M membisukan.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, when, lowpass) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.15;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass || 1200;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
    step(sneak) {
      tone(sneak ? 70 : 95, 0.07, 'triangle', sneak ? 0.05 : 0.09);
    },
    coinThrow() { tone(1400, 0.08, 'sine', 0.12); },
    coinLand() {
      tone(1800, 0.09, 'sine', 0.18);
      tone(2400, 0.12, 'sine', 0.14, 0.07);
    },
    shard() {
      tone(880, 0.1, 'sine', 0.2);
      tone(1320, 0.16, 'sine', 0.18, 0.08);
    },
    door() {
      tone(523, 0.12, 'sine', 0.18);
      tone(659, 0.12, 'sine', 0.18, 0.1);
      tone(784, 0.2, 'sine', 0.2, 0.2);
    },
    alarm() {
      tone(660, 0.16, 'square', 0.14);
      tone(440, 0.22, 'square', 0.14, 0.16);
    },
    camAlarm() {
      tone(880, 0.09, 'square', 0.13);
      tone(1108, 0.09, 'square', 0.13, 0.09);
      tone(1318, 0.14, 'square', 0.13, 0.18);
    },
    laserTrip() {
      tone(2000, 0.12, 'square', 0.16);
      noise(0.25, 0.1, 0.05, 3000);
    },
    smoke() { noise(0.5, 0.16, 0, 900); },
    douse() {
      noise(0.25, 0.12, 0, 700);
      tone(300, 0.25, 'sine', 0.12, 0.05, 120);
    },
    tripwire() {
      tone(1500, 0.08, 'square', 0.15);
      tone(1100, 0.12, 'square', 0.15, 0.08);
    },
    closeCall() {
      tone(1046, 0.1, 'sine', 0.14);
      tone(1568, 0.14, 'sine', 0.12, 0.08);
    },
    caught() {
      tone(220, 0.3, 'sawtooth', 0.2, 0, 110);
      tone(165, 0.4, 'sawtooth', 0.2, 0.22, 82);
    },
    win() {
      tone(523, 0.14, 'sine', 0.18);
      tone(659, 0.14, 'sine', 0.18, 0.12);
      tone(784, 0.14, 'sine', 0.18, 0.24);
      tone(1046, 0.3, 'sine', 0.2, 0.36);
    },
  };
}
