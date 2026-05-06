import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { usePlayerEngine } from '../../hooks/usePlayerEngine'
import { useAdManager } from '../../hooks/useAdManager'
import { buildFeedSchedule, isAdSlot } from './FeedScheduler'
import { PrefetchQueue } from './PrefetchQueue'
import type { AdState, PlayerState, FeedConfig, FeedSlot, PlayerHandlers } from '../../types/index'
import type { PlayerEngine } from '../../core/PlayerEngine'
import { useControls, type UseControlsResult } from '../../hooks/useControls'

const PREFETCH_AHEAD = 2

export interface UseFeedResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  engineRef: React.RefObject<PlayerEngine | null>
  playerState: PlayerState
  adState: AdState
  controls: UseControlsResult
  currentSlot: FeedSlot | undefined
  currentIndex: number
  totalSlots: number
  swipeNext: () => void
  swipePrev: () => void
  goTo: (index: number) => void
  skipAd: () => void
}

export function useFeed(config: FeedConfig, handlers?: PlayerHandlers<FeedConfig>): UseFeedResult {
  const { videoRef, engineRef, playerState } = usePlayerEngine()
  const adState = useAdManager(engineRef.current)
  const rawControls = useControls(engineRef.current)
  const prefetcher = useRef(new PrefetchQueue()).current
  const [index, setIndex] = useState(0)

  const schedule = buildFeedSchedule({
    items: config.items,
    ...(config.vastUrls !== undefined && { vastUrls: config.vastUrls }),
    ...(config.adInterval !== undefined && {
      adInterval: config.adInterval,
    }),
  })

  const currentSlot: FeedSlot | undefined = schedule[index]

  useEffect(() => {
    schedule
      .slice(index + 1, index + 1 + PREFETCH_AHEAD)
      .filter(isAdSlot)
      .forEach(s => prefetcher.prefetch(s.vastUrl))
  }, [index])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !currentSlot) return
    if (currentSlot.type === 'content') {
      engine.loadContent(currentSlot.item.src).catch(console.error)
    } else {
      engine.runAdSlot(currentSlot.vastUrl).catch(console.error)
    }
  }, [index])

  const onPlayEvent = useEffectEvent(() => {
    const state = engineRef.current?.state ?? 'playing'
    console.log('player state feed=>', state)
    console.log('config feed => ', config)
    handlers?.onPlay?.(state, config)
  })
  const onPauseEvent = useEffectEvent(() => {
    handlers?.onPause?.(engineRef.current?.state ?? 'paused', config)
  })
  const onStopEvent = useEffectEvent(() => {
    handlers?.onStop?.(engineRef.current?.state ?? 'ended', config)
  })
  const onStateChangeEvent = useEffectEvent(({ state }: { state: PlayerState }) => {
    console.log('player state feed=>', state)
    console.log('config feed => ', config)
    handlers?.onStateChange?.(state, config)
  })
  const onAdErrorEvent = useEffectEvent(
    ({ reason, vastErrorCode }: { reason: string; vastErrorCode: number }) => {
      handlers?.onAdError?.({ reason, vastErrorCode })
    },
  )

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const unsubs = [
      engine.bus.on('play', onPlayEvent),
      engine.bus.on('pause', onPauseEvent),
      engine.bus.on('ended', onStopEvent),
      engine.bus.on('statechange', onStateChangeEvent),
      engine.bus.on('ad:error', onAdErrorEvent),
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

  const goTo = (next: number): void => {
    if (next >= 0 && next < schedule.length) setIndex(next)
  }

  return {
    videoRef,
    engineRef,
    playerState,
    adState,
    controls,
    currentSlot,
    currentIndex: index,
    totalSlots: schedule.length,
    swipeNext: () => goTo(index + 1),
    swipePrev: () => goTo(index - 1),
    goTo,
    skipAd: () => engineRef.current?.skipAd(),
  }
}
