import type { EventBus } from './EventBus.js'
import type { AdPodManager } from '../ads/AdPodManager.js'
import { loadVast } from '../ads/VastLoader.js'
import { VastError } from '../ads/VastError.js'

// DIP: receives AdPodManager instead of creating it
// OCP: loader is injected — swap for custom loader without modifying this class
export class AdOrchestrator {
  constructor(
    private readonly podManager: AdPodManager,
    private readonly bus: EventBus,
    private readonly loader: typeof loadVast = loadVast,
  ) {}

  async run(vastUrl: string): Promise<void> {
    try {
      const ads = await this.loader(vastUrl)
      if (!ads.length) throw new VastError(900, 'Empty VAST response')
      await this.podManager.playPod(ads)
    } catch (err) {
      const code = err instanceof VastError ? err.code : 900
      this.bus.emit('ad:error', { reason: (err as Error).message, vastErrorCode: code })
    }
  }

  skip(): void {
    this.podManager.skip()
  }
}
