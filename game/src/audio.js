// audio.js — all sounds synthesized with WebAudio, no files.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensureCtx();
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
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, vol, when = 0) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1200;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export function playSound(name) {
  ensureCtx();
  switch (name) {
    case 'step': tone(140, 0.06, 'triangle', 0.05); break;
    case 'sneakStep': tone(95, 0.05, 'triangle', 0.03); break;
    case 'coin': tone(1568, 0.09, 'sine', 0.12); tone(2093, 0.12, 'sine', 0.1, 0.07); break;
    case 'coinLand': tone(1200, 0.07, 'sine', 0.09); break;
    case 'shard': tone(880, 0.1, 'sine', 0.12); tone(1318, 0.14, 'sine', 0.1, 0.08); break;
    case 'door': tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.1); tone(784, 0.18, 'sine', 0.12, 0.2); break;
    case 'alarm': tone(660, 0.16, 'square', 0.08); tone(440, 0.16, 'square', 0.08, 0.16); break;
    case 'camAlarm': tone(880, 0.09, 'square', 0.08); tone(1108, 0.09, 'square', 0.08, 0.09); tone(1318, 0.12, 'square', 0.08, 0.18); break;
    case 'caught': tone(220, 0.3, 'sawtooth', 0.12, 0, 110); tone(165, 0.35, 'sawtooth', 0.12, 0.25, 82); break;
    case 'smoke': noise(0.5, 0.12); break;
    case 'douse': noise(0.25, 0.1); tone(440, 0.25, 'sine', 0.08, 0.05, 220); break;
    case 'wire': tone(1400, 0.08, 'square', 0.1); tone(1050, 0.1, 'square', 0.1, 0.09); break;
    case 'laser': tone(1800, 0.1, 'square', 0.1); noise(0.2, 0.08, 0.05); break;
    case 'win': tone(523, 0.15, 'sine', 0.12); tone(659, 0.15, 'sine', 0.12, 0.12); tone(784, 0.2, 'sine', 0.12, 0.24); tone(1046, 0.3, 'sine', 0.12, 0.36); break;
    default: break;
  }
}
