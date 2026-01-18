import { LitElement as S, html as u, nothing as l, css as P, state as o, customElement as F } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as D } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-BAKL0aIE.js";
import { b as I } from "./badge.styles-DUcdl6GY.js";
import { b as k } from "./navigation-Y0bwD8V1.js";
import "./product-shipping-exclusions.element-C9wmmLsg.js";
var O = Object.defineProperty, w = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, s = (t, e, i, n) => {
  for (var c = n > 1 ? void 0 : n ? w(e, i) : e, _ = t.length - 1, p; _ >= 0; _--)
    (p = t[_]) && (c = (n ? p(e, i, c) : p(c)) || c);
  return n && c && O(e, i, c), c;
}, x = (t, e, i) => e.has(t) || y("Cannot " + i), r = (t, e, i) => (x(t, e, "read from private field"), e.get(t)), b = (t, e, i) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), f = (t, e, i, n) => (x(t, e, "write to private field"), e.set(t, i), i), d, h, m, g;
let a = class extends $(S) {
  // ============================================
  // Constructor & Lifecycle
  // ============================================
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], this._variantShippingOptions = [], this._variantExcludedOptionIds = [], b(this, d), b(this, h), b(this, m), b(this, g, !1), this.consumeContext(D, (t) => {
      f(this, d, t), r(this, d) && (this.observe(r(this, d).product, (e) => {
        this._product = e ?? null, this._updateVariantFromProduct();
      }, "_product"), this.observe(r(this, d).variantId, (e) => {
        f(this, m, e), this._updateVariantFromProduct();
      }, "_variantId"), this.observe(r(this, d).filterGroups, (e) => {
        this._filterGroups = e;
      }, "_filterGroups"));
    }), this.consumeContext(C, (t) => {
      f(this, h, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, g, !0), this._createRoutes(), r(this, d)?.loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, g, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !r(this, m)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const t = this._product.variants.find((e) => e.id === r(this, m));
    t && (this._variant = t, this._formData = { ...t }, this._isLoading = !1, this._loadAssignedFilters(), this._initializeShippingExclusions(t));
  }
  /** Initializes shipping exclusions state for this variant */
  _initializeShippingExclusions(t) {
    const e = this._product?.availableShippingOptions ?? [];
    this._variantExcludedOptionIds = t.excludedShippingOptionIds ?? [], this._variantShippingOptions = e.map((i) => ({
      ...i,
      // Override with this variant's specific exclusion state
      isExcluded: this._variantExcludedOptionIds.includes(i.id),
      isPartiallyExcluded: !1,
      // Not relevant in variant mode
      excludedVariantCount: 0,
      totalVariantCount: 1
    }));
  }
  /**
   * Loads filters assigned to the current variant
   */
  async _loadAssignedFilters() {
    const t = this._variant?.id;
    if (!t) return;
    const { data: e } = await v.getFiltersForProduct(t);
    if (r(this, g) && e) {
      const i = e.map((n) => n.id);
      this._assignedFilterIds = i, this._originalAssignedFilterIds = [...i];
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
          warehouseStock: this._formData.warehouseStock?.map((i) => ({
            warehouseId: i.warehouseId,
            stock: i.stock,
            reorderPoint: i.reorderPoint,
            trackStock: i.trackStock
          }))
        }, { error: e } = await v.updateVariant(this._product.id, this._variant.id, t);
        if (!r(this, g)) return;
        if (e) {
          this._errorMessage = e.message, r(this, h)?.peek("danger", { data: { headline: "Failed to save variant", message: e.message } });
          return;
        }
        await this._saveFilterAssignments(), await this._saveShippingExclusions(), r(this, h)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), r(this, d)?.reload();
      } catch (t) {
        if (!r(this, g)) return;
        this._errorMessage = t instanceof Error ? t.message : "An unexpected error occurred", r(this, h)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } });
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const t = this._getActiveTab();
    return u`
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
    return u`
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
    const t = this._isOverridingPackages(), e = this._getEffectivePackages(), i = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;
    return u`
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

        ${i ? u`
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
            ` : l}

        <uui-box headline=${t ? "Variant Packages" : i ? "Inherited from Product" : "Packages"}>
          <merchello-product-packages
            .packages=${e}
            .editable=${t || !i}
            .showInheritedBanner=${!t && i}
            @packages-change=${this._handlePackagesChange}>
          </merchello-product-packages>
        </uui-box>

        <merchello-product-shipping-exclusions
          .shippingOptions=${this._variantShippingOptions}
          .variantMode=${!0}
          .isNewProduct=${!1}
          @shipping-exclusions-change=${this._handleShippingExclusionsChange}>
        </merchello-product-shipping-exclusions>
      </div>
    `;
  }
  /** Handles packages change from the shared component */
  _handlePackagesChange(t) {
    this._formData = { ...this._formData, packageConfigurations: t.detail.packages };
  }
  /** Handles shipping exclusions change from the shared component */
  _handleShippingExclusionsChange(t) {
    this._variantExcludedOptionIds = t.detail.excludedShippingOptionIds, this._variantShippingOptions = this._variantShippingOptions.map((e) => ({
      ...e,
      isExcluded: this._variantExcludedOptionIds.includes(e.id)
    }));
  }
  _renderFeedTab() {
    return u`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._formData}
          @variant-change=${(t) => this._formData = t.detail}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }
  _renderStockTab() {
    return u`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._formData.warehouseStock ?? []}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _renderSeoTab() {
    return u`
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
    const { warehouseId: e, stock: i, reorderPoint: n, trackStock: c } = t.detail, _ = (this._formData.warehouseStock ?? []).map((p) => p.warehouseId !== e ? p : {
      ...p,
      ...i !== void 0 && { stock: i },
      ...n !== void 0 && { reorderPoint: n },
      ...c !== void 0 && { trackStock: c }
    });
    this._formData = { ...this._formData, warehouseStock: _ };
  }
  /**
   * Renders the Filters tab for assigning filters to the variant.
   * Uses the shared product-filters component.
   */
  _renderFiltersTab() {
    return u`
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
    return t.some((i, n) => i !== e[n]);
  }
  /**
   * Saves filter assignments for the variant
   */
  async _saveFilterAssignments() {
    const t = this._variant?.id;
    if (!t || !this._hasFilterChanges()) return;
    const { error: e } = await v.assignFiltersToProduct(t, this._assignedFilterIds);
    if (e) {
      r(this, h)?.peek("danger", {
        data: { headline: "Failed to save filters", message: e.message }
      });
      return;
    }
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }
  /** Saves shipping exclusions for this variant */
  async _saveShippingExclusions() {
    if (!this._product?.id || !this._variant?.id) return;
    const { error: t } = await v.updateVariantShippingExclusions(
      this._product.id,
      this._variant.id,
      this._variantExcludedOptionIds
    );
    t && r(this, h)?.peek("warning", {
      data: { headline: "Shipping exclusions not saved", message: t.message }
    });
  }
  _renderFooter() {
    return u`
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
      return u`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const t = this._getActiveTab(), e = this._product?.id ? k(this._product.id) : "";
    return u`
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
            @input=${(i) => this._formData = { ...this._formData, name: i.target.value }}
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

          ${this._errorMessage ? u`
                <uui-box class="error-box">
                  <div class="error-message">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._errorMessage}</span>
                  </div>
                </uui-box>
              ` : l}

          ${t === "basic" ? this._renderBasicTab() : l}
          ${t === "packages" ? this._renderPackagesTab() : l}
          ${t === "seo" ? this._renderSeoTab() : l}
          ${t === "feed" ? this._renderFeedTab() : l}
          ${t === "stock" ? this._renderStockTab() : l}
          ${t === "filters" ? this._renderFiltersTab() : l}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
a.styles = [
  I,
  P`
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
s([
  o()
], a.prototype, "_product", 2);
s([
  o()
], a.prototype, "_variant", 2);
s([
  o()
], a.prototype, "_isLoading", 2);
s([
  o()
], a.prototype, "_isSaving", 2);
s([
  o()
], a.prototype, "_errorMessage", 2);
s([
  o()
], a.prototype, "_routes", 2);
s([
  o()
], a.prototype, "_routerPath", 2);
s([
  o()
], a.prototype, "_activePath", 2);
s([
  o()
], a.prototype, "_formData", 2);
s([
  o()
], a.prototype, "_filterGroups", 2);
s([
  o()
], a.prototype, "_assignedFilterIds", 2);
s([
  o()
], a.prototype, "_variantShippingOptions", 2);
s([
  o()
], a.prototype, "_variantExcludedOptionIds", 2);
a = s([
  F("merchello-variant-detail")
], a);
const G = a;
export {
  a as MerchelloVariantDetailElement,
  G as default
};
//# sourceMappingURL=variant-detail.element-BndTs61i.js.map
