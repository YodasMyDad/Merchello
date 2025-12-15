import { LitElement as h, nothing as n, html as o, css as g, property as l, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as b } from "@umbraco-cms/backoffice/element-api";
var F = Object.defineProperty, w = Object.getOwnPropertyDescriptor, k = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? w(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (r = (a ? s(t, i, r) : s(r)) || r);
  return a && r && F(t, i, r), r;
};
let p = class extends b(h) {
  constructor() {
    super(...arguments), this.formData = {}, this.fieldErrors = {}, this.showVariantName = !1;
  }
  _updateField(e, t) {
    const i = { ...this.formData, [e]: t };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: i, bubbles: !0, composed: !0 }));
  }
  render() {
    return o`
      <uui-box headline="Identification">
        ${this.showVariantName ? o`
              <umb-property-layout label="Variant Name" description="If empty, generated from option values">
                <uui-input
                  slot="editor"
                  .value=${this.formData.name || ""}
                  @input=${(e) => this._updateField("name", e.target.value)}
                  placeholder="e.g., Blue T-Shirt - Large">
                </uui-input>
              </umb-property-layout>
            ` : n}

        <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${!0}>
          <uui-input
            slot="editor"
            .value=${this.formData.sku || ""}
            @input=${(e) => this._updateField("sku", e.target.value)}
            placeholder="PROD-001"
            ?invalid=${!!this.fieldErrors.sku}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
          <uui-input
            slot="editor"
            .value=${this.formData.gtin || ""}
            @input=${(e) => this._updateField("gtin", e.target.value)}
            placeholder="012345678905">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
          <uui-input
            slot="editor"
            .value=${this.formData.supplierSku || ""}
            @input=${(e) => this._updateField("supplierSku", e.target.value)}
            placeholder="SUP-001">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="HS Code" description="Harmonized System code for customs/tariff classification">
          <uui-input
            slot="editor"
            .value=${this.formData.hsCode || ""}
            @input=${(e) => this._updateField("hsCode", e.target.value)}
            placeholder="6109.10"
            maxlength="10">
          </uui-input>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Pricing">
        <umb-property-layout label="Price" description="Customer-facing price (excluding tax)" ?mandatory=${!0}>
          <uui-input
            slot="editor"
            type="number"
            step="0.01"
            .value=${String(this.formData.price ?? 0)}
            @input=${(e) => this._updateField("price", parseFloat(e.target.value) || 0)}
            ?invalid=${!!this.fieldErrors.price}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="Cost of Goods" description="Your cost for profit margin calculation">
          <uui-input
            slot="editor"
            type="number"
            step="0.01"
            .value=${String(this.formData.costOfGoods ?? 0)}
            @input=${(e) => this._updateField("costOfGoods", parseFloat(e.target.value) || 0)}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="On Sale" description="Enable sale pricing">
          <uui-toggle
            slot="editor"
            .checked=${this.formData.onSale ?? !1}
            @change=${(e) => this._updateField("onSale", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.onSale ? o`
              <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                <uui-input
                  slot="editor"
                  type="number"
                  step="0.01"
                  .value=${String(this.formData.previousPrice ?? 0)}
                  @input=${(e) => this._updateField("previousPrice", parseFloat(e.target.value) || 0)}>
                </uui-input>
              </umb-property-layout>
            ` : n}
      </uui-box>

      <uui-box headline="Availability">
        <umb-property-layout label="Visible on Website" description="Show on storefront and allow adding to cart">
          <uui-toggle
            slot="editor"
            .checked=${this.formData.availableForPurchase ?? !0}
            @change=${(e) => this._updateField("availableForPurchase", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Allow Purchase" description="Enable checkout (used for stock/inventory validation)">
          <uui-toggle
            slot="editor"
            .checked=${this.formData.canPurchase ?? !0}
            @change=${(e) => this._updateField("canPurchase", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>
    `;
  }
};
p.styles = g`
    :host {
      display: contents;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-box + uui-box {
      margin-top: var(--uui-size-space-5);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-textarea {
      width: 100%;
    }
  `;
k([
  l({ type: Object })
], p.prototype, "formData", 2);
k([
  l({ type: Object })
], p.prototype, "fieldErrors", 2);
k([
  l({ type: Boolean })
], p.prototype, "showVariantName", 2);
p = k([
  m("merchello-variant-basic-info")
], p);
var P = Object.defineProperty, C = Object.getOwnPropertyDescriptor, $ = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? C(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (r = (a ? s(t, i, r) : s(r)) || r);
  return a && r && P(t, i, r), r;
};
let f = class extends b(h) {
  constructor() {
    super(...arguments), this.formData = {};
  }
  _updateField(e, t) {
    const i = { ...this.formData, [e]: t };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: i, bubbles: !0, composed: !0 }));
  }
  render() {
    return o`
      <uui-box headline="Shopping Feed Settings">
        <umb-property-layout label="Remove from Feed" description="Exclude this product from shopping feeds">
          <uui-toggle
            slot="editor"
            .checked=${this.formData.removeFromFeed ?? !1}
            @change=${(e) => this._updateField("removeFromFeed", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.removeFromFeed ? n : o`
              <umb-property-layout label="Feed Title" description="Title for shopping feed">
                <uui-input
                  slot="editor"
                  .value=${this.formData.shoppingFeedTitle || ""}
                  @input=${(e) => this._updateField("shoppingFeedTitle", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Feed Description" description="Description for shopping feed">
                <uui-textarea
                  slot="editor"
                  .value=${this.formData.shoppingFeedDescription || ""}
                  @input=${(e) => this._updateField("shoppingFeedDescription", e.target.value)}>
                </uui-textarea>
              </umb-property-layout>

              <umb-property-layout label="Colour" description="Product colour for feed">
                <uui-input
                  slot="editor"
                  .value=${this.formData.shoppingFeedColour || ""}
                  @input=${(e) => this._updateField("shoppingFeedColour", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Material" description="Product material for feed">
                <uui-input
                  slot="editor"
                  .value=${this.formData.shoppingFeedMaterial || ""}
                  @input=${(e) => this._updateField("shoppingFeedMaterial", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Size" description="Product size for feed">
                <uui-input
                  slot="editor"
                  .value=${this.formData.shoppingFeedSize || ""}
                  @input=${(e) => this._updateField("shoppingFeedSize", e.target.value)}>
                </uui-input>
              </umb-property-layout>
            `}
      </uui-box>
    `;
  }
};
f.styles = g`
    :host {
      display: contents;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-textarea {
      width: 100%;
    }
  `;
$([
  l({ type: Object })
], f.prototype, "formData", 2);
f = $([
  m("merchello-variant-feed-settings")
], f);
var S = Object.defineProperty, z = Object.getOwnPropertyDescriptor, _ = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? z(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (r = (a ? s(t, i, r) : s(r)) || r);
  return a && r && S(t, i, r), r;
};
let y = class extends b(h) {
  constructor() {
    super(...arguments), this.warehouseStock = [];
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
  _handleStockChange(e, t) {
    const i = parseInt(t, 10);
    !isNaN(i) && i >= 0 && this._emitChange({ warehouseId: e, stock: i });
  }
  _handleReorderPointChange(e, t) {
    const i = t === "" ? null : parseInt(t, 10);
    (i === null || !isNaN(i) && i >= 0) && this._emitChange({ warehouseId: e, reorderPoint: i });
  }
  _handleTrackStockChange(e, t) {
    this._emitChange({ warehouseId: e, trackStock: t });
  }
  render() {
    const e = this.warehouseStock.reduce((t, i) => t + i.stock, 0);
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
                <strong>Total Stock:</strong> ${e} units
              </div>
              <div class="table-container">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Warehouse</uui-table-head-cell>
                    <uui-table-head-cell>Available</uui-table-head-cell>
                    <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                    <uui-table-head-cell>Track Stock</uui-table-head-cell>
                  </uui-table-head>
                  ${this.warehouseStock.map(
      (t) => o`
                      <uui-table-row>
                        <uui-table-cell><strong>${t.warehouseName}</strong></uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            type="number"
                            min="0"
                            class="stock-input"
                            .value=${String(t.stock)}
                            ?disabled=${!t.trackStock}
                            @change=${(i) => this._handleStockChange(t.warehouseId, i.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            type="number"
                            min="0"
                            class="stock-input"
                            placeholder="Not set"
                            .value=${t.reorderPoint != null ? String(t.reorderPoint) : ""}
                            ?disabled=${!t.trackStock}
                            @change=${(i) => this._handleReorderPointChange(t.warehouseId, i.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-toggle
                            .checked=${t.trackStock}
                            @change=${(i) => this._handleTrackStockChange(t.warehouseId, i.target.checked)}>
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
y.styles = [
  g`
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
], y.prototype, "warehouseStock", 2);
y = _([
  m("merchello-variant-stock-display")
], y);
var D = Object.defineProperty, E = Object.getOwnPropertyDescriptor, v = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? E(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (r = (a ? s(t, i, r) : s(r)) || r);
  return a && r && D(t, i, r), r;
};
let c = class extends b(h) {
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
    const t = [...this.packages];
    t.splice(e, 1), this._emitChange(t);
  }
  /** Update a specific field on a package */
  _updatePackage(e, t, i) {
    const a = [...this.packages];
    a[e] = { ...a[e], [t]: i }, this._emitChange(a);
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
          ` : n}

      ${this.packages.length > 0 ? o`
            <div class="packages-list">
              ${this.packages.map((e, t) => this._renderPackageCard(e, t))}
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
              look="placeholder"
              class="add-package-button"
              ?disabled=${this.disableAdd}
              @click=${this._addPackage}>
              <uui-icon name="icon-add"></uui-icon>
              Add Package
            </uui-button>
          ` : n}
    `;
  }
  /** Renders a single package card (editable or read-only) */
  _renderPackageCard(e, t) {
    const i = e.lengthCm && e.widthCm && e.heightCm ? `${e.lengthCm} × ${e.widthCm} × ${e.heightCm} cm` : "No dimensions";
    return this.editable ? o`
      <div class="package-card">
        <div class="package-header">
          <span class="package-number">Package ${t + 1}</span>
          <uui-button
            compact
            look="secondary"
            color="danger"
            label="Remove package"
            @click=${() => this._removePackage(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
        <div class="package-fields">
          <div class="field-group">
            <label>Weight (kg) *</label>
            <uui-input
              type="number"
              step="0.01"
              min="0"
              .value=${String(e.weight ?? "")}
              @input=${(a) => this._updatePackage(t, "weight", parseFloat(a.target.value) || 0)}
              placeholder="0.50">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.lengthCm ?? "")}
              @input=${(a) => this._updatePackage(t, "lengthCm", parseFloat(a.target.value) || null)}
              placeholder="20">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.widthCm ?? "")}
              @input=${(a) => this._updatePackage(t, "widthCm", parseFloat(a.target.value) || null)}
              placeholder="15">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.heightCm ?? "")}
              @input=${(a) => this._updatePackage(t, "heightCm", parseFloat(a.target.value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    ` : o`
        <div class="package-card readonly">
          <div class="package-header">
            <span class="package-number">Package ${t + 1}</span>
            <span class="badge badge-muted">Inherited</span>
          </div>
          <div class="package-details">
            <div class="package-stat">
              <span class="label">Weight</span>
              <span class="value">${e.weight} kg</span>
            </div>
            <div class="package-stat">
              <span class="label">Dimensions</span>
              <span class="value">${i}</span>
            </div>
          </div>
        </div>
      `;
  }
};
c.styles = g`
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
v([
  l({ type: Array })
], c.prototype, "packages", 2);
v([
  l({ type: Boolean })
], c.prototype, "editable", 2);
v([
  l({ type: Boolean })
], c.prototype, "showInheritedBanner", 2);
v([
  l({ type: Boolean })
], c.prototype, "disableAdd", 2);
c = v([
  m("merchello-product-packages")
], c);
var O = Object.defineProperty, I = Object.getOwnPropertyDescriptor, x = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? I(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (r = (a ? s(t, i, r) : s(r)) || r);
  return a && r && O(t, i, r), r;
};
let d = class extends b(h) {
  constructor() {
    super(...arguments), this.filterGroups = [], this.assignedFilterIds = [], this.isNewProduct = !1;
  }
  // ============================================
  // Event Handlers
  // ============================================
  /** Handle filter checkbox toggle */
  _handleFilterToggle(e, t) {
    let i;
    t ? i = [...this.assignedFilterIds, e] : i = this.assignedFilterIds.filter((a) => a !== e), this.dispatchEvent(
      new CustomEvent("filters-change", {
        detail: { filterIds: i },
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
                <a href="/section/merchello/workspace/merchello-filters">Filters</a>
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

      ${this.filterGroups.map((t) => this._renderFilterGroupSection(t))}
    `;
  }
  /** Renders a filter group section with checkboxes for each filter */
  _renderFilterGroupSection(e) {
    return !e.filters || e.filters.length === 0 ? n : o`
      <uui-box headline=${e.name}>
        <div class="filter-checkbox-list">
          ${e.filters.map((t) => {
      const i = this.assignedFilterIds.includes(t.id);
      return o`
              <div class="filter-checkbox-item">
                <uui-checkbox
                  label=${t.name}
                  ?checked=${i}
                  @change=${(a) => this._handleFilterToggle(t.id, a.target.checked)}>
                  ${t.hexColour ? o`<span class="filter-color-swatch" style="background: ${t.hexColour}"></span>` : n}
                  ${t.name}
                </uui-checkbox>
              </div>
            `;
    })}
        </div>
      </uui-box>
    `;
  }
};
d.styles = g`
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
x([
  l({ type: Array })
], d.prototype, "filterGroups", 2);
x([
  l({ type: Array })
], d.prototype, "assignedFilterIds", 2);
x([
  l({ type: Boolean })
], d.prototype, "isNewProduct", 2);
d = x([
  m("merchello-product-filters")
], d);
//# sourceMappingURL=product-filters.element-DOeStqNi.js.map
