import { App, requestUrl } from "obsidian";
import { SynonymResult, ProgressCallback } from "../types/types";
import nspell from "nspell";

type NSpellInstance = ReturnType<typeof nspell>;

const DIC_URL = "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic";
const AFF_URL = "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.aff";

export class NSpellService {
  private app: App;
  private pluginDir: string;
  private spell: NSpellInstance | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  get cacheDir(): string {
    return `${this.pluginDir}/cache/nspell`;
  }

  get dicPath(): string {
    return `${this.cacheDir}/en.dic`;
  }

  get affPath(): string {
    return `${this.cacheDir}/en.aff`;
  }

  async isDownloaded(): Promise<boolean> {
    try {
      const dicExists = await this.app.vault.adapter.exists(this.dicPath);
      const affExists = await this.app.vault.adapter.exists(this.affPath);
      return dicExists && affExists;
    } catch {
      return false;
    }
  }

  async load(): Promise<void> {
    if (this.spell) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.doLoad();
    await this.loadPromise;
    this.loadPromise = null;
  }

  private async doLoad(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    try {
      const exists = await this.isDownloaded();
      if (!exists) {
        this.loading = false;
        return;
      }

      const [aff, dic] = await Promise.all([
        this.app.vault.adapter.read(this.affPath),
        this.app.vault.adapter.read(this.dicPath),
      ]);

      this.spell = nspell({ aff, dic });
    } catch (error) {
      console.error("Failed to load nspell data:", error);
      this.spell = null;
    } finally {
      this.loading = false;
    }
  }

  async download(progressCallback?: ProgressCallback): Promise<boolean> {
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

      // Download both files in parallel
      const [affResponse, dicResponse] = await Promise.all([
        requestUrl({ url: AFF_URL }),
        requestUrl({ url: DIC_URL }),
      ]);

      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100, percent: 50 });
      }

      // Write both files
      await Promise.all([
        this.app.vault.adapter.write(this.affPath, affResponse.text),
        this.app.vault.adapter.write(this.dicPath, dicResponse.text),
      ]);

      if (progressCallback) {
        progressCallback({ loaded: 100, total: 100, percent: 100 });
      }

      // Load immediately after download
      this.spell = nspell({ aff: affResponse.text, dic: dicResponse.text });
      return true;
    } catch (error) {
      console.error("Failed to download nspell data:", error);
      return false;
    }
  }

  async delete(): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(this.dicPath)) {
        await this.app.vault.adapter.remove(this.dicPath);
      }
      if (await this.app.vault.adapter.exists(this.affPath)) {
        await this.app.vault.adapter.remove(this.affPath);
      }
      // Try to remove the nspell cache directory if empty
      try {
        await this.app.vault.adapter.rmdir(this.cacheDir, false);
      } catch {
        // Directory might not be empty or might not exist, ignore
      }
      this.spell = null;
    } catch (error) {
      console.error("Failed to delete nspell data:", error);
    }
  }

  isLoaded(): boolean {
    return this.spell !== null;
  }

  isCorrect(word: string): boolean {
    if (!this.spell) return true; // Assume correct if not loaded
    return this.spell.correct(word);
  }

  suggest(word: string): SynonymResult[] {
    if (!this.spell) return [];

    // If word is correctly spelled, no suggestions needed
    if (this.spell.correct(word)) return [];

    const suggestions = this.spell.suggest(word);
    return suggestions.map((s) => ({
      word: s,
      type: "spelling" as const,
      source: "nspell" as const,
    }));
  }
}
