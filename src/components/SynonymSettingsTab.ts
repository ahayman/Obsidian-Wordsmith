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
import {
  OMWLanguageCode,
  OMW_CORE_LANGUAGES,
  OMW_EXTENDED_LANGUAGES,
  getOMWLanguageInfo,
  isOMWExtendedLanguage,
} from "../types/omwLanguage";
import {
  HunspellLanguageCode,
  HunspellRegion,
  HUNSPELL_LANGUAGES,
  getHunspellLanguageInfo,
  getHunspellLanguagesByRegion,
} from "../types/hunspellLanguage";
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

    // Language section
    const languageSection = containerEl.createDiv({ cls: "wordsmith-settings-section" });
    new Setting(languageSection).setName("Language").setHeading();
    this.addLanguageSettings(languageSection);

    // Data Sources section
    const dataSourcesSection = containerEl.createDiv({ cls: "wordsmith-settings-section" });
    new Setting(dataSourcesSection).setName("Data sources").setHeading();
    
    dataSourcesSection.createEl("p", {
      cls: "setting-item-description wordsmith-sources-desc",
      text: "Enable/disable sources and reorder them. The order here determines the tab order in the synonym modal.",
    });

    this.renderSourcesList(dataSourcesSection);

    // Add API Service button
    const addButtonContainer = dataSourcesSection.createDiv({
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

    // Local Data section
    const localDataSection = containerEl.createDiv({ cls: "wordsmith-settings-section" });
    new Setting(localDataSection).setName("Local data").setHeading();
    this.addLocalDataSettings(localDataSection);

    // Downloaded Dictionaries section
    const dictionariesSection = containerEl.createDiv({ cls: "wordsmith-settings-section" });
    new Setting(dictionariesSection).setName("Downloaded dictionaries").setHeading();
    this.addNSpellSetting(dictionariesSection);
    this.addOfflineSpellingSetting(dictionariesSection);

    // Options section
    const optionsSection = containerEl.createDiv({ cls: "wordsmith-settings-section" });
    new Setting(optionsSection).setName("Options").setHeading();
    
    // Cache settings in Options section - Combined Cache Size and Clear Cache
    const cacheService = this.plugin.dataService?.cacheService;
    const currentSize = cacheService?.size ?? 0;

    new Setting(optionsSection)
      .setName("Cache size")
      .setDesc(`Maximum number of words to cache (0 to disable caching). Currently caching ${currentSize} word${currentSize === 1 ? "" : "s"}`)
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
      )
      .addButton((button) => {
        button
          .setButtonText("Clear cache")
          .setDisabled(currentSize === 0)
          .onClick(async () => {
            cacheService?.clear();
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // Frontmatter property setting in Options section
    new Setting(optionsSection)
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

  private addLocalDataSettings(containerEl: HTMLElement): void {
    containerEl.createEl("p", {
      cls: "setting-item-description wordsmith-local-desc",
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      text: "Download offline thesaurus data for local synonym lookups. Core English data provides comprehensive coverage; multilingual data uses Open Multilingual WordNet.",
    });

    // Downloaded languages section
    const downloadedSection = containerEl.createDiv({ cls: "wordsmith-local-downloaded" });
    downloadedSection.createEl("div", {
      cls: "setting-item-name wordsmith-local-section-title",
      text: "Downloaded data",
    });

    const downloadedList = downloadedSection.createDiv({ cls: "wordsmith-local-downloaded-list" });
    this.renderDownloadedItems(downloadedList);

    // Add language selector
    const addSection = containerEl.createDiv({ cls: "wordsmith-local-add" });
    addSection.createEl("div", {
      cls: "setting-item-name wordsmith-local-section-title",
      text: "Add data",
    });

    const addRow = addSection.createDiv({ cls: "wordsmith-local-add-row" });
    this.renderLocalDataDropdown(addRow);
  }

  private renderDownloadedItems(containerEl: HTMLElement): void {
    containerEl.empty();
    const hasAnyDownloads = this.hasAnyLocalDataDownloaded();

    if (!hasAnyDownloads) {
      containerEl.createEl("div", {
        cls: "wordsmith-local-empty",
        text: "No data downloaded yet. Select from the list below to download.",
      });
      return;
    }

    // Show downloaded Core English items
    if (this.plugin.settings.wordNetDownloaded) {
      this.renderDownloadedItem(containerEl, "wordnet", "WordNet", "English");
    }
    if (this.plugin.settings.mobyDownloaded) {
      this.renderDownloadedItem(containerEl, "moby", "Moby Thesaurus", "English");
    }

    // Show downloaded OMW languages
    const downloadedLangs = this.getDownloadedOMWLanguages();
    for (const lang of downloadedLangs) {
      const langInfo = getOMWLanguageInfo(lang);
      if (!langInfo) continue;
      const extendedIndicator = isOMWExtendedLanguage(lang) ? " [extended]" : "";
      this.renderDownloadedItem(
        containerEl,
        `omw:${lang}`,
        langInfo.name,
        `${langInfo.nativeName}${extendedIndicator}`
      );
    }
  }

  private renderDownloadedItem(
    containerEl: HTMLElement,
    id: string,
    name: string,
    subtext: string
  ): void {
    const item = containerEl.createDiv({ cls: "wordsmith-local-item" });
    const label = item.createSpan({ cls: "wordsmith-local-item-label" });
    label.setText(`${name} (${subtext})`);

    const deleteBtn = item.createEl("button", {
      cls: "wordsmith-local-delete-btn",
      text: "Delete",
    });
    deleteBtn.addEventListener("click", () => {
      void this.deleteLocalData(id);
    });
  }

  private hasAnyLocalDataDownloaded(): boolean {
    if (this.plugin.settings.wordNetDownloaded) return true;
    if (this.plugin.settings.mobyDownloaded) return true;
    for (const isDownloaded of Object.values(this.plugin.settings.omwDownloaded)) {
      if (isDownloaded) return true;
    }
    return false;
  }

  private renderLocalDataDropdown(containerEl: HTMLElement): void {
    const selectEl = containerEl.createEl("select", { cls: "wordsmith-local-select" });
    selectEl.createEl("option", { value: "", text: "Select data to download..." });

    // Core English group
    const coreEnglishGroup = selectEl.createEl("optgroup", { attr: { label: "Core English" } });

    // WordNet
    const wordnetDownloaded = this.plugin.settings.wordNetDownloaded;
    const wordnetOption = coreEnglishGroup.createEl("option", {
      value: "wordnet",
      text: wordnetDownloaded ? "✓ WordNet (English) - downloaded" : "WordNet (English) (~11 MB)",
    });
    if (wordnetDownloaded) {
      wordnetOption.disabled = true;
      wordnetOption.addClass("wordsmith-option-downloaded");
    }

    // Moby
    const mobyDownloaded = this.plugin.settings.mobyDownloaded;
    const mobyOption = coreEnglishGroup.createEl("option", {
      value: "moby",
      text: mobyDownloaded ? "✓ Moby Thesaurus (English) - downloaded" : "Moby Thesaurus (English) (~7.7 MB)",
    });
    if (mobyDownloaded) {
      mobyOption.disabled = true;
      mobyOption.addClass("wordsmith-option-downloaded");
    }

    // Core OMW languages group
    const coreGroup = selectEl.createEl("optgroup", { attr: { label: "Core languages (hand-curated)" } });
    for (const lang of OMW_CORE_LANGUAGES) {
      const isDownloaded = this.plugin.settings.omwDownloaded[lang.code];
      const sizeText = lang.estimatedSizeMB ? ` (~${lang.estimatedSizeMB} MB)` : "";
      const option = coreGroup.createEl("option", {
        value: `omw:${lang.code}`,
        text: isDownloaded
          ? `✓ ${lang.name} (${lang.nativeName}) - downloaded`
          : `${lang.name} (${lang.nativeName})${sizeText}`,
      });
      if (isDownloaded) {
        option.disabled = true;
        option.addClass("wordsmith-option-downloaded");
      }
    }

    // Extended OMW languages group
    const extGroup = selectEl.createEl("optgroup", { attr: { label: "Extended languages (auto-constructed)" } });
    for (const lang of OMW_EXTENDED_LANGUAGES) {
      const isDownloaded = this.plugin.settings.omwDownloaded[lang.code];
      const sizeText = lang.estimatedSizeMB ? ` (~${lang.estimatedSizeMB} MB)` : "";
      const option = extGroup.createEl("option", {
        value: `omw:${lang.code}`,
        text: isDownloaded
          ? `✓ ${lang.name} (${lang.nativeName}) - downloaded`
          : `${lang.name} (${lang.nativeName})${sizeText}`,
      });
      if (isDownloaded) {
        option.disabled = true;
        option.addClass("wordsmith-option-downloaded");
      }
    }

    // Create download button
    const downloadBtn = containerEl.createEl("button", {
      cls: "wordsmith-local-download-btn",
      text: "Download",
    });
    downloadBtn.disabled = true;

    selectEl.addEventListener("change", () => {
      downloadBtn.disabled = !selectEl.value;
    });

    downloadBtn.addEventListener("click", () => {
      const selected = selectEl.value;
      if (!selected) return;

      void this.downloadLocalData(selected, downloadBtn, selectEl);
    });
  }

  private getDownloadedOMWLanguages(): OMWLanguageCode[] {
    const downloaded: OMWLanguageCode[] = [];
    for (const [lang, isDownloaded] of Object.entries(this.plugin.settings.omwDownloaded)) {
      if (isDownloaded) {
        downloaded.push(lang as OMWLanguageCode);
      }
    }
    // Sort by language name
    return downloaded.sort((a, b) => {
      const infoA = getOMWLanguageInfo(a);
      const infoB = getOMWLanguageInfo(b);
      return (infoA?.name || a).localeCompare(infoB?.name || b);
    });
  }

  private async downloadLocalData(
    id: string,
    button: HTMLButtonElement,
    select: HTMLSelectElement
  ): Promise<void> {
    const originalText = button.textContent;
    button.disabled = true;
    select.disabled = true;
    button.textContent = "Downloading...";

    try {
      let success = false;

      if (id === "wordnet") {
        success = await this.plugin.dataService.wordNet.download((progress) => {
          button.textContent = `${progress.percent}%`;
        });
        if (success) {
          this.plugin.settings.wordNetDownloaded = true;
        }
      } else if (id === "moby") {
        success = await this.plugin.dataService.moby.download((progress) => {
          button.textContent = `${progress.percent}%`;
        });
        if (success) {
          this.plugin.settings.mobyDownloaded = true;
        }
      } else if (id.startsWith("omw:")) {
        const lang = id.slice(4) as OMWLanguageCode;
        success = await this.plugin.dataService.omw.download(lang, (progress) => {
          button.textContent = `${progress.percent}%`;
        });
        if (success) {
          this.plugin.settings.omwDownloaded[lang] = true;
        }
      }

      if (success) {
        await this.plugin.saveSettings();
        this.display();
      } else {
        button.textContent = "Failed";
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          select.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error(`Failed to download ${id}:`, error);
      button.textContent = "Error";
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        select.disabled = false;
      }, 2000);
    }
  }

  private async deleteLocalData(id: string): Promise<void> {
    if (id === "wordnet") {
      await this.plugin.dataService.wordNet.delete();
      this.plugin.settings.wordNetDownloaded = false;
    } else if (id === "moby") {
      await this.plugin.dataService.moby.delete();
      this.plugin.settings.mobyDownloaded = false;
    } else if (id.startsWith("omw:")) {
      const lang = id.slice(4) as OMWLanguageCode;
      await this.plugin.dataService.omw.delete(lang);
      delete this.plugin.settings.omwDownloaded[lang];
    }

    await this.plugin.saveSettings();
    this.display();
  }

  private addNSpellSetting(containerEl: HTMLElement): void {
    containerEl.createEl("p", {
      cls: "setting-item-description wordsmith-local-desc",
      text: "Download Hunspell dictionaries for offline spelling suggestions. Multiple languages can be downloaded.",
    });

    // Downloaded dictionaries section (just the content, no heading)
    const downloadedSection = containerEl.createDiv({ cls: "wordsmith-local-downloaded" });
    const downloadedList = downloadedSection.createDiv({ cls: "wordsmith-local-downloaded-list" });
    this.renderDownloadedHunspellItems(downloadedList);

    // Add dictionary selector
    const addSection = containerEl.createDiv({ cls: "wordsmith-local-add" });
    addSection.createEl("div", {
      cls: "setting-item-name wordsmith-local-section-title",
      text: "Add dictionary",
    });

    const addRow = addSection.createDiv({ cls: "wordsmith-local-add-row" });
    this.renderHunspellDropdown(addRow);
  }

  private renderDownloadedHunspellItems(containerEl: HTMLElement): void {
    containerEl.empty();
    const downloadedLangs = this.getDownloadedHunspellLanguages();

    if (downloadedLangs.length === 0) {
      containerEl.createEl("div", {
        cls: "wordsmith-local-empty",
        text: "No dictionaries downloaded yet. Select from the list below to download.",
      });
      return;
    }

    for (const lang of downloadedLangs) {
      const langInfo = getHunspellLanguageInfo(lang);
      if (!langInfo) continue;
      this.renderDownloadedHunspellItem(containerEl, lang, langInfo.name, langInfo.nativeName);
    }
  }

  private renderDownloadedHunspellItem(
    containerEl: HTMLElement,
    code: HunspellLanguageCode,
    name: string,
    nativeName: string
  ): void {
    const item = containerEl.createDiv({ cls: "wordsmith-local-item", attr: { "data-type": "hunspell" } });
    const label = item.createSpan({ cls: "wordsmith-local-item-label" });
    label.setText(`${name} (${nativeName})`);

    const deleteBtn = item.createEl("button", {
      cls: "wordsmith-local-delete-btn",
      text: "Delete",
      attr: { "data-type": "hunspell" },
    });
    deleteBtn.addEventListener("click", () => {
      void this.deleteHunspellDictionary(code);
    });
  }

  private getDownloadedHunspellLanguages(): HunspellLanguageCode[] {
    const downloaded: HunspellLanguageCode[] = [];
    for (const [lang, isDownloaded] of Object.entries(this.plugin.settings.hunspellDownloaded)) {
      if (isDownloaded) {
        downloaded.push(lang as HunspellLanguageCode);
      }
    }
    // Sort by language name
    return downloaded.sort((a, b) => {
      const infoA = getHunspellLanguageInfo(a);
      const infoB = getHunspellLanguageInfo(b);
      return (infoA?.name || a).localeCompare(infoB?.name || b);
    });
  }

  private renderHunspellDropdown(containerEl: HTMLElement): void {
    const selectEl = containerEl.createEl("select", { cls: "wordsmith-local-select", attr: { "data-type": "hunspell" } });
    selectEl.createEl("option", { value: "", text: "Select dictionary to download..." });

    // Group languages by region
    const regions: { region: HunspellRegion; label: string }[] = [
      { region: "european", label: "European languages" },
      { region: "americas", label: "Americas (Spanish/Portuguese variants)" },
      { region: "asian", label: "Asian languages" },
      { region: "other", label: "Other languages" },
    ];

    for (const { region, label } of regions) {
      const languages = getHunspellLanguagesByRegion(region);
      if (languages.length === 0) continue;

      const group = selectEl.createEl("optgroup", { attr: { label } });

      for (const lang of languages) {
        const isDownloaded = this.plugin.settings.hunspellDownloaded[lang.code];
        const sizeText = `~${lang.estimatedSizeMB} MB`;
        const option = group.createEl("option", {
          value: lang.code,
          text: isDownloaded
            ? `\u2713 ${lang.name} (${lang.nativeName}) - downloaded`
            : `${lang.name} (${lang.nativeName}) (${sizeText})`,
        });
        if (isDownloaded) {
          option.disabled = true;
          option.addClass("wordsmith-option-downloaded");
        }
      }
    }

    // Create download button
    const downloadBtn = containerEl.createEl("button", {
      cls: "wordsmith-local-download-btn",
      text: "Download",
      attr: { "data-type": "hunspell" },
    });
    downloadBtn.disabled = true;

    selectEl.addEventListener("change", () => {
      downloadBtn.disabled = !selectEl.value;
    });

    downloadBtn.addEventListener("click", () => {
      const selected = selectEl.value as HunspellLanguageCode;
      if (!selected) return;

      void this.downloadHunspellDictionary(selected, downloadBtn, selectEl);
    });
  }

  private async downloadHunspellDictionary(
    lang: HunspellLanguageCode,
    button: HTMLButtonElement,
    select: HTMLSelectElement
  ): Promise<void> {
    const originalText = button.textContent;
    button.disabled = true;
    select.disabled = true;
    button.textContent = "Downloading...";

    try {
      const success = await this.plugin.dataService.nspell.download(lang, (progress) => {
        button.textContent = `${progress.percent}%`;
      });

      if (success) {
        this.plugin.settings.hunspellDownloaded[lang] = true;
        await this.plugin.saveSettings();
        this.display();
      } else {
        button.textContent = "Failed";
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          select.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error(`Failed to download Hunspell dictionary for ${lang}:`, error);
      button.textContent = "Error";
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        select.disabled = false;
      }, 2000);
    }
  }

  private async deleteHunspellDictionary(lang: HunspellLanguageCode): Promise<void> {
    await this.plugin.dataService.nspell.delete(lang);
    delete this.plugin.settings.hunspellDownloaded[lang];
    await this.plugin.saveSettings();
    this.display();
  }

  private addOfflineSpellingSetting(containerEl: HTMLElement): void {
    // Only show if any Hunspell dictionary is downloaded
    const hasDownloaded = Object.values(this.plugin.settings.hunspellDownloaded).some(v => v);
    if (!hasDownloaded) {
      return;
    }

    new Setting(containerEl)
      .setName("Offline spelling only")
      .setDesc("Only use downloaded dictionaries, don't query online services for spelling suggestions")
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
