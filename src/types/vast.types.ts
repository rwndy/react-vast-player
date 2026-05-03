export type VastTrackingEvent =
  | 'start'
  | 'firstQuartile'
  | 'midpoint'
  | 'thirdQuartile'
  | 'complete'
  | 'skip'
  | 'pause'
  | 'resume'
  | 'mute'
  | 'unmute'
  | 'fullscreen'

export interface VastMediaFile {
  url: string
  mimeType: string
  width: number
  height: number
  bitrate?: number
}

export interface VastTracking {
  event: VastTrackingEvent
  url: string
}

export interface VastAd {
  id: string
  title?: string
  duration: number
  skipOffset?: number
  mediaFiles: VastMediaFile[]
  trackingEvents: VastTracking[]
  impressionUrls: string[]
  clickThroughUrl?: string
  clickTrackingUrls: string[]
  errorUrls: string[]
}

export type AdPod = VastAd[]
