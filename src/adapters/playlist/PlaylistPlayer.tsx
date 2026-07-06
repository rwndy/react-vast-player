'use client'

import { Activity } from 'react'
import { usePlaylist } from './usePlaylist'
import { VideoSurface } from '../../components/VideoSurface'
import { AdOverlay } from '../../components/AdOverlay'
import { ControlBar } from '../../components/ControlBar'
import { BufferingSpinner } from '../../components/BufferingSpinner'
import { usePip } from '../../hooks/usePip'
import { useControlsVisibility } from '../../hooks/useControlsVisibility'
import { fireBeacons } from '../../ads/BeaconFirer'
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
    engineRef,
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
        {...(currentItem?.poster !== undefined ? { poster: currentItem.poster } : {})}
      />
      <BufferingSpinner visible={playerState === 'loading' || playerState === 'buffering'} />
      {currentItem && renderItem?.(currentItem, currentIndex, totalItems)}
      <Activity mode={adState.active ? 'visible' : 'hidden'}>
        <AdOverlay
          adState={adState}
          onSkip={skipAd}
          {...(adState.clickThroughUrl ? { onClickAd: handleAdClick } : {})}
        />
      </Activity>
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
        disabled={adState.active}
      />
      </div>
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
