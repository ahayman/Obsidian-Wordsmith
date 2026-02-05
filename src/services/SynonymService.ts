import { SynonymResult, APIServiceType, RelationshipType } from "../types/types";
import { LanguageCode } from "../types/language";
import { API_SERVICE_LANGUAGES } from "../data/languages";

export interface SynonymService {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  lookup(word: string, maxResults: number, types?: RelationshipType[], language?: LanguageCode): Promise<SynonymResult[]>;
  validate(): Promise<{ valid: boolean; error?: string }>;
  supportedTypes(): RelationshipType[];
  supportedLanguages(): LanguageCode[];
}

export interface APIServiceInfo {
  type: APIServiceType;
  name: string;
  description: string;
  requiresKey: boolean;
  registrationUrl: string;
  registrationInstructions: string;
  supportedTypes: RelationshipType[];
  supportedLanguages: LanguageCode[];
}

export const API_SERVICE_INFO: Record<APIServiceType, APIServiceInfo> = {
  "merriam-webster": {
    type: "merriam-webster",
    name: "Merriam-Webster",
    description: "Collegiate Thesaurus API",
    requiresKey: true,
    registrationUrl: "https://dictionaryapi.com/register/index",
    registrationInstructions:
      "Create a free account and request access to the Collegiate Thesaurus API. Keys are emailed after registration.",
    supportedTypes: ["synonym", "antonym"],
    supportedLanguages: API_SERVICE_LANGUAGES["merriam-webster"],
  },
  "big-huge-thesaurus": {
    type: "big-huge-thesaurus",
    name: "Big Huge Thesaurus",
    description: "Simple thesaurus API with synonyms, antonyms, and related words",
    requiresKey: true,
    registrationUrl: "https://words.bighugelabs.com/account/getkey",
    registrationInstructions:
      "Create an account to get your API key. Free tier available with usage limits.",
    supportedTypes: ["synonym", "antonym", "related"],
    supportedLanguages: API_SERVICE_LANGUAGES["big-huge-thesaurus"],
  },
  "words-api": {
    type: "words-api",
    name: "WordsAPI",
    description: "Comprehensive word data via RapidAPI (2,500 free requests/day)",
    requiresKey: true,
    registrationUrl: "https://rapidapi.com/dpventures/api/wordsapi",
    registrationInstructions:
      'Sign up for RapidAPI, subscribe to WordsAPI (free tier: 2,500 requests/day). Your API key is shown in the "X-RapidAPI-Key" header on the API page.',
    supportedTypes: ["synonym", "antonym", "related", "hypernym", "hyponym"],
    supportedLanguages: API_SERVICE_LANGUAGES["words-api"],
  },
  "api-ninjas": {
    type: "api-ninjas",
    name: "API Ninjas",
    description: "Thesaurus API with generous free tier",
    requiresKey: true,
    registrationUrl: "https://api-ninjas.com/register",
    registrationInstructions:
      "Create a free account. Your API key is available on your profile page after signing in.",
    supportedTypes: ["synonym", "antonym"],
    supportedLanguages: API_SERVICE_LANGUAGES["api-ninjas"],
  },
  altervista: {
    type: "altervista",
    name: "Altervista",
    description: "Multilingual thesaurus API (15 languages)",
    requiresKey: true,
    registrationUrl: "https://thesaurus.altervista.org/mykey",
    registrationInstructions:
      "Register for a free account to receive your API key. Supports multiple languages.",
    supportedTypes: ["synonym", "antonym"],
    supportedLanguages: API_SERVICE_LANGUAGES["altervista"],
  },
  "free-dictionary": {
    type: "free-dictionary",
    name: "Free Dictionary",
    description: "Free and open dictionary API (12 languages, no key required)",
    requiresKey: false,
    registrationUrl: "",
    registrationInstructions: "No API key required. This service is free and open.",
    supportedTypes: ["synonym", "antonym"],
    supportedLanguages: API_SERVICE_LANGUAGES["free-dictionary"],
  },
};

// Supported types for built-in services
import { BuiltinTabId } from "../types/types";
export const BUILTIN_SERVICE_TYPES: Record<BuiltinTabId, RelationshipType[]> = {
  local: ["synonym", "related"],  // WordNet + Moby have synonyms and related
  datamuse: ["synonym", "antonym", "related", "hypernym", "hyponym"],
};


export function getAPIServiceInfo(type: APIServiceType): APIServiceInfo {
  return API_SERVICE_INFO[type];
}

export function getAllAPIServiceTypes(): APIServiceType[] {
  return Object.keys(API_SERVICE_INFO) as APIServiceType[];
}
