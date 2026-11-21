// Wren, the shadow courier: WASD/arrows to move, Shift to sneak. Sneaking
// is slower and quieter; running is fast but loud and easy to spot. The
// player is a circle for collision; the renderer draws the hooded figure.
import { PLAYER_START, TUNE } from './config.js';
import { exitRect, exitOpen, inLight, inShadow, resolveCircle } from './world.js';

/** Move the player one frame from the held keys; returns true on a footstep. */
export function updatePlayer(world, keys, dt) {
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
    const nx = p.x + (dx / len) * speed * dt;
    const ny = p.y + (dy / len) * speed * dt;
    const fixed = resolveCircle(nx, ny, 12);
    p.x = fixed.x;
    p.y = fixed.y;
    p.facing = Math.atan2(dy, dx);
  }

  p.hidden = inShadow(p.x, p.y);
  p.lit = inLight(p.x, p.y);

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

  // Shards: walk over one to pocket it.
  for (const shard of world.shards) {
    if (!shard.taken && Math.hypot(p.x - shard.x, p.y - shard.y) < 26) {
      shard.taken = true;
      world.shardsTaken += 1;
    }
  }

  // The exit only counts once it stands open (all shards pocketed).
  if (exitOpen(world)) {
    const e = exitRect();
    if (p.x + 12 > e.x && p.x - 12 < e.x + e.w && p.y + 12 > e.y && p.y - 12 < e.y + e.h) {
      world.status = 'won';
      world.statusTimer = 0;
    }
  }
  return stepped;
}

/** Send Wren back to the service door after being caught, guards calming. */
export function respawnPlayer(world) {
  const p = world.player;
  p.x = PLAYER_START.x;
  p.y = PLAYER_START.y;
  p.facing = 0;
  p.ripples = [];
  p.caughtFlash = 1;
  for (const guard of world.guards) {
    guard.suspicion = 18;
    guard.state = 'patrol';
    guard.lastSeen = null;
    guard.unseenFor = 99;
  }
}
