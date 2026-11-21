// guard.js — patrol, vision cone, suspicion state machine, hearing,
// tripwire response, catching the player, highest suspicion.

import {
  GUARD_CONE_RANGE, GUARD_CONE_HALF, GUARD_ALERT_SPEED,
  GUARD_CHASE_SPEED, GUARD_CHASE_SPEED_VAULT, CATCH_DIST,
  COIN_HEAR_RADIUS, CLOSE_CALL_SCORE,
} from './config.js';
import {
  clamp, dist, angleDiff, losBlocked, smokeBlocks, inShadow,
  litLamp, collideCircle, addRipple, pushEvent, showToast,
} from './world.js';

export function makeGuards(floor, floorIndex) {
  return floor.guards.map((g) => ({
    name: g.name,
    color: g.color,
    x: g.waypoints[0][0],
    y: g.waypoints[0][1],
    facing: g.facing,
    waypoints: g.waypoints,
    wait: g.wait,
    speed: g.speed,
    wp: 1 % g.waypoints.length,
    waiting: 0,
    sweepDir: 1,
    suspicion: 0,
    stage: 'patrol', // patrol | curious | chasing
    lastSeen: null,
    investigate: null,
    lookTimer: 0,
    unseenTimer: 0,
    peak: 0, // highest suspicion reached without a chase
    rippleTimer: 0,
  }));
}

export function guardStageName(g) {
  if (g.stage === 'chasing') return 'CHASING';
  if (g.stage === 'curious') return 'CURIOUS';
  if (g.suspicion >= 60) return 'SUSPICIOUS';
  return 'PATROL';
}

export function maxSuspicion(guards) {
  let m = 0;
  for (const g of guards) m = Math.max(m, g.suspicion);
  return m;
}

// Can this guard see the player right now?
export function guardSees(state, g) {
  const p = state.player;
  const d = dist(g.x, g.y, p.x, p.y);
  if (d > GUARD_CONE_RANGE) return false;
  if (Math.abs(angleDiff(Math.atan2(p.y - g.y, p.x - g.x), g.facing)) > GUARD_CONE_HALF) return false;
  if (losBlocked(state.floor, g.x, g.y, p.x, p.y)) return false;
  if (smokeBlocks(state, g.x, g.y, p.x, p.y)) return false;
  return true;
}

function moveToward(state, g, tx, ty, speed, dt) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + ((tx - g.x) / d) * step;
  const ny = g.y + ((ty - g.y) / d) * step;
  g.facing = Math.atan2(ty - g.y, tx - g.x);
  const [cx, cy] = collideCircle(state.floor, nx, ny, 19);
  g.x = cx; g.y = cy;
  return step >= d - 0.5;
}

export function hearCoin(state, guards, x, y) {
  for (const g of guards) {
    if (dist(g.x, g.y, x, y) < COIN_HEAR_RADIUS) {
      g.suspicion = Math.max(g.suspicion, 28);
      g.investigate = { x, y };
      if (g.stage === 'patrol') g.stage = 'curious';
    }
  }
}

export function alertAllGuards(state, guards, x, y, amount) {
  for (const g of guards) {
    g.suspicion = clamp(g.suspicion + amount, 0, 100);
    g.investigate = { x, y };
    if (g.stage === 'patrol' && g.suspicion >= 60) g.stage = 'curious';
    else if (g.stage === 'patrol') g.stage = 'curious';
  }
}

export function updateGuards(state, guards, dt, onCaught, onSpotted) {
  const p = state.player;
  const floorIndex = state.floorIndex;
  for (const g of guards) {
    const sees = guardSees(state, g);
    const d = dist(g.x, g.y, p.x, p.y);

    if (sees) {
      let rate = inShadow(state.floor, p.x, p.y) ? 16 : 55;
      if (litLamp(state.floor, state.lampsLit, p.x, p.y) >= 0) rate += 14;
      if (d < 70) rate += 30;
      if (p.running) rate += 18;
      g.suspicion = clamp(g.suspicion + rate * dt, 0, 100);
      g.lastSeen = { x: p.x, y: p.y };
      g.unseenTimer = 0;
      if (g.suspicion > g.peak) g.peak = g.suspicion;
    } else {
      g.suspicion = clamp(g.suspicion - 14 * dt, 0, 100);
      g.unseenTimer += dt;
    }
    // Footstep noise: running near a guard raises suspicion.
    if (p.running && p.moving && d < 95 && !sees) {
      g.suspicion = clamp(g.suspicion + 22 * dt, 0, 100);
    }

    // Stage transitions.
    const wasStage = g.stage;
    if (g.suspicion >= 92) g.stage = 'chasing';
    else if (g.suspicion >= 60) g.stage = 'curious';
    else if (g.stage === 'chasing' && g.unseenTimer > 4) g.stage = 'curious';
    else if (g.stage === 'curious' && g.suspicion < 60 && !g.investigate) g.stage = 'patrol';
    else if (g.stage === 'curious' && g.suspicion < 60 && g.investigate && g.lookTimer <= 0) {
      g.investigate = null;
      g.stage = 'patrol';
    }
    if (g.stage === 'chasing' && wasStage !== 'chasing') {
      state.spotted += 1;
      pushEvent(state, `${g.name}: WHAT WAS THAT?`);
      showToast(state, 'SPOTTED!');
      if (onSpotted) onSpotted(g);
    }

    // Near miss: peaked above 45, fell below 15, never chased.
    if (g.peak > 45 && g.suspicion < 15 && wasStage !== 'chasing' && g.stage !== 'chasing') {
      state.closeCalls += 1;
      state.score += CLOSE_CALL_SCORE;
      state.nearMissPct = Math.round(g.peak);
      showToast(state, 'CLOSE CALL!');
      pushEvent(state, 'Close call — almost had you.');
      g.peak = 0;
    }

    // Movement by stage.
    if (g.stage === 'chasing') {
      const speed = floorIndex === 2 ? GUARD_CHASE_SPEED_VAULT : GUARD_CHASE_SPEED;
      moveToward(state, g, p.x, p.y, speed, dt);
      if (dist(g.x, g.y, p.x, p.y) < CATCH_DIST) {
        if (onCaught) onCaught(g);
        return;
      }
    } else if (g.stage === 'curious') {
      const target = g.lastSeen || g.investigate;
      if (target) {
        const arrived = moveToward(state, g, target.x, target.y, GUARD_ALERT_SPEED, dt);
        if (arrived) {
          g.lookTimer = Math.max(g.lookTimer, 1.4);
          if (g.lastSeen && dist(g.x, g.y, g.lastSeen.x, g.lastSeen.y) < 12) g.lastSeen = null;
          if (g.investigate && dist(g.x, g.y, g.investigate.x, g.investigate.y) < 12) g.investigate = null;
        }
      } else {
        g.lookTimer = Math.max(g.lookTimer, 0.2);
      }
      if (g.lookTimer > 0) {
        g.lookTimer -= dt;
        g.facing += 0.9 * dt * g.sweepDir;
        if (g.lookTimer <= 0) { g.stage = 'patrol'; g.lookTimer = 0; }
      }
    } else {
      // Patrol: walk to next waypoint, wait and sweep there.
      if (g.waiting > 0) {
        g.waiting -= dt;
        g.facing += 0.35 * dt * g.sweepDir;
      } else {
        const wp = g.waypoints[g.wp];
        const arrived = moveToward(state, g, wp[0], wp[1], g.speed, dt);
        if (arrived) {
          g.wp = (g.wp + 1) % g.waypoints.length;
          g.waiting = g.wait;
          g.sweepDir = -g.sweepDir;
        }
      }
    }

    // Footstep ripples.
    g.rippleTimer -= dt;
    if (g.rippleTimer <= 0) {
      addRipple(state, g.x, g.y, 26, 0.9);
      g.rippleTimer = 0.55;
    }
  }
}
