# Words API Documentation Research

## Overview

Words API is a comprehensive English language API providing definitions, synonyms, antonyms, and extensive semantic relationships. It is hosted on RapidAPI and requires authentication via a RapidAPI key.

**Key Statistics:**
- Over 325,000 words in the database
- 45% include definitions
- 56% include pronunciation information
- 44% include syllable information
- 18% include usage frequency data
- Data sourced from WordNet, CMU Pronouncing Dictionary, and Open Subtitles

---

## Authentication

Words API uses RapidAPI for authentication. Requests require two headers:

```
X-RapidAPI-Key: <your-api-key>
X-RapidAPI-Host: wordsapiv1.p.rapidapi.com
```

**Base URL:** `https://wordsapiv1.p.rapidapi.com/words`

---

## Pricing Tiers and Rate Limits

| Plan | Monthly Cost | Daily Requests |
|------|--------------|----------------|
| Basic | Free | 2,500 |
| Pro | $10 | 25,000 |
| Ultra | $49 | 250,000 |
| Mega | $89 | 500,000 |
| **Self-Hosted** | $629 (one-time) | Unlimited |

**Registration:** [https://rapidapi.com/dpventures/api/wordsapi](https://rapidapi.com/dpventures/api/wordsapi)

---

## Full API Endpoints

### 1. Complete Word Data
```
GET /words/{word}
```
Returns all available data for a word including definitions, relationships, syllables, and pronunciation.

### 2. Specific Relationship Endpoints
Each relationship type has its own endpoint:

| Endpoint | Description |
|----------|-------------|
| `/words/{word}/definitions` | All definitions |
| `/words/{word}/synonyms` | Words with similar meaning |
| `/words/{word}/antonyms` | Words with opposite meaning |
| `/words/{word}/examples` | Usage examples |
| `/words/{word}/typeOf` | Broader categories (hypernyms) |
| `/words/{word}/hasTypes` | Narrower types (hyponyms) |
| `/words/{word}/partOf` | Whole that this is part of |
| `/words/{word}/hasParts` | Parts that this contains |
| `/words/{word}/instanceOf` | Class this is an instance of |
| `/words/{word}/hasInstances` | Instances of this class |
| `/words/{word}/similarTo` | Similar but not synonymous words |
| `/words/{word}/also` | Related adjectives |
| `/words/{word}/entails` | Actions this entails |
| `/words/{word}/memberOf` | Group this is a member of |
| `/words/{word}/hasMembers` | Members of this group |
| `/words/{word}/substanceOf` | Substance this is part of |
| `/words/{word}/hasSubstances` | Substances in this |
| `/words/{word}/inCategory` | Domain/category this belongs to |
| `/words/{word}/hasCategories` | Categories containing this |
| `/words/{word}/usageOf` | What this is a usage of |
| `/words/{word}/hasUsages` | Usages of this |
| `/words/{word}/inRegion` | Region where this is used |
| `/words/{word}/regionOf` | Regions where this term applies |
| `/words/{word}/pertainsTo` | What this pertains to |
| `/words/{word}/derivation` | Derived forms |

### 3. Auxiliary Endpoints

| Endpoint | Description |
|----------|-------------|
| `/words/{word}/syllables` | Syllable breakdown |
| `/words/{word}/pronunciation` | Phonetic pronunciation (IPA) |
| `/words/{word}/frequency` | Usage frequency metrics |
| `/words/{word}/rhymes` | Rhyming words |

### 4. Search and Random Word Endpoints

| Endpoint | Description |
|----------|-------------|
| `/words` | Search words with filters |
| `/words?random=true` | Get a random word |

---

## Complete Response Data Structure

### Full Word Response

```json
{
  "word": "example",
  "frequency": 4.67,
  "results": [
    {
      "definition": "an item of information that is typical of a class or group",
      "partOfSpeech": "noun",
      "synonyms": ["illustration", "instance", "representative"],
      "antonyms": ["counterexample"],
      "examples": ["this patient provides a typical example of the syndrome"],
      "typeOf": ["information"],
      "hasTypes": ["apology", "exception", "case in point", "quintessence", "sample"],
      "partOf": [],
      "hasParts": [],
      "instanceOf": [],
      "hasInstances": [],
      "similarTo": [],
      "also": [],
      "entails": [],
      "memberOf": [],
      "hasMembers": [],
      "substanceOf": [],
      "hasSubstances": [],
      "inCategory": [],
      "hasCategories": [],
      "usageOf": [],
      "hasUsages": [],
      "inRegion": [],
      "regionOf": [],
      "pertainsTo": [],
      "derivation": ["exemplify", "exemplary"]
    }
  ],
  "syllables": {
    "count": 3,
    "list": ["ex", "am", "ple"]
  },
  "pronunciation": {
    "all": "ɪg'zæmpəl"
  }
}
```

### Results Array Structure

Each item in the `results` array represents one definition/sense of the word:

| Field | Type | Description |
|-------|------|-------------|
| `definition` | string | The definition text |
| `partOfSpeech` | string | "noun", "verb", "adjective", "adverb", etc. |
| `synonyms` | string[] | Words with the same meaning |
| `antonyms` | string[] | Words with opposite meaning |
| `examples` | string[] | Example sentences |
| `typeOf` | string[] | Hypernyms - broader categories |
| `hasTypes` | string[] | Hyponyms - more specific types |
| `partOf` | string[] | Holonyms - wholes containing this |
| `hasParts` | string[] | Meronyms - parts of this |
| `instanceOf` | string[] | Class this is an instance of |
| `hasInstances` | string[] | Specific instances |
| `similarTo` | string[] | Similar (not synonymous) words |
| `also` | string[] | See also (related adjectives) |
| `entails` | string[] | Actions this entails |
| `memberOf` | string[] | Groups this belongs to |
| `hasMembers` | string[] | Members of this group |
| `substanceOf` | string[] | Substance compositions |
| `hasSubstances` | string[] | Substances within this |
| `inCategory` | string[] | Domain categories |
| `hasCategories` | string[] | Categories under this |
| `usageOf` | string[] | Usage relationships |
| `hasUsages` | string[] | Usages of this term |
| `inRegion` | string[] | Regional usage |
| `regionOf` | string[] | Regions where applicable |
| `pertainsTo` | string[] | Pertaining relationships |
| `derivation` | string[] | Derived word forms |

### Syllables Object

```json
{
  "count": 3,
  "list": ["ex", "am", "ple"]
}
```

### Pronunciation Object

Pronunciation can be a simple string or an object with part-of-speech variants:

```json
// Simple form
{
  "pronunciation": "ɪg'zæmpəl"
}

// With POS variants
{
  "pronunciation": {
    "all": "ɪg'zæmpəl",
    "noun": "ɪg'zæmpəl",
    "verb": "ɪg'zæmpəl"
  }
}
```

### Frequency Object

When fetching the `/frequency` endpoint:

```json
{
  "word": "example",
  "frequency": {
    "zipf": 4.67,
    "perMillion": 46.94,
    "diversity": 0.42
  }
}
```

| Field | Description |
|-------|-------------|
| `zipf` | Zipf scale score (1-7, higher = more common) |
| `perMillion` | Occurrences per million words |
| `diversity` | Likelihood of appearing in a random document (0-1) |

---

## All Relationship Types

### Semantic Relationships (27 Types)

| Relationship | Inverse | Description |
|-------------|---------|-------------|
| `synonyms` | - | Same meaning |
| `antonyms` | - | Opposite meaning |
| `typeOf` | `hasTypes` | "A is a type of B" / "B has types including A" |
| `partOf` | `hasParts` | "A is part of B" / "B has parts including A" |
| `instanceOf` | `hasInstances` | "A is an instance of B" / "B has instances including A" |
| `memberOf` | `hasMembers` | "A is a member of B" / "B has members including A" |
| `substanceOf` | `hasSubstances` | "A is a substance of B" / "B has substances including A" |
| `inCategory` | `hasCategories` | "A is in category B" / "B has categories including A" |
| `usageOf` | `hasUsages` | "A is a usage of B" / "B has usages including A" |
| `inRegion` | `regionOf` | "A is used in region B" / "B is a region for A" |
| `similarTo` | - | Similar but not synonymous |
| `also` | - | See also (adjective relations) |
| `entails` | - | "A entails B" (verb implications) |
| `pertainsTo` | - | "A pertains to B" |
| `derivation` | - | Derived word forms |

### Terminology Mapping

| Common Term | Words API Field | Description |
|-------------|-----------------|-------------|
| Synonym | `synonyms` | Same meaning |
| Antonym | `antonyms` | Opposite meaning |
| Hypernym | `typeOf` | Broader category |
| Hyponym | `hasTypes` | More specific type |
| Holonym | `partOf` | Whole containing this |
| Meronym | `hasParts` | Part of this |
| Related | `similarTo` | Similar words |

---

## Search/Filter Parameters

When using `/words` for searching:

### Text Matching
| Parameter | Description | Example |
|-----------|-------------|---------|
| `letterPattern` | Regex for letter sequences | `^un.*ly$` |
| `letters` | Exact letter count | `5` |
| `lettersMin` | Minimum letters | `3` |
| `lettersMax` | Maximum letters | `10` |

### Sound/Pronunciation
| Parameter | Description | Example |
|-----------|-------------|---------|
| `pronunciationPattern` | Regex for IPA patterns | `.*ʃən$` |
| `sounds` | Exact phoneme count | `5` |
| `soundsMin` | Minimum phonemes | `3` |
| `soundsMax` | Maximum phonemes | `8` |

### Filtering
| Parameter | Description | Example |
|-----------|-------------|---------|
| `partOfSpeech` | Filter by word type | `verb` |
| `hasDetails` | Comma-separated relationship types | `synonyms,definitions` |

### Pagination
| Parameter | Description | Default |
|-----------|-------------|---------|
| `limit` | Results per request | 100 (max 100) |
| `page` | Page number | 1 |

### Special
| Parameter | Description |
|-----------|-------------|
| `random=true` | Return single random word matching filters |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid request/bad parameters |
| 401 | Invalid API key |
| 403 | Forbidden (key lacks permissions) |
| 404 | Word not found |
| 429 | Rate limit exceeded |
| 5xx | Server error |

---

## Current Plugin Implementation

### What We Use

The current `WordsAPIService.ts` implementation uses these endpoints:

```typescript
const ENDPOINT_MAP: Record<RelationshipType, string> = {
  synonym: "synonyms",
  antonym: "antonyms",
  related: "similarTo",
  hypernym: "typeOf",
  hyponym: "hasTypes",
};
```

**Endpoints called:**
- `/words/{word}/synonyms`
- `/words/{word}/antonyms`
- `/words/{word}/similarTo`
- `/words/{word}/typeOf`
- `/words/{word}/hasTypes`

### Response Interface Used

```typescript
interface WordsAPIResponse {
  word: string;
  synonyms?: string[];
  antonyms?: string[];
  similarTo?: string[];
  typeOf?: string[];
  hasTypes?: string[];
}
```

### What We DON'T Use (Available Features)

| Feature | Potential Value |
|---------|----------------|
| **Definitions** | Could display meaning alongside synonyms |
| **Part of Speech** | Could filter/group results by POS |
| **Examples** | Could show usage context |
| **Syllables** | Could assist with word selection |
| **Pronunciation** | Could help with word choice |
| **Frequency** | Could sort results by commonality |
| **derivation** | Could show related word forms |
| **Full word endpoint** | Single call for all data vs. multiple calls |

---

## Grouping Capabilities for Definition-Based Organization

### Current Challenge

The plugin makes separate calls to individual relationship endpoints (e.g., `/synonyms`, `/antonyms`). These return flat arrays without definition context:

```json
// GET /words/run/synonyms
{
  "word": "run",
  "synonyms": ["sprint", "dash", "jog", "race", "operate", "function", "manage"]
}
```

This mixes synonyms from all definitions of "run" together.

### Solution: Use Full Word Endpoint

The `/words/{word}` endpoint returns results organized by definition:

```json
{
  "word": "run",
  "results": [
    {
      "definition": "move fast by using one's feet",
      "partOfSpeech": "verb",
      "synonyms": ["sprint", "dash", "jog", "race"],
      "typeOf": ["travel rapidly", "speed", "hurry"]
    },
    {
      "definition": "cause to function",
      "partOfSpeech": "verb",
      "synonyms": ["operate", "work"],
      "typeOf": ["control", "operate"]
    },
    {
      "definition": "direct or manage",
      "partOfSpeech": "verb",
      "synonyms": ["manage", "head"],
      "typeOf": ["direct"]
    }
  ]
}
```

### Implementation Approach for Grouped Results

1. **Use full word endpoint** instead of separate relationship endpoints
2. **Iterate through `results` array** - each item is a distinct definition
3. **Preserve definition context** with each synonym/relationship
4. **Generate `definitionId`** from array index or hash of definition text

### Mapping to Plugin's Data Model

```typescript
// Enhanced SynonymResult with definition grouping
interface SynonymResult {
  word: string;
  type: RelationshipType | "spelling";
  source: SynonymSource;
  partOfSpeech?: string;
  definition?: string;
  definitionId?: string;  // For grouping
}

// Processing full response
function processWordsAPIResponse(data: WordsAPIFullResponse): SynonymResult[] {
  const results: SynonymResult[] = [];

  data.results?.forEach((result, index) => {
    const definitionId = `wordsapi-${index}`;

    // Process synonyms for this definition
    result.synonyms?.forEach(word => {
      results.push({
        word,
        type: "synonym",
        source: "words-api",
        partOfSpeech: result.partOfSpeech,
        definition: result.definition,
        definitionId
      });
    });

    // Process other relationships similarly...
  });

  return results;
}
```

---

## API Efficiency Considerations

### Current Approach (Multiple Calls)

```
GET /words/run/synonyms     → 1 API call
GET /words/run/antonyms     → 1 API call
GET /words/run/similarTo    → 1 API call
GET /words/run/typeOf       → 1 API call
GET /words/run/hasTypes     → 1 API call
─────────────────────────────────────────
Total: 5 API calls per word lookup
```

### Optimized Approach (Single Call)

```
GET /words/run              → 1 API call (all data)
─────────────────────────────────────────
Total: 1 API call per word lookup
```

**Benefits:**
- Reduces API usage by 80% (5 calls → 1)
- Provides definition context for grouping
- Access to additional data (pronunciation, syllables, frequency)

**Tradeoffs:**
- Larger payload per request
- May return unused data
- Definition-grouped structure requires processing

---

## Sources

- [Words API Official Documentation](https://www.wordsapi.com/docs/)
- [Words API Homepage](https://www.wordsapi.com/)
- [RapidAPI Words API Page](https://rapidapi.com/dpventures/api/wordsapi)
- Current implementation: `/src/services/api/WordsAPIService.ts`
