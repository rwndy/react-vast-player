import type { EventBus } from './EventBus.js'

const PASSTHROUGH = [
  ['play', 'play'],
  ['pause', 'pause'],
  ['ended', 'ended'],
  ['waiting', 'buffering'],
  ['canplay', 'canplay'],
] as const

const SWAP_TIMEOUT_MS = 5_000

export class Tech {
  private srcVersion = 0

  constructor(private readonly el: HTMLVideoElement) {}

  swapSrc(url: string): Promise<void> {
    const version = ++this.srcVersion

    this.el.pause()

    this.el.removeAttribute('src')
    this.el.src = url
    this.el.load()

    return new Promise((resolve, reject) => {
      let settled = false

      const settle = (fn: () => void) => {
        if (settled) return
        if (version !== this.srcVersion) return
        settled = true
        cleanup()
        fn()
      }

      const onReady = () => settle(resolve)
      const onError = () => settle(() => reject(new Error(`Tech: failed to load "${url}"`)))

      const cleanup = () => {
        clearTimeout(timer)
        this.el.removeEventListener('canplay', onReady)
        this.el.removeEventListener('loadeddata', onReady)
        this.el.removeEventListener('error', onError)
      }

      this.el.addEventListener('canplay', onReady, { once: true })
      this.el.addEventListener('loadeddata', onReady, { once: true })
      this.el.addEventListener('error', onError, { once: true })

      const timer = setTimeout(() => {
        settle(resolve)
      }, SWAP_TIMEOUT_MS)
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
    if (!v) void this.resumeAudio()
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

    const onTime = () => {
      const duration = this.el.duration
      if (!isFinite(duration) || duration <= 0) return
      bus.emit('timeupdate', {
        currentTime: this.el.currentTime,
        duration,
      })
    }

    const onMetadata = () => {
      if (!isFinite(this.el.duration) || this.el.duration <= 0) return
      bus.emit('timeupdate', {
        currentTime: this.el.currentTime,
        duration: this.el.duration,
      })
    }

    const onVol = () => bus.emit('volumechange', { volume: this.el.volume, muted: this.el.muted })

    const onErr = () =>
      bus.emit('error', {
        code: this.el.error?.code ?? -1,
        message: this.el.error?.message ?? 'unknown',
        fatal: true,
      })

    this.el.addEventListener('loadedmetadata', onMetadata)
    this.el.addEventListener('timeupdate', onTime)
    this.el.addEventListener('volumechange', onVol)
    this.el.addEventListener('error', onErr)

    offs.push(
      () => this.el.removeEventListener('loadedmetadata', onMetadata),
      () => this.el.removeEventListener('timeupdate', onTime),
      () => this.el.removeEventListener('volumechange', onVol),
      () => this.el.removeEventListener('error', onErr),
    )

    return () => offs.forEach(fn => fn())
  }

  private async resumeAudio(): Promise<void> {
    try {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        if (ctx.state === 'suspended') await ctx.resume()
        await ctx.close()
      }

      const wasPlaying = !this.el.paused
      if (wasPlaying) {
        this.el.pause()
        this.el.currentTime = Math.max(0, this.el.currentTime - 0.05)
        await this.el.play()
      }
    } catch {}
  }
}
