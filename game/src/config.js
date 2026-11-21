// EMBERWATCH: Night Shift v3 — the three floors and the tuning.
// One canvas, 1280x720. The top 56 px are the HUD bar; the playfield is
// x 0..1008, y 56..720; the right 272 px are the detection panel. Each
// level is a plain data table — walls, crates, shadows, lamps, tripwires,
// shards, the exit, the start door, and the guards who walk it — so a
// level can be read at a glance and a new one added by appending.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const PANEL_X = 1008;
export const PANEL_W = 272;
export const FIELD_W = 1008;
export const FIELD_TOP = 56;
export const FIELD_BOTTOM = 720;

// Floor 1: the depot. Four guards, three shards, wide lanes and big
// shadow patches — the floor that teaches the player the rules.
const DEPOT = {
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
    { x: 120, y: 180, w: 44, h: 44 }, { x: 168, y: 180, w: 44, h: 44 },
    { x: 216, y: 180, w: 44, h: 44 },
    { x: 560, y: 150, w: 44, h: 44 }, { x: 608, y: 150, w: 44, h: 44 },
    { x: 560, y: 198, w: 44, h: 44 },
    { x: 780, y: 440, w: 44, h: 44 }, { x: 828, y: 440, w: 44, h: 44 },
    { x: 780, y: 488, w: 44, h: 44 },
    { x: 240, y: 620, w: 44, h: 44 }, { x: 288, y: 620, w: 44, h: 44 },
    { x: 700, y: 656, w: 44, h: 44 },
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
  tripwires: [],
  shards: [
    { x: 300, y: 150 },
    { x: 860, y: 480 },
    { x: 920, y: 600 },
  ],
  exit: { x: 956, y: 100, w: 48, h: 76 },
  start: { x: 64, y: 648 },
  coins: 5,
  smoke: 2,
  guards: [
    {
      name: 'Bram', color: '#ff9f43',
      waypoints: [{ x: 110, y: 240 }, { x: 380, y: 240 }],
      pause: 1.6, speed: 58, facing: 0,
    },
    {
      name: 'Sable', color: '#e17055',
      waypoints: [{ x: 480, y: 130 }, { x: 480, y: 300 }],
      pause: 1.2, speed: 52, facing: Math.PI / 2,
    },
    {
      name: 'Pike', color: '#fdcb6e',
      waypoints: [{ x: 500, y: 630 }, { x: 920, y: 630 }],
      pause: 1.8, speed: 62, facing: 0,
    },
    {
      name: 'Odo', color: '#fd79a8',
      waypoints: [
        { x: 900, y: 150 }, { x: 960, y: 150 },
        { x: 960, y: 220 }, { x: 900, y: 220 },
      ],
      pause: 1.0, speed: 55, facing: 0,
    },
  ],
};

// Floor 2: the gallery. Five guards, a tripwire across the middle hall,
// and one shard behind it — the same rules, less room to breathe.
const GALLERY = {
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
    { x: 600, y: 300, w: 44, h: 44 }, { x: 652, y: 300, w: 44, h: 44 },
    { x: 600, y: 352, w: 44, h: 44 }, { x: 652, y: 352, w: 44, h: 44 },
    { x: 150, y: 200, w: 44, h: 44 }, { x: 202, y: 200, w: 44, h: 44 },
    { x: 850, y: 480, w: 44, h: 44 }, { x: 902, y: 480, w: 44, h: 44 },
    { x: 300, y: 600, w: 44, h: 44 }, { x: 352, y: 600, w: 44, h: 44 },
    { x: 850, y: 140, w: 44, h: 44 },
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
  tripwires: [
    { x1: 300, y1: 380, x2: 620, y2: 380 },
  ],
  shards: [
    { x: 180, y: 640 },
    { x: 900, y: 160 },
    { x: 700, y: 470 },
  ],
  exit: { x: 956, y: 300, w: 48, h: 76 },
  start: { x: 64, y: 648 },
  coins: 5,
  smoke: 2,
  guards: [
    {
      name: 'Bram', color: '#ff9f43',
      waypoints: [{ x: 120, y: 180 }, { x: 280, y: 180 }],
      pause: 1.4, speed: 66, facing: 0,
    },
    {
      name: 'Sable', color: '#e17055',
      waypoints: [{ x: 480, y: 120 }, { x: 860, y: 120 }],
      pause: 1.0, speed: 70, facing: 0,
    },
    {
      name: 'Pike', color: '#fdcb6e',
      waypoints: [{ x: 480, y: 640 }, { x: 920, y: 640 }],
      pause: 1.6, speed: 72, facing: 0,
    },
    {
      name: 'Odo', color: '#fd79a8',
      waypoints: [{ x: 940, y: 300 }, { x: 940, y: 540 }],
      pause: 1.0, speed: 68, facing: Math.PI / 2,
    },
    {
      name: 'Nyx', color: '#a29bfe',
      waypoints: [
        { x: 360, y: 260 }, { x: 560, y: 260 },
        { x: 560, y: 460 }, { x: 360, y: 460 },
      ],
      pause: 0.8, speed: 64, facing: 0,
    },
  ],
};

// Floor 3: the vault. Six guards, faster patrols, two tripwires, four
// shards — the night's last door, and the one that pays the most.
const VAULT = {
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
    { x: 480, y: 180, w: 44, h: 44 }, { x: 532, y: 180, w: 44, h: 44 },
    { x: 480, y: 232, w: 44, h: 44 },
    { x: 760, y: 580, w: 44, h: 44 }, { x: 812, y: 580, w: 44, h: 44 },
    { x: 120, y: 300, w: 44, h: 44 }, { x: 172, y: 300, w: 44, h: 44 },
    { x: 640, y: 590, w: 44, h: 44 }, { x: 692, y: 590, w: 44, h: 44 },
    { x: 940, y: 340, w: 44, h: 44 },
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
  tripwires: [
    { x1: 320, y1: 430, x2: 640, y2: 430 },
    { x1: 760, y1: 380, x2: 760, y2: 620 },
  ],
  shards: [
    { x: 200, y: 160 },
    { x: 620, y: 240 },
    { x: 830, y: 540 },
    { x: 930, y: 640 },
  ],
  exit: { x: 956, y: 560, w: 48, h: 76 },
  start: { x: 64, y: 648 },
  coins: 5,
  smoke: 2,
  guards: [
    {
      name: 'Bram', color: '#ff9f43',
      waypoints: [{ x: 120, y: 200 }, { x: 260, y: 200 }],
      pause: 1.2, speed: 78, facing: 0,
    },
    {
      name: 'Sable', color: '#e17055',
      waypoints: [{ x: 340, y: 120 }, { x: 540, y: 120 }],
      pause: 1.0, speed: 82, facing: 0,
    },
    {
      name: 'Pike', color: '#fdcb6e',
      waypoints: [{ x: 340, y: 660 }, { x: 900, y: 660 }],
      pause: 1.4, speed: 84, facing: 0,
    },
    {
      name: 'Odo', color: '#fd79a8',
      waypoints: [{ x: 760, y: 120 }, { x: 940, y: 120 }],
      pause: 0.9, speed: 80, facing: 0,
    },
    {
      name: 'Nyx', color: '#a29bfe',
      waypoints: [
        { x: 420, y: 360 }, { x: 680, y: 360 },
        { x: 680, y: 560 }, { x: 420, y: 560 },
      ],
      pause: 0.7, speed: 76, facing: 0,
    },
    {
      name: 'Ash', color: '#74c0fc',
      waypoints: [{ x: 900, y: 300 }, { x: 900, y: 600 }],
      pause: 0.8, speed: 88, facing: Math.PI / 2,
    },
  ],
};

export const LEVELS = [DEPOT, GALLERY, VAULT];

// Tuning: how fast suspicion grows and fades, in points per second, plus
// the speeds, radii and scores the rest of the game shares.
export const TUNE = {
  coneRange: 210,
  coneHalfAngle: 0.61,
  coneSlices: 64,
  spotLitPerSec: 55,
  spotShadowPerSec: 16,
  spotLightBonus: 14,
  spotCloseBonus: 30,
  runBonus: 18,
  decayPerSec: 14,
  alertAt: 60,
  chaseAt: 92,
  chaseSpeed: 118,
  vaultChaseSpeed: 130,
  investigateSpeed: 80,
  forgetAfterSec: 4,
  noiseRadiusRun: 95,
  noiseRadiusSneak: 26,
  coinRange: 240,
  coinHearRadius: 280,
  coinSuspicion: 28,
  tripwireSuspicion: 25,
  tripwireRearmSec: 8,
  smokeRadius: 72,
  smokeSeconds: 3.5,
  douseRange: 100,
  playerWalk: 150,
  playerSneak: 88,
  guardRadius: 17,
  playerRadius: 12,
  catchDistance: 30,
  nearMissHotAt: 45,
  nearMissCoolBelow: 15,
  lives: 3,
};

// Scores: a shard is 100, a close call that ends well is 50, clearing a
// floor is 200, and slipping out without ever being spotted is 500.
export const SCORE = {
  shard: 100,
  nearMiss: 50,
  levelClear: 200,
  ghost: 500,
};

export const BEST_KEY = 'emberwatch-best-score';
