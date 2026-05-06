import { describe, it, expect, vi } from 'vitest'
import { AdOrchestrator } from '../src/core/AdOrchestrator'
import { EventBus } from '../src/core/EventBus'
import type { AdPodManager } from '../src/ads/AdPodManager'

function makePodManager(): AdPodManager {
  return { playPod: vi.fn().mockResolvedValue(undefined), skip: vi.fn() } as unknown as AdPodManager
}

describe('AdOrchestrator.run', () => {
  it('emits ad:error with code 900 when fetch throws a network error', async () => {
    const bus = new EventBus()
    const loader = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const orchestrator = new AdOrchestrator(makePodManager(), bus, loader)

    const errors: { reason: string; vastErrorCode: number }[] = []
    bus.on('ad:error', e => errors.push(e))

    await orchestrator.run('https://ads.example.com/vast')

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ reason: 'Failed to fetch', vastErrorCode: 900 })
  })

  it('emits ad:error with code 900 when VAST returns no ads', async () => {
    const bus = new EventBus()
    const loader = vi.fn().mockResolvedValue([])
    const orchestrator = new AdOrchestrator(makePodManager(), bus, loader)

    const errors: { reason: string; vastErrorCode: number }[] = []
    bus.on('ad:error', e => errors.push(e))

    await orchestrator.run('https://ads.example.com/vast')

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ reason: 'Empty VAST response', vastErrorCode: 900 })
  })

  it('does not emit ad:error when ads load and play successfully', async () => {
    const bus = new EventBus()
    const fakeAd = { mediaFiles: [], skipOffset: -1, duration: 30 }
    const loader = vi.fn().mockResolvedValue([fakeAd])
    const orchestrator = new AdOrchestrator(makePodManager(), bus, loader)

    const errors: unknown[] = []
    bus.on('ad:error', e => errors.push(e))

    await orchestrator.run('https://ads.example.com/vast')

    expect(errors).toHaveLength(0)
  })
})
