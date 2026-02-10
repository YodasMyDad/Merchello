import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { CreateProductModalData, CreateProductModalValue } from "@products/modals/create-product-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type { UmbPropertyEditorConfig } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/document-type";
import type { CreateProductRootDto, ElementTypeListItemDto, ProductTypeDto } from "@products/types/product.types.js";
import type { TaxGroupDto } from "@orders/types/order.types.js";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";

interface FormData {
  rootName: string;
  sku: string;
  price: number;
  productTypeId: string;
  taxGroupId: string;
  warehouseIds: string[];
  elementTypeAlias: string | null;
}

interface FormErrors {
  rootName?: string;
  sku?: string;
  price?: string;
  productTypeId?: string;
  taxGroupId?: string;
  warehouseIds?: string;
}

@customElement("merchello-create-product-modal")
export class MerchelloCreateProductModalElement extends UmbModalBaseElement<
  CreateProductModalData,
  CreateProductModalValue
> {
  #notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;

  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _elementTypes: ElementTypeListItemDto[] = [];
  @state() private _formData: FormData = {
    rootName: "",
    sku: "",
    price: 0,
    productTypeId: "",
    taxGroupId: "",
    warehouseIds: [],
    elementTypeAlias: null,
  };
  @state() private _errors: FormErrors = {};

  private readonly _elementTypePickerConfig = new UmbPropertyEditorConfigCollection([
    { alias: "validationLimit", value: { min: 0, max: 1 } },
    { alias: "onlyPickElementTypes", value: true },
  ]);

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
      this.#notificationContext = ctx;
    });
  }

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadLookupData();
  }

  private async _loadLookupData(): Promise<void> {
    this._isLoading = true;

    const [productTypesResult, taxGroupsResult, warehousesResult, elementTypesResult] = await Promise.all([
      MerchelloApi.getProductTypes(),
      MerchelloApi.getTaxGroups(),
      MerchelloApi.getWarehousesList(),
      MerchelloApi.getElementTypes(),
    ]);

    // Check for errors
    if (productTypesResult.error || taxGroupsResult.error || warehousesResult.error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Failed to load data",
          message: "Could not load product types, tax groups, or warehouses. Please try again.",
        },
      });
      this._isLoading = false;
      return;
    }

    if (productTypesResult.data) {
      this._productTypes = productTypesResult.data;
    }
    if (taxGroupsResult.data) {
      this._taxGroups = taxGroupsResult.data;
    }
    if (warehousesResult.data) {
      this._warehouses = warehousesResult.data;
    }
    if (elementTypesResult.data) {
      this._elementTypes = elementTypesResult.data;
    }

    // Set default values if only one option exists
    if (this._productTypes.length === 1) {
      this._formData = { ...this._formData, productTypeId: this._productTypes[0].id };
    }
    if (this._taxGroups.length === 1) {
      this._formData = { ...this._formData, taxGroupId: this._taxGroups[0].id };
    }
    if (this._warehouses.length === 1) {
      this._formData = { ...this._formData, warehouseIds: [this._warehouses[0].id] };
    }

    this._isLoading = false;
  }

  private _validate(): boolean {
    const errors: FormErrors = {};

    if (!this._formData.rootName.trim()) {
      errors.rootName = "Product name is required";
    }

    if (!this._formData.sku.trim()) {
      errors.sku = "SKU is required";
    }

    if (this._formData.price < 0) {
      errors.price = "Price must be 0 or greater";
    }

    if (!this._formData.productTypeId) {
      errors.productTypeId = "Product type is required";
    }

    if (!this._formData.taxGroupId) {
      errors.taxGroupId = "Tax group is required";
    }

    if (this._formData.warehouseIds.length === 0) {
      errors.warehouseIds = "At least one warehouse is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSubmit(): Promise<void> {
    if (!this._validate()) {
      return;
    }

    this._isSaving = true;

    const request: CreateProductRootDto = {
      rootName: this._formData.rootName,
      productTypeId: this._formData.productTypeId,
      taxGroupId: this._formData.taxGroupId,
      warehouseIds: this._formData.warehouseIds,
      isDigitalProduct: false,
      elementTypeAlias: this._formData.elementTypeAlias,
      defaultVariant: {
        sku: this._formData.sku,
        price: this._formData.price,
        costOfGoods: 0,
      },
    };

    const { data, error } = await MerchelloApi.createProduct(request);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Failed to create product",
          message: error.message || "An error occurred while creating the product",
        },
      });
      this._isSaving = false;
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Product created",
        message: `"${this._formData.rootName}" has been created successfully`,
      },
    });

    this.value = { isCreated: true, productId: data?.id };
    this.modalContext?.submit();
  }

  private _handleClose(): void {
    this.value = { isCreated: false };
    this.modalContext?.reject();
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

  private _getElementTypeSelectionKey(): string | undefined {
    const alias = this._formData.elementTypeAlias;
    if (!alias) return undefined;
    const match = this._elementTypes.find((t) => t.alias.toLowerCase() === alias.toLowerCase());
    return match?.key;
  }

  private async _setElementTypeAliasFromSelectionValue(value: unknown): Promise<void> {
    const selectedRawValue = this._getFirstDropdownValue(value);
    const selectedKey = selectedRawValue
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)[0];

    let selectedType = this._elementTypes.find((t) => t.key === selectedKey);

    if (selectedKey && !selectedType) {
      const { data } = await MerchelloApi.getElementTypes();
      if (data) {
        this._elementTypes = data;
        selectedType = data.find((t) => t.key === selectedKey);
      }
    }

    this._formData = { ...this._formData, elementTypeAlias: selectedType?.alias ?? null };
  }

  private _handleWarehouseToggle(warehouseId: string, checked: boolean): void {
    const warehouseIds = this._formData.warehouseIds;
    this._formData = checked
      ? { ...this._formData, warehouseIds: [...warehouseIds, warehouseId] }
      : { ...this._formData, warehouseIds: warehouseIds.filter((id) => id !== warehouseId) };

    if (this._errors.warehouseIds) {
      this._errors = { ...this._errors, warehouseIds: undefined };
    }
  }

  private _getProductTypePropertyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Select product type...", value: "" },
          ...this._productTypes.map((productType) => ({
            name: productType.name,
            value: productType.id,
          })),
        ],
      },
    ];
  }

  private _getTaxGroupPropertyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Select tax group...", value: "" },
          ...this._taxGroups.map((taxGroup) => ({
            name: taxGroup.name,
            value: taxGroup.id,
          })),
        ],
      },
    ];
  }

  private _getDatasetValue(): UmbPropertyValueData[] {
    const elementTypeKey = this._getElementTypeSelectionKey();

    return [
      { alias: "rootName", value: this._formData.rootName },
      { alias: "sku", value: this._formData.sku },
      { alias: "price", value: this._formData.price },
      { alias: "productTypeId", value: this._formData.productTypeId ? [this._formData.productTypeId] : [] },
      { alias: "taxGroupId", value: this._formData.taxGroupId ? [this._formData.taxGroupId] : [] },
      { alias: "elementTypeAlias", value: elementTypeKey },
    ];
  }

  private _handleDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const priceValue = typeof values.price === "number"
      ? values.price
      : Number(this._getStringFromPropertyValue(values.price));

    this._formData = {
      ...this._formData,
      rootName: this._getStringFromPropertyValue(values.rootName),
      sku: this._getStringFromPropertyValue(values.sku),
      price: Number.isFinite(priceValue) ? priceValue : 0,
      productTypeId: this._getFirstDropdownValue(values.productTypeId),
      taxGroupId: this._getFirstDropdownValue(values.taxGroupId),
    };

    if (Object.keys(this._errors).length > 0) {
      this._errors = {};
    }

    void this._setElementTypeAliasFromSelectionValue(values.elementTypeAlias);
  }

  override render() {
    return html`
      <umb-body-layout headline="Add Product">
        ${this._isLoading ? this._renderLoading() : this._renderForm()}
        <div slot="actions">
          <uui-button look="secondary" label="Cancel" @click=${this._handleClose} ?disabled=${this._isSaving}>
            Cancel
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Create Product"
            @click=${this._handleSubmit}
            ?disabled=${this._isLoading || this._isSaving}
            .state=${this._isSaving ? "waiting" : undefined}>
            ${this._isSaving ? "Creating..." : "Create Product"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderLoading() {
    return html`
      <div class="loading-container">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }

  private _renderWarehouseSelector() {
    const selectedWarehouseIds = this._formData.warehouseIds;

    return html`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map((warehouse) => html`
          <div class="toggle-field">
            <uui-toggle
              label="${warehouse.name || "Unnamed Warehouse"}"
              .checked=${selectedWarehouseIds.includes(warehouse.id)}
              @change=${(e: Event) => this._handleWarehouseToggle(warehouse.id, (e.target as HTMLInputElement).checked)}>
            </uui-toggle>
            <label>${warehouse.name || "Unnamed Warehouse"}${warehouse.code ? ` (${warehouse.code})` : ""}</label>
          </div>
        `)}
      </div>
    `;
  }

  private _renderForm() {
    const errorMessages = Object.values(this._errors).filter((error): error is string => !!error);

    return html`
      <div class="form-content">
        ${errorMessages.length > 0
          ? html`
              <div class="error-summary">
                <strong>Please fix the following before creating the product:</strong>
                ${errorMessages.map((message) => html`<div>${message}</div>`)}
              </div>
            `
          : nothing}

        <umb-property-dataset
          .value=${this._getDatasetValue()}
          @change=${this._handleDatasetChange}>
          <umb-property
            alias="rootName"
            label="Product Name"
            description="The name that will be displayed to customers"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="sku"
            label="SKU"
            description="Stock Keeping Unit - a unique identifier for this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="price"
            label="Price"
            description="The base price for this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="productTypeId"
            label="Product Type"
            description="Categorize this product for reporting and organization"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getProductTypePropertyConfig()}
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="taxGroupId"
            label="Tax Group"
            description="The tax rate that applies to this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getTaxGroupPropertyConfig()}
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="elementTypeAlias"
            label="Element Type"
            description="Optional: select an Element Type to add custom properties to this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.DocumentTypePicker"
            .config=${this._elementTypePickerConfig}>
          </umb-property>

        </umb-property-dataset>

        <umb-property-layout
          label="Warehouses"
          description="Select which warehouses stock this product"
          mandatory
          ?invalid=${!!this._errors.warehouseIds}>
          <div slot="editor">
            ${this._renderWarehouseSelector()}
          </div>
          ${this._errors.warehouseIds ? html`<span class="error-message">${this._errors.warehouseIds}</span>` : nothing}
        </umb-property-layout>

        ${this._warehouses.length === 0
          ? html`<p class="hint">No warehouses available. Create a warehouse first.</p>`
          : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading-container {
      padding: var(--uui-size-layout-2);
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      padding: var(--uui-size-layout-1);
    }

    umb-property uui-input,
    umb-property uui-select,
    umb-property uui-textarea,
    umb-property-layout uui-input,
    umb-property-layout uui-select,
    umb-property-layout uui-textarea {
      width: 100%;
    }

    .warehouse-toggle-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .warehouse-toggle-list .toggle-field {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .warehouse-toggle-list label {
      color: var(--uui-color-text);
      font-weight: normal;
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
    }

    .error-summary {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .error-message {
      color: var(--uui-color-danger);
      display: block;
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloCreateProductModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-create-product-modal": MerchelloCreateProductModalElement;
  }
}
