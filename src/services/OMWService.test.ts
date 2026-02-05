import { OMWService } from "./OMWService";
import { App, requestUrl } from "obsidian";
import { OMWLanguageCode } from "../types/omwLanguage";

// Mock requestUrl from obsidian
jest.mock("obsidian", () => ({
  ...jest.requireActual("obsidian"),
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Sample OMW tab-separated data for testing
const SAMPLE_TAB_DATA = `# OMW data file
01148283-a	fra:lemma	heureux
01148283-a	fra:lemma	content
01148283-a	eng:def	enjoying or showing pleasure
01148283-a	fra:lemma	joyeux
02076196-n	fra:lemma	chat
02076196-n	fra:lemma	félin
02076196-n	eng:def	feline mammal
00612114-v	fra:lemma	courir
00612114-v	fra:lemma	sprinter
00612114-v	eng:def	move fast by using one's feet`;

// Data with edge cases
const EDGE_CASE_DATA = `# Comment line
01148283-a	fra:lemma	word1

01148283-a	fra:lemma	word2
incomplete line
01148284-n	fra:lemma	test
01148284-n	eng:def	a definition`;

function createMockApp(): App {
  return {
    vault: {
      adapter: {
        exists: jest.fn(),
        read: jest.fn(),
        write: jest.fn(),
        mkdir: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
      },
    },
  } as unknown as App;
}

describe("OMWService", () => {
  let service: OMWService;
  let mockApp: App;
  const pluginDir = ".obsidian/plugins/wordsmith";

  beforeEach(() => {
    mockApp = createMockApp();
    service = new OMWService(mockApp, pluginDir);
    jest.clearAllMocks();
  });

  describe("cacheDir and getCachePath", () => {
    it("should return correct cache directory", () => {
      expect(service.cacheDir).toBe(`${pluginDir}/cache/omw`);
    });

    it("should return correct cache path for a language", () => {
      expect(service.getCachePath("fra")).toBe(`${pluginDir}/cache/omw/fra.tab`);
      expect(service.getCachePath("spa")).toBe(`${pluginDir}/cache/omw/spa.tab`);
    });
  });

  describe("isDownloaded", () => {
    it("should return true when language file exists", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);

      expect(await service.isDownloaded("fra")).toBe(true);
      expect(adapter.exists).toHaveBeenCalledWith(service.getCachePath("fra"));
    });

    it("should return false when language file does not exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      expect(await service.isDownloaded("fra")).toBe(false);
    });

    it("should return false when check throws error", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockRejectedValue(new Error("Access denied"));

      expect(await service.isDownloaded("fra")).toBe(false);
    });
  });

  describe("getDownloadedLanguages", () => {
    it("should return empty array when cache dir doesn't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.getDownloadedLanguages();
      expect(result).toEqual([]);
    });

    it("should return list of downloaded languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.list as jest.Mock).mockResolvedValue({
        files: [
          `${pluginDir}/cache/omw/fra.tab`,
          `${pluginDir}/cache/omw/spa.tab`,
          `${pluginDir}/cache/omw/ita.tab`,
        ],
        folders: [],
      });

      const result = await service.getDownloadedLanguages();
      expect(result).toContain("fra");
      expect(result).toContain("spa");
      expect(result).toContain("ita");
      expect(result.length).toBe(3);
    });

    it("should ignore non-tab files", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.list as jest.Mock).mockResolvedValue({
        files: [
          `${pluginDir}/cache/omw/fra.tab`,
          `${pluginDir}/cache/omw/readme.md`,
          `${pluginDir}/cache/omw/.gitkeep`,
        ],
        folders: [],
      });

      const result = await service.getDownloadedLanguages();
      expect(result).toEqual(["fra"]);
    });

    it("should handle list errors gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.list as jest.Mock).mockRejectedValue(new Error("List failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await service.getDownloadedLanguages();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("isLoaded", () => {
    it("should return false before loading", () => {
      expect(service.isLoaded("fra")).toBe(false);
    });

    it("should return true after successful load", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      expect(service.isLoaded("fra")).toBe(true);
    });
  });

  describe("load", () => {
    it("should load and parse tab data correctly", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");

      expect(service.isLoaded("fra")).toBe(true);
      expect(adapter.read).toHaveBeenCalledWith(service.getCachePath("fra"));
    });

    it("should not reload if already loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      await service.load("fra");

      expect(adapter.read).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent load calls", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await Promise.all([service.load("fra"), service.load("fra"), service.load("fra")]);

      expect(adapter.read).toHaveBeenCalledTimes(1);
    });

    it("should load multiple languages independently", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      await service.load("spa");

      expect(service.isLoaded("fra")).toBe(true);
      expect(service.isLoaded("spa")).toBe(true);
      expect(adapter.read).toHaveBeenCalledTimes(2);
    });

    it("should not load if data file does not exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      await service.load("fra");

      expect(service.isLoaded("fra")).toBe(false);
      expect(adapter.read).not.toHaveBeenCalled();
    });

    it("should handle read errors gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockRejectedValue(new Error("Read failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.load("fra");

      expect(service.isLoaded("fra")).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("parseTabFile", () => {
    it("should parse lemmas correctly", () => {
      const index = service.parseTabFile(SAMPLE_TAB_DATA);

      expect(index.wordToSynsets.has("heureux")).toBe(true);
      expect(index.wordToSynsets.has("content")).toBe(true);
      expect(index.wordToSynsets.has("chat")).toBe(true);
    });

    it("should normalize lemmas to lowercase", () => {
      const data = `01148283-a	fra:lemma	UPPERCASE
01148283-a	fra:lemma	MixedCase`;
      const index = service.parseTabFile(data);

      expect(index.wordToSynsets.has("uppercase")).toBe(true);
      expect(index.wordToSynsets.has("mixedcase")).toBe(true);
      expect(index.wordToSynsets.has("UPPERCASE")).toBe(false);
    });

    it("should parse definitions correctly", () => {
      const index = service.parseTabFile(SAMPLE_TAB_DATA);
      const synset = index.synsets.get("01148283-a");

      expect(synset?.definition).toBe("enjoying or showing pleasure");
    });

    it("should parse part of speech from synset ID", () => {
      const index = service.parseTabFile(SAMPLE_TAB_DATA);

      expect(index.synsets.get("01148283-a")?.pos).toBe("adjective");
      expect(index.synsets.get("02076196-n")?.pos).toBe("noun");
      expect(index.synsets.get("00612114-v")?.pos).toBe("verb");
    });

    it("should group lemmas by synset", () => {
      const index = service.parseTabFile(SAMPLE_TAB_DATA);
      const synset = index.synsets.get("01148283-a");

      expect(synset?.lemmas).toContain("heureux");
      expect(synset?.lemmas).toContain("content");
      expect(synset?.lemmas).toContain("joyeux");
    });

    it("should skip comment lines", () => {
      const index = service.parseTabFile(SAMPLE_TAB_DATA);

      // Comment line should be skipped, not parsed as word
      expect(index.wordToSynsets.has("# omw data file")).toBe(false);
    });

    it("should skip empty lines and malformed data", () => {
      const index = service.parseTabFile(EDGE_CASE_DATA);

      expect(index.wordToSynsets.has("word1")).toBe(true);
      expect(index.wordToSynsets.has("word2")).toBe(true);
      expect(index.wordToSynsets.has("test")).toBe(true);
    });

    it("should handle empty content", () => {
      const index = service.parseTabFile("");

      expect(index.wordToSynsets.size).toBe(0);
      expect(index.synsets.size).toBe(0);
    });

    it("should not duplicate lemmas in synset", () => {
      const data = `01148283-a	fra:lemma	word
01148283-a	fra:lemma	word
01148283-a	fra:lemma	word`;
      const index = service.parseTabFile(data);
      const synset = index.synsets.get("01148283-a");

      expect(synset?.lemmas.length).toBe(1);
    });

    it("should not duplicate synset IDs in word mapping", () => {
      const data = `01148283-a	fra:lemma	word`;
      const index = service.parseTabFile(data);

      // The word should map to only one synset ID (no duplicates)
      const synsets = index.wordToSynsets.get("word");
      expect(synsets?.length).toBe(1);
    });
  });

  describe("lookup", () => {
    beforeEach(async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);
      await service.load("fra");
    });

    it("should return empty array if language not loaded", () => {
      expect(service.lookup("heureux", "spa")).toEqual([]);
    });

    it("should return synonyms for existing word", () => {
      const results = service.lookup("heureux", "fra");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.word === "content")).toBe(true);
      expect(results.some((r) => r.word === "joyeux")).toBe(true);
    });

    it("should normalize input to lowercase", () => {
      const results1 = service.lookup("HEUREUX", "fra");
      const results2 = service.lookup("Heureux", "fra");
      const results3 = service.lookup("heureux", "fra");

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it("should return empty array for unknown word", () => {
      const results = service.lookup("xyznonexistent", "fra");
      expect(results).toEqual([]);
    });

    it("should not include the original word in results", () => {
      const results = service.lookup("heureux", "fra");
      const hasOriginal = results.some((r) => r.word.toLowerCase() === "heureux");
      expect(hasOriginal).toBe(false);
    });

    it("should include part of speech", () => {
      const results = service.lookup("heureux", "fra");
      expect(results.some((r) => r.partOfSpeech === "adjective")).toBe(true);
    });

    it("should include definition", () => {
      const results = service.lookup("heureux", "fra");
      expect(results.some((r) => r.definition === "enjoying or showing pleasure")).toBe(true);
    });

    it("should include definitionId (synset ID)", () => {
      const results = service.lookup("heureux", "fra");
      expect(results.some((r) => r.definitionId === "01148283-a")).toBe(true);
    });

    it("should set source to omw", () => {
      const results = service.lookup("heureux", "fra");
      expect(results.every((r) => r.source === "omw")).toBe(true);
    });

    it("should set type to synonym", () => {
      const results = service.lookup("heureux", "fra");
      expect(results.every((r) => r.type === "synonym")).toBe(true);
    });

    it("should deduplicate results", () => {
      const results = service.lookup("heureux", "fra");
      const words = results.map((r) => r.word);
      const uniqueWords = [...new Set(words)];
      expect(words.length).toBe(uniqueWords.length);
    });
  });

  describe("lookupByWordsmithLang", () => {
    beforeEach(async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);
      await service.load("fra");
    });

    it("should map Wordsmith language to OMW and lookup", () => {
      const results = service.lookupByWordsmithLang("heureux", "fr");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for unsupported Wordsmith language", () => {
      const results = service.lookupByWordsmithLang("word", "de"); // German not in OMW
      expect(results).toEqual([]);
    });

    it("should return empty array when OMW language not loaded", () => {
      const results = service.lookupByWordsmithLang("palabra", "es"); // Spanish OMW not loaded
      expect(results).toEqual([]);
    });
  });

  describe("canLookupWordsmithLang", () => {
    it("should return false when language has no OMW mapping", () => {
      expect(service.canLookupWordsmithLang("de")).toBe(false);
    });

    it("should return false when OMW language not loaded", () => {
      expect(service.canLookupWordsmithLang("fr")).toBe(false);
    });

    it("should return true when OMW language is loaded", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      expect(service.canLookupWordsmithLang("fr")).toBe(true);
    });
  });

  describe("download", () => {
    it("should create cache directories if they don't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock)
        .mockResolvedValueOnce(false) // omw dir doesn't exist
        .mockResolvedValueOnce(false); // parent cache dir doesn't exist
      (adapter.mkdir as jest.Mock).mockResolvedValue(undefined);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_TAB_DATA } as any);

      await service.download("fra");

      expect(adapter.mkdir).toHaveBeenCalledWith(`${pluginDir}/cache`);
      expect(adapter.mkdir).toHaveBeenCalledWith(`${pluginDir}/cache/omw`);
    });

    it("should download and save data file", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_TAB_DATA } as any);

      const result = await service.download("fra");

      expect(result).toBe(true);
      expect(adapter.write).toHaveBeenCalledWith(service.getCachePath("fra"), SAMPLE_TAB_DATA);
      // French is a core language, should use standard path
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://raw.githubusercontent.com/omwn/omw-data/main/wns/fra/wn-data-fra.tab",
      });
    });

    it("should parse data immediately after download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_TAB_DATA } as any);

      await service.download("fra");

      expect(service.isLoaded("fra")).toBe(true);
      expect(service.lookup("heureux", "fra").length).toBeGreaterThan(0);
    });

    it("should call progress callback during download", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.write as jest.Mock).mockResolvedValue(undefined);
      mockRequestUrl.mockResolvedValue({ text: SAMPLE_TAB_DATA } as any);

      const progressCallback = jest.fn();
      await service.download("fra", progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({ loaded: 0, total: 100, percent: 0 });
      expect(progressCallback).toHaveBeenCalledWith({ loaded: 50, total: 100, percent: 50 });
      expect(progressCallback).toHaveBeenCalledWith({ loaded: 100, total: 100, percent: 100 });
    });

    it("should return false on download error", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      mockRequestUrl.mockRejectedValue(new Error("Network error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await service.download("fra");

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

      await service.delete("fra");

      expect(adapter.remove).toHaveBeenCalledWith(service.getCachePath("fra"));
    });

    it("should not try to remove file if it doesn't exist", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(false);

      await service.delete("fra");

      expect(adapter.remove).not.toHaveBeenCalled();
    });

    it("should clear loaded data for that language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);

      await service.load("fra");
      expect(service.isLoaded("fra")).toBe(true);

      await service.delete("fra");
      expect(service.isLoaded("fra")).toBe(false);
    });

    it("should not affect other loaded languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);
      (adapter.remove as jest.Mock).mockResolvedValue(undefined);

      await service.load("fra");
      await service.load("spa");

      await service.delete("fra");

      expect(service.isLoaded("fra")).toBe(false);
      expect(service.isLoaded("spa")).toBe(true);
    });

    it("should handle delete errors gracefully", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.remove as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.delete("fra");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("unload", () => {
    it("should unload a specific language", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      await service.load("spa");

      service.unload("fra");

      expect(service.isLoaded("fra")).toBe(false);
      expect(service.isLoaded("spa")).toBe(true);
    });
  });

  describe("unloadAll", () => {
    it("should unload all languages", async () => {
      const adapter = mockApp.vault.adapter as jest.Mocked<typeof mockApp.vault.adapter>;
      (adapter.exists as jest.Mock).mockResolvedValue(true);
      (adapter.read as jest.Mock).mockResolvedValue(SAMPLE_TAB_DATA);

      await service.load("fra");
      await service.load("spa");

      service.unloadAll();

      expect(service.isLoaded("fra")).toBe(false);
      expect(service.isLoaded("spa")).toBe(false);
    });
  });
});
