# react-vast-player

A mode-agnostic React video engine with first-class VAST ad support. Build streaming players, playlists, and short-form feeds — all with preroll, midroll, and postroll advertising baked in.

[![npm version](https://badge.fury.io/js/react-vast-player.svg)](https://badge.fury.io/js/react-vast-player)

## Features

- **Three player modes** — Streaming, Playlist, and Feed (shorts-style)
- **Full VAST 2–4 support** — preroll, midroll, postroll, skippable ads, quartile tracking
- **Three levels of abstraction** — drop-in components, headless hooks, or raw core primitives
- **TypeScript-first** — strict types throughout with full type exports
- **React 19+** compatible
- **Tree-shakeable** — ESM + CJS dual output, zero side effects

## Installation

```bash
npm install react-vast-player
# or
yarn add react-vast-player
# or
pnpm add react-vast-player
```

**Requirements:** React >= 19.0.0

---

## Quick Start

### Streaming Player

Single video with pre/mid/postroll ads.

```tsx
import { StreamingPlayer } from 'react-vast-player'

export function MyPlayer() {
  return (
    <StreamingPlayer
      src="https://example.com/video.mp4"
      poster="https://example.com/poster.jpg"
      prerollVastUrl="https://ads.example.com/vast.xml"
      midrollVastUrls={[{ time: 30, url: 'https://ads.example.com/mid.xml' }]}
      postrollVastUrl="https://ads.example.com/post.xml"
      autoplay
      muted
      style={{ width: '100%', height: 600 }}
      onPlay={(state, config) => console.log('playing', state)}
    />
  )
}
```

### Playlist Player

Queue of videos, each with its own preroll ad.

```tsx
import { PlaylistPlayer } from 'react-vast-player'

const queue = [
  { id: '1', src: 'ep1.mp4', title: 'Episode 1', prerollVastUrl: 'vast.xml' },
  { id: '2', src: 'ep2.mp4', title: 'Episode 2', prerollVastUrl: 'vast.xml' },
]

export function MyPlaylist() {
  return (
    <PlaylistPlayer
      queue={queue}
      autoAdvance
      autoplay
      muted
      style={{ width: '100%', height: 600 }}
      renderItem={(item, index, total) => (
        <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff' }}>
          {item.title} — {index + 1} / {total}
        </div>
      )}
    />
  )
}
```

### Feed Player

Vertical swipe feed (TikTok / Reels style) with interleaved VAST ads.

```tsx
import { FeedPlayer } from 'react-vast-player'

const items = [
  { id: '1', src: 'clip1.mp4', title: 'Clip A' },
  { id: '2', src: 'clip2.mp4', title: 'Clip B' },
  { id: '3', src: 'clip3.mp4', title: 'Clip C' },
]

export function MyFeed() {
  return (
    <FeedPlayer
      items={items}
      vastUrls={['https://ads.example.com/vast.xml']}
      adInterval={2}
      autoplay
      muted
      style={{ width: '100%', height: '100vh' }}
      renderItem={(slot) =>
        slot.type === 'content' ? (
          <div style={{ position: 'absolute', bottom: 60, left: 16, color: '#fff' }}>
            {slot.item.title}
          </div>
        ) : null
      }
    />
  )
}
```

---

## API Reference

### Abstraction Layers

The library is intentionally layered. Pick the level that matches how much control you need.

| Layer | Exports | When to use |
|-------|---------|-------------|
| **Drop-in components** | `StreamingPlayer`, `PlaylistPlayer`, `FeedPlayer` | Fully styled, works out of the box |
| **Headless hooks** | `useStreamingPlayer`, `usePlaylist`, `useFeed` | Custom UI, same logic |
| **Core primitives** | `PlayerEngine`, `AdOrchestrator`, `EventBus`, … | Advanced / non-React use cases |

### Sub-entry points

```ts
import { PlayerEngine } from 'react-vast-player/core'
import { StreamingPlayer, useStreamingPlayer } from 'react-vast-player/streaming'
import { FeedPlayer, useFeed } from 'react-vast-player/feed'
import { PlaylistPlayer, usePlaylist } from 'react-vast-player/playlist'
```

---

## Drop-in Components

### `<StreamingPlayer>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Video URL **(required)** |
| `poster` | `string` | — | Poster image URL |
| `prerollVastUrl` | `string` | — | VAST URL to play before content |
| `midrollVastUrls` | `{ time: number; url: string }[]` | — | VAST URLs at specific timestamps (seconds) |
| `postrollVastUrl` | `string` | — | VAST URL to play after content ends |
| `autoplay` | `boolean` | `false` | Autoplay on mount |
| `muted` | `boolean` | `false` | Start muted |
| `loop` | `boolean` | `false` | Loop content |
| `className` | `string` | — | Root element class |
| `style` | `CSSProperties` | — | Root element style |
| `renderControls` | `(api) => ReactNode` | — | Override the default control bar |
| `onPlay` | `(state, config) => void` | — | Fires when playback starts |
| `onPause` | `(state, config) => void` | — | Fires when playback pauses |
| `onStop` | `(state, config) => void` | — | Fires when playback stops |
| `onSeek` | `(time, state, config) => void` | — | Fires on seek |
| `onStateChange` | `(state, config) => void` | — | Fires on any state transition |

### `<PlaylistPlayer>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `queue` | `QueueItem[]` | — | Ordered list of videos **(required)** |
| `autoAdvance` | `boolean` | `false` | Move to next item when current ends |
| `autoplay` | `boolean` | `false` | Autoplay on mount |
| `muted` | `boolean` | `false` | Start muted |
| `midrollVastUrls` | `{ time: number; url: string }[]` | — | Midrolls applied to every item |
| `className` | `string` | — | |
| `style` | `CSSProperties` | — | |
| `renderItem` | `(item, index, total) => ReactNode` | — | Custom overlay per item |
| `onPlay` / `onPause` / `onStateChange` … | same as `StreamingPlayer` | | |

**QueueItem**

```ts
interface QueueItem {
  id: string
  src: string
  poster?: string
  title?: string
  duration?: number
  prerollVastUrl?: string
}
```

### `<FeedPlayer>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ContentItem[]` | — | Feed content **(required)** |
| `vastUrls` | `string[]` | — | Pool of VAST URLs to cycle through |
| `adInterval` | `number` | — | Insert an ad every N content items |
| `autoplay` | `boolean` | `false` | |
| `muted` | `boolean` | `false` | |
| `className` | `string` | — | |
| `style` | `CSSProperties` | — | |
| `renderItem` | `(slot: FeedSlot) => ReactNode` | — | Custom overlay. `slot.type` is `'content'` or `'ad'` |
| `onPlay` / `onPause` / `onStateChange` … | same as `StreamingPlayer` | | |

**ContentItem**

```ts
interface ContentItem {
  id: string
  src: string
  poster?: string
  title?: string
  duration?: number
}
```

---

## Headless Hooks

Use these when you need full control over the UI while keeping all the VAST and playback logic.

### `useStreamingPlayer(config)`

```tsx
import { useStreamingPlayer, VideoSurface, ControlBar, AdOverlay } from 'react-vast-player'

function CustomPlayer() {
  const api = useStreamingPlayer({
    src: 'https://example.com/video.mp4',
    prerollVastUrl: 'https://ads.example.com/vast.xml',
  })

  return (
    <div ref={api.containerRef} style={{ position: 'relative', width: '100%', height: 600 }}>
      <VideoSurface ref={api.videoRef} />
      {api.adState.active && (
        <AdOverlay adState={api.adState} onSkip={api.skipAd} />
      )}
      <ControlBar
        state={api.controls.state}
        onPlay={api.controls.play}
        onPause={api.controls.pause}
        onSeek={api.controls.seek}
        onToggleMute={api.controls.toggleMute}
        onToggleFullscreen={api.controls.toggleFullscreen}
        disabled={api.adState.active}
      />
    </div>
  )
}
```

**Returns: `UseStreamingPlayerResult`**

| Field | Type | Description |
|-------|------|-------------|
| `videoRef` | `RefObject<HTMLVideoElement>` | Attach to `<VideoSurface>` |
| `engineRef` | `RefObject<PlayerEngine>` | Access the raw engine |
| `playerState` | `PlayerState` | Current player state string |
| `adState` | `AdState` | Current ad state |
| `controls` | `UseControlsResult` | Play/pause/seek/volume/fullscreen |
| `skipAd` | `() => void` | Skip the active ad |
| `containerRef` | `RefObject<HTMLDivElement>` | Attach to wrapper for fullscreen |

---

### `usePlaylist(config)`

```tsx
const api = usePlaylist({ queue, autoAdvance: true, autoplay: true })

// Navigate
api.next()
api.prev()
api.goTo(2)

// Current item info
api.currentItem   // QueueItem | undefined
api.currentIndex  // number
api.totalItems    // number
```

**Returns: `UsePlaylistResult`** — all fields from `useStreamingPlayer`, plus:

| Field | Type | Description |
|-------|------|-------------|
| `currentItem` | `QueueItem \| undefined` | Currently playing item |
| `currentIndex` | `number` | Zero-based index |
| `totalItems` | `number` | Queue length |
| `next` | `() => void` | Advance to next item |
| `prev` | `() => void` | Go to previous item |
| `goTo` | `(index: number) => void` | Jump to index |

---

### `useFeed(config)`

```tsx
const api = useFeed({ items, vastUrls: ['vast.xml'], adInterval: 3 })

// Swipe navigation
api.swipeNext()
api.swipePrev()
api.goTo(4)

// Current slot
api.currentSlot   // FeedSlot | undefined — { type: 'content', item } | { type: 'ad', vastUrl }
api.currentIndex  // position in the full schedule (content + ad slots)
api.totalSlots    // total slots in the schedule
```

**Returns: `UseFeedResult`** — all fields from `useStreamingPlayer`, plus:

| Field | Type | Description |
|-------|------|-------------|
| `currentSlot` | `FeedSlot \| undefined` | Content or ad slot |
| `currentIndex` | `number` | Position in full schedule |
| `totalSlots` | `number` | Total slots |
| `swipeNext` | `() => void` | Go to next slot |
| `swipePrev` | `() => void` | Go to previous slot |
| `goTo` | `(index: number) => void` | Jump to slot index |

---

### `useControls(engineRef)`

Low-level hook for playback controls, used internally by all higher-level hooks.

```ts
interface UseControlsResult {
  state: ControlsState
  containerRef: RefObject<HTMLDivElement>
  play: () => void
  pause: () => void
  seek: (t: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
}

interface ControlsState {
  playing: boolean
  currentTime: number
  duration: number
  buffering: boolean
  volume: number
  muted: boolean
  fullscreen: boolean
}
```

---

## Shared UI Components

These are the building blocks used inside drop-in components. Import and compose them in headless setups.

### `<VideoSurface>`

A pre-configured `<video>` element.

```tsx
<VideoSurface
  ref={videoRef}
  muted
  autoPlay
  playsInline
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

### `<ControlBar>`

```tsx
<ControlBar
  state={controls.state}
  onPlay={controls.play}
  onPause={controls.pause}
  onSeek={controls.seek}
  onToggleMute={controls.toggleMute}
  onToggleFullscreen={controls.toggleFullscreen}
  disabled={adState.active}
/>
```

Features: progress bar, play/pause button, timestamp, mute toggle, fullscreen toggle.

### `<AdOverlay>`

Renders the "AD" badge and optional skip button over the video.

```tsx
<AdOverlay
  adState={adState}
  onSkip={skipAd}
  onClickAd={() => window.open(clickThroughUrl)}
/>
```

### `<BufferingSpinner>`

```tsx
<BufferingSpinner
  visible={playerState === 'buffering'}
  size={48}
  color="#fff"
/>
```

---

## Types

### `PlayerState`

```ts
type PlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ad'
  | 'buffering'
  | 'error'
  | 'ended'
```

### `AdState`

```ts
interface AdState {
  active: boolean      // Is an ad currently playing?
  skippable: boolean   // Can the user skip?
  skipOffset: number   // Seconds until skip is available
  currentTime: number  // Current position within the ad
  podIndex: number     // Index within the current ad pod
  podTotal: number     // Total ads in the current pod
}
```

### `PlayerEventMap`

Use `engineRef.current?.bus.on(event, handler)` to subscribe to low-level events.

```ts
engine.bus.on('play', () => {})
engine.bus.on('pause', () => {})
engine.bus.on('timeupdate', ({ currentTime, duration }) => {})
engine.bus.on('statechange', ({ state }) => {})
engine.bus.on('ad:start', ({ adId, duration, skippable, skipOffset, podIndex, podTotal }) => {})
engine.bus.on('ad:impression', () => {})
engine.bus.on('ad:quartile', ({ quartile }) => {})  // 'first' | 'midpoint' | 'third' | 'complete'
engine.bus.on('ad:skip', () => {})
engine.bus.on('ad:ended', () => {})
engine.bus.on('ad:pod:ended', () => {})
engine.bus.on('ad:click', ({ url }) => {})
engine.bus.on('ad:error', ({ reason, vastErrorCode }) => {})
engine.bus.on('error', ({ code, message, fatal }) => {})
```

---

## Core Primitives

For advanced use cases — custom frameworks, non-React environments, or building your own abstraction.

```ts
import {
  PlayerEngine,
  EventBus,
  Tech,
  AdOrchestrator,
  MidrollWatcher,
  AdPodManager,
  AdScheduler,
  loadVast,
  bestMediaFile,
  parseVast,
} from 'react-vast-player/core'
```

### `PlayerEngine`

The central orchestrator. Wraps a `<video>` element and exposes `IPlaybackControl` and `IAdControl`.

```ts
const engine = new PlayerEngine(videoElement)
await engine.loadContent('https://example.com/video.mp4', adSchedule)
engine.play()
engine.seek(30)
engine.skipAd()
engine.bus.on('statechange', ({ state }) => console.log(state))
```

### `loadVast(url)` / `parseVast(xml)`

```ts
import { loadVast, parseVast, bestMediaFile } from 'react-vast-player'

const adPod = await loadVast('https://ads.example.com/vast.xml')
// or
const adPod = parseVast(xmlString)

const best = bestMediaFile(adPod[0].mediaFiles)
console.log(best.url)
```

### `buildFeedSchedule(items, vastUrls, adInterval)`

Build a mixed content+ad schedule for the feed:

```ts
import { buildFeedSchedule, isAdSlot, isContentSlot } from 'react-vast-player'

const schedule = buildFeedSchedule(items, vastUrls, 3)
schedule.forEach(slot => {
  if (isContentSlot(slot)) console.log('content:', slot.item.src)
  if (isAdSlot(slot)) console.log('ad:', slot.vastUrl)
})
```

---

## License

MIT
