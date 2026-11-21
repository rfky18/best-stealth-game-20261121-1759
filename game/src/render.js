// Everything the player sees: the depot floor, lamp light and shadow, the
// guards and their vision cones, Wren, the HUD, and the title/win screens.
// The canvas is fixed at 1280x720; CSS scales it to the window.
import {
  VIEW_W, VIEW_H, HUD_H, WALLS, CRATES, SHADOWS, LAMPS, SHARDS, EXIT, GUARDS, TUNE,
} from './config.js';
import { exitOpen, rayHitDistance } from './world.js';
import { coneColor, maxSuspicion } from './guard.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FLOOR_A = '#151d30';
const FLOOR_B = '#182136';
const WALL_FILL = '#2e3d5c';
const WALL_TOP = '#46587f';
const CRATE_FILL = '#6b4a2f';
const CRATE_EDGE = '#8a6238';
const SHADOW_FILL = 'rgba(6, 10, 24, 0.85)';

/** The renderer owns the canvas; draw(state, screen, bestMs) paints a frame. */
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
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    // Checkerboard floor tiles so motion and distance read at a glance.
    const tile = 40;
    ctx.fillStyle = FLOOR_B;
    for (let y = HUD_H; y < VIEW_H; y += tile) {
      for (let x = 0; x < VIEW_W; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
    ctx.strokeStyle = 'rgba(120, 150, 220, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += tile) { ctx.moveTo(x, HUD_H); ctx.lineTo(x, VIEW_H); }
    for (let y = HUD_H; y <= VIEW_H; y += tile) { ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); }
    ctx.stroke();
  }

  function drawShadowsAndLamps() {
    for (const s of SHADOWS) {
      ctx.fillStyle = SHADOW_FILL;
      rr(s.x, s.y, s.w, s.h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 170, 255, 0.25)';
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // First shadow patch carries its label so the rule reads in one look.
    ctx.fillStyle = 'rgba(160, 200, 255, 0.75)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOW — SAFE', SHADOWS[0].x + SHADOWS[0].w / 2, SHADOWS[0].y + 22);
    for (const lamp of LAMPS) {
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
      g.addColorStop(0, 'rgba(255, 176, 66, 0.34)');
      g.addColorStop(0.7, 'rgba(255, 150, 40, 0.12)');
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
    ctx.fillStyle = 'rgba(255, 190, 90, 0.8)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('LIGHT — SEEN FASTER', LAMPS[0].x, LAMPS[0].y + LAMPS[0].r - 8);
  }

  function drawWallsAndCrates() {
    for (const w of WALLS) {
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = WALL_TOP;
      if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 4);
      else ctx.fillRect(w.x, w.y, 4, w.h);
    }
    for (const c of CRATES) {
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
    ctx.fillStyle = 'rgba(230, 220, 190, 0.85)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COVER', CRATES[0].x + 66, CRATES[0].y - 8);
  }

  function drawPatrolPaths() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.setLineDash([2, 8]);
    ctx.lineWidth = 2;
    for (const g of GUARDS) {
      ctx.beginPath();
      g.waypoints.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();
      for (const wp of g.waypoints) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);
  }

  function drawCone(guard) {
    const range = TUNE.coneRange;
    const half = TUNE.coneHalfAngle;
    // The cone is clipped by walls and crates: one ray per slice of the
    // arc, each stopped at the first solid it meets, so the lit wedge is
    // exactly what the guard can see.
    const slices = 26;
    const points = [];
    for (let i = 0; i <= slices; i++) {
      const angle = guard.facing - half + (2 * half * i) / slices;
      const d = rayHitDistance(guard.x, guard.y, angle, range);
      points.push({
        x: guard.x + Math.cos(angle) * d,
        y: guard.y + Math.sin(angle) * d,
      });
    }
    const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    const base = coneColor(guard);
    grad.addColorStop(0, base);
    grad.addColorStop(1, 'rgba(255, 214, 90, 0.02)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = base.replace(/0\.\d+\)$/, '0.55)');
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

  function drawGuard(guard) {
    drawRipples(guard.ripples, 'rgba(255, 159, 67, A)');
    // Body: a bright tabard so the guard reads against the dark floor.
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d2a26';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, guard.facing - 1.1, guard.facing + 1.1);
    ctx.lineTo(guard.x, guard.y);
    ctx.closePath();
    ctx.fill();
    // Facing tick: a short nose line so the cone direction is unmistakable.
    ctx.strokeStyle = '#fff2d9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
    ctx.stroke();
    // Name tag and the "!" / "?" that tells the player the guard's mind.
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name, guard.x, guard.y - 20);
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 26px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - 34);
    } else if (guard.state === 'investigate') {
      ctx.fillStyle = '#ff9500';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.fillText('?', guard.x, guard.y - 32);
    } else if (guard.suspicion > 12) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - 32);
    }
    // Suspicion arc over the guard's head.
    if (guard.suspicion > 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = guard.suspicion >= TUNE.chaseAt ? '#ff3b30' : '#ffd60a';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawShards(world) {
    for (const shard of world.shards) {
      if (shard.taken) continue;
      const pulse = 1 + Math.sin(world.time * 3 + shard.x) * 0.12;
      ctx.fillStyle = '#ff7b24';
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
      ctx.fillStyle = '#ffd60a';
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }
  }

  function drawExit(world) {
    const open = exitOpen(world);
    const e = EXIT;
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
    ctx.fillStyle = open ? '#b8f7c9' : '#c9e8d2';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(open ? 'OPEN — GO!' : `LOCKED · ${world.shardsTaken}/3 SHARDS`, e.x + e.w - 2, e.y + e.h + 16);
  }

  function drawPlayer(world) {
    const p = world.player;
    if (p.caughtFlash > 0) {
      ctx.fillStyle = `rgba(255, 59, 48, ${p.caughtFlash * 0.25})`;
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
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
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, p.facing - 1.2, p.facing + 1.2);
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
    if (p.hidden) {
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
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#1b2a4a';
    ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EMBERWATCH', 16, 28);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('N I G H T   S H I F T', 16, 46);
    // Objective, centre.
    ctx.fillStyle = '#e8eefc';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const objective = exitOpen(world)
      ? 'All shards pocketed — reach the green EXIT unseen!'
      : `Pocket ${SHARDS.length} ember shards, then reach the EXIT unseen`;
    ctx.fillText(objective, VIEW_W / 2, 26);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('WASD / arrows move · SHIFT sneak · P pause · M mute', VIEW_W / 2, 46);
    // Shards, lives, suspicion — right side.
    let x = VIEW_W - 16;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillText(`SHARDS ${world.shardsTaken}/${SHARDS.length}`, x, 26);
    x -= 130;
    ctx.fillStyle = '#ff9f43';
    ctx.fillText(`♥ ${world.lives}`, x, 26);
    x -= 70;
    const sus = maxSuspicion(world);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText('SUSPICION', x - 8, 18);
    ctx.fillStyle = '#22314f';
    rr(x - 108, 24, 100, 12, 6);
    ctx.fill();
    ctx.fillStyle = sus >= TUNE.chaseAt ? '#ff3b30' : sus >= TUNE.alertAt ? '#ff9500' : '#ffd60a';
    if (sus > 1) {
      rr(x - 108, 24, Math.max(12, (sus / 100) * 100), 12, 6);
      ctx.fill();
    }
    ctx.fillStyle = sus >= TUNE.alertAt ? '#ff9500' : '#8fa3c8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(sus >= TUNE.chaseAt ? 'CHASED!' : sus >= TUNE.alertAt ? 'ALERT!' : 'UNSEEN', x - 8, 48);
  }

  function drawTitle(world, bestMs) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.fillText('EMBERWATCH', VIEW_W / 2, 250);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('N I G H T   S H I F T', VIEW_W / 2, 288);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('You are Wren, a shadow courier. Pocket 3 ember shards', VIEW_W / 2, 350);
    ctx.fillText('and slip out the green EXIT — without ever being seen.', VIEW_W / 2, 378);
    ctx.fillStyle = '#ffb042';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('Stay in shadow. Watch the cones. Patience pays.', VIEW_W / 2, 424);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 490);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('WASD / arrows move · SHIFT sneak (slow, quiet) · P pause · M mute', VIEW_W / 2, 528);
    if (bestMs) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Best escape: ${(bestMs / 1000).toFixed(1)}s`, VIEW_W / 2, 566);
    }
  }

  function drawBanner(world) {
    ctx.textAlign = 'center';
    if (world.status === 'won') {
      ctx.fillStyle = 'rgba(5, 20, 10, 0.78)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.fillStyle = '#30d158';
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.fillText('UNSEEN.', VIEW_W / 2, 320);
      ctx.fillStyle = '#e8eefc';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText(`The lantern is yours. Escape in ${(world.time).toFixed(1)} seconds.`, VIEW_W / 2, 368);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText('Press R to run the night again', VIEW_W / 2, 420);
    } else if (world.status === 'over') {
      ctx.fillStyle = 'rgba(20, 5, 5, 0.8)';
      ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.fillText('CAUGHT.', VIEW_W / 2, 320);
      ctx.fillStyle = '#e8eefc';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('The night shift ends here. The depot keeps its embers.', VIEW_W / 2, 368);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText('Press R to try again', VIEW_W / 2, 420);
    } else if (world.status === 'caught') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.fillText('SPOTTED!', VIEW_W / 2, 200);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.7)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, 340);
    ctx.fillStyle = '#8fa3c8';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('Press P to keep sneaking', VIEW_W / 2, 380);
  }

  /** Paint one frame of the given screen. */
  function draw(world, screen, bestMs) {
    drawFloor();
    drawShadowsAndLamps();
    drawPatrolPaths();
    drawWallsAndCrates();
    drawShards(world);
    drawExit(world);
    for (const guard of world.guards) drawCone(guard);
    for (const guard of world.guards) drawGuard(guard);
    drawPlayer(world);
    drawHud(world);
    if (screen === SCREEN_TITLE) drawTitle(world, bestMs);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else drawBanner(world);
    return ctx;
  }

  return { draw };
}
