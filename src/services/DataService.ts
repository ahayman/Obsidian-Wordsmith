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
} from "../types";
import { WordNetService } from "./WordNetService";
import { MobyService } from "./MobyService";
import { DatamuseService } from "./DatamuseService";
import { NSpellService } from "./NSpellService";
import { SpellingService } from "./SpellingService";
import { SynonymService } from "./SynonymService";
import { createAPIService } from "./api";
import { CacheService } from "./CacheService";

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
    // Check cache first
    const cached = this.cacheService.get(word);
    if (cached) return cached;

    const result: GroupedLookupResult = {
      originalWord: word,
      results: {},
    };

    const enabledSources = this.getEnabledSources();
    const lookupPromises: Promise<void>[] = [];

    for (const source of enabledSources) {
      if (isBuiltinSource(source)) {
        if (source.id === "local") {
          // Synchronous local lookup
          const localResults = this.lookupLocal(word);
          result.results["local"] = localResults;
        } else if (source.id === "datamuse") {
          // Async datamuse lookup
          lookupPromises.push(
            this.lookupDatamuse(word).then((results) => {
              result.results["datamuse"] = results;
            })
          );
        }
      } else if (isAPISource(source)) {
        const service = this.apiServices.get(source.id);
        if (service) {
          lookupPromises.push(
            this.lookupAPIService(service, word).then((results) => {
              result.results[source.id] = results;
            })
          );
        }
      }
    }

    // Add spelling suggestions lookup
    lookupPromises.push(
      this.spellingService.getSuggestions(word).then((spellingResults) => {
        if (spellingResults.length > 0) {
          result.results["spelling"] = spellingResults;
        }
      })
    );

    await Promise.all(lookupPromises);

    // Cache result before returning
    this.cacheService.set(word, result);

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
}
