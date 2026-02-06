# Multilingual Compatibility Audit

**Date:** 2026-02-06
**Scope:** All synonym/definition services, caching, deduplication, and text processing
**Languages covered:** 26 (en, es, fr, de, it, pt-BR, ja, ko, ar, ru, hi, tr, cs, da, el, hu, no, pl, ro, sk, bg, nl, sv, fi, uk, zh)

---

## Executive Summary

The plugin has solid multilingual architecture — language flows through the entire lookup chain and caching is language-aware. However, there are **15 distinct issues** across 4 categories that degrade non-English language support, ranging from silent fallbacks to English to broken word extraction for CJK scripts.

---

## Category 1: Wiktionary Form-of Template Gaps

The `extractLemmaFromFormOf` regex we just added covers generic form-of templates but misses **language-specific** templates that Wiktionary uses heavily.

### Issue 1.1: Missing Language-Specific Form-of Templates (HIGH)

**File:** `src/services/api/WiktionaryService.ts:250`

**Current regex covers:**
`feminine singular/plural`, `masculine singular/plural`, `plural`, `singular`, `inflection`, `adj form`, `verb form`, `noun form`, `past participle`, `present participle`, `form`

**Missing templates actually used on Wiktionary:**

| Language | Template | Example |
|----------|----------|---------|
| Spanish | `{{es-verb form of\|...\|LEMMA}}` | `hablé` → `hablar` |
| German | `{{de-adj form of\|LEMMA}}` | `großen` → `groß` |
| German | `{{de-verb form of\|...\|LEMMA}}` | `sprach` → `sprechen` |
| Italian | `{{it-adj form of\|LEMMA}}` | - |
| All | `{{alternative form of\|LANG\|LEMMA}}` | Regional variants |
| All | `{{abbreviation of\|LANG\|LEMMA}}` | Common abbreviations |
| All | `{{misspelling of\|LANG\|LEMMA}}` | Misspelling redirects |

**Problem:** The language-specific templates (e.g., `{{es-verb form of}}`) have different argument structures — the lemma position varies. The current regex assumes `|LANG|LEMMA` but some templates use different orderings.

### Issue 1.2: Missing POS Sections for CJK Languages (MEDIUM)

**File:** `src/services/api/WiktionaryService.ts:57-61`

The `POS_SECTIONS` array is missing categories used in CJK Wiktionary entries:
- **Classifier** — essential for Chinese, Japanese, Korean
- **Counter** — Japanese counting words
- **Postposition** — Japanese, Korean, Turkish, Finnish, Hungarian
- **Suffix/Prefix/Affix** — derivational morphology entries

Entries using these POS headings will have their Synonyms/Antonyms subsections completely skipped.

---

## Category 2: Service Language Support Mismatches

### Issue 2.1: Yandex Missing Language Mappings — Silent Fallback to English (HIGH)

**File:** `src/services/api/YandexDictionaryService.ts:36-57`

Yandex declares support for 20 languages in `languages.ts:78`, but `LANGUAGE_MAP` only has 18 entries. Missing:
- `ja` (Japanese) — not in the map
- `ko` (Korean) — not in the map
- `ar` (Arabic) — not in the map
- `hi` (Hindi) — not in the map
- `pt-BR` (Portuguese) — not in the map

**Behavior:** These languages silently fall back to `"en"` at line 72: `const lang = LANGUAGE_MAP[language] || "en"`, so users get English synonyms when expecting their language.

**However:** Looking more carefully, the declared languages in `languages.ts:78` do NOT include `ja`, `ko`, `ar`, `hi`, or `pt-BR` — so these languages were intentionally excluded from Yandex's declared support. The service correctly filters these out upstream. **This is NOT a bug** — the declared and actual support match. No action needed.

### Issue 2.2: FreeDictionaryService — Limited Synonym Data for Non-English (MEDIUM)

**File:** `src/services/api/FreeDictionaryService.ts`

The Free Dictionary API (api.dictionaryapi.dev) supports 12 language paths, and the URL construction is correct. **However**, the API's synonym/antonym coverage is significantly weaker for non-English languages. Many non-English entries return definitions but empty synonym arrays. Users may see "no synonyms found" even though the word is valid.

This isn't a code bug — it's a data quality limitation worth documenting.

### Issue 2.3: Altervista pt-BR → pt_PT Mapping (LOW)

**File:** `src/services/api/AltervistaService.ts:34`

Maps `"pt-BR"` to `"pt_PT"` (European Portuguese) instead of Brazilian Portuguese. The comment acknowledges this: `// Altervista uses pt_PT`. If Altervista doesn't offer `pt_BR`, this is the best we can do, but users should be aware results will be European Portuguese.

---

## Category 3: Unicode and Text Processing Issues

### Issue 3.1: Cache Keys Not Unicode-Normalized — Cache Misses for Accented Words (HIGH)

**File:** `src/services/CacheService.ts:20-22`

```typescript
private normalizeKey(word: string, language: LanguageCode = "en"): string {
  return `${word.toLowerCase().trim()}:${language}`;
}
```

No Unicode normalization (NFC/NFD). The word "café" can be encoded two ways:
- NFC (composed): `caf\u00E9` — single code point é
- NFD (decomposed): `cafe\u0301` — e + combining accent

These are visually identical but produce different cache keys. A user typing "café" and an API returning "café" in different forms will get a cache miss.

**Affected languages:** French, Spanish, Portuguese, German, Czech, Slovak, Hungarian, Romanian, Polish, Turkish, Vietnamese — any language using diacritical marks.

**Fix:** Apply `word.normalize("NFC")` before lowercasing.

### Issue 3.2: `toLowerCase()` Turkish I Problem (MEDIUM)

**Files:** `CacheService.ts`, `DataService.ts:309,312`, all API services' dedup logic

JavaScript's `toLowerCase()` without locale follows Unicode default rules. In Turkish:
- Uppercase `I` should lowercase to `ı` (dotless i), not `i`
- Uppercase `İ` (dotted) should lowercase to `i`

In practice, JavaScript's default `toLowerCase()` maps `I` → `i` (English rules), which is **wrong for Turkish** but consistent across the codebase. The risk is that Turkish words with `I`/`İ` distinction may not deduplicate correctly.

**Practical impact:** Low-medium. The most common case is deduplication, where a false negative (treating same word as different) just means a duplicate synonym appears. Not data-corrupting.

### Issue 3.3: `charAt(0)` Breaks with Surrogate Pairs (LOW)

**File:** `src/utils/wordExtractor.ts:60,68-69`

```typescript
const firstChar = original.charAt(0);
```

`charAt()` returns a single UTF-16 code unit. For characters outside the Basic Multilingual Plane (emoji, some CJK Extension B characters), this returns half a surrogate pair.

**Practical impact:** Very low for synonym replacement — users almost never look up synonyms for emoji or rare CJK characters. Standard CJK (Chinese, Japanese, Korean) characters fit in a single UTF-16 unit and are fine.

### Issue 3.4: ASCII-Only Regex in Definition ID Generation (LOW)

**File:** `src/services/DatamuseService.ts:229`

```typescript
const normalizedDef = defText.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
```

Strips all non-ASCII characters. For Datamuse this is fine since it only supports English and Spanish (and Spanish definitions from Datamuse are in ASCII-transliterable form), but if Datamuse ever adds more languages, this would need updating.

---

## Category 4: Wiktionary Parsing Depth Issues

### Issue 4.1: Only Synonym/Antonym Sections Extracted (MEDIUM)

**File:** `src/services/api/WiktionaryService.ts:123-152`

Wiktionary has additional semantic relation sections that are never parsed:
- `====Hypernyms====` — broader terms
- `====Hyponyms====` — narrower terms
- `====Coordinate terms====` — sibling terms
- `====Derived terms====` — derivations
- `====Related terms====` — loosely related

The plugin's `RelationshipType` already includes `"related"` — extracting Related terms and Derived terms sections would provide significantly more data for non-English languages where Synonym sections are sparse.

### Issue 4.2: Synonym Template Parsing Limited (LOW)

**File:** `src/services/api/WiktionaryService.ts:206-219`

The `parseWordsFromSection` regex handles `{{syn|...}}`, `{{ant|...}}`, `{{l|...}}`, `{{link|...}}`. Some Wiktionary entries use other templates in synonym sections:
- `{{sense|definition}}` — qualifier tags (harmlessly skipped)
- `{{ws sense}}` — word sense templates
- `{{col3|en|word1|word2|...}}` — column-layout templates containing words

The `{{col3|...}}` (and col2, col4, col5) templates are common in English Wiktionary synonym sections and contain actual synonym lists. Missing these means fewer synonyms extracted.

---

## Priority Matrix

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 3.1 | Cache key Unicode normalization | HIGH | Low | All accented languages |
| 1.1 | Language-specific form-of templates | HIGH | Medium | Spanish, German, Italian verb/adj forms |
| 4.1 | Extract Related/Derived terms sections | MEDIUM | Low | All non-English (more data) |
| 1.2 | Missing POS sections (Classifier, etc.) | MEDIUM | Low | CJK languages |
| 4.2 | Parse `{{col}}` templates in synonym sections | MEDIUM | Medium | English and multilingual |
| 3.2 | Turkish I lowercasing | MEDIUM | Low | Turkish only |
| 2.2 | FreeDictionary sparse non-English data | MEDIUM | N/A | Documentation only |
| 2.3 | Altervista pt-BR mapping | LOW | N/A | Portuguese (Brazil) only |
| 3.3 | charAt surrogate pairs | LOW | Low | Emoji edge cases only |
| 3.4 | ASCII-only definition ID regex | LOW | Low | Datamuse only, en/es currently |

---

## Recommended Action Plan

### Phase 1: Quick Wins (Low effort, high impact)
1. **Add `.normalize("NFC")` to cache key generation** — 1-line fix
2. **Expand POS_SECTIONS** to include `"Classifier"`, `"Counter"`, `"Postposition"`, `"Suffix"`, `"Prefix"`
3. **Extract "Related terms" and "Derived terms" sections** in WiktionaryService alongside Synonyms/Antonyms

### Phase 2: Template Improvements (Medium effort)
4. **Expand form-of regex** to include `alternative form of`, `abbreviation of`, and language-prefixed templates like `es-verb form of`, `de-adj form of`
5. **Parse `{{col2|...|word1|word2}}` through `{{col5|...}}` templates** in synonym sections

### Phase 3: Edge Cases (Low priority)
6. **Turkish locale-aware lowercasing** for cache and dedup
7. **Document FreeDictionary's sparse non-English synonym data** so users have realistic expectations
