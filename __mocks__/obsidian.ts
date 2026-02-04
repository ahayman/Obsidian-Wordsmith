// Mock for Obsidian API used in tests

// Add Obsidian's HTMLElement extensions
declare global {
  interface HTMLElement {
    empty(): void;
    addClass(cls: string): void;
    removeClass(cls: string, ...cls2: string[]): void;
    toggleClass(cls: string, value: boolean): void;
    createDiv(options?: { cls?: string; text?: string; attr?: Record<string, string> }): HTMLDivElement;
    createSpan(options?: { cls?: string; text?: string }): HTMLSpanElement;
    createEl<K extends keyof HTMLElementTagNameMap>(
      tag: K,
      options?: { type?: string; placeholder?: string; cls?: string; text?: string; href?: string; attr?: Record<string, string> }
    ): HTMLElementTagNameMap[K];
    setText(text: string): void;
    setAttr(name: string, value: string | null): void;
  }
}

// Extend HTMLElement prototype with Obsidian methods
HTMLElement.prototype.empty = function () {
  while (this.firstChild) {
    this.removeChild(this.firstChild);
  }
};

HTMLElement.prototype.addClass = function (cls: string) {
  this.classList.add(...cls.split(" ").filter(Boolean));
};

HTMLElement.prototype.removeClass = function (cls: string, ...cls2: string[]) {
  this.classList.remove(...cls.split(" ").filter(Boolean), ...cls2);
};

HTMLElement.prototype.toggleClass = function (cls: string, value: boolean) {
  if (value) {
    this.classList.add(cls);
  } else {
    this.classList.remove(cls);
  }
};

HTMLElement.prototype.createDiv = function (options?: { cls?: string; text?: string; attr?: Record<string, string> }): HTMLDivElement {
  const div = document.createElement("div");
  if (options?.cls) {
    div.addClass(options.cls);
  }
  if (options?.text) {
    div.textContent = options.text;
  }
  if (options?.attr) {
    for (const [key, value] of Object.entries(options.attr)) {
      div.setAttribute(key, value);
    }
  }
  this.appendChild(div);
  return div;
};

HTMLElement.prototype.createSpan = function (options?: { cls?: string; text?: string }): HTMLSpanElement {
  const span = document.createElement("span");
  if (options?.cls) {
    span.addClass(options.cls);
  }
  if (options?.text) {
    span.textContent = options.text;
  }
  this.appendChild(span);
  return span;
};

HTMLElement.prototype.createEl = function <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: { type?: string; placeholder?: string; cls?: string; text?: string; href?: string; attr?: Record<string, string> }
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options?.cls) {
    el.addClass(options.cls);
  }
  if (options?.text) {
    el.textContent = options.text;
  }
  if (options?.type && "type" in el) {
    (el as HTMLInputElement).type = options.type;
  }
  if (options?.placeholder && "placeholder" in el) {
    (el as HTMLInputElement).placeholder = options.placeholder;
  }
  if (options?.href && "href" in el) {
    (el as HTMLAnchorElement).href = options.href;
  }
  if (options?.attr) {
    for (const [key, value] of Object.entries(options.attr)) {
      el.setAttribute(key, value);
    }
  }
  this.appendChild(el);
  return el;
};

HTMLElement.prototype.setText = function (text: string) {
  this.textContent = text;
};

HTMLElement.prototype.setAttr = function (name: string, value: string | null) {
  if (value === null) {
    this.removeAttribute(name);
  } else {
    this.setAttribute(name, value);
  }
};

// Mock scrollIntoView (jsdom doesn't implement it)
Element.prototype.scrollIntoView = function (_options?: boolean | ScrollIntoViewOptions) {
  // no-op for testing
};

// requestUrl interface and mock
export interface RequestUrlParam {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer;
}

export interface RequestUrlResponse {
  status: number;
  headers: Record<string, string>;
  arrayBuffer: ArrayBuffer;
  json: unknown;
  text: string;
}

export async function requestUrl(_request: RequestUrlParam | string): Promise<RequestUrlResponse> {
  // Default mock implementation - tests should override with jest.mock
  return {
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    json: [],
    text: "[]",
  };
}

// Scope class for keyboard handling
export class Scope {
  private handlers: Map<string, (e: KeyboardEvent) => boolean | void> = new Map();

  register(modifiers: string[], key: string, handler: (e: KeyboardEvent) => boolean | void): void {
    const modKey = modifiers.length > 0 ? modifiers.join("+") + "+" : "";
    this.handlers.set(modKey + key, handler);
  }

  // Helper for testing - trigger a registered handler
  triggerKey(modifiers: string[], key: string, event?: KeyboardEvent): boolean | void {
    const modKey = modifiers.length > 0 ? modifiers.join("+") + "+" : "";
    const handler = this.handlers.get(modKey + key);
    if (handler) {
      const e = event || new KeyboardEvent("keydown", { key });
      return handler(e);
    }
  }

  getHandlers(): Map<string, (e: KeyboardEvent) => boolean | void> {
    return this.handlers;
  }
}

// Modal class for testing
export class Modal {
  app: App;
  containerEl: HTMLElement;
  contentEl: HTMLElement;
  modalEl: HTMLElement;
  scope: Scope;
  private isOpen: boolean = false;

  constructor(app: App) {
    this.app = app;
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("modal-container");
    this.modalEl = document.createElement("div");
    this.modalEl.classList.add("modal");
    this.contentEl = document.createElement("div");
    this.contentEl.classList.add("modal-content");
    this.modalEl.appendChild(this.contentEl);
    this.containerEl.appendChild(this.modalEl);
    this.scope = new Scope();
  }

  open(): void {
    this.isOpen = true;
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }

  close(): void {
    this.isOpen = false;
    this.onClose();
    if (this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
    }
  }

  onOpen(): void {}

  onClose(): void {}

  // Helper for testing
  getIsOpen(): boolean {
    return this.isOpen;
  }
}

// Platform object for mobile detection
export const Platform = {
  isMobileApp: false,
  isMobile: false,
  isDesktop: true,
  isDesktopApp: true,
};

// Simple search function for filtering
export function prepareSimpleSearch(query: string): (text: string) => { score: number } | null {
  const lowerQuery = query.toLowerCase();
  return (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes(lowerQuery)) {
      // Return a score based on position (earlier = higher score)
      const pos = lowerText.indexOf(lowerQuery);
      return { score: 1 - (pos / lowerText.length) };
    }
    return null;
  };
}

// setIcon mock
export function setIcon(el: HTMLElement, iconId: string): void {
  el.setAttribute("data-icon", iconId);
  el.innerHTML = `<svg class="svg-icon" data-icon="${iconId}"></svg>`;
}

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

// Mock implementations of component interfaces for testing
export class MockTextComponent implements TextComponent {
  inputEl: HTMLInputElement;
  private _value: string = "";
  private _onChangeCallback?: (value: string) => unknown;

  constructor() {
    this.inputEl = document.createElement("input");
    this.inputEl.type = "text";
  }

  setValue(value: string): this {
    this._value = value;
    this.inputEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(callback: (value: string) => unknown): this {
    this._onChangeCallback = callback;
    return this;
  }

  getValue(): string {
    return this._value;
  }

  // For testing - trigger onChange
  triggerChange(value: string): void {
    this._value = value;
    this._onChangeCallback?.(value);
  }
}

export class MockToggleComponent implements ToggleComponent {
  toggleEl: HTMLElement;
  private _value: boolean = false;
  private _onChangeCallback?: (value: boolean) => unknown;

  constructor() {
    this.toggleEl = document.createElement("div");
    this.toggleEl.classList.add("checkbox-container");
  }

  setValue(value: boolean): this {
    this._value = value;
    return this;
  }

  onChange(callback: (value: boolean) => unknown): this {
    this._onChangeCallback = callback;
    return this;
  }

  getValue(): boolean {
    return this._value;
  }

  // For testing - trigger onChange
  triggerChange(value: boolean): void {
    this._value = value;
    this._onChangeCallback?.(value);
  }
}

export class MockDropdownComponent implements DropdownComponent {
  selectEl: HTMLSelectElement;
  private _value: string = "";
  private _options: Map<string, string> = new Map();
  private _onChangeCallback?: (value: string) => unknown;

  constructor() {
    this.selectEl = document.createElement("select");
  }

  addOption(value: string, display: string): this {
    this._options.set(value, display);
    const option = document.createElement("option");
    option.value = value;
    option.text = display;
    this.selectEl.appendChild(option);
    return this;
  }

  setValue(value: string): this {
    this._value = value;
    this.selectEl.value = value;
    return this;
  }

  onChange(callback: (value: string) => unknown): this {
    this._onChangeCallback = callback;
    return this;
  }

  getValue(): string {
    return this._value;
  }

  getOptions(): Map<string, string> {
    return this._options;
  }

  // For testing - trigger onChange
  triggerChange(value: string): void {
    this._value = value;
    this._onChangeCallback?.(value);
  }
}

export class MockButtonComponent implements ButtonComponent {
  buttonEl: HTMLButtonElement;
  private _text: string = "";
  private _onClickCallback?: () => unknown;
  private _disabled: boolean = false;
  private _cta: boolean = false;

  constructor() {
    this.buttonEl = document.createElement("button");
    // Attach click listener to the actual button element
    this.buttonEl.addEventListener("click", () => {
      if (!this._disabled && this._onClickCallback) {
        this._onClickCallback();
      }
    });
  }

  setButtonText(name: string): this {
    this._text = name;
    this.buttonEl.textContent = name;
    return this;
  }

  onClick(callback: () => unknown): this {
    this._onClickCallback = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this._disabled = disabled;
    this.buttonEl.disabled = disabled;
    return this;
  }

  setCta(): this {
    this._cta = true;
    this.buttonEl.classList.add("mod-cta");
    return this;
  }

  getText(): string {
    return this._text;
  }

  isDisabled(): boolean {
    return this._disabled;
  }

  isCta(): boolean {
    return this._cta;
  }

  // For testing - trigger onClick
  click(): void {
    if (!this._disabled) {
      this._onClickCallback?.();
    }
  }
}

export class MockSliderComponent implements SliderComponent {
  sliderEl: HTMLInputElement;
  private _value: number = 0;
  private _min: number = 0;
  private _max: number = 100;
  private _step: number = 1;
  private _onChangeCallback?: (value: number) => unknown;

  constructor() {
    this.sliderEl = document.createElement("input");
    this.sliderEl.type = "range";
  }

  setValue(value: number): this {
    this._value = value;
    this.sliderEl.value = String(value);
    return this;
  }

  setLimits(min: number, max: number, step: number): this {
    this._min = min;
    this._max = max;
    this._step = step;
    this.sliderEl.min = String(min);
    this.sliderEl.max = String(max);
    this.sliderEl.step = String(step);
    return this;
  }

  setDynamicTooltip(): this {
    return this;
  }

  onChange(callback: (value: number) => unknown): this {
    this._onChangeCallback = callback;
    return this;
  }

  getValue(): number {
    return this._value;
  }

  getMin(): number {
    return this._min;
  }

  getMax(): number {
    return this._max;
  }

  getStep(): number {
    return this._step;
  }

  // For testing - trigger onChange
  triggerChange(value: number): void {
    this._value = value;
    this._onChangeCallback?.(value);
  }
}

export class Setting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;
  private _name: string = "";
  private _desc: string = "";
  private _textComponent?: MockTextComponent;
  private _toggleComponent?: MockToggleComponent;
  private _dropdownComponent?: MockDropdownComponent;
  private _buttonComponent?: MockButtonComponent;
  private _sliderComponent?: MockSliderComponent;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.settingEl.classList.add("setting-item");
    this.infoEl = document.createElement("div");
    this.infoEl.classList.add("setting-item-info");
    this.nameEl = document.createElement("div");
    this.nameEl.classList.add("setting-item-name");
    this.descEl = document.createElement("div");
    this.descEl.classList.add("setting-item-description");
    this.controlEl = document.createElement("div");
    this.controlEl.classList.add("setting-item-control");
    this.settingEl.appendChild(this.infoEl);
    this.infoEl.appendChild(this.nameEl);
    this.infoEl.appendChild(this.descEl);
    this.settingEl.appendChild(this.controlEl);
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    this._name = name;
    this.nameEl.textContent = name;
    return this;
  }

  setDesc(desc: string): this {
    this._desc = desc;
    this.descEl.textContent = desc;
    return this;
  }

  setHeading(): this {
    this.settingEl.classList.add("setting-item-heading");
    return this;
  }

  addText(cb: (text: TextComponent) => unknown): this {
    this._textComponent = new MockTextComponent();
    cb(this._textComponent);
    this.controlEl.appendChild(this._textComponent.inputEl);
    return this;
  }

  addToggle(cb: (toggle: ToggleComponent) => unknown): this {
    this._toggleComponent = new MockToggleComponent();
    cb(this._toggleComponent);
    this.controlEl.appendChild(this._toggleComponent.toggleEl);
    return this;
  }

  addDropdown(cb: (dropdown: DropdownComponent) => unknown): this {
    this._dropdownComponent = new MockDropdownComponent();
    cb(this._dropdownComponent);
    this.controlEl.appendChild(this._dropdownComponent.selectEl);
    return this;
  }

  addButton(cb: (button: ButtonComponent) => unknown): this {
    this._buttonComponent = new MockButtonComponent();
    cb(this._buttonComponent);
    this.controlEl.appendChild(this._buttonComponent.buttonEl);
    return this;
  }

  addSlider(cb: (slider: SliderComponent) => unknown): this {
    this._sliderComponent = new MockSliderComponent();
    cb(this._sliderComponent);
    this.controlEl.appendChild(this._sliderComponent.sliderEl);
    return this;
  }

  getName(): string {
    return this._name;
  }

  getDesc(): string {
    return this._desc;
  }

  getTextComponent(): MockTextComponent | undefined {
    return this._textComponent;
  }

  getToggleComponent(): MockToggleComponent | undefined {
    return this._toggleComponent;
  }

  getDropdownComponent(): MockDropdownComponent | undefined {
    return this._dropdownComponent;
  }

  getButtonComponent(): MockButtonComponent | undefined {
    return this._buttonComponent;
  }

  getSliderComponent(): MockSliderComponent | undefined {
    return this._sliderComponent;
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
  activeEditor?: { editor: Editor } | null;
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
  inputEl: HTMLInputElement;
  setValue(value: string): this;
  setPlaceholder?(placeholder: string): this;
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
  setDisabled?(disabled: boolean): this;
  setCta?(): this;
  onClick(callback: () => unknown): this;
}

export interface SliderComponent {
  setValue(value: number): this;
  setLimits(min: number, max: number, step: number): this;
  setDynamicTooltip(): this;
  onChange(callback: (value: number) => unknown): this;
}
