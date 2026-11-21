// EMBERWATCH: Night Shift — input.js
// Keyboard + mouse, aksi edge-triggered (sekali per tekan).

export function createInput(canvas, onAction) {
  const keys = {};
  const input = {
    keys,
    dx: 0, dy: 0, sneak: false,
    mouse: { x: 0, y: 0, inside: false },
    consumeClick: null, // {x, y} klik yang belum diproses
  };

  function recompute() {
    let dx = 0, dy = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    input.dx = dx;
    input.dy = dy;
    input.sneak = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  }

  function edge(code, fn) {
    if (!keys[code]) {
      keys[code] = true;
      fn();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) { recompute(); return; }
    switch (e.code) {
      case 'Enter':
      case 'Space': edge(e.code, () => onAction('confirm')); break;
      case 'KeyP':
      case 'Escape': edge(e.code, () => onAction('pause')); break;
      case 'KeyR': edge(e.code, () => onAction('restart')); break;
      case 'KeyM': edge(e.code, () => onAction('mute')); break;
      case 'KeyQ': edge(e.code, () => onAction('smoke')); break;
      case 'KeyE': edge(e.code, () => onAction('douse')); break;
      case 'KeyC': edge(e.code, () => onAction('coin')); break;
      default: keys[e.code] = true; break;
    }
    recompute();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    recompute();
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    input.mouse.inside = true;
  });

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    input.consumeClick = { x, y };
    onAction('click', { x, y });
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    recompute();
  });

  return input;
}
