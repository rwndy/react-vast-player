'use client'

import { memo } from 'react'
import type { NamedExoticComponent } from 'react'

interface BufferingSpinnerProps {
  visible: boolean
  size?: number
  color?: string
  className?: string
}

export const BufferingSpinner: NamedExoticComponent<BufferingSpinnerProps> = memo(
  function BufferingSpinner({
    visible,
    size = 48,
    color = '#fff',
    className,
  }: BufferingSpinnerProps) {
    if (!visible) return null

    return (
      <div
        className={className}
        aria-label="Loading"
        role="status"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          aria-hidden
          style={{ animation: 'rvp-spin 0.8s linear infinite' }}
        >
          <style>{`@keyframes rvp-spin { to { transform: rotate(360deg) } }`}</style>
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="90 30"
          />
        </svg>
      </div>
    )
  },
)
