// input.js — keyboard + mouse, edge-triggered actions.

export function createInput(canvas, onAction) {
  const keys = {};
  const input = {
    up: false, down: false, left: false, right: false,
    sneak: false, click: null, // {x, y} in canvas coords, consumed by main
  };
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };
  function keydown(e) {
    if (KEYMAP[e.code]) {
      input[KEYMAP[e.code]] = true;
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'Space') { onAction('confirm'); e.preventDefault(); }
    else if (e.code === 'KeyQ') onAction('smoke');
    else if (e.code === 'KeyE') onAction('douse');
    else if (e.code === 'KeyC') onAction('coinKey');
    else if (e.code === 'KeyP' || e.code === 'Escape') onAction('pause');
    else if (e.code === 'KeyR') onAction('restart');
    else if (e.code === 'KeyM') onAction('mute');
  }
  function keyup(e) {
    if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
  }
  function mousedown(e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    input.click = { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  canvas.addEventListener('mousedown', mousedown);
  return input;
}
