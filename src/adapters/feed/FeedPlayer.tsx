'use client'

import { Activity, useEffect, useEffectEvent, useRef } from 'react'
import { JSX } from 'react/jsx-runtime'
import { useFeed } from './useFeed.js'
import { VideoSurface } from '../../components/VideoSurface.js'
import { AdOverlay } from '../../components/AdOverlay.js'
import { BufferingSpinner } from '../../components/BufferingSpinner.js'
import type { FeedConfig, FeedSlot, PlayerHandlers } from '../../types/index.js'

const SWIPE_THRESHOLD = 50
const WHEEL_COOLDOWN_MS = 800

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

  const containerRef = useRef<HTMLDivElement>(null)
  const dragY = useRef<number | null>(null)
  const swiped = useRef(false)
  const wheelLocked = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (swiped.current) return
    dragY.current = e.clientY
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (swiped.current) return
    if (dragY.current === null) return
    const delta = dragY.current - e.clientY
    dragY.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    swiped.current = true
    delta > 0 ? swipeNext() : swipePrev()
    requestAnimationFrame(() => { swiped.current = false })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (swiped.current) return
    dragY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (swiped.current) return
    if (dragY.current === null) return
    const delta = dragY.current - (e.changedTouches[0]?.clientY ?? dragY.current)
    dragY.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    swiped.current = true
    delta > 0 ? swipeNext() : swipePrev()
    requestAnimationFrame(() => { swiped.current = false })
  }

  const onWheelNav = useEffectEvent((deltaY: number) => {
    if (Math.abs(deltaY) < 30) return
    deltaY > 0 ? swipeNext() : swipePrev()
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelLocked.current) return
      wheelLocked.current = true
      onWheelNav(e.deltaY)
      setTimeout(() => { wheelLocked.current = false }, WHEEL_COOLDOWN_MS)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
        touchAction: 'none',
        userSelect: 'none',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
