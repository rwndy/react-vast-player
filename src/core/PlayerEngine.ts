import { EventBus } from './EventBus.js'
import { Tech } from './Tech.js'
import { AdOrchestrator } from './AdOrchestrator.js'
import { AdPodManager } from '../ads/AdPodManager.js'
import { AdScheduler } from '../ads/AdScheduler.js'
import { MidrollWatcher } from './MidrollWatcher.js'
import type { AdScheduleConfig } from '../ads/AdScheduler.js'
import type { PlayerState, IPlaybackControl, IAdControl } from '../types/index.js'

// SRP: state machine + coordinator only
// MidrollWatcher owns midroll listening
// AdOrchestrator owns VAST execution
// Tech owns the video element
export class PlayerEngine implements IPlaybackControl, IAdControl {
  readonly bus: EventBus

  private tech: Tech | null = null
  private orchestrator: AdOrchestrator | null = null
  private midrollWatcher: MidrollWatcher
  private unbind: (() => void) | null = null
  private techUnsubs: (() => void)[] = []
  private _state: PlayerState = 'idle'
  private contentSrc = ''
  private contentTime = 0

  constructor() {
    this.bus = new EventBus()
    this.midrollWatcher = new MidrollWatcher(this.bus, () => this._state)
  }

  // Composition root — concrete instances wired here, not inside classes
  attachTech(el: HTMLVideoElement): void {
    this.tech = new Tech(el)
    const podManager = new AdPodManager(this.tech, this.bus)
    this.orchestrator = new AdOrchestrator(podManager, this.bus)
    this.unbind = this.tech.bindEvents(this.bus)

    this.techUnsubs = [
      this.bus.on('play', () => {
        if (this._state === 'loading') this.setState('playing')
      }),
      this.bus.on('ad:pod:ended', () => this.resumeContent()),
      this.bus.on('ad:skip', () => this.resumeContent()),
      this.bus.on('ad:error', () => void this.resumeContent()),
      this.bus.on('ended', () => this.onContentEnded()),
    ]
  }

  // Tears down only the tech layer — preserves bus subscriptions (e.g. makeStore's statechange listener)
  detachTech(): void {
    this.unbind?.()
    this.tech?.detachMedia()
    this.techUnsubs.forEach(u => u())
    this.techUnsubs = []
    this.unbind = null
    this.tech = null
    this.orchestrator = null
  }

  // IAdControl
  async loadContent(src: string, scheduleConfig?: AdScheduleConfig): Promise<void> {
    this.contentSrc = src
    this.contentTime = 0

    if (scheduleConfig) {
      const scheduler = new AdScheduler(scheduleConfig)
      this.midrollWatcher.attach(scheduler, url => this.runAd(url))

      const prerollUrl = scheduler.consumePreroll()
      if (prerollUrl) {
        await this.runAd(prerollUrl)
        return
      }
    }

    await this.playContent()
  }

  async runAdSlot(vastUrl: string): Promise<void> {
    await this.runAd(vastUrl)
  }

  skipAd(): void {
    this.orchestrator?.skip()
  }

  // IPlaybackControl
  play(): void {
    if (
      !this.contentSrc ||
      this._state === 'idle' ||
      this._state === 'loading' ||
      this._state === 'ad'
    )
      return
    this.tech?.play()
  }
  pause(): void {
    this.tech?.pause()
  }
  seek(t: number): void {
    this.tech?.seek(t)
  }
  mute(v: boolean): void {
    this.tech?.setMuted(v)
  }
  volume(v: number): void {
    this.tech?.setVolume(v)
  }

  get state(): PlayerState {
    return this._state
  }
  get currentTime(): number {
    return this.tech?.currentTime ?? 0
  }
  get duration(): number {
    return this.tech?.duration ?? 0
  }
  get paused(): boolean {
    return this.tech?.paused ?? true
  }
  get muted(): boolean {
    return this.tech?.muted ?? false
  }
  get playbackRate(): number {
    return this.tech?.playbackRate ?? 1
  }
  setPlaybackRate(rate: number): void {
    this.tech?.setPlaybackRate(rate)
  }

  destroy(): void {
    this.detachTech()
    this.midrollWatcher.detach()
    this.bus.destroy()
  }

  private async runAd(vastUrl: string): Promise<void> {
    this.setState('ad')
    await this.orchestrator!.run(vastUrl)
  }

  private async playContent(): Promise<void> {
    this.setState('loading')
    try {
      await this.tech!.swapSrc(this.contentSrc)
      if (this.contentTime > 0) this.tech!.seek(this.contentTime)
      await this.tech!.play()
      // 'playing' set synchronously by the 'play' bus listener above, before this await resolves
    } catch (err) {
      this.setState('error')
      this.bus.emit('error', {
        code: -1,
        message: (err as Error).message,
        fatal: true,
      })
    }
  }

  private async resumeContent(): Promise<void> {
    if (this.contentSrc) await this.playContent()
  }

  private async onContentEnded(): Promise<void> {
    if (this._state !== 'playing') return
    this.setState('ended')
  }

  private setState(next: PlayerState): void {
    this._state = next
    this.bus.emit('statechange', { state: next })
  }
}
