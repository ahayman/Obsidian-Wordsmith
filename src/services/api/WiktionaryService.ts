import { requestUrl } from "obsidian";
import { SynonymResult, RelationshipType } from "../../types/types";
import { LanguageCode } from "../../types/language";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";

interface WikiPage {
  title: string;
  missing?: boolean;
  revisions?: Array<{
    slots?: {
      main?: {
        content?: string;
      };
    };
  }>;
}

interface WikiResponse {
  query?: {
    pages?: WikiPage[];
  };
}

const BASE_URL = "https://en.wiktionary.org/w/api.php";

// Map our language codes to English Wiktionary language section names
const LANGUAGE_SECTION_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  "pt-BR": "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  ru: "Russian",
  hi: "Hindi",
  tr: "Turkish",
  cs: "Czech",
  da: "Danish",
  el: "Greek",
  hu: "Hungarian",
  no: "Norwegian",
  pl: "Polish",
  ro: "Romanian",
  sk: "Slovak",
  bg: "Bulgarian",
  nl: "Dutch",
  sv: "Swedish",
  fi: "Finnish",
  uk: "Ukrainian",
  zh: "Chinese",
};

// Known POS section names in Wiktionary
const POS_SECTIONS = [
  "Noun", "Verb", "Adjective", "Adverb", "Pronoun",
  "Preposition", "Postposition", "Conjunction", "Interjection", "Determiner",
  "Particle", "Numeral", "Proper noun",
  "Classifier", "Counter", "Suffix", "Prefix",
];

export class WiktionaryService implements SynonymService {
  readonly id: string;
  readonly name = "Wiktionary";
  readonly description = "Free community dictionary";

  constructor(id: string) {
    this.id = id;
  }

  async lookup(word: string, maxResults: number, types?: RelationshipType[], language: LanguageCode = "en", depth = 0): Promise<SynonymResult[]> {
    const requestedTypes = types || ["synonym", "antonym"];
    const url = `${BASE_URL}?action=query&prop=revisions&titles=${encodeURIComponent(word)}&rvprop=content&rvslots=main&formatversion=2&format=json&origin=*`;

    const response = await requestUrl({
      url,
      headers: {
        "User-Agent": "ObsidianWordsmith/1.0 (https://github.com/Wordsmith; wordsmith@obsidian.md)",
      },
    });
    const data = response.json as WikiResponse;

    if (!data.query?.pages || !Array.isArray(data.query.pages) || data.query.pages.length === 0) {
      return [];
    }

    const page = data.query.pages[0];
    if (!page || page.missing || !page.revisions?.[0]?.slots?.main?.content) {
      return [];
    }

    const wikitext = page.revisions[0].slots.main.content;
    const langSection = LANGUAGE_SECTION_MAP[language] || "English";
    const results = this.parseWikitext(wikitext, langSection, requestedTypes);

    // If no results found, try following form-of templates to the lemma
    if (results.length === 0 && depth < 1) {
      const langContent = this.findLanguageSection(wikitext, langSection);
      if (langContent) {
        const lemma = this.extractLemmaFromFormOf(langContent);
        if (lemma && lemma.toLowerCase() !== word.toLowerCase()) {
          return this.lookup(lemma, maxResults, types, language, depth + 1);
        }
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

  private parseWikitext(content: string, language: string, requestedTypes: RelationshipType[]): SynonymResult[] {
    const langContent = this.findLanguageSection(content, language);
    if (!langContent) return [];

    const results: SynonymResult[] = [];

    // Find POS sections within the language section
    for (const pos of POS_SECTIONS) {
      const posContent = this.extractSection(langContent, pos, 3);
      if (!posContent) continue;

      const partOfSpeech = pos.toLowerCase();

      // Extract synonyms
      if (requestedTypes.includes("synonym")) {
        const synSection = this.extractSection(posContent, "Synonyms", 4);
        if (synSection) {
          const words = this.parseWordsFromSection(synSection);
          for (const word of words) {
            results.push({
              word,
              type: "synonym",
              source: "wiktionary",
              partOfSpeech,
            });
          }
        }
      }

      // Extract antonyms
      if (requestedTypes.includes("antonym")) {
        const antSection = this.extractSection(posContent, "Antonyms", 4);
        if (antSection) {
          const words = this.parseWordsFromSection(antSection);
          for (const word of words) {
            results.push({
              word,
              type: "antonym",
              source: "wiktionary",
              partOfSpeech,
            });
          }
        }
      }

      // Extract related and derived terms
      if (requestedTypes.includes("related")) {
        for (const sectionName of ["Related terms", "Derived terms"]) {
          const relSection = this.extractSection(posContent, sectionName, 4);
          if (relSection) {
            const words = this.parseWordsFromSection(relSection);
            for (const word of words) {
              results.push({
                word,
                type: "related",
                source: "wiktionary",
                partOfSpeech,
              });
            }
          }
        }
      }
    }

    return results;
  }

  /** Finds the content of a language section (e.g., ==English==) */
  private findLanguageSection(content: string, language: string): string | null {
    // Match ==Language== (level 2 heading)
    const regex = new RegExp(`^==${this.escapeRegex(language)}==\\s*$`, "m");
    const match = regex.exec(content);
    if (!match) return null;

    const start = match.index + match[0].length;
    // Find the next level 2 heading (==X== but not ===X===) or end of content
    let end = content.length;
    let searchPos = start;
    while (searchPos < content.length) {
      const nextNewlineEq = content.indexOf("\n==", searchPos);
      if (nextNewlineEq === -1) break;
      // Check if it's a level 2 heading (starts with == but not ===)
      const lineStart = nextNewlineEq + 1;
      if (content[lineStart] === "=" && content[lineStart + 1] === "=" && content[lineStart + 2] !== "=") {
        end = nextNewlineEq;
        break;
      }
      searchPos = nextNewlineEq + 1;
    }

    return content.substring(start, end);
  }

  /** Extracts a section by heading name at a given level */
  private extractSection(content: string, sectionName: string, level: number): string | null {
    const equals = "=".repeat(level);
    const regex = new RegExp(`^${equals}${this.escapeRegex(sectionName)}${equals}\\s*$`, "m");
    const match = regex.exec(content);
    if (!match) return null;

    const start = match.index + match[0].length;
    // Find the next heading at this level or higher
    const headingPattern = new RegExp(`^={2,${level}}[^=]`, "m");
    const rest = content.substring(start);
    const nextMatch = headingPattern.exec(rest);
    const end = nextMatch ? start + nextMatch.index : content.length;

    return content.substring(start, end);
  }

  /** Parses words from a Wiktionary section containing templates and wiki links */
  private parseWordsFromSection(section: string): string[] {
    const words: string[] = [];

    // Parse {{syn|en|word1|word2}}, {{ant|en|word1|word2}}, and {{l|en|word}} templates
    const synAntRegex = /\{\{(?:syn|ant|l|link)\|[^|]*\|([^}]+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = synAntRegex.exec(section)) !== null) {
      const captured = match[1];
      if (!captured) continue;
      const args = captured.split("|");
      for (const arg of args) {
        const cleaned = arg.trim();
        // Skip named parameters (contain =) and qualifiers
        if (cleaned && !cleaned.includes("=") && !cleaned.startsWith("<") && !cleaned.startsWith("(")) {
          words.push(cleaned);
        }
      }
    }

    // Parse {{col2|en|word1|word2...}} through {{col5|...}} column-layout templates
    const colRegex = /\{\{col[2-5]\|[^|]*\|([^}]+)\}\}/g;
    while ((match = colRegex.exec(section)) !== null) {
      const captured = match[1];
      if (!captured) continue;
      const args = captured.split("|");
      for (const arg of args) {
        const cleaned = arg.trim();
        if (cleaned && !cleaned.includes("=") && !cleaned.startsWith("<") && !cleaned.startsWith("(")) {
          words.push(cleaned);
        }
      }
    }

    // Parse [[word]] wiki links (only if no template matches found)
    if (words.length === 0) {
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      while ((match = wikiLinkRegex.exec(section)) !== null) {
        const captured = match[1];
        if (!captured) continue;
        const word = captured.trim();
        if (word && !word.includes(":") && !word.includes("#")) {
          words.push(word);
        }
      }
    }

    return words;
  }

  /** Extracts the lemma word from form-of templates (e.g., {{feminine singular of|fr|joyeux}}) */
  private extractLemmaFromFormOf(langContent: string): string | null {
    // Generic form-of templates: {{TYPE of|LANG|LEMMA}}
    const genericFormOfRegex = /\{\{(?:feminine singular|feminine plural|masculine plural|masculine singular|plural|singular|inflection|adj form|verb form|noun form|past participle|present participle|form|alternative form|abbreviation|misspelling|archaic form|obsolete form|rare form|dated form) of\|[^|]*\|([^|}]+)/;
    const genericMatch = genericFormOfRegex.exec(langContent);
    if (genericMatch?.[1]) {
      return genericMatch[1].trim();
    }

    // Language-specific templates: {{es-verb form of|LEMMA|...}}, {{de-adj form of|LEMMA|...}}, etc.
    // These put the lemma as the first argument after the template name
    const langSpecificRegex = /\{\{(?:es-verb form of|es-adj form of|de-adj form of|de-verb form of|it-adj form of|pt-verb form of|fr-verb form of|fi-form of)\|([^|}]+)/;
    const langMatch = langSpecificRegex.exec(langContent);
    if (langMatch?.[1]) {
      return langMatch[1].trim();
    }

    return null;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  supportedTypes(): RelationshipType[] {
    return API_SERVICE_INFO["wiktionary"].supportedTypes;
  }

  supportedLanguages(): LanguageCode[] {
    return API_SERVICE_INFO["wiktionary"].supportedLanguages;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test with a common word - Wiktionary is free, so just check connectivity
      const url = `${BASE_URL}?action=query&prop=revisions&titles=test&rvprop=content&rvslots=main&formatversion=2&format=json&origin=*`;
      await requestUrl({
        url,
        headers: {
          "User-Agent": "ObsidianWordsmith/1.0 (https://github.com/Wordsmith; wordsmith@obsidian.md)",
        },
      });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
