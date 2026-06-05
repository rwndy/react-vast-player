// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isHlsUrl, canPlayNativeHls } from '../src/core/HlsAdapter'

describe('isHlsUrl', () => {
  it('matches .m3u8 URLs (case-insensitive, with query/hash)', () => {
    expect(isHlsUrl('https://cdn.example.com/stream.m3u8')).toBe(true)
    expect(isHlsUrl('https://cdn.example.com/stream.M3U8')).toBe(true)
    expect(isHlsUrl('https://cdn.example.com/stream.m3u8?token=abc')).toBe(true)
    expect(isHlsUrl('https://cdn.example.com/stream.m3u8#t=10')).toBe(true)
  })

  it('does not match mp4 URLs', () => {
    expect(isHlsUrl('https://cdn.example.com/video.mp4')).toBe(false)
    expect(isHlsUrl('https://cdn.example.com/video.mp4?m3u8=true')).toBe(false)
  })
})

describe('canPlayNativeHls', () => {
  it('returns true when canPlayType reports any support', () => {
    const el = { canPlayType: vi.fn().mockReturnValue('maybe') } as unknown as HTMLVideoElement
    expect(canPlayNativeHls(el)).toBe(true)
  })

  it('returns false when canPlayType returns empty', () => {
    const el = { canPlayType: vi.fn().mockReturnValue('') } as unknown as HTMLVideoElement
    expect(canPlayNativeHls(el)).toBe(false)
  })
})

describe('attachHls', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects with a clear message when hls.js fails to import', async () => {
    vi.doMock('hls.js', () => {
      throw new Error('Cannot find module hls.js')
    })
    const { attachHls } = await import('../src/core/HlsAdapter')
    const el = document.createElement('video')
    await expect(attachHls(el, 'https://cdn.example.com/stream.m3u8')).rejects.toThrow(
      /requires hls.js/,
    )
    vi.doUnmock('hls.js')
  })

  it('attaches and returns a destroyable handle when hls.js is supported', async () => {
    const instance = {
      attachMedia: vi.fn(),
      loadSource: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
    }
    const HlsMock = vi.fn(() => instance) as unknown as {
      new (): typeof instance
      isSupported(): boolean
      Events: { MANIFEST_PARSED: string; ERROR: string }
    }
    HlsMock.isSupported = (): boolean => true
    HlsMock.Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' }

    vi.doMock('hls.js', () => ({ default: HlsMock }))
    const { attachHls } = await import('../src/core/HlsAdapter')
    const el = document.createElement('video')
    const handle = await attachHls(el, 'https://cdn.example.com/stream.m3u8')

    expect(instance.attachMedia).toHaveBeenCalledWith(el)
    expect(instance.loadSource).toHaveBeenCalledWith('https://cdn.example.com/stream.m3u8')
    expect(instance.on).toHaveBeenCalledWith('hlsError', expect.any(Function))

    handle.destroy()
    expect(instance.destroy).toHaveBeenCalled()
    vi.doUnmock('hls.js')
  })

  it('throws when hls.js loads but reports isSupported=false', async () => {
    const HlsMock = vi.fn() as unknown as {
      new (): unknown
      isSupported(): boolean
      Events: { MANIFEST_PARSED: string; ERROR: string }
    }
    HlsMock.isSupported = (): boolean => false
    HlsMock.Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' }

    vi.doMock('hls.js', () => ({ default: HlsMock }))
    const { attachHls } = await import('../src/core/HlsAdapter')
    const el = document.createElement('video')
    await expect(attachHls(el, 'https://cdn.example.com/stream.m3u8')).rejects.toThrow(
      /not supported/,
    )
    vi.doUnmock('hls.js')
  })
})
