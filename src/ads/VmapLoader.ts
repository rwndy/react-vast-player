import { parseVmap, vmapToSchedule } from './VmapParser.js'
import { VastError } from './VastError.js'
import type { AdScheduleConfig } from './AdScheduler.js'

const TIMEOUT_MS = 8_000

async function fetchVmapXml(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new VastError(900, `VMAP ${res.status}: ${url}`)
    return await res.text()
  } catch (err) {
    if (err instanceof VastError) throw err
    const isAbort = (err as { name?: string }).name === 'AbortError'
    if (isAbort) throw new VastError(900, `VMAP timeout (${TIMEOUT_MS}ms): ${url}`)
    throw new VastError(900, (err as Error).message)
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadVmap(url: string): Promise<AdScheduleConfig> {
  const xml = await fetchVmapXml(url)
  return vmapToSchedule(parseVmap(xml))
}
