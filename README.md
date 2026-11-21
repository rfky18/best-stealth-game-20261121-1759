# Emberwatch: Night Shift

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down 2D stealth game. You are Wren, a shadow courier. Slip through
three nights in the lantern house — The Depot, The Gallery, The Vault —
pocket 16 ember shards ($150 each, $2,400 total), dodge patrolling guards
and sweeping security cameras, trip no tripwire, cross the vault laser on
its dark beat, and leave through the green EXIT unseen.

## How to play

- **WASD / arrows** — move. **SHIFT** — sneak (slow, quiet).
- **Click the floor** (or **C**) — throw a coin; guards in earshot walk over to check the clink.
- **Q** — smoke bomb at your feet (2 per night); guards and cameras cannot see through smoke.
- **E** — douse the nearest lamp (within 100px) for the rest of the night.
- **P / Esc** — pause. **R** — restart. **M** — mute. **Enter / Space** — confirm / start.

Guards patrol fixed routes and sweep their vision cones. Being seen raises
suspicion: at 60 they get curious and investigate, at 92 they chase. Hide
in shadows or smoke and suspicion falls again — a near miss (suspicion over
45 that cools below 15 without a chase) scores a +50 CLOSE CALL. Cameras
sweep their blue cones and raise their own alert; at 100% they sound a
camera alarm and every guard converges on you. Tripwires and the vault
laser trip the whole floor's guards. Caught by a chasing guard costs one
of three lives.

Scoring: shard 100, close call 50, floor cleared 200, GHOST +500 for
winning without ever being spotted. Best score is saved locally.

The right panel shows the detection status, a four-stage ALARM meter
(CALM / UNEASY / HUNTED / ALARM), live visibility exposure, noise, near-miss
%, loot / spotted / goal / TAKE $, the GHOST bonus, the N1–N3 campaign,
one suspicion bar per guard, one alert row per camera, a tactical map, a
legend, controls and the last two events.

## Running it

```sh
node serve.ts
# open http://localhost:8080
```

Hand in with `node main.ts` (writes the dossier to `MAKEFUN_OUTPUT_DIR`,
default `/output`).

## Files

| File | Job |
| --- | --- |
| `game/src/config.js` | Constants, three floors (reference coords + 15/14 x-scale), tuning, scoring |
| `game/src/world.js` | Geometry: line of sight, raycast, circle collision, shadow/lamp/smoke tests, exposure, tripwire/laser state, event feed, toasts |
| `game/src/guard.js` | Patrol, vision cone, suspicion state machine, hearing coins, tripwire response, catching, highest suspicion |
| `game/src/camera.js` | Security cameras (sweeping cone, alert, camera alarm) and the laser beam |
| `game/src/player.js` | Wren's movement, coin throws, smoke bombs, dousing lamps, shards, score, take, exit, respawn |
| `game/src/input.js` | Keyboard + mouse, edge-triggered actions |
| `game/src/audio.js` | All WebAudio sounds, synthesized, no files |
| `game/src/render.js` | All canvas drawing: floor, cones, guards, Wren, HUD, title/floor/win/caught screens |
| `game/src/panel.js` | The right-hand detection panel only (alarm meter, campaign, cameras, tactical map) |
| `game/src/shots.js` | The four staged screenshot scenes |
| `game/src/main.js` | Boot, fixed-step 1/60 loop, screens, GHOST bonus once on win, best score |
| `game/index.html` | Canvas + screen-reader status line |
| `main.ts` | Hand-in program (copies game/ + screenshots/, writes dossier.json) |
| `serve.ts` | Small static dev server for game/ |
| `tools/shots.py` | Renders the four screenshots with headless Camoufox |
| `tools/smoke.py` | Plays the game headlessly: move, coin, smoke, douse, camera alert, laser trip |

## Screenshots

1. `1-cover.jpg` — Night 1 overview: patrols, guard cones, camera cone, shadows, exit, panel.
2. `2-nearmiss.jpg` — Night 2: Nyx suspicious at 62, Wren caught in lamplight, CLOSE CALL!
3. `3-camera.jpg` — Night 3: Wren in smoke under the sweeping cameras, laser off.
4. `4-exit.jpg` — Night 3: all 16 shards pocketed, laser live, Wren at the open EXIT.

## License

MIT — see `LICENSE`.
