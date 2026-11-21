// EMBERWATCH: Night Shift — main.js
// Boot, loop fixed-step 1/60 detik, layar, bonus GHOST sekali saat menang,
// skor terbaik (localStorage), mode screenshot staged (?shot=nama).

import { FLOORS, NIGHT_CARD_TIME, GHOST_PTS, LIVES_MAX } from './config.js';
import { newFloorState, addEvent, updateWires } from './world.js';
import { updateGuard, maxSuspicion } from './guard.js';
import { updateCameras, updateLaser } from './camera.js';
import {
  newPlayer, updatePlayer, throwCoin, updateCoins,
  dropSmoke, updateSmokes, douseLamp, updateShards,
  atExit, completeFloor, respawnAfterCatch, updateNearMiss,
  isRunning,
} from './player.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();

const BEST_KEY = 'emberwatch-best';
const params = new URLSearchParams(window.location.search);

function loadBest() {
  try {
    return parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(v) {
  try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* abaikan */ }
}

// ---------- game ----------

function createGame() {
  const state = newFloorState(0, null);
  state.best = loadBest();
  const player = newPlayer(state.floor);
  return {
    state,
    player,
    screen: 'title', // title | night | playing | paused | win | over
    nightT: 0,
    ghostAwarded: false,
    muted: false,
  };
}

let game = createGame();

function startFloor(idx, carry) {
  const state = newFloorState(idx, carry);
  state.best = game.state.best;
  game.state = state;
  game.player = newPlayer(state.floor);
  game.screen = 'night';
  game.nightT = NIGHT_CARD_TIME;
  if (idx > 0) {
    addEvent(state, 'Night ' + state.floor.night + ' — ' + state.floor.name.toLowerCase() + '.');
  } else {
    addEvent(state, 'The depot hums. All quiet.');
  }
}

function startGame() {
  game = createGame();
  game.state.best = loadBest();
  startFloor(0, null);
}

function winGame() {
  if (!game.ghostAwarded && game.state.spotted === 0) {
    game.state.score += GHOST_PTS;
    game.ghostAwarded = true;
  }
  game.screen = 'win';
  if (game.state.score > game.state.best) {
    game.state.best = game.state.score;
    saveBest(game.state.best);
  }
  audio.win();
}

// ---------- aksi ----------

function onAction(kind, data) {
  audio.unlock();
  if (kind === 'mute') {
    game.muted = audio.toggleMute();
    return;
  }
  if (kind === 'restart') {
    startGame();
    return;
  }
  if (game.screen === 'title') {
    if (kind === 'confirm') startGame();
    return;
  }
  if (game.screen === 'win' || game.screen === 'over') {
    if (kind === 'confirm') startGame();
    return;
  }
  if (kind === 'pause') {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
    return;
  }
  if (game.screen !== 'playing') return;
  if (game.screen === 'night') return;
  switch (kind) {
    case 'click':
      if (data && data.x < 1008 && data.y > 56) {
        throwCoin(game.player, game.state, data.x, data.y, audio);
      }
      break;
    case 'coin': {
      const mx = input.mouse.inside ? input.mouse.x : game.player.x + 120;
      const my = input.mouse.inside ? input.mouse.y : game.player.y;
      throwCoin(game.player, game.state, mx, my, audio);
      break;
    }
    case 'smoke':
      dropSmoke(game.player, game.state, audio);
      break;
    case 'douse':
      douseLamp(game.player, game.state, audio);
      break;
  }
}

const input = createInput(canvas, onAction);

// Kanal perintah + debug berbasis DOM (untuk smoke test otomatis).
// Dipakai karena window.__ember tidak terlihat dari konteks evaluate
// Camoufox; event DOM dan div debug tetap terbagi.
const debugMode = params.get('debug') === '1';
const debugEl = document.getElementById('ember-debug');
document.addEventListener('ember-cmd', (e) => {
  // detail berupa string JSON (objek antar-realm ditolak Firefox).
  let d = {};
  try { d = JSON.parse((e && e.detail) || '{}'); } catch (err) { d = {}; }
  if (d.cmd === 'teleport') {
    game.player.x = d.x; game.player.y = d.y;
  } else if (d.cmd === 'start') {
    if (game.screen === 'title') startGame();
  } else if (d.cmd === 'skipNight') {
    game.nightT = 0; game.screen = 'playing';
  } else if (d.cmd === 'setFloor') {
    const carry = {
      score: game.state.score, take: game.state.take, lootTotal: game.state.lootTotal,
      spotted: game.state.spotted, closeCalls: game.state.closeCalls,
      lives: game.state.lives, totalTime: game.state.totalTime,
      nightDone: game.state.nightDone.slice(), events: game.state.events.slice(),
    };
    startFloor(d.floor, carry);
    game.nightT = 0;
    game.screen = 'playing';
  }
});

function debugSnapshot() {
  const s = game.state;
  return JSON.stringify({
    screen: game.screen,
    time: s.totalTime + s.time,
    score: s.score,
    take: s.take,
    loot: s.lootTotal,
    coins: s.coins,
    smokesLeft: s.smokesLeft,
    lamps: s.lampsOn.length,
    lives: s.lives,
    closeCalls: s.closeCalls,
    spotted: s.spotted,
    px: Math.round(game.player.x),
    py: Math.round(game.player.y),
    camAlert: s.cameras.length ? Math.max(...s.cameras.map((c) => c.alert)) : 0,
    laserTripped: s.laser ? s.laser.tripped : false,
    maxSusp: maxSuspicion(s),
    toast: s.toast,
    nearMissPct: s.nearMissPct,
    floorIdx: s.floorIdx,
    exitOpen: s.shards.every((sh) => sh.got),
    shardsLeft: s.shards.filter((sh) => !sh.got).length,
  });
}

// ---------- update ----------

function update(dt) {
  const { state, player } = game;
  if (game.screen === 'night') {
    game.nightT -= dt;
    if (game.nightT <= 0) game.screen = 'playing';
    return;
  }
  if (game.screen !== 'playing') return;

  state.time += dt;
  if (state.caughtFlash > 0) state.caughtFlash -= dt;
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) state.toast = null;
  }
  if (state.coinNoiseT > 0) state.coinNoiseT -= dt;

  // Ripples menua
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const r = state.ripples[i];
    r.t += dt;
    if (r.t >= r.ttl) state.ripples.splice(i, 1);
  }

  updatePlayer(player, input, state, dt, audio);
  updateCoins(state, dt, audio);
  updateSmokes(state, dt);

  const pInfo = { x: player.x, y: player.y, running: isRunning(player) };
  let caught = null;
  for (const g of state.guards) {
    updateGuard(g, state, pInfo, dt, (gg) => { caught = gg; }, audio);
    if (caught) break;
  }
  if (caught) {
    respawnAfterCatch(state, player, audio);
    if (state.over) game.screen = 'over';
    return;
  }

  updateCameras(state, pInfo, dt, audio);
  updateLaser(state, pInfo, dt, audio);
  updateNearMiss(state, audio);
  updateShards(player, state, audio);

  // Tripwire (bunyi tajam saat terpicu)
  const wiresBefore = state.wires.map((w) => w.cooldown);
  updateWires(state, player.x, player.y, dt);
  state.wires.forEach((w, i) => {
    if (w.cooldown > 0 && wiresBefore[i] <= 0) audio.tripwire();
  });

  // Exit
  if (!state.floorDone && atExit(player, state)) {
    // Pintu terkunci sampai semua shard dipungut.
    const left = state.shards.filter((s) => !s.got).length;
    if (left === 0) {
      completeFloor(state);
      state.totalTime += state.time;
      if (state.floorIdx === 2) {
        winGame();
      } else {
        const carry = {
          score: state.score, take: state.take, lootTotal: state.lootTotal,
          spotted: state.spotted, closeCalls: state.closeCalls,
          lives: state.lives, totalTime: state.totalTime,
          nightDone: state.nightDone.slice(), events: state.events.slice(),
        };
        startFloor(state.floorIdx + 1, carry);
      }
    }
  }
}

// ---------- loop fixed-step ----------

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render(ctx, game);
  if (debugMode && debugEl) debugEl.textContent = debugSnapshot();
  requestAnimationFrame(frame);
}

// ---------- mode screenshot staged ----------

const shotName = params.get('shot');
if (shotName) {
  const staged = stageShot(shotName);
  if (staged) {
    game = staged;
    render(ctx, game);
    render(ctx, game); // dua frame seperti spec
    document.documentElement.dataset.shotReady = '1';
  }
} else {
  // Handle debug untuk smoke test (bukan bagian gameplay).
  window.__ember = {
    game: () => game,
    state: () => game.state,
    player: () => game.player,
    start: () => { if (game.screen === 'title') startGame(); },
    teleport: (x, y) => { game.player.x = x; game.player.y = y; },
    setFloor: (i) => {
      const carry = {
        score: game.state.score, take: game.state.take, lootTotal: game.state.lootTotal,
        spotted: game.state.spotted, closeCalls: game.state.closeCalls,
        lives: game.state.lives, totalTime: game.state.totalTime,
        nightDone: game.state.nightDone.slice(), events: game.state.events.slice(),
      };
      startFloor(i, carry);
      game.nightT = 0;
      game.screen = 'playing';
    },
    skipNight: () => { game.nightT = 0; game.screen = 'playing'; },
  };
  render(ctx, game);
  requestAnimationFrame(frame);
}
