// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over — and between the depot, the gallery
// and the vault, with a level card in between. Slip out unseen and the
// GHOST bonus lands once, at the win.
//
// ?shot=cover|nearmiss|smoke|exit (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets
// documentElement.dataset.shotReady for a screenshot.
import { BEST_KEY, LEVELS, SCORE } from './config.js';
import { createWorld, loadLevel, pushEvent, resetWorld } from './world.js';
import { updateGuard, guardCaughtPlayer } from './guard.js';
import {
  updatePlayer, updateCoin, updateEffects, respawnPlayer,
} from './player.js';
import {
  createKeys, createInput, takeAction, takeCoinTarget,
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE,
  ACTION_TOSS, ACTION_SMOKE, ACTION_DOUSE,
} from './input.js';
import {
  ensureAudio, toggleMute, playFootstep, playAlarm, playCoin, playShard,
  playUnlock, playCaught, playSmoke, playDouse, playTripwire,
} from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
const STEP = 1 / 60;
/** How long the level card stays up between floors. */
const LEVEL_CARD_SECONDS = 2.6;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const keys = createKeys();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts one visit.
  }
}

/** Announce screen changes for screen readers. */
function announce(message) {
  status.textContent = message;
}

/** One fixed step of the living game: player, coin, then every guard. */
function stepWorld(dt, sounds) {
  const beforeShards = world.shardsTaken;
  const beforeSmoke = world.smokeLeft;
  const beforeLamps = world.lampsLive.length;
  const wireCool = world.wires.map((wire) => wire.coolLeft);
  const stepped = updatePlayer(world, keys, dt, sounds.tossAt, sounds.smoke, sounds.douse);
  if (stepped) sounds.step(world.player.sneaking);
  if (world.shardsTaken > beforeShards) {
    sounds.shard();
    if (world.shardsTaken >= LEVELS[world.levelIndex].shards.length) sounds.unlock();
  }
  if (world.smokeLeft < beforeSmoke) {
    sounds.smokeSound();
    pushEvent(world, 'Smoke out — the cones go blind.');
  }
  if (world.lampsLive.length < beforeLamps) {
    sounds.douseSound();
    pushEvent(world, 'Lantern doused — the dark grows.');
  }
  for (let i = 0; i < world.wires.length; i++) {
    if (wireCool[i] <= 0 && world.wires[i].coolLeft > 0) sounds.tripwire();
  }
  updateCoin(world, dt, sounds.coin);
  updateEffects(world, dt);
  for (let i = 0; i < world.guards.length; i++) {
    updateGuard(world.guards[i], i, world, dt, sounds.alarm);
  }
  if (world.toastTimer > 0) world.toastTimer -= dt;
  if (world.status === 'play') {
    const caughtBy = guardCaughtPlayer(world);
    if (caughtBy) {
      sounds.caught();
      world.lives -= 1;
      if (world.lives <= 0) {
        world.status = 'over';
        world.statusTimer = 0;
        announce('Caught. Game over.');
      } else {
        world.status = 'caught';
        world.statusTimer = 0;
        announce(`Spotted by ${caughtBy.name}. ${world.lives} lanterns left.`);
      }
    }
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene, SCREEN_PLAY, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      // A DOM flag too: some headless harnesses evaluate in a separate
      // realm, where window properties set by page scripts are not visible.
      document.documentElement.dataset.shotReady = '1';
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(keys, canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let ghostAwarded = false;
  let accumulator = 0;
  let last = performance.now();
  let stepSounds = {
    shard: playShard, unlock: playUnlock, alarm: playAlarm,
    caught: playCaught, step: playFootstep, coin: playCoin,
    smokeSound: playSmoke, douseSound: playDouse, tripwire: playTripwire,
    tossAt: null, smokePressed: false, dousePressed: false,
  };

  function startGame() {
    resetWorld(world);
    ghostAwarded = false;
    takeCoinTarget(keys); // a click that started the game is not a coin toss
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Pocket 3 ember shards, then reach the exit unseen.');
  }

  function endToTitle() {
    screen = SCREEN_TITLE;
    announce('Emberwatch: Night Shift. Press Enter to begin.');
  }

  /** Where a C press tosses a coin: a short throw ahead of Wren. */
  function tossAhead() {
    const p = world.player;
    return {
      x: p.x + Math.cos(p.facing) * 170,
      y: p.y + Math.sin(p.facing) * 170,
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    if (takeAction(keys, ACTION_MUTE)) {
      ensureAudio();
      const muted = toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    // Peek, don't consume: the confirm press is consumed below by the
    // screen that acts on it (title starts the game on the same press).
    if (keys.confirm) ensureAudio();

    if (screen === SCREEN_TITLE) {
      if (takeAction(keys, ACTION_CONFIRM)) startGame();
      renderer.draw(world, SCREEN_TITLE, best);
      return;
    }

    if (takeAction(keys, ACTION_PAUSE)) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (takeAction(keys, ACTION_RESTART)) {
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || world.status !== 'play') {
        startGame();
        return;
      }
    }

    if (screen === SCREEN_PAUSED) {
      renderer.draw(world, SCREEN_PAUSED, best);
      return;
    }

    // Caught is a beat, not a screen: two seconds, then Wren is back at
    // the service door with one fewer lantern and the guards calming down.
    if (world.status === 'caught') {
      world.statusTimer += elapsed;
      if (world.statusTimer > 2) {
        respawnPlayer(world);
        world.status = 'play';
      }
      renderer.draw(world, SCREEN_PLAY, best);
      return;
    }

    // The level card: a beat between floors, then the next floor loads.
    if (world.status === 'levelcard') {
      world.statusTimer += elapsed;
      if (world.statusTimer > LEVEL_CARD_SECONDS) {
        loadLevel(world, world.levelIndex + 1);
        world.status = 'play';
        announce(`Level ${world.levelIndex + 1}: ${LEVELS[world.levelIndex].name}.`);
      }
      renderer.draw(world, SCREEN_PLAY, best);
      return;
    }

    if (world.status === 'won') {
      // The GHOST bonus lands once, the moment the night is won unseen.
      if (!ghostAwarded) {
        ghostAwarded = true;
        if (world.spotted === 0) {
          world.score += SCORE.ghost;
          pushEvent(world, `GHOST BONUS +${SCORE.ghost} — never spotted!`);
        }
      }
      if (!best || world.score > best) {
        best = world.score;
        saveBest(best);
      }
      renderer.draw(world, SCREEN_PLAY, best);
      if (takeAction(keys, ACTION_CONFIRM)) endToTitle();
      return;
    }
    if (world.status === 'over') {
      renderer.draw(world, SCREEN_OVER, best);
      if (takeAction(keys, ACTION_CONFIRM)) endToTitle();
      return;
    }

    // One coin toss per click or C press, aimed at the clicked spot;
    // one smoke bomb per Q press, one douse per E press.
    stepSounds.tossAt = takeCoinTarget(keys);
    if (takeAction(keys, ACTION_TOSS)) stepSounds.tossAt = tossAhead();
    stepSounds.smokePressed = takeAction(keys, ACTION_SMOKE);
    stepSounds.dousePressed = takeAction(keys, ACTION_DOUSE);

    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      world.time += STEP;
      stepWorld(STEP, {
        ...stepSounds,
        smoke: stepSounds.smokePressed,
        douse: stepSounds.dousePressed,
      });
      stepSounds.tossAt = null;
      stepSounds.smokePressed = false;
      stepSounds.dousePressed = false;
      if (world.player.caughtFlash > 0) {
        world.player.caughtFlash = Math.max(0, world.player.caughtFlash - STEP);
      }
    }
    renderer.draw(world, SCREEN_PLAY, best);
  }

  announce('Emberwatch: Night Shift. Press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
