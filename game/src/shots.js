// Staged scenes for screenshots (?shot=cover|nearmiss|distract|exit).
// Each one poses the world deterministically — guards mid-patrol, Wren in
// a telling spot — so a screenshot is a real render of the game's own
// code, not a mock-up. The cover shows the whole first level at once:
// cones, cover, shadows, lamps, shards and the exit in a single view.
import { loadLevel, resetWorld } from './world.js';

/** Put a guard at a spot on its patrol, facing a chosen direction. */
function poseGuard(world, index, x, y, facing, suspicion, state) {
  const g = world.guards[index];
  g.x = x;
  g.y = y;
  g.facing = facing;
  g.suspicion = suspicion;
  g.state = state;
  g.lastSeen = null;
  g.investigateAt = null;
  g.ripples = [{ x, y: y + 10, age: 0.3 }];
}

/** Put Wren somewhere, with a chosen stance. */
function posePlayer(world, x, y, facing, sneaking) {
  const p = world.player;
  p.x = x;
  p.y = y;
  p.facing = facing;
  p.sneaking = sneaking;
  p.moving = true;
  p.ripples = [{ x, y: y + 10, age: 0.4 }];
}

/**
 * Stage a named scene on a fresh world and return it. Unknown names fall
 * back to the cover scene.
 */
export function stageShot(name, world) {
  resetWorld(world);
  world.time = 12.4;
  if (name === 'nearmiss') {
    // Wren at the very edge of Sable's cone, suspicion climbing, "?" up.
    poseGuard(world, 0, 300, 240, 0, 8, 'patrol');
    poseGuard(world, 1, 480, 210, Math.PI / 2, 62, 'investigate');
    poseGuard(world, 2, 700, 630, Math.PI, 5, 'patrol');
    poseGuard(world, 3, 1080, 150, Math.PI, 0, 'patrol');
    world.guards[1].lastSeen = { x: 560, y: 330 };
    world.guards[1].investigateAt = { x: 560, y: 330 };
    posePlayer(world, 560, 330, Math.PI, true);
    world.player.hidden = false;
    world.player.lit = false;
    world.nearMisses = 1;
  } else if (name === 'distract') {
    // Level 2: a coin just landed, its ping rings still spreading, Nyx
    // walking over to check the noise while Wren waits in the shadow.
    loadLevel(world, 1);
    world.time = 34.8;
    world.coins = 4;
    world.landedCoins = [{ x: 700, y: 430, age: 0 }];
    world.pings = [{ x: 700, y: 430, age: 0.25 }];
    poseGuard(world, 0, 200, 180, 0, 4, 'patrol');
    poseGuard(world, 1, 700, 120, 0, 0, 'patrol');
    poseGuard(world, 2, 900, 640, Math.PI, 10, 'patrol');
    poseGuard(world, 3, 1020, 420, -Math.PI / 2, 18, 'patrol');
    poseGuard(world, 4, 770, 380, 2.52, 34, 'investigate');
    world.guards[4].lastSeen = { x: 700, y: 430 };
    world.guards[4].investigateAt = { x: 700, y: 430 };
    world.shardsTaken = 1;
    world.totalTaken = 4;
    world.shards[0].taken = true;
    posePlayer(world, 500, 480, 0, true);
    world.player.hidden = true;
    world.player.lit = false;
  } else if (name === 'exit') {
    // Level 2, all six shards pocketed: the green door stands open and
    // Wren is slipping out while the guards patrol behind her.
    loadLevel(world, 1);
    world.time = 148.2;
    world.coins = 2;
    world.shardsTaken = 3;
    world.totalTaken = 6;
    for (const s of world.shards) s.taken = true;
    poseGuard(world, 0, 200, 180, Math.PI, 12, 'patrol');
    poseGuard(world, 1, 700, 120, -Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 600, 640, Math.PI, 0, 'patrol');
    poseGuard(world, 3, 1020, 480, Math.PI / 2, 20, 'patrol');
    poseGuard(world, 4, 770, 300, Math.PI, 0, 'patrol');
    posePlayer(world, 1196, 340, 0, true);
    world.player.hidden = false;
    world.player.lit = false;
  } else {
    // cover: the whole depot in one view — every guard mid-patrol with
    // its cone out, crates and shadows readable, shards glowing, the exit
    // top-right, Wren hidden in the middle shadow patch.
    poseGuard(world, 0, 240, 240, 0, 6, 'patrol');
    poseGuard(world, 1, 480, 190, Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 820, 630, 0, 0, 'patrol');
    poseGuard(world, 3, 1080, 150, 0, 0, 'patrol');
    posePlayer(world, 560, 440, Math.PI / 4, true);
    world.player.hidden = true;
    world.player.lit = false;
  }
  return world;
}
