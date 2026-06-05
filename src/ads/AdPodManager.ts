import { fireBeacon, fireBeacons, fireError } from './BeaconFirer.js'
import { bestMediaFile } from './VastLoader.js'
import { VastError } from './VastError.js'
import type { EventBus } from '../core/EventBus.js'
import type { Tech } from '../core/Tech.js'
import type { VastAd, VastTrackingEvent, AdQuartile } from '../types/index.js'

const QUARTILES: { pct: number; name: AdQuartile; event: VastTrackingEvent }[] = [
  { pct: 0.25, name: 'first', event: 'firstQuartile' },
  { pct: 0.5, name: 'midpoint', event: 'midpoint' },
  { pct: 0.75, name: 'third', event: 'thirdQuartile' },
]

export class AdPodManager {
  private currentAd: VastAd | null = null
  private quartilesFired = new Set<string>()
  private cleanups: (() => void)[] = []
  private podIndex = 0
  private podTotal = 0

  constructor(
    private readonly tech: Tech,
    private readonly bus: EventBus,
  ) {}

  async playPod(ads: VastAd[]): Promise<void> {
    this.podTotal = ads.length
    for (let i = 0; i < ads.length; i++) {
      this.podIndex = i
      await this.playSingle(ads[i]!)
    }
    this.bus.emit('ad:pod:ended')
  }

  skip(): void {
    if (!this.currentAd) return
    this.trackEvent('skip')
    this.bus.emit('ad:skip')
    this.clearListeners()
  }

  private async playSingle(ad: VastAd): Promise<void> {
    const file = bestMediaFile(ad)
    if (!file) {
      fireError(ad.errorUrls, 403)
      return
    }

    this.currentAd = ad
    this.quartilesFired.clear()

    try {
      await this.tech.swapSrc(file.url)
      await this.tech.play()
    } catch (err) {
      // MediaFile fetch/decoding failed — IAB code 402 (MediaFile URI timeout/error)
      fireError(ad.errorUrls, 402)
      throw new VastError(402, `Ad MediaFile failed: ${(err as Error).message}`)
    }

    fireBeacons(ad.impressionUrls)
    this.trackEvent('start')
    this.bus.emit('ad:impression')
    this.bus.emit('ad:start', {
      adId: ad.id,
      duration: ad.duration,
      skippable: ad.skipOffset !== undefined,
      skipOffset: ad.skipOffset ?? 0,
      podIndex: this.podIndex,
      podTotal: this.podTotal,
    })

    return new Promise<void>(resolve => {
      const offTime = this.bus.on('timeupdate', ({ currentTime, duration }) => {
        if (duration) this.checkQuartiles(ad, currentTime / duration)
      })

      const offEnd = this.bus.on('ended', () => {
        this.trackEvent('complete')
        this.bus.emit('ad:quartile', { quartile: 'complete' })
        this.bus.emit('ad:ended')
        this.clearListeners()
        resolve()
      })

      const offSkip = this.bus.on('ad:skip', () => {
        this.clearListeners()
        resolve()
      })

      this.cleanups.push(offTime, offEnd, offSkip)
    })
  }

  private checkQuartiles(ad: VastAd, pct: number): void {
    for (const { pct: threshold, name, event } of QUARTILES) {
      if (pct < threshold || this.quartilesFired.has(name)) continue
      this.quartilesFired.add(name)
      this.trackEvent(event)
      this.bus.emit('ad:quartile', { quartile: name })
    }
  }

  private trackEvent(event: VastTrackingEvent): void {
    const url = this.currentAd?.trackingEvents.find(t => t.event === event)?.url
    if (url) fireBeacon(url)
  }

  private clearListeners(): void {
    this.cleanups.forEach(fn => fn())
    this.cleanups = []
    this.currentAd = null
  }
}
