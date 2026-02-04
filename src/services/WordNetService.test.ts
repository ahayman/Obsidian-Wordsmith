import { WordNetService } from "./WordNetService";
import { App, requestUrl } from "obsidian";

// Mock requestUrl from obsidian
jest.mock("obsidian", () => ({
  ...jest.requireActual("obsidian"),
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Sample JSONL data for testing
const SAMPLE_JSONL = `{"word":"happy","wordnet_id":"wn01","key":"happy.a.01","pos":"adj","synonyms":["joyful","cheerful","content"],"desc":["feeling pleasure and enjoyment"]}
{"word":"happy","wordnet_id":"wn02","key":"happy.a.02","pos":"adj","synonyms":["fortunate","lucky"],"desc":["having good luck"]}
{"word":"sad","wordnet_id":"wn03","key":"sad.a.01","pos":"adj","synonyms":["unhappy","sorrowful","melancholy"],"desc":["feeling sorrow"]}
{"word":"run","wordnet_id":"wn04","key":"run.v.01","pos":"verb","synonyms":["sprint","jog","dash"],"desc":["move at a speed faster than walking"]}`;

const MALFORMED_JSONL = `{"word":"valid","wordnet_id":"wn01","key":"valid.a.01","pos":"adj","synonyms":["correct"],"desc":["accurate"]}
{invalid json here
{"word":"another","wordnet_id":"wn02","key":"another.a.01","pos":"adj","synonyms":["different"],"desc":[]}`;

function createMockApp(): App {
  return {
    vault: {
      adapter: {
        exists: jest.fn(),
        read: jest.fn(),
        write: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
      },
    },
  } as unknown as App;
}

describe("WordNetService", () => {
  let service: WordNetService;
  let mockApp: App;
  const pluginDir = ".obsidian/plugins/wordsmith";

  beforeEach(() => {
    mockApp = createMockApp();
    service = new WordNetService(mockApp, pluginDir);
    jest.clearAllMocks();
  });

  describe("cachePath", () => {
    it("should return correct cache path", () => {
      expect(service.cachePath).toBe(`${pluginDir}/cache/thesaurus.jsonl`);
    });
  });

  describe("isDownloaded", () => {
    it("should return true when data file exists", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      expect(await service.isDownloaded()).toBe(true);
      expect(adapter.exists).toHaveBeenCalledWith(service.cachePath);
    });

    it("should return false when data file does not exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      expect(await service.isDownloaded()).toBe(false);
    });

    it("should return false when check throws error", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockRejectedValue(new Error("Access denied"));

      expect(await service.isDownloaded()).toBe(false);
    });
  });

  describe("isLoaded", () => {
    it("should return false before loading", () => {
      expect(service.isLoaded()).toBe(false);
    });

    it("should return true after successful load", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);

      await service.load();
      expect(service.isLoaded()).toBe(true);
    });
  });

  describe("load", () => {
    it("should load and parse JSONL data correctly", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);

      await service.load();

      expect(service.isLoaded()).toBe(true);
      expect(adapter.read).toHaveBeenCalledWith(service.cachePath);
    });

    it("should not reload if already loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);

      await service.load();
      await service.load();

      expect(adapter.read).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent load calls", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);

      // Multiple concurrent calls
      await Promise.all([service.load(), service.load(), service.load()]);

      expect(adapter.read).toHaveBeenCalledTimes(1);
    });

    it("should not load if data file does not exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      await service.load();

      expect(service.isLoaded()).toBe(false);
      expect(adapter.read).not.toHaveBeenCalled();
    });

    it("should handle read errors gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockRejectedValue(new Error("Read failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.load();

      expect(service.isLoaded()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle malformed JSONL lines gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(MALFORMED_JSONL);

      await service.load();

      expect(service.isLoaded()).toBe(true);
      // Should still be able to lookup valid entries
      const results = service.lookup("valid");
      expect(results.length).toBe(1);
      expect(results[0].word).toBe("correct");
    });

    it("should handle empty file", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue("");

      await service.load();

      expect(service.isLoaded()).toBe(true);
      expect(service.lookup("anything")).toEqual([]);
    });

    it("should handle file with only whitespace", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue("  \n\n  \n  ");

      await service.load();

      expect(service.isLoaded()).toBe(true);
      expect(service.lookup("anything")).toEqual([]);
    });
  });

  describe("lookup", () => {
    beforeEach(async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);
      await service.load();
    });

    it("should return empty array if not loaded", () => {
      const unloadedService = new WordNetService(mockApp, pluginDir);
      expect(unloadedService.lookup("happy")).toEqual([]);
    });

    it("should return synonyms for existing word", () => {
      const results = service.lookup("happy");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.word === "joyful")).toBe(true);
      expect(results.some((r) => r.word === "cheerful")).toBe(true);
    });

    it("should return synonyms from all entries for a word", () => {
      const results = service.lookup("happy");

      // Should include synonyms from both "happy" entries
      expect(results.some((r) => r.word === "joyful")).toBe(true);
      expect(results.some((r) => r.word === "fortunate")).toBe(true);
    });

    it("should normalize input to lowercase", () => {
      const results1 = service.lookup("HAPPY");
      const results2 = service.lookup("Happy");
      const results3 = service.lookup("happy");

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it("should return empty array for unknown word", () => {
      const results = service.lookup("xyznonexistent");
      expect(results).toEqual([]);
    });

    it("should not include the original word in synonyms", () => {
      const results = service.lookup("happy");
      const hasOriginal = results.some((r) => r.word.toLowerCase() === "happy");
      expect(hasOriginal).toBe(false);
    });

    it("should deduplicate synonyms across entries", () => {
      // Add data with duplicate synonyms
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.read as jest.Mock).mockResolvedValue(
        `{"word":"test","wordnet_id":"wn01","key":"test.n.01","pos":"noun","synonyms":["exam","quiz"],"desc":["a test"]}
{"word":"test","wordnet_id":"wn02","key":"test.n.02","pos":"noun","synonyms":["exam","trial"],"desc":["an examination"]}`
      );

      const newService = new WordNetService(mockApp, pluginDir);
      newService.load().then(() => {
        const results = newService.lookup("test");
        const examCount = results.filter((r) => r.word.toLowerCase() === "exam").length;
        expect(examCount).toBe(1);
      });
    });

    it("should include part of speech", () => {
      const results = service.lookup("happy");
      expect(results.some((r) => r.partOfSpeech === "adj")).toBe(true);
    });

    it("should include definition", () => {
      const results = service.lookup("happy");
      expect(results.some((r) => r.definition)).toBe(true);
    });

    it("should include definitionId (wordnet_id)", () => {
      const results = service.lookup("happy");
      expect(results.some((r) => r.definitionId)).toBe(true);
    });

    it("should set source to wordnet", () => {
      const results = service.lookup("happy");
      expect(results.every((r) => r.source === "wordnet")).toBe(true);
    });

    it("should set type to synonym", () => {
      const results = service.lookup("happy");
      expect(results.every((r) => r.type === "synonym")).toBe(true);
    });

    it("should handle empty word", () => {
      const results = service.lookup("");
      expect(results).toEqual([]);
    });

    it("should handle word with only whitespace", () => {
      const results = service.lookup("   ");
      expect(results).toEqual([]);
    });

    it("should handle unicode characters", () => {
      // Service normalizes to lowercase, should not crash
      const results = service.lookup("caf\u00e9");
      expect(results).toEqual([]);
    });

    it("should handle special characters", () => {
      const results = service.lookup("hello-world");
      expect(results).toEqual([]);
    });
  });

  describe("download", () => {
    it("should create cache directory if it doesn't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);
      (adapter.mkdir as jest.Mock).mockResolvedValue(undefined);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_JSONL } as any);

      await service.download();

      expect(adapter.mkdir).toHaveBeenCalledWith(`${pluginDir}/cache`);
    });

    it("should download and save data file", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_JSONL } as any);

      const result = await service.download();

      expect(result).toBe(true);
      expect(adapter.write).toHaveBeenCalledWith(service.cachePath, SAMPLE_JSONL);
    });

    it("should parse data immediately after download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_JSONL } as any);

      await service.download();

      expect(service.isLoaded()).toBe(true);
      expect(service.lookup("happy").length).toBeGreaterThan(0);
    });

    it("should call progress callback during download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_JSONL } as any);

      const progressCallback = jest.fn();
      await service.download(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({ loaded: 0, total: 100, percent: 0 });
      expect(progressCallback).toHaveBeenCalledWith({ loaded: 50, total: 100, percent: 50 });
      expect(progressCallback).toHaveBeenCalledWith({ loaded: 100, total: 100, percent: 100 });
    });

    it("should return false on download error", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      mockRequestUrl.mockRejectedValue(new Error("Network error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await service.download();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should return false on write error", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockRejectedValue(new Error("Write failed"));
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_JSONL } as any);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await service.download();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("delete", () => {
    it("should remove data file if it exists", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);

      await service.delete();

      expect(adapter.remove).toHaveBeenCalledWith(service.cachePath);
    });

    it("should not try to remove file if it doesn't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      await service.delete();

      expect(adapter.remove).not.toHaveBeenCalled();
    });

    it("should clear loaded data", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_JSONL);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);

      await service.load();
      expect(service.isLoaded()).toBe(true);

      await service.delete();
      expect(service.isLoaded()).toBe(false);
    });

    it("should handle delete errors gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.delete();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
