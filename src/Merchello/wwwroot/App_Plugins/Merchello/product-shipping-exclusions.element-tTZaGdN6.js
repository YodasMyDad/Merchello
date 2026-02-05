import { LitElement as b, nothing as n, html as o, css as m, property as l, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
var F = Object.defineProperty, S = Object.getOwnPropertyDescriptor, $ = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? S(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && F(t, i, a), a;
};
let d = class extends f(b) {
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
                  label="Variant name"
                  maxlength="500"
                  .value=${this.formData.name || ""}
                  @input=${(e) => this._updateField("name", e.target.value)}
                  placeholder="e.g., Blue T-Shirt - Large">
                </uui-input>
              </umb-property-layout>
            ` : n}

        <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${!0}>
          <uui-input
            slot="editor"
            label="SKU"
            maxlength="150"
            .value=${this.formData.sku || ""}
            @input=${(e) => this._updateField("sku", e.target.value)}
            placeholder="PROD-001"
            ?invalid=${!!this.fieldErrors.sku}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
          <uui-input
            slot="editor"
            label="GTIN/Barcode"
            maxlength="150"
            .value=${this.formData.gtin || ""}
            @input=${(e) => this._updateField("gtin", e.target.value)}
            placeholder="012345678905">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
          <uui-input
            slot="editor"
            label="Supplier SKU"
            maxlength="150"
            .value=${this.formData.supplierSku || ""}
            @input=${(e) => this._updateField("supplierSku", e.target.value)}
            placeholder="SUP-001">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="HS Code" description="Harmonized System code for customs/tariff classification">
          <uui-input
            slot="editor"
            label="HS Code"
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
            label="Price"
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
            label="Cost of goods"
            type="number"
            step="0.01"
            .value=${String(this.formData.costOfGoods ?? 0)}
            @input=${(e) => this._updateField("costOfGoods", parseFloat(e.target.value) || 0)}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="On Sale" description="Enable sale pricing">
          <uui-toggle
            slot="editor"
            label="On Sale"
            .checked=${this.formData.onSale ?? !1}
            @change=${(e) => this._updateField("onSale", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.onSale ? o`
              <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                <uui-input
                  slot="editor"
                  label="Previous price"
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
            label="Visible on Website"
            .checked=${this.formData.availableForPurchase ?? !0}
            @change=${(e) => this._updateField("availableForPurchase", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Allow Purchase" description="Enable checkout (used for stock/inventory validation)">
          <uui-toggle
            slot="editor"
            label="Allow Purchase"
            .checked=${this.formData.canPurchase ?? !0}
            @change=${(e) => this._updateField("canPurchase", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>
    `;
  }
};
d.styles = m`
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
$([
  l({ type: Object })
], d.prototype, "formData", 2);
$([
  l({ type: Object })
], d.prototype, "fieldErrors", 2);
$([
  l({ type: Boolean })
], d.prototype, "showVariantName", 2);
d = $([
  v("merchello-variant-basic-info")
], d);
var z = Object.defineProperty, C = Object.getOwnPropertyDescriptor, P = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? C(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && z(t, i, a), a;
};
let k = class extends f(b) {
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
            label="Remove from Feed"
            .checked=${this.formData.removeFromFeed ?? !1}
            @change=${(e) => this._updateField("removeFromFeed", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.removeFromFeed ? n : o`
              <umb-property-layout label="Feed Title" description="Title for shopping feed">
                <uui-input
                  slot="editor"
                  label="Feed title"
                  maxlength="200"
                  .value=${this.formData.shoppingFeedTitle || ""}
                  @input=${(e) => this._updateField("shoppingFeedTitle", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Feed Description" description="Description for shopping feed">
                <uui-textarea
                  slot="editor"
                  label="Feed description"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedDescription || ""}
                  @input=${(e) => this._updateField("shoppingFeedDescription", e.target.value)}>
                </uui-textarea>
              </umb-property-layout>

              <umb-property-layout label="Colour" description="Product colour for feed">
                <uui-input
                  slot="editor"
                  label="Colour"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedColour || ""}
                  @input=${(e) => this._updateField("shoppingFeedColour", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Material" description="Product material for feed">
                <uui-input
                  slot="editor"
                  label="Material"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedMaterial || ""}
                  @input=${(e) => this._updateField("shoppingFeedMaterial", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Size" description="Product size for feed">
                <uui-input
                  slot="editor"
                  label="Size"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedSize || ""}
                  @input=${(e) => this._updateField("shoppingFeedSize", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Width" description="Product width for feed (e.g. 10 cm)">
                <uui-input
                  slot="editor"
                  label="Width"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedWidth || ""}
                  @input=${(e) => this._updateField("shoppingFeedWidth", e.target.value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Height" description="Product height for feed (e.g. 15 cm)">
                <uui-input
                  slot="editor"
                  label="Height"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedHeight || ""}
                  @input=${(e) => this._updateField("shoppingFeedHeight", e.target.value)}>
                </uui-input>
              </umb-property-layout>
            `}
      </uui-box>
    `;
  }
};
k.styles = m`
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
P([
  l({ type: Object })
], k.prototype, "formData", 2);
k = P([
  v("merchello-variant-feed-settings")
], k);
var D = Object.defineProperty, E = Object.getOwnPropertyDescriptor, _ = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? E(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && D(t, i, a), a;
};
let h = class extends f(b) {
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
                            type="number"
                            min="0"
                            class="stock-input"
                            .value=${String(e.stock)}
                            ?disabled=${!e.trackStock}
                            @change=${(t) => this._handleStockChange(e.warehouseId, t.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            type="number"
                            min="0"
                            class="stock-input"
                            placeholder="Not set"
                            .value=${e.reorderPoint != null ? String(e.reorderPoint) : ""}
                            ?disabled=${!e.trackStock}
                            @change=${(t) => this._handleReorderPointChange(e.warehouseId, t.target.value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-toggle
                            label="Track stock"
                            .checked=${e.trackStock}
                            @change=${(t) => this._handleTrackStockChange(e.warehouseId, t.target.checked)}>
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
  m`
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
var O = Object.defineProperty, I = Object.getOwnPropertyDescriptor, x = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? I(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && O(t, i, a), a;
};
let p = class extends f(b) {
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
    const r = [...this.packages];
    r[e] = { ...r[e], [t]: i }, this._emitChange(r);
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
              @input=${(r) => this._updatePackage(t, "weight", parseFloat(r.target.value) || 0)}
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
              @input=${(r) => this._updatePackage(t, "lengthCm", parseFloat(r.target.value) || null)}
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
              @input=${(r) => this._updatePackage(t, "widthCm", parseFloat(r.target.value) || null)}
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
              @input=${(r) => this._updatePackage(t, "heightCm", parseFloat(r.target.value) || null)}
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
p.styles = m`
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
], p.prototype, "packages", 2);
x([
  l({ type: Boolean })
], p.prototype, "editable", 2);
x([
  l({ type: Boolean })
], p.prototype, "showInheritedBanner", 2);
x([
  l({ type: Boolean })
], p.prototype, "disableAdd", 2);
p = x([
  v("merchello-product-packages")
], p);
var N = Object.defineProperty, A = Object.getOwnPropertyDescriptor, w = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? A(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && N(t, i, a), a;
};
let g = class extends f(b) {
  constructor() {
    super(...arguments), this.filterGroups = [], this.assignedFilterIds = [], this.isNewProduct = !1;
  }
  // ============================================
  // Event Handlers
  // ============================================
  /** Handle filter checkbox toggle */
  _handleFilterToggle(e, t) {
    let i;
    t ? i = [...this.assignedFilterIds, e] : i = this.assignedFilterIds.filter((r) => r !== e), this.dispatchEvent(
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
                  @change=${(r) => this._handleFilterToggle(t.id, r.target.checked)}>
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
g.styles = m`
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
w([
  l({ type: Array })
], g.prototype, "filterGroups", 2);
w([
  l({ type: Array })
], g.prototype, "assignedFilterIds", 2);
w([
  l({ type: Boolean })
], g.prototype, "isNewProduct", 2);
g = w([
  v("merchello-product-filters")
], g);
var T = Object.defineProperty, M = Object.getOwnPropertyDescriptor, y = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? M(t, i) : t, u = e.length - 1, s; u >= 0; u--)
    (s = e[u]) && (a = (r ? s(t, i, a) : s(a)) || a);
  return r && a && T(t, i, a), a;
};
let c = class extends f(b) {
  constructor() {
    super(...arguments), this.shippingOptions = [], this.variantMode = !1, this.inheritedExclusionIds = [], this.isNewProduct = !1, this.disabled = !1;
  }
  // ============================================
  // Event Handlers
  // ============================================
  _handleExclusionToggle(e, t) {
    const i = this.shippingOptions.filter((a) => a.isExcluded).map((a) => a.id), r = t ? [...i, e] : i.filter((a) => a !== e);
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
    const e = this.shippingOptions.filter((t) => t.isExcluded).length;
    return o`
      <uui-box headline="Shipping Exclusions">
        <p class="description">
          Check options to <strong>exclude</strong> them from checkout.
          ${e > 0 ? o`<span class="excluded-count">${e} excluded</span>` : o`<span class="all-available">All options available</span>`}
        </p>

        ${this.variantMode && this.inheritedExclusionIds.length > 0 ? this._renderInheritedNote() : n}

        <div class="option-list">
          ${this.shippingOptions.map((t) => this._renderOption(t))}
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
    const t = this.inheritedExclusionIds.includes(e.id), i = e.isPartiallyExcluded && !this.variantMode;
    return o`
      <div class="option-item ${t ? "inherited" : ""} ${i ? "partial" : ""}">
        <uui-checkbox
          label="${e.name ?? "Unnamed"}"
          ?checked=${e.isExcluded || e.isPartiallyExcluded}
          .indeterminate=${i}
          ?disabled=${this.disabled || t}
          @change=${(r) => this._handleExclusionToggle(e.id, r.target.checked)}>
          <span class="option-label">
            <span class="option-name">${e.name ?? "Unnamed"}</span>
            <span class="option-meta">
              ${e.warehouseName ?? "Unknown warehouse"}${e.providerKey !== "flat-rate" ? ` · ${e.providerKey}` : ""}
              ${i ? o` ·
                    <em class="partial-count"
                      >${e.excludedVariantCount}/${e.totalVariantCount} variants excluded</em
                    >` : n}
            </span>
          </span>
        </uui-checkbox>
        <div class="badges">
          ${t ? o`<uui-badge>Inherited</uui-badge>` : n}
          ${i ? o`<uui-badge color="warning">Mixed</uui-badge>` : n}
        </div>
      </div>
    `;
  }
};
c.styles = m`
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
], c.prototype, "shippingOptions", 2);
y([
  l({ type: Boolean })
], c.prototype, "variantMode", 2);
y([
  l({ type: Array })
], c.prototype, "inheritedExclusionIds", 2);
y([
  l({ type: Boolean })
], c.prototype, "isNewProduct", 2);
y([
  l({ type: Boolean })
], c.prototype, "disabled", 2);
c = y([
  v("merchello-product-shipping-exclusions")
], c);
//# sourceMappingURL=product-shipping-exclusions.element-tTZaGdN6.js.map
