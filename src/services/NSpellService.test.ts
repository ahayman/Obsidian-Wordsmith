import { App, requestUrl } from "obsidian";

// Mock nspell - must be before import
const mockSpellInstance = {
  correct: jest.fn(),
  suggest: jest.fn(),
};

const mockNspellFn = jest.fn(() => mockSpellInstance);

jest.mock("nspell", () => {
  return {
    __esModule: true,
    default: mockNspellFn,
  };
});

// Mock requestUrl from obsidian
jest.mock("obsidian", () => ({
  ...jest.requireActual("obsidian"),
  requestUrl: jest.fn(),
}));

import { NSpellService } from "./NSpellService";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Sample dictionary data
const SAMPLE_AFF = `SET UTF-8
TRY esianrtolcdugmphbyfvkwzESIANRTOLCDUGMPHBYFVKWZ
NOSUGGEST !
REP 2
REP f ph
REP ph f`;

const SAMPLE_DIC = `3
hello
world
test`;

function createMockApp(): App {
  return {
    vault: {
      adapter: {
        exists: jest.fn(),
        read: jest.fn(),
        write: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        rmdir: jest.fn(),
      },
    },
  } as unknown as App;
}

describe("NSpellService", () => {
  let service: NSpellService;
  let mockApp: App;
  const pluginDir = ".obsidian/plugins/wordsmith";

  beforeEach(() => {
    mockApp = createMockApp();
    service = new NSpellService(mockApp, pluginDir);
    jest.clearAllMocks();
    // Reset mock spell instance
    mockSpellInstance.correct.mockReset();
    mockSpellInstance.suggest.mockReset();
    mockNspellFn.mockClear();
  });

  describe("paths", () => {
    it("should return correct cache directory", () => {
      expect(service.cacheDir).toBe(`${pluginDir}/cache/nspell`);
    });

    it("should return correct dictionary file path", () => {
      expect(service.dicPath).toBe(`${pluginDir}/cache/nspell/en.dic`);
    });

    it("should return correct affix file path", () => {
      expect(service.affPath).toBe(`${pluginDir}/cache/nspell/en.aff`);
    });
  });

  describe("isDownloaded", () => {
    it("should return true when both files exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      expect(await service.isDownloaded()).toBe(true);
      expect(adapter.exists).toHaveBeenCalledWith(service.dicPath);
      expect(adapter.exists).toHaveBeenCalledWith(service.affPath);
    });

    it("should return false when dictionary file is missing", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        return Promise.resolve(path === service.affPath);
      });

      expect(await service.isDownloaded()).toBe(false);
    });

    it("should return false when affix file is missing", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        return Promise.resolve(path === service.dicPath);
      });

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
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load();
      expect(service.isLoaded()).toBe(true);
    });
  });

  describe("load", () => {
    it("should load both dictionary files", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load();

      expect(adapter.read).toHaveBeenCalledWith(service.affPath);
      expect(adapter.read).toHaveBeenCalledWith(service.dicPath);
      expect(mockNspellFn).toHaveBeenCalledWith({ aff: SAMPLE_AFF, dic: SAMPLE_DIC });
    });

    it("should not reload if already loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load();
      await service.load();

      expect(mockNspellFn).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent load calls", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await Promise.all([service.load(), service.load(), service.load()]);

      expect(mockNspellFn).toHaveBeenCalledTimes(1);
    });

    it("should not load if data files do not exist", async () => {
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
  });

  describe("isCorrect", () => {
    it("should return true if not loaded (assumes correct)", () => {
      const result = service.isCorrect("hello");
      expect(result).toBe(true);
    });

    it("should delegate to nspell when loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(true);

      await service.load();
      const result = service.isCorrect("hello");

      expect(mockSpellInstance.correct).toHaveBeenCalledWith("hello");
      expect(result).toBe(true);
    });

    it("should return false for misspelled words", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);

      await service.load();
      const result = service.isCorrect("helo");

      expect(result).toBe(false);
    });
  });

  describe("suggest", () => {
    it("should return empty array if not loaded", () => {
      const results = service.suggest("helo");
      expect(results).toEqual([]);
    });

    it("should return empty array for correctly spelled words", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(true);

      await service.load();
      const results = service.suggest("hello");

      expect(results).toEqual([]);
      expect(mockSpellInstance.suggest).not.toHaveBeenCalled();
    });

    it("should return suggestions for misspelled words", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);
      mockSpellInstance.suggest.mockReturnValue(["hello", "halo", "help"]);

      await service.load();
      const results = service.suggest("helo");

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ word: "hello", type: "spelling", source: "nspell" });
      expect(results[1]).toEqual({ word: "halo", type: "spelling", source: "nspell" });
      expect(results[2]).toEqual({ word: "help", type: "spelling", source: "nspell" });
    });

    it("should return empty array when no suggestions available", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);
      mockSpellInstance.suggest.mockReturnValue([]);

      await service.load();
      const results = service.suggest("xyzabc");

      expect(results).toEqual([]);
    });

    it("should set source to nspell", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);
      mockSpellInstance.suggest.mockReturnValue(["test"]);

      await service.load();
      const results = service.suggest("tets");

      expect(results.every((r) => r.source === "nspell")).toBe(true);
    });

    it("should set type to spelling", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);
      mockSpellInstance.suggest.mockReturnValue(["test"]);

      await service.load();
      const results = service.suggest("tets");

      expect(results.every((r) => r.type === "spelling")).toBe(true);
    });
  });

  describe("download", () => {
    it("should create cache directories if they don't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);
      (adapter.mkdir as jest.Mock).mockResolvedValue(undefined);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_AFF } as any);

      await service.download();

      expect(adapter.mkdir).toHaveBeenCalledWith(`${pluginDir}/cache`);
      expect(adapter.mkdir).toHaveBeenCalledWith(service.cacheDir);
    });

    it("should download both dictionary files", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockImplementation(({ url }: { url: string }) => {
        if (url.includes(".aff")) return Promise.resolve({ text: SAMPLE_AFF } as any);
        if (url.includes(".dic")) return Promise.resolve({ text: SAMPLE_DIC } as any);
        return Promise.reject(new Error("Unknown URL"));
      });

      const result = await service.download();

      expect(result).toBe(true);
      expect(adapter.write).toHaveBeenCalledWith(service.affPath, SAMPLE_AFF);
      expect(adapter.write).toHaveBeenCalledWith(service.dicPath, SAMPLE_DIC);
    });

    it("should initialize nspell immediately after download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockImplementation(({ url }: { url: string }) => {
        if (url.includes(".aff")) return Promise.resolve({ text: SAMPLE_AFF } as any);
        if (url.includes(".dic")) return Promise.resolve({ text: SAMPLE_DIC } as any);
        return Promise.reject(new Error("Unknown URL"));
      });

      await service.download();

      expect(service.isLoaded()).toBe(true);
      expect(mockNspellFn).toHaveBeenCalledWith({ aff: SAMPLE_AFF, dic: SAMPLE_DIC });
    });

    it("should call progress callback during download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockImplementation(({ url }: { url: string }) => {
        if (url.includes(".aff")) return Promise.resolve({ text: SAMPLE_AFF } as any);
        if (url.includes(".dic")) return Promise.resolve({ text: SAMPLE_DIC } as any);
        return Promise.reject(new Error("Unknown URL"));
      });

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
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_AFF } as any);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await service.download();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("delete", () => {
    it("should remove both dictionary files if they exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockResolvedValue(undefined);

      await service.delete();

      expect(adapter.remove).toHaveBeenCalledWith(service.dicPath);
      expect(adapter.remove).toHaveBeenCalledWith(service.affPath);
    });

    it("should try to remove cache directory", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockResolvedValue(undefined);

      await service.delete();

      expect(adapter.rmdir).toHaveBeenCalledWith(service.cacheDir, false);
    });

    it("should handle rmdir failure gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockRejectedValue(new Error("Directory not empty"));

      // Should not throw
      await service.delete();
    });

    it("should not try to remove files that don't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      await service.delete();

      expect(adapter.remove).not.toHaveBeenCalled();
    });

    it("should clear loaded spell instance", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockResolvedValue(undefined);

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

  describe("edge cases", () => {
    it("should handle empty word in isCorrect", () => {
      // Not loaded, should return true
      expect(service.isCorrect("")).toBe(true);
    });

    it("should handle empty word in suggest", () => {
      const results = service.suggest("");
      expect(results).toEqual([]);
    });

    it("should handle unicode characters", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);
      mockSpellInstance.suggest.mockReturnValue(["cafe"]);

      await service.load();
      const results = service.suggest("caf\u00e9");

      expect(mockSpellInstance.correct).toHaveBeenCalledWith("caf\u00e9");
      expect(results.length).toBe(1);
    });

    it("should handle special characters", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.affPath) return Promise.resolve(SAMPLE_AFF);
        if (path === service.dicPath) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(true);

      await service.load();
      const result = service.isCorrect("hello-world");

      expect(mockSpellInstance.correct).toHaveBeenCalledWith("hello-world");
    });
  });
});
