import { useEffect, useState } from 'react'

export interface UsePipResult {
  pipActive: boolean
  togglePip: () => Promise<void>
}

export function usePip(videoRef: React.RefObject<HTMLVideoElement | null>): UsePipResult {
  const [pipActive, setPipActive] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onEnter = () => setPipActive(true)
    const onLeave = () => setPipActive(false)
    el.addEventListener('enterpictureinpicture', onEnter)
    el.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter)
      el.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [videoRef])

  const togglePip = async () => {
    const el = videoRef.current
    if (!el) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await el.requestPictureInPicture()
      }
    } catch {}
  }

  return { pipActive, togglePip }
}
