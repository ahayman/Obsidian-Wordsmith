# Moby Thesaurus vs WordNet: Quality Comparison

## Key Difference: Precision vs Volume

| Aspect | Moby Thesaurus | WordNet |
|--------|----------------|---------|
| **Approach** | Loose associations | Strict semantic synonyms |
| **Organization** | Flat lists (no structure) | Synsets with POS + sense disambiguation |
| **Average synonyms/word** | ~83 | Fewer, but contextually precise |
| **Total associations** | 2.5M+ | ~200K word-sense pairs |

## Quality Comparison

### WordNet's Precision
WordNet separates word senses explicitly. For "happy":
- `happy.a.01`: "enjoying or showing pleasure" → *glad, cheerful*
- `happy.a.02`: "well expressed" (as in "happy phrase") → *felicitous, well-chosen*
- `felicitous.s.02`: "marked by good fortune" → *fortunate*

Each sense has its own synonym set—no conflation of meanings.

### Moby's Breadth (and Problems)
Moby lists **230 synonyms for "happy"** in one flat list, mixing:
- True synonyms: *cheerful, joyful, glad, merry*
- "Fortunate" sense: *timely, opportune, apropos, cogent*
- Slang "happy = drunk": *tipsy, inebriated, maudlin, besotted*
- Loosely related: *urbane, civil, genteel*

Many would be **wrong substitutes** in "I feel happy."

### Practical Example: "fast"

**Moby (389 synonyms)** — all meanings mixed:
- Speed: *swift, rapid, quick, speedy, fleet*
- Firmness: *firm, fixed, secure, solid, anchored*
- Morality: *dissolute, debauched, loose, wanton*
- Abstinence: *fasting, Lenten fare*

**WordNet** — separated by sense:
- `fast.a.01` (adj): acting quickly → *quick, speedy*
- `fast.a.02` (adj): firmly fastened → *firm, immobile*
- `fast.n.01` (noun): abstaining from food
- `fast.v.01` (verb): to abstain from eating

## Combining Them: Analysis

### Benefits of Combination
1. **WordNet provides structure** — POS tagging, sense disambiguation
2. **Moby provides volume** — more options for creative writing
3. **Complementary coverage** — some words in one but not the other

### Challenges
1. **Duplicates** — Significant overlap requiring deduplication
2. **Mapping difficulty** — Moby's loose associations don't fit WordNet's strict synsets
3. **Mixed quality** — Moby terms might dilute WordNet's precision

### Recommended Combination Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Combined Lookup                       │
├─────────────────────────────────────────────────────────┤
│  1. Use WordNet as PRIMARY source                       │
│     - Provides POS tagging                              │
│     - Sense-disambiguated synonyms                      │
│     - Higher confidence substitutions                   │
│                                                         │
│  2. Use Moby as SECONDARY/EXPANSION source              │
│     - Filter through WordNet's POS where possible       │
│     - Present as "related words" not strict synonyms    │
│     - Good for creative brainstorming                   │
│                                                         │
│  3. UI should distinguish:                              │
│     - "Synonyms" (from WordNet) - safe substitutions    │
│     - "Related" (from Moby) - loose associations        │
└─────────────────────────────────────────────────────────┘
```

### Data Structure for Combined Approach

```typescript
interface WordEntry {
  word: string;
  senses: Sense[];        // From WordNet
  related: string[];      // From Moby (deduplicated)
}

interface Sense {
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb";
  definition: string;
  synonyms: string[];     // True synonyms (WordNet)
  antonyms?: string[];
}
```

### Example Combined Result for "happy"

```json
{
  "word": "happy",
  "senses": [
    {
      "partOfSpeech": "adjective",
      "definition": "enjoying or showing pleasure or contentment",
      "synonyms": ["glad", "cheerful", "joyful", "blissful"],
      "antonyms": ["unhappy", "sad"]
    },
    {
      "partOfSpeech": "adjective",
      "definition": "well expressed and to the point",
      "synonyms": ["felicitous", "well-chosen"]
    }
  ],
  "related": ["merry", "elated", "delighted", "content", "pleased", "jovial", "upbeat", "sunny", "lighthearted"]
}
```

## Recommendation

**Yes, combine them** — but with clear distinction:

1. **Download both** (~15-20MB total compressed)
2. **WordNet = primary** for accurate, sense-aware synonyms
3. **Moby = expansion** for "related words" / brainstorming
4. **UI distinction** — clearly label which source results come from
5. **Deduplication** — remove Moby entries that duplicate WordNet synonyms

This gives users:
- **Precision** when they need safe word substitutions
- **Volume** when they want creative alternatives
- **Structure** to understand different word senses
