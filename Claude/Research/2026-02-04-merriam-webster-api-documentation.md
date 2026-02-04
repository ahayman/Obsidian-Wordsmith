# Merriam-Webster Collegiate Thesaurus API Documentation

## Overview

The Merriam-Webster Collegiate Thesaurus API provides programmatic access to synonym, antonym, and related word data. This document details the API structure, response format, and how the current plugin implementation uses the available data.

## API Endpoint

**Base URL:**
```
https://dictionaryapi.com/api/v3/references/thesaurus/json/{word}?key={api-key}
```

**Request Format:**
- `{word}` - URL-encoded search term
- `key` - Required API key parameter

**Response Format:** JSON array of entry objects

## Authentication & Rate Limits

### API Key Requirements
- Registration required at [dictionaryapi.com](https://dictionaryapi.com)
- Free tier available for non-commercial use
- Key passed as query parameter: `?key=your-api-key`

### Free Tier Limitations
| Limit | Value |
|-------|-------|
| Daily queries | 1,000 per API key |
| Reference APIs | Up to 2 APIs per account |
| Commercial use | Not allowed (requires contact for business terms) |

### Error Handling
- **403 Forbidden**: Invalid API key
- **Array of strings**: Spelling suggestions (word not found)
- **Empty array**: No results

---

## Complete Response Structure

### Top-Level Response

The API returns an array of entry objects. Each entry represents a distinct meaning or part of speech for the searched word.

```typescript
type ThesaurusResponse = ThesaurusEntry[] | string[];  // string[] for spelling suggestions
```

### Entry Structure

```typescript
interface ThesaurusEntry {
  // Metadata
  meta?: MetaObject;
  hom?: number;              // Homograph number for identically spelled words

  // Headword Information
  hwi?: HeadwordInfo;
  ahws?: AlternateHeadword[]; // Alternate headwords
  vrs?: Variant[];            // Variant spellings

  // Grammar & Labels
  fl?: string;               // Functional label (part of speech)
  lbs?: string[];            // General labels (e.g., "often capitalized")
  sls?: string[];            // Subject/status labels (regional, register)
  psl?: string;              // Parenthesized subject/status label
  ins?: Inflection[];        // Inflections

  // Definitions
  def?: Definition[];
  shortdef?: string[];       // Brief definitions array

  // Run-On Entries
  uros?: UndefinedRunOn[];   // Undefined run-ons
  dros?: DefinedRunOn[];     // Defined run-ons (phrases)

  // Cross References
  cxs?: CognateXRef[];       // Cognate cross-references
  dxnls?: string[];          // Directional cross-reference strings

  // Extended Content
  usages?: UsageSection[];   // Usage discussions
  syns?: SynonymSection[];   // Synonym discussions
  quotes?: Quote[];          // Quotations
  art?: Artwork;             // Artwork reference
  table?: TableRef;          // Table reference
  date?: string;             // First known use
}
```

---

## Meta Object (Detailed)

The `meta` object contains essential metadata and pre-extracted synonym/antonym arrays.

```typescript
interface MetaObject {
  id: string;           // Entry identifier (e.g., "happy:1")
  uuid: string;         // Universally unique identifier
  src: string;          // Source dataset (e.g., "coll_thes" for Collegiate Thesaurus)
  section: string;      // Section type ("alpha" for alphabetical)
  stems: string[];      // Word stems/variants that point to this entry
  offensive: boolean;   // Content warning flag

  // Pre-extracted relationship arrays (THESAURUS SPECIFIC)
  syns?: string[][];    // Grouped synonyms - each inner array corresponds to a sense
  ants?: string[][];    // Grouped antonyms - each inner array corresponds to a sense
}
```

### Key Insight: `meta.syns` and `meta.ants`

The `meta.syns` and `meta.ants` arrays provide a **flattened, pre-extracted** view of synonyms/antonyms:
- Each inner array corresponds to a definition in `shortdef[]`
- Index alignment: `meta.syns[0]` contains synonyms for `shortdef[0]`
- Useful for simple synonym extraction without parsing nested `def` structure

---

## Headword Information

```typescript
interface HeadwordInfo {
  hw: string;           // Headword with syllable breaks (e.g., "hap*py")
  prs?: Pronunciation[];
}

interface AlternateHeadword {
  hw: string;
  prs?: Pronunciation[];
  psl?: string;         // Parenthesized label
}

interface Variant {
  va: string;           // Variant spelling
  vl?: string;          // Variant label (e.g., "or", "also")
  prs?: Pronunciation[];
  spl?: string;         // Supplemental pronunciation label
}

interface Pronunciation {
  mw: string;           // Merriam-Webster phonetic notation
  sound?: {
    audio: string;      // Audio filename
    ref: string;        // Reference folder
    stat: string;       // Status
  };
  l?: string;           // Label before pronunciation
  l2?: string;          // Label after pronunciation
  pun?: string;         // Punctuation between pronunciations
}
```

**Audio URL Pattern:**
```
https://media.merriam-webster.com/audio/prons/{lang}/{country}/{format}/{subdir}/{filename}.{format}
```

---

## Definition Structure (The Core)

The `def` array contains the hierarchical definition structure. This is where the detailed synonym/antonym/related word data lives.

```typescript
interface Definition {
  vd?: string;          // Verb divider (e.g., "transitive verb", "intransitive verb")
  sseq: SenseSequence;  // Sense sequence array (THE MAIN CONTENT)
}
```

### Sense Sequence (`sseq`)

The `sseq` is a nested array structure containing sense elements:

```typescript
type SenseSequence = SenseSequenceItem[][];

type SenseSequenceItem =
  | ["sense", Sense]          // Full sense with definition
  | ["sen", TruncatedSense]   // Truncated sense (structural)
  | ["bs", BindingSubstitute] // Broad sense introducing subsenses
  | ["pseq", SenseSequence];  // Parenthesized sense sequence
```

### Sense Object

```typescript
interface Sense {
  sn?: string;          // Sense number (e.g., "1", "2 a", "b", "(1)")
  dt: DefiningText;     // Defining text array
  sdsense?: {           // Divided sense (specifically/broadly)
    sd: string;         // Sense divider word
    dt: DefiningText;
  };
  et?: Etymology[];     // Etymology
  vrs?: Variant[];      // Sense-specific variants
  ins?: Inflection[];   // Sense-specific inflections
  lbs?: string[];       // Sense-specific labels
  sls?: string[];       // Sense-specific subject/status labels
  prs?: Pronunciation[];
  sgram?: string;       // Grammatical label (T/I for transitive/intransitive)

  // THESAURUS-SPECIFIC LISTS
  syn_list?: SynonymList;
  sim_list?: SimilarList;
  rel_list?: RelatedList;
  near_list?: NearList;
  ant_list?: AntonymList;
  opp_list?: OppositeList;
  phrase_list?: PhraseList;
}
```

---

## Defining Text (`dt`)

The `dt` array contains ordered pairs of content type and content:

```typescript
type DefiningText = DefiningTextItem[];

type DefiningTextItem =
  | ["text", string]              // Definition text
  | ["vis", VerbalIllustration[]] // Usage examples
  | ["uns", UsageNote[]]          // Usage notes
  | ["ca", CalledAlsoNote]        // "Called also" note
  | ["snote", SupplementalNote[]] // Supplemental info
  | ["ri", RunInEntry[]]          // Run-in entries
  | ["bnw", BioNameWrap];         // Biographical name wrap

interface VerbalIllustration {
  t: string;            // Illustration text
  aq?: Attribution;     // Attribution for quotation
}
```

---

## Thesaurus-Specific Word Lists

These are the key fields for synonym lookup functionality. **Each list is associated with a specific sense/definition.**

### Synonym List (`syn_list`)

Direct synonyms - words that can substitute for the headword in the given sense.

```typescript
type SynonymList = ThesaurusWord[][];

interface ThesaurusWord {
  wd: string;           // The word
  wvrs?: Variant[];     // Word variants
  wvbvrs?: Variant[];   // Bold word variants
  wsls?: string[];      // Subject/status labels for this word
}
```

**Example:**
```json
"syn_list": [
  [
    { "wd": "adjudicator" },
    { "wd": "arbiter" },
    { "wd": "arbitrator" },
    { "wd": "judge" },
    { "wd": "referee" }
  ]
]
```

### Similar/Near-Synonym List (`sim_list`)

Words that are nearly but not exactly synonymous.

```typescript
type SimilarList = ThesaurusWord[][];
```

### Related Word List (`rel_list`)

Words meaningfully connected to the sense without being synonyms. **Grouped into semantic categories.**

```typescript
type RelatedList = ThesaurusWord[][];  // Each inner array is a semantic group
```

**Example:**
```json
"rel_list": [
  [
    { "wd": "jurist" },
    { "wd": "justice" },
    { "wd": "magistrate" }
  ],
  [
    { "wd": "intermediary" },
    { "wd": "intermediate" },
    { "wd": "mediator" }
  ],
  [
    { "wd": "conciliator" },
    { "wd": "go-between" },
    { "wd": "peacemaker" }
  ]
]
```

### Near Antonym List (`near_list`)

Words approaching antonymous relationships.

```typescript
type NearList = ThesaurusWord[][];
```

### Antonym List (`ant_list`)

Direct opposites for the specific sense.

```typescript
type AntonymList = ThesaurusWord[][];
```

### Opposite List (`opp_list`)

Combined antonym and near-antonym groupings.

```typescript
type OppositeList = ThesaurusWord[][];
```

### Phrase List (`phrase_list`)

Synonymous expressions formed with the headword.

```typescript
type PhraseList = ThesaurusWord[][];
```

---

## How Synonyms Map to Definitions

### Two Access Patterns

**Pattern 1: Pre-extracted (meta arrays)**
```
Entry.meta.syns[i]  <-->  Entry.shortdef[i]
Entry.meta.ants[i]  <-->  Entry.shortdef[i]
```

**Pattern 2: Inline with senses (full detail)**
```
Entry.def[d].sseq[s][0][1].syn_list  <-->  Entry.def[d].sseq[s][0][1].dt (definition text)
Entry.def[d].sseq[s][0][1].rel_list  <-->  Entry.def[d].sseq[s][0][1].dt
Entry.def[d].sseq[s][0][1].ant_list  <-->  Entry.def[d].sseq[s][0][1].dt
```

### Relationship Hierarchy

For a given sense, word relationships are organized from closest to furthest:

1. **`syn_list`** - Exact synonyms (can replace headword)
2. **`sim_list`** - Near synonyms (similar meaning)
3. **`rel_list`** - Related words (conceptually connected)
4. **`near_list`** - Near antonyms (somewhat opposite)
5. **`ant_list`** - Exact antonyms (direct opposites)
6. **`opp_list`** - Opposites (combined antonyms/near-antonyms)
7. **`phrase_list`** - Synonymous phrases

---

## Grouping Capabilities

### Semantic Grouping within Lists

The `rel_list` and other list types support **sub-grouping by semantic category**:

```json
"rel_list": [
  [{ "wd": "legal terms" }, ...],      // Group 1: Legal professionals
  [{ "wd": "mediators" }, ...],         // Group 2: Mediators
  [{ "wd": "peacemakers" }, ...]        // Group 3: Peacemakers
]
```

Each inner array represents a distinct semantic grouping, allowing for categorized display.

### Definition-Based Organization

For applications that want to show synonyms organized by meaning:

1. Iterate through `def[].sseq[][]`
2. For each sense with `["sense", senseObj]`:
   - Extract `senseObj.dt` for the definition text
   - Extract `senseObj.syn_list`, `senseObj.rel_list`, etc. for related words
3. Display synonyms grouped under their specific definitions

---

## Inline Text Markup

Definition text contains semantic markup that must be parsed:

| Markup | Meaning |
|--------|---------|
| `{b}...{/b}` | Bold |
| `{bc}` | Bold colon (definition marker) |
| `{it}...{/it}` | Italics |
| `{sc}...{/sc}` | Small capitals |
| `{sup}...{/sup}` | Superscript |
| `{inf}...{/inf}` | Subscript |
| `{wi}...{/wi}` | Word illustration (marked headword) |
| `{phrase}...{/phrase}` | Phrase marking |
| `{a_link\|text\|\|sense}` | Dictionary link |
| `{d_link\|text\|\|sense}` | Definition link |
| `{sx\|target\|\|sense}` | Synonym cross-reference |
| `{dxt\|target\|\|}` | Directional cross-reference |

---

## What the Current Plugin Uses

### Current Implementation (`MerriamWebsterService.ts`)

The plugin currently uses a **simplified approach**:

```typescript
interface MerriamWebsterEntry {
  meta?: {
    id: string;
    syns?: string[][];   // Uses pre-extracted synonyms
    ants?: string[][];   // Uses pre-extracted antonyms
  };
  fl?: string;           // Part of speech
  shortdef?: string[];   // Brief definitions
  def?: MerriamWebsterDefinition[];  // Partially defined, not fully utilized
}
```

### Data Extraction

| Field | Used | Notes |
|-------|------|-------|
| `meta.id` | Yes | Entry identifier |
| `meta.syns` | Yes | All synonyms (flattened from all senses) |
| `meta.ants` | Yes | All antonyms (flattened from all senses) |
| `fl` | Yes | Part of speech for display |
| `shortdef[0]` | Yes | First definition only |
| `def` | Partial | Interface defined but not parsed |
| `syn_list` | No | Sense-specific synonyms not extracted |
| `rel_list` | No | Related words not extracted |
| `near_list` | No | Near antonyms not extracted |
| `phrase_list` | No | Synonymous phrases not extracted |
| `sim_list` | No | Near synonyms not extracted |

### Current Limitations

1. **Only extracts from `meta.syns`/`meta.ants`** - misses sense-specific context
2. **No related words** - `rel_list` data is ignored
3. **Single definition** - only uses `shortdef[0]`, ignoring multiple meanings
4. **No phrase synonyms** - `phrase_list` is not extracted
5. **No semantic grouping** - could organize by definition but doesn't
6. **Spelling suggestions** - handled but returned as `spelling` type

---

## Opportunities for Enhancement

### 1. Definition-Based Synonym Organization

Parse the `def` structure to associate synonyms with specific definitions:

```typescript
interface EnhancedSynonymResult {
  word: string;
  type: RelationshipType;
  senseNumber?: string;      // e.g., "1a", "2"
  definitionText: string;    // The actual definition this synonym belongs to
  partOfSpeech: string;
  semanticGroup?: string;    // From rel_list grouping
}
```

### 2. Extract Additional Relationship Types

Currently supported vs. available:

| Relationship | API Field | Currently Used |
|--------------|-----------|----------------|
| Synonyms | `syn_list`, `meta.syns` | `meta.syns` only |
| Near synonyms | `sim_list` | No |
| Related words | `rel_list` | No |
| Near antonyms | `near_list` | No |
| Antonyms | `ant_list`, `meta.ants` | `meta.ants` only |
| Phrases | `phrase_list` | No |

### 3. Semantic Grouping

Display related words in their semantic groups:

```
Related to "judge":
  Legal: jurist, justice, magistrate
  Mediators: intermediary, mediator, negotiator
  Peacemakers: conciliator, go-between, reconciler
```

### 4. Multiple Senses Display

Show synonyms organized by meaning:

```
HAPPY (adjective)

1. feeling pleasure, well-being, or joy
   Synonyms: blessed, blissful, cheerful, delighted, glad, joyful
   Antonyms: miserable, unhappy, wretched

2. coming or happening by good luck
   Synonyms: fortunate, lucky, providential
   Antonyms: unfortunate, unlucky
```

---

## Sample API Response

For word "component":

```json
[
  {
    "meta": {
      "id": "component:1",
      "uuid": "...",
      "src": "coll_thes",
      "section": "alpha",
      "stems": ["component", "components"],
      "syns": [
        ["building block", "constituent", "element", "factor", "ingredient", "member"]
      ],
      "ants": [
        ["whole"]
      ],
      "offensive": false
    },
    "hwi": {
      "hw": "com*po*nent"
    },
    "fl": "noun",
    "def": [
      {
        "sseq": [
          [
            ["sense", {
              "sn": "1",
              "dt": [
                ["text", "{bc}one of the parts that make up a whole"]
              ],
              "syn_list": [
                [
                  {"wd": "building block"},
                  {"wd": "constituent"},
                  {"wd": "element"},
                  {"wd": "factor"},
                  {"wd": "ingredient"},
                  {"wd": "member"}
                ]
              ],
              "rel_list": [
                [
                  {"wd": "detail"},
                  {"wd": "item"},
                  {"wd": "particular"},
                  {"wd": "point"}
                ],
                [
                  {"wd": "aspect"},
                  {"wd": "characteristic"},
                  {"wd": "facet"},
                  {"wd": "feature"}
                ]
              ],
              "ant_list": [
                [
                  {"wd": "whole"}
                ]
              ]
            }]
          ]
        ]
      }
    ],
    "shortdef": [
      "one of the parts that make up a whole"
    ]
  }
]
```

---

## References

- [Merriam-Webster Dictionary API Portal](https://dictionaryapi.com/)
- [Collegiate Thesaurus Product Page](https://dictionaryapi.com/products/api-collegiate-thesaurus)
- [JSON Documentation](https://dictionaryapi.com/products/json)
- [Synonyms via JSON - leancrew.com](https://leancrew.com/all-this/2025/04/synonyms-via-json/)
