# Emberwatch: Night Shift

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game built for the [make.fun](https://make.fun) best stealth game bounty. You are **Wren**, a shadow courier breaking into the Emberwatch Lantern Depot at night: pocket three ember shards and slip out the green EXIT — without ever being seen.

## How to play

- **Move:** WASD or arrow keys. **Sneak:** hold Shift (slower, quieter).
- **P** pause · **R** restart · **M** mute · **Enter** start / confirm.
- Four night guards patrol fixed loops — learn the rhythm, slip through the gaps.
- **Vision cones** show what a guard can see. A cone turns orange as suspicion grows and red when the guard chases.
- **Suspicion** climbs in stages: curious → alert (the guard walks over to look) → chase. Break line of sight and it falls again — being seen is not instant failure.
- **Shadow** patches hide you (detection is far slower there). **Lamp light** exposes you (detection is faster). Running is fast but loud: guards hear footsteps and come to look.
- Footstep ripples show where guards — and you — have just walked.
- Caught three times and the night shift ends. Escape unseen and the lantern is yours.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files (vanilla JS canvas).

## Source layout

| File | Job |
| --- | --- |
| `game/src/config.js` | Level layout (walls, crates, shadows, lamps, patrols) and tuning |
| `game/src/world.js` | Depot geometry: sight lines, shadow/light tests, collision |
| `game/src/guard.js` | Patrol loops, vision cones, suspicion, alert/chase states |
| `game/src/player.js` | Wren: movement, sneaking, noise, shards, the exit |
| `game/src/render.js` | Canvas drawing: floor, lighting, cones, guards, HUD, screens |
| `game/src/audio.js` | Synthesized WebAudio: footsteps, alarm, shard, unlock |
| `game/src/input.js` | Keyboard and mouse input |
| `game/src/shots.js` | Staged screenshot scenes (`?shot=cover|nearmiss|hiding|exit`) |
| `game/src/main.js` | Boot and the fixed-step game loop |
| `main.ts` | Hand-in program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` |

## Screenshots

`?shot=cover` stages the whole level in one view; `nearmiss`, `hiding` and `exit` stage the other three moments. Screenshots in `screenshots/` are real renders of this code in a browser.

## License

MIT — see [LICENSE](LICENSE).
