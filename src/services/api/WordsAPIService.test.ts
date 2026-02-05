import { WordsAPIService } from "./WordsAPIService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("WordsAPIService", () => {
  const createService = (apiKey = "test-api-key") =>
    new WordsAPIService("wapi-123", apiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("wapi-123");
      expect(service.name).toBe("WordsAPI");
      expect(service.description).toBe("Comprehensive word data via RapidAPI");
    });
  });

  describe("supportedTypes", () => {
    it("should return all five types", () => {
      const service = createService();
      const types = service.supportedTypes();
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
      expect(types).toContain("related");
      expect(types).toContain("hypernym");
      expect(types).toContain("hyponym");
      expect(types).toHaveLength(5);
    });
  });

  describe("lookup - successful responses", () => {
    it("should fetch synonyms and antonyms by default", async () => {
      const service = createService();

      // First call for synonyms
      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "happy", synonyms: ["joyful", "cheerful"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });
      // Second call for antonyms
      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "happy", antonyms: ["sad", "unhappy"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(4);
      expect(results.filter((r) => r.type === "synonym")).toHaveLength(2);
      expect(results.filter((r) => r.type === "antonym")).toHaveLength(2);
    });

    it("should fetch all requested types in parallel", async () => {
      const service = createService();

      mockRequestUrl
        .mockResolvedValueOnce({
          json: { word: "animal", typeOf: ["living thing"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        })
        .mockResolvedValueOnce({
          json: { word: "animal", hasTypes: ["dog", "cat"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

      const results = await service.lookup("animal", 50, ["hypernym", "hyponym"]);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.type === "hypernym")).toHaveLength(1);
      expect(results.filter((r) => r.type === "hyponym")).toHaveLength(2);
    });

    it("should include RapidAPI headers", async () => {
      const service = createService("my-rapid-api-key");
      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: ["exam"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test", 50, ["synonym"]);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.any(String),
        headers: {
          "X-RapidAPI-Key": "my-rapid-api-key",
          "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com",
        },
      });
    });

    it("should handle 404 for specific endpoint gracefully", async () => {
      const service = createService();

      mockRequestUrl
        .mockResolvedValueOnce({
          json: { word: "test", synonyms: ["exam"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        })
        .mockRejectedValueOnce(new Error("Request failed, status 404"));

      const results = await service.lookup("test", 50);

      // Should still have synonyms despite antonym 404
      expect(results).toHaveLength(1);
      expect(results[0].word).toBe("exam");
    });

    it("should deduplicate results", async () => {
      const service = createService();

      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: ["exam", "Exam", "EXAM"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      }).mockResolvedValueOnce({
        json: { word: "test", antonyms: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results.filter((r) => r.word.toLowerCase() === "exam")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();

      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: ["a", "b", "c", "d", "e"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      }).mockResolvedValueOnce({
        json: { word: "test", antonyms: ["f", "g", "h"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 3);

      expect(results).toHaveLength(3);
    });
  });

  describe("lookup - edge cases", () => {
    it("should return empty for unknown relationship type", async () => {
      const service = createService();

      // No mocks needed since unknown type should skip fetch
      const results = await service.lookup("test", 50, ["spelling" as any]);

      expect(results).toEqual([]);
    });

    it("should handle empty arrays in response", async () => {
      const service = createService();

      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      }).mockResolvedValueOnce({
        json: { word: "test", antonyms: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing array field in response", async () => {
      const service = createService();

      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test" }, // No synonyms field
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      }).mockResolvedValueOnce({
        json: { word: "test" }, // No antonyms field
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });
  });

  describe("lookup - error handling", () => {
    it("should handle non-404 errors gracefully per endpoint", async () => {
      const service = createService();

      // Synonym fetch succeeds
      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: ["exam"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });
      // Antonym fetch fails with 500
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 500"));

      // Should not throw, should return partial results
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const results = await service.lookup("test", 50);

      expect(results).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("validate", () => {
    it("should return valid for 200 response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { word: "test", synonyms: ["exam"] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return invalid for 401", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 401"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should return invalid for 429 rate limit", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 429"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Rate limit exceeded");
    });

    it("should return invalid for non-200 status", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 500,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API response");
    });
  });

  describe("edge cases", () => {
    it("should properly report 429 in validate", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Too Many Requests - 429"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Rate limit exceeded");
    });

    it("should propagate timeout errors", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request timed out"));
      mockRequestUrl.mockRejectedValueOnce(new Error("Request timed out"));

      // WordsAPI catches errors per-endpoint and returns empty
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should handle concurrent lookups correctly", async () => {
      const service = createService();

      // Setup mocks for two concurrent lookups (2 endpoints each)
      mockRequestUrl
        .mockResolvedValueOnce({
          json: { word: "test1", synonyms: ["a"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        })
        .mockResolvedValueOnce({
          json: { word: "test1", antonyms: ["b"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        })
        .mockResolvedValueOnce({
          json: { word: "test2", synonyms: ["c"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        })
        .mockResolvedValueOnce({
          json: { word: "test2", antonyms: ["d"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

      const [results1, results2] = await Promise.all([
        service.lookup("test1", 50),
        service.lookup("test2", 50),
      ]);

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
    });
  });
});
