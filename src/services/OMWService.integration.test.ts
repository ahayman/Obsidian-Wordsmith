/**
 * Integration tests for OMWService with real data samples.
 *
 * These tests verify that the OMW service correctly parses and looks up
 * synonyms from Open Multilingual WordNet data. We use sample data
 * in the actual OMW tab format.
 */

import { OMWService } from "./OMWService";
import { App } from "obsidian";
import { OMWLanguageCode, getOMWDownloadURL } from "../types/omwLanguage";

// Sample OMW data in the actual tab format for testing
// Format: synset_id<TAB>lang:type<TAB>value
const SAMPLE_FRENCH_DATA = `# French WordNet sample
00001740-n	fra:lemma	entité
00001740-n	eng:def	that which is perceived or known or inferred to have its own distinct existence
00002137-n	fra:lemma	chose
00002137-n	fra:lemma	objet
00002137-n	eng:def	a separate and self-contained entity
01148283-a	fra:lemma	heureux
01148283-a	fra:lemma	content
01148283-a	fra:lemma	joyeux
01148283-a	eng:def	enjoying or showing or marked by joy or pleasure
01150981-a	fra:lemma	triste
01150981-a	fra:lemma	malheureux
01150981-a	eng:def	experiencing or showing sorrow or unhappiness
02076196-v	fra:lemma	marcher
02076196-v	fra:lemma	aller
02076196-v	eng:def	use one's feet to advance; advance by steps
00835609-v	fra:lemma	dire
00835609-v	fra:lemma	parler
00835609-v	fra:lemma	exprimer
00835609-v	eng:def	express in words
`;

const SAMPLE_SPANISH_DATA = `# Spanish WordNet sample
00001740-n	spa:lemma	entidad
00001740-n	eng:def	that which is perceived or known or inferred to have its own distinct existence
00002137-n	spa:lemma	cosa
00002137-n	spa:lemma	objeto
00002137-n	eng:def	a separate and self-contained entity
01148283-a	spa:lemma	feliz
01148283-a	spa:lemma	contento
01148283-a	spa:lemma	alegre
01148283-a	spa:lemma	dichoso
01148283-a	eng:def	enjoying or showing or marked by joy or pleasure
01150981-a	spa:lemma	triste
01150981-a	spa:lemma	infeliz
01150981-a	eng:def	experiencing or showing sorrow or unhappiness
`;

const SAMPLE_GERMAN_DATA = `# German WordNet sample
00001740-n	deu:lemma	Entität
00001740-n	deu:lemma	Wesen
00001740-n	eng:def	that which is perceived or known or inferred to have its own distinct existence
01148283-a	deu:lemma	glücklich
01148283-a	deu:lemma	froh
01148283-a	deu:lemma	freudig
01148283-a	deu:lemma	fröhlich
01148283-a	eng:def	enjoying or showing or marked by joy or pleasure
01150981-a	deu:lemma	traurig
01150981-a	deu:lemma	unglücklich
01150981-a	eng:def	experiencing or showing sorrow or unhappiness
`;

const SAMPLE_JAPANESE_DATA = `# Japanese WordNet sample
01148283-a	jpn:lemma	嬉しい
01148283-a	jpn:lemma	喜ばしい
01148283-a	jpn:lemma	楽しい
01148283-a	jpn:lemma	幸せ
01148283-a	eng:def	enjoying or showing or marked by joy or pleasure
01150981-a	jpn:lemma	悲しい
01150981-a	jpn:lemma	寂しい
01150981-a	eng:def	experiencing or showing sorrow or unhappiness
`;

const SAMPLE_ITALIAN_DATA = `# Italian WordNet sample
01148283-a	ita:lemma	felice
01148283-a	ita:lemma	contento
01148283-a	ita:lemma	lieto
01148283-a	ita:lemma	allegro
01148283-a	eng:def	enjoying or showing or marked by joy or pleasure
01150981-a	ita:lemma	triste
01148283-a	ita:lemma	infelice
01150981-a	eng:def	experiencing or showing sorrow or unhappiness
`;

// Mock Obsidian App
const createMockApp = (): App => ({
  vault: {
    adapter: {
      exists: jest.fn().mockResolvedValue(false),
      mkdir: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(""),
      remove: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue({ files: [], folders: [] }),
    },
  },
} as unknown as App);

describe("OMWService Integration Tests", () => {
  let service: OMWService;
  let mockApp: App;

  beforeEach(() => {
    mockApp = createMockApp();
    service = new OMWService(mockApp, ".obsidian/plugins/wordsmith");
  });

  describe("parseTabFile()", () => {
    it("should parse French OMW data correctly", () => {
      const index = service.parseTabFile(SAMPLE_FRENCH_DATA);

      // Check word to synset mapping
      expect(index.wordToSynsets.has("heureux")).toBe(true);
      expect(index.wordToSynsets.has("content")).toBe(true);
      expect(index.wordToSynsets.has("joyeux")).toBe(true);

      // All happy synonyms should map to the same synset
      const heureuxSynsets = index.wordToSynsets.get("heureux");
      const contentSynsets = index.wordToSynsets.get("content");
      expect(heureuxSynsets).toContain("01148283-a");
      expect(contentSynsets).toContain("01148283-a");

      // Check synset data
      const happySynset = index.synsets.get("01148283-a");
      expect(happySynset).toBeDefined();
      expect(happySynset?.pos).toBe("adjective");
      expect(happySynset?.lemmas).toContain("heureux");
      expect(happySynset?.lemmas).toContain("content");
      expect(happySynset?.lemmas).toContain("joyeux");
      expect(happySynset?.definition).toBe("enjoying or showing or marked by joy or pleasure");
    });

    it("should parse Spanish OMW data correctly", () => {
      const index = service.parseTabFile(SAMPLE_SPANISH_DATA);

      expect(index.wordToSynsets.has("feliz")).toBe(true);
      expect(index.wordToSynsets.has("contento")).toBe(true);
      expect(index.wordToSynsets.has("alegre")).toBe(true);

      const happySynset = index.synsets.get("01148283-a");
      expect(happySynset?.lemmas).toContain("feliz");
      expect(happySynset?.lemmas).toContain("contento");
      expect(happySynset?.lemmas).toContain("alegre");
      expect(happySynset?.lemmas).toContain("dichoso");
    });

    it("should parse German OMW data correctly", () => {
      const index = service.parseTabFile(SAMPLE_GERMAN_DATA);

      expect(index.wordToSynsets.has("glücklich")).toBe(true);
      expect(index.wordToSynsets.has("froh")).toBe(true);

      const happySynset = index.synsets.get("01148283-a");
      expect(happySynset?.lemmas).toContain("glücklich");
      expect(happySynset?.lemmas).toContain("froh");
      expect(happySynset?.lemmas).toContain("fröhlich");
    });

    it("should parse Japanese OMW data correctly", () => {
      const index = service.parseTabFile(SAMPLE_JAPANESE_DATA);

      expect(index.wordToSynsets.has("嬉しい")).toBe(true);
      expect(index.wordToSynsets.has("喜ばしい")).toBe(true);
      expect(index.wordToSynsets.has("楽しい")).toBe(true);

      const happySynset = index.synsets.get("01148283-a");
      expect(happySynset?.lemmas).toContain("嬉しい");
      expect(happySynset?.lemmas).toContain("喜ばしい");
    });

    it("should parse Italian OMW data correctly", () => {
      const index = service.parseTabFile(SAMPLE_ITALIAN_DATA);

      expect(index.wordToSynsets.has("felice")).toBe(true);
      expect(index.wordToSynsets.has("contento")).toBe(true);

      const happySynset = index.synsets.get("01148283-a");
      expect(happySynset?.lemmas).toContain("felice");
      expect(happySynset?.lemmas).toContain("contento");
    });

    it("should handle different part-of-speech correctly", () => {
      const index = service.parseTabFile(SAMPLE_FRENCH_DATA);

      // Nouns
      const nounSynset = index.synsets.get("00001740-n");
      expect(nounSynset?.pos).toBe("noun");

      // Adjectives
      const adjSynset = index.synsets.get("01148283-a");
      expect(adjSynset?.pos).toBe("adjective");

      // Verbs
      const verbSynset = index.synsets.get("02076196-v");
      expect(verbSynset?.pos).toBe("verb");
    });

    it("should skip comment lines", () => {
      const index = service.parseTabFile(SAMPLE_FRENCH_DATA);
      // Verify comments don't create entries
      expect(index.wordToSynsets.has("# French WordNet sample")).toBe(false);
    });

    it("should handle empty lines", () => {
      const dataWithEmptyLines = `
01148283-a	fra:lemma	heureux

01148283-a	fra:lemma	content

`;
      const index = service.parseTabFile(dataWithEmptyLines);
      expect(index.wordToSynsets.has("heureux")).toBe(true);
      expect(index.wordToSynsets.has("content")).toBe(true);
    });
  });

  describe("lookup()", () => {
    beforeEach(() => {
      // Manually load test data into the service
      const frenchIndex = service.parseTabFile(SAMPLE_FRENCH_DATA);
      (service as any).loadedData.set("fra", frenchIndex);

      const spanishIndex = service.parseTabFile(SAMPLE_SPANISH_DATA);
      (service as any).loadedData.set("spa", spanishIndex);

      const germanIndex = service.parseTabFile(SAMPLE_GERMAN_DATA);
      (service as any).loadedData.set("deu", germanIndex);

      const japaneseIndex = service.parseTabFile(SAMPLE_JAPANESE_DATA);
      (service as any).loadedData.set("jpn", japaneseIndex);
    });

    it("should find French synonyms for 'heureux'", () => {
      const results = service.lookup("heureux", "fra");

      expect(results.length).toBeGreaterThan(0);

      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("content");
      expect(synonymWords).toContain("joyeux");
      // Should not include the search word itself
      expect(synonymWords).not.toContain("heureux");

      // Check result structure
      const firstResult = results[0];
      expect(firstResult.type).toBe("synonym");
      expect(firstResult.source).toBe("omw");
      expect(firstResult.partOfSpeech).toBe("adjective");
    });

    it("should find Spanish synonyms for 'feliz'", () => {
      const results = service.lookup("feliz", "spa");

      expect(results.length).toBeGreaterThan(0);

      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("contento");
      expect(synonymWords).toContain("alegre");
      expect(synonymWords).toContain("dichoso");
      expect(synonymWords).not.toContain("feliz");
    });

    it("should find German synonyms for 'glücklich'", () => {
      const results = service.lookup("glücklich", "deu");

      expect(results.length).toBeGreaterThan(0);

      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("froh");
      expect(synonymWords).toContain("fröhlich");
    });

    it("should find Japanese synonyms for '嬉しい'", () => {
      const results = service.lookup("嬉しい", "jpn");

      expect(results.length).toBeGreaterThan(0);

      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("喜ばしい");
      expect(synonymWords).toContain("楽しい");
    });

    it("should be case-insensitive", () => {
      const results1 = service.lookup("HEUREUX", "fra");
      const results2 = service.lookup("heureux", "fra");

      expect(results1.length).toBe(results2.length);
    });

    it("should return empty array for unknown word", () => {
      const results = service.lookup("xyznonexistent", "fra");
      expect(results).toEqual([]);
    });

    it("should return empty array for unloaded language", () => {
      const results = service.lookup("happy", "ita" as OMWLanguageCode);
      expect(results).toEqual([]);
    });

    it("should include definition in results", () => {
      const results = service.lookup("heureux", "fra");

      const resultWithDef = results.find((r) => r.definition);
      expect(resultWithDef?.definition).toBe("enjoying or showing or marked by joy or pleasure");
    });

    it("should find synonyms for verbs", () => {
      const results = service.lookup("marcher", "fra");

      expect(results.length).toBeGreaterThan(0);
      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("aller");
    });

    it("should find synonyms for nouns", () => {
      const results = service.lookup("chose", "fra");

      expect(results.length).toBeGreaterThan(0);
      const synonymWords = results.map((r) => r.word);
      expect(synonymWords).toContain("objet");
    });
  });

  describe("URL generation", () => {
    it("should generate correct URL for core languages in their own directory", () => {
      const fraUrl = getOMWDownloadURL("fra");
      expect(fraUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/fra/wn-data-fra.tab");

      const jpnUrl = getOMWDownloadURL("jpn");
      expect(jpnUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/jpn/wn-data-jpn.tab");
    });

    it("should generate correct URL for MCR languages (Spanish, Catalan, Basque, Galician)", () => {
      const spaUrl = getOMWDownloadURL("spa");
      expect(spaUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/mcr/wn-data-spa.tab");

      const catUrl = getOMWDownloadURL("cat");
      expect(catUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/mcr/wn-data-cat.tab");

      const eusUrl = getOMWDownloadURL("eus");
      expect(eusUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/mcr/wn-data-eus.tab");
    });

    it("should generate correct URL for Norwegian languages", () => {
      const nobUrl = getOMWDownloadURL("nob");
      expect(nobUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/nor/wn-data-nob.tab");

      const nnoUrl = getOMWDownloadURL("nno");
      expect(nnoUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/nor/wn-data-nno.tab");
    });

    it("should generate correct URL for Malay/Indonesian", () => {
      const zsmUrl = getOMWDownloadURL("zsm");
      expect(zsmUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/msa/wn-data-zsm.tab");

      const indUrl = getOMWDownloadURL("ind");
      expect(indUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/msa/wn-data-ind.tab");
    });

    it("should generate correct URL for extended CLDR languages", () => {
      const deuUrl = getOMWDownloadURL("deu");
      expect(deuUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/cldr/wn-cldr-deu.tab");

      const cesUrl = getOMWDownloadURL("ces");
      expect(cesUrl).toBe("https://raw.githubusercontent.com/omwn/omw-data/main/wns/cldr/wn-cldr-ces.tab");
    });
  });

  describe("deduplication", () => {
    it("should not return duplicate synonyms", () => {
      // Add data with potential duplicates (same lemma appearing multiple times)
      const dataWithDupes = `
01148283-a	fra:lemma	heureux
01148283-a	fra:lemma	content
01148283-a	fra:lemma	content
01148283-a	fra:lemma	joyeux
`;
      const index = service.parseTabFile(dataWithDupes);
      (service as any).loadedData.set("fra", index);

      const results = service.lookup("heureux", "fra");
      const contentCount = results.filter((r) => r.word === "content").length;
      expect(contentCount).toBe(1);
    });
  });
});

describe("OMWService Language Coverage", () => {
  // This test documents which languages we have sample data for
  const languagesWithSamples = [
    { code: "fra", name: "French", data: SAMPLE_FRENCH_DATA },
    { code: "spa", name: "Spanish", data: SAMPLE_SPANISH_DATA },
    { code: "deu", name: "German", data: SAMPLE_GERMAN_DATA },
    { code: "jpn", name: "Japanese", data: SAMPLE_JAPANESE_DATA },
    { code: "ita", name: "Italian", data: SAMPLE_ITALIAN_DATA },
  ];

  let service: OMWService;
  let mockApp: App;

  beforeEach(() => {
    mockApp = createMockApp();
    service = new OMWService(mockApp, ".obsidian/plugins/wordsmith");
  });

  for (const lang of languagesWithSamples) {
    describe(`${lang.name} (${lang.code})`, () => {
      beforeEach(() => {
        const index = service.parseTabFile(lang.data);
        (service as any).loadedData.set(lang.code, index);
      });

      it("should parse data without errors", () => {
        expect(service.isLoaded(lang.code as OMWLanguageCode)).toBe(true);
      });

      it("should have at least one synset", () => {
        const index = (service as any).loadedData.get(lang.code);
        expect(index.synsets.size).toBeGreaterThan(0);
      });

      it("should have at least one word mapping", () => {
        const index = (service as any).loadedData.get(lang.code);
        expect(index.wordToSynsets.size).toBeGreaterThan(0);
      });
    });
  }
});
