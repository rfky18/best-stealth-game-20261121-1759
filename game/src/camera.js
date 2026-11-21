// camera.js — security cameras (sweeping cone, alert, camera alarm)
// and the vault laser beam (on/off cycle, trip).

import {
  CAMERA_CONE_RANGE, CAMERA_CONE_HALF, CAMERA_SWEEP, CAMERA_SWEEP_PERIOD,
} from './config.js';
import {
  clamp, dist, angleDiff, losBlocked, smokeBlocks, inShadow, litLamp,
  laserOn, pushEvent, showToast,
} from './world.js';
import { alertAllGuards } from './guard.js';

export function makeCameras(floor) {
  return floor.cameras.map((c) => ({
    label: c.label,
    x: c.x,
    y: c.y,
    base: c.base,
    alert: 0,
    angle: c.base,
  }));
}

export function cameraAngle(cam, time) {
  return cam.base + Math.sin((time / CAMERA_SWEEP_PERIOD) * Math.PI * 2) * CAMERA_SWEEP;
}

export function cameraStatus(cam) {
  if (cam.alert >= 100) return 'ALARM';
  if (cam.alert > 5) return 'WATCHING';
  return 'IDLE';
}

export function cameraSees(state, cam) {
  const p = state.player;
  const d = dist(cam.x, cam.y, p.x, p.y);
  if (d > CAMERA_CONE_RANGE) return false;
  const ang = cameraAngle(cam, state.time);
  if (Math.abs(angleDiff(Math.atan2(p.y - cam.y, p.x - cam.x), ang)) > CAMERA_CONE_HALF) return false;
  if (losBlocked(state.floor, cam.x, cam.y, p.x, p.y)) return false;
  if (smokeBlocks(state, cam.x, cam.y, p.x, p.y)) return false;
  return true;
}

export function updateCameras(state, cameras, guards, onAlarm) {
  for (const cam of cameras) {
    if (cameraSees(state, cam)) {
      const p = state.player;
      let rate = 30;
      if (litLamp(state.floor, state.lampsLit, p.x, p.y) >= 0) rate = 45;
      else if (inShadow(state.floor, p.x, p.y)) rate = 10;
      cam.alert = clamp(cam.alert + rate * state.dt, 0, 100);
    } else {
      cam.alert = clamp(cam.alert - 12 * state.dt, 0, 100);
    }
    if (cam.alert >= 100) {
      cam.alert = 40;
      state.spotted += 1;
      const px = state.player.x, py = state.player.y;
      alertAllGuards(state, guards, px, py, 25);
      pushEvent(state, `Camera ${cam.label} raised alarm!`.slice(0, 28));
      showToast(state, 'CAMERA ALARM!');
      if (onAlarm) onAlarm(cam);
    }
  }
}

export function laserIsOn(state) {
  return state.laser ? laserOn(state.laser) : false;
}

export function tripLaser(state, guards, onTrip) {
  const p = state.player;
  alertAllGuards(state, guards, p.x, p.y, 20);
  pushEvent(state, 'Laser tripped! Hide!');
  showToast(state, 'LASER TRIPPED!');
  if (onTrip) onTrip();
}
