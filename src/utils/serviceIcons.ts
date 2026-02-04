/**
 * Service icons for tabs and settings display.
 * Uses official logos where available, colored circle abbreviations otherwise.
 */

// Service icon configuration
interface ServiceIconConfig {
  type: "logo" | "circle";
  // For circle type: abbreviation and color
  abbrev?: string;
  color?: string;
  textColor?: string;
  // For logo type: SVG content
  svg?: string;
}

// Merriam-Webster official logo - white circle with red ring and blue text
const MERRIAM_WEBSTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <circle cx="120" cy="120" r="110" fill="#FFFFFF"/>
  <circle cx="120" cy="120" r="102" fill="none" stroke="#C41230" stroke-width="6"/>
  <text x="120" y="115" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="400" fill="#003A70" text-anchor="middle">Merriam-</text>
  <text x="120" y="155" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="400" fill="#003A70" text-anchor="middle">Webster</text>
  <text x="225" y="175" font-family="Arial, sans-serif" font-size="12" fill="#000000">®</text>
</svg>`;

// Words API logo (stylized "W")
const WORDS_API_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="4" fill="#6366F1"/>
  <text x="12" y="17" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">W</text>
</svg>`;

// API Ninjas logo (ninja star symbol)
const API_NINJAS_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="4" fill="#1F2937"/>
  <path d="M12 4L14 10H20L15 14L17 20L12 16L7 20L9 14L4 10H10L12 4Z" fill="#F59E0B"/>
</svg>`;

// Icon configurations for all services
const SERVICE_ICONS: Record<string, ServiceIconConfig> = {
  // Built-in sources
  local: {
    type: "circle",
    abbrev: "L",
    color: "#3B82F6", // Blue
    textColor: "#FFFFFF",
  },
  datamuse: {
    type: "circle",
    abbrev: "DM",
    color: "#F97316", // Orange
    textColor: "#FFFFFF",
  },
  spelling: {
    type: "circle",
    abbrev: "Sp",
    color: "#8B5CF6", // Purple
    textColor: "#FFFFFF",
  },

  // API services with logos
  "merriam-webster": {
    type: "logo",
    svg: MERRIAM_WEBSTER_SVG,
  },
  "words-api": {
    type: "logo",
    svg: WORDS_API_SVG,
  },
  "api-ninjas": {
    type: "logo",
    svg: API_NINJAS_SVG,
  },

  // API services with circle abbreviations
  "big-huge-thesaurus": {
    type: "circle",
    abbrev: "BHT",
    color: "#06B6D4", // Cyan
    textColor: "#FFFFFF",
  },
  altervista: {
    type: "circle",
    abbrev: "AV",
    color: "#EC4899", // Pink
    textColor: "#FFFFFF",
  },
  "free-dictionary": {
    type: "circle",
    abbrev: "FD",
    color: "#22C55E", // Green
    textColor: "#FFFFFF",
  },
};

/**
 * Generates an SVG circle icon with centered text abbreviation.
 */
function createCircleIcon(abbrev: string, bgColor: string, textColor: string): string {
  const fontSize = abbrev.length === 1 ? 12 : abbrev.length === 2 ? 10 : 8;
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="${bgColor}"/>
    <text x="12" y="16" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">${abbrev}</text>
  </svg>`;
}

/**
 * Gets the SVG icon for a service.
 * @param serviceId - The service ID (built-in tab ID or API service type)
 * @returns SVG string for the icon
 */
export function getServiceIconSVG(serviceId: string): string {
  const config = SERVICE_ICONS[serviceId];
  if (!config) {
    // Fallback: gray circle with "?"
    return createCircleIcon("?", "#6B7280", "#FFFFFF");
  }

  if (config.type === "logo" && config.svg) {
    return config.svg;
  }

  return createCircleIcon(
    config.abbrev || "?",
    config.color || "#6B7280",
    config.textColor || "#FFFFFF"
  );
}

/**
 * Creates an icon element for a service and appends it to the parent.
 * Uses a size class for styling (wordsmith-icon-sm, wordsmith-icon-md, wordsmith-icon-lg).
 * @param parent - Parent element to append the icon to
 * @param serviceId - The service ID
 * @param size - Icon size in pixels (16 = sm, 18 = md, 24 = lg)
 * @returns The created icon element
 */
export function createServiceIcon(
  parent: HTMLElement,
  serviceId: string,
  size: number = 18
): HTMLElement {
  const sizeClass = size <= 16 ? "wordsmith-icon-sm" : size >= 24 ? "wordsmith-icon-lg" : "wordsmith-icon-md";
  const iconEl = parent.createSpan({ cls: `wordsmith-service-icon ${sizeClass}` });

  // Parse and append the SVG safely
  const svgString = getServiceIconSVG(serviceId);
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.documentElement;

  if (svgElement && svgElement.tagName === "svg") {
    iconEl.appendChild(iconEl.ownerDocument.importNode(svgElement, true));
  }

  return iconEl;
}

/**
 * Checks if a service has an official logo.
 */
export function hasOfficialLogo(serviceId: string): boolean {
  const config = SERVICE_ICONS[serviceId];
  return config?.type === "logo";
}

/**
 * Gets the icon configuration for a service.
 */
export function getServiceIconConfig(serviceId: string): ServiceIconConfig | undefined {
  return SERVICE_ICONS[serviceId];
}
