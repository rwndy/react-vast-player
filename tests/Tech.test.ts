import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Tech } from '../src/core/Tech'

function makeMockVideoEl(opts?: { nativeHls?: boolean }): HTMLVideoElement {
  const target = new EventTarget()
  return Object.assign(target, {
    src: '',
    muted: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    paused: true,
    readyState: 0,
    error: null,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    canPlayType: vi.fn().mockReturnValue(opts?.nativeHls ? 'maybe' : ''),
  }) as unknown as HTMLVideoElement
}

function fire(el: HTMLVideoElement, type: string): void {
  el.dispatchEvent(new Event(type))
}

describe('Tech.swapSrc', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('resolves when canplay fires', async () => {
    const el = makeMockVideoEl()
    const tech = new Tech(el)
    const p = tech.swapSrc('video.mp4')
    fire(el, 'canplay')
    await expect(p).resolves.toBeUndefined()
  })

  it('resolves when loadeddata fires (Safari fallback)', async () => {
    const el = makeMockVideoEl()
    const tech = new Tech(el)
    const p = tech.swapSrc('video.mp4')
    fire(el, 'loadeddata')
    await expect(p).resolves.toBeUndefined()
  })

  it('rejects when error fires', async () => {
    const el = makeMockVideoEl()
    const tech = new Tech(el)
    const p = tech.swapSrc('video.mp4')
    fire(el, 'error')
    await expect(p).rejects.toThrow('Tech: failed to load "video.mp4"')
  })

  it('5 concurrent swapSrc calls — only the last one resolves', async () => {
    const el = makeMockVideoEl()
    const tech = new Tech(el)

    const resolved: number[] = []
    void tech.swapSrc('url-1').then(() => resolved.push(1))
    void tech.swapSrc('url-2').then(() => resolved.push(2))
    void tech.swapSrc('url-3').then(() => resolved.push(3))
    void tech.swapSrc('url-4').then(() => resolved.push(4))
    const p5 = tech.swapSrc('url-5').then(() => resolved.push(5))

    fire(el, 'canplay')
    await p5

    expect(resolved).toEqual([5])
  })

  it('stale canplay from a superseded swapSrc is ignored', async () => {
    const el = makeMockVideoEl()
    const tech = new Tech(el)

    const resolved: string[] = []
    void tech.swapSrc('url-a').then(() => resolved.push('a'))
    const p2 = tech.swapSrc('url-b').then(() => resolved.push('b'))

    fire(el, 'canplay')
    await p2

    expect(resolved).toEqual(['b'])
    expect(resolved).not.toContain('a')
  })

  it('.m3u8 with native HLS support uses native path (Safari)', async () => {
    const el = makeMockVideoEl({ nativeHls: true })
    const tech = new Tech(el)
    const p = tech.swapSrc('https://cdn.example.com/stream.m3u8')
    fire(el, 'canplay')
    await expect(p).resolves.toBeUndefined()
    expect((el as unknown as { src: string }).src).toBe('https://cdn.example.com/stream.m3u8')
  })
})
