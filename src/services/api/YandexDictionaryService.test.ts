import { YandexDictionaryService } from "./YandexDictionaryService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("YandexDictionaryService", () => {
  const createService = () => new YandexDictionaryService("yx-123", "test-yandex-key");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("yx-123");
      expect(service.name).toBe("Yandex Dictionary");
      expect(service.description).toBe("Free dictionary API with synonym support");
    });
  });

  describe("supportedTypes", () => {
    it("should return only synonym", () => {
      const service = createService();
      const types = service.supportedTypes();
      expect(types).toContain("synonym");
      expect(types).toHaveLength(1);
    });
  });

  describe("supportedLanguages", () => {
    it("should return multiple languages", () => {
      const service = createService();
      const languages = service.supportedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("ru");
      expect(languages).toContain("de");
      expect(languages.length).toBeGreaterThan(10);
    });
  });

  describe("lookup - successful responses", () => {
    it("should parse primary translations as synonyms", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "happy",
              pos: "adjective",
              tr: [
                { text: "joyful" },
                { text: "cheerful" },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(2);
      expect(results).toContainEqual({
        word: "joyful",
        type: "synonym",
        source: "yandex-dictionary",
        partOfSpeech: "adjective",
      });
      expect(results).toContainEqual({
        word: "cheerful",
        type: "synonym",
        source: "yandex-dictionary",
        partOfSpeech: "adjective",
      });
    });

    it("should parse syn[] arrays", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "happy",
              pos: "adjective",
              tr: [
                {
                  text: "joyful",
                  syn: [
                    { text: "glad" },
                    { text: "content" },
                  ],
                },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.word)).toContain("joyful");
      expect(results.map(r => r.word)).toContain("glad");
      expect(results.map(r => r.word)).toContain("content");
    });

    it("should parse mean[] arrays", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "happy",
              pos: "adjective",
              tr: [
                {
                  text: "joyful",
                  mean: [
                    { text: "pleased" },
                    { text: "delighted" },
                  ],
                },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.word)).toContain("pleased");
      expect(results.map(r => r.word)).toContain("delighted");
    });

    it("should handle multiple definitions", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "run",
              pos: "verb",
              tr: [{ text: "sprint" }],
            },
            {
              text: "run",
              pos: "noun",
              tr: [{ text: "race" }],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("run", 50);

      expect(results).toHaveLength(2);
      expect(results[0].partOfSpeech).toBe("verb");
      expect(results[1].partOfSpeech).toBe("noun");
    });

    it("should use monolingual lang pair in URL", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { def: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("maison", 50, undefined, "fr");

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("lang=fr-fr"),
      });
    });

    it("should include flags=4 for morphological search", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { def: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("flags=4"),
      });
    });

    it("should deduplicate results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "happy",
              pos: "adjective",
              tr: [
                {
                  text: "glad",
                  syn: [{ text: "Glad" }],
                  mean: [{ text: "GLAD" }],
                },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50);

      expect(results.filter(r => r.word.toLowerCase() === "glad")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "test",
              pos: "noun",
              tr: [
                { text: "a" },
                { text: "b" },
                { text: "c" },
                { text: "d" },
                { text: "e" },
              ],
            },
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

    it("should filter by requested types - no results for antonym", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "happy",
              pos: "adjective",
              tr: [{ text: "joyful" }],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("happy", 50, ["antonym"]);

      expect(results).toEqual([]);
    });
  });

  describe("lookup - edge cases", () => {
    it("should handle empty def array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { def: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("xyz123", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing def property", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {},
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("xyz123", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing tr array in definition", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            { text: "test", pos: "noun" },
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

    it("should handle empty text in translation", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "test",
              pos: "noun",
              tr: [{ text: "" }],
            },
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

    it("should handle maxResults of 0", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          def: [
            {
              text: "test",
              pos: "noun",
              tr: [{ text: "trial" }],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 0);

      expect(results).toEqual([]);
    });
  });

  describe("lookup - error handling", () => {
    it("should throw on network error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.lookup("test", 50)).rejects.toThrow("Network error");
    });

    it("should throw on API error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 401"));

      await expect(service.lookup("test", 50)).rejects.toThrow("status 401");
    });
  });

  describe("validate", () => {
    it("should return valid on successful response", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { def: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return invalid for bad API key (401)", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 401"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should return invalid for blocked key (402)", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 402"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key blocked");
    });

    it("should return invalid for rate limit (403)", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 403"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Rate limit exceeded");
    });

    it("should return invalid on network error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Network timeout");
    });
  });
});
