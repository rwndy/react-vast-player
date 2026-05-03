// Level 1: Drop-in components
export { StreamingPlayer } from './adapters/streaming/StreamingPlayer.js'
export { FeedPlayer } from './adapters/feed/FeedPlayer.js'
export { PlaylistPlayer } from './adapters/playlist/PlaylistPlayer.js'

// Level 2: Headless hooks
export { useStreamingPlayer } from './adapters/streaming/useStreamingPlayer.js'
export { useFeed } from './adapters/feed/useFeed.js'
export { usePlaylist } from './adapters/playlist/usePlaylist.js'
export { usePlayerEngine } from './hooks/usePlayerEngine.js'
export { useAdManager } from './hooks/useAdManager.js'
export { useControls } from './hooks/useControls.js'

// Level 3: Raw primitives
export { PlayerEngine } from './core/PlayerEngine.js'
export { EventBus } from './core/EventBus.js'
export { Tech } from './core/Tech.js'
export { AdOrchestrator } from './core/AdOrchestrator.js'
export { MidrollWatcher } from './core/MidrollWatcher.js'
export { AdPodManager } from './ads/AdPodManager.js'
export { AdScheduler } from './ads/AdScheduler.js'
export { loadVast, bestMediaFile } from './ads/VastLoader.js'
export { parseVast } from './ads/VastParser.js'
export { buildFeedSchedule, isAdSlot, isContentSlot } from './adapters/feed/FeedScheduler.js'
export { PrefetchQueue } from './adapters/feed/PrefetchQueue.js'

// Shared components
export { VideoSurface } from './components/VideoSurface.js'
export { AdOverlay } from './components/AdOverlay.js'
export { ControlBar } from './components/ControlBar.js'
export { BufferingSpinner } from './components/BufferingSpinner.js'

// Types
export type {
  VastAd,
  AdPod,
  VastMediaFile,
  VastTracking,
  VastTrackingEvent,
  PlayerMode,
  PlayerState,
  AdQuartile,
  PlayerError,
  PlayerEventMap,
  AdState,
  ControlsState,
  StreamingConfig,
  ContentItem,
  FeedSlot,
  FeedConfig,
  QueueItem,
  PlaylistConfig,
  IPlaybackControl,
  IAdControl,
  AdScheduleRef,
} from './types/index.js'
