# Local/Offline Synonym and Definition Options

## Executive Summary

For an Obsidian plugin, the best options balance file size, data quality, license compatibility, and ease of integration. Top recommendations:

1. **Moby Thesaurus** - Best for pure synonyms (public domain, ~7.7MB compressed)
2. **Open English WordNet JSON** - Best for rich lexical data (CC-BY 4.0, ~11MB compressed)
3. **npm `synonyms` package** - Best for quick integration (~0.7MB minified)

---

## Recommended: Moby Thesaurus

### Overview
The largest English-language thesaurus, placed in public domain by Grady Ward in 1996.

### Key Stats
- **30,000+ root words**
- **2.5 million synonyms and related terms**
- **7.7MB compressed** (24MB uncompressed)
- **License: Public Domain** - No restrictions whatsoever

### Format
Simple ASCII text format:
```
word,synonym1,synonym2,synonym3,...
```

### Sources
- [Project Gutenberg](https://www.gutenberg.org/ebooks/3202)
- [GitHub (words/moby)](https://github.com/words/moby)

### Pros
- Public domain, no attribution needed
- Massive synonym coverage
- Simple format, easy to parse
- Small compressed size for download

### Cons
- No definitions
- No part-of-speech tagging
- No semantic relationships

---

## Alternative: Open English WordNet

### Overview
A modern, actively maintained fork of Princeton WordNet with annual releases.

### Key Stats
- **135,969 words** (Standard) / **161,875 words** (Plus Edition)
- **107,519 synsets** with definitions
- **~11MB compressed**
- **License: CC-BY 4.0** - Requires attribution only

### Available Formats
| Format | Source |
|--------|--------|
| WNDB (zipped) | [en-word.net](https://en-word.net/) |
| JSON | [x-englishwordnet/json](https://github.com/x-englishwordnet/json) |
| SQLite | [x-englishwordnet/sqlite](https://github.com/x-englishwordnet/sqlite) |

### Pros
- Includes definitions, examples, semantic relationships
- Actively maintained with annual releases
- Multiple format options
- Permissive license

### Cons
- Larger file size
- More complex data structure
- Requires processing to extract synonyms

---

## Quick Integration: `synonyms` npm Package

### Overview
A lightweight npm package with bundled synonym data.

### Key Stats
- **27,779 words**
- **0.7MB minified**
- **License: MIT**

### Usage
```javascript
var synonyms = require("synonyms");
synonyms("screen");      // Returns {noun: [...], verb: [...]}
synonyms("screen", "v"); // Returns verb synonyms only
```

### Pros
- Smallest footprint
- Part-of-speech support
- Ready to use, no parsing needed
- Easy to extend via src.json

### Cons
- Smaller word coverage than Moby
- No definitions

### Source
- [GitHub](https://github.com/FinNLP/synonyms)

---

## Other Options Considered

### Princeton WordNet
- **155,327 words** in **175,979 synsets**
- **34MB uncompressed** (10MB compressed)
- BSD-style license
- Complex data structure
- [wordnet-db npm package](https://www.npmjs.com/package/wordnet-db)

### MyThes / OpenOffice Thesaurus
- ~18MB for English
- BSD License
- Includes part-of-speech tags
- Two-file format requires custom parser
- [GitHub](https://github.com/hunspell/mythes)

---

## Recommendation for SynoFinder

### Hybrid Approach
1. **Bundle** the `synonyms` npm package (0.7MB) for instant offline use
2. **Optional download** of Moby Thesaurus for users wanting comprehensive coverage
3. Store downloaded data in plugin's data folder

### Implementation Notes
- Download Moby data on first use (not bundled with plugin)
- Convert Moby text format to JSON for efficient lookup
- Use IndexedDB or plugin's data API for storage

---

## License Compatibility Summary

| Resource | License | Commercial OK | Attribution Required |
|----------|---------|---------------|---------------------|
| Moby Thesaurus | Public Domain | Yes | No |
| Open English WordNet | CC-BY 4.0 | Yes | Yes |
| `synonyms` npm | MIT | Yes | No |
| Princeton WordNet | BSD-style | Yes | Yes |
| MyThes | BSD | Yes | No |

All options are compatible with open-source Obsidian plugins.
