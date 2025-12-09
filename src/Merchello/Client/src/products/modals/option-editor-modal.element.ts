import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { OptionEditorModalData, OptionEditorModalValue } from "./option-editor-modal.token.js";
import type { ProductOptionDto, ProductOptionValueDto } from "@products/types/product.types.js";

interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-option-editor-modal")
export class MerchelloOptionEditorModalElement extends UmbModalBaseElement<
  OptionEditorModalData,
  OptionEditorModalValue
> {
  @state() private _formData: Partial<ProductOptionDto> = {
    name: "",
    alias: "",
    sortOrder: 0,
    optionTypeAlias: "",
    optionUiAlias: "dropdown",
    isVariant: false,
    values: [],
  };
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _originalIsVariant = false;

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.option) {
      this._formData = { ...this.data.option };
      this._originalIsVariant = this.data.option.isVariant;
    }
  }

  private _getOptionTypeOptions(): SelectOption[] {
    const aliases = this.data?.settings?.optionTypeAliases ?? [];
    return [
      { name: "Select type...", value: "", selected: !this._formData.optionTypeAlias },
      ...aliases.map((alias) => ({
        name: alias.charAt(0).toUpperCase() + alias.slice(1),
        value: alias,
        selected: alias === this._formData.optionTypeAlias,
      })),
    ];
  }

  private _getOptionUiOptions(): SelectOption[] {
    const aliases = this.data?.settings?.optionUiAliases ?? [];
    return aliases.map((alias) => ({
      name: alias.charAt(0).toUpperCase() + alias.slice(1),
      value: alias,
      selected: alias === this._formData.optionUiAlias,
    }));
  }

  private _handleSave(): void {
    if (!this._validateForm()) {
      return;
    }

    // Warn if changing isVariant on existing option
    if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
      const confirmed = confirm(
        this._formData.isVariant
          ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect.\n\nContinue?"
          : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.\n\nContinue?"
      );
      if (!confirmed) return;
    }

    this.value = {
      saved: true,
      option: {
        id: this._formData.id || crypto.randomUUID(),
        name: this._formData.name || "",
        alias: this._formData.alias || null,
        sortOrder: this._formData.sortOrder || 0,
        optionTypeAlias: this._formData.optionTypeAlias || null,
        optionUiAlias: this._formData.optionUiAlias || null,
        isVariant: this._formData.isVariant || false,
        values: this._formData.values || [],
      },
    };
    this.#notificationContext?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } });
    this.modalContext?.submit();
  }

  private _handleDelete(): void {
    this.value = {
      saved: true,
      deleted: true,
    };
    this.modalContext?.submit();
  }

  private _validateForm(): boolean {
    if (!this._formData.name) {
      this._errorMessage = "Option name is required";
      return false;
    }
    if (!this._formData.values || this._formData.values.length === 0) {
      this._errorMessage = "At least one value is required";
      return false;
    }
    return true;
  }

  private _addValue(): void {
    const values = [...(this._formData.values || [])];
    values.push({
      id: crypto.randomUUID(),
      name: "",
      fullName: null,
      sortOrder: values.length,
      hexValue: null,
      mediaKey: null,
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: null,
    });
    this._formData = { ...this._formData, values };
  }

  private _removeValue(index: number): void {
    const values = [...(this._formData.values || [])];
    values.splice(index, 1);
    // Update sort orders
    values.forEach((v, i) => (v.sortOrder = i));
    this._formData = { ...this._formData, values };
  }

  private _updateValue(index: number, field: keyof ProductOptionValueDto, value: any): void {
    const values = [...(this._formData.values || [])];
    values[index] = { ...values[index], [field]: value };
    this._formData = { ...this._formData, values };
  }

  private _renderValueEditor(value: ProductOptionValueDto, index: number): unknown {
    const uiAlias = this._formData.optionUiAlias;

    return html`
      <div class="value-row">
        <div class="value-main">
          <uui-input
            .value=${value.name}
            placeholder="Value name"
            @input=${(e: Event) => this._updateValue(index, "name", (e.target as HTMLInputElement).value)}>
          </uui-input>

          ${uiAlias === "colour"
            ? html`
                <uui-input
                  type="color"
                  .value=${value.hexValue || "#000000"}
                  @input=${(e: Event) => this._updateValue(index, "hexValue", (e.target as HTMLInputElement).value)}>
                </uui-input>
              `
            : nothing}

          ${!this._formData.isVariant
            ? html`
                <uui-input
                  type="number"
                  step="0.01"
                  .value=${String(value.priceAdjustment)}
                  placeholder="Price +/-"
                  @input=${(e: Event) => this._updateValue(index, "priceAdjustment", parseFloat((e.target as HTMLInputElement).value) || 0)}>
                </uui-input>

                <uui-input
                  .value=${value.skuSuffix || ""}
                  placeholder="SKU suffix"
                  @input=${(e: Event) => this._updateValue(index, "skuSuffix", (e.target as HTMLInputElement).value)}>
                </uui-input>
              `
            : nothing}
        </div>

        <uui-button compact look="secondary" color="danger" @click=${() => this._removeValue(index)}>
          <uui-icon name="icon-trash"></uui-icon>
        </uui-button>
      </div>
    `;
  }

  render() {
    const isNew = !this.data?.option;
    const valueCount = this._formData.values?.length || 0;
    const variantEstimate = this._formData.isVariant && valueCount > 0 ? `Will create ${valueCount} variants` : "";

    return html`
      <umb-body-layout headline="${isNew ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          ${this._formData.isVariant && valueCount > 0
            ? html`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${variantEstimate} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              `
            : nothing}

          <div class="form-section">
            <h3>Option Details</h3>

            <div class="form-field">
              <label>Option Name <span class="required">*</span></label>
              <uui-input
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(e: Event) => (this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value })}
                aria-required="true">
              </uui-input>
              <small class="hint">Customer-facing name for this option</small>
            </div>

            <div class="form-field">
              <label>Alias</label>
              <uui-input
                .value=${this._formData.alias || ""}
                placeholder="Optional: machine-readable name"
                @input=${(e: Event) => (this._formData = { ...this._formData, alias: (e.target as HTMLInputElement).value })}>
              </uui-input>
              <small class="hint">Optional: Used in code/integrations (auto-generated if empty)</small>
            </div>

            <div class="form-field">
              <label>Option Type</label>
              <uui-select
                .options=${this._getOptionTypeOptions()}
                @change=${(e: Event) => (this._formData = { ...this._formData, optionTypeAlias: (e.target as HTMLSelectElement).value })}>
              </uui-select>
              <small class="hint">Categorize this option (e.g., colour, size, material)</small>
            </div>

            <div class="form-field">
              <label>Display As</label>
              <uui-select
                .options=${this._getOptionUiOptions()}
                @change=${(e: Event) => (this._formData = { ...this._formData, optionUiAlias: (e.target as HTMLSelectElement).value })}>
              </uui-select>
              <small class="hint">How customers select this option: dropdown (default), color swatches, or image gallery</small>
            </div>

            <div class="form-field">
              <div class="toggle-field">
                <uui-toggle
                  .checked=${this._formData.isVariant ?? false}
                  @change=${(e: Event) => (this._formData = { ...this._formData, isVariant: (e.target as any).checked })}>
                </uui-toggle>
                <div>
                  <label>Generates Variants</label>
                  <small class="hint">Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.</small>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <div>
                <h3>Option Values <span class="required">*</span></h3>
                ${valueCount > 0 ? html`<small class="hint">${valueCount} value${valueCount !== 1 ? 's' : ''}</small>` : nothing}
              </div>
              <uui-button compact look="primary" color="positive" @click=${this._addValue} label="Add Value">
                <uui-icon name="icon-add"></uui-icon>
                Add Value
              </uui-button>
            </div>

            ${this._formData.values && this._formData.values.length > 0
              ? html`
                  <div class="values-list">
                    ${this._formData.values.map((value, index) => this._renderValueEditor(value, index))}
                  </div>
                `
              : html`
                  <div class="empty-state">
                    <uui-icon name="icon-list"></uui-icon>
                    <p>No values added yet</p>
                    <p class="hint"><strong>Examples:</strong> Small, Medium, Large | Red, Blue, Green | Cotton, Polyester</p>
                    <uui-button look="primary" @click=${this._addValue}>
                      <uui-icon name="icon-add"></uui-icon>
                      Add Your First Value
                    </uui-button>
                  </div>
                `}
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${!isNew
            ? html`
                <uui-button look="primary" color="danger" @click=${this._handleDelete} label="Delete Option">
                  <uui-icon name="icon-trash"></uui-icon>
                  Delete Option
                </uui-button>
              `
            : nothing}
          <uui-button look="primary" color="positive" ?disabled=${this._isSaving} @click=${this._handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .modal-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h3 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--uui-color-text);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-field label {
      font-weight: 600;
      color: var(--uui-color-text);
      font-size: 0.875rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      display: block;
      margin: 0;
    }

    .toggle-field {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .toggle-field > div {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .toggle-field label {
      font-weight: 500;
    }

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-left: 3px solid var(--uui-color-selected);
      border-radius: var(--uui-border-radius);
    }

    .info-banner uui-icon {
      font-size: 24px;
      color: var(--uui-color-selected);
      flex-shrink: 0;
    }

    .info-banner strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .info-banner p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-surface);
      color: var(--uui-color-danger);
      border-radius: var(--uui-border-radius);
      border-left: 3px solid var(--uui-color-danger);
    }

    .values-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .value-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .value-main {
      flex: 1;
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .value-main > * {
      flex: 1;
      min-width: 150px;
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .empty-state uui-icon {
      font-size: 48px;
      opacity: 0.5;
      margin-bottom: var(--uui-size-space-3);
    }

    .empty-state p {
      margin: var(--uui-size-space-2) 0;
    }

    .empty-state strong {
      color: var(--uui-color-text);
    }
  `;
}

export default MerchelloOptionEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-option-editor-modal": MerchelloOptionEditorModalElement;
  }
}
