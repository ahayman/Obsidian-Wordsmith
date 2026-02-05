import { App } from "obsidian";
import { LanguageCode, ResolvedLanguage } from "../types/language";
import { WordsmithSettings } from "../types/types";
import { LanguageDetectionService } from "./LanguageDetectionService";
import { isValidLanguageCode } from "../data/languages";

// Map Obsidian locale codes to our language codes
const OBSIDIAN_LOCALE_MAP: Record<string, LanguageCode> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  "pt-BR": "pt-BR",
  pt: "pt-BR",  // Map generic Portuguese to Brazilian
  ja: "ja",
  ko: "ko",
  ar: "ar",
  ru: "ru",
  hi: "hi",
  tr: "tr",
  cs: "cs",
  da: "da",
  el: "el",
  hu: "hu",
  no: "no",
  pl: "pl",
  ro: "ro",
  sk: "sk",
};

export class LanguageResolver {
  private app: App;
  private settings: WordsmithSettings;
  private detectionService: LanguageDetectionService;

  constructor(app: App, settings: WordsmithSettings) {
    this.app = app;
    this.settings = settings;
    this.detectionService = new LanguageDetectionService();
  }

  updateSettings(settings: WordsmithSettings): void {
    this.settings = settings;
  }

  /**
   * Resolve the language to use for lookup.
   *
   * Resolution priority:
   * 1. Frontmatter `lang: <code>` → Use that language
   * 2. Frontmatter `lang: auto` → Detect from context, fallback to settings
   * 3. Settings = "Auto Detect" → Detect from context, fallback to settings fallback
   * 4. Settings = "Default" → Use Obsidian locale
   * 5. Settings = specific code → Use that language
   *
   * @param contextText - Optional text to use for auto-detection
   */
  resolveLanguage(contextText?: string): ResolvedLanguage {
    // Step 1: Check frontmatter
    const frontmatterLang = this.getFromFrontmatter();

    if (frontmatterLang) {
      // Check if it's a specific language code
      if (isValidLanguageCode(frontmatterLang)) {
        return {
          code: frontmatterLang,
          source: "frontmatter",
        };
      }

      // Check if it's "auto" - detect from context
      if (frontmatterLang === "auto") {
        return this.detectLanguage(contextText);
      }
    }

    // Step 2: Use settings
    const settingValue = this.settings.language;

    // Settings = "auto" → Detect from context
    if (settingValue === "auto") {
      return this.detectLanguage(contextText);
    }

    // Settings = "default" → Use Obsidian locale
    if (settingValue === "default") {
      return {
        code: this.getObsidianLocale(),
        source: "obsidian-locale",
      };
    }

    // Settings = specific language code
    if (isValidLanguageCode(settingValue)) {
      return {
        code: settingValue,
        source: "settings",
      };
    }

    // Fallback to English if something went wrong
    return {
      code: "en",
      source: "fallback",
    };
  }

  /**
   * Read language from the active file's frontmatter.
   */
  getFromFrontmatter(): string | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (!cache?.frontmatter) {
      return null;
    }

    const propertyName = this.settings.frontmatterProperty || "lang";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = cache.frontmatter[propertyName];

    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }

    return null;
  }

  /**
   * Get language from Obsidian's locale setting.
   * Falls back to English if the locale is not supported.
   */
  getObsidianLocale(): LanguageCode {
    try {
      // Obsidian stores locale in localStorage under "language" key
      // Using the App API for this would be preferable, but Obsidian doesn't expose it
      // eslint-disable-next-line no-restricted-globals
      const locale = localStorage.getItem("language");
      if (locale && OBSIDIAN_LOCALE_MAP[locale]) {
        return OBSIDIAN_LOCALE_MAP[locale];
      }
    } catch {
      // localStorage may not be available in some contexts
    }

    return "en";
  }

  /**
   * Detect language from context text with fallback.
   */
  private detectLanguage(contextText?: string): ResolvedLanguage {
    if (contextText) {
      const detected = this.detectionService.detect(contextText);
      if (detected) {
        return {
          code: detected.code,
          source: "detection",
        };
      }
    }

    // Detection failed - use fallback
    return {
      code: this.settings.fallbackLanguage || "en",
      source: "fallback",
      detectionFailed: true,
    };
  }
}
