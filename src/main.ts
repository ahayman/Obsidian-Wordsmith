import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
import { WordsmithSettings, DEFAULT_SETTINGS, SourceConfig, LookupCache, RelationshipType } from "./types";
import { DataService } from "./services/DataService";
import { SynonymModal } from "./SynonymModal";
import { SynonymSettingsTab } from "./SynonymSettingsTab";
import { getWordUnderCursor } from "./utils/wordExtractor";
import { QuickReplaceSuggest } from "./QuickReplaceSuggest";

// Old settings format for migration
interface OldSourceConfig {
  id: "local" | "datamuse";
  enabled: boolean;
}

interface OldSettings {
  maxResults: number;
  sources: OldSourceConfig[];
  wordNetDownloaded: boolean;
  mobyDownloaded: boolean;
}

function isOldSettings(data: unknown): data is OldSettings {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.sources) || obj.sources.length === 0) return false;
  const firstSource = obj.sources[0] as Record<string, unknown>;
  // Old format doesn't have 'kind' property
  return firstSource && !("kind" in firstSource);
}

function migrateSettings(old: OldSettings): WordsmithSettings {
  return {
    maxResults: old.maxResults,
    sources: old.sources.map((s): SourceConfig => ({
      kind: "builtin",
      id: s.id,
      enabled: s.enabled,
    })),
    wordNetDownloaded: old.wordNetDownloaded,
    mobyDownloaded: old.mobyDownloaded,
    nspellDownloaded: DEFAULT_SETTINGS.nspellDownloaded,
    offlineSpellingOnly: DEFAULT_SETTINGS.offlineSpellingOnly,
    maxCacheSize: DEFAULT_SETTINGS.maxCacheSize,
    lookupCache: { entries: {}, version: 1 },
  };
}

function needsCacheMigration(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // Check if it has the new format but missing cache fields
  return obj.sources !== undefined &&
         Array.isArray(obj.sources) &&
         obj.sources.length > 0 &&
         "kind" in (obj.sources[0] as Record<string, unknown>) &&
         (obj.maxCacheSize === undefined || obj.lookupCache === undefined);
}

function needsSpellingMigration(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // Check if it has the new format but missing spelling fields
  return obj.sources !== undefined &&
         Array.isArray(obj.sources) &&
         obj.sources.length > 0 &&
         "kind" in (obj.sources[0] as Record<string, unknown>) &&
         (obj.nspellDownloaded === undefined || obj.offlineSpellingOnly === undefined);
}

function addCacheFields(data: Record<string, unknown>): WordsmithSettings {
  return {
    ...data,
    maxCacheSize: data.maxCacheSize ?? DEFAULT_SETTINGS.maxCacheSize,
    lookupCache: (data.lookupCache as LookupCache) ?? { entries: {}, version: 1 },
  } as WordsmithSettings;
}

function addSpellingFields(data: Record<string, unknown>): WordsmithSettings {
  return {
    ...data,
    nspellDownloaded: data.nspellDownloaded ?? DEFAULT_SETTINGS.nspellDownloaded,
    offlineSpellingOnly: data.offlineSpellingOnly ?? DEFAULT_SETTINGS.offlineSpellingOnly,
  } as WordsmithSettings;
}

export default class WordsmithPlugin extends Plugin {
  settings: WordsmithSettings = DEFAULT_SETTINGS;
  dataService!: DataService;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.dataService = new DataService(
      this.app,
      this.manifest.dir!,
      this.settings
    );

    await this.dataService.initialize();

    // Modal commands for different relationship types
    this.addCommand({
      id: "find-synonyms",
      name: "Find synonyms for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findWords(editor, "synonym");
      },
    });

    this.addCommand({
      id: "find-antonyms",
      name: "Find antonyms for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findWords(editor, "antonym");
      },
    });

    this.addCommand({
      id: "find-related",
      name: "Find related words for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findWords(editor, "related");
      },
    });

    this.addCommand({
      id: "find-hypernyms",
      name: "Find hypernyms (more general) for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findWords(editor, "hypernym");
      },
    });

    this.addCommand({
      id: "find-hyponyms",
      name: "Find hyponyms (more specific) for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findWords(editor, "hyponym");
      },
    });

    // Quick Replace commands
    const quickReplaceSuggest = new QuickReplaceSuggest(this.app, this.dataService);

    this.addCommand({
      id: "quick-replace-synonym",
      name: "Quick replace - synonym",
      editorCallback: (editor: Editor) => {
        void quickReplaceSuggest.triggerForWord(editor, "synonym");
      },
    });

    this.addCommand({
      id: "quick-replace-antonym",
      name: "Quick replace - antonym",
      editorCallback: (editor: Editor) => {
        void quickReplaceSuggest.triggerForWord(editor, "antonym");
      },
    });

    // Keep old quick-replace command for backward compatibility (defaults to synonym)
    this.addCommand({
      id: "quick-replace",
      name: "Quick replace - show replacement options",
      editorCallback: (editor: Editor) => {
        void quickReplaceSuggest.triggerForWord(editor, "synonym");
      },
    });

    this.addSettingTab(new SynonymSettingsTab(this.app, this));
  }

  onunload(): void {
    // Cleanup if needed
  }

  async loadSettings(): Promise<void> {
    const loadedData: unknown = await this.loadData();

    // Check if we need to migrate old settings format
    if (isOldSettings(loadedData)) {
      this.settings = migrateSettings(loadedData);
      // Save migrated settings
      await this.saveData(this.settings);
    } else if (needsCacheMigration(loadedData)) {
      // Migrate settings that have new source format but no cache fields
      this.settings = addCacheFields(loadedData as Record<string, unknown>);
      await this.saveData(this.settings);
    } else if (needsSpellingMigration(loadedData)) {
      // Migrate settings that are missing spelling fields
      this.settings = addSpellingFields(loadedData as Record<string, unknown>);
      await this.saveData(this.settings);
    } else if (loadedData && typeof loadedData === "object") {
      this.settings = Object.assign(
        {},
        DEFAULT_SETTINGS,
        loadedData as WordsmithSettings
      );
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    // Persist cache data from CacheService to settings before saving
    if (this.dataService?.cacheService) {
      this.settings.lookupCache = this.dataService.cacheService.toCache();
    }
    await this.saveData(this.settings);
    this.dataService?.updateSettings(this.settings);
  }

  /**
   * Find words of a specific relationship type for the word under cursor.
   * Opens a modal with the filter pre-set to the requested type.
   */
  private findWords(editor: Editor, initialType: RelationshipType): void {
    const extraction = getWordUnderCursor(editor);

    if (!extraction) {
      new Notice("No word found under cursor");
      return;
    }

    const { word, range } = extraction;
    const tabMetadata = this.dataService.getEnabledTabMetadata(word);

    if (tabMetadata.length === 0) {
      new Notice("No sources enabled");
      return;
    }

    // Create and open modal immediately with initial type
    const modal = new SynonymModal(this, word, range, tabMetadata, initialType);
    modal.open();

    // Determine initial types to fetch based on the requested type
    // Always fetch synonyms + antonyms upfront (most common)
    // If initialType is hypernym/hyponym/related, also fetch that type
    const initialTypes: RelationshipType[] = ["synonym", "antonym"];
    if (!initialTypes.includes(initialType)) {
      initialTypes.push(initialType);
    }

    // Start streaming lookup with initial types
    const { cancel } = this.dataService.lookupStreaming(
      word,
      {
        onSourceComplete: (sourceId, results) => modal.onSourceComplete(sourceId, results),
        onAllComplete: () => modal.onAllComplete(),
      },
      initialTypes
    );

    // Store original onClose, then wrap it to cancel on close
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      cancel();
      originalOnClose();
    };
  }
}
