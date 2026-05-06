import { useCallback, useEffect, useEffectEvent } from 'react'
import { usePlayerEngine } from '../../hooks/usePlayerEngine'
import { useAdManager } from '../../hooks/useAdManager'
import { useControls, type UseControlsResult } from '../../hooks/useControls'
import type { AdScheduleConfig } from '../../ads/AdScheduler'
import type { AdState, PlayerState, StreamingConfig, PlayerHandlers } from '../../types/index'
import type { PlayerEngine } from '../../core/PlayerEngine'

export interface UseStreamingPlayerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  engineRef: React.RefObject<PlayerEngine | null>
  playerState: PlayerState
  adState: AdState
  controls: UseControlsResult
  skipAd: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function toScheduleConfig(c: StreamingConfig): AdScheduleConfig | undefined {
  const cfg: AdScheduleConfig = {}
  if (c.prerollVastUrl) cfg.prerollUrl = c.prerollVastUrl
  if (c.midrollVastUrls) cfg.midrolls = c.midrollVastUrls
  if (c.postrollVastUrl) cfg.postrollUrl = c.postrollVastUrl
  return Object.keys(cfg).length ? cfg : undefined
}

export function useStreamingPlayer(
  config: StreamingConfig,
  handlers?: PlayerHandlers<StreamingConfig>,
): UseStreamingPlayerResult {
  const { videoRef, engineRef, playerState } = usePlayerEngine()
  const adState = useAdManager(engineRef.current)
  const rawControls = useControls(engineRef.current)

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !config.src) return
    engine.loadContent(config.src, toScheduleConfig(config)).catch(console.error)
  }, [config.src])

  const onPlayEvent = useEffectEvent(() => {
    const state = engineRef.current?.state ?? 'playing'
    console.log('player state streaming=>', state)
    console.log('config streaming => ', config)
    handlers?.onPlay?.(state, config)
  })
  const onPauseEvent = useEffectEvent(() => {
    handlers?.onPause?.(engineRef.current?.state ?? 'paused', config)
  })
  const onStopEvent = useEffectEvent(() => {
    handlers?.onStop?.(engineRef.current?.state ?? 'ended', config)
  })
  const onStateChangeEvent = useEffectEvent(({ state }: { state: PlayerState }) => {
    console.log('player state streaming=>', state)
    console.log('config streaming => ', config)
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

  return {
    videoRef,
    engineRef,
    playerState,
    adState,
    controls,
    skipAd: () => engineRef.current?.skipAd(),
    containerRef: rawControls.containerRef,
  }
}
