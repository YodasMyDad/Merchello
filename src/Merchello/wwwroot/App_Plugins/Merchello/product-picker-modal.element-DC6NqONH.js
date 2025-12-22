import { LitElement as x, html as o, nothing as c, css as k, property as v, customElement as w, state as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as I } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-B1skiL_A.js";
import { c as O } from "./formatting-BB_-NCdW.js";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
function m(e, t) {
  return `${t}${O(e, 2)}`;
}
function P(e, t, i) {
  return e === null && t === null ? "N/A" : e === t || t === null ? m(e ?? 0, i) : e === null ? m(t, i) : `${m(e, i)} - ${m(t, i)}`;
}
function C(e) {
  return e.name ? e.name : null;
}
function R(e, t) {
  return e.images.length > 0 && !e.excludeRootProductImages ? e.images[0] : !e.excludeRootProductImages && t.length > 0 ? t[0] : e.images.length > 0 ? e.images[0] : null;
}
var T = Object.defineProperty, N = Object.getOwnPropertyDescriptor, S = (e, t, i, s) => {
  for (var a = s > 1 ? void 0 : s ? N(t, i) : t, n = e.length - 1, r; n >= 0; n--)
    (r = e[n]) && (a = (s ? r(t, i, a) : r(a)) || a);
  return s && a && T(t, i, a), a;
};
let f = class extends $(x) {
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
    return this.variant.sku ? o`<span class="variant-sku">${this.variant.sku}</span>` : c;
  }
  _renderPrice() {
    return o`<span class="variant-price">${m(this.variant.price, this.currencySymbol)}</span>`;
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
    return this.variant.canShipToRegion ? c : o`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
  }
  _renderBlockedReason() {
    return !this.variant.canSelect && this.variant.blockedReason ? o`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      ` : c;
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

        ${this.showImage ? this._renderImage() : c}

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
f.styles = k`
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
S([
  v({ type: Object })
], f.prototype, "variant", 2);
S([
  v({ type: Boolean })
], f.prototype, "selected", 2);
S([
  v({ type: String })
], f.prototype, "currencySymbol", 2);
S([
  v({ type: Boolean })
], f.prototype, "showImage", 2);
f = S([
  w("merchello-product-picker-variant-row")
], f);
var D = Object.defineProperty, j = Object.getOwnPropertyDescriptor, y = (e, t, i, s) => {
  for (var a = s > 1 ? void 0 : s ? j(t, i) : t, n = e.length - 1, r; n >= 0; n--)
    (r = e[n]) && (a = (s ? r(t, i, a) : r(a)) || a);
  return s && a && D(t, i, a), a;
};
let _ = class extends $(x) {
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
  _renderProductImage(e, t) {
    return e ? o`<img src="${e}" alt="${t}" class="product-image" />` : o`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderPriceRange(e) {
    return P(e.minPrice, e.maxPrice, this.currencySymbol);
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
    const t = e.variantCount === 1;
    return o`
      <div class="product-root ${e.isExpanded ? "expanded" : ""} ${this.showImages ? "" : "no-images"}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(e)}
          aria-expanded=${e.isExpanded}
        >
          ${t ? o`<div class="expand-spacer"></div>` : this._renderExpandIcon(e.isExpanded)}
          ${this.showImages ? this._renderProductImage(e.imageUrl, e.rootName) : c}
          <div class="product-info">
            <div class="product-name">${e.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(e)}</span>
              ${t ? c : o`<span class="variant-count">${e.variantCount} variants</span>`}
              ${this._renderStockBadge(e)}
            </div>
          </div>
        </button>

        ${e.isExpanded && e.variantsLoaded ? o`
              <div class="variants-container ${this.showImages ? "" : "no-images"}">
                ${e.variants.map(
      (i) => o`
                    <merchello-product-picker-variant-row
                      .variant=${i}
                      .selected=${this.selectedIds.includes(i.id)}
                      .currencySymbol=${this.currencySymbol}
                      .showImage=${this.showImages}
                      @select=${() => this._handleVariantSelect(i)}
                    ></merchello-product-picker-variant-row>
                  `
    )}
              </div>
            ` : c}

        ${e.isExpanded && !e.variantsLoaded ? o`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : c}
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
_.styles = k`
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
y([
  v({ type: Array })
], _.prototype, "productRoots", 2);
y([
  v({ type: Array })
], _.prototype, "selectedIds", 2);
y([
  v({ type: String })
], _.prototype, "currencySymbol", 2);
y([
  v({ type: Boolean })
], _.prototype, "showImages", 2);
_ = y([
  w("merchello-product-picker-list")
], _);
var E = Object.defineProperty, V = Object.getOwnPropertyDescriptor, p = (e, t, i, s) => {
  for (var a = s > 1 ? void 0 : s ? V(t, i) : t, n = e.length - 1, r; n >= 0; n--)
    (r = e[n]) && (a = (s ? r(t, i, a) : r(a)) || a);
  return s && a && E(t, i, a), a;
};
let d = class extends I {
  constructor() {
    super(...arguments), this._searchTerm = "", this._page = 1, this._pageSize = 20, this._totalPages = 0, this._isLoading = !0, this._errorMessage = null, this._productRoots = [], this._selections = /* @__PURE__ */ new Map(), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map(), this._pendingShippingSelection = null, this._selectedShippingOptionId = null, this._productDetailCache = /* @__PURE__ */ new Map(), this._searchDebounceTimer = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadProducts();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
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
    const { data: t, error: i } = await b.getProducts(e);
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
      return;
    }
    if (t) {
      const s = this._excludeProductIds;
      this._productRoots = t.items.filter((a) => !s.includes(a.productRootId)).map((a) => this._mapToPickerRoot(a)), this._totalPages = t.totalPages;
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
      totalStock: e.totalStock,
      stockStatus: e.stockStatus,
      isDigitalProduct: e.isDigitalProduct,
      isExpanded: !1,
      variantsLoaded: !1,
      variants: []
    };
  }
  async _loadVariantsForRoot(e) {
    const t = this._productRoots.findIndex((n) => n.id === e);
    if (t === -1) return;
    const { data: i, error: s } = await b.getProductDetail(e);
    if (s || !i) {
      console.error("Failed to load product variants:", s);
      return;
    }
    this._productDetailCache.set(e, i);
    const a = await Promise.all(
      i.variants.map(async (n) => this._mapToPickerVariant(n, i))
    );
    this._productRoots = this._productRoots.map(
      (n, r) => r === t ? { ...n, variants: a, variantsLoaded: !0 } : n
    );
  }
  async _mapToPickerVariant(e, t) {
    const i = e.warehouseStock.reduce((u, z) => u + z.availableStock, 0), s = e.warehouseStock.some((u) => u.trackStock);
    let a = !0, n = null, r = !0, l = null, g = null;
    if (this._config?.shippingAddress && !t.isDigitalProduct) {
      const u = await this._getFulfillmentOptions(e.id);
      a = u.canAddToOrder, n = u.blockedReason, r = u.canAddToOrder, l = u.warehouseId, g = u.warehouseName;
    } else if (!t.isDigitalProduct && e.warehouseStock.length > 0) {
      const u = await this._getDefaultFulfillingWarehouse(e.id);
      a = u.canAddToOrder, n = u.blockedReason, l = u.warehouseId, g = u.warehouseName;
    }
    const A = this._getVariantStockStatus(e.warehouseStock, l, s, i);
    return {
      id: e.id,
      productRootId: t.id,
      name: e.name,
      rootName: t.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: R(e, t.rootImages),
      optionValuesDisplay: C(e),
      canSelect: a,
      blockedReason: n,
      availableStock: i,
      stockStatus: A,
      trackStock: s,
      canShipToRegion: r,
      regionMessage: n,
      // Use blockedReason for any message (region or other)
      fulfillingWarehouseId: l,
      fulfillingWarehouseName: g,
      warehouseStock: e.warehouseStock
    };
  }
  /**
   * Determines the stock status for a variant.
   * Uses the fulfilling warehouse's status if available, otherwise derives from aggregate.
   * This is for display only - the backend is the source of truth for individual warehouse statuses.
   */
  _getVariantStockStatus(e, t, i, s) {
    if (t) {
      const l = e.find((g) => g.warehouseId === t);
      if (l)
        return l.stockStatus;
    }
    if (!i)
      return "Untracked";
    if (s <= 0)
      return "OutOfStock";
    const a = e.filter((l) => l.trackStock);
    return a.some((l) => l.stockStatus === "InStock") ? "InStock" : a.some((l) => l.stockStatus === "LowStock") ? "LowStock" : "InStock";
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
      return { canAddToOrder: !0, warehouseId: null, warehouseName: null, blockedReason: null };
    try {
      const { data: i, error: s } = await b.getProductFulfillmentOptions(
        e,
        t.countryCode,
        t.stateCode
      );
      return s ? (console.error("Failed to get fulfillment options:", s), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment" }) : {
        canAddToOrder: i?.canAddToOrder ?? !1,
        warehouseId: i?.fulfillingWarehouse?.id ?? null,
        warehouseName: i?.fulfillingWarehouse?.name ?? null,
        blockedReason: i?.blockedReason ?? null
      };
    } catch (i) {
      return console.error("Unexpected error getting fulfillment options:", i), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment" };
    }
  }
  /**
   * Get the default fulfilling warehouse for a product variant when no shipping address is known.
   * Uses the centralized backend API to select based on warehouse priority and stock availability.
   */
  async _getDefaultFulfillingWarehouse(e) {
    try {
      const { data: t, error: i } = await b.getDefaultFulfillingWarehouse(e);
      return i ? (console.error("Failed to get default warehouse:", i), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment" }) : {
        canAddToOrder: t?.canAddToOrder ?? !1,
        warehouseId: t?.fulfillingWarehouse?.id ?? null,
        warehouseName: t?.fulfillingWarehouse?.name ?? null,
        blockedReason: t?.blockedReason ?? null
      };
    } catch (t) {
      return console.error("Unexpected error getting default warehouse:", t), { canAddToOrder: !1, warehouseId: null, warehouseName: null, blockedReason: "Unable to check fulfillment" };
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
  _handleVariantSelect(e) {
    if (e.canSelect) {
      if (this._showAddons) {
        const t = this._productDetailCache.get(e.productRootId);
        if (t) {
          const i = this._getAddonOptions(t);
          if (i.length > 0) {
            this._pendingAddonSelection = {
              variant: e,
              addonOptions: i,
              rootName: e.rootName
            }, this._selectedAddons = /* @__PURE__ */ new Map(), this._viewState = "addon-selection";
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
    const s = {
      optionId: e,
      optionName: t,
      valueId: i.id,
      valueName: i.name,
      priceAdjustment: i.priceAdjustment,
      costAdjustment: i.costAdjustment,
      skuSuffix: i.skuSuffix
    };
    this._selectedAddons.set(e, s), this._selectedAddons = new Map(this._selectedAddons);
  }
  _handleAddonClear(e) {
    this._selectedAddons.delete(e), this._selectedAddons = new Map(this._selectedAddons);
  }
  _handleBackToProducts() {
    this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map();
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
    const i = e.fulfillingWarehouseId, s = e.fulfillingWarehouseName;
    if (!i || !s) {
      console.error("No warehouse for variant", e);
      return;
    }
    this._pendingShippingSelection = {
      variant: e,
      addons: t,
      warehouseId: i,
      warehouseName: s,
      isLoadingOptions: !0,
      shippingOptions: []
    }, this._selectedShippingOptionId = null, this._viewState = "shipping-selection";
    const a = this._config?.shippingAddress;
    if (!a) {
      this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      };
      return;
    }
    const { data: n, error: r } = await b.getShippingOptionsForWarehouse(
      i,
      a.countryCode,
      a.stateCode
    );
    if (r || !n) {
      console.error("Failed to load shipping options:", r), this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: !1
      };
      return;
    }
    const l = n.availableOptions.map((g) => ({
      id: g.id,
      name: g.name,
      deliveryTimeDescription: g.deliveryTimeDescription,
      estimatedCost: g.estimatedCost ?? null,
      isEstimate: g.isEstimate,
      isNextDay: g.isNextDay
    }));
    this._pendingShippingSelection = {
      ...this._pendingShippingSelection,
      isLoadingOptions: !1,
      shippingOptions: l
    }, l.length === 1 && (this._selectedShippingOptionId = l[0].id);
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
      (r) => r.id === this._selectedShippingOptionId
    );
    if (!e) return;
    const { variant: t, addons: i, warehouseId: s, warehouseName: a } = this._pendingShippingSelection, n = {
      productId: t.id,
      productRootId: t.productRootId,
      name: t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName,
      sku: t.sku,
      price: t.price,
      imageUrl: t.imageUrl,
      warehouseId: s,
      warehouseName: a,
      selectedAddons: i.length > 0 ? i : void 0,
      shippingOptionId: e.id,
      shippingOptionName: e.name
    };
    this._selections.set(t.id, n), this._selections = new Map(this._selections), this._viewState = "product-selection", this._pendingShippingSelection = null, this._selectedShippingOptionId = null;
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
              ` : c}
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
    return this._totalPages <= 1 ? c : o`
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
    if (!e) return c;
    const t = e.variant, i = t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName, s = Array.from(this._selectedAddons.values()).reduce(
      (n, r) => n + r.priceAdjustment,
      0
    ), a = t.price + s;
    return o`
      <umb-body-layout headline="Select Add-ons (Optional)">
        <div id="main">
          <div class="addon-product-summary">
            <div class="product-info">
              <strong>${i}</strong>
              ${t.sku ? o`<span class="sku">${t.sku}</span>` : c}
            </div>
            <div class="product-pricing">
              <span class="base-price">${m(t.price, this._currencySymbol)}</span>
              ${s !== 0 ? o`
                    <span class="addon-total">
                      ${s > 0 ? "+" : ""}${m(s, this._currencySymbol)}
                    </span>
                    <span class="total-price">= ${m(a, this._currencySymbol)}</span>
                  ` : c}
            </div>
          </div>

          <div class="addon-options">
            ${e.addonOptions.map((n) => this._renderAddonOption(n))}
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
          <uui-button look="primary" color="positive" @click=${this._handleConfirmWithAddons}>
            Continue
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderAddonOption(e) {
    const t = this._selectedAddons.get(e.id);
    return o`
      <div class="addon-option">
        <div class="addon-option-header">
          <span class="addon-option-name">${e.name}</span>
          <span class="addon-optional">(optional)</span>
          ${t ? o`
                <uui-button compact look="secondary" @click=${() => this._handleAddonClear(e.id)}>
                  Clear
                </uui-button>
              ` : c}
        </div>
        <div class="addon-values">
          ${e.values.map((i) => this._renderAddonValue(e, i, t?.valueId === i.id))}
        </div>
      </div>
    `;
  }
  _renderAddonValue(e, t, i) {
    return o`
      <button
        type="button"
        class="addon-value-button ${i ? "selected" : ""}"
        @click=${() => this._handleAddonSelect(e.id, e.name, t)}
      >
        <span class="value-name">${t.name}</span>
        ${t.priceAdjustment !== 0 ? o`
              <span class="value-price ${t.priceAdjustment > 0 ? "positive" : "negative"}">
                ${t.priceAdjustment > 0 ? "+" : ""}${m(t.priceAdjustment, this._currencySymbol)}
              </span>
            ` : c}
      </button>
    `;
  }
  // ============================================
  // Shipping Selection View
  // ============================================
  _renderShippingSelectionView() {
    const e = this._pendingShippingSelection;
    if (!e) return c;
    const t = e.variant, i = t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName, s = e.addons.reduce((n, r) => n + r.priceAdjustment, 0), a = t.price + s;
    return o`
      <umb-body-layout headline="Select Shipping">
        <div id="main">
          <div class="shipping-product-summary">
            <div class="product-info">
              <strong>${i}</strong>
              ${t.sku ? o`<span class="sku">${t.sku}</span>` : c}
              <div class="warehouse-info">
                <uui-icon name="icon-home"></uui-icon>
                ${e.warehouseName}
              </div>
            </div>
            <div class="product-pricing">
              <span class="total-price">${m(a, this._currencySymbol)}</span>
            </div>
          </div>

          ${e.isLoadingOptions ? o`<div class="loading"><uui-loader></uui-loader></div>` : e.shippingOptions.length === 0 ? o`<div class="no-options">No shipping options available for this destination.</div>` : o`
                  <div class="shipping-options">
                    ${e.shippingOptions.map((n) => this._renderShippingOption(n))}
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
    const t = this._selectedShippingOptionId === e.id;
    return o`
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
          ${e.estimatedCost !== null ? o`
                <span class="cost">${m(e.estimatedCost, this._currencySymbol)}</span>
                ${e.isEstimate ? o`<span class="estimate-label">est.</span>` : c}
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
d.styles = k`
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
  h()
], d.prototype, "_searchTerm", 2);
p([
  h()
], d.prototype, "_page", 2);
p([
  h()
], d.prototype, "_pageSize", 2);
p([
  h()
], d.prototype, "_totalPages", 2);
p([
  h()
], d.prototype, "_isLoading", 2);
p([
  h()
], d.prototype, "_errorMessage", 2);
p([
  h()
], d.prototype, "_productRoots", 2);
p([
  h()
], d.prototype, "_selections", 2);
p([
  h()
], d.prototype, "_viewState", 2);
p([
  h()
], d.prototype, "_pendingAddonSelection", 2);
p([
  h()
], d.prototype, "_selectedAddons", 2);
p([
  h()
], d.prototype, "_pendingShippingSelection", 2);
p([
  h()
], d.prototype, "_selectedShippingOptionId", 2);
d = p([
  w("merchello-product-picker-modal")
], d);
const F = d;
export {
  d as MerchelloProductPickerModalElement,
  F as default
};
//# sourceMappingURL=product-picker-modal.element-DC6NqONH.js.map
