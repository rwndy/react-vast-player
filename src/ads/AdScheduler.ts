export interface MidrollEntry {
  time: number
  url: string
}

export interface AdScheduleConfig {
  prerollUrl?: string
  midrolls?: MidrollEntry[]
  postrollUrl?: string
}

/** @experimental Internal ad slot scheduler — API may change before v1.0.0. */
export class AdScheduler {
  private prerollConsumed = false
  private postrollConsumed = false
  private firedMidrolls = new Set<number>()

  constructor(private readonly config: AdScheduleConfig) {}

  consumePreroll(): string | null {
    if (this.prerollConsumed || !this.config.prerollUrl) return null
    this.prerollConsumed = true
    return this.config.prerollUrl
  }

  consumePostroll(): string | null {
    if (this.postrollConsumed || !this.config.postrollUrl) return null
    this.postrollConsumed = true
    return this.config.postrollUrl
  }

  consumeMidrollAt(currentTime: number): string | null {
    const entry = this.config.midrolls?.find(
      m => !this.firedMidrolls.has(m.time) && currentTime >= m.time,
    )
    if (!entry) return null
    this.firedMidrolls.add(entry.time)
    return entry.url
  }

  reset(): void {
    this.prerollConsumed = false
    this.postrollConsumed = false
    this.firedMidrolls.clear()
  }
}
