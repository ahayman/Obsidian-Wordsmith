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
import { AddAPIServiceModal } from "./AddAPIServiceModal";
import { getAPIServiceInfo, BUILTIN_SERVICE_TYPES } from "../services/SynonymService";
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
}
