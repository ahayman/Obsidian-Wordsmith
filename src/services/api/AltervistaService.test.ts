import { AltervistaService } from "./AltervistaService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("AltervistaService", () => {
  const createService = (apiKey = "test-api-key") =>
    new AltervistaService("alt-123", apiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("alt-123");
      expect(service.name).toBe("Altervista");
      expect(service.description).toBe("Multilingual thesaurus API");
    });
  });

  describe("supportedTypes", () => {
    it("should return synonym and antonym", () => {
      const service = createService();
      const types = service.supportedTypes();
      expect(types).toContain("synonym");
      expect(types).toContain("antonym");
      expect(types).toHaveLength(2);
    });
  });

  describe("lookup - successful responses", () => {
    it("should parse pipe-separated synonyms", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            {
              list: {
                category: "(noun)",
                synonyms: "joy|happiness|bliss",
              },
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happiness", 50);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        word: "joy",
        type: "synonym",
        source: "altervista",
        partOfSpeech: "noun",
      });
    });

    it("should extract antonyms from (antonym) annotation", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            {
              list: {
                category: "(adj)",
                synonyms: "joyful|cheerful|sad (antonym)|unhappy (antonym)",
              },
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results.filter((r) => r.type === "synonym")).toHaveLength(2);
      expect(results.filter((r) => r.type === "antonym")).toHaveLength(2);
      expect(results).toContainEqual({
        word: "sad",
        type: "antonym",
        source: "altervista",
        partOfSpeech: "adjective",
      });
    });

    it("should skip entries with other annotations like (similar term)", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            {
              list: {
                category: "(noun)",
                synonyms: "joy|bliss (similar term)|happiness",
              },
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happiness", 50);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.word)).not.toContain("bliss (similar term)");
      expect(results.map((r) => r.word)).not.toContain("bliss");
    });

    it("should parse different category formats", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: "test1" } },
            { list: { category: "(verb)", synonyms: "test2" } },
            { list: { category: "(adj)", synonyms: "test3" } },
            { list: { category: "(adv)", synonyms: "test4" } },
            { list: { category: "(unknown)", synonyms: "test5" } },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results[0].partOfSpeech).toBe("noun");
      expect(results[1].partOfSpeech).toBe("verb");
      expect(results[2].partOfSpeech).toBe("adjective");
      expect(results[3].partOfSpeech).toBe("adverb");
      expect(results[4].partOfSpeech).toBeUndefined();
    });

    it("should filter by requested types", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            {
              list: {
                category: "(adj)",
                synonyms: "happy|sad (antonym)",
              },
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50, ["synonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("synonym");
    });

    it("should deduplicate results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: "joy|Joy|JOY" } },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happiness", 50);

      expect(results.filter((r) => r.word.toLowerCase() === "joy")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: "a|b|c|d|e|f|g" } },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 3);

      expect(results).toHaveLength(3);
    });

    it("should URL encode special characters and include api key in URL", async () => {
      const service = createService("my-key");
      mockRequestUrl.mockResolvedValueOnce({
        json: { response: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test word", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("test%20word"),
      });
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("key=my-key"),
      });
    });
  });

  describe("lookup - edge cases", () => {
    it("should handle empty response array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { response: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing response field", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle item with missing list", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: "valid" } },
            { notList: true },
            {},
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toHaveLength(1);
    });

    it("should handle non-string synonyms field", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: ["array", "instead"] } },
            { list: { category: "(noun)", synonyms: 12345 } },
            { list: { category: "(noun)", synonyms: null } },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should skip empty entries after splitting", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            { list: { category: "(noun)", synonyms: "joy||happiness|  |bliss" } },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.word)).toEqual(["joy", "happiness", "bliss"]);
    });

    it("should handle antonym annotation variations", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          response: [
            {
              list: {
                category: "(noun)",
                synonyms: "sad (ANTONYM)|unhappy (Antonym)|miserable(antonym)",
              },
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      // All three should be recognized as antonyms
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.type === "antonym")).toBe(true);
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
        json: { response: [] },
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

    it("should handle non-Error exceptions", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce({ code: 500, message: "object error" });

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("edge cases", () => {
    it("should URL-encode API key with special characters in URL param", async () => {
      const service = createService("key=with&special");
      mockRequestUrl.mockResolvedValueOnce({
        json: { response: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test", 50);

      // The API key should be URL encoded to prevent URL parsing issues
      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("key=key%3Dwith%26special"),
      });
    });

    it("should handle whitespace-only word", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { response: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("   ", 50);

      expect(results).toEqual([]);
    });
  });
});
