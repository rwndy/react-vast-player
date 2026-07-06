import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '../src/core/EventBus'

describe('EventBus', () => {
  it('on() delivers payload to the subscriber', () => {
    const bus = new EventBus()
    const received: { currentTime: number; duration: number }[] = []
    bus.on('timeupdate', p => received.push(p))
    bus.emit('timeupdate', { currentTime: 5, duration: 60 })
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ currentTime: 5, duration: 60 })
  })

  it('on() returns an unsubscribe function that stops delivery', () => {
    const bus = new EventBus()
    const calls: number[] = []
    const off = bus.on('play', () => calls.push(1))
    bus.emit('play')
    off()
    bus.emit('play')
    expect(calls).toHaveLength(1)
  })

  it('multiple subscribers all receive the same emit', () => {
    const bus = new EventBus()
    const a: number[] = []
    const b: number[] = []
    bus.on('play', () => a.push(1))
    bus.on('play', () => b.push(1))
    bus.emit('play')
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })

  it('unsubscribing one listener does not affect others', () => {
    const bus = new EventBus()
    const kept: number[] = []
    const removed: number[] = []
    const off = bus.on('pause', () => removed.push(1))
    bus.on('pause', () => kept.push(1))
    off()
    bus.emit('pause')
    expect(removed).toHaveLength(0)
    expect(kept).toHaveLength(1)
  })

  it('emit on an event with no subscribers is a no-op', () => {
    const bus = new EventBus()
    expect(() => bus.emit('play')).not.toThrow()
  })

  it('destroy() removes all listeners', () => {
    const bus = new EventBus()
    const calls: number[] = []
    bus.on('play', () => calls.push(1))
    bus.on('pause', () => calls.push(2))
    bus.destroy()
    bus.emit('play')
    bus.emit('pause')
    expect(calls).toHaveLength(0)
  })

  it('on() after destroy() still works (bus is reusable)', () => {
    const bus = new EventBus()
    bus.destroy()
    const calls: number[] = []
    bus.on('play', () => calls.push(1))
    bus.emit('play')
    expect(calls).toHaveLength(1)
  })

  it('void-payload events emit and receive without payload', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('ended', handler)
    bus.emit('ended')
    expect(handler).toHaveBeenCalledOnce()
  })
})
