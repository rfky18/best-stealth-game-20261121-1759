// EMBERWATCH: Night Shift — panel.js
// Panel deteksi kanan saja (x 1008-1280): status, alarm meter,
// visibility, noise, near-miss, loot/goal, GHOST, campaign, guards,
// cameras, tactical map, legend, controls, feed.
// Anggaran vertikal ketat: semua harus muat y 56-720.

import { COLORS, PANEL_X, PANEL_W } from './config.js';
import { fmtTime, exitIsOpen } from './world.js';
import { maxSuspicion, alarmStage, guardWord } from './guard.js';
import { cameraWord, cameraAngle } from './camera.js';
import { exposureAt, zoneWord } from './world.js';

const PX = PANEL_X + 10; // x konten
const PW = PANEL_W - 20; // lebar konten 252

function sectionTitle(ctx, y, text) {
  ctx.fillStyle = COLORS.sectionTitle;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, PX, y);
  return y + 4;
}

function miniBar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = COLORS.barBg;
  ctx.fillRect(x, y, w, h);
  if (frac > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(2, w * Math.min(1, frac)), h);
  }
}

function barColorFor(v) {
  if (v < 30) return '#2fd47a';
  if (v < 70) return '#ffb020';
  return '#ff5252';
}

const ALARM_WORDS = ['CALM', 'UNEASY', 'HUNTED', 'ALARM'];
const ALARM_COLORS = ['#2fd47a', '#ffd60a', '#ff9f43', '#ff5252'];

export function drawPanel(ctx, state, player, timeSec) {
  ctx.save();
  // Latar panel
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(PANEL_X, 56, PANEL_W, 664);
  ctx.strokeStyle = COLORS.panelLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 0.5, 56);
  ctx.lineTo(PANEL_X + 0.5, 720);
  ctx.stroke();

  let y = 56;
  const maxSusp = maxSuspicion(state);
  const stage = alarmStage(state);
  const anyChase = state.guards.some((g) => g.state === 'chase');

  // ---- 1. DETECTION + kotak status besar ----
  y = sectionTitle(ctx, y + 14, 'DETECTION');
  const statusWord = anyChase ? 'CHASED!' : stage >= 2 ? 'ALERT!' : stage >= 1 ? 'SUSPICIOUS ?' : 'UNSEEN';
  const statusColor = anyChase ? '#ff5252' : stage >= 2 ? '#ff9f43' : stage >= 1 ? '#ffd60a' : '#2fd47a';
  const tip = anyChase ? 'Run! Break line of sight!' :
    stage >= 2 ? 'They are searching. Hide now.' :
    stage >= 1 ? 'A guard is uneasy. Break sight.' :
    'Stay in shadow. Watch the cones.';
  ctx.fillStyle = '#131f38';
  ctx.fillRect(PX, y, PW, 46);
  ctx.strokeStyle = statusColor;
  ctx.strokeRect(PX + 0.5, y + 0.5, PW - 1, 45);
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(statusWord, PX + 8, y + 22);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '10px sans-serif';
  ctx.fillText(tip, PX + 8, y + 38);
  y += 46 + 8;

  // ---- 2. ALARM METER empat segmen ----
  y = sectionTitle(ctx, y + 10, 'ALARM');
  const segW = (PW - 3 * 4) / 4;
  for (let i = 0; i < 4; i++) {
    const sx = PX + i * (segW + 4);
    const filled = i <= stage;
    ctx.fillStyle = filled ? ALARM_COLORS[i] : COLORS.barBg;
    ctx.fillRect(sx, y, segW, 14);
    ctx.fillStyle = filled ? ALARM_COLORS[i] : '#5a6b8c';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ALARM_WORDS[i], sx + segW / 2, y + 24);
  }
  ctx.textAlign = 'left';
  y += 14 + 16;

  // ---- 3. VISIBILITY ----
  const expo = exposureAt(player.x, player.y, state, player.running);
  const zw = zoneWord(player.x, player.y, state, player.running);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('VISIBILITY', PX, y + 10);
  miniBar(ctx, PX + 78, y + 2, 96, 10, expo / 100, barColorFor(expo));
  ctx.fillStyle = COLORS.text;
  ctx.font = '9px sans-serif';
  ctx.fillText(zw + ' ' + expo + '%', PX + 180, y + 10);
  y += 16;

  // ---- 4. NOISE ----
  const coinNoise = state.coinNoiseT > 0;
  const noiseWord = coinNoise ? 'COIN CLINK' : player.running ? 'LOUD — RUNNING' : 'SILENT';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('NOISE', PX, y + 10);
  ctx.fillStyle = coinNoise ? COLORS.gold : player.running ? '#ff9f43' : '#2fd47a';
  ctx.font = '10px sans-serif';
  ctx.fillText(noiseWord, PX + 78, y + 10);
  y += 16;

  // ---- 5. NEAR MISS ----
  const nm = state.nearMissPct != null ? state.nearMissPct + '%' : '—';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('NEAR MISS', PX, y + 10);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(nm, PX + 78, y + 10);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('CLOSE CALLS ' + state.closeCalls, PX + PW, y + 10);
  ctx.textAlign = 'left';
  y += 16;

  // ---- 6. Grid 2 kolom: LOOT/SPOTTED, GOAL/TAKE ----
  const goalWord = state.floorDone ? 'DONE' : exitIsOpen(state) ? 'READY — GO!' : 'NOT YET';
  const goalColor = state.floorDone ? '#2fd47a' : exitIsOpen(state) ? '#2fd47a' : COLORS.textDim;
  const midX = PX + PW / 2;
  ctx.strokeStyle = COLORS.panelLine;
  ctx.beginPath();
  ctx.moveTo(PX, y + 2); ctx.lineTo(PX + PW, y + 2);
  ctx.moveTo(midX, y + 2); ctx.lineTo(midX, y + 34);
  ctx.moveTo(PX, y + 18); ctx.lineTo(PX + PW, y + 18);
  ctx.stroke();
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '9px sans-serif';
  ctx.fillText('LOOT', PX + 4, y + 12);
  ctx.fillText('SPOTTED', midX + 4, y + 12);
  ctx.fillText('GOAL', PX + 4, y + 28);
  ctx.fillText('TAKE', midX + 4, y + 28);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(state.lootTotal + '/16', PX + 44, y + 12);
  ctx.fillText(String(state.spotted), midX + 54, y + 12);
  ctx.fillStyle = goalColor;
  ctx.fillText(goalWord, PX + 44, y + 28);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('$' + state.take.toLocaleString('en-US'), midX + 44, y + 28);
  y += 36;

  // ---- 7. GHOST ----
  ctx.fillStyle = state.spotted > 0 ? '#7a8699' : '#2fd47a';
  ctx.font = '10px sans-serif';
  ctx.fillText(
    state.spotted > 0 ? 'GHOST bonus lost — you were spotted' : 'GHOST +500 if unseen at the end',
    PX, y + 10,
  );
  y += 16;

  // ---- 8. CAMPAIGN ----
  y = sectionTitle(ctx, y + 10, 'CAMPAIGN');
  const chipW = (PW - 2 * 6) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = PX + i * (chipW + 6);
    const done = state.nightDone[i];
    const now = i === state.floorIdx && !done;
    const mark = done ? '✓' : now ? '▸' : '·';
    const label = done ? 'DONE' : now ? 'NOW' : '—';
    ctx.fillStyle = done ? '#1d4d33' : now ? '#4a3600' : '#131f38';
    ctx.fillRect(cx, y, chipW, 18);
    ctx.strokeStyle = done ? '#2fd47a' : now ? COLORS.gold : COLORS.panelLine;
    ctx.strokeRect(cx + 0.5, y + 0.5, chipW - 1, 17);
    ctx.fillStyle = done ? '#2fd47a' : now ? COLORS.gold : COLORS.textDim;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N' + (i + 1) + ' ' + mark, cx + chipW / 2, y + 13);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '8px sans-serif';
    ctx.fillText(label, cx + chipW / 2, y + 28);
  }
  ctx.textAlign = 'left';
  y += 32;

  // ---- 9. GUARDS ----
  y = sectionTitle(ctx, y + 10, 'GUARDS');
  for (const g of state.guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(PX + 5, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px sans-serif';
    ctx.fillText(g.name, PX + 14, y + 8);
    const bw = 92;
    miniBar(ctx, PX + 78, y + 1, bw, 8, g.suspicion / 100,
      g.suspicion >= 92 ? '#ff5252' : g.suspicion >= 60 ? '#ff9f43' : '#ffd60a');
    ctx.fillStyle = g.state === 'chase' ? '#ff5252' : g.state === 'curious' ? '#ff9f43' : COLORS.textDim;
    ctx.font = '9px sans-serif';
    ctx.fillText(guardWord(g), PX + 176, y + 8);
    y += 13;
  }
  y += 2;

  // ---- 10. CAMERAS ----
  y = sectionTitle(ctx, y + 10, 'CAMERAS');
  for (const cam of state.cameras) {
    ctx.fillStyle = '#74c0fc';
    ctx.beginPath();
    ctx.moveTo(PX + 5, y + 1);
    ctx.lineTo(PX + 1, y + 9);
    ctx.lineTo(PX + 9, y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px sans-serif';
    ctx.fillText(cam.id, PX + 14, y + 9);
    miniBar(ctx, PX + 44, y + 1, 96, 8, cam.alert / 100,
      cam.alert >= 100 ? '#ff5252' : cam.alert > 2 ? '#74c0fc' : '#74c0fc');
    ctx.fillStyle = COLORS.text;
    ctx.fillText(cam.id + ' ' + Math.round(cam.alert) + '%', PX + 148, y + 9);
    ctx.fillStyle = cam.alert > 2 ? '#74c0fc' : COLORS.textDim;
    ctx.font = '9px sans-serif';
    ctx.fillText(cameraWord(cam), PX + 200, y + 9);
    y += 14;
  }
  y += 2;

  // ---- 11. TACTICAL MAP ----
  y = sectionTitle(ctx, y + 10, 'TACTICAL MAP');
  const mapH = 78;
  const mapW = PW;
  const sx = mapW / 1008, sy = mapH / 664;
  const mx = (x) => PX + x * sx;
  const my = (yy) => y + (yy - 56) * sy;
  ctx.fillStyle = '#0a1120';
  ctx.fillRect(PX, y, mapW, mapH);
  ctx.strokeStyle = COLORS.panelLine;
  ctx.strokeRect(PX + 0.5, y + 0.5, mapW - 1, mapH - 1);
  // dinding
  ctx.fillStyle = '#2a3a5e';
  for (const b of state.blocks) {
    if (b.w === 44 && b.h === 44) continue; // peti dilewati
    ctx.fillRect(mx(b.x), my(b.y), Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  // tripwire + laser
  ctx.strokeStyle = 'rgba(255,82,82,0.8)';
  ctx.lineWidth = 1;
  for (const w of state.wires) {
    ctx.beginPath();
    ctx.moveTo(mx(w.x1), my(w.y1));
    ctx.lineTo(mx(w.x2), my(w.y2));
    ctx.stroke();
  }
  if (state.laser) {
    ctx.beginPath();
    ctx.moveTo(mx(state.laser.x1), my(state.laser.y1));
    ctx.lineTo(mx(state.laser.x2), my(state.laser.y2));
    ctx.stroke();
  }
  // bayangan (samar)
  ctx.fillStyle = 'rgba(116,192,252,0.10)';
  for (const s of state.floor.shadows) {
    ctx.fillRect(mx(s.x), my(s.y), s.w * sx, s.h * sy);
  }
  // shard
  ctx.fillStyle = '#ff9f43';
  for (const s of state.shards) {
    if (s.got) continue;
    ctx.beginPath();
    ctx.arc(mx(s.x), my(s.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // exit
  const e = state.floor.exit;
  ctx.fillStyle = exitIsOpen(state) ? '#2fd47a' : '#1d7a4a';
  ctx.fillRect(mx(e.x), my(e.y), Math.max(3, e.w * sx), Math.max(3, e.h * sy));
  // kamera: segitiga biru
  ctx.fillStyle = '#74c0fc';
  for (const cam of state.cameras) {
    const cx = mx(cam.x), cy = my(cam.y);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx + 3, cy + 3);
    ctx.closePath();
    ctx.fill();
  }
  // guard: titik warna + garis hadap
  for (const g of state.guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(mx(g.x), my(g.y), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(mx(g.x), my(g.y));
    ctx.lineTo(mx(g.x) + Math.cos(g.face) * 7, my(g.y) + Math.sin(g.face) * 7);
    ctx.stroke();
  }
  // Wren: titik putih bercincin
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx(player.x), my(player.y), 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx(player.x), my(player.y), 5, 0, Math.PI * 2);
  ctx.stroke();
  y += mapH + 4;

  // ---- 12. LEGEND (9 item, 2 kolom) ----
  y = sectionTitle(ctx, y + 10, 'LEGEND');
  const legend = [
    ['guard', 'guard + vision cone'],
    ['camera', 'camera — sweeps a cone'],
    ['shadow', 'shadow — hide here'],
    ['crate', 'crate — blocks sight'],
    ['lamp', 'lamp — you are seen'],
    ['wire', 'tripwire — alarm'],
    ['laser', 'laser — timed beam'],
    ['shard', 'ember shard — 100 · $150'],
    ['exit', 'exit — open if looted'],
  ];
  const col2X = PX + 134;
  legend.forEach((item, i) => {
    const lx = i % 2 === 0 ? PX : col2X;
    const ly = y + Math.floor(i / 2) * 11;
    drawLegendIcon(ctx, item[0], lx + 4, ly + 3);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px sans-serif';
    ctx.fillText(item[1], lx + 12, ly + 6);
  });
  y += Math.ceil(legend.length / 2) * 11 + 4;

  // ---- 13. CONTROLS ----
  y = sectionTitle(ctx, y + 10, 'CONTROLS');
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '9px sans-serif';
  ctx.fillText('WASD move · SHIFT sneak · CLICK / C coin', PX, y + 12);
  ctx.fillText('Q smoke · E douse a lamp · P pause · M mute', PX, y + 23);
  y += 34;

  // ---- 14. WHAT HAPPENED ----
  y = sectionTitle(ctx, y + 10, 'WHAT HAPPENED');
  const feed = state.events.slice(-2);
  if (feed.length === 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px sans-serif';
    ctx.fillText('The night is quiet. So far.', PX, y + 12);
  } else {
    ctx.font = '10px sans-serif';
    feed.forEach((ev, i) => {
      ctx.fillStyle = '#8fa3c8';
      ctx.fillText(fmtTime(ev.t), PX, y + 12 + i * 13);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(ev.text, PX + 38, y + 12 + i * 13);
    });
  }
  ctx.restore();
}

function drawLegendIcon(ctx, kind, x, y) {
  ctx.save();
  switch (kind) {
    case 'guard':
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,140,0.6)';
      ctx.beginPath(); ctx.moveTo(x + 3, y); ctx.lineTo(x + 8, y - 3); ctx.lineTo(x + 8, y + 3); ctx.closePath(); ctx.fill();
      break;
    case 'camera':
      ctx.fillStyle = '#74c0fc';
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - 3, y + 3); ctx.lineTo(x + 3, y + 3); ctx.closePath(); ctx.fill();
      break;
    case 'shadow':
      ctx.fillStyle = 'rgba(116,192,252,0.35)';
      ctx.fillRect(x - 4, y - 3, 9, 6);
      ctx.strokeStyle = '#74c0fc';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x - 4.5, y - 3.5, 9, 6);
      ctx.setLineDash([]);
      break;
    case 'crate':
      ctx.fillStyle = '#8a6d4b';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.strokeStyle = '#5d4630';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
      break;
    case 'lamp':
      ctx.fillStyle = '#ffb020';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case 'wire':
      ctx.strokeStyle = '#ff5252';
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 5, y); ctx.stroke();
      break;
    case 'laser':
      ctx.strokeStyle = '#ff2020';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 5, y); ctx.stroke();
      ctx.lineWidth = 1;
      break;
    case 'shard':
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.fill();
      break;
    case 'exit':
      ctx.fillStyle = '#2fd47a';
      ctx.fillRect(x - 3, y - 4, 6, 8);
      break;
  }
  ctx.restore();
}
