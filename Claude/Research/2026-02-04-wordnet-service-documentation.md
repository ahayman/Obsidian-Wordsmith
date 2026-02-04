# WordNet Service Documentation

This document provides comprehensive documentation for the WordNet thesaurus data source used in the ObsidianSynoFinder plugin, including data structures, available fields, and capabilities for definition-grouped synonyms.

## Data Source Overview

The plugin uses a pre-processed WordNet dataset from the [zaibacu/thesaurus](https://github.com/zaibacu/thesaurus) GitHub repository:

- **Source URL**: `https://raw.githubusercontent.com/zaibacu/thesaurus/master/en_thesaurus.jsonl`
- **Format**: JSONL (JSON Lines) - each line is a separate JSON document
- **Original Data**: Extracted from [Princeton WordNet](https://wordnet.princeton.edu/)
- **License**: WordNet License (permits commercial use, provided "AS IS")

## Data Structure

### Raw Data Format (ThesaurusEntry)

Each line in the JSONL file represents a single word sense (synset) with the following structure:

```typescript
/**
 * Represents a single entry from the WordNet thesaurus JSONL file.
 * Each entry corresponds to one word sense (synset) in WordNet.
 */
interface ThesaurusEntry {
  /**
   * The headword/lemma for this entry.
   * Stored in lowercase in the original data.
   * Example: "happy", "run", "fast"
   */
  word: string;

  /**
   * The WordNet synset offset - an 8-digit, zero-filled decimal integer
   * representing the byte offset in the original WordNet data file.
   *
   * This serves as a unique identifier for the synset within WordNet,
   * though it can vary between WordNet versions.
   *
   * Example: "01148283", "00612912"
   */
  wordnet_id: string;

  /**
   * A unique key combining the word and a counter to distinguish
   * multiple senses of the same word.
   *
   * Format: "{word}_{sense_number}"
   * Example: "happy_1", "happy_2", "fast_1", "fast_2"
   *
   * This ensures uniqueness when the same word appears in multiple synsets.
   */
  key: string;

  /**
   * Part of speech tag indicating the grammatical category.
   *
   * Possible values:
   * - "noun" - Names of things, people, places, concepts
   * - "verb" - Action or state words
   * - "adj" / "adjective" - Words that modify nouns
   * - "adv" / "adverb" - Words that modify verbs, adjectives, or other adverbs
   * - "adjective satellite" - Adjectives that are similar to but not identical
   *                          to a cluster head adjective
   *
   * Note: The extraction script maps single-char codes to full names:
   * n -> noun, v -> verb, a -> adjective, s -> adjective satellite, r -> adverb
   */
  pos: string;

  /**
   * Array of synonyms for this word sense.
   *
   * These are lemmas from the same WordNet synset, meaning they share
   * the same meaning/definition. The original word is excluded from
   * this list.
   *
   * Example for "happy" sense 1: ["glad", "felicitous"]
   */
  synonyms: string[];

  /**
   * Array of definitions/descriptions for this word sense.
   *
   * Derived from the WordNet "gloss" field, which contains a definition
   * and optionally one or more example sentences. These are split by
   * semicolons in the extraction process.
   *
   * Example: ["feeling or showing pleasure", "a happy smile"]
   *
   * The first element is typically the definition, followed by examples.
   */
  desc: string[];
}
```

### Current Plugin Usage (SynonymResult)

The plugin transforms `ThesaurusEntry` into `SynonymResult` for display:

```typescript
interface SynonymResult {
  /** The synonym word */
  word: string;

  /** Type of relationship - always "synonym" for WordNet */
  type: "synonym" | "antonym" | "related" | "hypernym" | "hyponym" | "spelling";

  /** Data source identifier */
  source: "wordnet";

  /** Part of speech from the entry */
  partOfSpeech?: string;

  /** First definition from the desc array (if available) */
  definition?: string;
}
```

## Field Analysis: Available vs Currently Used

| Field | Raw Data | Currently Used | Notes |
|-------|----------|----------------|-------|
| `word` | Yes | Yes | Used for lookup key (lowercase) |
| `wordnet_id` | Yes | **No** | Could enable synset grouping |
| `key` | Yes | **No** | Could enable sense disambiguation |
| `pos` | Yes | Yes | Passed to `partOfSpeech` |
| `synonyms` | Yes | Yes | Iterated to create results |
| `desc` | Yes | Partial | Only `desc[0]` used for definition |

### Unused Data Opportunities

1. **`wordnet_id`**: Could group synonyms by synset for definition-grouped display
2. **`key`**: Could uniquely identify and track specific word senses
3. **`desc[1..n]`**: Example sentences are discarded; could show usage

## How Word Senses/Definitions Are Structured

### WordNet Synset Model

WordNet organizes words into **synsets** (synonym sets), where:

1. **Synset** = A set of words sharing one specific meaning
2. **Word** = Can belong to multiple synsets (polysemy)
3. **Sense** = A specific word-meaning pairing

Example for "fast":
```
fast (word) -> [
  fast.a.01 (synset): "acting or moving quickly" -> synonyms: quick, speedy
  fast.a.02 (synset): "firmly fastened" -> synonyms: firm, immobile
  fast.n.01 (synset): "abstaining from food" -> synonyms: fasting
  fast.v.01 (synset): "to abstain from eating" -> synonyms: abstain
]
```

### Data Organization in JSONL

The JSONL file creates **one entry per synset headword**, not per word. This means:

- Looking up "happy" returns multiple entries (one per sense)
- Each entry's `synonyms` array contains other words in that synset
- The `wordnet_id` uniquely identifies the synset
- The `desc` array provides the definition and examples

### Example Data Entries

```json
{"word": "happy", "wordnet_id": "01148283", "key": "happy_1", "pos": "adjective", "synonyms": ["felicitous"], "desc": ["enjoying or showing or marked by joy or pleasure"]}
{"word": "happy", "wordnet_id": "00612912", "key": "happy_2", "pos": "adjective", "synonyms": ["well-chosen"], "desc": ["well expressed and to the point", "a happy turn of phrase"]}
{"word": "glad", "wordnet_id": "01148283", "key": "glad_1", "pos": "adjective", "synonyms": ["happy", "felicitous"], "desc": ["enjoying or showing or marked by joy or pleasure"]}
```

Notice that "happy" and "glad" share `wordnet_id: "01148283"` - they're in the same synset.

## Grouping Capabilities

### By wordnet_id (Synset)

The `wordnet_id` field enables grouping synonyms by their exact semantic meaning:

```typescript
// Pseudocode for definition-grouped synonyms
function lookupGroupedByDefinition(word: string): Map<string, SynonymGroup> {
  const entries = data.get(word.toLowerCase());
  const groups = new Map<string, SynonymGroup>();

  for (const entry of entries) {
    groups.set(entry.wordnet_id, {
      definition: entry.desc[0],
      partOfSpeech: entry.pos,
      synonyms: entry.synonyms,
      examples: entry.desc.slice(1)
    });
  }

  return groups;
}
```

### By key (Sense Disambiguation)

The `key` field (`word_n`) provides a stable identifier for each word sense:

- `happy_1` = "enjoying pleasure" sense
- `happy_2` = "well expressed" sense

This could enable:
- Tracking which sense the user selected
- Filtering future lookups to similar senses
- Building sense-aware caching

### By pos (Part of Speech)

Grouping by part of speech provides coarse-grained organization:

```typescript
interface POSGroupedResult {
  noun?: SynonymGroup[];
  verb?: SynonymGroup[];
  adjective?: SynonymGroup[];
  adverb?: SynonymGroup[];
}
```

## Semantic Relations in WordNet (Not in Current Data)

The full WordNet database contains rich semantic relations that are **not included** in the zaibacu/thesaurus extract:

### Available Relations (in full WordNet)

| Relation | Description | Example |
|----------|-------------|---------|
| **Hypernym** | Broader/parent concept (IS-A) | dog -> canine -> animal |
| **Hyponym** | Narrower/child concept | animal -> dog -> poodle |
| **Antonym** | Opposite meaning | happy <-> sad |
| **Meronym** | Part of whole | wheel is part of car |
| **Holonym** | Whole containing part | car contains wheel |
| **Troponym** | Manner of (verbs) | whisper is a way of speaking |
| **Entailment** | Logically requires | snoring entails sleeping |
| **Similar** | Related but not synonymous | tool ~ instrument |

### What's Missing from the JSONL Extract

The thesaurus JSONL file only extracts:
- Synonyms (words in the same synset)
- Definitions (gloss text)
- Part of speech

It does **not** include:
- Antonyms
- Hypernyms/hyponyms
- Meronyms/holonyms
- Domain categories
- Usage frequency data
- Example sentence annotations

## Limitations

### Data Limitations

1. **No Antonyms**: The extract doesn't include antonym relationships
2. **No Hierarchy**: Hypernym/hyponym relationships not included
3. **Flat Synonyms**: No similarity scores or rankings
4. **Limited Context**: Only definition text, no usage frequency
5. **Version-Dependent IDs**: `wordnet_id` offsets vary between WordNet versions

### Format Limitations

1. **Single Language**: English only
2. **No Incremental Updates**: Must re-download entire file for updates
3. **No Relationship Links**: Cannot traverse from one synset to related synsets

### Current Implementation Limitations

1. **Definitions Underutilized**: Only first definition shown, examples discarded
2. **No Sense Grouping**: All senses mixed together in results
3. **No Synset Awareness**: `wordnet_id` not used for grouping
4. **Case Sensitivity Lost**: Words normalized to lowercase

## Capabilities for Definition-Grouped Synonyms

### What's Possible with Current Data

The existing JSONL data **fully supports** definition-grouped synonym display:

```typescript
interface DefinitionGroupedLookup {
  word: string;
  senses: Array<{
    wordnet_id: string;       // Synset identifier
    partOfSpeech: string;     // noun, verb, adjective, adverb
    definition: string;       // Primary definition
    examples: string[];       // Usage examples
    synonyms: string[];       // Words sharing this meaning
  }>;
}
```

### Implementation Approach

1. **Lookup all entries** for the word (already done - returns `ThesaurusEntry[]`)
2. **Group by `wordnet_id`** or simply by unique `(pos, desc[0])` pairs
3. **Display hierarchy**:
   ```
   happy (adjective)
     Sense 1: "enjoying or showing pleasure"
       -> glad, felicitous, joyful
     Sense 2: "well expressed and to the point"
       -> well-chosen, felicitous
   ```

### Current Code Changes Needed

In `WordNetService.ts`, the `lookup()` method currently flattens all synonyms:

```typescript
// Current: Returns flat list, loses sense grouping
lookup(word: string): SynonymResult[] {
  const entries = this.data.get(normalizedWord);
  for (const entry of entries) {
    for (const synonym of entry.synonyms) {
      results.push({...});
    }
  }
}
```

To enable definition grouping, add a new method:

```typescript
// Proposed: Returns sense-grouped results
lookupGrouped(word: string): DefinitionGroup[] {
  const entries = this.data.get(normalizedWord);
  return entries.map(entry => ({
    wordnet_id: entry.wordnet_id,
    partOfSpeech: entry.pos,
    definition: entry.desc[0],
    examples: entry.desc.slice(1),
    synonyms: entry.synonyms
  }));
}
```

## Summary

The WordNet thesaurus data provides a solid foundation for definition-grouped synonyms:

| Feature | Status | Notes |
|---------|--------|-------|
| Multiple word senses | Available | Via separate entries per sense |
| Definitions | Available | In `desc[0]` |
| Examples | Available | In `desc[1..n]` |
| Synset grouping | Available | Via `wordnet_id` |
| Part of speech | Available | Via `pos` |
| Sense disambiguation | Available | Via `key` |
| Antonyms | Not available | Not in extract |
| Hypernyms/Hyponyms | Not available | Not in extract |
| Usage frequency | Not available | Not in extract |

The current implementation uses approximately **40%** of the available data. Significant improvements to UX are possible by:
1. Grouping synonyms by definition using `wordnet_id`
2. Displaying example sentences from `desc[1..n]`
3. Using `key` for sense tracking

## References

- [zaibacu/thesaurus GitHub Repository](https://github.com/zaibacu/thesaurus) - Source of the JSONL data
- [Princeton WordNet](https://wordnet.princeton.edu/) - Original lexical database
- [WordNet Database Documentation](https://wordnet.princeton.edu/documentation/wndb5wn) - File format specification
- [NLTK WordNet Documentation](https://www.nltk.org/howto/wordnet.html) - Python interface examples
- [Global WordNet Documentation](https://globalwordnet.github.io/gwadoc/) - Semantic relation definitions
