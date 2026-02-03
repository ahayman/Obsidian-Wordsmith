import { requestUrl } from "obsidian";
import { SynonymResult } from "../types";

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

  async lookup(word: string): Promise<{ synonyms: SynonymResult[]; relatedWords: SynonymResult[] }> {
    const [synonyms, relatedWords] = await Promise.all([
      this.getSynonyms(word),
      this.getRelatedWords(word),
    ]);

    const synonymWords = new Set(synonyms.map((s) => s.word));
    const filteredRelated = relatedWords.filter((r) => !synonymWords.has(r.word));

    return { synonyms, relatedWords: filteredRelated };
  }

  private parseDatamuseWord(
    item: DatamuseWord,
    type: "synonym" | "related"
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
