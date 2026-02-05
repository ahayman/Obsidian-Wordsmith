// Mock for franc-min ESM module
export function franc(text: string): string {
  // Simple mock that returns common language codes for testing
  if (text.includes("bonjour") || text.includes("français")) {
    return "fra"; // French
  }
  if (text.includes("hola") || text.includes("español")) {
    return "spa"; // Spanish
  }
  if (text.includes("guten") || text.includes("deutsch")) {
    return "deu"; // German
  }
  if (text.includes("ciao") || text.includes("italiano")) {
    return "ita"; // Italian
  }
  if (text.length < 10) {
    return "und"; // Undetermined for short text
  }
  return "eng"; // Default to English
}
