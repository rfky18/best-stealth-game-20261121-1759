// Emberwatch: Night Shift — level layout and tuning constants.
// One canvas, 1280x720. The top 64 px are the HUD bar; the playfield is y 64..720.
// Everything here is a plain data table so the level can be read at a glance.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;

// The depot floor: border walls plus interior walls that split the hall into
// lanes a patient player can learn. Every rect is {x, y, w, h} in pixels.
export const WALLS = [
  { x: 0, y: 64, w: 1280, h: 16 }, // north wall (under the HUD)
  { x: 0, y: 704, w: 1280, h: 16 }, // south wall
  { x: 0, y: 64, w: 16, h: 656 }, // west wall
  { x: 1264, y: 64, w: 16, h: 656 }, // east wall
  { x: 420, y: 150, w: 16, h: 270 }, // west hall divider
  { x: 560, y: 300, w: 340, h: 16 }, // middle shelf wall
  { x: 900, y: 380, w: 16, h: 180 }, // east hall divider
  { x: 150, y: 520, w: 270, h: 16 }, // south-west shelf wall
  { x: 700, y: 120, w: 16, h: 120 }, // north-east stub wall
  { x: 1020, y: 240, w: 16, h: 140 }, // exit approach wall
];

// Crates are low cover: they block sight and movement, and the player can
// slip behind them. Each crate is a 44x44 block; clusters read as cover.
export const CRATES = [
  { x: 120, y: 160, w: 44, h: 44 }, { x: 168, y: 160, w: 44, h: 44 },
  { x: 212, y: 160, w: 44, h: 44 },
  { x: 540, y: 140, w: 44, h: 44 }, { x: 588, y: 140, w: 44, h: 44 },
  { x: 540, y: 188, w: 44, h: 44 },
  { x: 760, y: 420, w: 44, h: 44 }, { x: 808, y: 420, w: 44, h: 44 },
  { x: 760, y: 468, w: 44, h: 44 },
  { x: 240, y: 600, w: 44, h: 44 }, { x: 288, y: 600, w: 44, h: 44 },
  { x: 1080, y: 480, w: 44, h: 44 }, { x: 1128, y: 480, w: 44, h: 44 },
  { x: 1080, y: 528, w: 44, h: 44 },
  { x: 700, y: 660, w: 44, h: 44 },
];

// Shadow patches: standing in one makes the player much harder to spot.
// Rendered as deep blue floor; the HUD tells the player when they are hidden.
export const SHADOWS = [
  { x: 180, y: 110, w: 190, h: 90, label: 'SHADOW' },
  { x: 480, y: 380, w: 200, h: 100, label: 'SHADOW' },
  { x: 950, y: 420, w: 180, h: 110, label: 'SHADOW' },
  { x: 60, y: 420, w: 120, h: 90, label: 'SHADOW' },
  { x: 1060, y: 170, w: 150, h: 80, label: 'SHADOW' },
];

// Hanging lanterns: their light pools are dangerous ground — a player in
// the light is spotted far faster. Rendered as warm orange glow circles.
export const LAMPS = [
  { x: 350, y: 260, r: 120 },
  { x: 650, y: 180, r: 115 },
  { x: 850, y: 610, r: 120 },
  { x: 1150, y: 350, r: 110 },
  { x: 200, y: 580, r: 105 },
];

// The three ember shards Wren must pocket before the exit door opens.
export const SHARDS = [
  { x: 300, y: 150 },
  { x: 860, y: 470 },
  { x: 1080, y: 590 },
];

// The green exit door on the east wall. It only opens once all shards are held.
export const EXIT = { x: 1216, y: 110, w: 48, h: 80 };

// Where Wren starts each attempt: the south-west service door.
export const PLAYER_START = { x: 64, y: 648 };

// The four night guards, each with a fixed patrol loop and a pause at every
// waypoint so the player can learn the rhythm and slip through the gaps.
export const GUARDS = [
  {
    name: 'Bram', color: '#ff9f43',
    waypoints: [{ x: 110, y: 230 }, { x: 380, y: 230 }],
    pause: 1.6, speed: 58, facing: 0,
  },
  {
    name: 'Sable', color: '#e17055',
    waypoints: [{ x: 480, y: 120 }, { x: 480, y: 280 }],
    pause: 1.2, speed: 52, facing: Math.PI / 2,
  },
  {
    name: 'Pike', color: '#fdcb6e',
    waypoints: [{ x: 500, y: 620 }, { x: 1150, y: 620 }],
    pause: 1.8, speed: 62, facing: 0,
  },
  {
    name: 'Odo', color: '#fd79a8',
    waypoints: [{ x: 960, y: 140 }, { x: 1180, y: 140 }, { x: 1180, y: 210 }, { x: 960, y: 210 }],
    pause: 1.0, speed: 55, facing: 0,
  },
];

// Tuning: how fast suspicion grows and fades, in points per second.
export const TUNE = {
  coneRange: 225, // how far a guard can see
  coneHalfAngle: 0.61, // ~35 degrees each side of the facing
  spotLitPerSec: 55, // suspicion gain, player lit and in the cone
  spotShadowPerSec: 16, // suspicion gain, player in shadow and in the cone
  spotCloseBonus: 30, // extra gain when the player is within 70 px
  runBonus: 18, // extra gain when the player is running (not sneaking)
  decayPerSec: 14, // suspicion fall when the player is unseen
  alertAt: 60, // suspicion where a guard walks over to investigate
  chaseAt: 92, // suspicion where a guard breaks into a chase
  chaseSpeed: 108, // guard speed while chasing
  investigateSpeed: 78,
  forgetAfterSec: 4, // seconds unseen in chase before the guard gives up
  noiseRadiusRun: 95, // how far running footsteps carry
  noiseRadiusSneak: 26,
  playerWalk: 150,
  playerSneak: 88,
  lives: 3,
};

export const BEST_KEY = 'emberwatch-best-time-ms';
