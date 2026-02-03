import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
import { SynoFinderSettings, DEFAULT_SETTINGS, SourceConfig } from "./types";
import { DataService } from "./services/DataService";
import { SynonymModal } from "./SynonymModal";
import { SynonymSettingsTab } from "./SynonymSettingsTab";
import { getWordUnderCursor } from "./utils/wordExtractor";

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

function migrateSettings(old: OldSettings): SynoFinderSettings {
  return {
    maxResults: old.maxResults,
    sources: old.sources.map((s): SourceConfig => ({
      kind: "builtin",
      id: s.id,
      enabled: s.enabled,
    })),
    wordNetDownloaded: old.wordNetDownloaded,
    mobyDownloaded: old.mobyDownloaded,
  };
}

export default class SynoFinderPlugin extends Plugin {
  settings: SynoFinderSettings = DEFAULT_SETTINGS;
  dataService!: DataService;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.dataService = new DataService(
      this.app,
      this.manifest.dir!,
      this.settings
    );

    await this.dataService.initialize();

    this.addCommand({
      id: "find-synonyms",
      name: "Find synonyms for word under cursor",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        void this.findSynonyms(editor);
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
    } else if (loadedData && typeof loadedData === "object") {
      this.settings = Object.assign(
        {},
        DEFAULT_SETTINGS,
        loadedData as SynoFinderSettings
      );
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.dataService?.updateSettings(this.settings);
  }

  private async findSynonyms(editor: Editor): Promise<void> {
    const extraction = getWordUnderCursor(editor);

    if (!extraction) {
      new Notice("No word found under cursor");
      return;
    }

    const { word, range } = extraction;

    new Notice(`Looking up "${word}"...`);

    try {
      const result = await this.dataService.lookup(word);

      // Check if any source has results
      const hasResults = Object.values(result.results).some((arr) => arr.length > 0);

      if (!hasResults) {
        new Notice(`No synonyms found for "${word}"`);
        return;
      }

      const modal = new SynonymModal(this, result, range);
      modal.open();
    } catch (error) {
      console.error("Synonym lookup failed:", error);
      new Notice("Failed to look up synonyms. Check console for details.");
    }
  }
}
