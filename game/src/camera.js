// EMBERWATCH: Night Shift — camera.js
// Kamera keamanan (ayun cone, alert, alarm kamera) + laser beam
// (siklus nyala/mati, trip).

import {
  CAM_RANGE, CAM_HALF, CAM_SLICES, CAM_SWEEP, CAM_PERIOD,
  CAM_ALERT_LAMP, CAM_ALERT_OPEN, CAM_ALERT_SHADOW, CAM_ALERT_DECAY,
  SUSP_CAM_ALARM, LASER_ON, LASER_OFF, LASER_TRIP_R, LASER_COOLDOWN,
  SUSP_LASER_ALL,
} from './config.js';
import {
  dist, angDiff, raycast, losClear, losBlockedBySmoke,
  inShadow, lampAt, inSmoke, distToSeg, addEvent, showToast,
} from './world.js';
import { guardsAlertAll } from './guard.js';

// Arah pandang kamera saat ini (ayun +/- CAM_SWEEP, periode CAM_PERIOD).
// cam.phase menggeser fase ayunan (0 = default).
export function cameraAngle(cam, time) {
  const t = time + (cam.phase || 0);
  return cam.base + CAM_SWEEP * Math.sin((2 * Math.PI * t) / CAM_PERIOD);
}

// Apakah kamera melihat Wren (cone + garis pandang + asap memblokir).
export function cameraSees(cam, state, px, py, time) {
  const d = dist(cam.x, cam.y, px, py);
  if (d > CAM_RANGE) return false;
  const ang = Math.atan2(py - cam.y, px - cam.x);
  if (Math.abs(angDiff(ang, cameraAngle(cam, time))) > CAM_HALF) return false;
  if (!losClear(cam.x, cam.y, px, py, state.blocks)) return false;
  if (inSmoke(px, py, state)) return false;
  if (losBlockedBySmoke(cam.x, cam.y, px, py, state.smokes)) return false;
  return true;
}

// Titik-titik poligon cone kamera (raycast 48 irisan).
export function cameraConePoints(cam, state, time) {
  const a0 = cameraAngle(cam, time);
  const pts = [{ x: cam.x, y: cam.y }];
  for (let i = 0; i <= CAM_SLICES; i++) {
    const a = a0 - CAM_HALF + (2 * CAM_HALF * i) / CAM_SLICES;
    const r = raycast(cam.x, cam.y, a, CAM_RANGE, state.blocks);
    pts.push({ x: cam.x + Math.cos(a) * r, y: cam.y + Math.sin(a) * r });
  }
  return pts;
}

export function cameraWord(cam) {
  if (cam.alert >= 100) return 'ALARM';
  if (cam.alert > 2) return 'WATCHING';
  return 'IDLE';
}

// Update semua kamera di lantai; sfx = {camAlarm} bila tersedia.
export function updateCameras(state, player, dt, sfx) {
  for (const cam of state.cameras) {
    const sees = cameraSees(cam, state, player.x, player.y, state.time);
    if (sees) {
      let rate = CAM_ALERT_OPEN;
      if (lampAt(player.x, player.y, state)) rate = CAM_ALERT_LAMP;
      else if (inShadow(player.x, player.y, state.floor)) rate = CAM_ALERT_SHADOW;
      cam.alert = Math.min(100, cam.alert + rate * dt);
      cam.lastSeen = { x: player.x, y: player.y };
    } else {
      cam.alert = Math.max(0, cam.alert - CAM_ALERT_DECAY * dt);
    }
    if (cam.alert >= 100) {
      // ALARM kamera: semua guard ke titik terakhir terlihat.
      cam.alert = 40;
      const ls = cam.lastSeen || { x: player.x, y: player.y };
      guardsAlertAll(state, ls.x, ls.y, SUSP_CAM_ALARM);
      state.spotted += 1;
      addEvent(state, 'Camera ' + cam.id + ' raised the alarm!');
      showToast(state, 'CAMERA ALARM!', 1.6);
      if (sfx) sfx.camAlarm();
    }
  }
}

// ---------- laser ----------

// Laser menyala? Siklus 2,2 detik nyala / 1,8 detik mati dari awal lantai.
export function laserOn(laser) {
  const cycle = LASER_ON + LASER_OFF;
  return (laser.clock % cycle) < LASER_ON;
}

// Update laser: jam berjalan, cek trip saat menyala.
export function updateLaser(state, player, dt, sfx) {
  const laser = state.laser;
  if (!laser) return;
  laser.clock += dt;
  if (laser.cooldown > 0) laser.cooldown -= dt;
  if (laserOn(laser) && laser.cooldown <= 0) {
    if (distToSeg(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2) < LASER_TRIP_R) {
      laser.cooldown = LASER_COOLDOWN;
      laser.tripped = true;
      guardsAlertAll(state, player.x, player.y, SUSP_LASER_ALL);
      addEvent(state, 'Laser tripped! Hide!');
      showToast(state, 'LASER TRIPPED!', 1.6);
      if (sfx) sfx.laserTrip();
    }
  }
}
