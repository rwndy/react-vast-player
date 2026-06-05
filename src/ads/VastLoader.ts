import { parseVast, getWrapperUrl } from './VastParser.js'
import { VastError } from './VastError.js'
import type { VastAd } from '../types/index.js'

const MAX_DEPTH = 5
const TIMEOUT_MS = 8_000

async function fetchXml(url: string, depth: number): Promise<string> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) {
      // 301 only applies to wrapper fetch failures; root failures stay 900
      throw new VastError(depth > 0 ? 301 : 900, `VAST ${res.status}: ${url}`)
    }
    return await res.text()
  } catch (err) {
    if (err instanceof VastError) throw err
    const isAbort = (err as { name?: string }).name === 'AbortError'
    if (isAbort) {
      throw new VastError(depth > 0 ? 301 : 900, `VAST timeout (${TIMEOUT_MS}ms): ${url}`)
    }
    throw new VastError(depth > 0 ? 301 : 900, (err as Error).message)
  } finally {
    clearTimeout(timeout)
  }
}

async function resolve(url: string, depth: number): Promise<VastAd[]> {
  if (depth >= MAX_DEPTH) {
    throw new VastError(303, `VAST: max wrapper depth (${MAX_DEPTH}) exceeded at ${url}`)
  }
  const xml = await fetchXml(url, depth)
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
