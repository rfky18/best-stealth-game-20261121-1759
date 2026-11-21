// Staged scenes for screenshots (?shot=cover|nearmiss|hiding|exit).
// Each one poses the world deterministically — guards mid-patrol, Wren in
// a telling spot — so a screenshot is a real render of the game's own code,
// not a mock-up. The cover shows the whole level at once: cones, cover,
// shadows, lamps, shards and the exit in a single view.
import { TUNE } from './config.js';
import { resetWorld } from './world.js';

/** Put a guard at a spot on its patrol, facing a chosen direction. */
function poseGuard(world, index, x, y, facing, suspicion, state) {
  const g = world.guards[index];
  g.x = x;
  g.y = y;
  g.facing = facing;
  g.suspicion = suspicion;
  g.state = state;
  g.lastSeen = null;
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
    // Wren at the very edge of Sable's cone, suspicion climbing, "!" up.
    poseGuard(world, 0, 300, 230, 0, 8, 'patrol');
    poseGuard(world, 1, 480, 210, Math.PI / 2, 62, 'investigate');
    poseGuard(world, 2, 700, 620, Math.PI, 5, 'patrol');
    poseGuard(world, 3, 1080, 140, Math.PI, 0, 'patrol');
    world.guards[1].lastSeen = { x: 560, y: 330 };
    posePlayer(world, 560, 330, Math.PI, true);
    world.player.hidden = false;
    world.player.lit = false;
  } else if (name === 'hiding') {
    // Wren flat in the middle shadow patch while Sable's cone sweeps past.
    world.shardsTaken = 1;
    world.shards[0].taken = true;
    poseGuard(world, 0, 200, 230, 0, 30, 'patrol');
    poseGuard(world, 1, 480, 300, Math.PI / 2, 44, 'investigate');
    poseGuard(world, 2, 900, 620, 0, 0, 'patrol');
    poseGuard(world, 3, 1000, 210, Math.PI / 2, 0, 'patrol');
    world.guards[1].lastSeen = { x: 560, y: 420 };
    posePlayer(world, 580, 430, 0, true);
    world.player.hidden = true;
    world.player.lit = false;
  } else if (name === 'exit') {
    // All three shards pocketed, the green door open, Wren slipping out.
    world.shardsTaken = 3;
    for (const s of world.shards) s.taken = true;
    poseGuard(world, 0, 340, 230, Math.PI, 12, 'patrol');
    poseGuard(world, 1, 480, 160, -Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 600, 620, Math.PI, 0, 'patrol');
    poseGuard(world, 3, 1010, 140, Math.PI, 20, 'patrol');
    posePlayer(world, 1196, 150, 0, true);
    world.player.hidden = false;
    world.player.lit = false;
  } else {
    // cover: the whole level in one view — every guard mid-patrol with its
    // cone out, crates and shadows readable, shards glowing, exit top-right.
    poseGuard(world, 0, 240, 230, 0, 6, 'patrol');
    poseGuard(world, 1, 480, 190, Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 820, 620, 0, 0, 'patrol');
    poseGuard(world, 3, 1080, 140, 0, 0, 'patrol');
    posePlayer(world, 520, 380, Math.PI / 4, true);
    world.player.hidden = true;
    world.player.lit = false;
  }
  return world;
}
