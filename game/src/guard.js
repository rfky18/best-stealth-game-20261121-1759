// The night guards: fixed patrol loops, a vision cone, and a suspicion
// meter that climbs in three stages — curious, alert, chase — and falls
// back when the player slips out of sight. Nothing here insta-fails the
// player: being seen starts a countdown the player can still escape.
import { GUARDS, TUNE } from './config.js';
import { hasLineOfSight, inLight, inShadow } from './world.js';

/** Smallest signed angle from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this guard see the player right now? Inside the cone's range and
 * half-angle, with an unblocked line of sight. The cone is a wedge, not a
 * circle: standing behind a guard is safe even up close.
 */
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > TUNE.coneRange) return false;
  if (dist > 4 && Math.abs(angleDiff(guard.facing, Math.atan2(dy, dx))) > TUNE.coneHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, player.x, player.y);
}

/** Cone colour by state: calm yellow, curious orange, chasing red. */
export function coneColor(guard) {
  if (guard.state === 'chase') return 'rgba(255, 59, 48, 0.34)';
  if (guard.suspicion >= TUNE.alertAt) return 'rgba(255, 149, 0, 0.32)';
  if (guard.suspicion > 12) return 'rgba(255, 204, 0, 0.30)';
  return 'rgba(255, 214, 90, 0.20)';
}

/** The guard's patrol definition (waypoints, pause, speed) by index. */
function patrolDef(index) {
  return GUARDS[index];
}

/** Walk toward a point at the given speed; returns true when arrived. */
function stepToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return step >= dist - 0.01;
}

/**
 * One guard, one frame. Suspicion moves first (vision + hearing), then the
 * state machine picks a behaviour: patrol the loop, walk to the last place
 * the player was seen, or run the player down. Footstep ripples are stamped
 * here so the renderer can show where the guard is even off the cone.
 */
export function updateGuard(guard, index, world, dt, onAlarm) {
  const player = world.player;
  const def = patrolDef(index);
  const sees = guardSeesPlayer(guard, player);

  // --- suspicion: vision, then hearing ---
  if (sees) {
    let rate = inShadow(player.x, player.y) ? TUNE.spotShadowPerSec : TUNE.spotLitPerSec;
    if (inLight(player.x, player.y)) rate += 14;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < 70) rate += TUNE.spotCloseBonus;
    if (player.moving && !player.sneaking) rate += TUNE.runBonus;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenFor = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - TUNE.decayPerSec * dt);
    guard.unseenFor += dt;
  }

  // Footsteps carry: a running player inside the noise radius is heard.
  if (player.moving && !player.sneaking) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < TUNE.noiseRadiusRun && !sees) {
      guard.suspicion = Math.min(100, guard.suspicion + 22 * dt);
      if (!guard.lastSeen || guard.state === 'patrol') {
        guard.lastSeen = { x: player.x, y: player.y };
      }
    }
  }

  // --- state machine ---
  const wasState = guard.state;
  if (guard.suspicion >= TUNE.chaseAt) guard.state = 'chase';
  else if (guard.suspicion >= TUNE.alertAt) guard.state = 'investigate';
  else if (guard.state !== 'patrol' && guard.unseenFor > TUNE.forgetAfterSec) guard.state = 'patrol';
  if (guard.state === 'investigate' && guard.suspicion < TUNE.alertAt - 8) guard.state = 'patrol';
  if (guard.state === 'chase' && guard.unseenFor > TUNE.forgetAfterSec) {
    guard.state = 'investigate';
    guard.suspicion = Math.max(guard.suspicion, TUNE.alertAt);
  }

  // The alarm sound fires once per escalation to chase.
  if (guard.state === 'chase' && wasState !== 'chase' && !guard.alerted) {
    guard.alerted = true;
    if (onAlarm) onAlarm();
  }
  if (guard.state === 'patrol') guard.alerted = false;

  // --- movement ---
  if (guard.state === 'patrol') {
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      // Look around at the waypoint while pausing: the cone sweeps, so the
      // player can read the pause as a safe window.
      guard.facing += Math.sin(world.time * 1.4 + index * 2.1) * 0.35 * dt;
    } else {
      const wp = def.waypoints[guard.waypointIndex];
      if (stepToward(guard, wp.x, wp.y, def.speed, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % def.waypoints.length;
        guard.pauseLeft = def.pause;
      }
    }
  } else if (guard.state === 'investigate' && guard.lastSeen) {
    if (stepToward(guard, guard.lastSeen.x, guard.lastSeen.y, TUNE.investigateSpeed, dt)) {
      guard.pauseLeft = 1.2;
      guard.state = 'patrol';
      guard.suspicion = Math.max(guard.suspicion, TUNE.alertAt - 20);
    }
  } else if (guard.state === 'chase') {
    stepToward(guard, player.x, player.y, TUNE.chaseSpeed, dt);
  }

  // --- footstep ripples, one every stride ---
  guard.rippleTimer -= dt;
  const stride = guard.state === 'chase' ? 0.34 : 0.55;
  if (guard.rippleTimer <= 0) {
    guard.rippleTimer = stride;
    guard.ripples.push({ x: guard.x, y: guard.y + 10, age: 0 });
  }
  for (const r of guard.ripples) r.age += dt;
  guard.ripples = guard.ripples.filter((r) => r.age < 0.9);
}

/** True when any chasing guard is touching the player. */
export function guardCaughtPlayer(world) {
  for (const guard of world.guards) {
    if (guard.state !== 'chase') continue;
    if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < 26) return guard;
  }
  return null;
}

/** Highest suspicion across all guards — the number the HUD shows. */
export function maxSuspicion(world) {
  let m = 0;
  for (const guard of world.guards) m = Math.max(m, guard.suspicion);
  return m;
}
