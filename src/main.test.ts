/**
 * Unit tests for the main WordsmithPlugin class.
 */

import { App, Editor, Notice, PluginManifest } from "obsidian";
import WordsmithPlugin from "./main";
import { DEFAULT_SETTINGS, WordsmithSettings, LookupCache } from "./types/types";

// Mock Notice
jest.mock("obsidian", () => {
  const actual = jest.requireActual("../__mocks__/obsidian.ts");
  return {
    ...actual,
    Notice: jest.fn(),
  };
});

// Mock DataService
jest.mock("./services/DataService", () => ({
  DataService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    updateSettings: jest.fn(),
    getEnabledTabMetadata: jest.fn().mockReturnValue([
      { id: "local", label: "Local", iconId: "local" },
    ]),
    lookupStreaming: jest.fn().mockReturnValue({ cancel: jest.fn() }),
    resolveLanguage: jest.fn().mockReturnValue({ code: "en", source: "settings" }),
    hasServicesForLanguage: jest.fn().mockReturnValue(true),
    cacheService: {
      toCache: jest.fn().mockReturnValue({ entries: {}, version: 1 }),
    },
    getAvailableRelationshipTypes: jest.fn().mockReturnValue(["synonym", "antonym"]),
  })),
}));

// Mock SynonymModal
jest.mock("./components/SynonymModal", () => ({
  SynonymModal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    onClose: jest.fn(),
    onSourceComplete: jest.fn(),
    onAllComplete: jest.fn(),
  })),
}));

// Mock SynonymSettingsTab
jest.mock("./components/SynonymSettingsTab", () => ({
  SynonymSettingsTab: jest.fn().mockImplementation(() => ({})),
}));

// Mock QuickReplaceSuggest
jest.mock("./components/QuickReplaceSuggest", () => ({
  QuickReplaceSuggest: jest.fn().mockImplementation(() => ({
    triggerForWord: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock wordExtractor
jest.mock("./utils/wordExtractor", () => ({
  getWordUnderCursor: jest.fn(),
  replaceWord: jest.fn(),
}));

import { DataService } from "./services/DataService";
import { SynonymModal } from "./components/SynonymModal";
import { SynonymSettingsTab } from "./components/SynonymSettingsTab";
import { QuickReplaceSuggest } from "./components/QuickReplaceSuggest";
import { getWordUnderCursor } from "./utils/wordExtractor";

function createMockApp(): App {
  return {
    workspace: {
      getActiveViewOfType: jest.fn().mockReturnValue(null),
    },
    vault: {
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
    },
  } as unknown as App;
}

function createMockManifest(): PluginManifest {
  return {
    id: "wordsmith",
    name: "Wordsmith",
    version: "1.0.0",
    dir: "/path/to/plugin",
  } as PluginManifest;
}

function createMockEditor(): Editor {
  return {
    getSelection: jest.fn().mockReturnValue(""),
    replaceSelection: jest.fn(),
    getCursor: jest.fn().mockReturnValue({ line: 0, ch: 5 }),
    getLine: jest.fn().mockReturnValue("hello world"),
    lineCount: jest.fn().mockReturnValue(5),
  } as unknown as Editor;
}

describe("WordsmithPlugin", () => {
  let plugin: WordsmithPlugin;
  let mockApp: App;
  let mockManifest: PluginManifest;
  let loadDataMock: jest.Mock;
  let saveDataMock: jest.Mock;
  let addCommandMock: jest.Mock;
  let addSettingTabMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApp = createMockApp();
    mockManifest = createMockManifest();

    // Create plugin and set up mocks
    plugin = new WordsmithPlugin(mockApp, mockManifest);

    loadDataMock = jest.fn().mockResolvedValue(null);
    saveDataMock = jest.fn().mockResolvedValue(undefined);
    addCommandMock = jest.fn().mockImplementation((cmd) => cmd);
    addSettingTabMock = jest.fn();

    plugin.loadData = loadDataMock;
    plugin.saveData = saveDataMock;
    plugin.addCommand = addCommandMock;
    plugin.addSettingTab = addSettingTabMock;
  });

  describe("loadSettings", () => {
    describe("fresh install (no data)", () => {
      it("should use default settings when loadData returns null", async () => {
        loadDataMock.mockResolvedValue(null);

        await plugin.loadSettings();

        expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
      });

      it("should use default settings when loadData returns undefined", async () => {
        loadDataMock.mockResolvedValue(undefined);

        await plugin.loadSettings();

        expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
      });

      it("should not save data when using defaults", async () => {
        loadDataMock.mockResolvedValue(null);

        await plugin.loadSettings();

        expect(saveDataMock).not.toHaveBeenCalled();
      });
    });

    describe("old settings format migration", () => {
      it("should migrate old settings format to new format", async () => {
        const oldSettings = {
          maxResults: 30,
          sources: [
            { id: "local", enabled: true },
            { id: "datamuse", enabled: false },
          ],
          wordNetDownloaded: true,
          mobyDownloaded: true,
        };

        loadDataMock.mockResolvedValue(oldSettings);

        await plugin.loadSettings();

        // Verify migration
        expect(plugin.settings.maxResults).toBe(30);
        expect(plugin.settings.sources).toEqual([
          { kind: "builtin", id: "local", enabled: true },
          { kind: "builtin", id: "datamuse", enabled: false },
        ]);
        expect(plugin.settings.wordNetDownloaded).toBe(true);
        expect(plugin.settings.mobyDownloaded).toBe(true);
        // New fields should use defaults
        expect(plugin.settings.nspellDownloaded).toBe(DEFAULT_SETTINGS.nspellDownloaded);
        expect(plugin.settings.offlineSpellingOnly).toBe(DEFAULT_SETTINGS.offlineSpellingOnly);
        expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
        expect(plugin.settings.lookupCache).toEqual({ entries: {}, version: 1 });
      });

      it("should save migrated settings", async () => {
        const oldSettings = {
          maxResults: 50,
          sources: [{ id: "local", enabled: true }],
          wordNetDownloaded: false,
          mobyDownloaded: false,
        };

        loadDataMock.mockResolvedValue(oldSettings);

        await plugin.loadSettings();

        expect(saveDataMock).toHaveBeenCalledWith(expect.objectContaining({
          sources: [{ kind: "builtin", id: "local", enabled: true }],
        }));
      });
    });

    describe("new settings format", () => {
      it("should load new settings format correctly", async () => {
        const newSettings: WordsmithSettings = {
          maxResults: 75,
          sources: [
            { kind: "builtin", id: "local", enabled: true },
            { kind: "builtin", id: "datamuse", enabled: true },
          ],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          nspellDownloaded: true,
          offlineSpellingOnly: true,
          maxCacheSize: 200,
          lookupCache: { entries: {}, version: 1 },
          language: "default",
          fallbackLanguage: "en",
          frontmatterProperty: "lang",
          omwDownloaded: {},
        };

        loadDataMock.mockResolvedValue(newSettings);

        await plugin.loadSettings();

        expect(plugin.settings).toEqual(newSettings);
        expect(saveDataMock).not.toHaveBeenCalled();
      });

      it("should merge with defaults for missing fields", async () => {
        const partialSettings = {
          maxResults: 25,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: false,
          nspellDownloaded: true,
          offlineSpellingOnly: false,
          maxCacheSize: 50,
          lookupCache: { entries: {}, version: 1 },
        };

        loadDataMock.mockResolvedValue(partialSettings);

        await plugin.loadSettings();

        expect(plugin.settings.maxResults).toBe(25);
        expect(plugin.settings.maxCacheSize).toBe(50);
      });
    });

    describe("cache migration", () => {
      it("should add cache fields when missing", async () => {
        const settingsWithoutCache = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          nspellDownloaded: true,
          offlineSpellingOnly: false,
          // Missing: maxCacheSize and lookupCache
        };

        loadDataMock.mockResolvedValue(settingsWithoutCache);

        await plugin.loadSettings();

        expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
        expect(plugin.settings.lookupCache).toEqual({ entries: {}, version: 1 });
        expect(saveDataMock).toHaveBeenCalled();
      });

      it("should detect cache migration when maxCacheSize is missing", async () => {
        const settings = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          nspellDownloaded: true,
          offlineSpellingOnly: false,
          // maxCacheSize missing
          lookupCache: { entries: {}, version: 1 },
        };

        loadDataMock.mockResolvedValue(settings);

        await plugin.loadSettings();

        expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
      });

      it("should detect cache migration when lookupCache is missing", async () => {
        const settings = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          nspellDownloaded: true,
          offlineSpellingOnly: false,
          maxCacheSize: 100,
          // lookupCache missing
        };

        loadDataMock.mockResolvedValue(settings);

        await plugin.loadSettings();

        expect(plugin.settings.lookupCache).toEqual({ entries: {}, version: 1 });
      });
    });

    describe("spelling migration", () => {
      it("should add spelling fields when missing", async () => {
        const settingsWithoutSpelling = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          maxCacheSize: 100,
          lookupCache: { entries: {}, version: 1 },
          // Missing: nspellDownloaded and offlineSpellingOnly
        };

        loadDataMock.mockResolvedValue(settingsWithoutSpelling);

        await plugin.loadSettings();

        expect(plugin.settings.nspellDownloaded).toBe(DEFAULT_SETTINGS.nspellDownloaded);
        expect(plugin.settings.offlineSpellingOnly).toBe(DEFAULT_SETTINGS.offlineSpellingOnly);
        expect(saveDataMock).toHaveBeenCalled();
      });

      it("should detect spelling migration when nspellDownloaded is missing", async () => {
        const settings = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          maxCacheSize: 100,
          lookupCache: { entries: {}, version: 1 },
          // nspellDownloaded missing
          offlineSpellingOnly: false,
        };

        loadDataMock.mockResolvedValue(settings);

        await plugin.loadSettings();

        expect(plugin.settings.nspellDownloaded).toBe(DEFAULT_SETTINGS.nspellDownloaded);
      });

      it("should detect spelling migration when offlineSpellingOnly is missing", async () => {
        const settings = {
          maxResults: 50,
          sources: [{ kind: "builtin", id: "local", enabled: true }],
          wordNetDownloaded: true,
          mobyDownloaded: true,
          maxCacheSize: 100,
          lookupCache: { entries: {}, version: 1 },
          nspellDownloaded: true,
          // offlineSpellingOnly missing
        };

        loadDataMock.mockResolvedValue(settings);

        await plugin.loadSettings();

        expect(plugin.settings.offlineSpellingOnly).toBe(DEFAULT_SETTINGS.offlineSpellingOnly);
      });
    });
  });

  describe("saveSettings", () => {
    beforeEach(async () => {
      loadDataMock.mockResolvedValue(null);
      await plugin.onload();
    });

    it("should save settings via saveData", async () => {
      await plugin.saveSettings();

      expect(saveDataMock).toHaveBeenCalledWith(plugin.settings);
    });

    it("should update dataService with new settings", async () => {
      await plugin.saveSettings();

      expect(plugin.dataService.updateSettings).toHaveBeenCalledWith(plugin.settings);
    });

    it("should persist cache data from CacheService", async () => {
      const mockCache: LookupCache = {
        entries: { test: { word: "test", services: {}, lastAccessed: Date.now() } },
        version: 1,
      };
      (plugin.dataService.cacheService.toCache as jest.Mock).mockReturnValue(mockCache);

      await plugin.saveSettings();

      expect(plugin.settings.lookupCache).toEqual(mockCache);
      expect(saveDataMock).toHaveBeenCalledWith(expect.objectContaining({
        lookupCache: mockCache,
      }));
    });
  });

  describe("onload", () => {
    beforeEach(() => {
      loadDataMock.mockResolvedValue(null);
    });

    it("should load settings", async () => {
      const loadSettingsSpy = jest.spyOn(plugin, "loadSettings");

      await plugin.onload();

      expect(loadSettingsSpy).toHaveBeenCalled();
    });

    it("should initialize DataService", async () => {
      await plugin.onload();

      expect(DataService).toHaveBeenCalledWith(
        mockApp,
        mockManifest.dir,
        plugin.settings
      );
      expect(plugin.dataService.initialize).toHaveBeenCalled();
    });

    it("should register settings tab", async () => {
      await plugin.onload();

      expect(SynonymSettingsTab).toHaveBeenCalledWith(mockApp, plugin);
      expect(addSettingTabMock).toHaveBeenCalled();
    });

    describe("command registration", () => {
      it("should register find-synonyms command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "find-synonyms",
            name: "Find synonyms for word under cursor",
          })
        );
      });

      it("should register find-antonyms command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "find-antonyms",
            name: "Find antonyms for word under cursor",
          })
        );
      });

      it("should register find-related command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "find-related",
            name: "Find related words for word under cursor",
          })
        );
      });

      it("should register find-hypernyms command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "find-hypernyms",
            name: "Find hypernyms (more general) for word under cursor",
          })
        );
      });

      it("should register find-hyponyms command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "find-hyponyms",
            name: "Find hyponyms (more specific) for word under cursor",
          })
        );
      });

      it("should register quick-replace-synonym command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "quick-replace-synonym",
            name: "Quick replace - synonym",
          })
        );
      });

      it("should register quick-replace-antonym command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "quick-replace-antonym",
            name: "Quick replace - antonym",
          })
        );
      });

      it("should register legacy quick-replace command", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "quick-replace",
            name: "Quick replace - show replacement options",
          })
        );
      });

      it("should register 8 total commands", async () => {
        await plugin.onload();

        expect(addCommandMock).toHaveBeenCalledTimes(8);
      });
    });
  });

  describe("onunload", () => {
    it("should clean up resources", async () => {
      loadDataMock.mockResolvedValue(null);
      await plugin.onload();

      // onunload should not throw
      expect(() => plugin.onunload()).not.toThrow();
    });
  });

  describe("findWords", () => {
    let mockEditor: Editor;
    let synonymCommand: { editorCallback: (editor: Editor, ctx: unknown) => void };

    beforeEach(async () => {
      loadDataMock.mockResolvedValue(null);
      await plugin.onload();
      mockEditor = createMockEditor();

      // Get the synonym command that was registered
      synonymCommand = addCommandMock.mock.calls.find(
        (call: unknown[]) => (call[0] as { id: string }).id === "find-synonyms"
      )?.[0] as { editorCallback: (editor: Editor, ctx: unknown) => void };
    });

    it("should show notice when no word is found under cursor", () => {
      (getWordUnderCursor as jest.Mock).mockReturnValue(null);

      synonymCommand.editorCallback(mockEditor, null);

      expect(Notice).toHaveBeenCalledWith("No word found under cursor");
    });

    it("should show notice when no sources are enabled", () => {
      (getWordUnderCursor as jest.Mock).mockReturnValue({
        word: "hello",
        range: { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } },
        editor: mockEditor,
      });
      (plugin.dataService.getEnabledTabMetadata as jest.Mock).mockReturnValue([]);

      synonymCommand.editorCallback(mockEditor, null);

      expect(Notice).toHaveBeenCalledWith("No sources enabled");
    });

    it("should open SynonymModal with correct parameters", () => {
      const wordRange = { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } };
      const tabMetadata = [{ id: "local", label: "Local", iconId: "local" }];

      (getWordUnderCursor as jest.Mock).mockReturnValue({
        word: "hello",
        range: wordRange,
        editor: mockEditor,
      });
      (plugin.dataService.getEnabledTabMetadata as jest.Mock).mockReturnValue(tabMetadata);

      synonymCommand.editorCallback(mockEditor, null);

      expect(SynonymModal).toHaveBeenCalledWith(
        plugin,
        "hello",
        wordRange,
        tabMetadata,
        "synonym",
        "en",
        "settings"
      );
    });

    it("should call lookupStreaming with correct initial types for synonym", () => {
      const wordRange = { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } };

      (getWordUnderCursor as jest.Mock).mockReturnValue({
        word: "hello",
        range: wordRange,
        editor: mockEditor,
      });
      (plugin.dataService.getEnabledTabMetadata as jest.Mock).mockReturnValue([
        { id: "local", label: "Local", iconId: "local" },
      ]);

      synonymCommand.editorCallback(mockEditor, null);

      expect(plugin.dataService.lookupStreaming).toHaveBeenCalledWith(
        "hello",
        expect.any(Object),
        ["synonym", "antonym"],
        "en"
      );
    });

    it("should pass hypernym type when hypernym command is used", () => {
      const hypernymsCommand = addCommandMock.mock.calls.find(
        (call: unknown[]) => (call[0] as { id: string }).id === "find-hypernyms"
      )?.[0] as { editorCallback: (editor: Editor, ctx: unknown) => void };

      const wordRange = { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } };

      (getWordUnderCursor as jest.Mock).mockReturnValue({
        word: "animal",
        range: wordRange,
        editor: mockEditor,
      });
      (plugin.dataService.getEnabledTabMetadata as jest.Mock).mockReturnValue([
        { id: "local", label: "Local", iconId: "local" },
      ]);

      hypernymsCommand.editorCallback(mockEditor, null);

      // Should include hypernym in initial types
      expect(plugin.dataService.lookupStreaming).toHaveBeenCalledWith(
        "animal",
        expect.any(Object),
        ["synonym", "antonym", "hypernym"],
        "en"
      );
    });

    it("should open modal immediately before lookup completes", () => {
      const wordRange = { from: { line: 0, ch: 0 }, to: { line: 0, ch: 5 } };
      const mockModal = {
        open: jest.fn(),
        onClose: jest.fn(),
        onSourceComplete: jest.fn(),
        onAllComplete: jest.fn(),
      };
      (SynonymModal as jest.Mock).mockReturnValue(mockModal);

      (getWordUnderCursor as jest.Mock).mockReturnValue({
        word: "hello",
        range: wordRange,
        editor: mockEditor,
      });
      (plugin.dataService.getEnabledTabMetadata as jest.Mock).mockReturnValue([
        { id: "local", label: "Local", iconId: "local" },
      ]);

      synonymCommand.editorCallback(mockEditor, null);

      expect(mockModal.open).toHaveBeenCalled();
    });
  });

  describe("isOldSettings detection", () => {
    it("should identify old settings format without kind property", async () => {
      const oldSettings = {
        maxResults: 50,
        sources: [{ id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      // Migrated settings should have 'kind' property
      expect(plugin.settings.sources[0]).toHaveProperty("kind", "builtin");
    });

    it("should not migrate settings that already have kind property", async () => {
      const newSettings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: true,
        offlineSpellingOnly: false,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
        language: "default" as const,
        fallbackLanguage: "en" as const,
        frontmatterProperty: "lang",
        omwDownloaded: {},
      };

      loadDataMock.mockResolvedValue(newSettings);

      await plugin.loadSettings();

      // Should not have called saveData for migration
      expect(saveDataMock).not.toHaveBeenCalled();
    });

    it("should return false for empty sources array and merge with loaded data", async () => {
      const invalidSettings = {
        maxResults: 50,
        sources: [],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: false,
        offlineSpellingOnly: false,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
      };

      loadDataMock.mockResolvedValue(invalidSettings);

      await plugin.loadSettings();

      // Empty sources array is not detected as old settings (fails isOldSettings check)
      // so it falls through to Object.assign branch, keeping the empty array
      expect(plugin.settings.sources).toEqual([]);
      // But maxResults should be preserved from loaded data
      expect(plugin.settings.maxResults).toBe(50);
    });

    it("should return false for null data", async () => {
      loadDataMock.mockResolvedValue(null);

      await plugin.loadSettings();

      expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
    });

    it("should return false for non-object data", async () => {
      loadDataMock.mockResolvedValue("string");

      await plugin.loadSettings();

      expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("needsCacheMigration detection", () => {
    it("should detect when maxCacheSize is undefined", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: true,
        offlineSpellingOnly: false,
        lookupCache: { entries: {}, version: 1 },
        // maxCacheSize is undefined
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).toHaveBeenCalled();
      expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
    });

    it("should detect when lookupCache is undefined", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: true,
        offlineSpellingOnly: false,
        maxCacheSize: 100,
        // lookupCache is undefined
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).toHaveBeenCalled();
      expect(plugin.settings.lookupCache).toEqual({ entries: {}, version: 1 });
    });

    it("should not migrate when cache fields are present", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: true,
        offlineSpellingOnly: false,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
        language: "default" as const,
        fallbackLanguage: "en" as const,
        frontmatterProperty: "lang",
        omwDownloaded: {},
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).not.toHaveBeenCalled();
    });
  });

  describe("needsSpellingMigration detection", () => {
    it("should detect when nspellDownloaded is undefined", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
        offlineSpellingOnly: false,
        // nspellDownloaded is undefined
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).toHaveBeenCalled();
      expect(plugin.settings.nspellDownloaded).toBe(DEFAULT_SETTINGS.nspellDownloaded);
    });

    it("should detect when offlineSpellingOnly is undefined", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
        nspellDownloaded: true,
        // offlineSpellingOnly is undefined
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).toHaveBeenCalled();
      expect(plugin.settings.offlineSpellingOnly).toBe(DEFAULT_SETTINGS.offlineSpellingOnly);
    });

    it("should not migrate when spelling fields are present", async () => {
      const settings = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        nspellDownloaded: true,
        offlineSpellingOnly: false,
        maxCacheSize: 100,
        lookupCache: { entries: {}, version: 1 },
        language: "default" as const,
        fallbackLanguage: "en" as const,
        frontmatterProperty: "lang",
        omwDownloaded: {},
      };

      loadDataMock.mockResolvedValue(settings);

      await plugin.loadSettings();

      expect(saveDataMock).not.toHaveBeenCalled();
    });
  });

  describe("migrateSettings", () => {
    it("should preserve original maxResults", async () => {
      const oldSettings = {
        maxResults: 42,
        sources: [{ id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      expect(plugin.settings.maxResults).toBe(42);
    });

    it("should preserve enabled/disabled state of sources", async () => {
      const oldSettings = {
        maxResults: 50,
        sources: [
          { id: "local", enabled: false },
          { id: "datamuse", enabled: true },
        ],
        wordNetDownloaded: true,
        mobyDownloaded: true,
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      expect(plugin.settings.sources[0]).toEqual({
        kind: "builtin",
        id: "local",
        enabled: false,
      });
      expect(plugin.settings.sources[1]).toEqual({
        kind: "builtin",
        id: "datamuse",
        enabled: true,
      });
    });

    it("should preserve wordNetDownloaded and mobyDownloaded", async () => {
      const oldSettings = {
        maxResults: 50,
        sources: [{ id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: false,
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      expect(plugin.settings.wordNetDownloaded).toBe(true);
      expect(plugin.settings.mobyDownloaded).toBe(false);
    });

    it("should initialize new cache fields", async () => {
      const oldSettings = {
        maxResults: 50,
        sources: [{ id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      expect(plugin.settings.lookupCache).toEqual({ entries: {}, version: 1 });
      expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
    });
  });

  describe("QuickReplace commands", () => {
    let quickReplaceSynonymCommand: { editorCallback: (editor: Editor) => void };
    let quickReplaceAntonymCommand: { editorCallback: (editor: Editor) => void };
    let quickReplaceCommand: { editorCallback: (editor: Editor) => void };
    let mockEditor: Editor;

    beforeEach(async () => {
      loadDataMock.mockResolvedValue(null);
      await plugin.onload();
      mockEditor = createMockEditor();

      quickReplaceSynonymCommand = addCommandMock.mock.calls.find(
        (call: unknown[]) => (call[0] as { id: string }).id === "quick-replace-synonym"
      )?.[0] as { editorCallback: (editor: Editor) => void };

      quickReplaceAntonymCommand = addCommandMock.mock.calls.find(
        (call: unknown[]) => (call[0] as { id: string }).id === "quick-replace-antonym"
      )?.[0] as { editorCallback: (editor: Editor) => void };

      quickReplaceCommand = addCommandMock.mock.calls.find(
        (call: unknown[]) => (call[0] as { id: string }).id === "quick-replace"
      )?.[0] as { editorCallback: (editor: Editor) => void };
    });

    it("should instantiate QuickReplaceSuggest", async () => {
      expect(QuickReplaceSuggest).toHaveBeenCalledWith(mockApp, plugin.dataService);
    });

    it("should trigger synonym quick replace", () => {
      const mockQuickReplace = (QuickReplaceSuggest as jest.Mock).mock.results[0].value;

      quickReplaceSynonymCommand.editorCallback(mockEditor);

      expect(mockQuickReplace.triggerForWord).toHaveBeenCalledWith(mockEditor, "synonym");
    });

    it("should trigger antonym quick replace", () => {
      const mockQuickReplace = (QuickReplaceSuggest as jest.Mock).mock.results[0].value;

      quickReplaceAntonymCommand.editorCallback(mockEditor);

      expect(mockQuickReplace.triggerForWord).toHaveBeenCalledWith(mockEditor, "antonym");
    });

    it("should default legacy quick-replace to synonym", () => {
      const mockQuickReplace = (QuickReplaceSuggest as jest.Mock).mock.results[0].value;

      quickReplaceCommand.editorCallback(mockEditor);

      expect(mockQuickReplace.triggerForWord).toHaveBeenCalledWith(mockEditor, "synonym");
    });
  });

  describe("migration priority", () => {
    it("should prioritize old settings migration over cache migration", async () => {
      // This settings object looks like old format
      const oldSettings = {
        maxResults: 50,
        sources: [{ id: "local", enabled: true }], // no 'kind'
        wordNetDownloaded: true,
        mobyDownloaded: true,
        // no cache fields - but old settings migration takes priority
      };

      loadDataMock.mockResolvedValue(oldSettings);

      await plugin.loadSettings();

      // Should be migrated to new format with 'kind'
      expect(plugin.settings.sources[0]).toHaveProperty("kind", "builtin");
      // Should also have cache fields from migration
      expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
      expect(plugin.settings.lookupCache).toBeDefined();
    });

    it("should prioritize cache migration over spelling migration", async () => {
      const settingsWithCacheMissing = {
        maxResults: 50,
        sources: [{ kind: "builtin", id: "local", enabled: true }],
        wordNetDownloaded: true,
        mobyDownloaded: true,
        // No cache fields
        // No spelling fields
      };

      loadDataMock.mockResolvedValue(settingsWithCacheMissing);

      await plugin.loadSettings();

      // Cache migration should be called (saveData called once)
      expect(saveDataMock).toHaveBeenCalledTimes(1);
      expect(plugin.settings.maxCacheSize).toBe(DEFAULT_SETTINGS.maxCacheSize);
      // But spelling fields might not be added if cache migration was triggered first
      // (the actual implementation order matters)
    });
  });
});
