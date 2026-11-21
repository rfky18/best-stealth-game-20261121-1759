// The night guards: fixed patrol loops, a vision cone, and a suspicion
// meter that climbs in three stages — curious, alert, chase — and falls
// back when Wren slips out of sight. Nothing here insta-fails the player:
// being seen starts a countdown the player can still escape, a guard who
// hears a tossed coin walks over to look at the noise instead, and a
// tripped wire only makes the whole floor curious, not caught.
import { SCORE, TUNE } from './config.js';
import {
  hasLineOfSight, inLight, inShadow, inSmoke, levelOf, pushEvent,
} from './world.js';

/** Smallest signed angle from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the segment between two points crosses any smoke cloud. */
function smokeBetween(world, x0, y0, x1, y1) {
  for (const cloud of world.smoke) {
    // Sample the segment; a cloud in the way blinds the guard.
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      const dx = px - cloud.x;
      const dy = py - cloud.y;
      if (dx * dx + dy * dy <= TUNE.smokeRadius * TUNE.smokeRadius) return true;
    }
  }
  return false;
}

/**
 * Can this guard see the player right now? Inside the cone's range and
 * half-angle, with an unblocked line of sight — and no smoke between
 * them. The cone is a wedge, not a circle: standing behind a guard is
 * safe even up close, and standing in smoke is safe from any side.
 */
export function guardSeesPlayer(world, guard, player) {
  if (inSmoke(world, player.x, player.y)) return false;
  const level = levelOf(world);
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > TUNE.coneRange) return false;
  if (dist > 4 && Math.abs(angleDiff(guard.facing, Math.atan2(dy, dx))) > TUNE.coneHalfAngle) {
    return false;
  }
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return false;
  return !smokeBetween(world, guard.x, guard.y, player.x, player.y);
}

/** Cone colour by state: calm yellow, curious gold, alert orange, red chase. */
export function coneColor(guard) {
  if (guard.state === 'chase') return 'rgba(255, 59, 48, 0.36)';
  if (guard.suspicion >= TUNE.alertAt) return 'rgba(255, 149, 0, 0.34)';
  if (guard.suspicion > 12) return 'rgba(255, 204, 0, 0.30)';
  return 'rgba(255, 214, 90, 0.20)';
}

/** Words for a guard's state, as the panel's guard list prints them. */
export function guardStateWord(guard) {
  if (guard.state === 'chase') return 'CHASING';
  if (guard.state === 'investigate') return 'SUSPICIOUS';
  if (guard.suspicion > 12) return 'CURIOUS';
  return 'PATROL';
}

/** The patrol definition (waypoints, pause, speed) of a guard by index. */
function patrolDef(world, index) {
  return levelOf(world).guards[index];
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
 * A coin just landed at (x, y). Every guard close enough to hear it
 * turns curious and walks over to look at the spot.
 */
export function hearCoin(world, x, y) {
  for (const guard of world.guards) {
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist > TUNE.coinHearRadius) continue;
    guard.suspicion = Math.max(guard.suspicion, TUNE.coinSuspicion);
    if (guard.state !== 'chase') {
      guard.state = 'investigate';
      guard.lastSeen = { x, y };
      guard.investigateAt = { x, y };
    }
    pushEvent(world, `${guard.name} heard something…`);
  }
}

/**
 * A tripwire just tripped. The whole floor gets curious at once and
 * walks toward the wire — loud, but not a chase, so a quick Wren can
 * still slip away in the confusion.
 */
export function tripWire(world, wire) {
  for (const guard of world.guards) {
    guard.suspicion = Math.min(100, guard.suspicion + TUNE.tripwireSuspicion);
    if (guard.state !== 'chase') {
      guard.state = 'investigate';
      guard.investigateAt = {
        x: (wire.x1 + wire.x2) / 2,
        y: (wire.y1 + wire.y2) / 2,
      };
      guard.lastSeen = guard.investigateAt;
    }
  }
  pushEvent(world, 'TRIPWIRE TRIPPED — the floor is looking!');
}

/**
 * One guard, one frame. Suspicion moves first (vision, then hearing),
 * the near-miss counter watches for a scare that ends well, then the
 * state machine picks a behaviour: patrol the loop, walk to the last
 * thing seen or heard, or run the player down. Footstep ripples are
 * stamped here so the renderer can show where the guard is.
 */
export function updateGuard(guard, index, world, dt, onAlarm) {
  const player = world.player;
  const def = patrolDef(world, index);
  const sees = guardSeesPlayer(world, guard, player);

  // --- suspicion: vision, then hearing ---
  if (sees) {
    let rate = inShadow(world, player.x, player.y)
      ? TUNE.spotShadowPerSec
      : TUNE.spotLitPerSec;
    if (inLight(world, player.x, player.y)) rate += TUNE.spotLightBonus;
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

  // Loud footsteps carry: a running player inside the noise radius is heard.
  if (player.moving && !player.sneaking) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < TUNE.noiseRadiusRun && !sees) {
      guard.suspicion = Math.min(100, guard.suspicion + 22 * dt);
      if (!guard.lastSeen || guard.state === 'patrol') {
        guard.lastSeen = { x: player.x, y: player.y };
      }
    }
  }

  // --- near miss: hot, then cooled off without a chase ---
  if (guard.suspicion >= TUNE.nearMissHotAt) guard.hot = true;
  if (guard.hot && guard.suspicion < TUNE.nearMissCoolBelow && guard.state !== 'chase') {
    guard.hot = false;
    world.nearMisses += 1;
    world.score += SCORE.nearMiss;
    pushEvent(world, 'Close call — they almost had you.');
  }

  // --- state machine ---
  const wasState = guard.state;
  if (guard.suspicion >= TUNE.chaseAt) guard.state = 'chase';
  else if (guard.suspicion >= TUNE.alertAt) guard.state = 'investigate';
  else if (guard.state !== 'patrol' && guard.unseenFor > TUNE.forgetAfterSec) {
    guard.state = 'patrol';
    pushEvent(world, `${guard.name} lost the trail.`);
  }
  if (guard.state === 'investigate' && guard.suspicion < TUNE.alertAt - 8) {
    guard.state = 'patrol';
  }
  if (guard.state === 'chase' && guard.unseenFor > TUNE.forgetAfterSec) {
    guard.state = 'investigate';
    guard.suspicion = Math.max(guard.suspicion, TUNE.alertAt);
  }

  // The alarm sound fires once per escalation to chase, and the chase
  // counts as being spotted — it costs the GHOST bonus at the end.
  if (guard.state === 'chase' && wasState !== 'chase') {
    if (!guard.spottedCounted) {
      guard.spottedCounted = true;
      world.spotted += 1;
    }
    pushEvent(world, `${guard.name}: WHAT WAS THAT?`);
    if (onAlarm) onAlarm();
  }
  if (guard.state === 'investigate' && wasState === 'patrol') {
    pushEvent(world, `${guard.name} is suspicious…`);
  }
  if (guard.state === 'patrol') {
    guard.alerted = false;
    guard.spottedCounted = false;
  }

  // --- movement ---
  const chaseSpeed = world.levelIndex === 2 ? TUNE.vaultChaseSpeed : TUNE.chaseSpeed;
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
  } else if (guard.state === 'investigate') {
    const target = guard.investigateAt ?? guard.lastSeen;
    if (guard.lookLeft > 0) {
      // Arrived and looking around the spot before giving up.
      guard.lookLeft -= dt;
      guard.facing += Math.sin(world.time * 2.2 + index) * 0.6 * dt;
      if (guard.lookLeft <= 0) {
        guard.state = 'patrol';
        guard.investigateAt = null;
        guard.suspicion = Math.max(guard.suspicion, TUNE.alertAt - 20);
      }
    } else if (target) {
      if (stepToward(guard, target.x, target.y, TUNE.investigateSpeed, dt)) {
        guard.lookLeft = 1.4;
      }
    }
  } else if (guard.state === 'chase') {
    stepToward(guard, player.x, player.y, chaseSpeed, dt);
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
    if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < TUNE.catchDistance) {
      return guard;
    }
  }
  return null;
}

/** Highest suspicion across all guards — the number the HUD shows. */
export function maxSuspicion(world) {
  let m = 0;
  for (const guard of world.guards) m = Math.max(m, guard.suspicion);
  return m;
}
