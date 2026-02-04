import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface BigHugeThesaurusEntry {
  syn?: string[];
  ant?: string[];
  rel?: string[];
  sim?: string[];
}

interface BigHugeThesaurusResponse {
  noun?: BigHugeThesaurusEntry;
  verb?: BigHugeThesaurusEntry;
  adjective?: BigHugeThesaurusEntry;
  adverb?: BigHugeThesaurusEntry;
}

const BASE_URL = "https://words.bighugelabs.com/api/2";

export class BigHugeThesaurusService implements SynonymService {
  readonly id: string;
  readonly name = "Big Huge Thesaurus";
  readonly description = "Simple thesaurus API with synonyms and related words";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[]): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym", "related"];
    const url = `${BASE_URL}/${this.apiKey}/${encodeURIComponent(word)}/json`;

    const response = await requestUrl({ url });
    const data = response.json as BigHugeThesaurusResponse;

    const results: SynonymResult[] = [];
    const partsOfSpeech: (keyof BigHugeThesaurusResponse)[] = [
      "noun",
      "verb",
      "adjective",
      "adverb",
    ];

    for (const pos of partsOfSpeech) {
      const entry = data[pos];
      if (!entry) continue;

      // Add synonyms
      if (requestedTypes.includes("synonym") && entry.syn) {
        for (const synonym of entry.syn) {
          results.push({
            word: synonym,
            type: "synonym",
            source: "big-huge-thesaurus",
            partOfSpeech: pos,
          });
        }
      }

      // Add similar words as synonyms
      if (requestedTypes.includes("synonym") && entry.sim) {
        for (const similar of entry.sim) {
          results.push({
            word: similar,
            type: "synonym",
            source: "big-huge-thesaurus",
            partOfSpeech: pos,
          });
        }
      }

      // Add antonyms
      if (requestedTypes.includes("antonym") && entry.ant) {
        for (const antonym of entry.ant) {
          results.push({
            word: antonym,
            type: "antonym",
            source: "big-huge-thesaurus",
            partOfSpeech: pos,
          });
        }
      }

      // Add related words
      if (requestedTypes.includes("related") && entry.rel) {
        for (const related of entry.rel) {
          results.push({
            word: related,
            type: "related",
            source: "big-huge-thesaurus",
            partOfSpeech: pos,
          });
        }
      }
    }

    // Deduplicate by word+type
    const seen = new Set<string>();
    const dedupedResults = results.filter((r) => {
      const key = `${r.type}:${r.word.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return dedupedResults.slice(0, maxResults);
  }

  supportedTypes(): RelationshipType[] {
    return API_SERVICE_INFO["big-huge-thesaurus"].supportedTypes;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}/${this.apiKey}/test/json`;
      const response = await requestUrl({ url });

      // A successful response means the key is valid
      if (response.status === 200) {
        return { valid: true };
      }

      return { valid: false, error: "Invalid API response" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          // 404 for "test" word is actually fine - key is valid, word not found
          return { valid: true };
        }
        if (error.message.includes("401") || error.message.includes("403")) {
          return { valid: false, error: "Invalid API key" };
        }
        return { valid: false, error: error.message };
      }
      return { valid: false, error: "Unknown error" };
    }
  }
}
