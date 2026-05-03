export type PlayerMode = 'streaming' | 'feed' | 'playlist'
export type PlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ad'
  | 'buffering'
  | 'error'
  | 'ended'
export type AdQuartile = 'first' | 'midpoint' | 'third' | 'complete'

export interface PlayerError {
  code: number
  message: string
  fatal: boolean
}

export interface PlayerEventMap {
  play: void
  pause: void
  ended: void
  error: PlayerError
  buffering: void
  canplay: void
  timeupdate: { currentTime: number; duration: number }
  volumechange: { volume: number; muted: boolean }
  statechange: { state: PlayerState }

  'ad:start': {
    adId: string
    duration: number
    skippable: boolean
    skipOffset: number
    podIndex: number
    podTotal: number
  }
  'ad:impression': void
  'ad:quartile': { quartile: AdQuartile }
  'ad:skip': void
  'ad:ended': void
  'ad:pod:ended': void
  'ad:error': { reason: string; vastErrorCode: number }
  'ad:click': { url: string }
}

export interface AdState {
  active: boolean
  skippable: boolean
  skipOffset: number
  currentTime: number
  podIndex: number
  podTotal: number
}

export interface ControlsState {
  playing: boolean
  currentTime: number
  duration: number
  buffering: boolean
  volume: number
  muted: boolean
  fullscreen: boolean
}

export interface StreamingConfig {
  src: string
  poster?: string
  prerollVastUrl?: string
  midrollVastUrls?: { time: number; url: string }[]
  postrollVastUrl?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
}

export interface ContentItem {
  id: string
  src: string
  poster?: string
  title?: string
  duration?: number
}

export type FeedSlot =
  | { type: 'content'; item: ContentItem; index: number }
  | { type: 'ad'; vastUrl: string; index: number }

export interface FeedConfig {
  items: ContentItem[]
  vastUrls?: string[]
  adInterval?: number
  autoplay?: boolean
  muted?: boolean
}

export interface QueueItem extends ContentItem {
  prerollVastUrl?: string
}

export interface PlaylistConfig {
  queue: QueueItem[]
  autoAdvance?: boolean
  autoplay?: boolean
  muted?: boolean
  midrollVastUrls?: { time: number; url: string }[]
}

// ISP: focused interfaces — hooks depend only on the slice they need
export interface IPlaybackControl {
  play(): void
  pause(): void
  seek(t: number): void
  mute(v: boolean): void
  volume(v: number): void
  readonly currentTime: number
  readonly duration: number
  readonly paused: boolean
  readonly muted: boolean
  readonly state: PlayerState
}

export interface IAdControl {
  skipAd(): void
  loadContent(src: string, schedule?: AdScheduleRef): Promise<void>
  runAdSlot(vastUrl: string): Promise<void>
}

export interface AdScheduleRef {
  prerollUrl?: string
  midrolls?: { time: number; url: string }[]
  postrollUrl?: string
}

export interface PlayerHandlers<TConfig = unknown> {
  onPlay?: (state: PlayerState, config: TConfig) => void
  onPause?: (state: PlayerState, config: TConfig) => void
  onStop?: (state: PlayerState, config: TConfig) => void
  onSeek?: (time: number, state: PlayerState, config: TConfig) => void
  onStateChange?: (state: PlayerState, config: TConfig) => void
}
