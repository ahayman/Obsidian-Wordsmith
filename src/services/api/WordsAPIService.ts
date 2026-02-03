import { requestUrl } from "obsidian";
import { SynonymResult } from "../../types";
import { SynonymService } from "../SynonymService";

interface WordsAPISynonymResponse {
  word: string;
  synonyms?: string[];
}

const BASE_URL = "https://wordsapiv1.p.rapidapi.com/words";

export class WordsAPIService implements SynonymService {
  readonly id: string;
  readonly name = "WordsAPI";
  readonly description = "Comprehensive word data via RapidAPI";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number): Promise<SynonymResult[]> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}/synonyms`;

    const response = await requestUrl({
      url,
      headers: {
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com",
      },
    });

    const data = response.json as WordsAPISynonymResponse;
    const results: SynonymResult[] = [];

    if (data.synonyms) {
      for (const synonym of data.synonyms) {
        results.push({
          word: synonym,
          type: "synonym",
          source: "words-api",
        });
      }
    }

    return results.slice(0, maxResults);
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
}
