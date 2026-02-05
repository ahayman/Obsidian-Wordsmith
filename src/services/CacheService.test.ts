import { CacheService } from "./CacheService";
import { LookupCache, SynonymResult, ServiceCacheData } from "../types/types";

function createMockResults(word: string): SynonymResult[] {
  return [{ word: `${word}-synonym`, type: "synonym", source: "wordnet" }];
}

function createMockServiceData(word: string): ServiceCacheData {
  return {
    results: createMockResults(word),
    fetchedTypes: ["synonym"],
  };
}

function createEmptyCache(): LookupCache {
  return { entries: {}, version: 3 };
}

describe("CacheService", () => {
  describe("getService and setService", () => {
    it("should return null for uncached words", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      expect(cache.getService("hello", "local")).toBeNull();
    });

    it("should return null for uncached services", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      cache.setService("hello", "local", createMockResults("hello"));
      expect(cache.getService("hello", "datamuse")).toBeNull();
    });

    it("should return cached results for a service", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const results = createMockResults("hello");

      cache.setService("hello", "local", results);
      expect(cache.getService("hello", "local")).toEqual(results);
    });

    it("should normalize keys to lowercase and trimmed", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const results = createMockResults("hello");

      cache.setService("  HELLO  ", "local", results);
      expect(cache.getService("hello", "local")).toEqual(results);
      expect(cache.getService("HELLO", "local")).toEqual(results);
      expect(cache.getService("  hello  ", "local")).toEqual(results);
    });

    it("should store multiple services for same word", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const localResults = createMockResults("hello-local");
      const datamuseResults = createMockResults("hello-datamuse");

      cache.setService("hello", "local", localResults);
      cache.setService("hello", "datamuse", datamuseResults);

      expect(cache.getService("hello", "local")).toEqual(localResults);
      expect(cache.getService("hello", "datamuse")).toEqual(datamuseResults);
      expect(cache.size).toBe(1); // Single word entry
    });

    it("should merge new results with existing service results", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const results1 = createMockResults("hello1");
      const results2: SynonymResult[] = [{ word: "hello2-antonym", type: "antonym", source: "wordnet" }];

      cache.setService("hello", "local", results1, ["synonym"]);
      cache.setService("hello", "local", results2, ["antonym"]);

      const cached = cache.getService("hello", "local");
      // Should have both results merged
      expect(cached).toHaveLength(2);
      expect(cached).toContainEqual({ word: "hello1-synonym", type: "synonym", source: "wordnet" });
      expect(cached).toContainEqual({ word: "hello2-antonym", type: "antonym", source: "wordnet" });
    });
  });

  describe("hasService", () => {
    it("should return false for uncached words", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      expect(cache.hasService("hello", "local")).toBe(false);
    });

    it("should return true for cached services", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      cache.setService("hello", "local", createMockResults("hello"));
      expect(cache.hasService("hello", "local")).toBe(true);
      expect(cache.hasService("hello", "datamuse")).toBe(false);
    });
  });

  describe("getMissingServices", () => {
    it("should return all services for uncached word", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const missing = cache.getMissingServices("hello", ["local", "datamuse", "spelling"]);
      expect(missing).toEqual(["local", "datamuse", "spelling"]);
    });

    it("should return only uncached services", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      cache.setService("hello", "local", createMockResults("hello"));
      cache.setService("hello", "spelling", []);

      const missing = cache.getMissingServices("hello", ["local", "datamuse", "spelling"]);
      expect(missing).toEqual(["datamuse"]);
    });

    it("should return empty array when all services cached", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      cache.setService("hello", "local", createMockResults("hello"));
      cache.setService("hello", "datamuse", createMockResults("hello"));

      const missing = cache.getMissingServices("hello", ["local", "datamuse"]);
      expect(missing).toEqual([]);
    });
  });

  describe("getAllServices", () => {
    it("should return null for uncached word", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      expect(cache.getAllServices("hello")).toBeNull();
    });

    it("should return all cached services for a word", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const localResults = createMockResults("local");
      const datamuseResults = createMockResults("datamuse");

      cache.setService("hello", "local", localResults);
      cache.setService("hello", "datamuse", datamuseResults);

      const all = cache.getAllServices("hello");
      expect(all).toEqual({
        local: localResults,
        datamuse: datamuseResults,
      });
    });
  });

  describe("setMultipleServices", () => {
    it("should cache multiple services at once", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const results = {
        local: createMockResults("local"),
        datamuse: createMockResults("datamuse"),
      };

      cache.setMultipleServices("hello", results);

      expect(cache.getService("hello", "local")).toEqual(results.local);
      expect(cache.getService("hello", "datamuse")).toEqual(results.datamuse);
    });

    it("should merge with existing services", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      cache.setService("hello", "spelling", []);

      cache.setMultipleServices("hello", {
        local: createMockResults("local"),
      });

      expect(cache.getService("hello", "spelling")).toEqual([]);
      expect(cache.getService("hello", "local")).not.toBeNull();
    });
  });

  describe("LRU eviction", () => {
    it("should evict oldest entry when at capacity", () => {
      const cache = new CacheService(createEmptyCache(), 3);

      cache.setService("first", "local", createMockResults("first"));
      cache.setService("second", "local", createMockResults("second"));
      cache.setService("third", "local", createMockResults("third"));

      expect(cache.size).toBe(3);

      // Add fourth entry, should evict "first"
      cache.setService("fourth", "local", createMockResults("fourth"));

      expect(cache.size).toBe(3);
      expect(cache.getService("first", "local")).toBeNull();
      expect(cache.getService("second", "local")).not.toBeNull();
      expect(cache.getService("third", "local")).not.toBeNull();
      expect(cache.getService("fourth", "local")).not.toBeNull();
    });

    it("should update lastAccessed on get", async () => {
      const cache = new CacheService(createEmptyCache(), 3);

      cache.setService("first", "local", createMockResults("first"));
      await new Promise((r) => setTimeout(r, 10));
      cache.setService("second", "local", createMockResults("second"));
      await new Promise((r) => setTimeout(r, 10));
      cache.setService("third", "local", createMockResults("third"));

      // Access "first" to make it most recently used
      await new Promise((r) => setTimeout(r, 10));
      cache.getService("first", "local");

      // Add fourth, should evict "second" (now oldest accessed)
      cache.setService("fourth", "local", createMockResults("fourth"));

      expect(cache.getService("first", "local")).not.toBeNull();
      expect(cache.getService("second", "local")).toBeNull();
      expect(cache.getService("third", "local")).not.toBeNull();
      expect(cache.getService("fourth", "local")).not.toBeNull();
    });
  });

  describe("maxSize = 0 (caching disabled)", () => {
    it("should not cache when maxSize is 0", () => {
      const cache = new CacheService(createEmptyCache(), 0);

      cache.setService("hello", "local", createMockResults("hello"));
      expect(cache.getService("hello", "local")).toBeNull();
      expect(cache.size).toBe(0);
    });
  });

  describe("setMaxSize", () => {
    it("should evict entries when size is reduced", () => {
      const cache = new CacheService(createEmptyCache(), 5);

      cache.setService("one", "local", createMockResults("one"));
      cache.setService("two", "local", createMockResults("two"));
      cache.setService("three", "local", createMockResults("three"));
      cache.setService("four", "local", createMockResults("four"));
      cache.setService("five", "local", createMockResults("five"));

      expect(cache.size).toBe(5);

      cache.setMaxSize(2);

      expect(cache.size).toBe(2);
      // The most recently added should remain
      expect(cache.getService("five", "local")).not.toBeNull();
      expect(cache.getService("four", "local")).not.toBeNull();
    });

    it("should clear cache when set to 0", () => {
      const cache = new CacheService(createEmptyCache(), 5);

      cache.setService("hello", "local", createMockResults("hello"));
      cache.setService("world", "local", createMockResults("world"));

      cache.setMaxSize(0);

      expect(cache.size).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      const cache = new CacheService(createEmptyCache(), 100);

      cache.setService("one", "local", createMockResults("one"));
      cache.setService("two", "local", createMockResults("two"));
      cache.setService("three", "local", createMockResults("three"));

      expect(cache.size).toBe(3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.getService("one", "local")).toBeNull();
    });
  });

  describe("toCache", () => {
    it("should serialize entries for persistence", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const results = createMockResults("hello");

      cache.setService("hello", "local", results, ["synonym"]);

      const serialized = cache.toCache();

      expect(serialized.version).toBe(3);
      // Cache keys now include language: "hello:en"
      expect(serialized.entries["hello:en"]).toBeDefined();
      expect(serialized.entries["hello:en"]!.word).toBe("hello:en");
      const serviceData = serialized.entries["hello:en"]!.services["local"] as ServiceCacheData;
      expect(serviceData.results).toEqual(results);
      expect(serviceData.fetchedTypes).toEqual(["synonym"]);
    });
  });

  describe("initialization from existing cache", () => {
    it("should load entries from existing cache", () => {
      const existingCache: LookupCache = {
        entries: {
          hello: {
            word: "hello",
            services: { local: createMockServiceData("hello") },
            lastAccessed: Date.now(),
          },
          world: {
            word: "world",
            services: { local: createMockServiceData("world"), datamuse: createMockServiceData("world") },
            lastAccessed: Date.now(),
          },
        },
        version: 3,
      };

      const cache = new CacheService(existingCache, 100);

      expect(cache.size).toBe(2);
      expect(cache.getService("hello", "local")).not.toBeNull();
      expect(cache.getService("world", "local")).not.toBeNull();
      expect(cache.getService("world", "datamuse")).not.toBeNull();
    });
  });

  describe("caching empty results", () => {
    it("should cache empty results for a service", () => {
      const cache = new CacheService(createEmptyCache(), 100);

      cache.setService("asdfghjkl", "local", []);

      expect(cache.getService("asdfghjkl", "local")).toEqual([]);
      expect(cache.hasService("asdfghjkl", "local")).toBe(true);
    });
  });
});
