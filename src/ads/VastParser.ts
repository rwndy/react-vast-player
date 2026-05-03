import type { VastAd, VastMediaFile, VastTracking, VastTrackingEvent } from '../types/index.js'

const TRACKING_EVENTS = new Set<VastTrackingEvent>([
  'start',
  'firstQuartile',
  'midpoint',
  'thirdQuartile',
  'complete',
  'skip',
  'pause',
  'resume',
  'mute',
  'unmute',
  'fullscreen',
])

const toSec = (str: string): number => {
  const [h, m, s] = str.trim().split(':').map(Number)
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)
}

const textList = (root: Element, sel: string): string[] =>
  Array.from(root.querySelectorAll(sel))
    .map(el => el.textContent?.trim() ?? '')
    .filter(Boolean)

// exactOptionalPropertyTypes fix: explicit return types on helpers prevent
// TypeScript from widening `{ key: T } | {}` into `{ key?: T | undefined }`
const optStr = <K extends string>(
  key: K,
  val: string | null | undefined,
): Record<K, string> | {} => (val ? ({ [key]: val } as Record<K, string>) : {})

const optNum = <K extends string>(key: K, val: number | null): Record<K, number> | {} =>
  val !== null ? ({ [key]: val } as Record<K, number>) : {}

const optPosNum = <K extends string>(key: K, val: number): Record<K, number> | {} =>
  val > 0 ? ({ [key]: val } as Record<K, number>) : {}

const parseSkipOffset = (attr: string | null, dur: number): number | null => {
  if (!attr) return null
  if (attr.includes(':')) return toSec(attr)
  if (attr.endsWith('%')) return (parseFloat(attr) / 100) * dur
  return parseFloat(attr)
}

const parseMediaFiles = (el: Element): VastMediaFile[] =>
  Array.from(el.querySelectorAll('MediaFile')).map(mf => ({
    url: mf.textContent?.trim() ?? '',
    mimeType: mf.getAttribute('type') ?? 'video/mp4',
    width: parseInt(mf.getAttribute('width') ?? '0'),
    height: parseInt(mf.getAttribute('height') ?? '0'),
    ...optPosNum('bitrate', parseInt(mf.getAttribute('bitrate') ?? '0')),
  }))

const parseTracking = (el: Element): VastTracking[] =>
  Array.from(el.querySelectorAll('Tracking'))
    .filter(t => TRACKING_EVENTS.has(t.getAttribute('event') as VastTrackingEvent))
    .map(t => ({
      event: t.getAttribute('event') as VastTrackingEvent,
      url: t.textContent?.trim() ?? '',
    }))

function parseAd(adEl: Element): VastAd | null {
  const linear = adEl.querySelector('Linear')
  if (!linear) return null

  const duration = toSec(linear.querySelector('Duration')?.textContent ?? '0:0:0')
  const skipOffset = parseSkipOffset(linear.getAttribute('skipoffset'), duration)

  return {
    id: adEl.getAttribute('id') ?? crypto.randomUUID(),
    duration,
    mediaFiles: parseMediaFiles(linear),
    trackingEvents: parseTracking(linear),
    impressionUrls: textList(adEl, 'Impression'),
    clickTrackingUrls: textList(adEl, 'ClickTracking'),
    errorUrls: textList(adEl, 'Error'),
    ...optStr('title', adEl.querySelector('AdTitle')?.textContent?.trim()),
    ...optStr('clickThroughUrl', adEl.querySelector('ClickThrough')?.textContent?.trim()),
    ...optNum('skipOffset', skipOffset),
  }
}

export function parseVast(xml: string): VastAd[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  return Array.from(doc.querySelectorAll('Ad')).flatMap(el => {
    const ad = parseAd(el)
    return ad ? [ad] : []
  })
}

export function getWrapperUrl(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  return doc.querySelector('VASTAdTagURI')?.textContent?.trim() ?? null
}
