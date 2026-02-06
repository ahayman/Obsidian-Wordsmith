import { Editor } from "obsidian";
import { WordExtractionResult, WordRange } from "../types/types";

export function getWordUnderCursor(editor: Editor): WordExtractionResult | null {
  const selection = editor.getSelection();

  if (selection && selection.length > 0) {
    const trimmedSelection = selection.trim();
    // Return null if selection is only whitespace
    if (trimmedSelection.length === 0) {
      return null;
    }
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    return {
      word: trimmedSelection,
      range: { from, to },
      editor,
    };
  }

  const cursor = editor.getCursor();
  const wordRange = editor.wordAt(cursor);

  if (!wordRange) {
    return null;
  }

  const range: WordRange = {
    from: wordRange.from,
    to: wordRange.to,
  };

  const word = editor.getRange(range.from, range.to);

  if (!word || word.trim().length === 0) {
    return null;
  }

  return {
    word: word.trim(),
    range,
    editor,
  };
}

export function replaceWord(
  editor: Editor,
  range: WordRange,
  newWord: string
): void {
  const originalWord = editor.getRange(range.from, range.to);
  const replacementWord = matchCapitalization(originalWord, newWord);
  editor.replaceRange(replacementWord, range.from, range.to);
}

function matchCapitalization(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;

  // Use spread to correctly handle surrogate pairs (emoji, rare CJK)
  const firstChar = [...original][0] ?? "";

  // Check if the entire original is uppercase (e.g., "HELLO")
  if (original === original.toUpperCase() && original !== original.toLowerCase()) {
    return replacement.toUpperCase();
  }

  // Check if first letter is uppercase (e.g., "Hello")
  if (firstChar !== firstChar.toLowerCase()) {
    const [firstReplacement, ...rest] = [...replacement];
    return (firstReplacement ?? "").toUpperCase() + rest.join("").toLowerCase();
  }

  // Original is lowercase, ensure replacement is lowercase
  return replacement.toLowerCase();
}
