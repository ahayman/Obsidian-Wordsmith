import { App, requestUrl } from "obsidian";
import { SynonymResult, OMWSynset, OMWIndex, ProgressCallback } from "../types/types";
import { LanguageCode } from "../types/language";
import {
  OMWLanguageCode,
  getOMWCodeFromWordsmith,
  getOMWLanguageInfo,
  getOMWDownloadURL,
  isValidOMWCode,
} from "../types/omwLanguage";

// Map OMW part-of-speech codes to human-readable labels
const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  r: "adverb",
  s: "adjective satellite",
};

export class OMWService {
  private app: App;
  private pluginDir: string;
  private loadedData: Map<OMWLanguageCode, OMWIndex> = new Map();
  private loadingPromises: Map<OMWLanguageCode, Promise<void>> = new Map();

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  /**
   * Get the cache directory path for OMW files.
   */
  get cacheDir(): string {
    return `${this.pluginDir}/cache/omw`;
  }

  /**
   * Get the cache file path for a specific language.
   */
  getCachePath(lang: OMWLanguageCode): string {
    return `${this.cacheDir}/${lang}.tab`;
  }

  /**
   * Check if a language is downloaded (file exists).
   */
  async isDownloaded(lang: OMWLanguageCode): Promise<boolean> {
    try {
      return await this.app.vault.adapter.exists(this.getCachePath(lang));
    } catch {
      return false;
    }
  }

  /**
   * Get list of all downloaded language codes.
   */
  async getDownloadedLanguages(): Promise<OMWLanguageCode[]> {
    const downloaded: OMWLanguageCode[] = [];
    try {
      const exists = await this.app.vault.adapter.exists(this.cacheDir);
      if (!exists) return [];

      const files = await this.app.vault.adapter.list(this.cacheDir);
      for (const file of files.files) {
        // Extract language code from filename (e.g., "fra.tab" -> "fra")
        const match = file.match(/\/([a-z]{3})\.tab$/);
        if (match && match[1] && isValidOMWCode(match[1])) {
          downloaded.push(match[1]);
        }
      }
    } catch (error) {
      console.error("Failed to list OMW languages:", error);
    }
    return downloaded;
  }

  /**
   * Download OMW data for a language.
   */
  async download(lang: OMWLanguageCode, progressCallback?: ProgressCallback): Promise<boolean> {
    const url = getOMWDownloadURL(lang);

    try {
      // Ensure cache directory exists
      if (!(await this.app.vault.adapter.exists(this.cacheDir))) {
        // Create parent cache dir if needed
        const parentCacheDir = `${this.pluginDir}/cache`;
        if (!(await this.app.vault.adapter.exists(parentCacheDir))) {
          await this.app.vault.adapter.mkdir(parentCacheDir);
        }
        await this.app.vault.adapter.mkdir(this.cacheDir);
      }

      if (progressCallback) {
        progressCallback({ loaded: 0, total: 100, percent: 0 });
      }

      const response = await requestUrl({ url });

      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100, percent: 50 });
      }

      const text = response.text;
      await this.app.vault.adapter.write(this.getCachePath(lang), text);

      if (progressCallback) {
        progressCallback({ loaded: 100, total: 100, percent: 100 });
      }

      // Parse and load into memory
      this.loadedData.set(lang, this.parseTabFile(text));

      return true;
    } catch (error) {
      console.error(`Failed to download OMW data for ${lang}:`, error);
      return false;
    }
  }

  /**
   * Delete OMW data for a language.
   */
  async delete(lang: OMWLanguageCode): Promise<void> {
    try {
      if (await this.isDownloaded(lang)) {
        await this.app.vault.adapter.remove(this.getCachePath(lang));
      }
      this.loadedData.delete(lang);
    } catch (error) {
      console.error(`Failed to delete OMW data for ${lang}:`, error);
    }
  }

  /**
   * Load OMW data for a language into memory.
   */
  async load(lang: OMWLanguageCode): Promise<void> {
    // Already loaded
    if (this.loadedData.has(lang)) return;

    // Already loading
    const existingPromise = this.loadingPromises.get(lang);
    if (existingPromise) {
      await existingPromise;
      return;
    }

    const loadPromise = this.doLoad(lang);
    this.loadingPromises.set(lang, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(lang);
    }
  }

  private async doLoad(lang: OMWLanguageCode): Promise<void> {
    try {
      const exists = await this.isDownloaded(lang);
      if (!exists) {
        return;
      }

      const content = await this.app.vault.adapter.read(this.getCachePath(lang));
      this.loadedData.set(lang, this.parseTabFile(content));
    } catch (error) {
      console.error(`Failed to load OMW data for ${lang}:`, error);
    }
  }

  /**
   * Check if a language is loaded in memory.
   */
  isLoaded(lang: OMWLanguageCode): boolean {
    return this.loadedData.has(lang);
  }

  /**
   * Parse OMW tab-separated file format.
   *
   * Format examples:
   * - 01148283-a  fra:lemma   heureux
   * - 01148283-a  fra:lemma   content
   * - 01148283-a  eng:def     enjoying or showing pleasure
   *
   * The synset ID format is: {offset}-{pos} where pos is:
   * - n = noun
   * - v = verb
   * - a = adjective
   * - r = adverb
   * - s = adjective satellite
   */
  parseTabFile(content: string): OMWIndex {
    const wordToSynsets = new Map<string, string[]>();
    const synsets = new Map<string, OMWSynset>();

    const lines = content.split("\n");

    for (const line of lines) {
      if (!line.trim() || line.startsWith("#")) continue;

      const parts = line.split("\t");
      if (parts.length < 3) continue;

      const synsetId = parts[0]?.trim();
      const typeInfo = parts[1]?.trim();
      const value = parts[2]?.trim();

      if (!synsetId || !typeInfo || !value) continue;

      // Extract part of speech from synset ID (e.g., "01148283-a" -> "a")
      const posMatch = synsetId.match(/-([nvasr])$/);
      const pos = posMatch ? posMatch[1] : "";

      // Parse type info (e.g., "fra:lemma" or "eng:def")
      const [langCode, entryType] = typeInfo.split(":");
      if (!langCode || !entryType) continue;

      // Ensure synset exists
      let synset = synsets.get(synsetId);
      if (!synset) {
        synset = {
          id: synsetId,
          pos: POS_LABELS[pos!] || pos || "",
          lemmas: [],
          definition: undefined,
        };
        synsets.set(synsetId, synset);
      }

      if (entryType === "lemma") {
        // Add lemma to synset
        const normalizedValue = value.toLowerCase();
        if (!synset.lemmas.includes(normalizedValue)) {
          synset.lemmas.push(normalizedValue);
        }

        // Add word -> synset mapping
        const existingSynsets = wordToSynsets.get(normalizedValue);
        if (existingSynsets) {
          if (!existingSynsets.includes(synsetId)) {
            existingSynsets.push(synsetId);
          }
        } else {
          wordToSynsets.set(normalizedValue, [synsetId]);
        }
      } else if (entryType === "def") {
        // Store definition (prefer first one if multiple)
        if (!synset.definition) {
          synset.definition = value;
        }
      }
    }

    return { wordToSynsets, synsets };
  }

  /**
   * Look up synonyms for a word in a specific OMW language.
   */
  lookup(word: string, lang: OMWLanguageCode): SynonymResult[] {
    const index = this.loadedData.get(lang);
    if (!index) return [];

    const normalizedWord = word.toLowerCase();
    const synsetIds = index.wordToSynsets.get(normalizedWord);

    if (!synsetIds) return [];

    const results: SynonymResult[] = [];
    const seen = new Set<string>();

    for (const synsetId of synsetIds) {
      const synset = index.synsets.get(synsetId);
      if (!synset) continue;

      for (const lemma of synset.lemmas) {
        // Skip the original word and duplicates
        if (lemma === normalizedWord || seen.has(lemma)) continue;
        seen.add(lemma);

        results.push({
          word: lemma,
          type: "synonym",
          source: "omw",
          partOfSpeech: synset.pos,
          definition: synset.definition,
          definitionId: synsetId,
        });
      }
    }

    return results;
  }

  /**
   * Look up synonyms using Wordsmith language code.
   * Maps the Wordsmith code to OMW code and performs lookup.
   * Returns empty array if no mapping exists or language not loaded.
   */
  lookupByWordsmithLang(word: string, langCode: LanguageCode): SynonymResult[] {
    const omwCode = getOMWCodeFromWordsmith(langCode);
    if (!omwCode) return [];

    return this.lookup(word, omwCode);
  }

  /**
   * Check if we can look up words for a Wordsmith language code.
   */
  canLookupWordsmithLang(langCode: LanguageCode): boolean {
    const omwCode = getOMWCodeFromWordsmith(langCode);
    if (!omwCode) return false;
    return this.isLoaded(omwCode);
  }

  /**
   * Get the OMW code for a Wordsmith language, if available.
   */
  getOMWCodeForWordsmith(langCode: LanguageCode): OMWLanguageCode | undefined {
    return getOMWCodeFromWordsmith(langCode);
  }

  /**
   * Unload all data from memory.
   */
  unloadAll(): void {
    this.loadedData.clear();
  }

  /**
   * Unload a specific language from memory.
   */
  unload(lang: OMWLanguageCode): void {
    this.loadedData.delete(lang);
  }

  /**
   * Get info about an OMW language.
   */
  getLanguageInfo(lang: OMWLanguageCode) {
    return getOMWLanguageInfo(lang);
  }
}
