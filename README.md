# Wordsmith

An Obsidian plugin for easily replacing a word with a synonym, antonym, and other related lookups. Pull from multiple sources as once, easily tabbing through the results to choose the perfect substitution. 

## Features

### Multi-Source Lookup
Query multiple thesaurus sources simultaneously:
- **Local databases** - WordNet and Moby thesaurus for offline access
- **Datamuse API** - Free online thesaurus (no API key required)
- **Premium APIs** - Optional integrations with Merriam-Webster, Big Huge Thesaurus, WordsAPI, API Ninjas, Altervista, and Free Dictionary

### Word Relationships
Find different types of word relationships:
- **Synonyms** - Words with similar meanings
- **Antonyms** - Words with opposite meanings
- **Related words** - Conceptually connected terms
- **Hypernyms** - More general terms (e.g., "vehicle" for "car")
- **Hyponyms** - More specific terms (e.g., "sedan" for "car")

### Spelling Suggestions
Get spelling corrections when you look up a misspelled word. Supports both online suggestions and an offline Hunspell dictionary.

### Quick Replace
A lightweight popover that shows replacement options near your cursor for fast word swapping.

## Installation

### From Obsidian Community Plugins
Note: This plugin hasn't been submitted yet, so this isn't available.
1. ~~Open Settings → Community Plugins~~
2. ~~Search for "Wordsmith"~~
3. ~~Click Install, then Enable~~

### BRAT Installation (for beta testing)
1. Open Settings -> Community Plugins
2. Search for "BRAT"
3. Install, Enable the plugin, and open BRAT settings.
4. Find the button that says "Add Beta Plugin" and click it.
5. Enter the address of this repo and install it: https://github.com/ahayman/Obsidian-Wordsmith
6. Enable the Wordsmith plugin and open settings to add and download sources.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/wordsmith/`
3. Copy the files into this folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins


## Usage

### Commands

All commands work on the word under your cursor:

| Command | Description |
|---------|-------------|
| **Find synonyms** | Open the full lookup modal with synonyms |
| **Find antonyms** | Open the full lookup modal with antonyms |
| **Find related words** | Open the full lookup modal with related words |
| **Find hypernyms** | Open the full lookup modal with hypernyms |
| **Find hyponyms** | Open the full lookup modal with hyponyms |
| **Quick replace - synonym** | Show synonym suggestions in a quick popover |
| **Quick replace - antonym** | Show antonym suggestions in a quick popover |

Access these commands through the command palette (Ctrl/Cmd + P) or assign hotkeys in Obsidian's settings.

### Full Lookup Modal

The main modal provides a comprehensive view of results:

1. **Tabs** - Switch between different data sources to see their results
2. **Filter chips** - Toggle relationship types (Syn, Ant, Rel, Hyper, Hypo)
3. **Search** - Filter results by typing in the search box
4. **Grouped results** - Results are organized by definition/meaning
5. **Expand/collapse** - Click "Show more" to see all results for a definition

**Keyboard navigation:**
- Arrow keys to navigate results
- Tab to switch between sources
- Enter to select a word
- Escape to close

### Quick Replace Popover

A minimal interface for fast replacements:

1. Results appear in a small popover near your cursor
2. Press 1-5 to select a suggestion, or use arrow keys
3. Press Tab to cycle through different definitions
4. Press Enter to replace the word
5. Press Escape or click outside to close

## Settings

### Display
- **Maximum results** - Limit results per source (10-100)

### Data Sources
- Enable or disable individual sources
- Drag to reorder sources (affects tab order)
- Add API services with your own API keys

### Cache
- **Cache size** - Number of words to cache (0 disables caching)
- **Clear cache** - Remove all cached results

### Local Data
Download offline databases for use without internet:
- **WordNet** - Comprehensive lexical database (~11MB)
- **Moby thesaurus** - Large synonym collection (~7.7MB)

### Spelling
- **Offline dictionary** - Hunspell dictionary for offline spelling suggestions (~2MB)
- **Offline spelling only** - Disable online spelling services

## Adding API Services

Some thesaurus APIs require an API key. To add one:

1. Open plugin settings
2. Click "+ Add API service"
3. Select a service from the dropdown
4. Enter your API key
5. Click Add

Supported services:
- **Merriam-Webster** - Collegiate Thesaurus API
- **Big Huge Thesaurus** - Simple REST API
- **WordsAPI** - Via RapidAPI
- **API Ninjas** - Thesaurus endpoint
- **Altervista** - Multilingual support
- **Free Dictionary** - No API key required
