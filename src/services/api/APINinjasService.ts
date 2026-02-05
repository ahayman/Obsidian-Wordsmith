import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface APINinjasThesaurusResponse {
  word: string;
  synonyms?: string[];
  antonyms?: string[];
}

const BASE_URL = "https://api.api-ninjas.com/v1/thesaurus";

export class APINinjasService implements SynonymService {
  readonly id: string;
  readonly name = "API Ninjas";
  readonly description = "Thesaurus API with generous free tier";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[]): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
    const url = `${BASE_URL}?word=${encodeURIComponent(word)}`;

    const response = await requestUrl({
      url,
      headers: {
        "X-Api-Key": this.apiKey,
      },
    });

    const data = response.json as APINinjasThesaurusResponse;
    const results: SynonymResult[] = [];

    if (requestedTypes.includes("synonym") && data.synonyms) {
      for (const synonym of data.synonyms) {
        results.push({
          word: synonym,
          type: "synonym",
          source: "api-ninjas",
        });
      }
    }

    if (requestedTypes.includes("antonym") && data.antonyms) {
      for (const antonym of data.antonyms) {
        results.push({
          word: antonym,
          type: "antonym",
          source: "api-ninjas",
        });
      }
    }

    return results.slice(0, maxResults);
  }

  supportedTypes(): RelationshipType[] {
    return API_SERVICE_INFO["api-ninjas"].supportedTypes;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}?word=test`;
      const response = await requestUrl({
        url,
        headers: {
          "X-Api-Key": this.apiKey,
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
        return { valid: false, error: error.message };
      }
      return { valid: false, error: "Unknown error" };
    }
  }
}
