// Boot, the fixed-step loop, screen flow, the one-time GHOST bonus,
// and the best score in local storage.

import {
  VIEW_W, VIEW_H, FLOORS, SCORE_GHOST, FLOOR_CARD_TIME,
  CAUGHT_FLASH_TIME, TOTAL_SHARDS,
} from './config.js';
import { freshState, loadFloor, addEvent } from './world.js';
import { tickGuard } from './guard.js';
import {
  tickPlayer, tickGadgets, throwCoin, dropSmoke, douseLamp,
  atExit, finishFloor, respawn,
} from './player.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  drawFloor, drawCones, drawGuards, drawWren, drawHUD, drawToast,
  drawTitle, drawFloorCard, drawPaused, drawCaught, drawWin, drawGameOver,
} from './render.js';
import { drawPanel } from './panel.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'emberwatch-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch (e) {
    // Storage unavailable — the run still counts.
  }
}

function renderAll(ctx, state, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, state, now);
  drawCones(ctx, state);
  drawGuards(ctx, state);
  drawWren(ctx, state);
  drawHUD(ctx, state);
  drawPanel(ctx, state);
  drawToast(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'floorcard') drawFloorCard(ctx, state);
  else if (state.screen === 'paused') drawPaused(ctx);
  else if (state.screen === 'caught') drawCaught(ctx);
  else if (state.screen === 'win') drawWin(ctx, state);
  else if (state.screen === 'gameover') drawGameOver(ctx, state);
}

function startRun(state) {
  const best = state.best;
  const muted = state.muted;
  const fresh = freshState();
  fresh.best = best;
  fresh.muted = muted;
  Object.assign(state, fresh);
  loadFloor(state);
  state.screen = 'playing';
}

function tick(state, dt, sfx) {
  state.time += dt;
  if (state.toast) {
    state.toast.left -= dt;
    if (state.toast.left <= 0) state.toast = null;
  }
  for (const r of state.ripples) r.left -= dt;
  state.ripples = state.ripples.filter((r) => r.left > 0);

  tickPlayer(state, input.keys, dt, sfx);
  tickGadgets(state, dt, sfx);
  let caught = false;
  for (const g of state.guards) {
    if (tickGuard(g, state, dt, sfx) === 'caught') caught = true;
  }
  if (caught) {
    state.screen = 'caught';
    state.caughtLeft = CAUGHT_FLASH_TIME;
    if (sfx) sfx.caught();
    return;
  }
  if (atExit(state)) {
    const result = finishFloor(state);
    if (result === 'win') {
      if (state.spotted === 0 && !state.ghostAwarded) {
        state.ghostAwarded = true;
        state.score += SCORE_GHOST;
        addEvent(state, 'GHOST bonus +500 — never spotted!');
      }
      if (state.score > state.best) {
        state.best = state.score;
        saveBest(state.score);
      }
      state.screen = 'win';
    } else {
      loadFloor(state);
      state.screen = 'floorcard';
      state.floorCardLeft = FLOOR_CARD_TIME;
    }
  }
}

let input;

function handleActions(state, sfx) {
  for (const act of input.drain()) {
    if (act === 'mute') {
      state.muted = sfx.toggleMute();
      continue;
    }
    if (act === 'restart') {
      startRun(state);
      continue;
    }
    if (state.screen === 'title') {
      if (act === 'confirm') {
        sfx.unlock();
        startRun(state);
      }
      continue;
    }
    if (state.screen === 'paused') {
      if (act === 'pause' || act === 'confirm') state.screen = 'playing';
      continue;
    }
    if (state.screen === 'win' || state.screen === 'gameover') {
      continue;
    }
    if (state.screen !== 'playing') continue;
    if (act === 'pause') {
      state.screen = 'paused';
    } else if (act === 'coin') {
      const p = state.player;
      let tx;
      let ty;
      if (input.pendingCoin) {
        tx = input.pendingCoin.x;
        ty = input.pendingCoin.y;
        input.pendingCoin = null;
      } else if (input.mouse.inside) {
        tx = input.mouse.x;
        ty = input.mouse.y;
      } else {
        tx = p.x + Math.cos(p.face) * 120;
        ty = p.y + Math.sin(p.face) * 120;
      }
      throwCoin(state, tx, ty, sfx);
    } else if (act === 'smoke') {
      dropSmoke(state, sfx);
    } else if (act === 'douse') {
      douseLamp(state, sfx);
    } else if (act === 'confirm') {
      sfx.unlock();
    }
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const sfx = createAudio();
  const state = freshState();
  state.best = loadBest();
  loadFloor(state);

  input = createInput(canvas, (x, y) => {
    input.pendingCoin = { x, y };
  });
  input.pendingCoin = null;

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    stageShot(state, shot);
    renderAll(ctx, state, state.time);
    renderAll(ctx, state, state.time);
    document.documentElement.dataset.shotReady = '1';
    if (statusEl) {
      statusEl.textContent = `Emberwatch — staged shot ${shot}. Level ${state.floor + 1}, score ${state.score}.`;
    }
    return;
  }

  let last = performance.now();
  let acc = 0;
  let lastStatus = 0;

  function frame(nowMs) {
    const now = nowMs / 1000;
    let delta = (nowMs - last) / 1000;
    last = nowMs;
    if (delta > 0.25) delta = 0.25;
    acc += delta;
    handleActions(state, sfx);
    if (state.screen === 'playing') {
      while (acc >= STEP) {
        tick(state, STEP, sfx);
        acc -= STEP;
        if (state.screen !== 'playing') { acc = 0; break; }
      }
    } else if (state.screen === 'floorcard') {
      state.floorCardLeft -= delta;
      if (state.floorCardLeft <= 0) state.screen = 'playing';
    } else if (state.screen === 'caught') {
      state.caughtLeft -= delta;
      if (state.caughtLeft <= 0) {
        respawn(state);
        state.screen = state.lives <= 0 ? 'gameover' : 'playing';
        if (state.screen === 'gameover' && state.score > state.best) {
          state.best = state.score;
          saveBest(state.score);
        }
      }
    } else {
      acc = 0;
    }
    renderAll(ctx, state, now);
    if (statusEl && now - lastStatus > 0.5) {
      lastStatus = now;
      statusEl.textContent = `Emberwatch: Night Shift — Level ${state.floor + 1} ${FLOORS[state.floor].name}, `
        + `${state.shardsGot}/${TOTAL_SHARDS} shards, score ${state.score}, lives ${state.lives}.`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
