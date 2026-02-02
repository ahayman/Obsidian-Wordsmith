import { Plugin } from "obsidian";

interface SynoFinderSettings {
  placeholder?: string;
}

const DEFAULT_SETTINGS: SynoFinderSettings = {};

export default class SynoFinderPlugin extends Plugin {
  settings: SynoFinderSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // TODO: Register commands, settings tab, and other plugin features
  }

  onunload(): void {
    // Cleanup if needed
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as SynoFinderSettings
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
