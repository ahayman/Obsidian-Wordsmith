import { SynonymResult, DefinitionGroup, GroupedResults } from "../types";

/**
 * Groups synonym results by their definitionId.
 * Results without a definitionId go into the ungrouped array.
 * Groups are sorted by result count (most common definition first).
 */
export function groupByDefinition(results: SynonymResult[]): GroupedResults {
  const groupMap = new Map<string, DefinitionGroup>();
  const ungrouped: SynonymResult[] = [];

  for (const result of results) {
    if (!result.definitionId) {
      ungrouped.push(result);
      continue;
    }

    const existing = groupMap.get(result.definitionId);
    if (existing) {
      existing.results.push(result);
      // Update definition if current result has one and existing doesn't
      if (!existing.definition && result.definition) {
        existing.definition = result.definition;
      }
      // Update partOfSpeech if current result has one and existing doesn't
      if (!existing.partOfSpeech && result.partOfSpeech) {
        existing.partOfSpeech = result.partOfSpeech;
      }
    } else {
      groupMap.set(result.definitionId, {
        definitionId: result.definitionId,
        definition: result.definition || "",
        partOfSpeech: result.partOfSpeech,
        results: [result],
      });
    }
  }

  // Convert map to array and sort by result count (descending)
  const grouped = Array.from(groupMap.values()).sort(
    (a, b) => b.results.length - a.results.length
  );

  return { grouped, ungrouped };
}

/**
 * Flattens grouped results into a single array for keyboard navigation.
 * Respects expanded state and max items per group.
 */
export function flattenVisibleResults(
  groups: DefinitionGroup[],
  ungrouped: SynonymResult[],
  expandedGroups: Set<string>,
  maxPerGroup: number = 5
): SynonymResult[] {
  const visible: SynonymResult[] = [];

  for (const group of groups) {
    const isExpanded = expandedGroups.has(group.definitionId);
    const limit = isExpanded ? group.results.length : maxPerGroup;
    const visibleResults = group.results.slice(0, limit);
    visible.push(...visibleResults);
  }

  visible.push(...ungrouped);

  return visible;
}

/**
 * Gets the display definition for a group.
 * Returns the definition text if available, empty string otherwise.
 */
export function getGroupDisplayDefinition(group: DefinitionGroup): string {
  return group.definition || "";
}

/**
 * Checks if a group has a meaningful definition to display.
 */
export function hasDisplayableDefinition(group: DefinitionGroup): boolean {
  return !!group.definition && group.definition.length > 0;
}
