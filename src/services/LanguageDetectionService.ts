import { franc } from "franc-min";
import { LanguageCode, ResolvedLanguage } from "../types/language";
import { isValidLanguageCode } from "../data/languages";

// Mapping from ISO 639-3 (franc output) to our LanguageCode (ISO 639-1 with variants)
const ISO639_3_TO_LANGUAGE_CODE: Record<string, LanguageCode> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt-BR",  // franc doesn't distinguish BR vs PT
  jpn: "ja",
  kor: "ko",
  ara: "ar",
  rus: "ru",
  hin: "hi",
  tur: "tr",
  ces: "cs",
  dan: "da",
  ell: "el",
  hun: "hu",
  nor: "no",
  nob: "no",  // Norwegian Bokmål
  nno: "no",  // Norwegian Nynorsk
  pol: "pl",
  ron: "ro",
  slk: "sk",
};

// Minimum text length for reliable detection
const MIN_TEXT_LENGTH = 20;

export class LanguageDetectionService {
  /**
   * Detect language from text.
   * Returns null if text is too short or language cannot be determined.
   */
  detect(text: string): { code: LanguageCode } | null {
    if (!text || text.trim().length < MIN_TEXT_LENGTH) {
      return null;
    }

    const iso639_3 = franc(text);

    // franc returns "und" (undetermined) if it can't detect
    if (iso639_3 === "und") {
      return null;
    }

    const code = ISO639_3_TO_LANGUAGE_CODE[iso639_3];
    if (code && isValidLanguageCode(code)) {
      return { code };
    }

    return null;
  }

  /**
   * Detect language and return a ResolvedLanguage object.
   * @param text - Text to analyze
   * @param fallback - Fallback language code if detection fails
   */
  detectWithFallback(text: string, fallback: LanguageCode): ResolvedLanguage {
    const detected = this.detect(text);

    if (detected) {
      return {
        code: detected.code,
        source: "detection",
        detectionFailed: false,
      };
    }

    return {
      code: fallback,
      source: "fallback",
      detectionFailed: true,
    };
  }
}
