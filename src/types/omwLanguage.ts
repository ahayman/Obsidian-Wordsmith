import { LanguageCode } from "./language";

// OMW uses 3-letter ISO 639-3 language codes for core languages
export type OMWCoreLanguageCode =
  | "als"   // Albanian
  | "arb"   // Arabic
  | "bul"   // Bulgarian
  | "cat"   // Catalan (MCR)
  | "cmn"   // Mandarin Chinese (COW)
  | "dan"   // Danish
  | "ell"   // Greek
  | "eng"   // English
  | "eus"   // Basque (MCR)
  | "fas"   // Persian
  | "fin"   // Finnish
  | "fra"   // French
  | "glg"   // Galician (MCR)
  | "heb"   // Hebrew
  | "hrv"   // Croatian
  | "ind"   // Indonesian (MSA)
  | "isl"   // Icelandic
  | "ita"   // Italian
  | "iwn"   // Italian (ItalWordNet variant)
  | "jpn"   // Japanese
  | "nld"   // Dutch
  | "nno"   // Norwegian Nynorsk (NOR)
  | "nob"   // Norwegian Bokmål (NOR)
  | "pol"   // Polish
  | "por"   // Portuguese
  | "ron"   // Romanian
  | "slk"   // Slovak
  | "slv"   // Slovenian
  | "spa"   // Spanish (MCR)
  | "swe"   // Swedish
  | "tha"   // Thai
  | "zsm";  // Malay (MSA)

// Extended languages from CLDR (Unicode Common Locale Data Repository)
// These are auto-constructed with ~94% accuracy
export type OMWExtendedLanguageCode =
  | "afr"   // Afrikaans
  | "amh"   // Amharic
  | "aze"   // Azerbaijani
  | "bel"   // Belarusian
  | "ben"   // Bengali
  | "bos"   // Bosnian
  | "ces"   // Czech
  | "cym"   // Welsh
  | "deu"   // German
  | "est"   // Estonian
  | "ful"   // Fulah
  | "gla"   // Scottish Gaelic
  | "gle"   // Irish
  | "guj"   // Gujarati
  | "hau"   // Hausa
  | "hin"   // Hindi
  | "hun"   // Hungarian
  | "hye"   // Armenian
  | "ibo"   // Igbo
  | "kan"   // Kannada
  | "kat"   // Georgian
  | "kaz"   // Kazakh
  | "khm"   // Khmer
  | "kor"   // Korean
  | "lao"   // Lao
  | "lav"   // Latvian
  | "lit"   // Lithuanian
  | "mal"   // Malayalam
  | "mar"   // Marathi
  | "mkd"   // Macedonian
  | "mlg"   // Malagasy
  | "mlt"   // Maltese
  | "mon"   // Mongolian
  | "mya"   // Burmese
  | "nep"   // Nepali
  | "ori"   // Odia
  | "pan"   // Punjabi
  | "pus"   // Pashto
  | "rus"   // Russian
  | "sin"   // Sinhala
  | "sme"   // Northern Sami
  | "som"   // Somali
  | "sot"   // Southern Sotho
  | "srp"   // Serbian
  | "swa"   // Swahili
  | "tam"   // Tamil
  | "tel"   // Telugu
  | "tgk"   // Tajik
  | "tir"   // Tigrinya
  | "tur"   // Turkish
  | "ukr"   // Ukrainian
  | "urd"   // Urdu
  | "uzb"   // Uzbek
  | "vie"   // Vietnamese
  | "xho"   // Xhosa
  | "yor"   // Yoruba
  | "zul";  // Zulu

// Combined type for all OMW languages
export type OMWLanguageCode = OMWCoreLanguageCode | OMWExtendedLanguageCode;

// OMW language metadata
export interface OMWLanguageInfo {
  code: OMWLanguageCode;
  name: string;        // English name
  nativeName: string;  // Native name
  synsetCount?: number;  // Approximate number of synsets (if known)
  estimatedSizeMB?: number;  // Approximate download size in MB
  isExtended: boolean;  // true if from CLDR/Wiktionary (auto-constructed)
  directory?: string;   // Subdirectory if not in root (e.g., "mcr", "nor", "msa")
}

// Core OMW languages (hand-curated, high quality)
export const OMW_CORE_LANGUAGES: OMWLanguageInfo[] = [
  { code: "als", name: "Albanian", nativeName: "Shqip", estimatedSizeMB: 1, isExtended: false },
  { code: "arb", name: "Arabic", nativeName: "العربية", estimatedSizeMB: 2, isExtended: false },
  { code: "bul", name: "Bulgarian", nativeName: "Български", estimatedSizeMB: 1, isExtended: false },
  { code: "cat", name: "Catalan", nativeName: "Català", estimatedSizeMB: 4, isExtended: false, directory: "mcr" },
  { code: "cmn", name: "Chinese (Mandarin)", nativeName: "中文", estimatedSizeMB: 3, isExtended: false, directory: "cow" },
  { code: "dan", name: "Danish", nativeName: "Dansk", estimatedSizeMB: 1, isExtended: false },
  { code: "ell", name: "Greek", nativeName: "Ελληνικά", estimatedSizeMB: 2, isExtended: false },
  { code: "eng", name: "English", nativeName: "English", estimatedSizeMB: 10, isExtended: false },
  { code: "eus", name: "Basque", nativeName: "Euskara", estimatedSizeMB: 2, isExtended: false, directory: "mcr" },
  { code: "fas", name: "Persian", nativeName: "فارسی", estimatedSizeMB: 1, isExtended: false },
  { code: "fin", name: "Finnish", nativeName: "Suomi", estimatedSizeMB: 8, isExtended: false },
  { code: "fra", name: "French", nativeName: "Français", estimatedSizeMB: 5, isExtended: false },
  { code: "glg", name: "Galician", nativeName: "Galego", estimatedSizeMB: 3, isExtended: false, directory: "mcr" },
  { code: "heb", name: "Hebrew", nativeName: "עברית", estimatedSizeMB: 1, isExtended: false },
  { code: "hrv", name: "Croatian", nativeName: "Hrvatski", estimatedSizeMB: 2, isExtended: false },
  { code: "ind", name: "Indonesian", nativeName: "Bahasa Indonesia", estimatedSizeMB: 4, isExtended: false, directory: "msa" },
  { code: "isl", name: "Icelandic", nativeName: "Íslenska", estimatedSizeMB: 1, isExtended: false },
  { code: "ita", name: "Italian", nativeName: "Italiano", estimatedSizeMB: 3, isExtended: false },
  { code: "iwn", name: "Italian (ItalWordNet)", nativeName: "Italiano", estimatedSizeMB: 3, isExtended: false },
  { code: "jpn", name: "Japanese", nativeName: "日本語", estimatedSizeMB: 5, isExtended: false },
  { code: "nld", name: "Dutch", nativeName: "Nederlands", estimatedSizeMB: 2, isExtended: false },
  { code: "nno", name: "Norwegian Nynorsk", nativeName: "Nynorsk", estimatedSizeMB: 1, isExtended: false, directory: "nor" },
  { code: "nob", name: "Norwegian Bokmål", nativeName: "Bokmål", estimatedSizeMB: 1, isExtended: false, directory: "nor" },
  { code: "pol", name: "Polish", nativeName: "Polski", estimatedSizeMB: 3, isExtended: false },
  { code: "por", name: "Portuguese", nativeName: "Português", estimatedSizeMB: 4, isExtended: false },
  { code: "ron", name: "Romanian", nativeName: "Română", estimatedSizeMB: 5, isExtended: false },
  { code: "slk", name: "Slovak", nativeName: "Slovenčina", estimatedSizeMB: 2, isExtended: false },
  { code: "slv", name: "Slovenian", nativeName: "Slovenščina", estimatedSizeMB: 3, isExtended: false },
  { code: "spa", name: "Spanish", nativeName: "Español", estimatedSizeMB: 6, isExtended: false, directory: "mcr" },
  { code: "swe", name: "Swedish", nativeName: "Svenska", estimatedSizeMB: 1, isExtended: false },
  { code: "tha", name: "Thai", nativeName: "ไทย", estimatedSizeMB: 5, isExtended: false },
  { code: "zsm", name: "Malay", nativeName: "Bahasa Melayu", estimatedSizeMB: 3, isExtended: false, directory: "msa" },
];

// Extended OMW languages from CLDR (auto-constructed, ~94% accuracy)
export const OMW_EXTENDED_LANGUAGES: OMWLanguageInfo[] = [
  { code: "afr", name: "Afrikaans", nativeName: "Afrikaans", estimatedSizeMB: 0.5, isExtended: true },
  { code: "amh", name: "Amharic", nativeName: "አማርኛ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "aze", name: "Azerbaijani", nativeName: "Azərbaycan", estimatedSizeMB: 0.5, isExtended: true },
  { code: "bel", name: "Belarusian", nativeName: "Беларуская", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ben", name: "Bengali", nativeName: "বাংলা", estimatedSizeMB: 0.5, isExtended: true },
  { code: "bos", name: "Bosnian", nativeName: "Bosanski", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ces", name: "Czech", nativeName: "Čeština", estimatedSizeMB: 0.5, isExtended: true },
  { code: "cym", name: "Welsh", nativeName: "Cymraeg", estimatedSizeMB: 0.5, isExtended: true },
  { code: "deu", name: "German", nativeName: "Deutsch", estimatedSizeMB: 0.5, isExtended: true },
  { code: "est", name: "Estonian", nativeName: "Eesti", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ful", name: "Fulah", nativeName: "Fulfulde", estimatedSizeMB: 0.5, isExtended: true },
  { code: "gla", name: "Scottish Gaelic", nativeName: "Gàidhlig", estimatedSizeMB: 0.5, isExtended: true },
  { code: "gle", name: "Irish", nativeName: "Gaeilge", estimatedSizeMB: 0.5, isExtended: true },
  { code: "guj", name: "Gujarati", nativeName: "ગુજરાતી", estimatedSizeMB: 0.5, isExtended: true },
  { code: "hau", name: "Hausa", nativeName: "Hausa", estimatedSizeMB: 0.5, isExtended: true },
  { code: "hin", name: "Hindi", nativeName: "हिन्दी", estimatedSizeMB: 0.5, isExtended: true },
  { code: "hun", name: "Hungarian", nativeName: "Magyar", estimatedSizeMB: 0.5, isExtended: true },
  { code: "hye", name: "Armenian", nativeName: "Հայերdelays", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ibo", name: "Igbo", nativeName: "Igbo", estimatedSizeMB: 0.5, isExtended: true },
  { code: "kan", name: "Kannada", nativeName: "ಕನ್ನಡ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "kat", name: "Georgian", nativeName: "ქართული", estimatedSizeMB: 0.5, isExtended: true },
  { code: "kaz", name: "Kazakh", nativeName: "Қазақ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "khm", name: "Khmer", nativeName: "ខ្មែរ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "kor", name: "Korean", nativeName: "한국어", estimatedSizeMB: 0.5, isExtended: true },
  { code: "lao", name: "Lao", nativeName: "ລາວ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "lav", name: "Latvian", nativeName: "Latviešu", estimatedSizeMB: 0.5, isExtended: true },
  { code: "lit", name: "Lithuanian", nativeName: "Lietuvių", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mal", name: "Malayalam", nativeName: "മലയാളം", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mar", name: "Marathi", nativeName: "मराठी", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mkd", name: "Macedonian", nativeName: "Македонски", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mlg", name: "Malagasy", nativeName: "Malagasy", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mlt", name: "Maltese", nativeName: "Malti", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mon", name: "Mongolian", nativeName: "Монгол", estimatedSizeMB: 0.5, isExtended: true },
  { code: "mya", name: "Burmese", nativeName: "မြန်မာ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "nep", name: "Nepali", nativeName: "नेपाली", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ori", name: "Odia", nativeName: "ଓଡ଼ିଆ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "pan", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "pus", name: "Pashto", nativeName: "پښتو", estimatedSizeMB: 0.5, isExtended: true },
  { code: "rus", name: "Russian", nativeName: "Русский", estimatedSizeMB: 0.5, isExtended: true },
  { code: "sin", name: "Sinhala", nativeName: "සිංහල", estimatedSizeMB: 0.5, isExtended: true },
  { code: "sme", name: "Northern Sami", nativeName: "Davvisámegiella", estimatedSizeMB: 0.5, isExtended: true },
  { code: "som", name: "Somali", nativeName: "Soomaali", estimatedSizeMB: 0.5, isExtended: true },
  { code: "sot", name: "Southern Sotho", nativeName: "Sesotho", estimatedSizeMB: 0.5, isExtended: true },
  { code: "srp", name: "Serbian", nativeName: "Српски", estimatedSizeMB: 0.5, isExtended: true },
  { code: "swa", name: "Swahili", nativeName: "Kiswahili", estimatedSizeMB: 0.5, isExtended: true },
  { code: "tam", name: "Tamil", nativeName: "தமிழ்", estimatedSizeMB: 0.5, isExtended: true },
  { code: "tel", name: "Telugu", nativeName: "తెలుగు", estimatedSizeMB: 0.5, isExtended: true },
  { code: "tgk", name: "Tajik", nativeName: "Тоҷикӣ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "tir", name: "Tigrinya", nativeName: "ትግርኛ", estimatedSizeMB: 0.5, isExtended: true },
  { code: "tur", name: "Turkish", nativeName: "Türkçe", estimatedSizeMB: 0.5, isExtended: true },
  { code: "ukr", name: "Ukrainian", nativeName: "Українська", estimatedSizeMB: 0.5, isExtended: true },
  { code: "urd", name: "Urdu", nativeName: "اردو", estimatedSizeMB: 0.5, isExtended: true },
  { code: "uzb", name: "Uzbek", nativeName: "Oʻzbek", estimatedSizeMB: 0.5, isExtended: true },
  { code: "vie", name: "Vietnamese", nativeName: "Tiếng Việt", estimatedSizeMB: 0.5, isExtended: true },
  { code: "xho", name: "Xhosa", nativeName: "IsiXhosa", estimatedSizeMB: 0.5, isExtended: true },
  { code: "yor", name: "Yoruba", nativeName: "Yorùbá", estimatedSizeMB: 0.5, isExtended: true },
  { code: "zul", name: "Zulu", nativeName: "IsiZulu", estimatedSizeMB: 0.5, isExtended: true },
];

// All available OMW languages combined
export const OMW_LANGUAGES: OMWLanguageInfo[] = [
  ...OMW_CORE_LANGUAGES,
  ...OMW_EXTENDED_LANGUAGES,
];

// Mapping from Wordsmith LanguageCode to OMW language code
// Not all Wordsmith languages have OMW equivalents
export const WORDSMITH_TO_OMW: Partial<Record<LanguageCode, OMWLanguageCode>> = {
  en: "eng",
  es: "spa",
  fr: "fra",
  de: "deu",  // Extended (CLDR)
  it: "ita",
  "pt-BR": "por",
  ja: "jpn",
  ko: "kor",  // Extended (CLDR)
  ar: "arb",
  ru: "rus",  // Extended (CLDR)
  hi: "hin",  // Extended (CLDR)
  tr: "tur",  // Extended (CLDR)
  cs: "ces",  // Extended (CLDR)
  da: "dan",
  el: "ell",
  hu: "hun",  // Extended (CLDR)
  no: "nob",  // Map Norwegian to Bokmål by default
  pl: "pol",
  ro: "ron",
  sk: "slk",
};

// Reverse mapping from OMW code to Wordsmith LanguageCode
export const OMW_TO_WORDSMITH: Partial<Record<OMWLanguageCode, LanguageCode>> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt-BR",
  jpn: "ja",
  kor: "ko",
  arb: "ar",
  rus: "ru",
  hin: "hi",
  tur: "tr",
  ces: "cs",
  dan: "da",
  ell: "el",
  hun: "hu",
  nob: "no",
  nno: "no",
  pol: "pl",
  ron: "ro",
  slk: "sk",
};

/**
 * Get OMW language info by code.
 */
export function getOMWLanguageInfo(code: OMWLanguageCode): OMWLanguageInfo | undefined {
  return OMW_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get OMW language code from Wordsmith language code.
 * Returns undefined if no mapping exists.
 */
export function getOMWCodeFromWordsmith(code: LanguageCode): OMWLanguageCode | undefined {
  return WORDSMITH_TO_OMW[code];
}

/**
 * Get Wordsmith language code from OMW code.
 * Returns undefined if no mapping exists.
 */
export function getWordsmithCodeFromOMW(code: OMWLanguageCode): LanguageCode | undefined {
  return OMW_TO_WORDSMITH[code];
}

/**
 * Check if an OMW language code is valid.
 */
export function isValidOMWCode(code: string): code is OMWLanguageCode {
  return OMW_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Check if an OMW language is a core (hand-curated) language.
 */
export function isOMWCoreLanguage(code: OMWLanguageCode): boolean {
  return OMW_CORE_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Check if an OMW language is extended (auto-constructed from CLDR).
 */
export function isOMWExtendedLanguage(code: OMWLanguageCode): boolean {
  return OMW_EXTENDED_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Get the download URL for an OMW language.
 * Core languages use different paths than extended languages.
 */
export function getOMWDownloadURL(code: OMWLanguageCode): string {
  const langInfo = getOMWLanguageInfo(code);

  if (!langInfo) {
    // Fallback for unknown codes
    return `https://raw.githubusercontent.com/omwn/omw-data/main/wns/${code}/wn-data-${code}.tab`;
  }

  if (langInfo.isExtended) {
    // Extended languages use CLDR directory
    return `https://raw.githubusercontent.com/omwn/omw-data/main/wns/cldr/wn-cldr-${code}.tab`;
  }

  // Core languages - check for subdirectory
  if (langInfo.directory) {
    return `https://raw.githubusercontent.com/omwn/omw-data/main/wns/${langInfo.directory}/wn-data-${code}.tab`;
  }

  // Standard core language path
  return `https://raw.githubusercontent.com/omwn/omw-data/main/wns/${code}/wn-data-${code}.tab`;
}
