// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseVmap, vmapToSchedule } from '../src/ads/VmapParser'
import { VastError } from '../src/ads/VastError'

const vmap = (...breaks: string[]): string => `<?xml version="1.0"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
  ${breaks.join('\n')}
</vmap:VMAP>`

const adBreak = (offset: string, uri = 'https://ads.example.com/vast.xml'): string => `
  <vmap:AdBreak timeOffset="${offset}" breakType="linear" breakId="b">
    <vmap:AdSource>
      <vmap:AdTagURI templateType="vast4"><![CDATA[${uri}]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>`

describe('parseVmap', () => {
  it('parses "start" → preroll-flagged break', () => {
    const breaks = parseVmap(vmap(adBreak('start', 'https://a/preroll')))
    expect(breaks).toEqual([{ timeOffset: 'start', vastUrl: 'https://a/preroll' }])
  })

  it('parses "end" → postroll-flagged break', () => {
    const breaks = parseVmap(vmap(adBreak('end', 'https://a/postroll')))
    expect(breaks).toEqual([{ timeOffset: 'end', vastUrl: 'https://a/postroll' }])
  })

  it('parses HH:MM:SS into seconds', () => {
    const breaks = parseVmap(vmap(adBreak('00:01:30')))
    expect(breaks[0]?.timeOffset).toBe(90)
  })

  it('parses HH:MM:SS.mmm into fractional seconds', () => {
    const breaks = parseVmap(vmap(adBreak('00:00:05.500')))
    expect(breaks[0]?.timeOffset).toBe(5.5)
  })

  it('parses numeric seconds', () => {
    const breaks = parseVmap(vmap(adBreak('42')))
    expect(breaks[0]?.timeOffset).toBe(42)
  })

  it('throws VastError(900) on percentage offset', () => {
    expect(() => parseVmap(vmap(adBreak('50%')))).toThrowError(VastError)
    try {
      parseVmap(vmap(adBreak('50%')))
    } catch (err) {
      expect((err as VastError).code).toBe(900)
    }
  })

  it('skips AdBreak elements with no AdTagURI', () => {
    const xml = `<?xml version="1.0"?>
      <vmap:VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
        <vmap:AdBreak timeOffset="start" breakType="linear"><vmap:AdSource></vmap:AdSource></vmap:AdBreak>
      </vmap:VMAP>`
    expect(parseVmap(xml)).toEqual([])
  })

  it('throws on invalid timeOffset string', () => {
    expect(() => parseVmap(vmap(adBreak('not-a-time')))).toThrowError(VastError)
  })
})

describe('vmapToSchedule', () => {
  it('maps start/end/midrolls into AdScheduleConfig', () => {
    const schedule = vmapToSchedule([
      { timeOffset: 'start', vastUrl: 'https://a/pre' },
      { timeOffset: 30, vastUrl: 'https://a/mid1' },
      { timeOffset: 10, vastUrl: 'https://a/mid0' },
      { timeOffset: 'end', vastUrl: 'https://a/post' },
    ])
    expect(schedule).toEqual({
      prerollUrl: 'https://a/pre',
      postrollUrl: 'https://a/post',
      midrolls: [
        { time: 10, url: 'https://a/mid0' },
        { time: 30, url: 'https://a/mid1' },
      ],
    })
  })

  it('first start wins if multiple are present', () => {
    const schedule = vmapToSchedule([
      { timeOffset: 'start', vastUrl: 'https://a/pre-1' },
      { timeOffset: 'start', vastUrl: 'https://a/pre-2' },
    ])
    expect(schedule.prerollUrl).toBe('https://a/pre-1')
  })

  it('returns empty schedule for empty input', () => {
    expect(vmapToSchedule([])).toEqual({})
  })
})
