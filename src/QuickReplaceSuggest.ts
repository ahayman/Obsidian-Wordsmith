import { App, Editor, Notice } from "obsidian";
import { SynonymResult, WordRange } from "./types";
import { DataService } from "./services/DataService";
import { getWordUnderCursor, replaceWord } from "./utils/wordExtractor";

interface QuickReplaceContext {
  word: string;
  range: WordRange;
  editor: Editor;
}

export class QuickReplaceSuggest {
  private app: App;
  private dataService: DataService;
  private containerEl: HTMLElement | null = null;
  private context: QuickReplaceContext | null = null;
  private suggestions: SynonymResult[] = [];
  private selectedIndex = 0;
  private boundKeyHandler: (e: KeyboardEvent) => void;
  private boundClickOutsideHandler: (e: MouseEvent) => void;

  constructor(app: App, dataService: DataService) {
    this.app = app;
    this.dataService = dataService;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundClickOutsideHandler = this.handleClickOutside.bind(this);
  }

  async triggerForWord(editor: Editor): Promise<void> {
    const extraction = getWordUnderCursor(editor);
    if (!extraction) {
      new Notice("No word found under cursor");
      return;
    }

    this.context = {
      word: extraction.word,
      range: extraction.range,
      editor,
    };

    // Fetch suggestions
    const suggestions = await this.dataService.getQuickReplaceSuggestions(extraction.word);
    if (suggestions.length === 0) {
      new Notice("No suggestions found");
      this.context = null;
      return;
    }

    this.suggestions = suggestions;
    this.selectedIndex = 0;
    this.show(editor);
  }

  private show(editor: Editor): void {
    // Close any existing popover but preserve current suggestions
    this.closePopover();

    // Create container
    this.containerEl = document.createElement("div");
    this.containerEl.className = "synofinder-quick-container";

    // Add to DOM first so we can measure for positioning
    document.body.appendChild(this.containerEl);

    // Render suggestions
    this.renderSuggestions();

    // Position near cursor
    this.positionAtCursor(editor);

    // Add event listeners
    document.addEventListener("keydown", this.boundKeyHandler, true);
    document.addEventListener("mousedown", this.boundClickOutsideHandler, true);
  }

  private renderSuggestions(): void {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = "";

    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement("div");
      item.className = `synofinder-quick-item ${index === this.selectedIndex ? "is-selected" : ""}`;

      // Number indicator
      const numSpan = document.createElement("span");
      numSpan.className = "synofinder-quick-number";
      numSpan.textContent = `${index + 1}`;
      item.appendChild(numSpan);

      // Word
      const wordSpan = document.createElement("span");
      wordSpan.className = "synofinder-word";
      wordSpan.textContent = suggestion.word;
      item.appendChild(wordSpan);

      // Badge
      const badgeInfo = this.getBadgeInfo(suggestion.type);
      const badgeSpan = document.createElement("span");
      badgeSpan.className = `synofinder-badge ${badgeInfo.cls}`;
      badgeSpan.textContent = badgeInfo.text;
      item.appendChild(badgeSpan);

      // Click handler
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(index);
      });

      // Hover handler
      item.addEventListener("mouseenter", () => {
        this.selectedIndex = index;
        this.renderSuggestions();
      });

      this.containerEl!.appendChild(item);
    });
  }

  private getBadgeInfo(type: string): { cls: string; text: string } {
    switch (type) {
      case "synonym":
        return { cls: "synofinder-badge-syn", text: "Syn" };
      case "spelling":
        return { cls: "synofinder-badge-spell", text: "Spell" };
      case "related":
      default:
        return { cls: "synofinder-badge-rel", text: "Rel" };
    }
  }

  private positionAtCursor(editor: Editor): void {
    if (!this.containerEl) return;

    // Access the underlying CodeMirror EditorView
    const cm = (editor as unknown as { cm: { coordsAtPos: (pos: number) => { left: number; top: number; bottom: number } | null } }).cm;
    if (!cm) return;

    // Get cursor coordinates from CodeMirror
    const cursor = editor.getCursor();
    const offset = editor.posToOffset(cursor);
    const coords = cm.coordsAtPos(offset);

    if (coords) {
      // Position below the cursor initially
      this.containerEl.style.setProperty("--quick-left", `${coords.left}px`);
      this.containerEl.style.setProperty("--quick-top", `${coords.bottom + 4}px`);

      // Check if it fits below, otherwise position above
      const rect = this.containerEl.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        this.containerEl.style.setProperty("--quick-top", `${coords.top - rect.height - 4}px`);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.containerEl) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.renderSuggestions();
        break;

      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderSuggestions();
        break;

      case "Enter":
      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(this.selectedIndex);
        break;

      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        this.close();
        break;

      case "1":
      case "2":
      case "3":
      case "4":
      case "5": {
        const num = parseInt(e.key, 10) - 1;
        if (num < this.suggestions.length) {
          e.preventDefault();
          e.stopPropagation();
          this.selectSuggestion(num);
        }
        break;
      }
    }
  }

  private handleClickOutside(e: MouseEvent): void {
    if (this.containerEl && !this.containerEl.contains(e.target as Node)) {
      this.close();
    }
  }

  private selectSuggestion(index: number): void {
    const suggestion = this.suggestions[index];
    if (!this.context || !suggestion) return;

    replaceWord(this.context.editor, this.context.range, suggestion.word);
    this.close();
  }

  private closePopover(): void {
    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }
    document.removeEventListener("keydown", this.boundKeyHandler, true);
    document.removeEventListener("mousedown", this.boundClickOutsideHandler, true);
  }

  close(): void {
    this.closePopover();
    this.context = null;
    this.suggestions = [];
    this.selectedIndex = 0;
  }
}
