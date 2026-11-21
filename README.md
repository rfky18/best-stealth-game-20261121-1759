# Emberwatch: Night Shift

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down 2D stealth game, built for the make.fun bounty
[best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759).

You are **Wren**, a shadow courier. Slip through three nights in the
lantern-lit building — The Depot, The Gallery, The Vault — pocket all
**16 ember shards** (worth **$150 each, $2,400 total**), and reach the
green **EXIT** unseen. Guards patrol fixed routes with vision cones.
Security **cameras** sweep blue cones. **Tripwires** and a timed
**laser** guard the vault. Get spotted and the alarm rises; get caught
three times and the night ends.

## How to play

- **WASD / arrow keys** — move (running is loud). **SHIFT** — sneak (slow, silent).
- **CLICK** on the floor (or **C**) — throw a coin; guards in earshot walk over to check it. 5 coins per night.
- **Q** — smoke bomb at your feet (2 per night). Guards and cameras cannot see through smoke.
- **E** — douse the nearest lamp (within 100 px). It stays out for the rest of the night.
- **P / Esc** — pause. **R** — restart. **M** — mute. **Enter / Space** — start / confirm.

Detection is gradual and recoverable: a guard's suspicion rises while
it sees you (faster in lamplight, slower in shadow), turns curious at
60, and chases at 92. Break line of sight and suspicion falls again.
A close call — suspicion over 45 that fades below 15 without a chase —
earns +50 points and a NEAR MISS %. Cameras raise their own alert;
at 100% they sound a camera alarm and every guard converges on your
last seen spot. Finish a night unseen and the **GHOST +500** bonus is
yours.

The right panel shows everything live: detection status, the four
segment **alarm meter** (CALM / UNEASY / HUNTED / ALARM), visibility
and noise, near-miss %, loot and TAKE $, the **campaign tracker**
(Night 1/2/3), every guard's suspicion, every **camera's** alert, a
**tactical map**, a legend, and the last two events.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080/> in a desktop browser. No network
requests: the game is plain HTML + ES modules + WebAudio, all local.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | Canvas + screen-reader status line, loads the game |
| `game/src/config.js` | Constants, the three floors, cameras, laser, tuning, scoring, loot value |
| `game/src/world.js` | Geometry (line of sight, raycast, circle collision), shadow/lamp/smoke tests, exposure, tripwire, world state, event feed, toast |
| `game/src/guard.js` | Patrol, vision cone, suspicion, guard state machine, hearing coins, tripwire response, being caught, highest suspicion |
| `game/src/camera.js` | Security cameras (sweeping cone, alert, camera alarm) + laser beam (on/off cycle, trip) |
| `game/src/player.js` | Wren's movement, coin throw, smoke bomb, dousing lamps, shards, score, TAKE $, exit, respawn |
| `game/src/input.js` | Keyboard + mouse, edge-triggered actions |
| `game/src/audio.js` | All synthesized WebAudio sounds |
| `game/src/render.js` | All canvas drawing + HUD + title / night / win / game-over screens |
| `game/src/panel.js` | Right-hand detection panel only (alarm meter, campaign, cameras, tactical map) |
| `game/src/shots.js` | The 4 staged scenes for screenshots |
| `game/src/main.js` | Boot, fixed-step 1/60 s loop, screens, one-time GHOST bonus, best score |
| `main.ts` | Hand-in program: copies game/ + screenshots/ to the output dir and writes dossier.json |
| `serve.ts` | Small static dev server for the game (port 8080) |
| `vendor/makefun-game.ts` | make.fun dossier builder (from the kit, unmodified) |

## Screenshots

All four are real renders of the game itself, staged in code
(`game/src/shots.js`, `?shot=name&seed=1`):

1. `1-cover.jpg` — Night 1, The Depot: Wren hidden in shadow, guard cones, the sweeping blue camera cone, crates for cover, and the green EXIT.
2. `2-nearmiss.jpg` — Night 2: Nyx suspicious at 62, Wren caught in lamplight, CLOSE CALL! toast, NEAR MISS 62%, alarm HUNTED.
3. `3-camera.jpg` — Night 3: Wren inside smoke as camera C1 sweeps toward it, laser off, Ash suspicious.
4. `4-exit.jpg` — Night 3: all 16 shards pocketed (TAKE $2,400), EXIT open, laser on, Wren slipping out unseen.

## License

MIT
