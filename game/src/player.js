// Wren, the player: movement, coin throws, smoke bombs, dousing
// lamps, picking up shards, scoring, the exit, and respawning.

import {
  FLOORS, WALK_SPEED, SNEAK_SPEED, PLAYER_R, COIN_THROW_MAX,
  COIN_FLIGHT, COINS_PER_FLOOR, SMOKE_R, SMOKE_TIME, SMOKES_PER_FLOOR,
  DOUSE_RANGE, PICKUP_R, SCORE_SHARD, SCORE_FLOOR,
  clamp, dist,
} from './config.js';
import {
  moveCircle, inSmoke, lampAt, exitOpen, addEvent, tripwireAt,
  showToast,
} from './world.js';
import { guardsHearCoin, guardsTripwire, calmGuards } from './guard.js';

// Move Wren for one fixed step. `keys` is the live key set.
export function tickPlayer(state, keys, dt, sfx) {
  const p = state.player;
  let mx = 0;
  let my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  p.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  p.running = p.moving && !p.sneaking;
  if (p.moving) {
    const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = (mx / len) * speed * dt;
    const ny = (my / len) * speed * dt;
    const moved = moveCircle(state, p.x, p.y, PLAYER_R, nx, ny);
    p.x = moved.x;
    p.y = moved.y;
    p.face = Math.atan2(ny, nx);
    // Footsteps: a soft tick and a small ripple, faster when running.
    p.stepAt -= dt;
    if (p.stepAt <= 0) {
      if (sfx) sfx.step(p.sneaking);
      state.ripples.push({
        x: p.x, y: p.y, r: 4, max: p.sneaking ? 14 : 22,
        left: 0.8, total: 0.8, color: '#2dd4bf',
      });
      p.stepAt = p.sneaking ? 0.55 : 0.34;
    }
  }

  // Tripwires underfoot.
  const wireIdx = tripwireAt(state, p.x, p.y);
  if (wireIdx >= 0) {
    const wire = FLOORS[state.floor].wires[wireIdx];
    state.wiresCool[wireIdx] = 8;
    guardsTripwire(state, wire);
    showToast(state, 'TRIPWIRE!');
    if (sfx) sfx.tripwire();
  }

  // Shards: walk over one to pocket it.
  const floor = FLOORS[state.floor];
  for (let i = 0; i < floor.shards.length; i++) {
    if (state.shardsTaken.has(i)) continue;
    const s = floor.shards[i];
    if (dist(p.x, p.y, s.x, s.y) <= PICKUP_R) {
      state.shardsTaken.add(i);
      state.shardsGot += 1;
      state.score += SCORE_SHARD;
      addEvent(state, 'Ember shard pocketed.');
      if (sfx) sfx.shard();
      if (exitOpen(state)) {
        addEvent(state, 'The door stands open. Go!');
        if (sfx) sfx.door();
      }
    }
  }
}

// Throw a coin toward (tx, ty), clamped to the throw range.
export function throwCoin(state, tx, ty, sfx) {
  if (state.coins <= 0) return false;
  const p = state.player;
  const d = dist(p.x, p.y, tx, ty);
  const reach = Math.min(d, COIN_THROW_MAX);
  const a = Math.atan2(ty - p.y, tx - p.x);
  const lx = p.x + Math.cos(a) * reach;
  const ly = p.y + Math.sin(a) * reach;
  state.coins -= 1;
  state.coinsFlying.push({ sx: p.x, sy: p.y, tx: lx, ty: ly, t: 0 });
  if (sfx) sfx.coinThrow();
  return true;
}

// Drop a smoke bomb at Wren's feet.
export function dropSmoke(state, sfx) {
  if (state.smokesLeft <= 0) return false;
  const p = state.player;
  state.smokesLeft -= 1;
  state.smokes.push({ x: p.x, y: p.y, left: SMOKE_TIME });
  addEvent(state, 'Smoke out — the cones go blind.');
  if (sfx) sfx.smoke();
  return true;
}

// Douse the nearest lit lamp within reach.
export function douseLamp(state, sfx) {
  const p = state.player;
  const floor = FLOORS[state.floor];
  let best = -1;
  let bestD = DOUSE_RANGE;
  for (let i = 0; i < floor.lamps.length; i++) {
    if (state.lampsOff.has(i)) continue;
    const l = floor.lamps[i];
    const d = dist(p.x, p.y, l.x, l.y);
    if (d <= bestD) { best = i; bestD = d; }
  }
  if (best < 0) return false;
  state.lampsOff.add(best);
  addEvent(state, 'Lamp doused. The dark grows.');
  if (sfx) sfx.douse();
  return true;
}

// Advance coins in flight, landed pings, smoke clouds and wire timers.
export function tickGadgets(state, dt, sfx) {
  for (const c of state.coinsFlying) c.t += dt;
  const landed = state.coinsFlying.filter((c) => c.t >= COIN_FLIGHT);
  state.coinsFlying = state.coinsFlying.filter((c) => c.t < COIN_FLIGHT);
  for (const c of landed) {
    state.coinsLanded.push({ x: c.tx, y: c.ty, ping: 0 });
    state.coinNoiseAt = state.time;
    guardsHearCoin(state, c.tx, c.ty);
    if (sfx) sfx.coinLand();
  }
  for (const c of state.coinsLanded) c.ping += dt;
  state.coinsLanded = state.coinsLanded.filter((c) => c.ping < 1.2);
  for (const s of state.smokes) s.left -= dt;
  state.smokes = state.smokes.filter((s) => s.left > 0);
  for (let i = 0; i < state.wiresCool.length; i++) {
    state.wiresCool[i] = Math.max(0, state.wiresCool[i] - dt);
  }
}

// Is Wren standing in the open exit doorway?
export function atExit(state) {
  if (!exitOpen(state)) return false;
  const e = FLOORS[state.floor].exit;
  const p = state.player;
  return p.x > e.x - 6 && p.x < e.x + e.w + 6
    && p.y > e.y - 6 && p.y < e.y + e.h + 6;
}

// Finish the floor: +200, and either the next floor or the win screen.
// Returns 'next' or 'win'.
export function finishFloor(state) {
  state.score += SCORE_FLOOR;
  if (state.floor >= FLOORS.length - 1) return 'win';
  state.floor += 1;
  return 'next';
}

// Respawn after being caught: lose a life, back to the entrance,
// guards calm down.
export function respawn(state) {
  state.lives -= 1;
  const f = FLOORS[state.floor];
  state.player.x = f.start.x;
  state.player.y = f.start.y;
  state.player.face = -Math.PI / 2;
  state.smokes = [];
  state.coinsFlying = [];
  calmGuards(state);
}
