# SynoFinder Data Source Recommendations

## Best Default Local Option: WordNet + Moby Combined

**Why combine both?**
- **WordNet** provides precision — POS tagging, sense disambiguation, true synonyms
- **Moby** provides volume — 2.5M associations for creative brainstorming
- **Together** they offer both accuracy and comprehensiveness
- **Total size** ~15-20MB compressed (acceptable for download)

**Quality Difference:**
- WordNet: "happy" → separates "pleased" sense from "fortunate" sense from "apt" sense
- Moby: "happy" → 230 terms in one list, mixing "cheerful" with "drunk" and "cogent"

**Implementation:**
- Download both on first use via plugin settings
- Use WordNet as primary (structured synonyms by sense)
- Use Moby as secondary ("related words" for expansion)
- UI should distinguish: "Synonyms" vs "Related Words"

**Sources:**
- WordNet: https://github.com/x-englishwordnet/json (CC-BY 4.0)
- Moby: https://www.gutenberg.org/ebooks/3202 (Public Domain)

---

## Best Default API Option: Datamuse API

**Why Datamuse?**
- **No API Key Required** - Completely open access
- **Generous Rate Limit** - 100,000 requests/day
- **Excellent Reliability** - 99.99% uptime, operating for 10+ years
- **Rich Query Options** - Synonyms, antonyms, related words, definitions

**Key Endpoints:**
```
Synonyms:     https://api.datamuse.com/words?rel_syn={word}
Meaning-like: https://api.datamuse.com/words?ml={word}&md=d
Antonyms:     https://api.datamuse.com/words?rel_ant={word}
```

**Source:** https://www.datamuse.com/api/

---

## Secondary API: Free Dictionary API

**Use for:**
- Full definitions with examples
- Audio pronunciations
- Phonetic transcriptions

**Endpoint:**
```
https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

**Rate Limit:** 1,000 requests/hour (use sparingly)

---

## Recommended Architecture

```
User selects word
        │
        ▼
┌─────────────────────────────────────────┐
│         Check Local Data                │
│  (if downloaded via settings)           │
├─────────────────────────────────────────┤
│  WordNet JSON → Structured synonyms     │
│                 by sense + POS          │
│  Moby Text    → Related words           │
│                 (loose associations)    │
└─────────────────┬───────────────────────┘
                  │ Not found or user wants more
                  ▼
┌─────────────────────────────────────────┐
│            Datamuse API                 │
│  Primary online source (100K req/day)   │
│  rel_syn → synonyms                     │
│  ml      → meaning-like                 │
│  rel_ant → antonyms                     │
└─────────────────┬───────────────────────┘
                  │ User wants full definition
                  ▼
┌─────────────────────────────────────────┐
│        Free Dictionary API              │
│  Rich definitions + audio (1K req/hr)   │
└─────────────────────────────────────────┘
```

---

## Future Enhancements (Bring Your Own Key)

APIs to support when adding user-provided API keys:
- **Merriam-Webster** - Authoritative definitions
- **WordsAPI** - Comprehensive word data
- **Big Huge Thesaurus** - Additional synonym coverage
