import {
  CacheEntry,
  LookupCache,
  SynonymResult,
  RelationshipType,
} from "../types";

const CACHE_VERSION = 3; // Bumped for new cache structure

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
    const serviceData = entry.services[serviceId];
    // Handle both old format (array) and new format (object with results)
    if (Array.isArray(serviceData)) {
      return serviceData;
    }
    return serviceData?.results ?? null;
  }

  /**
   * Get cached results for a specific service, filtered by types.
   */
  getServiceForTypes(word: string, serviceId: string, types: RelationshipType[]): SynonymResult[] | null {
    const results = this.getService(word, serviceId);
    if (!results) return null;

    return results.filter(r => types.includes(r.type as RelationshipType));
  }

  /**
   * Get which relationship types have been fetched for a service.
   */
  getFetchedTypes(word: string, serviceId: string): RelationshipType[] {
    const key = this.normalizeKey(word);
    const entry = this.entries.get(key);

    if (!entry || !entry.services || !(serviceId in entry.services)) {
      return [];
    }

    const serviceData = entry.services[serviceId];
    // Handle old format (array) - assume synonym and related
    if (Array.isArray(serviceData)) {
      return ["synonym", "related"];
    }
    return serviceData?.fetchedTypes ?? [];
  }

  /**
   * Get which relationship types are NOT cached for a service.
   */
  getMissingTypes(word: string, serviceId: string, requestedTypes: RelationshipType[]): RelationshipType[] {
    const fetchedTypes = this.getFetchedTypes(word, serviceId);
    return requestedTypes.filter(t => !fetchedTypes.includes(t));
  }

  /**
   * Cache results for a specific service with type tracking.
   */
  setService(word: string, serviceId: string, results: SynonymResult[], fetchedTypes?: RelationshipType[]): void {
    if (this._maxSize === 0) return;

    const key = this.normalizeKey(word);
    const existing = this.entries.get(key);

    // Infer fetched types from results if not provided
    const types = fetchedTypes || this.inferTypesFromResults(results);

    if (existing) {
      const existingData = existing.services[serviceId];
      if (existingData && !Array.isArray(existingData)) {
        // Merge with existing data
        const mergedTypes = [...new Set([...existingData.fetchedTypes, ...types])];
        const mergedResults = this.mergeResults(existingData.results, results);
        existing.services[serviceId] = {
          results: mergedResults,
          fetchedTypes: mergedTypes,
        };
      } else {
        // New service or old format - replace
        existing.services[serviceId] = {
          results,
          fetchedTypes: types,
        };
      }
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
      services: { [serviceId]: { results, fetchedTypes: types } },
      lastAccessed: Date.now(),
    });
  }

  /**
   * Infer relationship types from result array.
   */
  private inferTypesFromResults(results: SynonymResult[]): RelationshipType[] {
    const types = new Set<RelationshipType>();
    for (const r of results) {
      if (r.type !== "spelling") {
        types.add(r.type as RelationshipType);
      }
    }
    // If no results, assume synonym was at least attempted
    if (types.size === 0) {
      types.add("synonym");
    }
    return Array.from(types);
  }

  /**
   * Merge two result arrays, deduplicating by word+type.
   */
  private mergeResults(existing: SynonymResult[], newResults: SynonymResult[]): SynonymResult[] {
    const seen = new Set<string>();
    const merged: SynonymResult[] = [];

    for (const r of existing) {
      const key = `${r.type}:${r.word.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    for (const r of newResults) {
      const key = `${r.type}:${r.word.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    return merged;
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
   * Check if specific types are cached for a service.
   */
  hasServiceTypes(word: string, serviceId: string, types: RelationshipType[]): boolean {
    const fetchedTypes = this.getFetchedTypes(word, serviceId);
    return types.every(t => fetchedTypes.includes(t));
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

    // Convert to flat results format
    const result: Record<string, SynonymResult[]> = {};
    for (const [serviceId, data] of Object.entries(entry.services)) {
      if (Array.isArray(data)) {
        result[serviceId] = data;
      } else {
        result[serviceId] = data.results;
      }
    }
    return result;
  }

  /**
   * Cache multiple service results at once.
   */
  setMultipleServices(word: string, results: Record<string, SynonymResult[]>, fetchedTypes?: RelationshipType[]): void {
    if (this._maxSize === 0) return;

    for (const [serviceId, serviceResults] of Object.entries(results)) {
      this.setService(word, serviceId, serviceResults, fetchedTypes);
    }
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
