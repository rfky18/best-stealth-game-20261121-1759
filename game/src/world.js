// The night itself: the level Wren is on, the geometry questions the
// rest of the game asks ("can this guard see that point?", "is this spot
// shadow or lamplight?", "did Wren cross the wire?"), the event feed the
// panel reads, and the coins and smoke Wren throws to stay unseen.
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

/** True when the point is inside a lit lamp's light pool of this level. */
export function inLight(world, x, y) {
  for (const lamp of world.lampsLive) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy <= lamp.r * lamp.r) return true;
  }
  return false;
}

/** True when the point sits inside any smoke cloud still hanging. */
export function inSmoke(world, x, y) {
  for (const cloud of world.smoke) {
    const dx = x - cloud.x;
    const dy = y - cloud.y;
    if (dx * dx + dy * dy <= TUNE.smokeRadius * TUNE.smokeRadius) return true;
  }
  return false;
}

/**
 * How exposed Wren is right now, 0..100: shadow hides, open floor shows,
 * lamplight gives away, smoke covers, running adds to it. The panel
 * shows this number live, so the player always knows what the guards see.
 */
export function exposureOf(world) {
  const p = world.player;
  if (inSmoke(world, p.x, p.y)) return 0;
  let value = inShadow(world, p.x, p.y) ? 5 : 40;
  if (inLight(world, p.x, p.y)) value = 90;
  if (p.moving && !p.sneaking) value = Math.min(100, value + 10);
  return value;
}

/** Words for the exposure number: what the panel prints beside it. */
export function exposureLabel(world) {
  const p = world.player;
  if (inSmoke(world, p.x, p.y)) return 'IN SMOKE';
  if (inShadow(world, p.x, p.y)) return 'IN SHADOW';
  if (inLight(world, p.x, p.y)) return 'IN LAMPLIGHT';
  return 'IN THE OPEN';
}

/** Line of sight between two points on a level, sampled every 8 px. */
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
 * maxDist when the ray stays clear. The renderer clips vision cones
 * with it, so the lit wedge is exactly what the guard can see.
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

/** Distance from a point to a segment — how close Wren came to a wire. */
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
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
    spottedCounted: false,
  };
}

/** Fresh game state: floor 1, no shards, full lives, five coins. */
export function createWorld() {
  const world = {
    time: 0,
    levelIndex: 0,
    shardsTaken: 0,
    totalTaken: 0,
    coins: LEVELS[0].coins,
    smokeLeft: LEVELS[0].smoke,
    score: 0,
    spotted: 0, // times a guard broke into a chase or caught Wren
    nearMisses: 0,
    lives: TUNE.lives,
    status: 'play', // play | caught | levelcard | won | over
    statusTimer: 0,
    toast: '',
    toastTimer: 0,
    bestScore: 0,
    events: [], // newest first, {t, text} — the panel's event feed
    shards: [],
    guards: [],
    wires: [], // tripwires of this floor: {x1,y1,x2,y2,coolLeft}
    lampsLive: [], // lamps still burning: {x,y,r}
    thrownCoin: null, // a coin mid-flight: {x0,y0,x1,y1,t}
    landedCoins: [],
    pings: [], // expanding sound rings where a coin landed
    smoke: [], // smoke clouds hanging: {x,y,left}
    player: {
      x: LEVELS[0].start.x,
      y: LEVELS[0].start.y,
      facing: 0,
      sneaking: false,
      moving: false,
      hidden: false,
      lit: false,
      smoked: false,
      ripples: [],
      rippleTimer: 0,
      caughtFlash: 0,
    },
  };
  loadLevel(world, 0);
  return world;
}

/** Fill a world with a floor's shards, guards, wires and lamps. */
export function loadLevel(world, index) {
  const level = LEVELS[index];
  world.levelIndex = index;
  world.shardsTaken = 0;
  world.shards = level.shards.map((s) => ({ ...s, taken: false }));
  world.guards = level.guards.map(makeGuard);
  world.wires = level.tripwires.map((w) => ({ ...w, coolLeft: 0 }));
  world.lampsLive = level.lamps.map((lamp) => ({ ...lamp }));
  world.coins = level.coins;
  world.smokeLeft = level.smoke;
  world.thrownCoin = null;
  world.landedCoins = [];
  world.pings = [];
  world.smoke = [];
  const p = world.player;
  p.x = level.start.x;
  p.y = level.start.y;
  p.facing = 0;
  p.ripples = [];
  p.caughtFlash = 0;
}

/** Reset a world back to the start of floor 1, same object shape. */
export function resetWorld(world) {
  world.time = 0;
  world.totalTaken = 0;
  world.score = 0;
  world.spotted = 0;
  world.nearMisses = 0;
  world.lives = TUNE.lives;
  world.status = 'play';
  world.statusTimer = 0;
  world.toast = '';
  world.toastTimer = 0;
  world.events = [];
  loadLevel(world, 0);
}

/** True when the exit door of this floor stands open. */
export function exitOpen(world) {
  return world.shardsTaken >= levelOf(world).shards.length;
}

/** How many shards the whole night holds, across all three floors. */
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

/** Add a line to the event feed the detection panel shows (newest first). */
export function pushEvent(world, text) {
  world.events.unshift({ t: world.time, text });
  if (world.events.length > 3) world.events.length = 3;
}
