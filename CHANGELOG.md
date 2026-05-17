# Changelog

All notable changes to react-vast-player are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.1.7] — 2026-05-17

### Fixed
- iOS Safari — video resets to beginning or freezes after returning from background. Added `visibilitychange` handler in `Tech.bindEvents` that saves `currentTime` and playing state on hide; on foreground, detects position reset, media loss (`readyState < 3`), or frozen-while-playing and restores. If media is lost, reloads and waits for `loadedmetadata` before seeking back
- Android Chrome — swipe gesture unresponsive on devices that fire both pointer and touch events. `FeedPlayer` now registers `onTouchStart`/`onTouchEnd` alongside `onPointerDown`/`onPointerUp`; `swiped` ref prevents double-fire on hybrid devices. Changed `touchAction` to `'none'` to prevent browser scroll interference
- `useFeed` — `config.muted` prop changes were not propagating to the engine at runtime. Added `syncMuted` effect that calls `engine.mute()` whenever `config.muted` changes
- Fullscreen — webkit-prefixed APIs now used for cross-browser and iOS Safari compatibility: `webkitfullscreenchange` event, `webkitFullscreenElement` detection, `webkitRequestFullscreen` / `webkitEnterFullscreen` fallbacks in `toggleFullscreen`
- `useFeed` — removed stray `console.log` calls left in `onPlayEvent` and `onStateChangeEvent`

### Added
- `FeedPlayer` — mouse wheel navigation on desktop with 800ms cooldown to prevent rapid-fire video skipping
- Tests — `Tech.swapSrc` race conditions: 5 concurrent calls resolve only the last; stale `canplay` event after a newer `swapSrc` is discarded

---

## [0.1.6] — 2026-05-07

### Fixed
- VAST fetch fails silently on ad blockers — now emits `ad:error` and resumes content automatically

---

## [0.1.5] — 2026-05-05

### Fixed
- Safari — `loadedmetadata` fires after `timeupdate` for large files causing `--:--` duration display. Added `onMetadata` listener in `Tech.bindEvents` to emit valid duration immediately
- Chrome — `timeupdate` fires before `loadedmetadata` with `NaN` duration. Guard added at source in `Tech.onTime` — never emits invalid duration downstream
- Playlist auto-advance — stale duration from previous video showing on seek bar after auto-advance. Added `RESET` action in `useControls` on `statechange → loading`
- `ControlBar` — seek bar shows `--:-- / --:--` and is disabled during video transitions instead of showing stale duration

### Added
- `swipeDirection` prop on `FeedPlayer` — supports `'vertical'` (default) and `'horizontal'`
- `onPlay`, `onPause`, `onStop`, `onSeek`, `onStateChange`, `onAdStart`, `onAdEnd` lifecycle callbacks on `FeedPlayer`

---

## [0.1.4] — 2026-05-04

### Fixed
- Safari — playlist stuck on loading. Added `loadingRef` guard to prevent concurrent `loadContent` calls, `currentItem?.id` dependency instead of object reference, 100ms delay on auto-advance after `ended`
- `Tech.swapSrc` — added `loadeddata` event fallback for Safari, 5s timeout for heavy files, version counter to prevent stale resolvers on fast swipes, set `src` before `load()` to fix Safari canplay timing
- `useControls` — `NaN`/`Infinity` guard in `TIME` reducer, `RESET` action on `statechange → loading`
- `ControlBar` — guard against `NaN`/`Infinity` duration, `isLoading` state shows `--:--` during transitions

---

## [0.1.3] — 2026-05-04

### Fixed
- Duplicate React instance error (`Cannot read properties of null (reading 'useRef')`) — resolved by adding `dedupe: ['react', 'react-dom', 'react/jsx-runtime']` in Vite config and marking `react/jsx-runtime` as external in tsdown
- Example app — switched from `file:..` to npm version of `react-vast-player` to prevent duplicate React

---

## [0.1.2] — 2026-05-03

### Fixed
- Example app `vite.config.ts` — alias pointing to `../dist/index.js` with `dedupe` to prevent duplicate React
- `package.json` repository URL format — changed to `git+https://` prefix as required by publint

---

## [0.1.1] — 2026-05-03

### Fixed
- `player.types.ts` — removed self-import of `PlayerError` from its own file causing circular dependency
- `PlayerEngine.setSchedule` — midroll `timeupdate` listener was never cleaned up, causing duplicate listeners on repeated calls. Fixed with `unbindMidroll` ref
- `StreamingPlayer.tsx` — `onSkip` was wired to `controls.toggleMute` instead of `skipAd`
- `useFeed.ts` — `useCallback` called inside return object literal violating Rules of Hooks. Moved to named constants before return
- `VastParser.ts` — `exactOptionalPropertyTypes` violations on `title`, `skipOffset`, `clickThroughUrl` — fixed with `optStr`, `optNum`, `optPosNum` helpers that omit keys instead of assigning `undefined`
- `AdPodManager.ts` — `podIndex` and `podTotal` were private with no way to read them. Now emitted on `ad:start` event payload
- `useAdManager.ts` — updated to read `podIndex` and `podTotal` from `ad:start` event
- All source files — removed `'use client'` directive (RSC boundary belongs in consumer app, not library)
- All hooks — added explicit return type interfaces for `isolatedDeclarations` compatibility (`UseStreamingPlayerResult`, `UseFeedResult`, `UsePlaylistResult`)
- All adapters — removed `.js` extensions from imports (`moduleResolution: bundler` handles resolution)
- `VideoSurface.tsx` — boolean props typed as `boolean | undefined` so consumers can pass `config.muted` directly without `?? false`
- `StreamingPlayer`, `FeedPlayer`, `PlaylistPlayer` — `muted` and `autoPlay` props use `?? false` to satisfy `exactOptionalPropertyTypes`
- `useControls.ts` — removed `useCallback`, `memo` — React Compiler handles memoization
- `AdOverlay.tsx`, `ControlBar.tsx`, `BufferingSpinner.tsx` — removed `memo` wrappers
- `Tech.resumeAudio` — fixed audio unlock after muted autoplay on iOS Safari using AudioContext resume + pause/seek/play cycle

### Changed
- `AdOrchestrator` — now receives `AdPodManager` via constructor injection (DIP) instead of creating it internally
- `PlayerEngine` — midroll listening extracted to `MidrollWatcher` (SRP), implements `IPlaybackControl` and `IAdControl` interfaces (ISP)
- `useControls` — depends on `IPlaybackControl` interface instead of full `PlayerEngine` (ISP)
- `FeedScheduler` — moved from `src/feed/` to `src/adapters/feed/`
- `tsdown.config.ts` — replaced `tsup` which is no longer maintained

---

## [0.1.0] — 2026-05-03

### Added
- Initial release
- `StreamingPlayer` — long-form VOD and live with preroll, midroll, postroll VAST support
- `FeedPlayer` — swipeable short-form feed with in-slot ad injection every N videos
- `PlaylistPlayer` — queue-based auto-advance player with per-item preroll
- `useStreamingPlayer`, `useFeed`, `usePlaylist` — headless hooks for custom UI
- `usePlayerEngine`, `useAdManager`, `useControls` — shared React hooks
- `VideoSurface`, `AdOverlay`, `ControlBar`, `BufferingSpinner` — shared components
- `PlayerEngine` — mode-agnostic state machine
- `EventBus` — typed pub/sub with `PlayerEventMap`
- `Tech` — `HTMLVideoElement` abstraction with single `<video>` src-swap pattern
- `AdOrchestrator` — VAST lifecycle coordinator
- `MidrollWatcher` — timestamp-based midroll scheduling
- `AdPodManager` — sequential ad pod playback
- `AdScheduler` — preroll/midroll/postroll slot tracking
- `VastParser` — VAST 3.0 XML → `VastAd[]`
- `VastLoader` — VAST fetch with wrapper chain resolution (max 5 deep) and 8s timeout
- `BeaconFirer` — `sendBeacon` with `Image()` fallback
- `FeedScheduler` — pure `buildFeedSchedule()` function
- `PrefetchQueue` — VAST promise cache, prefetches 2 slots ahead
- Full TypeScript support with `exactOptionalPropertyTypes`, `isolatedDeclarations`, `noUncheckedIndexedAccess`
- React 19.2 — `useEffectEvent`, `Activity`, `useSyncExternalStore`
- SOLID architecture — SRP, OCP, ISP, DIP applied throughout
- Tree-shakeable ESM + CJS dual output via tsdown
- MIT license