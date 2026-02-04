# Altervista Thesaurus API Documentation

## Overview

The Altervista Thesaurus API is a multilingual thesaurus service that provides synonym lookups with part of speech categorization. It requires an API key for access and supports multiple output formats.

---

## API Endpoint

**Base URL:** `http://thesaurus.altervista.org/thesaurus/v1`

**Method:** GET only (POST/PUT/DELETE are not supported)

---

## Request Parameters

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `key` | API key obtained via subscription | `your_api_key` |
| `word` | The term to look up (URL-encoded) | `happy` |
| `language` | Target language code | `en_US` |

### Optional Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `output` | Response format | `xml` | `json` or `xml` |
| `callback` | JavaScript function name for JSONP | none | `myCallback` (requires `output=json`) |

---

## Supported Languages

| Language Code | Language |
|---------------|----------|
| `cs_CZ` | Czech |
| `da_DK` | Danish |
| `de_CH` | German (Switzerland) |
| `de_DE` | German (Germany) |
| `en_US` | English (US) |
| `el_GR` | Greek |
| `es_ES` | Spanish |
| `fr_FR` | French |
| `hu_HU` | Hungarian |
| `it_IT` | Italian |
| `no_NO` | Norwegian |
| `pl_PL` | Polish |
| `pt_PT` | Portuguese |
| `ro_RO` | Romanian |
| `ru_RU` | Russian |
| `sk_SK` | Slovak |

---

## Response Structure

### JSON Format

```json
{
  "response": [
    {
      "list": {
        "category": "(noun)",
        "synonyms": "term1|term2|term3|term4 (antonym)"
      }
    },
    {
      "list": {
        "category": "(verb)",
        "synonyms": "action1|action2|action3"
      }
    }
  ]
}
```

### XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <list>
    <category>(noun)</category>
    <synonyms>term1|term2|term3|term4 (antonym)</synonyms>
  </list>
  <list>
    <category>(verb)</category>
    <synonyms>action1|action2|action3</synonyms>
  </list>
</response>
```

### Response Fields

| Field | Description |
|-------|-------------|
| `response` | Root array containing all synonym groups |
| `list` | A single synonym group for a specific part of speech |
| `category` | Part of speech designation (e.g., "(noun)", "(verb)", "(adj)") |
| `synonyms` | Pipe-separated (`|`) string of related terms |

---

## Relationship Types

The API returns words with embedded relationship annotations within the synonyms string:

| Annotation | Meaning | Example |
|------------|---------|---------|
| (none) | Synonym | `happy` |
| `(antonym)` | Antonym/opposite | `sad (antonym)` |
| `(similar term)` | Similar but not exact synonym | `joyful (similar term)` |
| `(related term)` | Related word | `joy (related term)` |

**Note:** The relationship type is embedded within the synonym string, not as a separate field. Parsing is required to extract the relationship type.

---

## Parts of Speech (Categories)

The `category` field indicates the part of speech. Common values include:

| Category Value | Part of Speech |
|----------------|----------------|
| `(noun)` | Noun |
| `(verb)` | Verb |
| `(adj)` | Adjective |
| `(adv)` | Adverb |

---

## Result Grouping

Results are organized by **part of speech**:

1. Multiple `list` elements can be returned for a single word
2. Each `list` corresponds to a different part of speech usage
3. Within each `list`, all synonyms share the same part of speech
4. Example: "run" might have separate lists for noun ("a run") and verb ("to run") usages

**Grouping Structure:**
```
Word "peace"
├── (noun) list
│   ├── harmony
│   ├── tranquility
│   ├── serenity
│   └── war (antonym)
└── (verb) list (if applicable)
    └── ...
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Incorrect or missing parameters |
| `403` | Permission denied or rate limit exceeded |
| `404` | No matches found for the word |
| `405` | Only GET requests permitted |

---

## Rate Limits and API Key

### API Key Registration

- **Registration URL:** https://thesaurus.altervista.org/mykey
- **Process:** Create a free account to receive your API key
- **Test Key:** `test_only` (for testing purposes only, with limitations)

### Rate Limits

- The API has rate limits, though specific thresholds are not publicly documented
- A `403 Forbidden` response indicates either:
  - Invalid API key
  - Rate limit exceeded
  - Insufficient permissions

---

## Current Plugin Implementation Analysis

### What We Currently Use

Looking at `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/AltervistaService.ts`:

```typescript
// Current interface definitions
interface AltervistaList {
  category: string;
  synonyms: string; // Pipe-separated string of synonyms
}

interface AltervistaResponseItem {
  list: AltervistaList;
}

interface AltervistaResponse {
  response?: AltervistaResponseItem[];
}
```

**Current extraction:**
1. Parses the `category` field to extract part of speech (noun, verb, adjective, adverb)
2. Splits the pipe-separated `synonyms` string
3. Detects `(antonym)` annotations and categorizes appropriately
4. Skips entries with parenthetical annotations other than `(antonym)` (e.g., "similar term")

### What's Available But Not Used

| Feature | Available | Currently Used |
|---------|-----------|----------------|
| Synonyms | Yes | Yes |
| Antonyms | Yes (via annotation) | Yes |
| Similar terms | Yes (via annotation) | No (skipped) |
| Related terms | Yes (via annotation) | No (skipped) |
| Part of speech | Yes | Yes |
| Multiple languages | Yes (14 languages) | No (en_US only) |
| XML output | Yes | No (JSON only) |
| JSONP callback | Yes | No |
| Definitions | No | N/A |

### Supported Relationship Types in Plugin

From `SynonymService.ts`:
```typescript
altervista: {
  // ...
  supportedTypes: ["synonym", "antonym"],
}
```

The plugin advertises support for `synonym` and `antonym` only, matching what is reliably extracted.

---

## Comparison with Other Thesaurus APIs

| Feature | Altervista | Datamuse | Free Dictionary |
|---------|------------|----------|-----------------|
| API Key Required | Yes | No | No |
| Rate Limit | Unknown | 100K/day | 1K/hour |
| Synonyms | Yes | Yes | Yes |
| Antonyms | Yes (embedded) | Yes (separate endpoint) | Yes |
| Definitions | No | Minimal | Yes (detailed) |
| Part of Speech | Yes | Yes | Yes |
| Languages | 14 | English only | Multiple |
| Audio | No | No | Yes |

---

## Example API Calls

### Basic Synonym Lookup (JSON)
```
GET https://thesaurus.altervista.org/thesaurus/v1?word=happy&language=en_US&key=YOUR_KEY&output=json
```

### With JSONP Callback
```
GET https://thesaurus.altervista.org/thesaurus/v1?word=happy&language=en_US&key=YOUR_KEY&output=json&callback=handleResults
```

### XML Output
```
GET https://thesaurus.altervista.org/thesaurus/v1?word=happy&language=en_US&key=YOUR_KEY&output=xml
```

---

## Potential Improvements for Plugin

1. **Extract "similar term" and "related term" annotations** - Currently skipped but could map to the `related` relationship type

2. **Multi-language support** - The API supports 14 languages; could expose language selection in settings

3. **Better error handling** - Distinguish between "word not found" (404) and "rate limited" (403)

4. **Consider adding annotations to results** - The annotation text could provide additional context to users

---

## Data Quality Notes

- The API appears to source data from a curated thesaurus database
- Results are grouped by part of speech, making them contextually useful
- Antonyms and relationship annotations are embedded in the synonym string, requiring parsing
- No definitions are provided; this is purely a thesaurus service

---

## References

- [Altervista Thesaurus Service Documentation](https://thesaurus.altervista.org/service)
- [API Key Registration](https://thesaurus.altervista.org/mykey)
- Plugin implementation: `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/AltervistaService.ts`
