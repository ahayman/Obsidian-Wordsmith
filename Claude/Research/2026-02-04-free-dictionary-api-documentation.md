# Free Dictionary API Documentation

## Overview

The Free Dictionary API is a free, open-source dictionary API that provides word definitions, phonetics, synonyms, and antonyms. It sources its data from Wiktionary and is maintained at [dictionaryapi.dev](https://dictionaryapi.dev/).

**Key Features:**
- No API key required
- No authentication
- Completely free
- Returns structured definition data with synonyms and antonyms at multiple levels

## API Endpoint

### Base URL
```
https://api.dictionaryapi.dev/api/v2/entries/{language_code}/{word}
```

### English Endpoint (Used by Plugin)
```
https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

### HTTP Method
`GET`

### URL Parameters
- `{language_code}` - Two-letter language code (e.g., `en` for English)
- `{word}` - The word to look up (should be URL-encoded)

### Example Request
```
GET https://api.dictionaryapi.dev/api/v2/entries/en/happy
```

## Response Structure

The API returns a JSON **array** of entry objects. A single word may have multiple entries (e.g., "fast" has separate entries for the speed meaning and the fasting meaning).

### Complete Response Schema

```typescript
// Full API Response Type
type FreeDictionaryResponse = FreeDictionaryEntry[];

interface FreeDictionaryEntry {
  word: string;                          // The queried word
  phonetic?: string;                     // Primary phonetic transcription (IPA)
  phonetics: FreeDictionaryPhonetic[];   // Array of phonetic variants
  meanings: FreeDictionaryMeaning[];     // Array of meanings by part of speech
  license: FreeDictionaryLicense;        // License information
  sourceUrls: string[];                  // Source URLs (typically Wiktionary)
  origin?: string;                       // Etymology (rare, not always present)
}

interface FreeDictionaryPhonetic {
  text?: string;                         // IPA phonetic transcription
  audio?: string;                        // URL to audio pronunciation file (MP3)
  sourceUrl?: string;                    // Source URL for the audio
  license?: FreeDictionaryLicense;       // License for the audio file
}

interface FreeDictionaryMeaning {
  partOfSpeech: string;                  // e.g., "noun", "verb", "adjective"
  definitions: FreeDictionaryDefinition[]; // Array of definitions
  synonyms: string[];                    // Top-level synonyms for this part of speech
  antonyms: string[];                    // Top-level antonyms for this part of speech
}

interface FreeDictionaryDefinition {
  definition: string;                    // The actual definition text
  example?: string;                      // Usage example sentence
  synonyms: string[];                    // Synonyms specific to THIS definition
  antonyms: string[];                    // Antonyms specific to THIS definition
}

interface FreeDictionaryLicense {
  name: string;                          // License name (e.g., "CC BY-SA 3.0")
  url: string;                           // License URL
}
```

## Response Hierarchy Explained

The data structure has three levels of nesting:

```
Entry (word level)
└── Meanings (part of speech level)
    ├── synonyms[]        <- aggregated synonyms for this part of speech
    ├── antonyms[]        <- aggregated antonyms for this part of speech
    └── Definitions (definition level)
        ├── definition    <- the actual definition text
        ├── example       <- usage example
        ├── synonyms[]    <- synonyms SPECIFIC to this definition
        └── antonyms[]    <- antonyms SPECIFIC to this definition
```

### Important: Two Levels of Synonyms/Antonyms

This is a critical distinction that makes this API valuable:

1. **Meaning-level synonyms** (`meaning.synonyms[]`): Aggregated synonyms for all definitions under a part of speech. These are general synonyms without specific context.

2. **Definition-level synonyms** (`definition.synonyms[]`): Synonyms that are specific to a particular definition. These are contextually precise.

**Example with "fast" (adjective):**

```json
{
  "partOfSpeech": "adjective",
  "definitions": [
    {
      "definition": "Firmly or securely fixed in place; stable.",
      "synonyms": ["firm", "immobile", "secure", "stable", "stuck", "tight"],
      "antonyms": ["loose"]
    },
    {
      "definition": "Moving with great speed, or capable of doing so; swift, rapid.",
      "synonyms": ["quick", "rapid", "speedy"],
      "antonyms": []
    },
    {
      "definition": "Deep or sound (of sleep)",
      "synonyms": ["deep", "sound"],
      "antonyms": ["light"]
    }
  ],
  "synonyms": ["quick", "rapid", "speedy", "swift", "firm", "immobile", ...],
  "antonyms": ["slow", "loose", "light", ...]
}
```

Notice how:
- "firm", "immobile", "stuck" relate to the "fixed in place" definition
- "quick", "rapid", "speedy" relate to the "moving with great speed" definition
- The meaning-level `synonyms` array combines all of them

## Real-World Response Examples

### Example 1: "happy"

```json
[
  {
    "word": "happy",
    "phonetics": [
      {
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/happy-au.mp3",
        "sourceUrl": "https://commons.wikimedia.org/w/index.php?curid=75797241",
        "license": {"name": "BY-SA 4.0", "url": "..."}
      },
      {
        "text": "/ˈhæpiː/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/happy-uk.mp3"
      },
      {
        "text": "/ˈhæpi/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/happy-us.mp3"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "A happy event, thing, person, etc.",
            "synonyms": [],
            "antonyms": []
          }
        ],
        "synonyms": [],
        "antonyms": []
      },
      {
        "partOfSpeech": "adjective",
        "definitions": [
          {
            "definition": "Having a feeling arising from a consciousness of well-being...",
            "synonyms": [],
            "antonyms": [],
            "example": "Music makes me feel happy."
          }
        ],
        "synonyms": ["cheerful", "content", "delighted", "elated", "glad", "joyful", "merry"],
        "antonyms": ["depressed", "miserable", "sad", "unhappy"]
      }
    ],
    "license": {"name": "CC BY-SA 3.0", "url": "..."},
    "sourceUrls": ["https://en.wiktionary.org/wiki/happy"]
  }
]
```

### Example 2: Multiple Entries ("fast")

The word "fast" returns **two separate entry objects** in the array:
1. First entry: speed-related meanings (adjective, adverb, noun for train)
2. Second entry: fasting-related meanings (noun for abstaining, verb to fast)

This demonstrates that homographs with different etymologies are separated into distinct entries.

## Error Response

When a word is not found:

```json
{
  "title": "No Definitions Found",
  "message": "Sorry pal, we couldn't find definitions for the word you were looking for.",
  "resolution": "You can try the search again at later time or head to the web instead."
}
```

**HTTP Status Code:** 404

## Rate Limits and Usage Restrictions

Based on the official documentation:
- **Rate Limits:** None explicitly documented
- **Authentication:** None required
- **Cost:** Free forever (as stated on the website)
- **Terms:** No specific usage terms documented

**Practical Considerations:**
- No official rate limiting, but excessive requests should be avoided
- The service is community-maintained, so reasonable use is expected
- Data is sourced from Wiktionary and licensed under CC BY-SA 3.0

## Current Plugin Implementation

### What We Currently Use

The plugin (`FreeDictionaryService.ts`) currently extracts:

```typescript
interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  synonyms?: string[];
  antonyms?: string[];
}

interface FreeDictionaryEntry {
  word: string;
  meanings: FreeDictionaryMeaning[];
}
```

**Currently Used Fields:**
- `entry.word` - The word
- `entry.meanings[].partOfSpeech` - Part of speech
- `entry.meanings[].synonyms` - Top-level synonyms
- `entry.meanings[].antonyms` - Top-level antonyms
- `entry.meanings[].definitions[].definition` - Definition text (stored with results)
- `entry.meanings[].definitions[].synonyms` - Definition-level synonyms
- `entry.meanings[].definitions[].antonyms` - Definition-level antonyms

### What We Do NOT Currently Use

**Entry-level fields:**
- `entry.phonetic` - Primary phonetic transcription
- `entry.phonetics[]` - Full phonetic data with audio URLs
- `entry.license` - License information
- `entry.sourceUrls[]` - Source URLs
- `entry.origin` - Etymology

**Definition-level fields:**
- `definition.example` - Usage examples

## Definition-Grouped Synonyms (Key Feature)

This API is the **best source for definition-grouped synonyms** among the services we support. Here's why:

### How Other APIs Handle Synonyms

Most thesaurus APIs return synonyms in a flat list:
```
word: "fast"
synonyms: ["quick", "rapid", "firm", "secure", "tight", ...]
```

You can't tell which synonym relates to which meaning of "fast."

### How Free Dictionary Handles Synonyms

Free Dictionary provides synonyms at the **definition level**, allowing you to know exactly what sense of the word each synonym relates to:

```
word: "fast"
meanings:
  - partOfSpeech: "adjective"
    definitions:
      - definition: "Firmly or securely fixed in place; stable."
        synonyms: ["firm", "immobile", "secure", "stable", "stuck", "tight"]

      - definition: "Moving with great speed, or capable of doing so"
        synonyms: ["quick", "rapid", "speedy"]

      - definition: "Deep or sound (of sleep)"
        synonyms: ["deep", "sound"]
```

### Current Plugin Implementation for Definition-Level Synonyms

The plugin correctly extracts definition-level synonyms and associates them with their definition:

```typescript
// From FreeDictionaryService.ts
for (const def of meaning.definitions) {
  if (requestedTypes.includes("synonym") && def.synonyms) {
    for (const synonym of def.synonyms) {
      results.push({
        word: synonym,
        type: "synonym",
        source: "free-dictionary",
        partOfSpeech: meaning.partOfSpeech,
        definition: def.definition,  // <-- Links synonym to its definition
      });
    }
  }
}
```

This allows the UI to potentially show synonyms grouped by their specific definition, providing much more precise synonym suggestions.

## Supported Languages

While the plugin only uses English (`en`), the API supports multiple languages:
- `en` - English
- `hi` - Hindi
- `es` - Spanish
- `fr` - French
- `ja` - Japanese
- `ru` - Russian
- `de` - German
- `it` - Italian
- `ko` - Korean
- `pt-BR` - Brazilian Portuguese
- `ar` - Arabic
- `tr` - Turkish

## Summary

| Aspect | Details |
|--------|---------|
| **Base URL** | `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` |
| **Authentication** | None required |
| **Rate Limits** | None documented |
| **Cost** | Free |
| **Response Format** | JSON array of entry objects |
| **Data Source** | Wiktionary |
| **License** | CC BY-SA 3.0 |
| **Unique Feature** | Definition-level synonym/antonym grouping |
| **Plugin Support** | Synonyms, Antonyms |

## Potential Enhancements

Fields available but not currently used that could enhance the plugin:

1. **Phonetics/Audio** - Could display pronunciation or play audio
2. **Examples** - Could show usage examples alongside definitions
3. **Etymology/Origin** - Could display word history
4. **Source URLs** - Could link to Wiktionary for more details
5. **Multi-entry handling** - Currently processes all entries; could distinguish homographs
