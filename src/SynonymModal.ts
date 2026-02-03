import { Modal, prepareSimpleSearch } from "obsidian";
import {
  SynonymResult,
  GroupedLookupResult,
  WordRange,
  TAB_LABELS,
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
} from "./types";
import SynoFinderPlugin from "./main";
import { replaceWord } from "./utils/wordExtractor";
import { getAPIServiceInfo } from "./services/SynonymService";

interface TabInfo {
  id: string;
  label: string;
}

export class SynonymModal extends Modal {
  private plugin: SynoFinderPlugin;
  private lookupResult: GroupedLookupResult;
  private wordRange: WordRange;

  private inputEl: HTMLInputElement;
  private tabContainerEl: HTMLElement;
  private resultsContainerEl: HTMLElement;

  private activeTabId: string;
  private selectedIndex: number = 0;
  private filteredResults: SynonymResult[] = [];
  private ignoreMouseUntilMove: boolean = true;

  constructor(
    plugin: SynoFinderPlugin,
    lookupResult: GroupedLookupResult,
    wordRange: WordRange
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.lookupResult = lookupResult;
    this.wordRange = wordRange;

    // Set initial active tab to first in order that has results
    const tabs = this.getEnabledTabs();
    this.activeTabId = tabs[0]?.id || "local";
  }

  private getEnabledTabs(): TabInfo[] {
    const tabs: TabInfo[] = [];

    for (const source of this.plugin.settings.sources) {
      if (!isSourceEnabled(source)) continue;

      if (isBuiltinSource(source)) {
        tabs.push({
          id: source.id,
          label: TAB_LABELS[source.id],
        });
      } else if (isAPISource(source)) {
        const serviceInfo = getAPIServiceInfo(source.config.type);
        tabs.push({
          id: source.id,
          label: serviceInfo.name,
        });
      }
    }

    return tabs;
  }

  private getResultsForTab(tabId: string): SynonymResult[] {
    return this.lookupResult.results[tabId] || [];
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("synofinder-modal");

    // Create search input
    const inputContainer = contentEl.createDiv({ cls: "synofinder-input-container" });
    this.inputEl = inputContainer.createEl("input", {
      type: "text",
      placeholder: `Replace "${this.lookupResult.originalWord}" with...`,
      cls: "synofinder-input",
    });

    // Create tab bar
    this.tabContainerEl = contentEl.createDiv({ cls: "synofinder-tabs" });
    this.renderTabs();

    // Create results container
    this.resultsContainerEl = contentEl.createDiv({ cls: "synofinder-results" });
    this.updateFilteredResults();
    this.renderResults();

    // Add instructions
    const instructionsEl = contentEl.createDiv({ cls: "synofinder-instructions" });
    instructionsEl.createSpan({ text: "up/down navigate" });
    instructionsEl.createSpan({ text: "tab switch" });
    instructionsEl.createSpan({ text: "enter select" });
    instructionsEl.createSpan({ text: "esc dismiss" });

    // Event listeners
    this.inputEl.addEventListener("input", () => {
      this.updateFilteredResults();
      this.renderResults();
    });

    // Register keyboard handlers with Obsidian's scope system
    this.scope.register([], "ArrowDown", (e) => {
      e.preventDefault();
      this.moveSelection(1);
      return false;
    });

    this.scope.register([], "ArrowUp", (e) => {
      e.preventDefault();
      this.moveSelection(-1);
      return false;
    });

    this.scope.register([], "Enter", (e) => {
      e.preventDefault();
      const selected = this.filteredResults[this.selectedIndex];
      if (selected) {
        this.selectResult(selected);
      }
      return false;
    });

    this.scope.register([], "Tab", (e) => {
      e.preventDefault();
      this.cycleTab(1);
      return false;
    });

    this.scope.register(["Shift"], "Tab", (e) => {
      e.preventDefault();
      this.cycleTab(-1);
      return false;
    });

    // Focus input
    this.inputEl.focus();
  }

  private renderTabs(): void {
    this.tabContainerEl.empty();
    const enabledTabs = this.getEnabledTabs();

    for (const tab of enabledTabs) {
      const tabEl = this.tabContainerEl.createDiv({
        cls: `synofinder-tab ${tab.id === this.activeTabId ? "synofinder-tab-active" : ""}`,
      });

      const count = this.getResultsForTab(tab.id).length;
      tabEl.setText(`${tab.label} (${count})`);

      tabEl.addEventListener("click", () => {
        this.activeTabId = tab.id;
        this.selectedIndex = 0;
        this.updateFilteredResults();
        this.renderTabs();
        this.renderResults();
      });
    }
  }

  private updateFilteredResults(): void {
    const query = this.inputEl.value.trim().toLowerCase();
    const results = this.getResultsForTab(this.activeTabId);

    if (!query) {
      this.filteredResults = results;
    } else {
      const search = prepareSimpleSearch(query);
      this.filteredResults = results.filter((r) => {
        const match = search(r.word);
        return match !== null;
      });
    }

    // Reset selection if out of bounds
    if (this.selectedIndex >= this.filteredResults.length) {
      this.selectedIndex = Math.max(0, this.filteredResults.length - 1);
    }
  }

  private renderResults(): void {
    this.resultsContainerEl.empty();

    if (this.filteredResults.length === 0) {
      const emptyEl = this.resultsContainerEl.createDiv({ cls: "synofinder-empty" });
      emptyEl.setText("No results found");
      return;
    }

    // Re-enable mouse selection after actual mouse movement
    this.resultsContainerEl.addEventListener(
      "mousemove",
      () => {
        this.ignoreMouseUntilMove = false;
      },
      { once: true }
    );

    for (let i = 0; i < this.filteredResults.length; i++) {
      const result = this.filteredResults[i];
      if (!result) continue;

      const itemEl = this.resultsContainerEl.createDiv({
        cls: `synofinder-suggestion ${i === this.selectedIndex ? "is-selected" : ""}`,
      });

      this.renderSuggestion(result, itemEl);

      itemEl.addEventListener("click", () => {
        this.selectResult(result);
      });

      itemEl.addEventListener("mouseenter", () => {
        if (this.ignoreMouseUntilMove) return;
        this.selectedIndex = i;
        this.updateSelectionStyles();
      });
    }

    // Scroll selected item into view
    const selectedEl = this.resultsContainerEl.querySelector(".is-selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  private renderSuggestion(item: SynonymResult, el: HTMLElement): void {
    const container = el.createDiv({ cls: "synofinder-suggestion-content" });
    const mainRow = container.createDiv({ cls: "synofinder-suggestion-main" });

    mainRow.createSpan({ cls: "synofinder-word", text: item.word });

    const badgeClass = item.type === "synonym" ? "synofinder-badge-syn" : "synofinder-badge-rel";
    const badgeText = item.type === "synonym" ? "Syn" : "Rel";
    mainRow.createSpan({ cls: `synofinder-badge ${badgeClass}`, text: badgeText });

    if (item.partOfSpeech) {
      mainRow.createSpan({ cls: "synofinder-pos", text: item.partOfSpeech });
    }

    const sourceLabel = this.getSourceLabel(item.source);
    const sourceClass = `synofinder-source-${this.sanitizeClassName(item.source)}`;
    mainRow.createSpan({ cls: `synofinder-source ${sourceClass}`, text: sourceLabel });

    if (item.definition) {
      const defRow = container.createDiv({ cls: "synofinder-definition" });
      const truncatedDef =
        item.definition.length > 80 ? item.definition.substring(0, 77) + "..." : item.definition;
      defRow.setText(truncatedDef);
    }
  }

  private getSourceLabel(source: string): string {
    // For built-in sources
    if (source === "wordnet") return "wordnet";
    if (source === "moby") return "moby";
    if (source === "datamuse") return "datamuse";

    // For API services, use shortened names
    const sourceLabels: Record<string, string> = {
      "merriam-webster": "M-W",
      "big-huge-thesaurus": "BHT",
      "words-api": "WordsAPI",
      "api-ninjas": "Ninjas",
      altervista: "AV",
      "free-dictionary": "FreeDic",
    };

    return sourceLabels[source] || source;
  }

  private sanitizeClassName(source: string): string {
    return source.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  private cycleTab(direction: number): void {
    const enabledTabs = this.getEnabledTabs();
    if (enabledTabs.length <= 1) return;

    const currentIndex = enabledTabs.findIndex((t) => t.id === this.activeTabId);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) {
      newIndex = enabledTabs.length - 1;
    } else if (newIndex >= enabledTabs.length) {
      newIndex = 0;
    }

    const newTab = enabledTabs[newIndex];
    if (newTab) {
      this.activeTabId = newTab.id;
      this.selectedIndex = 0;
      this.updateFilteredResults();
      this.renderTabs();
      this.renderResults();
    }
  }

  private moveSelection(direction: number): void {
    const newIndex = this.selectedIndex + direction;

    if (newIndex >= 0 && newIndex < this.filteredResults.length) {
      this.selectedIndex = newIndex;
      this.ignoreMouseUntilMove = true;
      this.updateSelectionStyles();
    }
  }

  private updateSelectionStyles(): void {
    const items = this.resultsContainerEl.querySelectorAll(".synofinder-suggestion");
    items.forEach((item, i) => {
      item.toggleClass("is-selected", i === this.selectedIndex);
    });

    // Scroll selected item into view
    const selectedEl = this.resultsContainerEl.querySelector(".is-selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  private selectResult(result: SynonymResult): void {
    const editor = this.app.workspace.activeEditor?.editor;
    if (editor) {
      replaceWord(editor, this.wordRange, result.word);
    }
    this.close();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
