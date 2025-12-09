import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { MerchelloProductDetailWorkspaceContext } from "@products/contexts/product-detail-workspace.context.js";
import type {
  ProductRootDetailDto,
  ProductOptionDto,
  ProductVariantDto,
  ProductOptionSettingsDto,
  ProductOptionValueDto,
  ProductTypeDto,
  UpdateProductRootRequest,
  CreateProductRootRequest,
} from "@products/types/product.types.js";
import type { TaxGroupDto } from "@orders/types/order.types.js";
import type { WarehouseDto } from "@shipping/types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_VARIANT_DETAIL_MODAL } from "@products/modals/variant-detail-modal.token.js";
import { MERCHELLO_OPTION_EDITOR_MODAL } from "@products/modals/option-editor-modal.token.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { getProductsListHref } from "@shared/utils/navigation.js";

type TabId = "details" | "variants" | "options";

interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-product-detail")
export class MerchelloProductDetailElement extends UmbElementMixin(LitElement) {
  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _activeTab: TabId = "details";
  @state() private _optionSettings: ProductOptionSettingsDto | null = null;
  @state() private _validationAttempted = false;
  @state() private _fieldErrors: Record<string, string> = {};

  // Form state
  @state() private _formData: Partial<ProductRootDetailDto> = {};

  // Reference data
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _warehouses: WarehouseDto[] = [];
  // Note: Categories loaded but not yet used in UI
  // @state() private _categories: ProductCategoryDto[] = [];

  #workspaceContext?: MerchelloProductDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          if (product) {
            this._formData = { ...product };
          }
          this._isLoading = !product;
        });
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadReferenceData();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadReferenceData(): Promise<void> {
    try {
      const [taxGroups, productTypes, warehouses, optionSettings] = await Promise.all([
        MerchelloApi.getTaxGroups(),
        MerchelloApi.getProductTypes(),
        MerchelloApi.getWarehouses(),
        MerchelloApi.getProductOptionSettings(),
      ]);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (taxGroups.data) this._taxGroups = taxGroups.data;
      if (productTypes.data) this._productTypes = productTypes.data;
      if (warehouses.data) this._warehouses = warehouses.data;
      if (optionSettings.data) this._optionSettings = optionSettings.data;
    } catch (error) {
      console.error("Failed to load reference data:", error);
      // Component will still function but with limited options
    }
  }

  private _handleInputChange(field: keyof ProductRootDetailDto, value: string): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _handleToggleChange(field: keyof ProductRootDetailDto, value: boolean): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _getTaxGroupOptions(): SelectOption[] {
    return [
      { name: "Select tax group...", value: "", selected: !this._formData.taxGroupId },
      ...this._taxGroups.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.taxGroupId,
      })),
    ];
  }

  private _getProductTypeOptions(): SelectOption[] {
    return [
      { name: "Select product type...", value: "", selected: !this._formData.productTypeId },
      ...this._productTypes.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.productTypeId,
      })),
    ];
  }

  private _handleTaxGroupChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, taxGroupId: select.value };
  }

  private _handleProductTypeChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, productTypeId: select.value };
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateForm()) {
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const isNew = this.#workspaceContext?.isNew ?? true;

      if (isNew) {
        await this._createProduct();
      } else {
        await this._updateProduct();
      }
    } catch (error) {
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Save failed:", error);
    } finally {
      this._isSaving = false;
    }
  }

  private async _createProduct(): Promise<void> {
    const request: CreateProductRootRequest = {
      rootName: this._formData.rootName || "",
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || false,
      defaultVariant: {
        price: 0,
        costOfGoods: 0,
      },
    };

    const { data, error } = await MerchelloApi.createProduct(request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to create product", message: error.message } });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateProduct(data);
      this.#notificationContext?.peek("positive", { data: { headline: "Product created", message: `"${data.rootName}" has been created successfully` } });
      this._validationAttempted = false;
      this._fieldErrors = {};
    }
  }

  private async _updateProduct(): Promise<void> {
    if (!this._product?.id) return;

    const request: UpdateProductRootRequest = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? undefined,
      sellingPoints: this._formData.sellingPoints,
      videos: this._formData.videos,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? undefined,
      hsCode: this._formData.hsCode ?? undefined,
      isDigitalProduct: this._formData.isDigitalProduct,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
    };

    const { data, error } = await MerchelloApi.updateProduct(this._product.id, request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to save product", message: error.message } });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateProduct(data);
      this.#notificationContext?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } });
    }
  }

  /**
   * Validates the form and sets field-level errors
   */
  private _validateForm(): boolean {
    this._validationAttempted = true;
    this._fieldErrors = {};
    this._errorMessage = null;

    if (!this._formData.rootName?.trim()) {
      this._fieldErrors.rootName = "Product name is required";
    }
    if (!this._formData.taxGroupId) {
      this._fieldErrors.taxGroupId = "Tax group is required";
    }
    if (!this._formData.productTypeId) {
      this._fieldErrors.productTypeId = "Product type is required";
    }
    if (!this._formData.isDigitalProduct && (!this._formData.warehouseIds || this._formData.warehouseIds.length === 0)) {
      this._fieldErrors.warehouseIds = "At least one warehouse is required for physical products";
    }

    const hasErrors = Object.keys(this._fieldErrors).length > 0;
    if (hasErrors) {
      this._errorMessage = "Please fix the errors below before saving";
    }
    return !hasErrors;
  }

  /**
   * Gets validation CSS class for a field
   */
  private _getFieldClass(fieldName: string): string {
    if (!this._validationAttempted) return "";
    return this._fieldErrors[fieldName] ? "field-error" : "";
  }

  /**
   * Checks if there are warnings for variants tab
   */
  private _hasVariantWarnings(): boolean {
    if (!this._product?.variants) return false;
    return this._product.variants.some((v) => !v.sku || v.price === 0);
  }

  /**
   * Checks if there are warnings for options tab
   */
  private _hasOptionWarnings(): boolean {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    return variantCount > 1 && optionCount === 0;
  }

  private _renderTabs(): unknown {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    const hasVariantWarnings = this._hasVariantWarnings();
    const hasOptionWarnings = this._hasOptionWarnings();

    return html`
      <uui-tab-group>
        <uui-tab
          label="Details"
          ?active=${this._activeTab === "details"}
          @click=${() => (this._activeTab = "details")}>
          <span class="tab-label">
            <uui-icon name="icon-info"></uui-icon>
            Details
          </span>
        </uui-tab>

        ${variantCount > 1
          ? html`
              <uui-tab
                label="Variants"
                ?active=${this._activeTab === "variants"}
                @click=${() => (this._activeTab = "variants")}>
                <span class="tab-label">
                  <uui-icon name="icon-layers"></uui-icon>
                  Variants
                  ${hasVariantWarnings ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
                  <span class="tab-count">(${variantCount})</span>
                </span>
              </uui-tab>
            `
          : nothing}

        <uui-tab
          label="Options"
          ?active=${this._activeTab === "options"}
          @click=${() => (this._activeTab = "options")}>
          <span class="tab-label">
            <uui-icon name="icon-settings"></uui-icon>
            Options
            ${hasOptionWarnings ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
            <span class="tab-count">(${optionCount})</span>
          </span>
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderDetailsTab(): unknown {
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            `
          : nothing}

        ${this._errorMessage
          ? html`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            `
          : nothing}

        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field full-width ${this._getFieldClass('rootName')}">
              <label>Product Name <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.rootName || ""}
                @input=${(e: Event) => this._handleInputChange("rootName", (e.target as HTMLInputElement).value)}
                @blur=${() => this._validateForm()}
                placeholder="Enter product name"
                aria-required="true">
              </uui-input>
              ${this._fieldErrors.rootName ? html`<span class="field-error-message">${this._fieldErrors.rootName}</span>` : nothing}
            </div>

            <div class="form-field ${this._getFieldClass('productTypeId')}">
              <label>Product Type <span class="required">*</span></label>
              <uui-select
                .options=${this._getProductTypeOptions()}
                @change=${this._handleProductTypeChange}
                aria-required="true">
              </uui-select>
              ${this._fieldErrors.productTypeId ? html`<span class="field-error-message">${this._fieldErrors.productTypeId}</span>` : nothing}
              <small class="hint">Categorize your product for reporting and organization</small>
            </div>

            <div class="form-field ${this._getFieldClass('taxGroupId')}">
              <label>Tax Group <span class="required">*</span></label>
              <uui-select .options=${this._getTaxGroupOptions()} @change=${this._handleTaxGroupChange} aria-required="true"> </uui-select>
              ${this._fieldErrors.taxGroupId ? html`<span class="field-error-message">${this._fieldErrors.taxGroupId}</span>` : nothing}
              <small class="hint">Tax rate applied to this product</small>
            </div>

            <div class="form-field full-width">
              <div class="toggle-field">
                <uui-toggle
                  .checked=${this._formData.isDigitalProduct ?? false}
                  @change=${(e: Event) =>
                    this._handleToggleChange("isDigitalProduct", (e.target as any).checked)}>
                </uui-toggle>
                <label>Digital Product</label>
              </div>
              <small class="hint">No shipping costs, instant delivery, no warehouse needed</small>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Product Images">
          <p class="hint">Add images that will be displayed on your storefront</p>
          ${this._renderMediaPicker()}
        </uui-box>

        ${!this._formData.isDigitalProduct
          ? html`
              <uui-box headline="Warehouses">
                <p class="hint">Select which warehouses stock this product <span class="required">*</span></p>
                ${this._renderWarehouseSelector()}
                ${this._fieldErrors.warehouseIds ? html`<span class="field-error-message">${this._fieldErrors.warehouseIds}</span>` : nothing}
              </uui-box>
            `
          : nothing}

        <div class="actions">
          <uui-button look="primary" color="positive" @click=${this._handleSave} ?disabled=${this._isSaving}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderMediaPicker(): unknown {
    const imageKeys = this._formData.rootImages || [];
    const mediaValue = imageKeys.map((key) => ({ key, mediaKey: key }));

    return html`
      <umb-input-rich-media
        .value=${mediaValue}
        ?multiple=${true}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${imageKeys.length === 0 ? html`<p class="hint">No images added yet. Click to add product images.</p>` : nothing}
    `;
  }

  private _handleMediaChange(e: CustomEvent): void {
    const target = e.target as any;
    const value = target?.value || [];
    const imageKeys = value.map((item: any) => item.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: imageKeys };
  }

  private _renderWarehouseSelector(): unknown {
    const selectedWarehouseIds = this._formData.warehouseIds || [];

    return html`
      <div class="warehouse-list">
        ${this._warehouses.map(
          (warehouse) => html`
            <div class="checkbox-field">
              <uui-checkbox
                .checked=${selectedWarehouseIds.includes(warehouse.id)}
                @change=${(e: Event) => this._handleWarehouseToggle(warehouse.id, (e.target as any).checked)}>
                ${warehouse.name} ${warehouse.code ? `(${warehouse.code})` : ""}
              </uui-checkbox>
            </div>
          `
        )}
        ${this._warehouses.length === 0
          ? html`<p class="hint">No warehouses available. Create a warehouse first.</p>`
          : nothing}
      </div>
    `;
  }

  private _handleWarehouseToggle(warehouseId: string, checked: boolean): void {
    const warehouseIds = this._formData.warehouseIds || [];
    if (checked) {
      this._formData = { ...this._formData, warehouseIds: [...warehouseIds, warehouseId] };
    } else {
      this._formData = { ...this._formData, warehouseIds: warehouseIds.filter((id) => id !== warehouseId) };
    }
  }

  private _renderVariantsTab(): unknown {
    const variants = this._product?.variants ?? [];

    return html`
      <div class="tab-content">
        <div class="section-header">
          <h3>Product Variants</h3>
          <p class="section-description">
            Click a row to edit variant details. Select a variant as the default using the radio button.
          </p>
        </div>

        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${variants.map((variant) => this._renderVariantRow(variant))}
          </uui-table>
        </div>
      </div>
    `;
  }

  private _renderVariantRow(variant: ProductVariantDto): unknown {
    return html`
      <uui-table-row class="clickable" @click=${() => this._openVariantModal(variant)}>
        <uui-table-cell @click=${(e: Event) => e.stopPropagation()}>
          <uui-radio
            name="default-variant"
            .checked=${variant.default}
            @change=${() => this._handleSetDefaultVariant(variant.id)}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <span class="variant-name">${variant.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${variant.sku || "—"}</uui-table-cell>
        <uui-table-cell>$${variant.price.toFixed(2)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${this._getStockBadgeClass(variant.totalStock)}">${variant.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${variant.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${variant.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _getStockBadgeClass(stock: number): string {
    if (stock === 0) return "badge-danger";
    if (stock < 10) return "badge-warning";
    return "badge-positive";
  }

  private async _handleSetDefaultVariant(variantId: string): Promise<void> {
    if (!this._product) return;

    try {
      const { error } = await MerchelloApi.setDefaultVariant(this._product.id, variantId);
      if (!error) {
        this.#notificationContext?.peek("positive", { data: { headline: "Default variant updated", message: "" } });
        this.#workspaceContext?.reload();
      } else {
        console.error("Failed to set default variant:", error);
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to set default variant", message: error.message } });
      }
    } catch (error) {
      console.error("Failed to set default variant:", error);
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }

  private async _openVariantModal(variant: ProductVariantDto): Promise<void> {
    if (!this.#modalManager || !this._product) return;

    const modal = this.#modalManager.open(this, MERCHELLO_VARIANT_DETAIL_MODAL, {
      data: {
        productRootId: this._product.id,
        variant: variant,
        warehouses: this._warehouses,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this.#workspaceContext?.reload();
    }
  }

  private _renderOptionsTab(): unknown {
    const options = this._formData.productOptions ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;
    const variantOptions = options.filter((o) => o.isVariant);
    const estimatedVariants = variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), variantOptions.length > 0 ? 1 : 0);

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            `
          : html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>About Product Options</strong>
                    <p>Options with "Generates Variants" create all combinations (e.g., 3 sizes × 4 colors = 12 variants). Options without this are add-ons that modify price.</p>
                  </div>
                </div>
              </uui-box>
            `}

        <div class="section-header">
          <div>
            <h3>Product Options</h3>
            ${estimatedVariants > 0 ? html`<small class="hint">Will generate ${estimatedVariants} variant${estimatedVariants !== 1 ? 's' : ''}</small>` : nothing}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${isNew}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${options.length > 0
          ? html` <div class="options-list">${options.map((option) => this._renderOptionCard(option))}</div> `
          : !isNew
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint"><strong>Examples:</strong> Size (Small, Medium, Large), Color (Red, Blue, Green), Material (Cotton, Polyester)</p>
                <uui-button look="primary" @click=${this._addNewOption}>
                  <uui-icon name="icon-add"></uui-icon>
                  Add Your First Option
                </uui-button>
              </div>
            `
          : nothing}

        ${options.some((o) => o.isVariant) && !isNew
          ? html`
              <div class="regenerate-section">
                <uui-button look="secondary" label="Regenerate Variants" @click=${this._regenerateVariants}>
                  <uui-icon name="icon-sync"></uui-icon>
                  Regenerate Variants
                </uui-button>
                <small class="hint">
                  <uui-icon name="icon-alert"></uui-icon>
                  This will create new variants based on current options. Existing variant data (pricing, stock, images) may need to be updated manually.
                </small>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderOptionCard(option: ProductOptionDto): unknown {
    return html`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${option.name}</strong>
            <span class="badge ${option.isVariant ? "badge-positive" : "badge-default"}">
              ${option.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${option.optionUiAlias
              ? html` <span class="badge badge-default">${option.optionUiAlias}</span> `
              : nothing}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(option)} label="Edit option" aria-label="Edit ${option.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(option.id)} label="Delete option" aria-label="Delete ${option.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${option.values.map((value) => this._renderOptionValue(value, option.optionUiAlias))}
          ${option.values.length === 0 ? html`<p class="hint">No values added yet</p>` : nothing}
        </div>
      </uui-box>
    `;
  }

  private _renderOptionValue(value: ProductOptionValueDto, uiAlias: string | null): unknown {
    return html`
      <div class="option-value-chip">
        ${uiAlias === "colour" && value.hexValue
          ? html` <span class="color-swatch" style="background-color: ${value.hexValue}"></span> `
          : nothing}
        <span>${value.name}</span>
        ${value.priceAdjustment !== 0
          ? html`
              <span class="price-adjustment">
                ${value.priceAdjustment > 0 ? "+" : ""}$${value.priceAdjustment.toFixed(2)}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  private async _addNewOption(): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: undefined,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved && result.option) {
      // Add option to form data
      const options = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...options, result.option],
      };
      await this._saveOptions();
    }
  }

  private async _editOption(option: ProductOptionDto): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: option,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      if (result.deleted) {
        await this._deleteOption(option.id);
      } else if (result.option) {
        // Update option in form data
        const options = this._formData.productOptions || [];
        const index = options.findIndex((o) => o.id === option.id);
        if (index !== -1) {
          options[index] = result.option;
          this._formData = { ...this._formData, productOptions: [...options] };
          await this._saveOptions();
        }
      }
    }
  }

  private async _deleteOption(optionId: string): Promise<void> {
    const option = this._formData.productOptions?.find((o) => o.id === optionId);
    const optionName = option?.name || "this option";

    const confirmed = confirm(`Are you sure you want to delete "${optionName}"? This action cannot be undone.`);
    if (!confirmed) return;

    const options = (this._formData.productOptions || []).filter((o) => o.id !== optionId);
    this._formData = { ...this._formData, productOptions: options };
    await this._saveOptions();
  }

  private async _saveOptions(): Promise<void> {
    if (!this._product?.id) return;

    try {
      const options = (this._formData.productOptions || []).map((opt, index) => ({
        id: opt.id,
        name: opt.name,
        alias: opt.alias ?? undefined,
        sortOrder: index,
        optionTypeAlias: opt.optionTypeAlias ?? undefined,
        optionUiAlias: opt.optionUiAlias ?? undefined,
        isVariant: opt.isVariant,
        values: opt.values.map((val, valIndex) => ({
          id: val.id,
          name: val.name,
          sortOrder: valIndex,
          hexValue: val.hexValue ?? undefined,
          mediaKey: val.mediaKey ?? undefined,
          priceAdjustment: val.priceAdjustment,
          costAdjustment: val.costAdjustment,
          skuSuffix: val.skuSuffix ?? undefined,
        })),
      }));

      const { data, error } = await MerchelloApi.saveProductOptions(this._product.id, options);
      
      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (!error && data) {
        this._formData = { ...this._formData, productOptions: data };
        this.#workspaceContext?.reload();
      } else if (error) {
        console.error("Failed to save options:", error);
        this._errorMessage = "Failed to save options: " + error.message;
      }
    } catch (error) {
      if (!this.#isConnected) return;
      console.error("Failed to save options:", error);
      this._errorMessage = error instanceof Error ? error.message : "Failed to save options";
    }
  }

  /**
   * Regenerates variants from options with confirmation
   */
  private async _regenerateVariants(): Promise<void> {
    if (!this._product?.id) return;

    const variantOptions = this._formData.productOptions?.filter((o) => o.isVariant) || [];
    const estimatedCount = variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), 1);

    const confirmed = confirm(
      `This will regenerate all product variants based on your options (approximately ${estimatedCount} variants).\n\n` +
      `Existing variant-specific data (pricing, stock, images) will need to be updated manually.\n\n` +
      `Are you sure you want to continue?`
    );
    if (!confirmed) return;

    try {
      this.#notificationContext?.peek("default", { data: { headline: "Regenerating variants...", message: "Please wait" } });
      const { data, error } = await MerchelloApi.regenerateVariants(this._product.id);
      if (!error) {
        this.#notificationContext?.peek("positive", { data: { headline: "Variants regenerated", message: `${data?.length || 0} variants created` } });
        this.#workspaceContext?.reload();
      } else {
        console.error("Failed to regenerate variants:", error);
        this._errorMessage = "Failed to regenerate variants: " + error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to regenerate variants", message: error.message } });
      }
    } catch (error) {
      console.error("Failed to regenerate variants:", error);
      this._errorMessage = error instanceof Error ? error.message : "Failed to regenerate variants";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }

  render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    }

    const productName = this._product?.rootName || "Unnamed Product";
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <umb-body-layout header-fit-height>
        <div class="product-detail-container">
          <div class="page-header">
            <div class="breadcrumb">
              <a href=${getProductsListHref()} class="breadcrumb-link">
                <uui-icon name="icon-chevron-left"></uui-icon>
                Products
              </a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-current">${isNew ? "New Product" : productName}</span>
            </div>
            ${!isNew && this._product?.rootUrl ? html`
              <a href="${this._product.rootUrl}" target="_blank" class="view-on-site" title="View on website">
                <uui-icon name="icon-out"></uui-icon>
                View on Site
              </a>
            ` : nothing}
          </div>

          ${this._renderTabs()}

          <div class="tab-panels">
            ${this._activeTab === "details" ? this._renderDetailsTab() : nothing}
            ${this._activeTab === "variants" ? this._renderVariantsTab() : nothing}
            ${this._activeTab === "options" ? this._renderOptionsTab() : nothing}
          </div>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .product-detail-container {
        padding: var(--uui-size-layout-1);
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-4);
        padding-bottom: var(--uui-size-space-3);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        font-size: 0.875rem;
      }

      .breadcrumb-link {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        color: var(--uui-color-text);
        text-decoration: none;
        transition: color 0.2s;
      }

      .breadcrumb-link:hover {
        color: var(--uui-color-selected);
        text-decoration: underline;
      }

      .breadcrumb-separator {
        color: var(--uui-color-text-alt);
      }

      .breadcrumb-current {
        color: var(--uui-color-text);
        font-weight: 600;
      }

      .view-on-site {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        color: var(--uui-color-text);
        text-decoration: none;
        font-size: 0.875rem;
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        transition: all 0.2s;
      }

      .view-on-site:hover {
        color: var(--uui-color-selected);
        border-color: var(--uui-color-selected);
        background: var(--uui-color-surface);
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      uui-tab-group {
        margin-bottom: var(--uui-size-space-4);
      }

      .tab-label {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .tab-warning {
        color: var(--uui-color-warning);
      }

      .tab-count {
        font-size: 0.85em;
        opacity: 0.7;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--uui-size-space-4);
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .form-field.full-width {
        grid-column: 1 / -1;
      }

      .form-field.field-error uui-input,
      .form-field.field-error uui-select {
        border-color: var(--uui-color-danger);
      }

      .form-field label {
        font-weight: 600;
        color: var(--uui-color-text);
      }

      .required {
        color: var(--uui-color-danger);
      }

      .field-error-message {
        color: var(--uui-color-danger);
        font-size: 0.875rem;
        margin-top: -var(--uui-size-space-1);
      }

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .toggle-field {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .checkbox-field {
        padding: var(--uui-size-space-2) 0;
      }

      .actions {
        display: flex;
        gap: var(--uui-size-space-3);
        padding-top: var(--uui-size-space-4);
      }

      .error-box {
        background: var(--uui-color-danger-surface);
        border-left: 3px solid var(--uui-color-danger);
      }

      .info-banner {
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-selected);
      }

      .info-banner.warning {
        background: var(--uui-color-warning-surface);
        border-left-color: var(--uui-color-warning);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .info-content strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
      }

      .info-content p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        color: var(--uui-color-danger);
        padding: var(--uui-size-space-3);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-3);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .section-description {
        color: var(--uui-color-text-alt);
        margin: var(--uui-size-space-2) 0;
      }

      .table-container {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
      }

      .clickable {
        cursor: pointer;
      }

      .clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .variant-name {
        font-weight: 500;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .option-card {
        background: var(--uui-color-surface);
      }

      .option-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--uui-size-space-3);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
      }

      .option-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .option-values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        min-height: 60px;
        align-items: center;
      }

      .option-value-chip {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1px solid var(--uui-color-border);
      }

      .price-adjustment {
        font-weight: 600;
        color: var(--uui-color-positive);
      }

      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
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

      .regenerate-section {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-warning);
      }

      .regenerate-section .hint {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .regenerate-section uui-icon {
        color: var(--uui-color-warning);
      }

      .warehouse-list {
        padding: var(--uui-size-space-3) 0;
      }
    `,
  ];
}

export default MerchelloProductDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-detail": MerchelloProductDetailElement;
  }
}
