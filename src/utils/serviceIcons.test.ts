import {
  getServiceIconSVG,
  createServiceIcon,
  hasOfficialLogo,
  getServiceIconConfig,
} from "./serviceIcons";

// Mock DOMParser for Node.js environment
class MockDOMParser {
  parseFromString(str: string, type: string): Document {
    // Create a mock document with a mock svg element
    const mockSvgElement = {
      tagName: "svg",
      getAttribute: (name: string) => {
        if (name === "viewBox") return "0 0 24 24";
        return null;
      },
    };
    return {
      documentElement: mockSvgElement,
    } as unknown as Document;
  }
}

// Mock HTMLElement for createServiceIcon tests
function createMockHTMLElement(): HTMLElement {
  const children: HTMLElement[] = [];
  const mockElement: Partial<HTMLElement> & {
    createSpan: (options?: { cls?: string }) => HTMLElement;
    children: HTMLElement[];
  } = {
    createSpan: function (options?: { cls?: string }): HTMLElement {
      const span = createMockSpanElement(options?.cls);
      children.push(span);
      return span;
    },
    children: children,
  };
  return mockElement as HTMLElement;
}

function createMockSpanElement(className?: string): HTMLElement {
  const appendedChildren: unknown[] = [];
  const mockSpan: Partial<HTMLElement> & {
    appendChild: (child: unknown) => void;
    appendedChildren: unknown[];
  } = {
    className: className || "",
    ownerDocument: {
      importNode: (node: unknown, deep: boolean) => node,
    } as unknown as Document,
    appendChild: function (child: unknown) {
      appendedChildren.push(child);
    },
    appendedChildren: appendedChildren,
  };
  return mockSpan as HTMLElement;
}

// Set up global DOMParser mock
(global as unknown as { DOMParser: typeof MockDOMParser }).DOMParser = MockDOMParser;

describe("serviceIcons", () => {
  describe("getServiceIconSVG", () => {
    describe("known service IDs with circle icons", () => {
      it("should return SVG for 'local' service", () => {
        const svg = getServiceIconSVG("local");
        expect(svg).toContain("<svg");
        expect(svg).toContain("</svg>");
        expect(svg).toContain("<circle");
        expect(svg).toContain(">L<"); // Abbreviation "L"
        expect(svg).toContain("#3B82F6"); // Blue color
      });

      it("should return SVG for 'datamuse' service", () => {
        const svg = getServiceIconSVG("datamuse");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">DM<"); // Abbreviation "DM"
        expect(svg).toContain("#F97316"); // Orange color
      });

      it("should return SVG for 'spelling' service", () => {
        const svg = getServiceIconSVG("spelling");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">Sp<"); // Abbreviation "Sp"
        expect(svg).toContain("#8B5CF6"); // Purple color
      });

      it("should return SVG for 'big-huge-thesaurus' service", () => {
        const svg = getServiceIconSVG("big-huge-thesaurus");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">BHT<"); // Abbreviation "BHT"
        expect(svg).toContain("#06B6D4"); // Cyan color
      });

      it("should return SVG for 'altervista' service", () => {
        const svg = getServiceIconSVG("altervista");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">AV<"); // Abbreviation "AV"
        expect(svg).toContain("#EC4899"); // Pink color
      });

      it("should return SVG for 'free-dictionary' service", () => {
        const svg = getServiceIconSVG("free-dictionary");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">FD<"); // Abbreviation "FD"
        expect(svg).toContain("#22C55E"); // Green color
      });
    });

    describe("known service IDs with official logos", () => {
      it("should return Merriam-Webster logo SVG", () => {
        const svg = getServiceIconSVG("merriam-webster");
        expect(svg).toContain("<svg");
        expect(svg).toContain("Merriam-");
        expect(svg).toContain("Webster");
        expect(svg).toContain("#C41230"); // Red ring
        expect(svg).toContain("#003A70"); // Blue text
      });

      it("should return Words API logo SVG", () => {
        const svg = getServiceIconSVG("words-api");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">W<"); // "W" text
        expect(svg).toContain("#6366F1"); // Purple background
      });

      it("should return API Ninjas logo SVG", () => {
        const svg = getServiceIconSVG("api-ninjas");
        expect(svg).toContain("<svg");
        expect(svg).toContain("<path"); // Star path
        expect(svg).toContain("#1F2937"); // Dark background
        expect(svg).toContain("#F59E0B"); // Gold star
      });
    });

    describe("unknown service IDs (fallback behavior)", () => {
      it("should return fallback icon for unknown service", () => {
        const svg = getServiceIconSVG("unknown-service");
        expect(svg).toContain("<svg");
        expect(svg).toContain(">?<"); // Question mark
        expect(svg).toContain("#6B7280"); // Gray color
      });

      it("should return fallback icon for empty string", () => {
        const svg = getServiceIconSVG("");
        expect(svg).toContain(">?<");
        expect(svg).toContain("#6B7280");
      });

      it("should return fallback icon for nonsense input", () => {
        const svg = getServiceIconSVG("asdfghjkl");
        expect(svg).toContain(">?<");
        expect(svg).toContain("#6B7280");
      });
    });

    describe("SVG structure", () => {
      it("should produce valid SVG with viewBox", () => {
        const svg = getServiceIconSVG("local");
        expect(svg).toContain('viewBox="0 0 24 24"');
      });

      it("should include xmlns attribute in circle icons", () => {
        const svg = getServiceIconSVG("local");
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      });
    });

    describe("font size based on abbreviation length", () => {
      it("should use larger font for single-character abbreviation", () => {
        const svg = getServiceIconSVG("local"); // "L" - 1 char
        expect(svg).toContain('font-size="12"');
      });

      it("should use medium font for two-character abbreviation", () => {
        const svg = getServiceIconSVG("datamuse"); // "DM" - 2 chars
        expect(svg).toContain('font-size="10"');
      });

      it("should use smaller font for three-character abbreviation", () => {
        const svg = getServiceIconSVG("big-huge-thesaurus"); // "BHT" - 3 chars
        expect(svg).toContain('font-size="8"');
      });
    });
  });

  describe("createServiceIcon", () => {
    it("should create span element with correct class", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local", 18);
      expect(icon.className).toContain("wordsmith-service-icon");
      expect(icon.className).toContain("wordsmith-icon-md");
    });

    it("should use small size class for size <= 16", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local", 16);
      expect(icon.className).toContain("wordsmith-icon-sm");
    });

    it("should use medium size class for size between 17 and 23", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local", 18);
      expect(icon.className).toContain("wordsmith-icon-md");
    });

    it("should use large size class for size >= 24", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local", 24);
      expect(icon.className).toContain("wordsmith-icon-lg");
    });

    it("should default to size 18 (medium)", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local");
      expect(icon.className).toContain("wordsmith-icon-md");
    });

    it("should append SVG element to icon span", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "local") as HTMLElement & { appendedChildren: unknown[] };
      expect(icon.appendedChildren.length).toBe(1);
    });

    it("should work with unknown service ID (fallback)", () => {
      const parent = createMockHTMLElement();
      const icon = createServiceIcon(parent, "unknown");
      expect(icon.className).toContain("wordsmith-service-icon");
    });
  });

  describe("hasOfficialLogo", () => {
    it("should return true for merriam-webster", () => {
      expect(hasOfficialLogo("merriam-webster")).toBe(true);
    });

    it("should return true for words-api", () => {
      expect(hasOfficialLogo("words-api")).toBe(true);
    });

    it("should return true for api-ninjas", () => {
      expect(hasOfficialLogo("api-ninjas")).toBe(true);
    });

    it("should return false for local (circle type)", () => {
      expect(hasOfficialLogo("local")).toBe(false);
    });

    it("should return false for datamuse (circle type)", () => {
      expect(hasOfficialLogo("datamuse")).toBe(false);
    });

    it("should return false for unknown service", () => {
      expect(hasOfficialLogo("unknown")).toBe(false);
    });
  });

  describe("getServiceIconConfig", () => {
    it("should return config for known services", () => {
      const config = getServiceIconConfig("local");
      expect(config).toBeDefined();
      expect(config?.type).toBe("circle");
      expect(config?.abbrev).toBe("L");
      expect(config?.color).toBe("#3B82F6");
    });

    it("should return config with SVG for logo services", () => {
      const config = getServiceIconConfig("merriam-webster");
      expect(config).toBeDefined();
      expect(config?.type).toBe("logo");
      expect(config?.svg).toContain("Merriam-");
    });

    it("should return undefined for unknown service", () => {
      const config = getServiceIconConfig("unknown");
      expect(config).toBeUndefined();
    });

    it("should return all expected fields for circle type", () => {
      const config = getServiceIconConfig("datamuse");
      expect(config).toEqual({
        type: "circle",
        abbrev: "DM",
        color: "#F97316",
        textColor: "#FFFFFF",
      });
    });
  });
});
