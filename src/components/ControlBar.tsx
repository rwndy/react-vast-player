'use client'

import { memo, useCallback } from 'react'
import type { NamedExoticComponent } from 'react'
import { Maximize, Play, Pause, VolumeOff, Volume2 } from 'lucide-react'
import type { ControlsState } from '../types/index.js'

interface ControlBarProps {
  state: ControlsState
  onPlay: () => void
  onPause: () => void
  onSeek: (t: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

const fmt = (s: number): string => {
  const t = Math.floor(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export const ControlBar: NamedExoticComponent<ControlBarProps> = memo(function ControlBar({
  state,
  onPlay,
  onPause,
  onSeek,
  onToggleMute,
  onToggleFullscreen,
  disabled = false,
  className,
  style,
}: ControlBarProps) {
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(Number(e.target.value))
    },
    [onSeek],
  )
 const safeDuration = isFinite(state.duration) && state.duration > 0 ? state.duration : 0
 const safeTime = isFinite(state.currentTime) && state.currentTime >= 0 ? state.currentTime : 0
 const isLoading = safeDuration === 0

  return (
    <div
      className={className}
      aria-label="Player controls"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        padding: '24px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'all',
        ...style,
      }}
    >
      <input
        type="range"
        min={0}
        max={safeDuration || 100}
        value={isFinite(state.currentTime) ? state.currentTime : 0}
        step={0.1}
        onChange={handleSeek}
        aria-label="Seek"
        disabled={disabled}
        style={{
          width: '100%',
          accentColor: '#4a9eff',
          cursor: isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.4 : 1,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CtrlBtn
          onClick={state.playing ? onPause : onPlay}
          label={state.playing ? 'Pause' : 'Play'}
        >
          {state.playing ? <Pause width={16} height={16} /> : <Play width={16} height={16} />}
        </CtrlBtn>
        <span style={{ color: '#ccc', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
          {isLoading ? '--:-- / --:--' : `${fmt(safeTime)} / ${fmt(safeDuration)}`}
        </span>
        <div style={{ flex: 1 }} />
        <CtrlBtn onClick={onToggleMute} label={state.muted ? 'Unmute' : 'Mute'}>
          {state.muted ? <VolumeOff width={16} height={16} /> : <Volume2 width={16} height={16} />}
        </CtrlBtn>
        <CtrlBtn
          onClick={onToggleFullscreen}
          label={state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <Maximize width={16} height={16} />
        </CtrlBtn>
      </div>
    </div>
  )
})

const CtrlBtn = memo(function CtrlBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: 16,
        cursor: 'pointer',
        padding: '2px 4px',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
})
