// EMBERWATCH: Night Shift — config.js
// Konstanta, tiga lantai, kamera, laser, tuning, skor, nilai loot.
// Satu-satunya sumber kebenaran untuk data level; tidak ada logika di sini.

export const W = 1280;
export const H = 720;
export const HUD_H = 56;
export const PANEL_X = 1008;
export const PANEL_W = 272;
export const PLAY_W = 1008;
export const PLAY_TOP = 56;
export const PLAY_BOTTOM = 720;

export const TILE = 40;

// Gerak Wren
export const WALK_SPEED = 150; // px/detik (berlari, berisik)
export const SNEAK_SPEED = 88; // px/detik (Shift, senyap)
export const PLAYER_R = 12;
export const PICKUP_R = 26;

// Gadget
export const COIN_MAX = 5;
export const COIN_THROW_MAX = 240;
export const COIN_FLY_TIME = 0.35;
export const COIN_HEAR_R = 280;
export const SMOKE_MAX = 2;
export const SMOKE_R = 72;
export const SMOKE_TIME = 3.5;
export const DOUSE_R = 100;

// Nyawa & skor
export const LIVES_MAX = 3;
export const SHARD_PTS = 100;
export const SHARD_VALUE = 150; // dolar per shard
export const CLOSE_CALL_PTS = 50;
export const FLOOR_PTS = 200;
export const GHOST_PTS = 500;
export const TOTAL_SHARDS = 16;
export const TOTAL_TAKE = TOTAL_SHARDS * SHARD_VALUE; // $2400

// Guard
export const CONE_RANGE = 210;
export const CONE_HALF = 0.61;
export const CONE_SLICES = 64;
export const GUARD_R = 17;
export const CATCH_R = 30;
export const CHASE_SPEED = 118;
export const CHASE_SPEED_VAULT = 130;
export const CURIOUS_SPEED = 80;
export const SUSP_LOOKBACK = 4; // detik tanpa melihat sebelum turun tahap
export const SUSP_DECAY = 14; // per detik saat tidak terlihat
export const SUSP_BRIGHT = 55;
export const SUSP_SHADOW = 16;
export const SUSP_LAMP = 14;
export const SUSP_CLOSE = 30; // jarak < 70
export const SUSP_RUN = 18;
export const SUSP_FOOTSTEP = 22; // lari dalam radius 95
export const FOOTSTEP_R = 95;
export const SUSP_COIN_MIN = 28;
export const SUSP_WIRE_ALL = 25;
export const SUSP_CAM_ALARM = 25;
export const SUSP_LASER_ALL = 20;
export const SUSP_CALM_RESPAWN = 18;

// Kamera
export const CAM_RANGE = 190;
export const CAM_HALF = 0.42;
export const CAM_SLICES = 48;
export const CAM_SWEEP = 0.55; // radian, +/- dari arah dasar
export const CAM_PERIOD = 4; // detik per ayunan penuh
export const CAM_ALERT_LAMP = 45;
export const CAM_ALERT_OPEN = 30;
export const CAM_ALERT_SHADOW = 10;
export const CAM_ALERT_DECAY = 12;

// Laser (lantai 3)
export const LASER_ON = 2.2;
export const LASER_OFF = 1.8;
export const LASER_TRIP_R = 12;
export const LASER_COOLDOWN = 3;

// Tripwire
export const WIRE_TRIP_R = 14;
export const WIRE_REARM = 8;

// Warna
export const COLORS = {
  bg: '#0a1120',
  floorA: '#101a30',
  floorB: '#0d1628',
  grid: '#16223d',
  panelBg: '#0d1526',
  panelLine: '#1b2a4a',
  sectionTitle: '#8fa3c8',
  text: '#e8eefc',
  textDim: '#c7d2e8',
  gold: '#ffd60a',
  barBg: '#22314f',
  green: '#2fd47a',
  red: '#ff5252',
  orange: '#ff9f43',
  blue: '#74c0fc',
  teal: '#2dd4bf',
};

// Dinding luar (selalu sama di semua lantai)
export function outerWalls() {
  return [
    { x: 0, y: 56, w: 1008, h: 14 },
    { x: 0, y: 706, w: 1008, h: 14 },
    { x: 0, y: 56, w: 14, h: 664 },
    { x: 994, y: 56, w: 14, h: 664 },
  ];
}

// Arah hadap dalam radian: 0 kanan, 1.57 bawah, 3.14 kiri, -1.57 atas.
export const FLOORS = [
  {
    night: 1,
    name: 'THE DEPOT',
    sub: 'Four guards, one camera, wide lanes. Learn the cones, then slip past them.',
    start: { x: 64, y: 648 },
    exit: { x: 956, y: 100, w: 48, h: 76 },
    walls: [
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
    shards: [
      { x: 300, y: 150 }, { x: 860, y: 480 }, { x: 920, y: 600 },
      { x: 180, y: 650 }, { x: 700, y: 300 },
    ],
    cameras: [{ id: 'C1', x: 700, y: 560, base: -1.57 }],
    wires: [],
    laser: null,
    guards: [
      { name: 'Bram', color: '#ff9f43', wps: [[110, 240], [380, 240]], pause: 1.6, speed: 58, face: 0 },
      { name: 'Sable', color: '#e17055', wps: [[480, 130], [480, 300]], pause: 1.2, speed: 52, face: 1.57 },
      { name: 'Pike', color: '#fdcb6e', wps: [[500, 630], [920, 630]], pause: 1.8, speed: 62, face: 0 },
      { name: 'Odo', color: '#fd79a8', wps: [[900, 150], [960, 150], [960, 220], [900, 220]], pause: 1.0, speed: 55, face: 0 },
    ],
  },
  {
    night: 2,
    name: 'THE GALLERY',
    sub: 'A tripwire guards the middle hall. A camera watches the top. Go around, or trip it loud.',
    start: { x: 64, y: 648 },
    exit: { x: 956, y: 300, w: 48, h: 76 },
    walls: [
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
      { x: 300, y: 600 }, { x: 352, y: 600 }, { x: 850, y: 140 },
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
      { x: 120, y: 300 }, { x: 850, y: 600 },
    ],
    cameras: [{ id: 'C1', x: 600, y: 140, base: 1.57 }],
    laser: null,
    guards: [
      { name: 'Bram', color: '#ff9f43', wps: [[120, 180], [280, 180]], pause: 1.4, speed: 66, face: 0 },
      { name: 'Sable', color: '#e17055', wps: [[480, 120], [860, 120]], pause: 1.0, speed: 70, face: 0 },
      { name: 'Pike', color: '#fdcb6e', wps: [[480, 640], [920, 640]], pause: 1.6, speed: 72, face: 0 },
      { name: 'Odo', color: '#fd79a8', wps: [[940, 300], [940, 540]], pause: 1.0, speed: 68, face: 1.57 },
      { name: 'Nyx', color: '#a29bfe', wps: [[360, 260], [560, 260], [560, 460], [360, 460]], pause: 0.8, speed: 64, face: 0 },
    ],
  },
  {
    night: 3,
    name: 'THE VAULT',
    sub: 'Six guards, two cameras, two tripwires, one laser, six embers. The vault pays for patience.',
    start: { x: 64, y: 648 },
    exit: { x: 956, y: 560, w: 48, h: 76 },
    walls: [
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
      { x: 640, y: 590 }, { x: 692, y: 590 }, { x: 940, y: 340 },
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
      { x: 200, y: 160 }, { x: 620, y: 240 }, { x: 830, y: 540 },
      { x: 930, y: 640 }, { x: 120, y: 650 }, { x: 700, y: 120 },
    ],
    cameras: [
      { id: 'C1', x: 480, y: 420, base: 0 },
      { id: 'C2', x: 880, y: 300, base: 3.14 },
    ],
    laser: { x1: 450, y1: 470, x2: 700, y2: 470 },
    guards: [
      { name: 'Bram', color: '#ff9f43', wps: [[120, 200], [260, 200]], pause: 1.2, speed: 78, face: 0 },
      { name: 'Sable', color: '#e17055', wps: [[340, 120], [540, 120]], pause: 1.0, speed: 82, face: 0 },
      { name: 'Pike', color: '#fdcb6e', wps: [[340, 660], [900, 660]], pause: 1.4, speed: 84, face: 0 },
      { name: 'Odo', color: '#fd79a8', wps: [[760, 120], [940, 120]], pause: 0.9, speed: 80, face: 0 },
      { name: 'Nyx', color: '#a29bfe', wps: [[420, 360], [680, 360], [680, 560], [420, 560]], pause: 0.7, speed: 76, face: 0 },
      { name: 'Ash', color: '#74c0fc', wps: [[900, 300], [900, 600]], pause: 0.8, speed: 88, face: 1.57 },
    ],
  },
];

export const NIGHT_CARD_TIME = 2.6; // detik kartu antar malam
