import { LitElement as A, html as o, nothing as d, css as x, property as f, customElement as P, state as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as S } from "./merchello-api-DPQ4r4XT.js";
import { c as O } from "./formatting-DYmyPQEL.js";
import { UmbElementMixin as I } from "@umbraco-cms/backoffice/element-api";
function v(e, i) {
  return `${i}${O(e, 2)}`;
}
function T(e, i, t) {
  return e === null && i === null ? "N/A" : e === i || i === null ? v(e ?? 0, t) : e === null ? v(i, t) : `${v(e, t)} - ${v(i, t)}`;
}
function R(e) {
  return e.name ? e.name : null;
}
function C(e, i) {
  return e.images.length > 0 && !e.excludeRootProductImages ? e.images[0] : !e.excludeRootProductImages && i.length > 0 ? i[0] : e.images.length > 0 ? e.images[0] : null;
}
var D = Object.defineProperty, N = Object.getOwnPropertyDescriptor, y = (e, i, t, s) => {
  for (var a = s > 1 ? void 0 : s ? N(i, t) : i, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (a = (s ? n(i, t, a) : n(a)) || a);
  return s && a && D(i, t, a), a;
};
let _ = class extends I(A) {
  constructor() {
    super(...arguments), this.selected = !1, this.currencySymbol = "£", this.showImage = !0;
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
    return this.variant.imageUrl ? o`<img src="${this.variant.imageUrl}" alt="${this.variant.name ?? ""}" class="variant-image" />` : o`
      <div class="variant-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderName() {
    const e = this.variant.optionValuesDisplay ?? this.variant.name ?? "Default";
    return o`<span class="variant-name">${e}</span>`;
  }
  _renderSku() {
    return this.variant.sku ? o`<span class="variant-sku">${this.variant.sku}</span>` : d;
  }
  _renderPrice() {
    return o`<span class="variant-price">${v(this.variant.price, this.currencySymbol)}</span>`;
  }
  /**
   * Renders stock status using backend-provided stockStatus.
   * Backend is the single source of truth for stock status classification.
   */
  _renderStockStatus() {
    switch (this.variant.stockStatus) {
      case "Untracked":
        return o`<span class="status available">Available</span>`;
      case "OutOfStock":
        return o`<span class="status blocked">Out of stock</span>`;
      case "LowStock":
        return o`<span class="status warning">Low: ${this.variant.availableStock}</span>`;
      case "InStock":
      default:
        return o`<span class="status available">${this.variant.availableStock} in stock</span>`;
    }
  }
  _renderRegionStatus() {
    return this.variant.canShipToRegion ? d : o`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
  }
  _renderBlockedReason() {
    return !this.variant.canSelect && this.variant.blockedReason ? o`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      ` : d;
  }
  render() {
    const e = !this.variant.canSelect;
    return o`
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

        ${this.showImage ? this._renderImage() : d}

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
_.styles = x`
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

    .status.available {
      color: var(--uui-color-positive);
    }

    .status.warning {
      color: var(--uui-color-warning);
    }

    .status.blocked {
      color: var(--uui-color-danger);
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
y([
  f({ type: Object })
], _.prototype, "variant", 2);
y([
  f({ type: Boolean })
], _.prototype, "selected", 2);
y([
  f({ type: String })
], _.prototype, "currencySymbol", 2);
y([
  f({ type: Boolean })
], _.prototype, "showImage", 2);
_ = y([
  P("merchello-product-picker-variant-row")
], _);
var E = Object.defineProperty, L = Object.getOwnPropertyDescriptor, k = (e, i, t, s) => {
  for (var a = s > 1 ? void 0 : s ? L(i, t) : i, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (a = (s ? n(i, t, a) : n(a)) || a);
  return s && a && E(i, t, a), a;
};
let b = class extends I(A) {
  constructor() {
    super(...arguments), this.productRoots = [], this.selectedIds = [], this.currencySymbol = "£", this.showImages = !0;
  }
  _handleRootClick(e) {
    this.dispatchEvent(
      new CustomEvent("toggle-expand", {
        detail: { rootId: e.id },
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
  _renderProductImage(e, i) {
    return e ? o`<img src="${e}" alt="${i}" class="product-image" />` : o`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderPriceRange(e) {
    return T(e.minPrice, e.maxPrice, this.currencySymbol);
  }
  /**
   * Renders stock status badge using backend-provided stockStatus.
   * Backend is the single source of truth for stock status classification.
   */
  _renderStockBadge(e) {
    switch (e.stockStatus) {
      case "Untracked":
        return o`<span class="badge digital">Digital</span>`;
      case "OutOfStock":
        return o`<span class="badge out-of-stock">Out of stock</span>`;
      case "LowStock":
        return o`<span class="badge low-stock">Low: ${e.totalStock}</span>`;
      case "InStock":
      default:
        return o`<span class="badge in-stock">${e.totalStock} in stock</span>`;
    }
  }
  _renderExpandIcon(e) {
    return o`
      <uui-icon name=${e ? "icon-navigation-down" : "icon-navigation-right"} class="expand-icon"></uui-icon>
    `;
  }
  _renderProductRoot(e) {
    const i = e.variantCount === 1;
    return o`
      <div class="product-root ${e.isExpanded ? "expanded" : ""} ${this.showImages ? "" : "no-images"}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(e)}
          aria-expanded=${e.isExpanded}
        >
          ${i ? o`<div class="expand-spacer"></div>` : this._renderExpandIcon(e.isExpanded)}
          ${this.showImages ? this._renderProductImage(e.imageUrl, e.rootName) : d}
          <div class="product-info">
            <div class="product-name">${e.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(e)}</span>
              ${i ? d : o`<span class="variant-count">${e.variantCount} variants</span>`}
              ${this._renderStockBadge(e)}
            </div>
          </div>
        </button>

        ${e.isExpanded && e.variantsLoaded ? o`
              <div class="variants-container ${this.showImages ? "" : "no-images"}">
                ${e.variants.map(
      (t) => o`
                    <merchello-product-picker-variant-row
                      .variant=${t}
                      .selected=${this.selectedIds.includes(t.id)}
                      .currencySymbol=${this.currencySymbol}
                      .showImage=${this.showImages}
                      @select=${() => this._handleVariantSelect(t)}
                    ></merchello-product-picker-variant-row>
                  `
    )}
              </div>
            ` : d}

        ${e.isExpanded && !e.variantsLoaded ? o`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : d}
      </div>
    `;
  }
  render() {
    return this.productRoots.length === 0 ? o`<div class="empty">No products to display</div>` : o`
      <div class="product-list">
        ${this.productRoots.map((e) => this._renderProductRoot(e))}
      </div>
    `;
  }
};
b.styles = x`
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

    .badge.in-stock {
      background-color: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.low-stock {
      background-color: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge.out-of-stock {
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.digital {
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
k([
  f({ type: Array })
], b.prototype, "productRoots", 2);
k([
  f({ type: Array })
], b.prototype, "selectedIds", 2);
k([
  f({ type: String })
], b.prototype, "currencySymbol", 2);
k([
  f({ type: Boolean })
], b.prototype, "showImages", 2);
b = k([
  P("merchello-product-picker-list")
], b);
var M = Object.defineProperty, V = Object.getOwnPropertyDescriptor, p = (e, i, t, s) => {
  for (var a = s > 1 ? void 0 : s ? V(i, t) : i, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (a = (s ? n(i, t, a) : n(a)) || a);
  return s && a && M(i, t, a), a;
};
let l = class extends z {
  constructor() {
    super(...arguments), this._searchTerm = "", this._page = 1, this._pageSize = 20, this._totalPages = 0, this._isLoading = !0, this._errorMessage = null, this._productRoots = [], this._selections = /* @__PURE__ */ new Map(), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map(), this._pendingShippingSelection = null, this._selectedShippingOptionId = null, this._productDetailCache = /* @__PURE__ */ new Map(), this._searchDebounceTimer = null, this._addonPreviewDebounceTimer = null, this._addonPricePreview = null, this._isLoadingAddonPreview = !1, this._addonPreviewError = null;
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
    const { data: i, error: t } = await S.getProducts(e);
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    if (i) {
      const s = this._excludeProductIds;
      this._productRoots = i.items.filter((a) => !s.includes(a.productRootId)).map((a) => this._mapToPickerRoot(a)), this._totalPages = i.totalPages;
    }
    this._isLoading = !1;
  }
  _mapToPickerRoot(e) {
    return {
      id: e.productRootId,
      rootName: e.rootName,
      imageUrl: e.imageUrl,
      variantCount: e.variantCount,
      minPrice: e.minPrice,
      maxPrice: e.maxPrice,
      // Stock is calculated when variants are loaded
      totalStock: 0,
      stockStatus: e.isDigitalProduct ? "Untracked" : "InStock",
      isDigitalProduct: e.isDigitalProduct,
      isExpanded: !1,
      variantsLoaded: !1,
      variants: []
    };
  }
  async _loadVariantsForRoot(e) {
    const i = this._productRoots.findIndex((c) => c.id === e);
    if (i === -1) return;
    const { data: t, error: s } = await S.getProductDetail(e);
    if (s || !t) {
      console.error("Failed to load product variants:", s);
      return;
    }
    this._productDetailCache.set(e, t);
    const a = await Promise.all(
      t.variants.map(async (c) => this._mapToPickerVariant(c, t))
    ), r = a.reduce((c, h) => c + h.availableStock, 0), n = t.isDigitalProduct;
    let m = "InStock";
    n ? m = "Untracked" : r <= 0 ? m = "OutOfStock" : a.some((c) => c.stockStatus === "LowStock") && (m = "LowStock"), this._productRoots = this._productRoots.map(
      (c, h) => h === i ? { ...c, variants: a, variantsLoaded: !0, totalStock: r, stockStatus: m } : c
    );
  }
  async _mapToPickerVariant(e, i) {
    const t = e.warehouseStock.reduce((u, w) => u + w.availableStock, 0), s = e.warehouseStock.some((u) => u.trackStock);
    let a = !0, r = null, n = !0, m = null, c = null, h = "InStock";
    if (!this._isPropertyEditorMode) {
      if (this._config?.shippingAddress && !i.isDigitalProduct) {
        const u = await this._getFulfillmentOptions(e.id);
        a = u.canAddToOrder, r = u.blockedReason, n = u.canAddToOrder, m = u.warehouseId, c = u.warehouseName, h = u.aggregateStockStatus;
      } else if (!i.isDigitalProduct && e.warehouseStock.length > 0) {
        const u = await this._getDefaultFulfillingWarehouse(e.id);
        a = u.canAddToOrder, r = u.blockedReason, m = u.warehouseId, c = u.warehouseName, h = u.aggregateStockStatus;
      }
    }
    let $ = h;
    if (m) {
      const u = e.warehouseStock.find((w) => w.warehouseId === m);
      u && ($ = u.stockStatus);
    }
    return {
      id: e.id,
      productRootId: i.id,
      name: e.name,
      rootName: i.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: C(e, i.rootImages),
      optionValuesDisplay: R(e),
      canSelect: a,
      blockedReason: r,
      availableStock: t,
      stockStatus: $,
      trackStock: s,
      canShipToRegion: n,
      regionMessage: r,
      // Use blockedReason for any message (region or other)
      fulfillingWarehouseId: m,
      fulfillingWarehouseName: c,
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
    const i = this._config?.shippingAddress;
    if (!i)
      return { canAddToOrder: !0, warehouseId: null, warehouseName: null, blockedReason: null, aggregateStockStatus: "InStock" };
    try {
      const { data: t, error: s } = await S.getProductFulfillmentOptions(
        e,
        i.countryCode,
        i.stateCode
      );
      return s ? (console.error("Failed to get fulfillment options:", s), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment", aggregateStockStatus: "OutOfStock" }) : {
        canAddToOrder: t?.canAddToOrder ?? !1,
        warehouseId: t?.fulfillingWarehouse?.id ?? null,
        warehouseName: t?.fulfillingWarehouse?.name ?? null,
        blockedReason: t?.blockedReason ?? null,
        aggregateStockStatus: t?.aggregateStockStatus ?? "InStock"
      };
    } catch (t) {
      return console.error("Unexpected error getting fulfillment options:", t), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment", aggregateStockStatus: "OutOfStock" };
    }
  }
  /**
   * Get the default fulfilling warehouse for a product variant when no shipping address is known.
   * Uses the centralized backend API to select based on warehouse priority and stock availability.
   */
  async _getDefaultFulfillingWarehouse(e) {
    try {
      const { data: i, error: t } = await S.getDefaultFulfillingWarehouse(e);
      return t ? (console.error("Failed to get default warehouse:", t), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment", aggregateStockStatus: "OutOfStock" }) : {
        canAddToOrder: i?.canAddToOrder ?? !1,
        warehouseId: i?.fulfillingWarehouse?.id ?? null,
        warehouseName: i?.fulfillingWarehouse?.name ?? null,
        blockedReason: i?.blockedReason ?? null,
        aggregateStockStatus: i?.aggregateStockStatus ?? "InStock"
      };
    } catch (i) {
      return console.error("Unexpected error getting default warehouse:", i), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment", aggregateStockStatus: "OutOfStock" };
    }
  }
  // ============================================
  // Event Handlers
  // ============================================
  _handleSearchInput(e) {
    const i = e.target;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i.value, this._page = 1, this._loadProducts();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadProducts();
  }
  _handlePageChange(e) {
    this._page = e, this._loadProducts();
  }
  async _handleToggleExpand(e) {
    const i = this._productRoots.find((t) => t.id === e);
    i && (i.variantsLoaded || await this._loadVariantsForRoot(e), this._productRoots = this._productRoots.map(
      (t) => t.id === e ? { ...t, isExpanded: !t.isExpanded } : t
    ));
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
        const i = {
          productId: e.id,
          productRootId: e.productRootId,
          name: e.optionValuesDisplay ? `${e.rootName} - ${e.optionValuesDisplay}` : e.rootName,
          sku: e.sku,
          price: e.price,
          imageUrl: e.imageUrl
        };
        this._selections.set(e.id, i), this._selections = new Map(this._selections);
        return;
      }
      if (this._showAddons) {
        const i = this._productDetailCache.get(e.productRootId);
        if (i) {
          const t = this._getAddonOptions(i);
          if (t.length > 0) {
            this._pendingAddonSelection = {
              variant: e,
              addonOptions: t,
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
    return e.productOptions.filter((i) => !i.isVariant && i.values.length > 0).map((i) => ({
      id: i.id,
      name: i.name ?? "",
      alias: i.alias,
      optionUiAlias: i.optionUiAlias,
      values: i.values.map((t) => ({
        id: t.id,
        name: t.name ?? "",
        priceAdjustment: t.priceAdjustment,
        costAdjustment: t.costAdjustment,
        skuSuffix: t.skuSuffix
      }))
    }));
  }
  // ============================================
  // Add-on Selection Handlers
  // ============================================
  _handleAddonSelect(e, i, t) {
    const s = {
      optionId: e,
      optionName: i,
      valueId: t.id,
      valueName: t.name,
      priceAdjustment: t.priceAdjustment,
      costAdjustment: t.costAdjustment,
      skuSuffix: t.skuSuffix
    };
    this._selectedAddons.set(e, s), this._selectedAddons = new Map(this._selectedAddons), this._fetchAddonPricePreviewDebounced();
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
    const i = {
      selectedAddons: Array.from(this._selectedAddons.values()).map((a) => ({
        optionId: a.optionId,
        valueId: a.valueId
      }))
    }, { data: t, error: s } = await S.previewAddonPrice(e.variant.id, i);
    this._pendingAddonSelection && (s ? (console.error("Failed to fetch addon price preview:", s), this._addonPricePreview = null, this._addonPreviewError = "Unable to calculate price. Please try again.") : t && (this._addonPricePreview = {
      basePrice: t.basePrice,
      addonsTotal: t.addonsTotal,
      totalPrice: t.totalPrice
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
  async _transitionToShippingSelection(e, i) {
    const t = e.fulfillingWarehouseId, s = e.fulfillingWarehouseName;
    if (!t || !s) {
      console.error("No warehouse for variant", e);
      return;
    }
    const a = this._addonPricePreview?.totalPrice ?? e.price;
    this._pendingShippingSelection = {
      variant: e,
      addons: i,
      totalPrice: a,
      warehouseId: t,
      warehouseName: s,
      isLoadingOptions: !0,
      shippingOptions: []
    }, this._selectedShippingOptionId = null, this._viewState = "shipping-selection";
    const r = this._config?.shippingAddress;
    if (!r) {
      this._pendingShippingSelection && (this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      });
      return;
    }
    const { data: n, error: m } = await S.getShippingOptionsForWarehouse(
      t,
      r.countryCode,
      r.stateCode
    );
    if (!this._pendingShippingSelection)
      return;
    if (m || !n) {
      console.error("Failed to load shipping options:", m), this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      };
      return;
    }
    const c = n.availableOptions.map((h) => ({
      id: h.id,
      name: h.name,
      deliveryTimeDescription: h.deliveryTimeDescription,
      estimatedCost: h.estimatedCost ?? null,
      isEstimate: h.isEstimate,
      isNextDay: h.isNextDay
    }));
    this._pendingShippingSelection = {
      ...this._pendingShippingSelection,
      isLoadingOptions: !1,
      shippingOptions: c
    }, c.length === 1 && (this._selectedShippingOptionId = c[0].id);
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
      (n) => n.id === this._selectedShippingOptionId
    );
    if (!e) return;
    const { variant: i, addons: t, warehouseId: s, warehouseName: a } = this._pendingShippingSelection, r = {
      productId: i.id,
      productRootId: i.productRootId,
      name: i.optionValuesDisplay ? `${i.rootName} - ${i.optionValuesDisplay}` : i.rootName,
      sku: i.sku,
      price: i.price,
      imageUrl: i.imageUrl,
      warehouseId: s,
      warehouseName: a,
      selectedAddons: t.length > 0 ? t : void 0,
      shippingOptionId: e.id,
      shippingOptionName: e.name
    };
    this._selections.set(i.id, r), this._selections = new Map(this._selections), this._viewState = "product-selection", this._pendingShippingSelection = null, this._selectedShippingOptionId = null;
  }
  _handleAdd() {
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
    return o`
      <div class="search-container">
        <uui-input
          type="text"
          placeholder="Search by name or SKU..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search products"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? o`
                <uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : d}
        </uui-input>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? o`<div class="error">${this._errorMessage}</div>` : this._productRoots.length === 0 ? o`
        <div class="empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>No products found</p>
        </div>
      ` : o`
      <merchello-product-picker-list
        .productRoots=${this._productRoots}
        .selectedIds=${Array.from(this._selections.keys())}
        .currencySymbol=${this._currencySymbol}
        .showImages=${this._showImages}
        @toggle-expand=${(e) => this._handleToggleExpand(e.detail.rootId)}
        @variant-select=${(e) => this._handleVariantSelect(e.detail.variant)}
      ></merchello-product-picker-list>
      ${this._renderPagination()}
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? d : o`
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
    const e = this._selections.size;
    return e === 0 ? o`<span class="selection-count">No products selected</span>` : o`<span class="selection-count">${e} product${e === 1 ? "" : "s"} selected</span>`;
  }
  // ============================================
  // Add-on Selection View
  // ============================================
  _renderAddonSelectionView() {
    const e = this._pendingAddonSelection;
    if (!e) return d;
    const i = e.variant, t = i.optionValuesDisplay ? `${i.rootName} - ${i.optionValuesDisplay}` : i.rootName, s = this._addonPricePreview, a = this._addonPreviewError !== null, r = s?.basePrice ?? i.price, n = s?.addonsTotal ?? 0, m = s?.totalPrice ?? i.price, c = !a && !this._isLoadingAddonPreview;
    return o`
      <umb-body-layout headline="Select Add-ons (Optional)">
        <div id="main">
          ${a ? o`
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
              ` : d}

          <div class="addon-product-summary">
            <div class="product-info">
              <strong>${t}</strong>
              ${i.sku ? o`<span class="sku">${i.sku}</span>` : d}
            </div>
            <div class="product-pricing ${this._isLoadingAddonPreview ? "loading" : ""} ${a ? "error" : ""}">
              <span class="base-price">${v(r, this._currencySymbol)}</span>
              ${!a && n !== 0 ? o`
                    <span class="addon-total">
                      ${n > 0 ? "+" : ""}${v(n, this._currencySymbol)}
                    </span>
                    <span class="total-price">= ${v(m, this._currencySymbol)}</span>
                  ` : d}
              ${this._isLoadingAddonPreview ? o`<uui-loader-circle></uui-loader-circle>` : d}
            </div>
          </div>

          <div class="addon-options">
            ${e.addonOptions.map((h) => this._renderAddonOption(h))}
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${this._handleBackToProducts}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button look="secondary" @click=${this._handleSkipAddons}>
            Skip Add-ons
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            ?disabled=${!c}
            @click=${this._handleConfirmWithAddons}
          >
            Continue
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderAddonOption(e) {
    const i = this._selectedAddons.get(e.id);
    return o`
      <div class="addon-option">
        <div class="addon-option-header">
          <span class="addon-option-name">${e.name}</span>
          <span class="addon-optional">(optional)</span>
          ${i ? o`
                <uui-button compact look="secondary" @click=${() => this._handleAddonClear(e.id)}>
                  Clear
                </uui-button>
              ` : d}
        </div>
        <div class="addon-values">
          ${e.values.map((t) => this._renderAddonValue(e, t, i?.valueId === t.id))}
        </div>
      </div>
    `;
  }
  _renderAddonValue(e, i, t) {
    return o`
      <button
        type="button"
        class="addon-value-button ${t ? "selected" : ""}"
        @click=${() => this._handleAddonSelect(e.id, e.name, i)}
      >
        <span class="value-name">${i.name}</span>
        ${i.priceAdjustment !== 0 ? o`
              <span class="value-price ${i.priceAdjustment > 0 ? "positive" : "negative"}">
                ${i.priceAdjustment > 0 ? "+" : ""}${v(i.priceAdjustment, this._currencySymbol)}
              </span>
            ` : d}
      </button>
    `;
  }
  // ============================================
  // Shipping Selection View
  // ============================================
  _renderShippingSelectionView() {
    const e = this._pendingShippingSelection;
    if (!e) return d;
    const i = e.variant, t = i.optionValuesDisplay ? `${i.rootName} - ${i.optionValuesDisplay}` : i.rootName, s = e.totalPrice;
    return o`
      <umb-body-layout headline="Select Shipping">
        <div id="main">
          <div class="shipping-product-summary">
            <div class="product-info">
              <strong>${t}</strong>
              ${i.sku ? o`<span class="sku">${i.sku}</span>` : d}
              <div class="warehouse-info">
                <uui-icon name="icon-home"></uui-icon>
                ${e.warehouseName}
              </div>
            </div>
            <div class="product-pricing">
              <span class="total-price">${v(s, this._currencySymbol)}</span>
            </div>
          </div>

          ${e.isLoadingOptions ? o`<div class="loading"><uui-loader></uui-loader></div>` : e.shippingOptions.length === 0 ? o`<div class="no-options">No shipping options available for this destination.</div>` : o`
                  <div class="shipping-options">
                    ${e.shippingOptions.map((a) => this._renderShippingOption(a))}
                  </div>
                `}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${this._handleBackFromShipping}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
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
    const i = this._selectedShippingOptionId === e.id;
    return o`
      <button
        type="button"
        class="shipping-option-button ${i ? "selected" : ""}"
        @click=${() => this._handleShippingOptionSelect(e.id)}
      >
        <div class="shipping-option-info">
          <span class="shipping-option-name">${e.name}</span>
          <span class="shipping-option-delivery">${e.deliveryTimeDescription}</span>
        </div>
        <div class="shipping-option-cost">
          ${e.estimatedCost !== null ? o`
                <span class="cost">${v(e.estimatedCost, this._currencySymbol)}</span>
                ${e.isEstimate ? o`<span class="estimate-label">est.</span>` : d}
              ` : o`<span class="cost-at-checkout">Calculated at checkout</span>`}
        </div>
      </button>
    `;
  }
  // ============================================
  // Main Render
  // ============================================
  render() {
    return this._viewState === "addon-selection" ? this._renderAddonSelectionView() : this._viewState === "shipping-selection" ? this._renderShippingSelectionView() : o`
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
            ?disabled=${this._selections.size === 0}
            @click=${this._handleAdd}
          >
            Add Selected (${this._selections.size})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l.styles = x`
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
p([
  g()
], l.prototype, "_searchTerm", 2);
p([
  g()
], l.prototype, "_page", 2);
p([
  g()
], l.prototype, "_pageSize", 2);
p([
  g()
], l.prototype, "_totalPages", 2);
p([
  g()
], l.prototype, "_isLoading", 2);
p([
  g()
], l.prototype, "_errorMessage", 2);
p([
  g()
], l.prototype, "_productRoots", 2);
p([
  g()
], l.prototype, "_selections", 2);
p([
  g()
], l.prototype, "_viewState", 2);
p([
  g()
], l.prototype, "_pendingAddonSelection", 2);
p([
  g()
], l.prototype, "_selectedAddons", 2);
p([
  g()
], l.prototype, "_pendingShippingSelection", 2);
p([
  g()
], l.prototype, "_selectedShippingOptionId", 2);
p([
  g()
], l.prototype, "_addonPricePreview", 2);
p([
  g()
], l.prototype, "_isLoadingAddonPreview", 2);
p([
  g()
], l.prototype, "_addonPreviewError", 2);
l = p([
  P("merchello-product-picker-modal")
], l);
const q = l;
export {
  l as MerchelloProductPickerModalElement,
  q as default
};
//# sourceMappingURL=product-picker-modal.element-By-FeZ2V.js.map
