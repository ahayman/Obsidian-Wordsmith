# Research: Definition-Grouped Synonyms UX

## Problem Statement

Words with multiple definitions present their synonyms, antonyms, and related words in a flat list. Users must scroll through unrelated items to find words relevant to their intended meaning. This creates friction, especially for polysemous words with many definitions.

**Example:** The word "run" has 40+ definitions (as a verb: to move quickly, to operate, to manage, to flow; as a noun: a sprint, a sequence, a tear in fabric). Currently, synonyms for all meanings appear intermixed.

---

## Current Implementation Analysis

### Data Structure
The current `SynonymResult` interface is flat:
```typescript
interface SynonymResult {
  word: string;
  type: "synonym" | "antonym" | "related" | "hypernym" | "hyponym" | "spelling";
  source: SynonymSource;
  partOfSpeech?: string;  // e.g., "noun", "verb"
  definition?: string;     // Single definition string
}
```

Results are displayed in a single scrollable list with optional filtering by:
- **Source/Tab** (WordNet, Datamuse, Merriam-Webster, etc.)
- **Relationship type** (synonym, antonym, related, etc.)
- **Text search** (filter by word substring)

### Current UI Components

| Component | Description | Grouping |
|-----------|-------------|----------|
| **Modal** | Full-screen with tabs, filters, search | By source tab |
| **Quick Popover** | Inline 5-item list at cursor | None (first 5 results) |

### Data Source Capabilities

| Source | Has Definition? | Grouped by Definition? | Notes |
|--------|-----------------|------------------------|-------|
| **WordNet** | Yes (via `desc[]`) | Partial - entries have `wordnet_id` | Multiple entries per word can map to senses |
| **Moby** | No | No | Simple word lists |
| **Datamuse** | Optional (`md=d`) | No | Can fetch definitions separately |
| **Free Dictionary** | Yes | **Yes** | Per-definition synonyms in `definitions[].synonyms` |
| **Merriam-Webster** | Yes (`shortdef`) | Partial | Has `meta.syns[][]` - outer array may map to senses |
| **Others** | Varies | No | Most provide flat lists |

**Key Finding:** Only Free Dictionary provides truly definition-grouped synonyms at the API level. WordNet and Merriam-Webster have partial grouping that could be leveraged.

---

## UX Patterns Research

### Pattern 1: Cascading/Linked Selection

Two (or more) dropdowns where the second dropdown's options depend on the first selection.

**Example Flow:**
```
[Select Definition: "to move quickly on foot" v] → [Select Synonym: sprint, dash, jog...]
```

**Pros:**
- Clear cause-and-effect relationship
- Reduces options shown at each step
- Follows Hick's Law (fewer choices = faster decisions)

**Cons:**
- Requires 2 interactions to reach goal
- Can feel slow for users who "know what they want"
- Challenging on mobile (multiple taps)

**Reference:** [Mobiscroll Linked Hierarchical Pickers](https://demo.mobiscroll.com/select/linked-hierarchical-pickers)

### Pattern 2: Grouped List with Visual Sections

Single scrollable list with visual grouping by definition, using headers/dividers.

**Example:**
```
┌────────────────────────────────────────┐
│ ▼ verb - to move quickly               │
│   sprint  dash  race  jog              │
│                                        │
│ ▼ verb - to operate                    │
│   operate  function  work              │
│                                        │
│ ▼ noun - a sequence                    │
│   sequence  series  stretch            │
└────────────────────────────────────────┘
```

**Pros:**
- Single view shows all options with context
- Collapsible sections reduce visual noise
- Users can scan headers quickly

**Cons:**
- Long lists still require scrolling
- Header space reduces density
- Collapsed sections hide synonyms from search

**Reference:** [Toptal Multilevel Menu Design](https://www.toptal.com/designers/ux/multilevel-menu-design)

### Pattern 3: Progressive Disclosure with Filter Chips

Show flat list by default, add definition filter chips above results.

**Example:**
```
Definitions: [All] [move quickly] [operate] [sequence]...

Results: sprint, dash, work, operate, series...
```

**Pros:**
- No change for users who like current behavior
- One-click filtering
- Preserves search functionality

**Cons:**
- Many definitions = chip overflow
- "All" view still has original problem
- Users may not notice/understand chips

**Reference:** [Bricxlabs Filter UI Patterns](https://bricxlabs.com/blogs/universal-search-and-filters-ui)

### Pattern 4: Definition Sidebar + Results (Split View)

Two-column layout: definitions on left, synonyms for selected definition on right.

**Example:**
```
┌──────────────────┬─────────────────────┐
│ DEFINITIONS      │ SYNONYMS            │
│ ○ move quickly   │ sprint              │
│ ● operate ←      │ function            │
│ ○ sequence       │ work                │
│                  │ perform             │
└──────────────────┴─────────────────────┘
```

**Pros:**
- Clear relationship between selection and results
- Full synonym list visible for selected definition
- Easy to switch between definitions

**Cons:**
- Requires horizontal space (poor for narrow modals)
- Mobile: would need to stack vertically
- More complex implementation

**Reference:** [PatternFly Dual List Selector](https://www.patternfly.org/components/dual-list-selector/design-guidelines/)

### Pattern 5: Two-Stage Selection (User's Initial Proposal)

Stage 1: Select definition from dropdown/list
Stage 2: Select synonym from filtered results

**Implementation Variants:**

**5a. Inline Dropdown (Modal)**
- Dropdown at top of modal replaces/filters results
- Default: most common definition

**5b. Staged Popover (Quick Replace)**
- First popover: definition selection
- Second popover: synonym selection
- Or single popover with "back" navigation

**Pros:**
- Clear mental model
- Significantly reduces cognitive load
- Works well for both modal and popover

**Cons:**
- Extra step for simple words (1 definition)
- Quick Replace loses "quick" aspect

---

## Analysis: Quick Replace Popover Deep Dive

The quick replace popover is optimized for speed: 5 results, number keys 1-5, minimal UI. Adding a definition selection stage creates tension with this goal.

### Option A: Staged Popover
```
Stage 1: [1] move quickly  [2] operate  [3] sequence
Stage 2: [1] sprint  [2] dash  [3] race  [4] jog  [5] run
```
- **Pro:** Maintains keyboard-driven flow (1-5 → 1-5)
- **Con:** Two interactions; "back" navigation needed

### Option B: Combined Single Popover (Compact)
```
┌─────────────────────────────────────┐
│ Definition: [move quickly       ▼]  │
│ ─────────────────────────────────── │
│ [1] sprint  [2] dash  [3] race      │
│ [4] jog     [5] run                 │
└─────────────────────────────────────┘
```
- **Pro:** Single view, definition dropdown changes results
- **Con:** More UI complexity; dropdown competes with keyboard nav

### Option C: Smart Default + Easy Escape
- Default to most common definition
- Show definition label above results
- Provide hint: "Tab for other definitions"
```
┌─────────────────────────────────────┐
│ "move quickly" (1 of 4)   [Tab→]    │
│ [1] sprint  [2] dash  [3] race      │
│ [4] jog     [5] run                 │
└─────────────────────────────────────┘
Press Tab: cycles to next definition
```
- **Pro:** Zero added friction for common case
- **Con:** Discoverability of Tab feature

### Option D: Inline Definition Groups
```
┌─────────────────────────────────────┐
│ ▸ move quickly                      │
│   [1] sprint  [2] dash              │
│ ▸ operate                           │
│   [3] function  [4] work            │
│ ▸ sequence                          │
│   [5] series                        │
└─────────────────────────────────────┘
```
- **Pro:** All visible at once; numbers continue across groups
- **Con:** 5-item limit becomes awkward with groups

---

## Recommendation

### For Modal: **Grouped List with Collapsible Sections (Pattern 2)**

**Rationale:**
- Modal has space for visual hierarchy
- Users can scan definitions quickly via headers
- Collapsing hides irrelevant definitions
- Preserves existing tab/filter/search infrastructure
- Works with all data sources (graceful degradation for sources without definitions)

**Implementation Notes:**
1. Group results by `definition` field
2. Results without definitions go in "Other" section
3. Sections default collapsed except first (most common)
4. Expand on click; keyboard nav enters/exits sections
5. Search still filters across all sections

**Mockup:**
```
┌────────────────────────────────────────────────────────────┐
│ Replace "run" with...                                      │
│ [Tab: Local] [Datamuse] [M-W]       [Syn ✓] [Ant ✓] [Rel]  │
├────────────────────────────────────────────────────────────┤
│ ▼ verb - to move quickly on foot (12)                      │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ sprint       Syn   verb    wordnet                   │ │
│   │ dash         Syn   verb    wordnet                   │ │
│   │ race         Syn   verb    wordnet                   │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                            │
│ ▸ verb - to operate or function (8)                        │
│ ▸ verb - to manage or direct (5)                           │
│ ▸ noun - an act of running (4)                             │
│ ▸ Other (15)                                               │
└────────────────────────────────────────────────────────────┘
```

### For Quick Replace: **Smart Default + Tab Cycling (Option C)**

**Rationale:**
- Preserves speed-first design philosophy
- Zero additional clicks for most cases (smart default)
- Tab key is natural and discoverable
- Definition label provides context without extra space

**Implementation Notes:**
1. Sort definitions by frequency/commonality (if available) or alphabetically
2. Show current definition as subtle header
3. Tab cycles through definitions, updating results
4. Shift+Tab cycles backwards
5. Numbers always map to current view

**Mockup:**
```
┌───────────────────────────────────┐
│ verb • move quickly (1/4)  [Tab→] │
├───────────────────────────────────┤
│ ① sprint    ② dash    ③ race     │
│ ④ jog       ⑤ bolt               │
└───────────────────────────────────┘
```

---

## Data Model Changes

To support grouping, we need to preserve definition associations through the pipeline.

### Option 1: Group ID Field
Add `definitionId` to `SynonymResult`:
```typescript
interface SynonymResult {
  word: string;
  type: RelationshipType | "spelling";
  source: SynonymSource;
  partOfSpeech?: string;
  definition?: string;
  definitionId?: string;  // NEW: Groups synonyms with same definition
}
```
- Pro: Minimal change, backwards compatible
- Con: Requires generating IDs at service level

### Option 2: Nested Structure
New type for grouped results:
```typescript
interface DefinitionGroup {
  definition: string;
  partOfSpeech?: string;
  results: SynonymResult[];
}

interface GroupedByDefinition {
  originalWord: string;
  groups: DefinitionGroup[];
  ungrouped: SynonymResult[];  // Results without definition
}
```
- Pro: Explicit grouping, cleaner for UI
- Con: Breaking change to lookup return types

### Recommendation: Option 1 (Group ID)

Start with `definitionId` to minimize disruption. The UI can group results by this field at render time. Services without definition support simply omit the field, and those results appear in "Other."

---

## Implementation Phases

### Phase 1: Data Layer (Low Risk)
1. Add `definitionId` to `SynonymResult` type
2. Update Free Dictionary service to populate `definitionId` (it already has the data)
3. Update Merriam-Webster service to populate `definitionId` (map `shortdef` index)
4. Update WordNet service to use `wordnet_id` as `definitionId`

### Phase 2: Modal UI (Medium Risk)
1. Add grouping logic to `SynonymModal`
2. Create collapsible section component
3. Add expand/collapse UI and keyboard navigation
4. Test with various word types (single def, many defs, no defs)

### Phase 3: Quick Replace (Higher Risk)
1. Add definition header to popover
2. Implement Tab cycling through definition groups
3. Add "(1/N)" indicator and arrow hint
4. Test keyboard flow thoroughly

### Phase 4: Polish
1. Definition frequency/sorting heuristics
2. Persist user's preferred definition for repeated lookups
3. Animation for section expand/collapse
4. Accessibility audit

---

## Open Questions

1. **Frequency data:** How do we determine "most common" definition? Options:
   - Alphabetical (simplest)
   - Order from API response (assume first = most common)
   - Usage frequency data (would need additional source)

2. **Cross-source grouping:** If WordNet says "sprint" is under def A, and Datamuse has "sprint" without a definition, should they merge? Or keep separate?

3. **Search behavior:** Should search find results inside collapsed sections? If yes, should it auto-expand matching sections?

4. **Mobile:** Collapsible sections work, but Tab cycling doesn't. What's the mobile equivalent for quick replace?

---

## Sources

- [UXPin: Dropdown Interaction Patterns](https://www.uxpin.com/studio/blog/dropdown-interaction-patterns-a-complete-guide/)
- [SetProduct: Dropdown UI Design](https://www.setproduct.com/blog/dropdown-ui-design)
- [Toptal: Multilevel Menu Design Best Practices](https://www.toptal.com/designers/ux/multilevel-menu-design)
- [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [LogRocket: Progressive Disclosure in UX](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/)
- [Baymard Institute: Drop-Down Usability](https://baymard.com/blog/drop-down-usability)
- [PatternFly: Dual List Selector](https://www.patternfly.org/components/dual-list-selector/design-guidelines/)
- [Interaction Design Foundation: Progressive Disclosure](https://www.interaction-design.org/literature/topics/progressive-disclosure)
