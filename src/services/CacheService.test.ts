import { CacheService } from "./CacheService";
import { GroupedLookupResult, LookupCache } from "../types";

function createMockResult(word: string): GroupedLookupResult {
  return {
    originalWord: word,
    results: {
      local: [{ word: `${word}-synonym`, type: "synonym", source: "wordnet" }],
    },
  };
}

function createEmptyCache(): LookupCache {
  return { entries: {}, version: 1 };
}

describe("CacheService", () => {
  describe("get and set", () => {
    it("should return null for uncached words", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      expect(cache.get("hello")).toBeNull();
    });

    it("should return cached results", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const result = createMockResult("hello");

      cache.set("hello", result);
      expect(cache.get("hello")).toEqual(result);
    });

    it("should normalize keys to lowercase and trimmed", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const result = createMockResult("hello");

      cache.set("  HELLO  ", result);
      expect(cache.get("hello")).toEqual(result);
      expect(cache.get("HELLO")).toEqual(result);
      expect(cache.get("  hello  ")).toEqual(result);
    });

    it("should update existing entries", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const result1 = createMockResult("hello");
      const result2 = createMockResult("hello-updated");

      cache.set("hello", result1);
      cache.set("hello", result2);

      expect(cache.get("hello")).toEqual(result2);
      expect(cache.size).toBe(1);
    });
  });

  describe("LRU eviction", () => {
    it("should evict oldest entry when at capacity", () => {
      const cache = new CacheService(createEmptyCache(), 3);

      cache.set("first", createMockResult("first"));
      cache.set("second", createMockResult("second"));
      cache.set("third", createMockResult("third"));

      expect(cache.size).toBe(3);

      // Add fourth entry, should evict "first"
      cache.set("fourth", createMockResult("fourth"));

      expect(cache.size).toBe(3);
      expect(cache.get("first")).toBeNull();
      expect(cache.get("second")).not.toBeNull();
      expect(cache.get("third")).not.toBeNull();
      expect(cache.get("fourth")).not.toBeNull();
    });

    it("should update lastAccessed on get", async () => {
      const cache = new CacheService(createEmptyCache(), 3);

      cache.set("first", createMockResult("first"));
      await new Promise((r) => setTimeout(r, 10));
      cache.set("second", createMockResult("second"));
      await new Promise((r) => setTimeout(r, 10));
      cache.set("third", createMockResult("third"));

      // Access "first" to make it most recently used
      await new Promise((r) => setTimeout(r, 10));
      cache.get("first");

      // Add fourth, should evict "second" (now oldest accessed)
      cache.set("fourth", createMockResult("fourth"));

      expect(cache.get("first")).not.toBeNull();
      expect(cache.get("second")).toBeNull();
      expect(cache.get("third")).not.toBeNull();
      expect(cache.get("fourth")).not.toBeNull();
    });
  });

  describe("maxSize = 0 (caching disabled)", () => {
    it("should not cache when maxSize is 0", () => {
      const cache = new CacheService(createEmptyCache(), 0);

      cache.set("hello", createMockResult("hello"));
      expect(cache.get("hello")).toBeNull();
      expect(cache.size).toBe(0);
    });

    it("should return null on get when maxSize is 0", () => {
      const existingCache: LookupCache = {
        entries: {
          hello: {
            word: "hello",
            result: createMockResult("hello"),
            lastAccessed: Date.now(),
          },
        },
        version: 1,
      };
      const cache = new CacheService(existingCache, 0);

      // Should return null even though data exists internally
      expect(cache.get("hello")).toBeNull();
    });
  });

  describe("setMaxSize", () => {
    it("should evict entries when size is reduced", () => {
      const cache = new CacheService(createEmptyCache(), 5);

      cache.set("one", createMockResult("one"));
      cache.set("two", createMockResult("two"));
      cache.set("three", createMockResult("three"));
      cache.set("four", createMockResult("four"));
      cache.set("five", createMockResult("five"));

      expect(cache.size).toBe(5);

      cache.setMaxSize(2);

      expect(cache.size).toBe(2);
      // The most recently added should remain
      expect(cache.get("five")).not.toBeNull();
      expect(cache.get("four")).not.toBeNull();
    });

    it("should clear cache when set to 0", () => {
      const cache = new CacheService(createEmptyCache(), 5);

      cache.set("hello", createMockResult("hello"));
      cache.set("world", createMockResult("world"));

      cache.setMaxSize(0);

      expect(cache.size).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      const cache = new CacheService(createEmptyCache(), 100);

      cache.set("one", createMockResult("one"));
      cache.set("two", createMockResult("two"));
      cache.set("three", createMockResult("three"));

      expect(cache.size).toBe(3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get("one")).toBeNull();
    });
  });

  describe("toCache", () => {
    it("should serialize entries for persistence", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const result = createMockResult("hello");

      cache.set("hello", result);

      const serialized = cache.toCache();

      expect(serialized.version).toBe(1);
      expect(serialized.entries["hello"]).toBeDefined();
      expect(serialized.entries["hello"]!.word).toBe("hello");
      expect(serialized.entries["hello"]!.result).toEqual(result);
    });
  });

  describe("initialization from existing cache", () => {
    it("should load entries from existing cache", () => {
      const existingCache: LookupCache = {
        entries: {
          hello: {
            word: "hello",
            result: createMockResult("hello"),
            lastAccessed: Date.now(),
          },
          world: {
            word: "world",
            result: createMockResult("world"),
            lastAccessed: Date.now(),
          },
        },
        version: 1,
      };

      const cache = new CacheService(existingCache, 100);

      expect(cache.size).toBe(2);
      expect(cache.get("hello")).not.toBeNull();
      expect(cache.get("world")).not.toBeNull();
    });
  });

  describe("caching empty results", () => {
    it("should cache results with no synonyms", () => {
      const cache = new CacheService(createEmptyCache(), 100);
      const emptyResult: GroupedLookupResult = {
        originalWord: "asdfghjkl",
        results: {},
      };

      cache.set("asdfghjkl", emptyResult);

      expect(cache.get("asdfghjkl")).toEqual(emptyResult);
    });
  });
});
