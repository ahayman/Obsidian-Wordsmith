import { LanguageCode, LanguageInfo } from "../types/language";
import { APIServiceType, BuiltinTabId } from "../types/types";

// All supported languages with their metadata
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
];

// Language support per built-in service
export const BUILTIN_SERVICE_LANGUAGES: Record<BuiltinTabId, LanguageCode[]> = {
  local: ["en"],  // WordNet + Moby are English only
  datamuse: ["en", "es"],  // Datamuse supports English and Spanish vocabulary
};

// Language support per API service type
export const API_SERVICE_LANGUAGES: Record<APIServiceType, LanguageCode[]> = {
  // FreeDictionary supports many languages
  "free-dictionary": ["en", "es", "fr", "de", "it", "pt-BR", "ja", "ko", "ar", "ru", "hi", "tr"],
  // Altervista supports many European languages
  altervista: ["cs", "da", "de", "el", "en", "es", "fr", "hu", "it", "no", "pl", "pt-BR", "ro", "ru", "sk"],
  // English-only services
  "merriam-webster": ["en"],
  "big-huge-thesaurus": ["en"],
  "words-api": ["en"],
  "api-ninjas": ["en"],
};

// Combined service language support (for convenience)
export const SERVICE_LANGUAGE_SUPPORT: Record<string, LanguageCode[]> = {
  ...BUILTIN_SERVICE_LANGUAGES,
  ...API_SERVICE_LANGUAGES,
};

/**
 * Get all services that support a given language.
 */
export function getServicesForLanguage(language: LanguageCode): string[] {
  const services: string[] = [];
  for (const [serviceId, languages] of Object.entries(SERVICE_LANGUAGE_SUPPORT)) {
    if (languages.includes(language)) {
      services.push(serviceId);
    }
  }
  return services;
}

/**
 * Get all languages supported by a given service.
 */
export function getLanguagesForService(serviceId: string): LanguageCode[] {
  return SERVICE_LANGUAGE_SUPPORT[serviceId] || ["en"];
}

/**
 * Check if a service supports a given language.
 */
export function serviceSupportsLanguage(serviceId: string, language: LanguageCode): boolean {
  const languages = SERVICE_LANGUAGE_SUPPORT[serviceId];
  return languages ? languages.includes(language) : false;
}

/**
 * Get language info by code.
 */
export function getLanguageInfo(code: LanguageCode): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get language name by code.
 */
export function getLanguageName(code: LanguageCode): string {
  const info = getLanguageInfo(code);
  return info?.name || code;
}

/**
 * Check if a string is a valid language code.
 */
export function isValidLanguageCode(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Count how many enabled services support a language.
 */
export function countServicesForLanguage(
  language: LanguageCode,
  enabledServiceIds: string[]
): number {
  let count = 0;
  for (const serviceId of enabledServiceIds) {
    if (serviceSupportsLanguage(serviceId, language)) {
      count++;
    }
  }
  return count;
}
