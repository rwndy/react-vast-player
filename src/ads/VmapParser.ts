import { VastError } from './VastError.js'
import type { AdScheduleConfig, MidrollEntry } from './AdScheduler.js'

export type VmapTimeOffset = 'start' | 'end' | number

export interface VmapBreak {
  timeOffset: VmapTimeOffset
  vastUrl: string
}

const HHMMSS = /^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d+))?$/

function parseTimeOffset(raw: string): VmapTimeOffset {
  const v = raw.trim()
  if (v === 'start') return 'start'
  if (v === 'end') return 'end'
  if (v.endsWith('%')) {
    throw new VastError(
      900,
      'VMAP percentage timeOffset is not supported in this release (requires content duration)',
    )
  }
  const m = HHMMSS.exec(v)
  if (m) {
    const [, h, mm, s, ms] = m
    const ms3 = (ms ?? '').padEnd(3, '0').slice(0, 3)
    return Number(h) * 3600 + Number(mm) * 60 + Number(s) + Number(ms3) / 1000
  }
  const n = Number(v)
  if (Number.isFinite(n) && n >= 0) return n
  throw new VastError(900, `VMAP: invalid timeOffset "${raw}"`)
}

function getAdTagURI(breakEl: Element): string | null {
  const uri = breakEl.getElementsByTagNameNS('*', 'AdTagURI')[0]?.textContent?.trim()
  return uri && uri.length > 0 ? uri : null
}

export function parseVmap(xml: string): VmapBreak[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const breaks: VmapBreak[] = []
  const breakEls = Array.from(doc.getElementsByTagNameNS('*', 'AdBreak'))
  for (const el of breakEls) {
    const offsetAttr = el.getAttribute('timeOffset')
    if (!offsetAttr) continue
    const vastUrl = getAdTagURI(el)
    if (!vastUrl) continue
    breaks.push({ timeOffset: parseTimeOffset(offsetAttr), vastUrl })
  }
  return breaks
}

export function vmapToSchedule(breaks: VmapBreak[]): AdScheduleConfig {
  const cfg: AdScheduleConfig = {}
  const midrolls: MidrollEntry[] = []
  for (const b of breaks) {
    if (b.timeOffset === 'start') {
      if (!cfg.prerollUrl) cfg.prerollUrl = b.vastUrl
    } else if (b.timeOffset === 'end') {
      if (!cfg.postrollUrl) cfg.postrollUrl = b.vastUrl
    } else {
      midrolls.push({ time: b.timeOffset, url: b.vastUrl })
    }
  }
  if (midrolls.length > 0) {
    cfg.midrolls = midrolls.sort((a, b) => a.time - b.time)
  }
  return cfg
}
