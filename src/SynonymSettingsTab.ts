import { App, PluginSettingTab, setIcon, Setting } from "obsidian";
import SynoFinderPlugin from "./main";
import {
  TAB_LABELS,
  TAB_DESCRIPTIONS,
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
  APIServiceConfig,
} from "./types";
import { AddAPIServiceModal } from "./AddAPIServiceModal";
import { getAPIServiceInfo } from "./services/SynonymService";

export class SynonymSettingsTab extends PluginSettingTab {
  plugin: SynoFinderPlugin;
  private draggedIndex: number | null = null;
  private sourcesListEl: HTMLElement | null = null;

  constructor(app: App, plugin: SynoFinderPlugin) {
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
      cls: "setting-item-description synofinder-sources-desc",
      text: "Enable/disable sources and reorder them. The order here determines the tab order in the synonym modal.",
    });

    this.renderSourcesList(containerEl);

    // Add API Service button
    const addButtonContainer = containerEl.createDiv({
      cls: "synofinder-add-api-container",
    });

    const addButton = addButtonContainer.createEl("button", {
      cls: "synofinder-add-api-button",
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

    this.sourcesListEl = containerEl.createDiv({ cls: "synofinder-sources-list" });

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (!source) continue;

      const itemEl = this.sourcesListEl.createDiv({
        cls: "synofinder-source-item",
        attr: { draggable: "true", "data-index": String(i) },
      });

      // Drag handle
      const handleEl = itemEl.createDiv({ cls: "synofinder-drag-handle" });
      setIcon(handleEl, "grip-vertical");

      // Content
      const contentEl = itemEl.createDiv({ cls: "synofinder-source-content" });

      if (isBuiltinSource(source)) {
        const nameEl = contentEl.createDiv({ cls: "synofinder-source-name" });
        nameEl.setText(TAB_LABELS[source.id]);
        const descEl = contentEl.createDiv({ cls: "synofinder-source-description" });
        descEl.setText(TAB_DESCRIPTIONS[source.id]);
      } else if (isAPISource(source)) {
        const nameRow = contentEl.createDiv({ cls: "synofinder-source-name-row" });
        const keyBadge = nameRow.createSpan({ cls: "synofinder-key-badge" });
        setIcon(keyBadge, "key");
        const nameEl = nameRow.createSpan({ cls: "synofinder-source-name" });
        const serviceInfo = getAPIServiceInfo(source.config.type);
        nameEl.setText(serviceInfo.name);

        const descEl = contentEl.createDiv({ cls: "synofinder-source-description" });
        descEl.setText(serviceInfo.description);
      }

      // Actions container (delete button for API services)
      if (isAPISource(source)) {
        const actionsEl = itemEl.createDiv({ cls: "synofinder-source-actions" });
        const deleteBtn = actionsEl.createEl("button", {
          cls: "synofinder-delete-btn clickable-icon",
          attr: { "aria-label": "Delete API service" },
        });
        setIcon(deleteBtn, "trash-2");
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          void this.deleteAPIService(i);
        });
      }

      // Toggle
      const toggleEl = itemEl.createDiv({ cls: "synofinder-source-toggle" });
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
    target.addClass("synofinder-dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  }

  private handleDragEnd(): void {
    this.draggedIndex = null;
    // Remove all drag-related classes
    this.sourcesListEl?.querySelectorAll(".synofinder-source-item").forEach((el) => {
      el.removeClass("synofinder-dragging", "synofinder-drag-over");
    });
  }

  private handleDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === index) return;

    const target = e.currentTarget as HTMLElement;

    // Remove drag-over class from all items
    this.sourcesListEl?.querySelectorAll(".synofinder-source-item").forEach((el) => {
      el.removeClass("synofinder-drag-over");
    });

    target.addClass("synofinder-drag-over");
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
}
