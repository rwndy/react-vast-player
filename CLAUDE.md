# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.
Read it fully before making any changes.

---

## Commands

```bash
npm run build          # tsdown — dual ESM+CJS output to dist/
npm run dev            # tsdown --watch
npm run typecheck      # tsc --noEmit — must be zero errors before any commit
npm run test           # vitest run (single pass)
npm run test:watch     # vitest (interactive)
npm run format         # prettier --write "src/**/*.{ts,tsx}"
npm run format:check   # prettier --check "src/**/*.{ts,tsx}"
npm run lint           # eslint src
```

To run a single test file:
```bash
npx vitest run tests/scheduler.test.ts
```

---

## Rules — read before writing any code

### 1. Diagnose before coding
Always identify the root cause before writing code.
State the root cause explicitly. Explain the fix. Then write the code.
Never write code to fix something not fully understood.

### 2. No over-engineering
Only build what is explicitly asked.
Do not add abstractions, patterns, or features that were not requested.
Do not refactor unrelated code while fixing a bug.
Do not add new dependencies without being asked.

### 3. Stay in scope
Only modify files relevant to the task.
Never touch `example/` when fixing library code.
Never touch library code when fixing example code.
If a task requires changes in multiple layers — list them first.

### 4. Performance is critical
This is a video player. Every render matters.
No unnecessary re-renders, no stale state, no memory leaks.
Every `bus.on()` must have a corresponding cleanup.
No `console.log` left in source code.

### 5. No hallucination
If unsure — say so. Do not invent API names or browser behaviours.
Do not claim a fix works without verifying against actual source.

---

## Architecture

Three abstraction layers — users pick whichever they need:

| Layer | Exports | What it is |
|---|---|---|
| 1 — Drop-in components | `/`, `/streaming`, `/feed`, `/playlist` | `StreamingPlayer`, `PlaylistPlayer`, `FeedPlayer` |
| 2 — Headless hooks | same entries | `useStreamingPlayer`, `usePlaylist`, `useFeed` |
| 3 — Core primitives | `./core` | `PlayerEngine`, `EventBus`, `Tech`, `AdOrchestrator`, `MidrollWatcher` |

### Core data flow

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

`PlayerEngine.attachTech()` is the **composition root** — it wires all dependencies.
`AdOrchestrator` receives `AdPodManager` via injection — does not create it.

### Adapter layer (`src/adapters/`)

- **streaming/** — single video + pre/mid/postroll
- **playlist/** — queue with auto-advance (`next/prev/goTo`)
- **feed/** — vertical-swipe feed with interleaved ads (`FeedScheduler` builds slots, `PrefetchQueue` prefetches ahead)

### Shared UI (`src/components/`)

`VideoSurface`, `ControlBar`, `AdOverlay`, `BufferingSpinner`
Used internally by drop-in components. Also importable for custom UIs.

### Where things live

| Concern | Layer | File |
|---------|-------|------|
| Video element abstraction | core | Tech.ts |
| Event communication | core | EventBus.ts |
| State machine | core | PlayerEngine.ts |
| Ad lifecycle coordination | core | AdOrchestrator.ts |
| Midroll timing | core | MidrollWatcher.ts |
| VAST XML parsing | ads | VastParser.ts |
| VAST fetching + wrapper chain | ads | VastLoader.ts |
| Ad pod sequencing | ads | AdPodManager.ts |
| Ad schedule tracking | ads | AdScheduler.ts |
| Tracking beacons | ads | BeaconFirer.ts |
| Feed slot schedule | adapters/feed | FeedScheduler.ts |
| VAST prefetching | adapters/feed | PrefetchQueue.ts |

---

## TypeScript constraints — never relax these

```json
"exactOptionalPropertyTypes": true
"noUncheckedIndexedAccess":   true
"isolatedDeclarations":       true
"strict":                     true
```

### exactOptionalPropertyTypes

```ts
// ❌ string | undefined assigned to optional prop
{ prerollUrl: config.prerollVastUrl }

// ✅ imperative builder — only set key when value exists
const cfg: AdScheduleConfig = {}
if (config.prerollVastUrl) cfg.prerollUrl = config.prerollVastUrl

// ❌ boolean | undefined to JSX prop
<VideoSurface muted={config.muted} />

// ✅ nullish coalescing
<VideoSurface muted={config.muted ?? false} />
```

### isolatedDeclarations

```ts
// ❌ shorthand return in exported function — cannot infer without cross-file analysis
export function useFeed(config: FeedConfig) {
  const { videoRef } = usePlayerEngine()
  return { videoRef }
}

// ✅ explicit return type
export interface UseFeedResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
}
export function useFeed(config: FeedConfig): UseFeedResult { ... }
```

---

## React 19 patterns — always use

```ts
// Non-reactive handlers — no stale closures
const onTime = useEffectEvent(({ currentTime, duration }) => {
  dispatch({ type: 'TIME', currentTime, duration })
})

// Concurrent-safe external state
const state = useSyncExternalStore(
  store.subscribe,
  store.getSnapshot,
  store.getServerSnapshot
)

// Conditional UI without unmounting
<Activity mode={adState.active ? 'visible' : 'hidden'}>
  <AdOverlay ... />
</Activity>
```

---

## Things that must never appear in src/

```ts
'use client'      // RSC directive — belongs in consumer app, not library
memo()            // React Compiler handles this
useCallback()     // React Compiler handles this
useMemo()         // React Compiler handles this
console.log()     // never in published source
process.env       // use import.meta.env instead
.js extensions    // moduleResolution: bundler — import './Tech' not './Tech.js'
```

---

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

`react`, `react-dom`, `react/jsx-runtime` are externalized.
`publint` validates package shape on build.

---

## Types

- `PlayerState`: `'idle' | 'loading' | 'playing' | 'paused' | 'ad' | 'buffering' | 'error' | 'ended'`
- `AdState`: `{ active, skippable, skipOffset, currentTime, podIndex, podTotal }`
- `PlayerEventMap`: all events — `play`, `pause`, `timeupdate`, `statechange`, `ad:start`, `ad:skip`, `ad:quartile`, `ad:error`, `ad:pod:ended`, …

---

## Known fragile areas

- **EventBus subscriptions** — ✅ Fixed in 0.1.7-dev. `statechange` subscription in `usePlayerEngine` was leaking on unmount; now cleaned up. Audit still required for `useAdManager`, `useControls`, `usePlaylist`, `useFeed`.
- **Safari** — `loadeddata` fallback required. `swapSrc` must listen to both `canplay` and `loadeddata`. Auto-advance needs 100ms delay after `ended`. iOS reload-after-background: ✅ Fixed — waits for `loadedmetadata` before seeking to `currentTime`.
- **Chrome** — `timeupdate` fires before `loadedmetadata` for large files. Guard against `NaN` duration in `Tech.onTime` at the source.
- **Android Chrome** — ✅ Fixed in 0.1.7-dev. `FeedPlayer` now falls back to touch events alongside pointer events. Double-fire guard (`swiped` ref) prevents concurrent fires on hybrid devices.
- **Ad blockers** — ✅ Fixed in 0.1.6. VAST fetch failure emits `ad:error` with code `900` and auto-resumes content within 300ms. `onAdError` callback fires. User never sees a black screen.
- **exactOptionalPropertyTypes** — optional props must never receive `T | undefined` directly. Use imperative builders or `?? default`.

---

## Patterns

### EventBus — always clean up

```ts
useEffect(() => {
  const offs = [
    engine.bus.on('play',  () => dispatch({ type: 'PLAY' })),
    engine.bus.on('pause', () => dispatch({ type: 'PAUSE' })),
  ]
  return () => offs.forEach(fn => fn())
}, [engine])
```

### Tech.onTime — never emit invalid data

```ts
const onTime = () => {
  const duration = this.el.duration
  if (!isFinite(duration) || duration <= 0) return
  bus.emit('timeupdate', { currentTime: this.el.currentTime, duration })
}
```

### ControlBar — guard NaN/Infinity

```ts
const safeDuration = isFinite(state.duration) && state.duration > 0
  ? state.duration : 0
const safeTime = isFinite(state.currentTime) && state.currentTime >= 0
  ? state.currentTime : 0
```

---

## Do not build (unless explicitly in task)

```
VPAID          — tracked in PLAN.md as post v1.0.0
OMID           — tracked in PLAN.md as post v1.0.0
HLS            — tracked in PLAN.md as v0.2.0
VMAP           — tracked in PLAN.md as v0.2.0
loop feature   — not yet scoped
Any new adapter, hook, or component not in the current file tree
```

---

## Branch flow

```
feature/* or fix/* → PR → develop → PR → main
```

Never push directly to `main` — branch protection is enforced.
`main` = what is on npm. Always.

---

## Current version: 0.1.6
## Roadmap: PLAN.md