import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ExchangeRateProviderFieldDto } from '@exchange-rate-providers/types/exchange-rate-providers.types.js';
import type {
  ExchangeRateProviderConfigModalData,
  ExchangeRateProviderConfigModalValue,
} from "./exchange-rate-provider-config-modal.token.js";

@customElement("merchello-exchange-rate-provider-config-modal")
export class MerchelloExchangeRateProviderConfigModalElement extends UmbModalBaseElement<
  ExchangeRateProviderConfigModalData,
  ExchangeRateProviderConfigModalValue
> {
  @state() private _fields: ExchangeRateProviderFieldDto[] = [];
  @state() private _values: Record<string, string> = {};
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadFields();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadFields(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const provider = this.data?.provider;

    if (!provider) {
      this._errorMessage = "No provider specified";
      this._isLoading = false;
      return;
    }

    // Load configuration fields
    const { data, error } = await MerchelloApi.getExchangeRateProviderFields(provider.alias);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._fields = data ?? [];

    // Initialize values from existing configuration or defaults
    const existingConfig = provider.configuration ?? {};
    this._values = {};

    for (const field of this._fields) {
      this._values[field.key] = existingConfig[field.key] ?? field.defaultValue ?? "";
    }

    this._isLoading = false;
  }

  private _handleValueChange(key: string, value: string): void {
    this._values = { ...this._values, [key]: value };
  }

  private _handleCheckboxChange(key: string, checked: boolean): void {
    this._values = { ...this._values, [key]: checked ? "true" : "false" };
  }

  private async _handleSave(): Promise<void> {
    const provider = this.data?.provider;

    if (!provider) return;

    this._isSaving = true;
    this._errorMessage = null;

    // Validate required fields
    for (const field of this._fields) {
      if (field.isRequired && !this._values[field.key]) {
        this._errorMessage = `${field.label} is required`;
        this._isSaving = false;
        return;
      }
    }

    try {
      const { error } = await MerchelloApi.saveExchangeRateProviderSettings(provider.alias, {
        configuration: this._values,
      });

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this._isSaving = false;
        return;
      }

      this._isSaving = false;
      this.value = { isSaved: true };
      this.modalContext?.submit();
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to save configuration";
      this._isSaving = false;
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderField(field: ExchangeRateProviderFieldDto): unknown {
    const value = this._values[field.key] ?? "";

    switch (field.fieldType) {
      case "Text":
      case "Url":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-input
              id="${field.key}"
              label="${field.label}"
              type="${field.fieldType === "Url" ? "url" : "text"}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>
        `;

      case "Password":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-input
              id="${field.key}"
              label="${field.label}"
              type="password"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
            ${field.isSensitive && value
              ? html`<small class="sensitive-note">Value is stored securely</small>`
              : nothing}
          </div>
        `;

      case "Textarea":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-textarea
              id="${field.key}"
              label="${field.label}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLTextAreaElement).value)}
            ></uui-textarea>
          </div>
        `;

      case "Checkbox":
        return html`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${field.key}"
              label="${field.label}"
              ?checked=${value === "true"}
              @change=${(e: Event) =>
                this._handleCheckboxChange(field.key, (e.target as HTMLInputElement).checked)}
            >
              ${field.label}
            </uui-checkbox>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
          </div>
        `;

      default:
        return nothing;
    }
  }

  override render() {
    const provider = this.data?.provider;

    return html`
      <umb-body-layout headline="Configure ${provider?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading
            ? html`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading configuration...</span>
                </div>
              `
            : html`
                ${this._errorMessage
                  ? html`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    `
                  : nothing}

                ${this._fields.length > 0
                  ? html`
                      <p class="section-description">
                        Configure the settings for ${provider?.displayName ?? "this provider"}.
                      </p>
                      ${this._fields.map((field) => this._renderField(field))}
                    `
                  : html`
                      <p class="no-fields">
                        This provider does not require any configuration.
                      </p>
                    `}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Save"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving || this._fields.length === 0}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-fields {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .field-description {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .checkbox-field .field-description {
      margin-left: var(--uui-size-space-5);
    }

    .sensitive-note {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input,
    uui-textarea {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloExchangeRateProviderConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-exchange-rate-provider-config-modal": MerchelloExchangeRateProviderConfigModalElement;
  }
}
