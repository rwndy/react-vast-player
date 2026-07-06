'use client'

import { Activity } from 'react'
import { useStreamingPlayer } from './useStreamingPlayer.js'
import { VideoSurface } from '../../components/VideoSurface.js'
import { AdOverlay } from '../../components/AdOverlay.js'
import { ControlBar } from '../../components/ControlBar.js'
import { BufferingSpinner } from '../../components/BufferingSpinner.js'
import { usePip } from '../../hooks/usePip.js'
import { useControlsVisibility } from '../../hooks/useControlsVisibility.js'
import { fireBeacons } from '../../ads/BeaconFirer.js'
import type { StreamingConfig, PlayerHandlers } from '../../types/index.js'
import { JSX } from 'react/jsx-runtime'

interface StreamingPlayerProps extends StreamingConfig, PlayerHandlers<StreamingConfig> {
  className?: string
  style?: React.CSSProperties
  renderControls?: (api: ReturnType<typeof useStreamingPlayer>) => React.ReactNode
}

export function StreamingPlayer({
  className,
  style,
  renderControls,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onStateChange,
  ...config
}: StreamingPlayerProps): JSX.Element {
  const api = useStreamingPlayer(config, {
    onPlay,
    onPause,
    onStop,
    onSeek,
    onStateChange,
  } as PlayerHandlers<StreamingConfig>)
  const { videoRef, adState, controls, skipAd, containerRef, playerState, engineRef } = api
  const pip = usePip(videoRef)
  const controlsVisible = useControlsVisibility(containerRef, controls.state.playing)

  const handleAdClick = () => {
    if (!adState.clickThroughUrl) return
    fireBeacons(adState.clickTrackingUrls)
    engineRef.current?.bus.emit('ad:click', { url: adState.clickThroughUrl })
    window.open(adState.clickThroughUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
        cursor: controls.state.playing && !controlsVisible ? 'none' : 'default',
        ...style,
      }}
    >
      <VideoSurface
        ref={videoRef}
        muted={config.muted ?? false}
        autoPlay={config.autoplay ?? false}
        {...(config.poster !== undefined ? { poster: config.poster } : {})}
      />
      <BufferingSpinner visible={playerState === 'buffering' || playerState === 'loading'} />
      <Activity mode={adState.active ? 'visible' : 'hidden'}>
        <AdOverlay
          adState={adState}
          onSkip={skipAd}
          {...(adState.clickThroughUrl ? { onClickAd: handleAdClick } : {})}
        />
      </Activity>
      {renderControls ? (
        renderControls(api)
      ) : (
        <div
          aria-hidden={!controlsVisible}
          style={{
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          <ControlBar
            state={controls.state}
            onPlay={controls.play}
            onPause={controls.pause}
            onSeek={controls.seek}
            onToggleMute={controls.toggleMute}
            onToggleFullscreen={controls.toggleFullscreen}
            onSetVolume={controls.setVolume}
            onSetPlaybackRate={controls.setPlaybackRate}
            {...(config.pip ? { onTogglePip: pip.togglePip, pipActive: pip.pipActive } : {})}
            {...(config.midrollVastUrls
              ? { midrollPositions: config.midrollVastUrls.map(m => m.time) }
              : {})}
            disabled={adState.active || playerState === 'idle' || playerState === 'loading'}
          />
        </div>
      )}
    </div>
  )
}
