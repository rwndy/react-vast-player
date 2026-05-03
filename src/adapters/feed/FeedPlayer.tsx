'use client'

import { Activity, useRef } from 'react'
import { JSX } from 'react/jsx-runtime'
import { useFeed } from './useFeed.js'
import { VideoSurface } from '../../components/VideoSurface.js'
import { AdOverlay } from '../../components/AdOverlay.js'
import { BufferingSpinner } from '../../components/BufferingSpinner.js'
import type { FeedConfig, FeedSlot, PlayerHandlers } from '../../types/index.js'

const SWIPE_THRESHOLD = 50

interface FeedPlayerProps extends FeedConfig, PlayerHandlers<FeedConfig> {
  className?: string
  style?: React.CSSProperties
  renderItem?: (slot: FeedSlot) => React.ReactNode
}

export function FeedPlayer({
  className,
  style,
  renderItem,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onStateChange,
  ...config
}: FeedPlayerProps): JSX.Element {
  const { videoRef, adState, playerState, currentSlot, swipeNext, swipePrev, skipAd } = useFeed(
    config,
    { onPlay, onPause, onStop, onSeek, onStateChange } as PlayerHandlers<FeedConfig>,
  )
  const dragY = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    dragY.current = e.clientY
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragY.current === null) return
    const delta = dragY.current - e.clientY
    dragY.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    delta > 0 ? swipeNext() : swipePrev()
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
        touchAction: 'pan-y',
        userSelect: 'none',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <VideoSurface ref={videoRef} muted={config.muted} autoPlay={config.autoplay} />
      <BufferingSpinner visible={playerState === 'loading' || playerState === 'buffering'} />
      {currentSlot && renderItem?.(currentSlot)}
      <Activity mode={adState.active ? 'visible' : 'hidden'}>
        <AdOverlay adState={adState} onSkip={skipAd} />
      </Activity>
    </div>
  )
}
