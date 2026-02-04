# Datamuse API Documentation Research

**Date:** 2026-02-04
**Purpose:** Comprehensive documentation of the Datamuse API for the ObsidianSynoFinder plugin
**Source:** https://www.datamuse.com/api/

---

## Overview

Datamuse is a word-finding query engine for developers. It provides vocabulary lookup with various constraints including semantic similarity, phonetic similarity, spelling patterns, and lexical relationships.

---

## Endpoints

### 1. `/words` Endpoint

**URL:** `https://api.datamuse.com/words`

Returns vocabulary words matching specified constraints and context hints. This is the primary endpoint used by our plugin.

### 2. `/sug` Endpoint

**URL:** `https://api.datamuse.com/sug`

Provides autocomplete suggestions optimized for "search as you type" interfaces. Includes spelling correction and semantic fallback.

**Parameters:**
- `s` - Prefix hint string (required)
- `max` - Maximum results (default: 10, max: 1000)
- `v` - Vocabulary identifier

---

## Query Parameters for `/words`

### Hard Constraints

These parameters strictly filter results:

| Parameter | Name | Description | Example |
|-----------|------|-------------|---------|
| `ml` | Means Like | Words with similar meaning (semantic constraint) | `ml=ringing+in+the+ears` returns "tinnitus" |
| `sl` | Sounds Like | Words that sound similar (phonetic constraint) | `sl=jirraf` returns "giraffe" |
| `sp` | Spelled Like | Words matching spelling pattern. Supports `*` (any chars) and `?` (single char) wildcards | `sp=t??k` returns "took", "tank", "talk" |

### Relationship Codes (`rel_[code]`)

These return words with specific lexical relationships to the query word:

| Code | Relationship | Description | Example Query | Example Result |
|------|--------------|-------------|---------------|----------------|
| `rel_syn` | **Synonyms** | Words with same or similar meaning | `rel_syn=ocean` | sea, water |
| `rel_ant` | **Antonyms** | Words with opposite meaning | `rel_ant=late` | early, prompt |
| `rel_trg` | **Triggers** | Statistically associated words | `rel_trg=cow` | milking, moo |
| `rel_spc` | **Hypernyms** (more specific than) | Direct superordinate terms | `rel_spc=gondola` | boat |
| `rel_gen` | **Hyponyms** (more general than) | Direct subordinate terms | `rel_gen=boat` | gondola, kayak |
| `rel_com` | **Comprises** (holonyms) | "Whole" words that contain the query | `rel_com=car` | accelerator, steering wheel |
| `rel_par` | **Part of** (meronyms) | "Part" words that the query contains | `rel_par=trunk` | tree, elephant |
| `rel_jja` | **Nouns Modified By** | Nouns frequently modified by the adjective | `rel_jja=gradual` | increase, decline |
| `rel_jjb` | **Adjectives Describing** | Adjectives frequently used with the noun | `rel_jjb=beach` | sandy, beautiful |
| `rel_bga` | **Frequent Followers** | Words that frequently follow the query (bigram after) | `rel_bga=wreak` | havoc |
| `rel_bgb` | **Frequent Predecessors** | Words that frequently precede the query (bigram before) | `rel_bgb=havoc` | wreak |
| `rel_hom` | **Homophones** | Words that sound the same | `rel_hom=course` | coarse |
| `rel_cns` | **Consonant Match** | Words with same consonant pattern | `rel_cns=sample` | simple, symbol |
| `rel_rhy` | **Perfect Rhyme** | Words that rhyme perfectly | `rel_rhy=forgetful` | fretful |
| `rel_nry` | **Near Rhyme** | Words that nearly rhyme | `rel_nry=forest` | chorus |

### Context Hints

These parameters help disambiguate meaning:

| Parameter | Name | Description | Example |
|-----------|------|-------------|---------|
| `topics` | Topics | Up to 5 topic words (space or comma delimited) for context | `ml=bank&topics=river` returns water-related banks |
| `lc` | Left Context | Word appearing to the left of the target | `sp=b*&lc=river` returns "bank" |
| `rc` | Right Context | Word appearing to the right of the target | `sp=*ly&rc=run` returns "quickly" |

### Other Parameters

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `max` | Maximum number of results to return | 100 | 1000 |
| `v` | Vocabulary identifier. Default is ~550,000 English words. Use `es` for Spanish (~500,000 words) | (English) | - |
| `qe` | Query echo - prepends results describing another parameter | - | - |
| `ipa` | Set to `1` to return pronunciation in IPA format instead of Arpabet | 0 | - |

---

## Metadata Parameters (`md`)

The `md` parameter requests additional data in the response. Multiple flags can be combined.

| Flag | Data Returned | Response Field | Description |
|------|---------------|----------------|-------------|
| `d` | Definitions | `defs` array | Definitions from WordNet and Wiktionary. Format: `"pos\tdefinition"` (tab-separated). Also adds `defHeadword` for inflected forms. |
| `p` | Parts of Speech | `tags` array | Includes POS tags: `n` (noun), `v` (verb), `adj` (adjective), `adv` (adverb), `u` (unknown) |
| `s` | Syllable Count | `numSyllables` | Integer count of syllables |
| `r` | Pronunciation | `tags` array | Pronunciation as `"pron:..."` entry. Uses Arpabet format by default, or IPA if `ipa=1` |
| `f` | Word Frequency | `tags` array | Frequency as `"f:X.XX"` entry (occurrences per million words in corpus) |

**Example with multiple metadata flags:**
```
https://api.datamuse.com/words?ml=computer&md=dpsfr&max=5
```

---

## Response Data Structure

### Complete Response Object

```typescript
interface DatamuseResponse {
  word: string;           // The matched word
  score?: number;         // Relevance score (higher = more relevant)
  tags?: string[];        // Array containing POS, pronunciation, frequency
  defs?: string[];        // Array of definitions (format: "pos\tdefinition")
  numSyllables?: number;  // Syllable count (with md=s)
  defHeadword?: string;   // Base form for inflected words (with md=d)
}
```

### Response Examples

**Basic query:**
```json
[
  {"word": "ocean", "score": 98123},
  {"word": "sea", "score": 87654}
]
```

**With metadata (`md=dp`):**
```json
[
  {
    "word": "ocean",
    "score": 98123,
    "tags": ["n"],
    "defs": ["n\ta large body of water constituting a principal part of the hydrosphere"]
  }
]
```

**With full metadata (`md=dpsfr`):**
```json
[
  {
    "word": "tinnitus",
    "score": 57312,
    "tags": ["n", "pron:TIH N AH T AH S", "f:10.5"],
    "defs": ["n\ta ringing or similar sensation of sound in the ears"],
    "numSyllables": 3
  }
]
```

**With IPA pronunciation (`md=r&ipa=1`):**
```json
[
  {
    "word": "example",
    "score": 12345,
    "tags": ["pron:\u026ag\u02c8z\u00e6mp\u0259l"]
  }
]
```

### Definition Format Details

Definitions in the `defs` array follow this format:
- Tab-separated: `"part_of_speech\tdefinition_text"`
- Multiple definitions may be present for different parts of speech
- Example: `["n\ta mammal", "v\tto hunt mammals"]`

### Tags Array Contents

The `tags` array can contain multiple types of data:
- **Part of speech:** `"n"`, `"v"`, `"adj"`, `"adv"`, `"u"`
- **Pronunciation:** `"pron:..."` (Arpabet or IPA)
- **Frequency:** `"f:X.XX"` (per million words)
- **Special markers:** `"prop"` (proper noun), `"query"` (from qe parameter)

---

## Rate Limits and Usage Restrictions

### Free Tier
- **100,000 requests per day** without requiring an API key
- No authentication required
- Beyond the limit, requests may be rate-limited (not hard-blocked)

### Commercial/Higher Volume
- Contact Datamuse developers for:
  - Commercial applications
  - Custom vocabularies
  - Higher request volumes
  - Dedicated support

### Performance Metrics
- Typical `/words` endpoint latency: ~50-100ms (median)
- Typical `/sug` endpoint latency: ~20-50ms (median)

---

## Data Sources

The Datamuse API aggregates data from:
- **CMU Pronouncing Dictionary** - Pronunciation data
- **Google Books Ngrams** - Word frequency and co-occurrence
- **word2vec** - Semantic similarity (for `ml` queries)
- **WordNet 3.0** - Lexical relationships, definitions
- **OneLook dictionaries** - Additional vocabulary
- **Wiktionary** - Definitions

---

## Current Plugin Usage Analysis

### What We Currently Use

| Feature | Implementation | Code Location |
|---------|----------------|---------------|
| Synonyms | `rel_syn` | `getSynonyms()` |
| Related Words | `ml` (means like) | `getRelatedWords()` |
| Antonyms | `rel_ant` | `getAntonyms()` |
| Hypernyms | `rel_spc` | `getHypernyms()` |
| Hyponyms | `rel_gen` | `getHyponyms()` |
| Spelling Suggestions | `sl` (sounds like) | `getSpellingSuggestions()` |
| Definitions | `md=d` | Via `md=dp` parameter |
| Parts of Speech | `md=p` | Via `md=dp` parameter |
| Max Results | `max` | Configurable, default 50 |

### Current Metadata Usage

We request `md=dp` (definitions and parts of speech) for most queries.

### What We DON'T Currently Use

| Feature | Parameter | Potential Use Case |
|---------|-----------|-------------------|
| Triggers/Associated | `rel_trg` | Finding thematically related words |
| Holonyms | `rel_com` | "Whole-part" relationships |
| Meronyms | `rel_par` | "Part-whole" relationships |
| Adjective-Noun Collocations | `rel_jja`, `rel_jjb` | Writing suggestions |
| Bigrams | `rel_bga`, `rel_bgb` | Common word pairs |
| Homophones | `rel_hom` | Pronunciation help |
| Rhymes | `rel_rhy`, `rel_nry` | Poetry/lyrics assistance |
| Consonant Match | `rel_cns` | Word games, creative writing |
| Syllable Count | `md=s` | Poetry, rhythm analysis |
| Word Frequency | `md=f` | Filtering common/rare words |
| Pronunciation | `md=r` | Phonetic display |
| Topic Context | `topics` | Disambiguation |
| Left/Right Context | `lc`, `rc` | Contextual suggestions |
| Spelling Wildcards | `sp` with `*`/`?` | Advanced word search |
| IPA Pronunciation | `ipa=1` | International phonetic display |
| Spanish Vocabulary | `v=es` | Multi-language support |
| Autocomplete | `/sug` endpoint | Search-as-you-type |

---

## Capabilities for Definition Grouping

### Current Approach
The plugin currently takes only the first definition from the `defs` array and extracts just the definition text (discarding the POS prefix).

### Available Improvements

1. **Multiple Definitions Per Word**
   - The API returns ALL definitions in the `defs` array
   - Each definition is POS-tagged (format: `"pos\tdefinition"`)
   - We could display all definitions, grouped by part of speech

2. **Part of Speech Grouping**
   - The `tags` array contains POS information
   - The `defs` array entries are prefixed with POS
   - This allows grouping definitions like:
     - **noun:** definition 1, definition 2
     - **verb:** definition 3

3. **Definition Headword**
   - `defHeadword` field indicates the base form for inflected words
   - Example: "running" might have `defHeadword: "run"`
   - Useful for showing the root word's definitions

### Example: Full Definition Extraction

```typescript
// Current implementation (simplified)
if (item.defs && item.defs.length > 0) {
  const firstDef = item.defs[0];
  const defParts = firstDef.split("\t");
  result.definition = defParts.length > 1 ? defParts[1] : defParts[0];
}

// Potential improvement: Extract all definitions grouped by POS
interface GroupedDefinitions {
  [pos: string]: string[];
}

function parseAllDefinitions(defs: string[]): GroupedDefinitions {
  const grouped: GroupedDefinitions = {};
  for (const def of defs) {
    const [pos, definition] = def.split("\t");
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(definition);
  }
  return grouped;
}
```

---

## Recommendations for Plugin Enhancement

### High Value Additions

1. **Full Definition Display**
   - Parse all definitions from `defs` array
   - Group by part of speech for better organization

2. **Syllable Count**
   - Add `md=s` to requests
   - Useful for writers working on poetry or rhythm

3. **Word Frequency**
   - Add `md=f` to requests
   - Could be used to sort/filter results by commonality

4. **Topic Disambiguation**
   - Use `topics` parameter when context is known
   - Could improve relevance of `ml` queries

### Medium Value Additions

5. **Trigger Words** (`rel_trg`)
   - Broader associations than synonyms
   - Good for brainstorming and ideation

6. **Rhyming Words** (`rel_rhy`, `rel_nry`)
   - Useful for creative writing features

7. **Autocomplete** (`/sug` endpoint)
   - Faster suggestions for search-as-you-type interfaces

### Low Priority / Specialized

8. **Bigram Suggestions** - Very specific use case
9. **Homophones** - Specialized feature
10. **Spanish Support** - Depends on user base

---

## API Best Practices

1. **Combine Multiple Metadata Flags**
   - Instead of: `md=d&md=p`
   - Use: `md=dp` (more efficient)

2. **Use Appropriate Max Values**
   - Don't request more than needed
   - Default of 50-100 is usually sufficient

3. **Cache Results**
   - Same word lookups return same results
   - Consider implementing client-side caching

4. **Handle Empty Responses**
   - API returns empty array `[]` for no matches
   - Always check response length before processing

5. **Rate Limiting**
   - 100k requests/day is generous
   - Consider batching if implementing high-volume features

---

## Appendix: Complete Parameter Reference

### `/words` Endpoint Parameters

```
/words?
  # Hard Constraints
  ml=<word>           # Means like (semantic)
  sl=<word>           # Sounds like (phonetic)
  sp=<pattern>        # Spelled like (wildcards: * ?)
  rel_syn=<word>      # Synonyms
  rel_ant=<word>      # Antonyms
  rel_trg=<word>      # Trigger words
  rel_spc=<word>      # Hypernyms
  rel_gen=<word>      # Hyponyms
  rel_com=<word>      # Holonyms (comprises)
  rel_par=<word>      # Meronyms (part of)
  rel_jja=<word>      # Nouns modified by adjective
  rel_jjb=<word>      # Adjectives for noun
  rel_bga=<word>      # Frequent followers
  rel_bgb=<word>      # Frequent predecessors
  rel_hom=<word>      # Homophones
  rel_cns=<word>      # Consonant match
  rel_rhy=<word>      # Perfect rhymes
  rel_nry=<word>      # Near rhymes

  # Context Hints
  topics=<words>      # Topic words (up to 5)
  lc=<word>           # Left context
  rc=<word>           # Right context

  # Metadata
  md=d                # Definitions
  md=p                # Parts of speech
  md=s                # Syllable count
  md=r                # Pronunciation
  md=f                # Frequency
  md=dpsfr            # All metadata combined
  ipa=1               # IPA pronunciation format

  # Other
  max=<n>             # Max results (default 100, max 1000)
  v=<vocab>           # Vocabulary (default English, "es" for Spanish)
  qe=<param>          # Query echo
```

### `/sug` Endpoint Parameters

```
/sug?
  s=<prefix>          # Search prefix (required)
  max=<n>             # Max results (default 10, max 1000)
  v=<vocab>           # Vocabulary identifier
```
