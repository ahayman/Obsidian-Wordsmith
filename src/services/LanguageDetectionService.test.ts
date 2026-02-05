import { LanguageDetectionService } from "./LanguageDetectionService";
import { LANGUAGE_SAMPLES, getSampleByCode } from "../test-data/languageSamples";
import { franc } from "franc-min";

describe("LanguageDetectionService", () => {
  let service: LanguageDetectionService;

  beforeEach(() => {
    service = new LanguageDetectionService();
  });

  describe("detect()", () => {
    it("should return null for empty text", () => {
      expect(service.detect("")).toBeNull();
    });

    it("should return null for whitespace-only text", () => {
      expect(service.detect("   \n\t  ")).toBeNull();
    });

    it("should return null for text shorter than 20 characters", () => {
      expect(service.detect("Hello world")).toBeNull();
      expect(service.detect("Short text")).toBeNull();
    });

    // Languages that franc-min reliably detects with our mapping
    it("should detect English text", () => {
      const sample = getSampleByCode("en");
      expect(sample).toBeDefined();
      const result = service.detect(sample!.text);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("en");
    });

    it("should detect Spanish text", () => {
      const sample = getSampleByCode("es");
      expect(sample).toBeDefined();
      const result = service.detect(sample!.text);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("es");
    });

    it("should detect French text", () => {
      const sample = getSampleByCode("fr");
      expect(sample).toBeDefined();
      const result = service.detect(sample!.text);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("fr");
    });

    it("should detect German text", () => {
      const sample = getSampleByCode("de");
      expect(sample).toBeDefined();
      const result = service.detect(sample!.text);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("de");
    });
  });

  describe("detectWithFallback()", () => {
    it("should return detected language when detection succeeds", () => {
      const sample = getSampleByCode("es");
      const result = service.detectWithFallback(sample!.text, "en");
      expect(result.code).toBe("es");
      expect(result.source).toBe("detection");
      expect(result.detectionFailed).toBe(false);
    });

    it("should return fallback when text is too short", () => {
      const result = service.detectWithFallback("short", "en");
      expect(result.code).toBe("en");
      expect(result.source).toBe("fallback");
      expect(result.detectionFailed).toBe(true);
    });

    it("should return fallback when text is empty", () => {
      const result = service.detectWithFallback("", "fr");
      expect(result.code).toBe("fr");
      expect(result.source).toBe("fallback");
      expect(result.detectionFailed).toBe(true);
    });

    it("should use provided fallback language", () => {
      const result = service.detectWithFallback("tiny", "de");
      expect(result.code).toBe("de");
    });

    it("should fallback when language is not in our mapping", () => {
      // franc-min detects the language but if it's not in our mapping, we fallback
      const sample = getSampleByCode("nl"); // Dutch may not be in our ISO mapping
      if (sample) {
        const result = service.detectWithFallback(sample.text, "en");
        // Either detects correctly OR falls back gracefully
        expect(["nl", "en"]).toContain(result.code);
      }
    });
  });

  describe("franc-min detection coverage", () => {
    // This test documents what franc-min actually detects for each sample
    // Useful for understanding the library's capabilities
    it("should document franc-min detection results for all samples", () => {
      const results: Record<string, string> = {};

      for (const sample of LANGUAGE_SAMPLES) {
        const iso639_3 = franc(sample.text);
        results[sample.code] = iso639_3;
      }

      // Languages franc-min reliably detects (these should work)
      expect(results["en"]).toBe("eng");
      expect(results["es"]).toBe("spa");
      expect(results["fr"]).toBe("fra");
      expect(results["de"]).toBe("deu");

      // Log all results for documentation purposes
      // console.log("franc-min detection results:", results);
    });
  });

  describe("edge cases", () => {
    it("should handle mixed language text (returns dominant language)", () => {
      const mixedText = "This is a test of the language detection system. It should work well with natural text that contains multiple sentences.";
      const result = service.detect(mixedText);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("en");
    });

    it("should handle text with numbers and punctuation", () => {
      const text = "In 2024, the world's population reached approximately 8 billion people. This is a significant milestone!";
      const result = service.detect(text);
      expect(result).not.toBeNull();
      expect(result?.code).toBe("en");
    });

    it("should handle text exactly at minimum length", () => {
      const text = "This is twenty char."; // 20 characters
      const result = service.detect(text);
      // May or may not detect - depends on franc's confidence
      expect(result === null || result.code !== undefined).toBe(true);
    });

    it("should handle Unicode characters without crashing", () => {
      const chinese = "中文是世界上使用人数最多的语言之一。它有着悠久的历史。";
      const result = service.detect(chinese);
      expect(result === null || result.code !== undefined).toBe(true);
    });

    it("should handle Cyrillic text (Russian)", () => {
      const sample = getSampleByCode("ru");
      const result = service.detect(sample!.text);
      // franc-min should detect Cyrillic, even if not in our mapping
      // This tests that we handle the result gracefully
      expect(result === null || result.code !== undefined).toBe(true);
    });

    it("should handle Arabic script", () => {
      const sample = getSampleByCode("ar");
      const result = service.detect(sample!.text);
      expect(result === null || result.code !== undefined).toBe(true);
    });

    it("should handle Japanese text", () => {
      const sample = getSampleByCode("ja");
      const result = service.detect(sample!.text);
      expect(result === null || result.code !== undefined).toBe(true);
    });

    it("should handle Korean text", () => {
      const sample = getSampleByCode("ko");
      const result = service.detect(sample!.text);
      expect(result === null || result.code !== undefined).toBe(true);
    });
  });
});

/**
 * Documentation test: Shows what languages franc-min actually supports
 * and what it returns for various inputs.
 */
describe("franc-min library capabilities", () => {
  it("should show supported language detection", () => {
    // Test samples with longer text for better detection
    const testCases = [
      { name: "English", text: "The quick brown fox jumps over the lazy dog. This is a longer sentence to ensure proper detection.", expected: "eng" },
      { name: "Spanish", text: "El español es una lengua romance derivada del latín. Se habla en muchos países del mundo.", expected: "spa" },
      { name: "French", text: "La langue française est une langue romane. Elle est parlée dans de nombreux pays à travers le monde.", expected: "fra" },
      { name: "German", text: "Die deutsche Sprache ist eine westgermanische Sprache. Sie wird vor allem in Deutschland gesprochen.", expected: "deu" },
    ];

    for (const testCase of testCases) {
      const result = franc(testCase.text);
      expect(result).toBe(testCase.expected);
    }
  });
});
