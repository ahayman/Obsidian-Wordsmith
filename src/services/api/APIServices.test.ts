import { MerriamWebsterService } from "./MerriamWebsterService";
import { BigHugeThesaurusService } from "./BigHugeThesaurusService";
import { WordsAPIService } from "./WordsAPIService";
import { APINinjasService } from "./APINinjasService";
import { AltervistaService } from "./AltervistaService";
import { FreeDictionaryService } from "./FreeDictionaryService";
import {
  createAPIService,
  createAPIServiceForValidation,
  getServiceName,
} from "./index";
import { APIServiceType } from "../../types";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("API Services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // MerriamWebsterService Tests
  // ===========================================================================
  describe("MerriamWebsterService", () => {
    const createService = (apiKey = "test-api-key") =>
      new MerriamWebsterService("mw-123", apiKey);

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
  });

  // ===========================================================================
  // BigHugeThesaurusService Tests
  // ===========================================================================
  describe("BigHugeThesaurusService", () => {
    const createService = (apiKey = "test-api-key") =>
      new BigHugeThesaurusService("bht-123", apiKey);

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
    });
  });

  // ===========================================================================
  // WordsAPIService Tests
  // ===========================================================================
  describe("WordsAPIService", () => {
    const createService = (apiKey = "test-api-key") =>
      new WordsAPIService("wapi-123", apiKey);

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
  });

  // ===========================================================================
  // APINinjasService Tests
  // ===========================================================================
  describe("APINinjasService", () => {
    const createService = (apiKey = "test-api-key") =>
      new APINinjasService("ninjas-123", apiKey);

    describe("constructor and properties", () => {
      it("should set id and name correctly", () => {
        const service = createService();
        expect(service.id).toBe("ninjas-123");
        expect(service.name).toBe("API Ninjas");
        expect(service.description).toBe("Thesaurus API with generous free tier");
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
      it("should parse synonyms and antonyms", async () => {
        const service = createService();
        mockRequestUrl.mockResolvedValueOnce({
          json: {
            word: "happy",
            synonyms: ["joyful", "cheerful"],
            antonyms: ["sad", "unhappy"],
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
          source: "api-ninjas",
        });
        expect(results).toContainEqual({
          word: "sad",
          type: "antonym",
          source: "api-ninjas",
        });
      });

      it("should include X-Api-Key header", async () => {
        const service = createService("my-ninjas-key");
        mockRequestUrl.mockResolvedValueOnce({
          json: { word: "test", synonyms: [], antonyms: [] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        await service.lookup("test", 50);

        expect(mockRequestUrl).toHaveBeenCalledWith({
          url: expect.any(String),
          headers: { "X-Api-Key": "my-ninjas-key" },
        });
      });

      it("should filter by requested types", async () => {
        const service = createService();
        mockRequestUrl.mockResolvedValueOnce({
          json: {
            word: "happy",
            synonyms: ["joyful"],
            antonyms: ["sad"],
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

      it("should respect maxResults", async () => {
        const service = createService();
        mockRequestUrl.mockResolvedValueOnce({
          json: {
            word: "test",
            synonyms: ["a", "b", "c", "d", "e"],
            antonyms: ["f", "g"],
          },
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
          json: { word: "test", synonyms: [], antonyms: [] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        await service.lookup("foo&bar", 50);

        expect(mockRequestUrl).toHaveBeenCalledWith({
          url: expect.stringContaining("foo%26bar"),
          headers: expect.any(Object),
        });
      });
    });

    describe("lookup - edge cases", () => {
      it("should handle missing synonyms array", async () => {
        const service = createService();
        mockRequestUrl.mockResolvedValueOnce({
          json: { word: "test", antonyms: ["fail"] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        const results = await service.lookup("test", 50);

        expect(results).toHaveLength(1);
        expect(results[0].type).toBe("antonym");
      });

      it("should handle null synonyms/antonyms", async () => {
        const service = createService();
        mockRequestUrl.mockResolvedValueOnce({
          json: { word: "test", synonyms: null, antonyms: null },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        const results = await service.lookup("test", 50);

        expect(results).toEqual([]);
      });

      it("should handle empty response object", async () => {
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
          json: { word: "test", synonyms: [], antonyms: [] },
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

      it("should return invalid for 403", async () => {
        const service = createService();
        mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 403"));

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
    });
  });

  // ===========================================================================
  // AltervistaService Tests
  // ===========================================================================
  describe("AltervistaService", () => {
    const createService = (apiKey = "test-api-key") =>
      new AltervistaService("alt-123", apiKey);

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
    });
  });

  // ===========================================================================
  // FreeDictionaryService Tests
  // ===========================================================================
  describe("FreeDictionaryService", () => {
    const createService = () => new FreeDictionaryService("fd-123");

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
  });

  // ===========================================================================
  // Factory Function Tests (index.ts)
  // ===========================================================================
  describe("createAPIService", () => {
    it("should create FreeDictionaryService", () => {
      const service = createAPIService({
        id: "test-id",
        type: "free-dictionary",
        apiKey: "",
        enabled: true,
      });

      expect(service).toBeInstanceOf(FreeDictionaryService);
      expect(service.id).toBe("test-id");
    });

    it("should create MerriamWebsterService", () => {
      const service = createAPIService({
        id: "mw-id",
        type: "merriam-webster",
        apiKey: "my-key",
        enabled: true,
      });

      expect(service).toBeInstanceOf(MerriamWebsterService);
      expect(service.id).toBe("mw-id");
    });

    it("should create BigHugeThesaurusService", () => {
      const service = createAPIService({
        id: "bht-id",
        type: "big-huge-thesaurus",
        apiKey: "my-key",
        enabled: true,
      });

      expect(service).toBeInstanceOf(BigHugeThesaurusService);
    });

    it("should create WordsAPIService", () => {
      const service = createAPIService({
        id: "wapi-id",
        type: "words-api",
        apiKey: "my-key",
        enabled: true,
      });

      expect(service).toBeInstanceOf(WordsAPIService);
    });

    it("should create APINinjasService", () => {
      const service = createAPIService({
        id: "ninjas-id",
        type: "api-ninjas",
        apiKey: "my-key",
        enabled: true,
      });

      expect(service).toBeInstanceOf(APINinjasService);
    });

    it("should create AltervistaService", () => {
      const service = createAPIService({
        id: "alt-id",
        type: "altervista",
        apiKey: "my-key",
        enabled: true,
      });

      expect(service).toBeInstanceOf(AltervistaService);
    });
  });

  describe("createAPIServiceForValidation", () => {
    it("should create service with temp id for validation", () => {
      const service = createAPIServiceForValidation("merriam-webster", "test-key");

      expect(service).toBeInstanceOf(MerriamWebsterService);
      expect(service.id).toBe("validation-temp");
    });

    it("should work for all service types", () => {
      const types: APIServiceType[] = [
        "free-dictionary",
        "merriam-webster",
        "big-huge-thesaurus",
        "words-api",
        "api-ninjas",
        "altervista",
      ];

      for (const type of types) {
        const service = createAPIServiceForValidation(type, "key");
        expect(service).toBeDefined();
        expect(service.id).toBe("validation-temp");
      }
    });
  });

  describe("getServiceName", () => {
    it("should return correct names for all service types", () => {
      expect(getServiceName("free-dictionary")).toBe("Free Dictionary");
      expect(getServiceName("merriam-webster")).toBe("Merriam-Webster");
      expect(getServiceName("big-huge-thesaurus")).toBe("Big Huge Thesaurus");
      expect(getServiceName("words-api")).toBe("WordsAPI");
      expect(getServiceName("api-ninjas")).toBe("API Ninjas");
      expect(getServiceName("altervista")).toBe("Altervista");
    });
  });

  // ===========================================================================
  // Edge Cases and Bug Discovery Tests
  // ===========================================================================
  describe("Edge Cases and Potential Bugs", () => {
    describe("URL encoding edge cases", () => {
      it("should handle words with ampersand", async () => {
        const service = new MerriamWebsterService("id", "key");
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

      it("should handle words with question mark", async () => {
        const service = new FreeDictionaryService("id");
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

      it("should handle words with hash", async () => {
        const service = new APINinjasService("id", "key");
        mockRequestUrl.mockResolvedValueOnce({
          json: { word: "test", synonyms: [], antonyms: [] },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        await service.lookup("C#", 50);

        expect(mockRequestUrl).toHaveBeenCalledWith({
          url: expect.stringContaining("C%23"),
          headers: expect.any(Object),
        });
      });

      it("should handle unicode characters", async () => {
        const service = new BigHugeThesaurusService("id", "key");
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
    });

    describe("Malformed API responses", () => {
      it("MerriamWebster should handle response with undefined meta.id", async () => {
        const service = new MerriamWebsterService("id", "key");
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

      it("BigHugeThesaurus should handle response where data is not an object", async () => {
        const service = new BigHugeThesaurusService("id", "key");
        mockRequestUrl.mockResolvedValueOnce({
          json: null,
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        // Service handles null gracefully and returns an empty array
        const results = await service.lookup("test", 50);
        expect(results).toEqual([]);
      });

      it("FreeDictionary should handle entry with null meanings", async () => {
        const service = new FreeDictionaryService("id");
        mockRequestUrl.mockResolvedValueOnce({
          json: [{ word: "test", meanings: null }],
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        // Service handles null meanings gracefully and returns an empty array
        const results = await service.lookup("test", 50);
        expect(results).toEqual([]);
      });
    });

    describe("Rate limiting scenarios", () => {
      it("WordsAPI should properly report 429 in validate", async () => {
        const service = new WordsAPIService("id", "key");
        mockRequestUrl.mockRejectedValueOnce(new Error("Too Many Requests - 429"));

        const result = await service.validate();

        expect(result.valid).toBe(false);
        expect(result.error).toBe("Rate limit exceeded");
      });
    });

    describe("maxResults boundary conditions", () => {
      it("should handle maxResults of 0", async () => {
        const service = new FreeDictionaryService("id");
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

      it("should handle very large maxResults", async () => {
        const service = new APINinjasService("id", "key");
        mockRequestUrl.mockResolvedValueOnce({
          json: {
            word: "test",
            synonyms: ["a", "b", "c"],
            antonyms: [],
          },
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          text: "",
        });

        const results = await service.lookup("test", 1000000);

        expect(results).toHaveLength(3);
      });
    });

    describe("Empty word handling", () => {
      it("should handle empty string word", async () => {
        const service = new MerriamWebsterService("id", "key");
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

      it("should handle whitespace-only word", async () => {
        const service = new AltervistaService("id", "key");
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

    describe("Timeout handling", () => {
      it("should propagate timeout errors", async () => {
        const service = new WordsAPIService("id", "key");
        mockRequestUrl.mockRejectedValueOnce(new Error("Request timed out"));
        mockRequestUrl.mockRejectedValueOnce(new Error("Request timed out"));

        // WordsAPI catches errors per-endpoint and returns empty
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const results = await service.lookup("test", 50);

        expect(results).toEqual([]);
        consoleSpy.mockRestore();
      });
    });

    describe("Negative maxResults handling", () => {
      it("should handle negative maxResults (returns empty after slice)", async () => {
        const service = new MerriamWebsterService("id", "key");
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
    });

    describe("API key with special characters", () => {
      it("should URL-encode API key with special characters in URL param", async () => {
        const service = new AltervistaService("id", "key=with&special");
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
    });

    describe("Non-Error exception handling", () => {
      it("APINinjas validate should handle non-Error exceptions", async () => {
        const service = new APINinjasService("id", "key");
        mockRequestUrl.mockRejectedValueOnce("plain string error");

        const result = await service.validate();

        expect(result.valid).toBe(false);
        expect(result.error).toBe("Unknown error");
      });

      it("Altervista validate should handle non-Error exceptions", async () => {
        const service = new AltervistaService("id", "key");
        mockRequestUrl.mockRejectedValueOnce({ code: 500, message: "object error" });

        const result = await service.validate();

        expect(result.valid).toBe(false);
        expect(result.error).toBe("Unknown error");
      });

      it("BigHugeThesaurus validate should handle non-Error exceptions", async () => {
        const service = new BigHugeThesaurusService("id", "key");
        mockRequestUrl.mockRejectedValueOnce(null);

        const result = await service.validate();

        expect(result.valid).toBe(false);
        expect(result.error).toBe("Unknown error");
      });
    });

    describe("Response with incorrect structure", () => {
      it("MerriamWebster should handle syns that is not an array of arrays", async () => {
        const service = new MerriamWebsterService("id", "key");
        mockRequestUrl.mockResolvedValueOnce({
          json: [
            {
              meta: {
                id: "test",
                syns: "not-an-array", // Should be array of arrays
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

        // Service handles malformed syns gracefully and returns empty array
        const results = await service.lookup("test", 50);
        expect(results).toEqual([]);
      });

      it("FreeDictionary should handle definitions that is not an array", async () => {
        const service = new FreeDictionaryService("id");
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

        // The service gracefully handles non-array definitions by iterating
        // over the string characters, which yields no valid synonyms/antonyms
        const results = await service.lookup("test", 50);
        expect(results).toEqual([]);
      });
    });

    describe("Concurrent requests", () => {
      it("WordsAPI should handle concurrent lookups correctly", async () => {
        const service = new WordsAPIService("id", "key");

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

    describe("Empty types array", () => {
      it("should return empty when types is empty array", async () => {
        const service = new MerriamWebsterService("id", "key");
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
});
