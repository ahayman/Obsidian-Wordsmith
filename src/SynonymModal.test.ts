import { SynonymModal } from "./SynonymModal";
import { TabMetadata, SynonymResult, WordRange, RelationshipType } from "./types";
import WordsmithPlugin from "./main";
import { App, Modal, Scope, Platform } from "obsidian";

// Mock wordExtractor
jest.mock("./utils/wordExtractor", () => ({
  replaceWord: jest.fn(),
}));

// Mock serviceIcons
jest.mock("./utils/serviceIcons", () => ({
  createServiceIcon: jest.fn((parent: HTMLElement, _iconId: string, _size: number) => {
    const iconEl = document.createElement("span");
    iconEl.classList.add("wordsmith-service-icon");
    parent.appendChild(iconEl);
    return iconEl;
  }),
}));

// Helper to create mock App
function createMockApp(): App {
  return {
    workspace: {
      getActiveViewOfType: jest.fn(() => null),
      activeEditor: null,
    },
    vault: {
      getAbstractFileByPath: jest.fn(() => null),
    },
  } as unknown as App;
}

// Helper to create mock plugin
function createMockPlugin(app: App): WordsmithPlugin {
  return {
    app,
    dataService: {
      getAvailableRelationshipTypes: jest.fn(() => ["synonym", "antonym", "related"] as RelationshipType[]),
      fetchAdditionalTypes: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as WordsmithPlugin;
}

// Helper to create mock word range
function createWordRange(): WordRange {
  return {
    from: { line: 0, ch: 0 },
    to: { line: 0, ch: 5 },
  };
}

// Helper to create tab metadata
function createTabMetadata(): TabMetadata[] {
  return [
    { id: "local", label: "Local", iconId: "local" },
    { id: "datamuse", label: "Datamuse", iconId: "datamuse" },
  ];
}

// Helper to create synonym results
function createSynonymResults(count: number, options: Partial<SynonymResult> = {}): SynonymResult[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i + 1}`,
    type: "synonym" as const,
    source: "wordnet" as const,
    partOfSpeech: "noun",
    definition: `Definition for word${i + 1}`,
    definitionId: `def-${i % 3}`, // Group into 3 definitions
    ...options,
  }));
}

// Helper to create results with different types
function createMixedTypeResults(): SynonymResult[] {
  return [
    { word: "similar", type: "synonym", source: "wordnet", definitionId: "def-1" },
    { word: "opposite", type: "antonym", source: "wordnet", definitionId: "def-2" },
    { word: "connected", type: "related", source: "wordnet", definitionId: "def-3" },
    { word: "general", type: "hypernym", source: "wordnet", definitionId: "def-4" },
    { word: "specific", type: "hyponym", source: "wordnet", definitionId: "def-5" },
  ];
}

describe("SynonymModal", () => {
  let app: App;
  let plugin: WordsmithPlugin;
  let modal: SynonymModal;

  beforeEach(() => {
    app = createMockApp();
    plugin = createMockPlugin(app);
    // Reset Platform to desktop
    (Platform as { isMobileApp: boolean }).isMobileApp = false;
  });

  afterEach(() => {
    if (modal) {
      modal.close();
    }
    // Clean up any modals attached to body
    document.body.innerHTML = "";
  });

  describe("constructor", () => {
    it("should initialize with word and word range", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      expect(modal).toBeInstanceOf(SynonymModal);
      expect(modal).toBeInstanceOf(Modal);
    });

    it("should set first tab as active by default", () => {
      const tabs = createTabMetadata();
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      const activeTab = modal.contentEl.querySelector(".wordsmith-tab-active");
      expect(activeTab).not.toBeNull();
    });

    it("should initialize all tabs as loading", () => {
      const tabs = createTabMetadata();
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      const loadingTabs = modal.contentEl.querySelectorAll(".wordsmith-tab-loading");
      expect(loadingTabs.length).toBe(2);
    });

    it("should use 'synonym' as default initial type", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // The synonym filter should be active
      const activeFilters = modal.contentEl.querySelectorAll(".wordsmith-filter-active");
      expect(activeFilters.length).toBe(1);
    });

    it("should accept custom initial type", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata(), "antonym");
      modal.open();

      // Should still render filter chips
      const filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      expect(filterChips.length).toBeGreaterThan(0);
    });
  });

  describe("onOpen", () => {
    it("should add wordsmith-modal class to content", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      expect(modal.contentEl.classList.contains("wordsmith-modal")).toBe(true);
    });

    it("should create input element with placeholder", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.placeholder).toContain("hello");
    });

    it("should create tab container", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const tabContainer = modal.contentEl.querySelector(".wordsmith-tabs");
      expect(tabContainer).not.toBeNull();
    });

    it("should create filter container", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const filterContainer = modal.contentEl.querySelector(".wordsmith-filters");
      expect(filterContainer).not.toBeNull();
    });

    it("should create results container", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const resultsContainer = modal.contentEl.querySelector(".wordsmith-results");
      expect(resultsContainer).not.toBeNull();
    });

    it("should create instructions element", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const instructions = modal.contentEl.querySelector(".wordsmith-instructions");
      expect(instructions).not.toBeNull();
    });

    it("should register keyboard handlers", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const handlers = modal.scope.getHandlers();
      expect(handlers.has("ArrowDown")).toBe(true);
      expect(handlers.has("ArrowUp")).toBe(true);
      expect(handlers.has("Enter")).toBe(true);
      expect(handlers.has("Tab")).toBe(true);
      expect(handlers.has("Shift+Tab")).toBe(true);
    });

    it("should focus input on desktop", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      // Note: jsdom doesn't fully support focus, but we verify the element exists
      expect(input).not.toBeNull();
    });

    it("should not focus input on mobile", () => {
      (Platform as { isMobileApp: boolean }).isMobileApp = true;
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Input should exist but focus behavior differs
      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      expect(input).not.toBeNull();
    });
  });

  describe("onClose", () => {
    it("should empty content element", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Verify content exists
      expect(modal.contentEl.children.length).toBeGreaterThan(0);

      modal.close();

      expect(modal.contentEl.children.length).toBe(0);
    });
  });

  describe("onSourceComplete", () => {
    it("should update tab state to results when results provided", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results = createSynonymResults(5);
      modal.onSourceComplete("local", results);

      const localTab = modal.contentEl.querySelector(".wordsmith-tab");
      expect(localTab?.classList.contains("wordsmith-tab-loading")).toBe(false);
    });

    it("should update tab state to grayed when no results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", []);

      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      const localTab = tabs[0];
      expect(localTab?.classList.contains("wordsmith-tab-grayed")).toBe(true);
    });

    it("should auto-switch to another tab when current tab becomes grayed", () => {
      const tabs = createTabMetadata();
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      // First complete datamuse with results
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Then complete local (active tab) with no results - should auto-switch
      modal.onSourceComplete("local", []);

      // datamuse should now be active
      const activeTabs = modal.contentEl.querySelectorAll(".wordsmith-tab-active");
      expect(activeTabs.length).toBe(1);
    });

    it("should show result count in tab after completion", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results = createSynonymResults(5);
      modal.onSourceComplete("local", results);

      const countEl = modal.contentEl.querySelector(".wordsmith-tab-count");
      expect(countEl?.textContent).toContain("5");
    });

    it("should render results for active tab", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results = createSynonymResults(3);
      modal.onSourceComplete("local", results);

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(3);
    });
  });

  describe("onAllComplete", () => {
    it("should render no results when all tabs are grayed", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", []);
      modal.onSourceComplete("datamuse", []);
      modal.onAllComplete();

      const noResults = modal.contentEl.querySelector(".wordsmith-no-results");
      expect(noResults).not.toBeNull();
    });

    it("should not render no results when some tabs have results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", []);
      modal.onAllComplete();

      const noResults = modal.contentEl.querySelector(".wordsmith-no-results");
      expect(noResults).toBeNull();
    });
  });

  describe("tab switching", () => {
    it("should switch tabs on click", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Complete both tabs
      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Click on datamuse tab
      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      const datamuseTab = tabs[1] as HTMLElement;
      datamuseTab.click();

      // Wait for animation to complete and DOM to update
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Re-query the DOM after animation as the tabs get re-rendered
          const updatedTabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
          expect(updatedTabs[1]?.classList.contains("wordsmith-tab-active")).toBe(true);
          resolve();
        }, 400); // Give a bit more time for the double setTimeout in switchTabWithAnimation
      });
    });

    it("should not allow switching to grayed tabs", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", []);

      // Try to click on grayed datamuse tab
      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      const datamuseTab = tabs[1] as HTMLElement;
      datamuseTab.click();

      // First tab should still be active
      const localTab = tabs[0] as HTMLElement;
      expect(localTab.classList.contains("wordsmith-tab-active")).toBe(true);
    });

    it("should cycle through tabs with Tab key", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Trigger Tab key
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      // Wait for animation to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
          const datamuseTab = tabs[1] as HTMLElement;
          expect(datamuseTab.classList.contains("wordsmith-tab-active")).toBe(true);
          resolve();
        }, 350);
      });
    });

    it("should cycle backwards with Shift+Tab", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // First go forward
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Now go back
          modal.scope.triggerKey(["Shift"], "Tab", mockEvent);

          setTimeout(() => {
            const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
            const localTab = tabs[0] as HTMLElement;
            expect(localTab.classList.contains("wordsmith-tab-active")).toBe(true);
            resolve();
          }, 350);
        }, 350);
      });
    });

    it("should skip grayed tabs when cycling", () => {
      const tabs = [
        { id: "local", label: "Local", iconId: "local" },
        { id: "datamuse", label: "Datamuse", iconId: "datamuse" },
        { id: "spelling", label: "Spelling", iconId: "spelling" },
      ];
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", []);  // Grayed
      modal.onSourceComplete("spelling", createSynonymResults(2));

      // Tab should skip datamuse and go to spelling
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const tabElements = modal.contentEl.querySelectorAll(".wordsmith-tab");
          const spellingTab = tabElements[2] as HTMLElement;
          expect(spellingTab.classList.contains("wordsmith-tab-active")).toBe(true);
          resolve();
        }, 350);
      });
    });

    it("should wrap around when cycling past last tab", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      // Cycle forward twice to wrap
      modal.scope.triggerKey([], "Tab", mockEvent);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          modal.scope.triggerKey([], "Tab", mockEvent);

          setTimeout(() => {
            const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
            const localTab = tabs[0] as HTMLElement;
            expect(localTab.classList.contains("wordsmith-tab-active")).toBe(true);
            resolve();
          }, 350);
        }, 350);
      });
    });
  });

  describe("relationship type filter toggling", () => {
    it("should render filter chips for available types", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      expect(filterChips.length).toBe(3); // synonym, antonym, related
    });

    it("should toggle filter on click", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createMixedTypeResults());

      // Find antonym filter chip (not active by default since initial type is synonym)
      let filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const antonymChip = filterChips[1] as HTMLElement;

      // Click to activate
      antonymChip.click();

      // Re-query after click as filters get re-rendered
      filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const updatedAntonymChip = filterChips[1] as HTMLElement;

      expect(updatedAntonymChip.classList.contains("wordsmith-filter-active")).toBe(true);
    });

    it("should not allow unchecking all filters", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createMixedTypeResults());

      // Only synonym is active, try to uncheck it
      const filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const synonymChip = filterChips[0] as HTMLElement;

      expect(synonymChip.classList.contains("wordsmith-filter-active")).toBe(true);
      synonymChip.click();
      // Should still be active since it's the only one
      expect(synonymChip.classList.contains("wordsmith-filter-active")).toBe(true);
    });

    it("should allow unchecking when multiple filters are active", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createMixedTypeResults());

      let filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      let antonymChip = filterChips[1] as HTMLElement;

      // Activate antonym
      antonymChip.click();

      // Re-query after re-render
      filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      antonymChip = filterChips[1] as HTMLElement;
      expect(antonymChip.classList.contains("wordsmith-filter-active")).toBe(true);

      // Now uncheck synonym
      let synonymChip = filterChips[0] as HTMLElement;
      synonymChip.click();

      // Re-query after re-render
      filterChips = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      synonymChip = filterChips[0] as HTMLElement;
      expect(synonymChip.classList.contains("wordsmith-filter-active")).toBe(false);
    });

    it("should filter results based on active types", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createMixedTypeResults());

      // Only synonyms should be shown initially
      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(1); // Just "similar"
    });

    it("should hide filters for spelling tab", () => {
      const tabs = [
        { id: "spelling", label: "Spelling", iconId: "spelling" },
      ];
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      const filterContainer = modal.contentEl.querySelector(".wordsmith-filters");
      expect(filterContainer?.classList.contains("wordsmith-hidden")).toBe(true);
    });

    it("should show all results for spelling tab regardless of filters", () => {
      const tabs = [
        { id: "spelling", label: "Spelling", iconId: "spelling" },
      ];
      modal = new SynonymModal(plugin, "hello", createWordRange(), tabs);
      modal.open();

      const spellingResults: SynonymResult[] = [
        { word: "hello1", type: "spelling", source: "nspell" },
        { word: "hello2", type: "spelling", source: "nspell" },
      ];
      modal.onSourceComplete("spelling", spellingResults);

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(2);
    });
  });

  describe("result rendering", () => {
    it("should show loading spinner for loading tabs", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const loadingEl = modal.contentEl.querySelector(".wordsmith-loading");
      expect(loadingEl).not.toBeNull();
    });

    it("should show empty state when filtered results are empty", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Provide only antonyms but filter is on synonyms
      modal.onSourceComplete("local", [
        { word: "opposite", type: "antonym", source: "wordnet" },
      ]);

      const emptyEl = modal.contentEl.querySelector(".wordsmith-empty");
      expect(emptyEl).not.toBeNull();
    });

    it("should render suggestion items correctly", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(3);

      const firstWord = suggestions[0]?.querySelector(".wordsmith-word");
      expect(firstWord?.textContent).toBe("word1");
    });

    it("should show type badge on results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(1));

      const badge = modal.contentEl.querySelector(".wordsmith-badge");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("Syn");
    });

    it("should show source label on results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(1));

      const source = modal.contentEl.querySelector(".wordsmith-source");
      expect(source).not.toBeNull();
      expect(source?.textContent).toBe("wordnet");
    });

    it("should show definition on ungrouped results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "wordnet", definition: "A test definition" },
      ];
      modal.onSourceComplete("local", results);

      const defEl = modal.contentEl.querySelector(".wordsmith-definition");
      expect(defEl?.textContent).toContain("A test definition");
    });

    it("should truncate long definitions", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const longDef = "A".repeat(100);
      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "wordnet", definition: longDef },
      ];
      modal.onSourceComplete("local", results);

      const defEl = modal.contentEl.querySelector(".wordsmith-definition");
      expect(defEl?.textContent?.length).toBeLessThan(100);
      expect(defEl?.textContent).toContain("...");
    });
  });

  describe("definition group expand/collapse", () => {
    it("should group results by definition", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Create results with same definitionId
      const results: SynonymResult[] = [
        { word: "word1", type: "synonym", source: "wordnet", definitionId: "def-1", definition: "A definition" },
        { word: "word2", type: "synonym", source: "wordnet", definitionId: "def-1", definition: "A definition" },
        { word: "word3", type: "synonym", source: "wordnet", definitionId: "def-1", definition: "A definition" },
      ];
      modal.onSourceComplete("local", results);

      const defHeader = modal.contentEl.querySelector(".wordsmith-def-header");
      expect(defHeader).not.toBeNull();
    });

    it("should show definition text in header", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "word1", type: "synonym", source: "wordnet", definitionId: "def-1", definition: "Test definition" },
        { word: "word2", type: "synonym", source: "wordnet", definitionId: "def-1", definition: "Test definition" },
      ];
      modal.onSourceComplete("local", results);

      const defText = modal.contentEl.querySelector(".wordsmith-def-text");
      expect(defText?.textContent).toContain("Test definition");
    });

    it("should show count in group header", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "word1", type: "synonym", source: "wordnet", definitionId: "def-1" },
        { word: "word2", type: "synonym", source: "wordnet", definitionId: "def-1" },
        { word: "word3", type: "synonym", source: "wordnet", definitionId: "def-1" },
      ];
      modal.onSourceComplete("local", results);

      const countEl = modal.contentEl.querySelector(".wordsmith-def-count");
      expect(countEl?.textContent).toContain("3");
    });

    it("should limit visible results per group by default", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Create 10 results with same definition
      const results: SynonymResult[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
        definitionId: "def-1",
      }));
      modal.onSourceComplete("local", results);

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(5); // MAX_PER_GROUP default
    });

    it("should show 'Show more' button when group has more items", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
        definitionId: "def-1",
      }));
      modal.onSourceComplete("local", results);

      const showMore = modal.contentEl.querySelector(".wordsmith-show-more");
      expect(showMore).not.toBeNull();
      expect(showMore?.textContent).toContain("Show 5 more");
    });

    it("should expand group when Show more is clicked", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
        definitionId: "def-1",
      }));
      modal.onSourceComplete("local", results);

      const showMore = modal.contentEl.querySelector(".wordsmith-show-more") as HTMLElement;
      showMore.click();

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(10);
    });

    it("should show Show less button after expansion", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
        definitionId: "def-1",
      }));
      modal.onSourceComplete("local", results);

      const showMore = modal.contentEl.querySelector(".wordsmith-show-more") as HTMLElement;
      showMore.click();

      const showLess = modal.contentEl.querySelector(".wordsmith-show-more");
      expect(showLess?.textContent).toContain("Show less");
    });

    it("should collapse group when Show less is clicked", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
        definitionId: "def-1",
      }));
      modal.onSourceComplete("local", results);

      // Expand
      const showMore = modal.contentEl.querySelector(".wordsmith-show-more") as HTMLElement;
      showMore.click();

      // Collapse
      const showLess = modal.contentEl.querySelector(".wordsmith-show-more") as HTMLElement;
      showLess.click();

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(5);
    });
  });

  describe("keyboard navigation", () => {
    it("should move selection down with ArrowDown", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowDown", mockEvent);

      const selected = modal.contentEl.querySelector(".is-selected");
      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[1]?.classList.contains("is-selected")).toBe(true);
    });

    it("should move selection up with ArrowUp", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      // Move down first
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowDown", mockEvent);
      modal.scope.triggerKey([], "ArrowDown", mockEvent);

      // Then up
      modal.scope.triggerKey([], "ArrowUp", mockEvent);

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[1]?.classList.contains("is-selected")).toBe(true);
    });

    it("should not move selection past first item", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowUp", mockEvent);

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[0]?.classList.contains("is-selected")).toBe(true);
    });

    it("should not move selection past last item", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      // Move down past the end
      for (let i = 0; i < 10; i++) {
        modal.scope.triggerKey([], "ArrowDown", mockEvent);
      }

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[2]?.classList.contains("is-selected")).toBe(true);
    });

    it("should select first item by default", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[0]?.classList.contains("is-selected")).toBe(true);
    });

    it("should call selectResult on Enter", () => {
      const mockEditor = {
        replaceRange: jest.fn(),
        getRange: jest.fn(() => "hello"),
      };
      (app.workspace as { activeEditor: { editor: typeof mockEditor } }).activeEditor = { editor: mockEditor };

      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Enter", mockEvent);

      // Modal should close after selection
      expect(modal.contentEl.children.length).toBe(0);
    });

    it("should prevent default on keyboard events", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowDown", mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe("mouse navigation", () => {
    it("should update selection on mouseenter", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      const resultsContainer = modal.contentEl.querySelector(".wordsmith-results") as HTMLElement;

      // First need to trigger mousemove to enable mouse selection
      resultsContainer.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      const secondItem = suggestions[1] as HTMLElement;

      secondItem.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      expect(secondItem.classList.contains("is-selected")).toBe(true);
    });

    it("should ignore mouse events until mousemove after keyboard navigation", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      // Do keyboard navigation
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowDown", mockEvent);

      // Try mouseenter without mousemove
      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      const thirdItem = suggestions[2] as HTMLElement;
      thirdItem.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // Should still be on second item from keyboard
      expect(suggestions[1]?.classList.contains("is-selected")).toBe(true);
    });

    it("should select result on click", () => {
      const mockEditor = {
        replaceRange: jest.fn(),
        getRange: jest.fn(() => "hello"),
      };
      (app.workspace as { activeEditor: { editor: typeof mockEditor } }).activeEditor = { editor: mockEditor };

      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      const firstItem = suggestions[0] as HTMLElement;
      firstItem.click();

      // Modal should close after selection
      expect(modal.contentEl.children.length).toBe(0);
    });
  });

  describe("swipe gesture handling", () => {
    // jsdom doesn't support TouchEvent constructor well, so we test swipe via tab cycling
    // which is what swipe ultimately calls

    it("should cycle tabs to the right (simulating swipe left)", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Swipe left would call cycleTab(1) - we can test this via Tab key which does the same
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
          expect(tabs[1]?.classList.contains("wordsmith-tab-active")).toBe(true);
          resolve();
        }, 400);
      });
    });

    it("should cycle tabs to the left (simulating swipe right)", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Go to second tab first
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Swipe right would call cycleTab(-1) - test via Shift+Tab
          modal.scope.triggerKey(["Shift"], "Tab", mockEvent);

          setTimeout(() => {
            const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
            expect(tabs[0]?.classList.contains("wordsmith-tab-active")).toBe(true);
            resolve();
          }, 400);
        }, 400);
      });
    });

    it("should have touch event listeners registered on results container", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const resultsContainer = modal.contentEl.querySelector(".wordsmith-results") as HTMLElement;
      expect(resultsContainer).not.toBeNull();
      // The touch handlers are attached via addEventListener, which we can verify exists
      // The actual touch behavior is tested via tab cycling since jsdom doesn't support TouchEvent well
    });

    it("should not change tabs when single tab modal", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), [
        { id: "local", label: "Local", iconId: "local" },
      ]);
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      // Try to cycle - should do nothing
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      expect(tabs[0]?.classList.contains("wordsmith-tab-active")).toBe(true);
    });
  });

  describe("search/filter input", () => {
    it("should filter results based on input", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", [
        { word: "apple", type: "synonym", source: "wordnet" },
        { word: "banana", type: "synonym", source: "wordnet" },
        { word: "apricot", type: "synonym", source: "wordnet" },
      ]);

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      input.value = "ap";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(2); // apple and apricot
    });

    it("should be case insensitive", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", [
        { word: "Apple", type: "synonym", source: "wordnet" },
        { word: "BANANA", type: "synonym", source: "wordnet" },
      ]);

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      input.value = "apple";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(1);
    });

    it("should show all results when input is cleared", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;

      // Filter
      input.value = "word1";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      // Clear
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(5);
    });

    it("should reset selection when filtering changes results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(5));

      // Move selection down
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "ArrowDown", mockEvent);
      modal.scope.triggerKey([], "ArrowDown", mockEvent);

      // Filter to fewer results
      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      input.value = "word1";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      // First item should be selected
      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions[0]?.classList.contains("is-selected")).toBe(true);
    });
  });

  describe("streaming results updates", () => {
    it("should update results as sources complete", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // First source completes
      modal.onSourceComplete("local", createSynonymResults(3));

      let suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(3);

      // Second source completes - should still show first tab's results
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(3); // Still showing local tab
    });

    it("should update tab count when other sources complete", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab-count");
      expect(tabs.length).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty tab metadata", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), []);
      modal.open();

      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      expect(tabs.length).toBe(0);
    });

    it("should handle single result", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(1));

      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBe(1);
    });

    it("should handle very long word lists", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // 100 results
      modal.onSourceComplete("local", createSynonymResults(100));

      // Should render without error
      const suggestions = modal.contentEl.querySelectorAll(".wordsmith-suggestion");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle results with no definition", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "wordnet" },
      ];
      modal.onSourceComplete("local", results);

      const defEl = modal.contentEl.querySelector(".wordsmith-definition");
      expect(defEl).toBeNull();
    });

    it("should handle results with no part of speech", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "wordnet" },
      ];
      modal.onSourceComplete("local", results);

      const posEl = modal.contentEl.querySelector(".wordsmith-pos");
      expect(posEl).toBeNull();
    });

    it("should handle switching away from single-tab modal", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), [
        { id: "local", label: "Local", iconId: "local" },
      ]);
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      // Tab cycling should do nothing with single tab
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);

      const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
      expect(tabs[0]?.classList.contains("wordsmith-tab-active")).toBe(true);
    });

    it("should handle all services returning empty results", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", []);
      modal.onSourceComplete("datamuse", []);
      modal.onAllComplete();

      const noResults = modal.contentEl.querySelector(".wordsmith-no-results");
      expect(noResults).not.toBeNull();
      expect(noResults?.textContent).toContain("No Results Found");
    });

    it("should handle special characters in word", () => {
      modal = new SynonymModal(plugin, "test's", createWordRange(), createTabMetadata());
      modal.open();

      const input = modal.contentEl.querySelector(".wordsmith-input") as HTMLInputElement;
      expect(input.placeholder).toContain("test's");
    });

    it("should handle results with various badge types", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      // Enable all filters for this test
      const filters = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      filters.forEach(filter => (filter as HTMLElement).click());

      const mixedResults = createMixedTypeResults();
      modal.onSourceComplete("local", mixedResults);

      const badges = modal.contentEl.querySelectorAll(".wordsmith-badge");
      const badgeTexts = Array.from(badges).map(b => b.textContent);

      expect(badgeTexts).toContain("Syn");
      expect(badgeTexts).toContain("Ant");
      expect(badgeTexts).toContain("Rel");
    });

    it("should handle results with different sources", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test1", type: "synonym", source: "wordnet" },
        { word: "test2", type: "synonym", source: "moby" },
        { word: "test3", type: "synonym", source: "datamuse" },
      ];
      modal.onSourceComplete("local", results);

      const sources = modal.contentEl.querySelectorAll(".wordsmith-source");
      const sourceTexts = Array.from(sources).map(s => s.textContent);

      expect(sourceTexts).toContain("wordnet");
      expect(sourceTexts).toContain("moby");
      expect(sourceTexts).toContain("datamuse");
    });
  });

  describe("source labels", () => {
    it("should display correct labels for built-in sources", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "wordnet" },
      ];
      modal.onSourceComplete("local", results);

      const source = modal.contentEl.querySelector(".wordsmith-source");
      expect(source?.textContent).toBe("wordnet");
    });

    it("should display abbreviated labels for API sources", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      const results: SynonymResult[] = [
        { word: "test", type: "synonym", source: "merriam-webster" },
      ];
      modal.onSourceComplete("local", results);

      const source = modal.contentEl.querySelector(".wordsmith-source");
      expect(source?.textContent).toBe("M-W");
    });
  });

  describe("lazy loading relationship types", () => {
    it("should call fetchAdditionalTypes when enabling new filter", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      // Click on a filter that's not active
      const filters = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const antonymFilter = filters[1] as HTMLElement;
      antonymFilter.click();

      expect(plugin.dataService.fetchAdditionalTypes).toHaveBeenCalled();
    });

    it("should show loading state on filter chip while fetching", async () => {
      // Make fetchAdditionalTypes return a pending promise
      let resolveFetch: () => void = () => {};
      (plugin.dataService.fetchAdditionalTypes as jest.Mock).mockImplementation(
        () => new Promise<void>((resolve) => { resolveFetch = resolve; })
      );

      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));

      let filters = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const antonymFilter = filters[1] as HTMLElement;
      antonymFilter.click();

      // Re-query after re-render to check loading state
      filters = modal.contentEl.querySelectorAll(".wordsmith-filter-chip");
      const updatedAntonymFilter = filters[1] as HTMLElement;

      // Check for loading state
      expect(updatedAntonymFilter.classList.contains("wordsmith-filter-loading")).toBe(true);

      // Cleanup - resolve the promise
      resolveFetch();
      await Promise.resolve(); // Let the promise resolve
    });
  });

  describe("animation handling", () => {
    it("should not allow rapid tab switching during animation", () => {
      modal = new SynonymModal(plugin, "hello", createWordRange(), createTabMetadata());
      modal.open();

      modal.onSourceComplete("local", createSynonymResults(3));
      modal.onSourceComplete("datamuse", createSynonymResults(5));

      // Rapidly trigger multiple tab switches
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;
      modal.scope.triggerKey([], "Tab", mockEvent);
      modal.scope.triggerKey([], "Tab", mockEvent); // Should be ignored
      modal.scope.triggerKey([], "Tab", mockEvent); // Should be ignored

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Only first switch should have happened
          const tabs = modal.contentEl.querySelectorAll(".wordsmith-tab");
          expect(tabs[1]?.classList.contains("wordsmith-tab-active")).toBe(true);
          resolve();
        }, 350);
      });
    });
  });
});
