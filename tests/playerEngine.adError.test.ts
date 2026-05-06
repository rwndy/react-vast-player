import { describe, it, expect, vi } from 'vitest'
import { PlayerEngine } from '../src/core/PlayerEngine'

function makeVideoEl(): HTMLVideoElement {
  return {
    src: '',
    currentTime: 0,
    duration: NaN,
    paused: true,
    muted: false,
    volume: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    // Fire canplay immediately so swapSrc resolves without timers
    addEventListener: vi.fn((event: string, handler: unknown) => {
      if (event === 'canplay') queueMicrotask(() => (handler as () => void)())
    }),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement
}

describe('PlayerEngine ad:error recovery', () => {
  it('transitions to loading when ad:error fires and contentSrc is set', () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    // loadContent sets this.contentSrc synchronously, then awaits swapSrc
    engine.loadContent('https://cdn.example.com/video.mp4').catch(() => {})

    // Simulate VAST error — resumeContent() calls playContent() which calls
    // setState('loading') synchronously before hitting its first await
    engine.bus.emit('ad:error', { reason: 'Failed to fetch', vastErrorCode: 900 })

    expect(engine.state).toBe('loading')
  })

  it('does not crash or change state when ad:error fires with no contentSrc', () => {
    const engine = new PlayerEngine()
    engine.attachTech(makeVideoEl())

    // No loadContent — contentSrc is '' so resumeContent is a no-op
    engine.bus.emit('ad:error', { reason: 'VAST 403: https://ads.example.com/vast', vastErrorCode: 900 })

    expect(engine.state).toBe('idle')
  })
})
