// EMBERWATCH: Night Shift — shots.js
// 4 scene staged untuk screenshot (dipicu ?shot=nama&seed=1).
// Setiap scene membangun state lantai penuh lalu menimpa posisi,
// suspicion, kamera, skor, event, dan toast sesuai spek scene.
// Tidak menjalankan loop: render menggambar dua frame lalu flag shotReady.

import { newFloorState } from './world.js';
import { newPlayer } from './player.js';

function placeGuard(state, name, x, y, face, suspicion, gstate, lastSeen) {
  const g = state.guards.find((gg) => gg.name === name);
  if (!g) return;
  g.x = x; g.y = y; g.face = face;
  g.suspicion = suspicion;
  g.peak = suspicion;
  g.state = gstate || 'patrol';
  g.lastSeen = lastSeen || null;
  g.lookT = 0;
  g.blindT = 99;
  g.waiting = 0;
}

function setCamera(state, id, alert, base, phase) {
  const c = state.cameras.find((cc) => cc.id === id);
  if (!c) return;
  c.alert = alert;
  if (base !== undefined) c.base = base;
  if (phase !== undefined) c.phase = phase;
}

function setEvents(state, list) {
  state.events = list.map(([t, text]) => ({ t, text }));
}

function markShardsGot(state, indices) {
  for (const i of indices) {
    if (state.shards[i]) state.shards[i].got = true;
  }
}

function baseGame(floorIdx, carry) {
  const state = newFloorState(floorIdx, carry);
  state.best = 0;
  state.lives = 3;
  const player = newPlayer(state.floor);
  return { state, player, screen: 'playing', nightT: 0, ghostAwarded: false, muted: false };
}

function sceneCover() {
  const g = baseGame(0, null);
  const s = g.state;
  s.time = 12.4;
  placeGuard(s, 'Bram', 240, 240, 0, 6);
  placeGuard(s, 'Sable', 480, 190, 1.57, 0);
  placeGuard(s, 'Pike', 820, 630, 0, 0);
  placeGuard(s, 'Odo', 900, 220, 0, 0);
  setCamera(s, 'C1', 0);
  g.player.x = 560; g.player.y = 440;
  g.player.face = 0.785;
  g.player.sneaking = true;
  setEvents(s, [[12.4, 'The depot hums. All quiet.']]);
  return g;
}

function sceneNearmiss() {
  const carry = {
    score: 850, take: 900, lootTotal: 6, spotted: 0, closeCalls: 1,
    lives: 3, totalTime: 0, nightDone: [true, false, false], events: [],
    nearMissPct: 62,
  };
  const g = baseGame(1, carry);
  const s = g.state;
  s.time = 34.8;
  s.coins = 4;
  s.nearMissPct = 62;
  markShardsGot(s, [0]); // 1 shard lantai 2 sudah dipungut
  placeGuard(s, 'Bram', 200, 180, 0, 4);
  placeGuard(s, 'Sable', 700, 120, 1.57, 0);
  placeGuard(s, 'Pike', 800, 640, 3.14, 10);
  placeGuard(s, 'Odo', 940, 420, -1.57, 18);
  placeGuard(s, 'Nyx', 560, 300, 3.14, 62, 'curious', { x: 460, y: 300 });
  setCamera(s, 'C1', 0);
  g.player.x = 460; g.player.y = 300;
  g.player.face = 0;
  g.player.sneaking = true;
  s.toast = 'CLOSE CALL!';
  s.toastT = 1.0;
  setEvents(s, [
    [28.0, 'Close call — almost had you.'],
    [31.2, 'Nyx is suspicious…'],
    [34.8, 'Nyx: WHAT WAS THAT?'],
  ]);
  return g;
}

function sceneCamera() {
  const carry = {
    score: 1650, take: 1800, lootTotal: 12, spotted: 0, closeCalls: 1,
    lives: 3, totalTime: 0, nightDone: [true, true, false], events: [],
    nearMissPct: 62,
  };
  const g = baseGame(2, carry);
  const s = g.state;
  s.time = 71.5;
  s.coins = 3;
  s.smokesLeft = 1;
  s.nearMissPct = 62;
  markShardsGot(s, [0, 1]); // 2 shard lantai 3 sudah dipungut
  placeGuard(s, 'Bram', 200, 200, 0, 6);
  placeGuard(s, 'Sable', 440, 120, 0, 0);
  placeGuard(s, 'Pike', 600, 660, 3.14, 0);
  placeGuard(s, 'Odo', 850, 120, 3.14, 0);
  placeGuard(s, 'Nyx', 560, 460, 0, 20);
  placeGuard(s, 'Ash', 900, 450, -1.57, 40, 'curious', { x: 660, y: 500 });
  // C1 menyapu ke arah asap di (660,500): fase disetel agar cone mengarah ke sana.
  setCamera(s, 'C1', 18, undefined, 1.05);
  setCamera(s, 'C2', 0);
  g.player.x = 660; g.player.y = 500;
  g.player.face = 1.57;
  g.player.sneaking = true;
  s.smokes.push({ x: 660, y: 500, r: 72, ttl: 3.5, t: 0.7 });
  if (s.laser) s.laser.clock = 3.0; // laser MATI (garis putus-putus redup)
  setEvents(s, [
    [64.3, 'Ember shard pocketed.'],
    [68.0, 'Ash is suspicious…'],
    [71.5, 'Smoke out — cones go blind.'],
  ]);
  return g;
}

function sceneExit() {
  const carry = {
    score: 2250, take: 2400, lootTotal: 16, spotted: 0, closeCalls: 1,
    lives: 3, totalTime: 0, nightDone: [true, true, true], events: [],
    nearMissPct: 62,
  };
  const g = baseGame(2, carry);
  const s = g.state;
  s.time = 148.2;
  s.coins = 2;
  s.smokesLeft = 1;
  s.nearMissPct = 62;
  markShardsGot(s, [0, 1, 2, 3, 4, 5]); // semua shard lantai 3
  s.floorDone = true;
  placeGuard(s, 'Bram', 200, 200, 0, 12);
  placeGuard(s, 'Sable', 440, 120, 0, 0);
  placeGuard(s, 'Pike', 600, 660, 3.14, 0);
  placeGuard(s, 'Odo', 850, 120, 3.14, 0);
  placeGuard(s, 'Nyx', 560, 460, 1.57, 0);
  placeGuard(s, 'Ash', 900, 380, 3.14, 0);
  setCamera(s, 'C1', 0, -2.36); // hadap kiri-atas
  setCamera(s, 'C2', 0, 1.57); // hadap bawah
  g.player.x = 972; g.player.y = 598;
  g.player.face = 0;
  g.player.sneaking = true;
  if (s.laser) s.laser.clock = 0.5; // laser MENYALA (solid + glow)
  setEvents(s, [
    [141.6, 'Nyx lost the trail.'],
    [145.0, 'Ember shard pocketed.'],
    [148.2, 'The vault door stands open.'],
  ]);
  return g;
}

export function stageShot(name) {
  switch (name) {
    case 'cover': return sceneCover();
    case 'nearmiss': return sceneNearmiss();
    case 'camera': return sceneCamera();
    case 'exit': return sceneExit();
    default: return null;
  }
}
