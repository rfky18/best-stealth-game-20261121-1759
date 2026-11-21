// panel.js — the right-hand detection panel (200px wide, x 1080-1280),
// including alarm meter, campaign chips, per-guard bars, camera rows
// and the tactical map. Everything must fit y 56-720 without clipping.

import {
  CANVAS_H, HUD_H, PANEL_X, PANEL_W, PANEL_INNER_X, PANEL_INNER_W,
  MAIN_X1, TOTAL_SHARDS,
} from './config.js';
import {
  exposureOf, alarmStage, inSmoke, inShadow, litLamp, fmtTime,
} from './world.js';
import { maxSuspicion, guardStageName } from './guard.js';
import { cameraStatus } from './camera.js';
import { shardsLeft, exitOpen } from './player.js';

const BG = '#0d1526';
const SEP = '#1b2a4a';
const HEAD = '#8fa3c8';
const TEXT = '#e8eefc';
const SUB = '#c7d2e8';
const GOLD = '#ffd60a';
const BAR_BG = '#22314f';

function sectionTitle(ctx, y, text) {
  ctx.fillStyle = HEAD;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, PANEL_INNER_X, y);
  return y + 13;
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = BAR_BG;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

export function drawPanel(ctx, game) {
  const state = game.state;
  const guards = state._guards;
  const cameras = state._cameras;
  ctx.fillStyle = BG;
  ctx.fillRect(PANEL_X, HUD_H, PANEL_W, CANVAS_H - HUD_H);
  ctx.strokeStyle = SEP;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PANEL_X, HUD_H); ctx.lineTo(PANEL_X, CANVAS_H); ctx.stroke();

  const ms = maxSuspicion(guards);
  const stage = alarmStage(ms);
  let y = HUD_H + 14;

  // 1. DETECTION status.
  y = sectionTitle(ctx, y, 'DETECTION');
  const statusWord = stage === 'CALM' ? 'UNSEEN' : stage === 'UNEASY' ? 'SUSPICIOUS ?' : stage === 'HUNTED' ? 'ALERT!' : 'CHASED!';
  const statusColor = stage === 'CALM' ? '#7dffb0' : stage === 'UNEASY' ? '#ffd60a' : stage === 'HUNTED' ? '#ff9f43' : '#ff5555';
  const advice = stage === 'CALM' ? 'All quiet. Keep moving.' : stage === 'UNEASY' ? 'A guard is curious. Hide.' : stage === 'HUNTED' ? 'They are looking for you!' : 'RUN! Break line of sight!';
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(statusWord, PANEL_INNER_X, y + 15);
  ctx.fillStyle = SUB;
  ctx.font = '10px sans-serif';
  ctx.fillText(advice, PANEL_INNER_X, y + 28);
  y += 38;

  // 2. Alarm meter, 4 segments.
  y = sectionTitle(ctx, y, 'ALARM');
  const segW = (PANEL_INNER_W - 18) / 4;
  const filled = stage === 'CALM' ? 1 : stage === 'UNEASY' ? 2 : stage === 'HUNTED' ? 3 : 4;
  const segColors = ['#7dffb0', '#ffd60a', '#ff9f43', '#ff5555'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < filled ? segColors[i] : BAR_BG;
    ctx.fillRect(PANEL_INNER_X + i * (segW + 6), y, segW, 10);
  }
  y += 14;
  ctx.fillStyle = HEAD;
  ctx.font = '8px sans-serif';
  const segNames = ['CALM', 'UNEASY', 'HUNTED', 'ALARM'];
  segNames.forEach((n, i) => {
    ctx.textAlign = i === 0 ? 'left' : i === 3 ? 'right' : 'center';
    const cx = PANEL_INNER_X + i * (segW + 6) + (i === 0 ? 0 : i === 3 ? segW : segW / 2);
    ctx.fillText(n, cx, y + 8);
  });
  y += 14;

  // 3. Visibility.
  const exp = exposureOf(state);
  const expWord = inSmoke(state, state.player.x, state.player.y) ? 'IN SMOKE' : inShadow(state.floor, state.player.x, state.player.y) ? 'IN SHADOW' : litLamp(state.floor, state.lampsLit, state.player.x, state.player.y) >= 0 ? 'IN LAMPLIGHT' : 'IN THE OPEN';
  const expColor = exp < 30 ? '#7dffb0' : exp < 70 ? '#ffd60a' : '#ff5555';
  ctx.fillStyle = SUB;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VISIBILITY', PANEL_INNER_X, y + 9);
  bar(ctx, PANEL_INNER_X + 62, y + 1, 78, 8, exp / 100, expColor);
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'right';
  ctx.fillText(`${expWord} ${exp}%`, PANEL_X + PANEL_W - 6, y + 9);
  y += 15;

  // 4. Noise.
  const noise = state._coinPing ? 'COIN CLINK' : state.player.running && state.player.moving ? 'LOUD — RUNNING' : 'SILENT';
  ctx.fillStyle = SUB;
  ctx.textAlign = 'left';
  ctx.fillText('NOISE', PANEL_INNER_X, y + 9);
  ctx.fillStyle = noise === 'SILENT' ? TEXT : '#ff9f43';
  ctx.textAlign = 'right';
  ctx.fillText(noise, PANEL_X + PANEL_W - 6, y + 9);
  y += 15;

  // 5. Near miss.
  ctx.fillStyle = SUB;
  ctx.textAlign = 'left';
  ctx.fillText('NEAR MISS', PANEL_INNER_X, y + 9);
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'right';
  ctx.fillText(`${state.nearMissPct === null ? '—' : state.nearMissPct + '%'}   CLOSE CALLS ${state.closeCalls}`, PANEL_X + PANEL_W - 6, y + 9);
  y += 15;

  // 6. Grid 2 cols: LOOT | SPOTTED ; GOAL | TAKE.
  const totalLoot = (game.lootBefore || 0) + state.shardsTaken.filter(Boolean).length;
  const goal = state.floorIndex === 2 && exitOpen(state) ? 'DONE' : exitOpen(state) ? 'READY — GO!' : 'NOT YET';
  ctx.fillStyle = SUB;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LOOT ${totalLoot}/${TOTAL_SHARDS}`, PANEL_INNER_X, y + 9);
  ctx.textAlign = 'right';
  ctx.fillText(`SPOTTED ${state.spotted}`, PANEL_X + PANEL_W - 6, y + 9);
  y += 13;
  ctx.textAlign = 'left';
  ctx.fillText(`GOAL ${goal}`, PANEL_INNER_X, y + 9);
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'right';
  ctx.fillText(`TAKE $${state.take}`, PANEL_X + PANEL_W - 6, y + 9);
  y += 15;

  // 7. Ghost row.
  ctx.fillStyle = state.spotted === 0 ? '#7dffb0' : SUB;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.spotted === 0 ? 'GHOST +500 if unseen at the end' : 'GHOST bonus lost — spotted', PANEL_INNER_X, y + 9);
  y += 17;

  // 8. Campaign chips.
  y = sectionTitle(ctx, y, 'CAMPAIGN');
  const chipW = 56;
  for (let i = 0; i < 3; i++) {
    const x = PANEL_INNER_X + i * (chipW + 6);
    const done = game.campaignDone || i < state.floorIndex;
    const now = !game.campaignDone && i === state.floorIndex;
    ctx.fillStyle = done ? '#1d5c38' : now ? '#3a2f00' : BAR_BG;
    ctx.fillRect(x, y, chipW, 18);
    ctx.strokeStyle = now ? GOLD : SEP;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, chipW, 18);
    ctx.fillStyle = done ? '#7dffb0' : now ? GOLD : SUB;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`N${i + 1} ${done ? '✓' : now ? '>' : '·'}`, x + chipW / 2, y + 13);
  }
  y += 24;

  // 9. Guards list.
  y = sectionTitle(ctx, y, 'GUARDS');
  for (const g of guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(PANEL_INNER_X + 4, y + 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(g.name, PANEL_INNER_X + 12, y + 7);
    bar(ctx, PANEL_INNER_X + 52, y + 1, 72, 6, g.suspicion / 100, g.suspicion >= 92 ? '#ff4444' : g.suspicion >= 60 ? '#ff9f43' : '#ffd60a');
    ctx.fillStyle = SUB;
    ctx.textAlign = 'right';
    const st = guardStageName(g);
    ctx.fillText(st === 'SUSPICIOUS' ? 'SUSP.' : st === 'CHASING' ? 'CHASE' : st, PANEL_X + PANEL_W - 6, y + 7);
    y += 13;
  }
  y += 3;

  // 10. Cameras.
  y = sectionTitle(ctx, y, 'CAMERAS');
  for (const cam of cameras) {
    ctx.fillStyle = '#7fc4ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cam.label, PANEL_INNER_X, y + 7);
    bar(ctx, PANEL_INNER_X + 24, y + 1, 72, 6, cam.alert / 100, cam.alert >= 100 ? '#ff4444' : '#7fc4ff');
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(cam.alert)}%  ${cameraStatus(cam)}`, PANEL_X + PANEL_W - 6, y + 7);
    y += 13;
  }
  y += 3;

  // 11. Tactical map 184x76.
  y = sectionTitle(ctx, y, 'TACTICAL MAP');
  const mapX = PANEL_INNER_X + 2;
  const mapY = y;
  const mapW = 184, mapH = 76;
  ctx.fillStyle = '#0a1120';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = SEP;
  ctx.strokeRect(mapX, mapY, mapW, mapH);
  const mx = (x) => mapX + (x / MAIN_X1) * mapW;
  const my = (yy) => mapY + ((yy - HUD_H) / (CANVAS_H - HUD_H)) * mapH;
  ctx.fillStyle = '#2c3a5e';
  for (const r of state.floor.walls) ctx.fillRect(mx(r[0]), my(r[1]), Math.max(1, (r[2] / MAIN_X1) * mapW), Math.max(1, (r[3] / (CANVAS_H - HUD_H)) * mapH));
  if (state.laser) {
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx(state.laser.a[0]), my(state.laser.a[1])); ctx.lineTo(mx(state.laser.b[0]), my(state.laser.b[1])); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,80,80,0.7)';
  for (const w of state.wires) {
    ctx.beginPath(); ctx.moveTo(mx(w.a[0]), my(w.a[1])); ctx.lineTo(mx(w.b[0]), my(w.b[1])); ctx.stroke();
  }
  const e = state.floor.exit;
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(mx(e[0]), my(e[1]), 8, 8);
  ctx.fillStyle = '#ff9f1c';
  for (let i = 0; i < state.floor.shards.length; i++) {
    if (state.shardsTaken[i]) continue;
    const s = state.floor.shards[i];
    ctx.fillRect(mx(s[0]) - 1.5, my(s[1]) - 1.5, 3, 3);
  }
  for (const cam of cameras) {
    ctx.fillStyle = '#7fc4ff';
    ctx.beginPath();
    ctx.moveTo(mx(cam.x), my(cam.y) - 3);
    ctx.lineTo(mx(cam.x) + 3, my(cam.y) + 2);
    ctx.lineTo(mx(cam.x) - 3, my(cam.y) + 2);
    ctx.closePath();
    ctx.fill();
  }
  for (const g of guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(mx(g.x), my(g.y), 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(mx(g.x), my(g.y));
    ctx.lineTo(mx(g.x) + Math.cos(g.facing) * 6, my(g.y) + Math.sin(g.facing) * 6);
    ctx.stroke();
  }
  const p = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx(p.x), my(p.y), 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx(p.x), my(p.y), 5, 0, Math.PI * 2); ctx.stroke();
  y = mapY + mapH + 6;

  // 12. Legend, 2 columns, short labels.
  y = sectionTitle(ctx, y, 'LEGEND');
  const legend = [
    ['#ffd60a', 'guard · cone'], ['#7fc4ff', 'camera · sweeps'],
    ['#3a4a6b', 'shadow · hide'], ['#8a6a3d', 'crate · blocks sight'],
    ['#ffb347', 'lamp · seen'], ['#ff5555', 'tripwire · alarm'],
    ['#ff2222', 'laser · timed'], ['#ff9f1c', 'shard · 100 · $150'],
    ['#2ecc71', 'exit · open if looted'],
  ];
  ctx.font = '9px sans-serif';
  for (let i = 0; i < legend.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = PANEL_INNER_X + col * 96;
    const ly = y + row * 11;
    ctx.fillStyle = legend[i][0];
    ctx.fillRect(lx, ly - 2, 7, 7);
    ctx.fillStyle = SUB;
    ctx.textAlign = 'left';
    ctx.fillText(legend[i][1], lx + 10, ly + 5);
  }
  y += Math.ceil(legend.length / 2) * 11 + 4;

  // 13. Controls, 2 short rows.
  y = sectionTitle(ctx, y, 'CONTROLS');
  ctx.fillStyle = SUB;
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · SHIFT sneak · CLICK coin', PANEL_INNER_X, y + 8);
  ctx.fillText('Q smoke · E douse lamp · P pause · M mute', PANEL_INNER_X, y + 19);
  y += 30;

  // 14. What happened — last two events, never clipped.
  y = sectionTitle(ctx, y, 'WHAT HAPPENED');
  if (state.events.length === 0) {
    ctx.fillStyle = SUB;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('The night is quiet. So far.', PANEL_INNER_X, y + 9);
  } else {
    ctx.font = '10px sans-serif';
    state.events.forEach((ev, i) => {
      ctx.fillStyle = SUB;
      ctx.textAlign = 'left';
      ctx.fillText(fmtTime(ev.t), PANEL_INNER_X, y + 9 + i * 12);
      ctx.fillStyle = TEXT;
      ctx.fillText(ev.text, PANEL_INNER_X + 32, y + 9 + i * 12);
    });
  }
}
