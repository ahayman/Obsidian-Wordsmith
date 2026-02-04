import { App, requestUrl } from "obsidian";
import { SynonymResult, ThesaurusEntry, ProgressCallback } from "../types";

export class WordNetService {
  private app: App;
  private pluginDir: string;
  private data: Map<string, ThesaurusEntry[]> | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  get cachePath(): string {
    return `${this.pluginDir}/cache/thesaurus.jsonl`;
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
      this.data = this.parseJsonl(content);
    } catch (error) {
      console.error("Failed to load WordNet data:", error);
      this.data = null;
    } finally {
      this.loading = false;
    }
  }

  private parseJsonl(content: string): Map<string, ThesaurusEntry[]> {
    const map = new Map<string, ThesaurusEntry[]>();
    const lines = content.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line) as ThesaurusEntry;
        const word = entry.word.toLowerCase();

        const existing = map.get(word);
        if (existing) {
          existing.push(entry);
        } else {
          map.set(word, [entry]);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return map;
  }

  async download(progressCallback?: ProgressCallback): Promise<boolean> {
    const url = "https://raw.githubusercontent.com/zaibacu/thesaurus/master/en_thesaurus.jsonl";

    try {
      const cacheDir = `${this.pluginDir}/cache`;
      if (!(await this.app.vault.adapter.exists(cacheDir))) {
        await this.app.vault.adapter.mkdir(cacheDir);
      }

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

      this.data = this.parseJsonl(text);
      return true;
    } catch (error) {
      console.error("Failed to download WordNet data:", error);
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
      console.error("Failed to delete WordNet data:", error);
    }
  }

  isLoaded(): boolean {
    return this.data !== null;
  }

  lookup(word: string): SynonymResult[] {
    if (!this.data) return [];

    const normalizedWord = word.toLowerCase();
    const entries = this.data.get(normalizedWord);

    if (!entries) return [];

    const results: SynonymResult[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      for (const synonym of entry.synonyms) {
        const normalizedSynonym = synonym.toLowerCase();
        if (normalizedSynonym === normalizedWord || seen.has(normalizedSynonym)) {
          continue;
        }
        seen.add(normalizedSynonym);

        results.push({
          word: synonym,
          type: "synonym",
          source: "wordnet",
          partOfSpeech: entry.pos,
          definition: entry.desc.length > 0 ? entry.desc[0] : undefined,
          definitionId: entry.wordnet_id,
        });
      }
    }

    return results;
  }
}
