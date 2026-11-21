// shots.js — the four staged screenshot scenes. Positions below are in
// REFERENCE space (x 0-1008); every x is scaled by 15/14 like floor
// geometry. Each scene sets guard/camera/player state, score, events
// and time, then main.js draws it twice and flags shotReady.

import { scalePoint } from './config.js';
import { showToast } from './world.js';

function setGuard(game, name, refX, refY, facing, suspicion, stage, lastSeenRef) {
  const g = game.state._guards.find((gg) => gg.name === name);
  if (!g) return;
  const [x, y] = scalePoint([refX, refY]);
  g.x = x; g.y = y;
  g.facing = facing;
  g.suspicion = suspicion;
  g.stage = stage || (suspicion >= 92 ? 'chasing' : suspicion >= 60 ? 'curious' : 'patrol');
  g.peak = suspicion;
  if (lastSeenRef) g.lastSeen = { x: scalePoint(lastSeenRef)[0], y: lastSeenRef[1] };
}

function setPlayer(game, refX, refY, facing, sneaking) {
  const p = game.state.player;
  const [x, y] = scalePoint([refX, refY]);
  p.x = x; p.y = y;
  p.facing = facing;
  p.sneaking = !!sneaking;
  p.running = false;
  p.moving = false;
}

function setEvents(game, list) {
  // list: [text, time] newest first.
  game.state.events = list.map(([text, t]) => ({ t, text }));
}

function takeShards(game, count) {
  for (let i = 0; i < count && i < game.state.shardsTaken.length; i++) {
    game.state.shardsTaken[i] = true;
  }
}

export function applyShot(game, name, loadFloor) {
  const S = game.state;
  if (name === 'cover') {
    loadFloor(0, { score: 0, take: 0, lives: 3, closeCalls: 0, spotted: 0, nearMissPct: null, lootBefore: 0 });
    setGuard(game, 'Bram', 240, 240, 0, 6);
    setGuard(game, 'Sable', 480, 190, 1.57, 0);
    setGuard(game, 'Pike', 820, 630, 0, 0);
    setGuard(game, 'Odo', 900, 220, 0, 0);
    setPlayer(game, 560, 440, 0.78, true);
    game.state.time = 12.4;
    setEvents(game, [['The depot hums. All quiet.', 12.4]]);
  } else if (name === 'nearmiss') {
    loadFloor(1, { score: 850, take: 900, lives: 3, closeCalls: 1, spotted: 0, nearMissPct: 62, lootBefore: 5 });
    setGuard(game, 'Bram', 200, 180, 0, 4);
    setGuard(game, 'Sable', 700, 120, 1.57, 0);
    setGuard(game, 'Pike', 800, 640, 3.14, 10);
    setGuard(game, 'Odo', 940, 420, -1.57, 18);
    setGuard(game, 'Nyx', 560, 300, 3.14, 62, 'curious', [460, 300]);
    setPlayer(game, 460, 300, 0, true);
    takeShards(game, 1);
    game.state.coinsLeft = 4;
    game.state.time = 34.8;
    game.state.nearMissPct = 62;
    showToast(game.state, 'CLOSE CALL!');
    setEvents(game, [
      ['Nyx: WHAT WAS THAT?', 34.8],
      ['Nyx is suspicious…', 31.2],
      ['Close call — almost had you.', 28.0],
    ]);
  } else if (name === 'camera') {
    loadFloor(2, { score: 1650, take: 1800, lives: 3, closeCalls: 1, spotted: 0, nearMissPct: 62, lootBefore: 10 });
    setGuard(game, 'Bram', 200, 200, 0, 6);
    setGuard(game, 'Sable', 440, 120, 0, 0);
    setGuard(game, 'Pike', 600, 660, 3.14, 0);
    setGuard(game, 'Odo', 850, 120, 3.14, 0);
    setGuard(game, 'Nyx', 560, 460, 0, 20);
    setGuard(game, 'Ash', 900, 450, -1.57, 40, 'curious', [660, 500]);
    setPlayer(game, 660, 500, 1.57, true);
    const [sx, sy] = scalePoint([660, 500]);
    game.state.smokes.push({ x: sx, y: sy, t: 2.8 });
    game.state.smokesLeft = 1;
    game.state.coinsLeft = 3;
    if (game.state.laser) game.state.laser.t = 2.5; // off phase (2.2 on / 1.8 off)
    takeShards(game, 2);
    game.state.time = 71.5;
    setEvents(game, [
      ['Smoke out — cones go blind.', 71.5],
      ['Ash is suspicious…', 68.0],
      ['Ember shard pocketed.', 64.3],
    ]);
  } else if (name === 'exit') {
    loadFloor(2, { score: 2250, take: 2400, lives: 3, closeCalls: 0, spotted: 0, nearMissPct: null, lootBefore: 10 });
    setGuard(game, 'Bram', 200, 200, 0, 12);
    setGuard(game, 'Sable', 440, 120, 0, 0);
    setGuard(game, 'Pike', 600, 660, 3.14, 0);
    setGuard(game, 'Odo', 850, 120, 3.14, 0);
    setGuard(game, 'Nyx', 560, 460, 1.57, 0);
    setGuard(game, 'Ash', 900, 380, 3.14, 0);
    setPlayer(game, 972, 598, 0, true);
    if (game.state.laser) game.state.laser.t = 0.5; // on phase
    takeShards(game, 6);
    game.state.coinsLeft = 2;
    game.state.smokesLeft = 1;
    game.state.time = 148.2;
    game.campaignDone = true;
    setEvents(game, [
      ['The vault door stands open.', 148.2],
      ['Ember shard pocketed.', 145.0],
      ['Nyx lost the trail.', 141.6],
    ]);
  }
}
