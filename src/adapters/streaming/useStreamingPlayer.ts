import { useCallback, useEffect, useEffectEvent } from 'react'
import { usePlayerEngine } from '../../hooks/usePlayerEngine'
import { useAdManager } from '../../hooks/useAdManager'
import { useControls, type UseControlsResult } from '../../hooks/useControls'
import { loadVmap } from '../../ads/VmapLoader'
import { VastError } from '../../ads/VastError'
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

async function resolveSchedule(c: StreamingConfig): Promise<AdScheduleConfig | undefined> {
  if (c.vmapUrl) return loadVmap(c.vmapUrl)
  return toScheduleConfig(c)
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
    let cancelled = false
    resolveSchedule(config)
      .then(schedule => {
        if (cancelled) return
        return engine.loadContent(config.src, schedule)
      })
      .catch((err: unknown) => {
        // VMAP fetch / parse failure: surface as ad:error and play content-only
        const code = err instanceof VastError ? err.code : 900
        engine.bus.emit('ad:error', {
          reason: (err as Error).message,
          vastErrorCode: code,
        })
        if (!cancelled) engine.loadContent(config.src).catch(() => {})
      })
    return () => {
      cancelled = true
    }
  }, [config.src, config.vmapUrl])

  const onPlayEvent = useEffectEvent(() => {
    handlers?.onPlay?.(engineRef.current?.state ?? 'playing', config)
  })
  const onPauseEvent = useEffectEvent(() => {
    handlers?.onPause?.(engineRef.current?.state ?? 'paused', config)
  })
  const onStopEvent = useEffectEvent(() => {
    handlers?.onStop?.(engineRef.current?.state ?? 'ended', config)
  })
  const onStateChangeEvent = useEffectEvent(({ state }: { state: PlayerState }) => {
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
