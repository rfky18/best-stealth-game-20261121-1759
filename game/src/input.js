// Keyboard and mouse: arrows/WASD move, Shift sneaks, P or Esc pauses,
// R restarts, M mutes, Enter/Space confirms on the title screen, C tosses
// a coin ahead — and so does clicking the canvas, at the clicked spot.
// Q drops a smoke bomb, E douses a lamp in reach. Clicking the canvas
// also confirms, so mouse players can start the game.
import { VIEW_W, VIEW_H } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_TOSS = 'toss';
export const ACTION_SMOKE = 'smoke';
export const ACTION_DOUSE = 'douse';

/** Fresh key state: every key starts unpressed, no coin target yet. */
export function createKeys() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, confirm: false, pause: false, restart: false,
    mute: false, toss: false, smoke: false, douse: false,
    coinTarget: null,
  };
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  Enter: 'confirm', Space: 'confirm',
  KeyP: 'pause', Escape: 'pause',
  KeyR: 'restart', KeyM: 'mute',
  KeyC: 'toss', KeyQ: 'smoke', KeyE: 'douse',
};

const EDGE_ACTIONS = new Set(['confirm', 'pause', 'restart', 'mute', 'toss', 'smoke', 'douse']);

/**
 * Listen on the window and fill the key state. Edge-triggered actions
 * (confirm/pause/restart/mute/toss/smoke/douse) are set true on keydown
 * and must be consumed by the loop with takeAction, so one press never
 * fires twice. A canvas click records a coin target in game coordinates.
 */
export function createInput(keys, canvas) {
  function onKeyDown(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    keys[name] = true;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  }
  function onKeyUp(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    if (!EDGE_ACTIONS.has(name)) keys[name] = false;
  }
  function onBlur() {
    keys.up = keys.down = keys.left = keys.right = keys.sneak = false;
  }
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    keys.coinTarget = {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
    keys.confirm = true;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('click', onClick);
  return {
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('click', onClick);
    },
  };
}

/** Read and clear one edge-triggered action; true only on the frame pressed. */
export function takeAction(keys, action) {
  if (keys[action]) {
    keys[action] = false;
    return true;
  }
  return false;
}

/** Read and clear the clicked coin target, if the player clicked. */
export function takeCoinTarget(keys) {
  const target = keys.coinTarget;
  keys.coinTarget = null;
  return target;
}
