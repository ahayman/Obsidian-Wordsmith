# Open Multilingual WordNet (OMW) Research

## 1. Overview

The Open Multilingual WordNet (OMW) is a large multilingual semantic lexicon that groups words into synonym sets (synsets) linked by semantic relations. It connects wordnets in multiple languages through a shared index of concepts based on Princeton WordNet principles.

### Purpose
- Make it easy to use wordnets in multiple languages
- Consolidate wordnets from multiple sources and languages
- Connect resources through a unified framework spanning 150+ languages

### Versions

#### OMW Version 1
- Links hand-curated and automatically-generated wordnets through Princeton WordNet of English (PWN 3.0)
- All non-English wordnets are mapped to PWN synset offsets
- Contains 28 hand-curated wordnets with redistributable licenses
- Extended data covers 150+ languages via Wiktionary and Unicode CLDR

#### OMW Version 2 (Experimental)
- Uses the Collaborative Interlingual Index (CILI) to link wordnets together
- More flexible architecture allowing concepts not present in English
- Independent synset creation for each language

### Licensing
All resources operate under open principles allowing free use, modification, and sharing by anyone for any purpose. Individual wordnets have their own licenses:
- CC BY 3.0 / CC BY 4.0
- CC BY-SA
- MIT License
- Princeton WordNet License

### Maintainers
- Francis Bond (Primary)
- Luis Morgado da Costa
- Michael Goodman

### Key References
- Bond and Paik (2012): Surveyed wordnets and licensing frameworks
- Bond et al. (2016): Introduced the Collaborative Interlingual Index (CILI)
- Bond and Foster (2013): OMW data packaging

---

## 2. Data Formats

The Global WordNet Association provides three equivalent formats for publishing WordNets. All formats can be converted between each other.

### 2.1 WN-LMF (Lexical Markup Framework) XML

The primary and most comprehensive format. XML schema based on ISO Lexical Markup Framework.

**DOCTYPE Declaration:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE LexicalResource SYSTEM "http://globalwordnet.github.io/schemas/WN-LMF-1.4.dtd">
<LexicalResource xmlns:dc="https://globalwordnet.github.io/schemas/dc/">
```

**DTD Versions Available:**
- WN-LMF-1.0.dtd
- WN-LMF-1.1.dtd
- WN-LMF-1.3.dtd
- WN-LMF-1.4.dtd (current)
- Relaxed variants for each version

### 2.2 JSON-LD Format

JSON structure mirroring XML using JSON-LD conventions:

```json
{
  "@context": "http://globalwordnet.github.io/schemas/wn-json-context-1.4.json",
  "@graph": [{
    "@id": "lexicon-id",
    "@type": "lime:Lexicon",
    "label": "Name",
    "language": "en",
    "entry": [...],
    "synset": [...]
  }]
}
```

**Part-of-speech values in JSON:**
- noun, verb, adjective, adverb, adjective_satellite
- phrase, conjunction, adposition, other, unknown

### 2.3 RDF/OntoLex Format

Uses W3C OntoLex Model with standard namespaces:
- Words = `ontolex:LexicalEntry`
- Senses = `ontolex:LexicalSense`
- Synsets = `ontolex:LexicalConcept`
- Definitions/examples = `skos:definition`, `skos:example`

### 2.4 Tab-Separated Format (OMW v1 Legacy)

Simple format used in OMW 1.x releases:

**Header:**
```
# name	lang	url	license
```

**Data rows:**
```
offset-pos	lang:lemma	word
offset-pos	lang:def	sid	definition
offset-pos	lang:exe	sid	example
```

**Field Specifications:**
- Offset: 8-digit Princeton WordNet 3.0 identifier
- POS: a (adjective), v (verb), n (noun), r (adverb)
- 's' (adjective satellite) mapped to 'a'
- Word separators normalized to space

---

## 3. File Structure

### WN-LMF XML Structure

```
LexicalResource
├── Lexicon (one per language/resource)
│   ├── @id, @label, @language, @email, @license, @version
│   ├── @url, @citation, @logo (optional)
│   ├── @status (valid/checked/unchecked)
│   ├── @confidenceScore (0-1)
│   ├── Requires (dependencies)
│   ├── LexicalEntry (words)
│   │   ├── @id, @index (normalized form)
│   │   ├── Lemma
│   │   │   ├── @writtenForm
│   │   │   ├── @partOfSpeech
│   │   │   └── Pronunciation (optional)
│   │   ├── Form (inflections)
│   │   ├── Sense
│   │   │   ├── @id, @synset, @n (sense order)
│   │   │   ├── SenseRelation
│   │   │   └── Example
│   │   └── SyntacticBehavior
│   └── Synset
│       ├── @id, @ili, @partOfSpeech, @members
│       ├── Definition
│       ├── ILIDefinition
│       ├── SynsetRelation
│       └── Example
└── LexiconExtension (extends base lexicons)
```

### OMW-Data Repository Structure

```
omw-data/
├── wns/                    # Wordnet data
│   ├── {lang}/            # Per-language directories
│   │   ├── wn-data-{lang}.tab   # Tab-separated data
│   │   └── {lang}.xml           # WN-LMF XML
│   └── cow/               # Chinese Open Wordnet
├── scripts/               # Build and processing
├── tests/                 # Test suite
├── etc/                   # Configuration
├── index.toml             # Citation metadata
├── build.sh               # Build script
├── package.sh             # Packaging script
└── validate.sh            # Validation tools
```

### Release Packages

Each language wordnet is distributed as:
- `.tar.xz` compressed archive
- Contains WN-LMF XML file
- LICENSE file included

---

## 4. Data Schema

### 4.1 Lexicon Element

Required attributes:
| Attribute | Description |
|-----------|-------------|
| id | Short resource name (e.g., "omw-en") |
| label | Full resource name |
| language | BCP-47 code (2-3 letters) |
| email | Contact address |
| license | URL to license document |
| version | Version identifier (preferably major.minor) |

Optional attributes:
| Attribute | Description |
|-----------|-------------|
| url | Project homepage |
| citation | Reference publication |
| logo | Image URL |
| status | valid/checked/unchecked |
| confidenceScore | 0-1 numeric value |

### 4.2 Lexical Entry (Word)

```xml
<LexicalEntry id="w1" index="god">
  <Lemma writtenForm="god" partOfSpeech="n"/>
  <Sense id="example-en-09528550-n" synset="example-en-09528550-n" n="1"/>
  <Sense id="example-en-10152827-n" synset="example-en-10152827-n" n="3"/>
</LexicalEntry>
```

**Lemma Requirements:**
- `writtenForm`: The word itself
- `partOfSpeech`: n, v, a, r, s, c, p, x, u

**Part of Speech Values:**
| Code | Meaning |
|------|---------|
| n | noun |
| v | verb |
| a | adjective |
| r | adverb |
| s | adjective satellite |
| c | conjunction |
| p | adposition |
| x | other |
| u | unknown |

### 4.3 Synsets

```xml
<Synset id="example-en-10161911-n" ili="i90287" partOfSpeech="n"
        members="example-en-god-n-1 example-en-deity-n-1">
  <Definition>supernatural being worshipped as controlling the world</Definition>
  <ILIDefinition>a supernatural being worshipped as controlling some part of the world</ILIDefinition>
  <SynsetRelation relType="hypernym" target="example-en-10152827-n"/>
</Synset>
```

**Synset Requirements:**
- `id`: Must start with lexicon id + dash
- `ili`: ILI identifier from CILI, or "in" for new concepts
- `partOfSpeech`: Same values as lemmas
- `members`: Ordered list of sense ids

**ILI Definition Requirements:**
- Minimum 20 characters or 5 words
- Must be in English
- Used for cross-lingual linking

### 4.4 Definitions

```xml
<Definition>A supernatural being worshipped as controlling the world</Definition>
<Definition dc:source="Webster">Definition from specific source</Definition>
```

Optional `sourceSense` attribute links definition to specific sense.

### 4.5 Relations

#### Synset Relations (Semantic)

**Hierarchical:**
| Relation | Description |
|----------|-------------|
| hypernym | Supertype (dog -> animal) |
| hyponym | Subtype (animal -> dog) |
| instance_hypernym | Type of instance (Manchester -> city) |
| instance_hyponym | Instance of type (city -> Manchester) |

**Meronymic (Part-Whole):**
| Relation | Description |
|----------|-------------|
| mero_member | Member meronym |
| mero_part | Part meronym |
| mero_substance | Substance meronym |
| mero_portion | Portion meronym |
| mero_location | Location meronym |
| holo_member | Member holonym |
| holo_part | Part holonym |
| holo_substance | Substance holonym |

**Other Semantic:**
| Relation | Description |
|----------|-------------|
| entails | A cannot occur unless B occurred |
| causes | A causes B |
| similar | Weak synonymy |
| attribute | Links nouns to adjectives |
| domain_region | Geographic domain |
| domain_topic | Topical domain |
| exemplifies | Example of domain |

#### Sense Relations

| Relation | Description |
|----------|-------------|
| antonym | Opposite meaning |
| derivation | Morphological derivation |
| participle | Participle form |
| pertainym | Pertains to |
| similar | Similar sense |

**Morphosemantic Relations:**
- agent, patient, result, instrument
- location, direction, target, source_direction
- material, property, state, undergoer
- uses, vehicle, body_part, event

```xml
<SynsetRelation relType="hypernym" target="wn-synset-B"/>
<SenseRelation relType="antonym" target="sense-id"/>
```

### 4.6 Pronunciation

```xml
<Pronunciation variety="en-GB-fonipa" phonemic="true">gɒd</Pronunciation>
<Pronunciation audio="https://example.com/god.mp3"/>
```

Attributes:
- `variety`: IETF language tag (e.g., en-GB-fonipa)
- `notation`: Additional dialect info
- `phonemic`: true/false for phonemic vs phonetic
- `audio`: URL to audio file

### 4.7 Grammatical Tags

```xml
<Tag category="gender">masculine</Tag>
<Tag category="number">singular</Tag>
```

---

## 5. Available Languages

### Core OMW 1.4 Wordnets (37 Languages)

| Language | Code | Synsets | License |
|----------|------|---------|---------|
| English (PWN 3.0) | eng | 117,659 | Princeton WN License |
| Japanese | jpn | 57,179 | CC BY |
| Finnish | fin | 116,763 | CC BY |
| Chinese (Open) | cmn | 42,312 | CC BY |
| Polish | pol | 33,826 | CC BY-SA |
| Portuguese | por | 43,895 | CC BY-SA |
| Italian | ita | 34,728 | CC BY |
| Spanish | spa | 38,512 | CC BY |
| French | fra | 59,091 | CC BY |
| Catalan | cat | 45,826 | CC BY |
| Basque | eus | 29,413 | CC BY |
| Indonesian | ind | 38,085 | MIT |
| Thai | tha | 73,350 | CC BY-SA |
| Greek | ell | 18,049 | Apache 2.0 |
| Dutch | nld | 30,177 | CC BY-SA |
| Slovak | slk | 18,507 | CC BY-SA |
| Lithuanian | lit | 9,462 | CC BY-SA |
| Slovenian | slv | 42,583 | CC BY-SA |
| Danish | dan | 4,476 | CC BY |
| Bulgarian | bul | 4,959 | CC BY |
| Arabic | arb | 9,916 | CC BY |
| Hebrew | heb | 5,448 | CC BY |
| Romanian | ron | 58,754 | CC BY-SA |
| Swedish | swe | 6,796 | CC BY |
| Icelandic | isl | 4,951 | CC BY |
| Galician | glg | 19,312 | CC BY |
| Croatian | hrv | 23,120 | CC BY |
| Albanian | als | 4,675 | CC BY |
| Norwegian Bokmal | nob | 4,455 | CC BY |
| Norwegian Nynorsk | nno | 3,671 | CC BY |
| Malay | zsm | 17,165 | MIT |

### Extended Coverage (150+ Languages)

Automatically extracted from Wiktionary and Unicode CLDR with estimated 94% accuracy.

### Quality Indicators
- Core synsets (~5,000) marked with special indicator
- Confidence scores (0-1) on elements
- Status flags: valid/checked/unchecked

---

## 6. Download Sources

### Primary Sources

**GitHub Repository:**
- https://github.com/omwn/omw-data
- Contains source data and build scripts

**Releases:**
- https://github.com/omwn/omw-data/releases

### OMW-Data v2.0 Release (February 2026)

| Package | Size | Description |
|---------|------|-------------|
| Complete (tar.xz) | 53.3 MB | All languages |
| English WN-3.0 | 10.8 MB | English only |
| English WN-1.5 | 7.68 MB | Historical version |
| Index (TOML) | 9.08 KB | Metadata |

43 language-specific packages available.

### OMW-Data v1.4 Release

37 language packages in WN-LMF 1.1 format.

### NLTK Integration

```python
import nltk
nltk.download("omw-1.4")
```

### Python wn Library

```python
import wn
wn.download("omw:1.4")  # Full collection
wn.download("oewn:2025")  # Open English WordNet
```

### Web Interface

- https://compling.upol.cz/omw/omw (OMW search)
- https://omwn.org/ (Project homepage)

---

## 7. Parsing Strategy

### Recommended Approach for JavaScript/TypeScript

Given the constraints of an Obsidian plugin (client-side, limited resources), here's the recommended parsing strategy:

#### Option 1: Pre-processed SQLite (Recommended)

Use the `wordnet-lmf` npm package approach:

1. **Pre-process WN-LMF XML to SQLite at build time**
2. **Bundle SQLite database with plugin**
3. **Use sql.js for browser-based queries**

**Advantages:**
- XML DOM parsing consumes ~1GB RAM for 100MB XML
- SQLite database is ~20% of XML size
- Fast indexed queries
- Low runtime memory

#### Option 2: Pre-processed JSON Index

1. **Convert WN-LMF to optimized JSON at build time**
2. **Create word-to-synset index**
3. **Lazy-load synset data on demand**

**JSON Structure:**
```javascript
{
  "index": {
    "word": ["synset-id-1", "synset-id-2"]
  },
  "synsets": {
    "synset-id": {
      "pos": "n",
      "definition": "...",
      "lemmas": ["word1", "word2"],
      "relations": {
        "hypernym": ["synset-id"],
        "hyponym": ["synset-id"]
      }
    }
  }
}
```

#### Option 3: Tab File Parsing (Simplest)

For OMW v1 tab files:

```typescript
interface TabEntry {
  offset: string;      // 8-digit PWN offset
  pos: string;         // n, v, a, r
  type: 'lemma' | 'def' | 'exe';
  lang: string;
  value: string;
}

function parseTabLine(line: string): TabEntry | null {
  if (line.startsWith('#')) return null;
  const parts = line.split('\t');
  const [offsetPos, langType, ...rest] = parts;
  const [offset, pos] = [offsetPos.slice(0, 8), offsetPos.slice(9)];
  const [lang, type] = langType.split(':');
  return { offset, pos, type, lang, value: rest.join('\t') };
}
```

### Indexing Strategy

```typescript
interface WordIndex {
  // Word -> list of synset IDs
  [word: string]: string[];
}

interface SynsetIndex {
  // Synset ID -> synset data
  [id: string]: {
    pos: string;
    definition: string;
    lemmas: string[];
    hypernyms: string[];
    hyponyms: string[];
    antonyms: string[];
  };
}

// Build inverted index for fast lookup
function buildIndex(synsets: Synset[]): WordIndex {
  const index: WordIndex = {};
  for (const synset of synsets) {
    for (const lemma of synset.lemmas) {
      const normalized = lemma.toLowerCase();
      if (!index[normalized]) index[normalized] = [];
      index[normalized].push(synset.id);
    }
  }
  return index;
}
```

---

## 8. Storage Considerations

### File Sizes

| Data | XML Size | SQLite Size | JSON Index |
|------|----------|-------------|------------|
| English WN | ~100 MB | ~20 MB | ~15 MB |
| OMW 1.4 (all) | ~500 MB | ~100 MB | ~80 MB |
| Single language | 1-50 MB | 0.2-10 MB | 0.2-8 MB |

### Memory Considerations

- **XML DOM Parsing:** ~10x file size in RAM
- **SQLite (sql.js):** ~2-3x database size
- **JSON Index:** Variable based on lazy loading

### Indexing Strategies

#### 1. Word-First Index (Thesaurus Use)
```
word -> [synset_ids] -> synset_data
```
Optimized for: "Find synonyms of X"

#### 2. Synset-First Index (Definition Lookup)
```
synset_id -> { lemmas, definition, relations }
```
Optimized for: Browsing related concepts

#### 3. Hybrid Index
```typescript
{
  "words": {
    "happy": ["adj-12345", "adj-12346"]
  },
  "synsets": {
    "adj-12345": {
      "lemmas": ["happy", "glad", "joyful"],
      "def": "experiencing pleasure",
      "relations": {...}
    }
  }
}
```

### Recommended for Obsidian Plugin

1. **Single language at a time** - Don't load all 150+ languages
2. **Lazy loading** - Load synset details on demand
3. **IndexedDB caching** - Cache parsed data in browser storage
4. **Compressed transfer** - Use gzip/brotli for bundled data

---

## 9. Example Data

### WN-LMF XML Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE LexicalResource SYSTEM "http://globalwordnet.github.io/schemas/WN-LMF-1.4.dtd">
<LexicalResource xmlns:dc="https://globalwordnet.github.io/schemas/dc/">
  <Lexicon id="example-en"
           label="Example English WordNet"
           language="en"
           email="maintainer@example.com"
           license="https://creativecommons.org/licenses/by/4.0/"
           version="1.0"
           url="https://example.com/wordnet">

    <!-- Lexical Entry for "happy" -->
    <LexicalEntry id="w-happy" index="happy">
      <Lemma writtenForm="happy" partOfSpeech="a"/>
      <Sense id="s-happy-1" synset="syn-01148283-a" n="1">
        <SenseRelation relType="antonym" target="s-sad-1"/>
      </Sense>
      <Sense id="s-happy-2" synset="syn-01149780-a" n="2"/>
    </LexicalEntry>

    <!-- Lexical Entry for "glad" -->
    <LexicalEntry id="w-glad" index="glad">
      <Lemma writtenForm="glad" partOfSpeech="a"/>
      <Sense id="s-glad-1" synset="syn-01148283-a" n="1"/>
    </LexicalEntry>

    <!-- Synset grouping "happy" and "glad" -->
    <Synset id="syn-01148283-a"
            ili="i47170"
            partOfSpeech="a"
            members="s-happy-1 s-glad-1">
      <Definition>experiencing or showing pleasure or contentment</Definition>
      <ILIDefinition>experiencing or showing pleasure or contentment</ILIDefinition>
      <SynsetRelation relType="similar" target="syn-01149780-a"/>
      <Example>a happy smile</Example>
      <Example>spent many glad days together</Example>
    </Synset>

    <!-- Another synset with hypernym relation -->
    <Synset id="syn-00001740-n" ili="i1" partOfSpeech="n">
      <Definition>that which is perceived or known</Definition>
      <SynsetRelation relType="hyponym" target="syn-00002137-n"/>
    </Synset>

  </Lexicon>
</LexicalResource>
```

### Tab File Example (OMW v1)

```
# name	Open Multilingual Wordnet	en	https://omwn.org	CC BY
00001740-n	eng:lemma	entity
00001740-n	eng:def	1	that which is perceived or known
00001930-n	eng:lemma	physical entity
00001930-n	eng:def	1	an entity that has physical existence
01148283-a	eng:lemma	happy
01148283-a	eng:lemma	glad
01148283-a	eng:def	1	experiencing pleasure or contentment
01148283-a	eng:exe	1	a happy smile
```

### JSON-LD Example

```json
{
  "@context": "http://globalwordnet.github.io/schemas/wn-json-context-1.4.json",
  "@graph": [{
    "@id": "example-en",
    "@type": "lime:Lexicon",
    "label": "Example English WordNet",
    "language": "en",
    "email": "maintainer@example.com",
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "version": "1.0",
    "entry": [
      {
        "@id": "w-happy",
        "lemma": { "writtenForm": "happy" },
        "partOfSpeech": "adjective",
        "sense": [
          {
            "@id": "s-happy-1",
            "synsetRef": "syn-01148283-a",
            "n": 1,
            "relations": [
              { "relType": "antonym", "target": "s-sad-1" }
            ]
          }
        ]
      }
    ],
    "synset": [
      {
        "@id": "syn-01148283-a",
        "ili": "i47170",
        "partOfSpeech": "adjective",
        "definition": ["experiencing or showing pleasure or contentment"],
        "members": ["s-happy-1", "s-glad-1"],
        "relations": [
          { "relType": "similar", "target": "syn-01149780-a" }
        ],
        "example": ["a happy smile", "spent many glad days together"]
      }
    ]
  }]
}
```

---

## 10. JavaScript/TypeScript Integration

### Existing npm Packages

#### 1. wordnet-lmf
**Repository:** https://github.com/rse/wordnet-lmf

```bash
npm install wordnet-lmf
```

**Features:**
- Parses WN-LMF XML to SQLite
- CLI and programmatic API
- Pre-parsed English and German packages available

**Usage:**
```typescript
import WordNetLMF from 'wordnet-lmf';

const wn = new WordNetLMF({ database: 'path/to/wordnet.db' });
await wn.open();

// Query by lemma
const results = await wn.query(`
  SELECT * FROM lemmas WHERE writtenForm LIKE ?
`, ['%happy%']);

await wn.close();
```

**Companion Packages:**
- `wordnet-lmf-en` - English WordNet
- `wordnet-lmf-de` - German WordNet

#### 2. node-wordnet
**Repository:** https://github.com/morungos/wordnet

```bash
npm install node-wordnet
```

**Features:**
- Pure JavaScript implementation
- Promise-based API
- Works with Princeton WordNet format

```typescript
import WordNet from 'node-wordnet';

const wordnet = new WordNet();

// Lookup word
const results = await wordnet.lookupAsync('happy');
for (const result of results) {
  console.log(result.synsetOffset);
  console.log(result.pos);
  console.log(result.definition);
  console.log(result.synonyms);
}
```

#### 3. wordpos
**Repository:** https://github.com/moos/wordpos

```bash
npm install wordpos
```

**Features:**
- Part-of-speech utilities
- Fast lookup (~5x improvement)
- Browser support via wordpos-web
- Promise-based API

```typescript
import WordPOS from 'wordpos';

const wordpos = new WordPOS();

// Get all synonyms
const adjectives = await wordpos.getAdjectives('The happy glad joyful person');
// Returns: ['happy', 'glad', 'joyful']

// Lookup with full data
const results = await wordpos.lookup('happy');
```

### Custom Parser Implementation

For parsing WN-LMF XML in TypeScript:

```typescript
import { DOMParser } from '@xmldom/xmldom';

interface Synset {
  id: string;
  ili: string;
  pos: string;
  definition: string;
  lemmas: string[];
  relations: Record<string, string[]>;
}

interface LexicalEntry {
  id: string;
  writtenForm: string;
  pos: string;
  senses: { id: string; synset: string }[];
}

class WNLMFParser {
  private doc: Document;

  constructor(xml: string) {
    const parser = new DOMParser();
    this.doc = parser.parseFromString(xml, 'application/xml');
  }

  parseLexicalEntries(): LexicalEntry[] {
    const entries: LexicalEntry[] = [];
    const elements = this.doc.getElementsByTagName('LexicalEntry');

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const lemma = el.getElementsByTagName('Lemma')[0];
      const senses = el.getElementsByTagName('Sense');

      entries.push({
        id: el.getAttribute('id') || '',
        writtenForm: lemma?.getAttribute('writtenForm') || '',
        pos: lemma?.getAttribute('partOfSpeech') || '',
        senses: Array.from(senses).map(s => ({
          id: s.getAttribute('id') || '',
          synset: s.getAttribute('synset') || ''
        }))
      });
    }

    return entries;
  }

  parseSynsets(): Synset[] {
    const synsets: Synset[] = [];
    const elements = this.doc.getElementsByTagName('Synset');

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const defEl = el.getElementsByTagName('Definition')[0];
      const relations = el.getElementsByTagName('SynsetRelation');

      const relMap: Record<string, string[]> = {};
      for (let j = 0; j < relations.length; j++) {
        const rel = relations[j];
        const type = rel.getAttribute('relType') || '';
        const target = rel.getAttribute('target') || '';
        if (!relMap[type]) relMap[type] = [];
        relMap[type].push(target);
      }

      synsets.push({
        id: el.getAttribute('id') || '',
        ili: el.getAttribute('ili') || '',
        pos: el.getAttribute('partOfSpeech') || '',
        definition: defEl?.textContent || '',
        lemmas: (el.getAttribute('members') || '').split(' '),
        relations: relMap
      });
    }

    return synsets;
  }

  buildWordIndex(entries: LexicalEntry[]): Map<string, string[]> {
    const index = new Map<string, string[]>();

    for (const entry of entries) {
      const word = entry.writtenForm.toLowerCase();
      const synsets = entry.senses.map(s => s.synset);

      if (!index.has(word)) {
        index.set(word, []);
      }
      index.get(word)!.push(...synsets);
    }

    return index;
  }
}
```

### Tab File Parser

```typescript
interface TabEntry {
  offset: string;
  pos: string;
  lang: string;
  type: 'lemma' | 'def' | 'exe';
  subId?: string;
  value: string;
}

function parseTabFile(content: string): TabEntry[] {
  const entries: TabEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [offsetPos, langType, ...rest] = parts;
    const offset = offsetPos.substring(0, 8);
    const pos = offsetPos.substring(9, 10);

    const colonIdx = langType.indexOf(':');
    const lang = langType.substring(0, colonIdx);
    const type = langType.substring(colonIdx + 1) as 'lemma' | 'def' | 'exe';

    if (type === 'lemma') {
      entries.push({ offset, pos, lang, type, value: rest[0] });
    } else {
      entries.push({
        offset, pos, lang, type,
        subId: rest[0],
        value: rest.slice(1).join('\t')
      });
    }
  }

  return entries;
}

// Build synset map from tab entries
function buildSynsetMap(entries: TabEntry[]): Map<string, {
  lemmas: string[];
  definitions: string[];
  examples: string[];
}> {
  const synsets = new Map();

  for (const entry of entries) {
    const key = `${entry.offset}-${entry.pos}`;

    if (!synsets.has(key)) {
      synsets.set(key, { lemmas: [], definitions: [], examples: [] });
    }

    const synset = synsets.get(key)!;

    switch (entry.type) {
      case 'lemma':
        synset.lemmas.push(entry.value);
        break;
      case 'def':
        synset.definitions.push(entry.value);
        break;
      case 'exe':
        synset.examples.push(entry.value);
        break;
    }
  }

  return synsets;
}
```

### Browser Storage with IndexedDB

```typescript
interface WordNetDB {
  words: { word: string; synsets: string[] };
  synsets: { id: string; data: Synset };
}

class WordNetStorage {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('wordnet', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Word index store
        const wordStore = db.createObjectStore('words', { keyPath: 'word' });
        wordStore.createIndex('word', 'word', { unique: true });

        // Synset store
        const synsetStore = db.createObjectStore('synsets', { keyPath: 'id' });
        synsetStore.createIndex('id', 'id', { unique: true });
      };
    });
  }

  async lookupWord(word: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const request = store.get(word.toLowerCase());

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.synsets || []);
      };
    });
  }

  async getSynset(id: string): Promise<Synset | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('synsets', 'readonly');
      const store = tx.objectStore('synsets');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
    });
  }
}
```

---

## Sources

- [Open Multilingual Wordnet](https://omwn.org/)
- [OMW v1](https://omwn.org/omw1.html)
- [OMW v2](https://omwn.org/omw2.html)
- [Global WordNet Formats](https://globalwordnet.github.io/schemas/)
- [Global WordNet Documentation](https://globalwordnet.github.io/gwadoc/)
- [GitHub: globalwordnet/schemas](https://github.com/globalwordnet/schemas)
- [GitHub: globalwordnet/OMW](https://github.com/globalwordnet/OMW)
- [GitHub: omwn/omw-data](https://github.com/omwn/omw-data)
- [GitHub: goodmami/wn](https://github.com/goodmami/wn)
- [wn Python Documentation](https://wn.readthedocs.io/)
- [GitHub: rse/wordnet-lmf](https://github.com/rse/wordnet-lmf)
- [GitHub: morungos/wordnet](https://github.com/morungos/wordnet)
- [GitHub: moos/wordpos](https://github.com/moos/wordpos)
- [NLTK WordNet](https://www.nltk.org/howto/wordnet.html)
- [Princeton WordNet](https://wordnet.princeton.edu/)
