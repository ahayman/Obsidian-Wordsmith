import { BigHugeThesaurusService } from "./BigHugeThesaurusService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("BigHugeThesaurusService", () => {
  const createService = (apiKey = "test-api-key") =>
    new BigHugeThesaurusService("bht-123", apiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("bht-123");
      expect(service.name).toBe("Big Huge Thesaurus");
      expect(service.description).toBe("Simple thesaurus API with synonyms and related words");
    });
  });

  describe("supportedTypes", () => {
    it("should return synonym, antonym, and related", () => {
      const service = createService();
      const types = service.supportedTypes();
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
      expect(types).toContain("related");
      expect(types).toHaveLength(3);
    });
  });

  describe("lookup - successful responses", () => {
    it("should parse all parts of speech correctly", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: {
            syn: ["happiness"],
            ant: ["sadness"],
            rel: ["joy"],
          },
          verb: {
            syn: ["rejoice"],
            ant: ["mourn"],
          },
          adjective: {
            syn: ["glad"],
            ant: ["sad"],
            sim: ["content"],
          },
          adverb: {
            syn: ["happily"],
          },
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      // Check noun results
      expect(results).toContainEqual({
        word: "happiness",
        type: "synonym",
        source: "big-huge-thesaurus",
        partOfSpeech: "noun",
      });
      expect(results).toContainEqual({
        word: "sadness",
        type: "antonym",
        source: "big-huge-thesaurus",
        partOfSpeech: "noun",
      });
      expect(results).toContainEqual({
        word: "joy",
        type: "related",
        source: "big-huge-thesaurus",
        partOfSpeech: "noun",
      });

      // Check similar words are treated as synonyms
      expect(results).toContainEqual({
        word: "content",
        type: "synonym",
        source: "big-huge-thesaurus",
        partOfSpeech: "adjective",
      });
    });

    it("should respect maxResults limit", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: {
            syn: ["a", "b", "c", "d", "e", "f", "g"],
          },
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 3);

      expect(results).toHaveLength(3);
    });

    it("should filter by requested types", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: {
            syn: ["happiness"],
            ant: ["sadness"],
            rel: ["joy"],
          },
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50, ["antonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("antonym");
    });

    it("should deduplicate by word+type (case-insensitive)", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: {
            syn: ["happy"],
          },
          adjective: {
            syn: ["Happy", "HAPPY"],
          },
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("joy", 50);

      expect(results.filter((r) => r.word.toLowerCase() === "happy")).toHaveLength(1);
    });

    it("should URL encode special characters", async () => {
      const service = createService("my-key");
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test/word", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("test%2Fword"),
      });
    });
  });

  describe("lookup - empty and edge case responses", () => {
    it("should return empty array for empty object response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("nonexistent", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing syn/ant/rel arrays", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: {},
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle null values in response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          noun: null,
          verb: {
            syn: null,
            ant: undefined,
          },
        },
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
    it("should throw on network error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.lookup("test", 50)).rejects.toThrow("Network error");
    });
  });

  describe("validate", () => {
    it("should return valid for 200 response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { noun: { syn: ["exam"] } },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return valid for 404 (word not found but key is valid)", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 404"));

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

    it("should return invalid for 403", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 403"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should return invalid for non-200 response", async () => {
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

    it("should handle non-Error exceptions", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(null);

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("edge cases", () => {
    it("should handle unicode characters", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("cafe\u0301", 50); // café with combining accent

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("cafe%CC%81"),
      });
    });

    it("should handle response where data is not an object", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: null,
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);
      expect(results).toEqual([]);
    });
  });
});
