import { describe, it, expect } from 'vitest'
import { buildFeedSchedule, isAdSlot, isContentSlot } from '../src/adapters/feed/FeedScheduler'

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `v${i}`, src: `https://cdn.test/v${i}.mp4` }))

const vastUrls = (n: number) =>
  Array.from({ length: n }, (_, i) => `https://ads.test/vast?id=${i}`)

describe('buildFeedSchedule', () => {
  it('injects an ad after every N content items', () => {
    const slots = buildFeedSchedule({ items: items(6), vastUrls: vastUrls(2), adInterval: 3 })
    expect(slots.filter(isAdSlot)).toHaveLength(2)
    expect(slots.filter(isContentSlot)).toHaveLength(6)
    expect(slots[3]?.type).toBe('ad')
    expect(slots[7]?.type).toBe('ad')
  })

  it('does not inject more ads than vastUrls available', () => {
    const slots = buildFeedSchedule({ items: items(12), vastUrls: vastUrls(1), adInterval: 3 })
    expect(slots.filter(isAdSlot)).toHaveLength(1)
  })

  it('returns only content when no vastUrls given', () => {
    const slots = buildFeedSchedule({ items: items(5) })
    expect(slots).toHaveLength(5)
    expect(slots.every(isContentSlot)).toBe(true)
  })

  it('assigns sequential index values across all slot types', () => {
    const slots = buildFeedSchedule({ items: items(3), vastUrls: vastUrls(1), adInterval: 3 })
    slots.forEach((slot, i) => expect(slot.index).toBe(i))
  })

  it('handles empty items gracefully', () => {
    expect(buildFeedSchedule({ items: [] })).toHaveLength(0)
  })
})

describe('AdScheduler', () => {
  it('consumePreroll returns url once then null', async () => {
    const { AdScheduler } = await import('../src/ads/AdScheduler')
    const s = new AdScheduler({ prerollUrl: 'https://ads.test/pre' })
    expect(s.consumePreroll()).toBe('https://ads.test/pre')
    expect(s.consumePreroll()).toBeNull()
  })

  it('consumeMidrollAt fires once per time entry', async () => {
    const { AdScheduler } = await import('../src/ads/AdScheduler')
    const s = new AdScheduler({ midrolls: [{ time: 30, url: 'https://ads.test/mid' }] })
    expect(s.consumeMidrollAt(29)).toBeNull()
    expect(s.consumeMidrollAt(30)).toBe('https://ads.test/mid')
    expect(s.consumeMidrollAt(30)).toBeNull()
  })

  it('reset re-arms all slots', async () => {
    const { AdScheduler } = await import('../src/ads/AdScheduler')
    const s = new AdScheduler({ prerollUrl: 'https://ads.test/pre' })
    s.consumePreroll()
    s.reset()
    expect(s.consumePreroll()).toBe('https://ads.test/pre')
  })
})
