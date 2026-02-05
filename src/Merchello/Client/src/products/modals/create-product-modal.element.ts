import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { CreateProductModalData, CreateProductModalValue } from "./create-product-modal.token.js";
import { MerchelloApi } from "../../api/merchello-api.js";
import type { CreateProductRootDto, ProductTypeDto } from "../types/product.types.js";
import type { TaxGroupDto } from "../../orders/types/order.types.js";
import type { WarehouseListDto } from "../../warehouses/types/warehouses.types.js";

interface FormData {
  name: string;
  sku: string;
  price: number;
  productTypeId: string;
  taxGroupId: string;
  warehouseIds: string[];
}

interface FormErrors {
  name?: string;
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
  @state() private _formData: FormData = {
    name: "",
    sku: "",
    price: 0,
    productTypeId: "",
    taxGroupId: "",
    warehouseIds: [],
  };
  @state() private _errors: FormErrors = {};

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

    const [productTypesResult, taxGroupsResult, warehousesResult] = await Promise.all([
      MerchelloApi.getProductTypes(),
      MerchelloApi.getTaxGroups(),
      MerchelloApi.getWarehousesList(),
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

    if (!this._formData.name.trim()) {
      errors.name = "Product name is required";
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
      rootName: this._formData.name,
      productTypeId: this._formData.productTypeId,
      taxGroupId: this._formData.taxGroupId,
      warehouseIds: this._formData.warehouseIds,
      isDigitalProduct: false,
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
        message: `"${this._formData.name}" has been created successfully`,
      },
    });

    this.value = { isCreated: true, productId: data?.id };
    this.modalContext?.submit();
  }

  private _handleClose(): void {
    this.value = { isCreated: false };
    this.modalContext?.reject();
  }

  private _handleInputChange(field: keyof FormData, value: string | number): void {
    this._formData = { ...this._formData, [field]: value };
    // Clear error when user starts typing
    if (this._errors[field as keyof FormErrors]) {
      this._errors = { ...this._errors, [field]: undefined };
    }
  }

  private _handleWarehouseToggle(warehouseId: string, checked: boolean): void {
    const warehouseIds = this._formData.warehouseIds || [];
    if (checked) {
      this._formData = { ...this._formData, warehouseIds: [...warehouseIds, warehouseId] };
    } else {
      this._formData = { ...this._formData, warehouseIds: warehouseIds.filter((id) => id !== warehouseId) };
    }
    // Clear warehouse error when toggled
    if (this._errors.warehouseIds) {
      this._errors = { ...this._errors, warehouseIds: undefined };
    }
  }

  private _getProductTypeOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options = [{ name: "Select product type...", value: "" }];
    return options.concat(
      this._productTypes.map((pt) => ({
        name: pt.name,
        value: pt.id,
        selected: pt.id === this._formData.productTypeId,
      }))
    );
  }

  private _getTaxGroupOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options = [{ name: "Select tax group...", value: "" }];
    return options.concat(
      this._taxGroups.map((tg) => ({
        name: tg.name,
        value: tg.id,
        selected: tg.id === this._formData.taxGroupId,
      }))
    );
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

  private _renderForm() {
    return html`
      <div class="form-content">
        <umb-property-layout
          label="Product Name"
          description="The name that will be displayed to customers"
          mandatory
          ?invalid=${!!this._errors.name}>
          <uui-input
            slot="editor"
            .value=${this._formData.name}
            @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
            placeholder="Enter product name"
            ?invalid=${!!this._errors.name}>
          </uui-input>
          ${this._errors.name ? html`<span class="error-message">${this._errors.name}</span>` : nothing}
        </umb-property-layout>

        <umb-property-layout
          label="SKU"
          description="Stock Keeping Unit - a unique identifier for this product"
          mandatory
          ?invalid=${!!this._errors.sku}>
          <uui-input
            slot="editor"
            .value=${this._formData.sku}
            @input=${(e: Event) => this._handleInputChange("sku", (e.target as HTMLInputElement).value)}
            placeholder="e.g., PROD-001"
            ?invalid=${!!this._errors.sku}>
          </uui-input>
          ${this._errors.sku ? html`<span class="error-message">${this._errors.sku}</span>` : nothing}
        </umb-property-layout>

        <umb-property-layout
          label="Price"
          description="The base price for this product"
          mandatory
          ?invalid=${!!this._errors.price}>
          <uui-input
            slot="editor"
            type="number"
            min="0"
            step="0.01"
            .value=${this._formData.price.toString()}
            @input=${(e: Event) => this._handleInputChange("price", parseFloat((e.target as HTMLInputElement).value) || 0)}
            placeholder="0.00"
            ?invalid=${!!this._errors.price}>
          </uui-input>
          ${this._errors.price ? html`<span class="error-message">${this._errors.price}</span>` : nothing}
        </umb-property-layout>

        <umb-property-layout
          label="Product Type"
          description="Categorize this product for reporting and organization"
          mandatory
          ?invalid=${!!this._errors.productTypeId}>
          <uui-select
            slot="editor"
            .options=${this._getProductTypeOptions()}
            @change=${(e: Event) => this._handleInputChange("productTypeId", (e.target as HTMLSelectElement).value)}>
          </uui-select>
          ${this._errors.productTypeId ? html`<span class="error-message">${this._errors.productTypeId}</span>` : nothing}
        </umb-property-layout>

        <umb-property-layout
          label="Tax Group"
          description="The tax rate that applies to this product"
          mandatory
          ?invalid=${!!this._errors.taxGroupId}>
          <uui-select
            slot="editor"
            .options=${this._getTaxGroupOptions()}
            @change=${(e: Event) => this._handleInputChange("taxGroupId", (e.target as HTMLSelectElement).value)}>
          </uui-select>
          ${this._errors.taxGroupId ? html`<span class="error-message">${this._errors.taxGroupId}</span>` : nothing}
        </umb-property-layout>

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
      </div>
    `;
  }

  private _renderWarehouseSelector() {
    const selectedWarehouseIds = this._formData.warehouseIds || [];

    return html`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
          (warehouse) => html`
            <div class="toggle-field">
              <uui-toggle
                label="${warehouse.name || "Unnamed Warehouse"}"
                .checked=${selectedWarehouseIds.includes(warehouse.id)}
                @change=${(e: Event) => this._handleWarehouseToggle(warehouse.id, (e.target as HTMLInputElement).checked)}>
              </uui-toggle>
              <label>${warehouse.name || "Unnamed Warehouse"} ${warehouse.code ? `(${warehouse.code})` : ""}</label>
            </div>
          `
        )}
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

    uui-input {
      width: 100%;
    }

    uui-select {
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
      font-weight: normal;
      color: var(--uui-color-text);
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
    }

    .error-message {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
      display: block;
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
