# Big Huge Thesaurus API Documentation

## Overview

Big Huge Thesaurus is a thesaurus API service that provides synonyms, antonyms, related words, and similar words organized by part of speech. The service requires an API key and offers multiple response formats.

**Service Website:** https://words.bighugelabs.com
**API Documentation:** https://words.bighugelabs.com/site/api

---

## API Endpoint

### Base URL
```
https://words.bighugelabs.com/api/2
```

### Request Format
```
GET /{api_key}/{word}/{format}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `api_key` | Yes | Your private API key obtained from the service |
| `word` | Yes | The word to look up (should be URL-encoded) |
| `format` | No | Response format: `json`, `xml`, `php`, or omit for plain text |

### Example Request
```
GET https://words.bighugelabs.com/api/2/YOUR_API_KEY/happy/json
```

---

## Response Structure

### JSON Format

The response is organized by **part of speech**, with each part containing arrays of relationship types.

```typescript
interface BigHugeThesaurusResponse {
  noun?: BigHugeThesaurusEntry;
  verb?: BigHugeThesaurusEntry;
  adjective?: BigHugeThesaurusEntry;
  adverb?: BigHugeThesaurusEntry;
}

interface BigHugeThesaurusEntry {
  syn?: string[];  // Synonyms
  ant?: string[];  // Antonyms
  rel?: string[];  // Related terms
  sim?: string[];  // Similar terms
  usr?: string[];  // User suggestions
}
```

### Example Response

For the word "happy":
```json
{
  "adjective": {
    "syn": [
      "blessed",
      "blissful",
      "bright",
      "cheerful",
      "content",
      "contented",
      "elated",
      "euphoric",
      "fortunate",
      "glad",
      "golden",
      "halcyon",
      "joyful",
      "joyous",
      "laughing",
      "lucky",
      "merry",
      "prosperous",
      "riant",
      "willing"
    ],
    "ant": [
      "unhappy"
    ],
    "sim": [
      "felicitous"
    ],
    "rel": [
      "happiness"
    ]
  },
  "noun": {
    "syn": [
      "happiness"
    ]
  }
}
```

---

## Parts of Speech

Results are organized into four possible parts of speech:

| Part of Speech | Key | Description |
|----------------|-----|-------------|
| Noun | `noun` | Words functioning as nouns |
| Verb | `verb` | Words functioning as verbs |
| Adjective | `adjective` | Words functioning as adjectives |
| Adverb | `adverb` | Words functioning as adverbs |

**Important:** Not all parts of speech are guaranteed to be present for every word. Always check for existence before accessing.

---

## Relationship Types

The API returns five types of word relationships:

| Key | Type | Description |
|-----|------|-------------|
| `syn` | Synonyms | Words with the same or similar meaning |
| `ant` | Antonyms | Words with opposite meaning |
| `rel` | Related | Words that are related in meaning or context |
| `sim` | Similar | Words that are similar but not exact synonyms |
| `usr` | User Suggestions | Community-submitted word associations |

### Relationship Type Details

#### Synonyms (`syn`)
True synonyms that can typically replace the searched word in most contexts.

#### Antonyms (`ant`)
Words with opposite meanings.

#### Related (`rel`)
Words that are semantically connected but may not be direct replacements. These could include:
- Derived forms (e.g., "happy" -> "happiness")
- Conceptually related words

#### Similar (`sim`)
Words that are close in meaning but may have subtle differences in connotation or usage. These are less direct than synonyms.

#### User Suggestions (`usr`)
Community-contributed word associations. These may be less reliable than the curated data in other categories.

**Important:** Not all relationship types are guaranteed to be present for every part of speech entry.

---

## Response Formats

| Format | Endpoint Suffix | Content-Type |
|--------|-----------------|--------------|
| JSON | `/json` | `application/json` |
| XML | `/xml` | `application/xml` |
| PHP Serialized | `/php` | PHP serialized array |
| Plain Text | (none) | Pipe and newline delimited |

### JSONP Support
For browser-based usage, JSONP is supported with a callback parameter:
```
GET /{api_key}/{word}/json?callback=myFunction
```

---

## HTTP Status Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| 200 | OK | Word found with results |
| 303 | See Other | Word not found; response body contains suggested alternative |
| 404 | Not Found | No data available for the word |
| 500 | Error | Various error conditions (see below) |

### 500 Error Types

| Error Message | Cause |
|---------------|-------|
| "Usage Exceeded" | Rate limit reached for the day |
| "Inactive key" | API key is not active |
| "Missing words" | No word parameter was submitted |
| "Not whitelisted" | IP address is blocked |

---

## Rate Limits

- Rate limits vary by account tier
- When a "Usage exceeded" error (500) is received, users must stop requests until the next day
- Rate limit resets at midnight **GMT-8 (Pacific Time)**
- Free tier limits are available; paid tiers offer higher limits

---

## API Key Requirements

- An API key is **required** for all requests
- Keys can be obtained at: https://words.bighugelabs.com/account/getkey
- Free tier is available with usage limits
- Admin pages are available for monitoring usage and upgrading keys

---

## Security Considerations

- The API sends `Access-Control-Allow-Origin: *` headers, enabling browser CORS requests
- **Warning:** Direct browser requests expose API keys in client-side code
- **Recommendation:** Use a server-side proxy for production applications to protect your API key

---

## Current Plugin Implementation

### What We Currently Use

From `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/BigHugeThesaurusService.ts`:

**Interface Definition:**
```typescript
interface BigHugeThesaurusEntry {
  syn?: string[];
  ant?: string[];
  rel?: string[];
  sim?: string[];
}

interface BigHugeThesaurusResponse {
  noun?: BigHugeThesaurusEntry;
  verb?: BigHugeThesaurusEntry;
  adjective?: BigHugeThesaurusEntry;
  adverb?: BigHugeThesaurusEntry;
}
```

**Supported Types Advertised:**
```typescript
supportedTypes: ["synonym", "antonym", "related"]
```

**Actual Mapping:**
| API Field | Plugin Relationship Type | Notes |
|-----------|-------------------------|-------|
| `syn` | `synonym` | Direct mapping |
| `ant` | `antonym` | Direct mapping |
| `rel` | `related` | Direct mapping |
| `sim` | `synonym` | **Merged with synonyms** |
| `usr` | Not used | Not implemented |

### What's Available But Not Fully Utilized

1. **User Suggestions (`usr`)** - Not in the interface or implementation
2. **Similar Words (`sim`)** - Currently merged with synonyms instead of being treated as a distinct type

### Parts of Speech Handling
The plugin correctly iterates through all four parts of speech and preserves the `partOfSpeech` field in results.

### Deduplication
The plugin deduplicates results by `type:word` key (case-insensitive), which prevents the same word from appearing multiple times for the same relationship type.

---

## Comparison: Available vs Used

| Feature | API Provides | Plugin Uses | Gap |
|---------|--------------|-------------|-----|
| Synonyms (`syn`) | Yes | Yes | None |
| Antonyms (`ant`) | Yes | Yes | None |
| Related (`rel`) | Yes | Yes | None |
| Similar (`sim`) | Yes | As synonyms | Could distinguish |
| User Suggestions (`usr`) | Yes | No | Not implemented |
| Noun results | Yes | Yes | None |
| Verb results | Yes | Yes | None |
| Adjective results | Yes | Yes | None |
| Adverb results | Yes | Yes | None |
| Definitions | No | N/A | API does not provide |
| Senses/Grouping | No | N/A | API does not provide |

---

## Limitations

### What the API Does NOT Provide

1. **Definitions** - The API provides word relationships only, not definitions
2. **Senses/Meanings** - Words are not grouped by different senses
3. **Usage Examples** - No example sentences
4. **Pronunciation** - No phonetic information
5. **Etymology** - No word origin information
6. **Frequency Data** - No information about word commonality
7. **Register/Formality** - No indication of formal vs informal usage

### Data Completeness
- Not all parts of speech are available for all words
- Not all relationship types are available for all parts of speech
- Some words may return 404 (not found)
- The 303 redirect suggests alternatives but requires a second request to fetch them

---

## Potential Improvements

### 1. Handle User Suggestions
Add support for the `usr` field to expose community-contributed associations:
```typescript
interface BigHugeThesaurusEntry {
  syn?: string[];
  ant?: string[];
  rel?: string[];
  sim?: string[];
  usr?: string[];  // Add this
}
```

### 2. Distinguish Similar from Synonyms
Instead of merging `sim` with synonyms, treat them as a separate type (perhaps map to "related" or create a new "similar" type).

### 3. Handle 303 Redirects
When a word returns 303 with an alternative, the plugin could:
- Automatically follow the redirect and fetch the alternative
- Present the alternative to the user as a suggestion

### 4. Better Error Handling
Add specific handling for rate limit errors (500 "Usage Exceeded") to inform users they've hit their daily limit.

---

## References

- **Official Documentation:** https://words.bighugelabs.com/site/api
- **API Key Registration:** https://words.bighugelabs.com/account/getkey
- **Plugin Implementation:** `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/BigHugeThesaurusService.ts`
