// World geometry and shared floor state: line of sight, raycasts,
// circle-vs-rect collision, shadow / lamp / smoke tests, exposure,
// tripwires, the event feed and toasts.

import {
  FLOORS, TOTAL_SHARDS, SMOKE_R, TRIP_R, TRIP_COOLDOWN,
  clamp, dist, fmtTime,
} from './config.js';

// ---- basic geometry -------------------------------------------------

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function pointInCrate(px, py, floor) {
  for (const c of floor.crates) {
    if (px >= c.x && px <= c.x + 44 && py >= c.y && py <= c.y + 44) return true;
  }
  return false;
}

// Distance from a point to a segment.
export function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

// Does segment (x1,y1)-(x2,y2) hit rectangle r? Slab test.
export function segHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const minX = r.x;
  const maxX = r.x + r.w;
  const minY = r.y;
  const maxY = r.y + r.h;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let a = (minX - x1) / dx;
    let b = (maxX - x1) / dx;
    if (a > b) { const t = a; a = b; b = t; }
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < minY || y1 > maxY) return false;
  } else {
    let a = (minY - y1) / dy;
    let b = (maxY - y1) / dy;
    if (a > b) { const t = a; a = b; b = t; }
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

// All solid rectangles on a floor: walls plus crates as 44x44 rects.
export function solidRects(floor) {
  const out = floor.walls.slice();
  for (const c of floor.crates) out.push({ x: c.x, y: c.y, w: 44, h: 44 });
  return out;
}

// Clear line of sight between two points (walls and crates block).
export function hasLineOfSight(x1, y1, x2, y2, floor) {
  for (const r of solidRects(floor)) {
    if (segHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

// Cast one ray from (x,y) along angle a; returns the distance to the
// nearest solid, capped at maxD.
export function raycast(x, y, a, maxD, floor) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const x2 = x + dx * maxD;
  const y2 = y + dy * maxD;
  let best = maxD;
  for (const r of solidRects(floor)) {
    const hit = rayRectT(x, y, dx, dy, r);
    if (hit !== null && hit < best) best = hit;
  }
  return best;
}

// Ray vs rect: distance along the ray to first contact, or null.
function rayRectT(x, y, dx, dy, r) {
  let t0 = 0;
  let t1 = Infinity;
  const minX = r.x;
  const maxX = r.x + r.w;
  const minY = r.y;
  const maxY = r.y + r.h;
  if (Math.abs(dx) < 1e-9) {
    if (x < minX || x > maxX) return null;
  } else {
    let a = (minX - x) / dx;
    let b = (maxX - x) / dx;
    if (a > b) { const t = a; a = b; b = t; }
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y < minY || y > maxY) return null;
  } else {
    let a = (minY - y) / dy;
    let b = (maxY - y) / dy;
    if (a > b) { const t = a; a = b; b = t; }
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}

// Move a circle (x,y,r) by (dx,dy), sliding along solids.
export function moveCircle(state, x, y, r, dx, dy) {
  const floor = FLOORS[state.floor];
  const solids = solidRects(floor);
  let nx = x + dx;
  for (const s of solids) {
    if (circleHitsRect(nx, y, r, s)) {
      nx = dx > 0 ? s.x - r : dx < 0 ? s.x + s.w + r : nx;
    }
  }
  let ny = y + dy;
  for (const s of solids) {
    if (circleHitsRect(nx, ny, r, s)) {
      ny = dy > 0 ? s.y - r : dy < 0 ? s.y + s.h + r : ny;
    }
  }
  return { x: nx, y: ny };
}

function circleHitsRect(cx, cy, r, s) {
  const qx = clamp(cx, s.x, s.x + s.w);
  const qy = clamp(cy, s.y, s.y + s.h);
  const ddx = cx - qx;
  const ddy = cy - qy;
  return ddx * ddx + ddy * ddy < r * r;
}

// ---- light / shadow / smoke tests -----------------------------------

export function inShadow(x, y, floor) {
  for (const s of floor.shadows) {
    if (pointInRect(x, y, s)) return true;
  }
  return false;
}

export function lampAt(x, y, state) {
  const floor = FLOORS[state.floor];
  for (let i = 0; i < floor.lamps.length; i++) {
    if (state.lampsOff.has(i)) continue;
    const l = floor.lamps[i];
    if (dist(x, y, l.x, l.y) <= l.r) return l;
  }
  return null;
}

export function inSmoke(x, y, state) {
  for (const c of state.smokes) {
    if (c.left > 0 && dist(x, y, c.x, c.y) <= SMOKE_R) return true;
  }
  return false;
}

// Smoke blocks sight when the guard-to-player segment crosses a cloud.
// Sampled every 10 px along the segment, per spec.
export function smokeBlocks(x1, y1, x2, y2, state) {
  const total = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(total / 10));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (inSmoke(px, py, state)) return true;
  }
  return false;
}

// Live exposure 0-100 for the player.
export function exposure(state) {
  const p = state.player;
  if (inSmoke(p.x, p.y, state)) return 0;
  let v = inShadow(p.x, p.y, FLOORS[state.floor]) ? 5 : 40;
  if (lampAt(p.x, p.y, state)) v = 90;
  if (!p.sneaking) v += 10;
  return clamp(v, 0, 100);
}

export function exposureLabel(state) {
  const p = state.player;
  const v = exposure(state);
  if (inSmoke(p.x, p.y, state)) return 'IN SMOKE 0%';
  if (lampAt(p.x, p.y, state)) return `IN LAMPLIGHT ${v}%`;
  if (inShadow(p.x, p.y, FLOORS[state.floor])) return `IN SHADOW ${v}%`;
  return `IN THE OPEN ${v}%`;
}

// ---- world state ------------------------------------------------------

export function freshState() {
  return {
    screen: 'title', // title | playing | paused | floorcard | caught | win | gameover
    floor: 0,
    time: 0,
    score: 0,
    lives: 3,
    shardsGot: 0,
    closeCalls: 0,
    spotted: 0,
    coins: 5,
    smokesLeft: 2,
    lampsOff: new Set(),
    shardsTaken: new Set(),
    smokes: [], // {x, y, left}
    coinsFlying: [], // {sx, sy, tx, ty, t}
    coinsLanded: [], // {x, y, ping}
    wiresCool: [], // seconds left per wire
    events: [], // {at, text}
    toast: null, // {text, left}
    toastLong: 0,
    floorCardLeft: 0,
    caughtLeft: 0,
    ghostAwarded: false,
    best: 0,
    player: {
      x: 64, y: 648, face: -Math.PI / 2, moving: false,
      sneaking: false, running: false, stepAt: 0,
    },
    guards: [],
    ripples: [], // {x, y, r, max, left, total, color}
    coinNoiseAt: -99,
    muted: false,
  };
}

// (Re)build the guard list and per-floor counters for the current floor.
export function loadFloor(state) {
  const f = FLOORS[state.floor];
  state.guards = f.guards.map((g) => makeGuard(g));
  state.coins = 5;
  state.smokesLeft = 2;
  state.lampsOff = new Set();
  state.shardsTaken = new Set();
  state.smokes = [];
  state.coinsFlying = [];
  state.coinsLanded = [];
  state.wiresCool = f.wires.map(() => 0);
  state.player.x = f.start.x;
  state.player.y = f.start.y;
  state.player.face = -Math.PI / 2;
  state.ripples = [];
}

export function makeGuard(def) {
  return {
    name: def.name,
    color: def.color,
    path: def.path,
    wait: def.wait,
    speed: def.speed,
    x: def.path[0].x,
    y: def.path[0].y,
    face: def.face,
    wp: 1 % def.path.length,
    waiting: 0,
    sweep: 0,
    suspicion: 0,
    mode: 'patrol', // patrol | curious | chase
    lastSeen: null,
    lookLeft: 0,
    unseenFor: 0,
    peak: 0,
    chasedThisRun: false,
    stepAt: 0,
    cone: [],
  };
}

export function floorShardsLeft(state) {
  return FLOORS[state.floor].shards.length - state.shardsTaken.size;
}

export function exitOpen(state) {
  return floorShardsLeft(state) === 0;
}

export function totalShards() {
  return TOTAL_SHARDS;
}

// ---- events, toasts, tripwires ----------------------------------------

export function addEvent(state, text) {
  state.events.unshift({ at: state.time, text });
  if (state.events.length > 3) state.events.length = 3;
}

export function showToast(state, text, dur = 1.8) {
  state.toast = { text, left: dur };
}

export function tripwireAt(state, x, y) {
  const f = FLOORS[state.floor];
  for (let i = 0; i < f.wires.length; i++) {
    if (state.wiresCool[i] > 0) continue;
    const w = f.wires[i];
    if (pointSegDist(x, y, w.x1, w.y1, w.x2, w.y2) < TRIP_R) return i;
  }
  return -1;
}

export function fmtEventAt(at) {
  return fmtTime(at);
}
