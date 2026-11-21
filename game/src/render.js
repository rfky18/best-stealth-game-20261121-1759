// Everything the player sees: the depot floor, lamp light and shadow,
// tripwires, the guards and their vision cones, Wren, the tossed coins,
// the smoke, the top HUD bar, the side panel, and the title, level-card
// and win screens. The canvas is fixed at 1280x720 and CSS scales it to
// the window. The floor itself carries no teaching text: the rules live
// in the panel legend, so the level reads clean at a glance.
import {
  FIELD_W, HUD_H, SCORE, TUNE, VIEW_H, VIEW_W,
} from './config.js';
import {
  exitOpen, levelOf, rayHitDistance, totalShards,
} from './world.js';
import { coneColor, maxSuspicion } from './guard.js';
import { drawPanel } from './panel.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FLOOR_A = '#141c2f';
const FLOOR_B = '#172138';
const WALL_FILL = '#2e3d5c';
const WALL_TOP = '#4a5d84';
const CRATE_FILL = '#6b4a2f';
const CRATE_EDGE = '#8a6238';
const SHADOW_FILL = 'rgba(5, 9, 22, 0.82)';
const SHADOW_EDGE = 'rgba(125, 175, 255, 0.30)';

/** Format seconds as m:ss for the HUD timer. */
function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The renderer owns the canvas; draw(state, screen, bestScore) paints a frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFloor() {
    ctx.fillStyle = FLOOR_A;
    ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
    // Checkerboard floor tiles so motion and distance read at a glance.
    const tile = 40;
    ctx.fillStyle = FLOOR_B;
    for (let y = HUD_H; y < VIEW_H; y += tile) {
      for (let x = 0; x < FIELD_W; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
    ctx.strokeStyle = 'rgba(120, 150, 220, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD_W; x += tile) { ctx.moveTo(x, HUD_H); ctx.lineTo(x, VIEW_H); }
    for (let y = HUD_H; y <= VIEW_H; y += tile) { ctx.moveTo(0, y); ctx.lineTo(FIELD_W, y); }
    ctx.stroke();
  }

  function drawShadowsAndLamps(world, level) {
    for (const s of level.shadows) {
      ctx.fillStyle = SHADOW_FILL;
      rr(s.x, s.y, s.w, s.h, 12);
      ctx.fill();
      ctx.strokeStyle = SHADOW_EDGE;
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const lamp of world.lampsLive) {
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
      g.addColorStop(0, 'rgba(255, 176, 66, 0.32)');
      g.addColorStop(0.7, 'rgba(255, 150, 40, 0.11)');
      g.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb042';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe1a1';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWallsAndCrates(level) {
    for (const w of level.walls) {
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = WALL_TOP;
      if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 4);
      else ctx.fillRect(w.x, w.y, 4, w.h);
    }
    for (const c of level.crates) {
      ctx.fillStyle = CRATE_FILL;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = CRATE_EDGE;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y);
      ctx.lineTo(c.x, c.y + c.h);
      ctx.stroke();
    }
  }

  function drawTripwires(world) {
    for (const wire of world.wires) {
      const cooling = wire.coolLeft > 0;
      const pulse = 0.55 + Math.sin(world.time * 4) * 0.3;
      ctx.strokeStyle = cooling
        ? 'rgba(255, 59, 48, 0.25)'
        : `rgba(255, 59, 48, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(cooling ? [3, 6] : []);
      ctx.beginPath();
      ctx.moveTo(wire.x1, wire.y1);
      ctx.lineTo(wire.x2, wire.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Posts at both ends so the wire reads even at a glance.
      for (const [px, py] of [[wire.x1, wire.y1], [wire.x2, wire.y2]]) {
        ctx.fillStyle = cooling ? '#7a2a26' : '#ff3b30';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPatrolPaths(level) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([2, 8]);
    ctx.lineWidth = 2;
    for (const g of level.guards) {
      ctx.beginPath();
      g.waypoints.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();
      for (const wp of g.waypoints) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);
  }

  function drawCone(world, guard) {
    const level = levelOf(world);
    const range = TUNE.coneRange;
    const half = TUNE.coneHalfAngle;
    // Sixty-four raycast slices clip the wedge against walls and crates,
    // so the lit polygon is smooth and is exactly what the guard can see.
    const slices = TUNE.coneSlices;
    const points = [];
    for (let i = 0; i <= slices; i++) {
      const angle = guard.facing - half + (2 * half * i) / slices;
      const d = rayHitDistance(level, guard.x, guard.y, angle, range);
      points.push({
        x: guard.x + Math.cos(angle) * d,
        y: guard.y + Math.sin(angle) * d,
      });
    }
    const base = coneColor(guard);
    const grad = ctx.createRadialGradient(guard.x, guard.y, 12, guard.x, guard.y, range);
    grad.addColorStop(0, base);
    grad.addColorStop(1, 'rgba(255, 214, 90, 0.02)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = base.replace(/0\.\d+\)$/, '0.5)');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRipples(list, color) {
    for (const r of list) {
      const t = r.age / 0.9;
      ctx.strokeStyle = color.replace('A', String((1 - t) * 0.55));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6 + t * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSuspicionBar(guard) {
    if (guard.suspicion <= 2) return;
    const w = 44;
    const h = 6;
    const x = guard.x - w / 2;
    const y = guard.y - TUNE.guardRadius - 26;
    ctx.fillStyle = 'rgba(10, 14, 28, 0.85)';
    rr(x - 1, y - 1, w + 2, h + 2, 3);
    ctx.fill();
    ctx.fillStyle = guard.suspicion >= TUNE.chaseAt
      ? '#ff3b30'
      : guard.suspicion >= TUNE.alertAt ? '#ff9500' : '#ffd60a';
    rr(x, y, Math.max(6, (guard.suspicion / 100) * w), h, 3);
    ctx.fill();
  }

  function drawGuard(guard) {
    drawRipples(guard.ripples, 'rgba(255, 159, 67, A)');
    // A soft pool of light under the guard grounds the figure on the floor.
    const glow = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, 30);
    glow.addColorStop(0, 'rgba(255, 200, 120, 0.20)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 30, 0, Math.PI * 2);
    ctx.fill();
    // Body: a big bright tabard so the guard reads against the dark floor.
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, TUNE.guardRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d2a26';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, TUNE.guardRadius, guard.facing - 1.05, guard.facing + 1.05);
    ctx.lineTo(guard.x, guard.y);
    ctx.closePath();
    ctx.fill();
    // Facing tick: a short nose line so the cone direction is unmistakable.
    ctx.strokeStyle = '#fff2d9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.facing) * (TUNE.guardRadius + 5),
      guard.y + Math.sin(guard.facing) * (TUNE.guardRadius + 5),
    );
    ctx.stroke();
    drawSuspicionBar(guard);
    // Name tag, then the "!" / "?" that tells the player the guard's mind.
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - TUNE.guardRadius - 6);
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - TUNE.guardRadius - 34);
    } else if (guard.state === 'investigate') {
      ctx.fillStyle = '#ff9500';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText('?', guard.x, guard.y - TUNE.guardRadius - 32);
    } else if (guard.suspicion > 12) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - TUNE.guardRadius - 32);
    }
  }

  function drawSmoke(world) {
    for (const cloud of world.smoke) {
      const fade = Math.min(1, cloud.left / 1.2);
      const g = ctx.createRadialGradient(cloud.x, cloud.y, 6, cloud.x, cloud.y, TUNE.smokeRadius);
      g.addColorStop(0, `rgba(148, 163, 184, ${0.75 * fade})`);
      g.addColorStop(0.7, `rgba(148, 163, 184, ${0.45 * fade})`);
      g.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, TUNE.smokeRadius, 0, Math.PI * 2);
      ctx.fill();
      // Puffs inside the cloud so it reads as smoke, not a grey disc.
      ctx.fillStyle = `rgba(203, 213, 225, ${0.35 * fade})`;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + cloud.x * 0.01;
        const px = cloud.x + Math.cos(a) * TUNE.smokeRadius * 0.45;
        const py = cloud.y + Math.sin(a) * TUNE.smokeRadius * 0.45;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCoins(world) {
    // A coin mid-flight arcs toward its landing spot.
    if (world.thrownCoin) {
      const c = world.thrownCoin;
      const x = c.x0 + (c.x1 - c.x0) * c.t;
      const y = c.y0 + (c.y1 - c.y0) * c.t - Math.sin(c.t * Math.PI) * 26;
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const coin of world.landedCoins) {
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 243, 176, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Expanding ping rings mark where a coin landed — the sound the
    // guards heard, and the spot they are walking to check.
    for (const ping of world.pings) {
      const t = ping.age / 0.9;
      ctx.strokeStyle = `rgba(255, 214, 90, ${(1 - t) * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, 8 + t * 64, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 214, 90, ${(1 - t) * 0.4})`;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, 4 + t * 40, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawShards(world) {
    for (const shard of world.shards) {
      if (shard.taken) continue;
      const pulse = 1 + Math.sin(world.time * 3 + shard.x) * 0.12;
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ff7b24';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#ffd60a';
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }
  }

  function drawExit(world) {
    const open = exitOpen(world);
    const e = levelOf(world).exit;
    ctx.fillStyle = open ? '#30d158' : '#1d7a35';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? '#a9f5bd' : '#7ee2a0';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y + 4);
    ctx.lineTo(e.x + e.w / 2, e.y + e.h - 4);
    ctx.stroke();
    if (open) {
      const glow = ctx.createRadialGradient(
        e.x + e.w / 2, e.y + e.h / 2, 4, e.x + e.w / 2, e.y + e.h / 2, 90,
      );
      glow.addColorStop(0, 'rgba(48, 209, 88, 0.5)');
      glow.addColorStop(1, 'rgba(48, 209, 88, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 90, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', e.x + e.w / 2, e.y - 10);
    // The door's state line sits to the LEFT of the door, clear of the
    // guards who patrol past it — never under it, where a name tag or a
    // "!" would eat the first letters.
    ctx.fillStyle = open ? '#b8f7c9' : '#c9e8d2';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      open ? 'OPEN — GO!' : `LOCKED · ${world.shardsTaken}/${levelOf(world).shards.length}`,
      e.x - 8, e.y + e.h / 2 + 4,
    );
  }

  function drawPlayer(world) {
    const p = world.player;
    if (p.caughtFlash > 0) {
      ctx.fillStyle = `rgba(255, 59, 48, ${p.caughtFlash * 0.25})`;
      ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
    }
    drawRipples(p.ripples, 'rgba(45, 212, 191, A)');
    // Noise ring while running: the sound the guards can hear.
    if (p.moving && !p.sneaking) {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, TUNE.noiseRadiusRun, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Wren: a hooded figure in teal, bright enough to find at a glance.
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.arc(p.x, p.y, TUNE.playerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, TUNE.playerRadius, p.facing - 1.2, p.facing + 1.2);
    ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ccfbf1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 16, p.y + Math.sin(p.facing) * 16);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WREN', p.x, p.y - 19);
    if (p.smoked) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('IN SMOKE', p.x, p.y + 30);
    } else if (p.hidden) {
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('HIDDEN', p.x, p.y + 30);
    } else if (p.lit) {
      ctx.fillStyle = '#ffb042';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('IN THE LIGHT!', p.x, p.y + 30);
    }
  }

  function drawHud(world) {
    const level = levelOf(world);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#1b2a4a';
    ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
    // Title, left.
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EMBERWATCH', 16, 24);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('N I G H T   S H I F T', 16, 42);
    // Level + objective, centred over the playfield.
    ctx.fillStyle = '#e8eefc';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${world.levelIndex + 1} · ${level.name}`, FIELD_W / 2, 22);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(
      exitOpen(world)
        ? 'All shards pocketed — reach the green EXIT unseen!'
        : `Pocket ${level.shards.length} ember shards, then reach the EXIT unseen`,
      FIELD_W / 2, 42,
    );
    // Right block, over the panel: time + score, then lives and gadgets.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8eefc';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillText(fmtTime(world.time), 1130, 24);
    ctx.fillStyle = '#ffd60a';
    ctx.fillText(`SCORE ${world.score}`, VIEW_W - 16, 24);
    ctx.fillStyle = '#ff9f43';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText('♥'.repeat(world.lives) + '·'.repeat(Math.max(0, TUNE.lives - world.lives)), 1040, 44);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(`CLOSE CALLS ${world.nearMisses}`, 1130, 44);
    // Coin purse and smoke bombs, as filled dots over the panel.
    ctx.fillStyle = '#8fa3c8';
    ctx.fillText('COINS', 1180, 44);
    for (let i = 0; i < level.coins; i++) {
      ctx.fillStyle = i < world.coins ? '#ffd60a' : 'rgba(255, 214, 90, 0.25)';
      ctx.beginPath();
      ctx.arc(1214 + i * 12, 40, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The suspicion bar lives in the HUD too, under the score.
    const sus = maxSuspicion(world);
    ctx.fillStyle = '#22314f';
    rr(1024, 48, 60, 6, 3);
    ctx.fill();
    if (sus > 1) {
      ctx.fillStyle = sus >= TUNE.chaseAt ? '#ff3b30' : sus >= TUNE.alertAt ? '#ff9500' : '#ffd60a';
      rr(1024, 48, Math.max(6, (sus / 100) * 60), 6, 3);
      ctx.fill();
    }
  }

  function drawToast(world) {
    if (world.toastTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.toastTimer);
    ctx.fillStyle = '#ffb042';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.toast, FIELD_W / 2, 130);
    ctx.restore();
  }

  function drawTitle(world, bestScore) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.84)';
    ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.fillText('EMBERWATCH', FIELD_W / 2, 250);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('N I G H T   S H I F T', FIELD_W / 2, 288);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('You are Wren, a shadow courier. Pocket 10 ember shards across three floors', FIELD_W / 2, 350);
    ctx.fillText('and slip out the green EXIT — without ever being seen.', FIELD_W / 2, 378);
    ctx.fillStyle = '#ffb042';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('Stay in shadow. Watch the cones. Toss a coin, drop smoke, douse a lamp.', FIELD_W / 2, 424);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('Press ENTER or click to begin', FIELD_W / 2, 490);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('WASD / arrows move · SHIFT sneak · CLICK / C coin · Q smoke · E douse · P pause · M mute', FIELD_W / 2, 528);
    if (bestScore) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Best score: ${bestScore}`, FIELD_W / 2, 566);
    }
  }

  function drawLevelCard(world) {
    const level = levelOf(world);
    ctx.fillStyle = 'rgba(5, 8, 18, 0.78)';
    ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 52px system-ui, sans-serif';
    ctx.fillText(`LEVEL ${world.levelIndex + 1}`, FIELD_W / 2, 300);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(level.name, FIELD_W / 2, 344);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(level.sub, FIELD_W / 2, 388);
  }

  function drawBanner(world) {
    ctx.textAlign = 'center';
    if (world.status === 'won') {
      ctx.fillStyle = 'rgba(5, 20, 10, 0.78)';
      ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
      ctx.fillStyle = '#30d158';
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.fillText('UNSEEN.', FIELD_W / 2, 300);
      ctx.fillStyle = '#e8eefc';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText(
        `${totalShards()} shards, three floors, ${fmtTime(world.time)} — ${world.nearMisses} close call${world.nearMisses === 1 ? '' : 's'}.`,
        FIELD_W / 2, 348,
      );
      ctx.fillStyle = '#ffd60a';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText(`SCORE ${world.score}`, FIELD_W / 2, 396);
      if (world.spotted === 0) {
        ctx.fillStyle = '#30d158';
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.fillText(`GHOST BONUS +${SCORE.ghost} — never spotted once.`, FIELD_W / 2, 428);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText('Press R to run the night again', FIELD_W / 2, 478);
    } else if (world.status === 'over') {
      ctx.fillStyle = 'rgba(20, 5, 5, 0.8)';
      ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.fillText('CAUGHT.', FIELD_W / 2, 300);
      ctx.fillStyle = '#e8eefc';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('The night shift ends here. The depot keeps its embers.', FIELD_W / 2, 348);
      ctx.fillStyle = '#ffd60a';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText(`SCORE ${world.score}`, FIELD_W / 2, 396);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText('Press R to try again', FIELD_W / 2, 448);
    } else if (world.status === 'caught') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.fillText('SPOTTED!', FIELD_W / 2, 200);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.7)';
    ctx.fillRect(0, HUD_H, FIELD_W, VIEW_H - HUD_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', FIELD_W / 2, 340);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('Press P to keep sneaking', FIELD_W / 2, 380);
  }

  /** Paint one frame of the given screen. */
  function draw(world, screen, bestScore) {
    const level = levelOf(world);
    drawFloor();
    drawShadowsAndLamps(world, level);
    drawPatrolPaths(level);
    drawWallsAndCrates(level);
    drawTripwires(world);
    drawShards(world);
    drawExit(world);
    drawCoins(world);
    for (const guard of world.guards) drawCone(world, guard);
    for (const guard of world.guards) drawGuard(guard);
    drawSmoke(world);
    drawPlayer(world);
    drawPanel(ctx, world);
    drawHud(world);
    drawToast(world);
    if (screen === SCREEN_TITLE) drawTitle(world, bestScore);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (world.status === 'levelcard') drawLevelCard(world);
    else drawBanner(world);
    return ctx;
  }

  return { draw };
}
