// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireBeacon, fireBeacons, fireError } from '../src/ads/BeaconFirer'

describe('BeaconFirer', () => {
  const originalSendBeacon = navigator.sendBeacon

  beforeEach(() => {
    navigator.sendBeacon = vi.fn().mockReturnValue(true)
  })

  afterEach(() => {
    navigator.sendBeacon = originalSendBeacon
  })

  it('fireBeacon() sends to navigator.sendBeacon when available', () => {
    fireBeacon('https://tracking.example.com/impression')
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://tracking.example.com/impression')
  })

  it('fireBeacon() with empty string is a no-op', () => {
    fireBeacon('')
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('fireBeacons() fires each URL once', () => {
    fireBeacons([
      'https://tracking.example.com/first',
      'https://tracking.example.com/second',
    ])
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(2)
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://tracking.example.com/first')
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://tracking.example.com/second')
  })

  it('fireBeacons() with empty array is a no-op', () => {
    fireBeacons([])
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('fireError() replaces [ERRORCODE] macro before firing', () => {
    fireError(['https://ads.example.com/error?code=[ERRORCODE]'], 400)
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      'https://ads.example.com/error?code=400',
    )
  })

  it('fireError() replaces [ERRORCODE] with the exact code passed', () => {
    fireError(['https://ads.example.com/err?c=[ERRORCODE]'], 303)
    expect(navigator.sendBeacon).toHaveBeenCalledWith('https://ads.example.com/err?c=303')
  })

  it('fireError() with empty URL list is a no-op', () => {
    fireError([], 900)
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('fireBeacon() falls back to Image src when sendBeacon is unavailable', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true })
    const img = { src: '' }
    const ImageSpy = vi.spyOn(globalThis, 'Image').mockReturnValue(img as unknown as HTMLImageElement)
    fireBeacon('https://tracking.example.com/pixel')
    expect(img.src).toBe('https://tracking.example.com/pixel')
    ImageSpy.mockRestore()
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
    })
  })
})
