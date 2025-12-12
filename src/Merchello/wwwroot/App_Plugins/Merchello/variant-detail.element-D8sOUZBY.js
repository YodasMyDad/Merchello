import { LitElement as P, html as r, nothing as c, css as D, state as l, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as x } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as w } from "./merchello-api-CU-ozmmd.js";
import { b as z } from "./badge.styles-C_lNgH9O.js";
import { a as _ } from "./navigation-D1KCp5wk.js";
import "./variant-stock-display.element-D7hBvtXE.js";
var F = Object.defineProperty, T = Object.getOwnPropertyDescriptor, k = (a) => {
  throw TypeError(a);
}, n = (a, e, t, o) => {
  for (var i = o > 1 ? void 0 : o ? T(e, t) : e, m = a.length - 1, d; m >= 0; m--)
    (d = a[m]) && (i = (o ? d(e, t, i) : d(i)) || i);
  return o && i && F(e, t, i), i;
}, y = (a, e, t) => e.has(a) || k("Cannot " + t), u = (a, e, t) => (y(a, e, "read from private field"), e.get(a)), b = (a, e, t) => e.has(a) ? k("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(a) : e.set(a, t), v = (a, e, t, o) => (y(a, e, "write to private field"), e.set(a, t), t), p, h, f, g;
let s = class extends C(P) {
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, b(this, p), b(this, h), b(this, f), b(this, g, !1), this.consumeContext(x, (a) => {
      v(this, p, a), u(this, p) && (this.observe(u(this, p).product, (e) => {
        this._product = e ?? null, this._updateVariantFromProduct();
      }), this.observe(u(this, p).variantId, (e) => {
        v(this, f, e), this._updateVariantFromProduct();
      }));
    }), this.consumeContext(S, (a) => {
      v(this, h, a);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, g, !0), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, g, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !u(this, f)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const a = this._product.variants.find((e) => e.id === u(this, f));
    a && (this._variant = a, this._formData = { ...a }, this._isLoading = !1);
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   */
  _createRoutes() {
    const a = () => document.createElement("div");
    this._routes = [
      { path: "tab/basic", component: a },
      { path: "tab/packages", component: a },
      { path: "tab/seo", component: a },
      { path: "tab/feed", component: a },
      { path: "tab/stock", component: a },
      { path: "", redirectTo: "tab/basic" }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/packages") ? "packages" : this._activePath.includes("tab/seo") ? "seo" : this._activePath.includes("tab/feed") ? "feed" : this._activePath.includes("tab/stock") ? "stock" : "basic";
  }
  async _handleSave() {
    if (!(!this._product || !this._variant)) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        const a = {
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
          removeFromFeed: this._formData.removeFromFeed,
          warehouseStock: this._formData.warehouseStock?.map((t) => ({
            warehouseId: t.warehouseId,
            stock: t.stock,
            reorderPoint: t.reorderPoint,
            trackStock: t.trackStock
          }))
        }, { error: e } = await w.updateVariant(this._product.id, this._variant.id, a);
        if (!u(this, g)) return;
        if (e) {
          this._errorMessage = e.message, u(this, h)?.peek("danger", { data: { headline: "Failed to save variant", message: e.message } });
          return;
        }
        u(this, h)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), u(this, p)?.reload();
      } catch (a) {
        if (!u(this, g)) return;
        this._errorMessage = a instanceof Error ? a.message : "An unexpected error occurred", u(this, h)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", a);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const a = this._getActiveTab();
    return r`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${a === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Shipping" href="${this._routerPath}/tab/packages" ?active=${a === "packages"}>
          Shipping
        </uui-tab>
        <uui-tab label="SEO" href="${this._routerPath}/tab/seo" ?active=${a === "seo"}>
          SEO
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${a === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${a === "stock"}>
          Stock
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderBasicTab() {
    return r`
      <div class="tab-content">
        <merchello-variant-basic-info
          .formData=${this._formData}
          .showVariantName=${!0}
          @variant-change=${(a) => this._formData = a.detail}>
        </merchello-variant-basic-info>
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
      const a = this._product?.defaultPackageConfigurations ?? [];
      this._formData = {
        ...this._formData,
        packageConfigurations: a.length > 0 ? a.map((e) => ({ ...e })) : [{ weight: 0, lengthCm: null, widthCm: null, heightCm: null }]
      };
    }
  }
  /**
   * Add a new package
   */
  _addPackage() {
    const a = [...this._formData.packageConfigurations ?? []];
    a.push({ weight: 0, lengthCm: null, widthCm: null, heightCm: null }), this._formData = { ...this._formData, packageConfigurations: a };
  }
  /**
   * Remove a package by index
   */
  _removePackage(a) {
    const e = [...this._formData.packageConfigurations ?? []];
    e.splice(a, 1), this._formData = { ...this._formData, packageConfigurations: e };
  }
  /**
   * Update a package field
   */
  _updatePackage(a, e, t) {
    const o = [...this._formData.packageConfigurations ?? []];
    o[a] = { ...o[a], [e]: t }, this._formData = { ...this._formData, packageConfigurations: o };
  }
  _renderPackagesTab() {
    const a = this._isOverridingPackages(), e = this._getEffectivePackages(), t = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;
    return r`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Shipping</strong>
              <p>Define package configurations for shipping rate calculations. Products can ship in multiple packages.</p>
            </div>
          </div>
        </uui-box>

        ${t ? r`
              <uui-box headline="Package Settings">
                <umb-property-layout
                  label="Override Product Packages"
                  description="By default, this variant inherits packages from the product. Enable to define variant-specific packages.">
                  <uui-toggle
                    slot="editor"
                    .checked=${a}
                    @change=${() => this._togglePackageOverride()}>
                  </uui-toggle>
                </umb-property-layout>
              </uui-box>
            ` : c}

        <uui-box headline=${a ? "Variant Packages" : t ? "Inherited from Product" : "Packages"}>
          ${!a && t ? r`
                <div class="inherited-notice">
                  <uui-icon name="icon-link"></uui-icon>
                  <span>These packages are inherited from the product. Enable override above to customize.</span>
                </div>
              ` : c}

          ${e.length > 0 ? r`
                <div class="packages-list">
                  ${e.map((o, i) => this._renderPackageCard(o, i, a))}
                </div>
              ` : r`
                <div class="empty-state">
                  <uui-icon name="icon-box"></uui-icon>
                  <p>No packages configured</p>
                  <p class="hint">Add a package to enable shipping rate calculations</p>
                </div>
              `}

          ${a || !t ? r`
                <uui-button
                  look="placeholder"
                  class="add-package-button"
                  @click=${() => this._addPackage()}>
                  <uui-icon name="icon-add"></uui-icon>
                  Add Package
                </uui-button>
              ` : c}
        </uui-box>
      </div>
    `;
  }
  _renderPackageCard(a, e, t) {
    const o = a.lengthCm && a.widthCm && a.heightCm ? `${a.lengthCm} × ${a.widthCm} × ${a.heightCm} cm` : "No dimensions";
    return t ? r`
      <div class="package-card">
        <div class="package-header">
          <span class="package-number">Package ${e + 1}</span>
          <uui-button
            compact
            look="secondary"
            color="danger"
            label="Remove package"
            @click=${() => this._removePackage(e)}>
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
              .value=${String(a.weight ?? "")}
              @input=${(i) => this._updatePackage(e, "weight", parseFloat(i.target.value) || 0)}
              placeholder="0.50">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(a.lengthCm ?? "")}
              @input=${(i) => this._updatePackage(e, "lengthCm", parseFloat(i.target.value) || null)}
              placeholder="20">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(a.widthCm ?? "")}
              @input=${(i) => this._updatePackage(e, "widthCm", parseFloat(i.target.value) || null)}
              placeholder="15">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(a.heightCm ?? "")}
              @input=${(i) => this._updatePackage(e, "heightCm", parseFloat(i.target.value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    ` : r`
        <div class="package-card readonly">
          <div class="package-header">
            <span class="package-number">Package ${e + 1}</span>
            <span class="badge badge-muted">Inherited</span>
          </div>
          <div class="package-details">
            <div class="package-stat">
              <span class="label">Weight</span>
              <span class="value">${a.weight} kg</span>
            </div>
            <div class="package-stat">
              <span class="label">Dimensions</span>
              <span class="value">${o}</span>
            </div>
          </div>
        </div>
      `;
  }
  _renderFeedTab() {
    return r`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._formData}
          @variant-change=${(a) => this._formData = a.detail}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }
  _renderStockTab() {
    return r`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._formData.warehouseStock ?? []}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _renderSeoTab() {
    return r`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="URL Slug"
            description="Custom URL path for this variant">
            <uui-input
              slot="editor"
              .value=${this._formData.url || ""}
              @input=${(a) => this._formData = { ...this._formData, url: a.target.value }}
              placeholder="/products/my-product/blue-large">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _handleStockSettingsChange(a) {
    const { warehouseId: e, stock: t, reorderPoint: o, trackStock: i } = a.detail, m = (this._formData.warehouseStock ?? []).map((d) => d.warehouseId !== e ? d : {
      ...d,
      ...t !== void 0 && { stock: t },
      ...o !== void 0 && { reorderPoint: o },
      ...i !== void 0 && { trackStock: i }
    });
    this._formData = { ...this._formData, warehouseStock: m };
  }
  _renderFooter() {
    return r`
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
  _onRouterInit(a) {
    this._routerPath = a.target.absoluteRouterPath;
  }
  /**
   * Handles router slot path changes
   */
  _onRouterChange(a) {
    this._activePath = a.target.localActiveViewPath || "";
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
    const a = this._getActiveTab(), e = this._product?.id ? _(this._product.id) : "";
    return r`
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
            @input=${(t) => this._formData = { ...this._formData, name: t.target.value }}
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

          ${this._errorMessage ? r`
                <uui-box class="error-box">
                  <div class="error-message">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._errorMessage}</span>
                  </div>
                </uui-box>
              ` : c}

          ${a === "basic" ? this._renderBasicTab() : c}
          ${a === "packages" ? this._renderPackagesTab() : c}
          ${a === "seo" ? this._renderSeoTab() : c}
          ${a === "feed" ? this._renderFeedTab() : c}
          ${a === "stock" ? this._renderStockTab() : c}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
s.styles = [
  z,
  D`
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
n([
  l()
], s.prototype, "_product", 2);
n([
  l()
], s.prototype, "_variant", 2);
n([
  l()
], s.prototype, "_isLoading", 2);
n([
  l()
], s.prototype, "_isSaving", 2);
n([
  l()
], s.prototype, "_errorMessage", 2);
n([
  l()
], s.prototype, "_routes", 2);
n([
  l()
], s.prototype, "_routerPath", 2);
n([
  l()
], s.prototype, "_activePath", 2);
n([
  l()
], s.prototype, "_formData", 2);
s = n([
  $("merchello-variant-detail")
], s);
const L = s;
export {
  s as MerchelloVariantDetailElement,
  L as default
};
//# sourceMappingURL=variant-detail.element-D8sOUZBY.js.map
