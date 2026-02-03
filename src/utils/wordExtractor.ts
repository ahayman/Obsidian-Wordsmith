import { Editor } from "obsidian";
import { WordExtractionResult, WordRange } from "../types";

export function getWordUnderCursor(editor: Editor): WordExtractionResult | null {
  const selection = editor.getSelection();

  if (selection && selection.length > 0) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    return {
      word: selection.trim(),
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

  const firstChar = original.charAt(0);

  // Check if first letter is uppercase
  if (firstChar !== firstChar.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}
