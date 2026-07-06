'use client'

import { useCallback, useEffect, useReducer, useRef, useEffectEvent } from 'react'
import type { IPlaybackControl, ControlsState } from '../types/index.js'

const INITIAL: ControlsState = {
  playing: false,
  currentTime: 0,
  duration: 0,
  buffering: false,
  volume: 1,
  muted: false,
  fullscreen: false,
  playbackRate: 1,
}

type Action =
  | { type: 'PLAY' | 'PAUSE' | 'BUFFER' | 'CANPLAY' | 'RESET' }
  | { type: 'TIME'; currentTime: number; duration: number }
  | { type: 'VOL'; volume: number; muted: boolean }
  | { type: 'FULL'; fullscreen: boolean }
  | { type: 'PLAYRATE'; playbackRate: number }

function reducer(state: ControlsState, action: Action): ControlsState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, playing: true, buffering: false }
    case 'PAUSE':
      return { ...state, playing: false }
    case 'BUFFER':
      return { ...state, buffering: true }
    case 'CANPLAY':
      return { ...state, buffering: false }
    case 'RESET':
      return { ...state, currentTime: 0, duration: 0 }
    case 'TIME':
      if (!isFinite(action.duration) || action.duration <= 0) return state
      if (!isFinite(action.currentTime)) return state
      return { ...state, currentTime: action.currentTime, duration: action.duration }
    case 'VOL':
      return { ...state, volume: action.volume, muted: action.muted }
    case 'FULL':
      return { ...state, fullscreen: action.fullscreen }
    case 'PLAYRATE':
      return { ...state, playbackRate: action.playbackRate }
    default:
      return state
  }
}

export interface UseControlsResult {
  state: ControlsState
  containerRef: React.RefObject<HTMLDivElement | null>
  play: () => void
  pause: () => void
  seek: (t: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  setPlaybackRate: (rate: number) => void
}

// ISP: depends on IPlaybackControl only, not the full PlayerEngine
export function useControls(player: IPlaybackControl | null): UseControlsResult {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const containerRef = useRef<HTMLDivElement>(null)
  const userRateRef = useRef(1)
  const adActiveRef = useRef(false)

const onTime = useEffectEvent(
  ({ currentTime, duration }: { currentTime: number; duration: number }) => {
    if (!isFinite(duration) || duration <= 0) return
    dispatch({ type: 'TIME', currentTime, duration })
  },
)

  useEffect(() => {
    const engine = player as any
    if (!engine?.bus) return

    const stored = localStorage.getItem('rvp:volume')
    if (stored !== null) {
      const v = parseFloat(stored)
      if (isFinite(v) && v >= 0 && v <= 1) player?.volume(v)
    }

    dispatch({ type: 'VOL', volume: engine.tech?.volume ?? 1, muted: engine.muted ?? false })

    const off = [
      engine.bus.on('play', () => dispatch({ type: 'PLAY' })),
      engine.bus.on('pause', () => dispatch({ type: 'PAUSE' })),
      engine.bus.on('buffering', () => dispatch({ type: 'BUFFER' })),
      engine.bus.on('canplay', () => dispatch({ type: 'CANPLAY' })),
      engine.bus.on('timeupdate', onTime),
      engine.bus.on('volumechange', ({ volume, muted }: { volume: number; muted: boolean }) =>
        dispatch({ type: 'VOL', volume, muted }),
      ),
      engine.bus.on('statechange', ({ state: s }: { state: string }) => {
        if (s === 'loading') dispatch({ type: 'RESET' })
        if (s === 'ad' && !adActiveRef.current) {
          adActiveRef.current = true
          player?.setPlaybackRate(1)
          dispatch({ type: 'PLAYRATE', playbackRate: 1 })
        } else if (s !== 'ad' && adActiveRef.current) {
          adActiveRef.current = false
          player?.setPlaybackRate(userRateRef.current)
          dispatch({ type: 'PLAYRATE', playbackRate: userRateRef.current })
        }
      }),
    ]

    const onFullChange = () => {
      const isFullscreen =
        !!document.fullscreenElement || !!(document as any).webkitFullscreenElement
      dispatch({ type: 'FULL', fullscreen: isFullscreen })
    }

    document.addEventListener('fullscreenchange', onFullChange)
    document.addEventListener('webkitfullscreenchange', onFullChange)
    off.push(
      () => document.removeEventListener('fullscreenchange', onFullChange),
      () => document.removeEventListener('webkitfullscreenchange', onFullChange),
    )

    const video = containerRef.current?.querySelector('video')
    if (video) {
      const onIOSBegin = () => dispatch({ type: 'FULL', fullscreen: true })
      const onIOSEnd = () => dispatch({ type: 'FULL', fullscreen: false })
      video.addEventListener('webkitbeginfullscreen', onIOSBegin)
      video.addEventListener('webkitendfullscreen', onIOSEnd)
      off.push(
        () => video.removeEventListener('webkitbeginfullscreen', onIOSBegin),
        () => video.removeEventListener('webkitendfullscreen', onIOSEnd),
      )
    }

    return () => off.forEach(fn => fn())
  }, [player])

  const play = useCallback(() => player?.play(), [player])
  const pause = useCallback(() => player?.pause(), [player])
  const seek = useCallback((t: number) => player?.seek(t), [player])
  const setVolume = useCallback(
    (v: number) => {
      player?.volume(v)
      try {
        localStorage.setItem('rvp:volume', String(v))
      } catch {}
    },
    [player],
  )
  const toggleMute = useCallback(() => player?.mute(!state.muted), [player, state.muted])
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const isInFullscreen =
      !!document.fullscreenElement || !!(document as any).webkitFullscreenElement

    if (isInFullscreen) {
      if (document.exitFullscreen) void document.exitFullscreen()
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
      return
    }

    if (el.requestFullscreen) {
      void el.requestFullscreen()
    } else if ((el as any).webkitRequestFullscreen) {
      ;(el as any).webkitRequestFullscreen()
    } else {
      const video = el.querySelector('video')
      if (video && (video as any).webkitEnterFullscreen) {
        ;(video as any).webkitEnterFullscreen()
      }
    }
  }, [])

  const setPlaybackRate = (rate: number) => {
    userRateRef.current = rate
    player?.setPlaybackRate(rate)
    dispatch({ type: 'PLAYRATE', playbackRate: rate })
  }

  const handleKey = useEffectEvent((e: KeyboardEvent) => {
    const container = containerRef.current
    if (!container?.contains(document.activeElement)) return
    const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (player?.state === 'ad') return

    switch (e.key) {
      case ' ': {
        e.preventDefault()
        if (state.playing) player?.pause()
        else player?.play()
        break
      }
      case 'ArrowLeft':
        e.preventDefault()
        player?.seek(Math.max(0, state.currentTime - 5))
        break
      case 'ArrowRight':
        e.preventDefault()
        player?.seek(Math.min(state.duration, state.currentTime + 5))
        break
      case 'm':
      case 'M':
        e.preventDefault()
        player?.mute(!state.muted)
        break
      case 'f':
      case 'F':
        e.preventDefault()
        toggleFullscreen()
        break
    }
  })

  useEffect(() => {
    const el = containerRef.current
    if (el && !el.hasAttribute('tabindex')) el.tabIndex = 0
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return { state, containerRef, play, pause, seek, setVolume, toggleMute, toggleFullscreen, setPlaybackRate }
}
