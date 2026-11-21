// world.js — geometry, line of sight, collisions, light/shadow/smoke
// tests, exposure, tripwire/laser state, event feed and toasts.

import {
  LEVELS, MAIN_X1, HUD_H, CANVAS_H, TRIPWIRE_REARM, LASER_ON, LASER_OFF,
  LASER_COOLDOWN, SMOKE_RADIUS,
} from './config.js';

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function pointInRect(x, y, r) {
  return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
}
export function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}
function segIntersectsRect(x1, y1, x2, y2, r) {
  // Slab test for a segment against an axis-aligned rect.
  let tmin = 0, tmax = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const rx0 = r[0], ry0 = r[1], rx1 = r[0] + r[2], ry1 = r[1] + r[3];
  if (Math.abs(dx) < 1e-9) { if (x1 < rx0 || x1 > rx1) return false; }
  else {
    let t1 = (rx0 - x1) / dx, t2 = (rx1 - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) { if (y1 < ry0 || y1 > ry1) return false; }
  else {
    let t1 = (ry0 - y1) / dy, t2 = (ry1 - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// All solid blockers of a floor: walls + crates (44x44).
export function blockersOf(floor) {
  const list = floor.walls.map((r) => r);
  for (const c of floor.crates) list.push([c[0], c[1], 44, 44]);
  return list;
}

// True when the segment is blocked by any wall/crate.
export function losBlocked(floor, x1, y1, x2, y2) {
  for (const r of blockersOf(floor)) {
    if (segIntersectsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

// Raycast from (x,y) along angle: distance to the first blocker, capped.
export function raycast(floor, x, y, ang, maxDist) {
  const step = 6;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let d = step; d <= maxDist; d += step) {
    const px = x + dx * d, py = y + dy * d;
    if (px < 0 || px > MAIN_X1 || py < HUD_H || py > CANVAS_H) return d;
    for (const r of blockersOf(floor)) {
      if (pointInRect(px, py, r)) return d;
    }
  }
  return maxDist;
}

// Push a circle (radius r) out of walls/crates; returns corrected [x, y].
export function collideCircle(floor, x, y, r) {
  for (const rect of blockersOf(floor)) {
    const cx = clamp(x, rect[0], rect[0] + rect[2]);
    const cy = clamp(y, rect[1], rect[1] + rect[3]);
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Center inside the rect: push out along the smallest overlap.
        const left = x - rect[0], right = rect[0] + rect[2] - x;
        const top = y - rect[1], bottom = rect[1] + rect[3] - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = rect[0] - r;
        else if (m === right) x = rect[0] + rect[2] + r;
        else if (m === top) y = rect[1] - r;
        else y = rect[1] + rect[3] + r;
      }
    }
  }
  x = clamp(x, 14 + r, MAIN_X1 - 14 - r);
  y = clamp(y, HUD_H + 14 + r, CANVAS_H - 14 - r);
  return [x, y];
}

export function inShadow(floor, x, y) {
  return floor.shadows.some((r) => pointInRect(x, y, r));
}
export function litLamp(floor, lampsLit, x, y) {
  for (let i = 0; i < floor.lamps.length; i++) {
    if (!lampsLit[i]) continue;
    const l = floor.lamps[i];
    if (dist(x, y, l[0], l[1]) < l[2]) return i;
  }
  return -1;
}
export function inSmoke(state, x, y) {
  return state.smokes.some((s) => s.t > 0 && dist(x, y, s.x, s.y) < SMOKE_RADIUS);
}
// Smoke blocks sight when the segment guard->target passes through a cloud.
export function smokeBlocks(state, x1, y1, x2, y2) {
  for (const s of state.smokes) {
    if (s.t <= 0) continue;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      if (dist(px, py, s.x, s.y) < SMOKE_RADIUS * 0.85) return true;
    }
  }
  return false;
}

// Live exposure 0-100 for the player.
export function exposureOf(state) {
  const p = state.player;
  if (inSmoke(state, p.x, p.y)) return 0;
  if (inShadow(state.floor, p.x, p.y)) return 5;
  let e = 40;
  if (litLamp(state.floor, state.lampsLit, p.x, p.y) >= 0) e = 90;
  if (p.running) e += 10;
  return clamp(e, 0, 100);
}

export function alarmStage(maxSuspicion) {
  if (maxSuspicion >= 92) return 'ALARM';
  if (maxSuspicion >= 60) return 'HUNTED';
  if (maxSuspicion >= 30) return 'UNEASY';
  return 'CALM';
}

// --- world state ---------------------------------------------------------

export function newWorld(floorIndex) {
  const floor = LEVELS[floorIndex];
  return {
    floorIndex,
    floor,
    time: 0,
    player: {
      x: floor.start[0], y: floor.start[1], facing: -1.57,
      sneaking: false, running: false, moving: false,
    },
    shardsTaken: floor.shards.map(() => false),
    coinsLeft: floor.coins,
    smokesLeft: floor.smokes,
    coins: [], // flying / landed coins {x,y,tx,ty,t,landed,ring}
    smokes: [], // {x,y,t}
    lampsLit: floor.lamps.map(() => true),
    wires: floor.tripwires.map((w) => ({ a: w[0], b: w[1], cooldown: 0 })),
    laser: floor.laser ? { a: floor.laser[0], b: floor.laser[1], t: 0, cooldown: 0 } : null,
    events: [], // {t, text} newest first, max 2 kept for panel
    toast: null, // {text, t}
    ripples: [], // {x,y,t,max,r}
    score: 0,
    take: 0,
    lives: 3,
    closeCalls: 0,
    spotted: 0,
    nearMissPct: null,
    bestScore: 0,
  };
}
export function pushEvent(state, text) {
  const t = state.time;
  state.events.unshift({ t, text: text.slice(0, 28) });
  if (state.events.length > 2) state.events.length = 2;
}
export function showToast(state, text) {
  state.toast = { text, t: 2.2 };
}
export function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Laser on/off from its cycle clock.
export function laserOn(laser) {
  if (!laser) return false;
  return (laser.t % (LASER_ON + LASER_OFF)) < LASER_ON;
}

// Tripwire check for the player; returns the wire index tripped or -1.
export function checkTripwires(state) {
  const p = state.player;
  for (let i = 0; i < state.wires.length; i++) {
    const w = state.wires[i];
    if (w.cooldown > 0) continue;
    const d = pointSegDist(p.x, p.y, w.a[0], w.a[1], w.b[0], w.b[1]);
    if (d < 14) {
      w.cooldown = TRIPWIRE_REARM;
      return i;
    }
  }
  return -1;
}

// Laser trip check; returns true when the player crosses a live beam.
export function checkLaser(state) {
  const l = state.laser;
  if (!l || !laserOn(l) || l.cooldown > 0) return false;
  const p = state.player;
  const d = pointSegDist(p.x, p.y, l.a[0], l.a[1], l.b[0], l.b[1]);
  if (d < 12) {
    l.cooldown = LASER_COOLDOWN;
    return true;
  }
  return false;
}

export function tickWorldTimers(state, dt) {
  state.time += dt;
  if (state.toast) {
    state.toast.t -= dt;
    if (state.toast.t <= 0) state.toast = null;
  }
  for (const s of state.smokes) s.t = Math.max(0, s.t - dt);
  for (const w of state.wires) w.cooldown = Math.max(0, w.cooldown - dt);
  if (state.laser) {
    state.laser.t += dt;
    state.laser.cooldown = Math.max(0, state.laser.cooldown - dt);
  }
  for (const c of state.coins) {
    if (!c.landed) {
      c.t += dt;
      if (c.t >= 0.35) { c.landed = true; c.ring = 0; }
    } else if (c.ring !== undefined && c.ring < 1) {
      c.ring = Math.min(1, c.ring + dt * 1.4);
    }
  }
  for (const r of state.ripples) r.t -= dt;
  state.ripples = state.ripples.filter((r) => r.t > 0);
  state.smokes = state.smokes.filter((s) => s.t > 0);
}

export function addRipple(state, x, y, max, dur) {
  state.ripples.push({ x, y, t: dur, max, dur });
}
