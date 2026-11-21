// player.js — Wren's movement, coin throws, smoke bombs, dousing lamps,
// shard pickups, score, take, exit and respawn.

import {
  WALK_SPEED, SNEAK_SPEED, COIN_THROW_MAX, SHARD_PICKUP_DIST,
  SHARD_SCORE, SHARD_TAKE, FLOOR_SCORE, SMOKE_RADIUS, SMOKE_DURATION,
  DOUSE_RANGE, TOTAL_SHARDS,
} from './config.js';
import {
  clamp, dist, collideCircle, inSmoke, pushEvent, showToast, addRipple,
} from './world.js';
import { hearCoin } from './guard.js';

export function movePlayer(state, input, dt) {
  const p = state.player;
  let dx = 0, dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  p.moving = dx !== 0 || dy !== 0;
  p.sneaking = !!input.sneak;
  p.running = p.moving && !p.sneaking;
  if (!p.moving) return;
  const len = Math.hypot(dx, dy);
  const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
  const nx = p.x + (dx / len) * speed * dt;
  const ny = p.y + (dy / len) * speed * dt;
  p.facing = Math.atan2(dy, dx);
  const [cx, cy] = collideCircle(state.floor, nx, ny, 13);
  p.x = cx; p.y = cy;
  // Footstep ripples + noise ring while running.
  state._rippleT = (state._rippleT || 0) - dt;
  if (state._rippleT <= 0) {
    addRipple(state, p.x, p.y, p.running ? 30 : 16, 0.8);
    state._rippleT = p.running ? 0.32 : 0.5;
  }
}

export function throwCoin(state, guards, tx, ty, playSound) {
  if (state.coinsLeft <= 0) return false;
  const p = state.player;
  const d = dist(p.x, p.y, tx, ty);
  const t = Math.min(d, COIN_THROW_MAX) / Math.max(d, 1);
  const lx = p.x + (tx - p.x) * t;
  const ly = p.y + (ty - p.y) * t;
  state.coinsLeft -= 1;
  state.coins.push({ x: p.x, y: p.y, tx: lx, ty: ly, t: 0, landed: false, ring: 0 });
  // Land instantly in logic terms after the 0.35s flight; hearing happens
  // in updateCoins when the flight completes.
  if (playSound) playSound('coin');
  return true;
}

export function updateCoins(state, guards, playSound) {
  for (const c of state.coins) {
    if (!c.landed && c.t >= 0.35) {
      c.x = c.tx; c.y = c.ty;
      hearCoin(state, guards, c.tx, c.ty);
      pushEvent(state, 'Coin clinks on the floor.');
      if (playSound) playSound('coinLand');
    }
  }
}

export function dropSmoke(state, playSound) {
  if (state.smokesLeft <= 0) return false;
  const p = state.player;
  state.smokesLeft -= 1;
  state.smokes.push({ x: p.x, y: p.y, t: SMOKE_DURATION });
  pushEvent(state, 'Smoke out — cones go blind.');
  if (playSound) playSound('smoke');
  return true;
}

export function douseLamp(state, playSound) {
  const p = state.player;
  let best = -1, bestD = DOUSE_RANGE;
  for (let i = 0; i < state.floor.lamps.length; i++) {
    if (!state.lampsLit[i]) continue;
    const l = state.floor.lamps[i];
    const d = dist(p.x, p.y, l[0], l[1]);
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return false;
  state.lampsLit[best] = false;
  pushEvent(state, 'Lamp doused. Darkness helps.');
  if (playSound) playSound('douse');
  return true;
}

export function pickupShards(state, playSound) {
  const p = state.player;
  for (let i = 0; i < state.floor.shards.length; i++) {
    if (state.shardsTaken[i]) continue;
    const s = state.floor.shards[i];
    if (dist(p.x, p.y, s[0], s[1]) < SHARD_PICKUP_DIST) {
      state.shardsTaken[i] = true;
      state.score += SHARD_SCORE;
      state.take += SHARD_TAKE;
      pushEvent(state, 'Ember shard pocketed.');
      if (playSound) playSound('shard');
    }
  }
}

export function shardsLeft(state) {
  return state.shardsTaken.filter((t) => !t).length;
}
export function exitOpen(state) {
  return shardsLeft(state) === 0;
}
export function totalLoot(state) {
  return state._totalLoot || 0;
}
export function atExit(state) {
  const p = state.player;
  const e = state.floor.exit;
  return p.x >= e[0] - 6 && p.x <= e[0] + e[2] + 6 && p.y >= e[1] - 6 && p.y <= e[1] + e[3] + 6;
}
export function exitReached(state) {
  return exitOpen(state) && atExit(state);
}
export function awardFloorClear(state) {
  state.score += FLOOR_SCORE;
}

export function respawn(state, guards) {
  const s = state.floor.start;
  state.player.x = s[0];
  state.player.y = s[1];
  state.player.facing = -1.57;
  for (const g of guards) {
    g.suspicion = 18;
    g.stage = 'patrol';
    g.investigate = null;
    g.lastSeen = null;
    g.peak = 0;
    g.unseenTimer = 0;
    g.lookTimer = 0;
  }
  pushEvent(state, 'Back at the door. Breathe.');
}
