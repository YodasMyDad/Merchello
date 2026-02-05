import { LitElement as b, html as l, css as f, state as s, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as T, UMB_MODAL_MANAGER_CONTEXT as C } from "@umbraco-cms/backoffice/modal";
import { M as _ } from "./merchello-api-DkRa4ImO.js";
import { g as k } from "./store-settings-OD4RRJ1x.js";
import { b as w } from "./navigation-Bu0pwyW2.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./product-table.element-BI-fydXR.js";
const I = new T("Merchello.CreateProduct.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var x = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, v = (t) => {
  throw TypeError(t);
}, i = (t, e, o, n) => {
  for (var r = n > 1 ? void 0 : n ? $(e, o) : e, h = t.length - 1, p; h >= 0; h--)
    (p = t[h]) && (r = (n ? p(e, o, r) : p(r)) || r);
  return n && r && x(e, o, r), r;
}, y = (t, e, o) => e.has(t) || v("Cannot " + o), d = (t, e, o) => (y(t, e, "read from private field"), e.get(t)), m = (t, e, o) => e.has(t) ? v("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, o), g = (t, e, o, n) => (y(t, e, "write to private field"), e.set(t, o), o), u, c;
let a = class extends P(b) {
  constructor() {
    super(), this._products = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._selectedProducts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._productTypeId = "", this._collectionId = "", this._availability = "all", this._stockStatus = "all", this._productTypes = [], this._collections = [], this._searchDebounceTimer = null, m(this, u), m(this, c, !1), this._tableColumns = ["select", "warnings", "rootName", "sku", "price", "purchaseable", "variants"], this.consumeContext(C, (t) => {
      g(this, u, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, c, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const t = await k();
    d(this, c) && (this._pageSize = t.defaultPaginationPageSize, this._loadFilterOptions(), this._loadProducts());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, c, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadFilterOptions() {
    const [t, e] = await Promise.all([
      _.getProductTypes(),
      _.getProductCollections()
    ]);
    d(this, c) && (t.data && (this._productTypes = t.data), e.data && (this._collections = e.data));
  }
  async _loadProducts() {
    this._isLoading = !0, this._errorMessage = null;
    const t = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "name",
      sortDir: "asc"
    };
    this._searchTerm.trim() && (t.search = this._searchTerm.trim()), this._productTypeId && (t.productTypeId = this._productTypeId), this._collectionId && (t.collectionId = this._collectionId), this._availability !== "all" && (t.availability = this._availability), this._stockStatus !== "all" && (t.stockStatus = this._stockStatus);
    const { data: e, error: o } = await _.getProducts(t);
    if (d(this, c)) {
      if (o) {
        this._errorMessage = o.message, this._isLoading = !1;
        return;
      }
      e && (this._products = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages), this._isLoading = !1;
    }
  }
  _handleSearchInput(t) {
    const e = t.target;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = e.value, this._page = 1, this._loadProducts();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadProducts();
  }
  _handleProductTypeChange(t) {
    this._productTypeId = t.target.value, this._page = 1, this._loadProducts();
  }
  _handleCollectionChange(t) {
    this._collectionId = t.target.value, this._page = 1, this._loadProducts();
  }
  _handleAvailabilityChange(t) {
    this._availability = t.target.value, this._page = 1, this._loadProducts();
  }
  _handleStockStatusChange(t) {
    this._stockStatus = t.target.value, this._page = 1, this._loadProducts();
  }
  _handlePageChange(t) {
    this._page = t.detail.page, this._loadProducts();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleSelectionChange(t) {
    this._selectedProducts = new Set(t.detail.selectedIds), this.requestUpdate();
  }
  async _handleAddProduct() {
    const e = await d(this, u)?.open(this, I, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    e?.isCreated && e.productId && w(e.productId);
  }
  _getProductTypeOptions() {
    return [
      { name: "All Types", value: "", selected: this._productTypeId === "" },
      ...this._productTypes.map((t) => ({ name: t.name, value: t.id, selected: this._productTypeId === t.id }))
    ];
  }
  _getCollectionOptions() {
    return [
      { name: "All Collections", value: "", selected: this._collectionId === "" },
      ...this._collections.map((t) => ({ name: t.name, value: t.id, selected: this._collectionId === t.id }))
    ];
  }
  _getAvailabilityOptions() {
    return [
      { name: "All", value: "all", selected: this._availability === "all" },
      { name: "Available", value: "available", selected: this._availability === "available" },
      { name: "Unavailable", value: "unavailable", selected: this._availability === "unavailable" }
    ];
  }
  _getStockStatusOptions() {
    return [
      { name: "All Stock", value: "all", selected: this._stockStatus === "all" },
      { name: "In Stock", value: "in-stock", selected: this._stockStatus === "in-stock" },
      { name: "Low Stock", value: "low-stock", selected: this._stockStatus === "low-stock" },
      { name: "Out of Stock", value: "out-of-stock", selected: this._stockStatus === "out-of-stock" }
    ];
  }
  _renderLoadingState() {
    return l`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return l`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return l`
      <merchello-empty-state icon="icon-box" headline="No products found"
        message="Products will appear here once you add them to your catalog.">
      </merchello-empty-state>
    `;
  }
  _renderProductsTable() {
    return l`
      <merchello-product-table
        .products=${this._products}
        .columns=${this._tableColumns}
        .selectable=${!0}
        .selectedIds=${Array.from(this._selectedProducts)}
        @selection-change=${this._handleSelectionChange}
      ></merchello-product-table>
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderProductsContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._products.length === 0 ? this._renderEmptyState() : this._renderProductsTable();
  }
  render() {
    return l`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="products-container">
          <div class="header-actions">
            ${this._selectedProducts.size > 0 ? l`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>` : ""}
            <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
          </div>
          <div class="filters-row">
            <div class="search-box">
              <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                @input=${this._handleSearchInput} label="Search products">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? l`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>` : ""}
              </uui-input>
            </div>
            <div class="filter-dropdowns">
              <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
              <uui-select label="Collection" .options=${this._getCollectionOptions()} @change=${this._handleCollectionChange}></uui-select>
              <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>
              <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>
            </div>
          </div>
          ${this._renderProductsContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
a.styles = f`
    :host { display: block; height: 100%; background: var(--uui-color-background); }
    .products-container { max-width: 100%; padding: var(--uui-size-layout-1); }
    .header-actions { display: flex; gap: var(--uui-size-space-2); align-items: center; justify-content: flex-end; margin-bottom: var(--uui-size-space-4); }
    .filters-row { display: flex; flex-direction: column; gap: var(--uui-size-space-3); margin-bottom: var(--uui-size-space-4); }
    @media (min-width: 768px) { .filters-row { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
    .search-box { flex: 1; max-width: 300px; }
    .search-box uui-input { width: 100%; }
    .search-box uui-icon[slot="prepend"] { color: var(--uui-color-text-alt); }
    .filter-dropdowns { display: flex; gap: var(--uui-size-space-2); flex-wrap: wrap; }
    .filter-dropdowns uui-select { min-width: 140px; }
    .loading { display: flex; justify-content: center; padding: var(--uui-size-space-6); }
    .error { padding: var(--uui-size-space-4); background: var(--uui-color-danger-standalone); color: var(--uui-color-danger-contrast); border-radius: var(--uui-border-radius); }
    merchello-pagination { padding: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); }
  `;
i([
  s()
], a.prototype, "_products", 2);
i([
  s()
], a.prototype, "_isLoading", 2);
i([
  s()
], a.prototype, "_errorMessage", 2);
i([
  s()
], a.prototype, "_page", 2);
i([
  s()
], a.prototype, "_pageSize", 2);
i([
  s()
], a.prototype, "_totalItems", 2);
i([
  s()
], a.prototype, "_totalPages", 2);
i([
  s()
], a.prototype, "_selectedProducts", 2);
i([
  s()
], a.prototype, "_searchTerm", 2);
i([
  s()
], a.prototype, "_productTypeId", 2);
i([
  s()
], a.prototype, "_collectionId", 2);
i([
  s()
], a.prototype, "_availability", 2);
i([
  s()
], a.prototype, "_stockStatus", 2);
i([
  s()
], a.prototype, "_productTypes", 2);
i([
  s()
], a.prototype, "_collections", 2);
a = i([
  S("merchello-products-list")
], a);
const N = a;
export {
  a as MerchelloProductsListElement,
  N as default
};
//# sourceMappingURL=products-list.element-CVkD3PR6.js.map
