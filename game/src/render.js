// render.js — every canvas drawing: floor, cones, guards, Wren, HUD,
// title / floor-card / win / caught / paused overlays.

import {
  CANVAS_W, CANVAS_H, HUD_H, MAIN_X1, PANEL_X, GUARD_CONE_RANGE,
  GUARD_CONE_HALF, CAMERA_CONE_RANGE, CAMERA_CONE_HALF, SMOKE_RADIUS,
} from './config.js';
import {
  dist, pointInRect, raycast, inShadow, litLamp, inSmoke, exposureOf,
  alarmStage, fmtTime, laserOn,
} from './world.js';
import { maxSuspicion } from './guard.js';
import { cameraAngle } from './camera.js';
import { shardsLeft, exitOpen } from './player.js';
import { drawPanel } from './panel.js';

function coneColor(suspicion, chasing) {
  if (chasing) return { fill: 'rgba(255,70,60,0.42)', edge: '#ff8a7a' };
  if (suspicion >= 60) return { fill: 'rgba(255,140,40,0.38)', edge: '#ffb066' };
  if (suspicion >= 30) return { fill: 'rgba(255,196,66,0.36)', edge: '#ffe08a' };
  return { fill: 'rgba(255,222,120,0.34)', edge: '#ffedb0' };
}

function drawCone(ctx, floor, x, y, angle, range, half, slices, fill, edge) {
  const pts = [[x, y]];
  for (let i = 0; i <= slices; i++) {
    const a = angle - half + (2 * half * i) / slices;
    const d = raycast(floor, x, y, a, range);
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  // 2px brighter edge along both cone sides.
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.moveTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.stroke();
}

function drawFloor(ctx, state) {
  const f = state.floor;
  // Checkerboard floor.
  for (let gy = HUD_H; gy < CANVAS_H; gy += 40) {
    for (let gx = 0; gx < MAIN_X1; gx += 40) {
      const even = ((gx / 40) + (gy / 40)) % 2 === 0;
      ctx.fillStyle = even ? '#141d33' : '#111827';
      ctx.fillRect(gx, gy, 40, 40);
    }
  }
  ctx.strokeStyle = 'rgba(120,150,220,0.07)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= MAIN_X1; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, HUD_H); ctx.lineTo(gx, CANVAS_H); ctx.stroke(); }
  for (let gy = HUD_H; gy <= CANVAS_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(MAIN_X1, gy); ctx.stroke(); }
  // Shadows.
  for (const r of f.shadows) {
    ctx.fillStyle = 'rgba(4,8,20,0.55)';
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.strokeStyle = 'rgba(110,160,255,0.55)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r[0], r[1], r[2], r[3]);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(160,190,255,0.75)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHADOW', r[0] + 6, r[1] + 14);
  }
  // Lamp glow (lit only).
  for (let i = 0; i < f.lamps.length; i++) {
    if (!state.lampsLit[i]) continue;
    const l = f.lamps[i];
    const grad = ctx.createRadialGradient(l[0], l[1], 6, l[0], l[1], l[2]);
    grad.addColorStop(0, 'rgba(255,190,90,0.28)');
    grad.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(l[0], l[1], l[2], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(l[0], l[1], 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,110,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(l[0], l[1], 9, 0, Math.PI * 2); ctx.stroke();
  }
  // Patrol paths.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 1.5;
  for (const g of state._guards || []) {
    ctx.beginPath();
    g.waypoints.forEach(([wx, wy], i) => { if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy); });
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [wx, wy] of g.waypoints) { ctx.beginPath(); ctx.arc(wx, wy, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.setLineDash([]);
  // Walls.
  for (const r of f.walls) {
    ctx.fillStyle = '#2c3a5e';
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.fillStyle = '#3d517d';
    ctx.fillRect(r[0], r[1], r[2], 3);
  }
  // Crates with diagonal cross.
  for (const [cx, cy] of f.crates) {
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(cx, cy, 44, 44);
    ctx.strokeStyle = '#8a6a3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 1, cy + 1, 42, 42);
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 4); ctx.lineTo(cx + 40, cy + 40);
    ctx.moveTo(cx + 40, cy + 4); ctx.lineTo(cx + 4, cy + 40);
    ctx.stroke();
  }
  // Tripwires.
  const pulse = 0.55 + 0.45 * Math.sin(state.time * 5);
  for (const w of state.wires) {
    const dim = w.cooldown > 0;
    ctx.strokeStyle = dim ? 'rgba(255,80,80,0.3)' : `rgba(255,60,60,${pulse})`;
    ctx.lineWidth = dim ? 1.5 : 3;
    if (dim) ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(w.a[0], w.a[1]); ctx.lineTo(w.b[0], w.b[1]); ctx.stroke();
    ctx.setLineDash([]);
    for (const p of [w.a, w.b]) {
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(p[0] - 3, p[1] - 6, 6, 12);
    }
  }
  // Laser (floor 3).
  if (state.laser) {
    const on = laserOn(state.laser);
    const [a, b] = [state.laser.a, state.laser.b];
    if (on) {
      ctx.strokeStyle = 'rgba(255,40,40,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,80,80,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const p of [a, b]) {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(p[0] - 4, p[1] - 10, 8, 20);
      ctx.fillStyle = '#ff5555';
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Shards.
  for (let i = 0; i < f.shards.length; i++) {
    if (state.shardsTaken[i]) continue;
    const [sx, sy] = f.shards[i];
    const pulse2 = 1 + 0.18 * Math.sin(state.time * 4 + i);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff9f1c';
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 10;
    const s = 9 * pulse2;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Exit door.
  const e = f.exit;
  const open = exitOpen(state);
  ctx.fillStyle = open ? '#27ae60' : '#1d5c38';
  ctx.fillRect(e[0], e[1], e[2], e[3]);
  if (open) {
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(e[0], e[1], e[2], e[3]);
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = open ? '#a9f5c6' : '#7fb894';
  ctx.lineWidth = 2;
  ctx.strokeRect(e[0], e[1], e[2], e[3]);
  ctx.fillStyle = '#eafff1';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e[0] + e[2] / 2, e[1] - 6);
  // Exit status, LEFT of the door, right-aligned, vertically centered.
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5,10,22,0.9)';
  const label = open ? 'OPEN — GO!' : `LOCKED · ${state.shardsTaken.filter(Boolean).length}/${f.shards.length}`;
  ctx.strokeText(label, e[0] - 8, e[1] + e[3] / 2 + 4);
  ctx.fillStyle = open ? '#7dffb0' : '#ffd166';
  ctx.fillText(label, e[0] - 8, e[1] + e[3] / 2 + 4);
  // Coins on the floor / in flight.
  for (const c of state.coins) {
    const x = c.landed ? c.tx : c.x + (c.tx - c.x) * (c.t / 0.35);
    const y = c.landed ? c.ty : c.y + (c.ty - c.y) * (c.t / 0.35) - Math.sin((c.t / 0.35) * Math.PI) * 18;
    if (c.landed && c.ring !== undefined && c.ring < 1) {
      ctx.strokeStyle = `rgba(255,215,0,${1 - c.ring})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.tx, c.ty, 6 + c.ring * 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a67c00';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawCameras(ctx, state) {
  for (const cam of state._cameras) {
    const ang = cameraAngle(cam, state.time);
    const alert = cam.alert >= 100 ? 100 : cam.alert;
    const fill = alert > 5 ? 'rgba(120,190,255,0.5)' : 'rgba(120,190,255,0.38)';
    drawCone(ctx, state.floor, cam.x, cam.y, ang, CAMERA_CONE_RANGE, CAMERA_CONE_HALF, 48, fill, '#bfe0ff');
    ctx.fillStyle = '#1f2a44';
    ctx.fillRect(cam.x - 8, cam.y - 8, 16, 16);
    ctx.strokeStyle = '#7fc4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cam.x - 8, cam.y - 8, 16, 16);
    ctx.fillStyle = '#bfe0ff';
    ctx.beginPath(); ctx.arc(cam.x + Math.cos(ang) * 6, cam.y + Math.sin(ang) * 6, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,10,22,0.9)';
    ctx.strokeText(cam.label, cam.x, cam.y - 13);
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText(cam.label, cam.x, cam.y - 13);
  }
}

function drawGuards(ctx, state) {
  for (const g of state._guards) {
    const chasing = g.stage === 'chasing';
    const col = coneColor(g.suspicion, chasing);
    drawCone(ctx, state.floor, g.x, g.y, g.facing, GUARD_CONE_RANGE, GUARD_CONE_HALF, 64, col.fill, col.edge);
  }
  for (const g of state._guards) {
    // Body.
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(g.x, g.y, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, 19, 0, Math.PI * 2); ctx.stroke();
    // Facing wedge + nose line.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, 19, g.facing - 0.5, g.facing + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 19, g.y + Math.sin(g.facing) * 19);
    ctx.stroke();
    // Name label, shifted up if a crate/wall crowds it.
    let labelY = g.y - 32;
    const probe = { x: g.x, y: labelY - 4 };
    const crowded = [...state.floor.walls, ...state.floor.crates.map((c) => [c[0], c[1], 44, 44])]
      .some((r) => pointInRect(probe.x, probe.y, [r[0] - 4, r[1] - 4, r[2] + 8, r[3] + 8]));
    if (crowded) labelY -= 24;
    // Suspicion bar above the name.
    if (g.suspicion > 2) {
      const w = 38;
      ctx.fillStyle = '#22314f';
      ctx.fillRect(g.x - w / 2, labelY - 16, w, 5);
      ctx.fillStyle = g.suspicion >= 92 ? '#ff4444' : g.suspicion >= 60 ? '#ff9f43' : '#ffd60a';
      ctx.fillRect(g.x - w / 2, labelY - 16, (w * g.suspicion) / 100, 5);
    }
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,10,22,0.9)';
    ctx.strokeText(g.name.toUpperCase(), g.x, labelY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(g.name.toUpperCase(), g.x, labelY);
    // Stage marks.
    if (g.stage === 'chasing') {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('!', g.x, g.y - 46);
    } else if (g.stage === 'curious') {
      ctx.fillStyle = '#ff9f43';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('?', g.x, g.y - 46);
    } else if (g.suspicion > 12) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('!', g.x, g.y - 46);
    }
  }
}

function drawSmoke(ctx, state) {
  for (const s of state.smokes) {
    if (s.t <= 0) continue;
    const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, SMOKE_RADIUS);
    grad.addColorStop(0, 'rgba(200,205,215,0.5)');
    grad.addColorStop(1, 'rgba(200,205,215,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(s.x, s.y, SMOKE_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,225,235,0.35)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 30, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // Ripples.
  for (const r of state.ripples) {
    const k = 1 - r.t / r.dur;
    ctx.strokeStyle = `rgba(180,220,255,${0.6 * (1 - k)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, 4 + k * r.max, 0, Math.PI * 2); ctx.stroke();
  }
  // Noise ring while running.
  if (p.running && p.moving) {
    ctx.strokeStyle = 'rgba(255,220,120,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, 30 + 4 * Math.sin(state.time * 8), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#2ec4b6';
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, 13, p.facing - 0.5, p.facing + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.facing) * 13, p.y + Math.sin(p.facing) * 13);
  ctx.stroke();
  // WREN label: shift left when near the right edge of the main area.
  const labelX = p.x > MAIN_X1 - 70 ? p.x - 30 : p.x;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5,10,22,0.9)';
  ctx.strokeText('WREN', labelX, p.y - 20);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('WREN', labelX, p.y - 20);
  const hidden = inShadow(state.floor, p.x, p.y);
  const lit = litLamp(state.floor, state.lampsLit, p.x, p.y) >= 0;
  const smoky = inSmoke(state, p.x, p.y);
  let status = null, color = '#cfe6ff';
  if (smoky) { status = 'IN SMOKE'; color = '#d5dbe5'; }
  else if (hidden) { status = 'HIDDEN'; color = '#8ecbff'; }
  else if (lit) { status = 'IN THE LIGHT!'; color = '#ffb347'; }
  if (status) {
    ctx.font = 'bold 10px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,10,22,0.9)';
    ctx.strokeText(status, labelX, p.y + 26);
    ctx.fillStyle = color;
    ctx.fillText(status, labelX, p.y + 26);
  }
}

function drawHUD(ctx, game) {
  const state = game.state;
  ctx.fillStyle = '#0a1120';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.strokeStyle = '#1b2a4a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(CANVAS_W, HUD_H); ctx.stroke();
  // Left: title.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('EMBERWATCH', 14, 24);
  ctx.fillStyle = '#8fa3c8';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('NIGHT SHIFT', 14, 40);
  // Center: night + objective.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8eefc';
  ctx.font = 'bold 15px sans-serif';
  const left = shardsLeft(state);
  ctx.fillText(`NIGHT ${state.floorIndex + 1} · LEVEL ${state.floorIndex + 1} · ${state.floor.name}`, 540, 22);
  ctx.fillStyle = '#c7d2e8';
  ctx.font = '12px sans-serif';
  ctx.fillText(left > 0 ? `Pocket ${left} ember shard${left > 1 ? 's' : ''}, then reach the EXIT unseen` : 'All shards pocketed — reach the green EXIT unseen!', 540, 41);
  // Right (above panel): time, score, take.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8eefc';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${fmtTime(state.time)}   SCORE ${state.score}`, 1170, 22);
  ctx.fillStyle = '#ffd60a';
  ctx.fillText(`TAKE $${state.take}`, 1274, 22);
  // Second row: hearts, close calls, coins, suspicion mini-bar.
  const hearts = '♥'.repeat(state.lives) + '♡'.repeat(Math.max(0, 3 - state.lives));
  ctx.fillStyle = '#ff6b81';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(hearts, 1090, 44);
  ctx.fillStyle = '#c7d2e8';
  ctx.fillText(`CLOSE CALLS ${state.closeCalls}`, 1124, 44);
  ctx.fillStyle = '#ffd60a';
  ctx.font = '9px sans-serif';
  ctx.fillText(`COINS ${'●'.repeat(state.coinsLeft)}${'○'.repeat(Math.max(0, 5 - state.coinsLeft))}`, 1206, 44);
  // Suspicion mini-bar under hearts.
  const ms = maxSuspicion(state._guards);
  ctx.fillStyle = '#22314f';
  ctx.fillRect(1090, 50, 60, 4);
  ctx.fillStyle = ms >= 92 ? '#ff4444' : ms >= 60 ? '#ff9f43' : '#ffd60a';
  ctx.fillRect(1090, 50, (60 * ms) / 100, 4);
}

function overlay(ctx, title, lines, color) {
  ctx.fillStyle = 'rgba(5,10,22,0.82)';
  ctx.fillRect(0, HUD_H, MAIN_X1, CANVAS_H - HUD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color || '#ffd60a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, MAIN_X1 / 2, 250);
  ctx.fillStyle = '#e8eefc';
  ctx.font = '15px sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, MAIN_X1 / 2, 300 + i * 26));
}

export function drawScene(ctx, game) {
  const state = game.state;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  if (game.screen === 'title') {
    drawFloor(ctx, state);
    drawCameras(ctx, state);
    drawGuards(ctx, state);
    drawPlayer(ctx, state);
    drawHUD(ctx, game);
    drawPanel(ctx, game);
    overlay(ctx, 'EMBERWATCH', [
      'NIGHT SHIFT — slip in, pocket the embers, leave unseen.',
      'WASD move · SHIFT sneak · CLICK throw a coin · Q smoke · E douse a lamp',
      'Guards patrol. Cameras sweep. A near miss raises the alarm.',
      game.bestScore > 0 ? `Best score: ${game.bestScore}` : 'Three nights. Sixteen embers. $2,400 on the table.',
      'Press ENTER to begin',
    ]);
    return;
  }
  drawFloor(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawSmoke(ctx, state);
  drawPlayer(ctx, state);
  drawHUD(ctx, game);
  drawPanel(ctx, game);
  // Toast.
  if (state.toast) {
    ctx.globalAlpha = Math.min(1, state.toast.t);
    ctx.fillStyle = '#ff9f43';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast.text, MAIN_X1 / 2, 112);
    ctx.globalAlpha = 1;
  }
  if (game.screen === 'card') {
    overlay(ctx, `NIGHT ${state.floorIndex + 1}`, [state.floor.name, state.floor.sub, ''], '#ffd60a');
  } else if (game.screen === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P to resume · R to restart'], '#e8eefc');
  } else if (game.screen === 'caught') {
    overlay(ctx, 'SPOTTED!', [`A guard caught Wren. ${game.state.lives} ${game.state.lives === 1 ? 'life' : 'lives'} left.`, 'Press ENTER to slip back in'], '#ff5555');
  } else if (game.screen === 'gameover') {
    overlay(ctx, 'CAUGHT.', [`Score ${game.state.score} · Take $${game.state.take}`, 'Press R to try again'], '#ff5555');
  } else if (game.screen === 'win') {
    const g = game;
    const lines = [
      `16 shards · three nights · ${fmtTime(state.time)} · ${state.closeCalls} close call${state.closeCalls === 1 ? '' : 's'}`,
      `Score ${state.score} · TAKE $2,400`,
    ];
    if (state.spotted === 0) lines.push('GHOST +500 — never once spotted.');
    lines.push('Press R to play again');
    overlay(ctx, 'UNSEEN.', lines, '#7dffb0');
  }
}
