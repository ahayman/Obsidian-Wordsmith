import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { LanguageCode } from "../../types/language";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface LexicalaSense {
  definition?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface LexicalaHeadword {
  pos?: string;
}

interface LexicalaResult {
  headword?: LexicalaHeadword;
  senses?: LexicalaSense[];
}

interface LexicalaResponse {
  results?: LexicalaResult[];
}

const BASE_URL = "https://lexicala1.p.rapidapi.com";

// Map our language codes to Lexicala language codes
const LANGUAGE_MAP: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  "pt-BR": "pt",
  ja: "ja",
  ko: "ko",
  ar: "ar",
  ru: "ru",
  hi: "hi",
  tr: "tr",
  cs: "cs",
  da: "da",
  el: "el",
  hu: "hu",
  no: "no",
  pl: "pl",
  ro: "ro",
  sk: "sk",
  bg: "bg",
  nl: "nl",
  sv: "sv",
  fi: "fi",
  zh: "zh",
};

export class LexicalaService implements SynonymService {
  readonly id: string;
  readonly name = "Lexicala";
  readonly description = "Multilingual dictionary API via RapidAPI";
  private apiKey: string;

  constructor(id: string, apiKey: string) {
    this.id = id;
    this.apiKey = apiKey;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[], language: LanguageCode = "en"): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
    const lang = LANGUAGE_MAP[language] || "en";
    const url = `${BASE_URL}/search-entries?text=${encodeURIComponent(word)}&language=${lang}&source=global`;

    const response = await requestUrl({
      url,
      headers: {
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": "lexicala1.p.rapidapi.com",
      },
    });
    const data = response.json as LexicalaResponse;

    const results: SynonymResult[] = [];

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    for (const result of data.results) {
      const partOfSpeech = result.headword?.pos;

      if (!result.senses || !Array.isArray(result.senses)) {
        continue;
      }

      let senseIndex = 0;
      for (const sense of result.senses) {
        const defId = `lx-${partOfSpeech || "unknown"}-${senseIndex}`;

        if (requestedTypes.includes("synonym") && sense.synonyms && Array.isArray(sense.synonyms)) {
          for (const synonym of sense.synonyms) {
            results.push({
              word: synonym,
              type: "synonym",
              source: "lexicala",
              partOfSpeech,
              definition: sense.definition,
              definitionId: defId,
            });
          }
        }

        if (requestedTypes.includes("antonym") && sense.antonyms && Array.isArray(sense.antonyms)) {
          for (const antonym of sense.antonyms) {
            results.push({
              word: antonym,
              type: "antonym",
              source: "lexicala",
              partOfSpeech,
              definition: sense.definition,
              definitionId: defId,
            });
          }
        }

        senseIndex++;
      }
    }

    // Deduplicate by word+type
    const seen = new Set<string>();
    const dedupedResults = results.filter((r) => {
      const key = `${r.type}:${r.word.normalize("NFC").toLocaleLowerCase(language)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return dedupedResults.slice(0, maxResults);
  }

  supportedTypes(): RelationshipType[] {
    return API_SERVICE_INFO["lexicala"].supportedTypes;
  }

  supportedLanguages(): LanguageCode[] {
    return API_SERVICE_INFO["lexicala"].supportedLanguages;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${BASE_URL}/search-entries?text=test&language=en&source=global`;
      const response = await requestUrl({
        url,
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": "lexicala1.p.rapidapi.com",
        },
      });

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
