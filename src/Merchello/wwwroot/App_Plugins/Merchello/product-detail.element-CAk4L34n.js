import { LitElement as D, nothing as u, html as r, css as I, property as w, state as d, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as T } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as S } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as z } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-C2InYbkz.js";
import { b as V } from "./badge.styles-C_lNgH9O.js";
import { c as A, d as M } from "./navigation-DnzDaPpA.js";
import { UmbChangeEvent as N } from "@umbraco-cms/backoffice/event";
const $ = new C(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
);
var G = Object.defineProperty, F = Object.getOwnPropertyDescriptor, b = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? F(t, i) : t, n = e.length - 1, m; n >= 0; n--)
    (m = e[n]) && (o = (a ? m(t, i, o) : m(o)) || o);
  return a && o && G(t, i, o), o;
};
let f = class extends P(D) {
  constructor() {
    super(...arguments), this.items = [], this.placeholder = "Add item...", this.readonly = !1, this._newItemValue = "", this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Handles adding a new item when Enter is pressed or Add button is clicked.
   */
  _handleAddItem() {
    const e = this._newItemValue.trim();
    if (!e || this.readonly) return;
    const t = [...this.items, e];
    this._newItemValue = "", this._dispatchChange(t);
  }
  /**
   * Handles input in the new item field.
   */
  _handleNewItemInput(e) {
    this._newItemValue = e.target.value;
  }
  /**
   * Handles Enter key press in the new item field.
   */
  _handleNewItemKeyDown(e) {
    e.key === "Enter" && (e.preventDefault(), this._handleAddItem());
  }
  /**
   * Handles removing an item by index.
   */
  _handleRemoveItem(e) {
    if (this.readonly) return;
    const t = this.items.filter((i, a) => a !== e);
    this._dispatchChange(t);
  }
  /**
   * Starts editing an item.
   */
  _handleStartEdit(e) {
    this.readonly || (this._editingIndex = e, this._editingValue = this.items[e]);
  }
  /**
   * Handles input in the edit field.
   */
  _handleEditInput(e) {
    this._editingValue = e.target.value;
  }
  /**
   * Saves the edited item.
   */
  _handleSaveEdit() {
    if (this._editingIndex === null) return;
    const e = this._editingValue.trim();
    if (!e)
      this._handleRemoveItem(this._editingIndex);
    else {
      const t = [...this.items];
      t[this._editingIndex] = e, this._dispatchChange(t);
    }
    this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Cancels editing.
   */
  _handleCancelEdit() {
    this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Handles Enter and Escape keys in the edit field.
   */
  _handleEditKeyDown(e) {
    e.key === "Enter" ? (e.preventDefault(), this._handleSaveEdit()) : e.key === "Escape" && (e.preventDefault(), this._handleCancelEdit());
  }
  /**
   * Dispatches a change event with the new items array.
   */
  _dispatchChange(e) {
    this.items = e, this.dispatchEvent(new N());
  }
  render() {
    return r`
      <div class="editable-list-container">
        ${this.items.length > 0 ? r`
              <ul class="item-list">
                ${this.items.map((e, t) => this._renderItem(e, t))}
              </ul>
            ` : u}

        ${this.readonly ? u : r`
              <div class="add-item-row">
                <uui-input
                  type="text"
                  .value=${this._newItemValue}
                  @input=${this._handleNewItemInput}
                  @keydown=${this._handleNewItemKeyDown}
                  placeholder=${this.placeholder}
                  class="add-item-input">
                </uui-input>
                <uui-button
                  compact
                  look="primary"
                  color="positive"
                  @click=${this._handleAddItem}
                  ?disabled=${!this._newItemValue.trim()}
                  label="Add item"
                  aria-label="Add item">
                  <uui-icon name="icon-add"></uui-icon>
                </uui-button>
              </div>
            `}

        ${this.items.length === 0 && this.readonly ? r`<p class="empty-hint">No items added.</p>` : u}
      </div>
    `;
  }
  _renderItem(e, t) {
    return this._editingIndex === t ? r`
        <li class="item-row editing">
          <uui-input
            type="text"
            .value=${this._editingValue}
            @input=${this._handleEditInput}
            @keydown=${this._handleEditKeyDown}
            @blur=${this._handleSaveEdit}
            class="edit-input"
            autofocus>
          </uui-input>
          <div class="item-actions">
            <uui-button
              compact
              look="secondary"
              @click=${this._handleSaveEdit}
              label="Save"
              aria-label="Save changes">
              <uui-icon name="icon-check"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              @click=${this._handleCancelEdit}
              label="Cancel"
              aria-label="Cancel editing">
              <uui-icon name="icon-wrong"></uui-icon>
            </uui-button>
          </div>
        </li>
      ` : r`
      <li class="item-row">
        <span
          class="item-text ${this.readonly ? "" : "editable"}"
          @click=${() => !this.readonly && this._handleStartEdit(t)}
          @keydown=${(a) => a.key === "Enter" && !this.readonly && this._handleStartEdit(t)}
          tabindex=${this.readonly ? -1 : 0}
          role=${this.readonly ? u : "button"}
          aria-label=${this.readonly ? u : `Edit "${e}"`}>
          ${e}
        </span>
        ${this.readonly ? u : r`
              <div class="item-actions">
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._handleStartEdit(t)}
                  label="Edit"
                  aria-label="Edit ${e}">
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._handleRemoveItem(t)}
                  label="Remove"
                  aria-label="Remove ${e}">
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </li>
    `;
  }
};
f.styles = I`
    :host {
      display: block;
    }

    .editable-list-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .item-row:hover {
      border-color: var(--uui-color-border-emphasis);
    }

    .item-row.editing {
      border-color: var(--uui-color-selected);
      box-shadow: 0 0 0 1px var(--uui-color-selected);
    }

    .item-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-text.editable {
      cursor: pointer;
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      margin: calc(-1 * var(--uui-size-space-1)) calc(-1 * var(--uui-size-space-2));
      border-radius: var(--uui-border-radius);
      transition: background-color 0.15s ease;
    }

    .item-text.editable:hover,
    .item-text.editable:focus {
      background: var(--uui-color-surface-alt);
      outline: none;
    }

    .edit-input {
      flex: 1;
    }

    .item-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      flex-shrink: 0;
    }

    .add-item-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .add-item-input {
      flex: 1;
    }

    .empty-hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      font-style: italic;
    }
  `;
b([
  w({ type: Array })
], f.prototype, "items", 2);
b([
  w({ type: String })
], f.prototype, "placeholder", 2);
b([
  w({ type: Boolean })
], f.prototype, "readonly", 2);
b([
  d()
], f.prototype, "_newItemValue", 2);
b([
  d()
], f.prototype, "_editingIndex", 2);
b([
  d()
], f.prototype, "_editingValue", 2);
f = b([
  k("merchello-editable-text-list")
], f);
var R = Object.defineProperty, W = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, c = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? W(t, i) : t, n = e.length - 1, m; n >= 0; n--)
    (m = e[n]) && (o = (a ? m(t, i, o) : m(o)) || o);
  return a && o && R(t, i, o), o;
}, O = (e, t, i) => t.has(e) || E("Cannot " + i), s = (e, t, i) => (O(e, t, "read from private field"), t.get(e)), x = (e, t, i) => t.has(e) ? E("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), y = (e, t, i, a) => (O(e, t, "write to private field"), t.set(e, i), i), p, v, h, _;
let l = class extends P(D) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._optionSettings = null, this._validationAttempted = !1, this._fieldErrors = {}, this._routes = [], this._activePath = "", this._formData = {}, this._taxGroups = [], this._productTypes = [], this._warehouses = [], x(this, p), x(this, v), x(this, h), x(this, _, !1), this.consumeContext(T, (e) => {
      y(this, p, e), s(this, p) && this.observe(s(this, p).product, (t) => {
        this._product = t ?? null, t && (this._formData = { ...t }), this._isLoading = !t;
      });
    }), this.consumeContext(S, (e) => {
      y(this, v, e);
    }), this.consumeContext(z, (e) => {
      y(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), y(this, _, !0), this._loadReferenceData(), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), y(this, _, !1);
  }
  async _loadReferenceData() {
    try {
      const [e, t, i, a] = await Promise.all([
        g.getTaxGroups(),
        g.getProductTypes(),
        g.getWarehouses(),
        g.getProductOptionSettings()
      ]);
      if (!s(this, _)) return;
      e.data && (this._taxGroups = e.data), t.data && (this._productTypes = t.data), i.data && (this._warehouses = i.data), a.data && (this._optionSettings = a.data);
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   * Content is rendered inline based on _getActiveTab().
   */
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      {
        path: "tab/details",
        component: e
      },
      {
        path: "tab/variants",
        component: e
      },
      {
        path: "tab/options",
        component: e
      },
      {
        path: "",
        redirectTo: "tab/details"
      }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/variants") ? "variants" : this._activePath.includes("tab/options") ? "options" : "details";
  }
  /**
   * Checks if there are validation errors on the details tab
   */
  _hasDetailsErrors() {
    return !!(this._fieldErrors.rootName || this._fieldErrors.taxGroupId || this._fieldErrors.productTypeId || this._fieldErrors.warehouseIds);
  }
  /**
   * Gets validation hint for a specific tab
   */
  _getTabHint(e) {
    return e === "details" && this._validationAttempted && this._hasDetailsErrors() ? { color: "danger" } : e === "variants" && this._hasVariantWarnings() ? { color: "warning" } : e === "options" && this._hasOptionWarnings() ? { color: "warning" } : null;
  }
  _handleInputChange(e, t) {
    this._formData = { ...this._formData, [e]: t };
  }
  _handleToggleChange(e, t) {
    this._formData = { ...this._formData, [e]: t };
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
    const t = e.target;
    this._formData = { ...this._formData, taxGroupId: t.value };
  }
  _handleProductTypeChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, productTypeId: t.value };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        s(this, p)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
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
    }, { data: t, error: i } = await g.createProduct(e);
    if (i) {
      this._errorMessage = i.message, s(this, h)?.peek("danger", { data: { headline: "Failed to create product", message: i.message } });
      return;
    }
    t && (s(this, p)?.updateProduct(t), s(this, h)?.peek("positive", { data: { headline: "Product created", message: `"${t.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
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
    }, { data: t, error: i } = await g.updateProduct(this._product.id, e);
    if (i) {
      this._errorMessage = i.message, s(this, h)?.peek("danger", { data: { headline: "Failed to save product", message: i.message } });
      return;
    }
    t && (s(this, p)?.updateProduct(t), s(this, h)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
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
   * Checks if there are warnings for variants tab
   */
  _hasVariantWarnings() {
    return this._product?.variants ? this._product.variants.some((e) => !e.sku || e.price === 0) : !1;
  }
  /**
   * Checks if there are warnings for options tab
   */
  _hasOptionWarnings() {
    const e = this._product?.variants.length ?? 0, t = this._product?.productOptions.length ?? 0;
    return e > 1 && t === 0;
  }
  _renderTabs() {
    const e = this._product?.variants.length ?? 0, t = this._product?.productOptions.length ?? 0, i = this._getActiveTab(), a = this._getTabHint("details"), o = this._getTabHint("variants"), n = this._getTabHint("options");
    return r`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${i === "details"}>
          Details
          ${a ? r`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : u}
        </uui-tab>

        ${e > 1 ? r`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${i === "variants"}>
                Variants (${e})
                ${o ? r`<uui-badge slot="extra" color="warning">!</uui-badge>` : u}
              </uui-tab>
            ` : u}

        <uui-tab
          label="Options"
          href="${this._routerPath}/tab/options"
          ?active=${i === "options"}>
          Options (${t})
          ${n ? r`<uui-badge slot="extra" color="warning">!</uui-badge>` : u}
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderDetailsTab() {
    const e = s(this, p)?.isNew ?? !0;
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
            ` : u}

        ${this._errorMessage ? r`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : u}

        <uui-box headline="Basic Information">
          <umb-property-layout
            label="Product Type"
            description="Categorize your product for reporting and organization"
            ?mandatory=${!0}
            ?invalid=${!!this._fieldErrors.productTypeId}>
            <uui-select
              slot="editor"
              .options=${this._getProductTypeOptions()}
              @change=${this._handleProductTypeChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Tax Group"
            description="Tax rate applied to this product"
            ?mandatory=${!0}
            ?invalid=${!!this._fieldErrors.taxGroupId}>
            <uui-select
              slot="editor"
              .options=${this._getTaxGroupOptions()}
              @change=${this._handleTaxGroupChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Digital Product"
            description="No shipping costs, instant delivery, no warehouse needed">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.isDigitalProduct ?? !1}
              @change=${(t) => this._handleToggleChange("isDigitalProduct", t.target.checked)}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout
            label="Selling Points"
            description="Key features or benefits to display on your storefront">
            <merchello-editable-text-list
              slot="editor"
              .items=${this._formData.sellingPoints || []}
              @change=${this._handleSellingPointsChange}
              placeholder="e.g., Free shipping, 30-day returns">
            </merchello-editable-text-list>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Product Images">
          <umb-property-layout
            label="Images"
            description="Add images that will be displayed on your storefront">
            <div slot="editor">
              ${this._renderMediaPicker()}
            </div>
          </umb-property-layout>
        </uui-box>

        ${this._formData.isDigitalProduct ? u : r`
              <uui-box headline="Warehouses">
                <umb-property-layout
                  label="Stock Locations"
                  description="Select which warehouses stock this product"
                  ?mandatory=${!0}
                  ?invalid=${!!this._fieldErrors.warehouseIds}>
                  <div slot="editor">
                    ${this._renderWarehouseSelector()}
                  </div>
                </umb-property-layout>
              </uui-box>
            `}
      </div>
    `;
  }
  _renderMediaPicker() {
    const e = this._formData.rootImages || [], t = e.map((i) => ({ key: i, mediaKey: i }));
    return r`
      <umb-input-rich-media
        .value=${t}
        ?multiple=${!0}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${e.length === 0 ? r`
        <div class="empty-media-state">
          <uui-icon name="icon-picture"></uui-icon>
          <p>No images added yet</p>
          <small>Click the button above to add product images</small>
        </div>
      ` : u}
    `;
  }
  _handleMediaChange(e) {
    const a = (e.target?.value || []).map((o) => o.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: a };
  }
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds || [];
    return r`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (t) => r`
            <div class="toggle-field">
              <uui-toggle
                .checked=${e.includes(t.id)}
                @change=${(i) => this._handleWarehouseToggle(t.id, i.target.checked)}>
              </uui-toggle>
              <label>${t.name} ${t.code ? `(${t.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? r`<p class="hint">No warehouses available. Create a warehouse first.</p>` : u}
      </div>
    `;
  }
  _handleWarehouseToggle(e, t) {
    const i = this._formData.warehouseIds || [];
    t ? this._formData = { ...this._formData, warehouseIds: [...i, e] } : this._formData = { ...this._formData, warehouseIds: i.filter((a) => a !== e) };
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
            ${e.map((t) => this._renderVariantRow(t))}
          </uui-table>
        </div>
      </div>
    `;
  }
  _renderVariantRow(e) {
    const t = this._product ? A(this._product.id, e.id) : "";
    return r`
      <uui-table-row>
        <uui-table-cell>
          <uui-radio
            name="default-variant"
            .checked=${e.default}
            @change=${() => this._handleSetDefaultVariant(e.id)}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <a href=${t} class="variant-link">${e.name || "Unnamed"}</a>
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
        const { error: t } = await g.setDefaultVariant(this._product.id, e);
        t ? (console.error("Failed to set default variant:", t), s(this, h)?.peek("danger", { data: { headline: "Failed to set default variant", message: t.message } })) : (s(this, h)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), s(this, p)?.reload());
      } catch (t) {
        console.error("Failed to set default variant:", t), s(this, h)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
  }
  _renderOptionsTab() {
    const e = this._formData.productOptions ?? [], t = s(this, p)?.isNew ?? !0, i = e.filter((o) => o.isVariant), a = i.reduce((o, n) => o * (n.values.length || 1), i.length > 0 ? 1 : 0);
    return r`
      <div class="tab-content">
        ${t ? r`
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
            ${a > 0 ? r`<small class="hint">Will generate ${a} variant${a !== 1 ? "s" : ""}</small>` : u}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${t}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${e.length > 0 ? r` <div class="options-list">${e.map((o) => this._renderOptionCard(o))}</div> ` : t ? u : r`
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

        ${e.some((o) => o.isVariant) && !t ? r`
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
            ` : u}
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
            ${e.optionUiAlias ? r` <span class="badge badge-default">${e.optionUiAlias}</span> ` : u}
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
          ${e.values.map((t) => this._renderOptionValue(t, e.optionUiAlias))}
          ${e.values.length === 0 ? r`<p class="hint">No values added yet</p>` : u}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(e, t) {
    return r`
      <div class="option-value-chip">
        ${t === "colour" && e.hexValue ? r` <span class="color-swatch" style="background-color: ${e.hexValue}"></span> ` : u}
        <span>${e.name}</span>
        ${e.priceAdjustment !== 0 ? r`
              <span class="price-adjustment">
                ${e.priceAdjustment > 0 ? "+" : ""}$${e.priceAdjustment.toFixed(2)}
              </span>
            ` : u}
      </div>
    `;
  }
  async _addNewOption() {
    if (!s(this, v) || !this._optionSettings) return;
    const t = await s(this, v).open(this, $, {
      data: {
        option: void 0,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (t?.saved && t.option) {
      const i = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...i, t.option]
      }, await this._saveOptions();
    }
  }
  async _editOption(e) {
    if (!s(this, v) || !this._optionSettings) return;
    const i = await s(this, v).open(this, $, {
      data: {
        option: e,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (i?.saved) {
      if (i.deleted)
        await this._deleteOption(e.id);
      else if (i.option) {
        const a = this._formData.productOptions || [], o = a.findIndex((n) => n.id === e.id);
        o !== -1 && (a[o] = i.option, this._formData = { ...this._formData, productOptions: [...a] }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(e) {
    const i = this._formData.productOptions?.find((n) => n.id === e)?.name || "this option";
    if (!confirm(`Are you sure you want to delete "${i}"? This action cannot be undone.`)) return;
    const o = (this._formData.productOptions || []).filter((n) => n.id !== e);
    this._formData = { ...this._formData, productOptions: o }, await this._saveOptions();
  }
  async _saveOptions() {
    if (this._product?.id)
      try {
        const e = (this._formData.productOptions || []).map((a, o) => ({
          id: a.id,
          name: a.name,
          alias: a.alias ?? void 0,
          sortOrder: o,
          optionTypeAlias: a.optionTypeAlias ?? void 0,
          optionUiAlias: a.optionUiAlias ?? void 0,
          isVariant: a.isVariant,
          values: a.values.map((n, m) => ({
            id: n.id,
            name: n.name,
            sortOrder: m,
            hexValue: n.hexValue ?? void 0,
            mediaKey: n.mediaKey ?? void 0,
            priceAdjustment: n.priceAdjustment,
            costAdjustment: n.costAdjustment,
            skuSuffix: n.skuSuffix ?? void 0
          }))
        })), { data: t, error: i } = await g.saveProductOptions(this._product.id, e);
        if (!s(this, _)) return;
        !i && t ? (this._formData = { ...this._formData, productOptions: t }, s(this, p)?.reload()) : i && (console.error("Failed to save options:", i), this._errorMessage = "Failed to save options: " + i.message);
      } catch (e) {
        if (!s(this, _)) return;
        console.error("Failed to save options:", e), this._errorMessage = e instanceof Error ? e.message : "Failed to save options";
      }
  }
  /**
   * Regenerates variants from options with confirmation
   */
  async _regenerateVariants() {
    if (!this._product?.id) return;
    const t = (this._formData.productOptions?.filter((a) => a.isVariant) || []).reduce((a, o) => a * (o.values.length || 1), 1);
    if (confirm(
      `This will regenerate all product variants based on your options (approximately ${t} variants).

Existing variant-specific data (pricing, stock, images) will need to be updated manually.

Are you sure you want to continue?`
    ))
      try {
        s(this, h)?.peek("default", { data: { headline: "Regenerating variants...", message: "Please wait" } });
        const { data: a, error: o } = await g.regenerateVariants(this._product.id);
        o ? (console.error("Failed to regenerate variants:", o), this._errorMessage = "Failed to regenerate variants: " + o.message, s(this, h)?.peek("danger", { data: { headline: "Failed to regenerate variants", message: o.message } })) : (s(this, h)?.peek("positive", { data: { headline: "Variants regenerated", message: `${a?.length || 0} variants created` } }), s(this, p)?.reload());
      } catch (a) {
        console.error("Failed to regenerate variants:", a), this._errorMessage = a instanceof Error ? a.message : "Failed to regenerate variants", s(this, h)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
  }
  /**
   * Handles selling points change from the editable text list.
   */
  _handleSellingPointsChange(e) {
    const i = e.target?.items || [];
    this._formData = { ...this._formData, sellingPoints: i };
  }
  /**
   * Handles router slot initialization
   */
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  /**
   * Handles router slot path changes
   */
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
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
    const e = s(this, p)?.isNew ?? !0, t = this._getActiveTab();
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${M()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.rootName || ""}
            @input=${(i) => this._handleInputChange("rootName", i.target.value)}
            placeholder=${e ? "Enter product name..." : "Product name"}
            ?invalid=${!!this._fieldErrors.rootName}
            aria-label="Product name"
            aria-required="true">
          </uui-input>
        </div>

        <!-- Inner body layout for tabs + content -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          ${t === "details" ? this._renderDetailsTab() : u}
          ${t === "variants" ? this._renderVariantsTab() : u}
          ${t === "options" ? this._renderOptionsTab() : u}
        </umb-body-layout>

        <!-- Footer with save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
            label=${this._isSaving ? "Saving..." : e ? "Create Product" : "Save Changes"}>
            ${this._isSaving ? "Saving..." : e ? "Create Product" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
l.styles = [
  V,
  I`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header layout */
      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      /* Loading state */
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      /* Tab styling - Umbraco pattern */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      /* Hide router slot as we render content inline */
      umb-router-slot {
        display: none;
      }

      /* Box styling - Umbraco pattern */
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      /* Property layout adjustments */
      umb-property-layout:first-child {
        padding-top: 0;
      }

      umb-property-layout:last-child {
        padding-bottom: 0;
      }

      umb-property-layout uui-select,
      umb-property-layout uui-input {
        width: 100%;
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      /* Warehouse toggle list */
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
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      /* Empty media state */
      .empty-media-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-space-6);
        margin-top: var(--uui-size-space-3);
        background: var(--uui-color-surface);
        border: 2px dashed var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-text-alt);
        text-align: center;
      }

      .empty-media-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-2);
      }

      .empty-media-state p {
        margin: 0 0 var(--uui-size-space-1) 0;
        font-weight: 500;
      }

      .empty-media-state small {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      /* Info and error banners */
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

      /* Section headers */
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

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
      }

      .variant-link {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .variant-link:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive-emphasis);
      }

      /* Options */
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

      /* Empty state for options */
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

      /* Regenerate variants section */
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
    `
];
c([
  d()
], l.prototype, "_product", 2);
c([
  d()
], l.prototype, "_isLoading", 2);
c([
  d()
], l.prototype, "_isSaving", 2);
c([
  d()
], l.prototype, "_errorMessage", 2);
c([
  d()
], l.prototype, "_optionSettings", 2);
c([
  d()
], l.prototype, "_validationAttempted", 2);
c([
  d()
], l.prototype, "_fieldErrors", 2);
c([
  d()
], l.prototype, "_routes", 2);
c([
  d()
], l.prototype, "_routerPath", 2);
c([
  d()
], l.prototype, "_activePath", 2);
c([
  d()
], l.prototype, "_formData", 2);
c([
  d()
], l.prototype, "_taxGroups", 2);
c([
  d()
], l.prototype, "_productTypes", 2);
c([
  d()
], l.prototype, "_warehouses", 2);
l = c([
  k("merchello-product-detail")
], l);
const J = l;
export {
  l as MerchelloProductDetailElement,
  J as default
};
//# sourceMappingURL=product-detail.element-CAk4L34n.js.map
