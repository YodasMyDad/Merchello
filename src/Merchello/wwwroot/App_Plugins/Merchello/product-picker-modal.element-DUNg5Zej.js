import { LitElement as R, html as s, nothing as l, css as $, property as _, state as p, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as T } from "@umbraco-cms/backoffice/modal";
import { M as y } from "./merchello-api-DkRa4ImO.js";
import { c as L } from "./formatting-DQoM1drN.js";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
function v(e, t) {
  return `${t}${L(e, 2)}`;
}
function D(e, t, i) {
  return e === null && t === null ? "N/A" : e === t || t === null ? v(e ?? 0, i) : e === null ? v(t, i) : `${v(e, i)} - ${v(t, i)}`;
}
function E(e) {
  return e.name ? e.name : null;
}
function N(e, t) {
  return e.images.length > 0 && !e.excludeRootProductImages ? e.images[0] : !e.excludeRootProductImages && t.length > 0 ? t[0] : e.images.length > 0 ? e.images[0] : null;
}
var M = Object.defineProperty, V = Object.getOwnPropertyDescriptor, w = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? V(t, i) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (o = (a ? c(t, i, o) : c(o)) || o);
  return a && o && M(t, i, o), o;
};
let b = class extends z(R) {
  constructor() {
    super(...arguments), this.selected = !1, this.currencySymbol = "£", this.showImage = !0, this._imageFailed = !1;
  }
  _handleClick() {
    this.variant.canSelect && this.dispatchEvent(
      new CustomEvent("select", {
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleCheckboxChange(e) {
    e.stopPropagation(), this.variant.canSelect && this.dispatchEvent(
      new CustomEvent("select", {
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderImage() {
    return this.variant.imageUrl && !this._imageFailed ? s`<img
        src="${this.variant.imageUrl}"
        alt="${this.variant.name ?? ""}"
        class="variant-image"
        @error=${() => this._imageFailed = !0}
      />` : s`
      <div class="variant-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderName() {
    const e = this.variant.optionValuesDisplay ?? this.variant.name ?? "Default";
    return s`<span class="variant-name">${e}</span>`;
  }
  _renderSku() {
    return this.variant.sku ? s`<span class="variant-sku">${this.variant.sku}</span>` : l;
  }
  _renderPrice() {
    return s`<span class="variant-price">${v(this.variant.price, this.currencySymbol)}</span>`;
  }
  /**
   * Renders stock status using backend-provided label and CSS class.
   * Backend is the single source of truth for stock status display.
   */
  _renderStockStatus() {
    if (!this.variant.stockStatusLabel) return l;
    const e = this.variant.availableStock > 0 ? ` (${this.variant.availableStock})` : "";
    return s`<span class="badge ${this.variant.stockStatusCssClass}">${this.variant.stockStatusLabel}${e}</span>`;
  }
  _renderRegionStatus() {
    return this.variant.canShipToRegion ? l : s`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
  }
  _renderBlockedReason() {
    return !this.variant.canSelect && this.variant.blockedReason ? s`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      ` : l;
  }
  render() {
    const e = !this.variant.canSelect;
    return s`
      <div
        class="variant-row ${e ? "blocked" : ""} ${this.selected ? "selected" : ""}"
        @click=${this._handleClick}
        role="option"
        aria-selected=${this.selected}
        aria-disabled=${e}
      >
        <uui-checkbox
          .checked=${this.selected}
          ?disabled=${e}
          @change=${this._handleCheckboxChange}
          label="Select variant"
        ></uui-checkbox>

        ${this.showImage ? this._renderImage() : l}

        <div class="variant-info">
          <div class="variant-name-row">
            ${this._renderName()}
            ${this._renderSku()}
          </div>
          <div class="variant-meta">
            ${this._renderPrice()}
            ${this._renderStockStatus()}
            ${this._renderRegionStatus()}
          </div>
        </div>

        ${this._renderBlockedReason()}
      </div>
    `;
  }
};
b.styles = $`
    :host {
      display: block;
    }

    .variant-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      position: relative;
      transition: background-color 0.15s ease;
    }

    .variant-row:hover:not(.blocked) {
      background-color: var(--uui-color-surface-emphasis);
    }

    .variant-row.selected {
      background-color: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast);
    }

    .variant-row.selected .variant-sku,
    .variant-row.selected .variant-price,
    .variant-row.selected .status {
      color: var(--uui-color-selected-contrast);
    }

    .variant-row.blocked {
      opacity: 0.6;
      cursor: not-allowed;
    }

    uui-checkbox {
      flex-shrink: 0;
    }

    .variant-image {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .variant-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    .variant-info {
      flex: 1;
      min-width: 0;
    }

    .variant-name-row {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-2);
    }

    .variant-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .variant-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .variant-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
    }

    .variant-price {
      font-weight: 500;
      color: var(--uui-color-text);
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status.blocked {
      color: var(--uui-color-danger);
    }

    .badge.badge-positive {
      background-color: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.badge-warning {
      background-color: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge.badge-danger {
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.badge-default {
      background-color: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .blocked-overlay {
      position: absolute;
      right: var(--uui-size-space-3);
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .blocked-overlay uui-icon {
      font-size: 0.75rem;
    }
  `;
w([
  _({ type: Object })
], b.prototype, "variant", 2);
w([
  _({ type: Boolean })
], b.prototype, "selected", 2);
w([
  _({ type: String })
], b.prototype, "currencySymbol", 2);
w([
  _({ type: Boolean })
], b.prototype, "showImage", 2);
w([
  p()
], b.prototype, "_imageFailed", 2);
b = w([
  P("merchello-product-picker-variant-row")
], b);
var j = Object.defineProperty, U = Object.getOwnPropertyDescriptor, S = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? U(t, i) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (o = (a ? c(t, i, o) : c(o)) || o);
  return a && o && j(t, i, o), o;
};
let f = class extends z(R) {
  constructor() {
    super(...arguments), this.productRoots = [], this.selectedIds = [], this.currencySymbol = "£", this.showImages = !0, this.selectRoots = !1, this.selectedRootIds = [], this._failedImages = /* @__PURE__ */ new Set();
  }
  _handleRootClick(e) {
    if (this.selectRoots) {
      this._handleRootSelect(e);
      return;
    }
    this.dispatchEvent(
      new CustomEvent("toggle-expand", {
        detail: { rootId: e.id },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleRootSelect(e) {
    this.dispatchEvent(
      new CustomEvent("root-select", {
        detail: { root: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleVariantSelect(e) {
    this.dispatchEvent(
      new CustomEvent("variant-select", {
        detail: { variant: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleImageError(e) {
    this._failedImages = /* @__PURE__ */ new Set([...this._failedImages, e]);
  }
  _renderProductImage(e, t) {
    return e && !this._failedImages.has(e) ? s`<img
        src="${e}"
        alt="${t}"
        class="product-image"
        @error=${() => this._handleImageError(e)}
      />` : s`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderPriceRange(e) {
    return D(e.minPrice, e.maxPrice, this.currencySymbol);
  }
  /**
   * Renders stock status badge using backend-provided label and CSS class.
   * Backend is the single source of truth for stock status display.
   */
  _renderStockBadge(e) {
    if (!e.stockStatusLabel) return l;
    const t = e.totalStock > 0 ? ` (${e.totalStock})` : "";
    return s`<span class="badge ${e.stockStatusCssClass}">${e.stockStatusLabel}${t}</span>`;
  }
  _renderExpandIcon(e) {
    return s`
      <uui-icon name=${e ? "icon-navigation-down" : "icon-navigation-right"} class="expand-icon"></uui-icon>
    `;
  }
  _renderProductRoot(e) {
    const t = e.variantCount === 1, i = this.selectRoots && this.selectedRootIds.includes(e.id), a = () => this.selectRoots ? s`<uui-checkbox
          class="root-checkbox"
          ?checked=${i}
          @click=${(o) => o.stopPropagation()}
          @change=${() => this._handleRootSelect(e)}
        ></uui-checkbox>` : t ? s`<div class="expand-spacer"></div>` : this._renderExpandIcon(e.isExpanded);
    return s`
      <div class="product-root ${e.isExpanded ? "expanded" : ""} ${this.showImages ? "" : "no-images"} ${i ? "selected" : ""}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(e)}
          aria-expanded=${this.selectRoots ? void 0 : e.isExpanded}
        >
          ${a()}
          ${this.showImages ? this._renderProductImage(e.imageUrl, e.rootName) : l}
          <div class="product-info">
            <div class="product-name">${e.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(e)}</span>
              ${t ? l : s`<span class="variant-count">${e.variantCount} variants</span>`}
              ${this._renderStockBadge(e)}
            </div>
          </div>
        </button>

        ${!this.selectRoots && e.isExpanded && e.variantsLoaded ? s`
              <div class="variants-container ${this.showImages ? "" : "no-images"}">
                ${e.variants.map(
      (o) => s`
                    <merchello-product-picker-variant-row
                      .variant=${o}
                      .selected=${this.selectedIds.includes(o.id)}
                      .currencySymbol=${this.currencySymbol}
                      .showImage=${this.showImages}
                      @select=${() => this._handleVariantSelect(o)}
                    ></merchello-product-picker-variant-row>
                  `
    )}
              </div>
            ` : l}

        ${!this.selectRoots && e.isExpanded && !e.variantsLoaded ? s`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : l}
      </div>
    `;
  }
  render() {
    return this.productRoots.length === 0 ? s`<div class="empty">No products to display</div>` : s`
      <div class="product-list">
        ${this.productRoots.map((e) => this._renderProductRoot(e))}
      </div>
    `;
  }
};
f.styles = $`
    :host {
      display: block;
    }

    .product-list {
      display: flex;
      flex-direction: column;
    }

    .product-root {
      border-bottom: 1px solid var(--uui-color-border);
    }

    .product-root:last-child {
      border-bottom: none;
    }

    .product-root-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.15s ease;
    }

    .product-root-header:hover {
      background-color: var(--uui-color-surface-alt);
    }

    .product-root.expanded .product-root-header {
      background-color: var(--uui-color-surface-alt);
    }

    .expand-icon {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      transition: transform 0.15s ease;
    }

    .expand-spacer {
      width: 0.75rem;
      flex-shrink: 0;
    }

    .root-checkbox {
      flex-shrink: 0;
    }

    .product-root.selected .product-root-header {
      background-color: var(--uui-color-selected);
    }

    .product-image {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .product-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .product-info {
      flex: 1;
      min-width: 0;
    }

    .product-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-1);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .price {
      font-weight: 500;
      color: var(--uui-color-text);
    }

    .variant-count {
      color: var(--uui-color-text-alt);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge.badge-positive {
      background-color: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.badge-warning {
      background-color: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge.badge-danger {
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.badge-default {
      background-color: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .variants-container {
      padding-left: calc(0.75rem + var(--uui-size-space-3) + 40px + var(--uui-size-space-3));
      padding-bottom: var(--uui-size-space-2);
    }

    .variants-container.no-images {
      padding-left: calc(0.75rem + var(--uui-size-space-3));
    }

    .variants-loading {
      padding: var(--uui-size-space-3);
      padding-left: calc(0.75rem + var(--uui-size-space-3) + 40px + var(--uui-size-space-3));
    }

    .product-root.no-images .variants-loading {
      padding-left: calc(0.75rem + var(--uui-size-space-3));
    }

    .empty {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
    }
  `;
S([
  _({ type: Array })
], f.prototype, "productRoots", 2);
S([
  _({ type: Array })
], f.prototype, "selectedIds", 2);
S([
  _({ type: String })
], f.prototype, "currencySymbol", 2);
S([
  _({ type: Boolean })
], f.prototype, "showImages", 2);
S([
  _({ type: Boolean })
], f.prototype, "selectRoots", 2);
S([
  _({ type: Array })
], f.prototype, "selectedRootIds", 2);
S([
  p()
], f.prototype, "_failedImages", 2);
f = S([
  P("merchello-product-picker-list")
], f);
var B = Object.defineProperty, W = Object.getOwnPropertyDescriptor, h = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? W(t, i) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (o = (a ? c(t, i, o) : c(o)) || o);
  return a && o && B(t, i, o), o;
};
let u = class extends T {
  constructor() {
    super(...arguments), this._searchTerm = "", this._page = 1, this._pageSize = 20, this._totalPages = 0, this._isLoading = !0, this._errorMessage = null, this._productRoots = [], this._selections = /* @__PURE__ */ new Map(), this._selectedRoots = /* @__PURE__ */ new Map(), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map(), this._pendingShippingSelection = null, this._selectedShippingOptionId = null, this._productDetailCache = /* @__PURE__ */ new Map(), this._searchDebounceTimer = null, this._addonPreviewDebounceTimer = null, this._addonPricePreview = null, this._isLoadingAddonPreview = !1, this._addonPreviewError = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadProducts();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._addonPreviewDebounceTimer && clearTimeout(this._addonPreviewDebounceTimer);
  }
  get _config() {
    return this.data?.config;
  }
  get _currencySymbol() {
    return this._config?.currencySymbol ?? "£";
  }
  get _excludeProductIds() {
    return this._config?.excludeProductIds ?? [];
  }
  get _showAddons() {
    return this._config?.showAddons !== !1;
  }
  get _showImages() {
    return this._config?.showImages !== !1;
  }
  get _isPropertyEditorMode() {
    return this._config?.propertyEditorMode === !0;
  }
  get _maxItems() {
    return this._config?.maxItems ?? 1 / 0;
  }
  get _selectRoots() {
    return this._config?.selectRoots === !0;
  }
  // ============================================
  // Data Loading
  // ============================================
  async _loadProducts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "name",
      sortDir: "asc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._config?.productTypeId && (e.productTypeId = this._config.productTypeId), this._config?.collectionId && (e.collectionId = this._config.collectionId);
    const { data: t, error: i } = await y.getProducts(e);
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
      return;
    }
    if (t) {
      const a = this._excludeProductIds;
      this._productRoots = t.items.filter((o) => !a.includes(o.productRootId)).map((o) => this._mapToPickerRoot(o)), this._totalPages = t.totalPages;
    }
    this._isLoading = !1;
  }
  _mapToPickerRoot(e) {
    const t = e.isDigitalProduct;
    return {
      id: e.productRootId,
      rootName: e.rootName,
      imageUrl: e.imageUrl,
      variantCount: e.variantCount,
      minPrice: e.minPrice,
      maxPrice: e.maxPrice,
      // Stock is calculated when variants are loaded
      totalStock: 0,
      stockStatus: t ? "Untracked" : "InStock",
      stockStatusLabel: t ? "Digital" : "",
      stockStatusCssClass: t ? "badge-default" : "",
      isDigitalProduct: t,
      isExpanded: !1,
      variantsLoaded: !1,
      variants: []
    };
  }
  async _loadVariantsForRoot(e) {
    const t = this._productRoots.findIndex((d) => d.id === e);
    if (t === -1) return;
    const { data: i, error: a } = await y.getProductDetail(e);
    if (a || !i)
      return;
    this._productDetailCache.set(e, i);
    const o = await Promise.all(
      i.variants.map(async (d) => this._mapToPickerVariant(d, i))
    ), n = i.variants.reduce((d, k) => d + k.totalStock, 0), c = i.aggregateStockStatus, g = i.aggregateStockStatusLabel ?? "", m = i.aggregateStockStatusCssClass ?? "";
    this._productRoots = this._productRoots.map(
      (d, k) => k === t ? {
        ...d,
        variants: o,
        variantsLoaded: !0,
        totalStock: n,
        stockStatus: c,
        stockStatusLabel: g,
        stockStatusCssClass: m
      } : d
    );
  }
  async _mapToPickerVariant(e, t) {
    const i = e.totalStock, a = e.warehouseStock.some((r) => r.trackStock);
    let o = !0, n = null, c = !0, g = null, m = null, d = e.stockStatus, k = e.stockStatusLabel, x = e.stockStatusCssClass;
    if (!this._isPropertyEditorMode) {
      if (this._config?.shippingAddress && !t.isDigitalProduct) {
        const r = await this._getFulfillmentOptions(e.id);
        o = r.canAddToOrder, n = r.blockedReason, c = r.canAddToOrder, g = r.warehouseId, m = r.warehouseName, r.aggregateStockStatusLabel && r.aggregateStockStatusCssClass && (d = r.aggregateStockStatus, k = r.aggregateStockStatusLabel, x = r.aggregateStockStatusCssClass);
      } else if (!t.isDigitalProduct && e.warehouseStock.length > 0) {
        const r = await this._getDefaultFulfillingWarehouse(e.id);
        o = r.canAddToOrder, n = r.blockedReason, g = r.warehouseId, m = r.warehouseName, r.aggregateStockStatusLabel && r.aggregateStockStatusCssClass && (d = r.aggregateStockStatus, k = r.aggregateStockStatusLabel, x = r.aggregateStockStatusCssClass);
      }
    }
    let A = d, C = k, I = x;
    if (g) {
      const r = e.warehouseStock.find((O) => O.warehouseId === g);
      r && (A = r.stockStatus, C = r.stockStatusLabel, I = r.stockStatusCssClass);
    }
    return {
      id: e.id,
      productRootId: t.id,
      name: e.name,
      rootName: t.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: N(e, t.rootImages),
      optionValuesDisplay: E(e),
      canSelect: o,
      blockedReason: n,
      availableStock: i,
      stockStatus: A,
      stockStatusLabel: C,
      stockStatusCssClass: I,
      trackStock: a,
      canShipToRegion: c,
      regionMessage: n,
      // Use blockedReason for any message (region or other)
      fulfillingWarehouseId: g,
      fulfillingWarehouseName: m,
      warehouseStock: e.warehouseStock
    };
  }
  // ============================================
  // Fulfillment Options (centralized backend API)
  // ============================================
  /**
   * Get fulfillment options for a product variant using the centralized backend API.
   * This is a single API call that determines the best warehouse for fulfillment
   * based on priority, region eligibility, and stock availability.
   */
  async _getFulfillmentOptions(e) {
    const t = this._config?.shippingAddress;
    if (!t)
      return {
        canAddToOrder: !0,
        warehouseId: null,
        warehouseName: null,
        blockedReason: null,
        aggregateStockStatus: "InStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null
      };
    try {
      const { data: i, error: a } = await y.getProductFulfillmentOptions(
        e,
        t.countryCode,
        t.regionCode
      );
      return a ? {
        canAddToOrder: !1,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null
      } : {
        canAddToOrder: i?.canAddToOrder ?? !1,
        warehouseId: i?.fulfillingWarehouse?.id ?? null,
        warehouseName: i?.fulfillingWarehouse?.name ?? null,
        blockedReason: i?.blockedReason ?? null,
        aggregateStockStatus: i?.aggregateStockStatus ?? "InStock",
        aggregateStockStatusLabel: i?.aggregateStockStatusLabel ?? null,
        aggregateStockStatusCssClass: i?.aggregateStockStatusCssClass ?? null
      };
    } catch {
      return {
        canAddToOrder: !1,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null
      };
    }
  }
  /**
   * Get the default fulfilling warehouse for a product variant when no shipping address is known.
   * Uses the centralized backend API to select based on warehouse priority and stock availability.
   */
  async _getDefaultFulfillingWarehouse(e) {
    try {
      const { data: t, error: i } = await y.getDefaultFulfillingWarehouse(e);
      return i ? {
        canAddToOrder: !1,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null
      } : {
        canAddToOrder: t?.canAddToOrder ?? !1,
        warehouseId: t?.fulfillingWarehouse?.id ?? null,
        warehouseName: t?.fulfillingWarehouse?.name ?? null,
        blockedReason: t?.blockedReason ?? null,
        aggregateStockStatus: t?.aggregateStockStatus ?? "InStock",
        aggregateStockStatusLabel: t?.aggregateStockStatusLabel ?? null,
        aggregateStockStatusCssClass: t?.aggregateStockStatusCssClass ?? null
      };
    } catch {
      return {
        canAddToOrder: !1,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null
      };
    }
  }
  // ============================================
  // Event Handlers
  // ============================================
  _handleSearchInput(e) {
    const t = e.target;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = t.value, this._page = 1, this._loadProducts();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadProducts();
  }
  _handlePageChange(e) {
    this._page = e, this._loadProducts();
  }
  async _handleToggleExpand(e) {
    const t = this._productRoots.find((i) => i.id === e);
    t && (t.variantsLoaded || await this._loadVariantsForRoot(e), this._productRoots = this._productRoots.map(
      (i) => i.id === e ? { ...i, isExpanded: !i.isExpanded } : i
    ));
  }
  _handleRootSelect(e) {
    if (this._selectedRoots.has(e.id))
      this._selectedRoots.delete(e.id);
    else {
      if (this._selectedRoots.size >= this._maxItems)
        if (this._maxItems === 1)
          this._selectedRoots.clear();
        else
          return;
      this._selectedRoots.set(e.id, e);
    }
    this._selectedRoots = new Map(this._selectedRoots);
  }
  _handleVariantSelect(e) {
    if (e.canSelect) {
      if (this._isPropertyEditorMode) {
        if (this._selections.has(e.id)) {
          this._selections.delete(e.id), this._selections = new Map(this._selections);
          return;
        }
        if (this._selections.size >= this._maxItems)
          if (this._maxItems === 1)
            this._selections.clear();
          else
            return;
        const t = {
          productId: e.id,
          productRootId: e.productRootId,
          name: e.optionValuesDisplay ? `${e.rootName} - ${e.optionValuesDisplay}` : e.rootName,
          sku: e.sku,
          price: e.price,
          imageUrl: e.imageUrl
        };
        this._selections.set(e.id, t), this._selections = new Map(this._selections);
        return;
      }
      if (this._showAddons) {
        const t = this._productDetailCache.get(e.productRootId);
        if (t) {
          const i = this._getAddonOptions(t);
          if (i.length > 0) {
            this._pendingAddonSelection = {
              variant: e,
              addonOptions: i,
              rootName: e.rootName
            }, this._selectedAddons = /* @__PURE__ */ new Map(), this._addonPricePreview = {
              basePrice: e.price,
              addonsTotal: 0,
              totalPrice: e.price
            }, this._isLoadingAddonPreview = !1, this._viewState = "addon-selection";
            return;
          }
        }
      }
      this._transitionToShippingSelection(e, []);
    }
  }
  _getAddonOptions(e) {
    return e.productOptions.filter((t) => !t.isVariant && t.values.length > 0).map((t) => ({
      id: t.id,
      name: t.name ?? "",
      alias: t.alias,
      optionUiAlias: t.optionUiAlias,
      values: t.values.map((i) => ({
        id: i.id,
        name: i.name ?? "",
        priceAdjustment: i.priceAdjustment,
        costAdjustment: i.costAdjustment,
        skuSuffix: i.skuSuffix
      }))
    }));
  }
  // ============================================
  // Add-on Selection Handlers
  // ============================================
  _handleAddonSelect(e, t, i) {
    const a = {
      optionId: e,
      optionName: t,
      valueId: i.id,
      valueName: i.name,
      priceAdjustment: i.priceAdjustment,
      costAdjustment: i.costAdjustment,
      skuSuffix: i.skuSuffix
    };
    this._selectedAddons.set(e, a), this._selectedAddons = new Map(this._selectedAddons), this._fetchAddonPricePreviewDebounced();
  }
  _handleAddonClear(e) {
    this._selectedAddons.delete(e), this._selectedAddons = new Map(this._selectedAddons), this._fetchAddonPricePreviewDebounced();
  }
  /**
   * Fetch addon price preview from backend API with debouncing.
   * This is the single source of truth for addon pricing calculations.
   */
  _fetchAddonPricePreviewDebounced() {
    this._addonPreviewDebounceTimer && clearTimeout(this._addonPreviewDebounceTimer), this._addonPreviewDebounceTimer = setTimeout(() => {
      this._fetchAddonPricePreview();
    }, 150);
  }
  async _fetchAddonPricePreview() {
    const e = this._pendingAddonSelection;
    if (!e) return;
    if (this._addonPreviewError = null, this._selectedAddons.size === 0) {
      this._addonPricePreview = {
        basePrice: e.variant.price,
        addonsTotal: 0,
        totalPrice: e.variant.price
      }, this._isLoadingAddonPreview = !1;
      return;
    }
    this._isLoadingAddonPreview = !0;
    const t = {
      selectedAddons: Array.from(this._selectedAddons.values()).map((o) => ({
        optionId: o.optionId,
        valueId: o.valueId
      }))
    }, { data: i, error: a } = await y.previewAddonPrice(e.variant.id, t);
    this._pendingAddonSelection && (a ? (this._addonPricePreview = null, this._addonPreviewError = "Unable to calculate price. Please try again.") : i && (this._addonPricePreview = {
      basePrice: i.basePrice,
      addonsTotal: i.addonsTotal,
      totalPrice: i.totalPrice
    }), this._isLoadingAddonPreview = !1);
  }
  _handleBackToProducts() {
    this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map(), this._addonPricePreview = null, this._isLoadingAddonPreview = !1, this._addonPreviewError = null;
  }
  _handleSkipAddons() {
    this._pendingAddonSelection && (this._transitionToShippingSelection(this._pendingAddonSelection.variant, []), this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map());
  }
  _handleConfirmWithAddons() {
    if (!this._pendingAddonSelection) return;
    const e = Array.from(this._selectedAddons.values());
    this._transitionToShippingSelection(this._pendingAddonSelection.variant, e), this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map();
  }
  // ============================================
  // Shipping Selection Handlers
  // ============================================
  async _transitionToShippingSelection(e, t) {
    const i = e.fulfillingWarehouseId, a = e.fulfillingWarehouseName;
    if (!i || !a)
      return;
    const o = this._addonPricePreview?.totalPrice ?? e.price;
    this._pendingShippingSelection = {
      variant: e,
      addons: t,
      totalPrice: o,
      warehouseId: i,
      warehouseName: a,
      isLoadingOptions: !0,
      shippingOptions: []
    }, this._selectedShippingOptionId = null, this._viewState = "shipping-selection";
    const n = this._config?.shippingAddress;
    if (!n) {
      this._pendingShippingSelection && (this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      });
      return;
    }
    const { data: c, error: g } = await y.getShippingOptionsForWarehouse(
      i,
      n.countryCode,
      n.regionCode
    );
    if (!this._pendingShippingSelection)
      return;
    if (g || !c) {
      this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      };
      return;
    }
    const m = c.availableOptions.map((d) => ({
      id: d.id,
      name: d.name,
      deliveryTimeDescription: d.deliveryTimeDescription,
      estimatedCost: d.estimatedCost ?? null,
      isEstimate: d.isEstimate,
      isNextDay: d.isNextDay
    }));
    this._pendingShippingSelection = {
      ...this._pendingShippingSelection,
      isLoadingOptions: !1,
      shippingOptions: m
    }, m.length === 1 && (this._selectedShippingOptionId = m[0].id);
  }
  _handleShippingOptionSelect(e) {
    this._selectedShippingOptionId = e;
  }
  _handleBackFromShipping() {
    this._viewState = "product-selection", this._pendingShippingSelection = null, this._selectedShippingOptionId = null;
  }
  _handleConfirmWithShipping() {
    if (!this._pendingShippingSelection || !this._selectedShippingOptionId) return;
    const e = this._pendingShippingSelection.shippingOptions.find(
      (c) => c.id === this._selectedShippingOptionId
    );
    if (!e) return;
    const { variant: t, addons: i, warehouseId: a, warehouseName: o } = this._pendingShippingSelection, n = {
      productId: t.id,
      productRootId: t.productRootId,
      name: t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName,
      sku: t.sku,
      price: t.price,
      imageUrl: t.imageUrl,
      warehouseId: a,
      warehouseName: o,
      selectedAddons: i.length > 0 ? i : void 0,
      shippingOptionId: e.id,
      shippingOptionName: e.name
    };
    this._selections.set(t.id, n), this._selections = new Map(this._selections), this._viewState = "product-selection", this._pendingShippingSelection = null, this._selectedShippingOptionId = null;
  }
  _handleAdd() {
    if (this._selectRoots) {
      const e = Array.from(this._selectedRoots.values()).map((t) => ({
        productId: t.id,
        // Use root ID as productId for compatibility
        productRootId: t.id,
        name: t.rootName,
        sku: null,
        // Roots don't have SKUs
        price: t.minPrice ?? 0,
        imageUrl: t.imageUrl
      }));
      this.value = { selections: e }, this.modalContext?.submit();
      return;
    }
    this.value = {
      selections: Array.from(this._selections.values())
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  // ============================================
  // Render Methods
  // ============================================
  _renderSearch() {
    return s`
      <div class="search-container">
        <uui-input
          type="text"
          placeholder="Search by name or SKU..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search products"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? s`
                <uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : l}
        </uui-input>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? s`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? s`<div class="error">${this._errorMessage}</div>` : this._productRoots.length === 0 ? s`
        <div class="empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>No products found</p>
        </div>
      ` : s`
      <merchello-product-picker-list
        .productRoots=${this._productRoots}
        .selectedIds=${Array.from(this._selections.keys())}
        .selectedRootIds=${Array.from(this._selectedRoots.keys())}
        .currencySymbol=${this._currencySymbol}
        .showImages=${this._showImages}
        .selectRoots=${this._selectRoots}
        @toggle-expand=${(e) => this._handleToggleExpand(e.detail.rootId)}
        @variant-select=${(e) => this._handleVariantSelect(e.detail.variant)}
        @root-select=${(e) => this._handleRootSelect(e.detail.root)}
      ></merchello-product-picker-list>
      ${this._renderPagination()}
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? l : s`
      <div class="pagination">
        <uui-button
          look="secondary"
          ?disabled=${this._page <= 1}
          @click=${() => this._handlePageChange(this._page - 1)}
        >
          Previous
        </uui-button>
        <span class="page-info">Page ${this._page} of ${this._totalPages}</span>
        <uui-button
          look="secondary"
          ?disabled=${this._page >= this._totalPages}
          @click=${() => this._handlePageChange(this._page + 1)}
        >
          Next
        </uui-button>
      </div>
    `;
  }
  _renderSelectionSummary() {
    const e = this._selectRoots ? this._selectedRoots.size : this._selections.size;
    return e === 0 ? s`<span class="selection-count">No products selected</span>` : s`<span class="selection-count">${e} product${e === 1 ? "" : "s"} selected</span>`;
  }
  // ============================================
  // Add-on Selection View
  // ============================================
  _renderAddonSelectionView() {
    const e = this._pendingAddonSelection;
    if (!e) return l;
    const t = e.variant, i = t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName, a = this._addonPricePreview, o = this._addonPreviewError !== null, n = a?.basePrice ?? t.price, c = a?.addonsTotal ?? 0, g = a?.totalPrice ?? t.price, m = !o && !this._isLoadingAddonPreview;
    return s`
      <umb-body-layout headline="Select Add-ons (Optional)">
        <div id="main">
          ${o ? s`
                <div class="addon-error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._addonPreviewError}</span>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._fetchAddonPricePreview()}
                  >
                    Retry
                  </uui-button>
                </div>
              ` : l}

          <div class="addon-product-summary">
            <div class="product-info">
              <strong>${i}</strong>
              ${t.sku ? s`<span class="sku">${t.sku}</span>` : l}
            </div>
            <div class="product-pricing ${this._isLoadingAddonPreview ? "loading" : ""} ${o ? "error" : ""}">
              <span class="base-price">${v(n, this._currencySymbol)}</span>
              ${!o && c !== 0 ? s`
                    <span class="addon-total">
                      ${c > 0 ? "+" : ""}${v(c, this._currencySymbol)}
                    </span>
                    <span class="total-price">= ${v(g, this._currencySymbol)}</span>
                  ` : l}
              ${this._isLoadingAddonPreview ? s`<uui-loader-circle></uui-loader-circle>` : l}
            </div>
          </div>

          <div class="addon-options">
            ${e.addonOptions.map((d) => this._renderAddonOption(d))}
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Back" @click=${this._handleBackToProducts}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button look="secondary" label="Skip Add-ons" @click=${this._handleSkipAddons}>
            Skip Add-ons
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Continue"
            ?disabled=${!m}
            @click=${this._handleConfirmWithAddons}
          >
            Continue
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderAddonOption(e) {
    const t = this._selectedAddons.get(e.id);
    return s`
      <div class="addon-option">
        <div class="addon-option-header">
          <span class="addon-option-name">${e.name}</span>
          <span class="addon-optional">(optional)</span>
          ${t ? s`
                <uui-button compact look="secondary" label="Clear" @click=${() => this._handleAddonClear(e.id)}>
                  Clear
                </uui-button>
              ` : l}
        </div>
        <div class="addon-values">
          ${e.values.map((i) => this._renderAddonValue(e, i, t?.valueId === i.id))}
        </div>
      </div>
    `;
  }
  _renderAddonValue(e, t, i) {
    return s`
      <button
        type="button"
        class="addon-value-button ${i ? "selected" : ""}"
        @click=${() => this._handleAddonSelect(e.id, e.name, t)}
      >
        <span class="value-name">${t.name}</span>
        ${t.priceAdjustment !== 0 ? s`
              <span class="value-price ${t.priceAdjustment > 0 ? "positive" : "negative"}">
                ${t.priceAdjustment > 0 ? "+" : ""}${v(t.priceAdjustment, this._currencySymbol)}
              </span>
            ` : l}
      </button>
    `;
  }
  // ============================================
  // Shipping Selection View
  // ============================================
  _renderShippingSelectionView() {
    const e = this._pendingShippingSelection;
    if (!e) return l;
    const t = e.variant, i = t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName, a = e.totalPrice;
    return s`
      <umb-body-layout headline="Select Shipping">
        <div id="main">
          <div class="shipping-product-summary">
            <div class="product-info">
              <strong>${i}</strong>
              ${t.sku ? s`<span class="sku">${t.sku}</span>` : l}
              <div class="warehouse-info">
                <uui-icon name="icon-home"></uui-icon>
                ${e.warehouseName}
              </div>
            </div>
            <div class="product-pricing">
              <span class="total-price">${v(a, this._currencySymbol)}</span>
            </div>
          </div>

          ${e.isLoadingOptions ? s`<div class="loading"><uui-loader></uui-loader></div>` : e.shippingOptions.length === 0 ? s`<div class="no-options">No shipping options available for this destination.</div>` : s`
                  <div class="shipping-options">
                    ${e.shippingOptions.map((o) => this._renderShippingOption(o))}
                  </div>
                `}
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Back" @click=${this._handleBackFromShipping}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Add to Order"
            ?disabled=${!this._selectedShippingOptionId || e.isLoadingOptions}
            @click=${this._handleConfirmWithShipping}
          >
            Add to Order
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderShippingOption(e) {
    const t = this._selectedShippingOptionId === e.id;
    return s`
      <button
        type="button"
        class="shipping-option-button ${t ? "selected" : ""}"
        @click=${() => this._handleShippingOptionSelect(e.id)}
      >
        <div class="shipping-option-info">
          <span class="shipping-option-name">${e.name}</span>
          <span class="shipping-option-delivery">${e.deliveryTimeDescription}</span>
        </div>
        <div class="shipping-option-cost">
          ${e.estimatedCost !== null ? s`
                <span class="cost">${v(e.estimatedCost, this._currencySymbol)}</span>
                ${e.isEstimate ? s`<span class="estimate-label">est.</span>` : l}
              ` : s`<span class="cost-at-checkout">Calculated at checkout</span>`}
        </div>
      </button>
    `;
  }
  // ============================================
  // Main Render
  // ============================================
  render() {
    return this._viewState === "addon-selection" ? this._renderAddonSelectionView() : this._viewState === "shipping-selection" ? this._renderShippingSelectionView() : s`
      <umb-body-layout headline="Select Products">
        <div id="main">
          ${this._renderSearch()}
          <div class="product-list-container">
            ${this._renderContent()}
          </div>
        </div>

        <div slot="actions">
          ${this._renderSelectionSummary()}
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${this._selectRoots ? this._selectedRoots.size === 0 : this._selections.size === 0}
            @click=${this._handleAdd}
          >
            Add Selected (${this._selectRoots ? this._selectedRoots.size : this._selections.size})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u.styles = $`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .search-container {
      flex-shrink: 0;
    }

    .search-container uui-input {
      width: 100%;
    }

    .search-container uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .product-list-container {
      flex: 1;
      overflow: auto;
      min-height: 200px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
    }

    .empty uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-3);
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .page-info {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .selection-count {
      flex: 1;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Add-on Selection View Styles */
    .addon-product-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .addon-product-summary .product-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .addon-product-summary .sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .addon-product-summary .product-pricing {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .addon-product-summary .base-price {
      font-weight: 600;
    }

    .addon-product-summary .addon-total {
      color: var(--uui-color-positive);
    }

    .addon-product-summary .total-price {
      font-weight: 700;
      color: var(--uui-color-current);
    }

    .addon-product-summary .product-pricing.loading {
      opacity: 0.6;
    }

    .addon-product-summary .product-pricing.error {
      opacity: 0.5;
    }

    .addon-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .addon-error uui-icon {
      flex-shrink: 0;
    }

    .addon-error span {
      flex: 1;
    }

    .addon-product-summary .product-pricing uui-loader-circle {
      font-size: 0.75rem;
    }

    .addon-options {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .addon-option {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .addon-option-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .addon-option-name {
      font-weight: 600;
    }

    .addon-optional {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .addon-values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .addon-value-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 100px;
    }

    .addon-value-button:hover {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-surface-emphasis);
    }

    .addon-value-button.selected {
      border-color: var(--uui-color-positive);
      background: var(--uui-color-positive-surface);
    }

    .addon-value-button .value-name {
      font-weight: 500;
    }

    .addon-value-button .value-price {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .addon-value-button .value-price.positive {
      color: var(--uui-color-positive);
    }

    .addon-value-button .value-price.negative {
      color: var(--uui-color-danger);
    }

    /* Shipping Selection View Styles */
    .shipping-product-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .shipping-product-summary .product-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-product-summary .sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-product-summary .warehouse-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .shipping-product-summary .warehouse-info uui-icon {
      font-size: 0.875rem;
    }

    .shipping-product-summary .product-pricing .total-price {
      font-weight: 700;
      font-size: 1rem;
    }

    .shipping-options {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .shipping-option-button {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      text-align: left;
    }

    .shipping-option-button:hover {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-surface-emphasis);
    }

    .shipping-option-button.selected {
      border-color: var(--uui-color-positive);
      background: var(--uui-color-positive-surface);
    }

    .shipping-option-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-option-name {
      font-weight: 600;
    }

    .shipping-option-delivery {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-option-cost {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-1);
    }

    .shipping-option-cost .cost {
      font-weight: 700;
      font-size: 1rem;
    }

    .shipping-option-cost .estimate-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-option-cost .cost-at-checkout {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .no-options {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }
  `;
h([
  p()
], u.prototype, "_searchTerm", 2);
h([
  p()
], u.prototype, "_page", 2);
h([
  p()
], u.prototype, "_pageSize", 2);
h([
  p()
], u.prototype, "_totalPages", 2);
h([
  p()
], u.prototype, "_isLoading", 2);
h([
  p()
], u.prototype, "_errorMessage", 2);
h([
  p()
], u.prototype, "_productRoots", 2);
h([
  p()
], u.prototype, "_selections", 2);
h([
  p()
], u.prototype, "_selectedRoots", 2);
h([
  p()
], u.prototype, "_viewState", 2);
h([
  p()
], u.prototype, "_pendingAddonSelection", 2);
h([
  p()
], u.prototype, "_selectedAddons", 2);
h([
  p()
], u.prototype, "_pendingShippingSelection", 2);
h([
  p()
], u.prototype, "_selectedShippingOptionId", 2);
h([
  p()
], u.prototype, "_addonPricePreview", 2);
h([
  p()
], u.prototype, "_isLoadingAddonPreview", 2);
h([
  p()
], u.prototype, "_addonPreviewError", 2);
u = h([
  P("merchello-product-picker-modal")
], u);
const H = u;
export {
  u as MerchelloProductPickerModalElement,
  H as default
};
//# sourceMappingURL=product-picker-modal.element-DUNg5Zej.js.map
