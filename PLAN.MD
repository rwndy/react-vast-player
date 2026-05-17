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

## Current version: 0.1.6

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

### ☐ Memory leak — EventBus subscriptions not cleaned up

**Problem:** `bus.on()` calls inside `useEffect` don't always clean up when
a component unmounts mid-load (e.g. user navigates away during preroll fetch).
Over time this causes memory pressure especially in feed mode.

**Expected behaviour:** Every `bus.on()` unsubscribes on cleanup.

**Location:** Audit all hooks — `useAdManager`, `useControls`, `usePlaylist`,
`useFeed`, `useStreamingPlayer`

**Acceptance criteria:**
- [ ] Every `bus.on()` call has a corresponding cleanup
- [ ] No memory growth after 50 feed swipes in Chrome DevTools Memory tab

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

### ☐ HLS support via hls.js

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
- [ ] HLS streams play in Chrome, Firefox, Edge
- [ ] Safari uses native HLS
- [ ] VAST ads play correctly over HLS content
- [ ] Clear error if hls.js peer dep not installed

---

### ☐ VMAP parser

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
- [ ] VMAP preroll, midroll, postroll all fire correctly
- [ ] Wrapper VAST inside VMAP resolves correctly
- [ ] Falls back gracefully if VMAP fetch fails
- [ ] Unit tests for all ad break types

---

### ☐ onAdError callback + graceful content fallback

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
- [ ] Any VAST failure → content plays within 500ms
- [ ] `onAdError` callback fires with error details
- [ ] No visible interruption to the user

---

### ☐ VAST error codes — proper beacon firing

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
- [ ] Each error path fires the correct code
- [ ] `[ERRORCODE]` macro replaced in Error URL before firing
- [ ] Unit tests for each error code path

---

## 🟡 Medium — Production quality

### ☐ Keyboard shortcuts

**Shortcuts:**
| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Seek back 5s |
| `→` | Seek forward 5s |
| `m` | Toggle mute |
| `f` | Toggle fullscreen |

**Rules:**
- Disabled during ad playback (no seeking)
- No conflict with page inputs (`<input>`, `<textarea>`)
- Only active when player container is focused

**Location:** `src/hooks/useControls.ts`

**Acceptance criteria:**
- [ ] All 5 shortcuts work in streaming and playlist
- [ ] Disabled during ads
- [ ] No interference with page inputs

---

### ☐ Volume slider

**Design:**
- Desktop: mute icon → hover → slider expands (80px)
- Mobile: mute icon only (no hover on touch devices)
- Volume persists via `localStorage`

**Location:** `src/components/ControlBar.tsx`

**Acceptance criteria:**
- [ ] Slider visible on hover (desktop only)
- [ ] Volume persists across page reload
- [ ] Accessible — keyboard controllable

---

### ☐ Playback rate selector

**Rates:** `0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x`

**Rules:**
- Resets to `1x` when ad starts
- Restores user's rate when content resumes
- Not available during ad playback

**Location:** `src/core/Tech.ts` (new `setPlaybackRate()`) +
`src/components/ControlBar.tsx` (rate picker UI)

---

### ☐ Midroll position markers on seek bar

**Design:** Small amber dots on the progress rail at midroll timestamps.

**New prop:**
```tsx
<ControlBar midrollPositions={[30, 60, 120]} />  // seconds
```

**Location:** `src/components/ControlBar.tsx`

---

### ☐ Poster image support

**Problem:** `poster` field exists in `ContentItem` and config types but
is never passed to the `<video>` element.

**Fix:** One line in `VideoSurface.tsx`:
```tsx
<video poster={poster} ... />
```

**Location:** `src/components/VideoSurface.tsx`

---

### ✅ Fullscreen API — cross-browser

**Location:** `src/hooks/useControls.ts`

---

### ☐ Picture-in-Picture support

**API:**
```tsx
<StreamingPlayer pip />
```

**Implementation:** `requestPictureInPicture()` on the video element.
Show PiP button in `ControlBar`.

---

### ☐ Ad click-through

**Problem:** `clickThroughUrl` is parsed from VAST but never used.
Users cannot click on ads to learn more.

**Implementation:**
- Click on ad area → open `clickThroughUrl` in new tab
- Fire `clickTrackingUrls` beacons
- Pause video while URL is opening

**Location:** `src/components/AdOverlay.tsx`

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
v0.3.0  ── Keyboard + volume + poster + fullscreen fix + click-through
v0.4.0  ── Test coverage 80% + E2E tests + real VAST server testing
v1.0.0  ── API review + bundle audit + React Compiler verified + Storybook
```