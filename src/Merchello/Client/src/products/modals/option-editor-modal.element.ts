import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { OptionEditorModalData, OptionEditorModalValue } from "./option-editor-modal.token.js";
import type { ProductOptionDto, ProductOptionValueDto } from "@products/types/product.types.js";
import type { SelectOption } from "@shared/types/index.js";

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

  private _updateValue(index: number, field: keyof ProductOptionValueDto, value: string | number | null): void {
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

  private _getMaxValues(): number {
    return this.data?.settings?.maxOptionValuesPerOption ?? 20;
  }

  private _isAtMaxValues(): boolean {
    return (this._formData.values?.length ?? 0) >= this._getMaxValues();
  }

  render() {
    const isNew = !this.data?.option;
    const valueCount = this._formData.values?.length || 0;
    const maxValues = this._getMaxValues();
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

          <uui-box headline="Option Details">
            <umb-property-layout
              label="Option Name"
              description="Customer-facing name for this option"
              ?mandatory=${true}>
              <uui-input
                slot="editor"
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(e: Event) => (this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value })}
                aria-required="true">
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Alias"
              description="Used in code/integrations (auto-generated if empty)">
              <uui-input
                slot="editor"
                .value=${this._formData.alias || ""}
                placeholder="Optional: machine-readable name"
                @input=${(e: Event) => (this._formData = { ...this._formData, alias: (e.target as HTMLInputElement).value })}>
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Option Type"
              description="Categorize this option (e.g., colour, size, material)">
              <uui-select
                slot="editor"
                .options=${this._getOptionTypeOptions()}
                @change=${(e: Event) => (this._formData = { ...this._formData, optionTypeAlias: (e.target as HTMLSelectElement).value })}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Display As"
              description="How customers select this option on your storefront">
              <uui-select
                slot="editor"
                .options=${this._getOptionUiOptions()}
                @change=${(e: Event) => (this._formData = { ...this._formData, optionUiAlias: (e.target as HTMLSelectElement).value })}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Generates Variants"
              description="Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.">
              <uui-toggle
                slot="editor"
                .checked=${this._formData.isVariant ?? false}
                @change=${(e: Event) => (this._formData = { ...this._formData, isVariant: (e.target as HTMLInputElement).checked })}>
              </uui-toggle>
            </umb-property-layout>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${valueCount}/${maxValues}</span>
            </div>
            <div class="section-header-actions" slot="header-actions">
              <uui-button
                compact
                look="primary"
                color="positive"
                @click=${this._addValue}
                label="Add Value"
                ?disabled=${this._isAtMaxValues()}>
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
                    <p class="hint">Use the <strong>Add Value</strong> button above to add options like Small, Medium, Large</p>
                  </div>
                `}
          </uui-box>
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

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .value-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      font-weight: normal;
    }

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      display: block;
      margin: 0;
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
      padding: var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 36px;
      opacity: 0.5;
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-state p {
      margin: var(--uui-size-space-2) 0;
    }

    .empty-state strong {
      color: var(--uui-color-text);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-select {
      width: 100%;
    }
  `;
}

export default MerchelloOptionEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-option-editor-modal": MerchelloOptionEditorModalElement;
  }
}
