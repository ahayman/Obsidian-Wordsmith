# Moby Thesaurus II - Comprehensive Data Source Documentation

## Overview

The Moby Thesaurus II is a public domain lexical resource created by Grady Ward as part of the Moby Project. It is the largest English-language thesaurus available in the public domain, originally released in 1996 and now distributed through Project Gutenberg and various GitHub repositories.

## Data Source in This Plugin

### Download URL
```
https://raw.githubusercontent.com/words/moby/master/words.txt
```

This file is hosted by the [words/moby](https://github.com/words/moby) project on GitHub, which provides both the original Moby Thesaurus data and supplementary data from the OpenOffice thesaurus.

### Cache Location
The downloaded data is cached locally at:
```
{pluginDir}/cache/moby.txt
```

## Data Format and Structure

### File Format
- **Type**: Flat-file ASCII text
- **Encoding**: ASCII (accents stripped from words, e.g., "etude" instead of "etude")
- **Record Delimiter**: Carriage return/linefeed (ASCII 13/10)
- **Field Delimiter**: Comma-separated values (CSV)

### Record Structure
Each line follows this format:
```
rootword,related1,related2,related3,...,relatedN
```

- **First field**: The root/headword for the entry
- **Subsequent fields**: All related terms (synonyms and associated words)
- **Ordering**: Related words are listed in ASCII alphabetical order
- **Trailing comma**: Each entry, including the root, ends with a comma

### Example Entry
For the word "frill", the entry contains 200+ related terms including:
```
frill,adornment,amenity,beading,beauties,benefit,binding,bonus,bordering,...
```

## Statistics

| Metric | Value |
|--------|-------|
| Root Words | 30,260 |
| Total Synonyms/Related Terms | 2,520,264 |
| Average Terms per Root Word | 83.3 |
| Approximate File Size | ~26 MB (uncompressed) |

## Data Characteristics

### What the Data Provides
1. **Root words**: The primary lookup term
2. **Related terms**: A flat list of synonyms, near-synonyms, and semantically related words
3. **Extensive coverage**: Very large synonym sets per word (averaging 83+ terms)

### What the Data Does NOT Provide
1. **Part of Speech (POS)**: No grammatical category information
2. **Definitions**: No word meanings or explanations
3. **Relationship Types**: No distinction between:
   - True synonyms
   - Antonyms
   - Hypernyms (broader terms)
   - Hyponyms (narrower terms)
   - Related words
4. **Word Senses**: No disambiguation of different meanings
5. **Usage Context**: No formality levels, domains, or register information
6. **Accented Characters**: All diacritical marks are stripped

## Plugin Implementation Analysis

### How MobyService Uses the Data

From `/Users/aaronhayman/Projects/ObsidianSynoFinder/src/services/MobyService.ts`:

```typescript
// Data structure: Map<headword, related_words[]>
private data: Map<string, string[]> | null = null;

// Parsing logic
private parseData(content: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split(",");
    if (parts.length < 2) continue;

    const headWord = parts[0].toLowerCase().trim();
    const relatedWords = parts.slice(1).map((w) => w.trim()).filter((w) => w.length > 0);

    if (headWord && relatedWords.length > 0) {
      map.set(headWord, relatedWords);
    }
  }

  return map;
}
```

### Result Type
All Moby results are returned as `type: "related"` because the data source does not distinguish between synonyms and other relationship types:

```typescript
return relatedWords.map((relatedWord) => ({
  word: relatedWord,
  type: "related" as const,
  source: "moby" as const,
}));
```

## Grouping Capabilities

### Current Limitations
The Moby Thesaurus provides **no inherent grouping** of related terms. All words are presented as a flat, alphabetically-sorted list without:
- Semantic clustering
- Part-of-speech grouping
- Sense-based organization

### Potential Workarounds
1. **Cross-reference with Part-of-Speech data**: Grady Ward also released the Moby Part-of-Speech list (233,356 words with POS tags) as a separate file (`mposp10.zip` on Project Gutenberg)
2. **Use in combination with WordNet**: WordNet provides POS and sense disambiguation that could be used to categorize Moby results
3. **Score-based filtering**: The plugin could use heuristics like word frequency or edit distance to rank results

## Comparison with Other Thesaurus Sources

### Moby Thesaurus vs WordNet

| Feature | Moby Thesaurus | WordNet |
|---------|----------------|---------|
| Total Words | 30,260 root words | ~117,000 synsets |
| Synonyms per Word | ~83 average | ~5-10 per synset |
| Part of Speech | No | Yes |
| Definitions | No | Yes |
| Semantic Relations | No (flat list) | Yes (hypernyms, hyponyms, etc.) |
| Sense Disambiguation | No | Yes |
| Public Domain | Yes | Yes (WordNet License) |
| Data Format | Simple CSV | Complex relational |

**Example**: The word "good" has:
- **Moby**: 666 related terms
- **WordNet**: 107 synonyms (across multiple senses)

### Moby vs Datamuse API

| Feature | Moby Thesaurus | Datamuse API |
|---------|----------------|--------------|
| Access | Offline (downloaded) | Online API |
| Synonyms | Yes (as "related") | Yes (rel_syn) |
| Antonyms | No | Yes (rel_ant) |
| Hypernyms | No | Yes (rel_spc) |
| Hyponyms | No | Yes (rel_gen) |
| Part of Speech | No | Yes |
| Definitions | No | Yes |
| Rate Limits | None | 100,000/day |
| Data Source | Moby Project | WordNet + crawled dictionaries |

### Moby vs Big Huge Thesaurus API

| Feature | Moby Thesaurus | Big Huge Thesaurus |
|---------|----------------|-------------------|
| Access | Offline | Online API (key required) |
| Synonyms | Yes | Yes |
| Antonyms | Mixed in | Yes (separate) |
| Part of Speech | No | Yes |
| Free Tier | Yes (public domain) | Limited |

## Historical Background

### Creator: Grady Ward
William Grady Ward (born April 4, 1951) is an American software engineer and lexicographer who created the Moby Project. He is also known for compiling and distributing the Moby Shakespeare, considered the most widely distributed works of Shakespeare in the world.

### Project History
- **Creation**: 1990s, manually curated by Grady Ward
- **Primary Sources**: 1911 edition of Roget's Thesaurus, supplemented with additional sources
- **Public Domain Release**: 1996
- **Project Gutenberg Distribution**: Available as ebook #3202

### Design Philosophy
From the original documentation:
> "The compiler emphasizes unusual and illuminating word relationships beyond standard synonyms."

This explains why entries contain many related terms that aren't strict synonyms, including:
- Conceptually related words
- Words from the same domain
- Obsolete or archaic terms
- Foreign words (primarily Latin)

## Licensing

The Moby Thesaurus is **fully public domain**:

> "The Moby lexicon project is complete and has been placed into the public domain. Use, sell, rework, excerpt and use in any way on any platform. Placing this material on internal or public servers is also encouraged."

This makes it ideal for inclusion in software projects without licensing concerns.

## Usage Recommendations

### Best Use Cases
1. **Offline synonym lookup**: When internet access is unavailable
2. **Brainstorming**: Finding unusual or unexpected related words
3. **Creative writing**: Discovering diverse vocabulary options
4. **Supplementary data**: Combining with other sources that provide POS/definitions

### Limitations to Consider
1. **No filtering by POS**: Cannot distinguish noun from verb forms
2. **Quality variance**: Some related terms may be loosely connected
3. **Missing modern words**: Dataset from 1996, lacks contemporary vocabulary
4. **Contains obsolete words**: Historical terms that may confuse users

### Complementary Data Sources
For a complete thesaurus solution, combine Moby with:
- **WordNet**: For POS, definitions, and semantic relationships
- **Datamuse**: For antonyms, hypernyms, and modern vocabulary
- **Part-of-Speech file**: Moby's separate POS database for filtering

## References

- [Moby Thesaurus on Project Gutenberg](https://www.gutenberg.org/ebooks/3202)
- [words/moby GitHub Repository](https://github.com/words/moby)
- [Moby Project Wikipedia](https://en.wikipedia.org/wiki/Moby_Project)
- [Original Moby Project Documentation](https://www.gutenberg.org/files/3202/3202-h/3202-0.htm)
- [Grady Ward Wikipedia](https://en.wikipedia.org/wiki/Grady_Ward)
