import { parseVast, getWrapperUrl } from './VastParser.js'
import type { VastAd } from '../types/index.js'

const MAX_DEPTH = 5
const TIMEOUT_MS = 8_000

async function fetchXml(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`VAST ${res.status}: ${url}`)
    return res.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function resolve(url: string, depth: number): Promise<VastAd[]> {
  if (depth >= MAX_DEPTH) throw new Error('VAST: max wrapper depth exceeded')
  const xml = await fetchXml(url)
  const wrapperUrl = getWrapperUrl(xml)
  return wrapperUrl ? resolve(wrapperUrl, depth + 1) : parseVast(xml)
}

export const loadVast = (url: string): Promise<VastAd[]> => resolve(url, 0)

export function bestMediaFile(ad: VastAd): VastAd['mediaFiles'][number] | null {
  return (
    ad.mediaFiles
      .filter(f => f.mimeType === 'video/mp4')
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0] ??
    ad.mediaFiles[0] ??
    null
  )
}
