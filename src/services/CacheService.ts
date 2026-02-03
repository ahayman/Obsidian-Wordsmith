import {
  CacheEntry,
  LookupCache,
  SynonymResult,
} from "../types";

const CACHE_VERSION = 2;

export class CacheService {
  private entries: Map<string, CacheEntry>;
  private _maxSize: number;

  constructor(cache: LookupCache, maxSize: number) {
    this._maxSize = maxSize;
    this.entries = new Map(Object.entries(cache.entries));
  }

  private normalizeKey(word: string): string {
    return word.toLowerCase().trim();
  }

  /**
   * Get cached results for a specific service.
   */
  getService(word: string, serviceId: string): SynonymResult[] | null {
    if (this._maxSize === 0) return null;

    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);

    // Guard against old cache format or missing services
    if (!entry || !entry.services || !(serviceId in entry.services)) {
      return null;
    }

    // Update lastAccessed for LRU
    entry.lastAccessed = Date.now();
    return entry.services[serviceId] ?? null;
  }

  /**
   * Cache results for a specific service.
   */
  setService(word: string, serviceId: string, results: SynonymResult[]): void {
    if (this._maxSize === 0) return;

    const key = this.normalizeKey(word);
    const existing = this.entries.get(key);

    if (existing) {
      // Add/update service results in existing entry
      existing.services[serviceId] = results;
      existing.lastAccessed = Date.now();
      return;
    }

    // Evict oldest entries if at capacity
    while (this.entries.size >= this._maxSize) {
      this.evictOldest();
    }

    // Create new entry
    this.entries.set(key, {
      word: key,
      services: { [serviceId]: results },
      lastAccessed: Date.now(),
    });
  }

  /**
   * Check if a specific service is cached for a word.
   */
  hasService(word: string, serviceId: string): boolean {
    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);
    return entry !== undefined && entry.services !== undefined && serviceId in entry.services;
  }

  /**
   * Get list of service IDs that are NOT cached for a word.
   */
  getMissingServices(word: string, serviceIds: string[]): string[] {
    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);

    if (!entry || !entry.services) {
      return serviceIds;
    }

    return serviceIds.filter((id) => !(id in entry.services));
  }

  /**
   * Get all cached service results for a word.
   * Returns null if no cache entry exists.
   */
  getAllServices(word: string): Record<string, SynonymResult[]> | null {
    if (this._maxSize === 0) return null;

    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);

    if (!entry || !entry.services) return null;

    // Update lastAccessed for LRU
    entry.lastAccessed = Date.now();
    return entry.services;
  }

  /**
   * Cache multiple service results at once.
   */
  setMultipleServices(word: string, results: Record<string, SynonymResult[]>): void {
    if (this._maxSize === 0) return;

    const key = this.normalizeKey(word);
    const existing = this.entries.get(key);

    if (existing) {
      // Merge new results into existing entry
      Object.assign(existing.services, results);
      existing.lastAccessed = Date.now();
      return;
    }

    // Evict oldest entries if at capacity
    while (this.entries.size >= this._maxSize) {
      this.evictOldest();
    }

    // Create new entry
    this.entries.set(key, {
      word: key,
      services: { ...results },
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
      version: CACHE_VERSION,
    };
  }
}
