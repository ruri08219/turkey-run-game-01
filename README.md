# 🦃 GOBBLE RUN — 5 Stages from Farmyard to Kitchen

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/ruri08219/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/ruri08219/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Thanksgiving is coming — and **you are the dinner**. Gobble Run is a stealth-escape arcade game: play a turkey fleeing the farmer through five stages of rising danger, from the Farmyard to the Kitchen. Dodge sliding carving knives and falling knives, hide behind hay bales, sprint when the farmer hunts you, grab corn for points, and never stand in the hot oven. Escape the Kitchen and you are free.

## Stages

1. **Farmyard** — learn the run; the farmer patrols, knives slide low.
2. **Barn** — tighter lanes, faster farmer, more knives.
3. **Cornfield** — knives start falling from above; corn rows to hide in.
4. **Farmhouse** — sharper-eyed farmer, faster chase.
5. **Kitchen** — the final escape: the glowing oven burns anyone who lingers, knives everywhere.

## Controls

- **← → / A D** — run left / right
- **Space** — jump (press again mid-air to flap)
- **Shift** — sprint (drains stamina)
- **H / ↓** — hide behind a hay bale (crouch otherwise)
- **P / Esc** — pause · **M** — mute · **Click** — menu buttons

## The farmer

He patrols, and his vision cone is drawn on screen. Step into it and the detection meter fills — at full he **HUNTS** you (faster than you walk, slower than your sprint). Break line of sight and he **SEARCHES** your last seen spot before giving up. Get caught and you lose a life; 3 lives, then it is dinner time.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network — plain static files, all art drawn in canvas code, all sound synthesized with WebAudio.

## Files

- `game/index.html` — the page, loads only files under `game/`
- `game/src/config.js` — tuning, stages, palette
- `game/src/random.js` — seeded RNG for repeatable scenes
- `game/src/input.js` — keyboard + pointer input
- `game/src/world.js` — turkey physics, farmer AI, knives, oven, corn, stages, scoring
- `game/src/render.js` — all canvas art, HUD, and screens
- `game/src/audio.js` — WebAudio synth (gobbles, alarms, fanfares)
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|kitchen|end`)
- `game/src/main.js` — boot + fixed-step loop + screens
- `main.ts` — builds `/output` (game + screenshots + dossier.json)
- `serve.ts` — tiny local static server
