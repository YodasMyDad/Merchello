import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ShippingProviderFieldDto } from "@shipping/types/shipping.types.js";
import type {
  ShippingProviderConfigModalData,
  ShippingProviderConfigModalValue,
} from "./shipping-provider-config-modal.token.js";

@customElement("merchello-shipping-provider-config-modal")
export class MerchelloShippingProviderConfigModalElement extends UmbModalBaseElement<
  ShippingProviderConfigModalData,
  ShippingProviderConfigModalValue
> {
  @state() private _fields: ShippingProviderFieldDto[] = [];
  @state() private _values: Record<string, string> = {};
  @state() private _displayName: string = "";
  @state() private _isEnabled: boolean = true;
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
    const configuration = this.data?.configuration;

    if (!provider) {
      this._errorMessage = "No provider specified";
      this._isLoading = false;
      return;
    }

    // Initialize display name and enabled state
    this._displayName = configuration?.displayName ?? provider.displayName;
    this._isEnabled = configuration?.isEnabled ?? true;

    // Load configuration fields
    const { data, error } = await MerchelloApi.getShippingProviderFields(provider.key);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._fields = data ?? [];

    // Initialize values from existing configuration or defaults
    const existingConfig = configuration?.configuration ?? {};
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
    const configuration = this.data?.configuration;

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
      if (configuration) {
        // Update existing provider
        const { error } = await MerchelloApi.updateShippingProvider(configuration.id, {
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          configuration: this._values,
        });

        // Prevent state updates if component was disconnected during async operation
        if (!this.#isConnected) return;

        if (error) {
          this._errorMessage = error.message;
          this._isSaving = false;
          return;
        }
      } else {
        // Create new provider
        const { error } = await MerchelloApi.createShippingProvider({
          providerKey: provider.key,
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          configuration: this._values,
        });

        // Prevent state updates if component was disconnected during async operation
        if (!this.#isConnected) return;

        if (error) {
          this._errorMessage = error.message;
          this._isSaving = false;
          return;
        }
      }

      this._isSaving = false;
      this.value = { isSaved: true };
      this.modalContext?.submit();
    } catch (err) {
      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to save configuration";
      this._isSaving = false;
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getSelectFieldOptions(field: ShippingProviderFieldDto, currentValue: string): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Select...", value: "", selected: !currentValue },
      ...(field.options?.map(opt => ({
        name: opt.label,
        value: opt.value,
        selected: currentValue === opt.value
      })) ?? [])
    ];
  }

  private _renderField(field: ShippingProviderFieldDto): unknown {
    const value = this._values[field.key] ?? "";

    switch (field.fieldType) {
      case "Text":
      case "Url":
        return html`
          <umb-property-layout
            label="${field.label}"
            description="${field.description ?? ""}"
            ?mandatory=${field.isRequired}>
            <uui-input
              slot="editor"
              label="${field.label}"
              type="${field.fieldType === "Url" ? "url" : "text"}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
          </umb-property-layout>
        `;

      case "Password":
        return html`
          <umb-property-layout
            label="${field.label}"
            description="${field.description ?? ""}${field.isSensitive && value ? " (stored securely)" : ""}"
            ?mandatory=${field.isRequired}>
            <uui-input
              slot="editor"
              label="${field.label}"
              type="password"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
          </umb-property-layout>
        `;

      case "Textarea":
        return html`
          <umb-property-layout
            label="${field.label}"
            description="${field.description ?? ""}"
            ?mandatory=${field.isRequired}>
            <uui-textarea
              slot="editor"
              label="${field.label}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLTextAreaElement).value)}
            ></uui-textarea>
          </umb-property-layout>
        `;

      case "Checkbox":
        return html`
          <umb-property-layout
            label="${field.label}"
            description="${field.description ?? ""}">
            <uui-checkbox
              slot="editor"
              ?checked=${value === "true"}
              @change=${(e: Event) =>
                this._handleCheckboxChange(field.key, (e.target as HTMLInputElement).checked)}
            >
              ${field.label}
            </uui-checkbox>
          </umb-property-layout>
        `;

      case "Select":
        return html`
          <umb-property-layout
            label="${field.label}"
            description="${field.description ?? ""}"
            ?mandatory=${field.isRequired}>
            <uui-select
              slot="editor"
              label="${field.label}"
              .options=${this._getSelectFieldOptions(field, value)}
              ?required=${field.isRequired}
              @change=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLSelectElement).value)}
            ></uui-select>
          </umb-property-layout>
        `;

      default:
        return nothing;
    }
  }

  override render() {
    const provider = this.data?.provider;
    const isEditing = !!this.data?.configuration;

    return html`
      <umb-body-layout headline="${isEditing ? "Configure" : "Install"} ${provider?.displayName ?? "Provider"}">
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

                <uui-box headline="Provider Settings">
                  <umb-property-layout label="Display Name" description="The name shown to customers when selecting shipping" ?mandatory=${true}>
                    <uui-input
                      slot="editor"
                      label="Display Name"
                      .value=${this._displayName}
                      required
                      @input=${(e: Event) =>
                        (this._displayName = (e.target as HTMLInputElement).value)}
                    ></uui-input>
                  </umb-property-layout>

                  <umb-property-layout label="Enabled" description="When enabled, this shipping provider will be active and available for use">
                    <uui-checkbox
                      slot="editor"
                      ?checked=${this._isEnabled}
                      @change=${(e: Event) =>
                        (this._isEnabled = (e.target as HTMLInputElement).checked)}
                    >
                      Enabled
                    </uui-checkbox>
                  </umb-property-layout>
                </uui-box>

                ${this._fields.length > 0
                  ? html`
                      <uui-box headline="Provider Configuration">
                        ${this._fields.map((field) => this._renderField(field))}
                      </uui-box>
                    `
                  : nothing}
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
            label="${isEditing ? "Save" : "Install Provider"}"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
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
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-textarea,
    umb-property-layout uui-select {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloShippingProviderConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-provider-config-modal": MerchelloShippingProviderConfigModalElement;
  }
}
