# Multi-Language Support Feasibility Study

**Date:** 2026-02-05
**Scope:** Wordsmith Plugin - Synonym & Definition Lookup

---

## Executive Summary

Adding multi-language support to Wordsmith is **feasible** with moderate effort. The current architecture already supports multiple API services, so the primary work involves:

1. Making existing services language-aware (Altervista, Free Dictionary, Datamuse already support multiple languages)
2. Adding language selection to settings (with automatic detection options)
3. Providing downloadable dictionaries for offline spell-checking (NSpell - 92 languages)
4. Replacing English-only WordNet with Open Multilingual WordNet (37+ languages, ~200 lines of code)
5. Optionally adding new multi-language services (Lexicala, Wiktionary, Yandex)

**Key Findings:**
- Several existing services already support multiple languages - the plugin just needs configuration to use them
- Open Multilingual WordNet provides offline thesaurus support for 37+ languages with moderate implementation effort
- Language detection can be automated via document analysis + Obsidian locale fallback

---

## Current State Analysis

### Services Currently Used (All English-Only)

| Service | Free? | API Key? | Current Language | Multi-Language Potential |
|---------|-------|----------|------------------|--------------------------|
| WordNet (Local) | Yes | No | English only | **37+ languages via OMW** |
| Moby (Local) | Yes | No | English only | None - English-only resource |
| Datamuse | Yes | No | English | **Spanish supported** |
| Free Dictionary | Yes | No | English (hardcoded) | **13 languages available** |
| Altervista | Yes | Yes | English (hardcoded) | **16 languages available** |
| Merriam-Webster | Free tier | Yes | English only | None - English dictionaries only |
| Big Huge Thesaurus | Paid | Yes | English only | None |
| WordsAPI | Paid | Yes | English only | None |
| API Ninjas | Free tier | Yes | English only | None |

### Hardcoded English References

1. **Free Dictionary** (`FreeDictionaryService.ts:21`): URL path `/en` hardcoded
2. **Altervista** (`AltervistaService.ts:33`): Language param `en_US` hardcoded
3. **WordNet** (`WordNetService.ts:84`): English thesaurus URL
4. **Moby** (`MobyService.ts:82`): English word list URL
5. **NSpell** (`NSpellService.ts`): English dictionary default

---

## Service-by-Service Analysis

### 1. Free Dictionary API (dictionaryapi.dev) ⭐ HIGH POTENTIAL

**Current:** Hardcoded to English
**Available Languages:** 13 languages

| Code | Language |
|------|----------|
| en_US | English (US) |
| en_GB | English (UK) |
| es | Spanish |
| fr | French |
| de | German |
| it | Italian |
| pt-BR | Portuguese (Brazil) |
| ja | Japanese |
| ko | Korean |
| ar | Arabic |
| ru | Russian |
| hi | Hindi |
| tr | Turkish |

**Required Changes:**
- Make URL language parameter configurable
- Update endpoint from `/en/<word>` to `/{language}/<word>`
- Handle language-specific response variations

**Effort:** Low - URL parameter change only

**Source:** [Free Dictionary API](https://dictionaryapi.dev/)

---

### 2. Altervista Thesaurus API ⭐ HIGH POTENTIAL

**Current:** Hardcoded to `en_US`
**Available Languages:** 16 languages

| Code | Language |
|------|----------|
| cs_CZ | Czech |
| da_DK | Danish |
| de_CH | German (Switzerland) |
| de_DE | German (Germany) |
| el_GR | Greek |
| en_US | English (US) |
| es_ES | Spanish |
| fr_FR | French |
| hu_HU | Hungarian |
| it_IT | Italian |
| no_NO | Norwegian |
| pl_PL | Polish |
| pt_PT | Portuguese |
| ro_RO | Romanian |
| ru_RU | Russian |
| sk_SK | Slovak |

**Required Changes:**
- Make `language` parameter configurable in settings
- Pass selected language code to API

**Effort:** Low - Already has language parameter, just hardcoded

**Source:** [Altervista Thesaurus](https://thesaurus.altervista.org/service)

---

### 3. Datamuse API ⭐ MODERATE POTENTIAL

**Current:** English default
**Available Languages:** English + Spanish

**Features:**
- `v=es` parameter enables Spanish vocabulary (500,000 terms)
- Metadata (definitions, parts of speech) available for both languages
- Roadmap mentions more languages planned

**Required Changes:**
- Add vocabulary parameter (`v=es` for Spanish)
- Update types to include vocabulary/language option

**Effort:** Low for Spanish; waiting on API for more languages

**Source:** [Datamuse API](https://www.datamuse.com/api/)

---

### 4. NSpell Spelling Service ⭐ HIGH POTENTIAL

**Current:** English default
**Available Dictionaries:** 92 languages via `wooorm/dictionaries`

**Popular Languages Available:**
- English (US, UK, AU, CA, ZA variants)
- Spanish (19 regional variants)
- German (DE, AT, CH)
- French, Italian, Portuguese
- Dutch, Swedish, Norwegian
- Polish, Russian, Ukrainian
- Arabic, Hebrew, Turkish, Greek
- Korean, Vietnamese
- And many more...

**Required Changes:**
- Create language selector in settings
- Download appropriate dictionary files (`.aff` + `.dic`)
- Initialize NSpell with selected language dictionary

**Installation:** `npm install dictionary-{lang}` (e.g., `dictionary-fr`)

**Effort:** Moderate - Need to manage multiple dictionary downloads

**Source:** [wooorm/dictionaries](https://github.com/wooorm/dictionaries)

---

### 5. WordNet / Local Thesaurus ⭐ HIGH POTENTIAL (via OMW)

**Current:** English-only (`zaibacu/thesaurus` repository)
**Alternative:** Open Multilingual WordNet (OMW)

**OMW Availability:**
- 37 core languages with hand-curated wordnets (high quality)
- 150+ languages in extended OMW v1 (auto-constructed, ~94% accuracy)

| Language | Synsets | Quality |
|----------|---------|---------|
| English | 117,659 | Excellent |
| Finnish | 116,763 | Excellent |
| French | 59,091 | Excellent |
| Romanian | 58,754 | Excellent |
| Japanese | 57,179 | Excellent |
| Catalan | 45,826 | Good |
| Portuguese | 43,895 | Good |
| Chinese | 42,312 | Good |
| Spanish | 38,512 | Good |

**Data Format Options:**
- **Tab-separated (Recommended):** Simple format, similar parsing complexity to current JSONL
- WN-LMF XML: More complete but memory-intensive to parse
- JSON-LD: Available but less common

**Required Changes:**

| Change | Effort | Est. Lines |
|--------|--------|------------|
| New TypeScript interfaces for OMW data model | Low | ~30 |
| Replace `parseJsonl()` with `parseTabFile()` | Low | ~50 |
| Parameterize download URL by language | Low | ~10 |
| Handle `.tar.xz` decompression (or use pre-extracted) | Medium | ~40 |
| Update `lookup()` to use synset-based retrieval | Low | ~30 |
| Add language parameter to constructor/methods | Low | ~20 |
| Update cache path to be per-language | Low | ~10 |
| **Total** | | **~200 lines** |

**Key Insight:** Using the Tab-separated format, OMW parsing is similar in complexity to the current JSONL parsing. The main conceptual difference is the synset-based data model (word → sense → synset → synonyms), but this maps cleanly to the existing `SynonymResult` interface.

**Effort:** Moderate - Similar to adding a new API service

**Source:** [Open Multilingual WordNet](https://omwn.org/)

---

## New Services to Consider

### 1. Lexicala API ⭐ RECOMMENDED

**Languages:** 50+ languages
**Features:** Definitions, synonyms, antonyms, translations, etymology
**Pricing:** 50 free calls/day, $100/month for 100K calls

**Pros:**
- Most comprehensive multi-language coverage
- Rich linguistic data
- Well-documented API

**Cons:**
- Limited free tier
- Paid for significant usage

**Source:** [Lexicala API](https://api.lexicala.com/)

---

### 2. PONS Dictionary API

**Languages:** 20+ languages, 34+ language pairs
**Features:** 12 million headwords, bilingual dictionaries
**Pricing:** 1,000 free queries/month

**Pros:**
- Strong European language coverage
- Long-established dictionary publisher

**Cons:**
- Limited free tier
- Primarily bilingual (translation-focused)

**Source:** [PONS API](https://en.pons.com/p/online-dictionary/developers/api)

---

### 3. Wiktionary API (Wikimedia)

**Languages:** 280+ languages
**Features:** Definitions, synonyms, antonyms, etymology, pronunciations
**Pricing:** Free (open data)

**Pros:**
- Completely free
- Massive language coverage
- Community-maintained, constantly updated

**Cons:**
- Complex data parsing required
- Inconsistent data structure across languages
- Rate limits apply
- Quality varies by language

**Source:** [Wiktionary API](https://en.wiktionary.org/wiki/User:Amgine/Wiktionary_data_&_API)

---

### 4. Yandex Dictionary API

**Languages:** 17 language pairs
**Features:** Synonyms, translations, examples
**Pricing:** Free with API key

**Pros:**
- Free tier available
- Good for Russian and related languages

**Cons:**
- Limited language pairs
- Primarily translation-focused

**Source:** [Yandex Dictionary](https://yandex.com/dev/dictionary)

---

### 5. Oxford Dictionaries API

**Languages:** 35+ languages
**Features:** Definitions, synonyms, antonyms, etymology
**Pricing:** Enterprise - starts at £5,000/year per language

**Cons:**
- Very expensive for a free plugin
- Not recommended for this use case

---

## Recommended Implementation Strategy

### Phase 1: Quick Wins (Low Effort, High Impact)

**Goal:** Support 16+ languages with minimal code changes

1. **Altervista Service**
   - Change hardcoded `en_US` to configurable setting
   - Already has language parameter support
   - Immediate access to 16 languages

2. **Free Dictionary Service**
   - Change URL template to use language parameter
   - Immediate access to 13 languages

3. **Datamuse Service**
   - Add `v=es` parameter support for Spanish
   - Immediate Spanish support

**Estimated Scope:** ~2-3 files, <100 lines of code

---

### Phase 2: Settings & UI

1. **Add Language Selector**
   - Global language preference in settings
   - Per-service language override (optional)
   - Language code → display name mapping

2. **Update Settings Tab**
   - Show which languages each service supports
   - Indicate when a service doesn't support selected language

**Estimated Scope:** Settings types, SettingsTab component

---

### Phase 3: Spell-Checking Multi-Language

1. **Dictionary Management**
   - Allow downloading dictionaries for selected language
   - Store in language-specific cache folders
   - Clean up old language dictionaries on switch

2. **NSpell Integration**
   - Initialize with selected language dictionary
   - Fall back to offline-only when dictionary not available

**Estimated Scope:** NSpellService, download management

---

### Phase 4: Enhanced Coverage (Optional)

1. **Add Wiktionary Service**
   - Implement Wiktionary API parser
   - Handle cross-language data structures
   - Maximum language coverage

2. **Add Lexicala Service** (if users want premium)
   - Rich multi-language data
   - Requires API key configuration

---

## Language Coverage Matrix (After Implementation)

| Language | Free Dict | Altervista | Datamuse | OMW | NSpell | Total |
|----------|-----------|------------|----------|-----|--------|-------|
| English | ✓ | ✓ | ✓ | ✓ | ✓ | 5 |
| Spanish | ✓ | ✓ | ✓ | ✓ | ✓ | 5 |
| French | ✓ | ✓ | - | ✓ | ✓ | 4 |
| German | ✓ | ✓ | - | - | ✓ | 3 |
| Italian | ✓ | ✓ | - | ✓ | ✓ | 4 |
| Portuguese | ✓ | ✓ | - | ✓ | ✓ | 4 |
| Russian | ✓ | ✓ | - | - | ✓ | 3 |
| Arabic | ✓ | - | - | ✓ | ✓ | 3 |
| Japanese | ✓ | - | - | ✓ | - | 2 |
| Korean | ✓ | - | - | - | ✓ | 2 |
| Polish | - | ✓ | - | ✓ | ✓ | 3 |
| Czech | - | ✓ | - | - | ✓ | 2 |
| Greek | - | ✓ | - | ✓ | ✓ | 3 |
| Dutch | - | - | - | ✓ | ✓ | 2 |
| Swedish | - | - | - | ✓ | ✓ | 2 |
| Finnish | - | - | - | ✓ | ✓ | 2 |
| Chinese | - | - | - | ✓ | - | 1 |
| Thai | - | - | - | ✓ | ✓ | 2 |
| Romanian | - | ✓ | - | ✓ | ✓ | 3 |
| Indonesian | - | - | - | ✓ | ✓ | 2 |

*OMW = Open Multilingual WordNet (local/offline)*

---

## Technical Considerations

### Data Model Changes

```typescript
// Add to types.ts
type LanguageCode =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru'
  | 'ar' | 'ja' | 'ko' | 'hi' | 'tr' | 'pl' | 'cs'
  | 'el' | 'hu' | 'no' | 'da' | 'sk' | 'ro' | 'nl';

interface PluginSettings {
  // Add:
  language: LanguageCode;
  // Existing fields...
}

interface SynonymService {
  // Add:
  supportedLanguages(): LanguageCode[];
  supportsLanguage(lang: LanguageCode): boolean;
}
```

### Service Interface Updates

Each service should report its supported languages so the UI can:
- Show/hide services based on selected language
- Warn users when switching to an unsupported language
- Fall back gracefully when a service doesn't support the language

### Cache Considerations

- Cache keys should include language: `{word}:{language}:{service}`
- Clear cache when language changes (or maintain per-language caches)

### UI Considerations

- Language names should be displayed in their native script + English
- Consider using Obsidian's locale for default language detection
- Show coverage indicator (X of Y services support this language)

---

## Language Detection Options

Rather than requiring users to manually set a language, automatic detection could improve UX significantly. Here are the options from most to least granular:

### Option 1: Per-Word Detection ⚠️ PROBLEMATIC

**The Challenge:** Single words are extremely difficult to detect reliably.

| Library | Min Text Length | Single Word Accuracy |
|---------|-----------------|---------------------|
| **Franc** | 10+ chars recommended | Poor - returns "undetermined" |
| **CLD/CLD2** | Short text OK | Better, but still unreliable |
| **ELD** | Short sentences | Not designed for single words |
| **languagedetect** | Multiple words | Poor for single words |

**Why it fails:**
- Many words exist in multiple languages (e.g., "communication" is English and French)
- Short text lacks statistical patterns needed for n-gram analysis
- Libraries support 50-400+ languages, increasing confusion on small samples

**API Services for Single Words:**
- [Detect Language API](https://detectlanguage.com/) - Claims single-word support, 216 languages
- [Languagelayer API](https://languagelayer.com/) - 173 languages, handles short text
- Google Cloud Translation API - Can use country hints to disambiguate

**Verdict:** Not recommended as primary approach. Too unreliable and would require API calls.

---

### Option 2: Sentence/Paragraph Detection ✓ VIABLE

Detecting the language of the surrounding sentence or paragraph is much more reliable.

**Recommended Libraries:**

| Library | Languages | Size | Speed | Best For |
|---------|-----------|------|-------|----------|
| **franc** | 82-419 | 200KB-2MB | Slower | Accuracy, many languages |
| **franc-min** | 82 | 200KB | Moderate | Good balance |
| **cld3-asm** | 107 | 7MB | Fast | Speed, browser-safe |
| **ELD** | 60 | ~150KB | Fast | Short sentences |

**Implementation Approach:**
```typescript
// Get surrounding context
const sentence = getSentenceAroundCursor(editor);
const detectedLang = franc(sentence, { minLength: 10 });

// Fall back to paragraph if sentence too short
if (detectedLang === 'und') {
  const paragraph = getParagraphAroundCursor(editor);
  detectedLang = franc(paragraph);
}
```

**Pros:**
- Works offline (no API calls)
- Reasonably accurate for sentences 10+ chars
- Can bundle with plugin

**Cons:**
- Adds ~200KB-2MB to plugin size
- Still unreliable for very short text
- May detect wrong language in multilingual documents

---

### Option 3: Document-Level Detection ✓ VIABLE

Detect the dominant language of the entire document once, cache it.

**Implementation:**
```typescript
// On file open or first lookup
const docContent = editor.getValue();
const docLanguage = franc(docContent.slice(0, 1000)); // Sample first 1000 chars
cacheDocumentLanguage(file.path, docLanguage);
```

**Pros:**
- Most reliable detection (large text sample)
- Only runs once per document
- Can be cached in frontmatter

**Cons:**
- Doesn't handle multilingual documents
- May be wrong for documents with lots of code/non-text

---

### Option 4: Frontmatter/Metadata ✓ RECOMMENDED

Allow users to specify language in YAML frontmatter:

```yaml
---
lang: fr
---
```

This is how the existing [Obsidian Dictionary plugin](https://github.com/phibr0/obsidian-dictionary) handles it.

**Pros:**
- Explicit, always correct
- No detection overhead
- User has full control
- Standard practice (HTML `lang` attribute)

**Cons:**
- Requires user action
- Not automatic

---

### Option 5: Obsidian Locale ✓ EASY DEFAULT

Get Obsidian's UI language as default:

```typescript
const obsidianLang = window.localStorage.getItem('language') || 'en';
```

**Available values:** `en`, `zh`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `pt`, `ru`, etc.

**Pros:**
- Zero effort for users
- Reasonable default assumption
- No additional dependencies

**Cons:**
- UI language ≠ writing language
- Some users write in multiple languages

---

### Recommended Hybrid Approach

Combine multiple strategies with clear priority:

```
1. Frontmatter `lang` field (explicit override) → Highest priority
2. Document-level detection (cached per file)
3. Obsidian locale setting (fallback default)
4. Plugin settings default language (ultimate fallback)
```

**User Experience:**
- Works automatically for most users (Obsidian locale)
- Power users can set per-document via frontmatter
- Document detection provides smart behavior for mixed-language vaults

**Implementation Complexity:** Moderate
- Add `franc-min` dependency (~200KB)
- Cache detected languages per file path
- Check frontmatter on file open
- Fall back through priority chain

---

### Language Detection Libraries Comparison

| Library | npm Package | Size | Languages | Accuracy | Browser? |
|---------|-------------|------|-----------|----------|----------|
| Franc | `franc` | 2MB | 419 | High | Yes |
| Franc-min | `franc-min` | 200KB | 82 | High | Yes |
| CLD3-asm | `cld3-asm` | 7MB | 107 | Very High | Yes |
| ELD | `eld` | 150KB | 60 | High | Yes |
| languagedetect | `languagedetect` | 1MB | 52 | Medium | Yes |

**Recommendation:** `franc-min` for best size/accuracy/language-coverage balance.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API changes/deprecation | Service unavailable | Multiple services per language |
| Quality varies by language | Poor user experience | Show quality indicators, prioritize reliable services |
| Large dictionary downloads | Storage/bandwidth | Lazy download, progress indicators |
| Complex maintenance | Developer burden | Clear abstraction layer for language handling |

---

## Conclusion

Multi-language support is **definitely feasible** with the following approach:

1. **Phase 1** - Immediate multi-language support by removing hardcoded English values from Altervista, Free Dictionary, and Datamuse
2. **Phase 2** - Add proper settings UI for language selection and detection
3. **Phase 3** - Enable spell-checking in multiple languages via NSpell dictionaries
4. **Phase 4** - Add Open Multilingual WordNet for offline multi-language thesaurus (~200 lines of code)
5. **Phase 5** (optional) - Add maximum coverage via Wiktionary or premium APIs (Lexicala, Yandex)

The modular service architecture makes this extension natural. Most work is configuration rather than fundamental redesign.

**Key insight:** The Open Multilingual WordNet, initially assessed as "high effort," is actually **moderate effort** when using the Tab-separated format. It provides offline support for 37+ languages with quality comparable to the current English WordNet.

**Recommended first milestone:** Support the top 10 languages (English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese) through Free Dictionary + Altervista + OMW modifications.

---

## Sources

### Dictionary/Thesaurus APIs
- [Free Dictionary API](https://dictionaryapi.dev/)
- [Altervista Thesaurus](https://thesaurus.altervista.org/service)
- [Datamuse API](https://www.datamuse.com/api/)
- [Open Multilingual WordNet](https://omwn.org/)
- [wooorm/dictionaries (NSpell)](https://github.com/wooorm/dictionaries)
- [Lexicala API](https://api.lexicala.com/)
- [PONS API](https://en.pons.com/p/online-dictionary/developers/api)
- [Yandex Dictionary](https://yandex.com/dev/dictionary)
- [Oxford Dictionaries API](https://developer.oxforddictionaries.com/)

### Language Detection
- [Franc - Natural language detection](https://github.com/wooorm/franc)
- [ELD - Efficient Language Detector](https://github.com/nitotm/efficient-language-detector-js/)
- [Detect Language API](https://detectlanguage.com/)
- [Languagelayer API](https://languagelayer.com/)
- [Obsidian Forum - Getting Obsidian's language](https://forum.obsidian.md/t/a-way-to-get-obsidian-s-currently-set-language/17829)
- [Obsidian Dictionary Plugin](https://github.com/phibr0/obsidian-dictionary)
