// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadVast } from '../src/ads/VastLoader'
import { parseVast } from '../src/ads/VastParser'
import { VastError } from '../src/ads/VastError'
import { AdOrchestrator } from '../src/core/AdOrchestrator'
import { EventBus } from '../src/core/EventBus'
import type { AdPodManager } from '../src/ads/AdPodManager'

function mockFetch(impl: typeof fetch): void {
  globalThis.fetch = impl as typeof fetch
}

function makePodManager(): AdPodManager {
  return {
    playPod: vi.fn().mockResolvedValue(undefined),
    skip: vi.fn(),
  } as unknown as AdPodManager
}

const VAST_WRAPPER = (uri: string): string => `
  <VAST version="4.0">
    <Ad><Wrapper>
      <VASTAdTagURI>${uri}</VASTAdTagURI>
    </Wrapper></Ad>
  </VAST>`

const VAST_INLINE_NO_MEDIA = `
  <VAST version="4.0">
    <Ad><InLine>
      <Creatives><Creative><Linear>
        <Duration>00:00:10</Duration>
      </Linear></Creative></Creatives>
    </InLine></Ad>
  </VAST>`

describe('VAST error codes', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('301: wrapper fetch failure surfaces as VastError(301)', async () => {
    mockFetch(async (url): Promise<Response> => {
      if (String(url).includes('wrapper')) {
        return new Response(VAST_WRAPPER('https://ads.example.com/inline'), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    })
    await expect(loadVast('https://ads.example.com/wrapper')).rejects.toMatchObject({
      code: 301,
    })
  })

  it('301: wrapper fetch timeout (AbortError) surfaces as VastError(301)', async () => {
    vi.useFakeTimers()
    mockFetch(async (url, init): Promise<Response> => {
      if (String(url).includes('wrapper')) {
        return new Response(VAST_WRAPPER('https://ads.example.com/slow'), { status: 200 })
      }
      // Hang until aborted; resolve-never unless abort fires
      return await new Promise<Response>((_, reject) => {
        const signal = (init as RequestInit | undefined)?.signal
        if (signal?.aborted) {
          const e = new Error('aborted') as Error & { name: string }
          e.name = 'AbortError'
          reject(e)
          return
        }
        signal?.addEventListener('abort', () => {
          const e = new Error('aborted') as Error & { name: string }
          e.name = 'AbortError'
          reject(e)
        })
      })
    })
    const p = loadVast('https://ads.example.com/wrapper')
    // Attach the catch handler synchronously so the rejection isn't flagged as unhandled
    const assertion = expect(p).rejects.toMatchObject({ code: 301 })
    await vi.advanceTimersByTimeAsync(9_000)
    await assertion
  })

  it('303: exceeding wrapper max depth surfaces as VastError(303)', async () => {
    mockFetch(
      async (): Promise<Response> =>
        new Response(VAST_WRAPPER('https://ads.example.com/next'), { status: 200 }),
    )
    await expect(loadVast('https://ads.example.com/root')).rejects.toMatchObject({
      code: 303,
    })
  })

  it('401: parsed Ad elements but none yield usable MediaFile surfaces as VastError(401)', () => {
    expect(() => parseVast(VAST_INLINE_NO_MEDIA)).toThrowError(VastError)
    try {
      parseVast(VAST_INLINE_NO_MEDIA)
    } catch (err) {
      expect((err as VastError).code).toBe(401)
    }
  })

  it('900: root document fetch failure surfaces as VastError(900) (not 301)', async () => {
    mockFetch(async (): Promise<Response> => new Response('not found', { status: 404 }))
    await expect(loadVast('https://ads.example.com/root')).rejects.toMatchObject({
      code: 900,
    })
  })

  it('AdOrchestrator inherits VastError.code into the ad:error payload', async () => {
    const bus = new EventBus()
    const loader = vi.fn().mockRejectedValue(new VastError(303, 'too deep'))
    const orchestrator = new AdOrchestrator(makePodManager(), bus, loader)

    const errors: { reason: string; vastErrorCode: number }[] = []
    bus.on('ad:error', e => errors.push(e))

    await orchestrator.run('https://ads.example.com/vast')

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ reason: 'too deep', vastErrorCode: 303 })
  })

  it('AdOrchestrator emits 900 when a non-VastError is thrown', async () => {
    const bus = new EventBus()
    const loader = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const orchestrator = new AdOrchestrator(makePodManager(), bus, loader)

    const errors: { reason: string; vastErrorCode: number }[] = []
    bus.on('ad:error', e => errors.push(e))

    await orchestrator.run('https://ads.example.com/vast')

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ reason: 'Failed to fetch', vastErrorCode: 900 })
  })
})
