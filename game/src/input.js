// Keyboard (and a little mouse): arrows/WASD move, Shift sneaks, P or Esc
// pauses, R restarts, M mutes, Enter/Space confirms on the title screen.
// Clicking the canvas also confirms, so mouse players can start the game.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

/** Fresh key state: every key starts unpressed. */
export function createKeys() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, confirm: false, pause: false, restart: false, mute: false,
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
};

/**
 * Listen on the window and fill the key state. Edge-triggered actions
 * (confirm/pause/restart/mute) are set true on keydown and must be consumed
 * by the loop with takeAction, so one press never fires twice.
 */
export function createInput(keys) {
  function onKeyDown(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    if (name === 'confirm' || name === 'pause' || name === 'restart' || name === 'mute') {
      keys[name] = true;
    } else {
      keys[name] = true;
    }
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  }
  function onKeyUp(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    if (name !== 'confirm' && name !== 'pause' && name !== 'restart' && name !== 'mute') {
      keys[name] = false;
    }
  }
  function onBlur() {
    keys.up = keys.down = keys.left = keys.right = keys.sneak = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return {
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
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
