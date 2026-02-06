// Language codes supported by the plugin
// Based on services: FreeDictionary, Altervista, Datamuse
export type LanguageCode =
  | "en"     // English
  | "es"     // Spanish
  | "fr"     // French
  | "de"     // German
  | "it"     // Italian
  | "pt-BR"  // Portuguese (Brazil)
  | "ja"     // Japanese
  | "ko"     // Korean
  | "ar"     // Arabic
  | "ru"     // Russian
  | "hi"     // Hindi
  | "tr"     // Turkish
  | "cs"     // Czech
  | "da"     // Danish
  | "el"     // Greek
  | "hu"     // Hungarian
  | "no"     // Norwegian
  | "pl"     // Polish
  | "ro"     // Romanian
  | "sk"     // Slovak
  | "bg"     // Bulgarian
  | "nl"     // Dutch
  | "sv"     // Swedish
  | "fi"     // Finnish
  | "uk"     // Ukrainian
  | "zh";    // Chinese

// Setting value: specific language, default (Obsidian locale), or auto-detect
export type LanguageSetting = LanguageCode | "default" | "auto";

// Language metadata
export interface LanguageInfo {
  code: LanguageCode;
  name: string;        // English name: "English"
  nativeName: string;  // Native name: "English"
}

// Result of language resolution
export interface ResolvedLanguage {
  code: LanguageCode;
  source: "frontmatter" | "settings" | "obsidian-locale" | "detection" | "fallback";
  detectionFailed?: boolean;
}
