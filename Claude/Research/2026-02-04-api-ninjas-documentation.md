# API Ninjas Thesaurus API Documentation

## Overview

API Ninjas provides a simple Thesaurus API for looking up synonyms and antonyms of English words. This document provides comprehensive documentation of the API based on official documentation and implementation analysis.

## API Endpoint

**Base URL:** `https://api.api-ninjas.com/v1/thesaurus`

**HTTP Method:** `GET`

### Request Format

```
GET https://api.api-ninjas.com/v1/thesaurus?word={word}
```

### Request Parameters

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `word`    | string | Yes      | The English word to look up          |

### Authentication

The API requires an API key passed via the `X-Api-Key` header:

```
X-Api-Key: YOUR_API_KEY
```

### Example Request

```bash
curl -X GET "https://api.api-ninjas.com/v1/thesaurus?word=elegant" \
  -H "X-Api-Key: YOUR_API_KEY"
```

## Response Structure

### Response Format

The API returns a JSON object with the following structure:

```typescript
interface APINinjasThesaurusResponse {
  word: string;       // The queried word (echoed back)
  synonyms?: string[]; // Array of synonyms (may be empty or absent)
  antonyms?: string[]; // Array of antonyms (may be empty or absent)
}
```

### Example Response

```json
{
  "word": "elegant",
  "synonyms": ["graceful", "refined", "stylish", "sophisticated", "tasteful"],
  "antonyms": ["crude", "inelegant", "awkward", "clumsy"]
}
```

### Response Fields

| Field      | Type     | Always Present | Description                                      |
|------------|----------|----------------|--------------------------------------------------|
| `word`     | string   | Yes            | The word that was queried                        |
| `synonyms` | string[] | No             | Array of words with similar meanings             |
| `antonyms` | string[] | No             | Array of words with opposite meanings            |

**Important Notes:**
- The `synonyms` and `antonyms` arrays may be empty `[]` or omitted entirely if none are found
- Results are returned as simple string arrays without additional metadata
- No part of speech information is provided
- No definitions are included in the response

## Relationship Types

### Available Types

| Type     | Supported | Notes                    |
|----------|-----------|--------------------------|
| Synonym  | Yes       | Via `synonyms` array     |
| Antonym  | Yes       | Via `antonyms` array     |
| Related  | No        | Not available            |
| Hypernym | No        | Not available            |
| Hyponym  | No        | Not available            |

### Plugin Implementation

Our current implementation at `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/APINinjasService.ts` correctly uses both available types:

```typescript
supportedTypes: ["synonym", "antonym"]
```

## Rate Limits and Pricing

### Rate Limits

The official documentation does not specify explicit rate limits. Based on the service description "Thesaurus API with generous free tier," limits appear to be reasonable for typical usage.

### Pricing Tiers

API Ninjas offers multiple pricing tiers available at `https://api-ninjas.com/pricing`. Specific tier details:
- **Free tier:** Available with usage limits (exact limits not publicly documented)
- **Paid tiers:** Available for higher volume usage

### API Key Requirements

- **Required:** Yes, an API key is mandatory
- **Registration URL:** https://api-ninjas.com/register
- **Key Location:** Available on your profile page after signing in

## Definition Information

**Definitions are NOT available from this API.**

The API Ninjas Thesaurus API is a pure thesaurus service:
- Returns only synonyms and antonyms
- No definitions are provided
- No example sentences
- No etymology information
- No pronunciation data

For definition data, users should consider:
- Free Dictionary API (includes definitions with synonyms)
- Merriam-Webster API (includes definitions with thesaurus data)
- WordsAPI (comprehensive word data including definitions)

## Limitations Compared to Other Services

### Comparison Table

| Feature           | API Ninjas | Merriam-Webster | Big Huge Thesaurus | Free Dictionary | WordsAPI |
|-------------------|------------|-----------------|--------------------|--------------------|----------|
| Synonyms          | Yes        | Yes             | Yes                | Yes                | Yes      |
| Antonyms          | Yes        | Yes             | Yes                | Yes                | Yes      |
| Related Words     | No         | No              | Yes                | No                 | Yes      |
| Hypernyms         | No         | No              | No                 | No                 | Yes      |
| Hyponyms          | No         | No              | No                 | No                 | Yes      |
| Definitions       | No         | Yes             | No                 | Yes                | Yes      |
| Part of Speech    | No         | Yes             | Yes                | Yes                | Yes      |
| Requires API Key  | Yes        | Yes             | Yes                | No                 | Yes      |
| Spelling Suggest  | No         | Yes             | No                 | No                 | No       |

### Specific Limitations

1. **No Part of Speech Information**
   - Results are flat arrays without POS categorization
   - Other services (Merriam-Webster, Big Huge Thesaurus, Free Dictionary) group results by noun/verb/adjective/adverb

2. **No Definitions**
   - Unlike Merriam-Webster and Free Dictionary, no word definitions are provided
   - Limits usefulness for disambiguation

3. **No Related Words**
   - Only strict synonyms and antonyms
   - Big Huge Thesaurus and WordsAPI provide related word relationships

4. **No Hierarchical Relationships**
   - No hypernyms (broader terms) or hyponyms (narrower terms)
   - Only WordsAPI and Datamuse provide these relationships

5. **No Spelling Suggestions**
   - If a word is not found, no spelling alternatives are suggested
   - Merriam-Webster returns spelling suggestions for unknown words

6. **English Only**
   - Only English words are supported
   - Altervista offers multilingual support

## Current Plugin Usage Analysis

### What We Currently Use

From `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/api/APINinjasService.ts`:

```typescript
// Interface matches API response
interface APINinjasThesaurusResponse {
  word: string;
  synonyms?: string[];
  antonyms?: string[];
}

// We use both available relationship types
if (requestedTypes.includes("synonym") && data.synonyms) { ... }
if (requestedTypes.includes("antonym") && data.antonyms) { ... }
```

### Coverage Assessment

| API Feature    | Used in Plugin | Notes                           |
|----------------|----------------|----------------------------------|
| `word`         | Implicit       | Not explicitly used but available |
| `synonyms`     | Yes            | Fully utilized                   |
| `antonyms`     | Yes            | Fully utilized                   |

**Conclusion:** Our implementation fully utilizes all available API features. No additional data is available from this API that we are not already capturing.

## Error Handling

### HTTP Status Codes

| Status | Meaning                      | Handling                          |
|--------|------------------------------|-----------------------------------|
| 200    | Success                      | Parse JSON response               |
| 400    | Bad Request                  | Invalid parameters                |
| 401    | Unauthorized                 | Invalid or missing API key        |
| 403    | Forbidden                    | API key lacks permissions         |
| 404    | Not Found                    | Word not in database              |
| 429    | Too Many Requests            | Rate limit exceeded               |
| 500    | Internal Server Error        | API service error                 |

### Plugin Error Handling

```typescript
async validate(): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await requestUrl({ ... });
    if (response.status === 200) {
      return { valid: true };
    }
    return { valid: false, error: "Invalid API response" };
  } catch (error) {
    if (error.message.includes("401") || error.message.includes("403")) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: false, error: error.message };
  }
}
```

## Best Practices

1. **API Key Security**
   - Store API keys securely (plugin settings with encryption)
   - Never expose keys in client-side code or logs

2. **Caching**
   - Implement response caching to reduce API calls
   - Our plugin uses LRU cache with configurable size

3. **Error Handling**
   - Handle 401/403 errors gracefully with clear messages
   - Provide fallback behavior when API is unavailable

4. **Rate Limiting**
   - Implement client-side rate limiting if heavy usage expected
   - Consider debouncing lookups during typing

## Summary

API Ninjas Thesaurus API is a straightforward, focused API for synonym and antonym lookups:

**Strengths:**
- Simple, consistent API design
- Generous free tier
- Fast response times
- Reliable service (800+ applications using it)

**Weaknesses:**
- No definitions
- No part of speech information
- No related words beyond synonyms/antonyms
- No hierarchical relationships (hypernyms/hyponyms)

**Recommendation:**
API Ninjas is best used as a supplementary source alongside more feature-rich services like Merriam-Webster or WordsAPI. For users who only need basic synonym/antonym lookups without definitions, it provides a reliable and cost-effective option.
