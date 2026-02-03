import { requestUrl } from "obsidian";
import { SynonymResult } from "../../types";
import { SynonymService } from "../SynonymService";

interface AltervistaEntry {
  word: string;
  score: string;
}

interface AltervistaCategory {
  category: string;
  synonyms: AltervistaEntry[];
}

interface AltervistaResponse {
  response?: AltervistaCategory[];
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
      for (const category of data.response) {
        const partOfSpeech = this.parseCategory(category.category);

        for (const entry of category.synonyms) {
          // Altervista returns comma-separated synonyms in the word field
          const words = entry.word.split(",").map((w) => w.trim());

          for (const synonym of words) {
            // Skip if it contains parentheses (usually annotations)
            if (synonym.includes("(") || synonym.includes(")")) continue;
            // Skip antonyms marker
            if (synonym.startsWith("antonym:")) continue;

            results.push({
              word: synonym,
              type: "synonym",
              source: "altervista",
              partOfSpeech,
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

  private parseCategory(category: string): string | undefined {
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
