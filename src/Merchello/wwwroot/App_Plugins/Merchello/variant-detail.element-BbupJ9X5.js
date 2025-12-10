import { LitElement as k, html as i, nothing as p, css as $, state as s, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as F } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as P } from "@umbraco-cms/backoffice/notification";
import { M as C } from "./merchello-api-gshzVGsw.js";
import { b as w } from "./badge.styles-C_lNgH9O.js";
import { a as _ } from "./navigation-DnzDaPpA.js";
var T = Object.defineProperty, z = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, u = (t, e, a, n) => {
  for (var l = n > 1 ? void 0 : n ? z(e, a) : e, f = t.length - 1, v; f >= 0; f--)
    (v = t[f]) && (l = (n ? v(e, a, l) : v(l)) || l);
  return n && l && T(e, a, l), l;
}, D = (t, e, a) => e.has(t) || y("Cannot " + a), r = (t, e, a) => (D(t, e, "read from private field"), e.get(t)), g = (t, e, a) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), m = (t, e, a, n) => (D(t, e, "write to private field"), e.set(t, a), a), c, d, b, h;
let o = class extends x(k) {
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, g(this, c), g(this, d), g(this, b), g(this, h, !1), this.consumeContext(F, (t) => {
      m(this, c, t), r(this, c) && (this.observe(r(this, c).product, (e) => {
        this._product = e ?? null, this._updateVariantFromProduct();
      }), this.observe(r(this, c).variantId, (e) => {
        m(this, b, e), this._updateVariantFromProduct();
      }));
    }), this.consumeContext(P, (t) => {
      m(this, d, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, h, !0), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, h, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !r(this, b)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const t = this._product.variants.find((e) => e.id === r(this, b));
    t && (this._variant = t, this._formData = { ...t }, this._isLoading = !1);
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   */
  _createRoutes() {
    const t = () => document.createElement("div");
    this._routes = [
      { path: "tab/basic", component: t },
      { path: "tab/dimensions", component: t },
      { path: "tab/feed", component: t },
      { path: "tab/stock", component: t },
      { path: "", redirectTo: "tab/basic" }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/dimensions") ? "dimensions" : this._activePath.includes("tab/feed") ? "feed" : this._activePath.includes("tab/stock") ? "stock" : "basic";
  }
  async _handleSave() {
    if (!(!this._product || !this._variant)) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        const t = {
          name: this._formData.name ?? void 0,
          sku: this._formData.sku ?? void 0,
          gtin: this._formData.gtin ?? void 0,
          supplierSku: this._formData.supplierSku ?? void 0,
          price: this._formData.price,
          costOfGoods: this._formData.costOfGoods,
          onSale: this._formData.onSale,
          previousPrice: this._formData.previousPrice ?? void 0,
          availableForPurchase: this._formData.availableForPurchase,
          canPurchase: this._formData.canPurchase,
          images: this._formData.images,
          excludeRootProductImages: this._formData.excludeRootProductImages,
          url: this._formData.url ?? void 0,
          weight: this._formData.weight ?? void 0,
          lengthCm: this._formData.lengthCm ?? void 0,
          widthCm: this._formData.widthCm ?? void 0,
          heightCm: this._formData.heightCm ?? void 0,
          shoppingFeedTitle: this._formData.shoppingFeedTitle ?? void 0,
          shoppingFeedDescription: this._formData.shoppingFeedDescription ?? void 0,
          shoppingFeedColour: this._formData.shoppingFeedColour ?? void 0,
          shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? void 0,
          shoppingFeedSize: this._formData.shoppingFeedSize ?? void 0,
          removeFromFeed: this._formData.removeFromFeed
        }, { error: e } = await C.updateVariant(this._product.id, this._variant.id, t);
        if (!r(this, h)) return;
        if (e) {
          this._errorMessage = e.message, r(this, d)?.peek("danger", { data: { headline: "Failed to save variant", message: e.message } });
          return;
        }
        r(this, d)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), r(this, c)?.reload();
      } catch (t) {
        if (!r(this, h)) return;
        this._errorMessage = t instanceof Error ? t.message : "An unexpected error occurred", r(this, d)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", t);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const t = this._getActiveTab();
    return i`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${t === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Dimensions" href="${this._routerPath}/tab/dimensions" ?active=${t === "dimensions"}>
          Dimensions
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${t === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${t === "stock"}>
          Stock
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderBasicTab() {
    return i`
      <div class="tab-content">
        ${this._errorMessage ? i`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : p}

        <uui-box headline="Identification">
          <umb-property-layout label="Variant Name" description="If empty, generated from option values">
            <uui-input
              slot="editor"
              .value=${this._formData.name || ""}
              @input=${(t) => this._formData = { ...this._formData, name: t.target.value }}
              placeholder="e.g., Blue T-Shirt - Large">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${this._formData.sku || ""}
              @input=${(t) => this._formData = { ...this._formData, sku: t.target.value }}
              placeholder="PROD-001">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
            <uui-input
              slot="editor"
              .value=${this._formData.gtin || ""}
              @input=${(t) => this._formData = { ...this._formData, gtin: t.target.value }}
              placeholder="012345678905">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
            <uui-input
              slot="editor"
              .value=${this._formData.supplierSku || ""}
              @input=${(t) => this._formData = { ...this._formData, supplierSku: t.target.value }}
              placeholder="SUP-001">
            </uui-input>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Pricing">
          <umb-property-layout label="Price" description="Customer-facing price (excluding tax)" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.price ?? 0)}
              @input=${(t) => this._formData = { ...this._formData, price: parseFloat(t.target.value) || 0 }}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Cost of Goods" description="Your cost for profit margin calculation">
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(t) => this._formData = { ...this._formData, costOfGoods: parseFloat(t.target.value) || 0 }}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="On Sale" description="Enable sale pricing">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.onSale ?? !1}
              @change=${(t) => this._formData = { ...this._formData, onSale: t.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          ${this._formData.onSale ? i`
                <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                  <uui-input
                    slot="editor"
                    type="number"
                    step="0.01"
                    .value=${String(this._formData.previousPrice ?? 0)}
                    @input=${(t) => this._formData = { ...this._formData, previousPrice: parseFloat(t.target.value) || 0 }}>
                  </uui-input>
                </umb-property-layout>
              ` : p}
        </uui-box>

        <uui-box headline="Availability">
          <umb-property-layout label="Available for Purchase" description="Show on website, allow add to cart">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.availableForPurchase ?? !0}
              @change=${(t) => this._formData = { ...this._formData, availableForPurchase: t.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout label="Can Purchase" description="Allow checkout (stock/inventory check)">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.canPurchase ?? !0}
              @change=${(t) => this._formData = { ...this._formData, canPurchase: t.target.checked }}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _renderDimensionsTab() {
    return i`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Shipping Dimensions</strong>
              <p>These dimensions are used for shipping rate calculations with carriers like FedEx, UPS, and DHL.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Package Dimensions">
          <umb-property-layout label="Weight (kg)" description="Package weight in kilograms">
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.weight ?? "")}
              @input=${(t) => this._formData = { ...this._formData, weight: parseFloat(t.target.value) || void 0 }}
              placeholder="0.50">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Length (cm)" description="Longest side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.lengthCm ?? "")}
              @input=${(t) => this._formData = { ...this._formData, lengthCm: parseFloat(t.target.value) || void 0 }}
              placeholder="20">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Width (cm)" description="Middle side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.widthCm ?? "")}
              @input=${(t) => this._formData = { ...this._formData, widthCm: parseFloat(t.target.value) || void 0 }}
              placeholder="15">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Height (cm)" description="Shortest side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.heightCm ?? "")}
              @input=${(t) => this._formData = { ...this._formData, heightCm: parseFloat(t.target.value) || void 0 }}
              placeholder="10">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _renderFeedTab() {
    return i`
      <div class="tab-content">
        <uui-box headline="Shopping Feed Settings">
          <umb-property-layout label="Remove from Feed" description="Exclude this variant from shopping feeds">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.removeFromFeed ?? !1}
              @change=${(t) => this._formData = { ...this._formData, removeFromFeed: t.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          ${this._formData.removeFromFeed ? p : i`
                <umb-property-layout label="Feed Title" description="Title for shopping feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedTitle || ""}
                    @input=${(t) => this._formData = { ...this._formData, shoppingFeedTitle: t.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Feed Description" description="Description for shopping feed">
                  <uui-textarea
                    slot="editor"
                    .value=${this._formData.shoppingFeedDescription || ""}
                    @input=${(t) => this._formData = { ...this._formData, shoppingFeedDescription: t.target.value }}>
                  </uui-textarea>
                </umb-property-layout>

                <umb-property-layout label="Colour" description="Product colour for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedColour || ""}
                    @input=${(t) => this._formData = { ...this._formData, shoppingFeedColour: t.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Material" description="Product material for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedMaterial || ""}
                    @input=${(t) => this._formData = { ...this._formData, shoppingFeedMaterial: t.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Size" description="Product size for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedSize || ""}
                    @input=${(t) => this._formData = { ...this._formData, shoppingFeedSize: t.target.value }}>
                  </uui-input>
                </umb-property-layout>
              `}
        </uui-box>
      </div>
    `;
  }
  _renderStockTab() {
    const t = this._formData.warehouseStock ?? [], e = t.reduce((a, n) => a + n.stock, 0);
    return i`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Stock Management</strong>
              <p>Stock levels are managed per warehouse. To adjust stock, create a shipment from the Orders section or use the Inventory management tools.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Warehouse Stock">
          ${t.length > 0 ? i`
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
                    ${t.map(
      (a) => i`
                        <uui-table-row>
                          <uui-table-cell><strong>${a.warehouseName}</strong></uui-table-cell>
                          <uui-table-cell>
                            <span class="badge ${a.stock === 0 ? "badge-danger" : a.stock < 10 ? "badge-warning" : "badge-positive"}">
                              ${a.stock} units
                            </span>
                          </uui-table-cell>
                          <uui-table-cell>
                            <span class="stock-value">${a.reorderPoint ?? "Not set"}</span>
                          </uui-table-cell>
                          <uui-table-cell>
                            <uui-badge color=${a.trackStock ? "positive" : "default"}>
                              ${a.trackStock ? "Enabled" : "Disabled"}
                            </uui-badge>
                          </uui-table-cell>
                        </uui-table-row>
                      `
    )}
                  </uui-table>
                </div>
              ` : i`
                <div class="empty-state">
                  <uui-icon name="icon-box"></uui-icon>
                  <p>No warehouses assigned to this product</p>
                  <p class="hint">Assign warehouses in the product details tab</p>
                </div>
              `}
        </uui-box>
      </div>
    `;
  }
  _renderFooter() {
    return i`
      <umb-footer-layout slot="footer">
        <!-- Breadcrumb in default slot -->
        <uui-breadcrumbs>
          <uui-breadcrumb-item href=${_(this._product?.id || "")}>
            ${this._product?.rootName || "Product"}
          </uui-breadcrumb-item>
          <uui-breadcrumb-item>
            ${this._variant?.name || this._formData.name || "Variant"}
          </uui-breadcrumb-item>
        </uui-breadcrumbs>

        <!-- Save button in actions slot -->
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          @click=${this._handleSave}
          ?disabled=${this._isSaving}
          label=${this._isSaving ? "Saving..." : "Save Changes"}>
          ${this._isSaving ? "Saving..." : "Save Changes"}
        </uui-button>
      </umb-footer-layout>
    `;
  }
  /**
   * Handles router slot initialization
   */
  _onRouterInit(t) {
    this._routerPath = t.target.absoluteRouterPath;
  }
  /**
   * Handles router slot path changes
   */
  _onRouterChange(t) {
    this._activePath = t.target.localActiveViewPath || "";
  }
  render() {
    if (this._isLoading)
      return i`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const t = this._getActiveTab(), e = this._product?.id ? _(this._product.id) : "";
    return i`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${e} label="Back to Product" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-layers"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.name || ""}
            @input=${(a) => this._formData = { ...this._formData, name: a.target.value }}
            placeholder="Variant name"
            aria-label="Variant name">
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

          ${t === "basic" ? this._renderBasicTab() : p}
          ${t === "dimensions" ? this._renderDimensionsTab() : p}
          ${t === "feed" ? this._renderFeedTab() : p}
          ${t === "stock" ? this._renderStockTab() : p}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
o.styles = [
  w,
  $`
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

      umb-property-layout uui-input,
      umb-property-layout uui-textarea {
        width: 100%;
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
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

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
        color: var(--uui-color-selected);
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

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .stock-summary {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-3);
      }

      .stock-value {
        font-weight: 500;
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

      /* Breadcrumbs */
      uui-breadcrumbs {
        font-size: 0.875rem;
      }
    `
];
u([
  s()
], o.prototype, "_product", 2);
u([
  s()
], o.prototype, "_variant", 2);
u([
  s()
], o.prototype, "_isLoading", 2);
u([
  s()
], o.prototype, "_isSaving", 2);
u([
  s()
], o.prototype, "_errorMessage", 2);
u([
  s()
], o.prototype, "_routes", 2);
u([
  s()
], o.prototype, "_routerPath", 2);
u([
  s()
], o.prototype, "_activePath", 2);
u([
  s()
], o.prototype, "_formData", 2);
o = u([
  S("merchello-variant-detail")
], o);
const B = o;
export {
  o as MerchelloVariantDetailElement,
  B as default
};
//# sourceMappingURL=variant-detail.element-BbupJ9X5.js.map
