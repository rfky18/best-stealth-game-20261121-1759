// Wren, the shadow courier: WASD/arrows to move, Shift to sneak, click
// (or C) to toss a coin, Q to drop a smoke bomb, R to douse a nearby
// lamp. Sneaking is slower and quieter; running is fast but loud and easy
// to spot. A tossed coin flies to the clicked spot and lands with a clink
// every nearby guard walks over to check. Smoke blinds the cones for a
// few seconds; a doused lamp stops giving Wren away for the rest of the
// floor. Crossing a tripwire wakes the whole floor up.
import { SCORE, TUNE } from './config.js';
import {
  distToSegment, exitRect, exitOpen, inLight, inShadow, inSmoke,
  levelOf, resolveCircle,
} from './world.js';
import { hearCoin, tripWire } from './guard.js';

/**
 * Move the player one frame from the held keys; returns true on a footstep.
 * `tossAt` is a clicked point (or null) — one toss per click, spent from
 * the floor's coin purse. `smoke` and `douse` are edge-triggered presses.
 */
export function updatePlayer(world, keys, dt, tossAt, smoke, douse) {
  const p = world.player;
  if (world.status !== 'play') return false;

  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0;
  p.sneaking = Boolean(keys.sneak) || len === 0;

  if (len > 0) {
    const speed = p.sneaking ? TUNE.playerSneak : TUNE.playerWalk;
    const level = levelOf(world);
    const fixed = resolveCircle(
      level,
      p.x + (dx / len) * speed * dt,
      p.y + (dy / len) * speed * dt,
      TUNE.playerRadius,
    );
    p.x = fixed.x;
    p.y = fixed.y;
    p.facing = Math.atan2(dy, dx);
  }

  p.hidden = inShadow(world, p.x, p.y);
  p.lit = inLight(world, p.x, p.y);
  p.smoked = inSmoke(world, p.x, p.y);

  // Toss a coin: it arcs to the clicked spot (clamped to throwing range)
  // and the clink pulls nearby guards off their patrol.
  if (tossAt && world.coins > 0 && !world.thrownCoin) {
    const tx = tossAt.x - p.x;
    const ty = tossAt.y - p.y;
    const dist = Math.hypot(tx, ty);
    const reach = Math.min(dist, TUNE.coinRange);
    const ux = dist > 0 ? tx / dist : Math.cos(p.facing);
    const uy = dist > 0 ? ty / dist : Math.sin(p.facing);
    world.coins -= 1;
    world.thrownCoin = {
      x0: p.x, y0: p.y,
      x1: p.x + ux * reach, y1: p.y + uy * reach,
      t: 0,
    };
  }

  // Drop a smoke bomb at Wren's feet: the cloud hangs for a few seconds
  // and no guard can see through it.
  if (smoke && world.smokeLeft > 0) {
    world.smokeLeft -= 1;
    world.smoke.push({ x: p.x, y: p.y, left: TUNE.smokeSeconds });
  }

  // Douse the nearest burning lamp in reach: its light pool goes dark
  // for the rest of the floor, and the dark grows a little wider.
  if (douse) {
    let best = null;
    let bestDist = TUNE.douseRange;
    for (const lamp of world.lampsLive) {
      const d = Math.hypot(p.x - lamp.x, p.y - lamp.y);
      if (d < bestDist) {
        best = lamp;
        bestDist = d;
      }
    }
    if (best) {
      world.lampsLive = world.lampsLive.filter((lamp) => lamp !== best);
    }
  }

  // Tripwires: step on the line and the whole floor gets curious. A wire
  // that just fired needs a few seconds before it can fire again.
  for (const wire of world.wires) {
    if (wire.coolLeft > 0) continue;
    if (distToSegment(p.x, p.y, wire.x1, wire.y1, wire.x2, wire.y2) < 14) {
      wire.coolLeft = TUNE.tripwireRearmSec;
      tripWire(world, wire);
    }
  }

  // Footstep ripples: loud and wide while running, faint while sneaking.
  p.rippleTimer -= dt;
  const stride = p.sneaking ? 0.5 : 0.3;
  let stepped = false;
  if (p.moving && p.rippleTimer <= 0) {
    p.rippleTimer = stride;
    p.ripples.push({ x: p.x, y: p.y + 10, age: 0 });
    stepped = true;
  }
  for (const r of p.ripples) r.age += dt;
  p.ripples = p.ripples.filter((r) => r.age < 0.8);

  // Shards: walk over one to pocket it — each one is 100 points.
  for (const shard of world.shards) {
    if (!shard.taken && Math.hypot(p.x - shard.x, p.y - shard.y) < 26) {
      shard.taken = true;
      world.shardsTaken += 1;
      world.totalTaken += 1;
      world.score += SCORE.shard;
    }
  }

  // The exit only counts once it stands open (all shards pocketed).
  if (exitOpen(world)) {
    const e = exitRect(world);
    if (p.x + 12 > e.x && p.x - 12 < e.x + e.w && p.y + 12 > e.y && p.y - 12 < e.y + e.h) {
      world.score += SCORE.levelClear;
      world.status = world.levelIndex + 1 < 3 ? 'levelcard' : 'won';
      world.statusTimer = 0;
    }
  }
  return stepped;
}

/** Advance a thrown coin; on landing, ring the ping and alert the guards. */
export function updateCoin(world, dt, onClink) {
  const coin = world.thrownCoin;
  if (!coin) return;
  coin.t += dt / 0.35;
  if (coin.t < 1) return;
  world.thrownCoin = null;
  world.landedCoins.push({ x: coin.x1, y: coin.y1, age: 0 });
  if (world.landedCoins.length > 3) world.landedCoins.shift();
  world.pings.push({ x: coin.x1, y: coin.y1, age: 0 });
  hearCoin(world, coin.x1, coin.y1);
  if (onClink) onClink();
}

/** Age the coin pings, the landed coins, the smoke and the tripwires. */
export function updateEffects(world, dt) {
  for (const ping of world.pings) ping.age += dt;
  world.pings = world.pings.filter((ping) => ping.age < 0.9);
  for (const coin of world.landedCoins) coin.age += dt;
  for (const cloud of world.smoke) cloud.left -= dt;
  world.smoke = world.smoke.filter((cloud) => cloud.left > 0);
  for (const wire of world.wires) {
    if (wire.coolLeft > 0) wire.coolLeft -= dt;
  }
}

/** Send Wren back to the service door after being caught, guards calming. */
export function respawnPlayer(world) {
  const level = levelOf(world);
  const p = world.player;
  p.x = level.start.x;
  p.y = level.start.y;
  p.facing = 0;
  p.ripples = [];
  p.caughtFlash = 1;
  for (const guard of world.guards) {
    guard.suspicion = 18;
    guard.state = 'patrol';
    guard.lastSeen = null;
    guard.investigateAt = null;
    guard.unseenFor = 99;
  }
}
