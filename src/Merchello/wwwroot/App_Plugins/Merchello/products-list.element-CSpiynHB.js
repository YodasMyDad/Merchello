import { LitElement as y, nothing as v, html as r, css as f, property as h, state as l, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as $, UMB_MODAL_MANAGER_CONTEXT as C } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-gshzVGsw.js";
import { a as T, b as O } from "./navigation-D1KCp5wk.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { a as m } from "./formatting-DJ1nSxNW.js";
import { b as I } from "./badge.styles-C_lNgH9O.js";
const A = new $("Merchello.CreateProduct.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), E = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  stock: "Stock",
  variants: "Variants",
  warnings: ""
}, M = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "stock",
  "variants"
];
var D = Object.defineProperty, z = Object.getOwnPropertyDescriptor, k = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? z(t, a) : t, c = e.length - 1, u; c >= 0; c--)
    (u = e[c]) && (i = (s ? u(t, a, i) : u(i)) || i);
  return s && i && D(t, a, i), i;
};
let g = class extends P(y) {
  constructor() {
    super(...arguments), this.warnings = [], this._isOpen = !1;
  }
  _getSeverity() {
    return this.warnings.length === 0 ? "none" : this.warnings.some((e) => e.type === "error") ? "error" : "warning";
  }
  _getIcon() {
    return this._getSeverity() === "error" ? "icon-delete" : "icon-alert";
  }
  _handleMouseEnter() {
    this._isOpen = !0;
  }
  _handleMouseLeave() {
    this._isOpen = !1;
  }
  _handleClick() {
    this._isOpen = !this._isOpen;
  }
  _handleKeyDown(e) {
    e.key === "Enter" || e.key === " " ? (e.preventDefault(), this._isOpen = !this._isOpen) : e.key === "Escape" && (this._isOpen = !1);
  }
  _renderPopover() {
    return !this._isOpen || this.warnings.length === 0 ? v : r`
      <div class="popover">
        <div class="popover-arrow"></div>
        <div class="popover-content">
          <ul class="warning-list">
            ${this.warnings.map(
      (e) => r`
                <li class="warning-item ${e.type}">
                  <uui-icon name="${e.type === "error" ? "icon-delete" : "icon-alert"}"></uui-icon>
                  <span>${e.message}</span>
                </li>
              `
    )}
          </ul>
        </div>
      </div>
    `;
  }
  render() {
    const e = this._getSeverity();
    return e === "none" ? v : r`
      <div
        class="warning-trigger ${e}"
        tabindex="0"
        role="button"
        aria-label="${this.warnings.length} issue${this.warnings.length > 1 ? "s" : ""}"
        aria-expanded="${this._isOpen}"
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}>
        <uui-icon name="${this._getIcon()}"></uui-icon>
        ${this._renderPopover()}
      </div>
    `;
  }
};
g.styles = f`
    :host {
      display: inline-block;
      position: relative;
    }

    .warning-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease;
    }

    .warning-trigger:hover {
      transform: scale(1.1);
    }

    .warning-trigger:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .warning-trigger.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .warning-trigger.warning {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .warning-trigger uui-icon {
      font-size: 0.875rem;
    }

    .popover {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 220px;
      max-width: 300px;
    }

    .popover-arrow {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--uui-color-surface);
    }

    .popover-content {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
      padding: var(--uui-size-space-3);
    }

    .warning-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .warning-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .warning-item uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-item.error uui-icon {
      color: var(--uui-color-danger);
    }

    .warning-item.warning uui-icon {
      color: var(--uui-color-warning);
    }

    .warning-item span {
      color: var(--uui-color-text);
    }
  `;
k([
  h({ type: Array })
], g.prototype, "warnings", 2);
k([
  l()
], g.prototype, "_isOpen", 2);
g = k([
  w("merchello-warning-popover")
], g);
var L = Object.defineProperty, N = Object.getOwnPropertyDescriptor, p = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? N(t, a) : t, c = e.length - 1, u; c >= 0; c--)
    (u = e[c]) && (i = (s ? u(t, a, i) : u(i)) || i);
  return s && i && L(t, a, i), i;
};
let d = class extends P(y) {
  constructor() {
    super(...arguments), this.products = [], this.columns = [...M], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("rootName") || e.unshift("rootName"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const a = e.target.checked ? this.products.map((s) => s.id) : [];
    this._dispatchSelectionChange(a);
  }
  _handleSelectProduct(e, t) {
    t.stopPropagation();
    const s = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((i) => i !== e);
    this._dispatchSelectionChange(s);
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
    return e === "select" ? r`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox aria-label="Select all" @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.products.length && this.products.length > 0}></uui-checkbox>
        </uui-table-head-cell>
      ` : r`<uui-table-head-cell>${E[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return r`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox aria-label="Select ${e.rootName}" ?checked=${this.selectedIds.includes(e.id)}
              @change=${(a) => this._handleSelectProduct(e.id, a)}
              @click=${(a) => a.stopPropagation()}></uui-checkbox>
          </uui-table-cell>
        `;
      case "rootName":
        return r`<uui-table-cell class="product-name"><a href=${T(e.productRootId)}>${e.rootName}</a></uui-table-cell>`;
      case "sku":
        return r`<uui-table-cell>${e.sku ?? "-"}</uui-table-cell>`;
      case "price":
        return r`<uui-table-cell>${this._formatPriceRange(e)}</uui-table-cell>`;
      case "purchaseable":
        return r`<uui-table-cell><span class="badge ${e.purchaseable ? "badge-positive" : "badge-danger"}">${e.purchaseable ? "Available" : "Unavailable"}</span></uui-table-cell>`;
      case "stock":
        return r`<uui-table-cell><span class="badge ${this._getStockBadgeClass(e.totalStock)}">${e.totalStock}</span></uui-table-cell>`;
      case "variants":
        return r`<uui-table-cell><span class="badge badge-default">${e.variantCount}</span></uui-table-cell>`;
      case "warnings":
        return this._renderWarningsCell(e);
      default:
        return v;
    }
  }
  _getProductWarnings(e) {
    const t = [];
    return e.isDigitalProduct || (e.hasWarehouse || t.push({
      type: "error",
      message: "No warehouse assigned. This product cannot be fulfilled."
    }), e.hasWarehouse && !e.hasShippingOptions && t.push({
      type: "warning",
      message: "No shipping options configured for assigned warehouses."
    })), t;
  }
  _renderWarningsCell(e) {
    const t = this._getProductWarnings(e);
    return r`
      <uui-table-cell class="warnings-col">
        <merchello-warning-popover .warnings=${t}></merchello-warning-popover>
      </uui-table-cell>
    `;
  }
  _getStockBadgeClass(e) {
    return e <= 0 ? "badge-danger" : e <= 10 ? "badge-warning" : "badge-positive";
  }
  _formatPriceRange(e) {
    return e.minPrice != null && e.maxPrice != null && e.minPrice !== e.maxPrice ? `${m(e.minPrice)} - ${m(e.maxPrice)}` : m(e.price);
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return r`
      <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${() => this._handleRowClick(e)}>
        ${t.map((a) => this._renderCell(e, a))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return r`
      <div class="table-container">
        <uui-table class="product-table">
          <uui-table-head>${e.map((t) => this._renderHeaderCell(t))}</uui-table-head>
          ${this.products.map((t) => this._renderRow(t))}
        </uui-table>
      </div>
    `;
  }
};
d.styles = [
  I,
  f`
      :host { display: block; }
      .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
      .product-table { width: 100%; }
      uui-table-head-cell, uui-table-cell { white-space: nowrap; }
      uui-table-row.clickable { cursor: pointer; }
      uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }
      .checkbox-col { width: 40px; }
      .warnings-col { width: 40px; text-align: center; }
      .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }
      .product-name a:hover { text-decoration: underline; }
    `
];
p([
  h({ type: Array })
], d.prototype, "products", 2);
p([
  h({ type: Array })
], d.prototype, "columns", 2);
p([
  h({ type: Boolean })
], d.prototype, "selectable", 2);
p([
  h({ type: Array })
], d.prototype, "selectedIds", 2);
p([
  h({ type: Boolean })
], d.prototype, "clickable", 2);
d = p([
  w("merchello-product-table")
], d);
var R = Object.defineProperty, U = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, n = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? U(t, a) : t, c = e.length - 1, u; c >= 0; c--)
    (u = e[c]) && (i = (s ? u(t, a, i) : u(i)) || i);
  return s && i && R(t, a, i), i;
}, x = (e, t, a) => t.has(e) || S("Cannot " + a), W = (e, t, a) => (x(e, t, "read from private field"), t.get(e)), B = (e, t, a) => t.has(e) ? S("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), j = (e, t, a, s) => (x(e, t, "write to private field"), t.set(e, a), a), _;
let o = class extends P(y) {
  constructor() {
    super(), this._products = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._selectedProducts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._productTypeId = "", this._categoryId = "", this._availability = "all", this._stockStatus = "all", this._productTypes = [], this._categories = [], this._searchDebounceTimer = null, B(this, _), this._tableColumns = ["select", "warnings", "rootName", "sku", "price", "purchaseable", "stock", "variants"], this.consumeContext(C, (e) => {
      j(this, _, e);
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
      b.getProductTypes(),
      b.getProductCategories()
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
    const { data: t, error: a } = await b.getProducts(e);
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
    const t = await W(this, _)?.open(this, A, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    t?.created && t.productId && O(t.productId);
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
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return r`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return r`
      <merchello-empty-state icon="icon-box" headline="No products found"
        message="Products will appear here once you add them to your catalog.">
      </merchello-empty-state>
    `;
  }
  _renderProductsTable() {
    return r`
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
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="products-container">
          <div class="header-actions">
            ${this._selectedProducts.size > 0 ? r`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>` : ""}
            <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
          </div>
          <div class="filters-row">
            <div class="search-box">
              <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                @input=${this._handleSearchInput} label="Search products">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? r`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
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
o.styles = f`
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
n([
  l()
], o.prototype, "_products", 2);
n([
  l()
], o.prototype, "_isLoading", 2);
n([
  l()
], o.prototype, "_errorMessage", 2);
n([
  l()
], o.prototype, "_page", 2);
n([
  l()
], o.prototype, "_pageSize", 2);
n([
  l()
], o.prototype, "_totalItems", 2);
n([
  l()
], o.prototype, "_totalPages", 2);
n([
  l()
], o.prototype, "_selectedProducts", 2);
n([
  l()
], o.prototype, "_searchTerm", 2);
n([
  l()
], o.prototype, "_productTypeId", 2);
n([
  l()
], o.prototype, "_categoryId", 2);
n([
  l()
], o.prototype, "_availability", 2);
n([
  l()
], o.prototype, "_stockStatus", 2);
n([
  l()
], o.prototype, "_productTypes", 2);
n([
  l()
], o.prototype, "_categories", 2);
o = n([
  w("merchello-products-list")
], o);
const Y = o;
export {
  o as MerchelloProductsListElement,
  Y as default
};
//# sourceMappingURL=products-list.element-CSpiynHB.js.map
