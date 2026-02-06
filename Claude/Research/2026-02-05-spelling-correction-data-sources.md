# Spelling Correction Data Sources Research

**Date:** 2026-02-05
**Topic:** Downloadable spelling correction dictionaries for multilingual support

## Summary

**OMW cannot be used for spell checking.** Hunspell dictionaries remain the best option, and the current source (wooorm/dictionaries) is the optimal choice.

---

## Can OMW Be Used for Spell Checking?

**No.** Open Multilingual Wordnet (and WordNet in general) is unsuitable for spell checking because:

1. **Limited word coverage** - WordNet only contains "open-class words": nouns, verbs, adjectives, and adverbs. It excludes:
   - Determiners (the, a, an)
   - Prepositions (in, on, at)
   - Pronouns (he, she, they)
   - Conjunctions (and, but, or)
   - Particles (up, off, out)

2. **Incomplete vocabulary** - WordNet contained only 74% of words in COMLEX (a standard 39,143-word lexicon). Many everyday words are missing.

3. **No inflected forms** - WordNet cannot generate plural forms, verb conjugations, or other inflections. The morphology component is unidirectional (can strip endings but not generate them).

4. **No domain-specific terminology** - Excludes technical and specialized vocabulary.

**Conclusion:** OMW is excellent for synonyms and definitions (its current use in Wordsmith) but fundamentally cannot provide spell checking.

---

## Best Hunspell Dictionary Source

### Recommended: wooorm/dictionaries (already in use)

**Repository:** https://github.com/wooorm/dictionaries

This is the optimal source for several reasons:

1. **92 dictionaries available** - Comprehensive language coverage
2. **Normalized format** - All dictionaries converted to UTF-8
3. **Consistent access** - Same URL pattern for all languages
4. **Well-maintained** - Active repository that crawls and updates from upstream sources
5. **BCP-47 codes** - Uses standardized language codes

**URL Pattern:**
```
https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/{code}/index.dic
https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/{code}/index.aff
```

### Available Languages (92 total)

| Region | Languages |
|--------|-----------|
| **Major European** | bg, ca, cs, da, de, de-at, de-ch, el, en, en-au, en-ca, en-gb, en-za, es (+ 18 regional variants), et, fi, fo, fr, hr, hu, is, it, lt, lv, mk, nl, nb, nn, pl, pt, pt-pt, ro, ru, sk, sl, sr, sr-latn, sv, sv-fi, uk |
| **Celtic/Regional** | br, cy, eu, fur, fy, ga, gd, gl, lb, ltg, nds, oc |
| **Other** | eo, fa, he, hy, hyw, ia, ie, ka, ko, la, mn, ne, rw, tk, tlh, tlh-latn, tr, vi |

### Current Wordsmith Language Support Mapping

| Wordsmith Code | wooorm Code | Status |
|----------------|-------------|--------|
| en | en | Available |
| es | es | Available (+ 18 variants) |
| fr | fr | Available |
| de | de | Available (+ at, ch) |
| it | it | Available |
| pt-BR | pt | Available (pt = Brazilian) |
| ja | - | **Not available** |
| ko | ko | Available |
| ar | - | **Not available** |
| ru | ru | Available |
| hi | - | **Not available** |
| tr | tr | Available |
| cs | cs | Available |
| da | da | Available |
| el | el | Available |
| hu | hu | Available |
| no | nb, nn | Available (Bokmål, Nynorsk) |
| pl | pl | Available |
| ro | ro | Available |
| sk | sk | Available |

**17 of 20 Wordsmith languages have Hunspell dictionaries available.**

Missing: Japanese (ja), Arabic (ar), Hindi (hi)

---

## Alternative Sources (Reference)

### 1. SourceForge Hunspell
- **URL:** https://sourceforge.net/projects/hunspell/
- **Notes:** Original upstream source, but less organized

### 2. OpenOffice Extensions
- **URL:** https://www.openoffice.org/lingucomponent/dictionary.html
- **Notes:** Dictionaries as .oxt extensions (zip files)

### 3. Mozilla/Firefox Dictionaries
- **URL:** https://wiki.mozilla.org/L10n:Dictionaries
- **Notes:** Distributed as add-ons

### 4. LibreOffice Extensions
- **Notes:** Similar to OpenOffice, .oxt format

### 5. Language-Specific Projects
- **Ukrainian:** https://github.com/brown-uk/dict_uk
- **Hungarian:** Magyar Ispell project
- Many others maintained by language communities

**Why wooorm is better:** Aggregates from all these sources, normalizes to UTF-8, and provides consistent programmatic access.

---

## Implementation Recommendations

### 1. Extend NSpellService for Multilingual Support

Current implementation only supports English. Extend to support all 92 wooorm languages:

```typescript
// URL builder for any language
function getHunspellURL(langCode: string, type: 'dic' | 'aff'): string {
  return `https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/${langCode}/index.${type}`;
}
```

### 2. Language Code Mapping

Create mapping from Wordsmith codes to wooorm codes (handling variants):

```typescript
const wordsmithToHunspell: Record<string, string> = {
  'en': 'en',        // or 'en-gb', 'en-au', etc.
  'es': 'es',        // or regional variants
  'pt-BR': 'pt',     // Brazilian Portuguese
  'no': 'nb',        // Norwegian Bokmål (primary)
  // ... etc
};
```

### 3. Settings Structure

Track downloaded Hunspell dictionaries similar to OMW:

```typescript
interface WordsmithSettings {
  // ... existing
  hunspellDownloaded: Partial<Record<HunspellLangCode, boolean>>;
}
```

### 4. Cache Structure

Store in language-specific files:
```
cache/nspell/{code}.dic
cache/nspell/{code}.aff
```

### 5. UI Integration

Add to Language Settings tab similar to OMW language management:
- List available Hunspell dictionaries
- Download/delete per language
- Show download progress
- Indicate which languages lack Hunspell support

---

## Size Considerations

Dictionary sizes vary significantly:

| Language | Approximate .dic + .aff Size |
|----------|------------------------------|
| English | ~1.5 MB |
| German | ~3 MB |
| French | ~1 MB |
| Spanish | ~0.8 MB |
| Polish | ~4 MB |
| Dutch | ~1.5 MB |

**Total for all 92 languages:** Estimated 100-150 MB

Recommend downloading on-demand rather than bundling.

---

## References

- [wooorm/dictionaries](https://github.com/wooorm/dictionaries) - Primary recommended source
- [nspell](https://github.com/wooorm/nspell) - JavaScript Hunspell implementation
- [Hunspell Official](http://hunspell.github.io/) - Hunspell project
- [WordNet FAQ](https://wordnet.princeton.edu/frequently-asked-questions) - WordNet limitations
- [SCOWL Word Lists](http://wordlist.aspell.net/) - Alternative word lists
