# Emberwatch: Night Shift

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rfky18/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

You are **Wren**, a shadow courier. On a lantern-lit night you slip through three floors of a guarded house — **The Depot**, **The Gallery**, **The Vault** — pocket all ten ember shards, and leave through the green **EXIT** without ever being seen. Three lives. One ghost bonus if nobody ever spots you.

## How to play

- **WASD / arrow keys** — move. **SHIFT** — sneak (slow, quiet).
- **Click the floor / C** — toss a coin (5 per floor, max range 240). Guards in earshot walk over to investigate the clink.
- **Q** — smoke bomb at your feet (2 per floor, radius 72, lasts 3.5 s). Guards cannot see you inside smoke, or through it.
- **E** — douse the nearest lit lamp within 100 px. It stays dark for the rest of the floor.
- **P / Esc** — pause. **R** — restart. **M** — mute. **Enter / Space** — start / confirm.

## Detection

Every guard patrols a fixed loop and sweeps their vision cone while waiting at a waypoint. Suspicion rises while a guard sees you — faster in the open and in lamplight, slower in shadow — and falls when you break sight. At 60 a guard grows curious and comes to look; at 92 they chase. Get caught and you lose a life and wake up at the entrance with the guards calmed.

- **Close call**: suspicion climbs past 45, then fades below 15 without a chase — **+50 pts** and a toast.
- **Tripwires** (floors 2 and 3): step on one and every guard on the floor gets +25 suspicion and converges on the wire. It needs 8 s to re-arm.
- **Running** is loud: guards nearby hear your steps.
- **Shards** are worth 100 pts each; finishing a floor is +200. **GHOST +500** if you win with zero spotted.

## The detection panel

The right-hand panel is alive the whole run: a big status word (**UNSEEN / SUSPICIOUS ? / ALERT! / CHASED!**) with advice, an **ALARM** bar, a **VISIBILITY** bar with your live exposure (in shadow, in the open, in lamplight, in smoke), a **NOISE** readout, loot / spotted / goal / score, the **GHOST** line, a per-guard suspicion list, a legend, controls, and the last three events under **WHAT HAPPENED** — including a guard's *"WHAT WAS THAT?"* the moment they spot you.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: the game is plain files under `game/`, and all sound is synthesized with WebAudio.

## Files

| File | Job |
| --- | --- |
| `game/src/config.js` | Constants, the three floors, tuning, scoring |
| `game/src/world.js` | Geometry: line of sight, raycasts, circle collision, shadow / lamp / smoke tests, exposure, tripwires, world state, event feed, toasts |
| `game/src/guard.js` | Patrols, vision cones, suspicion, the patrol / curious / chase machine, coin hearing, tripwire response, being caught, highest suspicion |
| `game/src/player.js` | Wren's movement, coin throws, smoke bombs, dousing lamps, shards, score, the exit, respawning |
| `game/src/input.js` | Keyboard + mouse, edge-triggered actions |
| `game/src/audio.js` | All synthesized WebAudio sounds |
| `game/src/render.js` | Everything drawn on the canvas, the HUD, and the screens |
| `game/src/panel.js` | The right-hand detection panel only |
| `game/src/shots.js` | The 4 staged scenes for the screenshots |
| `game/src/main.js` | Boot, the fixed-step 1/60 s loop, screens, the one-time GHOST bonus, best score |
| `game/index.html` | The canvas and a screen-reader status line |
| `main.ts` | The hand-in program (copies game + screenshots, writes dossier.json) |
| `serve.ts` | A small static dev server for `game/` |

## Screenshots

1. **Cover** — The Depot: Wren hidden in the middle shadow while Bram's cone sweeps past.
2. **Near miss** — The Gallery: Nyx is suspicious in the lamplight, a close call just banked.
3. **Smoke** — The Vault: Wren inside a smoke cloud as Ash closes in.
4. **Exit** — The Vault: all ten shards pocketed, the green EXIT open, nobody spotted.

## License

MIT — see [LICENSE](LICENSE).
