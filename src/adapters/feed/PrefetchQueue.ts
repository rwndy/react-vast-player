import { loadVast } from '../../ads/VastLoader.js'
import type { VastAd } from '../../types/index.js'

export class PrefetchQueue {
  private readonly cache = new Map<string, Promise<VastAd[]>>()

  prefetch(url: string): void {
    if (this.cache.has(url)) return
    const promise = loadVast(url).catch(err => {
      this.cache.delete(url)
      return Promise.reject(err)
    })
    this.cache.set(url, promise)
  }

  resolve(url: string): Promise<VastAd[]> {
    if (!this.cache.has(url)) this.prefetch(url)
    return this.cache.get(url)!
  }

  clear(): void {
    this.cache.clear()
  }
}
