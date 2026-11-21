// EMBERWATCH: Night Shift — world.js
// Geometri (garis pandang, raycast, tabrakan), zona cahaya/bayangan/asap,
// exposure, tripwire, state dunia, event feed, toast.

import {
  FLOORS, outerWalls, COIN_MAX, SMOKE_MAX, LIVES_MAX,
  WIRE_TRIP_R, WIRE_REARM, TOTAL_SHARDS,
} from './config.js';

export const MAX_EVENT_LEN = 30;

// ---------- geometri dasar ----------

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Jarak titik ke segmen (x1,y1)-(x2,y2).
export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

// Apakah segmen (x1,y1)-(x2,y2) memotong persegi r (tes sampling + uji ujung).
export function segHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const steps = Math.ceil(dist(x1, y1, x2, y2) / 6);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInRect(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r)) return true;
  }
  return false;
}

// Semua penghalang padat di lantai: dinding luar + dalam + peti.
export function blockers(floor) {
  const list = outerWalls().concat(floor.walls);
  for (const c of floor.crates) list.push({ x: c.x, y: c.y, w: 44, h: 44 });
  return list;
}

// Raycast: jarak dari (x,y) searah angle sampai penghalang pertama (maks range).
export function raycast(x, y, angle, range, blocks) {
  const step = 4;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  for (let d = step; d <= range; d += step) {
    const px = x + dx * d, py = y + dy * d;
    for (const b of blocks) {
      if (pointInRect(px, py, b)) return d;
    }
  }
  return range;
}

// Garis pandang bersih antara dua titik (tidak terpotong dinding/peti).
export function losClear(x1, y1, x2, y2, blocks) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
    for (const b of blocks) {
      if (pointInRect(px, py, b)) return false;
    }
  }
  return true;
}

// Asap memblokir garis pandang: segmen terpotong awan (sampel tiap 10 px).
export function losBlockedBySmoke(x1, y1, x2, y2, smokes) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(d / 10));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
    for (const s of smokes) {
      if (dist(px, py, s.x, s.y) < s.r) return true;
    }
  }
  return false;
}

// Tabrakan lingkaran (x,y,r) vs semua penghalang: geser keluar.
export function collideCircle(p, r, blocks) {
  for (const b of blocks) {
    const cx = clamp(p.x, b.x, b.x + b.w);
    const cy = clamp(p.y, b.y, b.y + b.h);
    const dx = p.x - cx, dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { p.y = b.y - r; continue; }
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.y = cy + (dy / d) * r;
    }
  }
}

// ---------- zona ----------

export function inShadow(x, y, floor) {
  for (const s of floor.shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

export function lampAt(x, y, state) {
  for (const l of state.lampsOn) {
    if (dist(x, y, l.x, l.y) < l.r) return l;
  }
  return null;
}

export function inSmoke(x, y, state) {
  for (const s of state.smokes) {
    if (dist(x, y, s.x, s.y) < s.r) return true;
  }
  return false;
}

// Paparan live 0-100: asap 0, bayangan 5, terbuka 40, lampu 90, +10 lari.
export function exposureAt(x, y, state, running) {
  if (inSmoke(x, y, state)) return 0;
  let v;
  if (lampAt(x, y, state)) v = 90;
  else if (inShadow(x, y, state.floor)) v = 5;
  else v = 40;
  if (running) v += 10;
  return Math.min(100, v);
}

export function zoneWord(x, y, state, running) {
  if (inSmoke(x, y, state)) return 'IN SMOKE';
  if (lampAt(x, y, state)) return 'IN LAMPLIGHT';
  if (inShadow(x, y, state.floor)) return 'IN SHADOW';
  return 'IN THE OPEN';
}

// ---------- state dunia ----------

// Buat state segar untuk satu lantai (index 0..2), membawa skor kumulatif.
export function newFloorState(floorIdx, carry) {
  const floor = FLOORS[floorIdx];
  const s = {
    floorIdx,
    floor,
    time: 0, // waktu di lantai ini (detik)
    totalTime: carry ? carry.totalTime : 0,
    score: carry ? carry.score : 0,
    take: carry ? carry.take : 0,
    lootTotal: carry ? carry.lootTotal : 0,
    spotted: carry ? carry.spotted : 0,
    closeCalls: carry ? carry.closeCalls : 0,
    lives: carry ? carry.lives : LIVES_MAX,
    coins: COIN_MAX,
    smokesLeft: SMOKE_MAX,
    shards: floor.shards.map((p) => ({ x: p.x, y: p.y, got: false })),
    lampsOn: floor.lamps.map((l) => ({ ...l })),
    blocks: blockers(floor),
    guards: floor.guards.map((g) => ({
      name: g.name,
      color: g.color,
      wps: g.wps.map((w) => ({ x: w[0], y: w[1] })),
      pause: g.pause,
      speed: g.speed,
      x: g.wps[0][0],
      y: g.wps[0][1],
      face: g.face,
      wpIdx: 1 % g.wps.length,
      waiting: 0,
      sweepT: Math.random() * 6,
      suspicion: 0,
      peak: 0, // puncak suspicion sejak terakhir pulih
      hadChase: false,
      state: 'patrol', // patrol | curious | chase
      lastSeen: null,
      lookT: 0, // timer melihat-lihat di titik
      blindT: 0, // detik sejak terakhir melihat Wren
      ripples: [],
    })),
    cameras: floor.cameras.map((c) => ({
      id: c.id, x: c.x, y: c.y, base: c.base, phase: 0, alert: 0, lastSeen: null,
    })),
    wires: floor.wires.map((w) => ({ ...w, cooldown: 0 })),
    laser: floor.laser ? { ...floor.laser, clock: 0, cooldown: 0, tripped: false } : null,
    smokes: [],
    coinsFlying: [],
    coinsLanded: [],
    ripples: [],
    events: [],
    toast: null,
    toastT: 0,
    coinNoiseT: 0,
    nearMissPct: carry && carry.nearMissPct != null ? carry.nearMissPct : null,
    exitOpen: false,
    floorDone: false,
    nightDone: [false, false, false],
    won: false,
    over: false,
    caughtFlash: 0,
    best: 0,
  };
  if (carry) {
    s.nightDone = carry.nightDone.slice();
    s.events = carry.events ? carry.events.slice() : [];
  }
  return s;
}

// ---------- event feed & toast ----------

// Semua teks event ditulis pendek di sumber (maks 30 karakter).
// Fungsi ini hanya pengaman terakhir: potong di batas kata bila ada yang lolos.
export function addEvent(state, text) {
  let t = text;
  if (t.length > MAX_EVENT_LEN) {
    t = t.slice(0, MAX_EVENT_LEN);
    const sp = t.lastIndexOf(' ');
    if (sp > 12) t = t.slice(0, sp);
  }
  state.events.push({ t: state.totalTime + state.time, text: t });
  if (state.events.length > 24) state.events.shift();
}

export function showToast(state, text, dur) {
  state.toast = text;
  state.toastT = dur || 1.6;
}

// Jam menit:detik untuk feed/HUD.
export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// Update tripwire: Wren menginjak -> semua guard +25 & ke tengah wire.
export function updateWires(state, px, py, dt) {
  for (const w of state.wires) {
    if (w.cooldown > 0) { w.cooldown -= dt; continue; }
    if (distToSeg(px, py, w.x1, w.y1, w.x2, w.y2) < WIRE_TRIP_R) {
      w.cooldown = WIRE_REARM;
      const cx = (w.x1 + w.x2) / 2, cy = (w.y1 + w.y2) / 2;
      for (const g of state.guards) {
        g.suspicion = Math.min(100, g.suspicion + 25);
        g.state = 'curious';
        g.lastSeen = { x: cx, y: cy };
        g.lookT = 0;
      }
      addEvent(state, 'Tripwire! They heard that.');
      showToast(state, 'TRIPWIRE!', 1.6);
    }
  }
}

// Shard yang tersisa di lantai ini.
export function shardsLeft(state) {
  return state.shards.filter((s) => !s.got).length;
}

export function exitIsOpen(state) {
  return shardsLeft(state) === 0;
}
