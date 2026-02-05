import { MerriamWebsterService } from "./MerriamWebsterService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("MerriamWebsterService", () => {
  const createService = (apiKey = "test-api-key") =>
    new MerriamWebsterService("mw-123", apiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("mw-123");
      expect(service.name).toBe("Merriam-Webster");
      expect(service.description).toBe("Collegiate Thesaurus API");
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
    it("should parse synonyms and antonyms from valid response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [["joyful", "cheerful"]],
              ants: [["sad", "unhappy"]],
            },
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(4);
      expect(results).toContainEqual({
        word: "joyful",
        type: "synonym",
        source: "merriam-webster",
        partOfSpeech: "adjective",
        definition: "feeling joy",
        definitionId: "mw-happy-0",
      });
      expect(results).toContainEqual({
        word: "sad",
        type: "antonym",
        source: "merriam-webster",
        partOfSpeech: "adjective",
        definition: "feeling joy",
        definitionId: "mw-happy-0",
      });
    });

    it("should handle multiple entries with multiple synonym/antonym groups", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "run:1",
              syns: [["sprint", "jog"], ["operate"]],
              ants: [["walk"], ["stop"]],
            },
            fl: "verb",
            shortdef: ["to move quickly", "to operate"],
          },
          {
            meta: {
              id: "run:2",
              syns: [["stream"]],
              ants: [],
            },
            fl: "noun",
            shortdef: ["a stream"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("run", 50);

      // Should have synonyms from both entries
      expect(results.filter((r) => r.type === "synonym")).toHaveLength(4);
      expect(results.filter((r) => r.type === "antonym")).toHaveLength(2);
    });

    it("should handle spelling suggestions (strings array)", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: ["running", "ran", "runner"],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("runnn", 50);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        word: "running",
        type: "spelling",
        source: "merriam-webster",
      });
    });

    it("should respect maxResults limit", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "test",
              syns: [["a", "b", "c", "d", "e", "f", "g", "h"]],
              ants: [],
            },
            fl: "noun",
            shortdef: ["testing"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 3);

      expect(results).toHaveLength(3);
    });

    it("should only fetch synonyms when types is ['synonym']", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [["joyful"]],
              ants: [["sad"]],
            },
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50, ["synonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("synonym");
    });

    it("should deduplicate results by word+type", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [["joyful", "JOYFUL", "Joyful"]],
              ants: [],
            },
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      // Should only have one "joyful" synonym (case-insensitive dedup)
      expect(results.filter((r) => r.word.toLowerCase() === "joyful")).toHaveLength(1);
    });

    it("should URL encode special characters in word", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("word with spaces", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("word%20with%20spaces"),
      });
    });
  });

  describe("lookup - empty and edge case responses", () => {
    it("should return empty array for empty response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("nonexistent", 50);

      expect(results).toEqual([]);
    });

    it("should handle entry with missing meta", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toEqual([]);
    });

    it("should handle entry with null syns/ants", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: null,
              ants: null,
            },
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toEqual([]);
    });

    it("should handle entry with empty syns/ants arrays", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [],
              ants: [],
            },
            fl: "adjective",
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing shortdef gracefully", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [["joyful"]],
              ants: [],
            },
            fl: "adjective",
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(1);
      expect(results[0].definition).toBeUndefined();
    });

    it("should handle missing fl (part of speech) gracefully", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "happy",
              syns: [["joyful"]],
              ants: [],
            },
            shortdef: ["feeling joy"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(1);
      expect(results[0].partOfSpeech).toBeUndefined();
    });
  });

  describe("lookup - error handling", () => {
    it("should throw on network error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.lookup("test", 50)).rejects.toThrow("Network error");
    });

    it("should throw on 500 server error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 500"));

      await expect(service.lookup("test", 50)).rejects.toThrow("status 500");
    });
  });

  describe("validate", () => {
    it("should return valid for successful array response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: ["suggestion1"],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for non-array response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { error: "invalid" },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API response");
    });

    it("should return invalid API key error for 403", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 403"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should pass through other error messages", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Connection timeout");
    });

    it("should return unknown error for non-Error throws", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce("string error");

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("edge cases", () => {
    it("should handle words with ampersand", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("rock & roll", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("rock%20%26%20roll"),
      });
    });

    it("should handle response with undefined meta.id", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: { syns: [["word"]], ants: [] },
            fl: "noun",
            shortdef: ["definition"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results[0].definitionId).toBe("mw-unknown-0");
    });

    it("should handle empty string word", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("", 50);

      expect(results).toEqual([]);
    });

    it("should handle maxResults of 0", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: { id: "test", syns: [["word"]], ants: [] },
            fl: "noun",
            shortdef: ["definition"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 0);

      expect(results).toEqual([]);
    });

    it("should handle negative maxResults (returns all but last)", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: { id: "test", syns: [["a", "b"]], ants: [] },
            fl: "noun",
            shortdef: ["definition"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", -1);

      // slice(0, -1) returns all but the last element
      expect(results).toHaveLength(1);
    });

    it("should handle syns that is not an array of arrays", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: {
              id: "test",
              syns: "not-an-array",
              ants: [],
            },
            fl: "noun",
            shortdef: ["definition"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);
      expect(results).toEqual([]);
    });

    it("should return empty when types is empty array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            meta: { id: "test", syns: [["word"]], ants: [["opposite"]] },
            fl: "noun",
            shortdef: ["definition"],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50, []);

      expect(results).toEqual([]);
    });
  });
});
