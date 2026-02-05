import { SynonymResult, WordsmithSettings } from "../types/types";
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

  async getSuggestions(word: string): Promise<SynonymResult[]> {
    // Only show spelling suggestions if we can determine the word is misspelled
    // This requires nspell to be loaded
    if (!this.nspell.isLoaded()) {
      return [];
    }

    // If the word is correctly spelled, no suggestions needed
    if (this.nspell.isCorrect(word)) {
      return [];
    }

    const results: SynonymResult[] = [];

    // Get nspell suggestions
    const nspellResults = this.nspell.suggest(word);
    results.push(...nspellResults);

    // Get Datamuse suggestions unless offline-only mode
    if (!this.settings.offlineSpellingOnly) {
      try {
        const datamuseResults = await this.datamuse.getSpellingSuggestions(word);
        results.push(...datamuseResults);
      } catch (error) {
        console.error("Datamuse spelling lookup failed:", error);
      }
    }

    return this.deduplicate(results, word);
  }

  private deduplicate(results: SynonymResult[], originalWord: string): SynonymResult[] {
    const seen = new Set<string>();
    const normalizedOriginal = originalWord.toLowerCase();

    return results.filter((r) => {
      const key = r.word.toLowerCase();
      // Filter out the original word and duplicates
      if (key === normalizedOriginal || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
