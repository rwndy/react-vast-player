// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadVmap } from '../src/ads/VmapLoader'
import { VastError } from '../src/ads/VastError'

const VMAP_OK = `<?xml version="1.0"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
  <vmap:AdBreak timeOffset="start" breakType="linear" breakId="pre">
    <vmap:AdSource>
      <vmap:AdTagURI><![CDATA[https://ads.example.com/pre.xml]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="00:00:30" breakType="linear" breakId="mid">
    <vmap:AdSource>
      <vmap:AdTagURI><![CDATA[https://ads.example.com/mid.xml]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
</vmap:VMAP>`

describe('loadVmap', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('fetches + parses VMAP into AdScheduleConfig', async () => {
    globalThis.fetch = vi.fn(
      async (): Promise<Response> => new Response(VMAP_OK, { status: 200 }),
    ) as typeof fetch
    const schedule = await loadVmap('https://ads.example.com/vmap')
    expect(schedule).toEqual({
      prerollUrl: 'https://ads.example.com/pre.xml',
      midrolls: [{ time: 30, url: 'https://ads.example.com/mid.xml' }],
    })
  })

  it('throws VastError(900) on non-OK fetch', async () => {
    globalThis.fetch = vi.fn(
      async (): Promise<Response> => new Response('not found', { status: 404 }),
    ) as typeof fetch
    await expect(loadVmap('https://ads.example.com/vmap')).rejects.toMatchObject({
      code: 900,
    })
  })

  it('throws VastError(900) on network error', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as typeof fetch
    await expect(loadVmap('https://ads.example.com/vmap')).rejects.toBeInstanceOf(VastError)
  })
})
