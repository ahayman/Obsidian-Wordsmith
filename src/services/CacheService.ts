import {
  CacheEntry,
  LookupCache,
  SynonymResult,
  RelationshipType,
} from "../types/types";
import { LanguageCode } from "../types/language";

const CACHE_VERSION = 3; // Bumped for new cache structure

export class CacheService {
  private entries: Map<string, CacheEntry>;
  private _maxSize: number;

  constructor(cache: LookupCache, maxSize: number) {
    this._maxSize = maxSize;
    this.entries = new Map(Object.entries(cache.entries));
  }

  private normalizeKey(word: string, language: LanguageCode = "en"): string {
    return `${word.toLowerCase().trim()}:${language}`;
  }

  /**
   * Get cached results for a specific service.
   */
  getService(word: string, serviceId: string, language: LanguageCode = "en"): SynonymResult[] | null {
    if (this._maxSize === 0) return null;

    const key = this.normalizeKey(word, language);
    const entry = this.entries.get(key);

    // Guard against old cache format or missing services
    if (!entry || !entry.services || !(serviceId in entry.services)) {
      // Try legacy key format (without language) for backwards compatibility
      if (language === "en") {
        const legacyKey = word.toLowerCase().trim();
        const legacyEntry = this.entries.get(legacyKey);
        if (legacyEntry?.services && serviceId in legacyEntry.services) {
          legacyEntry.lastAccessed = Date.now();
          const serviceData = legacyEntry.services[serviceId];
          if (Array.isArray(serviceData)) {
            return serviceData;
          }
          return serviceData?.results ?? null;
        }
      }
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
   * Returns null if any of the requested types haven't been fetched yet.
   */
  getServiceForTypes(word: string, serviceId: string, types: RelationshipType[], language: LanguageCode = "en"): SynonymResult[] | null {
    const results = this.getService(word, serviceId, language);
    if (!results) return null;

    // Verify all requested types have been fetched - if not, return null
    // so the caller knows to fetch the missing types
    const fetchedTypes = this.getFetchedTypes(word, serviceId, language);
    if (!types.every(t => fetchedTypes.includes(t))) {
      return null;
    }

    return results.filter(r => types.includes(r.type as RelationshipType));
  }

  /**
   * Get which relationship types have been fetched for a service.
   */
  getFetchedTypes(word: string, serviceId: string, language: LanguageCode = "en"): RelationshipType[] {
    const key = this.normalizeKey(word, language);
    const entry = this.entries.get(key);

    if (!entry || !entry.services || !(serviceId in entry.services)) {
      // Try legacy key format for backwards compatibility
      if (language === "en") {
        const legacyKey = word.toLowerCase().trim();
        const legacyEntry = this.entries.get(legacyKey);
        if (legacyEntry?.services && serviceId in legacyEntry.services) {
          const serviceData = legacyEntry.services[serviceId];
          if (Array.isArray(serviceData)) {
            return ["synonym", "related"];
          }
          return serviceData?.fetchedTypes ?? [];
        }
      }
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
  getMissingTypes(word: string, serviceId: string, requestedTypes: RelationshipType[], language: LanguageCode = "en"): RelationshipType[] {
    const fetchedTypes = this.getFetchedTypes(word, serviceId, language);
    return requestedTypes.filter(t => !fetchedTypes.includes(t));
  }

  /**
   * Cache results for a specific service with type tracking.
   */
  setService(word: string, serviceId: string, results: SynonymResult[], fetchedTypes?: RelationshipType[], language: LanguageCode = "en"): void {
    if (this._maxSize === 0) return;

    const key = this.normalizeKey(word, language);
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
  hasService(word: string, serviceId: string, language: LanguageCode = "en"): boolean {
    const key = this.normalizeKey(word, language);
    const entry = this.entries.get(key);
    if (entry !== undefined && entry.services !== undefined && serviceId in entry.services) {
      return true;
    }
    // Check legacy key format for backwards compatibility
    if (language === "en") {
      const legacyKey = word.toLowerCase().trim();
      const legacyEntry = this.entries.get(legacyKey);
      return legacyEntry !== undefined && legacyEntry.services !== undefined && serviceId in legacyEntry.services;
    }
    return false;
  }

  /**
   * Check if specific types are cached for a service.
   */
  hasServiceTypes(word: string, serviceId: string, types: RelationshipType[], language: LanguageCode = "en"): boolean {
    const fetchedTypes = this.getFetchedTypes(word, serviceId, language);
    return types.every(t => fetchedTypes.includes(t));
  }

  /**
   * Get list of service IDs that are NOT cached for a word.
   */
  getMissingServices(word: string, serviceIds: string[], language: LanguageCode = "en"): string[] {
    const key = this.normalizeKey(word, language);
    const entry = this.entries.get(key);

    if (!entry || !entry.services) {
      // Check legacy key format for backwards compatibility
      if (language === "en") {
        const legacyKey = word.toLowerCase().trim();
        const legacyEntry = this.entries.get(legacyKey);
        if (legacyEntry?.services) {
          return serviceIds.filter((id) => !(id in legacyEntry.services));
        }
      }
      return serviceIds;
    }

    return serviceIds.filter((id) => !(id in entry.services));
  }

  /**
   * Get all cached service results for a word.
   * Returns null if no cache entry exists.
   */
  getAllServices(word: string, language: LanguageCode = "en"): Record<string, SynonymResult[]> | null {
    if (this._maxSize === 0) return null;

    const key = this.normalizeKey(word, language);
    let entry = this.entries.get(key);

    // Try legacy key format for backwards compatibility
    if (!entry && language === "en") {
      const legacyKey = word.toLowerCase().trim();
      entry = this.entries.get(legacyKey);
    }

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
  setMultipleServices(word: string, results: Record<string, SynonymResult[]>, fetchedTypes?: RelationshipType[], language: LanguageCode = "en"): void {
    if (this._maxSize === 0) return;

    for (const [serviceId, serviceResults] of Object.entries(results)) {
      this.setService(word, serviceId, serviceResults, fetchedTypes, language);
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
