import type { EventBus } from './EventBus.js'
import type { AdScheduler } from '../ads/AdScheduler.js'

type RunAdFn = (url: string) => Promise<void>
type GetStateFn = () => string

// SRP: single job — watch timeupdate, fire callback when midroll is due
// Extracted from PlayerEngine so each class has one reason to change
export class MidrollWatcher {
  private off: (() => void) | null = null

  constructor(
    private readonly bus: EventBus,
    private readonly getState: GetStateFn,
  ) {}

  // DIP: receives AdScheduler, does not create it
  attach(scheduler: AdScheduler, runAd: RunAdFn): void {
    this.detach()
    this.off = this.bus.on('timeupdate', async ({ currentTime }) => {
      if (this.getState() === 'ad') return
      const url = scheduler.consumeMidrollAt(currentTime)
      if (url) await runAd(url)
    })
  }

  detach(): void {
    this.off?.()
    this.off = null
  }
}
