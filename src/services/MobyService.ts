import { App, requestUrl } from "obsidian";
import { SynonymResult, ProgressCallback } from "../types/types";

export class MobyService {
  private app: App;
  private pluginDir: string;
  private data: Map<string, string[]> | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  get cachePath(): string {
    return `${this.pluginDir}/cache/moby.txt`;
  }

  async isDownloaded(): Promise<boolean> {
    try {
      return await this.app.vault.adapter.exists(this.cachePath);
    } catch {
      return false;
    }
  }

  async load(): Promise<void> {
    if (this.data) return;
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

      const content = await this.app.vault.adapter.read(this.cachePath);
      this.data = this.parseData(content);
    } catch (error) {
      console.error("Failed to load Moby data:", error);
      this.data = null;
    } finally {
      this.loading = false;
    }
  }

  private parseData(content: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const lines = content.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(",");
      if (parts.length < 2) continue;

      const firstPart = parts[0];
      if (!firstPart) continue;
      const headWord = firstPart.toLowerCase().trim();
      const relatedWords = parts.slice(1).map((w) => w.trim()).filter((w) => w.length > 0);

      if (headWord && relatedWords.length > 0) {
        map.set(headWord, relatedWords);
      }
    }

    return map;
  }

  async download(progressCallback?: ProgressCallback): Promise<boolean> {
    const url = "https://raw.githubusercontent.com/words/moby/master/words.txt";

    try {
      const cacheDir = `${this.pluginDir}/cache`;
      if (!(await this.app.vault.adapter.exists(cacheDir))) {
        await this.app.vault.adapter.mkdir(cacheDir);
      }

      // Note: requestUrl doesn't support streaming progress, so we simulate it
      if (progressCallback) {
        progressCallback({ loaded: 0, total: 100, percent: 0 });
      }

      const response = await requestUrl({ url });

      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100, percent: 50 });
      }

      const text = response.text;
      await this.app.vault.adapter.write(this.cachePath, text);

      if (progressCallback) {
        progressCallback({ loaded: 100, total: 100, percent: 100 });
      }

      this.data = this.parseData(text);
      return true;
    } catch (error) {
      console.error("Failed to download Moby data:", error);
      return false;
    }
  }

  async delete(): Promise<void> {
    try {
      if (await this.isDownloaded()) {
        await this.app.vault.adapter.remove(this.cachePath);
      }
      this.data = null;
    } catch (error) {
      console.error("Failed to delete Moby data:", error);
    }
  }

  isLoaded(): boolean {
    return this.data !== null;
  }

  lookup(word: string): SynonymResult[] {
    if (!this.data) return [];

    const normalizedWord = word.toLowerCase();
    const relatedWords = this.data.get(normalizedWord);

    if (!relatedWords) return [];

    return relatedWords.map((relatedWord) => ({
      word: relatedWord,
      type: "related" as const,
      source: "moby" as const,
    }));
  }
}
