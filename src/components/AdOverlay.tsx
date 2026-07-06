import type { AdState } from '../types/index.js'
import { JSX } from 'react/jsx-runtime'

interface AdOverlayProps {
  adState: AdState
  onSkip: () => void
  onClickAd?: () => void
}

export const AdOverlay = function AdOverlay({
  adState,
  onSkip,
  onClickAd,
}: AdOverlayProps): JSX.Element | null {
  if (!adState.active) return null

  const canSkip = adState.skippable && adState.currentTime >= adState.skipOffset
  const remaining = Math.max(0, Math.ceil(adState.skipOffset - adState.currentTime))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <AdBadge {...(onClickAd !== undefined ? { onClick: onClickAd } : {})} />
      {adState.skippable && <SkipButton canSkip={canSkip} remaining={remaining} onSkip={onSkip} />}
    </div>
  )
}

const AdBadge = function AdBadge({ onClick }: { onClick?: () => void }) {
  const clickable = onClick !== undefined
  return (
    <div
      {...(clickable
        ? { role: 'button', 'aria-label': 'Learn more about this ad' }
        : { 'aria-hidden': true })}
      {...(clickable ? { onClick } : {})}
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        background: 'rgba(0,0,0,0.65)',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 3,
        letterSpacing: '0.08em',
        cursor: clickable ? 'pointer' : 'default',
        pointerEvents: clickable ? 'all' : 'none',
        userSelect: 'none',
      }}
    >
      AD
    </div>
  )
}

const SkipButton = function SkipButton({
  canSkip,
  remaining,
  onSkip,
}: {
  canSkip: boolean
  remaining: number
  onSkip: () => void
}) {
  return (
    <button
      onClick={canSkip ? onSkip : undefined}
      disabled={!canSkip}
      aria-label={canSkip ? 'Skip this ad' : `Skip available in ${remaining}s`}
      style={{
        position: 'absolute',
        bottom: 56,
        right: 12,
        background: 'rgba(0,0,0,0.7)',
        color: canSkip ? '#fff' : '#999',
        border: `1px solid ${canSkip ? '#fff' : '#555'}`,
        padding: '6px 14px',
        fontSize: 12,
        cursor: canSkip ? 'pointer' : 'default',
        borderRadius: 3,
        pointerEvents: 'all',
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {canSkip ? 'Skip Ad →' : `Skip in ${remaining}s`}
    </button>
  )
}
