'use client'

import { useEffect, useReducer, useEffectEvent } from 'react'
import type { PlayerEngine } from '../core/PlayerEngine.js'
import type { AdState, AdQuartile } from '../types/index.js'

const INITIAL_AD: AdState = {
  active: false,
  skippable: false,
  skipOffset: 0,
  currentTime: 0,
  podIndex: 0,
  podTotal: 0,
  clickTrackingUrls: [],
}

type AdAction =
  | {
      type: 'START'
      skippable: boolean
      skipOffset: number
      podIndex: number
      podTotal: number
      clickThroughUrl?: string
      clickTrackingUrls: string[]
    }
  | { type: 'TICK'; currentTime: number }
  | { type: 'QUARTILE'; quartile: AdQuartile }
  | { type: 'END' }

function reducer(state: AdState, action: AdAction): AdState {
  switch (action.type) {
    case 'START': {
      const next: AdState = {
        ...INITIAL_AD,
        active: true,
        skippable: action.skippable,
        skipOffset: action.skipOffset,
        podIndex: action.podIndex,
        podTotal: action.podTotal,
        clickTrackingUrls: action.clickTrackingUrls,
      }
      if (action.clickThroughUrl !== undefined) next.clickThroughUrl = action.clickThroughUrl
      return next
    }
    case 'TICK':
      return { ...state, currentTime: action.currentTime }
    case 'END':
      return INITIAL_AD
    default:
      return state
  }
}

/** @experimental Low-level ad state hook — prefer useStreamingPlayer/useFeed/usePlaylist. */
export function useAdManager(engine: PlayerEngine | null): AdState {
  const [state, dispatch] = useReducer(reducer, INITIAL_AD)

  const onTick = useEffectEvent(({ currentTime }: { currentTime: number }) => {
    if (engine?.state === 'ad') dispatch({ type: 'TICK', currentTime })
  })

  useEffect(() => {
    if (!engine) return

    const off = [
      engine.bus.on(
        'ad:start',
        ({ skippable, skipOffset, podIndex, podTotal, clickThroughUrl, clickTrackingUrls }) => {
          const action: AdAction = {
            type: 'START',
            skippable,
            skipOffset,
            podIndex,
            podTotal,
            clickTrackingUrls,
          }
          if (clickThroughUrl !== undefined) action.clickThroughUrl = clickThroughUrl
          dispatch(action)
        },
      ),
      engine.bus.on('timeupdate', onTick),
      engine.bus.on('ad:ended', () => dispatch({ type: 'END' })),
      engine.bus.on('ad:skip', () => dispatch({ type: 'END' })),
      engine.bus.on('ad:pod:ended', () => dispatch({ type: 'END' })),
    ]

    return () => off.forEach(fn => fn())
  }, [engine])

  return state
}
