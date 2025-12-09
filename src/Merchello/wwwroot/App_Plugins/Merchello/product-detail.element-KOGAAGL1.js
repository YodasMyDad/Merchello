import { LitElement as D, nothing as n, html as r, css as k, state as h, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as I } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as P } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-C2InYbkz.js";
import { b as z } from "./badge.styles-C_lNgH9O.js";
import { c as S } from "./navigation-Cp3wi1pC.js";
const E = new x(
  "Merchello.VariantDetail.Modal",
  {
    modal: {
      type: "sidebar",
      size: "large"
    }
  }
), y = new x(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
);
var M = Object.defineProperty, A = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, p = (e, a, t, i) => {
  for (var o = i > 1 ? void 0 : i ? A(a, t) : a, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (i ? v(a, t, o) : v(o)) || o);
  return i && o && M(a, t, o), o;
}, $ = (e, a, t) => a.has(e) || w("Cannot " + t), s = (e, a, t) => ($(e, a, "read from private field"), a.get(e)), b = (e, a, t) => a.has(e) ? w("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), _ = (e, a, t, i) => ($(e, a, "write to private field"), a.set(e, t), t), d, m, c, f;
let l = class extends T(D) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "details", this._optionSettings = null, this._validationAttempted = !1, this._fieldErrors = {}, this._formData = {}, this._taxGroups = [], this._productTypes = [], this._warehouses = [], b(this, d), b(this, m), b(this, c), b(this, f, !1), this.consumeContext(I, (e) => {
      _(this, d, e), s(this, d) && this.observe(s(this, d).product, (a) => {
        this._product = a ?? null, a && (this._formData = { ...a }), this._isLoading = !a;
      });
    }), this.consumeContext(P, (e) => {
      _(this, m, e);
    }), this.consumeContext(C, (e) => {
      _(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), _(this, f, !0), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, f, !1);
  }
  async _loadReferenceData() {
    try {
      const [e, a, t, i] = await Promise.all([
        g.getTaxGroups(),
        g.getProductTypes(),
        g.getWarehouses(),
        g.getProductOptionSettings()
      ]);
      if (!s(this, f)) return;
      e.data && (this._taxGroups = e.data), a.data && (this._productTypes = a.data), t.data && (this._warehouses = t.data), i.data && (this._optionSettings = i.data);
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  }
  _handleInputChange(e, a) {
    this._formData = { ...this._formData, [e]: a };
  }
  _handleToggleChange(e, a) {
    this._formData = { ...this._formData, [e]: a };
  }
  _getTaxGroupOptions() {
    return [
      { name: "Select tax group...", value: "", selected: !this._formData.taxGroupId },
      ...this._taxGroups.map((e) => ({
        name: e.name,
        value: e.id,
        selected: e.id === this._formData.taxGroupId
      }))
    ];
  }
  _getProductTypeOptions() {
    return [
      { name: "Select product type...", value: "", selected: !this._formData.productTypeId },
      ...this._productTypes.map((e) => ({
        name: e.name,
        value: e.id,
        selected: e.id === this._formData.productTypeId
      }))
    ];
  }
  _handleTaxGroupChange(e) {
    const a = e.target;
    this._formData = { ...this._formData, taxGroupId: a.value };
  }
  _handleProductTypeChange(e) {
    const a = e.target;
    this._formData = { ...this._formData, productTypeId: a.value };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        s(this, d)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred", console.error("Save failed:", e);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  async _createProduct() {
    const e = {
      rootName: this._formData.rootName || "",
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || !1,
      defaultVariant: {
        price: 0,
        costOfGoods: 0
      }
    }, { data: a, error: t } = await g.createProduct(e);
    if (t) {
      this._errorMessage = t.message, s(this, c)?.peek("danger", { data: { headline: "Failed to create product", message: t.message } });
      return;
    }
    a && (s(this, d)?.updateProduct(a), s(this, c)?.peek("positive", { data: { headline: "Product created", message: `"${a.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
  }
  async _updateProduct() {
    if (!this._product?.id) return;
    const e = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? void 0,
      sellingPoints: this._formData.sellingPoints,
      videos: this._formData.videos,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? void 0,
      hsCode: this._formData.hsCode ?? void 0,
      isDigitalProduct: this._formData.isDigitalProduct,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds
    }, { data: a, error: t } = await g.updateProduct(this._product.id, e);
    if (t) {
      this._errorMessage = t.message, s(this, c)?.peek("danger", { data: { headline: "Failed to save product", message: t.message } });
      return;
    }
    a && (s(this, d)?.updateProduct(a), s(this, c)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
  }
  /**
   * Validates the form and sets field-level errors
   */
  _validateForm() {
    this._validationAttempted = !0, this._fieldErrors = {}, this._errorMessage = null, this._formData.rootName?.trim() || (this._fieldErrors.rootName = "Product name is required"), this._formData.taxGroupId || (this._fieldErrors.taxGroupId = "Tax group is required"), this._formData.productTypeId || (this._fieldErrors.productTypeId = "Product type is required"), !this._formData.isDigitalProduct && (!this._formData.warehouseIds || this._formData.warehouseIds.length === 0) && (this._fieldErrors.warehouseIds = "At least one warehouse is required for physical products");
    const e = Object.keys(this._fieldErrors).length > 0;
    return e && (this._errorMessage = "Please fix the errors below before saving"), !e;
  }
  /**
   * Gets validation CSS class for a field
   */
  _getFieldClass(e) {
    return this._validationAttempted && this._fieldErrors[e] ? "field-error" : "";
  }
  /**
   * Checks if there are warnings for variants tab
   */
  _hasVariantWarnings() {
    return this._product?.variants ? this._product.variants.some((e) => !e.sku || e.price === 0) : !1;
  }
  /**
   * Checks if there are warnings for options tab
   */
  _hasOptionWarnings() {
    const e = this._product?.variants.length ?? 0, a = this._product?.productOptions.length ?? 0;
    return e > 1 && a === 0;
  }
  _renderTabs() {
    const e = this._product?.variants.length ?? 0, a = this._product?.productOptions.length ?? 0, t = this._hasVariantWarnings(), i = this._hasOptionWarnings();
    return r`
      <uui-tab-group>
        <uui-tab
          label="Details"
          ?active=${this._activeTab === "details"}
          @click=${() => this._activeTab = "details"}>
          <span class="tab-label">
            <uui-icon name="icon-info"></uui-icon>
            Details
          </span>
        </uui-tab>

        ${e > 1 ? r`
              <uui-tab
                label="Variants"
                ?active=${this._activeTab === "variants"}
                @click=${() => this._activeTab = "variants"}>
                <span class="tab-label">
                  <uui-icon name="icon-layers"></uui-icon>
                  Variants
                  ${t ? r`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : n}
                  <span class="tab-count">(${e})</span>
                </span>
              </uui-tab>
            ` : n}

        <uui-tab
          label="Options"
          ?active=${this._activeTab === "options"}
          @click=${() => this._activeTab = "options"}>
          <span class="tab-label">
            <uui-icon name="icon-settings"></uui-icon>
            Options
            ${i ? r`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : n}
            <span class="tab-count">(${a})</span>
          </span>
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderDetailsTab() {
    const e = s(this, d)?.isNew ?? !0;
    return r`
      <div class="tab-content">
        ${e ? r`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            ` : n}

        ${this._errorMessage ? r`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : n}

        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field full-width ${this._getFieldClass("rootName")}">
              <label>Product Name <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.rootName || ""}
                @input=${(a) => this._handleInputChange("rootName", a.target.value)}
                @blur=${() => this._validateForm()}
                placeholder="Enter product name"
                aria-required="true">
              </uui-input>
              ${this._fieldErrors.rootName ? r`<span class="field-error-message">${this._fieldErrors.rootName}</span>` : n}
            </div>

            <div class="form-field ${this._getFieldClass("productTypeId")}">
              <label>Product Type <span class="required">*</span></label>
              <uui-select
                .options=${this._getProductTypeOptions()}
                @change=${this._handleProductTypeChange}
                aria-required="true">
              </uui-select>
              ${this._fieldErrors.productTypeId ? r`<span class="field-error-message">${this._fieldErrors.productTypeId}</span>` : n}
              <small class="hint">Categorize your product for reporting and organization</small>
            </div>

            <div class="form-field ${this._getFieldClass("taxGroupId")}">
              <label>Tax Group <span class="required">*</span></label>
              <uui-select .options=${this._getTaxGroupOptions()} @change=${this._handleTaxGroupChange} aria-required="true"> </uui-select>
              ${this._fieldErrors.taxGroupId ? r`<span class="field-error-message">${this._fieldErrors.taxGroupId}</span>` : n}
              <small class="hint">Tax rate applied to this product</small>
            </div>

            <div class="form-field full-width">
              <div class="toggle-field">
                <uui-toggle
                  .checked=${this._formData.isDigitalProduct ?? !1}
                  @change=${(a) => this._handleToggleChange("isDigitalProduct", a.target.checked)}>
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

        ${this._formData.isDigitalProduct ? n : r`
              <uui-box headline="Warehouses">
                <p class="hint">Select which warehouses stock this product <span class="required">*</span></p>
                ${this._renderWarehouseSelector()}
                ${this._fieldErrors.warehouseIds ? r`<span class="field-error-message">${this._fieldErrors.warehouseIds}</span>` : n}
              </uui-box>
            `}

        <div class="actions">
          <uui-button look="primary" color="positive" @click=${this._handleSave} ?disabled=${this._isSaving}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : e ? "Create Product" : "Save Changes"}
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderMediaPicker() {
    const e = this._formData.rootImages || [], a = e.map((t) => ({ key: t, mediaKey: t }));
    return r`
      <umb-input-rich-media
        .value=${a}
        ?multiple=${!0}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${e.length === 0 ? r`<p class="hint">No images added yet. Click to add product images.</p>` : n}
    `;
  }
  _handleMediaChange(e) {
    const i = (e.target?.value || []).map((o) => o.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: i };
  }
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds || [];
    return r`
      <div class="warehouse-list">
        ${this._warehouses.map(
      (a) => r`
            <div class="checkbox-field">
              <uui-checkbox
                .checked=${e.includes(a.id)}
                @change=${(t) => this._handleWarehouseToggle(a.id, t.target.checked)}>
                ${a.name} ${a.code ? `(${a.code})` : ""}
              </uui-checkbox>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? r`<p class="hint">No warehouses available. Create a warehouse first.</p>` : n}
      </div>
    `;
  }
  _handleWarehouseToggle(e, a) {
    const t = this._formData.warehouseIds || [];
    a ? this._formData = { ...this._formData, warehouseIds: [...t, e] } : this._formData = { ...this._formData, warehouseIds: t.filter((i) => i !== e) };
  }
  _renderVariantsTab() {
    const e = this._product?.variants ?? [];
    return r`
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
            ${e.map((a) => this._renderVariantRow(a))}
          </uui-table>
        </div>
      </div>
    `;
  }
  _renderVariantRow(e) {
    return r`
      <uui-table-row class="clickable" @click=${() => this._openVariantModal(e)}>
        <uui-table-cell @click=${(a) => a.stopPropagation()}>
          <uui-radio
            name="default-variant"
            .checked=${e.default}
            @change=${() => this._handleSetDefaultVariant(e.id)}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <span class="variant-name">${e.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${e.sku || "—"}</uui-table-cell>
        <uui-table-cell>$${e.price.toFixed(2)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${this._getStockBadgeClass(e.totalStock)}">${e.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${e.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _getStockBadgeClass(e) {
    return e === 0 ? "badge-danger" : e < 10 ? "badge-warning" : "badge-positive";
  }
  async _handleSetDefaultVariant(e) {
    if (this._product)
      try {
        const { error: a } = await g.setDefaultVariant(this._product.id, e);
        a ? (console.error("Failed to set default variant:", a), s(this, c)?.peek("danger", { data: { headline: "Failed to set default variant", message: a.message } })) : (s(this, c)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), s(this, d)?.reload());
      } catch (a) {
        console.error("Failed to set default variant:", a), s(this, c)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
  }
  async _openVariantModal(e) {
    if (!s(this, m) || !this._product) return;
    (await s(this, m).open(this, E, {
      data: {
        productRootId: this._product.id,
        variant: e,
        warehouses: this._warehouses
      }
    }).onSubmit().catch(() => {
    }))?.saved && s(this, d)?.reload();
  }
  _renderOptionsTab() {
    const e = this._formData.productOptions ?? [], a = s(this, d)?.isNew ?? !0, t = e.filter((o) => o.isVariant), i = t.reduce((o, u) => o * (u.values.length || 1), t.length > 0 ? 1 : 0);
    return r`
      <div class="tab-content">
        ${a ? r`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            ` : r`
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
            ${i > 0 ? r`<small class="hint">Will generate ${i} variant${i !== 1 ? "s" : ""}</small>` : n}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${a}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${e.length > 0 ? r` <div class="options-list">${e.map((o) => this._renderOptionCard(o))}</div> ` : a ? n : r`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint"><strong>Examples:</strong> Size (Small, Medium, Large), Color (Red, Blue, Green), Material (Cotton, Polyester)</p>
                <uui-button look="primary" @click=${this._addNewOption}>
                  <uui-icon name="icon-add"></uui-icon>
                  Add Your First Option
                </uui-button>
              </div>
            `}

        ${e.some((o) => o.isVariant) && !a ? r`
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
            ` : n}
      </div>
    `;
  }
  _renderOptionCard(e) {
    return r`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${e.name}</strong>
            <span class="badge ${e.isVariant ? "badge-positive" : "badge-default"}">
              ${e.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${e.optionUiAlias ? r` <span class="badge badge-default">${e.optionUiAlias}</span> ` : n}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(e)} label="Edit option" aria-label="Edit ${e.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(e.id)} label="Delete option" aria-label="Delete ${e.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${e.values.map((a) => this._renderOptionValue(a, e.optionUiAlias))}
          ${e.values.length === 0 ? r`<p class="hint">No values added yet</p>` : n}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(e, a) {
    return r`
      <div class="option-value-chip">
        ${a === "colour" && e.hexValue ? r` <span class="color-swatch" style="background-color: ${e.hexValue}"></span> ` : n}
        <span>${e.name}</span>
        ${e.priceAdjustment !== 0 ? r`
              <span class="price-adjustment">
                ${e.priceAdjustment > 0 ? "+" : ""}$${e.priceAdjustment.toFixed(2)}
              </span>
            ` : n}
      </div>
    `;
  }
  async _addNewOption() {
    if (!s(this, m) || !this._optionSettings) return;
    const a = await s(this, m).open(this, y, {
      data: {
        option: void 0,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (a?.saved && a.option) {
      const t = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...t, a.option]
      }, await this._saveOptions();
    }
  }
  async _editOption(e) {
    if (!s(this, m) || !this._optionSettings) return;
    const t = await s(this, m).open(this, y, {
      data: {
        option: e,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (t?.saved) {
      if (t.deleted)
        await this._deleteOption(e.id);
      else if (t.option) {
        const i = this._formData.productOptions || [], o = i.findIndex((u) => u.id === e.id);
        o !== -1 && (i[o] = t.option, this._formData = { ...this._formData, productOptions: [...i] }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(e) {
    const t = this._formData.productOptions?.find((u) => u.id === e)?.name || "this option";
    if (!confirm(`Are you sure you want to delete "${t}"? This action cannot be undone.`)) return;
    const o = (this._formData.productOptions || []).filter((u) => u.id !== e);
    this._formData = { ...this._formData, productOptions: o }, await this._saveOptions();
  }
  async _saveOptions() {
    if (this._product?.id)
      try {
        const e = (this._formData.productOptions || []).map((i, o) => ({
          id: i.id,
          name: i.name,
          alias: i.alias ?? void 0,
          sortOrder: o,
          optionTypeAlias: i.optionTypeAlias ?? void 0,
          optionUiAlias: i.optionUiAlias ?? void 0,
          isVariant: i.isVariant,
          values: i.values.map((u, v) => ({
            id: u.id,
            name: u.name,
            sortOrder: v,
            hexValue: u.hexValue ?? void 0,
            mediaKey: u.mediaKey ?? void 0,
            priceAdjustment: u.priceAdjustment,
            costAdjustment: u.costAdjustment,
            skuSuffix: u.skuSuffix ?? void 0
          }))
        })), { data: a, error: t } = await g.saveProductOptions(this._product.id, e);
        if (!s(this, f)) return;
        !t && a ? (this._formData = { ...this._formData, productOptions: a }, s(this, d)?.reload()) : t && (console.error("Failed to save options:", t), this._errorMessage = "Failed to save options: " + t.message);
      } catch (e) {
        if (!s(this, f)) return;
        console.error("Failed to save options:", e), this._errorMessage = e instanceof Error ? e.message : "Failed to save options";
      }
  }
  /**
   * Regenerates variants from options with confirmation
   */
  async _regenerateVariants() {
    if (!this._product?.id) return;
    const a = (this._formData.productOptions?.filter((i) => i.isVariant) || []).reduce((i, o) => i * (o.values.length || 1), 1);
    if (confirm(
      `This will regenerate all product variants based on your options (approximately ${a} variants).

Existing variant-specific data (pricing, stock, images) will need to be updated manually.

Are you sure you want to continue?`
    ))
      try {
        s(this, c)?.peek("default", { data: { headline: "Regenerating variants...", message: "Please wait" } });
        const { data: i, error: o } = await g.regenerateVariants(this._product.id);
        o ? (console.error("Failed to regenerate variants:", o), this._errorMessage = "Failed to regenerate variants: " + o.message, s(this, c)?.peek("danger", { data: { headline: "Failed to regenerate variants", message: o.message } })) : (s(this, c)?.peek("positive", { data: { headline: "Variants regenerated", message: `${i?.length || 0} variants created` } }), s(this, d)?.reload());
      } catch (i) {
        console.error("Failed to regenerate variants:", i), this._errorMessage = i instanceof Error ? i.message : "Failed to regenerate variants", s(this, c)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
  }
  render() {
    if (this._isLoading)
      return r`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const e = this._product?.rootName || "Unnamed Product", a = s(this, d)?.isNew ?? !0;
    return r`
      <umb-body-layout header-fit-height>
        <div class="product-detail-container">
          <div class="page-header">
            <div class="breadcrumb">
              <a href=${S()} class="breadcrumb-link">
                <uui-icon name="icon-chevron-left"></uui-icon>
                Products
              </a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-current">${a ? "New Product" : e}</span>
            </div>
            ${!a && this._product?.rootUrl ? r`
              <a href="${this._product.rootUrl}" target="_blank" class="view-on-site" title="View on website">
                <uui-icon name="icon-out"></uui-icon>
                View on Site
              </a>
            ` : n}
          </div>

          ${this._renderTabs()}

          <div class="tab-panels">
            ${this._activeTab === "details" ? this._renderDetailsTab() : n}
            ${this._activeTab === "variants" ? this._renderVariantsTab() : n}
            ${this._activeTab === "options" ? this._renderOptionsTab() : n}
          </div>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
l.styles = [
  z,
  k`
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
    `
];
p([
  h()
], l.prototype, "_product", 2);
p([
  h()
], l.prototype, "_isLoading", 2);
p([
  h()
], l.prototype, "_isSaving", 2);
p([
  h()
], l.prototype, "_errorMessage", 2);
p([
  h()
], l.prototype, "_activeTab", 2);
p([
  h()
], l.prototype, "_optionSettings", 2);
p([
  h()
], l.prototype, "_validationAttempted", 2);
p([
  h()
], l.prototype, "_fieldErrors", 2);
p([
  h()
], l.prototype, "_formData", 2);
p([
  h()
], l.prototype, "_taxGroups", 2);
p([
  h()
], l.prototype, "_productTypes", 2);
p([
  h()
], l.prototype, "_warehouses", 2);
l = p([
  O("merchello-product-detail")
], l);
const L = l;
export {
  l as MerchelloProductDetailElement,
  L as default
};
//# sourceMappingURL=product-detail.element-KOGAAGL1.js.map
