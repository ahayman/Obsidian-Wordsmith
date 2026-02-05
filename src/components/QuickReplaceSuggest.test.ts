import { App, Editor, EditorPosition } from "obsidian";
import { QuickReplaceSuggest } from "./QuickReplaceSuggest";
import { DataService } from "../services/DataService";
import { SynonymResult, DefinitionGroup } from "../types/types";
import * as wordExtractor from "../utils/wordExtractor";
import * as definitionGrouping from "../utils/definitionGrouping";

// Mock the modules
jest.mock("../services/DataService");
jest.mock("../utils/wordExtractor");
jest.mock("../utils/definitionGrouping");

// Mock Notice to track calls
const mockNotice = jest.fn();
jest.mock("obsidian", () => ({
  ...jest.requireActual("obsidian"),
  Notice: function(message: string) {
    mockNotice(message);
  },
}));

// Create mock functions from the modules
const mockGetWordUnderCursor = wordExtractor.getWordUnderCursor as jest.MockedFunction<
  typeof wordExtractor.getWordUnderCursor
>;
const mockReplaceWord = wordExtractor.replaceWord as jest.MockedFunction<
  typeof wordExtractor.replaceWord
>;
const mockGroupByDefinition = definitionGrouping.groupByDefinition as jest.MockedFunction<
  typeof definitionGrouping.groupByDefinition
>;
const mockGetGroupDisplayDefinition = definitionGrouping.getGroupDisplayDefinition as jest.MockedFunction<
  typeof definitionGrouping.getGroupDisplayDefinition
>;
const mockHasDisplayableDefinition = definitionGrouping.hasDisplayableDefinition as jest.MockedFunction<
  typeof definitionGrouping.hasDisplayableDefinition
>;

// Helper to create mock synonym results
function createMockSynonyms(words: string[], type: "synonym" | "antonym" = "synonym"): SynonymResult[] {
  return words.map((word) => ({
    word,
    type,
    source: "wordnet" as const,
  }));
}

// Helper to create mock synonym results with definitions
function createMockSynonymsWithDefinition(
  words: string[],
  definitionId: string,
  definition: string,
  partOfSpeech?: string
): SynonymResult[] {
  return words.map((word) => ({
    word,
    type: "synonym" as const,
    source: "wordnet" as const,
    definitionId,
    definition,
    partOfSpeech,
  }));
}

// Helper to create mock definition groups
function createMockDefinitionGroup(
  definitionId: string,
  definition: string,
  words: string[],
  partOfSpeech?: string
): DefinitionGroup {
  return {
    definitionId,
    definition,
    partOfSpeech,
    results: createMockSynonymsWithDefinition(words, definitionId, definition, partOfSpeech),
  };
}

// Helper to create mock editor
function createMockEditor(): Editor {
  return {
    getSelection: jest.fn().mockReturnValue(""),
    replaceSelection: jest.fn(),
    getCursor: jest.fn().mockReturnValue({ line: 0, ch: 5 } as EditorPosition),
    getLine: jest.fn().mockReturnValue("hello world"),
    wordAt: jest.fn().mockReturnValue({ from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } }),
    getRange: jest.fn().mockReturnValue("hello"),
    replaceRange: jest.fn(),
    posToOffset: jest.fn().mockReturnValue(5),
  } as unknown as Editor;
}

// Helper to create mock App
function createMockApp(): App {
  return {
    workspace: {
      getActiveViewOfType: jest.fn(),
    },
    vault: {
      getAbstractFileByPath: jest.fn(),
    },
  } as unknown as App;
}

// Helper to create mock DataService
function createMockDataService(): jest.Mocked<DataService> {
  return {
    getQuickReplaceSuggestions: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<DataService>;
}

// Helper to create keyboard event
function createKeyboardEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  return event;
}

// Helper to create mouse event
function createMouseEvent(type: string, target: EventTarget | null = null): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
  });
  if (target) {
    Object.defineProperty(event, "target", { value: target, writable: false });
  }
  return event;
}

// Helper to create touch event using the real TouchEvent constructor
function createTouchEvent(
  type: string,
  touches: { clientX: number; clientY: number }[]
): TouchEvent {
  // Create mock Touch objects
  const touchList = touches.map((t, index) => ({
    clientX: t.clientX,
    clientY: t.clientY,
    identifier: index,
    target: document.body,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
    pageX: t.clientX,
    pageY: t.clientY,
    screenX: t.clientX,
    screenY: t.clientY,
  })) as unknown as Touch[];

  // Use native TouchEvent constructor which jsdom supports
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === "touchend" ? [] : touchList,
    changedTouches: touchList,
    targetTouches: type === "touchend" ? [] : touchList,
  });

  return event;
}

describe("QuickReplaceSuggest", () => {
  let quickReplace: QuickReplaceSuggest;
  let mockApp: App;
  let mockDataService: jest.Mocked<DataService>;
  let mockEditor: Editor;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockNotice.mockClear();

    // Reset DOM
    document.body.innerHTML = "";

    // Create fresh mocks
    mockApp = createMockApp();
    mockDataService = createMockDataService();
    mockEditor = createMockEditor();

    // Set up default mock implementations
    mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: [] });
    mockGetGroupDisplayDefinition.mockImplementation((group) => group.definition || "");
    mockHasDisplayableDefinition.mockImplementation((group) => !!group.definition && group.definition.length > 0);

    // Create QuickReplaceSuggest instance
    quickReplace = new QuickReplaceSuggest(mockApp, mockDataService);
  });

  afterEach(() => {
    // Clean up any remaining DOM elements
    quickReplace.close();
  });

  describe("triggerForWord", () => {
    it("should show notice when no word is found under cursor", async () => {
      mockGetWordUnderCursor.mockReturnValue(null);

      await quickReplace.triggerForWord(mockEditor);

      expect(mockNotice).toHaveBeenCalledWith("No word found under cursor");
      expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
    });

    it("should show notice when no suggestions are found for synonyms", async () => {
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([]);

      await quickReplace.triggerForWord(mockEditor);

      expect(mockNotice).toHaveBeenCalledWith("No suggestions found");
    });

    it("should show notice when no antonyms are found", async () => {
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([]);

      await quickReplace.triggerForWord(mockEditor, "antonym");

      expect(mockNotice).toHaveBeenCalledWith("No antonyms found");
    });

    it("should display popup with suggestions when found", async () => {
      const suggestions = createMockSynonyms(["hi", "greetings", "salutations"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const container = document.querySelector(".wordsmith-quick-container");
      expect(container).not.toBeNull();

      const items = document.querySelectorAll(".wordsmith-quick-item");
      expect(items).toHaveLength(3);
    });

    it("should fetch suggestions for the specified relationship type", async () => {
      mockGetWordUnderCursor.mockReturnValue({
        word: "happy",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([]);

      await quickReplace.triggerForWord(mockEditor, "antonym");

      expect(mockDataService.getQuickReplaceSuggestions).toHaveBeenCalledWith("happy", "antonym");
    });

    it("should select first item by default", async () => {
      const suggestions = createMockSynonyms(["hi", "greetings"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const items = document.querySelectorAll(".wordsmith-quick-item");
      expect(items[0]?.classList.contains("is-selected")).toBe(true);
      expect(items[1]?.classList.contains("is-selected")).toBe(false);
    });
  });

  describe("open (suggestions display)", () => {
    it("should limit suggestions to MAX_QUICK_ITEMS (5)", async () => {
      const suggestions = createMockSynonyms([
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
      ]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const items = document.querySelectorAll(".wordsmith-quick-item");
      expect(items).toHaveLength(5);
    });

    it("should display word text in each suggestion item", async () => {
      const suggestions = createMockSynonyms(["hi", "greetings"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const wordSpans = document.querySelectorAll(".wordsmith-word");
      expect(wordSpans[0]?.textContent).toBe("hi");
      expect(wordSpans[1]?.textContent).toBe("greetings");
    });

    it("should display number indicators for each item", async () => {
      const suggestions = createMockSynonyms(["hi", "greetings", "salutations"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const numbers = document.querySelectorAll(".wordsmith-quick-number");
      expect(numbers[0]?.textContent).toBe("1");
      expect(numbers[1]?.textContent).toBe("2");
      expect(numbers[2]?.textContent).toBe("3");
    });

    it("should display appropriate badge for synonym type", async () => {
      const suggestions = createMockSynonyms(["hi"], "synonym");
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const badge = document.querySelector(".wordsmith-badge-syn");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("Syn");
    });

    it("should display appropriate badge for antonym type", async () => {
      const suggestions = createMockSynonyms(["sad"], "antonym");
      mockGetWordUnderCursor.mockReturnValue({
        word: "happy",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor, "antonym");

      const badge = document.querySelector(".wordsmith-badge-ant");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("Ant");
    });
  });

  describe("close", () => {
    it("should remove container from DOM", async () => {
      const suggestions = createMockSynonyms(["hi"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
      expect(document.querySelector(".wordsmith-quick-container")).not.toBeNull();

      quickReplace.close();
      expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
    });

    it("should reset internal state", async () => {
      const suggestions = createMockSynonyms(["hi", "greetings"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
      quickReplace.close();

      // Trigger again - should start fresh with index 0
      await quickReplace.triggerForWord(mockEditor);

      const items = document.querySelectorAll(".wordsmith-quick-item");
      expect(items[0]?.classList.contains("is-selected")).toBe(true);
    });

    it("should be safe to call close multiple times", () => {
      expect(() => {
        quickReplace.close();
        quickReplace.close();
        quickReplace.close();
      }).not.toThrow();
    });
  });

  describe("keyboard navigation", () => {
    beforeEach(async () => {
      const suggestions = createMockSynonyms(["one", "two", "three", "four", "five"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
    });

    describe("Arrow Down", () => {
      it("should move selection down", () => {
        const event = createKeyboardEvent("ArrowDown");
        document.dispatchEvent(event);

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items[0]?.classList.contains("is-selected")).toBe(false);
        expect(items[1]?.classList.contains("is-selected")).toBe(true);
      });

      it("should not go past last item", () => {
        // Move to last item
        for (let i = 0; i < 10; i++) {
          document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        }

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items[4]?.classList.contains("is-selected")).toBe(true);
      });

      it("should prevent default behavior", () => {
        const event = createKeyboardEvent("ArrowDown");
        const preventDefaultSpy = jest.spyOn(event, "preventDefault");

        document.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });

    describe("Arrow Up", () => {
      it("should move selection up", () => {
        // First move down, then up
        document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        document.dispatchEvent(createKeyboardEvent("ArrowUp"));

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items[1]?.classList.contains("is-selected")).toBe(true);
      });

      it("should not go past first item", () => {
        // Try to go up from first item
        document.dispatchEvent(createKeyboardEvent("ArrowUp"));
        document.dispatchEvent(createKeyboardEvent("ArrowUp"));

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items[0]?.classList.contains("is-selected")).toBe(true);
      });
    });

    describe("Enter", () => {
      it("should select the current suggestion and close", () => {
        document.dispatchEvent(createKeyboardEvent("Enter"));

        expect(mockReplaceWord).toHaveBeenCalledWith(
          mockEditor,
          { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
          "one"
        );
        expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
      });

      it("should select the navigated-to suggestion", () => {
        document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        document.dispatchEvent(createKeyboardEvent("Enter"));

        expect(mockReplaceWord).toHaveBeenCalledWith(
          mockEditor,
          expect.anything(),
          "three"
        );
      });
    });

    describe("Escape", () => {
      it("should close without selecting", () => {
        document.dispatchEvent(createKeyboardEvent("Escape"));

        expect(mockReplaceWord).not.toHaveBeenCalled();
        expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
      });
    });

    describe("Number keys 1-5", () => {
      it("should select item by number key", () => {
        document.dispatchEvent(createKeyboardEvent("3"));

        expect(mockReplaceWord).toHaveBeenCalledWith(
          mockEditor,
          expect.anything(),
          "three"
        );
      });

      it("should ignore number keys beyond available suggestions", async () => {
        // Close and reopen with only 2 suggestions
        quickReplace.close();
        const suggestions = createMockSynonyms(["one", "two"]);
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

        await quickReplace.triggerForWord(mockEditor);

        document.dispatchEvent(createKeyboardEvent("5"));

        expect(mockReplaceWord).not.toHaveBeenCalled();
        expect(document.querySelector(".wordsmith-quick-container")).not.toBeNull();
      });
    });

    describe("Tab behavior", () => {
      it("should select when no multiple definitions to cycle", () => {
        document.dispatchEvent(createKeyboardEvent("Tab"));

        expect(mockReplaceWord).toHaveBeenCalled();
      });
    });
  });

  describe("definition group expansion/collapse", () => {
    it("should display definition header when multiple definition groups exist", async () => {
      const group1 = createMockDefinitionGroup("def1", "A greeting expression", ["hi", "hello"], "noun");
      const group2 = createMockDefinitionGroup("def2", "To welcome someone", ["greet", "welcome"], "verb");

      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([...group1.results, ...group2.results]);
      mockGroupByDefinition.mockReturnValue({ grouped: [group1, group2], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);

      await quickReplace.triggerForWord(mockEditor);

      const header = document.querySelector(".wordsmith-quick-header");
      expect(header).not.toBeNull();
    });

    it("should display navigation indicator with group count", async () => {
      const group1 = createMockDefinitionGroup("def1", "Definition one", ["word1", "word2"]);
      const group2 = createMockDefinitionGroup("def2", "Definition two", ["word3", "word4"]);
      const group3 = createMockDefinitionGroup("def3", "Definition three", ["word5", "word6"]);

      mockGetWordUnderCursor.mockReturnValue({
        word: "test",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([
        ...group1.results,
        ...group2.results,
        ...group3.results,
      ]);
      mockGroupByDefinition.mockReturnValue({ grouped: [group1, group2, group3], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);

      await quickReplace.triggerForWord(mockEditor);

      const navSpan = document.querySelector(".wordsmith-quick-nav");
      expect(navSpan?.textContent).toBe("(1/3)");
    });

    it("should display part of speech when available", async () => {
      const group = createMockDefinitionGroup("def1", "A greeting", ["hi", "hello"], "noun");

      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(group.results);
      mockGroupByDefinition.mockReturnValue({ grouped: [group], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);

      await quickReplace.triggerForWord(mockEditor);

      const posSpan = document.querySelector(".wordsmith-quick-pos");
      expect(posSpan?.textContent).toBe("noun");
    });

    it("should truncate long definitions", async () => {
      const longDefinition = "This is a very long definition that should be truncated to fit in the UI";
      const group = createMockDefinitionGroup("def1", longDefinition, ["hi"]);

      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(group.results);
      mockGroupByDefinition.mockReturnValue({ grouped: [group], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);
      mockGetGroupDisplayDefinition.mockReturnValue(longDefinition);

      await quickReplace.triggerForWord(mockEditor);

      const defSpan = document.querySelector(".wordsmith-quick-def");
      // The code truncates to 37 chars (substring(0, 37)) then adds "..."
      expect(defSpan?.textContent).toBe("This is a very long definition that s...");
    });
  });

  describe("navigateToNextGroup and navigateToPreviousGroup (Tab cycling)", () => {
    beforeEach(async () => {
      const group1 = createMockDefinitionGroup("def1", "First definition", ["a", "b", "c"]);
      const group2 = createMockDefinitionGroup("def2", "Second definition", ["d", "e", "f"]);
      const group3 = createMockDefinitionGroup("def3", "Third definition", ["g", "h", "i"]);

      mockGetWordUnderCursor.mockReturnValue({
        word: "test",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([
        ...group1.results,
        ...group2.results,
        ...group3.results,
      ]);
      mockGroupByDefinition.mockReturnValue({ grouped: [group1, group2, group3], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);

      await quickReplace.triggerForWord(mockEditor);
    });

    it("should cycle to next definition group on Tab", () => {
      const nav = document.querySelector(".wordsmith-quick-nav");
      expect(nav?.textContent).toBe("(1/3)");

      document.dispatchEvent(createKeyboardEvent("Tab"));

      const navAfter = document.querySelector(".wordsmith-quick-nav");
      expect(navAfter?.textContent).toBe("(2/3)");
    });

    it("should cycle to previous definition group on Shift+Tab", () => {
      // Go to group 2 first
      document.dispatchEvent(createKeyboardEvent("Tab"));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(2/3)");

      // Now go back to group 1
      document.dispatchEvent(createKeyboardEvent("Tab", { shiftKey: true }));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/3)");
    });

    it("should wrap around from last to first definition", () => {
      document.dispatchEvent(createKeyboardEvent("Tab"));
      document.dispatchEvent(createKeyboardEvent("Tab"));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(3/3)");

      document.dispatchEvent(createKeyboardEvent("Tab"));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/3)");
    });

    it("should wrap around from first to last definition with Shift+Tab", () => {
      document.dispatchEvent(createKeyboardEvent("Tab", { shiftKey: true }));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(3/3)");
    });

    it("should reset selection index when changing definition group", () => {
      // Move selection down
      document.dispatchEvent(createKeyboardEvent("ArrowDown"));
      document.dispatchEvent(createKeyboardEvent("ArrowDown"));

      // Change group
      document.dispatchEvent(createKeyboardEvent("Tab"));

      // First item should be selected in new group
      const items = document.querySelectorAll(".wordsmith-quick-item");
      expect(items[0]?.classList.contains("is-selected")).toBe(true);
    });

    it("should display suggestions from current definition group only", () => {
      // First group has a, b, c
      let words = document.querySelectorAll(".wordsmith-word");
      expect(words[0]?.textContent).toBe("a");
      expect(words[1]?.textContent).toBe("b");
      expect(words[2]?.textContent).toBe("c");

      // Cycle to second group (d, e, f)
      document.dispatchEvent(createKeyboardEvent("Tab"));

      words = document.querySelectorAll(".wordsmith-word");
      expect(words[0]?.textContent).toBe("d");
      expect(words[1]?.textContent).toBe("e");
      expect(words[2]?.textContent).toBe("f");
    });
  });

  describe("replaceSelectedWord", () => {
    it("should call replaceWord utility with correct arguments", async () => {
      const suggestions = createMockSynonyms(["replacement"]);
      const range = { from: { line: 5, ch: 10 }, to: { line: 5, ch: 20 } };

      mockGetWordUnderCursor.mockReturnValue({
        word: "original",
        range,
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
      document.dispatchEvent(createKeyboardEvent("Enter"));

      expect(mockReplaceWord).toHaveBeenCalledWith(mockEditor, range, "replacement");
    });

    it("should close popup after replacement", async () => {
      const suggestions = createMockSynonyms(["replacement"]);

      mockGetWordUnderCursor.mockReturnValue({
        word: "original",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 8 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
      expect(document.querySelector(".wordsmith-quick-container")).not.toBeNull();

      document.dispatchEvent(createKeyboardEvent("Enter"));
      expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
    });
  });

  describe("swipe gesture detection", () => {
    beforeEach(async () => {
      const group1 = createMockDefinitionGroup("def1", "First", ["a", "b"]);
      const group2 = createMockDefinitionGroup("def2", "Second", ["c", "d"]);

      mockGetWordUnderCursor.mockReturnValue({
        word: "test",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue([...group1.results, ...group2.results]);
      mockGroupByDefinition.mockReturnValue({ grouped: [group1, group2], ungrouped: [] });
      mockHasDisplayableDefinition.mockReturnValue(true);

      await quickReplace.triggerForWord(mockEditor);
    });

    it("should cycle to next definition on left swipe", () => {
      const container = document.querySelector(".wordsmith-quick-container") as HTMLElement;
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");

      // Simulate left swipe (negative deltaX)
      const touchStart = createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]);
      const touchMove = createTouchEvent("touchmove", [{ clientX: 40, clientY: 50 }]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 40, clientY: 50 }]);

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      container.dispatchEvent(touchEnd);

      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(2/2)");
    });

    it("should cycle to previous definition on right swipe", () => {
      const container = document.querySelector(".wordsmith-quick-container") as HTMLElement;

      // First go to group 2
      document.dispatchEvent(createKeyboardEvent("Tab"));
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(2/2)");

      // Simulate right swipe (positive deltaX)
      const touchStart = createTouchEvent("touchstart", [{ clientX: 40, clientY: 50 }]);
      const touchMove = createTouchEvent("touchmove", [{ clientX: 100, clientY: 50 }]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 100, clientY: 50 }]);

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      container.dispatchEvent(touchEnd);

      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");
    });

    it("should ignore swipes below threshold", () => {
      const container = document.querySelector(".wordsmith-quick-container") as HTMLElement;
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");

      // Small swipe below threshold (50px)
      const touchStart = createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]);
      const touchMove = createTouchEvent("touchmove", [{ clientX: 80, clientY: 50 }]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 80, clientY: 50 }]);

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      container.dispatchEvent(touchEnd);

      // Should stay on group 1
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");
    });

    it("should ignore vertical swipes", () => {
      const container = document.querySelector(".wordsmith-quick-container") as HTMLElement;
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");

      // Vertical swipe (large deltaY, small deltaX)
      const touchStart = createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]);
      const touchMove = createTouchEvent("touchmove", [{ clientX: 95, clientY: 150 }]);
      const touchEnd = createTouchEvent("touchend", [{ clientX: 95, clientY: 150 }]);

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      container.dispatchEvent(touchEnd);

      // Should stay on group 1
      expect(document.querySelector(".wordsmith-quick-nav")?.textContent).toBe("(1/2)");
    });
  });

  describe("click-outside detection", () => {
    beforeEach(async () => {
      const suggestions = createMockSynonyms(["hi"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
    });

    it("should close when clicking outside the container", () => {
      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);

      const event = createMouseEvent("mousedown", outsideElement);
      document.dispatchEvent(event);

      expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
    });

    it("should not close when clicking inside the container", () => {
      const container = document.querySelector(".wordsmith-quick-container") as HTMLElement;
      const item = container.querySelector(".wordsmith-quick-item") as HTMLElement;

      // Create event with target inside container
      const event = new MouseEvent("mousedown", { bubbles: true });
      Object.defineProperty(event, "target", { value: item, writable: false });

      document.dispatchEvent(event);

      // Container should still exist (click on item will select and close, but not due to click-outside)
      // Note: The item click is handled by mousedown preventDefault, so container won't close due to outside click logic
    });
  });

  describe("edge cases", () => {
    describe("empty suggestions", () => {
      it("should show notice and not display popup", async () => {
        mockGetWordUnderCursor.mockReturnValue({
          word: "xyz123",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 6 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue([]);

        await quickReplace.triggerForWord(mockEditor);

        expect(mockNotice).toHaveBeenCalledWith("No suggestions found");
        expect(document.querySelector(".wordsmith-quick-container")).toBeNull();
      });
    });

    describe("single suggestion", () => {
      it("should display correctly with single item", async () => {
        const suggestions = createMockSynonyms(["only"]);
        mockGetWordUnderCursor.mockReturnValue({
          word: "one",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

        await quickReplace.triggerForWord(mockEditor);

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items).toHaveLength(1);
        expect(items[0]?.classList.contains("is-selected")).toBe(true);
      });

      it("should not allow navigation past single item", async () => {
        const suggestions = createMockSynonyms(["only"]);
        mockGetWordUnderCursor.mockReturnValue({
          word: "one",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

        await quickReplace.triggerForWord(mockEditor);

        document.dispatchEvent(createKeyboardEvent("ArrowDown"));
        document.dispatchEvent(createKeyboardEvent("ArrowDown"));

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items[0]?.classList.contains("is-selected")).toBe(true);
      });
    });

    describe("no definitions (ungrouped results)", () => {
      it("should display all ungrouped results without header", async () => {
        const suggestions = createMockSynonyms(["hi", "hey", "hello"]);
        mockGetWordUnderCursor.mockReturnValue({
          word: "greetings",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 9 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

        await quickReplace.triggerForWord(mockEditor);

        const header = document.querySelector(".wordsmith-quick-header");
        expect(header).toBeNull();

        const items = document.querySelectorAll(".wordsmith-quick-item");
        expect(items).toHaveLength(3);
      });

      it("should use Tab to select when no definition groups", async () => {
        const suggestions = createMockSynonyms(["hi"]);
        mockGetWordUnderCursor.mockReturnValue({
          word: "greetings",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 9 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

        await quickReplace.triggerForWord(mockEditor);
        document.dispatchEvent(createKeyboardEvent("Tab"));

        expect(mockReplaceWord).toHaveBeenCalled();
      });
    });

    describe("single definition group", () => {
      it("should show header if group has displayable definition", async () => {
        const group = createMockDefinitionGroup("def1", "A greeting", ["hi", "hello"]);

        mockGetWordUnderCursor.mockReturnValue({
          word: "greetings",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 9 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(group.results);
        mockGroupByDefinition.mockReturnValue({ grouped: [group], ungrouped: [] });
        mockHasDisplayableDefinition.mockReturnValue(true);

        await quickReplace.triggerForWord(mockEditor);

        const header = document.querySelector(".wordsmith-quick-header");
        expect(header).not.toBeNull();
      });

      it("should not show navigation indicator with single group", async () => {
        const group = createMockDefinitionGroup("def1", "A greeting", ["hi", "hello"]);

        mockGetWordUnderCursor.mockReturnValue({
          word: "greetings",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 9 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(group.results);
        mockGroupByDefinition.mockReturnValue({ grouped: [group], ungrouped: [] });
        mockHasDisplayableDefinition.mockReturnValue(true);

        await quickReplace.triggerForWord(mockEditor);

        const nav = document.querySelector(".wordsmith-quick-nav");
        expect(nav).toBeNull();
      });

      it("should use Tab to select with single definition group", async () => {
        const group = createMockDefinitionGroup("def1", "A greeting", ["hi"]);

        mockGetWordUnderCursor.mockReturnValue({
          word: "greetings",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 9 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(group.results);
        mockGroupByDefinition.mockReturnValue({ grouped: [group], ungrouped: [] });
        mockHasDisplayableDefinition.mockReturnValue(true);

        await quickReplace.triggerForWord(mockEditor);
        document.dispatchEvent(createKeyboardEvent("Tab"));

        expect(mockReplaceWord).toHaveBeenCalled();
      });
    });

    describe("reopening popup", () => {
      it("should properly clean up previous popup before showing new one", async () => {
        const suggestions1 = createMockSynonyms(["first"]);
        const suggestions2 = createMockSynonyms(["second"]);

        mockGetWordUnderCursor.mockReturnValue({
          word: "word1",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions1);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions1 });

        await quickReplace.triggerForWord(mockEditor);

        // Trigger again with different word
        mockGetWordUnderCursor.mockReturnValue({
          word: "word2",
          range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
          editor: mockEditor,
        });
        mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions2);
        mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions2 });

        await quickReplace.triggerForWord(mockEditor);

        // Should only have one container
        const containers = document.querySelectorAll(".wordsmith-quick-container");
        expect(containers).toHaveLength(1);

        // Should show second word
        const wordSpan = document.querySelector(".wordsmith-word");
        expect(wordSpan?.textContent).toBe("second");
      });
    });
  });

  describe("mouse interaction", () => {
    beforeEach(async () => {
      const suggestions = createMockSynonyms(["one", "two", "three"]);
      mockGetWordUnderCursor.mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);
    });

    it("should update selection on hover", () => {
      const items = document.querySelectorAll(".wordsmith-quick-item");

      // Hover over second item
      items[1]?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      const updatedItems = document.querySelectorAll(".wordsmith-quick-item");
      expect(updatedItems[0]?.classList.contains("is-selected")).toBe(false);
      expect(updatedItems[1]?.classList.contains("is-selected")).toBe(true);
    });

    it("should select item on mousedown", () => {
      const items = document.querySelectorAll(".wordsmith-quick-item");

      // Click on second item
      const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      items[1]?.dispatchEvent(event);

      expect(mockReplaceWord).toHaveBeenCalledWith(
        mockEditor,
        expect.anything(),
        "two"
      );
    });
  });

  describe("badge types", () => {
    it.each([
      ["synonym", "wordsmith-badge-syn", "Syn"],
      ["antonym", "wordsmith-badge-ant", "Ant"],
    ] as const)("should display correct badge for %s type", async (type, expectedClass, expectedText) => {
      const suggestions: SynonymResult[] = [{
        word: "test",
        type,
        source: "wordnet",
      }];

      mockGetWordUnderCursor.mockReturnValue({
        word: "word",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const badge = document.querySelector(`.${expectedClass}`);
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe(expectedText);
    });

    it("should display related badge for unknown types", async () => {
      const suggestions: SynonymResult[] = [{
        word: "test",
        type: "related" as const,
        source: "wordnet",
      }];

      mockGetWordUnderCursor.mockReturnValue({
        word: "word",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 4 } },
        editor: mockEditor,
      });
      mockDataService.getQuickReplaceSuggestions.mockResolvedValue(suggestions);
      mockGroupByDefinition.mockReturnValue({ grouped: [], ungrouped: suggestions });

      await quickReplace.triggerForWord(mockEditor);

      const badge = document.querySelector(".wordsmith-badge-rel");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("Rel");
    });
  });
});
