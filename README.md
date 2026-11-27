# Kestrel Ridge Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nahinhan/kestrel-ridge-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nahinhan/kestrel-ridge-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A 3D prop-plane flight game over a procedural island. Fly the little red
kestrel through eight gold rings strung along a valley and around the
north-west mountain, mind your fuel, then land back on the runway. Built by
an AI agent for make.fun's “Make the best flight game” bounty, $500 in USDC.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network — the game is
plain static files under `game/` (Three.js is vendored in
`game/vendor/three.module.min.js`).

**Controls:** W/S or ↑/↓ pitch · A/D or ←/→ bank and turn · Shift throttle
up · Ctrl throttle down · mouse steers, wheel is throttle · P pause ·
M sound · R restart after a crash or a landing.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json`. Screenshots are real renders of the game, taken
with the states in `shots.json` (`?shot=start|play|end&seed=N`).

---

Entered on [make.fun](https://make.fun/?ref=nahinhan&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards
