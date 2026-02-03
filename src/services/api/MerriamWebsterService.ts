import { requestUrl } from "obsidian";
import { SynonymResult } from "../../types";
import { SynonymService } from "../SynonymService";

interface MerriamWebsterSense {
  dt?: Array<[string, string | Array<{ wd: string }>]>;
}

interface MerriamWebsterDefinition {
  sseq?: Array<Array<[string, MerriamWebsterSense]>>;
}

interface MerriamWebsterEntry {
  meta?: {
    id: string;
    syns?: string[][];
    ants?: string[][];
  };
  fl?: string; // Functional label (part of speech)
  shortdef?: string[];
  def?: MerriamWebsterDefinition[];
}

const BASE_URL = "https://dictionaryapi.com/api/v3/references/thesaurus/json";

export class MerriamWebsterService implements SynonymService {
  readonly id: string;
  readonly name = "Merriam-Webster";
  readonly description = "Collegiate Thesaurus API";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number): Promise<SynonymResult[]> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}?key=${this.apiKey}`;

    const response = await requestUrl({ url });
    const data: unknown = response.json;

    // Check if we got valid results (not just spelling suggestions)
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // If result is just strings, it's spelling suggestions
    if (typeof data[0] === "string") {
      const suggestions = data as string[];
      return suggestions.slice(0, maxResults).map((suggestion) => ({
        word: suggestion,
        type: "spelling" as const,
        source: "merriam-webster" as const,
      }));
    }

    const entries = data as MerriamWebsterEntry[];
    const results: SynonymResult[] = [];

    for (const entry of entries) {
      const partOfSpeech = entry.fl;
      const definition = entry.shortdef?.[0];

      // Extract synonyms from meta.syns
      if (entry.meta?.syns) {
        for (const synGroup of entry.meta.syns) {
          for (const synonym of synGroup) {
            results.push({
              word: synonym,
              type: "synonym",
              source: "merriam-webster",
              partOfSpeech,
              definition,
            });
          }
        }
      }
    }

    // Deduplicate by word
    const seen = new Set<string>();
    const dedupedResults = results.filter((r) => {
      const key = r.word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return dedupedResults.slice(0, maxResults);
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}/test?key=${this.apiKey}`;
      const response = await requestUrl({ url });
      const data: unknown = response.json;

      // Check if we got a valid response (array of entries or suggestions)
      if (Array.isArray(data)) {
        return { valid: true };
      }

      return { valid: false, error: "Invalid API response" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("403")) {
          return { valid: false, error: "Invalid API key" };
        }
        return { valid: false, error: error.message };
      }
      return { valid: false, error: "Unknown error" };
    }
  }
}
