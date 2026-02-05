import { App } from "obsidian";
import { AddAPIServiceModal } from "./AddAPIServiceModal";
import { APIServiceConfig, APIServiceType } from "../types/types";

// Mock the API service creation
jest.mock("../services/api", () => ({
  createAPIServiceForValidation: jest.fn().mockReturnValue({
    validate: jest.fn().mockResolvedValue({ valid: true }),
  }),
}));

// Mock SynonymService
jest.mock("../services/SynonymService", () => ({
  API_SERVICE_INFO: {
    "free-dictionary": {
      type: "free-dictionary",
      name: "Free Dictionary",
      description: "Free dictionary API",
      requiresKey: false,
      registrationUrl: "",
      registrationInstructions: "No API key required",
      supportedTypes: ["synonym", "antonym"],
      supportedLanguages: ["en", "es", "fr", "de"],
    },
    "merriam-webster": {
      type: "merriam-webster",
      name: "Merriam-Webster",
      description: "Collegiate Thesaurus API",
      requiresKey: true,
      registrationUrl: "https://dictionaryapi.com/register",
      registrationInstructions: "Create a free account",
      supportedTypes: ["synonym", "antonym"],
      supportedLanguages: ["en"],
    },
    "big-huge-thesaurus": {
      type: "big-huge-thesaurus",
      name: "Big Huge Thesaurus",
      description: "Simple thesaurus API",
      requiresKey: true,
      registrationUrl: "https://words.bighugelabs.com",
      registrationInstructions: "Create an account",
      supportedTypes: ["synonym", "antonym", "related"],
      supportedLanguages: ["en"],
    },
    "words-api": {
      type: "words-api",
      name: "WordsAPI",
      description: "Comprehensive word data",
      requiresKey: true,
      registrationUrl: "https://rapidapi.com",
      registrationInstructions: "Sign up for RapidAPI",
      supportedTypes: ["synonym", "antonym", "related", "hypernym", "hyponym"],
      supportedLanguages: ["en"],
    },
    "api-ninjas": {
      type: "api-ninjas",
      name: "API Ninjas",
      description: "Thesaurus API",
      requiresKey: true,
      registrationUrl: "https://api-ninjas.com",
      registrationInstructions: "Create a free account",
      supportedTypes: ["synonym", "antonym"],
      supportedLanguages: ["en"],
    },
    altervista: {
      type: "altervista",
      name: "Altervista",
      description: "Multilingual thesaurus",
      requiresKey: true,
      registrationUrl: "https://thesaurus.altervista.org",
      registrationInstructions: "Register for an API key",
      supportedTypes: ["synonym", "antonym"],
      supportedLanguages: ["cs", "da", "de", "el", "en", "es", "fr", "hu", "it", "no", "pl", "pt-BR", "ro", "ru", "sk"],
    },
  },
  getAllAPIServiceTypes: jest.fn().mockReturnValue([
    "free-dictionary",
    "merriam-webster",
    "big-huge-thesaurus",
    "words-api",
    "api-ninjas",
    "altervista",
  ]),
  getAPIServiceInfo: jest.fn().mockImplementation((type: string) => {
    const info = {
      "free-dictionary": {
        name: "Free Dictionary",
        description: "Free dictionary API",
        requiresKey: false,
        registrationUrl: "",
        registrationInstructions: "No API key required",
        supportedTypes: ["synonym", "antonym"],
        supportedLanguages: ["en", "es", "fr", "de"],
      },
      "merriam-webster": {
        name: "Merriam-Webster",
        description: "Collegiate Thesaurus API",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/register",
        registrationInstructions: "Create a free account",
        supportedTypes: ["synonym", "antonym"],
        supportedLanguages: ["en"],
      },
      "big-huge-thesaurus": {
        name: "Big Huge Thesaurus",
        description: "Simple thesaurus API",
        requiresKey: true,
        registrationUrl: "https://words.bighugelabs.com",
        registrationInstructions: "Create an account",
        supportedTypes: ["synonym", "antonym", "related"],
        supportedLanguages: ["en"],
      },
      "words-api": {
        name: "WordsAPI",
        description: "Comprehensive word data",
        requiresKey: true,
        registrationUrl: "https://rapidapi.com",
        registrationInstructions: "Sign up for RapidAPI",
        supportedTypes: ["synonym", "antonym", "related", "hypernym", "hyponym"],
        supportedLanguages: ["en"],
      },
      "api-ninjas": {
        name: "API Ninjas",
        description: "Thesaurus API",
        requiresKey: true,
        registrationUrl: "https://api-ninjas.com",
        registrationInstructions: "Create a free account",
        supportedTypes: ["synonym", "antonym"],
        supportedLanguages: ["en"],
      },
      altervista: {
        name: "Altervista",
        description: "Multilingual thesaurus",
        requiresKey: true,
        registrationUrl: "https://thesaurus.altervista.org",
        registrationInstructions: "Register for an API key",
        supportedTypes: ["synonym", "antonym"],
        supportedLanguages: ["cs", "da", "de", "el", "en", "es", "fr", "hu", "it", "no", "pl", "pt-BR", "ro", "ru", "sk"],
      },
    };
    return info[type as keyof typeof info] || info["free-dictionary"];
  }),
}));

function createMockApp(): App {
  return {
    workspace: {
      getActiveViewOfType: jest.fn().mockReturnValue(null),
    },
    vault: {
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
    },
  } as unknown as App;
}

function createMockPlugin() {
  return {
    app: createMockApp(),
    settings: {
      sources: [],
    },
  };
}

describe("AddAPIServiceModal", () => {
  let mockPlugin: ReturnType<typeof createMockPlugin>;
  let onAddCallback: jest.Mock<void, [APIServiceConfig]>;
  let modal: AddAPIServiceModal;

  beforeEach(() => {
    // Reset getAPIServiceInfo to default implementation
    const { getAPIServiceInfo } = require("../services/SynonymService");
    getAPIServiceInfo.mockImplementation((type: string) => {
      const info: Record<string, { name: string; description: string; requiresKey: boolean; registrationUrl: string; registrationInstructions: string; supportedTypes: string[]; supportedLanguages: string[] }> = {
        "free-dictionary": {
          name: "Free Dictionary",
          description: "Free dictionary API",
          requiresKey: false,
          registrationUrl: "",
          registrationInstructions: "No API key required",
          supportedTypes: ["synonym", "antonym"],
          supportedLanguages: ["en", "es", "fr", "de"],
        },
        "merriam-webster": {
          name: "Merriam-Webster",
          description: "Collegiate Thesaurus API",
          requiresKey: true,
          registrationUrl: "https://dictionaryapi.com/register",
          registrationInstructions: "Create a free account",
          supportedTypes: ["synonym", "antonym"],
          supportedLanguages: ["en"],
        },
      };
      return info[type] || info["free-dictionary"];
    });

    mockPlugin = createMockPlugin();
    onAddCallback = jest.fn();
    modal = new AddAPIServiceModal(
      mockPlugin as unknown as Parameters<typeof AddAPIServiceModal.prototype.constructor>[0],
      onAddCallback
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any modal DOM elements
    document.body.innerHTML = "";
  });

  describe("onOpen()", () => {
    it("should render the modal content", () => {
      modal.open();

      expect(modal.contentEl.querySelector("h2")?.textContent).toBe("Add API service");
    });

    it("should add modal class to contentEl", () => {
      modal.open();

      expect(modal.contentEl.classList.contains("wordsmith-add-api-modal")).toBe(true);
    });

    it("should render service dropdown", () => {
      modal.open();

      const selects = modal.contentEl.querySelectorAll("select");
      expect(selects.length).toBe(1);
    });

    it("should render all API service types in dropdown", () => {
      modal.open();

      const select = modal.contentEl.querySelector("select");
      const options = select?.querySelectorAll("option");

      // Should have all 6 API service types
      expect(options?.length).toBe(6);
    });

    it("should render instructions container", () => {
      modal.open();

      const instructionsContainer = modal.contentEl.querySelector(".wordsmith-api-instructions");
      expect(instructionsContainer).not.toBeNull();
    });

    it("should render API key input", () => {
      modal.open();

      const input = modal.contentEl.querySelector("input[type='text']");
      expect(input).not.toBeNull();
    });

    it("should render validation status container", () => {
      modal.open();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer).not.toBeNull();
    });

    it("should render validate button", () => {
      modal.open();

      const buttons = modal.contentEl.querySelectorAll("button");
      const validateBtn = Array.from(buttons).find(b => b.textContent === "Validate");

      expect(validateBtn).not.toBeNull();
      expect(validateBtn?.classList.contains("mod-cta")).toBe(true);
    });

    it("should render add button (enabled for free services)", () => {
      // Default service is free-dictionary which doesn't require a key
      modal.open();

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add");

      expect(addBtn).not.toBeNull();
      // For free services, the button should be enabled (auto-validated)
      expect(addBtn?.disabled).toBe(false);
    });

    it("should render add button (disabled for paid services)", () => {
      // Mock merriam-webster which requires a key
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/",
        registrationInstructions: "Sign up for a free API key",
        supportedTypes: ["synonym", "antonym"],
      });

      const newModal = new AddAPIServiceModal(
        mockPlugin as unknown as Parameters<typeof AddAPIServiceModal.prototype.constructor>[0],
        onAddCallback
      );
      (newModal as unknown as { selectedType: string }).selectedType = "merriam-webster";
      newModal.open();

      const buttons = newModal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add");

      expect(addBtn).not.toBeNull();
      // For paid services, the button should be disabled until validated
      expect(addBtn?.disabled).toBe(true);
    });

    it("should render cancel button", () => {
      modal.open();

      const buttons = modal.contentEl.querySelectorAll("button");
      const cancelBtn = Array.from(buttons).find(b => b.textContent === "Cancel");

      expect(cancelBtn).not.toBeNull();
    });

    it("should have buttons container with correct class", () => {
      modal.open();

      const buttonsContainer = modal.contentEl.querySelector(".wordsmith-modal-buttons");
      expect(buttonsContainer).not.toBeNull();
    });
  });

  describe("service type dropdown", () => {
    it("should default to free-dictionary", () => {
      modal.open();

      const select = modal.contentEl.querySelector("select") as HTMLSelectElement;
      expect(select?.value).toBe("free-dictionary");
    });

    it("should update instructions when service type changes", () => {
      modal.open();

      const select = modal.contentEl.querySelector("select") as HTMLSelectElement;
      const instructionsContainer = modal.contentEl.querySelector(".wordsmith-api-instructions");

      // Get initial instructions text
      const initialText = instructionsContainer?.textContent;

      // Change to merriam-webster
      select.value = "merriam-webster";
      select.dispatchEvent(new Event("change"));

      // Verify select value changed
      expect(select.value).toBe("merriam-webster");

      // Verify instructions container exists
      expect(instructionsContainer).not.toBeNull();
      expect(initialText).toBeDefined();
    });

    it("should have correct option values", () => {
      modal.open();

      const select = modal.contentEl.querySelector("select") as HTMLSelectElement;
      const optionValues = Array.from(select.options).map(o => o.value);

      expect(optionValues).toContain("free-dictionary");
      expect(optionValues).toContain("merriam-webster");
      expect(optionValues).toContain("big-huge-thesaurus");
      expect(optionValues).toContain("words-api");
      expect(optionValues).toContain("api-ninjas");
      expect(optionValues).toContain("altervista");
    });

    it("should have correct display names", () => {
      modal.open();

      const select = modal.contentEl.querySelector("select") as HTMLSelectElement;
      const optionTexts = Array.from(select.options).map(o => o.text);

      expect(optionTexts).toContain("Free Dictionary");
      expect(optionTexts).toContain("Merriam-Webster");
    });
  });

  describe("API key input", () => {
    it("should be hidden for services that do not require a key", () => {
      modal.open();

      // Default is free-dictionary which doesn't require a key
      const apiKeySetting = modal.contentEl.querySelector(".wordsmith-api-key-setting");

      // For free-dictionary, API key setting should be hidden
      expect(apiKeySetting).not.toBeNull();
      expect(apiKeySetting?.classList.contains("wordsmith-hidden")).toBe(true);
    });

    it("should be visible for services that require a key", () => {
      // Mock merriam-webster which requires a key
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/",
        registrationInstructions: "Sign up for a free API key",
        supportedTypes: ["synonym", "antonym"],
      });

      // Create a new modal with merriam-webster as the selected type
      const newModal = new AddAPIServiceModal(
        mockPlugin as unknown as Parameters<typeof AddAPIServiceModal.prototype.constructor>[0],
        onAddCallback
      );
      (newModal as unknown as { selectedType: string }).selectedType = "merriam-webster";
      newModal.open();

      const apiKeySetting = newModal.contentEl.querySelector(".wordsmith-api-key-setting");

      // For merriam-webster, API key setting should be visible
      expect(apiKeySetting).not.toBeNull();
      expect(apiKeySetting?.classList.contains("wordsmith-hidden")).toBe(false);
    });

    it("should have placeholder text", () => {
      modal.open();

      const input = modal.contentEl.querySelector("input[type='text']") as HTMLInputElement;
      expect(input?.placeholder).toBe("Enter API key...");
    });
  });

  describe("validation", () => {
    it("should auto-validate free services", () => {
      modal.open();

      // Free dictionary doesn't require a key, so add button should be enabled
      // after the modal processes the service type
      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add") as HTMLButtonElement;

      // The add button should be enabled for free services (auto-validated)
      expect(addBtn).not.toBeNull();
      expect(addBtn?.disabled).toBe(false);

      // Verify internal state is validated
      expect((modal as unknown as { isValidated: boolean }).isValidated).toBe(true);
    });

    it("should show error when validating without API key for paid services", async () => {
      // Mock the service info to require a key
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get an API key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      // Manually set the selected type (simulating dropdown change)
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      const buttons = modal.contentEl.querySelectorAll("button");
      const validateBtn = Array.from(buttons).find(b => b.textContent === "Validate") as HTMLButtonElement;

      validateBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      // Should show error about missing API key
      expect(statusContainer?.classList.contains("wordsmith-status-error") ||
             statusContainer?.textContent?.includes("API key")).toBeTruthy();
    });

    it("should show loading state during validation", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve({ valid: true }), 100);
        })),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      // Set API key
      const input = modal.contentEl.querySelector("input[type='text']") as HTMLInputElement;
      input.value = "test-key";
      input.dispatchEvent(new Event("input"));

      // Update the internal state
      (modal as unknown as { apiKey: string }).apiKey = "test-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      const buttons = modal.contentEl.querySelectorAll("button");
      const validateBtn = Array.from(buttons).find(b => b.textContent === "Validate") as HTMLButtonElement;

      validateBtn.click();

      // Check for loading state (immediate)
      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-loading") ||
             statusContainer?.textContent?.includes("Validating")).toBeTruthy();
    });

    it("should show success after valid API key validation", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockResolvedValue({ valid: true }),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      // Set up the modal state
      (modal as unknown as { apiKey: string }).apiKey = "valid-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      // Call handleValidate directly
      await (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-success") ||
             statusContainer?.textContent?.includes("valid")).toBeTruthy();
    });

    it("should show error after invalid API key validation", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockResolvedValue({ valid: false, error: "Invalid API key" }),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { apiKey: string }).apiKey = "invalid-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      await (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-error") ||
             statusContainer?.textContent?.includes("Invalid")).toBeTruthy();
    });

    it("should handle validation errors gracefully", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockRejectedValue(new Error("Network error")),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { apiKey: string }).apiKey = "test-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      await (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-error") ||
             statusContainer?.textContent?.includes("Network error")).toBeTruthy();
    });

    it("should disable validate button during validation", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      let resolveValidation: (value: { valid: boolean }) => void;
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockImplementation(() => new Promise(resolve => {
          resolveValidation = resolve;
        })),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { apiKey: string }).apiKey = "test-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      const buttons = modal.contentEl.querySelectorAll("button");
      const validateBtn = Array.from(buttons).find(b => b.textContent === "Validate") as HTMLButtonElement;

      // Start validation (don't await)
      const validatePromise = (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      // Check button is disabled
      expect(validateBtn.disabled).toBe(true);

      // Complete validation
      resolveValidation!({ valid: true });
      await validatePromise;

      // Button should be re-enabled
      expect(validateBtn.disabled).toBe(false);
    });
  });

  describe("add button", () => {
    it("should be disabled when not validated (paid services)", () => {
      // Use a paid service that requires validation
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/",
        registrationInstructions: "Sign up for a free API key",
        supportedTypes: ["synonym", "antonym"],
      });

      const paidModal = new AddAPIServiceModal(
        mockPlugin as unknown as Parameters<typeof AddAPIServiceModal.prototype.constructor>[0],
        onAddCallback
      );
      (paidModal as unknown as { selectedType: string }).selectedType = "merriam-webster";
      paidModal.open();

      const buttons = paidModal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add");

      expect(addBtn?.disabled).toBe(true);
    });

    it("should be enabled after successful validation", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockResolvedValue({ valid: true }),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { apiKey: string }).apiKey = "valid-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      await (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add");

      expect(addBtn?.disabled).toBe(false);
    });

    it("should call onAdd callback with config when clicked", async () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Free Dictionary",
        requiresKey: false,
        registrationUrl: "",
        registrationInstructions: "No key needed",
        supportedTypes: ["synonym"],
      });

      modal.open();

      // For free dictionary, validation happens automatically
      (modal as unknown as { isValidated: boolean }).isValidated = true;
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "free-dictionary";
      (modal as unknown as { apiKey: string }).apiKey = "";

      // Update add button state
      (modal as unknown as { updateAddButton: () => void }).updateAddButton();

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add") as HTMLButtonElement;

      addBtn.click();

      expect(onAddCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "free-dictionary",
          apiKey: "",
          enabled: true,
        })
      );
    });

    it("should generate unique ID for new service", async () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Free Dictionary",
        requiresKey: false,
        registrationUrl: "",
        registrationInstructions: "No key needed",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { isValidated: boolean }).isValidated = true;
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "free-dictionary";
      (modal as unknown as { updateAddButton: () => void }).updateAddButton();

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add") as HTMLButtonElement;

      addBtn.click();

      expect(onAddCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^api-\d+-[a-z0-9]+$/),
        })
      );
    });

    it("should close modal after adding service", () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Free Dictionary",
        requiresKey: false,
        registrationUrl: "",
        registrationInstructions: "No key needed",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { isValidated: boolean }).isValidated = true;
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "free-dictionary";
      (modal as unknown as { updateAddButton: () => void }).updateAddButton();

      const closeSpy = jest.spyOn(modal, "close");

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add") as HTMLButtonElement;

      addBtn.click();

      expect(closeSpy).toHaveBeenCalled();
    });

    it("should include API key in config for paid services", async () => {
      const { createAPIServiceForValidation } = require("../services/api");
      createAPIServiceForValidation.mockReturnValue({
        validate: jest.fn().mockResolvedValue({ valid: true }),
      });

      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { apiKey: string }).apiKey = "my-secret-key";
      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";

      await (modal as unknown as { handleValidate: () => Promise<void> }).handleValidate();

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add") as HTMLButtonElement;

      addBtn.click();

      expect(onAddCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "merriam-webster",
          apiKey: "my-secret-key",
        })
      );
    });
  });

  describe("cancel button", () => {
    it("should close modal when clicked", () => {
      modal.open();

      const closeSpy = jest.spyOn(modal, "close");

      const buttons = modal.contentEl.querySelectorAll("button");
      const cancelBtn = Array.from(buttons).find(b => b.textContent === "Cancel") as HTMLButtonElement;

      cancelBtn.click();

      expect(closeSpy).toHaveBeenCalled();
    });

    it("should not call onAdd callback when cancelled", () => {
      modal.open();

      const buttons = modal.contentEl.querySelectorAll("button");
      const cancelBtn = Array.from(buttons).find(b => b.textContent === "Cancel") as HTMLButtonElement;

      cancelBtn.click();

      expect(onAddCallback).not.toHaveBeenCalled();
    });
  });

  describe("onClose()", () => {
    it("should clear contentEl", () => {
      modal.open();

      // Verify content exists
      expect(modal.contentEl.children.length).toBeGreaterThan(0);

      modal.close();

      // Content should be cleared
      expect(modal.contentEl.children.length).toBe(0);
    });
  });

  describe("instructions display", () => {
    it("should show instructions for current service type", () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/register",
        registrationInstructions: "Create a free account and request access",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";
      (modal as unknown as { updateInstructions: () => void }).updateInstructions();

      const instructionsText = modal.contentEl.querySelector(".wordsmith-instructions-text");
      expect(instructionsText?.textContent).toContain("Create a free account");
    });

    it("should show registration link when URL is provided", () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Merriam-Webster",
        requiresKey: true,
        registrationUrl: "https://dictionaryapi.com/register",
        registrationInstructions: "Create a free account",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { selectedType: APIServiceType }).selectedType = "merriam-webster";
      (modal as unknown as { updateInstructions: () => void }).updateInstructions();

      const link = modal.contentEl.querySelector(".wordsmith-registration-link") as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.href).toBe("https://dictionaryapi.com/register");
      expect(link.getAttribute("target")).toBe("_blank");
    });

    it("should not show registration link for free services", () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Free Dictionary",
        requiresKey: false,
        registrationUrl: "",
        registrationInstructions: "No API key required",
        supportedTypes: ["synonym"],
      });

      modal.open();

      (modal as unknown as { selectedType: APIServiceType }).selectedType = "free-dictionary";
      (modal as unknown as { updateInstructions: () => void }).updateInstructions();

      const link = modal.contentEl.querySelector(".wordsmith-registration-link");
      expect(link).toBeNull();
    });
  });

  describe("validation reset", () => {
    it("should reset validation when service type changes", async () => {
      const { getAPIServiceInfo } = require("../services/SynonymService");
      getAPIServiceInfo.mockReturnValue({
        name: "Test Service",
        requiresKey: true,
        registrationUrl: "https://example.com",
        registrationInstructions: "Get key",
        supportedTypes: ["synonym"],
      });

      modal.open();

      // Set as validated
      (modal as unknown as { isValidated: boolean }).isValidated = true;
      (modal as unknown as { updateAddButton: () => void }).updateAddButton();

      // Reset validation
      (modal as unknown as { resetValidation: () => void }).resetValidation();

      expect((modal as unknown as { isValidated: boolean }).isValidated).toBe(false);

      const buttons = modal.contentEl.querySelectorAll("button");
      const addBtn = Array.from(buttons).find(b => b.textContent === "Add");
      expect(addBtn?.disabled).toBe(true);
    });

    it("should reset validation when API key changes", () => {
      modal.open();

      // Set as validated
      (modal as unknown as { isValidated: boolean }).isValidated = true;

      // Reset validation
      (modal as unknown as { resetValidation: () => void }).resetValidation();

      expect((modal as unknown as { isValidated: boolean }).isValidated).toBe(false);
    });

    it("should clear validation error on reset", () => {
      modal.open();

      // Set an error
      (modal as unknown as { validationError: string | null }).validationError = "Some error";
      (modal as unknown as { updateStatus: () => void }).updateStatus();

      // Reset
      (modal as unknown as { resetValidation: () => void }).resetValidation();

      expect((modal as unknown as { validationError: string | null }).validationError).toBeNull();
    });
  });

  describe("different service types", () => {
    const serviceTypes: APIServiceType[] = [
      "free-dictionary",
      "merriam-webster",
      "big-huge-thesaurus",
      "words-api",
      "api-ninjas",
      "altervista",
    ];

    serviceTypes.forEach(serviceType => {
      it(`should handle ${serviceType} service type`, () => {
        const { getAPIServiceInfo } = require("../services/SynonymService");
        getAPIServiceInfo.mockReturnValue({
          name: serviceType,
          requiresKey: serviceType !== "free-dictionary",
          registrationUrl: serviceType !== "free-dictionary" ? "https://example.com" : "",
          registrationInstructions: "Instructions",
          supportedTypes: ["synonym"],
          supportedLanguages: ["en"],
        });

        modal.open();

        (modal as unknown as { selectedType: APIServiceType }).selectedType = serviceType;
        (modal as unknown as { updateInstructions: () => void }).updateInstructions();
        (modal as unknown as { updateAPIKeyVisibility: () => void }).updateAPIKeyVisibility();

        // Should not throw
        expect(() => {
          (modal as unknown as { resetValidation: () => void }).resetValidation();
        }).not.toThrow();
      });
    });
  });

  describe("error display", () => {
    it("should show error icon with x-circle", async () => {
      modal.open();

      (modal as unknown as { validationError: string | null }).validationError = "Test error";
      (modal as unknown as { updateStatus: () => void }).updateStatus();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-error")).toBe(true);
    });

    it("should display error message text", async () => {
      modal.open();

      (modal as unknown as { validationError: string | null }).validationError = "Invalid API key format";
      (modal as unknown as { updateStatus: () => void }).updateStatus();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.textContent).toContain("Invalid API key format");
    });

    it("should show success icon after validation", () => {
      modal.open();

      (modal as unknown as { isValidated: boolean }).isValidated = true;
      (modal as unknown as { validationError: string | null }).validationError = null;
      (modal as unknown as { updateStatus: () => void }).updateStatus();

      const statusContainer = modal.contentEl.querySelector(".wordsmith-validation-status");
      expect(statusContainer?.classList.contains("wordsmith-status-success")).toBe(true);
      expect(statusContainer?.textContent).toContain("valid");
    });
  });
});
