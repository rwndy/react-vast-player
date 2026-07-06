import type { ContentItem, FeedSlot } from '../../types/index.js'

interface BuildOptions {
  items: ContentItem[]
  vastUrls?: string[]
  adInterval?: number
}

/** @experimental Internal feed slot builder — API may change before v1.0.0. */
export function buildFeedSchedule({
  items,
  vastUrls = [],
  adInterval = 3,
}: BuildOptions): FeedSlot[] {
  const slots: FeedSlot[] = []
  let adIndex = 0
  let contentCount = 0

  for (const item of items) {
    slots.push({ type: 'content', item, index: slots.length })
    contentCount++

    const shouldInject = contentCount % adInterval === 0 && adIndex < vastUrls.length
    if (shouldInject) {
      slots.push({ type: 'ad', vastUrl: vastUrls[adIndex++]!, index: slots.length })
    }
  }

  return slots
}

export const isAdSlot = (s: FeedSlot): s is Extract<FeedSlot, { type: 'ad' }> => s.type === 'ad'
export const isContentSlot = (s: FeedSlot): s is Extract<FeedSlot, { type: 'content' }> =>
  s.type === 'content'
