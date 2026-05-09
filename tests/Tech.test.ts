import { describe, it, expect, vi } from 'vitest'
import { Tech } from '../src/core/Tech'

function makeControllableEl() {
  const onceMap = new Map<string, Array<() => void>>()
  const persistMap = new Map<string, Array<() => void>>()

  const el = {
    src: '',
    paused: true,
    currentTime: 0,
    duration: NaN,
    error: null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void, opts?: { once?: boolean }) => {
      const map = opts?.once ? onceMap : persistMap
      if (!map.has(event)) map.set(event, [])
      map.get(event)!.push(handler)
    }),
    removeEventListener: vi.fn((event: string, handler: () => void) => {
      for (const map of [onceMap, persistMap]) {
        const arr = map.get(event)
        if (arr) {
          const i = arr.indexOf(handler)
          if (i !== -1) arr.splice(i, 1)
        }
      }
    }),
  } as unknown as HTMLVideoElement

  const fire = (event: string) => {
    const once = [...(onceMap.get(event) ?? [])]
    onceMap.set(event, [])
    once.forEach(h => h())
    persistMap.get(event)?.forEach(h => h())
  }

  return { el, fire }
}

describe('Tech.swapSrc', () => {
  it('resolves only the last of 5 concurrent swapSrc calls', async () => {
    const { el, fire } = makeControllableEl()
    const tech = new Tech(el)
    const resolved = new Set<number>()

    for (let i = 1; i <= 5; i++) {
      tech
        .swapSrc(`https://cdn.example.com/video${i}.mp4`)
        .then(() => resolved.add(i))
        .catch(() => {})
    }

    fire('canplay')
    await new Promise(r => setTimeout(r, 0))

    expect(resolved).toEqual(new Set([5]))
  })

  it('ignores a stale canplay event after a newer swapSrc has started', async () => {
    const { el, fire } = makeControllableEl()
    const tech = new Tech(el)
    let p1Resolved = false
    let p2Resolved = false

    tech.swapSrc('url1').then(() => { p1Resolved = true }).catch(() => {})
    tech.swapSrc('url2').then(() => { p2Resolved = true }).catch(() => {})

    fire('canplay')
    await new Promise(r => setTimeout(r, 0))

    expect(p1Resolved).toBe(false)
    expect(p2Resolved).toBe(true)
  })

  it('resolves sequential swapSrc calls independently', async () => {
    const { el, fire } = makeControllableEl()
    const tech = new Tech(el)
    const resolved: number[] = []

    const p1 = tech.swapSrc('url1').then(() => resolved.push(1))
    fire('canplay')
    await p1

    const p2 = tech.swapSrc('url2').then(() => resolved.push(2))
    fire('canplay')
    await p2

    expect(resolved).toEqual([1, 2])
  })

  it('resolves via loadeddata when canplay does not fire (Safari fallback)', async () => {
    const { el, fire } = makeControllableEl()
    const tech = new Tech(el)
    let resolved = false

    tech.swapSrc('url1').then(() => { resolved = true }).catch(() => {})

    fire('loadeddata')
    await new Promise(r => setTimeout(r, 0))

    expect(resolved).toBe(true)
  })
})
