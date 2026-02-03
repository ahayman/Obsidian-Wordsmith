import { requestUrl } from "obsidian";
import { SynonymResult } from "../../types";
import { SynonymService } from "../SynonymService";

interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  synonyms?: string[];
  antonyms?: string[];
}

interface FreeDictionaryEntry {
  word: string;
  meanings: FreeDictionaryMeaning[];
}

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

export class FreeDictionaryService implements SynonymService {
  readonly id: string;
  readonly name = "Free Dictionary";
  readonly description = "Free and open dictionary API";

  constructor(id: string) {
    this.id = id;
  }

  async lookup(word: string, maxResults: number): Promise<SynonymResult[]> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}`;

    const response = await requestUrl({ url });
    const data = response.json as FreeDictionaryEntry[];

    const results: SynonymResult[] = [];

    for (const entry of data) {
      for (const meaning of entry.meanings) {
        // Top-level synonyms for this part of speech
        if (meaning.synonyms) {
          for (const synonym of meaning.synonyms) {
            results.push({
              word: synonym,
              type: "synonym",
              source: "free-dictionary",
              partOfSpeech: meaning.partOfSpeech,
            });
          }
        }

        // Synonyms from definitions
        for (const def of meaning.definitions) {
          if (def.synonyms) {
            for (const synonym of def.synonyms) {
              results.push({
                word: synonym,
                type: "synonym",
                source: "free-dictionary",
                partOfSpeech: meaning.partOfSpeech,
                definition: def.definition,
              });
            }
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
      // Test with a common word
      const results = await this.lookup("test", 5);
      if (results.length > 0) {
        return { valid: true };
      }
      return { valid: true }; // API works even if no synonyms for "test"
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
