'use client'

import { Activity } from 'react'
import { useStreamingPlayer } from './useStreamingPlayer.js'
import { VideoSurface } from '../../components/VideoSurface.js'
import { AdOverlay } from '../../components/AdOverlay.js'
import { ControlBar } from '../../components/ControlBar.js'
import { BufferingSpinner } from '../../components/BufferingSpinner.js'
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
  const { videoRef, adState, controls, skipAd, containerRef, playerState } = api

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
        ...style,
      }}
    >
      <VideoSurface ref={videoRef} muted={config.muted} autoPlay={config.autoplay} />
      <BufferingSpinner visible={playerState === 'buffering' || playerState === 'loading'} />
      <Activity mode={adState.active ? 'visible' : 'hidden'}>
        <AdOverlay adState={adState} onSkip={skipAd} />
      </Activity>
      {renderControls ? (
        renderControls(api)
      ) : (
        <ControlBar
          state={controls.state}
          onPlay={controls.play}
          onPause={controls.pause}
          onSeek={controls.seek}
          onToggleMute={controls.toggleMute}
          onToggleFullscreen={controls.toggleFullscreen}
          disabled={adState.active || playerState === 'idle' || playerState === 'loading'}
        />
      )}
    </div>
  )
}
