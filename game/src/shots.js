// Staged scenes for screenshots (?shot=cover|nearmiss|smoke|exit).
// Each one poses the world deterministically — guards mid-patrol, Wren in
// a telling spot — so a screenshot is a real render of the game's own
// code, not a mock-up. The cover shows the whole first floor at once:
// cones, cover, shadows, lamps, shards, the exit and the panel in a
// single view.
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
    // Floor 2: Nyx has Wren in the lamplight at the edge of the cone,
    // suspicion climbing past the alert line, "?" up, a close call
    // already banked — the moment before a chase starts.
    loadLevel(world, 1);
    world.time = 34.8;
    world.coins = 4;
    world.smokeLeft = 2;
    world.shardsTaken = 1;
    world.totalTaken = 4;
    world.shards[0].taken = true;
    world.nearMisses = 1;
    world.score = 650;
    world.toast = 'CLOSE CALL!';
    world.toastTimer = 1.6;
    world.events = [
      { t: 34.8, text: 'Nyx: WHAT WAS THAT?' },
      { t: 31.2, text: 'Nyx is suspicious…' },
      { t: 28.0, text: 'Close call — they almost had you.' },
    ];
    poseGuard(world, 0, 200, 180, 0, 4, 'patrol');
    poseGuard(world, 1, 700, 120, Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 800, 640, Math.PI, 10, 'patrol');
    poseGuard(world, 3, 940, 420, -Math.PI / 2, 18, 'patrol');
    poseGuard(world, 4, 560, 300, Math.PI, 62, 'investigate');
    world.guards[4].lastSeen = { x: 460, y: 300 };
    world.guards[4].investigateAt = { x: 460, y: 300 };
    posePlayer(world, 460, 300, 0, true);
    world.player.hidden = false;
    world.player.lit = true;
  } else if (name === 'smoke') {
    // Floor 3: a smoke bomb just went off at Wren's feet, the cones go
    // blind over it, and the red tripwire pulses across the vault — the
    // gadget doing exactly what it is for.
    loadLevel(world, 2);
    world.time = 71.5;
    world.coins = 3;
    world.smokeLeft = 1;
    world.shardsTaken = 1;
    world.totalTaken = 7;
    world.shards[0].taken = true;
    world.score = 1100;
    world.smoke = [{ x: 660, y: 500, left: 2.8 }];
    world.events = [
      { t: 71.5, text: 'Smoke out — the cones go blind.' },
      { t: 68.0, text: 'Ash is suspicious…' },
      { t: 64.3, text: 'Ember shard pocketed.' },
    ];
    poseGuard(world, 0, 200, 200, 0, 6, 'patrol');
    poseGuard(world, 1, 440, 120, 0, 0, 'patrol');
    poseGuard(world, 2, 600, 660, Math.PI, 0, 'patrol');
    poseGuard(world, 3, 850, 120, Math.PI, 0, 'patrol');
    poseGuard(world, 4, 560, 460, 0, 20, 'patrol');
    poseGuard(world, 5, 900, 450, -Math.PI / 2, 40, 'investigate');
    world.guards[5].lastSeen = { x: 660, y: 500 };
    world.guards[5].investigateAt = { x: 660, y: 500 };
    posePlayer(world, 660, 500, Math.PI / 2, true);
    world.player.hidden = false;
    world.player.lit = false;
    world.player.smoked = true;
  } else if (name === 'exit') {
    // Floor 3, all ten shards pocketed: the green door stands open, the
    // GHOST bonus still alive, and Wren is slipping out while the
    // guards patrol behind her.
    loadLevel(world, 2);
    world.time = 148.2;
    world.coins = 2;
    world.smokeLeft = 1;
    world.shardsTaken = 4;
    world.totalTaken = 10;
    for (const s of world.shards) s.taken = true;
    world.score = 1400;
    world.events = [
      { t: 148.2, text: 'The vault door stands open.' },
      { t: 145.0, text: 'Ember shard pocketed.' },
      { t: 141.6, text: 'Nyx lost the trail.' },
    ];
    poseGuard(world, 0, 200, 200, 0, 12, 'patrol');
    poseGuard(world, 1, 440, 120, 0, 0, 'patrol');
    poseGuard(world, 2, 600, 660, Math.PI, 0, 'patrol');
    poseGuard(world, 3, 850, 120, Math.PI, 0, 'patrol');
    poseGuard(world, 4, 560, 460, Math.PI / 2, 0, 'patrol');
    poseGuard(world, 5, 900, 380, Math.PI, 0, 'patrol');
    posePlayer(world, 972, 598, 0, true);
    world.player.hidden = false;
    world.player.lit = false;
  } else {
    // cover: the whole depot in one view — every guard mid-patrol with
    // its cone out, crates and shadows readable, shards glowing, the exit
    // top-right, Wren hidden in the middle shadow patch, and the panel
    // showing UNSEEN, IN SHADOW, SILENT.
    poseGuard(world, 0, 240, 240, 0, 6, 'patrol');
    poseGuard(world, 1, 480, 190, Math.PI / 2, 0, 'patrol');
    poseGuard(world, 2, 820, 630, 0, 0, 'patrol');
    poseGuard(world, 3, 900, 220, 0, 0, 'patrol');
    posePlayer(world, 560, 440, Math.PI / 4, true);
    world.player.hidden = true;
    world.player.lit = false;
    world.events = [{ t: 12.4, text: 'The depot hums. Nobody has seen you.' }];
  }
  return world;
}
