# react-vast-player — Production Roadmap

> This document tracks everything needed to reach production stability.
> Updated as features ship and bugs are fixed.

---

## How to read this

| Symbol | Meaning |
|--------|---------|
| 🔴 | Critical — breaks in production |
| 🟠 | High — required for real use |
| 🟡 | Medium — production quality |
| 🟢 | Stability — required for v1.0.0 |
| 🔵 | Post v1.0.0 |
| ✅ | Done |
| 🚧 | In progress |
| ☐ | Not started |

---

## Current version: 0.2.0

---

## 🔴 Critical — Fix before calling it stable

These will break in real production. Not edge cases.

### ✅ VAST fetch fails silently on ad blockers

**Problem:** When an ad blocker blocks the VAST request, the player hangs
on the ad slot indefinitely. The user sees a black screen with no way out.

**Expected behaviour:** VAST fetch fails → emit `ad:error` → automatically
skip to content. User never knows an ad was blocked.

**Location:** `src/ads/VastLoader.ts` + `src/core/AdOrchestrator.ts`

**Acceptance criteria:**
- [x] Ad blocker active → content plays after 300ms fallback
- [x] `onAdError` callback fires with reason
- [x] VAST error beacon fired with code `900`

---

### ✅ Memory leak — EventBus subscriptions cleaned up

**Problem:** `bus.on()` calls inside `useEffect` didn't always clean up when
a component unmounted mid-load (e.g. user navigates away during preroll fetch).
Over time this caused memory pressure especially in feed mode.

**Fix:** every `bus.on()` inside the hooks now collects its unsubscribe
function and invokes it in the `useEffect` cleanup; `PlayerEngine`,
`MidrollWatcher`, and `AdPodManager` expose explicit `detach()` /
`clearListeners()` lifecycles that the engine triggers.

**Location:** `useAdManager`, `useControls`, `usePlaylist`, `useFeed`,
`useStreamingPlayer`, `PlayerEngine.detachTech`, `MidrollWatcher.detach`,
`AdPodManager.clearListeners`.

**Acceptance criteria:**
- [x] Every `bus.on()` call has a corresponding cleanup
- [ ] No memory growth after 50 feed swipes in Chrome DevTools Memory tab *(manual test — still open)*

---

### ✅ iOS Safari — video stuck on loading after app background/foreground

**Problem:** When user switches to another app and returns, iOS Safari modifies
the `<video>` element in background — either resetting `currentTime` to 0 and
replaying from the start, or freezing/stalling the video at the current position.

**Location:** `src/core/Tech.ts` — `bindEvents()`

**Acceptance criteria:**
- [x] Background 10s → foreground → video resumes from correct position (not from 0)
- [x] Short play (~2s) → background → foreground → resumes, not frozen
- [x] Paused video → background → foreground → position correct, stays paused
- [x] Tested on real iOS device (not simulator)

---

### ✅ Android Chrome — swipe fails on some devices

**Location:** `src/adapters/feed/FeedPlayer.tsx`

**Acceptance criteria:**
- [x] Touch event fallback alongside pointer events
- [x] `swiped` ref guard prevents double-fire on hybrid devices
- [ ] Swipe tested on Android Chrome 120+ (no device available)
- [ ] Swipe tested on Samsung Internet (no device available)

---

### ✅ Tech.swapSrc race condition — full test coverage

**Location:** `src/core/Tech.ts` + `tests/Tech.test.ts`

**Acceptance criteria:**
- [x] Unit test: 5 concurrent swapSrc calls → only last one resolves
- [x] Unit test: stale canplay event ignored after newer swapSrc
- [ ] Manual test: swipe as fast as possible for 30s → correct video always plays

---

## 🟠 High — Required for production use

### ✅ HLS support via hls.js

**Problem:** Most production streaming content is HLS (`.m3u8`).
The library only supports mp4 which is rarely used in production.

**API — no breaking change:**
```bash
npm install react-vast-player hls.js
```
```tsx
// Just pass an m3u8 URL — auto-detected
<StreamingPlayer src="https://cdn.example.com/stream.m3u8" />
```

**Implementation:**
- Auto-detect `.m3u8` in `Tech.swapSrc`
- Use `hls.js` on Chrome/Firefox/Edge
- Use native HLS on Safari (no hls.js needed)
- Graceful error if hls.js not installed

**Location:** `src/core/Tech.ts` — new `swapHlsSrc()` method

**Acceptance criteria:**
- [x] HLS streams play in Chrome, Firefox, Edge (via dynamic `import('hls.js')`)
- [x] Safari uses native HLS (`canPlayType('application/vnd.apple.mpegurl')`)
- [x] VAST ads play correctly over HLS content (ad creatives stay MP4)
- [x] Clear error if hls.js peer dep not installed (`react-vast-player: HLS playback requires hls.js…`)

---

### ✅ VMAP parser

**Problem:** Real ad servers return VMAP — a single URL containing the full
ad schedule (preroll, midrolls, postroll). Nobody sends individual VAST URLs
in production. This is the #1 missing feature for real ad ops integration.

**API:**
```tsx
<StreamingPlayer
  src="https://cdn.example.com/video.mp4"
  vmapUrl="https://ads.example.com/vmap"
/>
```

**Implementation:**
- `src/ads/VmapParser.ts` — XML → `AdScheduleConfig`
- `src/ads/VmapLoader.ts` — fetch + parse
- Wire into `useStreamingPlayer` and `usePlaylist`

**Location:** `src/ads/`

**Acceptance criteria:**
- [x] VMAP preroll, midroll, postroll all fire correctly (start/end/HH:MM:SS offsets)
- [x] Wrapper VAST inside VMAP resolves correctly (reuses `loadVast` at playback time)
- [x] Falls back gracefully if VMAP fetch fails (emits `ad:error` and plays content-only)
- [x] Unit tests for all ad break types (`tests/vmapParser.test.ts`, `tests/vmapLoader.test.ts`)

**Not yet supported** (tracked for a later release):
- Inline `<vmap:VASTAdData>` (only `<vmap:AdTagURI>` references)
- Percentage time offsets (`50%` requires content duration)

---

### ✅ onAdError callback + graceful content fallback

**Problem:** If VAST fails for any reason (network, empty response, parse error,
ad blocker), the library throws and leaves the user on a black screen.

**API:**
```tsx
<StreamingPlayer
  src="video.mp4"
  prerollVastUrl="..."
  onAdError={(err) => console.warn('ad failed:', err)}
  // content auto-resumes — no configuration needed
/>
```

**Acceptance criteria:**
- [x] Any VAST failure → content plays within 500ms (`tests/playerEngine.adError.test.ts`)
- [x] `onAdError` callback fires with error details (`{ reason, vastErrorCode }`)
- [x] No visible interruption to the user (PlayerEngine auto-resumes on `ad:error`)

---

### ✅ VAST error codes — proper beacon firing

**Problem:** Library throws generic errors. VAST spec defines numeric error
codes that must be sent to the `<Error>` URL so ad servers know what failed.

**Error codes to implement:**
| Code | Meaning |
|------|---------|
| 301 | Wrapper timeout |
| 303 | Wrapper limit reached (max depth) |
| 401 | File not found |
| 402 | Media file timeout |
| 403 | No supported media file |
| 900 | Undefined error |

**Location:** `src/ads/BeaconFirer.ts` + `src/ads/VastLoader.ts` + `src/ads/AdPodManager.ts`

**Acceptance criteria:**
- [x] Each error path fires the correct code (`src/ads/VastError.ts` + throw sites in VastLoader/VastParser/AdPodManager)
- [x] `[ERRORCODE]` macro replaced in Error URL before firing (`BeaconFirer.fireError`)
- [x] Unit tests for each error code path (`tests/vastErrorCodes.test.ts`)

---

## 🟡 Medium — Production quality

### ✅ Keyboard shortcuts

**Shortcuts:**
| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Seek back 5s |
| `→` | Seek forward 5s |
| `m` | Toggle mute |
| `f` | Toggle fullscreen |

**Location:** `src/hooks/useControls.ts`

**Acceptance criteria:**
- [x] All 5 shortcuts work in streaming and playlist
- [x] Disabled during ads
- [x] No interference with page inputs

---

### ✅ Volume slider

**Design:**
- Desktop: mute icon → hover → slider expands (80px)
- Mobile: mute icon only (no hover on touch devices)
- Volume persists via `localStorage` (`rvp:volume`)

**Location:** `src/components/ControlBar.tsx`, `src/hooks/useControls.ts`

**Acceptance criteria:**
- [x] Slider visible on hover (desktop only, `(hover: hover)` media query)
- [x] Volume persists across page reload
- [x] Accessible — keyboard controllable

---

### ✅ Playback rate selector

**Rates:** `0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x`

**Location:** `src/core/Tech.ts` + `src/components/ControlBar.tsx` + `src/hooks/useControls.ts`

**Acceptance criteria:**
- [x] Rate selector visible and functional
- [x] Resets to `1x` on ad start, restores user rate when content resumes
- [x] `setPlaybackRate` / `playbackRate` added to `IPlaybackControl`, `Tech`, `PlayerEngine`

---

### ✅ Midroll position markers on seek bar

**Design:** Small amber dots on the progress rail at midroll timestamps.

**Location:** `src/components/ControlBar.tsx`

**Acceptance criteria:**
- [x] Dots appear at correct positions for `midrollVastUrls` timestamps
- [x] Auto-wired from `StreamingPlayer` and `PlaylistPlayer` config

---

### ✅ Poster image support

**Location:** `src/components/VideoSurface.tsx`

**Acceptance criteria:**
- [x] `poster` prop passed through to `<video>` element
- [x] `StreamingPlayer` uses `config.poster`, `PlaylistPlayer` uses `currentItem.poster`

---

### ✅ Fullscreen API — cross-browser

**Location:** `src/hooks/useControls.ts`

---

### ✅ Picture-in-Picture support

**API:**
```tsx
<StreamingPlayer pip />
```

**Location:** `src/hooks/usePip.ts`, `src/components/ControlBar.tsx`

**Acceptance criteria:**
- [x] PiP button appears when `pip` prop is set
- [x] `pipActive` state tracked via `enterpictureinpicture` / `leavepictureinpicture` events
- [x] `pip` prop added to `StreamingConfig` and `PlaylistConfig`

---

### ✅ Ad click-through

**Implementation:**
- Click on **AD badge** only (not entire video) → opens `clickThroughUrl` in new tab
- Fires `clickTrackingUrls` beacons, emits `ad:click` on bus
- Ad continues playing uninterrupted (pause-on-click is unreliable across browsers)

**Location:** `src/components/AdOverlay.tsx`, `StreamingPlayer.tsx`, `PlaylistPlayer.tsx`

**Acceptance criteria:**
- [x] AD badge is the only clickable area (not the entire video)
- [x] `clickThroughUrl` + `clickTrackingUrls` surfaced through `AdState` via `ad:start` payload
- [x] Ad keeps playing while user is on advertiser's page

---

### ✅ Controls auto-hide (YouTube-style)

**Behaviour:**
- Controls fade out after 3s of inactivity while playing
- Show immediately on mousemove, mouseenter, touchstart, keydown
- Always visible when paused / idle / loading
- Cursor hidden when controls are hidden (playing + inactive)
- Smooth `opacity 0.3s ease` transition

**Location:** `src/hooks/useControlsVisibility.ts`

**Acceptance criteria:**
- [x] Controls hide after 3s during playback
- [x] Controls show immediately on any activity
- [x] Cursor hidden when controls are hidden
- [x] Applied to `StreamingPlayer` and `PlaylistPlayer`

---

## 🟢 Stability — Required for v1.0.0

### ☐ Test coverage ≥ 80% on core/ and ads/

**Current state:**
- `FeedScheduler` — ✅ covered
- `AdScheduler` — ✅ covered
- Everything else — 0%

**Files to cover:**
- `src/core/EventBus.ts`
- `src/core/Tech.ts`
- `src/core/PlayerEngine.ts`
- `src/core/AdOrchestrator.ts`
- `src/core/MidrollWatcher.ts`
- `src/ads/VastParser.ts`
- `src/ads/VastLoader.ts`
- `src/ads/AdPodManager.ts`
- `src/ads/BeaconFirer.ts`

**Setup:**
```bash
npm install --save-dev @vitest/coverage-v8
```
```json
{ "test:coverage": "vitest run --coverage" }
```

---

### ☐ E2E tests with Playwright

**Scenarios to cover:**
- Preroll plays → content plays → midroll fires
- Ad skip after skipOffset
- Feed swipe navigation (next/prev)
- Playlist auto-advance
- VAST failure → content fallback

**Location:** `tests/e2e/`

---

### ☐ Real VAST server testing

**Test against:**
- Google IMA sample tags ✅ (already used in example)
- SpotX
- FreeWheel
- Xandr

Each returns slightly different XML. Parser must handle all variants.

---

### ☐ Bundle size audit

**Target:** < 50KB gzipped for `dist/index.js`

**Tools:**
```bash
npx bundlephobia react-vast-player
npx size-limit
```

---

### ☐ Eliminate all `as any`

**Current violations:**
- `src/hooks/useControls.ts` — `player as any` to access `bus`
- `src/core/Tech.ts` — `window as any` for webkit AudioContext

**Fix:** Proper type guards and interface extensions instead of casting.

---

### ☐ API stability review

Before declaring `v1.0.0`:
- Audit every public export in `src/index.ts`
- Mark experimental APIs with `@experimental` JSDoc
- Remove anything not confident in
- Document every breaking change since `0.1.0`

**Rule:** After `v1.0.0`, every breaking change requires a major version bump
and a migration guide. Take this review seriously.

---

### ☐ React 19 Compiler compatibility

Run with `babel-plugin-react-compiler` and confirm:
- No rules-of-hooks violations
- No unexpected memoization side effects
- All `useEffectEvent` usage is correct

---

### ☐ Storybook

**Stories to create:**
- `VideoSurface` — with/without poster
- `AdOverlay` — skippable, non-skippable, pod progress
- `ControlBar` — all states (playing, paused, buffering, ad mode)
- `BufferingSpinner` — visible/hidden

---

## 🔵 Post v1.0.0

```
☐ DASH support (dash.js peer dep)
☐ VPAID 2.0 — JS-executed interactive ads
☐ OMID — Open Measurement viewability SDK
☐ React Native adapter
☐ Chromecast support
☐ Airplay support
☐ Subtitle / caption track support (WebVTT)
☐ Quality selector (for HLS/DASH streams)
☐ Thumbnail preview on seek bar hover
☐ Analytics hook — fill rate, completion rate, skip rate, load time
☐ Ad frequency capping — don't show same ad twice per session
☐ Companion ads — banner ads outside the player
```

---

## Version milestone targets

```
v0.1.x  ── Fix all 🔴 Critical bugs
v0.2.0  ── HLS + VMAP + onAdError + VAST error codes
v0.3.0  ── Keyboard + volume + poster + fullscreen + click-through + PiP + rate + auto-hide ✅
v0.4.0  ── Test coverage 80% + E2E tests + real VAST server testing
v1.0.0  ── API review + bundle audit + React Compiler verified + Storybook
```