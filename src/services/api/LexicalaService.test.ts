import { LexicalaService } from "./LexicalaService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("LexicalaService", () => {
  const createService = () => new LexicalaService("lx-123", "test-rapid-api-key");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly", () => {
      const service = createService();
      expect(service.id).toBe("lx-123");
      expect(service.name).toBe("Lexicala");
      expect(service.description).toBe("Multilingual dictionary API via RapidAPI");
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

  describe("supportedLanguages", () => {
    it("should return multiple languages", () => {
      const service = createService();
      const languages = service.supportedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("fr");
      expect(languages).toContain("de");
      expect(languages.length).toBeGreaterThan(10);
    });
  });

  describe("lookup - successful responses", () => {
    it("should parse synonyms and antonyms from senses", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "adjective" },
              senses: [
                {
                  definition: "feeling joy",
                  synonyms: ["joyful", "cheerful"],
                  antonyms: ["sad", "unhappy"],
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

      expect(results).toHaveLength(4);
      expect(results).toContainEqual({
        word: "joyful",
        type: "synonym",
        source: "lexicala",
        partOfSpeech: "adjective",
        definition: "feeling joy",
        definitionId: "lx-adjective-0",
      });
      expect(results).toContainEqual({
        word: "sad",
        type: "antonym",
        source: "lexicala",
        partOfSpeech: "adjective",
        definition: "feeling joy",
        definitionId: "lx-adjective-0",
      });
    });

    it("should handle multiple results and senses", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "verb" },
              senses: [
                { synonyms: ["sprint"] },
                { synonyms: ["manage"] },
              ],
            },
            {
              headword: { pos: "noun" },
              senses: [
                { synonyms: ["race"] },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("run", 50);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.word)).toContain("sprint");
      expect(results.map(r => r.word)).toContain("manage");
      expect(results.map(r => r.word)).toContain("race");
    });

    it("should send correct headers with RapidAPI key", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { results: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("test", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("search-entries"),
        headers: {
          "X-RapidAPI-Key": "test-rapid-api-key",
          "X-RapidAPI-Host": "lexicala1.p.rapidapi.com",
        },
      });
    });

    it("should filter by requested types", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "adjective" },
              senses: [
                {
                  synonyms: ["joyful"],
                  antonyms: ["sad"],
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

      const results = await service.lookup("happy", 50, ["antonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("antonym");
      expect(results[0].word).toBe("sad");
    });

    it("should deduplicate results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "adjective" },
              senses: [
                { synonyms: ["joyful"] },
                { synonyms: ["Joyful"] },
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

      expect(results.filter(r => r.word.toLowerCase() === "joyful")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "noun" },
              senses: [
                { synonyms: ["a", "b", "c", "d", "e", "f"] },
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

    it("should pass language parameter in URL", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { results: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("maison", 50, undefined, "fr");

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("language=fr"),
        headers: expect.any(Object),
      });
    });

    it("should map pt-BR to pt for language parameter", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { results: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      await service.lookup("casa", 50, undefined, "pt-BR");

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("language=pt"),
        headers: expect.any(Object),
      });
    });
  });

  describe("lookup - edge cases", () => {
    it("should handle empty results array", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: { results: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("xyz123", 50);

      expect(results).toEqual([]);
    });

    it("should handle missing results property", async () => {
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

    it("should handle missing senses in a result", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            { headword: { pos: "noun" } },
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

    it("should handle missing headword pos", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              senses: [
                { synonyms: ["trial"] },
              ],
            },
          ],
        },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const results = await service.lookup("test", 50);

      expect(results).toHaveLength(1);
      expect(results[0].partOfSpeech).toBeUndefined();
      expect(results[0].definitionId).toBe("lx-unknown-0");
    });

    it("should handle maxResults of 0", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          results: [
            {
              headword: { pos: "noun" },
              senses: [{ synonyms: ["trial"] }],
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
        json: { results: [] },
        status: 200,
        headers: {},
        arrayBuffer: new ArrayBuffer(0),
        text: "",
      });

      const result = await service.validate();

      expect(result.valid).toBe(true);
    });

    it("should return invalid for bad API key", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 401"));

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should return invalid for rate limit", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 429"));

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
