// config.js — constants, floors, tuning, scoring for EMBERWATCH: Night Shift.
// All floor geometry below is written in the REFERENCE space (x 0-1008,
// y 56-720). LEVELS exports the same floors with every x multiplied by
// 15/14 (1080/1008) and rounded; y is unchanged. All gameplay logic runs
// in the scaled space.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const HUD_H = 56;
export const MAIN_X0 = 0;
export const MAIN_X1 = 1080;
export const PANEL_X = 1080;
export const PANEL_W = 200;
export const PANEL_INNER_X = 1086;
export const PANEL_INNER_W = 188;

export const SCALE_X = 15 / 14;
export const scaleX = (x) => Math.round(x * SCALE_X);
export const scalePoint = (p) => [scaleX(p[0]), p[1]];
export const scaleRect = (r) => [scaleX(r[0]), r[1], Math.round(r[2] * SCALE_X), r[3]];

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 88;
export const GUARD_CHASE_SPEED = 118;
export const GUARD_CHASE_SPEED_VAULT = 130;
export const GUARD_ALERT_SPEED = 80;
export const CATCH_DIST = 30;
export const SHARD_PICKUP_DIST = 26;
export const COIN_THROW_MAX = 240;
export const COIN_HEAR_RADIUS = 280;
export const SMOKE_RADIUS = 72;
export const SMOKE_DURATION = 3.5;
export const DOUSE_RANGE = 100;
export const GUARD_CONE_RANGE = 225;
export const GUARD_CONE_HALF = 0.61;
export const CAMERA_CONE_RANGE = 200;
export const CAMERA_CONE_HALF = 0.42;
export const CAMERA_SWEEP = 0.55;
export const CAMERA_SWEEP_PERIOD = 4.2;
export const TRIPWIRE_DIST = 14;
export const LASER_TRIP_DIST = 12;
export const LASER_ON = 2.2;
export const LASER_OFF = 1.8;
export const LASER_COOLDOWN = 3;
export const TRIPWIRE_REARM = 8;
export const MAX_LIVES = 3;
export const SHARD_SCORE = 100;
export const SHARD_TAKE = 150;
export const FLOOR_SCORE = 200;
export const CLOSE_CALL_SCORE = 50;
export const GHOST_BONUS = 500;
export const TOTAL_SHARDS = 16;
export const TOTAL_TAKE = 2400;

const OUTER_WALLS = [
  [0, 56, 1008, 14],
  [0, 706, 1008, 14],
  [0, 56, 14, 664],
  [994, 56, 14, 664],
];

function rawFloor(def) {
  return {
    name: def.name,
    sub: def.sub,
    walls: [...OUTER_WALLS, ...def.walls],
    crates: def.crates,
    shadows: def.shadows,
    lamps: def.lamps,
    shards: def.shards,
    cameras: def.cameras,
    tripwires: def.tripwires || [],
    laser: def.laser || null,
    exit: def.exit,
    start: def.start,
    guards: def.guards,
    coins: 5,
    smokes: 2,
  };
}

const RAW_LEVELS = [
  rawFloor({
    name: 'THE DEPOT',
    sub: 'Four guards, one camera, wide lanes. Learn the cones, then slip past them.',
    walls: [[400, 170, 14, 230], [560, 330, 300, 14], [860, 400, 14, 170], [140, 540, 260, 14], [700, 130, 14, 110], [940, 250, 14, 130]],
    crates: [[120, 180], [168, 180], [216, 180], [560, 150], [608, 150], [560, 198], [780, 440], [828, 440], [780, 488], [240, 620], [288, 620], [700, 656]],
    shadows: [[180, 110, 190, 90], [480, 400, 200, 100], [60, 430, 120, 90], [850, 560, 140, 90], [700, 80, 120, 60]],
    lamps: [[350, 280, 120], [650, 190, 115], [600, 620, 110], [920, 360, 110], [200, 590, 105]],
    shards: [[300, 150], [860, 480], [920, 600], [180, 650], [700, 300]],
    cameras: [{ x: 700, y: 560, base: -1.57, label: 'C1' }],
    exit: [956, 100, 48, 76],
    start: [64, 648],
    guards: [
      { name: 'Bram', color: '#ff9f43', waypoints: [[110, 240], [380, 240]], wait: 1.6, speed: 58, facing: 0 },
      { name: 'Sable', color: '#e17055', waypoints: [[480, 130], [480, 300]], wait: 1.2, speed: 52, facing: 1.57 },
      { name: 'Pike', color: '#fdcb6e', waypoints: [[500, 630], [920, 630]], wait: 1.8, speed: 62, facing: 0 },
      { name: 'Odo', color: '#fd79a8', waypoints: [[900, 150], [960, 150], [960, 220], [900, 220]], wait: 1.0, speed: 55, facing: 0 },
    ],
  }),
  rawFloor({
    name: 'THE GALLERY',
    sub: 'A tripwire guards the middle hall. A camera watches the top. Go around, or trip it loud.',
    walls: [[300, 150, 14, 220], [700, 280, 14, 240], [450, 200, 340, 14], [500, 520, 360, 14], [640, 420, 14, 100], [880, 120, 14, 120]],
    crates: [[600, 300], [652, 300], [600, 352], [652, 352], [150, 200], [202, 200], [850, 480], [902, 480], [300, 600], [352, 600], [850, 140]],
    shadows: [[90, 110, 170, 90], [420, 440, 190, 90], [800, 110, 150, 80], [60, 560, 140, 90], [850, 580, 140, 80]],
    lamps: [[450, 300, 110], [800, 180, 110], [880, 420, 115], [250, 450, 110], [650, 640, 105]],
    tripwires: [[[300, 380], [620, 380]]],
    shards: [[180, 640], [900, 160], [700, 470], [120, 300], [850, 600]],
    cameras: [{ x: 600, y: 140, base: 1.57, label: 'C1' }],
    exit: [956, 300, 48, 76],
    start: [64, 648],
    guards: [
      { name: 'Bram', color: '#ff9f43', waypoints: [[120, 180], [280, 180]], wait: 1.4, speed: 66, facing: 0 },
      { name: 'Sable', color: '#e17055', waypoints: [[480, 120], [860, 120]], wait: 1.0, speed: 70, facing: 0 },
      { name: 'Pike', color: '#fdcb6e', waypoints: [[480, 640], [920, 640]], wait: 1.6, speed: 72, facing: 0 },
      { name: 'Odo', color: '#fd79a8', waypoints: [[940, 300], [940, 540]], wait: 1.0, speed: 68, facing: 1.57 },
      { name: 'Nyx', color: '#a29bfe', waypoints: [[360, 260], [560, 260], [560, 460], [360, 460]], wait: 0.8, speed: 64, facing: 0 },
    ],
  }),
  rawFloor({
    name: 'THE VAULT',
    sub: 'Six guards, two cameras, two tripwires, one laser, six embers. The vault pays for patience.',
    walls: [[280, 120, 14, 280], [560, 120, 14, 200], [700, 400, 14, 220], [420, 300, 300, 14], [150, 480, 280, 14], [820, 180, 14, 160]],
    crates: [[480, 180], [532, 180], [480, 232], [760, 580], [812, 580], [120, 300], [172, 300], [640, 590], [692, 590], [940, 340]],
    shadows: [[80, 110, 160, 90], [360, 520, 180, 90], [820, 440, 150, 90], [60, 600, 140, 80], [600, 110, 140, 70]],
    lamps: [[400, 220, 110], [760, 300, 115], [500, 620, 110], [920, 480, 110], [200, 380, 105]],
    tripwires: [[[320, 430], [640, 430]], [[760, 380], [760, 620]]],
    laser: [[450, 470], [700, 470]],
    shards: [[200, 160], [620, 240], [830, 540], [930, 640], [120, 650], [700, 120]],
    cameras: [{ x: 480, y: 420, base: 0, label: 'C1' }, { x: 880, y: 300, base: 3.14, label: 'C2' }],
    exit: [956, 560, 48, 76],
    start: [64, 648],
    guards: [
      { name: 'Bram', color: '#ff9f43', waypoints: [[120, 200], [260, 200]], wait: 1.2, speed: 78, facing: 0 },
      { name: 'Sable', color: '#e17055', waypoints: [[340, 120], [540, 120]], wait: 1.0, speed: 82, facing: 0 },
      { name: 'Pike', color: '#fdcb6e', waypoints: [[340, 660], [900, 660]], wait: 1.4, speed: 84, facing: 0 },
      { name: 'Odo', color: '#fd79a8', waypoints: [[760, 120], [940, 120]], wait: 0.9, speed: 80, facing: 0 },
      { name: 'Nyx', color: '#a29bfe', waypoints: [[420, 360], [680, 360], [680, 560], [420, 560]], wait: 0.7, speed: 76, facing: 0 },
      { name: 'Ash', color: '#74c0fc', waypoints: [[900, 300], [900, 600]], wait: 0.8, speed: 88, facing: 1.57 },
    ],
  }),
];

// Scale every floor's x coordinates into the 1080-wide main area.
export const LEVELS = RAW_LEVELS.map((f) => ({
  name: f.name,
  sub: f.sub,
  walls: f.walls.map(scaleRect),
  crates: f.crates.map(scalePoint),
  shadows: f.shadows.map(scaleRect),
  lamps: f.lamps.map((l) => [scaleX(l[0]), l[1], l[2]]),
  shards: f.shards.map(scalePoint),
  cameras: f.cameras.map((c) => ({ x: scaleX(c.x), y: c.y, base: c.base, label: c.label })),
  tripwires: f.tripwires.map((w) => [scalePoint(w[0]), scalePoint(w[1])]),
  laser: f.laser ? [scalePoint(f.laser[0]), scalePoint(f.laser[1])] : null,
  exit: scaleRect(f.exit),
  start: scalePoint(f.start),
  guards: f.guards.map((g) => ({
    name: g.name,
    color: g.color,
    waypoints: g.waypoints.map(scalePoint),
    wait: g.wait,
    speed: g.speed,
    facing: g.facing,
  })),
  coins: f.coins,
  smokes: f.smokes,
}));
