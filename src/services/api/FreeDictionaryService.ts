import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

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

  async lookup(word: string, maxResults: number, types?: RelationshipType[]): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
    const url = `${BASE_URL}/${encodeURIComponent(word)}`;

    const response = await requestUrl({ url });
    const data = response.json as FreeDictionaryEntry[];

    const results: SynonymResult[] = [];

    for (const entry of data) {
      // Handle null/undefined meanings
      if (!entry.meanings || !Array.isArray(entry.meanings)) {
        continue;
      }

      let meaningIndex = 0;
      for (const meaning of entry.meanings) {
        // Top-level synonyms for this part of speech (no specific definition)
        if (requestedTypes.includes("synonym") && meaning.synonyms) {
          for (const synonym of meaning.synonyms) {
            results.push({
              word: synonym,
              type: "synonym",
              source: "free-dictionary",
              partOfSpeech: meaning.partOfSpeech,
              definitionId: `fd-${meaning.partOfSpeech}-${meaningIndex}`,
            });
          }
        }

        // Top-level antonyms for this part of speech (no specific definition)
        if (requestedTypes.includes("antonym") && meaning.antonyms) {
          for (const antonym of meaning.antonyms) {
            results.push({
              word: antonym,
              type: "antonym",
              source: "free-dictionary",
              partOfSpeech: meaning.partOfSpeech,
              definitionId: `fd-${meaning.partOfSpeech}-${meaningIndex}`,
            });
          }
        }

        // Synonyms and antonyms from definitions
        let defIndex = 0;
        for (const def of meaning.definitions) {
          const defId = `fd-${meaning.partOfSpeech}-${meaningIndex}-${defIndex}`;

          if (requestedTypes.includes("synonym") && def.synonyms) {
            for (const synonym of def.synonyms) {
              results.push({
                word: synonym,
                type: "synonym",
                source: "free-dictionary",
                partOfSpeech: meaning.partOfSpeech,
                definition: def.definition,
                definitionId: defId,
              });
            }
          }

          if (requestedTypes.includes("antonym") && def.antonyms) {
            for (const antonym of def.antonyms) {
              results.push({
                word: antonym,
                type: "antonym",
                source: "free-dictionary",
                partOfSpeech: meaning.partOfSpeech,
                definition: def.definition,
                definitionId: defId,
              });
            }
          }
          defIndex++;
        }
        meaningIndex++;
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
    return API_SERVICE_INFO["free-dictionary"].supportedTypes;
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
