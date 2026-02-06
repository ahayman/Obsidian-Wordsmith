import { WiktionaryService } from "./WiktionaryService";

// Mock the obsidian module
jest.mock("obsidian", () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from "obsidian";

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

// Helper to create a Wiktionary API response
function createWikiResponse(content: string, missing = false) {
  return {
    json: {
      query: {
        pages: [
          missing
            ? { title: "test", missing: true }
            : {
                title: "test",
                revisions: [
                  {
                    slots: {
                      main: { content },
                    },
                  },
                ],
              },
        ],
      },
    },
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    text: "",
  };
}

// Sample wikitext that mimics real Wiktionary structure
const SAMPLE_WIKITEXT = `==English==

===Noun===
# A trial or examination.
# A challenge.

====Synonyms====
{{syn|en|trial|examination|quiz}}

====Antonyms====
{{ant|en|answer|solution}}

===Verb===
# To administer a test.

====Synonyms====
* {{l|en|examine}}
* {{l|en|assess}}

==French==

===Noun===
# {{l|fr|test}}

====Synonyms====
{{syn|fr|essai|épreuve}}
`;

const WIKITEXT_WITH_LINKS = `==English==

===Adjective===
# Feeling happy.

====Synonyms====
* [[joyful]]
* [[cheerful]]
* [[content]]

====Antonyms====
* [[sad]]
* [[unhappy]]
`;

const WIKITEXT_MULTIPLE_POS = `==English==

===Noun===
# A run.

====Synonyms====
{{syn|en|race|sprint}}

===Verb===
# To move quickly.

====Synonyms====
{{syn|en|sprint|dash|jog}}
`;

describe("WiktionaryService", () => {
  const createService = () => new WiktionaryService("wk-123");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and properties", () => {
    it("should set id and name correctly (no apiKey required)", () => {
      const service = createService();
      expect(service.id).toBe("wk-123");
      expect(service.name).toBe("Wiktionary");
      expect(service.description).toBe("Free community dictionary");
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

  describe("supportedLanguages", () => {
    it("should return all supported languages", () => {
      const service = createService();
      const languages = service.supportedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("fr");
      expect(languages).toContain("zh");
      expect(languages.length).toBeGreaterThan(20);
    });
  });

  describe("lookup - successful responses", () => {
    it("should parse synonyms from {{syn}} templates", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50);

      const synonyms = results.filter(r => r.type === "synonym");
      expect(synonyms.map(r => r.word)).toContain("trial");
      expect(synonyms.map(r => r.word)).toContain("examination");
      expect(synonyms.map(r => r.word)).toContain("quiz");
    });

    it("should parse antonyms from {{ant}} templates", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50);

      const antonyms = results.filter(r => r.type === "antonym");
      expect(antonyms.map(r => r.word)).toContain("answer");
      expect(antonyms.map(r => r.word)).toContain("solution");
    });

    it("should parse synonyms from {{l}} link templates", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50);

      const verbSynonyms = results.filter(r => r.type === "synonym" && r.partOfSpeech === "verb");
      expect(verbSynonyms.map(r => r.word)).toContain("examine");
      expect(verbSynonyms.map(r => r.word)).toContain("assess");
    });

    it("should parse synonyms from [[wiki links]]", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(WIKITEXT_WITH_LINKS));

      const results = await service.lookup("happy", 50);

      const synonyms = results.filter(r => r.type === "synonym");
      expect(synonyms.map(r => r.word)).toContain("joyful");
      expect(synonyms.map(r => r.word)).toContain("cheerful");
      expect(synonyms.map(r => r.word)).toContain("content");
    });

    it("should parse antonyms from [[wiki links]]", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(WIKITEXT_WITH_LINKS));

      const results = await service.lookup("happy", 50);

      const antonyms = results.filter(r => r.type === "antonym");
      expect(antonyms.map(r => r.word)).toContain("sad");
      expect(antonyms.map(r => r.word)).toContain("unhappy");
    });

    it("should handle multiple parts of speech", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(WIKITEXT_MULTIPLE_POS));

      const results = await service.lookup("run", 50);

      const nounSyns = results.filter(r => r.partOfSpeech === "noun");
      const verbSyns = results.filter(r => r.partOfSpeech === "verb");
      expect(nounSyns.length).toBeGreaterThan(0);
      expect(verbSyns.length).toBeGreaterThan(0);
    });

    it("should set correct partOfSpeech on results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50);

      const nounResults = results.filter(r => r.partOfSpeech === "noun");
      const verbResults = results.filter(r => r.partOfSpeech === "verb");
      expect(nounResults.length).toBeGreaterThan(0);
      expect(verbResults.length).toBeGreaterThan(0);
    });

    it("should filter by requested types", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50, ["antonym"]);

      expect(results.every(r => r.type === "antonym")).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter only synonyms when requested", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50, ["synonym"]);

      expect(results.every(r => r.type === "synonym")).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should use correct language section for non-English lookups", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 50, ["synonym"], "fr");

      const frenchSyns = results.filter(r => r.type === "synonym");
      expect(frenchSyns.map(r => r.word)).toContain("essai");
      expect(frenchSyns.map(r => r.word)).toContain("épreuve");
    });

    it("should send User-Agent header", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      await service.lookup("test", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.any(String),
        headers: {
          "User-Agent": expect.stringContaining("ObsidianWordsmith"),
        },
      });
    });

    it("should deduplicate results", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(WIKITEXT_MULTIPLE_POS));

      const results = await service.lookup("run", 50);

      // "sprint" appears in both noun and verb — should be deduped
      expect(results.filter(r => r.word === "sprint" && r.type === "synonym")).toHaveLength(1);
    });

    it("should respect maxResults", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 2);

      expect(results).toHaveLength(2);
    });

    it("should URL encode the word", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(""));

      await service.lookup("hello world", 50);

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("hello%20world"),
        headers: expect.any(Object),
      });
    });
  });

  describe("lookup - edge cases", () => {
    it("should handle missing page", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse("", true));

      const results = await service.lookup("xyznotaword", 50);

      expect(results).toEqual([]);
    });

    it("should handle empty response", async () => {
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

    it("should handle page with no language section match", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse("==Latin==\n===Noun===\nsome content"));

      const results = await service.lookup("test", 50, undefined, "en");

      expect(results).toEqual([]);
    });

    it("should handle language section with no POS sections", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse("==English==\nJust some text without POS"));

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle POS section with no synonyms/antonyms", async () => {
      const service = createService();
      const wikitext = `==English==

===Noun===
# A thing.
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("test", 50);

      expect(results).toEqual([]);
    });

    it("should handle maxResults of 0", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

      const results = await service.lookup("test", 0);

      expect(results).toEqual([]);
    });

    it("should handle pages with empty revisions", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce({
        json: {
          query: {
            pages: [{ title: "test", revisions: [] }],
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

    it("should throw on API error", async () => {
      const service = createService();
      mockRequestUrl.mockRejectedValueOnce(new Error("Request failed, status 429"));

      await expect(service.lookup("test", 50)).rejects.toThrow("status 429");
    });
  });

  describe("validate", () => {
    it("should return valid when API is accessible", async () => {
      const service = createService();
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(SAMPLE_WIKITEXT));

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

  describe("form-of following", () => {
    it("should follow generic form-of template to lemma when no results found", async () => {
      const service = createService();
      // First call: inflected form with form-of template, no synonyms
      const inflectedWikitext = `==French==

===Adjective===
{{head|fr|adjective form}}

# {{feminine singular of|fr|joyeux}}
`;
      // Second call: lemma form with actual synonyms
      const lemmaWikitext = `==French==

===Adjective===
# Happy, joyful.

====Synonyms====
{{syn|fr|content|gai|heureux}}
`;
      mockRequestUrl
        .mockResolvedValueOnce(createWikiResponse(inflectedWikitext))
        .mockResolvedValueOnce(createWikiResponse(lemmaWikitext));

      const results = await service.lookup("joyeuse", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
      // Second call should be for the lemma "joyeux"
      expect(mockRequestUrl.mock.calls[1][0].url).toContain("joyeux");
      const synonyms = results.filter(r => r.type === "synonym");
      expect(synonyms.map(r => r.word)).toContain("content");
      expect(synonyms.map(r => r.word)).toContain("gai");
      expect(synonyms.map(r => r.word)).toContain("heureux");
    });

    it("should follow plural of template", async () => {
      const service = createService();
      const inflectedWikitext = `==French==

===Noun===
{{head|fr|noun form}}

# {{plural of|fr|maison}}
`;
      const lemmaWikitext = `==French==

===Noun===
# House, home.

====Synonyms====
{{syn|fr|demeure|domicile}}
`;
      mockRequestUrl
        .mockResolvedValueOnce(createWikiResponse(inflectedWikitext))
        .mockResolvedValueOnce(createWikiResponse(lemmaWikitext));

      const results = await service.lookup("maisons", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
      expect(results.map(r => r.word)).toContain("demeure");
      expect(results.map(r => r.word)).toContain("domicile");
    });

    it("should follow language-specific form-of templates", async () => {
      const service = createService();
      const inflectedWikitext = `==French==

===Verb===
{{head|fr|verb form}}

# {{fr-verb form of|parler}}
`;
      const lemmaWikitext = `==French==

===Verb===
# To speak.

====Synonyms====
{{syn|fr|discuter|causer}}
`;
      mockRequestUrl
        .mockResolvedValueOnce(createWikiResponse(inflectedWikitext))
        .mockResolvedValueOnce(createWikiResponse(lemmaWikitext));

      const results = await service.lookup("parlé", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
      expect(results.map(r => r.word)).toContain("discuter");
    });

    it("should not follow form-of when results are already found", async () => {
      const service = createService();
      // Page has both a form-of AND synonyms — should NOT follow
      const wikitext = `==French==

===Adjective===
# {{feminine singular of|fr|joyeux}}

====Synonyms====
{{syn|fr|contente|gaie}}
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("joyeuse", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      expect(results.map(r => r.word)).toContain("contente");
    });

    it("should not follow form-of beyond depth 1", async () => {
      const service = createService();
      // First form-of redirects to another form-of
      const firstRedirect = `==French==

===Adjective===
# {{feminine singular of|fr|intermédiaire}}
`;
      const secondRedirect = `==French==

===Adjective===
# {{alternative form of|fr|intermediaire}}
`;
      mockRequestUrl
        .mockResolvedValueOnce(createWikiResponse(firstRedirect))
        .mockResolvedValueOnce(createWikiResponse(secondRedirect));

      const results = await service.lookup("intermédiaires", 50, ["synonym"], "fr");

      // Should stop after depth 1 (2 API calls total), not chase further
      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
      expect(results).toEqual([]);
    });

    it("should not follow form-of when lemma matches the original word", async () => {
      const service = createService();
      const wikitext = `==French==

===Noun===
# {{plural of|fr|test}}
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      // Word is "test" and lemma is "test" — no redirect
      const results = await service.lookup("test", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      expect(results).toEqual([]);
    });

    it("should not follow form-of when no form-of template is found", async () => {
      const service = createService();
      const wikitext = `==French==

===Noun===
# Just a definition with no form-of template.
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("chose", 50, ["synonym"], "fr");

      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      expect(results).toEqual([]);
    });
  });

  describe("wikitext parsing - template variants", () => {
    it("should skip named parameters in templates", async () => {
      const service = createService();
      const wikitext = `==English==

===Noun===
# A thing.

====Synonyms====
{{syn|en|word1|word2|pos=noun}}
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("test", 50, ["synonym"]);

      expect(results.map(r => r.word)).toContain("word1");
      expect(results.map(r => r.word)).toContain("word2");
      expect(results.map(r => r.word)).not.toContain("pos=noun");
    });

    it("should handle link templates with extra parameters", async () => {
      const service = createService();
      const wikitext = `==English==

===Noun===
# A thing.

====Synonyms====
* {{link|en|word1}}
* {{l|en|word2}}
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("test", 50, ["synonym"]);

      expect(results.map(r => r.word)).toContain("word1");
      expect(results.map(r => r.word)).toContain("word2");
    });

    it("should handle wiki links with display text", async () => {
      const service = createService();
      const wikitext = `==English==

===Noun===
# A thing.

====Synonyms====
* [[actual word|display text]]
* [[simple word]]
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("test", 50, ["synonym"]);

      expect(results.map(r => r.word)).toContain("actual word");
      expect(results.map(r => r.word)).toContain("simple word");
    });

    it("should skip category and anchor links", async () => {
      const service = createService();
      const wikitext = `==English==

===Noun===
# A thing.

====Synonyms====
* [[Category:English]]
* [[good]]
* [[#Related]]
`;
      mockRequestUrl.mockResolvedValueOnce(createWikiResponse(wikitext));

      const results = await service.lookup("test", 50, ["synonym"]);

      expect(results).toHaveLength(1);
      expect(results[0].word).toBe("good");
    });
  });
});
