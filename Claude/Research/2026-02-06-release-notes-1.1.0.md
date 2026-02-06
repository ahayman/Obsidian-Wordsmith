# Wordsmith 1.1.0 Release Notes

## Multilingual Support

Wordsmith now supports **26 languages** for synonym lookup, spell checking, and language detection. Write in any supported language and Wordsmith will automatically detect it and use the appropriate services.

### Supported Languages

English, Spanish, French, German, Italian, Portuguese (Brazil), Japanese, Korean, Arabic, Russian, Hindi, Turkish, Czech, Danish, Greek, Hungarian, Norwegian, Polish, Romanian, Slovak, Bulgarian, Dutch, Swedish, Finnish, Ukrainian, and Chinese.

### Automatic Language Detection

Wordsmith detects the language of your text automatically using context around your cursor. Language can also be set explicitly via:
- Note frontmatter (`lang: fr`)
- Plugin settings (default language)
- Obsidian locale

Detection priority: frontmatter > auto-detect from context > settings default > Obsidian locale > English.

### Multilingual Spell Checking

Spell checking now works across all supported languages with downloadable Hunspell dictionaries. Misspelled words are detected in the correct language and spelling suggestions match the document language.

### Open Multilingual Wordnet (OMW)

Local synonym data has been expanded beyond English with Open Multilingual Wordnet support. OMW data can be downloaded per-language from settings, providing offline synonym lookup for many languages without requiring any API keys.

## New API Services

Three new API services are available:

- **Wiktionary** -- Free community dictionary supporting 25+ languages with synonyms, antonyms, and related terms. No API key required.
- **Lexicala** -- Multilingual dictionary API via RapidAPI supporting 50+ languages. Requires a RapidAPI key (free tier: 50 calls/day).
- **Yandex Dictionary** -- Free dictionary API with synonym support for 29 languages. Requires a free API key.

## Bug Fixes

- **Quick replace popover now detects language**: The quick entry popover previously always defaulted to English, ignoring the document language. It now performs the same language detection as the full modal.
- **Quick replace respects language when selecting services**: The popover now correctly skips services that don't support the detected language and finds the first service (in user-configured order) that does, matching the behavior of the full modal.
- **Wiktionary form-of following**: Inflected forms (e.g., French feminine "joyeuse") that are stub entries on Wiktionary now automatically follow form-of templates to the base/lemma form (e.g., "joyeux") to retrieve synonyms.
- **Altervista annotation stripping**: Altervista results with parenthesized annotations (e.g., "content (similar term)", "gai (familier)") are now kept with the annotation stripped, instead of being dropped entirely.
- **Language passed through to all service and cache calls**: Cache keys now include the language, preventing cross-language cache collisions.

## Settings Improvements

- Redesigned settings UI with cleaner visual layout.
- Each API service now displays which languages it supports.
- Language configuration is centralized with per-service language support clearly indicated.

## Internal

- Codebase reorganized: components moved to `src/components/`, types to `src/types/`.
- Test suite expanded significantly with per-service test files replacing a single monolithic test.
- Centralized language configuration in `src/data/languages.ts`.
- Added `LanguageDetectionService` and `LanguageResolver` for structured language resolution.
