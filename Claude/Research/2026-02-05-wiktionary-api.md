# Wiktionary/Wikimedia API Research

**Date:** 2026-02-05
**Purpose:** Comprehensive documentation for accessing dictionary data (definitions, synonyms, antonyms) from Wiktionary

---

## 1. Overview

### What Data is Available

Wiktionary provides comprehensive lexical data including:
- **Definitions** - Multiple senses per word, organized by part of speech
- **Synonyms & Antonyms** - Semantic relationships with context labels
- **Etymology** - Word origins and historical development
- **Pronunciation** - IPA transcriptions and audio files
- **Translations** - Cross-language translations
- **Usage Examples** - Quotations and example sentences
- **Inflections** - Conjugations, declensions, plural forms
- **Related Terms** - Hypernyms, hyponyms, meronyms, holonyms, derived terms, coordinate terms

### Rate Limits

- **General Limit:** No more than 200 requests/second to Wikimedia REST API overall
- **Soft Limit:** No hard speed limit on read requests, but be considerate
- **429 Response:** Indicates rate limit exceeded
- **Best Practice:** Make requests in series rather than parallel; use pipe character (`|`) to batch multiple items in one request (e.g., `titles=Word1|Word2|Word3`)

### Terms of Use

By using Wikimedia APIs, you agree to:
- [Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Terms_of_Use)
- [Privacy Policy](https://foundation.wikimedia.org/wiki/Privacy_Policy)
- [User-Agent Policy](https://www.mediawiki.org/wiki/API:Etiquette) - Must set a unique User-Agent header with contact information
- [Robot Policy](https://www.mediawiki.org/wiki/Robot_policy)
- [API Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

**Required:** Set a descriptive User-Agent header:
```
User-Agent: YourApp/1.0 (https://yoursite.com; contact@yoursite.com)
```

---

## 2. API Options Comparison

### Option A: MediaWiki Action API

**Base URL:** `https://en.wiktionary.org/w/api.php`

| Pros | Cons |
|------|------|
| Full access to raw wikitext content | Complex response parsing required |
| Well-documented, stable | Returns unstructured wikitext |
| Supports many query types | Must parse wiki markup yourself |
| Available on all Wikimedia projects | Large response payloads |

**Best for:** Applications needing raw wikitext or specific page metadata

### Option B: MediaWiki REST API

**Base URL:** `https://en.wiktionary.org/w/rest.php/v1/`

| Pros | Cons |
|------|------|
| Cleaner URL structure | Smaller feature set |
| Better performance, cached responses | Still returns HTML/wikitext |
| Standards compliant | Limited extraction capabilities |
| Familiar REST patterns | No structured definition data |

**Best for:** Simple content retrieval where you need rendered HTML

### Option C: Free Dictionary API (Third-Party)

**Base URL:** `https://api.dictionaryapi.dev/api/v2/entries/{language}/{word}`

| Pros | Cons |
|------|------|
| Returns structured JSON | English only (primarily) |
| Includes synonyms, antonyms, phonetics | Third-party service (may go down) |
| No parsing required | Limited language support |
| Simple to use | Subset of Wiktionary data |

**Best for:** Quick integration when only English is needed

### Option D: Pre-extracted Data (kaikki.org)

**Source:** https://kaikki.org/dictionary/rawdata.html

| Pros | Cons |
|------|------|
| Fully structured JSON | Large downloads (2.3GB compressed) |
| Complete, accurate data | Requires local storage/indexing |
| Updated weekly | Not real-time API access |
| Multi-language support | Need to build your own API |

**Best for:** Offline applications or building your own dictionary service

### Recommendation

For an Obsidian plugin:
1. **Primary:** Use the Free Dictionary API for simplicity
2. **Fallback:** Direct Wiktionary Action API with wikitext parsing
3. **Alternative:** Use npm parsing libraries (wiktionary-scraper, parse-wiktionary)

---

## 3. Endpoints

### MediaWiki Action API Endpoints

#### Get Page Content (Wikitext)
```
GET https://en.wiktionary.org/w/api.php
?action=query
&prop=revisions
&titles={word}
&rvprop=content
&rvslots=main
&formatversion=2
&format=json
```

#### Parse Page to HTML
```
GET https://en.wiktionary.org/w/api.php
?action=parse
&page={word}
&prop=text|sections|categories
&format=json
```

#### Get Page Sections
```
GET https://en.wiktionary.org/w/api.php
?action=parse
&page={word}
&prop=sections
&format=json
```

#### Search for Pages
```
GET https://en.wiktionary.org/w/api.php
?action=opensearch
&search={query}
&limit=10
&format=json
```

### Free Dictionary API Endpoint

```
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

---

## 4. Request Format

### Action API URL Structure

```
https://{lang}.wiktionary.org/w/api.php?{parameters}
```

**Common Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `action` | API action to perform | `query`, `parse` |
| `format` | Response format | `json`, `xml` |
| `formatversion` | JSON format version | `2` (recommended) |
| `titles` | Page title(s), pipe-separated | `hello\|world` |
| `prop` | Properties to retrieve | `revisions`, `text` |
| `rvprop` | Revision properties | `content`, `timestamp` |
| `rvslots` | Content slots | `main`, `*` |

### Example Requests

**Get raw wikitext for "hello":**
```
https://en.wiktionary.org/w/api.php?action=query&prop=revisions&titles=hello&rvprop=content&rvslots=main&formatversion=2&format=json
```

**Get parsed HTML for "run":**
```
https://en.wiktionary.org/w/api.php?action=parse&page=run&prop=text&format=json
```

**Batch request for multiple words:**
```
https://en.wiktionary.org/w/api.php?action=query&prop=revisions&titles=hello|world|test&rvprop=content&rvslots=main&formatversion=2&format=json
```

---

## 5. Response Format

### Action API Query Response (Raw Wikitext)

```json
{
  "batchcomplete": true,
  "query": {
    "pages": [
      {
        "pageid": 6703,
        "ns": 0,
        "title": "hello",
        "revisions": [
          {
            "slots": {
              "main": {
                "contentmodel": "wikitext",
                "contentformat": "text/x-wiki",
                "content": "==English==\n\n===Etymology===\n{{...}}\n\n===Pronunciation===\n* {{IPA|en|/həˈləʊ/}}\n\n===Interjection===\n{{en-interj}}\n\n# A [[greeting]]...\n\n====Synonyms====\n* {{l|en|hi}}\n* {{l|en|hey}}\n\n====Antonyms====\n* {{l|en|goodbye}}\n* {{l|en|bye}}"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### Action API Parse Response (HTML)

```json
{
  "parse": {
    "title": "hello",
    "pageid": 6703,
    "text": {
      "*": "<div class=\"mw-parser-output\">...</div>"
    },
    "sections": [
      {
        "toclevel": 1,
        "level": "2",
        "line": "English",
        "number": "1",
        "index": "1"
      },
      {
        "toclevel": 2,
        "level": "3",
        "line": "Etymology",
        "number": "1.1",
        "index": "2"
      }
    ],
    "categories": [
      {"*": "English terms derived from Middle English"},
      {"*": "English interjections"}
    ]
  }
}
```

### Free Dictionary API Response

```json
[
  {
    "word": "hello",
    "phonetic": "/həˈloʊ/",
    "phonetics": [
      {
        "text": "/həˈloʊ/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3"
      }
    ],
    "origin": "Early 19th century...",
    "meanings": [
      {
        "partOfSpeech": "exclamation",
        "definitions": [
          {
            "definition": "Used as a greeting or to begin a phone conversation.",
            "example": "hello there, Katie!",
            "synonyms": ["hi", "hey", "greetings"],
            "antonyms": ["goodbye", "farewell"]
          }
        ]
      },
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "An utterance of 'hello'; a greeting.",
            "example": "she was getting polite


 hellos from everyone",
            "synonyms": [],
            "antonyms": []
          }
        ]
      },
      {
        "partOfSpeech": "verb",
        "definitions": [
          {
            "definition": "Say or shout 'hello'.",
            "example": "I pressed the phone/s$$ button and helloed",
            "synonyms": [],
            "antonyms": []
          }
        ]
      }
    ]
  }
]
```

---

## 6. Parsing Wikitext

### Wiktionary Entry Structure

Wiktionary entries follow a standardized layout with nested headings:

```
==English==                           (Level 2: Language)

===Etymology===                       (Level 3: Etymology section)
From {{inh|en|enm|hello}}...

===Pronunciation===                   (Level 3: Pronunciation)
* {{IPA|en|/həˈloʊ/}}
* {{audio|en|En-us-hello.ogg|Audio (US)}}

===Interjection===                    (Level 3: Part of Speech)
{{en-interj}}

# A [[greeting]] used when meeting someone.
# {{lb|en|colloquial}} Used to answer the [[telephone]].

====Synonyms====                      (Level 4: Under POS)
* {{syn|en|hi|hey|greetings|howdy}}

====Antonyms====                      (Level 4: Under POS)
* {{ant|en|goodbye|bye|farewell}}

====Derived terms====
* {{l|en|hello world}}

===Noun===                            (Another POS)
{{en-noun}}

# An utterance of "hello".
```

### Key Section Headers

| Level | Headers |
|-------|---------|
| 2 (==) | Language names: English, French, German, etc. |
| 3 (===) | Etymology, Pronunciation, Part of Speech (Noun, Verb, Adjective, etc.) |
| 4 (====) | Synonyms, Antonyms, Derived terms, Related terms, Translations, Usage notes |

### Definition Format

Definitions are numbered lists under the POS heading:
```
# First definition
# Second definition
## Sub-definition (rare)
```

### Common Templates

| Template | Purpose | Example |
|----------|---------|---------|
| `{{l\|en\|word}}` | Link to word | Creates [[word]] link |
| `{{syn\|en\|word1\|word2}}` | Synonyms list | Lists synonyms |
| `{{ant\|en\|word1\|word2}}` | Antonyms list | Lists antonyms |
| `{{lb\|en\|colloquial}}` | Usage label | Marks as colloquial |
| `{{IPA\|en\|/phonetic/}}` | IPA pronunciation | Shows phonetic |
| `{{audio\|en\|file.ogg}}` | Audio file | Links to audio |
| `{{en-noun}}` | Headword template | Part of speech header |
| `{{gloss\|meaning}}` | Inline definition | Clarification text |

### Extracting Synonyms Pattern

Look for these patterns:
```
====Synonyms====
* {{syn|en|word1|word2|word3}}
* {{l|en|word4}}, {{l|en|word5}}
```

Or inline with definitions:
```
# Definition text {{syn|en|synonym}}
```

### Extracting Antonyms Pattern

```
====Antonyms====
* {{ant|en|word1|word2}}
* {{l|en|word3}}
```

### Parsing Strategy

1. **Split by language** - Find `=={Language}==` headers
2. **Extract POS sections** - Find `==={POS}===` headers
3. **Extract definitions** - Find numbered list items (`# `)
4. **Extract synonyms/antonyms** - Find `====Synonyms====` sections or `{{syn|...}}` templates
5. **Parse templates** - Extract parameters from `{{template|param1|param2}}`

### Template Parsing Regex

```javascript
// Match template calls
const templateRegex = /\{\{([^|{}]+)(?:\|([^{}]*))?\}\}/g;

// Match link templates {{l|en|word}} or {{syn|en|word1|word2}}
const linkTemplateRegex = /\{\{(?:l|syn|ant)\|([^|]+)\|([^}]+)\}\}/g;

// Match definitions (numbered list items)
const definitionRegex = /^#+ (.+)$/gm;

// Match section headers
const sectionRegex = /^(={2,})([^=]+)\1$/gm;
```

---

## 7. Supported Languages

### Language-Specific Wiktionaries

Each language has its own Wiktionary subdomain:

| Language | Domain | API Endpoint |
|----------|--------|--------------|
| English | en.wiktionary.org | `https://en.wiktionary.org/w/api.php` |
| French | fr.wiktionary.org | `https://fr.wiktionary.org/w/api.php` |
| German | de.wiktionary.org | `https://de.wiktionary.org/w/api.php` |
| Spanish | es.wiktionary.org | `https://es.wiktionary.org/w/api.php` |
| Russian | ru.wiktionary.org | `https://ru.wiktionary.org/w/api.php` |
| Chinese | zh.wiktionary.org | `https://zh.wiktionary.org/w/api.php` |
| Japanese | ja.wiktionary.org | `https://ja.wiktionary.org/w/api.php` |
| Portuguese | pt.wiktionary.org | `https://pt.wiktionary.org/w/api.php` |
| Italian | it.wiktionary.org | `https://it.wiktionary.org/w/api.php` |
| Polish | pl.wiktionary.org | `https://pl.wiktionary.org/w/api.php` |

### Language Codes

Wikimedia uses ISO 639-1 (2-letter) or ISO 639-3 (3-letter) codes:
- `en` - English
- `fr` - French
- `de` - German
- `es` - Spanish
- `pt` - Portuguese
- `ru` - Russian
- `zh` - Chinese
- `ja` - Japanese
- `ko` - Korean
- `ar` - Arabic

### Free Dictionary API Languages

The Free Dictionary API supports multiple languages via the URL path:

```
https://api.dictionaryapi.dev/api/v2/entries/{lang_code}/{word}
```

Supported: `en`, `hi`, `es`, `fr`, `ja`, `ru`, `de`, `it`, `ko`, `pt-BR`, `ar`, `tr`

---

## 8. Error Handling

### MediaWiki API Error Response

```json
{
  "error": {
    "code": "missingtitle",
    "info": "The page you specified doesn't exist.",
    "docref": "See https://en.wiktionary.org/w/api.php for API usage."
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `missingtitle` | Page does not exist |
| `invalidtitle` | Invalid page title |
| `ratelimited` | Rate limit exceeded |
| `readonly` | Wiki is in read-only mode |
| `unknownerror` | Generic error |
| `badtoken` | Invalid CSRF token (for write operations) |
| `nosuchsection` | Requested section doesn't exist |

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success (even for API errors!) |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

**Important:** MediaWiki Action API returns 200 OK even for errors; check the JSON response for `error` field.

### Error Format Parameter

Control error format with `errorformat` parameter:
- `bc` - Backward compatible
- `plaintext` - Plain text messages
- `wikitext` - Wikitext formatted
- `html` - HTML formatted
- `raw` - Raw error data
- `none` - No error messages

### Free Dictionary API Errors

```json
{
  "title": "No Definitions Found",
  "message": "Sorry pal, we couldn't find definitions for the word you were looking for.",
  "resolution": "You can try the search again at later time or head to the web instead."
}
```

HTTP Status: 404 for not found

---

## 9. Example Requests/Responses

### Example 1: Get Synonyms for "happy" (Action API)

**Request:**
```
https://en.wiktionary.org/w/api.php?action=query&prop=revisions&titles=happy&rvprop=content&rvslots=main&formatversion=2&format=json
```

**Response (partial wikitext content):**
```
===Adjective===
{{en-adj|happier}}

# Having a feeling arising from a consciousness of well-being...
# [[fortunate|Fortunate]], [[lucky]].

====Synonyms====
* {{sense|enjoying}} {{syn|en|blessed|blissful|cheerful|content|delighted|elated|glad|joyful|jubilant|merry|pleased|thrilled|Thesaurus:happy}}
* {{sense|fortunate}} {{syn|en|fortunate|lucky}}
* {{sense|appropriate}} {{syn|en|apt|felicitous}}

====Antonyms====
* {{sense|enjoying}} {{syn|en|unhappy|sad|depressed|miserable|down|Thesaurus:sad}}
```

### Example 2: Get Definition for "run" (Free Dictionary API)

**Request:**
```
GET https://api.dictionaryapi.dev/api/v2/entries/en/run
```

**Response:**
```json
[
  {
    "word": "run",
    "phonetics": [
      {
        "text": "/ɹʌn/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/run-us.mp3"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "verb",
        "definitions": [
          {
            "definition": "To move swiftly on the feet.",
            "example": "Run, Sarah, run!",
            "synonyms": ["dash", "sprint", "race", "jog"],
            "antonyms": ["walk", "crawl"]
          },
          {
            "definition": "To flee or escape.",
            "synonyms": ["flee", "escape"],
            "antonyms": []
          }
        ]
      },
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "The act of running.",
            "example": "I go for a run every morning.",
            "synonyms": ["jog", "sprint"],
            "antonyms": []
          }
        ]
      }
    ]
  }
]
```

### Example 3: Parse Specific Section

**Request:**
```
https://en.wiktionary.org/w/api.php?action=parse&page=happy&prop=sections&format=json
```

**Response:**
```json
{
  "parse": {
    "title": "happy",
    "pageid": 39061,
    "sections": [
      {"toclevel": 1, "level": "2", "line": "English", "number": "1", "index": "1"},
      {"toclevel": 2, "level": "3", "line": "Etymology", "number": "1.1", "index": "2"},
      {"toclevel": 2, "level": "3", "line": "Pronunciation", "number": "1.2", "index": "3"},
      {"toclevel": 2, "level": "3", "line": "Adjective", "number": "1.3", "index": "4"},
      {"toclevel": 3, "level": "4", "line": "Synonyms", "number": "1.3.1", "index": "5"},
      {"toclevel": 3, "level": "4", "line": "Antonyms", "number": "1.3.2", "index": "6"}
    ]
  }
}
```

---

## 10. Integration Notes

### Challenges

1. **Wikitext Complexity**
   - No standard structure across entries
   - Template-heavy content requires expansion
   - Nested templates are common
   - Different languages have different conventions

2. **Data Inconsistency**
   - Not all entries have synonyms/antonyms
   - Quality varies by word frequency
   - Some entries are incomplete or outdated

3. **Rate Limiting**
   - Need to respect Wikimedia infrastructure
   - Implement backoff strategies
   - Consider caching responses

4. **Template Expansion**
   - Many templates are Lua-based
   - Full expansion requires MediaWiki environment
   - Consider pre-parsed data sources

### Recommended Approaches

#### Approach 1: Free Dictionary API (Simplest)

```typescript
async function getDefinitions(word: string): Promise<DictionaryEntry[]> {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

**Pros:** Structured JSON, includes synonyms/antonyms
**Cons:** English only, third-party dependency

#### Approach 2: Direct Wiktionary API with Parsing

```typescript
async function getWiktionaryContent(word: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: word,
    rvprop: 'content',
    rvslots: 'main',
    formatversion: '2',
    format: 'json',
    origin: '*'
  });

  const response = await fetch(
    `https://en.wiktionary.org/w/api.php?${params}`,
    {
      headers: {
        'User-Agent': 'Wordsmith/1.0 (https://github.com/user/wordsmith; email@example.com)'
      }
    }
  );

  const data = await response.json();
  const pages = data.query?.pages || [];

  if (pages.length === 0 || pages[0].missing) {
    return '';
  }

  return pages[0].revisions?.[0]?.slots?.main?.content || '';
}
```

**Pros:** Official source, all languages, complete data
**Cons:** Complex parsing required

#### Approach 3: Use npm Libraries

```typescript
import * as Wiktionary from 'wiktionary-scraper';

async function getSynonyms(word: string): Promise<string[]> {
  const results = await Wiktionary.get(word, {
    lemmaLanguage: 'English',
    userAgent: 'Wordsmith/1.0'
  });

  // Extract synonyms from results
  const synonyms: string[] = [];
  for (const entry of results) {
    for (const etymology of entry.etymologies) {
      for (const partOfSpeech of etymology.partsOfSpeech) {
        if (partOfSpeech.synonyms) {
          synonyms.push(...partOfSpeech.synonyms);
        }
      }
    }
  }

  return [...new Set(synonyms)]; // Deduplicate
}
```

### Caching Strategy

```typescript
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function cachedFetch(word: string): Promise<any> {
  const cached = cache.get(word);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchFromAPI(word);
  cache.set(word, { data, timestamp: Date.now() });

  return data;
}
```

### CORS Considerations

For browser-based applications:
- Wiktionary API requires `origin=*` parameter
- Or use a CORS proxy
- Or make requests from server-side

```typescript
// Add origin parameter for browser requests
const params = new URLSearchParams({
  // ... other params
  origin: '*'
});
```

---

## 11. Existing Parsers

### NPM Packages

#### wiktionary-scraper
- **URL:** https://www.npmjs.com/package/wiktionary-scraper
- **GitHub:** https://github.com/vxern/wiktionary-scraper
- **Features:**
  - TypeScript support
  - 60+ parts of speech
  - Single and multiple etymology entries
  - Extracts synonyms, antonyms, derived terms
  - ~45kB lightweight
- **Limitation:** English Wiktionary only

```typescript
import * as Wiktionary from 'wiktionary-scraper';

const results = await Wiktionary.get('word', {
  lemmaLanguage: 'English',
  followRedirects: true,
  userAgent: 'MyApp/1.0'
});
```

#### parse-wiktionary
- **URL:** https://www.npmjs.com/package/parse-wiktionary
- **GitHub:** https://github.com/onsa/parse-wiktionary
- **Features:**
  - TypeScript implementation
  - Etymologies, definitions, pronunciations
  - Examples, audio links
  - Related words (including synonyms)

```typescript
const { WiktionaryParser } = require('parse-wiktionary');
const parser = new WiktionaryParser();

const englishResults = parser.parse('test');
const frenchResults = parser.parse('test', 'french');
```

#### wiktionary-definition-parser
- **URL:** https://www.npmjs.com/package/wiktionary-definition-parser
- **Features:** Parses definition text from wikitext format
- **Use case:** Low-level parsing of definition sections

#### wiktionary-node
- **URL:** https://www.npmjs.com/package/wiktionary-node
- **GitHub:** https://github.com/laphets/wiktionary-node
- **Features:** Node.js parser returning structured JSON
- **Language:** JavaScript

### Python Packages (Reference)

#### wiktextract
- **URL:** https://github.com/tatuylonen/wiktextract
- **PyPI:** https://pypi.org/project/wiktextract/
- **Features:**
  - Complete Wiktionary dump processing
  - All languages supported
  - JSONL output format
  - Academic-quality extraction
- **Output Fields:**
  - `word`, `pos`, `lang`, `lang_code`
  - `senses` with `glosses`, `tags`
  - `synonyms`, `antonyms`, `hypernyms`, `hyponyms`
  - `forms`, `sounds`, `translations`

#### wiktionaryparser
- **URL:** https://pypi.org/project/wiktionaryparser/
- **Features:** Etymologies, definitions, pronunciations, related words

### Pre-extracted Data

#### kaikki.org
- **URL:** https://kaikki.org/dictionary/rawdata.html
- **Format:** JSONL files
- **Size:** ~2.3GB compressed (English)
- **Updates:** Weekly
- **Languages:** 25+ editions available
- **Use case:** Build your own dictionary API/database

**JSON Structure from kaikki.org:**
```json
{
  "word": "example",
  "lang": "English",
  "lang_code": "en",
  "pos": "noun",
  "senses": [
    {
      "glosses": ["Something representative of a group."],
      "tags": ["countable"]
    }
  ],
  "synonyms": [
    {"word": "sample", "sense": "representative"}
  ],
  "antonyms": [
    {"word": "counterexample"}
  ],
  "forms": [
    {"form": "examples", "tags": ["plural"]}
  ],
  "sounds": [
    {"ipa": "/ɪɡˈzɑːmpəl/"}
  ]
}
```

---

## Summary & Recommendations

### For Obsidian Wordsmith Plugin

**Recommended Implementation:**

1. **Primary API:** Free Dictionary API (`api.dictionaryapi.dev`)
   - Simple, structured JSON responses
   - Includes synonyms and antonyms
   - No parsing required

2. **Fallback:** npm library `wiktionary-scraper`
   - More comprehensive data
   - TypeScript support
   - Handles edge cases

3. **Caching:** Implement local caching
   - Use Obsidian's `loadData`/`saveData`
   - Cache for 24 hours minimum
   - Reduces API load

4. **Error Handling:**
   - Handle 404 gracefully (word not found)
   - Implement retry with exponential backoff
   - Show user-friendly messages

### Sample Integration

```typescript
interface WordData {
  word: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
  phonetic?: string;
}

async function lookupWord(word: string): Promise<WordData | null> {
  try {
    // Try Free Dictionary API first
    const response = await requestUrl({
      url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      method: 'GET'
    });

    const data = response.json;
    if (Array.isArray(data) && data.length > 0) {
      return parseFreeDictionaryResponse(data[0]);
    }
  } catch (error) {
    console.warn('Free Dictionary API failed, trying fallback...');
  }

  // Fallback to wiktionary-scraper
  try {
    const results = await Wiktionary.get(word);
    return parseWiktionaryScraperResponse(results);
  } catch (error) {
    console.error('All APIs failed:', error);
    return null;
  }
}
```

---

## References

- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Action_API)
- [MediaWiki REST API](https://www.mediawiki.org/wiki/API:REST_API)
- [Wiktionary Entry Layout](https://en.wiktionary.org/wiki/Wiktionary:Entry_layout)
- [API Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
- [Wikimedia Rate Limits](https://api.wikimedia.org/wiki/Rate_limits)
- [wiktionary-scraper on npm](https://www.npmjs.com/package/wiktionary-scraper)
- [wiktextract on GitHub](https://github.com/tatuylonen/wiktextract)
- [Free Dictionary API](https://dictionaryapi.dev/)
- [kaikki.org Raw Data](https://kaikki.org/dictionary/rawdata.html)
