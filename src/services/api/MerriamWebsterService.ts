import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

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

  async lookup(word: string, maxResults: number, types?: RelationshipType[]): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
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
      const entryId = entry.meta?.id || "unknown";

      // Extract synonyms from meta.syns (each synGroup corresponds to a shortdef)
      if (requestedTypes.includes("synonym") && entry.meta?.syns && Array.isArray(entry.meta.syns)) {
        entry.meta.syns.forEach((synGroup, synGroupIndex) => {
          // Ensure synGroup is an array before iterating
          if (!Array.isArray(synGroup)) return;
          const definition = entry.shortdef?.[synGroupIndex];
          const defId = `mw-${entryId}-${synGroupIndex}`;
          for (const synonym of synGroup) {
            results.push({
              word: synonym,
              type: "synonym",
              source: "merriam-webster",
              partOfSpeech,
              definition,
              definitionId: defId,
            });
          }
        });
      }

      // Extract antonyms from meta.ants (each antGroup corresponds to a shortdef)
      if (requestedTypes.includes("antonym") && entry.meta?.ants && Array.isArray(entry.meta.ants)) {
        entry.meta.ants.forEach((antGroup, antGroupIndex) => {
          // Ensure antGroup is an array before iterating
          if (!Array.isArray(antGroup)) return;
          const definition = entry.shortdef?.[antGroupIndex];
          const defId = `mw-${entryId}-${antGroupIndex}`;
          for (const antonym of antGroup) {
            results.push({
              word: antonym,
              type: "antonym",
              source: "merriam-webster",
              partOfSpeech,
              definition,
              definitionId: defId,
            });
          }
        });
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
    return API_SERVICE_INFO["merriam-webster"].supportedTypes;
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
