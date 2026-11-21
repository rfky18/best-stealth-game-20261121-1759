# Emberwatch: Night Shift

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game built for the [make.fun](https://make.fun) best stealth game bounty. You are **Wren**, a shadow courier breaking into the Emberwatch Lantern Depot at night: pocket six ember shards across two floors and slip out the green EXIT — without ever being seen.

## How to play

- **Move:** WASD or arrow keys. **Sneak:** hold Shift (slower, quieter).
- **Toss a coin:** click the floor (or press **C**) — the clink pulls nearby guards away to investigate. Five coins per floor.
- **P** pause · **R** restart · **M** mute · **Enter** start / confirm.
- Guards patrol fixed loops — learn the rhythm, slip through the gaps. The depot has four guards; the gallery has five, and they walk faster.
- **Vision cones** show what a guard can see. A cone turns gold as suspicion grows, orange when the guard comes to look, red when he chases. Each guard carries his own suspicion bar over his head.
- **Suspicion** climbs in stages: curious → alert (the guard walks over to look) → chase. Break line of sight and it falls again — being seen is not instant failure. A scare that ends well counts as a **close call**.
- **Shadow** patches hide you (detection is far slower there). **Lamp light** exposes you (detection is faster). Running is fast but loud: guards hear footsteps and come to look.
- Footstep ripples show where guards — and you — have just walked.
- Caught three times and the night shift ends. Escape both floors unseen and the lantern is yours. The HUD keeps your time.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files (vanilla JS canvas).

## Source layout

| File | Job |
| --- | --- |
| `game/src/config.js` | Two level layouts (depot + gallery) and tuning |
| `game/src/world.js` | Level geometry: sight lines, shadow/light tests, collision, coins |
| `game/src/guard.js` | Patrol loops, vision cones, suspicion, alert/chase, coin hearing |
| `game/src/player.js` | Wren: movement, sneaking, coin tosses, shards, the exit |
| `game/src/render.js` | Canvas drawing: floor, lighting, cones, guards, HUD, screens |
| `game/src/audio.js` | Synthesized WebAudio: footsteps, alarm, coin clink, shard, unlock |
| `game/src/input.js` | Keyboard and mouse input |
| `game/src/shots.js` | Staged screenshot scenes (`?shot=cover\|nearmiss\|distract\|exit`) |
| `game/src/main.js` | Boot, the fixed-step game loop, level progression |
| `main.ts` | Hand-in program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` |

## Screenshots

`?shot=cover` stages the whole depot in one view; `nearmiss` stages Wren at the edge of a cone, `distract` stages a tossed coin pulling a gallery guard away, and `exit` stages the final escape. Screenshots in `screenshots/` are real renders of this code in a browser.

## License

MIT — see [LICENSE](LICENSE).
