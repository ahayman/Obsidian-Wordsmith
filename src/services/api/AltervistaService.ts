import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { LanguageCode } from "../../types/language";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

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

// Map our language codes to Altervista API language parameter
const LANGUAGE_PARAM_MAP: Record<string, string> = {
  cs: "cs_CZ",
  da: "da_DK",
  de: "de_DE",
  el: "el_GR",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  hu: "hu_HU",
  it: "it_IT",
  no: "no_NO",
  pl: "pl_PL",
  "pt-BR": "pt_PT",  // Altervista uses pt_PT
  ro: "ro_RO",
  ru: "ru_RU",
  sk: "sk_SK",
};

export class AltervistaService implements SynonymService {
  readonly id: string;
  readonly name = "Altervista";
  readonly description = "Multilingual thesaurus API";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[], language: LanguageCode = "en"): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
    const langParam = LANGUAGE_PARAM_MAP[language] || "en_US";
    const url = `${BASE_URL}?word=${encodeURIComponent(word)}&language=${langParam}&key=${encodeURIComponent(this.apiKey)}&output=json`;

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
          // Skip empty entries
          if (!entry) continue;

          // Check for antonym annotation
          const isAntonym = entry.toLowerCase().includes("(antonym)");

          if (isAntonym) {
            if (requestedTypes.includes("antonym")) {
              // Extract word from annotation like "word (antonym)"
              const cleanWord = entry.replace(/\s*\(antonym\)\s*/i, "").trim();
              if (cleanWord) {
                results.push({
                  word: cleanWord,
                  type: "antonym",
                  source: "altervista",
                  partOfSpeech,
                });
              }
            }
          } else {
            // Skip other annotations (similar term, etc.) but keep plain words
            if (entry.includes("(") || entry.includes(")")) continue;

            if (requestedTypes.includes("synonym")) {
              results.push({
                word: entry,
                type: "synonym",
                source: "altervista",
                partOfSpeech,
              });
            }
          }
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
    return API_SERVICE_INFO["altervista"].supportedTypes;
  }

  supportedLanguages(): LanguageCode[] {
    return API_SERVICE_INFO["altervista"].supportedLanguages;
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
      const url = `${BASE_URL}?word=test&language=en_US&key=${encodeURIComponent(this.apiKey)}&output=json`;
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
