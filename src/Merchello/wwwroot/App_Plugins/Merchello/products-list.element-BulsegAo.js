import { LitElement as k, html as l, css as T, state as o, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as I } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as w, UMB_MODAL_MANAGER_CONTEXT as $, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as x } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-Dp_zU_yi.js";
import { g as D } from "./store-settings-CHgA9WE7.js";
import { b } from "./navigation-CvTcY6zJ.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./product-table.element-jy4QLp4j.js";
const M = new w("Merchello.CreateProduct.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var O = Object.defineProperty, z = Object.getOwnPropertyDescriptor, f = (t) => {
  throw TypeError(t);
}, s = (t, e, a, d) => {
  for (var r = d > 1 ? void 0 : d ? z(e, a) : e, p = t.length - 1, u; p >= 0; p--)
    (u = t[p]) && (r = (d ? u(e, a, r) : u(r)) || r);
  return d && r && O(e, a, r), r;
}, P = (t, e, a) => e.has(t) || f("Cannot " + a), c = (t, e, a) => (P(t, e, "read from private field"), e.get(t)), v = (t, e, a) => e.has(t) ? f("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), y = (t, e, a, d) => (P(t, e, "write to private field"), e.set(t, a), a), g, _, n;
let i = class extends I(k) {
  constructor() {
    super(), this._products = [], this._isLoading = !0, this._isDeleting = !1, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._selectedProducts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._productTypeId = "", this._collectionId = "", this._availability = "all", this._stockStatus = "all", this._productTypes = [], this._collections = [], this._searchDebounceTimer = null, v(this, g), v(this, _), v(this, n, !1), this._tableColumns = ["select", "warnings", "rootName", "sku", "price", "purchaseable", "variants"], this.consumeContext($, (t) => {
      y(this, g, t);
    }), this.consumeContext(x, (t) => {
      y(this, _, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), y(this, n, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const t = await D();
    c(this, n) && (this._pageSize = t.defaultPaginationPageSize, this._loadFilterOptions(), this._loadProducts());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), y(this, n, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadFilterOptions() {
    const [t, e] = await Promise.all([
      m.getProductTypes(),
      m.getProductCollections()
    ]);
    c(this, n) && (t.data && (this._productTypes = t.data), e.data && (this._collections = e.data));
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
    const { data: e, error: a } = await m.getProducts(t);
    if (c(this, n)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      if (e) {
        this._products = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages;
        const d = new Set(e.items.map((r) => r.id));
        this._selectedProducts = new Set(
          Array.from(this._selectedProducts).filter((r) => d.has(r))
        );
      }
      this._isLoading = !1;
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
  _handleProductClick(t) {
    const e = t.detail.product.productRootId || t.detail.productId;
    e && b(e);
  }
  _hasActiveFilters() {
    return !!(this._searchTerm.trim() || this._productTypeId || this._collectionId || this._availability !== "all" || this._stockStatus !== "all");
  }
  _handleResetFilters() {
    this._searchTerm = "", this._productTypeId = "", this._collectionId = "", this._availability = "all", this._stockStatus = "all", this._page = 1, this._selectedProducts = /* @__PURE__ */ new Set(), this._loadProducts();
  }
  async _handleDeleteSelected() {
    const t = this._selectedProducts.size;
    if (t === 0) return;
    const e = c(this, g)?.open(this, A, {
      data: {
        headline: "Delete Products",
        content: `Delete ${t} product${t === 1 ? "" : "s"}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    if (!c(this, n)) return;
    this._isDeleting = !0;
    const a = Array.from(this._selectedProducts), d = new Map(this._products.map((h) => [h.id, h])), r = a.map((h) => d.get(h)?.productRootId ?? h);
    let p = 0, u = 0;
    for (const h of r) {
      const { error: S } = await m.deleteProduct(h);
      if (!c(this, n)) return;
      S ? u++ : p++;
    }
    if (this._isDeleting = !1, u === t) {
      c(this, _)?.peek("danger", {
        data: {
          headline: "Failed to delete products",
          message: "No selected products could be deleted."
        }
      });
      return;
    }
    u > 0 ? c(this, _)?.peek("warning", {
      data: {
        headline: "Partial success",
        message: `Deleted ${p} of ${t} selected products.`
      }
    }) : c(this, _)?.peek("positive", {
      data: {
        headline: "Products deleted",
        message: `${t} product${t === 1 ? "" : "s"} deleted successfully.`
      }
    }), this._selectedProducts = /* @__PURE__ */ new Set(), await this._loadProducts();
  }
  async _handleAddProduct() {
    const e = await c(this, g)?.open(this, M, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    e?.isCreated && e.productId && b(e.productId);
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
    return l`<div class="error" role="alert">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    const t = this._hasActiveFilters();
    return l`
      <merchello-empty-state
        icon="icon-box"
        headline=${t ? "No matching products" : "No products found"}
        message=${t ? "Try adjusting your filters to see more results." : "Products will appear here once you add them to your catalog."}>
        ${t ? l`
              <uui-button slot="actions" look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
                Reset filters
              </uui-button>
            ` : l`
              <uui-button slot="actions" look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>
                Add Product
              </uui-button>
            `}
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
        @product-click=${this._handleProductClick}
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
            ${this._selectedProducts.size > 0 ? l`
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Delete products"
                    ?disabled=${this._isDeleting}
                    @click=${this._handleDeleteSelected}>
                    ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedProducts.size})`}
                  </uui-button>
                ` : ""}
            <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
          </div>
          <div class="filters-row">
            <div class="search-box">
              <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                @input=${this._handleSearchInput} label="Search products">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? l`<uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>` : ""}
              </uui-input>
            </div>
            <div class="filter-dropdowns">
              <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
              <uui-select label="Collection" .options=${this._getCollectionOptions()} @change=${this._handleCollectionChange}></uui-select>
              <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>
              <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>
              ${this._hasActiveFilters() ? l`
                    <uui-button look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
                      Reset
                    </uui-button>
                  ` : ""}
            </div>
          </div>
          ${this._renderProductsContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
g = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
i.styles = T`
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
    .filter-dropdowns uui-button { align-self: stretch; }
    .loading { display: flex; justify-content: center; padding: var(--uui-size-space-6); }
    .error { padding: var(--uui-size-space-4); background: var(--uui-color-danger-standalone); color: var(--uui-color-danger-contrast); border-radius: var(--uui-border-radius); }
    merchello-pagination { padding: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); }
  `;
s([
  o()
], i.prototype, "_products", 2);
s([
  o()
], i.prototype, "_isLoading", 2);
s([
  o()
], i.prototype, "_isDeleting", 2);
s([
  o()
], i.prototype, "_errorMessage", 2);
s([
  o()
], i.prototype, "_page", 2);
s([
  o()
], i.prototype, "_pageSize", 2);
s([
  o()
], i.prototype, "_totalItems", 2);
s([
  o()
], i.prototype, "_totalPages", 2);
s([
  o()
], i.prototype, "_selectedProducts", 2);
s([
  o()
], i.prototype, "_searchTerm", 2);
s([
  o()
], i.prototype, "_productTypeId", 2);
s([
  o()
], i.prototype, "_collectionId", 2);
s([
  o()
], i.prototype, "_availability", 2);
s([
  o()
], i.prototype, "_stockStatus", 2);
s([
  o()
], i.prototype, "_productTypes", 2);
s([
  o()
], i.prototype, "_collections", 2);
i = s([
  C("merchello-products-list")
], i);
const X = i;
export {
  i as MerchelloProductsListElement,
  X as default
};
//# sourceMappingURL=products-list.element-BulsegAo.js.map
