# Emberwatch: Night Shift

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game built for the [make.fun](https://make.fun) best stealth game bounty. You are **Wren**, a shadow courier breaking into the Emberwatch lantern works at night: pocket ten ember shards across three floors — the depot, the gallery, the vault — and slip out the green EXIT without ever being seen.

## How to play

- **Move:** WASD or arrow keys. **Sneak:** hold Shift (slower, quieter).
- **Toss a coin:** click the floor (or press **C**) — the clink pulls nearby guards away to investigate. Five coins per floor.
- **Smoke bomb:** press **Q** — a cloud hangs for a few seconds and no guard can see through it. Two per floor.
- **Douse a lamp:** press **E** near a burning lamp — its light pool goes dark for the rest of the floor.
- **P** pause · **R** restart · **M** mute · **Enter** start / confirm.
- Guards patrol fixed loops — learn the rhythm, slip through the gaps. The depot has four guards, the gallery five, the vault six, and they walk faster on every floor.
- **Vision cones** show what a guard can see. A cone turns gold as suspicion grows, orange when the guard comes to look, red when he chases. Each guard carries his own suspicion bar over his head, and the side panel lists every guard's state live.
- **Suspicion** climbs in stages: curious → alert (the guard walks over to look) → chase. Break line of sight and it falls again — being seen is not instant failure. A scare that ends well counts as a **close call** (+50 points).
- **Shadow** patches hide you (detection is far slower there). **Lamp light** exposes you (detection is faster). Running is fast but loud: guards hear footsteps and come to look.
- **Tripwires** cross the gallery and the vault. Step on one and the whole floor gets curious at once — go around, or be quick.
- The **detection panel** (right) shows status (UNSEEN / SUSPICIOUS / ALERT / CHASED), alarm, visibility with live exposure %, noise, loot, spotted count, goal and score — plus the legend and the last three things that happened.
- **Score:** shard +100, close call +50, floor cleared +200, and a **GHOST bonus +500** if you finish the night without ever being spotted.
- Caught three times and the night shift ends. Escape all three floors unseen and the lantern is yours.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files (vanilla JS canvas).

## Source layout

| File | Job |
| --- | --- |
| `game/src/config.js` | Three floor layouts (depot + gallery + vault), tuning, scores |
| `game/src/world.js` | Floor geometry: sight lines, shadow/light/smoke tests, collision, events |
| `game/src/guard.js` | Patrol loops, vision cones, suspicion, alert/chase, coin hearing, tripwires |
| `game/src/player.js` | Wren: movement, sneaking, coin tosses, smoke, lamp dousing, shards, exit |
| `game/src/render.js` | Canvas drawing: floor, lighting, cones, guards, smoke, HUD, screens |
| `game/src/panel.js` | The right-hand detection panel: status, guards, legend, event feed |
| `game/src/audio.js` | Synthesized WebAudio: footsteps, alarm, coin clink, shard, smoke, douse, zap |
| `game/src/input.js` | Keyboard and mouse input |
| `game/src/shots.js` | Staged screenshot scenes (`?shot=cover\|nearmiss\|smoke\|exit`) |
| `game/src/main.js` | Boot, the fixed-step game loop, floor progression, GHOST bonus |
| `main.ts` | Hand-in program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` |

## Screenshots

`?shot=cover` stages the whole depot in one view; `nearmiss` stages Wren in the lamplight at the edge of a cone, `smoke` stages a smoke bomb blinding the vault's cones over a tripwire, and `exit` stages the final escape with the GHOST bonus still alive. Screenshots in `screenshots/` are real renders of this code in a browser.

## License

MIT — see [LICENSE](LICENSE).
