import { SpellingService } from "./SpellingService";
import { NSpellService } from "./NSpellService";
import { DatamuseService } from "./DatamuseService";
import { WordsmithSettings, DEFAULT_SETTINGS, SynonymResult } from "../types";

// Create mock classes
jest.mock("./NSpellService");
jest.mock("./DatamuseService");

const MockNSpellService = NSpellService as jest.MockedClass<typeof NSpellService>;
const MockDatamuseService = DatamuseService as jest.MockedClass<typeof DatamuseService>;

function createMockNSpellService() {
  const mock = new MockNSpellService(null as any, "");
  mock.isLoaded = jest.fn();
  mock.isCorrect = jest.fn();
  mock.suggest = jest.fn();
  return mock;
}

function createMockDatamuseService() {
  const mock = new MockDatamuseService();
  mock.getSpellingSuggestions = jest.fn();
  return mock;
}

function createSettings(overrides: Partial<WordsmithSettings> = {}): WordsmithSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("SpellingService", () => {
  let service: SpellingService;
  let mockNSpell: ReturnType<typeof createMockNSpellService>;
  let mockDatamuse: ReturnType<typeof createMockDatamuseService>;
  let settings: WordsmithSettings;

  beforeEach(() => {
    mockNSpell = createMockNSpellService();
    mockDatamuse = createMockDatamuseService();
    settings = createSettings();
    service = new SpellingService(mockNSpell, mockDatamuse, settings);
    jest.clearAllMocks();
  });

  describe("updateSettings", () => {
    it("should update internal settings", async () => {
      const newSettings = createSettings({ offlineSpellingOnly: true });

      // Setup: nspell loaded, word misspelled
      (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
      (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
      (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
      (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

      service.updateSettings(newSettings);

      await service.getSuggestions("tset");

      // With offlineSpellingOnly, datamuse should not be called
      expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();
    });
  });

  describe("getSuggestions", () => {
    describe("when nspell is not loaded", () => {
      it("should return empty array", async () => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(false);

        const results = await service.getSuggestions("helo");

        expect(results).toEqual([]);
        expect(mockNSpell.isCorrect).not.toHaveBeenCalled();
        expect(mockNSpell.suggest).not.toHaveBeenCalled();
        expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();
      });
    });

    describe("when word is correctly spelled", () => {
      it("should return empty array", async () => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(true);

        const results = await service.getSuggestions("hello");

        expect(results).toEqual([]);
        expect(mockNSpell.isCorrect).toHaveBeenCalledWith("hello");
        expect(mockNSpell.suggest).not.toHaveBeenCalled();
        expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();
      });
    });

    describe("when word is misspelled", () => {
      beforeEach(() => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
      });

      it("should return nspell suggestions", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "nspell" },
          { word: "halo", type: "spelling", source: "nspell" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("helo");

        expect(results).toContainEqual({ word: "hello", type: "spelling", source: "nspell" });
        expect(results).toContainEqual({ word: "halo", type: "spelling", source: "nspell" });
      });

      it("should also fetch datamuse suggestions by default", async () => {
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        const datamuseResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "datamuse" },
          { word: "help", type: "spelling", source: "datamuse" },
        ];
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue(datamuseResults);

        const results = await service.getSuggestions("helo");

        expect(mockDatamuse.getSpellingSuggestions).toHaveBeenCalledWith("helo");
        expect(results).toContainEqual({ word: "hello", type: "spelling", source: "datamuse" });
        expect(results).toContainEqual({ word: "help", type: "spelling", source: "datamuse" });
      });

      it("should combine nspell and datamuse results", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "nspell" },
        ];
        const datamuseResults: SynonymResult[] = [
          { word: "help", type: "spelling", source: "datamuse" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue(datamuseResults);

        const results = await service.getSuggestions("helo");

        expect(results).toHaveLength(2);
        expect(results).toContainEqual({ word: "hello", type: "spelling", source: "nspell" });
        expect(results).toContainEqual({ word: "help", type: "spelling", source: "datamuse" });
      });

      it("should not call datamuse when offlineSpellingOnly is true", async () => {
        const offlineSettings = createSettings({ offlineSpellingOnly: true });
        service = new SpellingService(mockNSpell, mockDatamuse, offlineSettings);

        (mockNSpell.suggest as jest.Mock).mockReturnValue([
          { word: "hello", type: "spelling", source: "nspell" },
        ]);

        const results = await service.getSuggestions("helo");

        expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();
        expect(results).toHaveLength(1);
      });

      it("should handle datamuse errors gracefully", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "nspell" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockRejectedValue(new Error("Network error"));

        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        const results = await service.getSuggestions("helo");

        // Should still return nspell results
        expect(results).toHaveLength(1);
        expect(results[0].word).toBe("hello");
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe("deduplication", () => {
      beforeEach(() => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
      });

      it("should remove duplicate words (case insensitive)", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "Hello", type: "spelling", source: "nspell" },
        ];
        const datamuseResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "datamuse" },
          { word: "HELLO", type: "spelling", source: "datamuse" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue(datamuseResults);

        const results = await service.getSuggestions("helo");

        // Should only have one "hello" variant
        const helloCount = results.filter((r) => r.word.toLowerCase() === "hello").length;
        expect(helloCount).toBe(1);
      });

      it("should filter out the original word", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "helo", type: "spelling", source: "nspell" }, // Same as input
          { word: "hello", type: "spelling", source: "nspell" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("helo");

        expect(results.some((r) => r.word.toLowerCase() === "helo")).toBe(false);
        expect(results.some((r) => r.word === "hello")).toBe(true);
      });

      it("should filter out original word case insensitively", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "HELO", type: "spelling", source: "nspell" },
          { word: "Helo", type: "spelling", source: "nspell" },
          { word: "hello", type: "spelling", source: "nspell" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("helo");

        expect(results.every((r) => r.word.toLowerCase() !== "helo")).toBe(true);
      });

      it("should preserve first occurrence when deduplicating", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "Hello", type: "spelling", source: "nspell" },
        ];
        const datamuseResults: SynonymResult[] = [
          { word: "hello", type: "spelling", source: "datamuse" },
        ];
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue(datamuseResults);

        const results = await service.getSuggestions("helo");

        // First occurrence is nspell's "Hello"
        const helloResult = results.find((r) => r.word.toLowerCase() === "hello");
        expect(helloResult?.source).toBe("nspell");
        expect(helloResult?.word).toBe("Hello");
      });
    });

    describe("edge cases", () => {
      beforeEach(() => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
      });

      it("should handle empty word", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(true);

        const results = await service.getSuggestions("");

        expect(results).toEqual([]);
      });

      it("should handle word with only whitespace", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(true);

        const results = await service.getSuggestions("   ");

        expect(results).toEqual([]);
      });

      it("should handle unicode characters", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([
          { word: "cafe", type: "spelling", source: "nspell" },
        ]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("caf\u00e9");

        expect(mockNSpell.isCorrect).toHaveBeenCalledWith("caf\u00e9");
        expect(results.length).toBe(1);
      });

      it("should handle special characters", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("hello-world");

        expect(mockNSpell.isCorrect).toHaveBeenCalledWith("hello-world");
        expect(results).toEqual([]);
      });

      it("should handle when both services return empty results", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        const results = await service.getSuggestions("xyzabc");

        expect(results).toEqual([]);
      });

      it("should handle when nspell returns results but datamuse fails", async () => {
        const nspellResults: SynonymResult[] = [
          { word: "test", type: "spelling", source: "nspell" },
        ];
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue(nspellResults);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockRejectedValue(new Error("API error"));

        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        const results = await service.getSuggestions("tset");

        expect(results).toHaveLength(1);
        expect(results[0].word).toBe("test");
        consoleSpy.mockRestore();
      });

      it("should handle null or undefined from nspell suggest", async () => {
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([
          { word: "test", type: "spelling", source: "datamuse" },
        ]);

        const results = await service.getSuggestions("tset");

        expect(results).toHaveLength(1);
      });
    });

    describe("settings interaction", () => {
      it("should respect offlineSpellingOnly when set initially", async () => {
        const offlineSettings = createSettings({ offlineSpellingOnly: true });
        const offlineService = new SpellingService(mockNSpell, mockDatamuse, offlineSettings);

        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);

        await offlineService.getSuggestions("test");

        expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();
      });

      it("should respect offlineSpellingOnly after updateSettings", async () => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        // First call with online mode
        await service.getSuggestions("test1");
        expect(mockDatamuse.getSpellingSuggestions).toHaveBeenCalledTimes(1);

        // Update to offline mode
        service.updateSettings(createSettings({ offlineSpellingOnly: true }));

        // Second call should not use datamuse
        await service.getSuggestions("test2");
        expect(mockDatamuse.getSpellingSuggestions).toHaveBeenCalledTimes(1); // Still 1, not 2
      });

      it("should switch back to online mode when setting is toggled", async () => {
        (mockNSpell.isLoaded as jest.Mock).mockReturnValue(true);
        (mockNSpell.isCorrect as jest.Mock).mockReturnValue(false);
        (mockNSpell.suggest as jest.Mock).mockReturnValue([]);
        (mockDatamuse.getSpellingSuggestions as jest.Mock).mockResolvedValue([]);

        // Start offline
        service.updateSettings(createSettings({ offlineSpellingOnly: true }));
        await service.getSuggestions("test1");
        expect(mockDatamuse.getSpellingSuggestions).not.toHaveBeenCalled();

        // Switch to online
        service.updateSettings(createSettings({ offlineSpellingOnly: false }));
        await service.getSuggestions("test2");
        expect(mockDatamuse.getSpellingSuggestions).toHaveBeenCalledWith("test2");
      });
    });
  });
});
