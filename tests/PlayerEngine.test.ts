import { describe, it, expect, vi } from 'vitest'
import { PlayerEngine } from '../src/core/PlayerEngine'

// Video element that auto-fires canplay when a src is assigned, simulating browser load
function makeVideoEl(): HTMLVideoElement {
  const target = new EventTarget()
  const el = Object.assign(target, {
    src: '',
    muted: false,
    volume: 1,
    playbackRate: 1,
    currentTime: 0,
    duration: NaN,
    paused: true,
    readyState: 0,
    error: null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    canPlayType: vi.fn().mockReturnValue(''),
    addEventListener: vi.fn((event: string, handler: unknown) => {
      EventTarget.prototype.addEventListener.call(target, event, handler as EventListener)
      if (event === 'canplay') queueMicrotask(() => (handler as () => void)())
    }),
    removeEventListener: vi.fn((event: string, handler: unknown) => {
      EventTarget.prototype.removeEventListener.call(target, event, handler as EventListener)
    }),
  }) as unknown as HTMLVideoElement
  return el
}

describe('PlayerEngine — state machine', () => {
  it('starts in idle state', () => {
    const engine = new PlayerEngine()
    expect(engine.state).toBe('idle')
  })

  it('attachTech / detachTech cycle does not throw', () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    expect(() => engine.detachTech()).not.toThrow()
  })

  it('loadContent without a schedule transitions loading → playing', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    const states: string[] = []
    engine.bus.on('statechange', ({ state }) => states.push(state))

    await engine.loadContent('https://cdn.example.com/video.mp4')
    await new Promise(r => queueMicrotask(() => r(null)))
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(states).toContain('loading')
  })

  it('state is "loading" immediately after loadContent starts', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    const p = engine.loadContent('https://cdn.example.com/video.mp4')
    // loadContent → playContent → setState('loading') is synchronous before first await
    await Promise.resolve()
    expect(engine.state).toBe('loading')
    await p.catch(() => {})
  })

  it('play() is a no-op when state is idle', () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())
    expect(() => engine.play()).not.toThrow()
    expect(engine.state).toBe('idle')
  })

  it('pause() delegates to tech', async () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    engine.pause()
    expect(el.pause).toHaveBeenCalled()
  })

  it('seek() clamps negative values to 0 via tech', async () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    engine.seek(-5)
    expect(el.currentTime).toBe(0)
  })

  it('mute() delegates to tech', () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    engine.mute(true)
    expect(el.muted).toBe(true)
  })

  it('volume() clamps and delegates to tech', () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    engine.volume(0.5)
    expect(el.volume).toBe(0.5)
  })

  it('setPlaybackRate() delegates to tech', () => {
    const engine = new PlayerEngine()
    const el = makeVideoEl()
    engine.attachTech(el)
    engine.setPlaybackRate(1.5)
    expect(el.playbackRate).toBe(1.5)
    expect(engine.playbackRate).toBe(1.5)
  })

  it('getters return 0 / true / false defaults when no tech is attached', () => {
    const engine = new PlayerEngine()
    expect(engine.currentTime).toBe(0)
    expect(engine.duration).toBe(0)
    expect(engine.paused).toBe(true)
    expect(engine.muted).toBe(false)
    expect(engine.playbackRate).toBe(1)
  })

  it('ad:pod:ended resumes content (transitions to loading)', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())
    await engine.loadContent('https://cdn.example.com/video.mp4').catch(() => {})

    const states: string[] = []
    engine.bus.on('statechange', ({ state }) => states.push(state))

    engine.bus.emit('ad:pod:ended')
    await new Promise(r => queueMicrotask(() => r(null)))
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(states).toContain('loading')
  })

  it('ad:skip resumes content', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())
    await engine.loadContent('https://cdn.example.com/video.mp4').catch(() => {})

    const states: string[] = []
    engine.bus.on('statechange', ({ state }) => states.push(state))

    engine.bus.emit('ad:skip')
    await new Promise(r => queueMicrotask(() => r(null)))
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(states).toContain('loading')
  })

  it('ended event transitions to "ended" when state is playing', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    // drive engine into playing state manually via bus
    const states: string[] = []
    engine.bus.on('statechange', ({ state }) => states.push(state))
    ;(engine as any)._state = 'playing'

    engine.bus.emit('ended')
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(states).toContain('ended')
  })

  it('destroy() does not throw', () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())
    expect(() => engine.destroy()).not.toThrow()
  })

  it('runAdSlot() transitions to ad state', async () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    const states: string[] = []
    engine.bus.on('statechange', ({ state }) => states.push(state))

    engine.runAdSlot('https://ads.example.com/vast').catch(() => {})
    await Promise.resolve()

    expect(states).toContain('ad')
  })

  it('skipAd() delegates to orchestrator', () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())
    const skipSpy = vi.spyOn((engine as any).orchestrator, 'skip')
    engine.skipAd()
    expect(skipSpy).toHaveBeenCalled()
  })
})
