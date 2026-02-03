import { App } from "obsidian";
import {
  GroupedLookupResult,
  SynonymResult,
  SynoFinderSettings,
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
  SourceConfig,
  BuiltinTabId,
  TabMetadata,
  TAB_LABELS,
  StreamingLookupCallbacks,
  StreamingLookupHandle,
} from "../types";
import { WordNetService } from "./WordNetService";
import { MobyService } from "./MobyService";
import { DatamuseService } from "./DatamuseService";
import { NSpellService } from "./NSpellService";
import { SpellingService } from "./SpellingService";
import { SynonymService } from "./SynonymService";
import { createAPIService } from "./api";
import { CacheService } from "./CacheService";
import { getAPIServiceInfo } from "./SynonymService";

export class DataService {
  private app: App;
  private settings: SynoFinderSettings;
  wordNet: WordNetService;
  moby: MobyService;
  datamuse: DatamuseService;
  nspell: NSpellService;
  private spellingService: SpellingService;
  private apiServices: Map<string, SynonymService> = new Map();
  cacheService: CacheService;

  constructor(app: App, pluginDir: string, settings: SynoFinderSettings) {
    this.app = app;
    this.settings = settings;
    this.wordNet = new WordNetService(app, pluginDir);
    this.moby = new MobyService(app, pluginDir);
    this.datamuse = new DatamuseService(settings.maxResults);
    this.nspell = new NSpellService(app, pluginDir);
    this.spellingService = new SpellingService(this.nspell, this.datamuse, settings);
    this.cacheService = new CacheService(settings.lookupCache, settings.maxCacheSize);
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

  updateSettings(settings: SynoFinderSettings): void {
    this.settings = settings;
    this.datamuse.setMaxResults(settings.maxResults);
    this.cacheService.setMaxSize(settings.maxCacheSize);
    this.spellingService.updateSettings(settings);
    this.initializeAPIServices();
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

  private async lookupDatamuse(word: string): Promise<SynonymResult[]> {
    try {
      const apiResults = await this.datamuse.lookup(word);
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
    word: string
  ): Promise<SynonymResult[]> {
    try {
      const results = await service.lookup(word, this.settings.maxResults);
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
   * Otherwise, returns synonyms from the first enabled source.
   * Uses per-service caching.
   */
  async getQuickReplaceSuggestions(word: string): Promise<SynonymResult[]> {
    // Check spelling first - if misspelled, return spelling corrections
    if (this.nspell.isLoaded() && !this.nspell.isCorrect(word)) {
      // Check cache for spelling
      const cached = this.cacheService.getService(word, "spelling");
      if (cached) {
        return cached.slice(0, 5);
      }
      const suggestions = await this.spellingService.getSuggestions(word);
      this.cacheService.setService(word, "spelling", suggestions);
      return suggestions.slice(0, 5);
    }

    // Get synonyms from first enabled source
    const enabledSources = this.getEnabledSources();
    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (source.id === "local") {
          const cached = this.cacheService.getService(word, "local");
          if (cached) {
            return cached.slice(0, 5);
          }
          const results = this.lookupLocal(word);
          this.cacheService.setService(word, "local", results);
          return results.slice(0, 5);
        } else if (source.id === "datamuse") {
          const cached = this.cacheService.getService(word, "datamuse");
          if (cached) {
            return cached.slice(0, 5);
          }
          const results = await this.lookupDatamuse(word);
          this.cacheService.setService(word, "datamuse", results);
          return results.slice(0, 5);
        }
      } else if (isAPISource(source)) {
        const cached = this.cacheService.getService(word, source.id);
        if (cached) {
          return cached.slice(0, 5);
        }
        const service = this.apiServices.get(source.id);
        if (service) {
          const results = await this.lookupAPIService(service, word);
          this.cacheService.setService(word, source.id, results);
          return results.slice(0, 5);
        }
      }
    }
    return [];
  }

  /**
   * Returns metadata for all enabled tabs (known before any lookup).
   * Includes spelling tab only if the word is misspelled (checked locally via nspell).
   */
  getEnabledTabMetadata(word: string): TabMetadata[] {
    const tabs: TabMetadata[] = [];

    // Add spelling tab only if nspell is loaded and word is misspelled
    if (this.nspell.isLoaded() && !this.nspell.isCorrect(word)) {
      tabs.push({ id: "spelling", label: "Spelling", iconId: "spelling" });
    }

    // Add tabs based on enabled sources
    for (const source of this.settings.sources) {
      if (!isSourceEnabled(source)) continue;

      if (isBuiltinSource(source)) {
        tabs.push({
          id: source.id,
          label: TAB_LABELS[source.id],
          iconId: source.id,
        });
      } else if (isAPISource(source)) {
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
   */
  lookupStreaming(word: string, callbacks: StreamingLookupCallbacks): StreamingLookupHandle {
    let cancelled = false;

    const handle: StreamingLookupHandle = {
      cancel: () => {
        cancelled = true;
      },
    };

    const enabledSources = this.getEnabledSources();
    let pendingCount = 0;

    const onSourceDone = (sourceId: string, results: SynonymResult[], fromCache: boolean) => {
      if (cancelled) return;
      // Cache if not already cached
      if (!fromCache) {
        this.cacheService.setService(word, sourceId, results);
      }
      callbacks.onSourceComplete(sourceId, results);
      pendingCount--;
      if (pendingCount === 0 && !cancelled) {
        callbacks.onAllComplete();
      }
    };

    // Process each enabled source - check cache first
    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (source.id === "local") {
          pendingCount++;
          const cached = this.cacheService.getService(word, "local");
          if (cached) {
            onSourceDone("local", cached, true);
          } else {
            const localResults = this.lookupLocal(word);
            onSourceDone("local", localResults, false);
          }
        } else if (source.id === "datamuse") {
          pendingCount++;
          const cached = this.cacheService.getService(word, "datamuse");
          if (cached) {
            onSourceDone("datamuse", cached, true);
          } else {
            void this.lookupDatamuse(word).then((results) => {
              onSourceDone("datamuse", results, false);
            });
          }
        }
      } else if (isAPISource(source)) {
        pendingCount++;
        const cached = this.cacheService.getService(word, source.id);
        if (cached) {
          onSourceDone(source.id, cached, true);
        } else {
          const service = this.apiServices.get(source.id);
          if (service) {
            void this.lookupAPIService(service, word).then((results) => {
              onSourceDone(source.id, results, false);
            });
          } else {
            // No service available, decrement pending count
            pendingCount--;
          }
        }
      }
    }

    // Add spelling suggestions lookup
    pendingCount++;
    const cachedSpelling = this.cacheService.getService(word, "spelling");
    if (cachedSpelling) {
      onSourceDone("spelling", cachedSpelling, true);
    } else {
      void this.spellingService.getSuggestions(word).then((spellingResults) => {
        onSourceDone("spelling", spellingResults, false);
      });
    }

    // Edge case: if no sources were enabled, complete immediately
    if (pendingCount === 0) {
      callbacks.onAllComplete();
    }

    return handle;
  }
}
