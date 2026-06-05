export interface HlsHandle {
  destroy(): void
}

interface HlsLikeInstance {
  attachMedia(el: HTMLVideoElement): void
  loadSource(url: string): void
  on(event: string, cb: (event: string, data: { fatal?: boolean }) => void): void
  destroy(): void
}

interface HlsLikeCtor {
  new (config?: unknown): HlsLikeInstance
  isSupported(): boolean
  Events: { MANIFEST_PARSED: string; ERROR: string }
}

interface HlsModule {
  default: HlsLikeCtor
}

let hlsModulePromise: Promise<HlsModule> | null = null

async function loadHlsModule(): Promise<HlsModule> {
  if (!hlsModulePromise) {
    hlsModulePromise = (async (): Promise<HlsModule> => {
      try {
        const mod = (await import(/* @vite-ignore */ 'hls.js')) as unknown as HlsModule
        return mod
      } catch {
        throw new Error(
          'react-vast-player: HLS playback requires hls.js. Install it: `npm i hls.js`',
        )
      }
    })()
  }
  return hlsModulePromise
}

export function canPlayNativeHls(el: HTMLVideoElement): boolean {
  return el.canPlayType('application/vnd.apple.mpegurl') !== ''
}

export function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url)
}

export async function attachHls(el: HTMLVideoElement, url: string): Promise<HlsHandle> {
  const { default: Hls } = await loadHlsModule()
  if (!Hls.isSupported()) {
    throw new Error('react-vast-player: hls.js is loaded but not supported in this environment')
  }
  const hls = new Hls()
  hls.attachMedia(el)
  hls.loadSource(url)
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      el.dispatchEvent(new Event('error'))
    }
  })
  return {
    destroy: () => hls.destroy(),
  }
}
