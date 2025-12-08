import { LitElement as m, html as i, nothing as S, css as v, property as p, customElement as y, state as o } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as w } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-DuHTSXU5.js";
import { a as $, b as T } from "./navigation-D5LqjkTF.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { a as b } from "./formatting-266ZBdsy.js";
import { b as x } from "./badge.styles-C_lNgH9O.js";
const I = new C("Merchello.CreateProduct.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), A = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  stock: "Stock",
  variants: "Variants"
}, O = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "stock",
  "variants"
];
var E = Object.defineProperty, M = Object.getOwnPropertyDescriptor, h = (e, t, a, c) => {
  for (var r = c > 1 ? void 0 : c ? M(t, a) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (c ? d(t, a, r) : d(r)) || r);
  return c && r && E(t, a, r), r;
};
let u = class extends f(m) {
  constructor() {
    super(...arguments), this.products = [], this.columns = [...O], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("rootName") || e.unshift("rootName"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const a = e.target.checked ? this.products.map((c) => c.id) : [];
    this._dispatchSelectionChange(a);
  }
  _handleSelectProduct(e, t) {
    t.stopPropagation();
    const c = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((r) => r !== e);
    this._dispatchSelectionChange(c);
  }
  _dispatchSelectionChange(e) {
    this.dispatchEvent(new CustomEvent("selection-change", {
      detail: { selectedIds: e },
      bubbles: !0,
      composed: !0
    }));
  }
  _handleRowClick(e) {
    this.clickable && this.dispatchEvent(new CustomEvent("product-click", {
      detail: { productId: e.id, product: e },
      bubbles: !0,
      composed: !0
    }));
  }
  _renderHeaderCell(e) {
    return e === "select" ? i`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox aria-label="Select all" @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.products.length && this.products.length > 0}></uui-checkbox>
        </uui-table-head-cell>
      ` : i`<uui-table-head-cell>${A[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return i`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox aria-label="Select ${e.rootName}" ?checked=${this.selectedIds.includes(e.id)}
              @change=${(a) => this._handleSelectProduct(e.id, a)}
              @click=${(a) => a.stopPropagation()}></uui-checkbox>
          </uui-table-cell>
        `;
      case "rootName":
        return i`<uui-table-cell class="product-name"><a href=${$(e.id)}>${e.rootName}</a></uui-table-cell>`;
      case "sku":
        return i`<uui-table-cell>${e.sku ?? "-"}</uui-table-cell>`;
      case "price":
        return i`<uui-table-cell>${this._formatPriceRange(e)}</uui-table-cell>`;
      case "purchaseable":
        return i`<uui-table-cell><span class="badge ${e.purchaseable ? "badge-positive" : "badge-danger"}">${e.purchaseable ? "Available" : "Unavailable"}</span></uui-table-cell>`;
      case "stock":
        return i`<uui-table-cell><span class="badge ${this._getStockBadgeClass(e.totalStock)}">${e.totalStock}</span></uui-table-cell>`;
      case "variants":
        return i`<uui-table-cell><span class="badge badge-default">${e.variantCount}</span></uui-table-cell>`;
      default:
        return S;
    }
  }
  _getStockBadgeClass(e) {
    return e <= 0 ? "badge-danger" : e <= 10 ? "badge-warning" : "badge-positive";
  }
  _formatPriceRange(e) {
    return e.minPrice != null && e.maxPrice != null && e.minPrice !== e.maxPrice ? `${b(e.minPrice)} - ${b(e.maxPrice)}` : b(e.price);
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return i`
      <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${() => this._handleRowClick(e)}>
        ${t.map((a) => this._renderCell(e, a))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return i`
      <div class="table-container">
        <uui-table class="product-table">
          <uui-table-head>${e.map((t) => this._renderHeaderCell(t))}</uui-table-head>
          ${this.products.map((t) => this._renderRow(t))}
        </uui-table>
      </div>
    `;
  }
};
u.styles = [
  x,
  v`
      :host { display: block; }
      .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
      .product-table { width: 100%; }
      uui-table-head-cell, uui-table-cell { white-space: nowrap; }
      uui-table-row.clickable { cursor: pointer; }
      uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }
      .checkbox-col { width: 40px; }
      .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }
      .product-name a:hover { text-decoration: underline; }
    `
];
h([
  p({ type: Array })
], u.prototype, "products", 2);
h([
  p({ type: Array })
], u.prototype, "columns", 2);
h([
  p({ type: Boolean })
], u.prototype, "selectable", 2);
h([
  p({ type: Array })
], u.prototype, "selectedIds", 2);
h([
  p({ type: Boolean })
], u.prototype, "clickable", 2);
u = h([
  y("merchello-product-table")
], u);
var L = Object.defineProperty, D = Object.getOwnPropertyDescriptor, k = (e) => {
  throw TypeError(e);
}, l = (e, t, a, c) => {
  for (var r = c > 1 ? void 0 : c ? D(t, a) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (r = (c ? d(t, a, r) : d(r)) || r);
  return c && r && L(t, a, r), r;
}, P = (e, t, a) => t.has(e) || k("Cannot " + a), z = (e, t, a) => (P(e, t, "read from private field"), t.get(e)), R = (e, t, a) => t.has(e) ? k("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), U = (e, t, a, c) => (P(e, t, "write to private field"), t.set(e, a), a), _;
let s = class extends f(m) {
  constructor() {
    super(), this._products = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._selectedProducts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._productTypeId = "", this._categoryId = "", this._availability = "all", this._stockStatus = "all", this._productTypes = [], this._categories = [], this._searchDebounceTimer = null, R(this, _), this._tableColumns = ["select", "rootName", "sku", "price", "purchaseable", "stock", "variants"], this.consumeContext(w, (e) => {
      U(this, _, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadFilterOptions(), this._loadProducts();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadFilterOptions() {
    const [e, t] = await Promise.all([
      g.getProductTypes(),
      g.getProductCategories()
    ]);
    e.data && (this._productTypes = e.data), t.data && (this._categories = t.data);
  }
  async _loadProducts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "name",
      sortDir: "asc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._productTypeId && (e.productTypeId = this._productTypeId), this._categoryId && (e.categoryId = this._categoryId), this._availability !== "all" && (e.availability = this._availability), this._stockStatus !== "all" && (e.stockStatus = this._stockStatus);
    const { data: t, error: a } = await g.getProducts(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    t && (this._products = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
  }
  _handleSearchInput(e) {
    const t = e.target;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = t.value, this._page = 1, this._loadProducts();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadProducts();
  }
  _handleProductTypeChange(e) {
    this._productTypeId = e.target.value, this._page = 1, this._loadProducts();
  }
  _handleCategoryChange(e) {
    this._categoryId = e.target.value, this._page = 1, this._loadProducts();
  }
  _handleAvailabilityChange(e) {
    this._availability = e.target.value, this._page = 1, this._loadProducts();
  }
  _handleStockStatusChange(e) {
    this._stockStatus = e.target.value, this._page = 1, this._loadProducts();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadProducts();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleSelectionChange(e) {
    this._selectedProducts = new Set(e.detail.selectedIds), this.requestUpdate();
  }
  async _handleAddProduct() {
    const t = await z(this, _)?.open(this, I, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    t?.created && t.productId && T(t.productId);
  }
  _getProductTypeOptions() {
    return [
      { name: "All Types", value: "", selected: this._productTypeId === "" },
      ...this._productTypes.map((e) => ({ name: e.name, value: e.id, selected: this._productTypeId === e.id }))
    ];
  }
  _getCategoryOptions() {
    return [
      { name: "All Categories", value: "", selected: this._categoryId === "" },
      ...this._categories.map((e) => ({ name: e.name, value: e.id, selected: this._categoryId === e.id }))
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
    return i`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return i`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return i`
      <merchello-empty-state icon="icon-box" headline="No products found"
        message="Products will appear here once you add them to your catalog.">
      </merchello-empty-state>
    `;
  }
  _renderProductsTable() {
    return i`
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
    return i`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="products-container">
          <div class="header-actions">
            ${this._selectedProducts.size > 0 ? i`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>` : ""}
            <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
          </div>
          <div class="filters-row">
            <div class="search-box">
              <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                @input=${this._handleSearchInput} label="Search products">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? i`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>` : ""}
              </uui-input>
            </div>
            <div class="filter-dropdowns">
              <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
              <uui-select label="Category" .options=${this._getCategoryOptions()} @change=${this._handleCategoryChange}></uui-select>
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
_ = /* @__PURE__ */ new WeakMap();
s.styles = v`
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
    .error { padding: var(--uui-size-space-4); background: #f8d7da; color: #721c24; border-radius: var(--uui-border-radius); }
    merchello-pagination { padding: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); }
  `;
l([
  o()
], s.prototype, "_products", 2);
l([
  o()
], s.prototype, "_isLoading", 2);
l([
  o()
], s.prototype, "_errorMessage", 2);
l([
  o()
], s.prototype, "_page", 2);
l([
  o()
], s.prototype, "_pageSize", 2);
l([
  o()
], s.prototype, "_totalItems", 2);
l([
  o()
], s.prototype, "_totalPages", 2);
l([
  o()
], s.prototype, "_selectedProducts", 2);
l([
  o()
], s.prototype, "_searchTerm", 2);
l([
  o()
], s.prototype, "_productTypeId", 2);
l([
  o()
], s.prototype, "_categoryId", 2);
l([
  o()
], s.prototype, "_availability", 2);
l([
  o()
], s.prototype, "_stockStatus", 2);
l([
  o()
], s.prototype, "_productTypes", 2);
l([
  o()
], s.prototype, "_categories", 2);
s = l([
  y("merchello-products-list")
], s);
const V = s;
export {
  s as MerchelloProductsListElement,
  V as default
};
//# sourceMappingURL=products-list.element-R293UV9z.js.map
