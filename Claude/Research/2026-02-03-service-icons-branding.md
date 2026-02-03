# Thesaurus/Dictionary Service Icons and Branding Research

Date: 2026-02-03

## Summary

This research investigates whether the various thesaurus/dictionary services have official icons, logos, or branding assets that could be used in a UI. The findings reveal that **only Merriam-Webster has comprehensive official branding guidelines**, while most other services either have minimal branding or none at all.

---

## Service-by-Service Analysis

### 1. WordNet (Princeton) - Offline Dictionary

**Official Icon/Logo:** No dedicated logo
**Branding:** Uses Princeton University's general branding
**Symbol:** None specific to WordNet
**Notes:** WordNet is a registered trademark of Princeton University but does not appear to have its own distinct visual identity separate from Princeton's.

**Recommendation:** Use a generic book/dictionary icon or create a custom "WN" text icon.

---

### 2. Moby Thesaurus - Offline Thesaurus

**Official Icon/Logo:** Minimal branding
**Branding:** The GitHub project (words/moby) uses a closed book emoji (pencil emoji noted)
**Symbol:** None official
**Notes:** The project at moby-thesaurus.org has a text-based identity without a formal logo. A `moby-logo.svg` may exist in the `/public/images/` directory of the GitHub repo but contents are unverified.

**Recommendation:** Use a generic thesaurus/synonym icon or create a custom "M" text icon.

---

### 3. Datamuse API - Online Word API

**Official Icon/Logo:** No official logo found
**Branding:** Minimal - uses professional muted colors (#a1a181, #e1e1c1)
**Symbol:** None
**Notes:** Datamuse is an umbrella organization that includes OneLook and RhymeZone. The main site does not feature a distinct logo. Acknowledging Datamuse API is requested but no visual assets provided.

**Recommendation:** Use a generic API/cloud icon or create a custom "DM" text icon.

---

### 4. Merriam-Webster Dictionary/Thesaurus API

**Official Icon/Logo:** YES - Official logo with strict guidelines
**Branding Guidelines:** Comprehensive at [dictionaryapi.com/info/branding-guidelines](https://dictionaryapi.com/info/branding-guidelines)
**Symbol:** The distinctive Merriam-Webster logo

**Key Requirements:**
- Logo is MANDATORY in all applications using the API
- NO modifications or editing permitted
- Available sizes: 50px, 100px, or 125px (square)
- Official colors: Red (#D71920), White, Blue (#004990)
- Registration symbol (registered mark) must remain visible
- Alternative versions: black, grayscale, or lineart

**Download Files:**
- Light background version: `.ai` file available
- Dark background version: `.ai` file available
- PNG files available for web use

**Contact:** images@merriam-webster.com for logo assistance

**Recommendation:** MUST use official Merriam-Webster logo per their requirements.

---

### 5. Big Huge Thesaurus API (BigHugeLabs)

**Official Icon/Logo:** Text-based identity only
**Branding:** "Big Huge Thesaurus" text branding
**Symbol:** None
**Notes:** The site at words.bighugelabs.com focuses on text identity rather than visual logos. A Logopedia (Fandom) page exists but specific logo details not confirmed.

**Recommendation:** Use a generic thesaurus icon or create a custom "BHT" text icon.

---

### 6. Words API (RapidAPI/dpventures)

**Official Icon/Logo:** YES - Logo exists
**Branding:** Logo available at wordsapi.com
**Symbol:** Available in light and dark versions

**Assets Found:**
- `/images/logo.png` - Primary logo
- `/images/header-light.png` - Light theme header
- `/images/header-dark.png` - Dark theme header

**Trademark Notice:** The logo and trademarks are protected and usage may require permission per their Terms of Service.

**Recommendation:** Contact Words API for permission to use logo, or use generic icon if permission not obtained.

---

### 7. API Ninjas (Thesaurus Endpoint)

**Official Icon/Logo:** YES - Logo exists
**Branding:** Logo at `/images/apininjas_logo.png`
**Symbol:** Ninja-themed branding
**Notes:** The service has clear branding with their "ninja" theme. Logo appears in site navigation.

**Recommendation:** May need to contact API Ninjas for permission to use logo, or use a generic API icon.

---

### 8. Altervista Thesaurus API

**Official Icon/Logo:** No dedicated logo found
**Branding:** Minimal - "Thesaurus web service" text identity
**Symbol:** None
**Notes:** Service is hosted on Altervista platform. Uses OpenOffice thesaurus data. No specific branding guidelines found.

**Recommendation:** Use a generic thesaurus icon or create a custom "AV" text icon.

---

### 9. Free Dictionary API (dictionaryapi.dev)

**Official Icon/Logo:** No formal logo
**Branding:** Minimal and utilitarian
**Symbol:** None
**Notes:** Open-source project by meetDeveloper. Focuses on functionality over visual branding. No brand guidelines exist.

**Recommendation:** Use a generic dictionary/book icon or create a custom "FD" text icon.

---

### 10. nspell (Spell Checker)

**Official Icon/Logo:** Emoji-based identity only (pencil emoji)
**Branding:** Minimalist - part of unified.js ecosystem
**Symbol:** None formal
**Notes:** The project uses a pencil emoji as its visual identifier on GitHub. No official logo or branding assets exist.

**Recommendation:** Use a generic spell-check icon (pencil with checkmark, "ABC" with checkmark, etc.).

---

## Summary Table

| Service | Has Official Logo | Branding Requirements | Recommended Approach |
|---------|-------------------|----------------------|---------------------|
| WordNet | No | None | Generic book icon |
| Moby Thesaurus | No | None | Generic synonym icon |
| Datamuse API | No | Attribution requested | Generic API/cloud icon |
| Merriam-Webster | YES | MANDATORY logo use | Use official MW logo |
| Big Huge Thesaurus | No | None | Generic thesaurus icon |
| Words API | Yes | TOS restrictions | Request permission or generic |
| API Ninjas | Yes | Unknown | Request permission or generic |
| Altervista | No | None | Generic thesaurus icon |
| Free Dictionary API | No | None | Generic dictionary icon |
| nspell | No | None | Spell-check icon |

---

## Recommendations for UI Implementation

### Services Requiring Official Assets:
1. **Merriam-Webster** - MUST use official logo (mandatory per API terms)

### Services with Available Logos (Permission May Be Needed):
2. **Words API** - Has logo, check TOS for usage rights
3. **API Ninjas** - Has logo, check for branding guidelines

### Services Needing Generic Icons:
All others will need generic or custom-designed icons. Consider:

**Generic Icon Options:**
- **Book icon** - For dictionary services (WordNet, Free Dictionary)
- **Synonym/arrows icon** - For thesaurus services (Moby, Big Huge, Altervista)
- **Cloud/API icon** - For online API services (Datamuse)
- **Spell-check icon** - For nspell (ABC with checkmark, pencil with checkmark)

**Custom Text Icons:**
Creating simple text-based icons could work well:
- "WN" for WordNet
- "M" for Moby
- "DM" for Datamuse
- "BHT" for Big Huge Thesaurus
- "AV" for Altervista
- "FD" for Free Dictionary
- "ns" for nspell

### Color Suggestions for Custom Icons:
- Use neutral colors (grays, blues) for generic services
- Consider using service-specific colors where known (e.g., Merriam-Webster red/blue)

---

## Sources

- [Merriam-Webster Branding Guidelines](https://dictionaryapi.com/info/branding-guidelines)
- [WordNet Princeton](https://wordnet.princeton.edu/)
- [Moby Thesaurus GitHub](https://github.com/words/moby)
- [Big Huge Thesaurus](https://words.bighugelabs.com/site/about)
- [Datamuse](https://www.datamuse.com/)
- [Words API](https://www.wordsapi.com)
- [API Ninjas](https://api-ninjas.com)
- [Altervista Thesaurus](https://thesaurus.altervista.org/)
- [Free Dictionary API](https://dictionaryapi.dev/)
- [nspell GitHub](https://github.com/wooorm/nspell)
