import { Editor } from "obsidian";
import { getWordUnderCursor, replaceWord } from "./wordExtractor";
import { WordRange } from "../types/types";

// Mock Editor factory
function createMockEditor(overrides: Partial<Editor> = {}): Editor {
  return {
    getSelection: jest.fn().mockReturnValue(""),
    getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
    wordAt: jest.fn().mockReturnValue(null),
    getRange: jest.fn().mockReturnValue(""),
    replaceRange: jest.fn(),
    ...overrides,
  } as unknown as Editor;
}

describe("wordExtractor", () => {
  describe("getWordUnderCursor", () => {
    describe("with selection", () => {
      it("should return selected text when there is a selection", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("selected"),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 8 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("selected");
        expect(result!.range.from).toEqual({ line: 0, ch: 0 });
        expect(result!.range.to).toEqual({ line: 0, ch: 8 });
        expect(result!.editor).toBe(editor);
      });

      it("should trim whitespace from selection", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("  word  "),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 8 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("word");
      });

      it("should handle multi-line selection", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("multi\nline"),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 1, ch: 4 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("multi\nline");
      });

      it("should return null for selection with only whitespace", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("   "),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 3 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        // Whitespace-only selection returns null (no meaningful word)
        expect(result).toBeNull();
      });
    });

    describe("without selection (cursor in word)", () => {
      it("should return word under cursor when no selection", () => {
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 2 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue("hello"),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("hello");
        expect(result!.range.from).toEqual({ line: 0, ch: 0 });
        expect(result!.range.to).toEqual({ line: 0, ch: 5 });
      });

      it("should return null when cursor is not on a word", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
          wordAt: jest.fn().mockReturnValue(null),
        });

        const result = getWordUnderCursor(editor);

        expect(result).toBeNull();
      });

      it("should return null when wordAt returns empty word", () => {
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 0 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue(""),
        });

        const result = getWordUnderCursor(editor);

        expect(result).toBeNull();
      });

      it("should return null when word is only whitespace", () => {
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 3 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 1 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue("   "),
        });

        const result = getWordUnderCursor(editor);

        expect(result).toBeNull();
      });

      it("should trim whitespace from word under cursor", () => {
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 7 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 3 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue(" word  "),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("word");
      });
    });

    describe("edge cases", () => {
      it("should handle unicode words", () => {
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 2 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue("caf\u00e9"),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("caf\u00e9");
      });

      it("should handle emoji selection", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("\uD83D\uDE00\uD83D\uDE01"),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 4 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("\uD83D\uDE00\uD83D\uDE01");
      });

      it("should handle very long words", () => {
        const longWord = "a".repeat(10000);
        const wordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 10000 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 5000 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue(longWord),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe(longWord);
        expect(result!.word.length).toBe(10000);
      });

      it("should handle single character word", () => {
        const wordRange = {
          from: { line: 0, ch: 5 },
          to: { line: 0, ch: 6 },
        };
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 0, ch: 5 }),
          wordAt: jest.fn().mockReturnValue(wordRange),
          getRange: jest.fn().mockReturnValue("a"),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("a");
      });

      it("should handle words with special characters", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("don't"),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 5 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("don't");
      });

      it("should handle hyphenated words in selection", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue("well-known"),
          getCursor: jest.fn().mockImplementation((type?: string) => {
            if (type === "from") return { line: 0, ch: 0 };
            if (type === "to") return { line: 0, ch: 10 };
            return { line: 0, ch: 0 };
          }),
        });

        const result = getWordUnderCursor(editor);

        expect(result).not.toBeNull();
        expect(result!.word).toBe("well-known");
      });

      it("should handle cursor at end of document", () => {
        const editor = createMockEditor({
          getSelection: jest.fn().mockReturnValue(""),
          getCursor: jest.fn().mockReturnValue({ line: 999, ch: 0 }),
          wordAt: jest.fn().mockReturnValue(null),
        });

        const result = getWordUnderCursor(editor);

        expect(result).toBeNull();
      });
    });
  });

  describe("replaceWord", () => {
    it("should replace word in editor", () => {
      const replaceRangeMock = jest.fn();
      const editor = createMockEditor({
        getRange: jest.fn().mockReturnValue("hello"),
        replaceRange: replaceRangeMock,
      });
      const range: WordRange = {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 5 },
      };

      replaceWord(editor, range, "world");

      expect(replaceRangeMock).toHaveBeenCalledWith(
        "world",
        { line: 0, ch: 0 },
        { line: 0, ch: 5 }
      );
    });

    describe("capitalization matching", () => {
      it("should preserve lowercase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "world");

        expect(replaceRangeMock).toHaveBeenCalledWith(
          "world",
          expect.anything(),
          expect.anything()
        );
      });

      it("should capitalize first letter when original is Titlecase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("Hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "world");

        expect(replaceRangeMock).toHaveBeenCalledWith(
          "World",
          expect.anything(),
          expect.anything()
        );
      });

      it("should convert to all uppercase when original is UPPERCASE", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("HELLO"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "world");

        // All uppercase original produces all uppercase replacement
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "WORLD",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle mIxEdCaSe (first letter uppercase)", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("hElLo"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "world");

        // First char 'h' is lowercase, so replacement stays lowercase
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "world",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle single uppercase character as all uppercase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("A"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 1 },
        };

        replaceWord(editor, range, "word");

        // Single uppercase char is all-uppercase, so replacement is uppercased
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "WORD",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle single lowercase character", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("a"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 1 },
        };

        replaceWord(editor, range, "word");

        expect(replaceRangeMock).toHaveBeenCalledWith(
          "word",
          expect.anything(),
          expect.anything()
        );
      });

      it("should lowercase replacement when original is lowercase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "World");

        // Original is lowercase, so replacement is lowercased
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "world",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle unicode uppercase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("\u00c9cole"), // \u00c9 is uppercase E with accent
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "school");

        expect(replaceRangeMock).toHaveBeenCalledWith(
          "School",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle empty original word", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue(""),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 0 },
        };

        replaceWord(editor, range, "word");

        // When original is empty, replacement is returned as-is
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "word",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle empty replacement word", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("Hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "");

        // Empty replacement is returned as-is
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle number as first character", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("3word"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "replacement");

        // Number has no case, so replacement stays as-is
        // '3'.toLowerCase() === '3', so it's treated as lowercase
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "replacement",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle special character as first character", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("$word"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "replacement");

        // '$' has no case, so replacement stays as-is
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "replacement",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle CJK characters (no case)", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("\u4F60\u597D"), // Chinese for "hello"
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 2 },
        };

        replaceWord(editor, range, "world");

        // CJK characters have no case, so replacement stays as-is
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "world",
          expect.anything(),
          expect.anything()
        );
      });

      it("should titlecase replacement when original is titlecase", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("Hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 5 },
        };

        replaceWord(editor, range, "WORLD");

        // Original is titlecase (not all uppercase), so replacement becomes titlecase
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "World",
          expect.anything(),
          expect.anything()
        );
      });

      it("should handle whitespace in original word", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue(" hello"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 6 },
        };

        replaceWord(editor, range, "world");

        // First char is space which has no case
        expect(replaceRangeMock).toHaveBeenCalledWith(
          "world",
          expect.anything(),
          expect.anything()
        );
      });
    });

    describe("edge cases", () => {
      it("should handle multiline range", () => {
        const replaceRangeMock = jest.fn();
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("Hello\nWorld"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 1, ch: 5 },
        };

        replaceWord(editor, range, "replacement");

        expect(replaceRangeMock).toHaveBeenCalledWith(
          "Replacement",
          { line: 0, ch: 0 },
          { line: 1, ch: 5 }
        );
      });

      it("should handle very long replacement", () => {
        const replaceRangeMock = jest.fn();
        const longReplacement = "a".repeat(10000);
        const editor = createMockEditor({
          getRange: jest.fn().mockReturnValue("word"),
          replaceRange: replaceRangeMock,
        });
        const range: WordRange = {
          from: { line: 0, ch: 0 },
          to: { line: 0, ch: 4 },
        };

        replaceWord(editor, range, longReplacement);

        expect(replaceRangeMock).toHaveBeenCalledWith(
          longReplacement,
          expect.anything(),
          expect.anything()
        );
      });
    });
  });
});
