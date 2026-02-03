# Quick Replace Feature - Research Findings

**Date:** 2026-02-03
**Purpose:** Research the best approach for implementing a minimal synonym/spelling replacement popover

## 1. Feature Requirements

- Display a popover above the selected/cursor word in the editor (NOT a full modal)
- Show up to 5 replacement options
- If word is misspelled (and spell checking enabled), show spelling corrections
- Otherwise, show top 5 synonyms from the default service
- Register as new command "Quick Replace"

## 2. Existing Codebase Architecture

### Current Implementation
- **Main entry point**: `src/main.ts` - Plugin class with one command "Find synonyms for word under cursor"
- **Modal-based UI**: `SynonymModal.ts` - Full-screen modal with tabs, search, and results display
- **Streaming architecture**: `DataService.ts` provides `lookupStreaming()` for progressive result loading
- **Spell checking**: `SpellingService.ts` + `NSpellService.ts` provide offline spelling correction detection
- **Word extraction**: `wordExtractor.ts` provides utilities to get word under cursor with range info

### Key Classes
- `SynonymService` interface for all data sources (local, Datamuse, API services)
- `SpellingService` detects misspelled words via nspell and provides suggestions
- `DataService` orchestrates all lookups and exposes tab metadata before lookup starts
- `getWordUnderCursor()` returns word + range, enabling text replacement

## 3. Available Approaches for Popover Implementation

### Option A: EditorSuggest (RECOMMENDED)

**How it works:**
```typescript
export abstract class EditorSuggest<T> extends PopoverSuggest<T> {
  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null
  getSuggestions(context: EditorSuggestContext): T[] | Promise<T[]>
  renderSuggestion(suggestion: T, el: HTMLElement): void
  selectSuggestion(suggestion: T, evt: MouseEvent | KeyboardEvent): void
}
```

**Pros:**
- Native Obsidian API specifically designed for editor autocomplete/suggestions
- Automatically positions popover above/below cursor
- Handles keyboard navigation (arrow keys, enter, escape)
- Manages open/close lifecycle
- Clean integration with editor
- Popover appears in correct scroll context
- Built-in mobile support

**Cons:**
- Designed for incremental searching (triggered by typing)
- Manual triggering from command requires workaround
- Less flexible for showing fixed number of results

### Option B: Obsidian Menu API

**Pros:**
- Lightweight, designed for quick popups
- Simple API

**Cons:**
- Limited positioning options
- Manual keyboard handling required
- Not designed for suggestion lists

### Option C: Custom PopoverComponent + Manual Positioning

**Pros:**
- Maximum flexibility
- Can use existing CSS/styling

**Cons:**
- Manual positioning calculation needed
- Manual keyboard handling
- Not responsive to page scrolling
- More code to maintain

## 4. Recommended Implementation: EditorSuggest with Command Trigger

### Why EditorSuggest?

EditorSuggest is the optimal choice because:
1. It's specifically designed for editor popovers
2. Handles positioning automatically (above/below cursor, scroll-aware)
3. Manages keyboard navigation out of the box
4. Provides the lightweight UI needed for 5 replacement options
5. Native mobile support

### Challenge: Command-Based Triggering

EditorSuggest is designed to trigger automatically when the user types certain characters (like `[[` for links). For a command-triggered popover, we need a workaround.

**Solution:** Use a "trigger character" approach or manually invoke the suggest mechanism:

```typescript
export class QuickReplaceSuggest extends EditorSuggest<SynonymResult> {
  private pendingResults: SynonymResult[] | null = null;
  private triggerWord: string | null = null;

  // Called by the command
  triggerFromCommand(editor: Editor, view: MarkdownView) {
    const wordInfo = getWordUnderCursor(editor);
    if (!wordInfo) return;

    this.triggerWord = wordInfo.word;
    // Fetch results, then trigger the suggest
    this.fetchResults(wordInfo.word).then(results => {
      this.pendingResults = results;
      // Force trigger by simulating cursor position
      this.trigger(editor, view.file, false);
    });
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    if (this.pendingResults === null) return null;

    const wordInfo = getWordUnderCursor(editor);
    if (!wordInfo) return null;

    return {
      start: wordInfo.range.from,
      end: wordInfo.range.to,
      query: wordInfo.word,
    };
  }

  getSuggestions(context: EditorSuggestContext): SynonymResult[] {
    const results = this.pendingResults || [];
    this.pendingResults = null;
    return results.slice(0, 5);
  }
}
```

## 5. Spell Checking Integration

### Current Flow
1. `SpellingService.getSuggestions(word)` checks if word is misspelled via nspell
2. Returns empty array if word is correctly spelled
3. Returns suggestions with `type: "spelling"` if misspelled
4. `DataService.getEnabledTabMetadata(word)` adds "Spelling" tab only if word is misspelled

### Quick Replace Logic
```typescript
async fetchResults(word: string): Promise<SynonymResult[]> {
  const spellingService = this.dataService.getSpellingService();

  // Check if word is misspelled
  if (spellingService.isLoaded() && !spellingService.isCorrect(word)) {
    // Return spelling suggestions (top 5)
    return (await spellingService.getSuggestions(word)).slice(0, 5);
  }

  // Return synonyms from default (first) service
  const defaultService = this.dataService.getDefaultService();
  const results = await defaultService.lookup(word);
  return results.slice(0, 5);
}
```

## 6. Implementation Plan

### Files to Create
- `src/QuickReplaceSuggest.ts` - EditorSuggest implementation

### Files to Modify
- `src/main.ts` - Register command and EditorSuggest
- `src/DataService.ts` - Add method to get default service
- `styles.css` - Add popover-specific styling if needed

### Key Components

**1. QuickReplaceSuggest class:**
```typescript
export class QuickReplaceSuggest extends EditorSuggest<SynonymResult> {
  constructor(app: App, private dataService: DataService) {
    super(app);
  }

  onTrigger(cursor, editor, file): EditorSuggestTriggerInfo | null
  getSuggestions(context): Promise<SynonymResult[]>
  renderSuggestion(result: SynonymResult, el: HTMLElement): void
  selectSuggestion(result: SynonymResult, evt): void
}
```

**2. Command registration:**
```typescript
this.addCommand({
  id: "quick-replace",
  name: "Quick Replace - Show replacement options for word",
  editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
    if (ctx instanceof MarkdownView) {
      this.quickReplaceSuggest.triggerFromCommand(editor, ctx);
    }
  }
});
```

**3. Rendering:**
```typescript
renderSuggestion(result: SynonymResult, el: HTMLElement): void {
  el.addClass("syno-quick-replace-item");
  el.createSpan({ text: result.word });
  if (result.type === "spelling") {
    el.createSpan({ cls: "syno-badge syno-spelling", text: "spelling" });
  }
}
```

## 7. Comparison: EditorSuggest vs Current SynonymModal

| Aspect | Current Modal | EditorSuggest Popover |
|--------|---------------|-----------------------|
| Size | Full screen modal | Small floating popover |
| Positioning | Center | Above/below cursor |
| Keyboard Nav | Custom implementation | Built-in |
| Mobile | Handled separately | Built-in support |
| Multiple sources | Yes (tab switching) | Single result set only |
| Speed | Medium (full render) | Fast (lightweight) |
| User Intent | Deep exploration | Quick replacement |

## 8. Edge Cases to Handle

1. **No word under cursor**: Show notice "No word selected"
2. **Word at document edge**: EditorSuggest handles positioning automatically
3. **Spell checking not loaded**: Fall back to synonyms
4. **No results found**: Show "No suggestions available" or close popover
5. **Mobile**: EditorSuggest handles mobile positioning
6. **Scrolling**: EditorSuggest stays anchored to cursor position

## 9. Alternative Consideration: PopoverSuggest

If EditorSuggest proves difficult to trigger manually, consider using `PopoverSuggest` directly (which EditorSuggest extends). This gives more control over when and where the popover appears:

```typescript
export class QuickReplacePopover extends PopoverSuggest<SynonymResult> {
  show(results: SynonymResult[], position: EditorPosition): void {
    // Manual positioning near cursor
  }
}
```

However, this requires more manual work for positioning and keyboard handling.

## 10. Conclusion

**Recommended Approach:** Implement `QuickReplaceSuggest` extending `EditorSuggest<SynonymResult>` with a custom trigger mechanism invoked by a command. This provides:

- Native Obsidian popover behavior
- Automatic keyboard navigation
- Mobile support
- Scroll-aware positioning
- Minimal code for maximum functionality

The main implementation challenge is triggering the suggest from a command rather than from typing, which can be solved by pre-fetching results and using the `trigger()` method or by maintaining internal state that `onTrigger()` checks.
