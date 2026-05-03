import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { usePlayerEngine } from '../../hooks/usePlayerEngine'
import { useAdManager } from '../../hooks/useAdManager'
import { useControls, type UseControlsResult } from '../../hooks/useControls'
import type { AdScheduleConfig } from '../../ads/AdScheduler'
import type {
  AdState,
  PlayerState,
  PlaylistConfig,
  PlayerHandlers,
  QueueItem,
} from '../../types/index'
import type { PlayerEngine } from '../../core/PlayerEngine'

function toItemSchedule(
  item: QueueItem,
  midrolls?: PlaylistConfig['midrollVastUrls'],
): AdScheduleConfig | undefined {
  const cfg: AdScheduleConfig = {}
  if (item.prerollVastUrl) cfg.prerollUrl = item.prerollVastUrl
  if (midrolls) cfg.midrolls = midrolls
  return Object.keys(cfg).length ? cfg : undefined
}

export interface UsePlaylistResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  engineRef: React.RefObject<PlayerEngine | null>
  playerState: PlayerState
  adState: AdState
  controls: UseControlsResult
  containerRef: React.RefObject<HTMLDivElement | null>
  currentItem: QueueItem | undefined
  currentIndex: number
  totalItems: number
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  skipAd: () => void
}

export function usePlaylist(
  config: PlaylistConfig,
  handlers?: PlayerHandlers<PlaylistConfig>,
): UsePlaylistResult {
  const { videoRef, engineRef, playerState } = usePlayerEngine()
  const adState = useAdManager(engineRef.current)
  const rawControls = useControls(engineRef.current)
  const [index, setIndex] = useState(0)
  const advancedRef = useRef(false)

  const currentItem: QueueItem | undefined = config.queue[index]

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !currentItem) return
    advancedRef.current = false
    engine
      .loadContent(currentItem.src, toItemSchedule(currentItem, config.midrollVastUrls))
      .catch(console.error)
  }, [index])

  useEffect(() => {
    if (!config.autoAdvance) return
    const engine = engineRef.current
    if (!engine) return

    return engine.bus.on('statechange', ({ state }) => {
      if (state !== 'ended' || advancedRef.current) return
      advancedRef.current = true
      if (index < config.queue.length - 1) setIndex(i => i + 1)
    })
  }, [index, config.autoAdvance, config.queue.length])

  const onPlayEvent = useEffectEvent(() => {
    const state = engineRef.current?.state ?? 'playing'
    console.log('player state play list=>', state)
    console.log('config playlist => ', config)
    handlers?.onPlay?.(state, config)
  })
  const onPauseEvent = useEffectEvent(() => {
    handlers?.onPause?.(engineRef.current?.state ?? 'paused', config)
  })
  const onStopEvent = useEffectEvent(() => {
    handlers?.onStop?.(engineRef.current?.state ?? 'ended', config)
  })
  const onStateChangeEvent = useEffectEvent(({ state }: { state: PlayerState }) => {
    console.log('player state play list=>', state)
    console.log('config playlist => ', config)
    handlers?.onStateChange?.(state, config)
  })

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const unsubs = [
      engine.bus.on('play', onPlayEvent),
      engine.bus.on('pause', onPauseEvent),
      engine.bus.on('ended', onStopEvent),
      engine.bus.on('statechange', onStateChangeEvent),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  const seek = useCallback(
    (t: number) => {
      rawControls.seek(t)
      handlers?.onSeek?.(t, engineRef.current?.state ?? 'playing', config)
    },
    [rawControls.seek, handlers?.onSeek],
  )

  const controls: UseControlsResult = { ...rawControls, seek }

  const goTo = (i: number): void => {
    if (i >= 0 && i < config.queue.length) setIndex(i)
  }

  return {
    videoRef,
    engineRef,
    playerState,
    adState,
    controls,
    containerRef: rawControls.containerRef,
    currentItem,
    currentIndex: index,
    totalItems: config.queue.length,
    next: () => goTo(index + 1),
    prev: () => goTo(index - 1),
    goTo,
    skipAd: () => engineRef.current?.skipAd(),
  }
}
