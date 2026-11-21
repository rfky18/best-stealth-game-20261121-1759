// EMBERWATCH: Night Shift — render.js
// Semua gambar di kanvas + HUD + layar-layar (judul, kartu malam,
// menang, kalah, jeda, tertangkap).

import {
  W, H, HUD_H, PANEL_X, COLORS, TILE,
  CONE_RANGE, GUARD_R, PLAYER_R, SMOKE_R, NIGHT_CARD_TIME,
  TOTAL_SHARDS, TOTAL_TAKE, GHOST_PTS,
} from './config.js';
import {
  dist, fmtTime, exitIsOpen, inShadow,
} from './world.js';
import { conePoints, coneColor, maxSuspicion } from './guard.js';
import { cameraConePoints, cameraAngle, laserOn } from './camera.js';
import { drawPanel } from './panel.js';
import { playerZoneWord } from './player.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- lantai ----------

function drawFloor(ctx, state, time) {
  const floor = state.floor;
  // Papan catur 40px
  for (let ty = HUD_H; ty < H; ty += TILE) {
    for (let tx = 0; tx < 1008; tx += TILE) {
      const odd = ((tx / TILE) + (ty / TILE)) % 2 === 0;
      ctx.fillStyle = odd ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(tx, ty, TILE, TILE);
    }
  }
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= 1008; x += TILE) { ctx.moveTo(x + 0.5, HUD_H); ctx.lineTo(x + 0.5, H); }
  for (let y = HUD_H; y <= H; y += TILE) { ctx.moveTo(0, y + 0.5); ctx.lineTo(1008, y + 0.5); }
  ctx.stroke();

  // Bayangan: gelap + tepi garis putus-putus biru
  for (const s of floor.shadows) {
    ctx.fillStyle = 'rgba(4,8,18,0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(116,192,252,0.55)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    ctx.setLineDash([]);
  }

  // Lampu menyala: lingkaran cahaya radial
  for (const l of state.lampsOn) {
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(255,176,32,0.30)');
    g.addColorStop(1, 'rgba(255,176,32,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,130,0.9)';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jalur patroli: garis titik-titik + titik waypoint
  ctx.strokeStyle = 'rgba(232,238,252,0.28)';
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 1;
  for (const g of state.guards) {
    ctx.beginPath();
    g.wps.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,238,252,0.5)';
    for (const w of g.wps) {
      ctx.beginPath();
      ctx.arc(w.x, w.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.setLineDash([]);

  // Dinding
  ctx.fillStyle = '#2a3a5e';
  ctx.strokeStyle = '#46587f';
  for (const b of state.blocks) {
    if (b.w === 44 && b.h === 44) continue; // peti digambar terpisah
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }

  // Peti 44x44 dengan silang diagonal
  for (const c of floor.crates) {
    ctx.fillStyle = '#8a6d4b';
    ctx.fillRect(c.x, c.y, 44, 44);
    ctx.strokeStyle = '#5d4630';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, 42, 42);
    ctx.beginPath();
    ctx.moveTo(c.x + 3, c.y + 3);
    ctx.lineTo(c.x + 41, c.y + 41);
    ctx.moveTo(c.x + 41, c.y + 3);
    ctx.lineTo(c.x + 3, c.y + 41);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // Tripwire: garis merah berdenyut + tiang; redup putus-putus saat cooldown
  for (const w of state.wires) {
    const hot = w.cooldown <= 0;
    const pulse = hot ? 0.6 + 0.4 * Math.sin(time * 6) : 0.25;
    ctx.strokeStyle = 'rgba(255,82,82,' + pulse + ')';
    ctx.lineWidth = hot ? 3 : 1.5;
    if (!hot) ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#c0c8d8';
    for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]]) {
      ctx.fillRect(px - 2, py - 6, 4, 12);
    }
  }

  // Laser (lantai 3)
  if (state.laser) {
    const lz = state.laser;
    const on = laserOn(lz);
    const glow = on ? 0.55 + 0.35 * Math.sin(time * 9) : 0.18;
    ctx.strokeStyle = 'rgba(255,32,32,' + glow + ')';
    ctx.lineWidth = on ? 4 : 1.5;
    if (!on) ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(lz.x1, lz.y1);
    ctx.lineTo(lz.x2, lz.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (on) {
      ctx.strokeStyle = 'rgba(255,120,120,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lz.x1, lz.y1);
      ctx.lineTo(lz.x2, lz.y2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = '#e8eefc';
    for (const [px, py] of [[lz.x1, lz.y1], [lz.x2, lz.y2]]) {
      ctx.fillRect(px - 3, py - 8, 6, 16);
      ctx.fillStyle = on ? '#ff2020' : '#7a2020';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8eefc';
    }
  }

  // Kamera: kotak + lensa + label + cone biru
  for (const cam of state.cameras) {
    const pts = cameraConePoints(cam, state, time);
    ctx.fillStyle = 'rgba(116,192,252,0.16)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(116,192,252,0.35)';
    ctx.stroke();
    const a = cameraAngle(cam, time);
    ctx.fillStyle = '#22314f';
    ctx.fillRect(cam.x - 8, cam.y - 8, 16, 16);
    ctx.strokeStyle = '#74c0fc';
    ctx.strokeRect(cam.x - 8.5, cam.y - 8.5, 17, 17);
    ctx.fillStyle = '#74c0fc';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(a) * 7, cam.y + Math.sin(a) * 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cam.id, cam.x, cam.y - 12);
    ctx.textAlign = 'left';
  }

  // Shard: belah ketupat oranye berdenyut
  for (const s of state.shards) {
    if (s.got) continue;
    const p = 1 + 0.18 * Math.sin(time * 4 + s.x);
    const r = 9 * p;
    ctx.fillStyle = 'rgba(255,159,67,0.25)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x + r * 0.7, s.y);
    ctx.lineTo(s.x, s.y + r);
    ctx.lineTo(s.x - r * 0.7, s.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe1b0';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r * 0.45);
    ctx.lineTo(s.x + r * 0.3, s.y);
    ctx.lineTo(s.x, s.y + r * 0.45);
    ctx.lineTo(s.x - r * 0.3, s.y);
    ctx.closePath();
    ctx.fill();
  }

  // Pintu EXIT
  const e = floor.exit;
  const open = exitIsOpen(state);
  ctx.fillStyle = open ? '#2fd47a' : '#14532d';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#a7f3c7' : '#2fd47a';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  ctx.lineWidth = 1;
  if (open) {
    ctx.fillStyle = 'rgba(47,212,122,0.25)';
    ctx.fillRect(e.x - 8, e.y - 8, e.w + 16, e.h + 16);
  }
  ctx.fillStyle = open ? '#052e16' : '#a7f3c7';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 4);
  ctx.textAlign = 'left';
  // Status pintu di SEBELAH KIRI pintu, rata kanan, sejajar tengah pintu
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = open ? '#2fd47a' : '#c7d2e8';
  const n = state.shards.filter((s) => s.got).length;
  ctx.fillText(
    open ? 'OPEN — GO!' : 'LOCKED · ' + n + '/' + state.shards.length,
    e.x - 10, e.y + e.h / 2 + 4,
  );
  ctx.textAlign = 'left';

  // Koin mendarat + ping
  for (const c of state.coinsLanded) {
    ctx.strokeStyle = 'rgba(255,214,10,' + (1 - c.ping) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6 + c.ping * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Koin melayang (melengkung)
  for (const c of state.coinsFlying) {
    const t = c.t / c.dur;
    const x = c.sx + (c.tx - c.sx) * t;
    const y = c.sy + (c.ty - c.sy) * t - Math.sin(t * Math.PI) * 34;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cone guard (di bawah guard, di atas lantai)
  for (const g of state.guards) {
    const pts = conePoints(g, state);
    ctx.fillStyle = coneColor(g);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  // Guard
  for (const g of state.guards) {
    drawActor(ctx, g.x, g.y, GUARD_R, g.face, g.color);
    // Nama + bar suspicion + tanda
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8eefc';
    ctx.fillText(g.name, g.x, g.y - GUARD_R - 14);
    if (g.suspicion > 2) {
      ctx.fillStyle = '#22314f';
      ctx.fillRect(g.x - 18, g.y - GUARD_R - 12, 36, 4);
      ctx.fillStyle = g.suspicion >= 92 ? '#ff5252' : g.suspicion >= 60 ? '#ff9f43' : '#ffd60a';
      ctx.fillRect(g.x - 18, g.y - GUARD_R - 12, 36 * (g.suspicion / 100), 4);
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('!', g.x, g.y - GUARD_R - 22);
    } else if (g.state === 'curious') {
      ctx.fillStyle = '#ff9f43';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('?', g.x, g.y - GUARD_R - 22);
    } else if (g.suspicion > 12) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('!', g.x + 14, g.y - GUARD_R - 6);
    }
    ctx.textAlign = 'left';
  }

  // Asap: radial + 5 gumpalan
  for (const s of state.smokes) {
    const alpha = Math.min(1, (s.ttl - s.t) / 0.8) * 0.85;
    const g2 = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    g2.addColorStop(0, 'rgba(200,205,215,' + alpha * 0.75 + ')');
    g2.addColorStop(1, 'rgba(200,205,215,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,225,235,' + alpha * 0.5 + ')';
    const blobs = [[-24, -10, 16], [18, -18, 18], [26, 12, 15], [-14, 20, 17], [0, 0, 20]];
    for (const [bx, by, br] of blobs) {
      ctx.beginPath();
      ctx.arc(s.x + bx, s.y + by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Riak langkah
  for (const r of state.ripples) {
    const t = r.t / r.ttl;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = (1 - t) * 0.6;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + (r.max - r.r) * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Lingkaran badan + baji gelap searah hadap + garis hidung putih.
function drawActor(ctx, x, y, r, face, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, face - 0.5, face + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(face) * (r - 4), y + Math.sin(face) * (r - 4));
  ctx.lineTo(x + Math.cos(face) * (r + 4), y + Math.sin(face) * (r + 4));
  ctx.stroke();
  ctx.lineWidth = 1;
}

// ---------- Wren ----------

function drawPlayer(ctx, player, state) {
  // Cincin noise saat berlari
  if (player.running) {
    ctx.strokeStyle = 'rgba(255,214,10,0.5)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 30 + 4 * Math.sin(state.time * 6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawActor(ctx, player.x, player.y, PLAYER_R, player.face, '#2dd4bf');
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8eefc';
  ctx.fillText('WREN', player.x, player.y - PLAYER_R - 8);
  const zw = playerZoneWord(player, state);
  if (zw.word) {
    ctx.fillStyle = zw.color;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(zw.word, player.x, player.y + PLAYER_R + 13);
  }
  ctx.textAlign = 'left';
}

// ---------- HUD ----------

function drawHUD(ctx, state, player, screen) {
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.strokeStyle = COLORS.panelLine;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H + 0.5);
  ctx.lineTo(W, HUD_H + 0.5);
  ctx.stroke();

  // Kiri: judul
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EMBERWATCH', 14, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '10px sans-serif';
  ctx.fillText('NIGHT SHIFT', 14, 40);

  // Tengah: malam + objective
  const floor = state.floor;
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NIGHT ' + floor.night + ' · LEVEL ' + floor.night + ' · ' + floor.name, 504, 22);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  const obj = exitIsOpen(state)
    ? 'All shards pocketed — reach the green EXIT unseen!'
    : 'Pocket ' + state.shards.length + ' ember shards, then reach the EXIT unseen';
  ctx.fillText(obj, 504, 40);
  ctx.textAlign = 'left';

  // Kanan (di atas panel): waktu + skor + TAKE
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(fmtTime(state.totalTime + state.time), 1270, 20);
  ctx.fillText('SCORE ' + state.score, 1180, 20);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('TAKE $' + state.take.toLocaleString('en-US'), 1080, 20);
  ctx.textAlign = 'left';

  // Baris kedua: hati, close calls, koin, bar suspicion kecil
  const hx = 1018;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.lives ? '#ff5252' : '#3a4a6b';
    ctx.font = '13px sans-serif';
    ctx.fillText('♥', hx + i * 16, 44);
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '10px sans-serif';
  ctx.fillText('CLOSE CALLS ' + state.closeCalls, hx + 52, 44);
  ctx.fillText('COINS', hx + 150, 44);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < state.coins ? '#ffd60a' : '#3a4a6b';
    ctx.beginPath();
    ctx.arc(hx + 192 + i * 11, 40, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bar suspicion kecil di bawah hati
  const ms = maxSuspicion(state) / 100;
  ctx.fillStyle = COLORS.barBg;
  ctx.fillRect(hx, 48, 120, 4);
  ctx.fillStyle = ms >= 0.92 ? '#ff5252' : ms >= 0.6 ? '#ff9f43' : '#ffd60a';
  ctx.fillRect(hx, 48, 120 * ms, 4);
}

// ---------- layar ----------

function overlay(ctx, alpha) {
  ctx.fillStyle = 'rgba(4,8,18,' + alpha + ')';
  ctx.fillRect(0, HUD_H, 1008, 664);
}

function centerText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, 504, y);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, state, best) {
  overlay(ctx, 0.82);
  centerText(ctx, 'EMBERWATCH', 200, 'bold 54px sans-serif', COLORS.gold);
  centerText(ctx, 'NIGHT SHIFT', 232, 'bold 20px sans-serif', COLORS.textDim);
  centerText(ctx, 'Slip through three nights. Pocket every ember.', 280, '15px sans-serif', COLORS.text);
  centerText(ctx, 'Never be seen. Reach the green EXIT.', 304, '15px sans-serif', COLORS.text);
  centerText(ctx, 'Guards patrol. Cameras sweep. Lasers blink. Patience pays.', 328, '15px sans-serif', COLORS.textDim);
  centerText(ctx, 'WASD move · SHIFT sneak · CLICK coin · Q smoke · E douse lamp', 380, '13px sans-serif', COLORS.textDim);
  centerText(ctx, 'Press ENTER to begin', 440, 'bold 18px sans-serif', '#2fd47a');
  if (best > 0) {
    centerText(ctx, 'BEST SCORE ' + best, 480, '13px sans-serif', COLORS.gold);
  }
}

export function drawNightCard(ctx, state) {
  overlay(ctx, 0.85);
  centerText(ctx, 'NIGHT ' + state.floor.night, 300, 'bold 44px sans-serif', COLORS.gold);
  centerText(ctx, state.floor.name, 344, 'bold 26px sans-serif', COLORS.text);
  centerText(ctx, state.floor.sub, 384, '13px sans-serif', COLORS.textDim);
}

export function drawWin(ctx, state, timeSec) {
  overlay(ctx, 0.85);
  centerText(ctx, 'UNSEEN.', 220, 'bold 52px sans-serif', '#2fd47a');
  centerText(ctx, '16 shards · three nights · ' + fmtTime(timeSec), 272, '15px sans-serif', COLORS.text);
  centerText(ctx, 'Close calls: ' + state.closeCalls + ' · Spotted: ' + state.spotted, 298, '15px sans-serif', COLORS.text);
  centerText(ctx, 'SCORE ' + state.score + '   ·   TAKE $' + state.take.toLocaleString('en-US'), 336, 'bold 18px sans-serif', COLORS.gold);
  if (state.spotted === 0) {
    centerText(ctx, 'GHOST bonus +500 — never once spotted.', 372, '15px sans-serif', '#2fd47a');
  }
  centerText(ctx, 'Press R to play again', 430, '15px sans-serif', COLORS.textDim);
}

export function drawGameOver(ctx, state) {
  overlay(ctx, 0.85);
  centerText(ctx, 'CAUGHT.', 260, 'bold 52px sans-serif', '#ff5252');
  centerText(ctx, 'The night ends here. Score ' + state.score + ' · Take $' + state.take.toLocaleString('en-US'), 312, '15px sans-serif', COLORS.text);
  centerText(ctx, 'Press R to try again', 360, '15px sans-serif', COLORS.textDim);
}

export function drawPaused(ctx) {
  overlay(ctx, 0.6);
  centerText(ctx, 'PAUSED', 340, 'bold 40px sans-serif', COLORS.text);
  centerText(ctx, 'Press P to resume · R to restart', 380, '14px sans-serif', COLORS.textDim);
}

// ---------- frame utama ----------

export function render(ctx, game) {
  const { state, player, screen } = game;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  drawFloor(ctx, state, state.time);
  drawPlayer(ctx, player, state);
  drawHUD(ctx, state, player, screen);
  drawPanel(ctx, state, player, state.totalTime + state.time);

  // Toast besar di tengah area main
  if (state.toast) {
    const a = Math.min(1, state.toastT / 0.5);
    ctx.globalAlpha = a;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9f43';
    ctx.fillText(state.toast, 504, 130);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Flash tertangkap
  if (state.caughtFlash > 0) {
    ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.5, state.caughtFlash * 0.4) + ')';
    ctx.fillRect(0, HUD_H, 1008, 664);
    centerText(ctx, 'SPOTTED!', 300, 'bold 52px sans-serif', '#ff5252');
  }

  if (screen === 'title') drawTitle(ctx, state, state.best);
  else if (screen === 'night') drawNightCard(ctx, state);
  else if (screen === 'win') drawWin(ctx, state, state.totalTime + state.time);
  else if (screen === 'over') drawGameOver(ctx, state);
  else if (screen === 'paused') drawPaused(ctx);
}
