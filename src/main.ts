import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
import { WordsmithSettings, DEFAULT_SETTINGS, SourceConfig, LookupCache, RelationshipType } from "./types/types";
import { LanguageCode } from "./types/language";
import { OMWLanguageCode } from "./types/omwLanguage";
import { HunspellLanguageCode } from "./types/hunspellLanguage";
import { getLanguageName } from "./data/languages";
import { DataService } from "./services/DataService";
import { SynonymModal } from "./components/SynonymModal";
import { SynonymSettingsTab } from "./components/SynonymSettingsTab";
import { getWordUnderCursor } from "./utils/wordExtractor";
import { QuickReplaceSuggest } from "./components/QuickReplaceSuggest";

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
    language: DEFAULT_SETTINGS.language,
    fallbackLanguage: DEFAULT_SETTINGS.fallbackLanguage,
    frontmatterProperty: DEFAULT_SETTINGS.frontmatterProperty,
    omwDownloaded: DEFAULT_SETTINGS.omwDownloaded,
    hunspellDownloaded: DEFAULT_SETTINGS.hunspellDownloaded,
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

function needsLanguageMigration(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // Check if it has the new format but missing language fields
  return obj.sources !== undefined &&
         Array.isArray(obj.sources) &&
         obj.sources.length > 0 &&
         "kind" in (obj.sources[0] as Record<string, unknown>) &&
         (obj.language === undefined || obj.fallbackLanguage === undefined || obj.frontmatterProperty === undefined);
}

function needsOMWMigration(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // Check if it has the new format but missing omwDownloaded field
  return obj.sources !== undefined &&
         Array.isArray(obj.sources) &&
         obj.sources.length > 0 &&
         "kind" in (obj.sources[0] as Record<string, unknown>) &&
         obj.omwDownloaded === undefined;
}

function addLanguageFields(data: Record<string, unknown>): WordsmithSettings {
  return {
    ...data,
    language: (data.language as string) ?? DEFAULT_SETTINGS.language,
    fallbackLanguage: (data.fallbackLanguage as LanguageCode) ?? DEFAULT_SETTINGS.fallbackLanguage,
    frontmatterProperty: (data.frontmatterProperty as string) ?? DEFAULT_SETTINGS.frontmatterProperty,
  } as WordsmithSettings;
}

function addOMWFields(data: Record<string, unknown>): WordsmithSettings {
  return {
    ...data,
    omwDownloaded: (data.omwDownloaded as Partial<Record<OMWLanguageCode, boolean>>) ?? DEFAULT_SETTINGS.omwDownloaded,
  } as WordsmithSettings;
}

function needsHunspellMigration(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // Check if it has the new format but missing hunspellDownloaded field
  return obj.sources !== undefined &&
         Array.isArray(obj.sources) &&
         obj.sources.length > 0 &&
         "kind" in (obj.sources[0] as Record<string, unknown>) &&
         obj.hunspellDownloaded === undefined;
}

function addHunspellFields(data: Record<string, unknown>): WordsmithSettings {
  // Migrate existing nspellDownloaded (English) to new structure
  const hunspellDownloaded: Partial<Record<HunspellLanguageCode, boolean>> = {};
  if (data.nspellDownloaded) {
    hunspellDownloaded.en = true;
  }

  return {
    ...data,
    hunspellDownloaded,
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
    } else if (needsLanguageMigration(loadedData)) {
      // Migrate settings that are missing language fields
      this.settings = addLanguageFields(loadedData as Record<string, unknown>);
      await this.saveData(this.settings);
    } else if (needsOMWMigration(loadedData)) {
      // Migrate settings that are missing OMW fields
      this.settings = addOMWFields(loadedData as Record<string, unknown>);
      await this.saveData(this.settings);
    } else if (needsHunspellMigration(loadedData)) {
      // Migrate settings that are missing Hunspell fields
      this.settings = addHunspellFields(loadedData as Record<string, unknown>);
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

    // Get context for language detection
    const contextText = this.getContextAroundCursor(editor);

    // Resolve language
    const resolved = this.dataService.resolveLanguage(contextText);

    // Check if any services support this language
    if (!this.dataService.hasServicesForLanguage(resolved.code)) {
      const langName = getLanguageName(resolved.code);
      new Notice(`No services support ${langName}. Enable Free Dictionary or Altervista for multi-language support.`);
      return;
    }

    // Show notice if detection failed and using fallback
    if (resolved.detectionFailed) {
      const langName = getLanguageName(resolved.code);
      new Notice(`Auto-detect failed, using ${langName}`, 2000);
    }

    // Get tabs filtered by language
    const tabMetadata = this.dataService.getEnabledTabMetadata(word, resolved.code);

    if (tabMetadata.length === 0) {
      new Notice("No sources enabled");
      return;
    }

    // Create and open modal immediately with initial type and language
    const modal = new SynonymModal(
      this,
      word,
      range,
      tabMetadata,
      initialType,
      resolved.code,
      resolved.source
    );
    modal.open();

    // Determine initial types to fetch based on the requested type
    // Always fetch synonyms + antonyms upfront (most common)
    // If initialType is hypernym/hyponym/related, also fetch that type
    const initialTypes: RelationshipType[] = ["synonym", "antonym"];
    if (!initialTypes.includes(initialType)) {
      initialTypes.push(initialType);
    }

    // Start streaming lookup with initial types and language
    const { cancel } = this.dataService.lookupStreaming(
      word,
      {
        onSourceComplete: (sourceId, results) => modal.onSourceComplete(sourceId, results),
        onAllComplete: () => modal.onAllComplete(),
      },
      initialTypes,
      resolved.code
    );

    // Store original onClose, then wrap it to cancel on close
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      cancel();
      originalOnClose();
    };
  }

  /**
   * Get text around the cursor for language detection.
   * Returns approximately ±2 lines of context.
   */
  private getContextAroundCursor(editor: Editor): string {
    const cursor = editor.getCursor();
    const lineCount = editor.lineCount();

    // Get ±2 lines around cursor
    const startLine = Math.max(0, cursor.line - 2);
    const endLine = Math.min(lineCount - 1, cursor.line + 2);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(editor.getLine(i));
    }

    return lines.join(" ");
  }
}
