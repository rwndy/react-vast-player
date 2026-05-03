import { forwardRef, ForwardRefExoticComponent, RefAttributes } from 'react'

interface VideoSurfaceProps {
  muted?: boolean | undefined
  autoPlay?: boolean | undefined
  playsInline?: boolean | undefined
  style?: React.CSSProperties
  className?: string | undefined
}

export const VideoSurface: ForwardRefExoticComponent<
  VideoSurfaceProps & RefAttributes<HTMLVideoElement>
> = forwardRef<HTMLVideoElement, VideoSurfaceProps>(function VideoSurface(
  { muted = false, autoPlay = false, playsInline = true, style, className },
  ref,
) {
  return (
    <video
      ref={ref}
      muted={muted}
      autoPlay={autoPlay}
      playsInline={playsInline}
      controls={false}
      preload="metadata"
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
    />
  )
})
