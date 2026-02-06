import { SynonymResult, WordsmithSettings } from "../types/types";
import { LanguageCode } from "../types/language";
import { NSpellService } from "./NSpellService";
import { DatamuseService } from "./DatamuseService";

export class SpellingService {
  private nspell: NSpellService;
  private datamuse: DatamuseService;
  private settings: WordsmithSettings;

  constructor(
    nspell: NSpellService,
    datamuse: DatamuseService,
    settings: WordsmithSettings
  ) {
    this.nspell = nspell;
    this.datamuse = datamuse;
    this.settings = settings;
  }

  updateSettings(settings: WordsmithSettings): void {
    this.settings = settings;
  }

  /**
   * Get spelling suggestions for a word in a specific language.
   * @param word The word to check
   * @param language The language code (defaults to English)
   */
  async getSuggestions(word: string, language: LanguageCode = "en"): Promise<SynonymResult[]> {
    // Only show spelling suggestions if we can determine the word is misspelled
    // This requires nspell to be loaded for the language
    if (!this.nspell.canSpellCheck(language)) {
      return [];
    }

    // If the word is correctly spelled, no suggestions needed
    if (this.nspell.isCorrectByWordsmithLang(word, language)) {
      return [];
    }

    const results: SynonymResult[] = [];

    // Get nspell suggestions for the specific language
    const nspellResults = this.nspell.suggestByWordsmithLang(word, language);
    results.push(...nspellResults);

    // Get Datamuse suggestions unless offline-only mode
    // Note: Datamuse only supports English and Spanish for spelling
    if (!this.settings.offlineSpellingOnly && (language === "en" || language === "es")) {
      try {
        const datamuseResults = await this.datamuse.getSpellingSuggestions(word, language);
        results.push(...datamuseResults);
      } catch (error) {
        console.error("Datamuse spelling lookup failed:", error);
      }
    }

    return this.deduplicate(results, word, language);
  }

  private deduplicate(results: SynonymResult[], originalWord: string, language: LanguageCode = "en"): SynonymResult[] {
    const seen = new Set<string>();
    const normalizedOriginal = originalWord.normalize("NFC").toLocaleLowerCase(language);

    return results.filter((r) => {
      const key = r.word.normalize("NFC").toLocaleLowerCase(language);
      // Filter out the original word and duplicates
      if (key === normalizedOriginal || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
