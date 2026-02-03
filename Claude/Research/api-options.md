# Free APIs for Synonym and Definition Lookup

## Executive Summary

Only **two APIs genuinely work without any API key**: **Free Dictionary API** and **Datamuse API**. All other APIs examined (Big Huge Thesaurus, WordsAPI, STANDS4, Merriam-Webster, Wordnik, OwlBot) require API key registration even for free tiers.

---

## Recommended: Free Dictionary API

### Overview
Completely free, open-source dictionary API requiring no authentication. Serves over 10 million requests monthly.

### Key Details
- **Base URL**: `https://api.dictionaryapi.dev/api/v2/entries/{language_code}/{word}`
- **Authentication**: None required
- **Rate Limit**: 1,000 requests per hour per IP
- **Data Source**: Wiktionary (CC BY-SA 4.0)

### Data Returned
- Definitions (multiple per part of speech)
- Synonyms and antonyms
- Phonetics with IPA transcription
- Audio pronunciations (MP3 URLs)
- Part of speech
- Usage examples
- Etymology (sometimes)

### Example Request
```bash
curl "https://api.dictionaryapi.dev/api/v2/entries/en/happy"
```

### Example Response
```json
[{
  "word": "happy",
  "phonetics": [
    {"text": "/ˈhæpi/", "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/happy-us.mp3"}
  ],
  "meanings": [
    {
      "partOfSpeech": "adjective",
      "definitions": [
        {
          "definition": "Having a feeling arising from a consciousness of well-being...",
          "example": "Music makes me feel happy.",
          "synonyms": [],
          "antonyms": []
        }
      ],
      "synonyms": ["cheerful", "content", "delighted", "elated", "glad", "joyful", "merry"],
      "antonyms": ["blue", "depressed", "miserable", "sad", "unhappy"]
    }
  ],
  "license": {"name": "CC BY-SA 3.0"},
  "sourceUrls": ["https://en.wiktionary.org/wiki/happy"]
}]
```

### Pros
- Completely free, no authentication
- Rich data including audio pronunciations
- Good documentation
- Active open-source community

### Cons
- Synonym data can be sparse for some words
- 1,000 requests/hour may limit high-traffic use
- No uptime SLA

### Source
- [Official Site](https://dictionaryapi.dev/)
- [GitHub](https://github.com/meetDeveloper/freeDictionaryAPI)

---

## Recommended: Datamuse API

### Overview
Word-finding query engine excelling at synonyms, related words, and rhymes. Operating reliably for over a decade with 99.99% uptime.

### Key Details
- **Base URL**: `https://api.datamuse.com/words`
- **Authentication**: None required
- **Rate Limit**: 100,000 requests per day
- **Data Sources**: WordNet 3.0, Wiktionary, Google Books Ngrams

### Query Parameters for Synonyms

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `ml` | Meaning-like (semantic similarity) | `?ml=happy` |
| `rel_syn` | Synonyms (WordNet synset) | `?rel_syn=happy` |
| `rel_ant` | Antonyms | `?rel_ant=happy` |
| `md` | Metadata (d=definitions, p=POS) | `?md=dp` |
| `max` | Max results (default 100, max 1000) | `?max=20` |

### Example: Get Synonyms
```bash
curl "https://api.datamuse.com/words?rel_syn=happy&max=10"
```

Response:
```json
[
  {"word": "halcyon", "score": 61042},
  {"word": "content", "score": 57050},
  {"word": "bright", "score": 43054},
  {"word": "felicitous", "score": 43032},
  {"word": "joyful", "score": 33031},
  {"word": "pleased", "score": 33028}
]
```

### Example: Meaning-Like with Definitions
```bash
curl "https://api.datamuse.com/words?ml=happy&md=d&max=5"
```

Response:
```json
[
  {"word": "pleased", "score": 40004395, "tags": ["syn","adj"], "defs": ["adj\tHappy, content"]},
  {"word": "blissful", "score": 40004156, "tags": ["syn","adj"], "defs": ["adj\tExtremely happy; full of joy"]},
  {"word": "content", "score": 40004024, "tags": ["syn","adj"], "defs": ["adj\tSatisfied, pleased, contented"]},
  {"word": "glad", "score": 40003904, "tags": ["syn","adj"], "defs": ["adj\tPleased; happy; gratified"]}
]
```

### Example: Get Antonyms
```bash
curl "https://api.datamuse.com/words?rel_ant=happy&max=10"
```

### Pros
- Extremely generous rate limit (100K/day)
- 99.99% uptime, server latency under 1ms
- Rich query options (synonyms, rhymes, sounds-like, etc.)
- Long track record of stability

### Cons
- Definitions are minimal compared to dictionary APIs
- No audio pronunciations
- Simple response format

### Source
- [API Documentation](https://www.datamuse.com/api/)

---

## Comparison: Free Dictionary vs Datamuse

| Feature | Free Dictionary API | Datamuse API |
|---------|---------------------|--------------|
| API Key Required | No | No |
| Rate Limit | 1,000/hour | 100,000/day |
| Definitions | Rich, detailed | Minimal |
| Synonyms | Yes | Yes (superior) |
| Antonyms | Yes | Yes |
| Audio | Yes (MP3 URLs) | No |
| Phonetics | Yes (IPA) | Limited |
| Related Words | No | Yes (many types) |
| Best For | Definitions | Synonym finding |

---

## Recommendation for SynoFinder

### Use Both APIs
1. **Datamuse** as primary for synonyms - better coverage, higher rate limit
2. **Free Dictionary API** for definitions and audio - richer lexical data

### Example Workflow
1. User selects a word
2. Call Datamuse `?rel_syn={word}&md=d&max=20` for synonyms with brief definitions
3. Optionally call Free Dictionary for full definition with audio

---

## APIs Requiring API Keys (For Future Reference)

These could be added later with "bring your own key" support:

| API | Free Tier | Rate Limit | Notes |
|-----|-----------|------------|-------|
| Big Huge Thesaurus | Unknown | Unknown | Thesaurus-focused |
| WordsAPI | 500/month | Limited | Comprehensive data |
| Merriam-Webster | 1K/day | Non-commercial only | Authoritative |
| Wordnik | Limited | Varies | Multi-source definitions |

---

## Sources

- [Free Dictionary API](https://dictionaryapi.dev/)
- [Datamuse API](https://www.datamuse.com/api/)
- [Big Huge Thesaurus](https://words.bighugelabs.com/site/api)
- [WordsAPI](https://rapidapi.com/dpventures/api/wordsapi/)
- [Merriam-Webster API](https://dictionaryapi.com/)
