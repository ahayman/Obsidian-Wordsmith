# Yandex Dictionary API - Comprehensive Documentation

**Research Date:** 2026-02-05
**Purpose:** API documentation for integration into Obsidian Wordsmith plugin

---

## 1. Overview

The Yandex Dictionary API provides access to an automatically compiled dictionary that leverages technologies from the Yandex machine translation system. It enables developers to retrieve detailed dictionary entries including translations, synonyms, meanings, and usage examples.

### Key Features
- Word and phrase lookup with detailed dictionary entries
- Multiple language pair support (17+ pairs for dictionary, 106 pairs through Intento platform)
- Part of speech identification
- Phonetic transcriptions (for supported languages like English)
- Synonym suggestions
- Related meanings
- Usage examples with translations
- Support for monolingual lookups (same source and target language)

### Pricing
- **Free tier available** - API keys can be obtained at no cost through the Yandex developer portal
- All API methods require an API key for authentication
- No explicit pricing tiers documented (appears to be a free service with rate limits)

### Rate Limits
- Daily request limit exists (returns HTTP 403 when exceeded)
- Specific daily quota numbers not publicly documented
- Text length limits enforced (HTTP 413 when exceeded)

---

## 2. Authentication

### API Key Acquisition
1. Visit the Yandex developer portal at https://yandex.com/dev/dictionary/keys/get/
2. Complete the registration form
3. Receive a free API key

### Authentication Method
- **Type:** Query parameter
- **Parameter name:** `key`
- **Required:** Yes, for all API methods

### Example
```
https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=YOUR_API_KEY&lang=en-ru&text=hello
```

**Note:** The API key should be kept secure and not exposed in client-side code.

---

## 3. Endpoints

### Base URLs

| Format | Base URL |
|--------|----------|
| XML | `https://dictionary.yandex.net/api/v1/dicservice/` |
| JSON | `https://dictionary.yandex.net/api/v1/dicservice.json/` |

### Available Methods

#### 3.1 getLangs - Get Supported Languages

Returns a list of translation directions (language pairs) supported by the service.

**Endpoints:**
```
GET https://dictionary.yandex.net/api/v1/dicservice/getLangs?key={API_KEY}
GET https://dictionary.yandex.net/api/v1/dicservice.json/getLangs?key={API_KEY}
GET https://dictionary.yandex.net/api/v1/dicservice.json/getLangs?key={API_KEY}&callback={CALLBACK}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | API key |
| `callback` | string | No | Callback function name (JSONP only) |

---

#### 3.2 lookup - Dictionary Lookup

Searches for a word or phrase in the dictionary and returns an automatically generated dictionary entry.

**Endpoints:**
```
GET/POST https://dictionary.yandex.net/api/v1/dicservice/lookup
GET/POST https://dictionary.yandex.net/api/v1/dicservice.json/lookup
GET/POST https://dictionary.yandex.net/api/v1/dicservice.json/lookup?callback={CALLBACK}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | API key |
| `lang` | string | Yes | Language pair in format `source-target` (e.g., "en-ru", "en-en") |
| `text` | string | Yes | Word or phrase to look up |
| `ui` | string | No | Interface language for labels (e.g., part of speech names) |
| `flags` | integer | No | Bitmask for search options (see below) |

**Flags Parameter:**

| Flag | Value | Description |
|------|-------|-------------|
| `FAMILY` | 0x0001 (1) | Enable family-friendly filter |
| `MORPHO` | 0x0004 (4) | Enable morphological search to find word forms |
| `POS_FILTER` | 0x0008 (8) | Enable part-of-speech filtering |

Flags can be combined using bitwise OR. Example: `flags=5` enables both FAMILY and MORPHO.

---

## 4. Request Format

### URL Structure
```
https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key={API_KEY}&lang={LANG}&text={TEXT}[&ui={UI}][&flags={FLAGS}]
```

### Language Code Format
- Two-letter ISO 639-1 language codes
- Format: `{source}-{target}` (e.g., "en-ru" for English to Russian)
- Monolingual: Use same code for both (e.g., "en-en" for English definitions)

### Example Requests

**Basic lookup (English to Russian):**
```
GET https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=API_KEY&lang=en-ru&text=time
```

**With UI language:**
```
GET https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=API_KEY&lang=en-ru&text=time&ui=en
```

**With morphological search:**
```
GET https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=API_KEY&lang=en-ru&text=running&flags=4
```

**JSONP request:**
```
GET https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=API_KEY&lang=en-ru&text=hello&callback=myCallback
```

---

## 5. Response Format

### getLangs Response

**JSON Format:**
```json
["ru-ru", "ru-en", "ru-pl", "ru-uk", "ru-de", "ru-fr", "en-ru", "en-en", "en-de", "de-en", "de-ru", ...]
```

**XML Format:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfString>
  <string>ru-ru</string>
  <string>ru-en</string>
  <string>ru-pl</string>
  ...
</ArrayOfString>
```

---

### lookup Response

**JSON Structure:**

```json
{
  "head": {},
  "def": [
    {
      "text": "string",       // The looked-up word
      "pos": "string",        // Part of speech
      "ts": "string",         // Phonetic transcription (optional)
      "tr": [                 // Array of translations
        {
          "text": "string",   // Translation text
          "pos": "string",    // Part of speech of translation
          "gen": "string",    // Grammatical gender (optional)
          "asp": "string",    // Aspect (optional, for verbs)
          "syn": [            // Array of synonyms (optional)
            {
              "text": "string",
              "pos": "string",
              "gen": "string"
            }
          ],
          "mean": [           // Array of related meanings (optional)
            {
              "text": "string"
            }
          ],
          "ex": [             // Array of usage examples (optional)
            {
              "text": "string",  // Example in source language
              "tr": [            // Example translations
                {
                  "text": "string"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Response Field Descriptions

| Field | Location | Description |
|-------|----------|-------------|
| `head` | root | Empty header object (reserved for future use) |
| `def` | root | Array of dictionary definition entries |
| `text` | def, tr, syn, mean, ex | Text content of the element |
| `pos` | def, tr, syn | Part of speech (noun, verb, adjective, etc.) |
| `ts` | def | Phonetic transcription (IPA format for English) |
| `tr` | def | Array of translations for this definition |
| `gen` | tr, syn | Grammatical gender (e.g., "m", "f", "n" or localized) |
| `asp` | tr | Verb aspect (perfective/imperfective) |
| `syn` | tr | Array of synonyms for the translation |
| `mean` | tr | Array of semantic meanings/related words |
| `ex` | tr | Array of usage examples |

### Part of Speech Values

Common values (varies by UI language setting):

| English | Russian |
|---------|---------|
| noun | существительное |
| verb | глагол |
| adjective | прилагательное |
| adverb | наречие |
| pronoun | местоимение |
| preposition | предлог |
| conjunction | союз |
| interjection | междометие |
| numeral | числительное |
| particle | частица |

---

## 6. Complete Response Example

### Request
```
GET https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=API_KEY&lang=en-ru&text=time
```

### Response
```json
{
  "head": {},
  "def": [
    {
      "text": "time",
      "pos": "noun",
      "ts": "taɪm",
      "tr": [
        {
          "text": "время",
          "pos": "существительное",
          "syn": [
            { "text": "раз" },
            { "text": "тайм" }
          ],
          "mean": [
            { "text": "timing" },
            { "text": "fold" },
            { "text": "half" }
          ],
          "ex": [
            {
              "text": "prehistoric time",
              "tr": [{ "text": "доисторическое время" }]
            },
            {
              "text": "hundredth time",
              "tr": [{ "text": "сотый раз" }]
            },
            {
              "text": "time-slot",
              "tr": [{ "text": "тайм-слот" }]
            }
          ]
        }
      ]
    },
    {
      "text": "time",
      "pos": "verb",
      "ts": "taɪm",
      "tr": [
        {
          "text": "приурочить",
          "pos": "глагол",
          "asp": "сов"
        },
        {
          "text": "рассчитывать",
          "pos": "глагол",
          "asp": "несов"
        }
      ]
    }
  ]
}
```

---

## 7. Supported Languages

### Known Language Pairs

The service officially supports **17+ language pairs**. Language pairs can be retrieved dynamically using the `getLangs` endpoint.

**Confirmed supported language pairs include:**

| Direction | Description |
|-----------|-------------|
| ru-ru | Russian monolingual |
| ru-en | Russian to English |
| ru-pl | Russian to Polish |
| ru-uk | Russian to Ukrainian |
| ru-de | Russian to German |
| ru-fr | Russian to French |
| en-ru | English to Russian |
| en-en | English monolingual |
| en-de | English to German |
| de-en | German to English |
| de-ru | German to Russian |

### Supported Languages (via Intento platform)

The Intento platform reports **29 languages** and **106 language pairs**:

- Belarusian (be)
- Bulgarian (bg)
- Czech (cs)
- Danish (da)
- German (de)
- Greek (el)
- English (en)
- Spanish (es)
- Estonian (et)
- Finnish (fi)
- French (fr)
- Hungarian (hu)
- Italian (it)
- Lithuanian (lt)
- Latvian (lv)
- Mari Hill (mhr)
- Mari Meadow (mrj)
- Dutch (nl)
- Norwegian (no)
- Polish (pl)
- Portuguese (pt)
- Portuguese Brazilian (pt-br)
- Russian (ru)
- Slovak (sk)
- Swedish (sv)
- Turkish (tr)
- Tatar (tt)
- Ukrainian (uk)
- Chinese (zh)

**Note:** Not all language combinations may be available. Use `getLangs` to get the current list.

---

## 8. Error Handling

### HTTP Status Codes

| Code | Constant | Description |
|------|----------|-------------|
| 200 | ERR_OK | Success |
| 401 | ERR_KEY_INVALID | Invalid API key |
| 402 | ERR_KEY_BLOCKED | API key has been blocked |
| 403 | ERR_DAILY_REQ_LIMIT_EXCEEDED | Daily request limit exceeded |
| 413 | ERR_TEXT_TOO_LONG | Text exceeds maximum allowed size |
| 501 | ERR_LANG_NOT_SUPPORTED | Specified language pair not supported |

### Error Response Format

**JSON:**
```json
{
  "code": 401,
  "message": "API key is invalid"
}
```

**XML:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<Error code="401" message="API key is invalid" />
```

### Error Handling Best Practices

1. **Always check HTTP status codes** before parsing response body
2. **Implement retry logic** for 403 errors (wait until next day)
3. **Validate language pairs** using `getLangs` before making lookup requests
4. **Handle empty results** - valid words may return empty `def` array if not in dictionary
5. **Cache `getLangs` results** - language pairs rarely change

---

## 9. Integration Notes

### Quirks and Limitations

1. **Text Length Limit:** There is a maximum text length (exact limit undocumented), exceeding it returns HTTP 413

2. **Daily Request Quota:** Free tier has daily limits (exact number undocumented), plan for 403 errors

3. **Empty Results:** A successful 200 response may contain an empty `def` array if:
   - Word not found in dictionary
   - Word exists but not for specified language pair

4. **Transcription Availability:** The `ts` field (phonetic transcription) is only provided for certain languages (notably English)

5. **Grammatical Information:** Fields like `gen` (gender) and `asp` (aspect) are language-dependent and may not appear in all responses

6. **Monolingual vs Bilingual:**
   - Use same language code for both directions (e.g., "en-en") for definitions
   - Use different codes (e.g., "en-ru") for translations

7. **MORPHO Flag:** Essential for finding word forms (e.g., "running" -> "run")

8. **UI Language:** Setting `ui` parameter changes the language of labels like part of speech names

### Rate Limit Mitigation Strategies

1. **Cache responses locally** - Dictionary entries rarely change
2. **Batch requests client-side** - Avoid duplicate lookups
3. **Implement exponential backoff** for rate limit errors
4. **Consider offline dictionary** as fallback

### TypeScript Interface Example

```typescript
interface YandexDictionaryResponse {
  head: Record<string, never>;
  def: Definition[];
}

interface Definition {
  text: string;
  pos?: string;
  ts?: string;
  tr?: Translation[];
}

interface Translation {
  text: string;
  pos?: string;
  gen?: string;
  asp?: string;
  syn?: Synonym[];
  mean?: Meaning[];
  ex?: Example[];
}

interface Synonym {
  text: string;
  pos?: string;
  gen?: string;
}

interface Meaning {
  text: string;
}

interface Example {
  text: string;
  tr?: ExampleTranslation[];
}

interface ExampleTranslation {
  text: string;
}
```

### Fetch Implementation Example

```typescript
async function lookupWord(
  apiKey: string,
  word: string,
  lang: string = 'en-en',
  flags: number = 4
): Promise<YandexDictionaryResponse> {
  const url = new URL('https://dictionary.yandex.net/api/v1/dicservice.json/lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('lang', lang);
  url.searchParams.set('text', word);
  url.searchParams.set('flags', flags.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorCodes: Record<number, string> = {
      401: 'Invalid API key',
      402: 'API key blocked',
      403: 'Daily request limit exceeded',
      413: 'Text too long',
      501: 'Language not supported'
    };
    throw new Error(errorCodes[response.status] || `HTTP ${response.status}`);
  }

  return response.json();
}
```

---

## 10. References

### Official Documentation
- [Yandex Dictionary API Main Page](https://yandex.com/dev/dictionary)
- [Lookup Method Reference](https://yandex.com/dev/dictionary/doc/dg/reference/lookup.html)
- [getLangs Method Reference](https://yandex.com/dev/dictionary/doc/dg/reference/getLangs.html)
- [API Overview](https://yandex.com/dev/dictionary/doc/dg/concepts/api-overview-docpage)
- [Get API Key](https://yandex.com/dev/dictionary/keys/get/)

### Community Resources
- [Python Yandex Dictionary](https://github.com/kz20/python-yandex-dictionary) - Python wrapper
- [Ruby Yandex Dictionary](https://github.com/s-mage/yandex-dictionary) - Ruby gem
- [Dart Yandex Dictionary API](https://pub.dev/packages/yandex_dictionary_api) - Dart/Flutter package
- [Intento Platform Integration](https://inten.to/api-platform/api/yandexdictionary) - Multi-API platform

---

## 11. Comparison with Alternatives

| Feature | Yandex Dictionary | Free Dictionary API | Datamuse |
|---------|-------------------|---------------------|----------|
| Price | Free | Free | Free |
| API Key Required | Yes | No | No |
| Synonyms | Yes | Yes | Yes |
| Definitions | Via monolingual | Yes | No |
| Translations | Yes | No | No |
| Examples | Yes | Yes | No |
| Phonetics | Yes | Yes | No |
| Rate Limits | Daily quota | Unknown | ~100k/day |
| Languages | 29+ | English only | English |

---

*Last updated: 2026-02-05*
