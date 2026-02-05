import { FreeDictionaryService } from "./FreeDictionaryService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("FreeDictionaryService", () => {
  const createService = () => new FreeDictionaryService("fd-123");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly (no apiKey required)", () => {
      const service = createService();
      expect(service.id).toBe("fd-123");
      expect(service.name).toBe("Free Dictionary");
      expect(service.description).toBe("Free and open dictionary API");
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
    it("should parse top-level synonyms and antonyms from meanings", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "happy",
            meanings: [
              {
                partOfSpeech: "adjective",
                definitions: [],
                synonyms: ["joyful", "cheerful"],
                antonyms: ["sad", "unhappy"],
              },
            ],
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
        source: "free-dictionary",
        partOfSpeech: "adjective",
        definitionId: "fd-adjective-0",
      });
      expect(results).toContainEqual({
        word: "sad",
        type: "antonym",
        source: "free-dictionary",
        partOfSpeech: "adjective",
        definitionId: "fd-adjective-0",
      });
    });

    it("should parse synonyms and antonyms from definitions", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "happy",
            meanings: [
              {
                partOfSpeech: "adjective",
                definitions: [
                  {
                    definition: "feeling joy",
                    synonyms: ["glad", "content"],
                    antonyms: ["miserable"],
                  },
                ],
                synonyms: [],
                antonyms: [],
              },
            ],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(3);
      expect(results).toContainEqual({
        word: "glad",
        type: "synonym",
        source: "free-dictionary",
        partOfSpeech: "adjective",
        definition: "feeling joy",
        definitionId: "fd-adjective-0-0",
      });
    });

    it("should handle multiple entries and meanings", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "run",
            meanings: [
              {
                partOfSpeech: "verb",
                definitions: [
                  { definition: "move quickly", synonyms: ["sprint"] },
                ],
                synonyms: ["jog"],
                antonyms: [],
              },
              {
                partOfSpeech: "noun",
                definitions: [],
                synonyms: ["race"],
                antonyms: [],
              },
            ],
          },
          {
            word: "run",
            meanings: [
              {
                partOfSpeech: "verb",
                definitions: [
                  { definition: "operate", synonyms: ["manage"] },
                ],
                synonyms: [],
                antonyms: [],
              },
            ],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("run", 50);

      expect(results.filter((r) => r.type === "synonym").length).toBeGreaterThanOrEqual(4);
    });

    it("should filter by requested types", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "happy",
            meanings: [
              {
                partOfSpeech: "adjective",
                definitions: [],
                synonyms: ["joyful"],
                antonyms: ["sad"],
              },
            ],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50, ["antonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("antonym");
    });

    it("should deduplicate results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "happy",
            meanings: [
              {
                partOfSpeech: "adjective",
                definitions: [
                  { definition: "def1", synonyms: ["joyful"] },
                  { definition: "def2", synonyms: ["Joyful"] },
                ],
                synonyms: ["JOYFUL"],
                antonyms: [],
              },
            ],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results.filter((r) => r.word.toLowerCase() === "joyful")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [],
                synonyms: ["a", "b", "c", "d", "e", "f"],
                antonyms: [],
              },
            ],
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

    it("should URL encode special characters", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [{ word: "test", meanings: [] }],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("hello world", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("hello%20world"),
      });
    });
  });

  describe("lookup - edge cases", () => {
    it("should handle empty meanings array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [{ word: "test", meanings: [] }],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing synonyms/antonyms in meaning", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [],
              },
            ],
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

    it("should handle missing synonyms/antonyms in definitions", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [
                  { definition: "a trial" },
                ],
                synonyms: [],
                antonyms: [],
              },
            ],
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

    it("should handle empty array response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("xyz123", 50);

      expect(results).toEqual([]);
    });
  });

  describe("lookup - error handling", () => {
    it("should throw on network error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.lookup("test", 50)).rejects.toThrow("Network error");
    });

    it("should throw on 404 (word not found)", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 404"));

      await expect(service.lookup("asdfghjkl", 50)).rejects.toThrow("status 404");
    });
  });

  describe("validate", () => {
    it("should return valid when lookup succeeds with results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [],
                synonyms: ["trial"],
                antonyms: [],
              },
            ],
          },
        ],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return valid even with empty results (API works)", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [{ word: "test", meanings: [] }],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return invalid on error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Network timeout");
    });
  });

  describe("edge cases", () => {
    it("should handle words with question mark", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("what?", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("what%3F"),
      });
    });

    it("should handle entry with null meanings", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [{ word: "test", meanings: null }],
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);
      expect(results).toEqual([]);
    });

    it("should handle maxResults of 0", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [],
                synonyms: ["trial"],
                antonyms: [],
              },
            ],
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

    it("should handle definitions that is not an array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: [
          {
            word: "test",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: "not-an-array",
                synonyms: [],
                antonyms: [],
              },
            ],
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
  });
});
