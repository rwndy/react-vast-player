import type { EventBus } from './EventBus.js'

const PASSTHROUGH = [
  ['play', 'play'],
  ['pause', 'pause'],
  ['ended', 'ended'],
  ['waiting', 'buffering'],
  ['canplay', 'canplay'],
] as const

export class Tech {
  constructor(private readonly el: HTMLVideoElement) {}

  swapSrc(url: string): Promise<void> {
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
    this.el.src = url

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.el.removeEventListener('canplay', onReady)
        this.el.removeEventListener('error', onError)
      }
      const onReady = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error(`Tech: failed to load "${url}"`))
      }

      this.el.addEventListener('canplay', onReady, { once: true })
      this.el.addEventListener('error', onError, { once: true })
    })
  }

  play(): Promise<void> {
    return this.el.play()
  }
  pause(): void {
    this.el.pause()
  }
  seek(t: number): void {
    this.el.currentTime = Math.max(0, t)
  }
  setMuted(v: boolean): void {
    this.el.muted = v
    if (!v && !this.el.paused) {
      this.el.play().catch(() => {})
    }
  }
  setVolume(v: number): void {
    this.el.volume = Math.min(1, Math.max(0, v))
  }

  get currentTime(): number {
    return this.el.currentTime
  }
  get duration(): number {
    return this.el.duration || 0
  }
  get paused(): boolean {
    return this.el.paused
  }
  get muted(): boolean {
    return this.el.muted
  }
  get volume(): number {
    return this.el.volume
  }

  bindEvents(bus: EventBus): () => void {
    const offs: (() => void)[] = []

    for (const [dom, busEvent] of PASSTHROUGH) {
      const h = () => (bus.emit as Function)(busEvent)
      this.el.addEventListener(dom, h)
      offs.push(() => this.el.removeEventListener(dom, h))
    }

    const onTime = () =>
      bus.emit('timeupdate', { currentTime: this.el.currentTime, duration: this.el.duration || 0 })

    const onVol = () => bus.emit('volumechange', { volume: this.el.volume, muted: this.el.muted })

    const onErr = () =>
      bus.emit('error', {
        code: this.el.error?.code ?? -1,
        message: this.el.error?.message ?? 'unknown',
        fatal: true,
      })

    this.el.addEventListener('timeupdate', onTime)
    this.el.addEventListener('volumechange', onVol)
    this.el.addEventListener('error', onErr)

    offs.push(
      () => this.el.removeEventListener('timeupdate', onTime),
      () => this.el.removeEventListener('volumechange', onVol),
      () => this.el.removeEventListener('error', onErr),
    )

    return () => offs.forEach(fn => fn())
  }
}
