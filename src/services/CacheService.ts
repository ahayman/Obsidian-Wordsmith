import { CacheEntry, GroupedLookupResult, LookupCache } from "../types";

export class CacheService {
  private entries: Map<string, CacheEntry>;
  private _maxSize: number;

  constructor(cache: LookupCache, maxSize: number) {
    this.entries = new Map(Object.entries(cache.entries));
    this._maxSize = maxSize;
  }

  private normalizeKey(word: string): string {
    return word.toLowerCase().trim();
  }

  get(word: string): GroupedLookupResult | null {
    if (this._maxSize === 0) return null;

    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);

    if (!entry) return null;

    // Update lastAccessed for LRU
    entry.lastAccessed = Date.now();
    return entry.result;
  }

  set(word: string, result: GroupedLookupResult): void {
    if (this._maxSize === 0) return;

    const key = this.normalizeKey(word);

    // If key already exists, update it
    if (this.entries.has(key)) {
      this.entries.set(key, {
        word: key,
        result,
        lastAccessed: Date.now(),
      });
      return;
    }

    // Evict oldest entries if at capacity
    while (this.entries.size >= this._maxSize) {
      this.evictOldest();
    }

    this.entries.set(key, {
      word: key,
      result,
      lastAccessed: Date.now(),
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.entries.delete(oldestKey);
    }
  }

  setMaxSize(size: number): void {
    this._maxSize = size;

    if (size === 0) {
      this.entries.clear();
      return;
    }

    // Evict entries if new size is smaller than current count
    while (this.entries.size > size) {
      this.evictOldest();
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  get maxSize(): number {
    return this._maxSize;
  }

  toCache(): LookupCache {
    const entries: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.entries) {
      entries[key] = entry;
    }
    return {
      entries,
      version: 1,
    };
  }
}
