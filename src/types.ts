import { Editor, EditorPosition } from "obsidian";

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
export type SynonymSource = "wordnet" | "moby" | "datamuse" | APIServiceType;

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
  type: "synonym" | "related";
  source: SynonymSource;
  partOfSpeech?: string;
  definition?: string;
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

export interface SynoFinderSettings {
  maxResults: number;
  sources: SourceConfig[];
  wordNetDownloaded: boolean;
  mobyDownloaded: boolean;
}

export const DEFAULT_SETTINGS: SynoFinderSettings = {
  maxResults: 50,
  sources: [
    { kind: "builtin", id: "local", enabled: true },
    { kind: "builtin", id: "datamuse", enabled: true },
  ],
  wordNetDownloaded: false,
  mobyDownloaded: false,
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
