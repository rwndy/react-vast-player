import { useEffect, useRef, useState, useEffectEvent } from 'react'

const HIDE_DELAY_MS = 3000

export function useControlsVisibility(
  containerRef: React.RefObject<HTMLDivElement | null>,
  playing: boolean,
): boolean {
  const [visible, setVisible] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useEffectEvent(() => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(true)
    if (playing) {
      timer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS)
    }
  })

  useEffect(() => {
    if (!playing) {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      setVisible(true)
    } else {
      show()
    }
  }, [playing])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousemove', show)
    el.addEventListener('mouseenter', show)
    el.addEventListener('touchstart', show, { passive: true })
    el.addEventListener('keydown', show)
    return () => {
      el.removeEventListener('mousemove', show)
      el.removeEventListener('mouseenter', show)
      el.removeEventListener('touchstart', show)
      el.removeEventListener('keydown', show)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return visible
}
