import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { LanguageCode } from "../../types/language";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface WordsAPIResponse {
  word: string;
  synonyms?: string[];
  antonyms?: string[];
  similarTo?: string[];
  typeOf?: string[];
  hasTypes?: string[];
}

const BASE_URL = "https://wordsapiv1.p.rapidapi.com/words";

// Mapping from RelationshipType to WordsAPI endpoint
const ENDPOINT_MAP: Record<RelationshipType, string> = {
  synonym: "synonyms",
  antonym: "antonyms",
  related: "similarTo",
  hypernym: "typeOf",  // What this word is a type of
  hyponym: "hasTypes", // What types this word has
};

export class WordsAPIService implements SynonymService {
  readonly id: string;
  readonly name = "WordsAPI";
  readonly description = "Comprehensive word data via RapidAPI";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  private async fetchEndpoint(word: string, endpoint: string): Promise<string[]> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}/${endpoint}`;

    try {
      const response = await requestUrl({
        url,
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com",
        },
      });

      const data = response.json as WordsAPIResponse;
      // Get the array from the response based on the endpoint name
      const key = endpoint as keyof WordsAPIResponse;
      const results = data[key];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      // 404 means the word exists but has no results for this type
      if (error instanceof Error && error.message.includes("404")) {
        return [];
      }
      throw error;
    }
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[], _language?: LanguageCode): Promise<SynonymResult[]> {
    // Default to synonyms + antonyms (the common upfront fetch)
    const requestedTypes = types || ["synonym", "antonym"];
    const results: SynonymResult[] = [];

    // Fetch all requested types in parallel
    const fetchPromises = requestedTypes.map(async (type) => {
      const endpoint = ENDPOINT_MAP[type];
      if (!endpoint) return [];

      try {
        const words = await this.fetchEndpoint(word, endpoint);
        return words.map((w): SynonymResult => ({
          word: w,
          type,
          source: "words-api",
        }));
      } catch (error) {
        console.error(`WordsAPI ${type} lookup failed:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(fetchPromises);
    for (const typeResults of allResults) {
      results.push(...typeResults);
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

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}/test/synonyms`;
      const response = await requestUrl({
        url,
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com",
        },
      });

      // A successful response means the key is valid
      if (response.status === 200) {
        return { valid: true };
      }

      return { valid: false, error: "Invalid API response" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          return { valid: false, error: "Invalid API key" };
        }
        if (error.message.includes("429")) {
          return { valid: false, error: "Rate limit exceeded" };
        }
        return { valid: false, error: error.message };
      }
      return { valid: false, error: "Unknown error" };
    }
  }

  supportedTypes(): RelationshipType[] {
    return API_SERVICE_INFO["words-api"].supportedTypes;
  }

  supportedLanguages(): LanguageCode[] {
    return API_SERVICE_INFO["words-api"].supportedLanguages;
  }
}
