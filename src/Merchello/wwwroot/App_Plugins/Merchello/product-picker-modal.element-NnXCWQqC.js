import { LitElement as P, html as r, nothing as d, css as $, property as f, customElement as w, state as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as y } from "./merchello-api-s-9cx0Ue.js";
import { c as R } from "./formatting-BzzWJIvp.js";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
function b(e, t) {
  return `${t}${R(e, 2)}`;
}
function I(e, t, a) {
  return e === null && t === null ? "N/A" : e === t || t === null ? b(e ?? 0, a) : e === null ? b(t, a) : `${b(e, a)} - ${b(t, a)}`;
}
function E(e) {
  return e.name ? e.name : null;
}
function T(e, t) {
  return e.images.length > 0 && !e.excludeRootProductImages ? e.images[0] : !e.excludeRootProductImages && t.length > 0 ? t[0] : e.images.length > 0 ? e.images[0] : null;
}
var N = Object.defineProperty, D = Object.getOwnPropertyDescriptor, x = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? D(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (s ? n(t, a, i) : n(i)) || i);
  return s && i && N(t, a, i), i;
};
let m = class extends C(P) {
  constructor() {
    super(...arguments), this.selected = !1, this.currencySymbol = "£";
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
    return this.variant.imageUrl ? r`<img src="${this.variant.imageUrl}" alt="${this.variant.name ?? ""}" class="variant-image" />` : r`
      <div class="variant-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderName() {
    const e = this.variant.optionValuesDisplay ?? this.variant.name ?? "Default";
    return r`<span class="variant-name">${e}</span>`;
  }
  _renderSku() {
    return this.variant.sku ? r`<span class="variant-sku">${this.variant.sku}</span>` : d;
  }
  _renderPrice() {
    return r`<span class="variant-price">${b(this.variant.price, this.currencySymbol)}</span>`;
  }
  _renderStockStatus() {
    return this.variant.trackStock ? this.variant.availableStock <= 0 ? r`<span class="status blocked">Out of stock</span>` : this.variant.availableStock <= 5 ? r`<span class="status warning">Low: ${this.variant.availableStock}</span>` : r`<span class="status available">${this.variant.availableStock} in stock</span>` : r`<span class="status available">Available</span>`;
  }
  _renderRegionStatus() {
    return this.variant.canShipToRegion ? d : r`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
  }
  _renderBlockedReason() {
    return !this.variant.canSelect && this.variant.blockedReason ? r`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      ` : d;
  }
  render() {
    const e = !this.variant.canSelect;
    return r`
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

        ${this._renderImage()}

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
m.styles = $`
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
x([
  f({ type: Object })
], m.prototype, "variant", 2);
x([
  f({ type: Boolean })
], m.prototype, "selected", 2);
x([
  f({ type: String })
], m.prototype, "currencySymbol", 2);
m = x([
  w("merchello-product-picker-variant-row")
], m);
var M = Object.defineProperty, O = Object.getOwnPropertyDescriptor, S = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? O(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (s ? n(t, a, i) : n(i)) || i);
  return s && i && M(t, a, i), i;
};
let v = class extends C(P) {
  constructor() {
    super(...arguments), this.productRoots = [], this.selectedIds = [], this.currencySymbol = "£";
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
    return e ? r`<img src="${e}" alt="${t}" class="product-image" />` : r`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderPriceRange(e) {
    return I(e.minPrice, e.maxPrice, this.currencySymbol);
  }
  _renderStockBadge(e) {
    return e.isDigitalProduct ? r`<span class="badge digital">Digital</span>` : e.totalStock <= 0 ? r`<span class="badge out-of-stock">Out of stock</span>` : e.totalStock <= 5 ? r`<span class="badge low-stock">Low: ${e.totalStock}</span>` : r`<span class="badge in-stock">${e.totalStock} in stock</span>`;
  }
  _renderExpandIcon(e) {
    return r`
      <uui-icon name=${e ? "icon-navigation-down" : "icon-navigation-right"} class="expand-icon"></uui-icon>
    `;
  }
  _renderProductRoot(e) {
    const t = e.variantCount === 1;
    return r`
      <div class="product-root ${e.isExpanded ? "expanded" : ""}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(e)}
          aria-expanded=${e.isExpanded}
        >
          ${t ? r`<div class="expand-spacer"></div>` : this._renderExpandIcon(e.isExpanded)}
          ${this._renderProductImage(e.imageUrl, e.rootName)}
          <div class="product-info">
            <div class="product-name">${e.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(e)}</span>
              ${t ? d : r`<span class="variant-count">${e.variantCount} variants</span>`}
              ${this._renderStockBadge(e)}
            </div>
          </div>
        </button>

        ${e.isExpanded && e.variantsLoaded ? r`
              <div class="variants-container">
                ${e.variants.map(
      (a) => r`
                    <merchello-product-picker-variant-row
                      .variant=${a}
                      .selected=${this.selectedIds.includes(a.id)}
                      .currencySymbol=${this.currencySymbol}
                      @select=${() => this._handleVariantSelect(a)}
                    ></merchello-product-picker-variant-row>
                  `
    )}
              </div>
            ` : d}

        ${e.isExpanded && !e.variantsLoaded ? r`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : d}
      </div>
    `;
  }
  render() {
    return this.productRoots.length === 0 ? r`<div class="empty">No products to display</div>` : r`
      <div class="product-list">
        ${this.productRoots.map((e) => this._renderProductRoot(e))}
      </div>
    `;
  }
};
v.styles = $`
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

    .variants-loading {
      padding: var(--uui-size-space-3);
      padding-left: calc(0.75rem + var(--uui-size-space-3) + 40px + var(--uui-size-space-3));
    }

    .empty {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
    }
  `;
S([
  f({ type: Array })
], v.prototype, "productRoots", 2);
S([
  f({ type: Array })
], v.prototype, "selectedIds", 2);
S([
  f({ type: String })
], v.prototype, "currencySymbol", 2);
v = S([
  w("merchello-product-picker-list")
], v);
var V = Object.defineProperty, j = Object.getOwnPropertyDescriptor, u = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? j(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (s ? n(t, a, i) : n(i)) || i);
  return s && i && V(t, a, i), i;
};
let l = class extends z {
  constructor() {
    super(...arguments), this._searchTerm = "", this._page = 1, this._pageSize = 20, this._totalPages = 0, this._isLoading = !0, this._errorMessage = null, this._productRoots = [], this._selections = /* @__PURE__ */ new Map(), this._regionCache = {
      destinations: /* @__PURE__ */ new Map(),
      regions: /* @__PURE__ */ new Map()
    }, this._searchDebounceTimer = null;
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
    const { data: t, error: a } = await y.getProducts(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    if (t) {
      const s = this._excludeProductIds;
      this._productRoots = t.items.filter((i) => !s.includes(i.productRootId)).map((i) => this._mapToPickerRoot(i)), this._totalPages = t.totalPages;
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
      isDigitalProduct: e.isDigitalProduct,
      isExpanded: !1,
      variantsLoaded: !1,
      variants: []
    };
  }
  async _loadVariantsForRoot(e) {
    const t = this._productRoots.findIndex((o) => o.id === e);
    if (t === -1) return;
    const { data: a, error: s } = await y.getProductDetail(e);
    if (s || !a) {
      console.error("Failed to load product variants:", s);
      return;
    }
    const i = await Promise.all(
      a.variants.map(async (o) => this._mapToPickerVariant(o, a))
    );
    this._productRoots = this._productRoots.map(
      (o, n) => n === t ? { ...o, variants: i, variantsLoaded: !0 } : o
    );
  }
  async _mapToPickerVariant(e, t) {
    const a = e.warehouseStock.reduce((c, _) => _.trackStock ? c + Math.max(0, _.stock) : c + 999999, 0), s = e.warehouseStock.some((c) => c.trackStock);
    let i = !0, o = null, n = null, h = null;
    if (this._config?.shippingAddress && !t.isDigitalProduct) {
      const c = await this._checkRegionEligibility(e.warehouseStock);
      i = c.canShip, o = c.message, n = c.warehouseId, h = c.warehouseName;
    } else if (e.warehouseStock.length > 0) {
      const c = e.warehouseStock.find((_) => !_.trackStock || _.stock > 0);
      c && (n = c.warehouseId, h = c.warehouseName);
    }
    let g = !0, k = null;
    return s && a <= 0 && (g = !1, k = "Out of stock"), g && !i && (g = !1, k = "Cannot ship to region"), g && !e.availableForPurchase && (g = !1, k = "Not available for purchase"), {
      id: e.id,
      productRootId: t.id,
      name: e.name,
      rootName: t.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: T(e, t.rootImages),
      optionValuesDisplay: E(e),
      canSelect: g,
      blockedReason: k,
      availableStock: a,
      trackStock: s,
      canShipToRegion: i,
      regionMessage: o,
      fulfillingWarehouseId: n,
      fulfillingWarehouseName: h,
      warehouseStock: e.warehouseStock
    };
  }
  // ============================================
  // Region Validation
  // ============================================
  async _checkRegionEligibility(e) {
    const t = this._config?.shippingAddress;
    if (!t)
      return { canShip: !0, warehouseId: null, warehouseName: null, message: null };
    for (const a of e) {
      if (a.trackStock && a.stock <= 0) continue;
      if (await this._canWarehouseServeRegion(a.warehouseId, t.countryCode, t.stateCode))
        return { canShip: !0, warehouseId: a.warehouseId, warehouseName: a.warehouseName, message: null };
    }
    return {
      canShip: !1,
      warehouseId: null,
      warehouseName: null,
      message: `Cannot ship to ${t.countryCode}`
    };
  }
  async _canWarehouseServeRegion(e, t, a) {
    if (!this._regionCache.destinations.has(e)) {
      const { data: n } = await y.getAvailableDestinationsForWarehouse(e);
      n ? this._regionCache.destinations.set(e, new Set(n.map((h) => h.code))) : this._regionCache.destinations.set(e, /* @__PURE__ */ new Set());
    }
    if (!this._regionCache.destinations.get(e).has(t))
      return !1;
    if (!a)
      return !0;
    const i = `${e}:${t}`;
    if (!this._regionCache.regions.has(i)) {
      const { data: n } = await y.getAvailableRegionsForWarehouse(e, t);
      n && n.length > 0 ? this._regionCache.regions.set(i, new Set(n.map((h) => h.regionCode))) : this._regionCache.regions.set(i, null);
    }
    const o = this._regionCache.regions.get(i);
    return o == null ? !0 : o.has(a);
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
    const t = this._productRoots.find((a) => a.id === e);
    t && (t.variantsLoaded || await this._loadVariantsForRoot(e), this._productRoots = this._productRoots.map(
      (a) => a.id === e ? { ...a, isExpanded: !a.isExpanded } : a
    ));
  }
  _handleVariantSelect(e) {
    if (!e.canSelect) return;
    const t = {
      productId: e.id,
      productRootId: e.productRootId,
      name: e.optionValuesDisplay ? `${e.rootName} - ${e.optionValuesDisplay}` : e.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: e.imageUrl,
      warehouseId: e.fulfillingWarehouseId ?? "",
      warehouseName: e.fulfillingWarehouseName ?? ""
    };
    this._selections.has(e.id) ? this._selections.delete(e.id) : this._selections.set(e.id, t), this._selections = new Map(this._selections);
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
    return r`
      <div class="search-container">
        <uui-input
          type="text"
          placeholder="Search by name or SKU..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search products"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? r`
                <uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : d}
        </uui-input>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error">${this._errorMessage}</div>` : this._productRoots.length === 0 ? r`
        <div class="empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>No products found</p>
        </div>
      ` : r`
      <merchello-product-picker-list
        .productRoots=${this._productRoots}
        .selectedIds=${Array.from(this._selections.keys())}
        .currencySymbol=${this._currencySymbol}
        @toggle-expand=${(e) => this._handleToggleExpand(e.detail.rootId)}
        @variant-select=${(e) => this._handleVariantSelect(e.detail.variant)}
      ></merchello-product-picker-list>
      ${this._renderPagination()}
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? d : r`
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
    return e === 0 ? r`<span class="selection-count">No products selected</span>` : r`<span class="selection-count">${e} product${e === 1 ? "" : "s"} selected</span>`;
  }
  render() {
    return r`
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
l.styles = $`
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
  `;
u([
  p()
], l.prototype, "_searchTerm", 2);
u([
  p()
], l.prototype, "_page", 2);
u([
  p()
], l.prototype, "_pageSize", 2);
u([
  p()
], l.prototype, "_totalPages", 2);
u([
  p()
], l.prototype, "_isLoading", 2);
u([
  p()
], l.prototype, "_errorMessage", 2);
u([
  p()
], l.prototype, "_productRoots", 2);
u([
  p()
], l.prototype, "_selections", 2);
l = u([
  w("merchello-product-picker-modal")
], l);
const F = l;
export {
  l as MerchelloProductPickerModalElement,
  F as default
};
//# sourceMappingURL=product-picker-modal.element-NnXCWQqC.js.map
