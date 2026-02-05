import {
  groupByDefinition,
  flattenVisibleResults,
  getGroupDisplayDefinition,
  hasDisplayableDefinition,
} from "./definitionGrouping";
import { SynonymResult, DefinitionGroup } from "../types/types";

// Helper factory for creating SynonymResult objects
function createResult(overrides: Partial<SynonymResult> = {}): SynonymResult {
  return {
    word: "test",
    type: "synonym",
    source: "wordnet",
    ...overrides,
  };
}

// Helper factory for creating DefinitionGroup objects
function createGroup(overrides: Partial<DefinitionGroup> = {}): DefinitionGroup {
  return {
    definitionId: "def-1",
    definition: "A test definition",
    results: [createResult()],
    ...overrides,
  };
}

describe("definitionGrouping", () => {
  describe("groupByDefinition", () => {
    it("should return empty groups for empty input", () => {
      const result = groupByDefinition([]);

      expect(result.grouped).toEqual([]);
      expect(result.ungrouped).toEqual([]);
    });

    it("should put results without definitionId in ungrouped", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: undefined }),
        createResult({ word: "joyful", definitionId: undefined }),
      ];

      const { grouped, ungrouped } = groupByDefinition(results);

      expect(grouped).toEqual([]);
      expect(ungrouped).toHaveLength(2);
      expect(ungrouped[0].word).toBe("happy");
      expect(ungrouped[1].word).toBe("joyful");
    });

    it("should group results with same definitionId", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1" }),
        createResult({ word: "joyful", definitionId: "def-1" }),
        createResult({ word: "elated", definitionId: "def-1" }),
      ];

      const { grouped, ungrouped } = groupByDefinition(results);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].definitionId).toBe("def-1");
      expect(grouped[0].results).toHaveLength(3);
      expect(ungrouped).toEqual([]);
    });

    it("should create separate groups for different definitionIds", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1" }),
        createResult({ word: "sad", definitionId: "def-2" }),
        createResult({ word: "joyful", definitionId: "def-1" }),
      ];

      const { grouped, ungrouped } = groupByDefinition(results);

      expect(grouped).toHaveLength(2);
      expect(ungrouped).toEqual([]);

      // Groups are sorted by result count, def-1 has 2 results
      const group1 = grouped.find(g => g.definitionId === "def-1");
      const group2 = grouped.find(g => g.definitionId === "def-2");

      expect(group1).toBeDefined();
      expect(group1!.results).toHaveLength(2);
      expect(group2).toBeDefined();
      expect(group2!.results).toHaveLength(1);
    });

    it("should sort groups by result count descending", () => {
      const results: SynonymResult[] = [
        createResult({ word: "a", definitionId: "small" }),
        createResult({ word: "b", definitionId: "large" }),
        createResult({ word: "c", definitionId: "large" }),
        createResult({ word: "d", definitionId: "large" }),
        createResult({ word: "e", definitionId: "medium" }),
        createResult({ word: "f", definitionId: "medium" }),
      ];

      const { grouped } = groupByDefinition(results);

      expect(grouped).toHaveLength(3);
      expect(grouped[0].definitionId).toBe("large");
      expect(grouped[0].results.length).toBe(3);
      expect(grouped[1].definitionId).toBe("medium");
      expect(grouped[1].results.length).toBe(2);
      expect(grouped[2].definitionId).toBe("small");
      expect(grouped[2].results.length).toBe(1);
    });

    it("should capture definition from first result that has one", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1", definition: undefined }),
        createResult({ word: "joyful", definitionId: "def-1", definition: "feeling great pleasure" }),
        createResult({ word: "elated", definitionId: "def-1", definition: "extremely happy" }),
      ];

      const { grouped } = groupByDefinition(results);

      expect(grouped[0].definition).toBe("feeling great pleasure");
    });

    it("should use empty string if no result has definition", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1", definition: undefined }),
        createResult({ word: "joyful", definitionId: "def-1", definition: undefined }),
      ];

      const { grouped } = groupByDefinition(results);

      expect(grouped[0].definition).toBe("");
    });

    it("should capture partOfSpeech from first result that has one", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1", partOfSpeech: undefined }),
        createResult({ word: "joyful", definitionId: "def-1", partOfSpeech: "adjective" }),
        createResult({ word: "elated", definitionId: "def-1", partOfSpeech: "verb" }),
      ];

      const { grouped } = groupByDefinition(results);

      expect(grouped[0].partOfSpeech).toBe("adjective");
    });

    it("should handle mixed grouped and ungrouped results", () => {
      const results: SynonymResult[] = [
        createResult({ word: "happy", definitionId: "def-1" }),
        createResult({ word: "orphan1", definitionId: undefined }),
        createResult({ word: "joyful", definitionId: "def-1" }),
        createResult({ word: "orphan2", definitionId: undefined }),
        createResult({ word: "sad", definitionId: "def-2" }),
      ];

      const { grouped, ungrouped } = groupByDefinition(results);

      expect(grouped).toHaveLength(2);
      expect(ungrouped).toHaveLength(2);
      expect(ungrouped.map(r => r.word)).toEqual(["orphan1", "orphan2"]);
    });

    describe("edge cases", () => {
      it("should handle null definitionId (treated as no definitionId)", () => {
        const results: SynonymResult[] = [
          createResult({ word: "test", definitionId: null as unknown as string }),
        ];

        const { grouped, ungrouped } = groupByDefinition(results);

        expect(grouped).toEqual([]);
        expect(ungrouped).toHaveLength(1);
      });

      it("should handle empty string definitionId (treated as valid definitionId)", () => {
        const results: SynonymResult[] = [
          createResult({ word: "test1", definitionId: "" }),
          createResult({ word: "test2", definitionId: "" }),
        ];

        const { grouped, ungrouped } = groupByDefinition(results);

        // Empty string is falsy, so these go to ungrouped
        expect(grouped).toEqual([]);
        expect(ungrouped).toHaveLength(2);
      });

      it("should handle very long definitionId", () => {
        const longId = "a".repeat(10000);
        const results: SynonymResult[] = [
          createResult({ word: "test", definitionId: longId }),
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped).toHaveLength(1);
        expect(grouped[0].definitionId).toBe(longId);
      });

      it("should handle special characters in definitionId", () => {
        const results: SynonymResult[] = [
          createResult({ word: "test1", definitionId: "def-\u4F60\u597D-\uD83D\uDE00" }),
          createResult({ word: "test2", definitionId: "def-\u4F60\u597D-\uD83D\uDE00" }),
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped).toHaveLength(1);
        expect(grouped[0].results).toHaveLength(2);
      });

      it("should handle large number of results", () => {
        const results: SynonymResult[] = [];
        for (let i = 0; i < 1000; i++) {
          results.push(createResult({
            word: `word-${i}`,
            definitionId: `def-${i % 10}` // 10 groups
          }));
        }

        const { grouped, ungrouped } = groupByDefinition(results);

        expect(grouped).toHaveLength(10);
        expect(ungrouped).toEqual([]);
        // Each group should have 100 results
        grouped.forEach(group => {
          expect(group.results).toHaveLength(100);
        });
      });

      it("should preserve result order within groups", () => {
        const results: SynonymResult[] = [
          createResult({ word: "first", definitionId: "def-1" }),
          createResult({ word: "second", definitionId: "def-1" }),
          createResult({ word: "third", definitionId: "def-1" }),
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped[0].results[0].word).toBe("first");
        expect(grouped[0].results[1].word).toBe("second");
        expect(grouped[0].results[2].word).toBe("third");
      });

      it("should handle results with all optional fields", () => {
        const results: SynonymResult[] = [
          {
            word: "happy",
            type: "synonym",
            source: "wordnet",
            partOfSpeech: "adjective",
            definition: "feeling or showing pleasure",
            definitionId: "def-1",
          },
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped).toHaveLength(1);
        expect(grouped[0].definition).toBe("feeling or showing pleasure");
        expect(grouped[0].partOfSpeech).toBe("adjective");
      });

      it("should handle whitespace-only definition", () => {
        const results: SynonymResult[] = [
          createResult({ word: "test", definitionId: "def-1", definition: "   " }),
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped[0].definition).toBe("   ");
      });

      it("should not update definition if group already has one", () => {
        const results: SynonymResult[] = [
          createResult({ word: "first", definitionId: "def-1", definition: "first definition" }),
          createResult({ word: "second", definitionId: "def-1", definition: "second definition" }),
        ];

        const { grouped } = groupByDefinition(results);

        expect(grouped[0].definition).toBe("first definition");
      });
    });
  });

  describe("flattenVisibleResults", () => {
    it("should return empty array for empty inputs", () => {
      const result = flattenVisibleResults([], [], new Set());

      expect(result).toEqual([]);
    });

    it("should return ungrouped results when no groups", () => {
      const ungrouped: SynonymResult[] = [
        createResult({ word: "a" }),
        createResult({ word: "b" }),
      ];

      const result = flattenVisibleResults([], ungrouped, new Set());

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("a");
      expect(result[1].word).toBe("b");
    });

    it("should limit group results to maxPerGroup by default", () => {
      const group = createGroup({
        definitionId: "def-1",
        results: [
          createResult({ word: "a" }),
          createResult({ word: "b" }),
          createResult({ word: "c" }),
          createResult({ word: "d" }),
          createResult({ word: "e" }),
          createResult({ word: "f" }),
          createResult({ word: "g" }),
        ],
      });

      const result = flattenVisibleResults([group], [], new Set());

      expect(result).toHaveLength(5); // Default maxPerGroup is 5
    });

    it("should show all results when group is expanded", () => {
      const group = createGroup({
        definitionId: "def-1",
        results: [
          createResult({ word: "a" }),
          createResult({ word: "b" }),
          createResult({ word: "c" }),
          createResult({ word: "d" }),
          createResult({ word: "e" }),
          createResult({ word: "f" }),
          createResult({ word: "g" }),
        ],
      });

      const expandedGroups = new Set(["def-1"]);
      const result = flattenVisibleResults([group], [], expandedGroups);

      expect(result).toHaveLength(7);
    });

    it("should respect custom maxPerGroup", () => {
      const group = createGroup({
        definitionId: "def-1",
        results: [
          createResult({ word: "a" }),
          createResult({ word: "b" }),
          createResult({ word: "c" }),
          createResult({ word: "d" }),
          createResult({ word: "e" }),
        ],
      });

      const result = flattenVisibleResults([group], [], new Set(), 2);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("a");
      expect(result[1].word).toBe("b");
    });

    it("should handle multiple groups with different expansion states", () => {
      const group1 = createGroup({
        definitionId: "def-1",
        results: [
          createResult({ word: "a1" }),
          createResult({ word: "a2" }),
          createResult({ word: "a3" }),
          createResult({ word: "a4" }),
          createResult({ word: "a5" }),
          createResult({ word: "a6" }),
        ],
      });
      const group2 = createGroup({
        definitionId: "def-2",
        results: [
          createResult({ word: "b1" }),
          createResult({ word: "b2" }),
          createResult({ word: "b3" }),
          createResult({ word: "b4" }),
          createResult({ word: "b5" }),
          createResult({ word: "b6" }),
        ],
      });

      const expandedGroups = new Set(["def-2"]); // Only def-2 is expanded
      const result = flattenVisibleResults([group1, group2], [], expandedGroups, 3);

      // group1: 3 visible (not expanded)
      // group2: 6 visible (expanded)
      expect(result).toHaveLength(9);
      expect(result.slice(0, 3).map(r => r.word)).toEqual(["a1", "a2", "a3"]);
      expect(result.slice(3).map(r => r.word)).toEqual(["b1", "b2", "b3", "b4", "b5", "b6"]);
    });

    it("should append ungrouped after groups", () => {
      const group = createGroup({
        definitionId: "def-1",
        results: [createResult({ word: "grouped" })],
      });
      const ungrouped: SynonymResult[] = [createResult({ word: "ungrouped" })];

      const result = flattenVisibleResults([group], ungrouped, new Set());

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("grouped");
      expect(result[1].word).toBe("ungrouped");
    });

    describe("edge cases", () => {
      it("should handle maxPerGroup of 0", () => {
        const group = createGroup({
          definitionId: "def-1",
          results: [
            createResult({ word: "a" }),
            createResult({ word: "b" }),
          ],
        });

        const result = flattenVisibleResults([group], [], new Set(), 0);

        expect(result).toHaveLength(0);
      });

      it("should handle maxPerGroup larger than group size", () => {
        const group = createGroup({
          definitionId: "def-1",
          results: [createResult({ word: "a" }), createResult({ word: "b" })],
        });

        const result = flattenVisibleResults([group], [], new Set(), 100);

        expect(result).toHaveLength(2);
      });

      it("should handle empty groups array in results", () => {
        const group = createGroup({
          definitionId: "def-1",
          results: [],
        });

        const result = flattenVisibleResults([group], [], new Set());

        expect(result).toEqual([]);
      });

      it("should handle negative maxPerGroup (treated as 0 by slice)", () => {
        const group = createGroup({
          definitionId: "def-1",
          results: [createResult({ word: "a" }), createResult({ word: "b" })],
        });

        const result = flattenVisibleResults([group], [], new Set(), -5);

        // slice(0, -5) returns empty array
        expect(result).toEqual([]);
      });

      it("should handle very large number of groups and results", () => {
        const groups: DefinitionGroup[] = [];
        for (let i = 0; i < 100; i++) {
          groups.push(createGroup({
            definitionId: `def-${i}`,
            results: Array(10).fill(null).map((_, j) =>
              createResult({ word: `word-${i}-${j}` })
            ),
          }));
        }
        const ungrouped = Array(50).fill(null).map((_, i) =>
          createResult({ word: `ungrouped-${i}` })
        );

        const result = flattenVisibleResults(groups, ungrouped, new Set(), 5);

        // 100 groups * 5 visible each + 50 ungrouped = 550
        expect(result).toHaveLength(550);
      });

      it("should handle expandedGroups containing non-existent group IDs", () => {
        const group = createGroup({
          definitionId: "def-1",
          results: [
            createResult({ word: "a" }),
            createResult({ word: "b" }),
            createResult({ word: "c" }),
            createResult({ word: "d" }),
            createResult({ word: "e" }),
            createResult({ word: "f" }),
          ],
        });

        const expandedGroups = new Set(["non-existent-id"]);
        const result = flattenVisibleResults([group], [], expandedGroups, 3);

        // def-1 is not expanded, so only 3 visible
        expect(result).toHaveLength(3);
      });

      it("should preserve original result object references", () => {
        const originalResult = createResult({ word: "test" });
        const group = createGroup({
          definitionId: "def-1",
          results: [originalResult],
        });

        const result = flattenVisibleResults([group], [], new Set());

        expect(result[0]).toBe(originalResult);
      });
    });
  });

  describe("getGroupDisplayDefinition", () => {
    it("should return definition when present", () => {
      const group = createGroup({ definition: "A test definition" });

      expect(getGroupDisplayDefinition(group)).toBe("A test definition");
    });

    it("should return empty string when definition is empty", () => {
      const group = createGroup({ definition: "" });

      expect(getGroupDisplayDefinition(group)).toBe("");
    });

    it("should return empty string when definition is undefined", () => {
      const group = createGroup({ definition: undefined as unknown as string });

      expect(getGroupDisplayDefinition(group)).toBe("");
    });

    it("should return empty string when definition is null", () => {
      const group = createGroup({ definition: null as unknown as string });

      expect(getGroupDisplayDefinition(group)).toBe("");
    });

    it("should preserve whitespace in definition", () => {
      const group = createGroup({ definition: "  spaced  definition  " });

      expect(getGroupDisplayDefinition(group)).toBe("  spaced  definition  ");
    });

    it("should handle very long definitions", () => {
      const longDefinition = "a".repeat(10000);
      const group = createGroup({ definition: longDefinition });

      expect(getGroupDisplayDefinition(group)).toBe(longDefinition);
    });

    it("should handle unicode in definitions", () => {
      const group = createGroup({ definition: "\u4F60\u597D \uD83D\uDE00 caf\u00e9" });

      expect(getGroupDisplayDefinition(group)).toBe("\u4F60\u597D \uD83D\uDE00 caf\u00e9");
    });
  });

  describe("hasDisplayableDefinition", () => {
    it("should return true for non-empty definition", () => {
      const group = createGroup({ definition: "A test definition" });

      expect(hasDisplayableDefinition(group)).toBe(true);
    });

    it("should return false for empty string definition", () => {
      const group = createGroup({ definition: "" });

      expect(hasDisplayableDefinition(group)).toBe(false);
    });

    it("should return false for undefined definition", () => {
      const group = createGroup({ definition: undefined as unknown as string });

      expect(hasDisplayableDefinition(group)).toBe(false);
    });

    it("should return false for null definition", () => {
      const group = createGroup({ definition: null as unknown as string });

      expect(hasDisplayableDefinition(group)).toBe(false);
    });

    it("should return false for whitespace-only definition", () => {
      const group = createGroup({ definition: "   " });

      expect(hasDisplayableDefinition(group)).toBe(false);
    });

    it("should return true for single character definition", () => {
      const group = createGroup({ definition: "a" });

      expect(hasDisplayableDefinition(group)).toBe(true);
    });

    it("should return true for numeric string definition", () => {
      const group = createGroup({ definition: "123" });

      expect(hasDisplayableDefinition(group)).toBe(true);
    });
  });
});
