import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_MEDIA_PICKER_MODAL, UmbMediaPickerInputContext } from "@umbraco-cms/backoffice/media";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
import type { UmbPropertyEditorConfig } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/imaging";
import type { OptionEditorModalData, OptionEditorModalValue } from "@products/modals/option-editor-modal.token.js";
import type { ProductOptionDto, ProductOptionValueDto } from "@products/types/product.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

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
    isMultiSelect: true,
    isRequired: false,
    values: [],
  };
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _originalIsVariant = false;

  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    // Provides UMB_PICKER_INPUT_CONTEXT on this element, enabling the media picker
    // modal's interaction memory (remembers last navigated folder between opens).
    new UmbMediaPickerInputContext(this);
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    if (this.data?.option) {
      this._formData = {
        ...this.data.option,
        isMultiSelect: this.data.option.isMultiSelect ?? !this.data.option.isVariant,
        isRequired: this.data.option.isVariant ? false : (this.data.option.isRequired ?? false),
      };
      this._originalIsVariant = this.data.option.isVariant;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private _toPropertyValueMap(values: UmbPropertyValueData[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const value of values) {
      map[value.alias] = value.value;
    }
    return map;
  }

  private _getStringFromPropertyValue(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private _getFirstDropdownValue(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value.find((x) => typeof x === "string");
      return typeof first === "string" ? first : "";
    }
    return typeof value === "string" ? value : "";
  }

  private _getBooleanFromPropertyValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return fallback;
  }

  private _getOptionTypePropertyConfig(): UmbPropertyEditorConfig {
    const typeAliases = this.data?.settings?.optionTypeAliases ?? [];
    return [
      {
        alias: "items",
        value: [
          { name: "Select type...", value: "" },
          ...typeAliases.map((alias) => ({
            name: alias.charAt(0).toUpperCase() + alias.slice(1),
            value: alias,
          })),
        ],
      },
    ];
  }

  private _getOptionUiPropertyConfig(): UmbPropertyEditorConfig {
    const uiAliases = this.data?.settings?.optionUiAliases ?? [];
    return [
      {
        alias: "items",
        value: uiAliases.map((alias) => ({
          name: alias.charAt(0).toUpperCase() + alias.slice(1),
          value: alias,
        })),
      },
    ];
  }

  private _getOptionDetailsDatasetValue(): UmbPropertyValueData[] {
    return [
      { alias: "name", value: this._formData.name ?? "" },
      { alias: "alias", value: this._formData.alias ?? "" },
      { alias: "optionTypeAlias", value: this._formData.optionTypeAlias ? [this._formData.optionTypeAlias] : [] },
      { alias: "optionUiAlias", value: this._formData.optionUiAlias ? [this._formData.optionUiAlias] : [] },
      { alias: "isVariant", value: this._formData.isVariant ?? false },
      { alias: "isMultiSelect", value: this._formData.isMultiSelect ?? true },
      { alias: "isRequired", value: this._formData.isRequired ?? false },
    ];
  }

  private _handleOptionDetailsDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const isVariant = this._getBooleanFromPropertyValue(values.isVariant, false);

    this._formData = {
      ...this._formData,
      name: this._getStringFromPropertyValue(values.name),
      alias: this._getStringFromPropertyValue(values.alias),
      optionTypeAlias: this._getFirstDropdownValue(values.optionTypeAlias),
      optionUiAlias: this._getFirstDropdownValue(values.optionUiAlias),
      isVariant,
      isMultiSelect: isVariant ? false : this._getBooleanFromPropertyValue(values.isMultiSelect, true),
      isRequired: isVariant ? false : this._getBooleanFromPropertyValue(values.isRequired, false),
    };
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateForm()) {
      return;
    }

    // Warn if changing isVariant on existing option
    if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
      const warningMessage = this._formData.isVariant
        ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect."
        : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.";

      const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
        data: {
          headline: "Change Variant Option",
          content: warningMessage,
          confirmLabel: "Continue",
          color: "warning",
        },
      });

      try {
        await modalContext?.onSubmit();
      } catch {
        return; // User cancelled
      }
      if (!this.#isConnected) return; // Component disconnected while modal was open
    }

    this.value = {
      isSaved: true,
      option: {
        id: this._formData.id || crypto.randomUUID(),
        name: this._formData.name || "",
        alias: this._formData.alias || null,
        sortOrder: this._formData.sortOrder || 0,
        optionTypeAlias: this._formData.optionTypeAlias || null,
        optionUiAlias: this._formData.optionUiAlias || null,
        isVariant: this._formData.isVariant || false,
        isMultiSelect: this._formData.isVariant ? false : this._formData.isMultiSelect ?? true,
        isRequired: this._formData.isVariant ? false : this._formData.isRequired ?? false,
        values: this._formData.values || [],
      },
    };
    this.#notificationContext?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } });
    this.modalContext?.submit();
  }

  private _handleDelete(): void {
    this.value = {
      isSaved: true,
      isDeleted: true,
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
      weightKg: null,
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

  private async _openMediaPicker(index: number): Promise<void> {
    const value = this._formData.values?.[index];
    if (!value) return;

    const modalContext = this.#modalManager?.open(this, UMB_MEDIA_PICKER_MODAL, {
      data: {
        multiple: false,
      },
      value: {
        selection: value.mediaKey ? [value.mediaKey] : [],
      },
    });

    try {
      const result = await modalContext?.onSubmit();
      if (!this.#isConnected) return; // Component disconnected while modal was open
      if (result?.selection?.length) {
        this._updateValue(index, "mediaKey", result.selection[0]);
      }
    } catch {
      // User cancelled
    }
  }

  private _clearMedia(index: number): void {
    this._updateValue(index, "mediaKey", null);
  }

  private _renderValueEditor(value: ProductOptionValueDto, index: number): unknown {
    const uiAlias = this._formData.optionUiAlias;
    const isAddon = !this._formData.isVariant;

    return html`
      <div class="value-row ${isAddon ? "is-addon" : ""}">
        <div class="value-content">
          <div class="value-name-row">
            <uui-input
              label="Value name"
              .value=${value.name}
              placeholder="Value name"
              @input=${(e: Event) => this._updateValue(index, "name", (e.target as HTMLInputElement).value)}>
            </uui-input>

            ${uiAlias === "colour"
              ? html`
                  <uui-input
                    label="Color"
                    type="color"
                    class="color-input"
                    .value=${value.hexValue || "#000000"}
                    @input=${(e: Event) => this._updateValue(index, "hexValue", (e.target as HTMLInputElement).value)}>
                  </uui-input>
                `
              : nothing}

            ${uiAlias === "image"
              ? html`
                  <div class="image-picker">
                    ${value.mediaKey
                      ? html`
                          <div class="image-preview" @click=${() => this._openMediaPicker(index)}>
                            <umb-imaging-thumbnail
                              .unique=${value.mediaKey}
                              .width=${40}
                              .height=${40}
                              icon="icon-picture">
                            </umb-imaging-thumbnail>
                          </div>
                          <uui-button
                            compact
                            look="secondary"
                            label="Remove image"
                            @click=${() => this._clearMedia(index)}>
                            <uui-icon name="icon-delete"></uui-icon>
                          </uui-button>
                        `
                      : html`
                          <uui-button
                            compact
                            look="secondary"
                            label="Select image"
                            @click=${() => this._openMediaPicker(index)}>
                            <uui-icon name="icon-picture"></uui-icon>
                          </uui-button>
                        `}
                  </div>
                `
              : nothing}
          </div>

          ${isAddon
            ? html`
                <div class="addon-fields">
                  <div class="addon-field">
                    <label class="field-label">Price +/-</label>
                    <uui-input
                      label="Price adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(value.priceAdjustment)}
                      placeholder="0.00"
                      @input=${(e: Event) => this._updateValue(index, "priceAdjustment", parseFloat((e.target as HTMLInputElement).value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field">
                    <label class="field-label">Cost +/-</label>
                    <uui-input
                      label="Cost adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(value.costAdjustment)}
                      placeholder="0.00"
                      @input=${(e: Event) => this._updateValue(index, "costAdjustment", parseFloat((e.target as HTMLInputElement).value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field sku-field">
                    <label class="field-label">SKU Suffix</label>
                    <uui-input
                      label="SKU suffix"
                      .value=${value.skuSuffix || ""}
                      placeholder="e.g., -GW"
                      @input=${(e: Event) => this._updateValue(index, "skuSuffix", (e.target as HTMLInputElement).value)}>
                    </uui-input>
                  </div>
                </div>

                <div class="addon-fields shipping-fields">
                  <div class="addon-field weight-field">
                    <label class="field-label">+ Weight (kg)</label>
                    <uui-input
                      label="Weight"
                      type="number"
                      step="0.001"
                      .value=${value.weightKg != null ? String(value.weightKg) : ""}
                      placeholder="0.000"
                      title="Additional weight added to the product for shipping"
                      @input=${(e: Event) => {
                        const val = (e.target as HTMLInputElement).value;
                        this._updateValue(index, "weightKg", val ? parseFloat(val) : null);
                      }}>
                    </uui-input>
                    <span class="field-hint">Added to product weight</span>
                  </div>
                </div>
              `
            : nothing}
        </div>

        <uui-button compact look="secondary" color="danger" label="Remove value" @click=${() => this._removeValue(index)}>
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

  override render() {
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

          ${!this._formData.isVariant && valueCount > 0
            ? html`
                <div class="info-banner addon-info">
                  <uui-icon name="icon-coin"></uui-icon>
                  <div>
                    <strong>Add-on Pricing &amp; Shipping</strong>
                    <p>Price, cost, and weight adjustments are <em>added</em> to the base product when customers select this option. Weight affects shipping calculations.</p>
                  </div>
                </div>
              `
            : nothing}
          <uui-box headline="Option Details">
            <umb-property-dataset
              .value=${this._getOptionDetailsDatasetValue()}
              @change=${this._handleOptionDetailsDatasetChange}>
              <umb-property
                alias="name"
                label="Option Name"
                description="Customer-facing name for this option"
                property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                .validation=${{ mandatory: true }}>
              </umb-property>

              <umb-property
                alias="alias"
                label="Alias"
                description="Used in code/integrations (auto-generated if empty)"
                property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
              </umb-property>

              <umb-property
                alias="optionTypeAlias"
                label="Option Type"
                description="Categorize this option (e.g., colour, size, material)"
                property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                .config=${this._getOptionTypePropertyConfig()}>
              </umb-property>

              <umb-property
                alias="optionUiAlias"
                label="Display As"
                description="How customers select this option on your storefront"
                property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                .config=${this._getOptionUiPropertyConfig()}>
              </umb-property>

              <umb-property
                alias="isVariant"
                label="Generates Variants"
                description="Creates all combinations (e.g., 3 sizes x 4 colors = 12 variants). If disabled, this is an add-on that modifies price."
                property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
              </umb-property>

              ${!(this._formData.isVariant ?? false)
                ? html`
                    <umb-property
                      alias="isMultiSelect"
                      label="Allow Multiple Selections"
                      description="Enabled = multi-select. Disabled = single-select (one value only)."
                      property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
                    </umb-property>

                    <umb-property
                      alias="isRequired"
                      label="Required Add-on"
                      description="If enabled, customers must select at least one value from this add-on option before adding to basket."
                      property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
                    </umb-property>
                  `
                : nothing}
            </umb-property-dataset>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${valueCount}/${maxValues}</span>
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
                    <p class="hint">Use the <strong>Add Value</strong> button below to add options like Small, Medium, Large</p>
                  </div>
                `}

            <div class="values-footer">
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
          </uui-box>
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Cancel" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${!isNew
            ? html`
                <uui-button look="primary" color="danger" @click=${this._handleDelete} label="Delete Option">
                  <uui-icon name="icon-trash"></uui-icon>
                  Delete Option
                </uui-button>
              `
            : nothing}
          <uui-button look="primary" color="positive" label="Save" ?disabled=${this._isSaving} @click=${this._handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
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
      gap: var(--uui-size-space-3);
    }

    .values-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .value-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .value-row.is-addon {
      padding: var(--uui-size-space-4);
    }

    .value-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .value-name-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .value-name-row > uui-input:first-child {
      flex: 1;
    }

    .color-input {
      width: 48px;
      flex-shrink: 0;
    }

    .image-picker {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .image-preview {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      cursor: pointer;
      border: 1px solid var(--uui-color-border);
    }

    .image-preview:hover {
      border-color: var(--uui-color-selected);
    }

    .image-preview umb-imaging-thumbnail {
      width: 100%;
      height: 100%;
    }

    .addon-fields {
      display: flex;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    .addon-field {
      flex: 1;
      min-width: 100px;
      max-width: 140px;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .addon-field.sku-field {
      flex: 1.2;
      max-width: 160px;
    }

    .addon-field .field-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .addon-field uui-input {
      width: 100%;
    }

    .shipping-fields {
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    .shipping-fields .weight-field {
      min-width: 120px;
      max-width: 160px;
    }

    .field-hint {
      font-size: 0.625rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .info-banner.addon-info {
      border-left-color: var(--uui-color-warning);
    }

    .info-banner.addon-info uui-icon {
      color: var(--uui-color-warning);
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

    umb-property uui-input,
    umb-property uui-select {
      width: 100%;
    }
  `,
  ];
}

export default MerchelloOptionEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-option-editor-modal": MerchelloOptionEditorModalElement;
  }
}


