// Emberwatch: Night Shift — tuning, floors and scoring.
// Every number here comes from the design spec; nothing is borrowed
// from any earlier build.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const PANEL_X = 1008;
export const PANEL_W = 272;
export const PLAY_W = 1008;

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 88;
export const PLAYER_R = 12;

export const COIN_THROW_MAX = 240;
export const COIN_FLIGHT = 0.35;
export const COIN_HEAR_R = 280;
export const COINS_PER_FLOOR = 5;

export const SMOKE_R = 72;
export const SMOKE_TIME = 3.5;
export const SMOKES_PER_FLOOR = 2;

export const DOUSE_RANGE = 100;
export const PICKUP_R = 26;

export const CONE_RANGE = 210;
export const CONE_HALF = 0.61;
export const CONE_RAYS = 64;
export const CURIOUS_SPEED = 80;
export const CHASE_SPEED = 118;
export const CHASE_SPEED_VAULT = 130;
export const CATCH_R = 30;
export const LOOK_TIME = 1.4;
export const FORGET_TIME = 4;

export const SUSPECT_CURIOUS = 60;
export const SUSPECT_CHASE = 92;
export const CLOSE_CALL_HIGH = 45;
export const CLOSE_CALL_LOW = 15;

export const TRIP_R = 14;
export const TRIP_BOOST = 25;
export const TRIP_COOLDOWN = 8;

export const SCORE_SHARD = 100;
export const SCORE_CLOSE_CALL = 50;
export const SCORE_FLOOR = 200;
export const SCORE_GHOST = 500;

export const FLOOR_CARD_TIME = 2.6;
export const CAUGHT_FLASH_TIME = 1.4;

export const FLOORS = [
  {
    name: 'THE DEPOT',
    sub: 'Four guards, wide lanes. Learn the cones, then slip past them.',
    walls: [
      { x: 0, y: 56, w: 1008, h: 14 },
      { x: 0, y: 706, w: 1008, h: 14 },
      { x: 0, y: 56, w: 14, h: 664 },
      { x: 994, y: 56, w: 14, h: 664 },
      { x: 400, y: 170, w: 14, h: 230 },
      { x: 560, y: 330, w: 300, h: 14 },
      { x: 860, y: 400, w: 14, h: 170 },
      { x: 140, y: 540, w: 260, h: 14 },
      { x: 700, y: 130, w: 14, h: 110 },
      { x: 940, y: 250, w: 14, h: 130 },
    ],
    crates: [
      { x: 120, y: 180 }, { x: 168, y: 180 }, { x: 216, y: 180 },
      { x: 560, y: 150 }, { x: 608, y: 150 }, { x: 560, y: 198 },
      { x: 780, y: 440 }, { x: 828, y: 440 }, { x: 780, y: 488 },
      { x: 240, y: 620 }, { x: 288, y: 620 }, { x: 700, y: 656 },
    ],
    shadows: [
      { x: 180, y: 110, w: 190, h: 90 },
      { x: 480, y: 400, w: 200, h: 100 },
      { x: 60, y: 430, w: 120, h: 90 },
      { x: 850, y: 560, w: 140, h: 90 },
      { x: 700, y: 80, w: 120, h: 60 },
    ],
    lamps: [
      { x: 350, y: 280, r: 120 },
      { x: 650, y: 190, r: 115 },
      { x: 600, y: 620, r: 110 },
      { x: 920, y: 360, r: 110 },
      { x: 200, y: 590, r: 105 },
    ],
    wires: [],
    shards: [
      { x: 300, y: 150 }, { x: 860, y: 480 }, { x: 920, y: 600 },
    ],
    exit: { x: 956, y: 100, w: 48, h: 76 },
    start: { x: 64, y: 648 },
    guards: [
      { name: 'Bram', color: '#ff9f43', path: [{ x: 110, y: 240 }, { x: 380, y: 240 }], wait: 1.6, speed: 58, face: 0 },
      { name: 'Sable', color: '#e17055', path: [{ x: 480, y: 130 }, { x: 480, y: 300 }], wait: 1.2, speed: 52, face: Math.PI / 2 },
      { name: 'Pike', color: '#fdcb6e', path: [{ x: 500, y: 630 }, { x: 920, y: 630 }], wait: 1.8, speed: 62, face: 0 },
      { name: 'Odo', color: '#fd79a8', path: [{ x: 900, y: 150 }, { x: 960, y: 150 }, { x: 960, y: 220 }, { x: 900, y: 220 }], wait: 1.0, speed: 55, face: 0 },
    ],
  },
  {
    name: 'THE GALLERY',
    sub: 'A tripwire guards the middle hall. Go around, or trip it loud.',
    walls: [
      { x: 0, y: 56, w: 1008, h: 14 },
      { x: 0, y: 706, w: 1008, h: 14 },
      { x: 0, y: 56, w: 14, h: 664 },
      { x: 994, y: 56, w: 14, h: 664 },
      { x: 300, y: 150, w: 14, h: 220 },
      { x: 700, y: 280, w: 14, h: 240 },
      { x: 450, y: 200, w: 340, h: 14 },
      { x: 500, y: 520, w: 360, h: 14 },
      { x: 640, y: 420, w: 14, h: 100 },
      { x: 880, y: 120, w: 14, h: 120 },
    ],
    crates: [
      { x: 600, y: 300 }, { x: 652, y: 300 }, { x: 600, y: 352 }, { x: 652, y: 352 },
      { x: 150, y: 200 }, { x: 202, y: 200 },
      { x: 850, y: 480 }, { x: 902, y: 480 },
      { x: 300, y: 600 }, { x: 352, y: 600 },
      { x: 850, y: 140 },
    ],
    shadows: [
      { x: 90, y: 110, w: 170, h: 90 },
      { x: 420, y: 440, w: 190, h: 90 },
      { x: 800, y: 110, w: 150, h: 80 },
      { x: 60, y: 560, w: 140, h: 90 },
      { x: 850, y: 580, w: 140, h: 80 },
    ],
    lamps: [
      { x: 450, y: 300, r: 110 },
      { x: 800, y: 180, r: 110 },
      { x: 880, y: 420, r: 115 },
      { x: 250, y: 450, r: 110 },
      { x: 650, y: 640, r: 105 },
    ],
    wires: [{ x1: 300, y1: 380, x2: 620, y2: 380 }],
    shards: [
      { x: 180, y: 640 }, { x: 900, y: 160 }, { x: 700, y: 470 },
    ],
    exit: { x: 956, y: 300, w: 48, h: 76 },
    start: { x: 64, y: 648 },
    guards: [
      { name: 'Bram', color: '#ff9f43', path: [{ x: 120, y: 180 }, { x: 280, y: 180 }], wait: 1.4, speed: 66, face: 0 },
      { name: 'Sable', color: '#e17055', path: [{ x: 480, y: 120 }, { x: 860, y: 120 }], wait: 1.0, speed: 70, face: 0 },
      { name: 'Pike', color: '#fdcb6e', path: [{ x: 480, y: 640 }, { x: 920, y: 640 }], wait: 1.6, speed: 72, face: 0 },
      { name: 'Odo', color: '#fd79a8', path: [{ x: 940, y: 300 }, { x: 940, y: 540 }], wait: 1.0, speed: 68, face: Math.PI / 2 },
      { name: 'Nyx', color: '#a29bfe', path: [{ x: 360, y: 260 }, { x: 560, y: 260 }, { x: 560, y: 460 }, { x: 360, y: 460 }], wait: 0.8, speed: 64, face: 0 },
    ],
  },
  {
    name: 'THE VAULT',
    sub: 'Six guards, two tripwires, four embers. The vault pays for patience.',
    walls: [
      { x: 0, y: 56, w: 1008, h: 14 },
      { x: 0, y: 706, w: 1008, h: 14 },
      { x: 0, y: 56, w: 14, h: 664 },
      { x: 994, y: 56, w: 14, h: 664 },
      { x: 280, y: 120, w: 14, h: 280 },
      { x: 560, y: 120, w: 14, h: 200 },
      { x: 700, y: 400, w: 14, h: 220 },
      { x: 420, y: 300, w: 300, h: 14 },
      { x: 150, y: 480, w: 280, h: 14 },
      { x: 820, y: 180, w: 14, h: 160 },
    ],
    crates: [
      { x: 480, y: 180 }, { x: 532, y: 180 }, { x: 480, y: 232 },
      { x: 760, y: 580 }, { x: 812, y: 580 },
      { x: 120, y: 300 }, { x: 172, y: 300 },
      { x: 640, y: 590 }, { x: 692, y: 590 },
      { x: 940, y: 340 },
    ],
    shadows: [
      { x: 80, y: 110, w: 160, h: 90 },
      { x: 360, y: 520, w: 180, h: 90 },
      { x: 820, y: 440, w: 150, h: 90 },
      { x: 60, y: 600, w: 140, h: 80 },
      { x: 600, y: 110, w: 140, h: 70 },
    ],
    lamps: [
      { x: 400, y: 220, r: 110 },
      { x: 760, y: 300, r: 115 },
      { x: 500, y: 620, r: 110 },
      { x: 920, y: 480, r: 110 },
      { x: 200, y: 380, r: 105 },
    ],
    wires: [
      { x1: 320, y1: 430, x2: 640, y2: 430 },
      { x1: 760, y1: 380, x2: 760, y2: 620 },
    ],
    shards: [
      { x: 200, y: 160 }, { x: 620, y: 240 }, { x: 830, y: 540 }, { x: 930, y: 640 },
    ],
    exit: { x: 956, y: 560, w: 48, h: 76 },
    start: { x: 64, y: 648 },
    guards: [
      { name: 'Bram', color: '#ff9f43', path: [{ x: 120, y: 200 }, { x: 260, y: 200 }], wait: 1.2, speed: 78, face: 0 },
      { name: 'Sable', color: '#e17055', path: [{ x: 340, y: 120 }, { x: 540, y: 120 }], wait: 1.0, speed: 82, face: 0 },
      { name: 'Pike', color: '#fdcb6e', path: [{ x: 340, y: 660 }, { x: 900, y: 660 }], wait: 1.4, speed: 84, face: 0 },
      { name: 'Odo', color: '#fd79a8', path: [{ x: 760, y: 120 }, { x: 940, y: 120 }], wait: 0.9, speed: 80, face: 0 },
      { name: 'Nyx', color: '#a29bfe', path: [{ x: 420, y: 360 }, { x: 680, y: 360 }, { x: 680, y: 560 }, { x: 420, y: 560 }], wait: 0.7, speed: 76, face: 0 },
      { name: 'Ash', color: '#74c0fc', path: [{ x: 900, y: 300 }, { x: 900, y: 600 }], wait: 0.8, speed: 88, face: Math.PI / 2 },
    ],
  },
];

export const TOTAL_SHARDS = FLOORS.reduce((n, f) => n + f.shards.length, 0);

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
