import { LitElement as F, html as s, nothing as d, css as D, state as u, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as S } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as C } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as x } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-CkNG-K-m.js";
import { b as I } from "./badge.styles-C_lNgH9O.js";
import { a as k } from "./navigation-D1KCp5wk.js";
import "./product-filters.element-DOeStqNi.js";
var w = Object.defineProperty, T = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, n = (t, e, a, o) => {
  for (var c = o > 1 ? void 0 : o ? T(e, a) : e, f = t.length - 1, h; f >= 0; f--)
    (h = t[f]) && (c = (o ? h(e, a, c) : h(c)) || c);
  return o && c && w(e, a, c), c;
}, P = (t, e, a) => e.has(t) || y("Cannot " + a), r = (t, e, a) => (P(t, e, "read from private field"), e.get(t)), v = (t, e, a) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), m = (t, e, a, o) => (P(t, e, "write to private field"), e.set(t, a), a), p, g, _, l;
let i = class extends S(F) {
  // ============================================
  // Constructor & Lifecycle
  // ============================================
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], v(this, p), v(this, g), v(this, _), v(this, l, !1), this.consumeContext(C, (t) => {
      m(this, p, t), r(this, p) && (this.observe(r(this, p).product, (e) => {
        this._product = e ?? null, this._updateVariantFromProduct();
      }), this.observe(r(this, p).variantId, (e) => {
        m(this, _, e), this._updateVariantFromProduct();
      }));
    }), this.consumeContext(x, (t) => {
      m(this, g, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, l, !0), this._createRoutes(), this._loadFilterGroups();
  }
  /**
   * Loads all filter groups for the filter assignment UI
   */
  async _loadFilterGroups() {
    const { data: t } = await b.getFilterGroups();
    r(this, l) && t && (this._filterGroups = t);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, l, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !r(this, _)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const t = this._product.variants.find((e) => e.id === r(this, _));
    t && (this._variant = t, this._formData = { ...t }, this._isLoading = !1, this._loadAssignedFilters());
  }
  /**
   * Loads filters assigned to the current variant
   */
  async _loadAssignedFilters() {
    const t = this._variant?.id;
    if (!t) return;
    const { data: e } = await b.getFiltersForProduct(t);
    if (r(this, l) && e) {
      const a = e.map((o) => o.id);
      this._assignedFilterIds = a, this._originalAssignedFilterIds = [...a];
    }
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   */
  _createRoutes() {
    const t = () => document.createElement("div");
    this._routes = [
      { path: "tab/basic", component: t },
      { path: "tab/packages", component: t },
      { path: "tab/seo", component: t },
      { path: "tab/feed", component: t },
      { path: "tab/stock", component: t },
      { path: "tab/filters", component: t },
      { path: "", redirectTo: "tab/basic" }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/packages") ? "packages" : this._activePath.includes("tab/seo") ? "seo" : this._activePath.includes("tab/feed") ? "feed" : this._activePath.includes("tab/stock") ? "stock" : this._activePath.includes("tab/filters") ? "filters" : "basic";
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
          hsCode: this._formData.hsCode ?? void 0,
          packageConfigurations: this._formData.packageConfigurations,
          shoppingFeedTitle: this._formData.shoppingFeedTitle ?? void 0,
          shoppingFeedDescription: this._formData.shoppingFeedDescription ?? void 0,
          shoppingFeedColour: this._formData.shoppingFeedColour ?? void 0,
          shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? void 0,
          shoppingFeedSize: this._formData.shoppingFeedSize ?? void 0,
          removeFromFeed: this._formData.removeFromFeed,
          warehouseStock: this._formData.warehouseStock?.map((a) => ({
            warehouseId: a.warehouseId,
            stock: a.stock,
            reorderPoint: a.reorderPoint,
            trackStock: a.trackStock
          }))
        }, { error: e } = await b.updateVariant(this._product.id, this._variant.id, t);
        if (!r(this, l)) return;
        if (e) {
          this._errorMessage = e.message, r(this, g)?.peek("danger", { data: { headline: "Failed to save variant", message: e.message } });
          return;
        }
        await this._saveFilterAssignments(), r(this, g)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), r(this, p)?.reload();
      } catch (t) {
        if (!r(this, l)) return;
        this._errorMessage = t instanceof Error ? t.message : "An unexpected error occurred", r(this, g)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", t);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const t = this._getActiveTab();
    return s`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${t === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Shipping" href="${this._routerPath}/tab/packages" ?active=${t === "packages"}>
          Shipping
        </uui-tab>
        <uui-tab label="SEO" href="${this._routerPath}/tab/seo" ?active=${t === "seo"}>
          SEO
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${t === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${t === "stock"}>
          Stock
        </uui-tab>
        <uui-tab label="Filters" href="${this._routerPath}/tab/filters" ?active=${t === "filters"}>
          Filters
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderBasicTab() {
    return s`
      <div class="tab-content">
        <merchello-variant-basic-info
          .formData=${this._formData}
          .showVariantName=${!0}
          @variant-change=${(t) => this._formData = t.detail}>
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
      const t = this._product?.defaultPackageConfigurations ?? [];
      this._formData = {
        ...this._formData,
        packageConfigurations: t.length > 0 ? t.map((e) => ({ ...e })) : [{ weight: 0, lengthCm: null, widthCm: null, heightCm: null }]
      };
    }
  }
  // ============================================
  // Tab Render Methods
  // ============================================
  _renderPackagesTab() {
    const t = this._isOverridingPackages(), e = this._getEffectivePackages(), a = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;
    return s`
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

        ${a ? s`
              <uui-box headline="Package Settings">
                <umb-property-layout
                  label="Override Product Packages"
                  description="By default, this variant inherits packages from the product. Enable to define variant-specific packages.">
                  <uui-toggle
                    slot="editor"
                    .checked=${t}
                    @change=${() => this._togglePackageOverride()}>
                  </uui-toggle>
                </umb-property-layout>
              </uui-box>
            ` : d}

        <uui-box headline=${t ? "Variant Packages" : a ? "Inherited from Product" : "Packages"}>
          <merchello-product-packages
            .packages=${e}
            .editable=${t || !a}
            .showInheritedBanner=${!t && a}
            @packages-change=${this._handlePackagesChange}>
          </merchello-product-packages>
        </uui-box>
      </div>
    `;
  }
  /** Handles packages change from the shared component */
  _handlePackagesChange(t) {
    this._formData = { ...this._formData, packageConfigurations: t.detail.packages };
  }
  _renderFeedTab() {
    return s`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._formData}
          @variant-change=${(t) => this._formData = t.detail}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }
  _renderStockTab() {
    return s`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._formData.warehouseStock ?? []}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _renderSeoTab() {
    return s`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="URL Slug"
            description="Custom URL path for this variant">
            <uui-input
              slot="editor"
              .value=${this._formData.url || ""}
              @input=${(t) => this._formData = { ...this._formData, url: t.target.value }}
              placeholder="/products/my-product/blue-large">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _handleStockSettingsChange(t) {
    const { warehouseId: e, stock: a, reorderPoint: o, trackStock: c } = t.detail, f = (this._formData.warehouseStock ?? []).map((h) => h.warehouseId !== e ? h : {
      ...h,
      ...a !== void 0 && { stock: a },
      ...o !== void 0 && { reorderPoint: o },
      ...c !== void 0 && { trackStock: c }
    });
    this._formData = { ...this._formData, warehouseStock: f };
  }
  /**
   * Renders the Filters tab for assigning filters to the variant.
   * Uses the shared product-filters component.
   */
  _renderFiltersTab() {
    return s`
      <div class="tab-content">
        <merchello-product-filters
          .filterGroups=${this._filterGroups}
          .assignedFilterIds=${this._assignedFilterIds}
          @filters-change=${this._handleFiltersChange}>
        </merchello-product-filters>
      </div>
    `;
  }
  /** Handles filter selection changes from the shared component */
  _handleFiltersChange(t) {
    this._assignedFilterIds = t.detail.filterIds;
  }
  /**
   * Checks if filter assignments have changed
   */
  _hasFilterChanges() {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return !0;
    const t = [...this._assignedFilterIds].sort(), e = [...this._originalAssignedFilterIds].sort();
    return t.some((a, o) => a !== e[o]);
  }
  /**
   * Saves filter assignments for the variant
   */
  async _saveFilterAssignments() {
    const t = this._variant?.id;
    if (!t || !this._hasFilterChanges()) return;
    const { error: e } = await b.assignFiltersToProduct(t, this._assignedFilterIds);
    if (e) {
      r(this, g)?.peek("danger", {
        data: { headline: "Failed to save filters", message: e.message }
      });
      return;
    }
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }
  _renderFooter() {
    return s`
      <umb-footer-layout slot="footer">
        <!-- Breadcrumb in default slot -->
        <uui-breadcrumbs>
          <uui-breadcrumb-item href=${k(this._product?.id || "")}>
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
      return s`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const t = this._getActiveTab(), e = this._product?.id ? k(this._product.id) : "";
    return s`
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

          ${this._errorMessage ? s`
                <uui-box class="error-box">
                  <div class="error-message">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._errorMessage}</span>
                  </div>
                </uui-box>
              ` : d}

          ${t === "basic" ? this._renderBasicTab() : d}
          ${t === "packages" ? this._renderPackagesTab() : d}
          ${t === "seo" ? this._renderSeoTab() : d}
          ${t === "feed" ? this._renderFeedTab() : d}
          ${t === "stock" ? this._renderStockTab() : d}
          ${t === "filters" ? this._renderFiltersTab() : d}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
i.styles = [
  I,
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
    `
];
n([
  u()
], i.prototype, "_product", 2);
n([
  u()
], i.prototype, "_variant", 2);
n([
  u()
], i.prototype, "_isLoading", 2);
n([
  u()
], i.prototype, "_isSaving", 2);
n([
  u()
], i.prototype, "_errorMessage", 2);
n([
  u()
], i.prototype, "_routes", 2);
n([
  u()
], i.prototype, "_routerPath", 2);
n([
  u()
], i.prototype, "_activePath", 2);
n([
  u()
], i.prototype, "_formData", 2);
n([
  u()
], i.prototype, "_filterGroups", 2);
n([
  u()
], i.prototype, "_assignedFilterIds", 2);
i = n([
  $("merchello-variant-detail")
], i);
const G = i;
export {
  i as MerchelloVariantDetailElement,
  G as default
};
//# sourceMappingURL=variant-detail.element-DBKu8r9O.js.map
