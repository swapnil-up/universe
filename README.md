<div align="center">

# The Entropy Engine

A functional ecosystem simulation — cells pushed through pure mathematical rules in an immutable sandbox.

[![Stars](https://img.shields.io/github/stars/swapnil-up/universe?style=for-the-badge)](https://github.com/swapnil-up/universe/stargazers)
[![Demo](https://img.shields.io/badge/demo-live-3498db?style=for-the-badge)](https://swapnil-up.github.io/universe/)

</div>

## What is this?

A "Digital Aquarium" where you define the laws of nature, not individual behaviors. Seekers hunt plants to survive, entropy drains energy from everything, and every tick produces a completely frozen snapshot of the world. Built with *Grokking Simplicity* principles — pure functions, immutability, and stratified design.

## Quick Start

```bash
cd app
pnpm install
pnpm dev
```

Then open `http://localhost:5173`. Use the floating controls to play, pause, and step through ticks. Tweak the laws of physics in real-time via God Mode.

## Project Structure

```
app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Canvas.svelte    # Canvas renderer — pan, zoom, overlays
│   │   └── engine/
│   │       ├── data.ts          # Types, constants, presets, species config
│   │       ├── primitives.ts    # Pure math — wrapCoordinate, pipe, times
│   │       ├── rng.ts           # Seeded RNG — nextRandom, randomDir
│   │       ├── spatial.ts       # Spatial index — buildIndex, findInRadius
│   │       ├── physics.ts       # applyEntropy (pure decay function)
│   │       ├── universe.ts      # nextTick pipeline, agent loop, decisions
│   │       ├── simulation.ts    # SimController — timing, orchestration
│   │       └── renderer.ts      # Canvas drawing — species colors, HSL
│   ├── routes/
│   │   ├── +layout.ts           # Static prerender config
│   │   └── +page.svelte         # Main UI — controls, God Mode, stats, log
│   └── app.html
├── .github/workflows/deploy.yml
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| **Primitives** | `primitives.ts` | `wrapCoordinate`, `pipe`, `times` |
| **Domain** | `physics.ts`, `rng.ts`, `spatial.ts` | Entropy, RNG, spatial index |
| **Application** | `universe.ts` | `nextTick` pipeline, agent loop, species decisions |
| **I/O** | `simulation.ts`, `renderer.ts` | Timing, orchestration, canvas drawing |
| **UI** | `+page.svelte`, `Canvas.svelte` | Controls, stats, event log, pan/zoom |

## Key Principles

- **Immutability** — Every tick produces a frozen snapshot. No state is mutated.
- **Pure Functions** — No `Math.random()` or `new Date()` in the engine. Seeded RNG with explicit state threading.
- **Stratified Design** — Each layer depends only on layers below it. Primitives → Domain → Application → I/O → UI.
- **Deterministic** — Same seed + same settings = identical outcome every time.

## Contributing

This is a learning project exploring functional programming concepts. Pull requests are welcome — open an issue first to discuss what you'd like to change.

<a href="https://github.com/swapnil-up/universe/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=swapnil-up/universe" />
</a>

---

<!-- <div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=swapnil-up/universe&type=Date)](https://star-history.com/#swapnil-up/universe&Date) -->

<!-- </div> -->
