import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../types";

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
}

const DATAMUSE_BASE_URL = "https://api.datamuse.com/words";

export class DatamuseService {
  private maxResults: number;

  constructor(maxResults: number = 50) {
    this.maxResults = maxResults;
  }

  setMaxResults(max: number): void {
    this.maxResults = max;
  }

  async getSynonyms(word: string): Promise<SynonymResult[]> {
    const url = `${DATAMUSE_BASE_URL}?rel_syn=${encodeURIComponent(word)}&max=${this.maxResults}&md=dp`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as DatamuseWord[];

      return data.map((item) => this.parseDatamuseWord(item, "synonym"));
    } catch (error) {
      console.error("Datamuse synonym lookup failed:", error);
      return [];
    }
  }

  async getRelatedWords(word: string): Promise<SynonymResult[]> {
    const url = `${DATAMUSE_BASE_URL}?ml=${encodeURIComponent(word)}&max=${this.maxResults}&md=dp`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as DatamuseWord[];

      return data.map((item) => this.parseDatamuseWord(item, "related"));
    } catch (error) {
      console.error("Datamuse related words lookup failed:", error);
      return [];
    }
  }

  async getSpellingSuggestions(word: string): Promise<SynonymResult[]> {
    // Use "sounds like" (sl) parameter for spelling suggestions
    const url = `${DATAMUSE_BASE_URL}?sl=${encodeURIComponent(word)}&max=${this.maxResults}`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as Array<{ word: string; score?: number }>;

      return data.map((item) => ({
        word: item.word,
        type: "spelling" as const,
        source: "datamuse" as const,
      }));
    } catch (error) {
      console.error("Datamuse spelling suggestions lookup failed:", error);
      return [];
    }
  }

  async getAntonyms(word: string): Promise<SynonymResult[]> {
    // rel_ant = antonyms
    const url = `${DATAMUSE_BASE_URL}?rel_ant=${encodeURIComponent(word)}&max=${this.maxResults}&md=dp`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as DatamuseWord[];

      return data.map((item) => this.parseDatamuseWord(item, "antonym"));
    } catch (error) {
      console.error("Datamuse antonym lookup failed:", error);
      return [];
    }
  }

  async getHypernyms(word: string): Promise<SynonymResult[]> {
    // rel_spc = "more specific than" = hypernyms (words that the query is a type of)
    const url = `${DATAMUSE_BASE_URL}?rel_spc=${encodeURIComponent(word)}&max=${this.maxResults}&md=dp`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as DatamuseWord[];

      return data.map((item) => this.parseDatamuseWord(item, "hypernym"));
    } catch (error) {
      console.error("Datamuse hypernym lookup failed:", error);
      return [];
    }
  }

  async getHyponyms(word: string): Promise<SynonymResult[]> {
    // rel_gen = "more general than" = hyponyms (more specific terms under the query)
    const url = `${DATAMUSE_BASE_URL}?rel_gen=${encodeURIComponent(word)}&max=${this.maxResults}&md=dp`;

    try {
      const response = await requestUrl({ url });
      const data = response.json as DatamuseWord[];

      return data.map((item) => this.parseDatamuseWord(item, "hyponym"));
    } catch (error) {
      console.error("Datamuse hyponym lookup failed:", error);
      return [];
    }
  }

  async lookup(word: string, types?: RelationshipType[]): Promise<{ synonyms: SynonymResult[]; relatedWords: SynonymResult[] }> {
    // Default to synonym + related for backward compatibility
    const requestedTypes = types || ["synonym", "related"];

    const promises: Promise<SynonymResult[]>[] = [];
    const typeMapping: { type: RelationshipType; promise: Promise<SynonymResult[]> }[] = [];

    if (requestedTypes.includes("synonym")) {
      const p = this.getSynonyms(word);
      promises.push(p);
      typeMapping.push({ type: "synonym", promise: p });
    }
    if (requestedTypes.includes("related")) {
      const p = this.getRelatedWords(word);
      promises.push(p);
      typeMapping.push({ type: "related", promise: p });
    }
    if (requestedTypes.includes("antonym")) {
      const p = this.getAntonyms(word);
      promises.push(p);
      typeMapping.push({ type: "antonym", promise: p });
    }
    if (requestedTypes.includes("hypernym")) {
      const p = this.getHypernyms(word);
      promises.push(p);
      typeMapping.push({ type: "hypernym", promise: p });
    }
    if (requestedTypes.includes("hyponym")) {
      const p = this.getHyponyms(word);
      promises.push(p);
      typeMapping.push({ type: "hyponym", promise: p });
    }

    await Promise.all(promises);

    // Collect results
    const allResults: SynonymResult[] = [];
    const synonymWords = new Set<string>();

    for (const mapping of typeMapping) {
      const results = await mapping.promise;
      if (mapping.type === "synonym") {
        results.forEach(r => synonymWords.add(r.word));
      }
      allResults.push(...results);
    }

    // Separate synonyms from other results (for backward compatibility return format)
    const synonyms = allResults.filter(r => r.type === "synonym");
    const relatedWords = allResults.filter(r => r.type !== "synonym" && !synonymWords.has(r.word));

    return { synonyms, relatedWords };
  }

  /**
   * Lookup specific relationship types and return flat array of results.
   * Used for lazy loading additional types.
   */
  async lookupTypes(word: string, types: RelationshipType[]): Promise<SynonymResult[]> {
    const { synonyms, relatedWords } = await this.lookup(word, types);
    return [...synonyms, ...relatedWords];
  }

  supportedTypes(): RelationshipType[] {
    return ["synonym", "antonym", "related", "hypernym", "hyponym"];
  }

  private parseDatamuseWord(
    item: DatamuseWord,
    type: "synonym" | "antonym" | "related" | "hypernym" | "hyponym"
  ): SynonymResult {
    const result: SynonymResult = {
      word: item.word,
      type,
      source: "datamuse",
    };

    if (item.tags) {
      const posTag = item.tags.find((t) => t.startsWith("n") || t.startsWith("v") || t.startsWith("adj") || t.startsWith("adv"));
      if (posTag) {
        result.partOfSpeech = this.expandPOS(posTag);
      }
    }

    if (item.defs && item.defs.length > 0) {
      const firstDef = item.defs[0];
      if (firstDef) {
        const defParts = firstDef.split("\t");
        result.definition = defParts.length > 1 ? defParts[1] : defParts[0];
      }
    }

    return result;
  }

  private expandPOS(tag: string): string {
    const posMap: Record<string, string> = {
      n: "noun",
      v: "verb",
      adj: "adjective",
      adv: "adverb",
    };
    return posMap[tag] || tag;
  }
}
