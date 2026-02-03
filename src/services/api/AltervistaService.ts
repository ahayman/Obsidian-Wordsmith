import { requestUrl } from "obsidian";
import { SynonymResult } from "../../types";
import { SynonymService } from "../SynonymService";

interface AltervistaList {
  category: string;
  synonyms: string; // Pipe-separated string of synonyms
}

interface AltervistaResponseItem {
  list: AltervistaList;
}

interface AltervistaResponse {
  response?: AltervistaResponseItem[];
}

const BASE_URL = "https://thesaurus.altervista.org/thesaurus/v1";

export class AltervistaService implements SynonymService {
  readonly id: string;
  readonly name = "Altervista";
  readonly description = "Multilingual thesaurus API";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number): Promise<SynonymResult[]> {
    const url = `${BASE_URL}?word=${encodeURIComponent(word)}&language=en_US&key=${this.apiKey}&output=json`;

    const response = await requestUrl({ url });
    const data = response.json as AltervistaResponse;

    const results: SynonymResult[] = [];

    if (data.response) {
      for (const item of data.response) {
        if (!item.list) continue;

        const partOfSpeech = this.parseCategory(item.list.category);
        const synonymsStr = item.list.synonyms;

        if (typeof synonymsStr !== "string") continue;

        // Synonyms are pipe-separated
        const entries = synonymsStr.split("|").map((s) => s.trim());

        for (const entry of entries) {
          // Skip if it contains parentheses (annotations like "similar term")
          if (entry.includes("(") || entry.includes(")")) continue;
          // Skip antonyms
          if (entry.toLowerCase().includes("antonym")) continue;
          // Skip empty entries
          if (!entry) continue;

          results.push({
            word: entry,
            type: "synonym",
            source: "altervista",
            partOfSpeech,
          });
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

  private parseCategory(category: string | undefined): string | undefined {
    if (!category) return undefined;
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("noun")) return "noun";
    if (categoryLower.includes("verb")) return "verb";
    if (categoryLower.includes("adj")) return "adjective";
    if (categoryLower.includes("adv")) return "adverb";
    return undefined;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}?word=test&language=en_US&key=${this.apiKey}&output=json`;
      const response = await requestUrl({ url });

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
