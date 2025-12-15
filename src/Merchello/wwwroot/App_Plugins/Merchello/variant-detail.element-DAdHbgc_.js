import { LitElement as P, html as r, nothing as u, css as $, state as l, customElement as F } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as D } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-Bc5VtWiv.js";
import { b as w } from "./badge.styles-C_lNgH9O.js";
import { a as k } from "./navigation-D1KCp5wk.js";
import "./variant-stock-display.element-D7hBvtXE.js";
var z = Object.defineProperty, I = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, c = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? I(t, a) : t, m = e.length - 1, h; m >= 0; m--)
    (h = e[m]) && (s = (i ? h(t, a, s) : h(s)) || s);
  return i && s && z(t, a, s), s;
}, x = (e, t, a) => t.has(e) || y("Cannot " + a), n = (e, t, a) => (x(e, t, "read from private field"), t.get(e)), _ = (e, t, a) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), f = (e, t, a, i) => (x(e, t, "write to private field"), t.set(e, a), a), p, g, v, d;
let o = class extends C(P) {
  constructor() {
    super(), this._product = null, this._variant = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], _(this, p), _(this, g), _(this, v), _(this, d, !1), this.consumeContext(D, (e) => {
      f(this, p, e), n(this, p) && (this.observe(n(this, p).product, (t) => {
        this._product = t ?? null, this._updateVariantFromProduct();
      }), this.observe(n(this, p).variantId, (t) => {
        f(this, v, t), this._updateVariantFromProduct();
      }));
    }), this.consumeContext(S, (e) => {
      f(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, d, !0), this._createRoutes(), this._loadFilterGroups();
  }
  /**
   * Loads all filter groups for the filter assignment UI
   */
  async _loadFilterGroups() {
    const { data: e } = await b.getFilterGroups();
    n(this, d) && e && (this._filterGroups = e);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, d, !1);
  }
  /**
   * Updates variant data from the loaded product
   */
  _updateVariantFromProduct() {
    if (!this._product || !n(this, v)) {
      this._variant = null, this._isLoading = !0;
      return;
    }
    const e = this._product.variants.find((t) => t.id === n(this, v));
    e && (this._variant = e, this._formData = { ...e }, this._isLoading = !1, this._loadAssignedFilters());
  }
  /**
   * Loads filters assigned to the current variant
   */
  async _loadAssignedFilters() {
    const e = this._variant?.id;
    if (!e) return;
    const { data: t } = await b.getFiltersForProduct(e);
    if (n(this, d) && t) {
      const a = t.map((i) => i.id);
      this._assignedFilterIds = a, this._originalAssignedFilterIds = [...a];
    }
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
      { path: "tab/seo", component: e },
      { path: "tab/feed", component: e },
      { path: "tab/stock", component: e },
      { path: "tab/filters", component: e },
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
          removeFromFeed: this._formData.removeFromFeed,
          warehouseStock: this._formData.warehouseStock?.map((a) => ({
            warehouseId: a.warehouseId,
            stock: a.stock,
            reorderPoint: a.reorderPoint,
            trackStock: a.trackStock
          }))
        }, { error: t } = await b.updateVariant(this._product.id, this._variant.id, e);
        if (!n(this, d)) return;
        if (t) {
          this._errorMessage = t.message, n(this, g)?.peek("danger", { data: { headline: "Failed to save variant", message: t.message } });
          return;
        }
        await this._saveFilterAssignments(), n(this, g)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), n(this, p)?.reload();
      } catch (e) {
        if (!n(this, d)) return;
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred", n(this, g)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", e);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderTabs() {
    const e = this._getActiveTab();
    return r`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${e === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Shipping" href="${this._routerPath}/tab/packages" ?active=${e === "packages"}>
          Shipping
        </uui-tab>
        <uui-tab label="SEO" href="${this._routerPath}/tab/seo" ?active=${e === "seo"}>
          SEO
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${e === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${e === "stock"}>
          Stock
        </uui-tab>
        <uui-tab label="Filters" href="${this._routerPath}/tab/filters" ?active=${e === "filters"}>
          Filters
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
          @variant-change=${(e) => this._formData = e.detail}>
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
    const i = [...this._formData.packageConfigurations ?? []];
    i[e] = { ...i[e], [t]: a }, this._formData = { ...this._formData, packageConfigurations: i };
  }
  _renderPackagesTab() {
    const e = this._isOverridingPackages(), t = this._getEffectivePackages(), a = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;
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

        ${a ? r`
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
            ` : u}

        <uui-box headline=${e ? "Variant Packages" : a ? "Inherited from Product" : "Packages"}>
          ${!e && a ? r`
                <div class="inherited-notice">
                  <uui-icon name="icon-link"></uui-icon>
                  <span>These packages are inherited from the product. Enable override above to customize.</span>
                </div>
              ` : u}

          ${t.length > 0 ? r`
                <div class="packages-list">
                  ${t.map((i, s) => this._renderPackageCard(i, s, e))}
                </div>
              ` : r`
                <div class="empty-state">
                  <uui-icon name="icon-box"></uui-icon>
                  <p>No packages configured</p>
                  <p class="hint">Add a package to enable shipping rate calculations</p>
                </div>
              `}

          ${e || !a ? r`
                <uui-button
                  look="placeholder"
                  class="add-package-button"
                  @click=${() => this._addPackage()}>
                  <uui-icon name="icon-add"></uui-icon>
                  Add Package
                </uui-button>
              ` : u}
        </uui-box>
      </div>
    `;
  }
  _renderPackageCard(e, t, a) {
    const i = e.lengthCm && e.widthCm && e.heightCm ? `${e.lengthCm} × ${e.widthCm} × ${e.heightCm} cm` : "No dimensions";
    return a ? r`
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
              @input=${(s) => this._updatePackage(t, "weight", parseFloat(s.target.value) || 0)}
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
              @input=${(s) => this._updatePackage(t, "lengthCm", parseFloat(s.target.value) || null)}
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
              @input=${(s) => this._updatePackage(t, "widthCm", parseFloat(s.target.value) || null)}
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
              @input=${(s) => this._updatePackage(t, "heightCm", parseFloat(s.target.value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    ` : r`
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
  _renderFeedTab() {
    return r`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._formData}
          @variant-change=${(e) => this._formData = e.detail}>
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
              @input=${(e) => this._formData = { ...this._formData, url: e.target.value }}
              placeholder="/products/my-product/blue-large">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _handleStockSettingsChange(e) {
    const { warehouseId: t, stock: a, reorderPoint: i, trackStock: s } = e.detail, m = (this._formData.warehouseStock ?? []).map((h) => h.warehouseId !== t ? h : {
      ...h,
      ...a !== void 0 && { stock: a },
      ...i !== void 0 && { reorderPoint: i },
      ...s !== void 0 && { trackStock: s }
    });
    this._formData = { ...this._formData, warehouseStock: m };
  }
  /**
   * Renders the Filters tab for assigning filters to the variant
   */
  _renderFiltersTab() {
    if (this._filterGroups.length === 0)
      return r`
        <div class="tab-content">
          <uui-box class="info-banner">
            <div class="info-content">
              <uui-icon name="icon-info"></uui-icon>
              <div>
                <strong>No Filter Groups</strong>
                <p>No filter groups have been created yet. Go to <a href="/section/merchello/workspace/merchello-filters">Filters</a> to create filter groups and filter values.</p>
              </div>
            </div>
          </uui-box>
        </div>
      `;
    const e = this._assignedFilterIds.length;
    return r`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Assign Filters</strong>
              <p>Select the filters that apply to this variant. Filters help customers find products on your storefront. ${e > 0 ? `${e} filter${e > 1 ? "s" : ""} assigned.` : ""}</p>
            </div>
          </div>
        </uui-box>

        ${this._filterGroups.map((t) => this._renderFilterGroupSection(t))}
      </div>
    `;
  }
  /**
   * Renders a filter group section with checkboxes for each filter
   */
  _renderFilterGroupSection(e) {
    return !e.filters || e.filters.length === 0 ? u : r`
      <uui-box headline=${e.name}>
        <div class="filter-checkbox-list">
          ${e.filters.map((t) => {
      const a = this._assignedFilterIds.includes(t.id);
      return r`
              <div class="filter-checkbox-item">
                <uui-checkbox
                  label=${t.name}
                  ?checked=${a}
                  @change=${(i) => this._handleFilterToggle(t.id, i.target.checked)}>
                  ${t.hexColour ? r`<span class="filter-color-swatch" style="background: ${t.hexColour}"></span>` : u}
                  ${t.name}
                </uui-checkbox>
              </div>
            `;
    })}
        </div>
      </uui-box>
    `;
  }
  /**
   * Handles filter checkbox toggle
   */
  _handleFilterToggle(e, t) {
    t ? this._assignedFilterIds = [...this._assignedFilterIds, e] : this._assignedFilterIds = this._assignedFilterIds.filter((a) => a !== e);
  }
  /**
   * Checks if filter assignments have changed
   */
  _hasFilterChanges() {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return !0;
    const e = [...this._assignedFilterIds].sort(), t = [...this._originalAssignedFilterIds].sort();
    return e.some((a, i) => a !== t[i]);
  }
  /**
   * Saves filter assignments for the variant
   */
  async _saveFilterAssignments() {
    const e = this._variant?.id;
    if (!e || !this._hasFilterChanges()) return;
    const { error: t } = await b.assignFiltersToProduct(e, this._assignedFilterIds);
    if (t) {
      n(this, g)?.peek("danger", {
        data: { headline: "Failed to save filters", message: t.message }
      });
      return;
    }
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }
  _renderFooter() {
    return r`
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
    const e = this._getActiveTab(), t = this._product?.id ? k(this._product.id) : "";
    return r`
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

          ${this._errorMessage ? r`
                <uui-box class="error-box">
                  <div class="error-message">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._errorMessage}</span>
                  </div>
                </uui-box>
              ` : u}

          ${e === "basic" ? this._renderBasicTab() : u}
          ${e === "packages" ? this._renderPackagesTab() : u}
          ${e === "seo" ? this._renderSeoTab() : u}
          ${e === "feed" ? this._renderFeedTab() : u}
          ${e === "stock" ? this._renderStockTab() : u}
          ${e === "filters" ? this._renderFiltersTab() : u}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
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

      /* Filter checkbox styles */
      .filter-checkbox-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
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

      .filter-color-swatch {
        display: inline-block;
        width: 16px;
        height: 16px;
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        margin-right: var(--uui-size-space-2);
      }
    `
];
c([
  l()
], o.prototype, "_product", 2);
c([
  l()
], o.prototype, "_variant", 2);
c([
  l()
], o.prototype, "_isLoading", 2);
c([
  l()
], o.prototype, "_isSaving", 2);
c([
  l()
], o.prototype, "_errorMessage", 2);
c([
  l()
], o.prototype, "_routes", 2);
c([
  l()
], o.prototype, "_routerPath", 2);
c([
  l()
], o.prototype, "_activePath", 2);
c([
  l()
], o.prototype, "_formData", 2);
c([
  l()
], o.prototype, "_filterGroups", 2);
c([
  l()
], o.prototype, "_assignedFilterIds", 2);
o = c([
  F("merchello-variant-detail")
], o);
const B = o;
export {
  o as MerchelloVariantDetailElement,
  B as default
};
//# sourceMappingURL=variant-detail.element-DAdHbgc_.js.map
