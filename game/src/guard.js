// Guards: patrol loops, vision cones, suspicion, the patrol /
// curious / chase state machine, coin hearing, tripwire response,
// being caught, and the highest suspicion on the floor.

import {
  FLOORS, CONE_RANGE, CONE_HALF, CONE_RAYS, CURIOUS_SPEED,
  CHASE_SPEED, CHASE_SPEED_VAULT, CATCH_R, LOOK_TIME, FORGET_TIME,
  SUSPECT_CURIOUS, SUSPECT_CHASE, CLOSE_CALL_HIGH, CLOSE_CALL_LOW,
  SCORE_CLOSE_CALL, COIN_HEAR_R, TRIP_BOOST,
  clamp, dist,
} from './config.js';
import {
  hasLineOfSight, raycast, inShadow, lampAt, inSmoke, smokeBlocks,
  addEvent, showToast,
} from './world.js';

// Can this guard see the player right now?
export function guardSeesPlayer(g, state) {
  const p = state.player;
  const floor = FLOORS[state.floor];
  const d = dist(g.x, g.y, p.x, p.y);
  if (d > CONE_RANGE) return false;
  let ang = Math.atan2(p.y - g.y, p.x - g.x) - g.face;
  while (ang > Math.PI) ang -= Math.PI * 2;
  while (ang < -Math.PI) ang += Math.PI * 2;
  if (Math.abs(ang) > CONE_HALF) return false;
  if (!hasLineOfSight(g.x, g.y, p.x, p.y, floor)) return false;
  if (inSmoke(p.x, p.y, state)) return false;
  if (smokeBlocks(g.x, g.y, p.x, p.y, state)) return false;
  return true;
}

// Rebuild the guard's vision cone polygon (raycast, clipped by solids).
export function rebuildCone(g, state) {
  const floor = FLOORS[state.floor];
  const pts = [{ x: g.x, y: g.y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = g.face - CONE_HALF + (2 * CONE_HALF * i) / CONE_RAYS;
    const d = raycast(g.x, g.y, a, CONE_RANGE, floor);
    pts.push({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d });
  }
  g.cone = pts;
}

function coneColor(g) {
  if (g.mode === 'chase') return 'rgba(255, 70, 70, 0.30)';
  if (g.mode === 'curious') return 'rgba(255, 165, 0, 0.28)';
  if (g.suspicion >= SUSPECT_CURIOUS) return 'rgba(255, 200, 60, 0.28)';
  return 'rgba(255, 235, 150, 0.20)';
}

export function guardConeColor(g) {
  return coneColor(g);
}

// One fixed-step tick for a single guard. Returns 'caught' when this
// guard touches the player while chasing.
export function tickGuard(g, state, dt, sfx) {
  const p = state.player;
  const floor = FLOORS[state.floor];
  const sees = guardSeesPlayer(g, state);
  const d = dist(g.x, g.y, p.x, p.y);

  // --- suspicion ------------------------------------------------------
  if (sees) {
    let rate = inShadow(p.x, p.y, floor) ? 16 : 55;
    if (lampAt(p.x, p.y, state)) rate += 14;
    if (d < 70) rate += 30;
    if (!p.sneaking && p.moving) rate += 18;
    g.suspicion = clamp(g.suspicion + rate * dt, 0, 100);
    g.lastSeen = { x: p.x, y: p.y };
    g.unseenFor = 0;
  } else {
    g.suspicion = clamp(g.suspicion - 14 * dt, 0, 100);
    g.unseenFor += dt;
  }
  // Loud running nearby is heard even unseen.
  if (!sees && p.moving && !p.sneaking && d < 95) {
    g.suspicion = clamp(g.suspicion + 22 * dt, 0, 100);
  }

  // --- stage changes ---------------------------------------------------
  const wasMode = g.mode;
  if (g.suspicion >= SUSPECT_CHASE) {
    if (g.mode !== 'chase') {
      g.mode = 'chase';
      g.unseenFor = 0;
      g.chasedThisRun = true;
      state.spotted += 1;
      addEvent(state, `${g.name}: WHAT WAS THAT?`);
      if (sfx) sfx.alarm();
    }
  } else if (g.suspicion >= SUSPECT_CURIOUS) {
    if (g.mode === 'chase') g.mode = 'curious';
    else if (g.mode === 'patrol') g.mode = 'curious';
  } else if (g.mode !== 'patrol') {
    if (g.mode === 'chase' && g.unseenFor < FORGET_TIME) {
      // stays chasing a little longer, then drops to curious
    } else if (g.mode === 'chase') {
      g.mode = 'curious';
      addEvent(state, `${g.name} lost the trail.`);
    } else if (g.suspicion < 5 && g.mode === 'curious' && !g.lastSeen) {
      g.mode = 'patrol';
    }
  }
  if (wasMode === 'chase' && g.mode === 'curious') {
    g.lookLeft = LOOK_TIME;
  }

  // --- near miss: suspicion spiked then faded without a chase ---------
  if (g.suspicion > g.peak) g.peak = g.suspicion;
  if (g.peak > CLOSE_CALL_HIGH && g.suspicion < CLOSE_CALL_LOW && !g.chasedThisRun) {
    g.peak = 0;
    state.closeCalls += 1;
    state.score += SCORE_CLOSE_CALL;
    showToast(state, 'CLOSE CALL!');
    addEvent(state, 'Close call — they almost had you.');
  }
  if (g.suspicion < CLOSE_CALL_LOW) {
    g.peak = Math.min(g.peak, g.suspicion);
    g.chasedThisRun = false;
  }

  // --- movement --------------------------------------------------------
  if (g.mode === 'patrol') {
    patrolStep(g, state, dt);
  } else if (g.mode === 'curious') {
    const target = g.lastSeen;
    if (target && dist(g.x, g.y, target.x, target.y) > 12) {
      walkToward(g, state, target.x, target.y, CURIOUS_SPEED, dt);
    } else if (g.lookLeft > 0) {
      g.lookLeft -= dt;
      g.face += 0.9 * dt;
    } else if (g.suspicion < 5) {
      g.mode = 'patrol';
      g.lastSeen = null;
      g.lookLeft = 0;
    } else {
      g.lookLeft = LOOK_TIME;
    }
  } else {
    const speed = state.floor === 2 ? CHASE_SPEED_VAULT : CHASE_SPEED;
    walkToward(g, state, p.x, p.y, speed, dt);
    if (d < CATCH_R) return 'caught';
  }

  // Footstep ripples while moving.
  g.stepAt -= dt;
  if (g.stepAt <= 0 && (g.mode !== 'patrol' || g.waiting <= 0)) {
    const moving = g.mode !== 'patrol' ? true : g.waiting <= 0;
    if (moving) {
      state.ripples.push({
        x: g.x, y: g.y, r: 6, max: 26, left: 0.9, total: 0.9, color: g.color,
      });
      g.stepAt = g.mode === 'chase' ? 0.32 : 0.5;
    }
  }

  rebuildCone(g, state);
  return null;
}

function patrolStep(g, state, dt) {
  const target = g.path[g.wp];
  const d = dist(g.x, g.y, target.x, target.y);
  if (d < 6) {
    if (g.waiting <= 0) g.waiting = g.wait;
    g.waiting -= dt;
    // Slow scanning sweep while waiting at a waypoint.
    g.sweep += dt;
    g.face += Math.sin(g.sweep * 1.4) * 0.55 * dt;
    if (g.waiting <= 0) {
      g.wp = (g.wp + 1) % g.path.length;
      g.sweep = 0;
    }
    return;
  }
  walkToward(g, state, target.x, target.y, g.speed, dt);
}

function walkToward(g, state, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  const step = Math.min(d, speed * dt);
  const nx = g.x + (dx / d) * step;
  const ny = g.y + (dy / d) * step;
  // Guards walk around walls and crates with a simple axis slide.
  const floor = FLOORS[state.floor];
  let okX = true;
  let okY = true;
  for (const r of floor.walls) {
    if (nx > r.x - 14 && nx < r.x + r.w + 14 && g.y > r.y - 14 && g.y < r.y + r.h + 14) okX = false;
    if (g.x > r.x - 14 && g.x < r.x + r.w + 14 && ny > r.y - 14 && ny < r.y + r.h + 14) okY = false;
  }
  for (const c of floor.crates) {
    if (nx > c.x - 14 && nx < c.x + 44 + 14 && g.y > c.y - 14 && g.y < c.y + 44 + 14) okX = false;
    if (g.x > c.x - 14 && g.x < c.x + 44 + 14 && ny > c.y - 14 && ny < c.y + 44 + 14) okY = false;
  }
  if (okX) g.x = nx;
  if (okY) g.y = ny;
  g.face = Math.atan2(ty - g.y, tx - g.x);
}

// A coin just landed: guards in earshot turn curious toward it.
export function guardsHearCoin(state, x, y) {
  for (const g of state.guards) {
    if (dist(g.x, g.y, x, y) <= COIN_HEAR_R) {
      if (g.suspicion < 28) g.suspicion = 28;
      g.lastSeen = { x, y };
      if (g.mode === 'patrol') g.mode = 'curious';
      g.lookLeft = 0;
      addEvent(state, `${g.name} heard something.`);
    }
  }
}

// A tripwire fired: every guard on the floor gets suspicious and
// converges on the middle of the wire.
export function guardsTripwire(state, wire) {
  const mx = (wire.x1 + wire.x2) / 2;
  const my = (wire.y1 + wire.y2) / 2;
  for (const g of state.guards) {
    g.suspicion = clamp(g.suspicion + TRIP_BOOST, 0, 100);
    g.lastSeen = { x: mx, y: my };
    if (g.mode === 'patrol') g.mode = 'curious';
    g.lookLeft = 0;
  }
  addEvent(state, 'Tripwire tripped — the whole floor heard it.');
}

// Calm every guard (after being caught): suspicion 18, back to patrol.
export function calmGuards(state) {
  for (const g of state.guards) {
    g.suspicion = 18;
    g.mode = 'patrol';
    g.lastSeen = null;
    g.lookLeft = 0;
    g.unseenFor = 0;
    g.peak = 0;
    g.chasedThisRun = false;
    rebuildCone(g, state);
  }
}

export function maxSuspicion(state) {
  let m = 0;
  for (const g of state.guards) m = Math.max(m, g.suspicion);
  return m;
}

export function guardWord(g) {
  if (g.mode === 'chase') return 'CHASING';
  if (g.mode === 'curious') return g.suspicion >= SUSPECT_CURIOUS ? 'SUSPICIOUS' : 'CURIOUS';
  return 'PATROL';
}
