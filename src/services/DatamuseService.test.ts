import { DatamuseService } from "./DatamuseService";
import { requestUrl } from "obsidian";
import { RelationshipType } from "../types/types";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Helper to create mock Datamuse API responses
function createMockDatamuseResponse(words: Array<{ word: string; score?: number; tags?: string[]; defs?: string[] }>) {
  return {
    json: words,
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    text: JSON.stringify(words),
  };
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DatamuseService", () => {
  describe("constructor and configuration", () => {
    it("should initialize with default maxResults of 50", () => {
      const service = new DatamuseService();
      // We can verify by checking URL construction in a lookup
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      service.getSynonyms("test");
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("max=50"),
        })
      );
    });

    it("should initialize with custom maxResults", () => {
      const service = new DatamuseService(25);
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      service.getSynonyms("test");
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("max=25"),
        })
      );
    });

    it("should update maxResults via setMaxResults", () => {
      const service = new DatamuseService(50);
      service.setMaxResults(10);
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      service.getSynonyms("test");
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("max=10"),
        })
      );
    });
  });

  describe("supportedTypes", () => {
    it("should return all 5 relationship types", () => {
      const service = new DatamuseService();
      const types = service.supportedTypes();
      expect(types).toHaveLength(5);
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
      expect(types).toContain("related");
      expect(types).toContain("hypernym");
      expect(types).toContain("hyponym");
    });

    it("should return types in consistent order", () => {
      const service = new DatamuseService();
      const types = service.supportedTypes();
      expect(types).toEqual(["synonym", "antonym", "related", "hypernym", "hyponym"]);
    });
  });

  describe("URL construction", () => {
    it("should use rel_syn for synonyms", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("happy");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=happy&max=50&md=dp",
      });
    });

    it("should use rel_ant for antonyms", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getAntonyms("happy");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_ant=happy&max=50&md=dp",
      });
    });

    it("should use ml for related words", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getRelatedWords("happy");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?ml=happy&max=50&md=dp",
      });
    });

    it("should use rel_spc for hypernyms", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getHypernyms("dog");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_spc=dog&max=50&md=dp",
      });
    });

    it("should use rel_gen for hyponyms", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getHyponyms("animal");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_gen=animal&max=50&md=dp",
      });
    });

    it("should use sl for spelling suggestions without md=dp", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSpellingSuggestions("happpy");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?sl=happpy&max=50",
      });
    });
  });

  describe("URL encoding", () => {
    it("should encode spaces in words", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("ice cream");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=ice%20cream&max=50&md=dp",
      });
    });

    it("should encode special characters", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("test&word");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=test%26word&max=50&md=dp",
      });
    });

    it("should encode unicode characters", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("café");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=caf%C3%A9&max=50&md=dp",
      });
    });

    it("should encode question marks and plus signs", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("what?+how");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=what%3F%2Bhow&max=50&md=dp",
      });
    });

    it("should encode hash symbols", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      await service.getSynonyms("test#tag");
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: "https://api.datamuse.com/words?rel_syn=test%23tag&max=50&md=dp",
      });
    });
  });

  describe("response parsing", () => {
    it("should parse basic word response", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "joyful", score: 100 },
          { word: "glad", score: 90 },
        ])
      );

      const results = await service.getSynonyms("happy");

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        word: "joyful",
        type: "synonym",
        source: "datamuse",
      });
      expect(results[1]).toEqual({
        word: "glad",
        type: "synonym",
        source: "datamuse",
      });
    });

    it("should parse part of speech tags", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "run", tags: ["v"] },
          { word: "happy", tags: ["adj"] },
          { word: "quickly", tags: ["adv"] },
          { word: "dog", tags: ["n"] },
        ])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].partOfSpeech).toBe("verb");
      expect(results[1].partOfSpeech).toBe("adjective");
      expect(results[2].partOfSpeech).toBe("adverb");
      expect(results[3].partOfSpeech).toBe("noun");
    });

    it("should handle unknown POS tags", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", tags: ["xyz"] }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].partOfSpeech).toBeUndefined();
    });

    it("should parse definitions with tab separator", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "happy", defs: ["adj\tfeeling or showing pleasure"] },
        ])
      );

      const results = await service.getSynonyms("joyful");

      expect(results[0].definition).toBe("feeling or showing pleasure");
      expect(results[0].definitionId).toBeDefined();
      expect(results[0].definitionId).toMatch(/^dm-/);
    });

    it("should parse definitions without tab separator", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "happy", defs: ["feeling good"] }])
      );

      const results = await service.getSynonyms("joyful");

      expect(results[0].definition).toBe("feeling good");
    });

    it("should use first definition when multiple provided", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          {
            word: "run",
            defs: ["v\tto move quickly", "n\ta period of running"],
          },
        ])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].definition).toBe("to move quickly");
    });

    it("should generate definitionId from normalized definition", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "happy", defs: ["adj\tFeeling GOOD and joyful!"] },
        ])
      );

      const results = await service.getSynonyms("test");

      // Should be lowercase, alphanumeric only, prefixed with dm-
      expect(results[0].definitionId).toBe("dm-feelinggoodandjoyful");
    });

    it("should handle response with score and tags together", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          {
            word: "joyful",
            score: 95000,
            tags: ["adj"],
            defs: ["adj\tfeeling or expressing great pleasure"],
          },
        ])
      );

      const results = await service.getSynonyms("happy");

      expect(results[0]).toEqual({
        word: "joyful",
        type: "synonym",
        source: "datamuse",
        partOfSpeech: "adjective",
        definition: "feeling or expressing great pleasure",
        // "feelingorexpressinggreatpleasu" is 30 chars (sliced from normalized text)
        definitionId: "dm-feelingorexpressinggreatpleasu",
      });
    });

    it("should set correct type for antonym results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "sad", score: 100 }])
      );

      const results = await service.getAntonyms("happy");

      expect(results[0].type).toBe("antonym");
    });

    it("should set correct type for related results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful", score: 100 }])
      );

      const results = await service.getRelatedWords("happy");

      expect(results[0].type).toBe("related");
    });

    it("should set correct type for hypernym results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "canine", score: 100 }])
      );

      const results = await service.getHypernyms("dog");

      expect(results[0].type).toBe("hypernym");
    });

    it("should set correct type for hyponym results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "poodle", score: 100 }])
      );

      const results = await service.getHyponyms("dog");

      expect(results[0].type).toBe("hyponym");
    });

    it("should set correct type for spelling results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "happy", score: 100 }])
      );

      const results = await service.getSpellingSuggestions("happpy");

      expect(results[0].type).toBe("spelling");
      expect(results[0].source).toBe("datamuse");
    });
  });

  describe("empty responses", () => {
    it("should return empty array for empty API response", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));

      const results = await service.getSynonyms("xyznonexistent");

      expect(results).toEqual([]);
    });

    it("should return empty synonyms and relatedWords for empty lookup", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));
      mockRequestUrl.mockResolvedValueOnce(createMockDatamuseResponse([]));

      const result = await service.lookup("xyznonexistent");

      expect(result.synonyms).toEqual([]);
      expect(result.relatedWords).toEqual([]);
    });

    it("should handle empty defs array", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", defs: [] }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].definition).toBeUndefined();
      expect(results[0].definitionId).toBeUndefined();
    });

    it("should handle empty tags array", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", tags: [] }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].partOfSpeech).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should return empty array on network error", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      const results = await service.getSynonyms("test");

      expect(results).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Datamuse synonym lookup failed:",
        expect.any(Error)
      );
    });

    it("should return empty array on timeout", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request timed out"));

      const results = await service.getSynonyms("test");

      expect(results).toEqual([]);
    });

    it("should return empty array on 404 error", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("404 Not Found"));

      const results = await service.getSynonyms("test");

      expect(results).toEqual([]);
    });

    it("should return empty array on 500 error", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("500 Internal Server Error"));

      const results = await service.getSynonyms("test");

      expect(results).toEqual([]);
    });

    it("should log appropriate error for antonym lookup failure", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("API Error"));

      await service.getAntonyms("test");

      expect(console.error).toHaveBeenCalledWith(
        "Datamuse antonym lookup failed:",
        expect.any(Error)
      );
    });

    it("should log appropriate error for related words lookup failure", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("API Error"));

      await service.getRelatedWords("test");

      expect(console.error).toHaveBeenCalledWith(
        "Datamuse related words lookup failed:",
        expect.any(Error)
      );
    });

    it("should log appropriate error for hypernym lookup failure", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("API Error"));

      await service.getHypernyms("test");

      expect(console.error).toHaveBeenCalledWith(
        "Datamuse hypernym lookup failed:",
        expect.any(Error)
      );
    });

    it("should log appropriate error for hyponym lookup failure", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("API Error"));

      await service.getHyponyms("test");

      expect(console.error).toHaveBeenCalledWith(
        "Datamuse hyponym lookup failed:",
        expect.any(Error)
      );
    });

    it("should log appropriate error for spelling suggestions lookup failure", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockRejectedValueOnce(new Error("API Error"));

      await service.getSpellingSuggestions("test");

      expect(console.error).toHaveBeenCalledWith(
        "Datamuse spelling suggestions lookup failed:",
        expect.any(Error)
      );
    });
  });

  describe("malformed API responses", () => {
    it("should handle null json response", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce({
        json: null,
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "null",
      });

      // This will likely throw when trying to map over null
      const results = await service.getSynonyms("test");

      // Should gracefully return empty array on error
      expect(results).toEqual([]);
    });

    it("should handle undefined defs in response item", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test" }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].definition).toBeUndefined();
    });

    it("should handle undefined tags in response item", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test" }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].partOfSpeech).toBeUndefined();
    });

    it("should handle empty definition string after tab split", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", defs: ["adj\t"] }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].definition).toBe("");
      expect(results[0].definitionId).toBeUndefined();
    });
  });

  describe("lookup method", () => {
    it("should default to synonym and related types", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful", score: 100 }])
      );
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "happiness", score: 90 }])
      );

      await service.lookup("happy");

      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("rel_syn=happy"),
      });
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("ml=happy"),
      });
    });

    it("should lookup only specified types", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "sad", score: 100 }])
      );

      await service.lookup("happy", ["antonym"]);

      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("rel_ant=happy"),
      });
    });

    it("should lookup all five types when specified", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValue(createMockDatamuseResponse([]));

      const types: RelationshipType[] = ["synonym", "antonym", "related", "hypernym", "hyponym"];
      await service.lookup("test", types);

      expect(mockRequestUrl).toHaveBeenCalledTimes(5);
    });

    it("should separate synonyms from other results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful", score: 100 }])
      );
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "happiness", score: 90 },
          { word: "joyful", score: 80 },
        ])
      );

      const result = await service.lookup("happy");

      expect(result.synonyms).toHaveLength(1);
      expect(result.synonyms[0].word).toBe("joyful");
      expect(result.synonyms[0].type).toBe("synonym");

      // "happiness" should be in related, but "joyful" should be filtered out (already in synonyms)
      expect(result.relatedWords).toHaveLength(1);
      expect(result.relatedWords[0].word).toBe("happiness");
    });

    it("should handle mixed types in lookup", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful" }])
      );
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "sad" }])
      );

      const result = await service.lookup("happy", ["synonym", "antonym"]);

      expect(result.synonyms).toHaveLength(1);
      expect(result.synonyms[0].word).toBe("joyful");
      expect(result.relatedWords).toHaveLength(1);
      expect(result.relatedWords[0].word).toBe("sad");
      expect(result.relatedWords[0].type).toBe("antonym");
    });

    it("should include hypernyms in relatedWords", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "canine" }])
      );

      const result = await service.lookup("dog", ["hypernym"]);

      expect(result.relatedWords).toHaveLength(1);
      expect(result.relatedWords[0].word).toBe("canine");
      expect(result.relatedWords[0].type).toBe("hypernym");
    });

    it("should include hyponyms in relatedWords", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "poodle" }])
      );

      const result = await service.lookup("dog", ["hyponym"]);

      expect(result.relatedWords).toHaveLength(1);
      expect(result.relatedWords[0].word).toBe("poodle");
      expect(result.relatedWords[0].type).toBe("hyponym");
    });

    it("should handle partial failures gracefully", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful" }])
      );
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.lookup("happy");

      expect(result.synonyms).toHaveLength(1);
      expect(result.relatedWords).toEqual([]);
    });
  });

  describe("lookupTypes method", () => {
    it("should return flat array of results", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful" }])
      );
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "happiness" }])
      );

      const results = await service.lookupTypes("happy", ["synonym", "related"]);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.word)).toContain("joyful");
      expect(results.map((r) => r.word)).toContain("happiness");
    });

    it("should include all types in flat array", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "joyful" }])
      );
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "sad" }])
      );

      const results = await service.lookupTypes("happy", ["synonym", "antonym"]);

      const types = results.map((r) => r.type);
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
    });
  });

  describe("concurrent requests", () => {
    it("should make parallel requests for multiple types", async () => {
      const service = new DatamuseService();

      // Track order of mock resolutions
      let resolveOrder: string[] = [];

      mockRequestUrl
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolveOrder.push("synonym");
                resolve(createMockDatamuseResponse([{ word: "joyful" }]));
              }, 50);
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolveOrder.push("related");
                resolve(createMockDatamuseResponse([{ word: "happiness" }]));
              }, 10);
            })
        );

      await service.lookup("happy");

      // Related should resolve first (shorter timeout), proving parallel execution
      expect(resolveOrder[0]).toBe("related");
      expect(resolveOrder[1]).toBe("synonym");
    });

    it("should complete even if one request is slow", async () => {
      const service = new DatamuseService();

      mockRequestUrl
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve(createMockDatamuseResponse([{ word: "joyful" }]));
              }, 100);
            })
        )
        .mockImplementationOnce(() =>
          Promise.resolve(createMockDatamuseResponse([{ word: "happiness" }]))
        );

      const start = Date.now();
      const result = await service.lookup("happy");
      const elapsed = Date.now() - start;

      // Should complete in roughly 100ms, not 100+immediate
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(200);
      expect(result.synonyms).toHaveLength(1);
      expect(result.relatedWords).toHaveLength(1);
    });
  });

  describe("POS tag expansion", () => {
    it("should expand 'n' to 'noun'", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "dog", tags: ["n"] }])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].partOfSpeech).toBe("noun");
    });

    it("should expand 'v' to 'verb'", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "run", tags: ["v"] }])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].partOfSpeech).toBe("verb");
    });

    it("should expand 'adj' to 'adjective'", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "happy", tags: ["adj"] }])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].partOfSpeech).toBe("adjective");
    });

    it("should expand 'adv' to 'adverb'", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "quickly", tags: ["adv"] }])
      );

      const results = await service.getSynonyms("test");

      expect(results[0].partOfSpeech).toBe("adverb");
    });

    it("should return original tag if recognized but not in expansion map", async () => {
      const service = new DatamuseService();
      // Use a tag that starts with "n" but isn't just "n" to test the expandPOS fallback
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", tags: ["noun"] }])
      );

      const results = await service.getSynonyms("test");

      // "noun" starts with "n", so it's recognized as a POS tag, but expandPOS("noun")
      // returns "noun" since only "n" maps to "noun" in the map
      expect(results[0].partOfSpeech).toBe("noun");
    });

    it("should not assign POS for tags that do not start with n/v/adj/adv", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", tags: ["prep"] }])
      );

      const results = await service.getSynonyms("test");

      // "prep" doesn't start with n, v, adj, or adv, so no POS tag is found
      expect(results[0].partOfSpeech).toBeUndefined();
    });

    it("should select first matching POS tag from multiple tags", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "run", tags: ["syn", "v", "n"] }])
      );

      const results = await service.getSynonyms("test");

      // Should find 'v' first (verb)
      expect(results[0].partOfSpeech).toBe("verb");
    });

    it("should ignore non-POS tags", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", tags: ["syn", "prop", "f:0.5"] }])
      );

      const results = await service.getSynonyms("test");

      // None of these are POS tags, so partOfSpeech should be undefined
      expect(results[0].partOfSpeech).toBeUndefined();
    });
  });

  describe("source attribution", () => {
    it("should always set source to datamuse", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValue(
        createMockDatamuseResponse([{ word: "test" }])
      );

      const synonymResults = await service.getSynonyms("word");
      const antonymResults = await service.getAntonyms("word");
      const relatedResults = await service.getRelatedWords("word");
      const hypernymResults = await service.getHypernyms("word");
      const hyponymResults = await service.getHyponyms("word");
      const spellingResults = await service.getSpellingSuggestions("word");

      expect(synonymResults[0].source).toBe("datamuse");
      expect(antonymResults[0].source).toBe("datamuse");
      expect(relatedResults[0].source).toBe("datamuse");
      expect(hypernymResults[0].source).toBe("datamuse");
      expect(hyponymResults[0].source).toBe("datamuse");
      expect(spellingResults[0].source).toBe("datamuse");
    });
  });

  describe("definition ID generation", () => {
    it("should truncate long definitions to 30 chars", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          {
            word: "test",
            defs: [
              "adj\tThis is a very long definition that exceeds thirty characters significantly",
            ],
          },
        ])
      );

      const results = await service.getSynonyms("word");

      // dm- prefix (3 chars) + 30 chars max = 33 total
      expect(results[0].definitionId?.length).toBeLessThanOrEqual(33);
      // Normalized: "thisisaverylongdefinitionthatexceedsthirtycharacterssignificantly"
      // First 30 chars: "thisisaverylongdefinitionthate"
      expect(results[0].definitionId).toBe("dm-thisisaverylongdefinitionthate");
    });

    it("should remove non-alphanumeric characters from definitionId", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([
          { word: "test", defs: ["adj\tHello, World! 123."] },
        ])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].definitionId).toBe("dm-helloworld123");
    });

    it("should not generate definitionId for empty definition", async () => {
      const service = new DatamuseService();
      mockRequestUrl.mockResolvedValueOnce(
        createMockDatamuseResponse([{ word: "test", defs: [""] }])
      );

      const results = await service.getSynonyms("word");

      expect(results[0].definitionId).toBeUndefined();
    });
  });
});
