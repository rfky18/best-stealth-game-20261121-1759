// The right-hand detection panel: live status, alarm, visibility,
// noise, loot, the GHOST line, the guard list, legend, controls,
// and the last three events. Kept compact so everything fits.

import {
  PANEL_X, PANEL_W, VIEW_H, HUD_H, TOTAL_SHARDS, FLOORS, fmtTime,
} from './config.js';
import { exposure, exposureLabel } from './world.js';
import { maxSuspicion, guardWord } from './guard.js';

const BG = '#0d1526';
const LINE = '#1b2a4a';
const TITLE = '#8fa3c8';
const INK = '#e8eefc';
const DIM = '#c7d2e8';
const GOLD = '#ffd60a';
const BAR_BG = '#22314f';

function sectionTitle(ctx, x, y, s) {
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = TITLE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = BAR_BG;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function divider(ctx, x, y, w) {
  ctx.fillStyle = LINE;
  ctx.fillRect(x, y, w, 1);
}

function trunc(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function drawPanel(ctx, state) {
  const x0 = PANEL_X + 12;
  const x1 = PANEL_X + PANEL_W - 12;
  const w = x1 - x0;
  ctx.fillStyle = BG;
  ctx.fillRect(PANEL_X, HUD_H, PANEL_W, VIEW_H - HUD_H);
  ctx.fillStyle = LINE;
  ctx.fillRect(PANEL_X, HUD_H, 1, VIEW_H - HUD_H);

  const maxS = maxSuspicion(state);
  const vis = exposure(state);
  const p = state.player;

  let y = HUD_H + 18;

  // 1. DETECTION — big status box.
  sectionTitle(ctx, x0, y, 'DETECTION');
  y += 6;
  let status;
  let color;
  let advice;
  if (maxS >= 92) {
    status = 'CHASED!'; color = '#ef4444'; advice = 'Break line of sight — now!';
  } else if (maxS >= 60) {
    status = 'ALERT!'; color = '#fb923c'; advice = 'They are coming to look. Hide.';
  } else if (maxS > 12) {
    status = 'SUSPICIOUS ?'; color = '#facc15'; advice = 'Stay in shadow. Wait it out.';
  } else {
    status = 'UNSEEN'; color = '#4ade80'; advice = 'Nobody has seen you. Keep it that way.';
  }
  ctx.fillStyle = '#101c33';
  ctx.fillRect(x0, y, w, 58);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0 + 0.75, y + 0.75, w - 1.5, 58 - 1.5);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(status, x0 + w / 2, y + 29);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(advice, x0 + w / 2, y + 48);
  y += 58 + 14;

  // 2. ALARM row.
  divider(ctx, x0, y - 6, w);
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = TITLE;
  ctx.fillText('ALARM', x0, y + 10);
  bar(ctx, x0 + 52, y + 2, 118, 9, maxS / 100,
    maxS >= 92 ? '#ef4444' : maxS >= 60 ? '#f59e0b' : '#facc15');
  const alarmWord = maxS >= 92 ? 'CHASE' : maxS >= 60 ? 'ALARM' : maxS >= 30 ? 'RISING' : 'QUIET';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = maxS >= 92 ? '#ef4444' : maxS >= 60 ? '#f59e0b' : INK;
  ctx.textAlign = 'right';
  ctx.fillText(alarmWord, x1, y + 10);
  y += 26;

  // 3. VISIBILITY row.
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = TITLE;
  ctx.fillText('VISIBILITY', x0, y + 10);
  const visColor = vis < 30 ? '#4ade80' : vis < 70 ? '#f59e0b' : '#ef4444';
  bar(ctx, x0 + 72, y + 2, 78, 9, vis / 100, visColor);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText(exposureLabel(state), x1, y + 10);
  y += 26;

  // 4. NOISE row.
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = TITLE;
  ctx.fillText('NOISE', x0, y + 10);
  let noise;
  let noiseColor = INK;
  if (state.time - state.coinNoiseAt < 1.2) {
    noise = 'COIN CLINK'; noiseColor = GOLD;
  } else if (p.running && p.moving) {
    noise = 'LOUD — RUNNING'; noiseColor = '#fb923c';
  } else {
    noise = 'SILENT'; noiseColor = '#4ade80';
  }
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = noiseColor;
  ctx.textAlign = 'right';
  ctx.fillText(noise, x1, y + 10);
  y += 22;

  // 5. Grid: LOOT | SPOTTED, GOAL | SCORE.
  divider(ctx, x0, y - 4, w);
  y += 12;
  const midX = x0 + w / 2 + 4;
  const goal = state.floor === 2 && state.shardsGot >= TOTAL_SHARDS
    ? 'DONE' : state.shardsTaken.size >= FLOORS[state.floor].shards.length ? 'READY — GO!' : 'NOT YET';
  gridCell(ctx, x0, y, 'LOOT', `${state.shardsGot}/${TOTAL_SHARDS}`, GOLD);
  gridCell(ctx, midX, y, 'SPOTTED', `${state.spotted}`, state.spotted > 0 ? '#ef4444' : INK);
  y += 30;
  gridCell(ctx, x0, y, 'GOAL', goal, goal === 'READY — GO!' ? '#4ade80' : INK);
  gridCell(ctx, midX, y, 'SCORE', `${state.score}`, GOLD);
  y += 34;

  // 6. GHOST line.
  divider(ctx, x0, y - 6, w);
  ctx.textAlign = 'left';
  ctx.font = '11px sans-serif';
  if (state.spotted > 0) {
    ctx.fillStyle = '#64748b';
    ctx.fillText('GHOST bonus lost — you were spotted', x0, y + 8);
  } else {
    ctx.fillStyle = '#4ade80';
    ctx.fillText('GHOST +500 if unseen at the end', x0, y + 8);
  }
  y += 26;

  // 7. GUARDS list.
  divider(ctx, x0, y - 4, w);
  sectionTitle(ctx, x0, y + 8, 'GUARDS');
  y += 22;
  for (const g of state.guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(x0 + 5, y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px sans-serif';
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(g.name, x0 + 14, y);
    bar(ctx, x0 + 62, y - 9, 84, 7, g.suspicion / 100,
      g.suspicion >= 92 ? '#ef4444' : g.suspicion >= 60 ? '#f59e0b' : '#facc15');
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = g.mode === 'chase' ? '#ef4444' : g.mode === 'curious' ? '#fb923c' : TITLE;
    ctx.textAlign = 'right';
    ctx.fillText(guardWord(g), x1, y);
    y += 19;
  }
  y += 2;

  // 8. LEGEND, 7 items in two columns.
  divider(ctx, x0, y, w);
  sectionTitle(ctx, x0, y + 14, 'LEGEND');
  y += 26;
  const legends = [
    ['guard', 'guard + vision cone'],
    ['shadow', 'shadow — hide here'],
    ['crate', 'crate — blocks sight'],
    ['lamp', 'lamp — you are seen'],
    ['wire', 'tripwire — alarm'],
    ['shard', 'shard — 100 pts'],
    ['exit', 'exit — open if looted'],
  ];
  const colW = w / 2;
  legends.forEach(([kind, label], i) => {
    const lx = x0 + (i % 2) * colW;
    const ly = y + Math.floor(i / 2) * 18;
    drawLegendIcon(ctx, kind, lx, ly - 9);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = DIM;
    ctx.textAlign = 'left';
    ctx.fillText(label, lx + 16, ly);
  });
  y += Math.ceil(legends.length / 2) * 18 + 6;

  // 9. CONTROLS.
  divider(ctx, x0, y, w);
  sectionTitle(ctx, x0, y + 14, 'CONTROLS');
  ctx.font = '11px sans-serif';
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · SHIFT sneak · CLICK / C coin', x0, y + 30);
  ctx.fillText('Q smoke · E douse a lamp · P pause · M mute', x0, y + 46);
  y += 58;

  // 10. WHAT HAPPENED.
  divider(ctx, x0, y, w);
  sectionTitle(ctx, x0, y + 14, 'WHAT HAPPENED');
  y += 28;
  if (state.events.length === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = DIM;
    ctx.textAlign = 'left';
    ctx.fillText('The night is quiet. So far.', x0, y);
  } else {
    for (const ev of state.events) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'left';
      ctx.fillText(fmtTime(ev.at), x0, y);
      ctx.fillStyle = DIM;
      ctx.fillText(trunc(ev.text, 34), x0 + 38, y);
      y += 15;
    }
  }
}

function gridCell(ctx, x, y, label, value, color) {
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = TITLE;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y + 17);
}

function drawLegendIcon(ctx, kind, x, y) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'guard') {
    ctx.fillStyle = 'rgba(255, 235, 150, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(11, -5);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'shadow') {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.8)';
    ctx.fillRect(-5, -5, 11, 11);
    ctx.strokeStyle = '#7aa2ff';
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(-5, -5, 11, 11);
    ctx.setLineDash([]);
  } else if (kind === 'crate') {
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(-5, -5, 11, 11);
    ctx.strokeStyle = '#8a6a3b';
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(6, 6);
    ctx.moveTo(6, -5);
    ctx.lineTo(-5, 6);
    ctx.stroke();
  } else if (kind === 'lamp') {
    ctx.fillStyle = 'rgba(255, 190, 90, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'wire') {
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
  } else if (kind === 'shard') {
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  } else if (kind === 'exit') {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-4, -6, 8, 12);
  }
  ctx.restore();
}
