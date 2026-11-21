// The night itself: the level the player is on, the geometry questions
// the rest of the game asks ("can this guard see that point?", "is this
// spot shadow or lamplight?"), and the coins Wren tosses to make noise.
import { LEVELS, TUNE } from './config.js';

/** True when the point sits inside any rectangle of the list. */
export function pointInRects(x, y, rects) {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** The level Wren is standing on right now. */
export function levelOf(world) {
  return LEVELS[world.levelIndex];
}

/** All solid rectangles of a level: walls plus crates. Both block sight. */
export function solidsOf(level) {
  if (!level.solids) level.solids = level.walls.concat(level.crates);
  return level.solids;
}

/** True when the point is inside a shadow patch of the current level. */
export function inShadow(world, x, y) {
  return pointInRects(x, y, levelOf(world).shadows);
}

/** True when the point is inside any lamp's light pool of this level. */
export function inLight(world, x, y) {
  for (const lamp of levelOf(world).lamps) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy <= lamp.r * lamp.r) return true;
  }
  return false;
}

/**
 * Line of sight between two points on a level. Steps along the segment
 * and fails as soon as a sample lands inside a solid rect.
 */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  const blocks = solidsOf(level);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInRects(x0 + dx * t, y0 + dy * t, blocks)) return false;
  }
  return true;
}

/**
 * Distance from a point along a ray before it hits a solid rect, or
 * maxDist when the ray stays clear. The renderer clips vision cones with
 * it, so the lit wedge is exactly what the guard can see.
 */
export function rayHitDistance(level, x0, y0, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const steps = Math.ceil(maxDist / 4);
  const blocks = solidsOf(level);
  for (let i = 1; i <= steps; i++) {
    const d = (i / steps) * maxDist;
    if (pointInRects(x0 + dx * d, y0 + dy * d, blocks)) return Math.max(4, d - 4);
  }
  return maxDist;
}

/** Push a circle (x, y, radius) out of every solid rect it overlaps. */
export function resolveCircle(level, x, y, radius) {
  for (const r of solidsOf(level)) {
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

/** One guard, standing on its first waypoint, calm and unsuspicious. */
function makeGuard(def) {
  return {
    name: def.name,
    color: def.color,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    facing: def.facing,
    waypointIndex: 1,
    pauseLeft: 0,
    lookLeft: 0,
    suspicion: 0,
    state: 'patrol', // patrol | investigate | chase
    lastSeen: null,
    investigateAt: null,
    unseenFor: 0,
    hot: false, // suspicion crossed the near-miss line since last cool-down
    ripples: [],
    rippleTimer: 0,
    alerted: false,
  };
}

/** Fresh game state: level 1, no shards, full lives, five coins. */
export function createWorld() {
  const world = {
    time: 0,
    levelIndex: 0,
    shardsTaken: 0,
    totalTaken: 0,
    coins: LEVELS[0].coins,
    nearMisses: 0,
    lives: TUNE.lives,
    status: 'play', // play | caught | levelcard | won | over
    statusTimer: 0,
    toast: '',
    toastTimer: 0,
    bestMs: null,
    shards: [],
    guards: [],
    thrownCoin: null, // a coin mid-flight: {x0,y0,x1,y1,t}
    landedCoins: [], // coins resting on the floor
    pings: [], // expanding sound rings where a coin landed
    player: {
      x: LEVELS[0].start.x,
      y: LEVELS[0].start.y,
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
  loadLevel(world, 0);
  return world;
}

/** Fill a world with a level's shards, guards and start position. */
export function loadLevel(world, index) {
  const level = LEVELS[index];
  world.levelIndex = index;
  world.shardsTaken = 0;
  world.shards = level.shards.map((s) => ({ ...s, taken: false }));
  world.guards = level.guards.map(makeGuard);
  world.coins = level.coins;
  world.thrownCoin = null;
  world.landedCoins = [];
  world.pings = [];
  const p = world.player;
  p.x = level.start.x;
  p.y = level.start.y;
  p.facing = 0;
  p.ripples = [];
  p.caughtFlash = 0;
}

/** Reset a world back to the start of level 1, same object shape. */
export function resetWorld(world) {
  world.time = 0;
  world.totalTaken = 0;
  world.nearMisses = 0;
  world.lives = TUNE.lives;
  world.status = 'play';
  world.statusTimer = 0;
  world.toast = '';
  world.toastTimer = 0;
  loadLevel(world, 0);
}

/** True when the exit door of this level stands open. */
export function exitOpen(world) {
  return world.shardsTaken >= levelOf(world).shards.length;
}

/** How many shards the whole night holds, across both levels. */
export function totalShards() {
  let n = 0;
  for (const level of LEVELS) n += level.shards.length;
  return n;
}

/** The door's rectangle, for overlap tests and drawing. */
export function exitRect(world) {
  return levelOf(world).exit;
}

/** Show a short toast line above the playfield ("CLOSE CALL!"). */
export function showToast(world, text, seconds) {
  world.toast = text;
  world.toastTimer = seconds;
}
