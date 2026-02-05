import { Modal, Platform, prepareSimpleSearch, setIcon } from "obsidian";
import {
  SynonymResult,
  WordRange,
  TabMetadata,
  TabState,
  RelationshipType,
  GroupedResults,
  DefinitionGroup,
} from "../types/types";
import { LanguageCode } from "../types/language";
import { getLanguageName } from "../data/languages";
import WordsmithPlugin from "../main";
import { replaceWord } from "../utils/wordExtractor";
import { createServiceIcon } from "../utils/serviceIcons";
import { groupByDefinition, flattenVisibleResults, getGroupDisplayDefinition, hasDisplayableDefinition } from "../utils/definitionGrouping";

// Labels for filter chips
const TYPE_LABELS: Record<RelationshipType, string> = {
  synonym: "Synonyms",
  antonym: "Antonyms",
  related: "Related",
  hypernym: "Hypernyms",
  hyponym: "Hyponyms",
};

export class SynonymModal extends Modal {
  private plugin: WordsmithPlugin;
  private word: string;
  private wordRange: WordRange;
  private tabMetadata: TabMetadata[];

  // Language info
  private language: LanguageCode;
  private languageSource: string;

  // Tab state management
  private tabStates: Map<string, TabState> = new Map();
  private tabResults: Map<string, SynonymResult[]> = new Map();
  private allComplete: boolean = false;

  // Filter state
  private activeFilters: Set<RelationshipType> = new Set();
  private availableTypes: RelationshipType[] = [];
  private loadingTypes: Set<RelationshipType> = new Set();
  private initialType: RelationshipType;

  private inputEl: HTMLInputElement;
  private tabContainerEl: HTMLElement;
  private filterContainerEl: HTMLElement;
  private resultsContainerEl: HTMLElement;
  private languageIndicatorEl: HTMLElement;

  private activeTabId: string;
  private selectedIndex: number = 0;
  private filteredResults: SynonymResult[] = [];
  private ignoreMouseUntilMove: boolean = true;

  // Definition grouping state
  private groupedResults: GroupedResults | null = null;
  private expandedGroups: Set<string> = new Set();
  private visibleFlatResults: SynonymResult[] = [];
  private readonly MAX_PER_GROUP = 5;

  // Swipe detection
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isSwiping: boolean = false;
  private isAnimating: boolean = false;

  constructor(
    plugin: WordsmithPlugin,
    word: string,
    wordRange: WordRange,
    tabMetadata: TabMetadata[],
    initialType: RelationshipType = "synonym",
    language: LanguageCode = "en",
    languageSource: string = "settings"
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.word = word;
    this.wordRange = wordRange;
    this.tabMetadata = tabMetadata;
    this.initialType = initialType;
    this.language = language;
    this.languageSource = languageSource;

    // Initialize all tabs as loading with empty results
    for (const tab of tabMetadata) {
      this.tabStates.set(tab.id, "loading");
      this.tabResults.set(tab.id, []);
    }

    // Set initial active tab to first tab
    this.activeTabId = tabMetadata[0]?.id || "";

    // Get available relationship types from enabled services
    this.availableTypes = this.plugin.dataService.getAvailableRelationshipTypes();

    // Initialize active filters with the initial type
    this.activeFilters.add(initialType);
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
    contentEl.addClass("wordsmith-modal");

    // Create search input
    const inputContainer = contentEl.createDiv({ cls: "wordsmith-input-container" });
    this.inputEl = inputContainer.createEl("input", {
      type: "text",
      placeholder: `Replace "${this.word}" with...`,
      cls: "wordsmith-input",
    });

    // Create tab bar
    this.tabContainerEl = contentEl.createDiv({ cls: "wordsmith-tabs" });
    this.renderTabs();

    // Create filter chips row (below tabs)
    this.filterContainerEl = contentEl.createDiv({ cls: "wordsmith-filters" });
    this.renderFilters();

    // Create results container
    this.resultsContainerEl = contentEl.createDiv({ cls: "wordsmith-results" });
    this.updateFilteredResults();
    this.renderResults();

    // Touch event handlers for swipe gestures
    this.resultsContainerEl.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: true });
    this.resultsContainerEl.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
    this.resultsContainerEl.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: true });

    // Add language indicator (subtle, in bottom corner)
    this.languageIndicatorEl = contentEl.createDiv({ cls: "wordsmith-language-indicator" });
    this.renderLanguageIndicator();

    // Add instructions
    const instructionsEl = contentEl.createDiv({ cls: "wordsmith-instructions" });
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
      const selected = this.visibleFlatResults[this.selectedIndex];
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

    // Focus input (skip on mobile to avoid keyboard covering the modal)
    if (!Platform.isMobileApp) {
      this.inputEl.focus();
    }
  }

  private renderTabs(): void {
    this.tabContainerEl.empty();

    for (const tab of this.tabMetadata) {
      const state = this.tabStates.get(tab.id) || "loading";
      const isActive = tab.id === this.activeTabId;

      // Build CSS classes based on state
      const classes = ["wordsmith-tab"];
      if (isActive) classes.push("wordsmith-tab-active");
      if (state === "grayed") classes.push("wordsmith-tab-grayed");
      if (state === "loading") classes.push("wordsmith-tab-loading");

      const tabEl = this.tabContainerEl.createDiv({
        cls: classes.join(" "),
      });

      // Service icon
      createServiceIcon(tabEl, tab.iconId, 16);

      // Show count for results, spinner for loading
      if (state === "results") {
        const count = this.getFilteredResultCountForTab(tab.id);
        tabEl.createSpan({
          text: `(${count})`,
          cls: "wordsmith-tab-count",
        });
        tabEl.setAttribute("title", `${tab.label} (${count})`);
      } else if (state === "loading") {
        tabEl.createSpan({
          cls: "wordsmith-tab-spinner wordsmith-spinner",
          text: "⟳",
        });
        tabEl.setAttribute("title", tab.label);
      } else {
        tabEl.setAttribute("title", tab.label);
      }

      // Click handler (only for non-grayed tabs)
      if (state !== "grayed") {
        tabEl.addEventListener("click", () => {
          if (this.isAnimating || tab.id === this.activeTabId) return;

          // Determine direction based on tab position
          const currentIndex = this.tabMetadata.findIndex((t) => t.id === this.activeTabId);
          const newIndex = this.tabMetadata.findIndex((t) => t.id === tab.id);
          const slideDirection = newIndex > currentIndex ? "right" : "left";

          this.switchTabWithAnimation(tab.id, slideDirection);
        });
      }
    }
  }

  /**
   * Get filtered result count for a tab (applies type filters).
   */
  private getFilteredResultCountForTab(tabId: string): number {
    const results = this.getResultsForTab(tabId);
    // Spelling tab doesn't use relationship type filters
    if (tabId === "spelling") {
      return results.length;
    }
    return results.filter(r => this.activeFilters.has(r.type as RelationshipType)).length;
  }

  /**
   * Render filter chips row.
   * Hidden when spelling tab is active (spelling is not a relationship type).
   */
  private renderFilters(): void {
    this.filterContainerEl.empty();

    // Hide filters when spelling tab is active
    if (this.activeTabId === "spelling") {
      this.filterContainerEl.addClass("wordsmith-hidden");
      return;
    }
    this.filterContainerEl.removeClass("wordsmith-hidden");

    for (const type of this.availableTypes) {
      const isActive = this.activeFilters.has(type);
      const isLoading = this.loadingTypes.has(type);

      const chipEl = this.filterContainerEl.createDiv({
        cls: `wordsmith-filter-chip ${isActive ? "wordsmith-filter-active" : ""} ${isLoading ? "wordsmith-filter-loading" : ""}`,
      });

      // Checkmark icon when active
      if (isActive && !isLoading) {
        const checkIcon = chipEl.createSpan({ cls: "wordsmith-filter-check" });
        setIcon(checkIcon, "check");
      }

      // Spinner when loading
      if (isLoading) {
        chipEl.createSpan({
          cls: "wordsmith-filter-spinner wordsmith-spinner",
          text: "⟳",
        });
      }

      // Label
      chipEl.createSpan({
        cls: "wordsmith-filter-label",
        text: TYPE_LABELS[type],
      });

      chipEl.setAttribute("title", `Toggle ${TYPE_LABELS[type].toLowerCase()}`);

      // Click handler
      chipEl.addEventListener("click", () => {
        this.onFilterToggle(type);
      });
    }
  }

  /**
   * Handle filter chip toggle.
   */
  private onFilterToggle(type: RelationshipType): void {
    if (this.activeFilters.has(type)) {
      // Don't allow unchecking all filters
      if (this.activeFilters.size <= 1) {
        return;
      }
      this.activeFilters.delete(type);
    } else {
      this.activeFilters.add(type);
      // Check if we need to lazy load this type
      void this.fetchMissingType(type);
    }

    this.updateFilteredResults();
    this.renderFilters();
    this.renderTabs(); // Update counts
    this.renderResults();
  }

  /**
   * Lazy load a type if not already fetched from services.
   */
  private async fetchMissingType(type: RelationshipType): Promise<void> {
    // Mark as loading
    this.loadingTypes.add(type);
    this.renderFilters();

    try {
      await this.plugin.dataService.fetchAdditionalTypes(
        this.word,
        [type],
        (sourceId, results) => {
          // Update results for this source
          this.tabResults.set(sourceId, results);
          // Re-render if this is the active tab
          if (sourceId === this.activeTabId) {
            this.updateFilteredResults();
            this.renderResults();
          }
          // Update tab counts
          this.renderTabs();
        },
        this.language
      );
    } finally {
      this.loadingTypes.delete(type);
      this.renderFilters();
    }
  }

  /**
   * Render the language indicator in the bottom corner.
   */
  private renderLanguageIndicator(): void {
    this.languageIndicatorEl.empty();

    // Only show for non-English languages
    if (this.language === "en") {
      this.languageIndicatorEl.addClass("wordsmith-hidden");
      return;
    }

    this.languageIndicatorEl.removeClass("wordsmith-hidden");

    const langName = getLanguageName(this.language);
    let displayText = langName;

    // Add source indicator for detected/auto languages
    if (this.languageSource === "detection") {
      displayText += " (detected)";
    } else if (this.languageSource === "frontmatter") {
      displayText += " (document)";
    }

    this.languageIndicatorEl.setText(displayText);
  }

  /**
   * Render an error message when no services support the language.
   */
  renderNoServicesForLanguage(): void {
    this.resultsContainerEl.empty();
    const langName = getLanguageName(this.language);
    const errorEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-no-results" });
    errorEl.createDiv({
      cls: "wordsmith-no-results-title",
      text: `No services support ${langName}`,
    });
    errorEl.createDiv({
      cls: "wordsmith-no-results-desc",
      text: "Try enabling additional services in settings, or change the language setting.",
    });
  }

  private updateFilteredResults(): void {
    const query = this.inputEl?.value?.trim().toLowerCase() || "";
    const results = this.getResultsForTab(this.activeTabId);

    // First apply type filter (unless spelling tab)
    let typeFiltered: SynonymResult[];
    if (this.activeTabId === "spelling") {
      // Spelling tab shows all results - no relationship type filtering
      typeFiltered = results;
    } else {
      // Apply relationship type filter
      typeFiltered = results.filter(r =>
        this.activeFilters.has(r.type as RelationshipType)
      );
    }

    // Then apply search filter
    if (!query) {
      this.filteredResults = typeFiltered;
    } else {
      const search = prepareSimpleSearch(query);
      this.filteredResults = typeFiltered.filter((r) => {
        const match = search(r.word);
        return match !== null;
      });
    }

    // Group results by definition
    this.groupedResults = groupByDefinition(this.filteredResults);

    // Build visible flat results for keyboard navigation
    this.visibleFlatResults = flattenVisibleResults(
      this.groupedResults.grouped,
      this.groupedResults.ungrouped,
      this.expandedGroups,
      this.MAX_PER_GROUP
    );

    // Reset selection if out of bounds
    if (this.selectedIndex >= this.visibleFlatResults.length) {
      this.selectedIndex = Math.max(0, this.visibleFlatResults.length - 1);
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
    if (this.visibleFlatResults.length === 0) {
      const emptyEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-empty" });
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

    // Track current flat index for keyboard navigation
    let flatIndex = 0;

    // Render grouped results
    if (this.groupedResults) {
      for (const group of this.groupedResults.grouped) {
        flatIndex = this.renderDefinitionGroup(group, flatIndex);
      }

      // Render ungrouped results (if any)
      if (this.groupedResults.ungrouped.length > 0) {
        for (const result of this.groupedResults.ungrouped) {
          this.renderResultItem(result, flatIndex);
          flatIndex++;
        }
      }
    }

    // Scroll selected item into view
    const selectedEl = this.resultsContainerEl.querySelector(".is-selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  private renderDefinitionGroup(group: DefinitionGroup, startIndex: number): number {
    const isExpanded = this.expandedGroups.has(group.definitionId);
    const hasMore = group.results.length > this.MAX_PER_GROUP;
    const visibleCount = isExpanded ? group.results.length : Math.min(group.results.length, this.MAX_PER_GROUP);

    // Render definition header
    const headerEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-def-header" });

    // Part of speech badge (if available)
    if (group.partOfSpeech) {
      headerEl.createSpan({ cls: "wordsmith-def-pos", text: group.partOfSpeech });
    }

    // Definition text (only if there's a real definition)
    if (hasDisplayableDefinition(group)) {
      const defText = getGroupDisplayDefinition(group);
      const truncatedDef = defText.length > 60 ? defText.substring(0, 57) + "..." : defText;
      headerEl.createSpan({ cls: "wordsmith-def-text", text: truncatedDef });
    }

    // Result count
    headerEl.createSpan({ cls: "wordsmith-def-count", text: `(${group.results.length})` });

    // Render visible results for this group
    let flatIndex = startIndex;
    for (let i = 0; i < visibleCount; i++) {
      const result = group.results[i];
      if (!result) continue;
      this.renderResultItem(result, flatIndex, true);
      flatIndex++;
    }

    // Show More button
    if (hasMore && !isExpanded) {
      const showMoreEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-show-more" });
      const remaining = group.results.length - this.MAX_PER_GROUP;
      showMoreEl.setText(`Show ${remaining} more`);
      showMoreEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.expandedGroups.add(group.definitionId);
        this.updateFilteredResults();
        this.renderResults();
      });
    } else if (hasMore && isExpanded) {
      // Show Less button when expanded
      const showLessEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-show-more" });
      showLessEl.setText("Show less");
      showLessEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.expandedGroups.delete(group.definitionId);
        this.updateFilteredResults();
        this.renderResults();
      });
    }

    return flatIndex;
  }

  private renderResultItem(result: SynonymResult, flatIndex: number, inGroup: boolean = false): void {
    const itemEl = this.resultsContainerEl.createDiv({
      cls: `wordsmith-suggestion ${flatIndex === this.selectedIndex ? "is-selected" : ""} ${inGroup ? "wordsmith-grouped-item" : ""}`,
    });

    // Use compact rendering for grouped items (no definition shown - it's in header)
    if (inGroup) {
      this.renderSuggestionCompact(result, itemEl);
    } else {
      this.renderSuggestion(result, itemEl);
    }

    itemEl.addEventListener("click", () => {
      this.selectResult(result);
    });

    itemEl.addEventListener("mouseenter", () => {
      if (this.ignoreMouseUntilMove) return;
      this.selectedIndex = flatIndex;
      this.updateSelectionStyles();
    });
  }

  private renderSuggestionCompact(item: SynonymResult, el: HTMLElement): void {
    const container = el.createDiv({ cls: "wordsmith-suggestion-content" });
    const mainRow = container.createDiv({ cls: "wordsmith-suggestion-main" });

    mainRow.createSpan({ cls: "wordsmith-word", text: item.word });

    const badgeMap: Record<string, { cls: string; text: string }> = {
      synonym: { cls: "wordsmith-badge-syn", text: "Syn" },
      antonym: { cls: "wordsmith-badge-ant", text: "Ant" },
      related: { cls: "wordsmith-badge-rel", text: "Rel" },
      hypernym: { cls: "wordsmith-badge-hyper", text: "Hyper" },
      hyponym: { cls: "wordsmith-badge-hypo", text: "Hypo" },
      spelling: { cls: "wordsmith-badge-spell", text: "Spell" },
    };
    const badge = badgeMap[item.type] || badgeMap["related"]!;
    mainRow.createSpan({ cls: `wordsmith-badge ${badge.cls}`, text: badge.text });

    // No part of speech shown (already in header)

    const sourceLabel = this.getSourceLabel(item.source);
    const sourceClass = `wordsmith-source-${this.sanitizeClassName(item.source)}`;
    mainRow.createSpan({ cls: `wordsmith-source ${sourceClass}`, text: sourceLabel });

    // No definition shown (already in header)
  }

  private renderLoading(): void {
    const loadingEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-loading" });
    loadingEl.createSpan({ cls: "wordsmith-spinner", text: "⟳" });
    loadingEl.createDiv({
      cls: "wordsmith-loading-text",
      text: `Looking up "${this.word}"...`,
    });
  }

  private renderNoResults(): void {
    this.resultsContainerEl.empty();
    const noResultsEl = this.resultsContainerEl.createDiv({ cls: "wordsmith-no-results" });
    noResultsEl.createDiv({ cls: "wordsmith-no-results-title", text: "No Results Found" });
    noResultsEl.createDiv({
      cls: "wordsmith-no-results-desc",
      text: `No synonyms or suggestions found for "${this.word}"`,
    });
  }

  private renderSuggestion(item: SynonymResult, el: HTMLElement): void {
    const container = el.createDiv({ cls: "wordsmith-suggestion-content" });
    const mainRow = container.createDiv({ cls: "wordsmith-suggestion-main" });

    mainRow.createSpan({ cls: "wordsmith-word", text: item.word });

    const badgeMap: Record<string, { cls: string; text: string }> = {
      synonym: { cls: "wordsmith-badge-syn", text: "Syn" },
      antonym: { cls: "wordsmith-badge-ant", text: "Ant" },
      related: { cls: "wordsmith-badge-rel", text: "Rel" },
      hypernym: { cls: "wordsmith-badge-hyper", text: "Hyper" },
      hyponym: { cls: "wordsmith-badge-hypo", text: "Hypo" },
      spelling: { cls: "wordsmith-badge-spell", text: "Spell" },
    };
    const badge = badgeMap[item.type] || badgeMap["related"]!;
    mainRow.createSpan({ cls: `wordsmith-badge ${badge.cls}`, text: badge.text });

    if (item.partOfSpeech) {
      mainRow.createSpan({ cls: "wordsmith-pos", text: item.partOfSpeech });
    }

    const sourceLabel = this.getSourceLabel(item.source);
    const sourceClass = `wordsmith-source-${this.sanitizeClassName(item.source)}`;
    mainRow.createSpan({ cls: `wordsmith-source ${sourceClass}`, text: sourceLabel });

    if (item.definition) {
      const defRow = container.createDiv({ cls: "wordsmith-definition" });
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
    if (this.tabMetadata.length <= 1 || this.isAnimating) return;

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
      // direction > 0 means moving right (next tab), so slide left
      // direction < 0 means moving left (previous tab), so slide right
      const slideDirection = direction > 0 ? "right" : "left";
      this.switchTabWithAnimation(newTab.id, slideDirection);
    }
  }

  private moveSelection(direction: number): void {
    const newIndex = this.selectedIndex + direction;

    if (newIndex >= 0 && newIndex < this.visibleFlatResults.length) {
      this.selectedIndex = newIndex;
      this.ignoreMouseUntilMove = true;
      this.updateSelectionStyles();
    }
  }

  private updateSelectionStyles(): void {
    const items = this.resultsContainerEl.querySelectorAll(".wordsmith-suggestion");
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

  private handleTouchStart(e: TouchEvent): void {
    if (this.isAnimating || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isSwiping = false;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.isAnimating || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Determine if this is a horizontal swipe (more horizontal than vertical movement)
    if (!this.isSwiping && Math.abs(deltaX) > 10) {
      // Check if horizontal movement is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.isSwiping = true;
        e.preventDefault(); // Prevent vertical scrolling when swiping horizontally
      }
    }

    if (this.isSwiping) {
      e.preventDefault();
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.isAnimating) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.touchStartX;
    const swipeThreshold = 50; // Minimum distance for a swipe

    if (this.isSwiping && Math.abs(deltaX) >= swipeThreshold) {
      // Swipe left (negative deltaX) = go to next tab (direction 1)
      // Swipe right (positive deltaX) = go to previous tab (direction -1)
      const direction = deltaX < 0 ? 1 : -1;
      this.cycleTab(direction);
    }

    this.isSwiping = false;
  }

  private switchTabWithAnimation(newTabId: string, direction: "left" | "right"): void {
    if (this.isAnimating || newTabId === this.activeTabId) return;
    this.isAnimating = true;

    // Determine slide-out direction (opposite to navigation)
    const slideOutClass = direction === "right" ? "wordsmith-slide-out-left" : "wordsmith-slide-out-right";
    const slideInClass = direction === "right" ? "wordsmith-slide-in-right" : "wordsmith-slide-in-left";

    // Start slide-out animation
    this.resultsContainerEl.addClass(slideOutClass);

    // After slide-out, update content and slide-in
    setTimeout(() => {
      this.resultsContainerEl.removeClass(slideOutClass);

      // Update to new tab
      this.activeTabId = newTabId;
      this.selectedIndex = 0;
      this.updateFilteredResults();
      this.renderTabs();
      this.renderFilters(); // Update filter visibility
      this.renderResults();

      // Prepare for slide-in (start off-screen)
      this.resultsContainerEl.addClass(slideInClass);

      // Force reflow to ensure the starting position is applied
      void this.resultsContainerEl.offsetWidth;

      // Remove slide-in class to trigger animation to final position
      this.resultsContainerEl.removeClass(slideInClass);

      // Animation complete
      setTimeout(() => {
        this.isAnimating = false;
      }, 150);
    }, 150);
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
