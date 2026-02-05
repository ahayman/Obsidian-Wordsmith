import { APINinjasService } from "./APINinjasService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe("APINinjasService", () => {
  const createService = (apiKey = "test-api-key") =>
    new APINinjasService("ninjas-123", apiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    it("should handle non-Error exceptions", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce("plain string error");

      const result = await service.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("edge cases", () => {
    it("should handle words with hash", async () => {
      const service = createService();
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

    it("should handle very large maxResults", async () => {
      const service = createService();
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
});
