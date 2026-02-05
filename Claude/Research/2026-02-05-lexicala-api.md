# Lexicala API Research

## Overview

The Lexicala Web API is a RESTful API developed by K Dictionaries, providing high-quality lexical data across **50+ languages**. It offers monolingual dictionary cores, bilingual pairs, and multilingual combinations with comprehensive linguistic information including definitions, translations, synonyms, antonyms, pronunciation, inflected forms, and more.

### Key Features

- Multilingual dictionary data for 50+ languages
- Definitions, examples, synonyms, antonyms
- Pronunciation (IPA and audio files)
- Inflected forms and morphological analysis
- Semantic search by definition
- Syntactic filtering (parts of speech, gender, number)
- Frequency rankings from SketchEngine corpora
- JSON, JSON-LD (RDF), and XML response formats

### Pricing Tiers

| Plan | Price | API Calls | Notes |
|------|-------|-----------|-------|
| **Evaluation (Free)** | $0/month | 50 daily calls | Non-commercial use only, all languages accessible |
| **Premium** | $100/month | 100,000 calls/month | $0.001 per additional call, premium support |

**Rate Limiting (RapidAPI Platform):**
- Free plans: Limited to 1000 requests/hour and 500K requests/month
- Exceeding limits returns HTTP 429 (Too Many Requests)
- Email alerts at 85% and 100% of quota

---

## Authentication

The Lexicala API is accessed through RapidAPI. After registration on RapidAPI, you receive an API key.

### Required Headers

```http
X-RapidAPI-Key: YOUR_API_KEY
X-RapidAPI-Host: lexicala1.p.rapidapi.com
```

### Base URL

```
https://lexicala1.p.rapidapi.com
```

---

## Endpoints

### Core Search & Retrieval Endpoints

#### GET /search

Find entries matching search criteria. Returns partial lexical information (abridged).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Headword to search for (required) |
| `source` | string | Data source: `global`, `password`, `multigloss`, `random` (default: `global`) |
| `language` | string | Two-letter language code (e.g., `en`, `es`, `de`) |
| `pos` | string | Part of speech filter: `noun`, `verb`, `adjective`, etc. |
| `gender` | string | Grammatical gender filter |
| `number` | string | Grammatical number: `singular`, `plural` |
| `monosemous` | boolean | Filter for single-meaning words |
| `polysemous` | boolean | Filter for multiple-meaning words |
| `morph` | string | Search in inflected forms |
| `analyzed` | boolean | Enable stemmer-based search |
| `synonyms` | string | Search for words with specific synonyms |
| `antonyms` | string | Search for words with specific antonyms |

**Example Request:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/search?text=happy&language=en&source=global' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

---

#### GET /search-entries

Similar to `/search` but returns **full entry data** instead of abridged versions. This is more efficient when you need complete information, eliminating the need for follow-up calls to `/entries`.

**Parameters:** Same as `/search`, plus additional filtering options.

**Key Advantage:** One call instead of 2-3 calls (search + entries/senses).

---

#### GET /entries/{entry-id}

Retrieve complete entry information using an entry ID obtained from a search.

**Example:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/entries/EN_DE00008424' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

---

#### GET /senses/{sense-id}

Retrieve specific sense data by sense ID.

---

#### GET /search-definitions

Free-text search within definitions. Available for **17 languages**.

---

#### GET /fluky-search

"Feeling lucky" random word discovery across resources.

---

#### GET /languages

Retrieve list of available languages and resources.

---

### RDF Endpoints

#### GET /search-rdf

Returns search results in JSON-LD format (OntoLex-Lexicog standard).

#### GET /rdf/{entry-id}

Returns complete entry in RDF structure.

---

## Request Format

### URL Structure

```
https://lexicala1.p.rapidapi.com/{endpoint}?{query_parameters}
```

### Query Parameters

Parameters are passed as URL query strings:

```
/search?text=word&language=en&source=global&pos=noun
```

### Language Codes

Two-letter ISO 639-1 codes are used:

| Code | Language | Code | Language |
|------|----------|------|----------|
| `af` | Afrikaans | `ko` | Korean |
| `ar` | Arabic | `la` | Latin |
| `bg` | Bulgarian | `lt` | Lithuanian |
| `ca` | Catalan | `lv` | Latvian |
| `cs` | Czech | `ms` | Malay |
| `da` | Danish | `nl` | Dutch |
| `de` | German | `no` | Norwegian |
| `el` | Greek | `pl` | Polish |
| `en` | English | `pt` | Portuguese |
| `es` | Spanish | `ro` | Romanian |
| `et` | Estonian | `ru` | Russian |
| `fa` | Farsi/Persian | `sk` | Slovak |
| `fi` | Finnish | `sl` | Slovene |
| `fr` | French | `sq` | Albanian |
| `he` | Hebrew | `sr` | Serbian |
| `hi` | Hindi | `sv` | Swedish |
| `hr` | Croatian | `th` | Thai |
| `hu` | Hungarian | `tr` | Turkish |
| `id` | Indonesian | `uk` | Ukrainian |
| `is` | Icelandic | `vi` | Vietnamese |
| `it` | Italian | `zh` | Chinese |
| `ja` | Japanese | | |

**Note:** Use `GET /languages` endpoint for the complete, up-to-date list.

---

## Response Format

### Entry Object Structure

```json
{
  "id": "EN_DE00008424",
  "source": "global",
  "language": "en",
  "version": "2.1",
  "headword": {
    "text": "happy",
    "pos": "adjective",
    "pronunciation": {
      "value": "/ˈhæpi/"
    },
    "inflections": [
      {
        "text": "happier",
        "number": "comparative"
      },
      {
        "text": "happiest",
        "number": "superlative"
      }
    ]
  },
  "senses": [...],
  "related_entries": ["EN_DE00008425"]
}
```

### Headword Object

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The headword text |
| `pos` | string | Part of speech |
| `gender` | string | Grammatical gender |
| `number` | string | Grammatical number |
| `homograph_number` | number | Distinguishes homographs |
| `subcategorization` | string | Verb transitivity, etc. |
| `register` | string | Formal, informal, etc. |
| `pronunciation` | object | IPA transcription and audio |
| `inflections` | array | Inflected forms |
| `alternative_scripts` | object | Non-Latin writing systems |

### Sense Object

```json
{
  "id": "EN_SE00012345",
  "definition": "feeling or showing pleasure or contentment",
  "semantic_category": ["emotion"],
  "register": ["informal"],
  "synonyms": ["pleased", "content", "cheerful", "joyful"],
  "antonyms": ["sad", "unhappy", "miserable"],
  "examples": [
    {
      "text": "She was happy to see her old friends.",
      "translations": {
        "es": "Estaba feliz de ver a sus viejos amigos."
      }
    }
  ],
  "translations": {
    "es": {
      "text": "feliz",
      "pos": "adjective"
    },
    "de": {
      "text": "glücklich",
      "pos": "adjective"
    }
  },
  "compositional_phrases": [...],
  "geographical_usage": ["British", "American"],
  "range_of_application": [...],
  "sentiment": [...],
  "see_also": [...]
}
```

### Sense Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique sense identifier |
| `definition` | string | The definition text |
| `semantic_category` | array | Semantic categories |
| `register` | array | Usage register (formal, slang, etc.) |
| `synonyms` | array | List of synonym strings |
| `antonyms` | array | List of antonym strings |
| `examples` | array | Usage examples with translations |
| `translations` | object | Translation objects keyed by language code |
| `compositional_phrases` | array | Multi-word expressions |
| `geographical_usage` | array | Regional usage notes |
| `range_of_application` | array | Domain-specific usage |
| `subcategorization` | array | Grammatical subcategorization |
| `sentiment` | array | Sentiment classification |
| `see_also` | array | Cross-references |

### Translation Object

```json
{
  "text": "feliz",
  "pos": "adjective",
  "gender": null,
  "inflections": [...],
  "pronunciation": {
    "value": "/feˈliθ/"
  },
  "alternative_scripts": null,
  "semantic_subcategory": [...],
  "sentiment": [...]
}
```

### Search Results Structure

```json
{
  "n_results": 5,
  "page_number": 1,
  "results_per_page": 10,
  "results": [
    {
      "id": "EN_DE00008424",
      "source": "global",
      "language": "en",
      "headword": {...},
      "senses": [...]
    }
  ]
}
```

---

## Supported Languages

The Lexicala API supports **50+ languages** across four dictionary series:

### Complete Language List

Afrikaans, Albanian, Arabic, Armenian, Azerbaijani, Bulgarian, Catalan, Chinese (Simplified), Chinese (Traditional), Croatian, Czech, Danish, Dari, Dutch, English, Estonian, Ewe, Farsi, Finnish, French, French (Canada), Frisian, Georgian, German, Greek, Hebrew, Hindi, Hungarian, Icelandic, Igbo, Indonesian, Italian, Japanese, Korean, Latin, Latvian, Lithuanian, Malay, Norwegian, Pashto, Polish, Portuguese (Brazil), Portuguese (Portugal), Romanian, Russian, Serbian, Slovak, Slovene, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese

### Data Sources

| Source | Description | Languages |
|--------|-------------|-----------|
| **Global** | 25 monolingual cores with bilingual/multilingual pairs | Most comprehensive |
| **Password** | English learner's dictionary core | 46 languages |
| **MultiGloss** | Auto-expanded Password bilingual glossaries | 44 languages |
| **Random House** | Random House Webster's College Dictionary | English only |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or malformed request |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Access denied (subscription/permissions issue) |
| 404 | Not Found | Resource not found (invalid entry ID) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

```json
{
  "message": "Error description here",
  "error_code": "SPECIFIC_ERROR_CODE"
}
```

### Common Error Scenarios

1. **Missing API Key:**
   ```json
   {"message": "Missing RapidAPI key"}
   ```

2. **Invalid Language Code:**
   ```json
   {"message": "Invalid language parameter"}
   ```

3. **Rate Limit Exceeded:**
   ```json
   {"message": "You have exceeded the rate limit"}
   ```

4. **Entry Not Found:**
   ```json
   {"message": "Entry not found"}
   ```

---

## Example Requests/Responses

### Example 1: Search for Synonyms of "happy"

**Request:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/search-entries?text=happy&language=en&source=global' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

**Response (abbreviated):**
```json
{
  "n_results": 1,
  "results": [
    {
      "id": "EN_DE00008424",
      "source": "global",
      "language": "en",
      "headword": {
        "text": "happy",
        "pos": "adjective",
        "pronunciation": {
          "value": "/ˈhæpi/"
        }
      },
      "senses": [
        {
          "id": "EN_SE00012345",
          "definition": "feeling or showing pleasure or contentment",
          "synonyms": ["pleased", "content", "cheerful", "joyful", "delighted", "glad"],
          "antonyms": ["sad", "unhappy", "miserable", "sorrowful"],
          "examples": [
            {
              "text": "She looked happy when she heard the news."
            }
          ]
        }
      ]
    }
  ]
}
```

### Example 2: Search by Synonym

Find words that have "joyful" as a synonym:

**Request:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/search?synonyms=joyful&language=en&source=global' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

### Example 3: Search by Antonym

Find words that have "sad" as an antonym:

**Request:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/search?antonyms=sad&language=en&source=global' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

### Example 4: Get Entry by ID

**Request:**
```bash
curl --request GET \
  --url 'https://lexicala1.p.rapidapi.com/entries/EN_DE00008424' \
  --header 'X-RapidAPI-Host: lexicala1.p.rapidapi.com' \
  --header 'X-RapidAPI-Key: YOUR_API_KEY'
```

### Example 5: JavaScript Fetch

```javascript
const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': 'YOUR_API_KEY',
    'X-RapidAPI-Host': 'lexicala1.p.rapidapi.com'
  }
};

fetch('https://lexicala1.p.rapidapi.com/search-entries?text=happy&language=en', options)
  .then(response => response.json())
  .then(data => {
    const entry = data.results[0];
    const synonyms = entry.senses[0].synonyms;
    const antonyms = entry.senses[0].antonyms;
    console.log('Synonyms:', synonyms);
    console.log('Antonyms:', antonyms);
  })
  .catch(error => console.error('Error:', error));
```

### Example 6: TypeScript Interface

```typescript
interface LexicalaSearchResponse {
  n_results: number;
  page_number: number;
  results_per_page: number;
  results: LexicalaEntry[];
}

interface LexicalaEntry {
  id: string;
  source: 'global' | 'password' | 'multigloss' | 'random';
  language: string;
  version: string;
  headword: Headword;
  senses: Sense[];
  related_entries?: string[];
}

interface Headword {
  text: string;
  pos?: string;
  gender?: string;
  number?: string;
  homograph_number?: number;
  pronunciation?: {
    value: string;
  };
  inflections?: Inflection[];
  alternative_scripts?: Record<string, string>;
}

interface Sense {
  id: string;
  definition?: string;
  semantic_category?: string[];
  register?: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: Example[];
  translations?: Record<string, Translation>;
  compositional_phrases?: ComposionalPhrase[];
  geographical_usage?: string[];
  sentiment?: string[];
  see_also?: string[];
}

interface Inflection {
  text: string;
  number?: string;
  gender?: string;
  tense?: string;
}

interface Example {
  text: string;
  translations?: Record<string, string>;
}

interface Translation {
  text: string;
  pos?: string;
  gender?: string;
  pronunciation?: {
    value: string;
  };
}
```

---

## Integration Notes

### Important Considerations

1. **Use `/search-entries` for Efficiency:**
   - Prefer `/search-entries` over `/search` + `/entries` to reduce API calls
   - One call instead of 2-3 calls saves quota and improves performance

2. **Synonyms/Antonyms Location:**
   - Synonyms and antonyms are arrays of strings within each `sense` object
   - A word may have multiple senses, each with different synonyms/antonyms
   - Check all senses to get complete synonym/antonym lists

3. **Free Tier Limitations:**
   - 50 calls/day is very limited for production use
   - Non-commercial use only
   - Consider Premium tier ($100/month) for production applications

4. **Data Source Selection:**
   - `global` - Best for monolingual lookups with translations
   - `password` - Good for English learner contexts
   - `multigloss` - Useful for quick bilingual glossaries
   - `random` - Legacy Random House Webster's (English only)

5. **Language Availability:**
   - Not all features available for all languages
   - Definition search (`/search-definitions`) limited to 17 languages
   - Word frequency data spans 20 languages

6. **Response Caching:**
   - Consider implementing local caching to reduce API calls
   - Terms of Service prohibit systematic caching without consent
   - Implement reasonable caching for user sessions

7. **Handling Multiple Senses:**
   - Words often have multiple senses (meanings)
   - Each sense has its own definition, synonyms, antonyms
   - Present all relevant senses to users or let them choose

8. **Pronunciation Data:**
   - IPA transcription in `pronunciation.value`
   - Audio files available for headwords (when available)
   - Distinguish American vs. British English pronunciation

9. **Inflection Handling:**
   - Use `morph` parameter to search inflected forms
   - Use `analyzed` parameter for stemmer-based matching
   - Inflections array provides word forms

10. **RapidAPI Integration:**
    - All requests must go through RapidAPI
    - Monitor usage via RapidAPI dashboard
    - Handle 429 errors with exponential backoff

### Quirks and Limitations

- **No Direct API Access:** Must use RapidAPI as intermediary
- **Limited Free Tier:** 50 calls/day severely restricts development/testing
- **Varying Data Quality:** Coverage varies significantly by language
- **No Bulk Operations:** No batch endpoint for multiple word lookups
- **Attribution Required:** Must attribute K Dictionaries as data source
- **No Standalone Distribution:** Cannot redistribute as standalone dictionary

---

## Sources

- [Official Documentation](https://api.lexicala.com/documentation/)
- [Lexicala API Homepage](https://api.lexicala.com/)
- [RapidAPI Lexicala Page](https://rapidapi.com/kdictionaries/api/lexicala1)
- [Lexicala.NET GitHub Client](https://github.com/HannoZ/Lexicala.NET)
- [Lexicala Languages](https://lexicala.com/languages/)
- [Lexicala Lexical Data](https://lexicala.com/lexical-data/)
