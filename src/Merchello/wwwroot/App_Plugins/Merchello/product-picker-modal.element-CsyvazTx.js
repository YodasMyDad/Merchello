import { LitElement as A, html as a, nothing as c, css as x, property as g, customElement as $, state as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as w } from "./merchello-api-s-9cx0Ue.js";
import { c as C } from "./formatting-BzzWJIvp.js";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
function h(e, t) {
  return `${t}${C(e, 2)}`;
}
function I(e, t, i) {
  return e === null && t === null ? "N/A" : e === t || t === null ? h(e ?? 0, i) : e === null ? h(t, i) : `${h(e, i)} - ${h(t, i)}`;
}
function R(e) {
  return e.name ? e.name : null;
}
function N(e, t) {
  return e.images.length > 0 && !e.excludeRootProductImages ? e.images[0] : !e.excludeRootProductImages && t.length > 0 ? t[0] : e.images.length > 0 ? e.images[0] : null;
}
var D = Object.defineProperty, M = Object.getOwnPropertyDescriptor, y = (e, t, i, s) => {
  for (var o = s > 1 ? void 0 : s ? M(t, i) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (o = (s ? n(t, i, o) : n(o)) || o);
  return s && o && D(t, i, o), o;
};
let v = class extends P(A) {
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
    return this.variant.imageUrl ? a`<img src="${this.variant.imageUrl}" alt="${this.variant.name ?? ""}" class="variant-image" />` : a`
      <div class="variant-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderName() {
    const e = this.variant.optionValuesDisplay ?? this.variant.name ?? "Default";
    return a`<span class="variant-name">${e}</span>`;
  }
  _renderSku() {
    return this.variant.sku ? a`<span class="variant-sku">${this.variant.sku}</span>` : c;
  }
  _renderPrice() {
    return a`<span class="variant-price">${h(this.variant.price, this.currencySymbol)}</span>`;
  }
  _renderStockStatus() {
    return this.variant.trackStock ? this.variant.availableStock <= 0 ? a`<span class="status blocked">Out of stock</span>` : this.variant.availableStock <= 5 ? a`<span class="status warning">Low: ${this.variant.availableStock}</span>` : a`<span class="status available">${this.variant.availableStock} in stock</span>` : a`<span class="status available">Available</span>`;
  }
  _renderRegionStatus() {
    return this.variant.canShipToRegion ? c : a`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
  }
  _renderBlockedReason() {
    return !this.variant.canSelect && this.variant.blockedReason ? a`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      ` : c;
  }
  render() {
    const e = !this.variant.canSelect;
    return a`
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
v.styles = x`
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
  g({ type: Object })
], v.prototype, "variant", 2);
y([
  g({ type: Boolean })
], v.prototype, "selected", 2);
y([
  g({ type: String })
], v.prototype, "currencySymbol", 2);
y([
  g({ type: Boolean })
], v.prototype, "showImage", 2);
v = y([
  $("merchello-product-picker-variant-row")
], v);
var T = Object.defineProperty, E = Object.getOwnPropertyDescriptor, k = (e, t, i, s) => {
  for (var o = s > 1 ? void 0 : s ? E(t, i) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (o = (s ? n(t, i, o) : n(o)) || o);
  return s && o && T(t, i, o), o;
};
let f = class extends P(A) {
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
    return e ? a`<img src="${e}" alt="${t}" class="product-image" />` : a`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }
  _renderPriceRange(e) {
    return I(e.minPrice, e.maxPrice, this.currencySymbol);
  }
  _renderStockBadge(e) {
    return e.isDigitalProduct ? a`<span class="badge digital">Digital</span>` : e.totalStock <= 0 ? a`<span class="badge out-of-stock">Out of stock</span>` : e.totalStock <= 5 ? a`<span class="badge low-stock">Low: ${e.totalStock}</span>` : a`<span class="badge in-stock">${e.totalStock} in stock</span>`;
  }
  _renderExpandIcon(e) {
    return a`
      <uui-icon name=${e ? "icon-navigation-down" : "icon-navigation-right"} class="expand-icon"></uui-icon>
    `;
  }
  _renderProductRoot(e) {
    const t = e.variantCount === 1;
    return a`
      <div class="product-root ${e.isExpanded ? "expanded" : ""} ${this.showImages ? "" : "no-images"}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(e)}
          aria-expanded=${e.isExpanded}
        >
          ${t ? a`<div class="expand-spacer"></div>` : this._renderExpandIcon(e.isExpanded)}
          ${this.showImages ? this._renderProductImage(e.imageUrl, e.rootName) : c}
          <div class="product-info">
            <div class="product-name">${e.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(e)}</span>
              ${t ? c : a`<span class="variant-count">${e.variantCount} variants</span>`}
              ${this._renderStockBadge(e)}
            </div>
          </div>
        </button>

        ${e.isExpanded && e.variantsLoaded ? a`
              <div class="variants-container ${this.showImages ? "" : "no-images"}">
                ${e.variants.map(
      (i) => a`
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

        ${e.isExpanded && !e.variantsLoaded ? a`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : c}
      </div>
    `;
  }
  render() {
    return this.productRoots.length === 0 ? a`<div class="empty">No products to display</div>` : a`
      <div class="product-list">
        ${this.productRoots.map((e) => this._renderProductRoot(e))}
      </div>
    `;
  }
};
f.styles = x`
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
  g({ type: Array })
], f.prototype, "productRoots", 2);
k([
  g({ type: Array })
], f.prototype, "selectedIds", 2);
k([
  g({ type: String })
], f.prototype, "currencySymbol", 2);
k([
  g({ type: Boolean })
], f.prototype, "showImages", 2);
f = k([
  $("merchello-product-picker-list")
], f);
var j = Object.defineProperty, O = Object.getOwnPropertyDescriptor, u = (e, t, i, s) => {
  for (var o = s > 1 ? void 0 : s ? O(t, i) : t, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (o = (s ? n(t, i, o) : n(o)) || o);
  return s && o && j(t, i, o), o;
};
let d = class extends z {
  constructor() {
    super(...arguments), this._searchTerm = "", this._page = 1, this._pageSize = 20, this._totalPages = 0, this._isLoading = !0, this._errorMessage = null, this._productRoots = [], this._selections = /* @__PURE__ */ new Map(), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map(), this._productDetailCache = /* @__PURE__ */ new Map(), this._regionCache = {
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
    const { data: t, error: i } = await w.getProducts(e);
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
      return;
    }
    if (t) {
      const s = this._excludeProductIds;
      this._productRoots = t.items.filter((o) => !s.includes(o.productRootId)).map((o) => this._mapToPickerRoot(o)), this._totalPages = t.totalPages;
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
    const t = this._productRoots.findIndex((r) => r.id === e);
    if (t === -1) return;
    const { data: i, error: s } = await w.getProductDetail(e);
    if (s || !i) {
      console.error("Failed to load product variants:", s);
      return;
    }
    this._productDetailCache.set(e, i);
    const o = await Promise.all(
      i.variants.map(async (r) => this._mapToPickerVariant(r, i))
    );
    this._productRoots = this._productRoots.map(
      (r, n) => n === t ? { ...r, variants: o, variantsLoaded: !0 } : r
    );
  }
  async _mapToPickerVariant(e, t) {
    const i = e.warehouseStock.reduce((l, b) => b.trackStock ? l + Math.max(0, b.stock) : l + 999999, 0), s = e.warehouseStock.some((l) => l.trackStock);
    let o = !0, r = null, n = null, m = null;
    if (this._config?.shippingAddress && !t.isDigitalProduct) {
      const l = await this._checkRegionEligibility(e.warehouseStock);
      o = l.canShip, r = l.message, n = l.warehouseId, m = l.warehouseName;
    } else if (e.warehouseStock.length > 0) {
      const l = e.warehouseStock.find((b) => !b.trackStock || b.stock > 0);
      l && (n = l.warehouseId, m = l.warehouseName);
    }
    let _ = !0, S = null;
    return s && i <= 0 && (_ = !1, S = "Out of stock"), _ && !o && (_ = !1, S = "Cannot ship to region"), _ && !e.availableForPurchase && (_ = !1, S = "Not available for purchase"), {
      id: e.id,
      productRootId: t.id,
      name: e.name,
      rootName: t.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: N(e, t.rootImages),
      optionValuesDisplay: R(e),
      canSelect: _,
      blockedReason: S,
      availableStock: i,
      trackStock: s,
      canShipToRegion: o,
      regionMessage: r,
      fulfillingWarehouseId: n,
      fulfillingWarehouseName: m,
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
    for (const i of e) {
      if (i.trackStock && i.stock <= 0) continue;
      if (await this._canWarehouseServeRegion(i.warehouseId, t.countryCode, t.stateCode))
        return { canShip: !0, warehouseId: i.warehouseId, warehouseName: i.warehouseName, message: null };
    }
    return {
      canShip: !1,
      warehouseId: null,
      warehouseName: null,
      message: `Cannot ship to ${t.countryCode}`
    };
  }
  async _canWarehouseServeRegion(e, t, i) {
    if (!this._regionCache.destinations.has(e)) {
      const { data: n } = await w.getAvailableDestinationsForWarehouse(e);
      n ? this._regionCache.destinations.set(e, new Set(n.map((m) => m.code))) : this._regionCache.destinations.set(e, /* @__PURE__ */ new Set());
    }
    if (!this._regionCache.destinations.get(e).has(t))
      return !1;
    if (!i)
      return !0;
    const o = `${e}:${t}`;
    if (!this._regionCache.regions.has(o)) {
      const { data: n } = await w.getAvailableRegionsForWarehouse(e, t);
      n && n.length > 0 ? this._regionCache.regions.set(o, new Set(n.map((m) => m.regionCode))) : this._regionCache.regions.set(o, null);
    }
    const r = this._regionCache.regions.get(o);
    return r == null ? !0 : r.has(i);
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
      this._addSelectionWithAddons(e, []);
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
  _addSelectionWithAddons(e, t) {
    const i = {
      productId: e.id,
      productRootId: e.productRootId,
      name: e.optionValuesDisplay ? `${e.rootName} - ${e.optionValuesDisplay}` : e.rootName,
      sku: e.sku,
      price: e.price,
      imageUrl: e.imageUrl,
      warehouseId: e.fulfillingWarehouseId ?? "",
      warehouseName: e.fulfillingWarehouseName ?? "",
      selectedAddons: t.length > 0 ? t : void 0
    };
    this._selections.set(e.id, i), this._selections = new Map(this._selections);
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
    this._pendingAddonSelection && (this._addSelectionWithAddons(this._pendingAddonSelection.variant, []), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map());
  }
  _handleConfirmWithAddons() {
    if (!this._pendingAddonSelection) return;
    const e = Array.from(this._selectedAddons.values());
    this._addSelectionWithAddons(this._pendingAddonSelection.variant, e), this._viewState = "product-selection", this._pendingAddonSelection = null, this._selectedAddons = /* @__PURE__ */ new Map();
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
    return a`
      <div class="search-container">
        <uui-input
          type="text"
          placeholder="Search by name or SKU..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search products"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? a`
                <uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : c}
        </uui-input>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? a`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? a`<div class="error">${this._errorMessage}</div>` : this._productRoots.length === 0 ? a`
        <div class="empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>No products found</p>
        </div>
      ` : a`
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
    return this._totalPages <= 1 ? c : a`
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
    return e === 0 ? a`<span class="selection-count">No products selected</span>` : a`<span class="selection-count">${e} product${e === 1 ? "" : "s"} selected</span>`;
  }
  // ============================================
  // Add-on Selection View
  // ============================================
  _renderAddonSelectionView() {
    const e = this._pendingAddonSelection;
    if (!e) return c;
    const t = e.variant, i = t.optionValuesDisplay ? `${t.rootName} - ${t.optionValuesDisplay}` : t.rootName, s = Array.from(this._selectedAddons.values()).reduce(
      (r, n) => r + n.priceAdjustment,
      0
    ), o = t.price + s;
    return a`
      <umb-body-layout headline="Select Add-ons (Optional)">
        <div id="main">
          <div class="addon-product-summary">
            <div class="product-info">
              <strong>${i}</strong>
              ${t.sku ? a`<span class="sku">${t.sku}</span>` : c}
            </div>
            <div class="product-pricing">
              <span class="base-price">${h(t.price, this._currencySymbol)}</span>
              ${s !== 0 ? a`
                    <span class="addon-total">
                      ${s > 0 ? "+" : ""}${h(s, this._currencySymbol)}
                    </span>
                    <span class="total-price">= ${h(o, this._currencySymbol)}</span>
                  ` : c}
            </div>
          </div>

          <div class="addon-options">
            ${e.addonOptions.map((r) => this._renderAddonOption(r))}
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
            Add to Order
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderAddonOption(e) {
    const t = this._selectedAddons.get(e.id);
    return a`
      <div class="addon-option">
        <div class="addon-option-header">
          <span class="addon-option-name">${e.name}</span>
          <span class="addon-optional">(optional)</span>
          ${t ? a`
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
    return a`
      <button
        type="button"
        class="addon-value-button ${i ? "selected" : ""}"
        @click=${() => this._handleAddonSelect(e.id, e.name, t)}
      >
        <span class="value-name">${t.name}</span>
        ${t.priceAdjustment !== 0 ? a`
              <span class="value-price ${t.priceAdjustment > 0 ? "positive" : "negative"}">
                ${t.priceAdjustment > 0 ? "+" : ""}${h(t.priceAdjustment, this._currencySymbol)}
              </span>
            ` : c}
      </button>
    `;
  }
  // ============================================
  // Main Render
  // ============================================
  render() {
    return this._viewState === "addon-selection" ? this._renderAddonSelectionView() : a`
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
d.styles = x`
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
  `;
u([
  p()
], d.prototype, "_searchTerm", 2);
u([
  p()
], d.prototype, "_page", 2);
u([
  p()
], d.prototype, "_pageSize", 2);
u([
  p()
], d.prototype, "_totalPages", 2);
u([
  p()
], d.prototype, "_isLoading", 2);
u([
  p()
], d.prototype, "_errorMessage", 2);
u([
  p()
], d.prototype, "_productRoots", 2);
u([
  p()
], d.prototype, "_selections", 2);
u([
  p()
], d.prototype, "_viewState", 2);
u([
  p()
], d.prototype, "_pendingAddonSelection", 2);
u([
  p()
], d.prototype, "_selectedAddons", 2);
d = u([
  $("merchello-product-picker-modal")
], d);
const F = d;
export {
  d as MerchelloProductPickerModalElement,
  F as default
};
//# sourceMappingURL=product-picker-modal.element-CsyvazTx.js.map
