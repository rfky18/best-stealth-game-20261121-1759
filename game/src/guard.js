// EMBERWATCH: Night Shift — guard.js
// Patroli, vision cone, suspicion, state machine guard,
// dengar koin, respon tripwire/kamera/laser, tertangkap, suspicion tertinggi.

import {
  CONE_RANGE, CONE_HALF, CONE_SLICES, GUARD_R, CATCH_R,
  CHASE_SPEED, CHASE_SPEED_VAULT, CURIOUS_SPEED, SUSP_LOOKBACK,
  SUSP_DECAY, SUSP_BRIGHT, SUSP_SHADOW, SUSP_LAMP, SUSP_CLOSE,
  SUSP_RUN, SUSP_FOOTSTEP, FOOTSTEP_R, SUSP_COIN_MIN,
} from './config.js';
import {
  dist, angDiff, raycast, losClear, losBlockedBySmoke,
  inShadow, lampAt, inSmoke, collideCircle, addEvent, showToast,
} from './world.js';

// Apakah guard bisa melihat Wren sekarang (cone + garis pandang + asap).
export function guardSees(g, state, px, py) {
  const d = dist(g.x, g.y, px, py);
  if (d > CONE_RANGE) return false;
  const ang = Math.atan2(py - g.y, px - g.x);
  if (Math.abs(angDiff(ang, g.face)) > CONE_HALF) return false;
  if (!losClear(g.x, g.y, px, py, state.blocks)) return false;
  if (inSmoke(px, py, state)) return false;
  if (losBlockedBySmoke(g.x, g.y, px, py, state.smokes)) return false;
  return true;
}

// Titik-titik poligon cone untuk digambar (raycast 64 irisan).
export function conePoints(g, state) {
  const pts = [{ x: g.x, y: g.y }];
  for (let i = 0; i <= CONE_SLICES; i++) {
    const a = g.face - CONE_HALF + (2 * CONE_HALF * i) / CONE_SLICES;
    const r = raycast(g.x, g.y, a, CONE_RANGE, state.blocks);
    pts.push({ x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r });
  }
  return pts;
}

// Warna cone menurut tahap.
export function coneColor(g) {
  if (g.state === 'chase') return 'rgba(255,60,60,0.34)';
  if (g.state === 'curious') return 'rgba(255,150,40,0.30)';
  if (g.suspicion >= 60) return 'rgba(255,170,40,0.28)';
  return 'rgba(255,230,140,0.20)';
}

export function guardWord(g) {
  if (g.state === 'chase') return 'CHASING';
  if (g.state === 'curious') return 'CURIOUS';
  if (g.suspicion >= 60) return 'SUSPICIOUS';
  return 'PATROL';
}

// Gerakkan guard menuju titik dengan kecepatan v; true kalau sudah sampai.
function moveToward(g, tx, ty, v, dt, state) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 4) return true;
  const step = Math.min(d, v * dt);
  g.face = Math.atan2(ty - g.y, tx - g.x);
  g.x += ((tx - g.x) / d) * step;
  g.y += ((ty - g.y) / d) * step;
  collideCircle(g, GUARD_R, state.blocks);
  return d - step < 4;
}

// Satu guard, satu langkah dt. player = {x, y, running, hidden}.
export function updateGuard(g, state, player, dt, onCaught, sfx) {
  const sees = guardSees(g, state, player.x, player.y);
  const dPlayer = dist(g.x, g.y, player.x, player.y);

  // --- suspicion naik / turun ---
  if (sees) {
    let rate = inShadow(player.x, player.y, state.floor) ? SUSP_SHADOW : SUSP_BRIGHT;
    if (lampAt(player.x, player.y, state)) rate += SUSP_LAMP;
    if (dPlayer < 70) rate += SUSP_CLOSE;
    if (player.running) rate += SUSP_RUN;
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    g.blindT = 0;
  } else {
    g.suspicion = Math.max(0, g.suspicion - SUSP_DECAY * dt);
    g.blindT += dt;
    // Langkah lari terdengar dari dekat.
    if (player.running && dPlayer < FOOTSTEP_R) {
      g.suspicion = Math.min(100, g.suspicion + SUSP_FOOTSTEP * dt);
      if (!g.lastSeen) g.lastSeen = { x: player.x, y: player.y };
    }
  }
  if (g.suspicion > g.peak) g.peak = g.suspicion;

  // --- transisi tahap ---
  if (g.suspicion >= 92 && g.state !== 'chase') {
    g.state = 'chase';
    g.hadChase = true;
    state.spotted += 1;
    addEvent(state, g.name + ': WHAT WAS THAT?');
    showToast(state, 'SPOTTED!', 1.2);
    if (sfx) sfx.alarm();
  } else if (g.suspicion >= 60 && g.state === 'patrol') {
    g.state = 'curious';
    g.lookT = 0;
  }

  // --- perilaku per tahap ---
  if (g.state === 'chase') {
    const v = state.floorIdx === 2 ? CHASE_SPEED_VAULT : CHASE_SPEED;
    moveToward(g, player.x, player.y, v, dt, state);
    if (!sees && g.blindT > SUSP_LOOKBACK) {
      g.state = 'curious';
      g.lookT = 0;
    }
    if (dPlayer < CATCH_R) {
      if (onCaught) onCaught(g);
      return;
    }
  } else if (g.state === 'curious') {
    const tgt = g.lastSeen || { x: g.x, y: g.y };
    if (dist(g.x, g.y, tgt.x, tgt.y) > 6) {
      moveToward(g, tgt.x, tgt.y, CURIOUS_SPEED, dt, state);
    } else {
      // Sampai di titik: melihat-lihat 1,4 detik, lalu tenang.
      g.lookT += dt;
      g.face += Math.sin(state.time * 2.2 + g.sweepT) * 0.9 * dt;
      if (g.lookT > 1.4) {
        g.state = 'patrol';
        g.suspicion = Math.min(g.suspicion, 45);
      }
    }
    if (!sees && g.blindT > SUSP_LOOKBACK && g.suspicion < 60) {
      g.state = 'patrol';
    }
  } else {
    // Patroli: waypoint, jeda + sapu pandang di tiap titik.
    if (g.waiting > 0) {
      g.waiting -= dt;
      g.face += Math.sin(state.time * 0.9 + g.sweepT) * 0.55 * dt;
    } else {
      const wp = g.wps[g.wpIdx];
      if (moveToward(g, wp.x, wp.y, g.speed, dt, state)) {
        g.waiting = g.pause;
        g.wpIdx = (g.wpIdx + 1) % g.wps.length;
      }
    }
  }

  // Riak langkah guard (jejak yang terlihat).
  g.rippleT = (g.rippleT || 0) - dt;
  if (g.rippleT <= 0) {
    g.rippleT = 0.55;
    state.ripples.push({ x: g.x, y: g.y, r: 4, max: 26, ttl: 0.9, t: 0, color: g.color });
  }
}

// Koin mendarat: guard dalam radius dengar jadi waspada ke titik koin.
export function guardsHearCoin(state, cx, cy) {
  for (const g of state.guards) {
    if (dist(g.x, g.y, cx, cy) < 280) {
      g.suspicion = Math.max(g.suspicion, SUSP_COIN_MIN);
      if (g.state === 'patrol') g.state = 'curious';
      g.lastSeen = { x: cx, y: cy };
      g.lookT = 0;
    }
  }
}

// Semua guard naik suspicion dan menuju satu titik (alarm kamera / laser / wire).
export function guardsAlertAll(state, tx, ty, amount) {
  for (const g of state.guards) {
    g.suspicion = Math.min(100, g.suspicion + amount);
    if (g.state === 'patrol') g.state = 'curious';
    g.lastSeen = { x: tx, y: ty };
    g.lookT = 0;
  }
}

// Suspicion guard tertinggi saat ini (untuk alarm meter).
export function maxSuspicion(state) {
  let m = 0;
  for (const g of state.guards) m = Math.max(m, g.suspicion);
  return m;
}

// Tahap alarm dari suspicion tertinggi: 0 CALM, 1 UNEASY, 2 HUNTED, 3 ALARM.
export function alarmStage(state) {
  const m = maxSuspicion(state);
  if (m >= 92) return 3;
  if (m >= 60) return 2;
  if (m >= 30) return 1;
  return 0;
}
