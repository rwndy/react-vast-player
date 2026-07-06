'use client'

import { memo, useCallback, useState } from 'react'
import type { NamedExoticComponent } from 'react'
import { Maximize, Play, Pause, VolumeOff, Volume2, PictureInPicture, PictureInPicture2 } from 'lucide-react'
import type { ControlsState } from '../types/index.js'

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

interface ControlBarProps {
  state: ControlsState
  onPlay: () => void
  onPause: () => void
  onSeek: (t: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onSetVolume?: (v: number) => void
  onSetPlaybackRate?: (rate: number) => void
  onTogglePip?: () => void
  pipActive?: boolean
  midrollPositions?: number[]
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

const supportsHover =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

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
  onSetVolume,
  onSetPlaybackRate,
  onTogglePip,
  pipActive = false,
  midrollPositions,
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
      <div style={{ position: 'relative' }}>
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
        {safeDuration > 0 &&
          midrollPositions?.map(pos =>
            pos > 0 && pos < safeDuration ? (
              <span
                key={pos}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${(pos / safeDuration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  pointerEvents: 'none',
                }}
              />
            ) : null,
          )}
      </div>
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
        <VolumeControl
          volume={state.volume}
          muted={state.muted}
          onToggleMute={onToggleMute}
          {...(onSetVolume !== undefined ? { onSetVolume } : {})}
        />
        {onSetPlaybackRate && (
          <select
            value={state.playbackRate}
            onChange={e => onSetPlaybackRate(Number(e.target.value))}
            aria-label="Playback rate"
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 11,
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            {RATES.map(r => (
              <option key={r} value={r} style={{ background: '#222', color: '#fff' }}>
                {r}x
              </option>
            ))}
          </select>
        )}
        {onTogglePip && (
          <CtrlBtn
            onClick={onTogglePip}
            label={pipActive ? 'Exit picture-in-picture' : 'Picture-in-picture'}
          >
            {pipActive ? (
              <PictureInPicture2 width={16} height={16} />
            ) : (
              <PictureInPicture width={16} height={16} />
            )}
          </CtrlBtn>
        )}
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

const VolumeControl = memo(function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onSetVolume,
}: {
  volume: number
  muted: boolean
  onToggleMute: () => void
  onSetVolume?: (v: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => supportsHover && setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <CtrlBtn onClick={onToggleMute} label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeOff width={16} height={16} /> : <Volume2 width={16} height={16} />}
      </CtrlBtn>
      {supportsHover && onSetVolume && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={muted ? 0 : volume}
          onChange={e => onSetVolume(Number(e.target.value))}
          aria-label="Volume"
          style={{
            width: expanded ? 80 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            accentColor: '#4a9eff',
            cursor: 'pointer',
            padding: 0,
            margin: 0,
          }}
        />
      )}
    </div>
  )
})
