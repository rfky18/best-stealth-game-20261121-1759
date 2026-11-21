// All sound is synthesized with WebAudio: no audio files, no network.
// Footsteps are short filtered ticks, the alarm is a two-tone siren blip,
// a shard pickup is a bright pluck, and winning is a small rising arpeggio.
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

/** A soft footstep tick; pitch drops when sneaking. */
export function playFootstep(sneaking) {
  tone(sneaking ? 140 : 210, 0.07, 'triangle', sneaking ? 0.03 : 0.06);
}

/** The two-tone alarm when a guard breaks into a chase. */
export function playAlarm() {
  tone(620, 0.16, 'square', 0.05);
  tone(830, 0.2, 'square', 0.05, 0.17);
}

/** Bright pluck when Wren pockets an ember shard. */
export function playShard() {
  tone(880, 0.12, 'sine', 0.07);
  tone(1318, 0.18, 'sine', 0.05, 0.08);
}

/** The door unlocking once the last shard is pocketed. */
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
