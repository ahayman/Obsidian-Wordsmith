import { App } from "obsidian";
import { DataService } from "./DataService";
import { WordNetService } from "./WordNetService";
import { MobyService } from "./MobyService";
import { DatamuseService } from "./DatamuseService";
import { NSpellService } from "./NSpellService";
import { SpellingService } from "./SpellingService";
import { CacheService } from "./CacheService";
import { createAPIService } from "./api";
import {
  WordsmithSettings,
  SynonymResult,
  DEFAULT_SETTINGS,
  StreamingLookupCallbacks,
} from "../types/types";

// Mock all the services
jest.mock("./WordNetService");
jest.mock("./MobyService");
jest.mock("./DatamuseService");
jest.mock("./NSpellService");
jest.mock("./SpellingService");
jest.mock("./CacheService");
jest.mock("./api");

const MockedWordNetService = WordNetService as jest.MockedClass<typeof WordNetService>;
const MockedMobyService = MobyService as jest.MockedClass<typeof MobyService>;
const MockedDatamuseService = DatamuseService as jest.MockedClass<typeof DatamuseService>;
const MockedNSpellService = NSpellService as jest.MockedClass<typeof NSpellService>;
const MockedSpellingService = SpellingService as jest.MockedClass<typeof SpellingService>;
const MockedCacheService = CacheService as jest.MockedClass<typeof CacheService>;
const mockedCreateAPIService = createAPIService as jest.MockedFunction<typeof createAPIService>;

function createMockApp(): App {
  return {} as App;
}

function createDefaultSettings(): WordsmithSettings {
  return {
    ...DEFAULT_SETTINGS,
    maxResults: 50,
    maxCacheSize: 100,
    sources: [
      { kind: "builtin", id: "local", enabled: true },
      { kind: "builtin", id: "datamuse", enabled: true },
    ],
  };
}

function createMockSynonymResults(prefix: string, type: SynonymResult["type"] = "synonym"): SynonymResult[] {
  return [
    { word: `${prefix}1`, type, source: "wordnet" },
    { word: `${prefix}2`, type, source: "wordnet" },
  ];
}

describe("DataService", () => {
  let mockApp: App;
  let mockWordNet: jest.Mocked<WordNetService>;
  let mockMoby: jest.Mocked<MobyService>;
  let mockDatamuse: jest.Mocked<DatamuseService>;
  let mockNSpell: jest.Mocked<NSpellService>;
  let mockSpellingService: jest.Mocked<SpellingService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApp = createMockApp();

    // Setup WordNetService mock
    mockWordNet = {
      isLoaded: jest.fn().mockReturnValue(true),
      lookup: jest.fn().mockReturnValue(createMockSynonymResults("wordnet")),
      load: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<WordNetService>;
    MockedWordNetService.mockImplementation(() => mockWordNet);

    // Setup MobyService mock
    mockMoby = {
      isLoaded: jest.fn().mockReturnValue(true),
      lookup: jest.fn().mockReturnValue(createMockSynonymResults("moby", "related")),
      load: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MobyService>;
    MockedMobyService.mockImplementation(() => mockMoby);

    // Setup DatamuseService mock
    mockDatamuse = {
      lookup: jest.fn().mockResolvedValue({
        synonyms: createMockSynonymResults("datamuse-syn"),
        relatedWords: createMockSynonymResults("datamuse-rel", "related"),
      }),
      setMaxResults: jest.fn(),
      supportedTypes: jest.fn().mockReturnValue(["synonym", "antonym", "related", "hypernym", "hyponym"]),
    } as unknown as jest.Mocked<DatamuseService>;
    MockedDatamuseService.mockImplementation(() => mockDatamuse);

    // Setup NSpellService mock
    mockNSpell = {
      isLoaded: jest.fn().mockReturnValue(true),
      isCorrect: jest.fn().mockReturnValue(true),
      suggest: jest.fn().mockReturnValue([]),
      load: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NSpellService>;
    MockedNSpellService.mockImplementation(() => mockNSpell);

    // Setup SpellingService mock
    mockSpellingService = {
      getSuggestions: jest.fn().mockResolvedValue([]),
      updateSettings: jest.fn(),
    } as unknown as jest.Mocked<SpellingService>;
    MockedSpellingService.mockImplementation(() => mockSpellingService);

    // Setup CacheService mock
    mockCacheService = {
      getService: jest.fn().mockReturnValue(null),
      setService: jest.fn(),
      getServiceForTypes: jest.fn().mockReturnValue(null),
      getMissingTypes: jest.fn().mockReturnValue([]),
      setMaxSize: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;
    MockedCacheService.mockImplementation(() => mockCacheService);

    // Setup createAPIService mock
    mockedCreateAPIService.mockReturnValue({
      id: "test-api",
      name: "Test API",
      description: "Test API service",
      lookup: jest.fn().mockResolvedValue(createMockSynonymResults("api")),
      validate: jest.fn().mockResolvedValue({ valid: true }),
      supportedTypes: jest.fn().mockReturnValue(["synonym", "antonym"]),
    });
  });

  describe("constructor", () => {
    it("should initialize all services", () => {
      const settings = createDefaultSettings();
      new DataService(mockApp, "/test/plugin", settings);

      expect(MockedWordNetService).toHaveBeenCalledWith(mockApp, "/test/plugin");
      expect(MockedMobyService).toHaveBeenCalledWith(mockApp, "/test/plugin");
      expect(MockedDatamuseService).toHaveBeenCalledWith(settings.maxResults);
      expect(MockedNSpellService).toHaveBeenCalledWith(mockApp, "/test/plugin");
      expect(MockedCacheService).toHaveBeenCalledWith(settings.lookupCache, settings.maxCacheSize);
    });

    it("should initialize API services from settings", () => {
      const settings = createDefaultSettings();
      settings.sources.push({
        kind: "api",
        id: "test-api-1",
        config: {
          id: "test-api-1",
          type: "free-dictionary",
          apiKey: "",
          enabled: true,
        },
      });

      new DataService(mockApp, "/test/plugin", settings);

      expect(mockedCreateAPIService).toHaveBeenCalledWith({
        id: "test-api-1",
        type: "free-dictionary",
        apiKey: "",
        enabled: true,
      });
    });
  });

  describe("initialize", () => {
    it("should load WordNet and Moby when local source is enabled", async () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.initialize();

      expect(mockWordNet.load).toHaveBeenCalled();
      expect(mockMoby.load).toHaveBeenCalled();
    });

    it("should not load WordNet and Moby when local source is disabled", async () => {
      const settings = createDefaultSettings();
      settings.sources = [
        { kind: "builtin", id: "local", enabled: false },
        { kind: "builtin", id: "datamuse", enabled: true },
      ];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.initialize();

      expect(mockWordNet.load).not.toHaveBeenCalled();
      expect(mockMoby.load).not.toHaveBeenCalled();
    });

    it("should load nspell when nspellDownloaded is true", async () => {
      const settings = createDefaultSettings();
      settings.nspellDownloaded = true;
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.initialize();

      expect(mockNSpell.load).toHaveBeenCalled();
    });
  });

  describe("lookup", () => {
    it("should return results from all enabled sources", async () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      expect(result.originalWord).toBe("test");
      expect(result.results).toHaveProperty("local");
      expect(result.results).toHaveProperty("datamuse");
    });

    it("should use cache when results are cached", async () => {
      const cachedResults = createMockSynonymResults("cached");
      mockCacheService.getService.mockImplementation((word: string, serviceId: string) => {
        if (serviceId === "local") return cachedResults;
        return null;
      });

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      expect(result.results["local"]).toEqual(cachedResults);
      expect(mockWordNet.lookup).not.toHaveBeenCalled();
    });

    it("should cache results after lookup", async () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockCacheService.setService).toHaveBeenCalledWith(
        "test",
        "local",
        expect.any(Array)
      );
    });

    it("should lookup from local source (WordNet + Moby)", async () => {
      mockCacheService.getService.mockReturnValue(null);
      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockWordNet.lookup).toHaveBeenCalledWith("test");
      expect(mockMoby.lookup).toHaveBeenCalledWith("test");
    });

    it("should lookup from datamuse source", async () => {
      mockCacheService.getService.mockReturnValue(null);
      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockDatamuse.lookup).toHaveBeenCalledWith("test", undefined, "en");
    });

    it("should not lookup from disabled sources", async () => {
      const settings = createDefaultSettings();
      settings.sources = [
        { kind: "builtin", id: "local", enabled: false },
        { kind: "builtin", id: "datamuse", enabled: false },
      ];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      expect(result.results).not.toHaveProperty("local");
      expect(result.results).not.toHaveProperty("datamuse");
      expect(mockWordNet.lookup).not.toHaveBeenCalled();
      expect(mockDatamuse.lookup).not.toHaveBeenCalled();
    });

    it("should lookup from API services", async () => {
      const mockApiService = {
        id: "test-api",
        name: "Test API",
        description: "Test",
        lookup: jest.fn().mockResolvedValue(createMockSynonymResults("api")),
        validate: jest.fn().mockResolvedValue({ valid: true }),
        supportedTypes: jest.fn().mockReturnValue(["synonym"]),
      };
      mockedCreateAPIService.mockReturnValue(mockApiService);

      const settings = createDefaultSettings();
      settings.sources = [
        {
          kind: "api",
          id: "test-api",
          config: {
            id: "test-api",
            type: "free-dictionary",
            apiKey: "",
            enabled: true,
          },
        },
      ];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockApiService.lookup).toHaveBeenCalled();
    });

    it("should include spelling suggestions in results", async () => {
      mockSpellingService.getSuggestions.mockResolvedValue(
        createMockSynonymResults("spelling", "spelling")
      );
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("tset");

      expect(mockSpellingService.getSuggestions).toHaveBeenCalledWith("tset");
      expect(result.results["spelling"]).toBeDefined();
    });

    it("should not include spelling results if empty", async () => {
      mockSpellingService.getSuggestions.mockResolvedValue([]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      expect(result.results["spelling"]).toBeUndefined();
    });

    it("should handle errors from Datamuse gracefully", async () => {
      mockDatamuse.lookup.mockRejectedValue(new Error("Network error"));
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      // Should return empty array for datamuse, not throw
      expect(result.results["datamuse"]).toEqual([]);
    });

    it("should deduplicate results", async () => {
      mockWordNet.lookup.mockReturnValue([
        { word: "duplicate", type: "synonym", source: "wordnet" },
        { word: "unique1", type: "synonym", source: "wordnet" },
      ]);
      mockMoby.lookup.mockReturnValue([
        { word: "duplicate", type: "related", source: "moby" },
        { word: "unique2", type: "related", source: "moby" },
      ]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      // Should deduplicate across WordNet and Moby
      const words = result.results["local"]?.map((r) => r.word) || [];
      expect(words.filter((w) => w === "duplicate").length).toBe(1);
    });

    it("should filter out the original word from results", async () => {
      mockWordNet.lookup.mockReturnValue([
        { word: "test", type: "synonym", source: "wordnet" },
        { word: "example", type: "synonym", source: "wordnet" },
      ]);
      mockMoby.lookup.mockReturnValue([]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      const words = result.results["local"]?.map((r) => r.word) || [];
      expect(words).not.toContain("test");
    });

    it("should respect maxResults setting", async () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
      }));
      mockWordNet.lookup.mockReturnValue(manyResults);
      mockMoby.lookup.mockReturnValue([]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.maxResults = 10;
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      expect(result.results["local"]?.length).toBeLessThanOrEqual(10);
    });
  });

  describe("lookupStreaming", () => {
    it("should call onSourceComplete for each source", async () => {
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getMissingTypes.mockReturnValue(["synonym", "antonym"]);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      service.lookupStreaming("test", callbacks);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callbacks.onSourceComplete).toHaveBeenCalledWith("local", expect.any(Array));
    });

    it("should call onAllComplete when all sources finish", async () => {
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getMissingTypes.mockReturnValue(["synonym", "antonym"]);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      service.lookupStreaming("test", callbacks);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callbacks.onAllComplete).toHaveBeenCalled();
    });

    it("should return a handle with cancel function", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      const handle = service.lookupStreaming("test", callbacks);

      expect(handle.cancel).toBeDefined();
      expect(typeof handle.cancel).toBe("function");
    });

    it("should stop callbacks when cancelled", async () => {
      // Setup slow async datamuse
      mockDatamuse.lookup.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  synonyms: createMockSynonymResults("datamuse"),
                  relatedWords: [],
                }),
              100
            )
          )
      );
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getMissingTypes.mockReturnValue(["synonym", "antonym"]);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      const handle = service.lookupStreaming("test", callbacks);
      handle.cancel();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 150));

      // onSourceComplete should not be called after cancel
      expect(callbacks.onSourceComplete).not.toHaveBeenCalledWith("datamuse", expect.any(Array));
    });

    it("should use cached results when available", async () => {
      const cachedResults = createMockSynonymResults("cached");
      mockCacheService.getService.mockImplementation((word: string, serviceId: string) => {
        if (serviceId === "local") return cachedResults;
        return null;
      });
      mockCacheService.getMissingTypes.mockReturnValue([]);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      service.lookupStreaming("test", callbacks);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callbacks.onSourceComplete).toHaveBeenCalledWith("local", cachedResults);
    });

    it("should call onAllComplete immediately if no sources enabled", async () => {
      const settings = createDefaultSettings();
      settings.sources = [];
      const service = new DataService(mockApp, "/test/plugin", settings);

      // Mock nspell as not loaded so spelling doesn't add pending count
      mockNSpell.isLoaded.mockReturnValue(false);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      service.lookupStreaming("test", callbacks);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callbacks.onAllComplete).toHaveBeenCalled();
    });

    it("should cache results from streaming lookup", async () => {
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getMissingTypes.mockReturnValue(["synonym", "antonym"]);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const callbacks: StreamingLookupCallbacks = {
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };

      service.lookupStreaming("test", callbacks);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCacheService.setService).toHaveBeenCalledWith(
        "test",
        "local",
        expect.any(Array),
        expect.any(Array),
        "en"
      );
    });
  });

  describe("getQuickReplaceSuggestions", () => {
    it("should return spelling corrections for misspelled words", async () => {
      mockNSpell.isCorrect.mockReturnValue(false);
      mockSpellingService.getSuggestions.mockResolvedValue(
        createMockSynonymResults("spelling", "spelling")
      );
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.getQuickReplaceSuggestions("tset");

      expect(result[0]?.type).toBe("spelling");
    });

    it("should limit spelling suggestions to 5", async () => {
      mockNSpell.isCorrect.mockReturnValue(false);
      const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
        word: `suggestion${i}`,
        type: "spelling" as const,
        source: "nspell" as const,
      }));
      mockSpellingService.getSuggestions.mockResolvedValue(manySuggestions);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.getQuickReplaceSuggestions("tset");

      expect(result.length).toBe(5);
    });

    it("should return synonyms for correctly spelled words", async () => {
      mockNSpell.isCorrect.mockReturnValue(true);
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getServiceForTypes.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.getQuickReplaceSuggestions("test", "synonym");

      // Should have looked up synonyms, not spelling
      expect(mockSpellingService.getSuggestions).not.toHaveBeenCalled();
    });

    it("should use cached spelling suggestions", async () => {
      const cachedSpelling = createMockSynonymResults("cached-spelling", "spelling");
      mockNSpell.isCorrect.mockReturnValue(false);
      mockCacheService.getService.mockImplementation((word: string, serviceId: string) => {
        if (serviceId === "spelling") return cachedSpelling;
        return null;
      });

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.getQuickReplaceSuggestions("tset");

      expect(result).toEqual(cachedSpelling.slice(0, 5));
      expect(mockSpellingService.getSuggestions).not.toHaveBeenCalled();
    });

    it("should return antonyms when requested", async () => {
      mockNSpell.isCorrect.mockReturnValue(true);
      mockDatamuse.lookup.mockResolvedValue({
        synonyms: [],
        relatedWords: [{ word: "antonym1", type: "antonym", source: "datamuse" }],
      });
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getServiceForTypes.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.getQuickReplaceSuggestions("test", "antonym");

      expect(mockDatamuse.lookup).toHaveBeenCalledWith("test", ["antonym"], "en");
    });

    it("should return empty array when no enabled sources", async () => {
      mockNSpell.isCorrect.mockReturnValue(true);

      const settings = createDefaultSettings();
      settings.sources = [];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.getQuickReplaceSuggestions("test");

      expect(result).toEqual([]);
    });

    it("should skip sources that do not support requested type", async () => {
      mockNSpell.isCorrect.mockReturnValue(true);
      mockCacheService.getServiceForTypes.mockReturnValue(null);

      // Local only supports synonym and related, not hypernym
      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.getQuickReplaceSuggestions("test", "hypernym");

      // Local doesn't support hypernym, so should return empty
      expect(result).toEqual([]);
    });
  });

  describe("getEnabledTabMetadata", () => {
    it("should return metadata for all enabled tabs", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("test");

      expect(tabs).toContainEqual({ id: "local", label: "Local", iconId: "local" });
      expect(tabs).toContainEqual({ id: "datamuse", label: "Datamuse", iconId: "datamuse" });
    });

    it("should include spelling tab for misspelled words", () => {
      mockNSpell.isCorrect.mockReturnValue(false);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("tset");

      expect(tabs[0]).toEqual({ id: "spelling", label: "Spelling", iconId: "spelling" });
    });

    it("should not include spelling tab for correctly spelled words", () => {
      mockNSpell.isCorrect.mockReturnValue(true);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("test");

      expect(tabs.find((t) => t.id === "spelling")).toBeUndefined();
    });

    it("should not include spelling tab if nspell not loaded", () => {
      mockNSpell.isLoaded.mockReturnValue(false);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("tset");

      expect(tabs.find((t) => t.id === "spelling")).toBeUndefined();
    });

    it("should include API service tabs", () => {
      const settings = createDefaultSettings();
      settings.sources.push({
        kind: "api",
        id: "mw-123",
        config: {
          id: "mw-123",
          type: "merriam-webster",
          apiKey: "test-key",
          enabled: true,
        },
      });
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("test");

      expect(tabs).toContainEqual({
        id: "mw-123",
        label: "Merriam-Webster",
        iconId: "merriam-webster",
      });
    });

    it("should not include disabled sources", () => {
      const settings = createDefaultSettings();
      settings.sources = [
        { kind: "builtin", id: "local", enabled: false },
        { kind: "builtin", id: "datamuse", enabled: true },
      ];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const tabs = service.getEnabledTabMetadata("test");

      expect(tabs.find((t) => t.id === "local")).toBeUndefined();
      expect(tabs.find((t) => t.id === "datamuse")).toBeDefined();
    });
  });

  describe("updateSettings", () => {
    it("should update datamuse max results", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const newSettings = { ...settings, maxResults: 25 };
      service.updateSettings(newSettings);

      expect(mockDatamuse.setMaxResults).toHaveBeenCalledWith(25);
    });

    it("should update cache max size", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const newSettings = { ...settings, maxCacheSize: 50 };
      service.updateSettings(newSettings);

      expect(mockCacheService.setMaxSize).toHaveBeenCalledWith(50);
    });

    it("should update spelling service settings", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const newSettings = { ...settings, offlineSpellingOnly: true };
      service.updateSettings(newSettings);

      expect(mockSpellingService.updateSettings).toHaveBeenCalledWith(newSettings);
    });

    it("should reinitialize API services when sources change", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      // Clear the initial call count
      mockedCreateAPIService.mockClear();

      const newSettings = { ...settings };
      newSettings.sources = [
        ...settings.sources,
        {
          kind: "api" as const,
          id: "new-api",
          config: {
            id: "new-api",
            type: "free-dictionary" as const,
            apiKey: "",
            enabled: true,
          },
        },
      ];
      service.updateSettings(newSettings);

      expect(mockedCreateAPIService).toHaveBeenCalledWith({
        id: "new-api",
        type: "free-dictionary",
        apiKey: "",
        enabled: true,
      });
    });
  });

  describe("fetchAdditionalTypes", () => {
    it("should fetch additional relationship types", async () => {
      mockCacheService.getMissingTypes.mockReturnValue(["hypernym"]);
      mockCacheService.getService.mockReturnValue(null);
      mockDatamuse.lookup.mockResolvedValue({
        synonyms: [],
        relatedWords: [{ word: "hypernym1", type: "hypernym", source: "datamuse" }],
      });

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const results = await service.fetchAdditionalTypes("test", ["hypernym"]);

      expect(mockDatamuse.lookup).toHaveBeenCalledWith("test", ["hypernym"], "en");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should use cached results when available", async () => {
      const cachedResults = [{ word: "hypernym1", type: "hypernym", source: "datamuse" }];
      mockCacheService.getMissingTypes.mockReturnValue([]);
      mockCacheService.getServiceForTypes.mockReturnValue(cachedResults as SynonymResult[]);
      mockCacheService.getService.mockReturnValue(cachedResults as SynonymResult[]);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const results = await service.fetchAdditionalTypes("test", ["hypernym"]);

      expect(mockDatamuse.lookup).not.toHaveBeenCalled();
      expect(results).toEqual(cachedResults);
    });

    it("should call onSourceUpdate callback when provided", async () => {
      mockCacheService.getMissingTypes.mockReturnValue(["hypernym"]);
      mockCacheService.getService.mockReturnValue([
        { word: "hypernym1", type: "hypernym", source: "datamuse" },
      ] as SynonymResult[]);
      mockDatamuse.lookup.mockResolvedValue({
        synonyms: [],
        relatedWords: [{ word: "hypernym1", type: "hypernym", source: "datamuse" }],
      });

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const onSourceUpdate = jest.fn();
      await service.fetchAdditionalTypes("test", ["hypernym"], onSourceUpdate);

      expect(onSourceUpdate).toHaveBeenCalledWith("datamuse", expect.any(Array));
    });

    it("should deduplicate results across sources", async () => {
      mockCacheService.getMissingTypes.mockReturnValue(["hypernym"]);
      mockCacheService.getService.mockReturnValue(null);
      mockDatamuse.lookup.mockResolvedValue({
        synonyms: [],
        relatedWords: [
          { word: "duplicate", type: "hypernym", source: "datamuse" },
          { word: "duplicate", type: "hypernym", source: "datamuse" },
        ],
      });

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "datamuse", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const results = await service.fetchAdditionalTypes("test", ["hypernym"]);

      const duplicates = results.filter((r) => r.word === "duplicate");
      expect(duplicates.length).toBe(1);
    });
  });

  describe("getAvailableRelationshipTypes", () => {
    it("should return types from all enabled sources", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const types = service.getAvailableRelationshipTypes();

      // Local: synonym, related
      // Datamuse: synonym, antonym, related, hypernym, hyponym
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
      expect(types).toContain("related");
      expect(types).toContain("hypernym");
      expect(types).toContain("hyponym");
    });

    it("should return types in canonical order", () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const types = service.getAvailableRelationshipTypes();

      // Order should be: synonym, antonym, related, hypernym, hyponym
      expect(types[0]).toBe("synonym");
      expect(types[1]).toBe("antonym");
      expect(types[2]).toBe("related");
    });

    it("should return empty array when no sources enabled", () => {
      const settings = createDefaultSettings();
      settings.sources = [];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const types = service.getAvailableRelationshipTypes();

      expect(types).toEqual([]);
    });

    it("should only return types from enabled sources", () => {
      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const types = service.getAvailableRelationshipTypes();

      // Local only supports synonym and related
      expect(types).toContain("synonym");
      expect(types).toContain("related");
      expect(types).not.toContain("antonym");
      expect(types).not.toContain("hypernym");
      expect(types).not.toContain("hyponym");
    });
  });

  describe("edge cases", () => {
    it("should handle empty word input", async () => {
      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("");

      expect(result.originalWord).toBe("");
    });

    it("should handle special characters in word", async () => {
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test-word");

      expect(mockWordNet.lookup).toHaveBeenCalledWith("test-word");
    });

    it("should handle API service creation failure gracefully", () => {
      mockedCreateAPIService.mockImplementation(() => {
        throw new Error("Failed to create service");
      });

      const settings = createDefaultSettings();
      settings.sources.push({
        kind: "api",
        id: "failing-api",
        config: {
          id: "failing-api",
          type: "free-dictionary",
          apiKey: "",
          enabled: true,
        },
      });

      // Should not throw
      expect(() => new DataService(mockApp, "/test/plugin", settings)).not.toThrow();
    });

    it("should handle API service lookup failure gracefully", async () => {
      const mockApiService = {
        id: "test-api",
        name: "Test API",
        description: "Test",
        lookup: jest.fn().mockRejectedValue(new Error("API error")),
        validate: jest.fn().mockResolvedValue({ valid: true }),
        supportedTypes: jest.fn().mockReturnValue(["synonym"]),
      };
      mockedCreateAPIService.mockReturnValue(mockApiService);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [
        {
          kind: "api",
          id: "test-api",
          config: {
            id: "test-api",
            type: "free-dictionary",
            apiKey: "",
            enabled: true,
          },
        },
      ];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      // Should return empty results, not throw
      expect(result.results["test-api"]).toEqual([]);
    });

    it("should handle WordNet not loaded", async () => {
      mockWordNet.isLoaded.mockReturnValue(false);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockWordNet.lookup).not.toHaveBeenCalled();
    });

    it("should handle Moby not loaded", async () => {
      mockMoby.isLoaded.mockReturnValue(false);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      await service.lookup("test");

      expect(mockMoby.lookup).not.toHaveBeenCalled();
    });

    it("should handle concurrent lookups correctly", async () => {
      mockCacheService.getService.mockReturnValue(null);
      mockCacheService.getMissingTypes.mockReturnValue(["synonym"]);

      const settings = createDefaultSettings();
      const service = new DataService(mockApp, "/test/plugin", settings);

      // Start multiple concurrent lookups
      const promises = [
        service.lookup("test1"),
        service.lookup("test2"),
        service.lookup("test3"),
      ];

      const results = await Promise.all(promises);

      expect(results[0].originalWord).toBe("test1");
      expect(results[1].originalWord).toBe("test2");
      expect(results[2].originalWord).toBe("test3");
    });

    it("should handle maxResults of 0 (unlimited)", async () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i}`,
        type: "synonym" as const,
        source: "wordnet" as const,
      }));
      mockWordNet.lookup.mockReturnValue(manyResults);
      mockMoby.lookup.mockReturnValue([]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.maxResults = 0;
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("test");

      // When maxResults is 0, all results should be returned
      expect(result.results["local"]?.length).toBe(100);
    });

    it("should handle case-insensitive deduplication", async () => {
      mockWordNet.lookup.mockReturnValue([
        { word: "Test", type: "synonym", source: "wordnet" },
      ]);
      mockMoby.lookup.mockReturnValue([
        { word: "test", type: "related", source: "moby" },
        { word: "TEST", type: "related", source: "moby" },
      ]);
      mockCacheService.getService.mockReturnValue(null);

      const settings = createDefaultSettings();
      settings.sources = [{ kind: "builtin", id: "local", enabled: true }];
      const service = new DataService(mockApp, "/test/plugin", settings);

      const result = await service.lookup("example");

      // Should deduplicate case-insensitively
      const words = result.results["local"]?.map((r) => r.word.toLowerCase()) || [];
      expect(words.filter((w) => w === "test").length).toBe(1);
    });
  });
});
