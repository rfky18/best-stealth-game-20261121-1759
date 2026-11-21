// Staged scenes for the four screenshots. Each one poses the guards,
// Wren, the score and the event feed exactly as the design spec
// describes, then the page draws two frames and flags shotReady.

import { loadFloor, addEvent, showToast } from './world.js';
import { rebuildCone } from './guard.js';

function poseGuard(state, name, x, y, face, suspicion, mode, lastSeen) {
  const g = state.guards.find((gg) => gg.name === name);
  if (!g) return;
  g.x = x;
  g.y = y;
  g.face = face;
  g.suspicion = suspicion;
  g.mode = mode;
  g.lastSeen = lastSeen || null;
  g.lookLeft = 0;
  rebuildCone(g, state);
}

function poseWren(state, x, y, face, sneaking) {
  state.player.x = x;
  state.player.y = y;
  state.player.face = face;
  state.player.sneaking = sneaking;
  state.player.moving = false;
  state.player.running = false;
}

function setEvents(state, list) {
  // list is newest-first: [text, at] pairs.
  state.events = list.map(([text, at]) => ({ text, at }));
  state.time = list[0][1];
}

export function stageShot(state, name) {
  state.screen = 'playing';
  state.toast = null;
  if (name === 'cover') {
    state.floor = 0;
    loadFloor(state);
    poseGuard(state, 'Bram', 240, 240, 0, 6, 'patrol');
    poseGuard(state, 'Sable', 480, 190, Math.PI / 2, 0, 'patrol');
    poseGuard(state, 'Pike', 820, 630, 0, 0, 'patrol');
    poseGuard(state, 'Odo', 900, 220, 0, 0, 'patrol');
    poseWren(state, 560, 440, Math.PI / 4, true);
    state.time = 12.4;
    setEvents(state, [['The depot hums. Nobody has seen you.', 12.4]]);
  } else if (name === 'nearmiss') {
    state.floor = 1;
    loadFloor(state);
    poseGuard(state, 'Bram', 200, 180, 0, 4, 'patrol');
    poseGuard(state, 'Sable', 700, 120, Math.PI / 2, 0, 'patrol');
    poseGuard(state, 'Pike', 800, 640, Math.PI, 10, 'patrol');
    poseGuard(state, 'Odo', 940, 420, -Math.PI / 2, 18, 'patrol');
    poseGuard(state, 'Nyx', 560, 300, Math.PI, 62, 'curious', { x: 460, y: 300 });
    poseWren(state, 460, 300, 0, true);
    state.shardsTaken = new Set([0]);
    state.shardsGot = 4;
    state.score = 650;
    state.closeCalls = 1;
    state.coins = 4;
    showToast(state, 'CLOSE CALL!', 1.8);
    setEvents(state, [
      ['Nyx: WHAT WAS THAT?', 34.8],
      ['Nyx is suspicious…', 31.2],
      ['Close call — they almost had you.', 28.0],
    ]);
  } else if (name === 'smoke') {
    state.floor = 2;
    loadFloor(state);
    poseGuard(state, 'Bram', 200, 200, 0, 6, 'patrol');
    poseGuard(state, 'Sable', 440, 120, 0, 0, 'patrol');
    poseGuard(state, 'Pike', 600, 660, Math.PI, 0, 'patrol');
    poseGuard(state, 'Odo', 850, 120, Math.PI, 0, 'patrol');
    poseGuard(state, 'Nyx', 560, 460, 0, 20, 'patrol');
    poseGuard(state, 'Ash', 900, 450, -Math.PI / 2, 40, 'curious', { x: 660, y: 500 });
    poseWren(state, 660, 500, Math.PI / 2, true);
    state.smokes = [{ x: 660, y: 500, left: 2.8 }];
    state.shardsTaken = new Set([0]);
    state.shardsGot = 7;
    state.score = 1100;
    state.coins = 3;
    state.smokesLeft = 1;
    setEvents(state, [
      ['Smoke out — the cones go blind.', 71.5],
      ['Ash is suspicious…', 68.0],
      ['Ember shard pocketed.', 64.3],
    ]);
  } else if (name === 'exit') {
    state.floor = 2;
    loadFloor(state);
    poseGuard(state, 'Bram', 200, 200, 0, 12, 'patrol');
    poseGuard(state, 'Sable', 440, 120, 0, 0, 'patrol');
    poseGuard(state, 'Pike', 600, 660, Math.PI, 0, 'patrol');
    poseGuard(state, 'Odo', 850, 120, Math.PI, 0, 'patrol');
    poseGuard(state, 'Nyx', 560, 460, Math.PI / 2, 0, 'patrol');
    poseGuard(state, 'Ash', 900, 380, Math.PI, 0, 'patrol');
    poseWren(state, 972, 598, 0, true);
    state.shardsTaken = new Set([0, 1, 2, 3]);
    state.shardsGot = 10;
    state.score = 1400;
    state.coins = 2;
    state.smokesLeft = 1;
    state.spotted = 0;
    setEvents(state, [
      ['The vault door stands open.', 148.2],
      ['Ember shard pocketed.', 145.0],
      ['Nyx lost the trail.', 141.6],
    ]);
  }
  // Rebuild every cone once more so the staged poses draw correctly.
  for (const g of state.guards) rebuildCone(g, state);
}

export const SHOT_NAMES = ['cover', 'nearmiss', 'smoke', 'exit'];
