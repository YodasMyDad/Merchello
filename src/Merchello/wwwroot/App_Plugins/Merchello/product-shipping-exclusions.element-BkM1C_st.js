import { LitElement as m, nothing as u, html as o, css as b, property as l, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { v as C } from "./navigation-CvTcY6zJ.js";
var w = Object.defineProperty, S = Object.getOwnPropertyDescriptor, k = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? S(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && w(i, t, a), a;
};
let d = class extends f(m) {
  constructor() {
    super(...arguments), this.formData = {}, this.fieldErrors = {}, this.showVariantName = !1;
  }
  _dispatchVariantChange(e) {
    this.dispatchEvent(new CustomEvent("variant-change", { detail: e, bubbles: !0, composed: !0 }));
  }
  _toPropertyValueMap(e) {
    const i = {};
    for (const t of e)
      i[t.alias] = t.value;
    return i;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getNumberFromPropertyValue(e, i = 0) {
    if (typeof e == "number" && Number.isFinite(e)) return e;
    if (typeof e == "string") {
      const t = Number(e);
      return Number.isFinite(t) ? t : i;
    }
    return i;
  }
  _getBooleanFromPropertyValue(e, i) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return i;
  }
  _getDatasetValue() {
    const e = [
      { alias: "sku", value: this.formData.sku ?? "" },
      { alias: "gtin", value: this.formData.gtin ?? "" },
      { alias: "supplierSku", value: this.formData.supplierSku ?? "" },
      { alias: "hsCode", value: this.formData.hsCode ?? "" },
      { alias: "price", value: this.formData.price ?? 0 },
      { alias: "costOfGoods", value: this.formData.costOfGoods ?? 0 },
      { alias: "onSale", value: this.formData.onSale ?? !1 },
      { alias: "previousPrice", value: this.formData.previousPrice ?? 0 },
      { alias: "availableForPurchase", value: this.formData.availableForPurchase ?? !0 },
      { alias: "canPurchase", value: this.formData.canPurchase ?? !0 }
    ];
    return this.showVariantName && e.unshift({ alias: "name", value: this.formData.name ?? "" }), e;
  }
  _handleDatasetChange(e) {
    const i = e.target, t = this._toPropertyValueMap(i.value ?? []), r = Object.prototype.hasOwnProperty.call(t, "previousPrice"), a = {
      ...this.formData,
      ...this.showVariantName ? { name: this._getStringFromPropertyValue(t.name) } : {},
      sku: this._getStringFromPropertyValue(t.sku),
      gtin: this._getStringFromPropertyValue(t.gtin),
      supplierSku: this._getStringFromPropertyValue(t.supplierSku),
      hsCode: this._getStringFromPropertyValue(t.hsCode),
      price: this._getNumberFromPropertyValue(t.price, 0),
      costOfGoods: this._getNumberFromPropertyValue(t.costOfGoods, 0),
      onSale: this._getBooleanFromPropertyValue(t.onSale, !1),
      availableForPurchase: this._getBooleanFromPropertyValue(t.availableForPurchase, !0),
      canPurchase: this._getBooleanFromPropertyValue(t.canPurchase, !0)
    };
    r && (a.previousPrice = this._getNumberFromPropertyValue(t.previousPrice, 0)), this._dispatchVariantChange(a);
  }
  render() {
    const e = Object.values(this.fieldErrors).filter((i) => !!i);
    return o`
      ${e.length > 0 ? o`
            <div class="error-summary">
              ${e.map((i) => o`<div>${i}</div>`)}
            </div>
          ` : u}

      <umb-property-dataset
        .value=${this._getDatasetValue()}
        @change=${this._handleDatasetChange}>
        <uui-box headline="Identification">
          ${this.showVariantName ? o`
                <umb-property
                  alias="name"
                  label="Variant Name"
                  description="If empty, generated from option values"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 500 }]}>
                </umb-property>
              ` : u}

          <umb-property
            alias="sku"
            label="SKU"
            description="Stock Keeping Unit - unique product identifier"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="gtin"
            label="GTIN/Barcode"
            description="Global Trade Item Number (EAN/UPC)"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}>
          </umb-property>

          <umb-property
            alias="supplierSku"
            label="Supplier SKU"
            description="Your supplier's product code"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}>
          </umb-property>

          <umb-property
            alias="hsCode"
            label="HS Code"
            description="Harmonized System code for customs/tariff classification"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 10 }]}>
          </umb-property>
        </uui-box>

        <uui-box headline="Pricing">
          <umb-property
            alias="price"
            label="Price"
            description="Customer-facing price (excluding tax)"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="costOfGoods"
            label="Cost of Goods"
            description="Your cost for profit margin calculation"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}>
          </umb-property>

          <umb-property
            alias="onSale"
            label="On Sale"
            description="Enable sale pricing"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          ${this.formData.onSale ?? !1 ? o`
                <umb-property
                  alias="previousPrice"
                  label="Previous Price (Was)"
                  description="Original price to show discount"
                  property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
                  .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}>
                </umb-property>
              ` : u}
        </uui-box>

        <uui-box headline="Availability">
          <umb-property
            alias="availableForPurchase"
            label="Visible on Website"
            description="Show on storefront and allow adding to cart"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          <umb-property
            alias="canPurchase"
            label="Allow Purchase"
            description="Enable checkout (used for stock/inventory validation)"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
        </uui-box>
      </umb-property-dataset>
    `;
  }
};
d.styles = b`
    :host {
      display: contents;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-box + uui-box {
      margin-top: var(--uui-size-space-5);
    }

    .error-summary {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
    }

    umb-property uui-input,
    umb-property uui-textarea {
      width: 100%;
    }
  `;
k([
  l({ type: Object })
], d.prototype, "formData", 2);
k([
  l({ type: Object })
], d.prototype, "fieldErrors", 2);
k([
  l({ type: Boolean })
], d.prototype, "showVariantName", 2);
d = k([
  v("merchello-variant-basic-info")
], d);
var z = Object.defineProperty, E = Object.getOwnPropertyDescriptor, $ = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? E(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && z(i, t, a), a;
};
let P = class extends f(m) {
  constructor() {
    super(...arguments), this.formData = {};
  }
  _dispatchVariantChange(e) {
    this.dispatchEvent(new CustomEvent("variant-change", { detail: e, bubbles: !0, composed: !0 }));
  }
  _toPropertyValueMap(e) {
    const i = {};
    for (const t of e)
      i[t.alias] = t.value;
    return i;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getBooleanFromPropertyValue(e, i) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return i;
  }
  _getDatasetValue() {
    return [
      { alias: "removeFromFeed", value: this.formData.removeFromFeed ?? !1 },
      { alias: "shoppingFeedTitle", value: this.formData.shoppingFeedTitle ?? "" },
      { alias: "shoppingFeedDescription", value: this.formData.shoppingFeedDescription ?? "" },
      { alias: "shoppingFeedColour", value: this.formData.shoppingFeedColour ?? "" },
      { alias: "shoppingFeedMaterial", value: this.formData.shoppingFeedMaterial ?? "" },
      { alias: "shoppingFeedSize", value: this.formData.shoppingFeedSize ?? "" },
      { alias: "shoppingFeedBrand", value: this.formData.shoppingFeedBrand ?? "" },
      { alias: "shoppingFeedCondition", value: this.formData.shoppingFeedCondition ?? "" },
      { alias: "shoppingFeedWidth", value: this.formData.shoppingFeedWidth ?? "" },
      { alias: "shoppingFeedHeight", value: this.formData.shoppingFeedHeight ?? "" }
    ];
  }
  _handleDatasetChange(e) {
    const i = e.target, t = this._toPropertyValueMap(i.value ?? []), r = {
      ...this.formData,
      removeFromFeed: this._getBooleanFromPropertyValue(t.removeFromFeed, !1),
      shoppingFeedTitle: this._getStringFromPropertyValue(t.shoppingFeedTitle),
      shoppingFeedDescription: this._getStringFromPropertyValue(t.shoppingFeedDescription),
      shoppingFeedColour: this._getStringFromPropertyValue(t.shoppingFeedColour),
      shoppingFeedMaterial: this._getStringFromPropertyValue(t.shoppingFeedMaterial),
      shoppingFeedSize: this._getStringFromPropertyValue(t.shoppingFeedSize),
      shoppingFeedBrand: this._getStringFromPropertyValue(t.shoppingFeedBrand),
      shoppingFeedCondition: this._getStringFromPropertyValue(t.shoppingFeedCondition),
      shoppingFeedWidth: this._getStringFromPropertyValue(t.shoppingFeedWidth),
      shoppingFeedHeight: this._getStringFromPropertyValue(t.shoppingFeedHeight)
    };
    this._dispatchVariantChange(r);
  }
  render() {
    return o`
      <umb-property-dataset
        .value=${this._getDatasetValue()}
        @input=${this._handleDatasetChange}
        @change=${this._handleDatasetChange}>
        <uui-box headline="Shopping Feed Settings">
          <umb-property
            alias="removeFromFeed"
            label="Remove from Feed"
            description="Exclude this product from shopping feeds"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          ${this.formData.removeFromFeed ?? !1 ? u : o`
                <umb-property
                  alias="shoppingFeedTitle"
                  label="Feed Title"
                  description="Title for shopping feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 150 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedDescription"
                  label="Feed Description"
                  description="Description for shopping feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"
                  .config=${[{ alias: "maxChars", value: 1e3 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedColour"
                  label="Colour"
                  description="Product colour for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedMaterial"
                  label="Material"
                  description="Product material for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedSize"
                  label="Size"
                  description="Product size for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedBrand"
                  label="Brand Override"
                  description="Optional variant brand override. Leave blank to use product default."
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 150 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedCondition"
                  label="Condition Override"
                  description="Optional variant condition override. Leave blank to use product default."
                  property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                  .config=${[{
      alias: "items",
      value: [
        { name: "Use product default", value: "" },
        { name: "New", value: "new" },
        { name: "Used", value: "used" },
        { name: "Refurbished", value: "refurbished" }
      ]
    }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedWidth"
                  label="Width"
                  description="Product width for feed (e.g. 10 cm)"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedHeight"
                  label="Height"
                  description="Product height for feed (e.g. 15 cm)"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>
              `}
        </uui-box>
      </umb-property-dataset>
    `;
  }
};
P.styles = b`
    :host {
      display: contents;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property uui-input,
    umb-property uui-textarea {
      width: 100%;
    }
  `;
$([
  l({ type: Object })
], P.prototype, "formData", 2);
P = $([
  v("merchello-variant-feed-settings")
], P);
var D = Object.defineProperty, O = Object.getOwnPropertyDescriptor, _ = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? O(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && D(i, t, a), a;
};
let h = class extends f(m) {
  constructor() {
    super(...arguments), this.warehouseStock = [], this.totalAvailableStock = 0, this.totalReservedStock = 0;
  }
  _emitChange(e) {
    this.dispatchEvent(
      new CustomEvent("stock-settings-change", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleStockChange(e, i) {
    const t = parseInt(i, 10);
    !isNaN(t) && t >= 0 && this._emitChange({ warehouseId: e, stock: t });
  }
  _handleReorderPointChange(e, i) {
    const t = i === "" ? null : parseInt(i, 10);
    (t === null || !isNaN(t) && t >= 0) && this._emitChange({ warehouseId: e, reorderPoint: t });
  }
  _handleTrackStockChange(e, i) {
    this._emitChange({ warehouseId: e, trackStock: i });
  }
  render() {
    return o`
      <uui-box class="info-banner">
        <div class="info-content">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <strong>Stock Management</strong>
            <p>Manage stock levels per warehouse. Set reorder points to receive alerts when stock runs low. Disable "Track Stock" for unlimited availability.</p>
          </div>
        </div>
      </uui-box>

      <uui-box headline="Warehouse Stock">
        ${this.warehouseStock.length > 0 ? o`
              <div class="stock-summary">
                <strong>Available Stock:</strong> ${this.totalAvailableStock} units
                ${this.totalReservedStock > 0 ? o`<span class="reserved-info">(${this.totalReservedStock} reserved)</span>` : ""}
              </div>
              <div class="table-container">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Warehouse</uui-table-head-cell>
                    <uui-table-head-cell>Stock</uui-table-head-cell>
                    <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                    <uui-table-head-cell>Track Stock</uui-table-head-cell>
                  </uui-table-head>
                  ${this.warehouseStock.map(
      (e) => o`
                      <uui-table-row>
                        <uui-table-cell><strong>${e.warehouseName}</strong></uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            label="Stock for ${e.warehouseName}"
                            type="number"
                            min="0"
                            class="stock-input"
                            .value=${String(e.stock)}
                            ?disabled=${!e.trackStock}
                            @change=${(i) => this._handleStockChange(e.warehouseId, i.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            label="Reorder point for ${e.warehouseName}"
                            type="number"
                            min="0"
                            class="stock-input"
                            placeholder="Not set"
                            .value=${e.reorderPoint != null ? String(e.reorderPoint) : ""}
                            ?disabled=${!e.trackStock}
                            @change=${(i) => this._handleReorderPointChange(e.warehouseId, i.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-toggle
                            label="Track stock"
                            .checked=${e.trackStock}
                            @change=${(i) => this._handleTrackStockChange(e.warehouseId, i.target.checked)}>
                          </uui-toggle>
                        </uui-table-cell>
                      </uui-table-row>
                    `
    )}
                </uui-table>
              </div>
            ` : o`
              <div class="empty-state">
                <uui-icon name="icon-box"></uui-icon>
                <p>No warehouses assigned to this product</p>
                <p class="hint">Assign warehouses in the Details tab</p>
              </div>
            `}
      </uui-box>
    `;
  }
};
h.styles = [
  b`
      :host {
        display: contents;
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

      .info-banner {
        background: var(--uui-color-surface-alt);
        border-left: 4px solid var(--uui-color-current);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-4);
        align-items: flex-start;
      }

      .info-content uui-icon {
        font-size: 24px;
        color: var(--uui-color-current);
        flex-shrink: 0;
      }

      .info-content p {
        margin: var(--uui-size-space-2) 0 0;
        color: var(--uui-color-text-alt);
      }

      .stock-summary {
        margin-bottom: var(--uui-size-space-4);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .reserved-info {
        color: var(--uui-color-text-alt);
        font-size: 0.875rem;
        margin-left: var(--uui-size-space-2);
      }

      .table-container {
        overflow-x: auto;
      }

      .stock-input {
        width: 100px;
      }

      uui-table-cell uui-toggle {
        margin: 0;
      }

      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
      }

      .empty-state p {
        margin: var(--uui-size-space-3) 0 0;
      }

      .empty-state .hint {
        font-size: 0.875rem;
        opacity: 0.8;
      }
    `
];
_([
  l({ type: Array })
], h.prototype, "warehouseStock", 2);
_([
  l({ type: Number })
], h.prototype, "totalAvailableStock", 2);
_([
  l({ type: Number })
], h.prototype, "totalReservedStock", 2);
h = _([
  v("merchello-variant-stock-display")
], h);
var U = Object.defineProperty, N = Object.getOwnPropertyDescriptor, x = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? N(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && U(i, t, a), a;
};
let c = class extends f(m) {
  constructor() {
    super(...arguments), this.packages = [], this.editable = !0, this.showInheritedBanner = !1, this.disableAdd = !1;
  }
  // ============================================
  // Package Management
  // ============================================
  /** Add a new empty package configuration */
  _addPackage() {
    const e = [...this.packages];
    e.push({ weight: 0, lengthCm: null, widthCm: null, heightCm: null }), this._emitChange(e);
  }
  /** Remove a package by index */
  _removePackage(e) {
    const i = [...this.packages];
    i.splice(e, 1), this._emitChange(i);
  }
  /** Update a specific field on a package */
  _updatePackage(e, i, t) {
    const r = [...this.packages];
    r[e] = { ...r[e], [i]: t }, this._emitChange(r);
  }
  _parseOptionalNumber(e) {
    if (e === "") return null;
    const i = Number(e);
    return Number.isFinite(i) ? i : null;
  }
  /** Dispatch packages-change event with updated packages */
  _emitChange(e) {
    this.dispatchEvent(
      new CustomEvent("packages-change", {
        detail: { packages: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  // ============================================
  // Render Methods
  // ============================================
  render() {
    return o`
      ${this.showInheritedBanner && !this.editable ? o`
            <div class="inherited-notice">
              <uui-icon name="icon-link"></uui-icon>
              <span>These packages are inherited from the product. Enable override above to customize.</span>
            </div>
          ` : u}

      ${this.packages.length > 0 ? o`
            <div class="packages-list">
              ${this.packages.map((e, i) => this._renderPackageCard(e, i))}
            </div>
          ` : o`
            <div class="empty-state">
              <uui-icon name="icon-box"></uui-icon>
              <p>No packages configured</p>
              <p class="hint">Add a package to enable shipping rate calculations with carriers like FedEx, UPS, and DHL</p>
            </div>
          `}

      ${this.editable ? o`
            <uui-button
              label="Add package"
              look="placeholder"
              class="add-package-button"
              ?disabled=${this.disableAdd}
              @click=${this._addPackage}>
              <uui-icon name="icon-add"></uui-icon>
              Add Package
            </uui-button>
          ` : u}
    `;
  }
  /** Renders a single package card (editable or read-only) */
  _renderPackageCard(e, i) {
    const t = e.lengthCm != null && e.widthCm != null && e.heightCm != null ? `${e.lengthCm} x ${e.widthCm} x ${e.heightCm} cm` : "No dimensions";
    return this.editable ? o`
      <div class="package-card">
        <div class="package-header">
          <span class="package-number">Package ${i + 1}</span>
          <uui-button
            compact
            look="secondary"
            color="danger"
            label="Remove package"
            @click=${() => this._removePackage(i)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
        <div class="package-fields">
          <div class="field-group">
            <label>Weight (kg) *</label>
            <uui-input
              label="Weight in kilograms"
              type="number"
              step="0.01"
              min="0"
              .value=${String(e.weight ?? "")}
              @input=${(r) => {
      const a = Number(r.target.value), s = Number.isFinite(a) && a >= 0 ? a : 0;
      this._updatePackage(i, "weight", s);
    }}
              placeholder="0.50">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Length (cm)</label>
            <uui-input
              label="Length in centimeters"
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.lengthCm ?? "")}
              @input=${(r) => this._updatePackage(i, "lengthCm", this._parseOptionalNumber(r.target.value))}
              placeholder="20">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Width (cm)</label>
            <uui-input
              label="Width in centimeters"
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.widthCm ?? "")}
              @input=${(r) => this._updatePackage(i, "widthCm", this._parseOptionalNumber(r.target.value))}
              placeholder="15">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Height (cm)</label>
            <uui-input
              label="Height in centimeters"
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.heightCm ?? "")}
              @input=${(r) => this._updatePackage(i, "heightCm", this._parseOptionalNumber(r.target.value))}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    ` : o`
        <div class="package-card readonly">
          <div class="package-header">
            <span class="package-number">Package ${i + 1}</span>
            <span class="badge badge-muted">Inherited</span>
          </div>
          <div class="package-details">
            <div class="package-stat">
              <span class="label">Weight</span>
              <span class="value">${e.weight} kg</span>
            </div>
            <div class="package-stat">
              <span class="label">Dimensions</span>
              <span class="value">${t}</span>
            </div>
          </div>
        </div>
      `;
  }
};
c.styles = b`
    :host {
      display: block;
    }

    /* Inherited notice banner */
    .inherited-notice {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .inherited-notice uui-icon {
      color: var(--uui-color-selected);
    }

    /* Package list */
    .packages-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    /* Package card */
    .package-card {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .package-card.readonly {
      opacity: 0.8;
    }

    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .package-number {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    /* Read-only package details */
    .package-details {
      display: flex;
      gap: var(--uui-size-space-6);
    }

    .package-stat {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .package-stat .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .package-stat .value {
      font-weight: 500;
    }

    /* Editable package fields */
    .package-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .field-group label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
    }

    .field-group uui-input {
      width: 100%;
    }

    /* Empty state */
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

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    /* Add button */
    .add-package-button {
      width: 100%;
    }

    /* Badge styles */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--uui-size-space-2);
      height: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: var(--uui-border-radius);
    }

    .badge-muted {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-text-alt);
    }
  `;
x([
  l({ type: Array })
], c.prototype, "packages", 2);
x([
  l({ type: Boolean })
], c.prototype, "editable", 2);
x([
  l({ type: Boolean })
], c.prototype, "showInheritedBanner", 2);
x([
  l({ type: Boolean })
], c.prototype, "disableAdd", 2);
c = x([
  v("merchello-product-packages")
], c);
var V = Object.defineProperty, B = Object.getOwnPropertyDescriptor, F = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? B(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && V(i, t, a), a;
};
let g = class extends f(m) {
  constructor() {
    super(...arguments), this.filterGroups = [], this.assignedFilterIds = [], this.isNewProduct = !1;
  }
  // ============================================
  // Event Handlers
  // ============================================
  /** Handle filter checkbox toggle */
  _handleFilterToggle(e, i) {
    let t;
    i ? t = [...this.assignedFilterIds, e] : t = this.assignedFilterIds.filter((r) => r !== e), this.dispatchEvent(
      new CustomEvent("filters-change", {
        detail: { filterIds: t },
        bubbles: !0,
        composed: !0
      })
    );
  }
  // ============================================
  // Render Methods
  // ============================================
  render() {
    if (this.isNewProduct)
      return o`
        <uui-box class="info-banner warning">
          <div class="info-content">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Save Required</strong>
              <p>You must save the product before assigning filters.</p>
            </div>
          </div>
        </uui-box>
      `;
    if (this.filterGroups.length === 0)
      return o`
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>No Filter Groups</strong>
              <p>
                No filter groups have been created yet. Go to
                <a href=${C()}>Filters</a>
                to create filter groups and filter values.
              </p>
            </div>
          </div>
        </uui-box>
      `;
    const e = this.assignedFilterIds.length;
    return o`
      <uui-box class="info-banner">
        <div class="info-content">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <strong>Assign Filters</strong>
            <p>
              Select the filters that apply to this product. Filters help customers find products on your storefront.
              ${e > 0 ? `${e} filter${e > 1 ? "s" : ""} assigned.` : ""}
            </p>
          </div>
        </div>
      </uui-box>

      ${this.filterGroups.map((i) => this._renderFilterGroupSection(i))}
    `;
  }
  /** Renders a filter group section with checkboxes for each filter */
  _renderFilterGroupSection(e) {
    return !e.filters || e.filters.length === 0 ? u : o`
      <uui-box headline=${e.name}>
        <div class="filter-checkbox-list">
          ${e.filters.map((i) => {
      const t = this.assignedFilterIds.includes(i.id);
      return o`
              <div class="filter-checkbox-item">
                <uui-checkbox
                  label=${i.name}
                  ?checked=${t}
                  @change=${(r) => this._handleFilterToggle(i.id, r.target.checked)}>
                  ${i.hexColour ? o`<span class="filter-color-swatch" style="background: ${i.hexColour}"></span>` : u}
                  ${i.name}
                </uui-checkbox>
              </div>
            `;
    })}
        </div>
      </uui-box>
    `;
  }
};
g.styles = b`
    :host {
      display: contents;
    }

    /* Info banners */
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

    .info-content a {
      color: var(--uui-color-interactive);
      text-decoration: none;
    }

    .info-content a:hover {
      text-decoration: underline;
    }

    /* Box spacing */
    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-box + uui-box {
      margin-top: var(--uui-size-space-5);
    }

    /* Filter checkbox list */
    .filter-checkbox-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .filter-checkbox-item {
      display: flex;
      align-items: center;
    }

    .filter-checkbox-item uui-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    /* Color swatch for color filters */
    .filter-color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      margin-right: var(--uui-size-space-1);
      vertical-align: middle;
    }
  `;
F([
  l({ type: Array })
], g.prototype, "filterGroups", 2);
F([
  l({ type: Array })
], g.prototype, "assignedFilterIds", 2);
F([
  l({ type: Boolean })
], g.prototype, "isNewProduct", 2);
g = F([
  v("merchello-product-filters")
], g);
var T = Object.defineProperty, I = Object.getOwnPropertyDescriptor, y = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? I(i, t) : i, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && T(i, t, a), a;
};
let p = class extends f(m) {
  constructor() {
    super(...arguments), this.shippingOptions = [], this.variantMode = !1, this.inheritedExclusionIds = [], this.isNewProduct = !1, this.disabled = !1;
  }
  // ============================================
  // Event Handlers
  // ============================================
  _handleExclusionToggle(e, i) {
    const t = this.shippingOptions.filter((a) => a.isExcluded).map((a) => a.id), r = i ? [...t, e] : t.filter((a) => a !== e);
    this.dispatchEvent(
      new CustomEvent("shipping-exclusions-change", {
        detail: { excludedShippingOptionIds: r },
        bubbles: !0,
        composed: !0
      })
    );
  }
  // ============================================
  // Render Methods
  // ============================================
  render() {
    if (this.isNewProduct)
      return o`
        <uui-box headline="Shipping Exclusions">
          <div class="empty-state">
            <uui-icon name="icon-info"></uui-icon>
            <p>Save the product before configuring shipping exclusions.</p>
          </div>
        </uui-box>
      `;
    if (this.shippingOptions.length === 0)
      return o`
        <uui-box headline="Shipping Exclusions">
          <div class="empty-state">
            <uui-icon name="icon-truck"></uui-icon>
            <p>No shipping options available.</p>
            <p class="hint">Assign warehouses with shipping options configured on the Details tab.</p>
          </div>
        </uui-box>
      `;
    const e = this.shippingOptions.filter((i) => i.isExcluded).length;
    return o`
      <uui-box headline="Shipping Exclusions">
        <p class="description">
          Check options to <strong>exclude</strong> them from checkout.
          ${e > 0 ? o`<span class="excluded-count">${e} excluded</span>` : o`<span class="all-available">All options available</span>`}
        </p>

        ${this.variantMode && this.inheritedExclusionIds.length > 0 ? this._renderInheritedNote() : u}

        <div class="option-list">
          ${this.shippingOptions.map((i) => this._renderOption(i))}
        </div>
      </uui-box>
    `;
  }
  _renderInheritedNote() {
    return o`
      <div class="inherited-note">
        <uui-icon name="icon-info"></uui-icon>
        <span>Some exclusions are inherited from the product level and cannot be changed here.</span>
      </div>
    `;
  }
  _renderOption(e) {
    const i = this.inheritedExclusionIds.includes(e.id), t = e.isPartiallyExcluded && !this.variantMode;
    return o`
      <div class="option-item ${i ? "inherited" : ""} ${t ? "partial" : ""}">
        <uui-checkbox
          label="${e.name ?? "Unnamed"}"
          ?checked=${e.isExcluded || e.isPartiallyExcluded}
          .indeterminate=${t}
          ?disabled=${this.disabled || i}
          @change=${(r) => this._handleExclusionToggle(e.id, r.target.checked)}>
          <span class="option-label">
            <span class="option-name">${e.name ?? "Unnamed"}</span>
            <span class="option-meta">
              ${e.warehouseName ?? "Unknown warehouse"}${e.providerKey !== "flat-rate" ? ` - ${e.providerKey}` : ""}
              ${t ? o` -
                    <em class="partial-count"
                      >${e.excludedVariantCount}/${e.totalVariantCount} variants excluded</em
                    >` : u}
            </span>
          </span>
        </uui-checkbox>
        <div class="badges">
          ${i ? o`<uui-badge>Inherited</uui-badge>` : u}
          ${t ? o`<uui-badge color="warning">Mixed</uui-badge>` : u}
        </div>
      </div>
    `;
  }
};
p.styles = b`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .description {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
    }

    .excluded-count {
      color: var(--uui-color-danger);
      font-weight: 500;
    }

    .all-available {
      color: var(--uui-color-positive);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-5);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 32px;
    }

    .empty-state p {
      margin: 0;
    }

    .hint {
      font-size: 0.875rem;
    }

    .option-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
    }

    .option-item.inherited {
      background: var(--uui-color-surface-alt);
      opacity: 0.7;
    }

    .option-item.partial {
      border-color: var(--uui-color-warning);
      background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
    }

    .partial-count {
      color: var(--uui-color-warning-emphasis);
    }

    .option-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .option-name {
      font-weight: 500;
    }

    .option-meta {
      font-size: 0.8rem;
      color: var(--uui-color-text-alt);
    }

    .inherited-note {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
    }

    .inherited-note uui-icon {
      flex-shrink: 0;
    }

    .badges {
      display: flex;
      gap: var(--uui-size-space-2);
    }
  `;
y([
  l({ type: Array })
], p.prototype, "shippingOptions", 2);
y([
  l({ type: Boolean })
], p.prototype, "variantMode", 2);
y([
  l({ type: Array })
], p.prototype, "inheritedExclusionIds", 2);
y([
  l({ type: Boolean })
], p.prototype, "isNewProduct", 2);
y([
  l({ type: Boolean })
], p.prototype, "disabled", 2);
p = y([
  v("merchello-product-shipping-exclusions")
], p);
//# sourceMappingURL=product-shipping-exclusions.element-BkM1C_st.js.map
