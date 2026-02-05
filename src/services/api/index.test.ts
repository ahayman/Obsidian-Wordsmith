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
import { APIServiceType } from "../../types/types";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

describe("API Service Factory Functions", () => {
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
});
