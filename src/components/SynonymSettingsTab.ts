import { App, PluginSettingTab, setIcon, Setting } from "obsidian";
import WordsmithPlugin from "../main";
import {
  TAB_LABELS,
  TAB_DESCRIPTIONS,
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
  APIServiceConfig,
  RelationshipType,
} from "../types/types";
import { LanguageCode, LanguageSetting } from "../types/language";
import { SUPPORTED_LANGUAGES, countServicesForLanguage, getLanguageName } from "../data/languages";
import { AddAPIServiceModal } from "./AddAPIServiceModal";
import { getAPIServiceInfo, BUILTIN_SERVICE_TYPES } from "../services/SynonymService";
import { BUILTIN_SERVICE_LANGUAGES } from "../data/languages";
import { createServiceIcon } from "../utils/serviceIcons";

// Labels for displaying supported types
const TYPE_DISPLAY_LABELS: Record<RelationshipType, string> = {
  synonym: "Synonyms",
  antonym: "Antonyms",
  related: "Related",
  hypernym: "Hypernyms",
  hyponym: "Hyponyms",
};

export class SynonymSettingsTab extends PluginSettingTab {
  plugin: WordsmithPlugin;
  private draggedIndex: number | null = null;
  private sourcesListEl: HTMLElement | null = null;

  constructor(app: App, plugin: WordsmithPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Maximum results")
      .setDesc("Maximum number of synonyms and related words to show per tab")
      .addSlider((slider) =>
        slider
          .setLimits(10, 100, 10)
          .setValue(this.plugin.settings.maxResults)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxResults = value;
            await this.plugin.saveSettings();
          })
      );

    // Language settings section
    this.addLanguageSettings(containerEl);

    new Setting(containerEl).setName("Data sources").setHeading();

    containerEl.createEl("p", {
      cls: "setting-item-description wordsmith-sources-desc",
      text: "Enable/disable sources and reorder them. The order here determines the tab order in the synonym modal.",
    });

    this.renderSourcesList(containerEl);

    // Add API Service button
    const addButtonContainer = containerEl.createDiv({
      cls: "wordsmith-add-api-container",
    });

    const addButton = addButtonContainer.createEl("button", {
      cls: "wordsmith-add-api-button",
    });
    const plusIcon = addButton.createSpan();
    setIcon(plusIcon, "plus");
    addButton.createSpan({ text: " Add API service" });

    addButton.addEventListener("click", () => {
      new AddAPIServiceModal(this.plugin, (config) => {
        void this.addAPIService(config);
      }).open();
    });

    new Setting(containerEl).setName("Cache").setHeading();

    this.addCacheSettings(containerEl);

    new Setting(containerEl).setName("Local data management").setHeading();

    this.addWordNetSetting(containerEl);
    this.addMobySetting(containerEl);

    new Setting(containerEl).setName("Spelling suggestions").setHeading();

    this.addNSpellSetting(containerEl);
    this.addOfflineSpellingSetting(containerEl);
  }

  private addCacheSettings(containerEl: HTMLElement): void {
    const cacheService = this.plugin.dataService?.cacheService;
    const currentSize = cacheService?.size ?? 0;

    new Setting(containerEl)
      .setName("Cache size")
      .setDesc("Maximum number of words to cache (0 to disable caching)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1000, 50)
          .setValue(this.plugin.settings.maxCacheSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxCacheSize = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    const clearSetting = new Setting(containerEl)
      .setName("Clear cache")
      .setDesc(`Currently caching ${currentSize} word${currentSize === 1 ? "" : "s"}`);

    clearSetting.addButton((button) => {
      button
        .setButtonText("Clear")
        .setDisabled(currentSize === 0)
        .onClick(async () => {
          cacheService?.clear();
          await this.plugin.saveSettings();
          this.display();
        });
    });
  }

  private renderSourcesList(containerEl: HTMLElement): void {
    const sources = this.plugin.settings.sources;

    this.sourcesListEl = containerEl.createDiv({ cls: "wordsmith-sources-list" });

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (!source) continue;

      const itemEl = this.sourcesListEl.createDiv({
        cls: "wordsmith-source-item",
        attr: { draggable: "true", "data-index": String(i) },
      });

      // Drag handle
      const handleEl = itemEl.createDiv({ cls: "wordsmith-drag-handle" });
      setIcon(handleEl, "grip-vertical");

      // Service icon
      const iconContainer = itemEl.createDiv({ cls: "wordsmith-source-icon" });
      if (isBuiltinSource(source)) {
        createServiceIcon(iconContainer, source.id, 24);
      } else if (isAPISource(source)) {
        createServiceIcon(iconContainer, source.config.type, 24);
      }

      // Content
      const contentEl = itemEl.createDiv({ cls: "wordsmith-source-content" });

      if (isBuiltinSource(source)) {
        const nameRow = contentEl.createDiv({ cls: "wordsmith-source-name-row" });
        const nameEl = nameRow.createSpan({ cls: "wordsmith-source-name" });
        nameEl.setText(TAB_LABELS[source.id]);
        const descEl = contentEl.createDiv({ cls: "wordsmith-source-description" });
        descEl.setText(TAB_DESCRIPTIONS[source.id]);

        // Show supported types
        const supportedTypes = BUILTIN_SERVICE_TYPES[source.id];
        const typesEl = contentEl.createDiv({ cls: "wordsmith-source-types" });
        typesEl.setText(`Supports: ${this.formatSupportedTypes(supportedTypes)}`);

        // Show language count
        const langsEl = contentEl.createDiv({ cls: "wordsmith-source-languages" });
        langsEl.setText(`Languages: ${this.formatLanguageCount(source.id)}`);
      } else if (isAPISource(source)) {
        const nameRow = contentEl.createDiv({ cls: "wordsmith-source-name-row" });
        const keyBadge = nameRow.createSpan({ cls: "wordsmith-key-badge" });
        setIcon(keyBadge, "key");
        const nameEl = nameRow.createSpan({ cls: "wordsmith-source-name" });
        const serviceInfo = getAPIServiceInfo(source.config.type);
        nameEl.setText(serviceInfo.name);

        const descEl = contentEl.createDiv({ cls: "wordsmith-source-description" });
        descEl.setText(serviceInfo.description);

        // Show supported types
        const typesEl = contentEl.createDiv({ cls: "wordsmith-source-types" });
        typesEl.setText(`Supports: ${this.formatSupportedTypes(serviceInfo.supportedTypes)}`);

        // Show language count
        const langsEl = contentEl.createDiv({ cls: "wordsmith-source-languages" });
        langsEl.setText(`Languages: ${this.formatLanguageCount(source.config.type)}`);
      }

      // Actions container (delete button for API services)
      if (isAPISource(source)) {
        const actionsEl = itemEl.createDiv({ cls: "wordsmith-source-actions" });
        const deleteBtn = actionsEl.createEl("button", {
          cls: "wordsmith-delete-btn clickable-icon",
          attr: { "aria-label": "Delete API service" },
        });
        setIcon(deleteBtn, "trash-2");
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          void this.deleteAPIService(i);
        });
      }

      // Toggle
      const toggleEl = itemEl.createDiv({ cls: "wordsmith-source-toggle" });
      new Setting(toggleEl).addToggle((toggle) =>
        toggle.setValue(isSourceEnabled(source)).onChange(async (value) => {
          if (isBuiltinSource(source)) {
            source.enabled = value;
          } else if (isAPISource(source)) {
            source.config.enabled = value;
          }
          await this.plugin.saveSettings();
        })
      );

      // Drag events
      itemEl.addEventListener("dragstart", (e) => this.handleDragStart(e, i));
      itemEl.addEventListener("dragend", () => this.handleDragEnd());
      itemEl.addEventListener("dragover", (e) => this.handleDragOver(e, i));
      itemEl.addEventListener("drop", (e) => this.handleDrop(e, i));
    }
  }

  private async addAPIService(config: APIServiceConfig): Promise<void> {
    this.plugin.settings.sources.push({
      kind: "api",
      id: config.id,
      config,
    });
    await this.plugin.saveSettings();
    this.display();
  }

  private async deleteAPIService(index: number): Promise<void> {
    const source = this.plugin.settings.sources[index];
    if (!source || !isAPISource(source)) return;

    this.plugin.settings.sources.splice(index, 1);
    await this.plugin.saveSettings();
    this.display();
  }

  private handleDragStart(e: DragEvent, index: number): void {
    this.draggedIndex = index;
    const target = e.target as HTMLElement;
    target.addClass("wordsmith-dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  }

  private handleDragEnd(): void {
    this.draggedIndex = null;
    // Remove all drag-related classes
    this.sourcesListEl?.querySelectorAll(".wordsmith-source-item").forEach((el) => {
      el.removeClass("wordsmith-dragging", "wordsmith-drag-over");
    });
  }

  private handleDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === index) return;

    const target = e.currentTarget as HTMLElement;

    // Remove drag-over class from all items
    this.sourcesListEl?.querySelectorAll(".wordsmith-source-item").forEach((el) => {
      el.removeClass("wordsmith-drag-over");
    });

    target.addClass("wordsmith-drag-over");
  }

  private handleDrop(e: DragEvent, targetIndex: number): void {
    e.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === targetIndex) return;

    void this.moveSource(this.draggedIndex, targetIndex);
  }

  private async moveSource(fromIndex: number, toIndex: number): Promise<void> {
    const sources = [...this.plugin.settings.sources];
    const [movedItem] = sources.splice(fromIndex, 1);
    if (!movedItem) return;

    sources.splice(toIndex, 0, movedItem);

    this.plugin.settings.sources = sources;
    await this.plugin.saveSettings();
    this.display();
  }

  private addWordNetSetting(containerEl: HTMLElement): void {
    const isDownloaded = this.plugin.settings.wordNetDownloaded;
    const statusText = isDownloaded ? " (downloaded)" : " (not downloaded)";

    const wordNetSetting = new Setting(containerEl)
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      .setName("WordNet data")
      .setDesc("Download WordNet synonym database (~11MB)" + statusText);

    wordNetSetting.addButton((button) => {
      button.setButtonText(isDownloaded ? "Delete" : "Download");
      if (!isDownloaded) {
        button.setCta();
      }
      button.onClick(async () => {
        if (isDownloaded) {
          await this.plugin.dataService.wordNet.delete();
          this.plugin.settings.wordNetDownloaded = false;
          await this.plugin.saveSettings();
          this.display();
        } else {
          button.setButtonText("Downloading...");
          button.setDisabled(true);

          const success = await this.plugin.dataService.wordNet.download((progress) => {
            button.setButtonText(`${progress.percent}%`);
          });

          if (success) {
            this.plugin.settings.wordNetDownloaded = true;
            await this.plugin.saveSettings();
          }

          this.display();
        }
      });
    });
  }

  private addMobySetting(containerEl: HTMLElement): void {
    const isDownloaded = this.plugin.settings.mobyDownloaded;
    const statusText = isDownloaded ? " (downloaded)" : " (not downloaded)";

    const mobySetting = new Setting(containerEl)
      .setName("Moby thesaurus data")
      .setDesc("Download Moby thesaurus database (~7.7MB)" + statusText);

    mobySetting.addButton((button) => {
      button.setButtonText(isDownloaded ? "Delete" : "Download");
      if (!isDownloaded) {
        button.setCta();
      }
      button.onClick(async () => {
        if (isDownloaded) {
          await this.plugin.dataService.moby.delete();
          this.plugin.settings.mobyDownloaded = false;
          await this.plugin.saveSettings();
          this.display();
        } else {
          button.setButtonText("Downloading...");
          button.setDisabled(true);

          const success = await this.plugin.dataService.moby.download((progress) => {
            button.setButtonText(`${progress.percent}%`);
          });

          if (success) {
            this.plugin.settings.mobyDownloaded = true;
            await this.plugin.saveSettings();
          }

          this.display();
        }
      });
    });
  }

  private addNSpellSetting(containerEl: HTMLElement): void {
    const isDownloaded = this.plugin.settings.nspellDownloaded;
    const statusText = isDownloaded ? " (downloaded)" : " (not downloaded)";

    const nspellSetting = new Setting(containerEl)
      .setName("Offline dictionary")
      .setDesc("Download Hunspell dictionary for offline spelling suggestions (~2MB)" + statusText);

    nspellSetting.addButton((button) => {
      button.setButtonText(isDownloaded ? "Delete" : "Download");
      if (!isDownloaded) {
        button.setCta();
      }
      button.onClick(async () => {
        if (isDownloaded) {
          await this.plugin.dataService.nspell.delete();
          this.plugin.settings.nspellDownloaded = false;
          this.plugin.settings.offlineSpellingOnly = false;
          await this.plugin.saveSettings();
          this.display();
        } else {
          button.setButtonText("Downloading...");
          button.setDisabled(true);

          const success = await this.plugin.dataService.nspell.download((progress) => {
            button.setButtonText(`${progress.percent}%`);
          });

          if (success) {
            this.plugin.settings.nspellDownloaded = true;
            await this.plugin.saveSettings();
          }

          this.display();
        }
      });
    });
  }

  private addOfflineSpellingSetting(containerEl: HTMLElement): void {
    // Only show if nspell is downloaded
    if (!this.plugin.settings.nspellDownloaded) {
      return;
    }

    new Setting(containerEl)
      .setName("Offline spelling only")
      .setDesc("Only use downloaded dictionary, don't query online services for spelling suggestions")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.offlineSpellingOnly)
          .onChange(async (value) => {
            this.plugin.settings.offlineSpellingOnly = value;
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Format an array of relationship types into a human-readable string.
   */
  private formatSupportedTypes(types: RelationshipType[]): string {
    return types.map(t => TYPE_DISPLAY_LABELS[t]).join(", ");
  }

  /**
   * Add language settings section.
   */
  private addLanguageSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Language").setHeading();

    // Build language options for dropdown
    const languageOptions: Record<string, string> = {
      default: "Default (Obsidian locale)",
      auto: "Auto-detect",
    };
    for (const lang of SUPPORTED_LANGUAGES) {
      languageOptions[lang.code] = `${lang.name} (${lang.nativeName})`;
    }

    // Main language dropdown
    new Setting(containerEl)
      .setName("Language")
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      .setDesc("Language for word lookups. 'Default' uses your Obsidian locale. 'Auto-detect' analyzes the text around your cursor.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(languageOptions)
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as LanguageSetting;
            await this.plugin.saveSettings();
            // Re-render to show/hide fallback setting and update warning
            this.display();
          })
      );

    // Fallback language dropdown (only shown when auto-detect is selected)
    if (this.plugin.settings.language === "auto") {
      const fallbackOptions: Record<string, string> = {};
      for (const lang of SUPPORTED_LANGUAGES) {
        fallbackOptions[lang.code] = `${lang.name} (${lang.nativeName})`;
      }

      new Setting(containerEl)
        .setName("Fallback language")
        .setDesc("Language to use when auto-detection fails (text too short or unrecognized)")
        .addDropdown((dropdown) =>
          dropdown
            .addOptions(fallbackOptions)
            .setValue(this.plugin.settings.fallbackLanguage)
            .onChange(async (value) => {
              this.plugin.settings.fallbackLanguage = value as LanguageCode;
              await this.plugin.saveSettings();
            })
        );
    }

    // Show warning if selected language has limited service support
    const selectedLang = this.plugin.settings.language;
    if (selectedLang !== "default" && selectedLang !== "auto") {
      const enabledServiceIds = this.getEnabledServiceIds();
      const supportCount = countServicesForLanguage(selectedLang, enabledServiceIds);
      const totalEnabled = enabledServiceIds.length;

      if (supportCount < totalEnabled && supportCount > 0) {
        const warningEl = containerEl.createEl("p", {
          cls: "setting-item-description wordsmith-language-warning",
        });
        const langName = getLanguageName(selectedLang);
        const warningIcon = warningEl.createSpan({ cls: "wordsmith-warning-icon", text: "⚠️" });
        warningIcon.appendText(` Limited support: ${supportCount} of ${totalEnabled} enabled services support ${langName}`);
      } else if (supportCount === 0) {
        const warningEl = containerEl.createEl("p", {
          cls: "setting-item-description wordsmith-language-error",
        });
        const langName = getLanguageName(selectedLang);
        const warningIcon = warningEl.createSpan({ cls: "wordsmith-warning-icon", text: "❌" });
        warningIcon.appendText(` No enabled services support ${langName}. Enable Free Dictionary or Altervista for multi-language support.`);
      }
    }

    // Advanced: Frontmatter property name (collapsible)
    const advancedDetails = containerEl.createEl("details", { cls: "wordsmith-advanced-settings" });
    advancedDetails.createEl("summary", { text: "Advanced" });

    const advancedContent = advancedDetails.createDiv();
    new Setting(advancedContent)
      .setName("Frontmatter property")
      .setDesc("The frontmatter property name used to specify language per-document (e.g., 'lang: es')")
      .addText((text) =>
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case
          .setPlaceholder("lang")
          .setValue(this.plugin.settings.frontmatterProperty)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterProperty = value || "lang";
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Get IDs of all enabled services (builtin and API).
   */
  private getEnabledServiceIds(): string[] {
    const ids: string[] = [];
    for (const source of this.plugin.settings.sources) {
      if (!isSourceEnabled(source)) continue;
      if (isBuiltinSource(source)) {
        ids.push(source.id);
      } else if (isAPISource(source)) {
        ids.push(source.config.type);
      }
    }
    return ids;
  }

  /**
   * Get the number of languages a service supports.
   */
  private getServiceLanguageCount(serviceId: string): number {
    if (serviceId in BUILTIN_SERVICE_LANGUAGES) {
      return BUILTIN_SERVICE_LANGUAGES[serviceId as keyof typeof BUILTIN_SERVICE_LANGUAGES].length;
    }
    // Try to get API service info - if not found, assume English only
    try {
      const info = getAPIServiceInfo(serviceId as "merriam-webster" | "big-huge-thesaurus" | "words-api" | "api-ninjas" | "altervista" | "free-dictionary");
      return info?.supportedLanguages?.length || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Format language count for display in source list.
   */
  private formatLanguageCount(serviceId: string): string {
    const count = this.getServiceLanguageCount(serviceId);
    if (count === 1) {
      return "English only";
    }
    return `${count} languages`;
  }
}
