import { LitElement as D, html as i, nothing as n, css as $, state as c, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as C } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as F } from "./merchello-api-gshzVGsw.js";
import { b as w } from "./badge.styles-C_lNgH9O.js";
import { a as _ } from "./navigation-DnzDaPpA.js";
var z = Object.defineProperty, T = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, l = (e, t, a, r) => {
  for (var o = r > 1 ? void 0 : r ? T(t, a) : t, f = e.length - 1, v; f >= 0; f--)
    (v = e[f]) && (o = (r ? v(t, a, o) : v(o)) || o);
  return r && o && z(t, a, o), o;
}, k = (e, t, a) => t.has(e) || y("Cannot " + a), s = (e, t, a) => (k(e, t, "read from private field"), t.get(e)), b = (e, t, a) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), g = (e, t, a, r) => (k(e, t, "write to private field"), t.set(e, a), a), p, d, m, h;
let u = class extends x(D) {
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, b(this, p), b(this, d), b(this, m), b(this, h, !1), this.consumeContext(C, (e) => {
      g(this, p, e), s(this, p) && (this.observe(s(this, p).product, (t) => {
        this._product = t ?? null, this._updateVariantFromProduct();
      }), this.observe(s(this, p).variantId, (t) => {
        g(this, m, t), this._updateVariantFromProduct();
      }));
    }), this.consumeContext(S, (e) => {
      g(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, h, !0), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, h, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !s(this, m)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const e = this._product.variants.find((t) => t.id === s(this, m));
    e && (this._variant = e, this._formData = { ...e }, this._isLoading = !1);
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   */
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/basic", component: e },
      { path: "tab/packages", component: e },
      { path: "tab/feed", component: e },
      { path: "tab/stock", component: e },
      { path: "", redirectTo: "tab/basic" }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/packages") ? "packages" : this._activePath.includes("tab/feed") ? "feed" : this._activePath.includes("tab/stock") ? "stock" : "basic";
  }
  async _handleSave() {
    if (!(!this._product || !this._variant)) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        const e = {
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
          hsCode: this._formData.hsCode ?? void 0,
          packageConfigurations: this._formData.packageConfigurations,
          shoppingFeedTitle: this._formData.shoppingFeedTitle ?? void 0,
          shoppingFeedDescription: this._formData.shoppingFeedDescription ?? void 0,
          shoppingFeedColour: this._formData.shoppingFeedColour ?? void 0,
          shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? void 0,
          shoppingFeedSize: this._formData.shoppingFeedSize ?? void 0,
          removeFromFeed: this._formData.removeFromFeed
        }, { error: t } = await F.updateVariant(this._product.id, this._variant.id, e);
        if (!s(this, h)) return;
        if (t) {
          this._errorMessage = t.message, s(this, d)?.peek("danger", { data: { headline: "Failed to save variant", message: t.message } });
          return;
        }
        s(this, d)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), s(this, p)?.reload();
      } catch (e) {
        if (!s(this, h)) return;
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred", s(this, d)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", e);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const e = this._getActiveTab();
    return i`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${e === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Shipping Packages" href="${this._routerPath}/tab/packages" ?active=${e === "packages"}>
          Shipping Packages
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${e === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${e === "stock"}>
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
            ` : n}

        <uui-box headline="Identification">
          <umb-property-layout label="Variant Name" description="If empty, generated from option values">
            <uui-input
              slot="editor"
              .value=${this._formData.name || ""}
              @input=${(e) => this._formData = { ...this._formData, name: e.target.value }}
              placeholder="e.g., Blue T-Shirt - Large">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${!0}>
            <uui-input
              slot="editor"
              .value=${this._formData.sku || ""}
              @input=${(e) => this._formData = { ...this._formData, sku: e.target.value }}
              placeholder="PROD-001">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
            <uui-input
              slot="editor"
              .value=${this._formData.gtin || ""}
              @input=${(e) => this._formData = { ...this._formData, gtin: e.target.value }}
              placeholder="012345678905">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
            <uui-input
              slot="editor"
              .value=${this._formData.supplierSku || ""}
              @input=${(e) => this._formData = { ...this._formData, supplierSku: e.target.value }}
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
              @input=${(e) => this._formData = { ...this._formData, price: parseFloat(e.target.value) || 0 }}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Cost of Goods" description="Your cost for profit margin calculation">
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(e) => this._formData = { ...this._formData, costOfGoods: parseFloat(e.target.value) || 0 }}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="On Sale" description="Enable sale pricing">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.onSale ?? !1}
              @change=${(e) => this._formData = { ...this._formData, onSale: e.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          ${this._formData.onSale ? i`
                <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                  <uui-input
                    slot="editor"
                    type="number"
                    step="0.01"
                    .value=${String(this._formData.previousPrice ?? 0)}
                    @input=${(e) => this._formData = { ...this._formData, previousPrice: parseFloat(e.target.value) || 0 }}>
                  </uui-input>
                </umb-property-layout>
              ` : n}
        </uui-box>

        <uui-box headline="Availability">
          <umb-property-layout label="Visible on Website" description="Show this variant on your storefront and allow customers to add it to their cart">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.availableForPurchase ?? !0}
              @change=${(e) => this._formData = { ...this._formData, availableForPurchase: e.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout label="Allow Purchase" description="Enable checkout for this variant (used for stock/inventory validation)">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.canPurchase ?? !0}
              @change=${(e) => this._formData = { ...this._formData, canPurchase: e.target.checked }}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="URL & Customs">
          <umb-property-layout label="URL Slug" description="Custom URL path for this variant (optional)">
            <uui-input
              slot="editor"
              .value=${this._formData.url || ""}
              @input=${(e) => this._formData = { ...this._formData, url: e.target.value }}
              placeholder="/products/my-product/blue-large">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="HS Code" description="Harmonized System code for customs/tariff classification">
            <uui-input
              slot="editor"
              .value=${this._formData.hsCode || ""}
              @input=${(e) => this._formData = { ...this._formData, hsCode: e.target.value }}
              placeholder="6109.10"
              maxlength="10">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  /**
   * Check if variant is overriding root packages
   */
  _isOverridingPackages() {
    return (this._formData.packageConfigurations?.length ?? 0) > 0;
  }
  /**
   * Get effective packages - variant's own or inherited from root
   */
  _getEffectivePackages() {
    return this._isOverridingPackages() ? this._formData.packageConfigurations ?? [] : this._product?.defaultPackageConfigurations ?? [];
  }
  /**
   * Toggle package override mode
   */
  _togglePackageOverride() {
    if (this._isOverridingPackages())
      this._formData = { ...this._formData, packageConfigurations: [] };
    else {
      const e = this._product?.defaultPackageConfigurations ?? [];
      this._formData = {
        ...this._formData,
        packageConfigurations: e.length > 0 ? e.map((t) => ({ ...t })) : [{ weight: 0, lengthCm: null, widthCm: null, heightCm: null }]
      };
    }
  }
  /**
   * Add a new package
   */
  _addPackage() {
    const e = [...this._formData.packageConfigurations ?? []];
    e.push({ weight: 0, lengthCm: null, widthCm: null, heightCm: null }), this._formData = { ...this._formData, packageConfigurations: e };
  }
  /**
   * Remove a package by index
   */
  _removePackage(e) {
    const t = [...this._formData.packageConfigurations ?? []];
    t.splice(e, 1), this._formData = { ...this._formData, packageConfigurations: t };
  }
  /**
   * Update a package field
   */
  _updatePackage(e, t, a) {
    const r = [...this._formData.packageConfigurations ?? []];
    r[e] = { ...r[e], [t]: a }, this._formData = { ...this._formData, packageConfigurations: r };
  }
  _renderPackagesTab() {
    const e = this._isOverridingPackages(), t = this._getEffectivePackages(), a = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;
    return i`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Shipping Packages</strong>
              <p>Define package configurations for shipping rate calculations. Products can ship in multiple packages.</p>
            </div>
          </div>
        </uui-box>

        ${a ? i`
              <uui-box headline="Package Settings">
                <umb-property-layout
                  label="Override Product Packages"
                  description="By default, this variant inherits packages from the product. Enable to define variant-specific packages.">
                  <uui-toggle
                    slot="editor"
                    .checked=${e}
                    @change=${() => this._togglePackageOverride()}>
                  </uui-toggle>
                </umb-property-layout>
              </uui-box>
            ` : n}

        <uui-box headline=${e ? "Variant Packages" : a ? "Inherited from Product" : "Packages"}>
          ${!e && a ? i`
                <div class="inherited-notice">
                  <uui-icon name="icon-link"></uui-icon>
                  <span>These packages are inherited from the product. Enable override above to customize.</span>
                </div>
              ` : n}

          ${t.length > 0 ? i`
                <div class="packages-list">
                  ${t.map((r, o) => this._renderPackageCard(r, o, e))}
                </div>
              ` : i`
                <div class="empty-state">
                  <uui-icon name="icon-box"></uui-icon>
                  <p>No packages configured</p>
                  <p class="hint">Add a package to enable shipping rate calculations</p>
                </div>
              `}

          ${e || !a ? i`
                <uui-button
                  look="placeholder"
                  class="add-package-button"
                  @click=${() => this._addPackage()}>
                  <uui-icon name="icon-add"></uui-icon>
                  Add Package
                </uui-button>
              ` : n}
        </uui-box>
      </div>
    `;
  }
  _renderPackageCard(e, t, a) {
    const r = e.lengthCm && e.widthCm && e.heightCm ? `${e.lengthCm} × ${e.widthCm} × ${e.heightCm} cm` : "No dimensions";
    return a ? i`
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
              @input=${(o) => this._updatePackage(t, "weight", parseFloat(o.target.value) || 0)}
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
              @input=${(o) => this._updatePackage(t, "lengthCm", parseFloat(o.target.value) || null)}
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
              @input=${(o) => this._updatePackage(t, "widthCm", parseFloat(o.target.value) || null)}
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
              @input=${(o) => this._updatePackage(t, "heightCm", parseFloat(o.target.value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    ` : i`
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
              <span class="value">${r}</span>
            </div>
          </div>
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
              @change=${(e) => this._formData = { ...this._formData, removeFromFeed: e.target.checked }}>
            </uui-toggle>
          </umb-property-layout>

          ${this._formData.removeFromFeed ? n : i`
                <umb-property-layout label="Feed Title" description="Title for shopping feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedTitle || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedTitle: e.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Feed Description" description="Description for shopping feed">
                  <uui-textarea
                    slot="editor"
                    .value=${this._formData.shoppingFeedDescription || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedDescription: e.target.value }}>
                  </uui-textarea>
                </umb-property-layout>

                <umb-property-layout label="Colour" description="Product colour for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedColour || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedColour: e.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Material" description="Product material for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedMaterial || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedMaterial: e.target.value }}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Size" description="Product size for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedSize || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedSize: e.target.value }}>
                  </uui-input>
                </umb-property-layout>
              `}
        </uui-box>
      </div>
    `;
  }
  _renderStockTab() {
    const e = this._formData.warehouseStock ?? [], t = e.reduce((a, r) => a + r.stock, 0);
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
          ${e.length > 0 ? i`
                <div class="stock-summary">
                  <strong>Total Stock:</strong> ${t} units
                </div>
                <div class="table-container">
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>Warehouse</uui-table-head-cell>
                      <uui-table-head-cell>Available</uui-table-head-cell>
                      <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                      <uui-table-head-cell>Track Stock</uui-table-head-cell>
                    </uui-table-head>
                    ${e.map(
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
      return i`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const e = this._getActiveTab(), t = this._product?.id ? _(this._product.id) : "";
    return i`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${t} label="Back to Product" class="back-button">
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

          ${e === "basic" ? this._renderBasicTab() : n}
          ${e === "packages" ? this._renderPackagesTab() : n}
          ${e === "feed" ? this._renderFeedTab() : n}
          ${e === "stock" ? this._renderStockTab() : n}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
u.styles = [
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

      /* Package cards */
      .packages-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-4);
      }

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

      .add-package-button {
        width: 100%;
      }

      .badge-muted {
        background: var(--uui-color-surface-emphasis);
        color: var(--uui-color-text-alt);
      }
    `
];
l([
  c()
], u.prototype, "_product", 2);
l([
  c()
], u.prototype, "_variant", 2);
l([
  c()
], u.prototype, "_isLoading", 2);
l([
  c()
], u.prototype, "_isSaving", 2);
l([
  c()
], u.prototype, "_errorMessage", 2);
l([
  c()
], u.prototype, "_routes", 2);
l([
  c()
], u.prototype, "_routerPath", 2);
l([
  c()
], u.prototype, "_activePath", 2);
l([
  c()
], u.prototype, "_formData", 2);
u = l([
  P("merchello-variant-detail")
], u);
const N = u;
export {
  u as MerchelloVariantDetailElement,
  N as default
};
//# sourceMappingURL=variant-detail.element-B2ougEUS.js.map
