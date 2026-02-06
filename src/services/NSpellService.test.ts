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

// German sample data
const SAMPLE_DE_AFF = `SET UTF-8
TRY esianrtolcdugmphbyfvkwzäöüßESIANRTOLCDUGMPHBYFVKWZÄÖÜ`;

const SAMPLE_DE_DIC = `3
Hallo
Welt
Test`;

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
        list: jest.fn(),
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

    it("should return correct dictionary file path for default (English)", () => {
      expect(service.dicPath).toBe(`${pluginDir}/cache/nspell/en.dic`);
    });

    it("should return correct affix file path for default (English)", () => {
      expect(service.affPath).toBe(`${pluginDir}/cache/nspell/en.aff`);
    });

    it("should return correct dictionary file path with language parameter", () => {
      expect(service.getDicPath("de")).toBe(`${pluginDir}/cache/nspell/de.dic`);
      expect(service.getDicPath("fr")).toBe(`${pluginDir}/cache/nspell/fr.dic`);
      expect(service.getDicPath("es-MX")).toBe(`${pluginDir}/cache/nspell/es-MX.dic`);
    });

    it("should return correct affix file path with language parameter", () => {
      expect(service.getAffPath("de")).toBe(`${pluginDir}/cache/nspell/de.aff`);
      expect(service.getAffPath("fr")).toBe(`${pluginDir}/cache/nspell/fr.aff`);
      expect(service.getAffPath("es-MX")).toBe(`${pluginDir}/cache/nspell/es-MX.aff`);
    });
  });

  describe("isDownloaded", () => {
    it("should return true when both files exist for default language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      expect(await service.isDownloaded()).toBe(true);
      expect(adapter.exists).toHaveBeenCalledWith(service.getDicPath("en"));
      expect(adapter.exists).toHaveBeenCalledWith(service.getAffPath("en"));
    });

    it("should return true when both files exist for specific language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      expect(await service.isDownloaded("de")).toBe(true);
      expect(adapter.exists).toHaveBeenCalledWith(service.getDicPath("de"));
      expect(adapter.exists).toHaveBeenCalledWith(service.getAffPath("de"));
    });

    it("should return false when dictionary file is missing", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        return Promise.resolve(path === service.getAffPath("en"));
      });

      expect(await service.isDownloaded()).toBe(false);
    });

    it("should return false when affix file is missing", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        return Promise.resolve(path === service.getDicPath("en"));
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

    it("should return false for specific language before loading", () => {
      expect(service.isLoaded("de")).toBe(false);
    });

    it("should return true after successful load", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load();
      expect(service.isLoaded()).toBe(true);
    });

    it("should return true for specific language after loading", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("de")) return Promise.resolve(SAMPLE_DE_AFF);
        if (path === service.getDicPath("de")) return Promise.resolve(SAMPLE_DE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load("de");
      expect(service.isLoaded("de")).toBe(true);
      expect(service.isLoaded("en")).toBe(false); // Other languages not loaded
    });
  });

  describe("load", () => {
    it("should load both dictionary files", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load();

      expect(adapter.read).toHaveBeenCalledWith(service.getAffPath("en"));
      expect(adapter.read).toHaveBeenCalledWith(service.getDicPath("en"));
      expect(mockNspellFn).toHaveBeenCalledWith({ aff: SAMPLE_AFF, dic: SAMPLE_DIC });
    });

    it("should not reload if already loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      mockSpellInstance.correct.mockReturnValue(false);

      await service.load();
      const result = service.isCorrect("helo");

      expect(result).toBe(false);
    });

    it("should check correct language instance", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      // Create separate mock instances for each language
      const enSpell = { correct: jest.fn().mockReturnValue(true), suggest: jest.fn() };
      const deSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn() };

      let loadCount = 0;
      mockNspellFn.mockImplementation(() => {
        loadCount++;
        return loadCount === 1 ? enSpell : deSpell;
      });

      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path.includes("en.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_AFF : SAMPLE_DIC);
        }
        if (path.includes("de.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_DE_AFF : SAMPLE_DE_DIC);
        }
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load("en");
      await service.load("de");

      service.isCorrect("hello", "en");
      expect(enSpell.correct).toHaveBeenCalledWith("hello");

      service.isCorrect("Hallo", "de");
      expect(deSpell.correct).toHaveBeenCalledWith("Hallo");
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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(true), suggest: jest.fn() };
      mockNspellFn.mockReturnValue(enSpell);

      await service.load();
      const results = service.suggest("hello");

      expect(results).toEqual([]);
      expect(enSpell.suggest).not.toHaveBeenCalled();
    });

    it("should return suggestions for misspelled words", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue(["hello", "halo", "help"]) };
      mockNspellFn.mockReturnValue(enSpell);

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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue([]) };
      mockNspellFn.mockReturnValue(enSpell);

      await service.load();
      const results = service.suggest("xyzabc");

      expect(results).toEqual([]);
    });

    it("should set source to nspell", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue(["test"]) };
      mockNspellFn.mockReturnValue(enSpell);

      await service.load();
      const results = service.suggest("tets");

      expect(results.every((r) => r.source === "nspell")).toBe(true);
    });

    it("should set type to spelling", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue(["test"]) };
      mockNspellFn.mockReturnValue(enSpell);

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
      expect(adapter.write).toHaveBeenCalledWith(service.getAffPath("en"), SAMPLE_AFF);
      expect(adapter.write).toHaveBeenCalledWith(service.getDicPath("en"), SAMPLE_DIC);
    });

    it("should download to correct paths for specific language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockImplementation(({ url }: { url: string }) => {
        if (url.includes(".aff")) return Promise.resolve({ text: SAMPLE_DE_AFF } as any);
        if (url.includes(".dic")) return Promise.resolve({ text: SAMPLE_DE_DIC } as any);
        return Promise.reject(new Error("Unknown URL"));
      });

      const result = await service.download("de");

      expect(result).toBe(true);
      expect(adapter.write).toHaveBeenCalledWith(service.getAffPath("de"), SAMPLE_DE_AFF);
      expect(adapter.write).toHaveBeenCalledWith(service.getDicPath("de"), SAMPLE_DE_DIC);
    });

    it("should use correct download URLs for different languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_AFF } as any);

      await service.download("de");

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/dictionaries/de/index.aff"),
        })
      );
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/dictionaries/de/index.dic"),
        })
      );
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
      await service.download("en", progressCallback);

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

      expect(adapter.remove).toHaveBeenCalledWith(service.getDicPath("en"));
      expect(adapter.remove).toHaveBeenCalledWith(service.getAffPath("en"));
    });

    it("should remove files for specific language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockResolvedValue(undefined);

      await service.delete("de");

      expect(adapter.remove).toHaveBeenCalledWith(service.getDicPath("de"));
      expect(adapter.remove).toHaveBeenCalledWith(service.getAffPath("de"));
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

    it("should clear loaded spell instance for specific language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path.includes("en.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_AFF : SAMPLE_DIC);
        }
        if (path.includes("de.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_DE_AFF : SAMPLE_DE_DIC);
        }
        return Promise.reject(new Error("Unknown path"));
      });
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockResolvedValue(undefined);

      await service.load("en");
      await service.load("de");
      expect(service.isLoaded("en")).toBe(true);
      expect(service.isLoaded("de")).toBe(true);

      await service.delete("de");
      expect(service.isLoaded("en")).toBe(true);
      expect(service.isLoaded("de")).toBe(false);
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

  describe("getDownloadedLanguages", () => {
    it("should return empty array when cache directory does not exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      const languages = await service.getDownloadedLanguages();
      expect(languages).toEqual([]);
    });

    it("should return list of downloaded languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        // Cache dir exists, and both .dic and .aff files exist for en and de
        if (path === service.cacheDir) return Promise.resolve(true);
        if (path.endsWith(".aff")) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      (adapter.list as jest.Mock).mockResolvedValue({
        files: [
          `${service.cacheDir}/en.dic`,
          `${service.cacheDir}/de.dic`,
          `${service.cacheDir}/fr.dic`,
        ],
        folders: [],
      });

      const languages = await service.getDownloadedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("de");
      expect(languages).toContain("fr");
    });

    it("should only include languages with both .dic and .aff files", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockImplementation((path: string) => {
        if (path === service.cacheDir) return Promise.resolve(true);
        // Only en has both files
        if (path === service.getAffPath("en")) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      (adapter.list as jest.Mock).mockResolvedValue({
        files: [
          `${service.cacheDir}/en.dic`,
          `${service.cacheDir}/de.dic`, // No .aff file
        ],
        folders: [],
      });

      const languages = await service.getDownloadedLanguages();
      expect(languages).toContain("en");
      expect(languages).not.toContain("de");
    });
  });

  describe("multilingual support", () => {
    it("should handle multiple languages simultaneously", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      let loadCount = 0;
      const spellInstances = [
        { correct: jest.fn().mockReturnValue(true), suggest: jest.fn() },
        { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue(["Hallo"]) },
      ];
      mockNspellFn.mockImplementation(() => spellInstances[loadCount++]);

      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path.includes("en.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_AFF : SAMPLE_DIC);
        }
        if (path.includes("de.")) {
          return Promise.resolve(path.endsWith(".aff") ? SAMPLE_DE_AFF : SAMPLE_DE_DIC);
        }
        return Promise.reject(new Error("Unknown path"));
      });

      await service.load("en");
      await service.load("de");

      expect(service.isLoaded("en")).toBe(true);
      expect(service.isLoaded("de")).toBe(true);

      // English spell check
      expect(service.isCorrect("hello", "en")).toBe(true);

      // German spell check
      expect(service.isCorrect("Halo", "de")).toBe(false);
      const suggestions = service.suggest("Halo", "de");
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.word).toBe("Hallo");
    });

    it("should delete specific language without affecting others", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_AFF);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);
      (adapter.rmdir as jest.Mock).mockRejectedValue(new Error("Not empty"));

      await service.load("en");
      await service.load("de");

      await service.delete("de");

      expect(service.isLoaded("en")).toBe(true);
      expect(service.isLoaded("de")).toBe(false);
    });
  });

  describe("Wordsmith language code convenience methods", () => {
    it("canSpellCheck should return false when dictionary not loaded", () => {
      expect(service.canSpellCheck("en")).toBe(false);
      expect(service.canSpellCheck("de")).toBe(false);
    });

    it("canSpellCheck should return true when dictionary is loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_AFF);

      await service.load("en");
      expect(service.canSpellCheck("en")).toBe(true);
      expect(service.canSpellCheck("de")).toBe(false);
    });

    it("canSpellCheck should return false for unmapped languages", () => {
      expect(service.canSpellCheck("ja")).toBe(false); // Japanese has no Hunspell
      expect(service.canSpellCheck("ar")).toBe(false); // Arabic has no Hunspell
    });

    it("isCorrectByWordsmithLang should work with mapped languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_AFF);
      mockSpellInstance.correct.mockReturnValue(true);

      await service.load("en");
      expect(service.isCorrectByWordsmithLang("hello", "en")).toBe(true);
    });

    it("isCorrectByWordsmithLang should return true for unmapped languages", () => {
      expect(service.isCorrectByWordsmithLang("hello", "ja")).toBe(true);
    });

    it("suggestByWordsmithLang should return empty for unmapped languages", () => {
      expect(service.suggestByWordsmithLang("hello", "ja")).toEqual([]);
    });

    it("getHunspellLangFromWordsmith should map Norwegian to nb", () => {
      expect(service.getHunspellLangFromWordsmith("no")).toBe("nb");
    });

    it("getWordsmithLangFromHunspell should map regional variants", () => {
      expect(service.getWordsmithLangFromHunspell("en-GB")).toBe("en");
      expect(service.getWordsmithLangFromHunspell("de-AT")).toBe("de");
      expect(service.getWordsmithLangFromHunspell("es-MX")).toBe("es");
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
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(false), suggest: jest.fn().mockReturnValue(["cafe"]) };
      mockNspellFn.mockReturnValue(enSpell);

      await service.load();
      const results = service.suggest("caf\u00e9");

      expect(enSpell.correct).toHaveBeenCalledWith("caf\u00e9");
      expect(results.length).toBe(1);
    });

    it("should handle special characters", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockImplementation((path: string) => {
        if (path === service.getAffPath("en")) return Promise.resolve(SAMPLE_AFF);
        if (path === service.getDicPath("en")) return Promise.resolve(SAMPLE_DIC);
        return Promise.reject(new Error("Unknown path"));
      });
      const enSpell = { correct: jest.fn().mockReturnValue(true), suggest: jest.fn() };
      mockNspellFn.mockReturnValue(enSpell);

      await service.load();
      service.isCorrect("hello-world");

      expect(enSpell.correct).toHaveBeenCalledWith("hello-world");
    });
  });
});
