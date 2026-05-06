# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsdown — dual ESM+CJS output to dist/
npm run dev            # tsdown --watch
npm run typecheck      # tsc --noEmit
npm run test           # vitest run (single pass)
npm run test:watch     # vitest (interactive)
npm run format         # prettier --write "src/**/*.{ts,tsx}"
npm run format:check   # prettier --check "src/**/*.{ts,tsx}"
```

To run a single test file:
```bash
npx vitest run tests/scheduler.test.ts
```

## Architecture

This is a React library (peer deps: React ≥19, lucide-react) that exposes **three abstraction layers** for building VAST-ad-enabled video players. Users pick whichever layer they need:

| Layer | Exported from | What it is |
|---|---|---|
| 1 – Drop-in components | `/`, `/streaming`, `/feed`, `/playlist` | `StreamingPlayer`, `PlaylistPlayer`, `FeedPlayer` — fully styled, ready to render |
| 2 – Headless hooks | same entries | `useStreamingPlayer`, `usePlaylist`, `useFeed` — return `{ videoRef, controls, adState, … }` |
| 3 – Core primitives | `./core` | `PlayerEngine`, `EventBus`, `Tech`, `AdOrchestrator`, `MidrollWatcher` |

### Core data-flow

```
Tech (HTMLVideoElement wrapper)
  └─> PlayerEngine (state machine: idle→loading→playing→ad→ended)
        ├─> EventBus (typed pub/sub — PlayerEventMap)
        ├─> AdOrchestrator (VAST fetch + execution)
        │     ├─> VastLoader → VastParser
        │     ├─> AdScheduler (slot management)
        │     ├─> AdPodManager (pod sequencing)
        │     └─> BeaconFirer (quartile/impression tracking)
        └─> MidrollWatcher (timestamp-based midroll scheduling)
```

`PlayerEngine.attachTech()` is the composition root — it wires all dependencies together. `AdOrchestrator` is dependency-injected with `AdPodManager`, not self-constructed.

### Adapter layer (`src/adapters/`)

- **streaming/** — single video + pre/mid/postroll
- **playlist/** — queue with auto-advance (`usePlaylist` adds `next/prev/goTo`)
- **feed/** — vertical-swipe feed with interleaved ads (`FeedScheduler` interleaves content+ad slots; `PrefetchQueue` prefetches upcoming videos)

### Shared UI (`src/components/`)

`VideoSurface`, `ControlBar`, `AdOverlay`, `BufferingSpinner` — used internally by the drop-in components, also importable for custom UIs.

### Types (`src/types/`)

- `PlayerState`: `'idle' | 'loading' | 'playing' | 'paused' | 'ad' | 'buffering' | 'error' | 'ended'`
- `AdState`: `{ active, skippable, skipOffset, currentTime, podIndex, podTotal }`
- `PlayerEventMap`: all events (`play`, `pause`, `timeupdate`, `ad:start`, `ad:skip`, `ad:quartile`, `ad:error`, …)

## Build output

tsdown produces dual format from five entry points:

```
dist/
  index.{mjs,cjs,d.mts,d.cts}
  core.{mjs,cjs,…}
  streaming.{mjs,cjs,…}
  feed.{mjs,cjs,…}
  playlist.{mjs,cjs,…}
```

`react`, `react-dom`, and `lucide-react` are externalized (peer deps). `publint` runs as part of build to validate the npm package shape.

## TypeScript strictness

`tsconfig.json` enables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `isolatedDeclarations` on top of `strict`. These are load-bearing for VAST type safety — don't relax them.

## Tests

Tests live in `tests/`. The main test file covers `buildFeedSchedule()` (from `FeedScheduler`) and `AdScheduler`. Vitest is used with no separate config file.

## Known fragile areas

- **EventBus subscriptions** — not always cleaned up in hooks; memory leak risk on unmount.
- **Safari** — `loadeddata` fallback required for playlist auto-advance; `swapSrc` workaround in `Tech`.
- **Chrome** — `timeupdate` fires before `loadedmetadata`, so guard against `NaN` duration in `Tech.onTime`.
- **Ad blockers** — VAST fetch fails silently; no user-facing error surfaced yet.
