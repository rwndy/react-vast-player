import type { PlayerEventMap } from '../types/index.js'

type Listener<T> = T extends void ? () => void : (payload: T) => void
type Unsubscribe = () => void

export class EventBus {
  private readonly listeners = new Map<string, Set<Function>>()

  on<K extends keyof PlayerEventMap>(event: K, listener: Listener<PlayerEventMap[K]>): Unsubscribe {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  emit<K extends keyof PlayerEventMap>(
    event: K,
    ...args: PlayerEventMap[K] extends void ? [] : [PlayerEventMap[K]]
  ): void {
    this.listeners.get(event)?.forEach(fn => fn(...args))
  }

  destroy(): void {
    this.listeners.clear()
  }
}
