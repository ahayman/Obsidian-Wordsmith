import { App } from "obsidian";
import {
  GroupedLookupResult,
  SynonymResult,
  WordsmithSettings,
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
  SourceConfig,
  BuiltinTabId,
  TabMetadata,
  TAB_LABELS,
  StreamingLookupCallbacks,
  StreamingLookupHandle,
  RelationshipType,
  ALL_RELATIONSHIP_TYPES,
} from "../types/types";
import { LanguageCode, ResolvedLanguage } from "../types/language";
import { WordNetService } from "./WordNetService";
import { MobyService } from "./MobyService";
import { DatamuseService } from "./DatamuseService";
import { NSpellService } from "./NSpellService";
import { SpellingService } from "./SpellingService";
import { SynonymService } from "./SynonymService";
import { createAPIService } from "./api";
import { CacheService } from "./CacheService";
import { LanguageResolver } from "./LanguageResolver";
import { getAPIServiceInfo, BUILTIN_SERVICE_TYPES } from "./SynonymService";
import { serviceSupportsLanguage } from "../data/languages";

export class DataService {
  private app: App;
  private settings: WordsmithSettings;
  wordNet: WordNetService;
  moby: MobyService;
  datamuse: DatamuseService;
  nspell: NSpellService;
  private spellingService: SpellingService;
  private apiServices: Map<string, SynonymService> = new Map();
  cacheService: CacheService;
  private languageResolver: LanguageResolver;

  constructor(app: App, pluginDir: string, settings: WordsmithSettings) {
    this.app = app;
    this.settings = settings;
    this.wordNet = new WordNetService(app, pluginDir);
    this.moby = new MobyService(app, pluginDir);
    this.datamuse = new DatamuseService(settings.maxResults);
    this.nspell = new NSpellService(app, pluginDir);
    this.spellingService = new SpellingService(this.nspell, this.datamuse, settings);
    this.cacheService = new CacheService(settings.lookupCache, settings.maxCacheSize);
    this.languageResolver = new LanguageResolver(app, settings);
    this.initializeAPIServices();
  }

  private initializeAPIServices(): void {
    this.apiServices.clear();
    for (const source of this.settings.sources) {
      if (isAPISource(source)) {
        try {
          const service = createAPIService(source.config);
          this.apiServices.set(source.id, service);
        } catch (error) {
          console.error(`Failed to create API service ${source.id}:`, error);
        }
      }
    }
  }

  updateSettings(settings: WordsmithSettings): void {
    this.settings = settings;
    this.datamuse.setMaxResults(settings.maxResults);
    this.cacheService.setMaxSize(settings.maxCacheSize);
    this.spellingService.updateSettings(settings);
    this.languageResolver.updateSettings(settings);
    this.initializeAPIServices();
  }

  /**
   * Resolve the language to use for lookup.
   * @param contextText - Optional text to use for auto-detection
   */
  resolveLanguage(contextText?: string): ResolvedLanguage {
    return this.languageResolver.resolveLanguage(contextText);
  }

  /**
   * Check if any enabled services support the given language.
   */
  hasServicesForLanguage(language: LanguageCode): boolean {
    const enabledSources = this.getEnabledSources();
    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (serviceSupportsLanguage(source.id, language)) {
          return true;
        }
      } else if (isAPISource(source)) {
        if (serviceSupportsLanguage(source.config.type, language)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the count of enabled services that support a language.
   */
  countServicesForLanguage(language: LanguageCode): number {
    let count = 0;
    const enabledSources = this.getEnabledSources();
    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (serviceSupportsLanguage(source.id, language)) {
          count++;
        }
      } else if (isAPISource(source)) {
        if (serviceSupportsLanguage(source.config.type, language)) {
          count++;
        }
      }
    }
    return count;
  }

  private isBuiltinSourceEnabled(sourceId: BuiltinTabId): boolean {
    const source = this.settings.sources.find(
      (s): s is { kind: "builtin"; id: BuiltinTabId; enabled: boolean } =>
        isBuiltinSource(s) && s.id === sourceId
    );
    return source?.enabled ?? false;
  }

  private getEnabledSources(): SourceConfig[] {
    return this.settings.sources.filter(isSourceEnabled);
  }

  async initialize(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    if (this.isBuiltinSourceEnabled("local")) {
      loadPromises.push(this.wordNet.load());
      loadPromises.push(this.moby.load());
    }

    // Load nspell if downloaded
    if (this.settings.nspellDownloaded) {
      loadPromises.push(this.nspell.load());
    }

    await Promise.all(loadPromises);
  }

  async lookup(word: string): Promise<GroupedLookupResult> {
    const result: GroupedLookupResult = {
      originalWord: word,
      results: {},
    };

    const enabledSources = this.getEnabledSources();
    const lookupPromises: Promise<void>[] = [];

    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (source.id === "local") {
          // Check cache first
          const cached = this.cacheService.getService(word, "local");
          if (cached) {
            result.results["local"] = cached;
          } else {
            const localResults = this.lookupLocal(word);
            result.results["local"] = localResults;
            this.cacheService.setService(word, "local", localResults);
          }
        } else if (source.id === "datamuse") {
          const cached = this.cacheService.getService(word, "datamuse");
          if (cached) {
            result.results["datamuse"] = cached;
          } else {
            lookupPromises.push(
              this.lookupDatamuse(word).then((results) => {
                result.results["datamuse"] = results;
                this.cacheService.setService(word, "datamuse", results);
              })
            );
          }
        }
      } else if (isAPISource(source)) {
        const cached = this.cacheService.getService(word, source.id);
        if (cached) {
          result.results[source.id] = cached;
        } else {
          const service = this.apiServices.get(source.id);
          if (service) {
            lookupPromises.push(
              this.lookupAPIService(service, word).then((results) => {
                result.results[source.id] = results;
                this.cacheService.setService(word, source.id, results);
              })
            );
          }
        }
      }
    }

    // Add spelling suggestions lookup
    const cachedSpelling = this.cacheService.getService(word, "spelling");
    if (cachedSpelling) {
      if (cachedSpelling.length > 0) {
        result.results["spelling"] = cachedSpelling;
      }
    } else {
      lookupPromises.push(
        this.spellingService.getSuggestions(word).then((spellingResults) => {
          this.cacheService.setService(word, "spelling", spellingResults);
          if (spellingResults.length > 0) {
            result.results["spelling"] = spellingResults;
          }
        })
      );
    }

    await Promise.all(lookupPromises);

    return result;
  }

  private lookupLocal(word: string): SynonymResult[] {
    const localResults: SynonymResult[] = [];

    if (this.wordNet.isLoaded()) {
      const wordNetResults = this.wordNet.lookup(word);
      localResults.push(...wordNetResults);
    }

    if (this.moby.isLoaded()) {
      const mobyResults = this.moby.lookup(word);
      localResults.push(...mobyResults);
    }

    const dedupedResults = this.deduplicateResults(localResults, word);
    return this.settings.maxResults > 0
      ? dedupedResults.slice(0, this.settings.maxResults)
      : dedupedResults;
  }

  private async lookupDatamuse(word: string, types?: RelationshipType[], language: LanguageCode = "en"): Promise<SynonymResult[]> {
    try {
      const apiResults = await this.datamuse.lookup(word, types, language);
      const datamuseResults = [...apiResults.synonyms, ...apiResults.relatedWords];
      const dedupedResults = this.deduplicateResults(datamuseResults, word);
      return this.settings.maxResults > 0
        ? dedupedResults.slice(0, this.settings.maxResults)
        : dedupedResults;
    } catch (error) {
      console.error("Datamuse API lookup failed:", error);
      return [];
    }
  }

  private async lookupAPIService(
    service: SynonymService,
    word: string,
    types?: RelationshipType[],
    language: LanguageCode = "en"
  ): Promise<SynonymResult[]> {
    try {
      const results = await service.lookup(word, this.settings.maxResults, types, language);
      return this.deduplicateResults(results, word);
    } catch (error) {
      console.error(`API service ${service.name} lookup failed:`, error);
      return [];
    }
  }

  private deduplicateResults(results: SynonymResult[], originalWord: string): SynonymResult[] {
    const seen = new Set<string>();
    const normalizedOriginal = originalWord.toLowerCase();

    return results.filter((r) => {
      const normalized = r.word.toLowerCase();
      if (normalized === normalizedOriginal || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }

  /**
   * Returns top 5 replacement suggestions for Quick Replace command.
   * If word is misspelled, returns spelling corrections.
   * Otherwise, returns results of the requested type from the first enabled source.
   * Uses per-service caching.
   */
  async getQuickReplaceSuggestions(word: string, type: RelationshipType = "synonym"): Promise<SynonymResult[]> {
    // Check spelling first - if misspelled, return spelling corrections
    // Spelling takes priority over both synonyms and antonyms
    if (this.nspell.isLoaded() && !this.nspell.isCorrect(word)) {
      // Check cache for spelling
      const cached = this.cacheService.getService(word, "spelling");
      if (cached) {
        // Spelling results don't have definitions to group by, limit to 5
        return cached.slice(0, 5);
      }
      const suggestions = await this.spellingService.getSuggestions(word);
      this.cacheService.setService(word, "spelling", suggestions, []);
      return suggestions.slice(0, 5);
    }

    // Get results of requested type from first enabled source that supports it
    // Return all results so QuickReplaceSuggest can group by definition and slice per group
    const enabledSources = this.getEnabledSources();
    const requestedTypes: RelationshipType[] = [type];

    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        const supportedTypes = BUILTIN_SERVICE_TYPES[source.id];
        if (!supportedTypes.includes(type)) continue;

        if (source.id === "local") {
          const cached = this.cacheService.getServiceForTypes(word, "local", requestedTypes);
          if (cached) {
            return cached;
          }
          const results = this.lookupLocal(word);
          this.cacheService.setService(word, "local", results, ["synonym", "related"]);
          return results.filter(r => r.type === type);
        } else if (source.id === "datamuse") {
          const cached = this.cacheService.getServiceForTypes(word, "datamuse", requestedTypes);
          if (cached) {
            return cached;
          }
          const results = await this.lookupDatamuse(word, requestedTypes);
          this.cacheService.setService(word, "datamuse", results, requestedTypes);
          return results.filter(r => r.type === type);
        }
      } else if (isAPISource(source)) {
        const serviceInfo = getAPIServiceInfo(source.config.type);
        if (!serviceInfo.supportedTypes.includes(type)) continue;

        const cached = this.cacheService.getServiceForTypes(word, source.id, requestedTypes);
        if (cached) {
          return cached;
        }
        const service = this.apiServices.get(source.id);
        if (service) {
          const results = await this.lookupAPIService(service, word, requestedTypes);
          this.cacheService.setService(word, source.id, results, requestedTypes);
          return results.filter(r => r.type === type);
        }
      }
    }
    return [];
  }

  /**
   * Returns metadata for all enabled tabs (known before any lookup).
   * Filters by language support.
   * Includes spelling tab only if the word is misspelled and language is English (nspell is English-only).
   */
  getEnabledTabMetadata(word: string, language: LanguageCode = "en"): TabMetadata[] {
    const tabs: TabMetadata[] = [];

    // Add spelling tab only if nspell is loaded, word is misspelled, and language is English
    // NSpell only supports English, so skip for other languages
    if (language === "en" && this.nspell.isLoaded() && !this.nspell.isCorrect(word)) {
      tabs.push({ id: "spelling", label: "Spelling", iconId: "spelling" });
    }

    // Add tabs based on enabled sources that support the language
    for (const source of this.settings.sources) {
      if (!isSourceEnabled(source)) continue;

      if (isBuiltinSource(source)) {
        // Check if this builtin source supports the language
        if (!serviceSupportsLanguage(source.id, language)) continue;

        tabs.push({
          id: source.id,
          label: TAB_LABELS[source.id],
          iconId: source.id,
        });
      } else if (isAPISource(source)) {
        // Check if this API service supports the language
        if (!serviceSupportsLanguage(source.config.type, language)) continue;

        const serviceInfo = getAPIServiceInfo(source.config.type);
        tabs.push({
          id: source.id,
          label: serviceInfo.name,
          iconId: source.config.type, // Use service type for icon lookup
        });
      }
    }

    return tabs;
  }

  /**
   * Performs a streaming lookup, calling callbacks as each source completes.
   * Uses per-service caching - cached services stream immediately, uncached are fetched.
   * Returns a handle with a cancel() function to stop callbacks if modal closes early.
   *
   * @param word - The word to look up
   * @param callbacks - Callbacks for streaming results
   * @param initialTypes - Relationship types to fetch initially (defaults to synonym + antonym)
   * @param language - Language code for the lookup (defaults to English)
   */
  lookupStreaming(
    word: string,
    callbacks: StreamingLookupCallbacks,
    initialTypes: RelationshipType[] = ["synonym", "antonym"],
    language: LanguageCode = "en"
  ): StreamingLookupHandle {
    let cancelled = false;

    const handle: StreamingLookupHandle = {
      cancel: () => {
        cancelled = true;
      },
    };

    const enabledSources = this.getEnabledSources();
    let pendingCount = 0;

    const onSourceDone = (sourceId: string, results: SynonymResult[], fromCache: boolean, fetchedTypes: RelationshipType[]) => {
      if (cancelled) return;
      // Cache if not already cached
      if (!fromCache) {
        this.cacheService.setService(word, sourceId, results, fetchedTypes, language);
      }
      callbacks.onSourceComplete(sourceId, results);
      pendingCount--;
      if (pendingCount === 0 && !cancelled) {
        callbacks.onAllComplete();
      }
    };

    // Process each enabled source that supports the language - check cache first
    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        // Skip sources that don't support the language
        if (!serviceSupportsLanguage(source.id, language)) continue;

        const supportedTypes = BUILTIN_SERVICE_TYPES[source.id];
        const typesToFetch = initialTypes.filter(t => supportedTypes.includes(t));

        if (source.id === "local") {
          // Local (WordNet/Moby) only supports English
          pendingCount++;
          const cached = this.cacheService.getService(word, "local", language);
          if (cached) {
            onSourceDone("local", cached, true, ["synonym", "related"]);
          } else {
            const localResults = this.lookupLocal(word);
            onSourceDone("local", localResults, false, ["synonym", "related"]);
          }
        } else if (source.id === "datamuse") {
          pendingCount++;
          // Check if we have all requested types cached
          const missingTypes = this.cacheService.getMissingTypes(word, "datamuse", typesToFetch, language);
          if (missingTypes.length === 0) {
            const cached = this.cacheService.getService(word, "datamuse", language);
            onSourceDone("datamuse", cached || [], true, typesToFetch);
          } else {
            void this.lookupDatamuse(word, typesToFetch, language).then((results) => {
              onSourceDone("datamuse", results, false, typesToFetch);
            });
          }
        }
      } else if (isAPISource(source)) {
        // Skip sources that don't support the language
        if (!serviceSupportsLanguage(source.config.type, language)) continue;

        pendingCount++;
        const serviceInfo = getAPIServiceInfo(source.config.type);
        const typesToFetch = initialTypes.filter(t => serviceInfo.supportedTypes.includes(t));

        // Check if we have all requested types cached
        const missingTypes = this.cacheService.getMissingTypes(word, source.id, typesToFetch, language);
        if (missingTypes.length === 0) {
          const cached = this.cacheService.getService(word, source.id, language);
          onSourceDone(source.id, cached || [], true, typesToFetch);
        } else {
          const service = this.apiServices.get(source.id);
          if (service) {
            void this.lookupAPIService(service, word, typesToFetch, language).then((results) => {
              onSourceDone(source.id, results, false, typesToFetch);
            });
          } else {
            // No service available, decrement pending count
            pendingCount--;
          }
        }
      }
    }

    // Add spelling suggestions lookup only for English (nspell is English-only)
    if (language === "en") {
      pendingCount++;
      const cachedSpelling = this.cacheService.getService(word, "spelling", language);
      if (cachedSpelling) {
        onSourceDone("spelling", cachedSpelling, true, []);
      } else {
        void this.spellingService.getSuggestions(word).then((spellingResults) => {
          onSourceDone("spelling", spellingResults, false, []);
        });
      }
    }

    // Edge case: if no sources were enabled, complete immediately
    if (pendingCount === 0) {
      callbacks.onAllComplete();
    }

    return handle;
  }

  /**
   * Fetch additional relationship types for a word (lazy loading).
   * Only fetches from services that support the requested types and haven't cached them yet.
   * Returns results from all services combined.
   */
  async fetchAdditionalTypes(
    word: string,
    types: RelationshipType[],
    onSourceUpdate?: (sourceId: string, results: SynonymResult[]) => void,
    language: LanguageCode = "en"
  ): Promise<SynonymResult[]> {
    const allResults: SynonymResult[] = [];
    const enabledSources = this.getEnabledSources();
    const fetchPromises: Promise<void>[] = [];

    for (const source of enabledSources) {
      let supportedTypes: RelationshipType[];
      let sourceId: string;

      if (isBuiltinSource(source)) {
        // Skip sources that don't support the language
        if (!serviceSupportsLanguage(source.id, language)) continue;
        supportedTypes = BUILTIN_SERVICE_TYPES[source.id];
        sourceId = source.id;
      } else if (isAPISource(source)) {
        // Skip sources that don't support the language
        if (!serviceSupportsLanguage(source.config.type, language)) continue;
        const serviceInfo = getAPIServiceInfo(source.config.type);
        supportedTypes = serviceInfo.supportedTypes;
        sourceId = source.id;
      } else {
        continue;
      }

      // Filter to types this service supports
      const typesToFetch = types.filter(t => supportedTypes.includes(t));
      if (typesToFetch.length === 0) continue;

      // Check which types are missing from cache
      const missingTypes = this.cacheService.getMissingTypes(word, sourceId, typesToFetch, language);
      if (missingTypes.length === 0) {
        // All cached - get from cache
        const cached = this.cacheService.getServiceForTypes(word, sourceId, typesToFetch, language);
        if (cached) {
          allResults.push(...cached);
          onSourceUpdate?.(sourceId, this.cacheService.getService(word, sourceId, language) || []);
        }
        continue;
      }

      // Need to fetch missing types
      const fetchPromise = (async () => {
        let results: SynonymResult[] = [];

        if (isBuiltinSource(source)) {
          if (source.id === "datamuse") {
            results = await this.lookupDatamuse(word, missingTypes, language);
          }
          // Local doesn't support lazy loading - it fetches everything at once
        } else if (isAPISource(source)) {
          const service = this.apiServices.get(source.id);
          if (service) {
            results = await this.lookupAPIService(service, word, missingTypes, language);
          }
        }

        if (results.length > 0) {
          this.cacheService.setService(word, sourceId, results, missingTypes, language);
          allResults.push(...results);
          // Get full cached results for source update callback
          onSourceUpdate?.(sourceId, this.cacheService.getService(word, sourceId, language) || []);
        }
      })();

      fetchPromises.push(fetchPromise);
    }

    await Promise.all(fetchPromises);

    // Deduplicate across all sources
    const seen = new Set<string>();
    return allResults.filter(r => {
      const key = `${r.type}:${r.word.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get all relationship types supported by enabled services.
   */
  getAvailableRelationshipTypes(): RelationshipType[] {
    const supportedTypes = new Set<RelationshipType>();
    const enabledSources = this.getEnabledSources();

    for (const source of enabledSources) {
      let types: RelationshipType[];

      if (isBuiltinSource(source)) {
        types = BUILTIN_SERVICE_TYPES[source.id];
      } else if (isAPISource(source)) {
        const serviceInfo = getAPIServiceInfo(source.config.type);
        types = serviceInfo.supportedTypes;
      } else {
        continue;
      }

      for (const type of types) {
        supportedTypes.add(type);
      }
    }

    // Return in canonical order
    return ALL_RELATIONSHIP_TYPES.filter(t => supportedTypes.has(t));
  }
}
