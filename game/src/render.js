// Everything drawn on the canvas: the floor, cover, lamps, patrol
// paths, walls and crates, tripwires, shards, the exit, coins, vision
// cones, guards, smoke, Wren, the top HUD, toasts, and every screen.

import {
  VIEW_W, VIEW_H, HUD_H, PANEL_X, PANEL_W, PLAY_W, FLOORS,
  SMOKE_R, TOTAL_SHARDS, fmtTime, clamp,
} from './config.js';
import {
  inShadow, lampAt, inSmoke, exposure,
} from './world.js';
import { maxSuspicion, guardWord, guardConeColor } from './guard.js';

const GOLD = '#ffd60a';
const INK = '#e8eefc';
const DIM = '#c7d2e8';
const FAINT = '#8fa3c8';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, font, color, align = 'left', baseline = 'alphabetic') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
}

function drawWedge(ctx, x, y, face, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(face);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -0.5, 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.4, 0);
  ctx.lineTo(r + 5, 0);
  ctx.stroke();
  ctx.restore();
}

// ---- the floor ---------------------------------------------------------

export function drawFloor(ctx, state, now) {
  const floor = FLOORS[state.floor];
  // Checkerboard boards, 40 px.
  for (let ty = HUD_H; ty < VIEW_H; ty += 40) {
    for (let tx = 0; tx < PLAY_W; tx += 40) {
      const light = ((tx / 40 + ty / 40) % 2 === 0);
      ctx.fillStyle = light ? '#16233f' : '#131e36';
      ctx.fillRect(tx, ty, 40, 40);
    }
  }
  ctx.strokeStyle = 'rgba(120,150,210,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= PLAY_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, HUD_H); ctx.lineTo(x, VIEW_H); ctx.stroke();
  }
  for (let y = HUD_H; y <= VIEW_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PLAY_W, y); ctx.stroke();
  }

  // Shadow patches.
  for (const s of floor.shadows) {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.55)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x + 0.75, s.y + 0.75, s.w - 1.5, s.h - 1.5);
    ctx.setLineDash([]);
  }

  // Lamp glow (lit lamps only).
  for (let i = 0; i < floor.lamps.length; i++) {
    if (state.lampsOff.has(i)) continue;
    const l = floor.lamps[i];
    const g = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.34)');
    g.addColorStop(0.7, 'rgba(255, 170, 60, 0.12)');
    g.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3cf';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Patrol paths: dotted line + waypoint dots.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 1.5;
  for (const g of state.guards) {
    ctx.beginPath();
    g.path.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    for (const p of g.path) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.setLineDash([]);

  // Tripwires.
  for (let i = 0; i < floor.wires.length; i++) {
    const w = floor.wires[i];
    const cooling = state.wiresCool[i] > 0;
    const pulse = 0.55 + 0.45 * Math.sin(now * 6);
    ctx.strokeStyle = cooling
      ? 'rgba(255, 80, 80, 0.25)'
      : `rgba(255, 60, 60, ${pulse.toFixed(2)})`;
    ctx.lineWidth = cooling ? 1.5 : 3;
    ctx.setLineDash(cooling ? [4, 6] : []);
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Posts at both ends of the wire.
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(w.x1 - 2, w.y1 - 8, 4, 16);
    ctx.fillRect(w.x2 - 2, w.y2 - 8, 4, 16);
  }

  // Walls.
  for (const w of floor.walls) {
    ctx.fillStyle = '#2c3e63';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#3d5482';
    ctx.fillRect(w.x, w.y, w.w, 3);
  }

  // Crates with a diagonal cross.
  for (const c of floor.crates) {
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(c.x, c.y, 44, 44);
    ctx.strokeStyle = '#8a6a3b';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, 42, 42);
    ctx.beginPath();
    ctx.moveTo(c.x + 4, c.y + 4);
    ctx.lineTo(c.x + 40, c.y + 40);
    ctx.moveTo(c.x + 40, c.y + 4);
    ctx.lineTo(c.x + 4, c.y + 40);
    ctx.stroke();
  }

  // Ember shards: pulsing orange diamonds.
  const pulse = 1 + 0.18 * Math.sin(now * 5);
  for (let i = 0; i < floor.shards.length; i++) {
    if (state.shardsTaken.has(i)) continue;
    const s = floor.shards[i];
    const r = 11 * pulse;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff9f1c';
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 14;
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawExit(ctx, state, floor);

  // Coins: flying arc, landed coin, expanding ping ring.
  for (const c of state.coinsFlying) {
    const t = Math.min(1, c.t / 0.35);
    const x = c.sx + (c.tx - c.sx) * t;
    const y = c.sy + (c.ty - c.sy) * t - Math.sin(t * Math.PI) * 34;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,10,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const c of state.coinsLanded) {
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    const pr = 6 + c.ping * 46;
    ctx.strokeStyle = `rgba(255,214,10,${Math.max(0, 0.8 - c.ping).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, pr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Smoke clouds.
  for (const s of state.smokes) {
    const a = clamp(s.left / 3.5, 0, 1) * 0.85;
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, SMOKE_R);
    g.addColorStop(0, `rgba(190, 200, 215, ${a.toFixed(2)})`);
    g.addColorStop(1, 'rgba(190, 200, 215, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SMOKE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(210, 218, 230, ${(a * 0.7).toFixed(2)})`;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + s.x * 0.01;
      const bx = s.x + Math.cos(ang) * 34;
      const by = s.y + Math.sin(ang) * 30;
      ctx.beginPath();
      ctx.arc(bx, by, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Footstep ripples.
  for (const r of state.ripples) {
    const t = 1 - r.left / r.total;
    const rad = r.r + (r.max - r.r) * t;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Running noise ring around Wren.
  const p = state.player;
  if (p.running && p.moving) {
    const nr = 30 + 5 * Math.sin(now * 10);
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, nr, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawExit(ctx, state, floor) {
  const e = floor.exit;
  const open = state.shardsTaken.size >= floor.shards.length;
  const cy = e.y + e.h / 2;
  if (open) {
    ctx.shadowColor = '#2ee66b';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#22c55e';
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#14532d';
  }
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = open ? '#a7f3c7' : '#4ade80';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  text(ctx, 'EXIT', e.x + e.w / 2, e.y - 8, 'bold 13px sans-serif', open ? '#4ade80' : '#86efac', 'center');
  // Status sits to the LEFT of the door, right-aligned, door-centred.
  const label = open ? 'OPEN — GO!' : `LOCKED · ${state.shardsTaken.size}/${floor.shards.length}`;
  text(ctx, label, e.x - 10, cy, 'bold 13px sans-serif', open ? '#4ade80' : '#fbbf24', 'right', 'middle');
}

// ---- cones, guards, Wren ------------------------------------------------

export function drawCones(ctx, state) {
  for (const g of state.guards) {
    if (!g.cone || g.cone.length < 3) continue;
    ctx.fillStyle = guardConeColor(g);
    ctx.beginPath();
    ctx.moveTo(g.cone[0].x, g.cone[0].y);
    for (let i = 1; i < g.cone.length; i++) ctx.lineTo(g.cone[i].x, g.cone[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawGuards(ctx, state) {
  for (const g of state.guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawWedge(ctx, g.x, g.y, g.face, 17, 'rgba(0,0,0,0.35)');
    // Name above, suspicion bar above the name.
    text(ctx, g.name, g.x, g.y - 30, 'bold 11px sans-serif', '#ffffff', 'center');
    if (g.suspicion > 2) {
      const w = 34;
      ctx.fillStyle = '#22314f';
      ctx.fillRect(g.x - w / 2, g.y - 28, w, 5);
      ctx.fillStyle = g.suspicion >= 92 ? '#ef4444' : g.suspicion >= 60 ? '#f59e0b' : '#facc15';
      ctx.fillRect(g.x - w / 2, g.y - 28, (w * clamp(g.suspicion, 0, 100)) / 100, 5);
    }
    // Markers: ! red chasing, ? orange curious, ! small yellow wary.
    if (g.mode === 'chase') {
      text(ctx, '!', g.x, g.y - 44, 'bold 20px sans-serif', '#ef4444', 'center');
    } else if (g.mode === 'curious') {
      text(ctx, '?', g.x, g.y - 42, 'bold 18px sans-serif', '#fb923c', 'center');
    } else if (g.suspicion > 12) {
      text(ctx, '!', g.x, g.y - 42, 'bold 13px sans-serif', '#facc15', 'center');
    }
  }
}

export function drawWren(ctx, state) {
  const p = state.player;
  ctx.fillStyle = '#2dd4bf';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawWedge(ctx, p.x, p.y, p.face, 12, 'rgba(0,0,0,0.35)');
  text(ctx, 'WREN', p.x, p.y - 20, 'bold 10px sans-serif', '#ffffff', 'center');
  const floor = FLOORS[state.floor];
  let label = null;
  let color = '#fff';
  if (inSmoke(p.x, p.y, state)) { label = 'IN SMOKE'; color = '#d7dee8'; }
  else if (lampAt(p.x, p.y, state)) { label = 'IN THE LIGHT!'; color = '#fb923c'; }
  else if (inShadow(p.x, p.y, floor)) { label = 'HIDDEN'; color = '#93c5fd'; }
  if (label) text(ctx, label, p.x, p.y + 26, 'bold 10px sans-serif', color, 'center');
}

// ---- HUD ------------------------------------------------------------------

export function drawHUD(ctx, state) {
  ctx.fillStyle = '#0a1120';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#1b2a4a';
  ctx.fillRect(0, HUD_H - 1, VIEW_W, 1);

  text(ctx, 'EMBERWATCH', 14, 22, 'bold 20px sans-serif', GOLD);
  text(ctx, 'NIGHT SHIFT', 15, 42, 'bold 10px sans-serif', FAINT);

  const floor = FLOORS[state.floor];
  const midX = PLAY_W / 2;
  text(ctx, `LEVEL ${state.floor + 1} · ${floor.name}`, midX, 22, 'bold 15px sans-serif', INK, 'center');
  const obj = state.shardsTaken.size >= floor.shards.length
    ? 'All shards pocketed — reach the green EXIT unseen!'
    : 'Pocket all ember shards, then reach the EXIT unseen';
  text(ctx, obj, midX, 42, '12px sans-serif', DIM, 'center');

  const rightX = VIEW_W - 14;
  text(ctx, fmtTime(state.time), rightX - 150, 22, 'bold 15px sans-serif', INK, 'right');
  text(ctx, `SCORE ${state.score}`, rightX, 22, 'bold 15px sans-serif', GOLD, 'right');
  // Lives as hearts, close calls, coin pips, max-suspicion bar.
  let hx = PANEL_X + 8;
  for (let i = 0; i < 3; i++) {
    text(ctx, i < state.lives ? '♥' : '♡', hx, 44, '15px sans-serif', i < state.lives ? '#f87171' : '#475569');
    hx += 18;
  }
  text(ctx, `CLOSE CALLS ${state.closeCalls}`, hx + 4, 42, '11px sans-serif', DIM);
  const coinX = rightX - 52;
  text(ctx, 'COINS', coinX - 8, 42, 'bold 10px sans-serif', FAINT, 'right');
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < state.coins ? GOLD : '#334155';
    ctx.beginPath();
    ctx.arc(coinX + i * 13, 38, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const ms = maxSuspicion(state);
  ctx.fillStyle = '#22314f';
  ctx.fillRect(PANEL_X + 8, 48, 120, 4);
  ctx.fillStyle = ms >= 92 ? '#ef4444' : ms >= 60 ? '#f59e0b' : '#facc15';
  ctx.fillRect(PANEL_X + 8, 48, (120 * ms) / 100, 4);
}

// ---- toasts and overlays ----------------------------------------------------

export function drawToast(ctx, state) {
  if (!state.toast) return;
  const a = clamp(state.toast.left / 0.6, 0, 1);
  ctx.globalAlpha = a;
  text(ctx, state.toast.text, PLAY_W / 2, 130, 'bold 30px sans-serif', '#fb923c', 'center');
  ctx.globalAlpha = 1;
}

function dimMain(ctx) {
  ctx.fillStyle = 'rgba(4, 8, 20, 0.82)';
  ctx.fillRect(0, HUD_H, PLAY_W, VIEW_H - HUD_H);
}

export function drawTitle(ctx, state) {
  dimMain(ctx);
  const cx = PLAY_W / 2;
  text(ctx, 'EMBERWATCH', cx, 190, 'bold 52px sans-serif', GOLD, 'center');
  text(ctx, 'NIGHT SHIFT', cx, 228, 'bold 20px sans-serif', INK, 'center');
  text(ctx, 'You are Wren, a shadow courier. Pocket every ember shard,', cx, 290, '15px sans-serif', DIM, 'center');
  text(ctx, 'slip past the guards unseen, and leave through the green EXIT.', cx, 314, '15px sans-serif', DIM, 'center');
  text(ctx, 'Three floors. Ten embers. One ghost bonus if nobody ever sees you.', cx, 338, '15px sans-serif', DIM, 'center');
  text(ctx, 'WASD move · SHIFT sneak · CLICK / C coin · Q smoke · E douse a lamp', cx, 392, 'bold 14px sans-serif', INK, 'center');
  text(ctx, 'P pause · R restart · M mute', cx, 418, 'bold 14px sans-serif', INK, 'center');
  if (state.best > 0) {
    text(ctx, `BEST SCORE ${state.best}`, cx, 462, 'bold 15px sans-serif', GOLD, 'center');
  }
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) text(ctx, 'Press ENTER to begin', cx, 520, 'bold 18px sans-serif', '#ffffff', 'center');
}

export function drawFloorCard(ctx, state) {
  dimMain(ctx);
  const floor = FLOORS[state.floor];
  const cx = PLAY_W / 2;
  text(ctx, `LEVEL ${state.floor + 1}`, cx, 280, 'bold 22px sans-serif', GOLD, 'center');
  text(ctx, floor.name, cx, 330, 'bold 40px sans-serif', INK, 'center');
  text(ctx, floor.sub, cx, 372, '15px sans-serif', DIM, 'center');
}

export function drawPaused(ctx) {
  dimMain(ctx);
  text(ctx, 'PAUSED', PLAY_W / 2, 340, 'bold 44px sans-serif', INK, 'center');
  text(ctx, 'Press P to resume · R to restart', PLAY_W / 2, 384, '14px sans-serif', DIM, 'center');
}

export function drawCaught(ctx) {
  dimMain(ctx);
  text(ctx, 'SPOTTED!', PLAY_W / 2, 340, 'bold 56px sans-serif', '#ef4444', 'center');
  text(ctx, 'A guard caught you. Back to the entrance.', PLAY_W / 2, 388, '15px sans-serif', DIM, 'center');
}

export function drawWin(ctx, state) {
  dimMain(ctx);
  const cx = PLAY_W / 2;
  text(ctx, 'UNSEEN.', cx, 220, 'bold 52px sans-serif', '#4ade80', 'center');
  text(ctx, `10 shards · three floors · ${fmtTime(state.time)} · ${state.closeCalls} close calls`, cx, 272, '15px sans-serif', DIM, 'center');
  text(ctx, `SCORE ${state.score}`, cx, 322, 'bold 28px sans-serif', GOLD, 'center');
  if (state.spotted === 0) {
    text(ctx, 'GHOST BONUS +500 — never spotted, not once.', cx, 362, 'bold 16px sans-serif', '#4ade80', 'center');
  }
  text(ctx, `BEST ${Math.max(state.best, state.score)}`, cx, 402, '14px sans-serif', FAINT, 'center');
  text(ctx, 'Press R to play again', cx, 452, 'bold 16px sans-serif', INK, 'center');
}

export function drawGameOver(ctx, state) {
  dimMain(ctx);
  const cx = PLAY_W / 2;
  text(ctx, 'CAUGHT.', cx, 280, 'bold 52px sans-serif', '#ef4444', 'center');
  text(ctx, `The night ends here. SCORE ${state.score}`, cx, 332, '15px sans-serif', DIM, 'center');
  text(ctx, 'Press R to try again', cx, 382, 'bold 16px sans-serif', INK, 'center');
}
