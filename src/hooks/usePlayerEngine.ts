'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { PlayerEngine } from '../core/PlayerEngine.js'
import type { PlayerState } from '../types/index.js'

function makeStore(engine: PlayerEngine) {
  const subs = new Set<() => void>()
  let snap: PlayerState = engine.state
  const notify = () => subs.forEach(fn => fn())

  engine.bus.on('statechange', ({ state }) => {
    snap = state
    notify()
  })

  return {
    subscribe: (cb: () => void) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    getSnapshot: () => snap,
    getServerSnapshot: (): PlayerState => 'idle',
  }
}

export interface UsePlayerEngineResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  engineRef: React.RefObject<PlayerEngine | null>
  playerState: PlayerState
}

export function usePlayerEngine(): UsePlayerEngineResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<PlayerEngine>(null)
  const storeRef = useRef<ReturnType<typeof makeStore>>(null)

  if (!engineRef.current) {
    engineRef.current = new PlayerEngine()
    storeRef.current = makeStore(engineRef.current)
  }

  const playerState = useSyncExternalStore(
    storeRef.current!.subscribe,
    storeRef.current!.getSnapshot,
    storeRef.current!.getServerSnapshot,
  )

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    engineRef.current!.attachTech(el)
    return () => engineRef.current?.detachTech()
  }, [])

  return { videoRef, engineRef, playerState }
}
