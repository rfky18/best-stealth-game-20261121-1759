// main.js — boot, fixed-step loop, screens, GHOST bonus, best score.

import { LEVELS, TOTAL_SHARDS } from './config.js';
import { newWorld, tickWorldTimers, pushEvent, showToast, checkTripwires, checkLaser } from './world.js';
import { makeGuards, updateGuards, alertAllGuards, maxSuspicion } from './guard.js';
import { makeCameras, updateCameras, tripLaser } from './camera.js';
import {
  movePlayer, throwCoin, updateCoins, dropSmoke, douseLamp, pickupShards,
  exitReached, awardFloorClear, respawn, shardsLeft,
} from './player.js';
import { createInput } from './input.js';
import { playSound, toggleMute } from './audio.js';
import { drawScene } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const game = {
  screen: 'title', // title | card | play | paused | caught | gameover | win
  state: null,
  bestScore: 0,
  lootBefore: 0,
  campaignDone: false,
  cardTimer: 0,
  caughtTimer: 0,
  ghostAwarded: false,
};
try { game.bestScore = Number(localStorage.getItem('emberwatch-best') || 0) || 0; } catch { game.bestScore = 0; }

function loadFloor(index, carry) {
  const state = newWorld(index);
  state.score = carry.score;
  state.take = carry.take;
  state.lives = carry.lives;
  state.closeCalls = carry.closeCalls;
  state.spotted = carry.spotted;
  state.nearMissPct = carry.nearMissPct;
  state.bestScore = game.bestScore;
  const guards = makeGuards(state.floor, index);
  const cameras = makeCameras(state.floor);
  state._guards = guards;
  state._cameras = cameras;
  state.dt = 0;
  game.state = state;
  game.lootBefore = carry.lootBefore;
  if (index === 0) pushEvent(state, 'The depot hums. All quiet.');
  else if (index === 1) pushEvent(state, 'The gallery sleeps. Tread.');
  else pushEvent(state, 'The vault door stands open.');
  return state;
}

function freshGame() {
  game.lootBefore = 0;
  game.campaignDone = false;
  game.ghostAwarded = false;
  loadFloor(0, { score: 0, take: 0, lives: 3, closeCalls: 0, spotted: 0, nearMissPct: null, lootBefore: 0 });
  game.screen = 'title';
}

function saveBest() {
  if (game.state.score > game.bestScore) {
    game.bestScore = game.state.score;
    try { localStorage.setItem('emberwatch-best', String(game.bestScore)); } catch { /* storage unavailable */ }
  }
}

function onCaught(g) {
  const state = game.state;
  playSound('caught');
  state.lives -= 1;
  saveBest();
  if (state.lives <= 0) {
    game.screen = 'gameover';
  } else {
    game.screen = 'caught';
    game.caughtTimer = 1.6;
  }
}

function onSpotted() { playSound('alarm'); }
function onCamAlarm() { playSound('camAlarm'); }

function floorCleared() {
  const state = game.state;
  awardFloorClear(state);
  playSound('door');
  game.lootBefore += state.floor.shards.length;
  if (state.floorIndex >= 2) {
    if (state.spotted === 0 && !game.ghostAwarded) {
      state.score += 500;
      game.ghostAwarded = true;
    }
    game.campaignDone = true;
    saveBest();
    playSound('win');
    game.screen = 'win';
    return;
  }
  const carry = {
    score: state.score, take: state.take, lives: state.lives,
    closeCalls: state.closeCalls, spotted: state.spotted,
    nearMissPct: state.nearMissPct, lootBefore: game.lootBefore,
  };
  loadFloor(state.floorIndex + 1, carry);
  game.screen = 'card';
  game.cardTimer = 2.6;
}

function update(dt) {
  const state = game.state;
  state.dt = dt;
  if (game.screen === 'card') {
    game.cardTimer -= dt;
    if (game.cardTimer <= 0) game.screen = 'play';
    return;
  }
  if (game.screen === 'caught') {
    game.caughtTimer -= dt;
    if (game.caughtTimer <= 0) {
      respawn(state, state._guards);
      game.screen = 'play';
    }
    return;
  }
  if (game.screen !== 'play') return;

  // Mouse click = throw a coin.
  if (input.click) {
    const c = input.click;
    input.click = null;
    if (c.x < 1080) throwCoin(state, state._guards, c.x, c.y, playSound);
  }
  movePlayer(state, input, dt);
  updateCoins(state, state._guards, playSound);
  pickupShards(state, playSound);
  updateGuards(state, state._guards, dt, onCaught, onSpotted);
  if (game.screen !== 'play') return; // caught during guard update
  updateCameras(state, state._cameras, state._guards, onCamAlarm);
  const wire = checkTripwires(state);
  if (wire >= 0) {
    const w = state.wires[wire];
    alertAllGuards(state, state._guards, (w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, 25);
    pushEvent(state, 'Tripwire tripped! Hide!');
    showToast(state, 'TRIPWIRE!');
    playSound('wire');
  }
  if (checkLaser(state)) {
    tripLaser(state, state._guards, () => playSound('laser'));
  }
  tickWorldTimers(state, dt);
  if (exitReached(state)) floorCleared();
  if (statusEl) {
    statusEl.textContent = `Night ${state.floorIndex + 1} · ${state.floor.name} · Score ${state.score} · Take $${state.take} · Shards left ${shardsLeft(state)}`;
  }
}

function handleAction(action) {
  const state = game.state;
  if (action === 'confirm') {
    if (game.screen === 'title') { game.screen = 'card'; game.cardTimer = 2.6; }
    else if (game.screen === 'caught') { respawn(state, state._guards); game.screen = 'play'; }
    else if (game.screen === 'gameover' || game.screen === 'win') freshGame();
  } else if (action === 'pause') {
    if (game.screen === 'play') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'play';
  } else if (action === 'restart') {
    freshGame();
  } else if (action === 'mute') {
    toggleMute();
  } else if (game.screen === 'play') {
    if (action === 'smoke') dropSmoke(state, playSound);
    else if (action === 'douse') douseLamp(state, playSound);
    else if (action === 'coinKey') {
      const p = state.player;
      throwCoin(state, state._guards, p.x + Math.cos(p.facing) * 150, p.y + Math.sin(p.facing) * 150, playSound);
    }
  }
}

const input = createInput(canvas, handleAction);

freshGame();
window.__emberwatch = game; // test hook for headless smoke tests

// Shot mode: stage one scene, draw two frames, flag ready. No loop.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot, loadFloor);
  game.screen = 'play';
  drawScene(ctx, game);
  drawScene(ctx, game);
  document.documentElement.dataset.shotReady = '1';
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (acc >= step && n < 5) {
      update(step);
      acc -= step;
      n++;
    }
    drawScene(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
