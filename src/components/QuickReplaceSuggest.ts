import { App, Editor, Notice } from "obsidian";
import { SynonymResult, WordRange, RelationshipType, DefinitionGroup } from "../types/types";
import { DataService } from "../services/DataService";
import { getWordUnderCursor, replaceWord } from "../utils/wordExtractor";
import { groupByDefinition, getGroupDisplayDefinition, hasDisplayableDefinition } from "../utils/definitionGrouping";

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

  // Definition grouping state
  private definitionGroups: DefinitionGroup[] = [];
  private ungroupedResults: SynonymResult[] = [];
  private currentDefinitionIndex: number = 0;
  private readonly MAX_QUICK_ITEMS = 5;

  // Touch handling
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isSwiping: boolean = false;

  constructor(app: App, dataService: DataService) {
    this.app = app;
    this.dataService = dataService;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundClickOutsideHandler = this.handleClickOutside.bind(this);
  }

  async triggerForWord(editor: Editor, type: RelationshipType = "synonym"): Promise<void> {
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

    // Detect language from surrounding context
    const contextText = this.getContextAroundCursor(editor);
    const resolved = this.dataService.resolveLanguage(contextText);

    // Fetch suggestions for the specified type with detected language
    const allSuggestions = await this.dataService.getQuickReplaceSuggestions(extraction.word, type, resolved.code);
    if (allSuggestions.length === 0) {
      new Notice(`No ${type === "antonym" ? "antonyms" : "suggestions"} found`);
      this.context = null;
      return;
    }

    // Group results by definition
    const grouped = groupByDefinition(allSuggestions);
    this.definitionGroups = grouped.grouped;
    this.ungroupedResults = grouped.ungrouped;
    this.currentDefinitionIndex = 0;

    // Set initial suggestions based on grouping
    this.updateSuggestionsForCurrentDefinition();
    this.selectedIndex = 0;
    this.show(editor);
  }

  private updateSuggestionsForCurrentDefinition(): void {
    if (this.definitionGroups.length > 0) {
      // Show results from current definition group
      const currentGroup = this.definitionGroups[this.currentDefinitionIndex];
      if (currentGroup) {
        this.suggestions = currentGroup.results.slice(0, this.MAX_QUICK_ITEMS);
      }
    } else {
      // No grouped results, show ungrouped
      this.suggestions = this.ungroupedResults.slice(0, this.MAX_QUICK_ITEMS);
    }
  }

  private show(editor: Editor): void {
    // Close any existing popover but preserve current suggestions
    this.closePopover();

    // Create container
    this.containerEl = document.createElement("div");
    this.containerEl.className = "wordsmith-quick-container";

    // Add to DOM first so we can measure for positioning
    document.body.appendChild(this.containerEl);

    // Render suggestions
    this.renderSuggestions();

    // Position near cursor
    this.positionAtCursor(editor);

    // Add event listeners
    document.addEventListener("keydown", this.boundKeyHandler, true);
    document.addEventListener("mousedown", this.boundClickOutsideHandler, true);

    // Add touch event listeners for swipe gestures
    this.containerEl.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: true });
    this.containerEl.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
    this.containerEl.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: true });
  }

  private renderSuggestions(): void {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = "";

    // Render definition header if we have multiple definitions to cycle through
    // OR if the current group has a definition to display
    if (this.definitionGroups.length > 1) {
      this.renderDefinitionHeader();
    } else if (this.definitionGroups.length === 1) {
      const currentGroup = this.definitionGroups[0];
      if (currentGroup && hasDisplayableDefinition(currentGroup)) {
        this.renderDefinitionHeader();
      }
    }

    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement("div");
      item.className = `wordsmith-quick-item ${index === this.selectedIndex ? "is-selected" : ""}`;

      // Number indicator
      const numSpan = document.createElement("span");
      numSpan.className = "wordsmith-quick-number";
      numSpan.textContent = `${index + 1}`;
      item.appendChild(numSpan);

      // Word
      const wordSpan = document.createElement("span");
      wordSpan.className = "wordsmith-word";
      wordSpan.textContent = suggestion.word;
      item.appendChild(wordSpan);

      // Badge
      const badgeInfo = this.getBadgeInfo(suggestion.type);
      const badgeSpan = document.createElement("span");
      badgeSpan.className = `wordsmith-badge ${badgeInfo.cls}`;
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

  private renderDefinitionHeader(): void {
    if (!this.containerEl || this.definitionGroups.length === 0) return;

    const currentGroup = this.definitionGroups[this.currentDefinitionIndex];
    if (!currentGroup) return;

    const headerEl = document.createElement("div");
    headerEl.className = "wordsmith-quick-header";

    // Part of speech (if available)
    if (currentGroup.partOfSpeech) {
      const posSpan = document.createElement("span");
      posSpan.className = "wordsmith-quick-pos";
      posSpan.textContent = currentGroup.partOfSpeech;
      headerEl.appendChild(posSpan);
    }

    // Definition text (truncated) - only if there's a real definition
    if (hasDisplayableDefinition(currentGroup)) {
      const defText = getGroupDisplayDefinition(currentGroup);
      const truncatedDef = defText.length > 40 ? defText.substring(0, 37) + "..." : defText;
      const defSpan = document.createElement("span");
      defSpan.className = "wordsmith-quick-def";
      defSpan.textContent = truncatedDef;
      headerEl.appendChild(defSpan);
    }

    // Navigation indicator (only show if multiple groups)
    if (this.definitionGroups.length > 1) {
      const navSpan = document.createElement("span");
      navSpan.className = "wordsmith-quick-nav";
      navSpan.textContent = `(${this.currentDefinitionIndex + 1}/${this.definitionGroups.length})`;
      headerEl.appendChild(navSpan);
    }

    this.containerEl.appendChild(headerEl);
  }

  private getBadgeInfo(type: string): { cls: string; text: string } {
    switch (type) {
      case "synonym":
        return { cls: "wordsmith-badge-syn", text: "Syn" };
      case "antonym":
        return { cls: "wordsmith-badge-ant", text: "Ant" };
      case "hypernym":
        return { cls: "wordsmith-badge-hyper", text: "Hyper" };
      case "hyponym":
        return { cls: "wordsmith-badge-hypo", text: "Hypo" };
      case "spelling":
        return { cls: "wordsmith-badge-spell", text: "Spell" };
      case "related":
      default:
        return { cls: "wordsmith-badge-rel", text: "Rel" };
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
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(this.selectedIndex);
        break;

      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        // If multiple definitions, Tab cycles through them
        if (this.definitionGroups.length > 1) {
          const direction = e.shiftKey ? -1 : 1;
          this.cycleDefinition(direction);
        } else {
          // Single definition or no grouping - Tab selects
          this.selectSuggestion(this.selectedIndex);
        }
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

  private cycleDefinition(direction: 1 | -1): void {
    if (this.definitionGroups.length <= 1) return;

    // Calculate new index with wrap-around
    let newIndex = this.currentDefinitionIndex + direction;
    if (newIndex < 0) {
      newIndex = this.definitionGroups.length - 1;
    } else if (newIndex >= this.definitionGroups.length) {
      newIndex = 0;
    }

    this.currentDefinitionIndex = newIndex;
    this.updateSuggestionsForCurrentDefinition();
    this.selectedIndex = 0;
    this.renderSuggestions();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isSwiping = false;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Determine if this is a horizontal swipe
    if (!this.isSwiping && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.isSwiping = true;
        e.preventDefault();
      }
    }

    if (this.isSwiping) {
      e.preventDefault();
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.touchStartX;
    const swipeThreshold = 50;

    if (this.isSwiping && Math.abs(deltaX) >= swipeThreshold && this.definitionGroups.length > 1) {
      // Swipe left = next definition, swipe right = previous definition
      const direction: 1 | -1 = deltaX < 0 ? 1 : -1;
      this.cycleDefinition(direction);
    }

    this.isSwiping = false;
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
    // Reset definition grouping state
    this.definitionGroups = [];
    this.ungroupedResults = [];
    this.currentDefinitionIndex = 0;
  }

  /** Get text around the cursor for language detection (±2 lines). */
  private getContextAroundCursor(editor: Editor): string {
    const cursor = editor.getCursor();
    const lineCount = editor.lineCount();
    const startLine = Math.max(0, cursor.line - 2);
    const endLine = Math.min(lineCount - 1, cursor.line + 2);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(editor.getLine(i));
    }
    return lines.join(" ");
  }
}
