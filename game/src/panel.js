// The detection panel: the right-hand rail that tells the player, at a
// glance, what the night thinks of them — status, alarm, visibility and
// exposure, noise, loot, spotted count, goal and score, every guard's
// state, the legend, the controls, and the last three things that
// happened. Nothing in here is decoration: every line reads live state.
// The layout is budgeted to the pixel: six guards plus seven legend
// items plus three event lines still fit above the bottom edge.
import {
  HUD_H, PANEL_W, PANEL_X, SCORE, TUNE, VIEW_H,
} from './config.js';
import { exitOpen, exposureLabel, exposureOf, totalShards } from './world.js';
import { guardStateWord, maxSuspicion } from './guard.js';

/** Format seconds as m:ss for the event feed timestamps. */
function fmtClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The big status word: what the floor thinks of Wren right now. */
export function statusWord(world) {
  if (world.guards.some((g) => g.state === 'chase')) return 'CHASED!';
  const sus = maxSuspicion(world);
  if (sus >= TUNE.alertAt) return 'ALERT!';
  if (sus > 12) return 'SUSPICIOUS ?';
  return 'UNSEEN';
}

/** The line under the status word: advice for the moment. */
function statusLine(world) {
  if (world.guards.some((g) => g.state === 'chase')) return 'They see you. Run — or break the line of sight.';
  const sus = maxSuspicion(world);
  if (sus >= TUNE.alertAt) return 'They know someone is here. Freeze in shadow.';
  if (sus > 12) return 'Something caught an eye. Freeze.';
  return 'Nothing has seen you yet. Keep it that way.';
}

/** The alarm word: how loud the floor is, from the top suspicion. */
function alarmWord(world) {
  const sus = maxSuspicion(world);
  if (sus >= TUNE.chaseAt) return 'CHASE';
  if (sus >= TUNE.alertAt) return 'ALARM';
  if (sus >= 30) return 'RISING';
  return 'QUIET';
}

/** The noise word: silent, loud running, or a coin that just clinked. */
function noiseWord(world) {
  if (world.pings.length > 0) return 'COIN CLINK';
  const p = world.player;
  if (p.moving && !p.sneaking) return 'LOUD — RUNNING';
  return 'SILENT';
}

/** The goal word: what stands between Wren and the door. */
function goalWord(world) {
  if (world.status === 'won') return 'DONE';
  if (exitOpen(world)) return 'READY — GO!';
  return 'NOT YET';
}

/** Paint the whole right-hand panel for the current world state. */
export function drawPanel(ctx, world) {
  const x0 = PANEL_X;
  const x1 = PANEL_X + PANEL_W;
  const pad = 14;
  let y = HUD_H;

  ctx.fillStyle = '#0d1526';
  ctx.fillRect(x0, y, PANEL_W, VIEW_H - HUD_H);
  ctx.fillStyle = '#1b2a4a';
  ctx.fillRect(x0, y, 2, VIEW_H - HUD_H);

  function divider(at) {
    ctx.fillStyle = '#1b2a4a';
    ctx.fillRect(x0 + pad, at, PANEL_W - pad * 2, 1);
  }

  function sectionHead(text, at) {
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x0 + pad, at);
  }

  // --- DETECTION header + the big status box ---
  y += 14;
  sectionHead('D E T E C T I O N', y);
  const status = statusWord(world);
  const statusColor = status === 'CHASED!' ? '#ff3b30'
    : status === 'ALERT!' ? '#ff9500'
      : status === 'SUSPICIOUS ?' ? '#ffd60a' : '#30d158';
  y += 6;
  ctx.fillStyle = '#131f38';
  ctx.fillRect(x0 + pad, y, PANEL_W - pad * 2, 46);
  ctx.fillStyle = statusColor;
  ctx.font = '900 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(status, x0 + pad + 10, y + 26);
  ctx.fillStyle = '#c7d2e8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(statusLine(world), x0 + pad + 10, y + 40);
  y += 46;

  // --- ALARM / VISIBILITY / NOISE rows ---
  y += 18;
  const sus = maxSuspicion(world);
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('ALARM', x0 + pad, y);
  ctx.fillStyle = '#22314f';
  ctx.fillRect(x0 + pad + 62, y - 9, 108, 9);
  ctx.fillStyle = sus >= TUNE.chaseAt ? '#ff3b30' : sus >= TUNE.alertAt ? '#ff9500' : '#ffd60a';
  if (sus > 1) ctx.fillRect(x0 + pad + 62, y - 9, Math.max(9, (sus / 100) * 108), 9);
  ctx.fillStyle = '#e8eefc';
  ctx.textAlign = 'right';
  ctx.fillText(alarmWord(world), x1 - pad, y);

  y += 22;
  const exposure = exposureOf(world);
  ctx.fillStyle = '#8fa3c8';
  ctx.textAlign = 'left';
  ctx.fillText('VISIBILITY', x0 + pad, y);
  ctx.fillStyle = '#22314f';
  ctx.fillRect(x0 + pad + 62, y - 9, 108, 9);
  ctx.fillStyle = exposure >= 70 ? '#ff3b30' : exposure >= 30 ? '#ffb042' : '#30d158';
  if (exposure > 1) ctx.fillRect(x0 + pad + 62, y - 9, Math.max(9, (exposure / 100) * 108), 9);
  ctx.fillStyle = '#e8eefc';
  ctx.textAlign = 'right';
  ctx.fillText(`${exposureLabel(world)} ${exposure}%`, x1 - pad, y);

  y += 22;
  ctx.fillStyle = '#8fa3c8';
  ctx.textAlign = 'left';
  ctx.fillText('NOISE', x0 + pad, y);
  ctx.fillStyle = '#e8eefc';
  ctx.textAlign = 'right';
  ctx.fillText(noiseWord(world), x1 - pad, y);

  // --- LOOT / SPOTTED / GOAL / SCORE grid ---
  y += 12;
  divider(y);
  y += 16;
  const colL = x0 + pad;
  const colR = x0 + 140;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('LOOT', colL, y);
  ctx.fillText('SPOTTED', colR, y);
  y += 18;
  ctx.fillStyle = '#ffd60a';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText(`${world.totalTaken}/${totalShards()}`, colL, y);
  ctx.fillStyle = world.spotted > 0 ? '#ff3b30' : '#30d158';
  ctx.fillText(String(world.spotted), colR, y);
  y += 20;
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('GOAL', colL, y);
  ctx.fillText('SCORE', colR, y);
  y += 18;
  ctx.fillStyle = goalWord(world) === 'DONE' ? '#30d158' : '#e8eefc';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText(goalWord(world), colL, y);
  ctx.fillStyle = '#ffd60a';
  ctx.fillText(String(world.score), colR, y);

  // --- GHOST bonus line ---
  y += 18;
  ctx.fillStyle = world.spotted === 0 ? '#30d158' : '#5a6b8c';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    world.spotted === 0 ? `GHOST +${SCORE.ghost} if unseen at the end` : 'GHOST bonus lost — you were spotted',
    colL, y,
  );

  // --- GUARDS list ---
  y += 10;
  divider(y);
  y += 16;
  sectionHead('G U A R D S', y);
  y += 6;
  for (const guard of world.guards) {
    y += 17;
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(x0 + pad + 5, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8eefc';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(guard.name.toUpperCase(), x0 + pad + 15, y);
    ctx.fillStyle = '#22314f';
    ctx.fillRect(x0 + 118, y - 10, 62, 7);
    ctx.fillStyle = guard.suspicion >= TUNE.chaseAt ? '#ff3b30'
      : guard.suspicion >= TUNE.alertAt ? '#ff9500' : '#ffd60a';
    if (guard.suspicion > 1) {
      ctx.fillRect(x0 + 118, y - 10, Math.max(6, (guard.suspicion / 100) * 62), 7);
    }
    ctx.fillStyle = guard.state === 'chase' ? '#ff3b30' : '#8fa3c8';
    ctx.textAlign = 'right';
    ctx.fillText(guardStateWord(guard), x1 - pad, y);
  }

  // --- LEGEND ---
  y += 10;
  divider(y);
  y += 16;
  sectionHead('L E G E N D', y);
  const legend = [
    ['cone', 'Guard + vision cone'],
    ['shadow', 'Shadow — crouch to hide'],
    ['crate', 'Crate — blocks sight'],
    ['lamp', 'Lamp light — you are seen'],
    ['wire', 'Tripwire — trips the alarm'],
    ['shard', 'Ember shard — 100 pts'],
    ['exit', 'Exit — open when looted'],
  ];
  y += 4;
  for (const [kind, text] of legend) {
    y += 14;
    const cy = y - 4;
    if (kind === 'cone') {
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.arc(x0 + pad + 6, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 214, 90, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x0 + pad + 6, cy);
      ctx.arc(x0 + pad + 6, cy, 11, -0.6, 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'shadow') {
      ctx.fillStyle = 'rgba(5, 9, 22, 0.9)';
      ctx.fillRect(x0 + pad, cy - 6, 12, 12);
      ctx.strokeStyle = 'rgba(125, 175, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + pad, cy - 6, 12, 12);
    } else if (kind === 'crate') {
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(x0 + pad, cy - 6, 12, 12);
      ctx.strokeStyle = '#8a6238';
      ctx.strokeRect(x0 + pad + 0.5, cy - 5.5, 11, 11);
    } else if (kind === 'lamp') {
      ctx.fillStyle = '#ffb042';
      ctx.beginPath();
      ctx.arc(x0 + pad + 6, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe1a1';
      ctx.beginPath();
      ctx.arc(x0 + pad + 6, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'wire') {
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + pad, cy);
      ctx.lineTo(x0 + pad + 12, cy);
      ctx.stroke();
    } else if (kind === 'shard') {
      ctx.save();
      ctx.translate(x0 + pad + 6, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ff7b24';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    } else {
      ctx.fillStyle = '#30d158';
      ctx.fillRect(x0 + pad, cy - 6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶', x0 + pad + 6, cy + 3);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#c7d2e8';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x0 + pad + 20, y);
  }

  // --- CONTROLS ---
  y += 10;
  divider(y);
  y += 16;
  sectionHead('C O N T R O L S', y);
  y += 14;
  ctx.fillStyle = '#c7d2e8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('WASD move · SHIFT sneak · CLICK / C coin', x0 + pad, y);
  y += 13;
  ctx.fillText('Q smoke · E douse a lamp · P pause · M mute', x0 + pad, y);

  // --- EVENTS feed ---
  y += 10;
  divider(y);
  y += 16;
  sectionHead('W H A T   H A P P E N E D', y);
  y += 4;
  if (world.events.length === 0) {
    y += 13;
    ctx.fillStyle = '#5a6b8c';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('The night is quiet. So far.', x0 + pad, y);
  } else {
    for (const event of world.events) {
      y += 13;
      ctx.fillStyle = '#ffb042';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(fmtClock(event.t), x0 + pad, y);
      ctx.fillStyle = '#c7d2e8';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(event.text, x0 + pad + 38, y);
    }
  }
}
