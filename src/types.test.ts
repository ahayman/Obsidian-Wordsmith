import {
  isBuiltinSource,
  isAPISource,
  isSourceEnabled,
  getSourceId,
  DEFAULT_SETTINGS,
  TAB_LABELS,
  TAB_DESCRIPTIONS,
  ALL_RELATIONSHIP_TYPES,
  SourceConfig,
  APIServiceConfig,
  BuiltinTabId,
} from "./types";

describe("types", () => {
  describe("isBuiltinSource type guard", () => {
    it("should return true for builtin source with 'local' id", () => {
      const source: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      expect(isBuiltinSource(source)).toBe(true);
    });

    it("should return true for builtin source with 'datamuse' id", () => {
      const source: SourceConfig = { kind: "builtin", id: "datamuse", enabled: false };
      expect(isBuiltinSource(source)).toBe(true);
    });

    it("should return false for API source", () => {
      const apiConfig: APIServiceConfig = {
        id: "uuid-123",
        type: "merriam-webster",
        apiKey: "test-key",
        enabled: true,
      };
      const source: SourceConfig = { kind: "api", id: "uuid-123", config: apiConfig };
      expect(isBuiltinSource(source)).toBe(false);
    });

    it("should narrow the type correctly when true", () => {
      const source: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      if (isBuiltinSource(source)) {
        // TypeScript should allow accessing these properties
        const id: BuiltinTabId = source.id;
        const enabled: boolean = source.enabled;
        expect(id).toBe("local");
        expect(enabled).toBe(true);
      }
    });
  });

  describe("isAPISource type guard", () => {
    it("should return true for API source", () => {
      const apiConfig: APIServiceConfig = {
        id: "uuid-123",
        type: "merriam-webster",
        apiKey: "test-key",
        enabled: true,
      };
      const source: SourceConfig = { kind: "api", id: "uuid-123", config: apiConfig };
      expect(isAPISource(source)).toBe(true);
    });

    it("should return false for builtin source", () => {
      const source: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      expect(isAPISource(source)).toBe(false);
    });

    it("should narrow the type correctly when true", () => {
      const apiConfig: APIServiceConfig = {
        id: "uuid-456",
        type: "words-api",
        apiKey: "api-key",
        enabled: false,
      };
      const source: SourceConfig = { kind: "api", id: "uuid-456", config: apiConfig };
      if (isAPISource(source)) {
        // TypeScript should allow accessing these properties
        const config: APIServiceConfig = source.config;
        expect(config.type).toBe("words-api");
        expect(config.apiKey).toBe("api-key");
      }
    });

    it("should work with different API service types", () => {
      const apiTypes = [
        "merriam-webster",
        "big-huge-thesaurus",
        "words-api",
        "api-ninjas",
        "altervista",
        "free-dictionary",
      ] as const;

      for (const apiType of apiTypes) {
        const apiConfig: APIServiceConfig = {
          id: `uuid-${apiType}`,
          type: apiType,
          apiKey: "",
          enabled: true,
        };
        const source: SourceConfig = { kind: "api", id: apiConfig.id, config: apiConfig };
        expect(isAPISource(source)).toBe(true);
      }
    });
  });

  describe("isSourceEnabled helper function", () => {
    it("should return enabled status for builtin source", () => {
      const enabledSource: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      const disabledSource: SourceConfig = { kind: "builtin", id: "datamuse", enabled: false };

      expect(isSourceEnabled(enabledSource)).toBe(true);
      expect(isSourceEnabled(disabledSource)).toBe(false);
    });

    it("should return config.enabled for API source", () => {
      const enabledApiConfig: APIServiceConfig = {
        id: "uuid-1",
        type: "merriam-webster",
        apiKey: "key",
        enabled: true,
      };
      const disabledApiConfig: APIServiceConfig = {
        id: "uuid-2",
        type: "words-api",
        apiKey: "key",
        enabled: false,
      };

      const enabledSource: SourceConfig = { kind: "api", id: "uuid-1", config: enabledApiConfig };
      const disabledSource: SourceConfig = { kind: "api", id: "uuid-2", config: disabledApiConfig };

      expect(isSourceEnabled(enabledSource)).toBe(true);
      expect(isSourceEnabled(disabledSource)).toBe(false);
    });
  });

  describe("getSourceId helper function", () => {
    it("should return id for builtin source", () => {
      const source: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      expect(getSourceId(source)).toBe("local");
    });

    it("should return id for API source", () => {
      const apiConfig: APIServiceConfig = {
        id: "uuid-custom",
        type: "free-dictionary",
        apiKey: "",
        enabled: true,
      };
      const source: SourceConfig = { kind: "api", id: "uuid-custom", config: apiConfig };
      expect(getSourceId(source)).toBe("uuid-custom");
    });
  });

  describe("DEFAULT_SETTINGS", () => {
    it("should have all required fields defined", () => {
      expect(DEFAULT_SETTINGS).toHaveProperty("maxResults");
      expect(DEFAULT_SETTINGS).toHaveProperty("sources");
      expect(DEFAULT_SETTINGS).toHaveProperty("wordNetDownloaded");
      expect(DEFAULT_SETTINGS).toHaveProperty("mobyDownloaded");
      expect(DEFAULT_SETTINGS).toHaveProperty("nspellDownloaded");
      expect(DEFAULT_SETTINGS).toHaveProperty("offlineSpellingOnly");
      expect(DEFAULT_SETTINGS).toHaveProperty("maxCacheSize");
      expect(DEFAULT_SETTINGS).toHaveProperty("lookupCache");
    });

    it("should have reasonable default values", () => {
      expect(DEFAULT_SETTINGS.maxResults).toBe(50);
      expect(DEFAULT_SETTINGS.maxCacheSize).toBe(100);
      expect(DEFAULT_SETTINGS.wordNetDownloaded).toBe(false);
      expect(DEFAULT_SETTINGS.mobyDownloaded).toBe(false);
      expect(DEFAULT_SETTINGS.nspellDownloaded).toBe(false);
      expect(DEFAULT_SETTINGS.offlineSpellingOnly).toBe(false);
    });

    it("should have default sources configured", () => {
      expect(DEFAULT_SETTINGS.sources).toHaveLength(2);
      expect(DEFAULT_SETTINGS.sources[0]).toEqual({
        kind: "builtin",
        id: "local",
        enabled: true,
      });
      expect(DEFAULT_SETTINGS.sources[1]).toEqual({
        kind: "builtin",
        id: "datamuse",
        enabled: true,
      });
    });

    it("should have empty lookup cache initialized", () => {
      expect(DEFAULT_SETTINGS.lookupCache).toEqual({
        entries: {},
        version: 1,
      });
    });

    it("should have lookup cache with version number", () => {
      expect(DEFAULT_SETTINGS.lookupCache.version).toBe(1);
    });
  });

  describe("TAB_LABELS", () => {
    it("should have labels for all builtin tab IDs", () => {
      expect(TAB_LABELS.local).toBe("Local");
      expect(TAB_LABELS.datamuse).toBe("Datamuse");
    });

    it("should have exactly 2 builtin tabs", () => {
      expect(Object.keys(TAB_LABELS)).toHaveLength(2);
    });
  });

  describe("TAB_DESCRIPTIONS", () => {
    it("should have descriptions for all builtin tab IDs", () => {
      expect(TAB_DESCRIPTIONS.local).toBe("WordNet and Moby thesaurus (offline)");
      expect(TAB_DESCRIPTIONS.datamuse).toBe("Datamuse API (online)");
    });

    it("should have exactly 2 builtin tab descriptions", () => {
      expect(Object.keys(TAB_DESCRIPTIONS)).toHaveLength(2);
    });
  });

  describe("ALL_RELATIONSHIP_TYPES", () => {
    it("should contain all relationship types", () => {
      expect(ALL_RELATIONSHIP_TYPES).toContain("synonym");
      expect(ALL_RELATIONSHIP_TYPES).toContain("antonym");
      expect(ALL_RELATIONSHIP_TYPES).toContain("related");
      expect(ALL_RELATIONSHIP_TYPES).toContain("hypernym");
      expect(ALL_RELATIONSHIP_TYPES).toContain("hyponym");
    });

    it("should have exactly 5 relationship types", () => {
      expect(ALL_RELATIONSHIP_TYPES).toHaveLength(5);
    });

    it("should be in the expected order", () => {
      expect(ALL_RELATIONSHIP_TYPES).toEqual([
        "synonym",
        "antonym",
        "related",
        "hypernym",
        "hyponym",
      ]);
    });
  });

  describe("type guards work together correctly", () => {
    it("should categorize mixed sources array correctly", () => {
      const apiConfig: APIServiceConfig = {
        id: "uuid-test",
        type: "merriam-webster",
        apiKey: "key",
        enabled: true,
      };

      const sources: SourceConfig[] = [
        { kind: "builtin", id: "local", enabled: true },
        { kind: "api", id: "uuid-test", config: apiConfig },
        { kind: "builtin", id: "datamuse", enabled: false },
      ];

      const builtinSources = sources.filter(isBuiltinSource);
      const apiSources = sources.filter(isAPISource);

      expect(builtinSources).toHaveLength(2);
      expect(apiSources).toHaveLength(1);
    });

    it("should be mutually exclusive", () => {
      const builtinSource: SourceConfig = { kind: "builtin", id: "local", enabled: true };
      const apiConfig: APIServiceConfig = {
        id: "uuid",
        type: "free-dictionary",
        apiKey: "",
        enabled: true,
      };
      const apiSource: SourceConfig = { kind: "api", id: "uuid", config: apiConfig };

      expect(isBuiltinSource(builtinSource)).toBe(true);
      expect(isAPISource(builtinSource)).toBe(false);

      expect(isBuiltinSource(apiSource)).toBe(false);
      expect(isAPISource(apiSource)).toBe(true);
    });
  });
});
