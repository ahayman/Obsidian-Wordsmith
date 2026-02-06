import { LanguageCode } from "./language";

// Hunspell language codes from wooorm/dictionaries (92 languages)
// Using standard BCP 47 language tags
export type HunspellLanguageCode =
  | "bg"           // Bulgarian
  | "br"           // Breton
  | "ca"           // Catalan
  | "ca-valencia"  // Catalan (Valencian)
  | "cs"           // Czech
  | "cy"           // Welsh
  | "da"           // Danish
  | "de"           // German
  | "de-AT"        // German (Austria)
  | "de-CH"        // German (Switzerland)
  | "el"           // Greek
  | "el-polyton"   // Greek (Polytonic)
  | "en"           // English
  | "en-AU"        // English (Australia)
  | "en-CA"        // English (Canada)
  | "en-GB"        // English (UK)
  | "en-ZA"        // English (South Africa)
  | "eo"           // Esperanto
  | "es"           // Spanish
  | "es-AR"        // Spanish (Argentina)
  | "es-BO"        // Spanish (Bolivia)
  | "es-CL"        // Spanish (Chile)
  | "es-CO"        // Spanish (Colombia)
  | "es-CR"        // Spanish (Costa Rica)
  | "es-CU"        // Spanish (Cuba)
  | "es-DO"        // Spanish (Dominican Republic)
  | "es-EC"        // Spanish (Ecuador)
  | "es-GT"        // Spanish (Guatemala)
  | "es-HN"        // Spanish (Honduras)
  | "es-MX"        // Spanish (Mexico)
  | "es-NI"        // Spanish (Nicaragua)
  | "es-PA"        // Spanish (Panama)
  | "es-PE"        // Spanish (Peru)
  | "es-PH"        // Spanish (Philippines)
  | "es-PR"        // Spanish (Puerto Rico)
  | "es-PY"        // Spanish (Paraguay)
  | "es-SV"        // Spanish (El Salvador)
  | "es-US"        // Spanish (USA)
  | "es-UY"        // Spanish (Uruguay)
  | "es-VE"        // Spanish (Venezuela)
  | "et"           // Estonian
  | "eu"           // Basque
  | "fa"           // Persian/Farsi
  | "fo"           // Faroese
  | "fr"           // French
  | "fur"          // Friulian
  | "fy"           // Western Frisian
  | "ga"           // Irish
  | "gd"           // Scottish Gaelic
  | "gl"           // Galician
  | "he"           // Hebrew
  | "hr"           // Croatian
  | "hu"           // Hungarian
  | "hy"           // Armenian (Western)
  | "hyw"          // Armenian (Western variant)
  | "ia"           // Interlingua
  | "ie"           // Interlingue
  | "is"           // Icelandic
  | "it"           // Italian
  | "ko"           // Korean
  | "la"           // Latin
  | "lb"           // Luxembourgish
  | "lt"           // Lithuanian
  | "ltg"          // Latgalian
  | "lv"           // Latvian
  | "mk"           // Macedonian
  | "mn"           // Mongolian
  | "nb"           // Norwegian Bokmål
  | "nds"          // Low German
  | "ne"           // Nepali
  | "nl"           // Dutch
  | "nn"           // Norwegian Nynorsk
  | "pl"           // Polish
  | "pt"           // Portuguese (Portugal)
  | "pt-BR"        // Portuguese (Brazil)
  | "ro"           // Romanian
  | "ru"           // Russian
  | "rw"           // Kinyarwanda
  | "sk"           // Slovak
  | "sl"           // Slovenian
  | "sr"           // Serbian
  | "sr-Latn"      // Serbian (Latin)
  | "sv"           // Swedish
  | "tk"           // Turkmen
  | "tlh"          // Klingon
  | "tlh-Latn"     // Klingon (Latin)
  | "tr"           // Turkish
  | "uk"           // Ukrainian
  | "vi";          // Vietnamese

// Region groupings for UI organization
export type HunspellRegion =
  | "european"
  | "americas"
  | "asian"
  | "other";

// Hunspell language metadata
export interface HunspellLanguageInfo {
  code: HunspellLanguageCode;
  name: string;           // English name
  nativeName: string;     // Native name
  estimatedSizeMB: number;
  region: HunspellRegion;
}

// All Hunspell languages with metadata
export const HUNSPELL_LANGUAGES: HunspellLanguageInfo[] = [
  // European languages
  { code: "bg", name: "Bulgarian", nativeName: "Български", estimatedSizeMB: 1.5, region: "european" },
  { code: "br", name: "Breton", nativeName: "Brezhoneg", estimatedSizeMB: 0.5, region: "european" },
  { code: "ca", name: "Catalan", nativeName: "Català", estimatedSizeMB: 1.0, region: "european" },
  { code: "ca-valencia", name: "Catalan (Valencian)", nativeName: "Valencià", estimatedSizeMB: 1.0, region: "european" },
  { code: "cs", name: "Czech", nativeName: "Čeština", estimatedSizeMB: 2.0, region: "european" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", estimatedSizeMB: 0.5, region: "european" },
  { code: "da", name: "Danish", nativeName: "Dansk", estimatedSizeMB: 1.5, region: "european" },
  { code: "de", name: "German", nativeName: "Deutsch", estimatedSizeMB: 3.0, region: "european" },
  { code: "de-AT", name: "German (Austria)", nativeName: "Deutsch (Österreich)", estimatedSizeMB: 3.0, region: "european" },
  { code: "de-CH", name: "German (Switzerland)", nativeName: "Deutsch (Schweiz)", estimatedSizeMB: 3.0, region: "european" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", estimatedSizeMB: 1.5, region: "european" },
  { code: "el-polyton", name: "Greek (Polytonic)", nativeName: "Ελληνικά (Πολυτονικό)", estimatedSizeMB: 1.5, region: "european" },
  { code: "en", name: "English", nativeName: "English", estimatedSizeMB: 2.0, region: "european" },
  { code: "en-AU", name: "English (Australia)", nativeName: "English (Australia)", estimatedSizeMB: 2.0, region: "european" },
  { code: "en-CA", name: "English (Canada)", nativeName: "English (Canada)", estimatedSizeMB: 2.0, region: "european" },
  { code: "en-GB", name: "English (UK)", nativeName: "English (UK)", estimatedSizeMB: 2.0, region: "european" },
  { code: "en-ZA", name: "English (South Africa)", nativeName: "English (South Africa)", estimatedSizeMB: 2.0, region: "european" },
  { code: "eo", name: "Esperanto", nativeName: "Esperanto", estimatedSizeMB: 0.5, region: "european" },
  { code: "es", name: "Spanish", nativeName: "Español", estimatedSizeMB: 0.8, region: "european" },
  { code: "et", name: "Estonian", nativeName: "Eesti", estimatedSizeMB: 1.0, region: "european" },
  { code: "eu", name: "Basque", nativeName: "Euskara", estimatedSizeMB: 1.5, region: "european" },
  { code: "fo", name: "Faroese", nativeName: "Føroyskt", estimatedSizeMB: 0.5, region: "european" },
  { code: "fr", name: "French", nativeName: "Français", estimatedSizeMB: 1.0, region: "european" },
  { code: "fur", name: "Friulian", nativeName: "Furlan", estimatedSizeMB: 0.5, region: "european" },
  { code: "fy", name: "Western Frisian", nativeName: "Frysk", estimatedSizeMB: 0.5, region: "european" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", estimatedSizeMB: 1.0, region: "european" },
  { code: "gd", name: "Scottish Gaelic", nativeName: "Gàidhlig", estimatedSizeMB: 0.5, region: "european" },
  { code: "gl", name: "Galician", nativeName: "Galego", estimatedSizeMB: 0.8, region: "european" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", estimatedSizeMB: 1.5, region: "european" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", estimatedSizeMB: 2.0, region: "european" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", estimatedSizeMB: 1.0, region: "european" },
  { code: "it", name: "Italian", nativeName: "Italiano", estimatedSizeMB: 1.0, region: "european" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", estimatedSizeMB: 0.5, region: "european" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", estimatedSizeMB: 1.0, region: "european" },
  { code: "ltg", name: "Latgalian", nativeName: "Latgalīšu", estimatedSizeMB: 0.5, region: "european" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", estimatedSizeMB: 1.0, region: "european" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски", estimatedSizeMB: 1.0, region: "european" },
  { code: "nb", name: "Norwegian Bokmål", nativeName: "Norsk Bokmål", estimatedSizeMB: 1.5, region: "european" },
  { code: "nds", name: "Low German", nativeName: "Plattdüütsch", estimatedSizeMB: 0.5, region: "european" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", estimatedSizeMB: 2.5, region: "european" },
  { code: "nn", name: "Norwegian Nynorsk", nativeName: "Norsk Nynorsk", estimatedSizeMB: 1.5, region: "european" },
  { code: "pl", name: "Polish", nativeName: "Polski", estimatedSizeMB: 4.0, region: "european" },
  { code: "pt", name: "Portuguese", nativeName: "Português", estimatedSizeMB: 0.8, region: "european" },
  { code: "ro", name: "Romanian", nativeName: "Română", estimatedSizeMB: 1.0, region: "european" },
  { code: "ru", name: "Russian", nativeName: "Русский", estimatedSizeMB: 2.0, region: "european" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", estimatedSizeMB: 2.0, region: "european" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", estimatedSizeMB: 1.5, region: "european" },
  { code: "sr", name: "Serbian", nativeName: "Српски", estimatedSizeMB: 1.5, region: "european" },
  { code: "sr-Latn", name: "Serbian (Latin)", nativeName: "Srpski (Latinica)", estimatedSizeMB: 1.5, region: "european" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", estimatedSizeMB: 1.0, region: "european" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", estimatedSizeMB: 1.5, region: "european" },

  // Americas (Spanish variants)
  { code: "es-AR", name: "Spanish (Argentina)", nativeName: "Español (Argentina)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-BO", name: "Spanish (Bolivia)", nativeName: "Español (Bolivia)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-CL", name: "Spanish (Chile)", nativeName: "Español (Chile)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-CO", name: "Spanish (Colombia)", nativeName: "Español (Colombia)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-CR", name: "Spanish (Costa Rica)", nativeName: "Español (Costa Rica)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-CU", name: "Spanish (Cuba)", nativeName: "Español (Cuba)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-DO", name: "Spanish (Dominican Republic)", nativeName: "Español (República Dominicana)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-EC", name: "Spanish (Ecuador)", nativeName: "Español (Ecuador)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-GT", name: "Spanish (Guatemala)", nativeName: "Español (Guatemala)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-HN", name: "Spanish (Honduras)", nativeName: "Español (Honduras)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-MX", name: "Spanish (Mexico)", nativeName: "Español (México)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-NI", name: "Spanish (Nicaragua)", nativeName: "Español (Nicaragua)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-PA", name: "Spanish (Panama)", nativeName: "Español (Panamá)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-PE", name: "Spanish (Peru)", nativeName: "Español (Perú)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-PH", name: "Spanish (Philippines)", nativeName: "Español (Filipinas)", estimatedSizeMB: 0.8, region: "asian" },
  { code: "es-PR", name: "Spanish (Puerto Rico)", nativeName: "Español (Puerto Rico)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-PY", name: "Spanish (Paraguay)", nativeName: "Español (Paraguay)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-SV", name: "Spanish (El Salvador)", nativeName: "Español (El Salvador)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-US", name: "Spanish (USA)", nativeName: "Español (Estados Unidos)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-UY", name: "Spanish (Uruguay)", nativeName: "Español (Uruguay)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "es-VE", name: "Spanish (Venezuela)", nativeName: "Español (Venezuela)", estimatedSizeMB: 0.8, region: "americas" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", estimatedSizeMB: 1.5, region: "americas" },

  // Asian languages
  { code: "fa", name: "Persian", nativeName: "فارسی", estimatedSizeMB: 1.0, region: "asian" },
  { code: "he", name: "Hebrew", nativeName: "עברית", estimatedSizeMB: 1.0, region: "asian" },
  { code: "hy", name: "Armenian", nativeName: "Հdelays", estimatedSizeMB: 1.0, region: "asian" },
  { code: "hyw", name: "Armenian (Western)", nativeName: "Արdelays", estimatedSizeMB: 1.0, region: "asian" },
  { code: "ko", name: "Korean", nativeName: "한국어", estimatedSizeMB: 1.0, region: "asian" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол", estimatedSizeMB: 1.0, region: "asian" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", estimatedSizeMB: 0.5, region: "asian" },
  { code: "tk", name: "Turkmen", nativeName: "Türkmençe", estimatedSizeMB: 0.5, region: "asian" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", estimatedSizeMB: 1.0, region: "asian" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", estimatedSizeMB: 0.5, region: "asian" },

  // Other/Constructed languages
  { code: "ia", name: "Interlingua", nativeName: "Interlingua", estimatedSizeMB: 0.3, region: "other" },
  { code: "ie", name: "Interlingue", nativeName: "Interlingue", estimatedSizeMB: 0.3, region: "other" },
  { code: "la", name: "Latin", nativeName: "Latina", estimatedSizeMB: 0.5, region: "other" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda", estimatedSizeMB: 0.5, region: "other" },
  { code: "tlh", name: "Klingon", nativeName: "tlhIngan Hol", estimatedSizeMB: 0.1, region: "other" },
  { code: "tlh-Latn", name: "Klingon (Latin)", nativeName: "tlhIngan Hol", estimatedSizeMB: 0.1, region: "other" },
];

// Mapping from Wordsmith LanguageCode to primary Hunspell code
// Only maps where a direct correspondence exists
export const WORDSMITH_TO_HUNSPELL: Partial<Record<LanguageCode, HunspellLanguageCode>> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  "pt-BR": "pt-BR",
  ko: "ko",
  ru: "ru",
  tr: "tr",
  cs: "cs",
  da: "da",
  el: "el",
  hu: "hu",
  no: "nb",      // Norwegian → Norwegian Bokmål
  pl: "pl",
  ro: "ro",
  sk: "sk",
  // Missing: ja (Japanese), ar (Arabic), hi (Hindi) - no Hunspell dictionaries
};

// Reverse mapping from Hunspell code to Wordsmith LanguageCode
// Maps regional variants to their primary Wordsmith code
export const HUNSPELL_TO_WORDSMITH: Partial<Record<HunspellLanguageCode, LanguageCode>> = {
  // English variants
  en: "en",
  "en-AU": "en",
  "en-CA": "en",
  "en-GB": "en",
  "en-ZA": "en",

  // Spanish variants
  es: "es",
  "es-AR": "es",
  "es-BO": "es",
  "es-CL": "es",
  "es-CO": "es",
  "es-CR": "es",
  "es-CU": "es",
  "es-DO": "es",
  "es-EC": "es",
  "es-GT": "es",
  "es-HN": "es",
  "es-MX": "es",
  "es-NI": "es",
  "es-PA": "es",
  "es-PE": "es",
  "es-PH": "es",
  "es-PR": "es",
  "es-PY": "es",
  "es-SV": "es",
  "es-US": "es",
  "es-UY": "es",
  "es-VE": "es",

  // German variants
  de: "de",
  "de-AT": "de",
  "de-CH": "de",

  // Portuguese variants
  pt: "pt-BR",
  "pt-BR": "pt-BR",

  // Greek variants
  el: "el",
  "el-polyton": "el",

  // Norwegian variants
  nb: "no",
  nn: "no",

  // Other direct mappings
  fr: "fr",
  it: "it",
  ko: "ko",
  ru: "ru",
  tr: "tr",
  cs: "cs",
  da: "da",
  hu: "hu",
  pl: "pl",
  ro: "ro",
  sk: "sk",
};

/**
 * Get Hunspell language info by code.
 */
export function getHunspellLanguageInfo(code: HunspellLanguageCode): HunspellLanguageInfo | undefined {
  return HUNSPELL_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Check if a string is a valid Hunspell language code.
 */
export function isValidHunspellCode(code: string): code is HunspellLanguageCode {
  return HUNSPELL_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Get the download URL for a Hunspell dictionary file.
 * @param code Hunspell language code
 * @param type File type ('dic' or 'aff')
 * @returns URL to download the file
 */
export function getHunspellDownloadURL(code: HunspellLanguageCode, type: "dic" | "aff"): string {
  // wooorm/dictionaries uses the format: dictionaries/{code}/index.{type}
  return `https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/${code}/index.${type}`;
}

/**
 * Get Hunspell code from Wordsmith language code.
 * Returns undefined if no mapping exists.
 */
export function getHunspellCodeFromWordsmith(code: LanguageCode): HunspellLanguageCode | undefined {
  return WORDSMITH_TO_HUNSPELL[code];
}

/**
 * Get Wordsmith language code from Hunspell code.
 * Returns undefined if no mapping exists.
 */
export function getWordsmithCodeFromHunspell(code: HunspellLanguageCode): LanguageCode | undefined {
  return HUNSPELL_TO_WORDSMITH[code];
}

/**
 * Get all Hunspell languages for a specific region.
 */
export function getHunspellLanguagesByRegion(region: HunspellRegion): HunspellLanguageInfo[] {
  return HUNSPELL_LANGUAGES.filter(lang => lang.region === region);
}

/**
 * Check if a Hunspell language maps to a Wordsmith language.
 * Useful for filtering languages that can be used for spell checking in Wordsmith.
 */
export function hunspellLanguageMapsToWordsmith(code: HunspellLanguageCode): boolean {
  return code in HUNSPELL_TO_WORDSMITH;
}
