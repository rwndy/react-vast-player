import { describe, it, expect, vi } from 'vitest'
import { MidrollWatcher } from '../src/core/MidrollWatcher'
import { EventBus } from '../src/core/EventBus'
import type { AdScheduler } from '../src/ads/AdScheduler'

function makeScheduler(midrolls: Record<number, string>): AdScheduler {
  const fired = new Set<number>()
  return {
    consumeMidrollAt(t: number) {
      for (const [time, url] of Object.entries(midrolls)) {
        const n = Number(time)
        if (t >= n && !fired.has(n)) {
          fired.delete(n)
          fired.add(n)
          return url
        }
      }
      return null
    },
  } as unknown as AdScheduler
}

describe('MidrollWatcher', () => {
  it('fires runAd callback when timeupdate crosses a cue point', async () => {
    const bus = new EventBus()
    const runAd = vi.fn().mockResolvedValue(undefined)
    const watcher = new MidrollWatcher(bus, () => 'playing')
    const scheduler = makeScheduler({ 30: 'https://ads.example.com/mid.xml' })

    watcher.attach(scheduler, runAd)
    bus.emit('timeupdate', { currentTime: 30.5, duration: 120 })

    await vi.waitFor(() => expect(runAd).toHaveBeenCalledOnce())
    expect(runAd).toHaveBeenCalledWith('https://ads.example.com/mid.xml')
  })

  it('does NOT fire runAd when state is already "ad"', async () => {
    const bus = new EventBus()
    const runAd = vi.fn().mockResolvedValue(undefined)
    const watcher = new MidrollWatcher(bus, () => 'ad')
    const scheduler = makeScheduler({ 30: 'https://ads.example.com/mid.xml' })

    watcher.attach(scheduler, runAd)
    bus.emit('timeupdate', { currentTime: 31, duration: 120 })

    await new Promise(r => setTimeout(r, 10))
    expect(runAd).not.toHaveBeenCalled()
  })

  it('detach() stops the watcher from firing', async () => {
    const bus = new EventBus()
    const runAd = vi.fn().mockResolvedValue(undefined)
    const watcher = new MidrollWatcher(bus, () => 'playing')
    const scheduler = makeScheduler({ 30: 'https://ads.example.com/mid.xml' })

    watcher.attach(scheduler, runAd)
    watcher.detach()
    bus.emit('timeupdate', { currentTime: 31, duration: 120 })

    await new Promise(r => setTimeout(r, 10))
    expect(runAd).not.toHaveBeenCalled()
  })

  it('detach() then attach() resumes watching on the new scheduler', async () => {
    const bus = new EventBus()
    const runAd = vi.fn().mockResolvedValue(undefined)
    const watcher = new MidrollWatcher(bus, () => 'playing')

    watcher.attach(makeScheduler({ 30: 'https://ads.example.com/a.xml' }), runAd)
    watcher.detach()
    watcher.attach(makeScheduler({ 60: 'https://ads.example.com/b.xml' }), runAd)

    bus.emit('timeupdate', { currentTime: 61, duration: 120 })
    await vi.waitFor(() => expect(runAd).toHaveBeenCalledOnce())
    expect(runAd).toHaveBeenCalledWith('https://ads.example.com/b.xml')
  })

  it('calling attach() twice replaces the old subscription (no double-fire)', async () => {
    const bus = new EventBus()
    const runAd = vi.fn().mockResolvedValue(undefined)
    const watcher = new MidrollWatcher(bus, () => 'playing')

    watcher.attach(makeScheduler({ 30: 'https://ads.example.com/a.xml' }), runAd)
    watcher.attach(makeScheduler({ 30: 'https://ads.example.com/b.xml' }), runAd)

    bus.emit('timeupdate', { currentTime: 31, duration: 120 })
    await vi.waitFor(() => expect(runAd).toHaveBeenCalledOnce())
  })
})
