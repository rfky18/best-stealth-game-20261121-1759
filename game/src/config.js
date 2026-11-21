// EMBERWATCH: Night Shift — the two floors and the tuning.
// One canvas, 1280x720. The top 64 px are the HUD bar; the playfield runs
// y 64..720. Each level is a plain data table — walls, crates, shadows,
// lamps, shards, the exit, the start door, and the guards who walk it —
// so a level can be read at a glance and a new one added by appending.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;

// Level 1: the depot. Four guards, three shards, wide lanes and big
// shadow patches — the floor that teaches the player the rules.
const DEPOT = {
  name: 'THE DEPOT',
  walls: [
    { x: 0, y: 64, w: 1280, h: 16 },
    { x: 0, y: 704, w: 1280, h: 16 },
    { x: 0, y: 64, w: 16, h: 656 },
    { x: 1264, y: 64, w: 16, h: 656 },
    { x: 400, y: 170, w: 16, h: 270 },
    { x: 560, y: 330, w: 340, h: 16 },
    { x: 920, y: 400, w: 16, h: 180 },
    { x: 140, y: 540, w: 280, h: 16 },
    { x: 720, y: 130, w: 16, h: 120 },
    { x: 1040, y: 250, w: 16, h: 140 },
  ],
  crates: [
    { x: 120, y: 180, w: 44, h: 44 }, { x: 168, y: 180, w: 44, h: 44 },
    { x: 216, y: 180, w: 44, h: 44 },
    { x: 560, y: 150, w: 44, h: 44 }, { x: 608, y: 150, w: 44, h: 44 },
    { x: 560, y: 198, w: 44, h: 44 },
    { x: 780, y: 440, w: 44, h: 44 }, { x: 828, y: 440, w: 44, h: 44 },
    { x: 780, y: 488, w: 44, h: 44 },
    { x: 240, y: 620, w: 44, h: 44 }, { x: 288, y: 620, w: 44, h: 44 },
    { x: 1100, y: 500, w: 44, h: 44 }, { x: 1148, y: 500, w: 44, h: 44 },
    { x: 1100, y: 548, w: 44, h: 44 },
    { x: 700, y: 656, w: 44, h: 44 },
  ],
  shadows: [
    { x: 180, y: 110, w: 190, h: 90 },
    { x: 480, y: 400, w: 200, h: 100 },
    { x: 950, y: 440, w: 180, h: 110 },
    { x: 60, y: 430, w: 120, h: 90 },
    { x: 1060, y: 170, w: 150, h: 80 },
  ],
  lamps: [
    { x: 350, y: 280, r: 120 },
    { x: 650, y: 190, r: 115 },
    { x: 850, y: 620, r: 120 },
    { x: 1150, y: 360, r: 110 },
    { x: 200, y: 590, r: 105 },
  ],
  shards: [
    { x: 300, y: 150 },
    { x: 860, y: 480 },
    { x: 1090, y: 600 },
  ],
  exit: { x: 1216, y: 110, w: 48, h: 80 },
  start: { x: 64, y: 648 },
  coins: 5,
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
      waypoints: [{ x: 500, y: 630 }, { x: 1150, y: 630 }],
      pause: 1.8, speed: 62, facing: 0,
    },
    {
      name: 'Odo', color: '#fd79a8',
      waypoints: [
        { x: 960, y: 150 }, { x: 1180, y: 150 },
        { x: 1180, y: 220 }, { x: 960, y: 220 },
      ],
      pause: 1.0, speed: 55, facing: 0,
    },
  ],
};

// Level 2: the gallery. Five guards, faster patrols, a central hall of
// display plinths with one shard behind it — the same rules, less room.
const GALLERY = {
  name: 'THE GALLERY',
  walls: [
    { x: 0, y: 64, w: 1280, h: 16 },
    { x: 0, y: 704, w: 1280, h: 16 },
    { x: 0, y: 64, w: 16, h: 656 },
    { x: 1264, y: 64, w: 16, h: 656 },
    { x: 300, y: 150, w: 16, h: 250 },
    { x: 980, y: 280, w: 16, h: 280 },
    { x: 450, y: 200, w: 380, h: 16 },
    { x: 500, y: 520, w: 400, h: 16 },
    { x: 640, y: 420, w: 16, h: 120 },
    { x: 1120, y: 120, w: 16, h: 140 },
  ],
  crates: [
    { x: 600, y: 300, w: 44, h: 44 }, { x: 652, y: 300, w: 44, h: 44 },
    { x: 600, y: 352, w: 44, h: 44 }, { x: 652, y: 352, w: 44, h: 44 },
    { x: 150, y: 200, w: 44, h: 44 }, { x: 202, y: 200, w: 44, h: 44 },
    { x: 1050, y: 480, w: 44, h: 44 }, { x: 1102, y: 480, w: 44, h: 44 },
    { x: 300, y: 600, w: 44, h: 44 }, { x: 352, y: 600, w: 44, h: 44 },
    { x: 850, y: 140, w: 44, h: 44 },
  ],
  shadows: [
    { x: 90, y: 110, w: 170, h: 90 },
    { x: 420, y: 440, w: 190, h: 90 },
    { x: 980, y: 120, w: 170, h: 90 },
    { x: 60, y: 560, w: 140, h: 90 },
    { x: 1080, y: 580, w: 150, h: 80 },
  ],
  lamps: [
    { x: 450, y: 300, r: 110 },
    { x: 800, y: 180, r: 110 },
    { x: 1050, y: 400, r: 115 },
    { x: 250, y: 450, r: 110 },
    { x: 700, y: 640, r: 105 },
  ],
  shards: [
    { x: 770, y: 350 },
    { x: 180, y: 640 },
    { x: 1080, y: 160 },
  ],
  exit: { x: 1216, y: 300, w: 48, h: 80 },
  start: { x: 64, y: 648 },
  coins: 5,
  guards: [
    {
      name: 'Bram', color: '#ff9f43',
      waypoints: [{ x: 120, y: 180 }, { x: 280, y: 180 }],
      pause: 1.4, speed: 66, facing: 0,
    },
    {
      name: 'Sable', color: '#e17055',
      waypoints: [{ x: 500, y: 120 }, { x: 900, y: 120 }],
      pause: 1.0, speed: 70, facing: 0,
    },
    {
      name: 'Pike', color: '#fdcb6e',
      waypoints: [{ x: 480, y: 640 }, { x: 1150, y: 640 }],
      pause: 1.6, speed: 72, facing: 0,
    },
    {
      name: 'Odo', color: '#fd79a8',
      waypoints: [{ x: 1020, y: 300 }, { x: 1020, y: 540 }],
      pause: 1.0, speed: 68, facing: Math.PI / 2,
    },
    {
      name: 'Nyx', color: '#a29bfe',
      waypoints: [
        { x: 560, y: 260 }, { x: 820, y: 260 },
        { x: 820, y: 460 }, { x: 560, y: 460 },
      ],
      pause: 0.8, speed: 64, facing: 0,
    },
  ],
};

export const LEVELS = [DEPOT, GALLERY];

// Tuning: how fast suspicion grows and fades, in points per second, plus
// the speeds and radii the rest of the game shares across both levels.
export const TUNE = {
  coneRange: 225,
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
  chaseSpeed: 112,
  investigateSpeed: 80,
  forgetAfterSec: 4,
  noiseRadiusRun: 95,
  noiseRadiusSneak: 26,
  coinRange: 240,
  coinHearRadius: 280,
  coinSuspicion: 28,
  playerWalk: 150,
  playerSneak: 88,
  guardRadius: 17,
  playerRadius: 12,
  catchDistance: 30,
  nearMissHotAt: 45,
  nearMissCoolBelow: 15,
  lives: 3,
};

export const BEST_KEY = 'emberwatch-best-time-ms';
