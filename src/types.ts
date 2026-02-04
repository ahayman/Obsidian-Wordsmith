import { Editor, EditorPosition } from "obsidian";

// Relationship types for word lookups
export type RelationshipType = "synonym" | "antonym" | "related" | "hypernym" | "hyponym";
export const ALL_RELATIONSHIP_TYPES: RelationshipType[] = ["synonym", "antonym", "related", "hypernym", "hyponym"];

// Built-in source identifiers
export type BuiltinTabId = "local" | "datamuse";

// API service type identifiers
export type APIServiceType =
  | "merriam-webster"
  | "big-huge-thesaurus"
  | "words-api"
  | "api-ninjas"
  | "altervista"
  | "free-dictionary";

// All possible tab identifiers (built-in + API service IDs as dynamic strings)
export type TabId = string;

// Source types for SynonymResult
export type SynonymSource = "wordnet" | "moby" | "datamuse" | "nspell" | APIServiceType;

export const TAB_LABELS: Record<BuiltinTabId, string> = {
  local: "Local",
  datamuse: "Datamuse",
};

export const TAB_DESCRIPTIONS: Record<BuiltinTabId, string> = {
  local: "WordNet and Moby thesaurus (offline)",
  datamuse: "Datamuse API (online)",
};

// API service configuration for user-added services
export interface APIServiceConfig {
  id: string;              // UUID for this instance
  type: APIServiceType;    // Which API service
  apiKey: string;          // User's API key (empty for free-dictionary)
  enabled: boolean;
}

export interface SynonymResult {
  word: string;
  type: "synonym" | "antonym" | "related" | "hypernym" | "hyponym" | "spelling";
  source: SynonymSource;
  partOfSpeech?: string;
  definition?: string;
  definitionId?: string;  // Groups results with same definition
}

export interface LookupResult {
  originalWord: string;
  synonyms: SynonymResult[];
  relatedWords: SynonymResult[];
}

// Results grouped by source/tab ID
export interface GroupedLookupResult {
  originalWord: string;
  results: Record<string, SynonymResult[]>;  // Key is tab ID (local, datamuse, or API service UUID)
}

export interface WordRange {
  from: EditorPosition;
  to: EditorPosition;
}

export interface ThesaurusEntry {
  word: string;
  wordnet_id: string;
  key: string;
  pos: string;
  synonyms: string[];
  desc: string[];
}

// Discriminated union for source configuration
export type SourceConfig =
  | { kind: "builtin"; id: BuiltinTabId; enabled: boolean }
  | { kind: "api"; id: string; config: APIServiceConfig };

// Cache types - per-service caching
export interface ServiceCacheData {
  results: SynonymResult[];
  fetchedTypes: RelationshipType[];  // Which relationship types were fetched
}

export interface CacheEntry {
  word: string;                              // Normalized to lowercase
  services: Record<string, ServiceCacheData>; // Per-service results with metadata
  lastAccessed: number;                      // Unix timestamp for LRU
}

export interface LookupCache {
  entries: Record<string, CacheEntry>;
  version: number;
}

export interface SynoFinderSettings {
  maxResults: number;
  sources: SourceConfig[];
  wordNetDownloaded: boolean;
  mobyDownloaded: boolean;
  nspellDownloaded: boolean;
  offlineSpellingOnly: boolean;
  maxCacheSize: number;
  lookupCache: LookupCache;
}

export const DEFAULT_SETTINGS: SynoFinderSettings = {
  maxResults: 50,
  sources: [
    { kind: "builtin", id: "local", enabled: true },
    { kind: "builtin", id: "datamuse", enabled: true },
  ],
  wordNetDownloaded: false,
  mobyDownloaded: false,
  nspellDownloaded: false,
  offlineSpellingOnly: false,
  maxCacheSize: 100,
  lookupCache: {
    entries: {},
    version: 1,
  },
};

// Helper functions for working with SourceConfig
export function isBuiltinSource(source: SourceConfig): source is { kind: "builtin"; id: BuiltinTabId; enabled: boolean } {
  return source.kind === "builtin";
}

export function isAPISource(source: SourceConfig): source is { kind: "api"; id: string; config: APIServiceConfig } {
  return source.kind === "api";
}

export function isSourceEnabled(source: SourceConfig): boolean {
  return source.kind === "builtin" ? source.enabled : source.config.enabled;
}

export function getSourceId(source: SourceConfig): string {
  return source.id;
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface WordExtractionResult {
  word: string;
  range: WordRange;
  editor: Editor;
}

// Tab loading state for streaming modal
export type TabState = "loading" | "results" | "grayed";

// Tab metadata (known before lookup)
export interface TabMetadata {
  id: string;
  label: string;
  iconId: string; // Service type for icon lookup (e.g., "local", "merriam-webster")
}

// Callback interface for streaming results
export interface StreamingLookupCallbacks {
  onSourceComplete: (sourceId: string, results: SynonymResult[]) => void;
  onAllComplete: () => void;
}

// Return type for streaming lookup (allows cancellation)
export interface StreamingLookupHandle {
  cancel: () => void;
}

// Definition grouping types
export interface DefinitionGroup {
  definitionId: string;
  definition: string;
  partOfSpeech?: string;
  results: SynonymResult[];
}

export interface GroupedResults {
  grouped: DefinitionGroup[];
  ungrouped: SynonymResult[];
}
