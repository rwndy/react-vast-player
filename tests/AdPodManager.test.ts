// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdPodManager } from '../src/ads/AdPodManager'
import { EventBus } from '../src/core/EventBus'
import { VastError } from '../src/ads/VastError'
import type { Tech } from '../src/core/Tech'
import type { VastAd } from '../src/types'

function makeTech(overrides?: Partial<Tech>): Tech {
  return {
    swapSrc: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
    setPlaybackRate: vi.fn(),
    detachMedia: vi.fn(),
    bindEvents: vi.fn().mockReturnValue(() => {}),
    get currentTime() { return 0 },
    get duration() { return 10 },
    get paused() { return false },
    get muted() { return false },
    get volume() { return 1 },
    get playbackRate() { return 1 },
    ...overrides,
  } as unknown as Tech
}

function makeAd(overrides?: Partial<VastAd>): VastAd {
  return {
    id: 'ad-1',
    duration: 10,
    mediaFiles: [{ url: 'https://cdn.example.com/ad.mp4', mimeType: 'video/mp4', width: 640, height: 480 }],
    trackingEvents: [],
    impressionUrls: [],
    clickTrackingUrls: [],
    errorUrls: [],
    ...overrides,
  }
}

describe('AdPodManager', () => {
  let bus: EventBus
  let manager: AdPodManager

  beforeEach(() => {
    bus = new EventBus()
    manager = new AdPodManager(makeTech(), bus)
    navigator.sendBeacon = vi.fn().mockReturnValue(true)
  })

  // ad:start fires synchronously; bus.on('ended') is registered immediately after in
  // playSingle's new Promise(). Deferring via queueMicrotask lets that Promise
  // constructor run first, so the ended listener is in place before we fire.
  function onAdStart(cb: () => void): void {
    const off = bus.on('ad:start', () => { off(); queueMicrotask(cb) })
  }

  it('playPod() emits ad:start with correct metadata', async () => {
    const starts: unknown[] = []
    bus.on('ad:start', p => starts.push(p))
    onAdStart(() => bus.emit('ended'))

    await manager.playPod([makeAd()])

    expect(starts).toHaveLength(1)
    expect(starts[0]).toMatchObject({
      adId: 'ad-1',
      duration: 10,
      skippable: false,
      skipOffset: 0,
      podIndex: 0,
      podTotal: 1,
    })
  })

  it('playPod() emits ad:impression then ad:ended then ad:pod:ended', async () => {
    const events: string[] = []
    bus.on('ad:impression', () => events.push('impression'))
    bus.on('ad:ended', () => events.push('ended'))
    bus.on('ad:pod:ended', () => events.push('pod:ended'))
    onAdStart(() => bus.emit('ended'))

    await manager.playPod([makeAd()])

    expect(events).toEqual(['impression', 'ended', 'pod:ended'])
  })

  it('playPod() fires impression tracking beacons', async () => {
    const ad = makeAd({ impressionUrls: ['https://tracking.example.com/imp'] })
    onAdStart(() => bus.emit('ended'))

    await manager.playPod([ad])

    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://tracking.example.com/imp')
  })

  it('playPod() emits quartile events at 25/50/75% progress', async () => {
    const quartiles: string[] = []
    bus.on('ad:quartile', ({ quartile }) => quartiles.push(quartile))
    onAdStart(() => {
      bus.emit('timeupdate', { currentTime: 2.5, duration: 10 })
      bus.emit('timeupdate', { currentTime: 5, duration: 10 })
      bus.emit('timeupdate', { currentTime: 7.5, duration: 10 })
      bus.emit('ended')
    })

    await manager.playPod([makeAd()])

    expect(quartiles).toContain('first')
    expect(quartiles).toContain('midpoint')
    expect(quartiles).toContain('third')
    expect(quartiles).toContain('complete')
  })

  it('skip() emits ad:skip and resolves the pod', async () => {
    const events: string[] = []
    bus.on('ad:skip', () => events.push('skip'))
    onAdStart(() => manager.skip())

    await manager.playPod([makeAd()])

    expect(events).toContain('skip')
  })

  it('skip() before any ad plays is a no-op (does not throw)', () => {
    expect(() => manager.skip()).not.toThrow()
  })

  it('swapSrc failure fires error beacon (402) and throws VastError(402)', async () => {
    const failTech = makeTech({ swapSrc: vi.fn().mockRejectedValue(new Error('network error')) })
    const m = new AdPodManager(failTech, bus)
    const ad = makeAd({ errorUrls: ['https://ads.example.com/err?c=[ERRORCODE]'] })

    await expect(m.playPod([ad])).rejects.toMatchObject({ code: 402 })
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://ads.example.com/err?c=402')
  })

  it('missing mediaFiles fires fireError(403) and skips the ad without throwing', async () => {
    const ad = makeAd({ mediaFiles: [], errorUrls: ['https://ads.example.com/err?c=[ERRORCODE]'] })

    await expect(manager.playPod([ad])).resolves.toBeUndefined()
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://ads.example.com/err?c=403')
  })

  it('playPod() with two ads plays them sequentially and emits pod:ended once', async () => {
    const starts: string[] = []
    let callCount = 0
    bus.on('ad:start', ({ adId }) => {
      starts.push(adId)
      callCount++
      queueMicrotask(() => bus.emit('ended'))
    })
    const podEnded: number[] = []
    bus.on('ad:pod:ended', () => podEnded.push(1))

    await manager.playPod([makeAd({ id: 'ad-1' }), makeAd({ id: 'ad-2' })])

    expect(starts).toEqual(['ad-1', 'ad-2'])
    expect(podEnded).toHaveLength(1)
  })

  it('ad:start payload includes clickThroughUrl when present in the ad', async () => {
    const starts: unknown[] = []
    bus.on('ad:start', p => starts.push(p))
    onAdStart(() => bus.emit('ended'))

    await manager.playPod([makeAd({ clickThroughUrl: 'https://advertiser.example.com' })])

    expect((starts[0] as any).clickThroughUrl).toBe('https://advertiser.example.com')
  })

  it('ad:start payload omits clickThroughUrl when absent in the ad', async () => {
    const starts: unknown[] = []
    bus.on('ad:start', p => starts.push(p))
    onAdStart(() => bus.emit('ended'))

    await manager.playPod([makeAd()])

    expect(starts[0]).not.toHaveProperty('clickThroughUrl')
  })
})
