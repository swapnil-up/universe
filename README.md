<div align="center">

# The Entropy Engine

A functional ecosystem simulation — cells pushed through pure mathematical rules in an immutable sandbox.

[![Stars](https://img.shields.io/github/stars/swapnil-up/universe?style=for-the-badge)](https://github.com/swapnil-up/universe/stargazers)

</div>

## What is this?

A "Digital Aquarium" where you define the laws of nature, not individual behaviors. Seekers hunt plants to survive, entropy drains energy from everything, and every tick produces a completely frozen snapshot of the world. Built with *Grokking Simplicity* principles — pure functions, immutability, and stratified design.

## Quick Start

```bash
cd app
pnpm install
pnpm dev
```

The simulation runs at `http://localhost:5173`. Use the sidebar to play, pause, step through ticks, and tweak the laws of physics in real-time via God Mode.

## Project Structure

```
app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Canvas.svelte    # Canvas renderer (Action layer)
│   │   └── engine/
│   │       ├── data.ts          # Types, constants, default settings
│   │       ├── physics.ts       # Pure functions — entropy, movement, feeding
│   │       └── universe.ts      # nextTick pipeline and world initialization
│   ├── routes/
│   │   ├── +layout.ts           # Static prerender config
│   │   └── +page.svelte         # Main UI — controls, God Mode, stats
│   ├── app.d.ts
│   └── app.html
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## Architecture

| Layer | Responsibility |
|-------|---------------|
| **I/O** | Rendering, user controls |
| **Timeline** | History, pause, rewind |
| **Evolution** | Maps rules over the entire grid |
| **Rules** | Individual cell logic — entropy, eating, movement |
| **Primitives** | Grid math — neighbors, wrapping |

## Key Principles

- **Immutability** — Never mutate state. Return new versions.
- **Pure Functions** — No `Math.random()` or `new Date()` in physics. Pass seeds in.
- **Separation** — Calculations (logic) separate from Actions (side effects).
- **Deterministic** — Same seed + same rules = same outcome every time.

## Contributing

This is a learning project exploring functional programming concepts. Pull requests are welcome — open an issue first to discuss what you'd like to change.

<a href="https://github.com/swapnil-up/universe/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=swapnil-up/universe" />
</a>

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=swapnil-up/universe&type=Date)](https://star-history.com/#swapnil-up/universe&Date)

</div>
