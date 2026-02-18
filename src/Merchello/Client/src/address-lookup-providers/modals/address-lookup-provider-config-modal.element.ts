import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { AddressLookupProviderFieldDto } from '@address-lookup-providers/types/address-lookup-providers.types.js';
import type {
  AddressLookupProviderConfigModalData,
  AddressLookupProviderConfigModalValue,
} from "@address-lookup-providers/modals/address-lookup-provider-config-modal.token.js";

@customElement("merchello-address-lookup-provider-config-modal")
export class MerchelloAddressLookupProviderConfigModalElement extends UmbModalBaseElement<
  AddressLookupProviderConfigModalData,
  AddressLookupProviderConfigModalValue
> {
  @state() private _fields: AddressLookupProviderFieldDto[] = [];
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

    const { data, error } = await MerchelloApi.getAddressLookupProviderFields(provider.alias);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._fields = data ?? [];

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

    for (const field of this._fields) {
      if (field.isRequired && !this._values[field.key]) {
        this._errorMessage = `${field.label} is required`;
        this._isSaving = false;
        return;
      }
    }

    try {
      const { error } = await MerchelloApi.saveAddressLookupProviderSettings(provider.alias, {
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

  private _getSelectFieldOptions(field: AddressLookupProviderFieldDto, currentValue: string): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Select...", value: "", selected: !currentValue },
      ...(field.options?.map(opt => ({
        name: opt.label,
        value: opt.value,
        selected: currentValue === opt.value
      })) ?? [])
    ];
  }

  private _renderField(field: AddressLookupProviderFieldDto): unknown {
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

      case "Select":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-select
              id="${field.key}"
              label="${field.label}"
              .options=${this._getSelectFieldOptions(field, value)}
              ?required=${field.isRequired}
              @change=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLSelectElement).value)}
            ></uui-select>
          </div>
        `;

      case "Number":
      case "Currency":
      case "Percentage":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-input
              id="${field.key}"
              label="${field.label}"
              type="number"
              step=${field.fieldType === "Number" ? "1" : "0.01"}
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>
        `;

      default:
        return nothing;
    }
  }

  private _formatSupportedCountries(): string | null {
    if (!this.data?.provider) return null;
    const countries = this.data.provider.supportedCountries;
    if (!countries || countries.length === 0) return "All countries";
    if (countries.some((c) => c === "*")) return "All countries";
    return countries.join(", ");
  }

  override render() {
    const provider = this.data?.provider;
    const supportedCountries = this._formatSupportedCountries();

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

                ${provider?.setupInstructions
                  ? html`
                      <div class="info-banner">
                        <uui-icon name="icon-info"></uui-icon>
                        <div>
                          <strong>Setup</strong>
                          <p>${provider.setupInstructions}</p>
                        </div>
                      </div>
                    `
                  : nothing}

                ${supportedCountries
                  ? html`
                      <div class="meta-row">
                        <span class="meta-label">Supported countries</span>
                        <span class="meta-value">${supportedCountries}</span>
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

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text);
    }

    .info-banner uui-icon {
      font-size: 1.2rem;
      color: var(--uui-color-interactive);
    }

    .info-banner p {
      margin: 4px 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .meta-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: baseline;
      margin-bottom: var(--uui-size-space-4);
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .meta-value {
      font-size: 0.875rem;
      color: var(--uui-color-text);
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
    uui-textarea,
    uui-select {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloAddressLookupProviderConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-address-lookup-provider-config-modal": MerchelloAddressLookupProviderConfigModalElement;
  }
}
