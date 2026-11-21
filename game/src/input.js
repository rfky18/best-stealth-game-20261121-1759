// Keyboard + mouse input. Keys are held in a live set; actions that
// fire once per press (coin, smoke, douse, pause, restart, mute,
// confirm) go through an edge-triggered queue the main loop drains.

export function createInput(canvas, onCoinAt) {
  const keys = new Set();
  const queue = [];
  const mouse = { x: 0, y: 0, inside: false };

  const ACTION_KEYS = {
    KeyC: 'coin',
    KeyQ: 'smoke',
    KeyE: 'douse',
    KeyP: 'pause',
    Escape: 'pause',
    KeyR: 'restart',
    KeyM: 'mute',
    Enter: 'confirm',
    Space: 'confirm',
  };

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    const act = ACTION_KEYS[e.code];
    if (act) queue.push(act);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    mouse.inside = true;
  }

  function onClick(e) {
    onMouseMove(e);
    queue.push('coin');
    if (onCoinAt) onCoinAt(mouse.x, mouse.y);
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return {
    keys,
    mouse,
    drain() {
      const out = queue.splice(0, queue.length);
      return out;
    },
  };
}
