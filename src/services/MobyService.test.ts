import { MobyService } from "./MobyService";
import { App, requestUrl } from "obsidian";

// Mock requestUrl from obsidian
jest.mock("obsidian", () => ({
  ...jest.requireActual("obsidian"),
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Sample Moby data for testing (comma-separated format)
const SAMPLE_MOBY_DATA = `happy,joyful,cheerful,content,pleased,delighted
sad,unhappy,sorrowful,melancholy,dejected,miserable
run,sprint,jog,dash,race,gallop
walk,stroll,amble,saunter,trek,march`;

const MALFORMED_MOBY_DATA = `valid,correct,proper,right
single_word_no_synonyms
,missing_head_word
another,test,word`;

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

describe("MobyService", () => {
  let service: MobyService;
  let mockApp: App;
  const pluginDir = ".obsidian/plugins/wordsmith";

  beforeEach(() => {
    mockApp = createMockApp();
    service = new MobyService(mockApp, pluginDir);
    jest.clearAllMocks();
  });

  describe("cachePath", () => {
    it("should return correct cache path", () => {
      expect(service.cachePath).toBe(`${pluginDir}/cache/moby.txt`);
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
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);

      await service.load();
      expect(service.isLoaded()).toBe(true);
    });
  });

  describe("load", () => {
    it("should load and parse data correctly", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);

      await service.load();

      expect(service.isLoaded()).toBe(true);
      expect(adapter.read).toHaveBeenCalledWith(service.cachePath);
    });

    it("should not reload if already loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);

      await service.load();
      await service.load();

      expect(adapter.read).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent load calls", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);

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

    it("should skip lines with only one word (no synonyms)", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(MALFORMED_MOBY_DATA);

      await service.load();

      expect(service.isLoaded()).toBe(true);
      // "single_word_no_synonyms" should not be in the data
      expect(service.lookup("single_word_no_synonyms")).toEqual([]);
    });

    it("should skip lines with missing head word", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(MALFORMED_MOBY_DATA);

      await service.load();

      expect(service.isLoaded()).toBe(true);
      // The line starting with comma should be skipped
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
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);
      await service.load();
    });

    it("should return empty array if not loaded", () => {
      const unloadedService = new MobyService(mockApp, pluginDir);
      expect(unloadedService.lookup("happy")).toEqual([]);
    });

    it("should return related words for existing word", () => {
      const results = service.lookup("happy");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.word === "joyful")).toBe(true);
      expect(results.some((r) => r.word === "cheerful")).toBe(true);
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

    it("should set source to moby", () => {
      const results = service.lookup("happy");
      expect(results.every((r) => r.source === "moby")).toBe(true);
    });

    it("should set type to related", () => {
      const results = service.lookup("happy");
      expect(results.every((r) => r.type === "related")).toBe(true);
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
      const results = service.lookup("caf\u00e9");
      expect(results).toEqual([]);
    });

    it("should handle special characters", () => {
      const results = service.lookup("hello-world");
      expect(results).toEqual([]);
    });

    it("should trim whitespace from synonyms", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.read as jest.Mock).mockResolvedValue("test,  padded  ,  words  ");

      const newService = new MobyService(mockApp, pluginDir);
      await newService.load();

      const results = newService.lookup("test");
      expect(results.some((r) => r.word === "padded")).toBe(true);
      expect(results.some((r) => r.word === "words")).toBe(true);
      expect(results.some((r) => r.word === "  padded  ")).toBe(false);
    });

    it("should filter out empty synonyms", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.read as jest.Mock).mockResolvedValue("test,valid,,also_valid,  ,another");

      const newService = new MobyService(mockApp, pluginDir);
      await newService.load();

      const results = newService.lookup("test");
      expect(results.length).toBe(3);
      expect(results.some((r) => r.word === "valid")).toBe(true);
      expect(results.some((r) => r.word === "also_valid")).toBe(true);
      expect(results.some((r) => r.word === "another")).toBe(true);
    });
  });

  describe("download", () => {
    it("should create cache directory if it doesn't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);
      (adapter.mkdir as jest.Mock).mockResolvedValue(undefined);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_MOBY_DATA } as any);

      await service.download();

      expect(adapter.mkdir).toHaveBeenCalledWith(`${pluginDir}/cache`);
    });

    it("should download and save data file", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_MOBY_DATA } as any);

      const result = await service.download();

      expect(result).toBe(true);
      expect(adapter.write).toHaveBeenCalledWith(service.cachePath, SAMPLE_MOBY_DATA);
    });

    it("should parse data immediately after download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_MOBY_DATA } as any);

      await service.download();

      expect(service.isLoaded()).toBe(true);
      expect(service.lookup("happy").length).toBeGreaterThan(0);
    });

    it("should call progress callback during download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_MOBY_DATA } as any);

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
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_MOBY_DATA } as any);

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
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_MOBY_DATA);
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
