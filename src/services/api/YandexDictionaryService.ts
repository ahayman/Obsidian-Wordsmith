import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { LanguageCode } from "../../types/language";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface YandexSynonym {
  text: string;
  pos?: string;
}

interface YandexMeaning {
  text: string;
}

interface YandexTranslation {
  text: string;
  pos?: string;
  syn?: YandexSynonym[];
  mean?: YandexMeaning[];
}

interface YandexDefinition {
  text: string;
  pos?: string;
  ts?: string;
  tr?: YandexTranslation[];
}

interface YandexResponse {
  def?: YandexDefinition[];
}

const BASE_URL = "https://dictionary.yandex.net/api/v1/dicservice.json/lookup";

// Map our language codes to Yandex language codes for monolingual mode
const LANGUAGE_MAP: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  ru: "ru",
  tr: "tr",
  cs: "cs",
  da: "da",
  el: "el",
  hu: "hu",
  no: "no",
  pl: "pl",
  sk: "sk",
  bg: "bg",
  nl: "nl",
  sv: "sv",
  fi: "fi",
  uk: "uk",
  zh: "zh",
};

export class YandexDictionaryService implements SynonymService {
  readonly id: string;
  readonly name = "Yandex Dictionary";
  readonly description = "Free dictionary API with synonym support";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[], language: LanguageCode = "en"): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym"];
    const lang = LANGUAGE_MAP[language] || "en";
    const url = `${BASE_URL}?key=${encodeURIComponent(this.apiKey)}&lang=${lang}-${lang}&text=${encodeURIComponent(word)}&flags=4`;

    const response = await requestUrl({ url });
    const data = response.json as YandexResponse;

    const results: SynonymResult[] = [];

    if (!data.def || !Array.isArray(data.def)) {
      return [];
    }

    for (const def of data.def) {
      const partOfSpeech = def.pos;

      if (!def.tr || !Array.isArray(def.tr)) {
        continue;
      }

      for (const tr of def.tr) {
        // Primary translation/synonym
        if (requestedTypes.includes("synonym") && tr.text) {
          results.push({
            word: tr.text,
            type: "synonym",
            source: "yandex-dictionary",
            partOfSpeech,
          });
        }

        // Additional synonyms
        if (requestedTypes.includes("synonym") && tr.syn && Array.isArray(tr.syn)) {
          for (const syn of tr.syn) {
            if (syn.text) {
              results.push({
                word: syn.text,
                type: "synonym",
                source: "yandex-dictionary",
                partOfSpeech,
              });
            }
          }
        }

        // Meaning words (related synonyms)
        if (requestedTypes.includes("synonym") && tr.mean && Array.isArray(tr.mean)) {
          for (const mean of tr.mean) {
            if (mean.text) {
              results.push({
                word: mean.text,
                type: "synonym",
                source: "yandex-dictionary",
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
    return API_SERVICE_INFO["yandex-dictionary"].supportedTypes;
  }

  supportedLanguages(): LanguageCode[] {
    return API_SERVICE_INFO["yandex-dictionary"].supportedLanguages;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}?key=${encodeURIComponent(this.apiKey)}&lang=en-en&text=test&flags=4`;
      const response = await requestUrl({ url });

      if (response.status === 200) {
        return { valid: true };
      }

      return { valid: false, error: "Invalid API response" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          return { valid: false, error: "Invalid API key" };
        }
        if (error.message.includes("402")) {
          return { valid: false, error: "API key blocked" };
        }
        if (error.message.includes("403")) {
          return { valid: false, error: "Rate limit exceeded" };
        }
        return { valid: false, error: error.message };
      }
      return { valid: false, error: "Unknown error" };
    }
  }
}
