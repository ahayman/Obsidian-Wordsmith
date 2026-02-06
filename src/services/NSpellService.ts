import { App, requestUrl } from "obsidian";
import { SynonymResult, ProgressCallback } from "../types/types";
import { LanguageCode } from "../types/language";
import {
  HunspellLanguageCode,
  getHunspellDownloadURL,
  HUNSPELL_TO_WORDSMITH,
  WORDSMITH_TO_HUNSPELL,
} from "../types/hunspellLanguage";
import nspell from "nspell";

type NSpellInstance = ReturnType<typeof nspell>;

export class NSpellService {
  private app: App;
  private pluginDir: string;
  private spellInstances: Map<HunspellLanguageCode, NSpellInstance> = new Map();
  private loadingPromises: Map<HunspellLanguageCode, Promise<void>> = new Map();

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  get cacheDir(): string {
    return `${this.pluginDir}/cache/nspell`;
  }

  /**
   * Get path to dictionary file for a language.
   * For backward compatibility, "en" returns the old path without language suffix in filename.
   */
  getDicPath(lang: HunspellLanguageCode): string {
    return `${this.cacheDir}/${lang}.dic`;
  }

  /**
   * Get path to affix file for a language.
   */
  getAffPath(lang: HunspellLanguageCode): string {
    return `${this.cacheDir}/${lang}.aff`;
  }

  /**
   * @deprecated Use getDicPath("en") instead. Kept for backward compatibility.
   */
  get dicPath(): string {
    return this.getDicPath("en");
  }

  /**
   * @deprecated Use getAffPath("en") instead. Kept for backward compatibility.
   */
  get affPath(): string {
    return this.getAffPath("en");
  }

  /**
   * Check if dictionary files are downloaded for a specific language.
   */
  async isDownloaded(lang: HunspellLanguageCode = "en"): Promise<boolean> {
    try {
      const dicPath = this.getDicPath(lang);
      const affPath = this.getAffPath(lang);
      const dicExists = await this.app.vault.adapter.exists(dicPath);
      const affExists = await this.app.vault.adapter.exists(affPath);
      return dicExists && affExists;
    } catch {
      return false;
    }
  }

  /**
   * Get list of all downloaded languages by scanning the cache directory.
   */
  async getDownloadedLanguages(): Promise<HunspellLanguageCode[]> {
    const languages: HunspellLanguageCode[] = [];
    try {
      if (!(await this.app.vault.adapter.exists(this.cacheDir))) {
        return languages;
      }

      const files = await this.app.vault.adapter.list(this.cacheDir);
      const dicFiles = files.files.filter(f => f.endsWith(".dic"));

      for (const dicFile of dicFiles) {
        // Extract language code from filename (e.g., "en.dic" -> "en")
        const fileName = dicFile.split("/").pop();
        if (!fileName) continue;
        const langCode = fileName.replace(".dic", "") as HunspellLanguageCode;

        // Check if corresponding .aff file exists
        const affPath = this.getAffPath(langCode);
        if (await this.app.vault.adapter.exists(affPath)) {
          languages.push(langCode);
        }
      }
    } catch (error) {
      console.error("Failed to list downloaded Hunspell languages:", error);
    }
    return languages;
  }

  /**
   * Load dictionary for a specific language.
   */
  async load(lang: HunspellLanguageCode = "en"): Promise<void> {
    if (this.spellInstances.has(lang)) return;
    if (this.loadingPromises.has(lang)) return this.loadingPromises.get(lang);

    const loadPromise = this.doLoad(lang);
    this.loadingPromises.set(lang, loadPromise);
    await loadPromise;
    this.loadingPromises.delete(lang);
  }

  private async doLoad(lang: HunspellLanguageCode): Promise<void> {
    try {
      const exists = await this.isDownloaded(lang);
      if (!exists) {
        return;
      }

      const dicPath = this.getDicPath(lang);
      const affPath = this.getAffPath(lang);

      const [aff, dic] = await Promise.all([
        this.app.vault.adapter.read(affPath),
        this.app.vault.adapter.read(dicPath),
      ]);

      this.spellInstances.set(lang, nspell({ aff, dic }));
    } catch (error) {
      console.error(`Failed to load nspell data for ${lang}:`, error);
    }
  }

  /**
   * Download dictionary for a specific language.
   */
  async download(lang: HunspellLanguageCode = "en", progressCallback?: ProgressCallback): Promise<boolean> {
    try {
      // Ensure cache directory exists
      const baseCache = `${this.pluginDir}/cache`;
      if (!(await this.app.vault.adapter.exists(baseCache))) {
        await this.app.vault.adapter.mkdir(baseCache);
      }
      if (!(await this.app.vault.adapter.exists(this.cacheDir))) {
        await this.app.vault.adapter.mkdir(this.cacheDir);
      }

      if (progressCallback) {
        progressCallback({ loaded: 0, total: 100, percent: 0 });
      }

      const affUrl = getHunspellDownloadURL(lang, "aff");
      const dicUrl = getHunspellDownloadURL(lang, "dic");

      // Download both files in parallel
      const [affResponse, dicResponse] = await Promise.all([
        requestUrl({ url: affUrl }),
        requestUrl({ url: dicUrl }),
      ]);

      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100, percent: 50 });
      }

      const dicPath = this.getDicPath(lang);
      const affPath = this.getAffPath(lang);

      // Write both files
      await Promise.all([
        this.app.vault.adapter.write(affPath, affResponse.text),
        this.app.vault.adapter.write(dicPath, dicResponse.text),
      ]);

      if (progressCallback) {
        progressCallback({ loaded: 100, total: 100, percent: 100 });
      }

      // Load immediately after download
      this.spellInstances.set(lang, nspell({ aff: affResponse.text, dic: dicResponse.text }));
      return true;
    } catch (error) {
      console.error(`Failed to download nspell data for ${lang}:`, error);
      return false;
    }
  }

  /**
   * Delete dictionary files for a specific language.
   */
  async delete(lang: HunspellLanguageCode = "en"): Promise<void> {
    try {
      const dicPath = this.getDicPath(lang);
      const affPath = this.getAffPath(lang);

      if (await this.app.vault.adapter.exists(dicPath)) {
        await this.app.vault.adapter.remove(dicPath);
      }
      if (await this.app.vault.adapter.exists(affPath)) {
        await this.app.vault.adapter.remove(affPath);
      }

      // Try to remove the nspell cache directory if empty
      try {
        await this.app.vault.adapter.rmdir(this.cacheDir, false);
      } catch {
        // Directory might not be empty or might not exist, ignore
      }

      this.spellInstances.delete(lang);
    } catch (error) {
      console.error(`Failed to delete nspell data for ${lang}:`, error);
    }
  }

  /**
   * Check if dictionary is loaded for a specific language.
   */
  isLoaded(lang: HunspellLanguageCode = "en"): boolean {
    return this.spellInstances.has(lang);
  }

  /**
   * Check if a word is spelled correctly in a specific language.
   */
  isCorrect(word: string, lang: HunspellLanguageCode = "en"): boolean {
    const spell = this.spellInstances.get(lang);
    if (!spell) return true; // Assume correct if not loaded
    return spell.correct(word);
  }

  /**
   * Get spelling suggestions for a word in a specific language.
   */
  suggest(word: string, lang: HunspellLanguageCode = "en"): SynonymResult[] {
    const spell = this.spellInstances.get(lang);
    if (!spell) return [];

    // If word is correctly spelled, no suggestions needed
    if (spell.correct(word)) return [];

    const suggestions = spell.suggest(word);
    return suggestions.map((s) => ({
      word: s,
      type: "spelling" as const,
      source: "nspell" as const,
    }));
  }

  // Wordsmith language code convenience methods

  /**
   * Check if spell checking is available for a Wordsmith language code.
   */
  canSpellCheck(langCode: LanguageCode): boolean {
    const hunspellLang = WORDSMITH_TO_HUNSPELL[langCode];
    if (!hunspellLang) return false;
    return this.isLoaded(hunspellLang);
  }

  /**
   * Check if a word is spelled correctly using Wordsmith language code.
   */
  isCorrectByWordsmithLang(word: string, langCode: LanguageCode): boolean {
    const hunspellLang = WORDSMITH_TO_HUNSPELL[langCode];
    if (!hunspellLang) return true; // Assume correct if no mapping
    return this.isCorrect(word, hunspellLang);
  }

  /**
   * Get spelling suggestions using Wordsmith language code.
   */
  suggestByWordsmithLang(word: string, langCode: LanguageCode): SynonymResult[] {
    const hunspellLang = WORDSMITH_TO_HUNSPELL[langCode];
    if (!hunspellLang) return [];
    return this.suggest(word, hunspellLang);
  }

  /**
   * Get the Hunspell language code from a Wordsmith language code.
   * Returns undefined if no mapping exists.
   */
  getHunspellLangFromWordsmith(langCode: LanguageCode): HunspellLanguageCode | undefined {
    return WORDSMITH_TO_HUNSPELL[langCode];
  }

  /**
   * Get the Wordsmith language code from a Hunspell language code.
   * Returns undefined if no mapping exists.
   */
  getWordsmithLangFromHunspell(hunspellLang: HunspellLanguageCode): LanguageCode | undefined {
    return HUNSPELL_TO_WORDSMITH[hunspellLang];
  }
}
