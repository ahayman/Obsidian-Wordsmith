import { Modal, Setting, setIcon } from "obsidian";
import WordsmithPlugin from "../main";
import { APIServiceConfig, APIServiceType, RelationshipType } from "../types/types";
import {
  API_SERVICE_INFO,
  getAllAPIServiceTypes,
  getAPIServiceInfo,
} from "../services/SynonymService";
import { createAPIServiceForValidation } from "../services/api";
import { getLanguageName } from "../data/languages";
import { LanguageCode } from "../types/language";

export class AddAPIServiceModal extends Modal {
  private plugin: WordsmithPlugin;
  private onAdd: (config: APIServiceConfig) => void;

  private selectedType: APIServiceType = "free-dictionary";
  private apiKey: string = "";
  private isValidated: boolean = false;
  private isValidating: boolean = false;
  private validationError: string | null = null;

  private apiKeyInputEl: HTMLInputElement | null = null;
  private validateButtonEl: HTMLButtonElement | null = null;
  private addButtonEl: HTMLButtonElement | null = null;
  private statusContainerEl: HTMLElement | null = null;
  private instructionsContainerEl: HTMLElement | null = null;

  constructor(
    plugin: WordsmithPlugin,
    onAdd: (config: APIServiceConfig) => void
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.onAdd = onAdd;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("wordsmith-add-api-modal");

    contentEl.createEl("h2", { text: "Add API service" });

    // Service type dropdown
    new Setting(contentEl)
      .setName("Service")
      .setDesc("Select the API service to add")
      .addDropdown((dropdown) => {
        for (const type of getAllAPIServiceTypes()) {
          const info = API_SERVICE_INFO[type];
          dropdown.addOption(type, info.name);
        }
        dropdown.setValue(this.selectedType);
        dropdown.onChange((value: string) => {
          this.selectedType = value as APIServiceType;
          this.resetValidation();
          this.updateInstructions();
          this.updateAPIKeyVisibility();
        });
      });

    // Instructions container
    this.instructionsContainerEl = contentEl.createDiv({
      cls: "wordsmith-api-instructions",
    });
    this.updateInstructions();

    // API key input
    const apiKeySetting = new Setting(contentEl)
      .setName("API key")
      .setDesc("Enter your API key for this service")
      .addText((text) => {
        this.apiKeyInputEl = text.inputEl;
        text.setPlaceholder("Enter API key...");
        text.onChange((value) => {
          this.apiKey = value;
          this.resetValidation();
        });
      });

    apiKeySetting.settingEl.addClass("wordsmith-api-key-setting");

    // Validation status container
    this.statusContainerEl = contentEl.createDiv({
      cls: "wordsmith-validation-status",
    });

    // Buttons container
    const buttonsEl = contentEl.createDiv({ cls: "wordsmith-modal-buttons" });

    // Validate button
    const validateBtn = buttonsEl.createEl("button", { text: "Validate" });
    validateBtn.addClass("mod-cta");
    this.validateButtonEl = validateBtn;
    validateBtn.addEventListener("click", () => {
      void this.handleValidate();
    });

    // Add button
    const addBtn = buttonsEl.createEl("button", { text: "Add" });
    addBtn.disabled = true;
    this.addButtonEl = addBtn;
    addBtn.addEventListener("click", () => this.handleAdd());

    // Cancel button
    const cancelBtn = buttonsEl.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    // Update API key visibility (must be after buttons are created for auto-validation to work)
    this.updateAPIKeyVisibility();
  }

  private updateInstructions(): void {
    if (!this.instructionsContainerEl) return;

    this.instructionsContainerEl.empty();
    const info = getAPIServiceInfo(this.selectedType);

    const instructionsText = this.instructionsContainerEl.createDiv({
      cls: "wordsmith-instructions-text",
    });
    instructionsText.setText(info.registrationInstructions);

    if (info.registrationUrl) {
      const linkEl = this.instructionsContainerEl.createEl("a", {
        cls: "wordsmith-registration-link",
        text: "Get API key",
        href: info.registrationUrl,
      });
      linkEl.setAttr("target", "_blank");
      const iconSpan = linkEl.createSpan();
      setIcon(iconSpan, "external-link");
    }

    // Service capabilities section
    const capabilitiesEl = this.instructionsContainerEl.createDiv({
      cls: "wordsmith-service-capabilities",
    });

    // Relationship types
    const typesEl = capabilitiesEl.createDiv({ cls: "wordsmith-capability-row" });
    typesEl.createSpan({ cls: "wordsmith-capability-label", text: "Types: " });
    typesEl.createSpan({
      cls: "wordsmith-capability-value",
      text: this.formatRelationshipTypes(info.supportedTypes),
    });

    // Languages
    const languagesEl = capabilitiesEl.createDiv({ cls: "wordsmith-capability-row" });
    languagesEl.createSpan({ cls: "wordsmith-capability-label", text: "Languages: " });
    languagesEl.createSpan({
      cls: "wordsmith-capability-value",
      text: this.formatLanguages(info.supportedLanguages),
    });
  }

  private formatRelationshipTypes(types: RelationshipType[] | undefined): string {
    if (!types || types.length === 0) {
      return "Unknown";
    }
    const typeNames: Record<RelationshipType, string> = {
      synonym: "Synonyms",
      antonym: "Antonyms",
      related: "Related",
      hypernym: "Hypernyms",
      hyponym: "Hyponyms",
    };
    return types.map(t => typeNames[t] || t).join(", ");
  }

  private formatLanguages(languages: LanguageCode[] | undefined): string {
    if (!languages || languages.length === 0) {
      return "Unknown";
    }
    if (languages.length === 1 && languages[0] === "en") {
      return "English only";
    }
    return languages.map(getLanguageName).join(", ");
  }

  private updateAPIKeyVisibility(): void {
    const info = getAPIServiceInfo(this.selectedType);
    const apiKeySetting = this.contentEl.querySelector(
      ".wordsmith-api-key-setting"
    );

    if (apiKeySetting) {
      if (info.requiresKey) {
        apiKeySetting.removeClass("wordsmith-hidden");
      } else {
        apiKeySetting.addClass("wordsmith-hidden");
        // Auto-validate free services
        this.isValidated = true;
        this.updateAddButton();
      }
    }
  }

  private resetValidation(): void {
    this.isValidated = false;
    this.validationError = null;
    this.updateStatus();
    this.updateAddButton();
  }

  private updateStatus(): void {
    if (!this.statusContainerEl) return;

    this.statusContainerEl.empty();
    this.statusContainerEl.removeClass(
      "wordsmith-status-success",
      "wordsmith-status-error",
      "wordsmith-status-loading"
    );

    if (this.isValidating) {
      this.statusContainerEl.addClass("wordsmith-status-loading");
      const spinnerEl = this.statusContainerEl.createSpan({
        cls: "wordsmith-spinner",
      });
      setIcon(spinnerEl, "loader");
      this.statusContainerEl.createSpan({ text: " Validating..." });
    } else if (this.validationError) {
      this.statusContainerEl.addClass("wordsmith-status-error");
      const iconEl = this.statusContainerEl.createSpan();
      setIcon(iconEl, "x-circle");
      this.statusContainerEl.createSpan({ text: ` ${this.validationError}` });
    } else if (this.isValidated) {
      this.statusContainerEl.addClass("wordsmith-status-success");
      const iconEl = this.statusContainerEl.createSpan();
      setIcon(iconEl, "check-circle");
      this.statusContainerEl.createSpan({ text: " API key is valid" });
    }
  }

  private updateAddButton(): void {
    if (this.addButtonEl) {
      this.addButtonEl.disabled = !this.isValidated;
    }
  }

  private async handleValidate(): Promise<void> {
    const info = getAPIServiceInfo(this.selectedType);

    // For services that don't require a key, just mark as validated
    if (!info.requiresKey) {
      this.isValidated = true;
      this.updateStatus();
      this.updateAddButton();
      return;
    }

    // Check if API key is provided
    if (!this.apiKey.trim()) {
      this.validationError = "Please enter an API key";
      this.updateStatus();
      return;
    }

    this.isValidating = true;
    this.updateStatus();

    if (this.validateButtonEl) {
      this.validateButtonEl.disabled = true;
    }

    try {
      const service = createAPIServiceForValidation(
        this.selectedType,
        this.apiKey
      );
      const result = await service.validate();

      this.isValidating = false;

      if (result.valid) {
        this.isValidated = true;
        this.validationError = null;
      } else {
        this.isValidated = false;
        this.validationError = result.error || "Validation failed";
      }
    } catch (error) {
      this.isValidating = false;
      this.isValidated = false;
      this.validationError =
        error instanceof Error ? error.message : "Validation failed";
    }

    if (this.validateButtonEl) {
      this.validateButtonEl.disabled = false;
    }

    this.updateStatus();
    this.updateAddButton();
  }

  private handleAdd(): void {
    if (!this.isValidated) return;

    const config: APIServiceConfig = {
      id: this.generateId(),
      type: this.selectedType,
      apiKey: this.apiKey,
      enabled: true,
    };

    this.onAdd(config);
    this.close();
  }

  private generateId(): string {
    return `api-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
