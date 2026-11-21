// All sound is synthesized with WebAudio: no audio files, no network.
// Footsteps are short filtered ticks, the alarm is a two-tone siren blip,
// a coin toss is a bright metallic clink, a shard pickup is a pluck, a
// smoke bomb is a soft hiss, a doused lamp is a snuffed sigh, a tripped
// wire is a sharp zap, and winning is a small rising arpeggio.
let ctx = null;
let muted = false;

/** Create (or resume) the audio context on the first user gesture. */
export function ensureAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gainValue, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Audio is decoration; a failure here never stops the game.
  }
}

/** Filtered noise burst: a smoke hiss, a snuffed lamp, a tripped wire. */
function noiseBurst(dur, gainValue, freq, when = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  } catch {
    // Audio is decoration; a failure here never stops the game.
  }
}

/** A soft footstep tick; pitch drops when sneaking. */
export function playFootstep(sneaking) {
  tone(sneaking ? 140 : 210, 0.07, 'triangle', sneaking ? 0.03 : 0.06);
}

/** The two-tone alarm when a guard breaks into a chase. */
export function playAlarm() {
  tone(620, 0.16, 'square', 0.05);
  tone(830, 0.2, 'square', 0.05, 0.17);
}

/** The metallic clink of a tossed coin landing on stone. */
export function playCoin() {
  tone(2093, 0.09, 'sine', 0.06);
  tone(2637, 0.14, 'sine', 0.04, 0.05);
}

/** Bright pluck when Wren pockets an ember shard. */
export function playShard() {
  tone(880, 0.12, 'sine', 0.07);
  tone(1318, 0.18, 'sine', 0.05, 0.08);
}

/** The door unlocking once the last shard of a floor is pocketed. */
export function playUnlock() {
  tone(392, 0.12, 'sine', 0.06);
  tone(523, 0.12, 'sine', 0.06, 0.1);
  tone(659, 0.22, 'sine', 0.06, 0.2);
}

/** A low thud when a guard catches Wren. */
export function playCaught() {
  tone(110, 0.3, 'sawtooth', 0.08);
  tone(82, 0.35, 'sawtooth', 0.07, 0.12);
}

/** The soft hiss of a smoke bomb going off at Wren's feet. */
export function playSmoke() {
  noiseBurst(0.5, 0.09, 900);
}

/** The snuffed sigh of a lamp going dark. */
export function playDouse() {
  noiseBurst(0.35, 0.07, 500);
  tone(330, 0.25, 'sine', 0.04, 0.05);
}

/** The sharp zap of a tripwire being crossed. */
export function playTripwire() {
  tone(1244, 0.08, 'square', 0.06);
  tone(932, 0.14, 'square', 0.05, 0.07);
}
