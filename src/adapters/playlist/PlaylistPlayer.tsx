'use client'

import { Activity } from 'react'
import { usePlaylist } from './usePlaylist'
import { VideoSurface } from '../../components/VideoSurface'
import { AdOverlay } from '../../components/AdOverlay'
import { ControlBar } from '../../components/ControlBar'
import { BufferingSpinner } from '../../components/BufferingSpinner'
import type { PlaylistConfig, QueueItem, PlayerHandlers } from '../../types'
import { JSX } from 'react/jsx-runtime'

interface PlaylistPlayerProps extends PlaylistConfig, PlayerHandlers<PlaylistConfig> {
  className?: string
  style?: React.CSSProperties
  renderItem?: (item: QueueItem, index: number, total: number) => React.ReactNode
}

export function PlaylistPlayer({
  className,
  style,
  renderItem,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onStateChange,
  ...config
}: PlaylistPlayerProps): JSX.Element {
  const api = usePlaylist(config, {
    onPlay,
    onPause,
    onStop,
    onSeek,
    onStateChange,
  } as PlayerHandlers<PlaylistConfig>)
  const {
    videoRef,
    adState,
    controls,
    containerRef,
    playerState,
    currentItem,
    currentIndex,
    totalItems,
    next,
    prev,
    skipAd,
  } = api

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', background: '#000', overflow: 'hidden', ...style }}
    >
      <VideoSurface ref={videoRef} muted={config.muted} autoPlay={config.autoplay} />
      <BufferingSpinner visible={playerState === 'loading' || playerState === 'buffering'} />
      {currentItem && renderItem?.(currentItem, currentIndex, totalItems)}
      <Activity mode={adState.active ? 'visible' : 'hidden'}>
        <AdOverlay adState={adState} onSkip={skipAd} />
      </Activity>
      <ControlBar
        state={controls.state}
        onPlay={controls.play}
        onPause={controls.pause}
        onSeek={controls.seek}
        onToggleMute={controls.toggleMute}
        onToggleFullscreen={controls.toggleFullscreen}
        disabled={adState.active}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          transform: 'translateY(-50%)',
          padding: '0 8px',
          pointerEvents: 'none',
        }}
      >
        <QBtn onClick={prev} disabled={currentIndex === 0} label="Previous">
          ‹
        </QBtn>
        <QBtn onClick={next} disabled={currentIndex === totalItems - 1} label="Next">
          ›
        </QBtn>
      </div>
    </div>
  )
}

function QBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        pointerEvents: 'all',
        background: 'rgba(0,0,0,0.5)',
        border: 'none',
        color: disabled ? '#555' : '#fff',
        fontSize: 28,
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: '50%',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}
