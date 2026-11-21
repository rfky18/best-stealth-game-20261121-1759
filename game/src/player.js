// EMBERWATCH: Night Shift — player.js
// Gerak Wren, lempar koin, bom asap, padamkan lampu, pungut shard,
// skor, TAKE $, pintu EXIT, respawn setelah tertangkap.

import {
  WALK_SPEED, SNEAK_SPEED, PLAYER_R, PICKUP_R,
  COIN_THROW_MAX, COIN_FLY_TIME, COIN_HEAR_R,
  SMOKE_R, SMOKE_TIME, DOUSE_R,
  SHARD_PTS, SHARD_VALUE, CLOSE_CALL_PTS, FLOOR_PTS,
} from './config.js';
import {
  dist, clamp, collideCircle, inSmoke, lampAt, inShadow,
  addEvent, showToast, shardsLeft, exitIsOpen,
} from './world.js';
import { guardsHearCoin } from './guard.js';

export function newPlayer(floor) {
  return {
    x: floor.start.x,
    y: floor.start.y,
    face: 0,
    sneaking: false,
    running: false,
    moving: false,
    rippleT: 0,
    stepT: 0,
  };
}

// Gerak dari input {dx, dy} ternormalisasi; sneaking dari Shift.
export function updatePlayer(player, input, state, dt, sfx) {
  const mag = Math.hypot(input.dx, input.dy);
  player.moving = mag > 0.01;
  player.sneaking = !!input.sneak;
  player.running = player.moving && !player.sneaking;
  if (player.moving) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = input.dx / (mag || 1), ny = input.dy / (mag || 1);
    player.face = Math.atan2(ny, nx);
    player.x += nx * speed * dt;
    player.y += ny * speed * dt;
    collideCircle(player, PLAYER_R, state.blocks);
    player.x = clamp(player.x, 14 + PLAYER_R, 994 - PLAYER_R);
    player.y = clamp(player.y, 56 + 14 + PLAYER_R, 706 - PLAYER_R);
    // Riak langkah + bunyi kaki (lebih pelan saat menyelinap).
    player.rippleT -= dt;
    if (player.rippleT <= 0) {
      player.rippleT = player.sneaking ? 0.5 : 0.34;
      state.ripples.push({
        x: player.x, y: player.y, r: 2, max: player.sneaking ? 12 : 20,
        ttl: 0.8, t: 0, color: '#2dd4bf',
      });
    }
    player.stepT -= dt;
    if (player.stepT <= 0) {
      player.stepT = player.sneaking ? 0.5 : 0.34;
      if (sfx) sfx.step(player.sneaking);
    }
  }
}

// Lempar koin ke (tx,ty): koin melayang 0,35 detik lalu mendarat.
export function throwCoin(player, state, tx, ty, sfx) {
  if (state.coins <= 0) return false;
  const d = dist(player.x, player.y, tx, ty);
  if (d > COIN_THROW_MAX) {
    tx = player.x + ((tx - player.x) / d) * COIN_THROW_MAX;
    ty = player.y + ((ty - player.y) / d) * COIN_THROW_MAX;
  }
  tx = clamp(tx, 20, 988);
  ty = clamp(ty, 76, 700);
  state.coins -= 1;
  state.coinsFlying.push({
    sx: player.x, sy: player.y, tx, ty, t: 0, dur: COIN_FLY_TIME,
  });
  if (sfx) sfx.coinThrow();
  return true;
}

// Koin yang sedang melayang: update, saat mendarat bunyi + guard mendengar.
export function updateCoins(state, dt, sfx) {
  for (let i = state.coinsFlying.length - 1; i >= 0; i--) {
    const c = state.coinsFlying[i];
    c.t += dt;
    if (c.t >= c.dur) {
      state.coinsFlying.splice(i, 1);
      state.coinsLanded.push({ x: c.tx, y: c.ty, t: 0, ping: 0 });
      state.coinNoiseT = 1.2;
      if (sfx) sfx.coinLand();
      guardsHearCoin(state, c.tx, c.ty);
    }
  }
  for (let i = state.coinsLanded.length - 1; i >= 0; i--) {
    const c = state.coinsLanded[i];
    c.t += dt;
    c.ping = Math.min(1, c.t / 0.6);
    if (c.t > 2.2) state.coinsLanded.splice(i, 1);
  }
}

// Bom asap di kaki Wren (2 per lantai).
export function dropSmoke(player, state, sfx) {
  if (state.smokesLeft <= 0) return false;
  state.smokesLeft -= 1;
  state.smokes.push({ x: player.x, y: player.y, r: SMOKE_R, ttl: SMOKE_TIME, t: 0 });
  addEvent(state, 'Smoke out — cones go blind.');
  if (sfx) sfx.smoke();
  return true;
}

export function updateSmokes(state, dt) {
  for (let i = state.smokes.length - 1; i >= 0; i--) {
    const s = state.smokes[i];
    s.t += dt;
    if (s.t >= s.ttl) state.smokes.splice(i, 1);
  }
}

// Padamkan lampu terdekat dalam jarak 100 (mati sisa lantai).
export function douseLamp(player, state, sfx) {
  let best = null, bestD = DOUSE_R;
  for (const l of state.lampsOn) {
    const d = dist(player.x, player.y, l.x, l.y);
    if (d < bestD) { best = l; bestD = d; }
  }
  if (!best) return false;
  state.lampsOn = state.lampsOn.filter((l) => l !== best);
  addEvent(state, 'Lamp doused. Darkness helps.');
  if (sfx) sfx.douse();
  return true;
}

// Pungut shard di bawah kaki; buka exit kalau sudah lengkap.
export function updateShards(player, state, sfx) {
  for (const s of state.shards) {
    if (!s.got && dist(player.x, player.y, s.x, s.y) < PICKUP_R) {
      s.got = true;
      state.score += SHARD_PTS;
      state.take += SHARD_VALUE;
      state.lootTotal += 1;
      addEvent(state, 'Ember shard pocketed.');
      if (sfx) sfx.shard();
      if (shardsLeft(state) === 0) {
        addEvent(state, 'The exit stands open. Go!');
        if (sfx) sfx.door();
      }
    }
  }
}

// Wren di dalam persegi exit?
export function atExit(player, state) {
  const e = state.floor.exit;
  return player.x > e.x && player.x < e.x + e.w &&
    player.y > e.y && player.y < e.y + e.h;
}

// Lantai selesai: +200 poin, tandai malam selesai.
export function completeFloor(state) {
  state.score += FLOOR_PTS;
  state.floorDone = true;
  state.nightDone[state.floorIdx] = true;
}

// Tertangkap: nyawa -1, kembali ke pintu masuk, guard tenang.
export function respawnAfterCatch(state, player, sfx) {
  state.lives -= 1;
  state.caughtFlash = 1.4;
  player.x = state.floor.start.x;
  player.y = state.floor.start.y;
  player.face = 0;
  for (const g of state.guards) {
    g.suspicion = 18;
    g.peak = 0;
    g.state = 'patrol';
    g.lastSeen = null;
    g.lookT = 0;
    g.blindT = 0;
  }
  for (const c of state.cameras) c.alert = 0;
  addEvent(state, 'Caught! Back to the door.');
  if (sfx) sfx.caught();
  if (state.lives <= 0) state.over = true;
}

// Near-miss: guard melewati suspicion 45 lalu pulih di bawah 15
// tanpa pernah mengejar -> satu close call (+50) + toast.
export function updateNearMiss(state, sfx) {
  for (const g of state.guards) {
    if (g.hadChase) continue;
    if (g.peak >= 45 && g.suspicion < 15) {
      state.closeCalls += 1;
      state.score += CLOSE_CALL_PTS;
      state.nearMissPct = Math.round(g.peak);
      addEvent(state, 'Close call — almost had you.');
      showToast(state, 'CLOSE CALL!', 1.6);
      if (sfx) sfx.closeCall();
      g.peak = 0;
    }
    if (g.suspicion < 15) g.peak = Math.min(g.peak, g.suspicion);
  }
}

// Status Wren untuk label di bawahnya.
export function playerZoneWord(player, state) {
  if (inSmoke(player.x, player.y, state)) return { word: 'IN SMOKE', color: '#c7d2e8' };
  if (lampAt(player.x, player.y, state)) return { word: 'IN THE LIGHT!', color: '#ff9f43' };
  if (inShadow(player.x, player.y, state.floor)) return { word: 'HIDDEN', color: '#74c0fc' };
  return { word: '', color: '#c7d2e8' };
}

// Apakah Wren sedang berlari (untuk cincin noise + exposure).
export function isRunning(player) {
  return player.moving && !player.sneaking;
}
