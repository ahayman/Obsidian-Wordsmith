import { Modal, prepareSimpleSearch } from "obsidian";
import {
  SynonymResult,
  WordRange,
  TabMetadata,
  TabState,
} from "./types";
import SynoFinderPlugin from "./main";
import { replaceWord } from "./utils/wordExtractor";

export class SynonymModal extends Modal {
  private plugin: SynoFinderPlugin;
  private word: string;
  private wordRange: WordRange;
  private tabMetadata: TabMetadata[];

  // Tab state management
  private tabStates: Map<string, TabState> = new Map();
  private tabResults: Map<string, SynonymResult[]> = new Map();
  private allComplete: boolean = false;

  private inputEl: HTMLInputElement;
  private tabContainerEl: HTMLElement;
  private resultsContainerEl: HTMLElement;

  private activeTabId: string;
  private selectedIndex: number = 0;
  private filteredResults: SynonymResult[] = [];
  private ignoreMouseUntilMove: boolean = true;

  constructor(
    plugin: SynoFinderPlugin,
    word: string,
    wordRange: WordRange,
    tabMetadata: TabMetadata[]
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.word = word;
    this.wordRange = wordRange;
    this.tabMetadata = tabMetadata;

    // Initialize all tabs as loading with empty results
    for (const tab of tabMetadata) {
      this.tabStates.set(tab.id, "loading");
      this.tabResults.set(tab.id, []);
    }

    // Set initial active tab to first tab
    this.activeTabId = tabMetadata[0]?.id || "";
  }

  /**
   * Called when a source completes its lookup.
   * Updates tab state and triggers re-render.
   */
  onSourceComplete(sourceId: string, results: SynonymResult[]): void {
    // Store results
    this.tabResults.set(sourceId, results);

    // Update tab state based on results
    const newState: TabState = results.length > 0 ? "results" : "grayed";
    this.tabStates.set(sourceId, newState);

    // Auto-switch logic: if active tab just became grayed, switch to a better tab
    if (sourceId === this.activeTabId && newState === "grayed") {
      this.autoSwitchTab();
    }

    // Re-render if modal is open
    if (this.tabContainerEl) {
      this.renderTabs();
      if (sourceId === this.activeTabId) {
        this.updateFilteredResults();
        this.renderResults();
      }
    }
  }

  /**
   * Called when all sources have completed.
   */
  onAllComplete(): void {
    this.allComplete = true;

    // If all tabs are grayed, show "no results" state
    const hasAnyResults = Array.from(this.tabStates.values()).some(
      (state) => state === "results"
    );

    if (!hasAnyResults && this.resultsContainerEl) {
      this.renderNoResults();
    }
  }

  /**
   * Auto-switch to a better tab when current tab becomes grayed.
   */
  private autoSwitchTab(): void {
    // First try to find a tab with results
    for (const tab of this.tabMetadata) {
      if (this.tabStates.get(tab.id) === "results") {
        this.activeTabId = tab.id;
        this.selectedIndex = 0;
        return;
      }
    }

    // Otherwise find first tab still loading
    for (const tab of this.tabMetadata) {
      if (this.tabStates.get(tab.id) === "loading") {
        this.activeTabId = tab.id;
        this.selectedIndex = 0;
        return;
      }
    }

    // All grayed - stay on current tab (will show "no results" when all complete)
  }

  private getResultsForTab(tabId: string): SynonymResult[] {
    return this.tabResults.get(tabId) || [];
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("synofinder-modal");

    // Create search input
    const inputContainer = contentEl.createDiv({ cls: "synofinder-input-container" });
    this.inputEl = inputContainer.createEl("input", {
      type: "text",
      placeholder: `Replace "${this.word}" with...`,
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

    for (const tab of this.tabMetadata) {
      const state = this.tabStates.get(tab.id) || "loading";
      const isActive = tab.id === this.activeTabId;

      // Build CSS classes based on state
      const classes = ["synofinder-tab"];
      if (isActive) classes.push("synofinder-tab-active");
      if (state === "grayed") classes.push("synofinder-tab-grayed");
      if (state === "loading") classes.push("synofinder-tab-loading");

      const tabEl = this.tabContainerEl.createDiv({
        cls: classes.join(" "),
      });

      // Tab label
      const labelSpan = tabEl.createSpan({ text: tab.label });

      // Show count for results, spinner for loading
      if (state === "results") {
        const count = this.getResultsForTab(tab.id).length;
        labelSpan.setText(`${tab.label} (${count})`);
      } else if (state === "loading") {
        tabEl.createSpan({
          cls: "synofinder-tab-spinner synofinder-spinner",
          text: " ⟳",
        });
      }

      // Click handler (only for non-grayed tabs)
      if (state !== "grayed") {
        tabEl.addEventListener("click", () => {
          this.activeTabId = tab.id;
          this.selectedIndex = 0;
          this.updateFilteredResults();
          this.renderTabs();
          this.renderResults();
        });
      }
    }
  }

  private updateFilteredResults(): void {
    const query = this.inputEl?.value?.trim().toLowerCase() || "";
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

    const state = this.tabStates.get(this.activeTabId);

    // Show loading spinner if tab is still loading
    if (state === "loading") {
      this.renderLoading();
      return;
    }

    // Show empty state if no results after filtering
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

  private renderLoading(): void {
    const loadingEl = this.resultsContainerEl.createDiv({ cls: "synofinder-loading" });
    loadingEl.createSpan({ cls: "synofinder-spinner", text: "⟳" });
    loadingEl.createDiv({
      cls: "synofinder-loading-text",
      text: `Looking up "${this.word}"...`,
    });
  }

  private renderNoResults(): void {
    this.resultsContainerEl.empty();
    const noResultsEl = this.resultsContainerEl.createDiv({ cls: "synofinder-no-results" });
    noResultsEl.createDiv({ cls: "synofinder-no-results-title", text: "No Results Found" });
    noResultsEl.createDiv({
      cls: "synofinder-no-results-desc",
      text: `No synonyms or suggestions found for "${this.word}"`,
    });
  }

  private renderSuggestion(item: SynonymResult, el: HTMLElement): void {
    const container = el.createDiv({ cls: "synofinder-suggestion-content" });
    const mainRow = container.createDiv({ cls: "synofinder-suggestion-main" });

    mainRow.createSpan({ cls: "synofinder-word", text: item.word });

    const badgeMap = {
      synonym: { cls: "synofinder-badge-syn", text: "Syn" },
      related: { cls: "synofinder-badge-rel", text: "Rel" },
      spelling: { cls: "synofinder-badge-spell", text: "Spell" },
    } as const;
    const badge = badgeMap[item.type] ?? badgeMap["related"];
    mainRow.createSpan({ cls: `synofinder-badge ${badge.cls}`, text: badge.text });

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
    if (source === "nspell") return "nspell";

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
    if (this.tabMetadata.length <= 1) return;

    const currentIndex = this.tabMetadata.findIndex((t) => t.id === this.activeTabId);
    let newIndex = currentIndex;

    // Find next non-grayed tab in the given direction
    for (let i = 0; i < this.tabMetadata.length; i++) {
      newIndex = newIndex + direction;

      // Wrap around
      if (newIndex < 0) {
        newIndex = this.tabMetadata.length - 1;
      } else if (newIndex >= this.tabMetadata.length) {
        newIndex = 0;
      }

      const tab = this.tabMetadata[newIndex];
      const state = this.tabStates.get(tab?.id || "");

      // Skip grayed tabs
      if (state !== "grayed") {
        break;
      }
    }

    const newTab = this.tabMetadata[newIndex];
    if (newTab && newTab.id !== this.activeTabId) {
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
