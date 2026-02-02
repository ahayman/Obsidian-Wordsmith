// Mock for Obsidian API used in tests

export class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<unknown> {
    return {};
  }

  async saveData(_data: unknown): Promise<void> {}

  addCommand(_command: Command): Command {
    return _command;
  }

  addSettingTab(_settingTab: PluginSettingTab): void {}

  registerEvent(_eventRef: EventRef): void {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }

  display(): void {}

  hide(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(_containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.infoEl = document.createElement("div");
    this.nameEl = document.createElement("div");
    this.descEl = document.createElement("div");
    this.controlEl = document.createElement("div");
  }

  setName(_name: string): this {
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addText(_cb: (text: TextComponent) => unknown): this {
    return this;
  }

  addToggle(_cb: (toggle: ToggleComponent) => unknown): this {
    return this;
  }

  addDropdown(_cb: (dropdown: DropdownComponent) => unknown): this {
    return this;
  }

  addButton(_cb: (button: ButtonComponent) => unknown): this {
    return this;
  }
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export interface App {
  workspace: Workspace;
  vault: Vault;
}

export interface Workspace {
  getActiveViewOfType<T>(type: unknown): T | null;
}

export interface Vault {
  getAbstractFileByPath(path: string): TAbstractFile | null;
}

export interface TAbstractFile {
  path: string;
  name: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
}

export interface Command {
  id: string;
  name: string;
  callback?: () => unknown;
  editorCallback?: (editor: Editor, view: MarkdownView) => unknown;
}

export interface EventRef {}

export interface Editor {
  getSelection(): string;
  replaceSelection(replacement: string): void;
  getCursor(): EditorPosition;
  getLine(line: number): string;
}

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface MarkdownView {
  editor: Editor;
  file: TFile | null;
}

export interface TFile extends TAbstractFile {
  extension: string;
  basename: string;
}

export interface TextComponent {
  setValue(value: string): this;
  onChange(callback: (value: string) => unknown): this;
}

export interface ToggleComponent {
  setValue(value: boolean): this;
  onChange(callback: (value: boolean) => unknown): this;
}

export interface DropdownComponent {
  addOption(value: string, display: string): this;
  setValue(value: string): this;
  onChange(callback: (value: string) => unknown): this;
}

export interface ButtonComponent {
  setButtonText(name: string): this;
  onClick(callback: () => unknown): this;
}
