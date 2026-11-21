// The depot itself: walls, crates, shadows, lamps, shards, the exit door,
// and the pure geometry questions the rest of the game asks ("can a guard
// see from here to there?", "is this point in shadow or in the light?").
import {
  WALLS, CRATES, SHADOWS, LAMPS, SHARDS, EXIT, PLAYER_START, GUARDS, TUNE,
} from './config.js';

/** True when the point sits inside any rectangle of the list. */
export function pointInRects(x, y, rects) {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** All solid rectangles: walls plus crates. Both block sight and movement. */
export function solids() {
  return WALLS.concat(CRATES);
}

/** True when the point is inside a shadow patch (safe ground). */
export function inShadow(x, y) {
  return pointInRects(x, y, SHADOWS);
}

/** True when the point is inside any lamp's light pool (dangerous ground). */
export function inLight(x, y) {
  for (const lamp of LAMPS) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy <= lamp.r * lamp.r) return true;
  }
  return false;
}

/**
 * Line of sight between two points. Steps along the segment and fails as
 * soon as a sample lands inside a solid rect; crates and walls both block it.
 */
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  const blocks = solids();
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInRects(x0 + dx * t, y0 + dy * t, blocks)) return false;
  }
  return true;
}

/**
 * Distance from a point along a ray before it hits a solid rect (wall or
 * crate), or maxDist when the ray stays clear. The renderer uses it to
 * clip vision cones against walls; the guards' sight test uses the same
 * solids, so what the cone shows is what the guard can see.
 */
export function rayHitDistance(x0, y0, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const steps = Math.ceil(maxDist / 6);
  const blocks = solids();
  for (let i = 1; i <= steps; i++) {
    const d = (i / steps) * maxDist;
    if (pointInRects(x0 + dx * d, y0 + dy * d, blocks)) return Math.max(6, d - 6);
  }
  return maxDist;
}

/** Push a circle (x, y, radius) out of every solid rect it overlaps. */
export function resolveCircle(x, y, radius) {
  for (const r of solids()) {
    const cx = Math.max(r.x, Math.min(x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(y, r.y + r.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
      } else {
        // Dead centre inside the rect: push out along the shallowest side.
        const left = x - r.x;
        const right = r.x + r.w - x;
        const top = y - r.y;
        const bottom = r.y + r.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = r.x - radius;
        else if (m === right) x = r.x + r.w + radius;
        else if (m === top) y = r.y - radius;
        else y = r.y + r.h + radius;
      }
    }
  }
  return { x, y };
}

/** Fresh game state: guards on their first waypoint, no shards, full lives. */
export function createWorld() {
  return {
    time: 0,
    shardsTaken: 0,
    shards: SHARDS.map((s) => ({ ...s, taken: false })),
    lives: TUNE.lives,
    status: 'play', // play | caught | won | over
    statusTimer: 0,
    bestMs: null,
    guards: GUARDS.map((g) => ({
      name: g.name,
      color: g.color,
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      facing: g.facing,
      waypointIndex: 1,
      pauseLeft: 0,
      suspicion: 0,
      state: 'patrol', // patrol | investigate | chase
      lastSeen: null,
      unseenFor: 0,
      ripples: [],
      rippleTimer: 0,
      alerted: false, // true once since last calm, for the alarm sound
    })),
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      facing: 0,
      sneaking: false,
      moving: false,
      hidden: false,
      lit: false,
      ripples: [],
      rippleTimer: 0,
      caughtFlash: 0,
    },
  };
}

/** Reset an existing world back to its opening state (same object shape). */
export function resetWorld(world) {
  const fresh = createWorld();
  world.time = 0;
  world.shardsTaken = 0;
  world.shards = fresh.shards;
  world.lives = TUNE.lives;
  world.status = 'play';
  world.statusTimer = 0;
  world.guards = fresh.guards;
  world.player = fresh.player;
}

/** True when the exit door stands open: every shard pocketed. */
export function exitOpen(world) {
  return world.shardsTaken >= SHARDS.length;
}

/** The door's rectangle, for overlap tests and drawing. */
export function exitRect() {
  return EXIT;
}
