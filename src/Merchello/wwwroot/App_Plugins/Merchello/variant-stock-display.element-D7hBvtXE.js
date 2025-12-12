import { LitElement as b, nothing as h, html as l, css as m, property as p, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
var $ = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, d = (e, t, i, a) => {
  for (var u = a > 1 ? void 0 : a ? _(t, i) : t, o = e.length - 1, r; o >= 0; o--)
    (r = e[o]) && (u = (a ? r(t, i, u) : r(u)) || u);
  return a && u && $(t, i, u), u;
};
let s = class extends y(b) {
  constructor() {
    super(...arguments), this.formData = {}, this.fieldErrors = {}, this.showVariantName = !1;
  }
  _updateField(e, t) {
    const i = { ...this.formData, [e]: t };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: i, bubbles: !0, composed: !0 }));
  }
  render() {
    return l`
      <uui-box headline="Identification">
        ${this.showVariantName ? l`
              <umb-property-layout label="Variant Name" description="If empty, generated from option values">
                <uui-input
                  slot="editor"
                  .value=${this.formData.name || ""}
                  @input=${(e) => this._updateField("name", e.target.value)}
                  placeholder="e.g., Blue T-Shirt - Large">
                </uui-input>
              </umb-property-layout>
            ` : h}

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

        ${this.formData.onSale ? l`
              <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                <uui-input
                  slot="editor"
                  type="number"
                  step="0.01"
                  .value=${String(this.formData.previousPrice ?? 0)}
                  @input=${(e) => this._updateField("previousPrice", parseFloat(e.target.value) || 0)}>
                </uui-input>
              </umb-property-layout>
            ` : h}
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
s.styles = m`
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
d([
  p({ type: Object })
], s.prototype, "formData", 2);
d([
  p({ type: Object })
], s.prototype, "fieldErrors", 2);
d([
  p({ type: Boolean })
], s.prototype, "showVariantName", 2);
s = d([
  g("merchello-variant-basic-info")
], s);
var x = Object.defineProperty, S = Object.getOwnPropertyDescriptor, v = (e, t, i, a) => {
  for (var u = a > 1 ? void 0 : a ? S(t, i) : t, o = e.length - 1, r; o >= 0; o--)
    (r = e[o]) && (u = (a ? r(t, i, u) : r(u)) || u);
  return a && u && x(t, i, u), u;
};
let n = class extends y(b) {
  constructor() {
    super(...arguments), this.formData = {};
  }
  _updateField(e, t) {
    const i = { ...this.formData, [e]: t };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: i, bubbles: !0, composed: !0 }));
  }
  render() {
    return l`
      <uui-box headline="Shopping Feed Settings">
        <umb-property-layout label="Remove from Feed" description="Exclude this product from shopping feeds">
          <uui-toggle
            slot="editor"
            .checked=${this.formData.removeFromFeed ?? !1}
            @change=${(e) => this._updateField("removeFromFeed", e.target.checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.removeFromFeed ? h : l`
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
n.styles = m`
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
v([
  p({ type: Object })
], n.prototype, "formData", 2);
n = v([
  g("merchello-variant-feed-settings")
], n);
var F = Object.defineProperty, k = Object.getOwnPropertyDescriptor, f = (e, t, i, a) => {
  for (var u = a > 1 ? void 0 : a ? k(t, i) : t, o = e.length - 1, r; o >= 0; o--)
    (r = e[o]) && (u = (a ? r(t, i, u) : r(u)) || u);
  return a && u && F(t, i, u), u;
};
let c = class extends y(b) {
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
    return l`
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
        ${this.warehouseStock.length > 0 ? l`
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
      (t) => l`
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
            ` : l`
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
c.styles = [
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
f([
  p({ type: Array })
], c.prototype, "warehouseStock", 2);
c = f([
  g("merchello-variant-stock-display")
], c);
//# sourceMappingURL=variant-stock-display.element-D7hBvtXE.js.map
