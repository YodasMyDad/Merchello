import { LitElement as f, nothing as k, html as n, css as y, property as x, customElement as $, state as o } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { I as c } from "./order.types-DjkMLpgj.js";
import { M as b } from "./merchello-api-eSCXsudl.js";
import { c as P, a as C } from "./formatting-c8l-daf7.js";
function D(e) {
  if (e.totalItems === 0)
    return "0 items";
  const t = (e.page - 1) * e.pageSize + 1, a = Math.min(e.page * e.pageSize, e.totalItems);
  return `${t}-${a} of ${e.totalItems}`;
}
function m(e) {
  return e.page > 1;
}
function v(e) {
  return e.page < e.totalPages;
}
var M = Object.defineProperty, E = Object.getOwnPropertyDescriptor, g = (e, t, a, s) => {
  for (var r = s > 1 ? void 0 : s ? E(t, a) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (r = (s ? d(t, a, r) : d(r)) || r);
  return s && r && M(t, a, r), r;
};
let p = class extends O(f) {
  constructor() {
    super(...arguments), this.state = {
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0
    }, this.disabled = !1;
  }
  _handlePrevious() {
    m(this.state) && !this.disabled && this._dispatchPageChange(this.state.page - 1);
  }
  _handleNext() {
    v(this.state) && !this.disabled && this._dispatchPageChange(this.state.page + 1);
  }
  _dispatchPageChange(e) {
    const t = { page: e };
    this.dispatchEvent(
      new CustomEvent("page-change", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    if (this.state.totalItems === 0)
      return k;
    const e = m(this.state), t = v(this.state);
    return n`
      <div class="pagination">
        <span class="pagination-info">${D(this.state)}</span>
        <div class="pagination-controls">
          <uui-button
            look="secondary"
            compact
            ?disabled=${!e || this.disabled}
            @click=${this._handlePrevious}
            label="Previous page"
            title="Previous page"
          >
            <uui-icon name="icon-navigation-left"></uui-icon>
          </uui-button>
          <span class="pagination-page">${this.state.page} / ${this.state.totalPages}</span>
          <uui-button
            look="secondary"
            compact
            ?disabled=${!t || this.disabled}
            @click=${this._handleNext}
            label="Next page"
            title="Next page"
          >
            <uui-icon name="icon-navigation-right"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
};
p.styles = y`
    :host {
      display: block;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-3) 0;
    }

    .pagination-info {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .pagination-page {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
      min-width: 60px;
      text-align: center;
    }

    .pagination-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .pagination-button:hover:not(:disabled) {
      background: var(--uui-color-surface-emphasis);
      border-color: var(--uui-color-border-emphasis);
    }

    .pagination-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-button svg {
      width: 16px;
      height: 16px;
    }
  `;
g([
  x({ type: Object })
], p.prototype, "state", 2);
g([
  x({ type: Boolean })
], p.prototype, "disabled", 2);
p = g([
  $("merchello-pagination")
], p);
const I = new z("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var L = Object.defineProperty, A = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, l = (e, t, a, s) => {
  for (var r = s > 1 ? void 0 : s ? A(t, a) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (r = (s ? d(t, a, r) : d(r)) || r);
  return s && r && L(t, a, r), r;
}, S = (e, t, a) => t.has(e) || w("Cannot " + a), _ = (e, t, a) => (S(e, t, "read from private field"), t.get(e)), N = (e, t, a) => t.has(e) ? w("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), R = (e, t, a, s) => (S(e, t, "write to private field"), t.set(e, a), a), h;
let i = class extends O(f) {
  constructor() {
    super(), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, N(this, h), this.consumeContext(T, (e) => {
      R(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadOrders(), this._loadStats();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadOrders() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "unfulfilled" ? e.fulfillmentStatus = "unfulfilled" : this._activeTab === "unpaid" && (e.paymentStatus = "unpaid");
    const { data: t, error: a } = await b.getOrders(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    t && (this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
  }
  async _loadStats() {
    const { data: e } = await b.getOrderStats();
    e && (this._stats = e);
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadOrders();
  }
  _handleSearchInput(e) {
    const a = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = a, this._page = 1, this._loadOrders();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadOrders();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadOrders();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleSelectAll(e) {
    e.target.checked ? this._selectedOrders = new Set(this._orders.map((a) => a.id)) : this._selectedOrders = /* @__PURE__ */ new Set(), this.requestUpdate();
  }
  _handleSelectOrder(e, t) {
    t.target.checked ? this._selectedOrders.add(e) : this._selectedOrders.delete(e), this.requestUpdate();
  }
  async _handleDeleteSelected() {
    const e = this._selectedOrders.size;
    if (e === 0 || !confirm(
      `Are you sure you want to delete ${e} order${e !== 1 ? "s" : ""}? This action cannot be undone.`
    )) return;
    this._isDeleting = !0;
    const a = Array.from(this._selectedOrders), { error: s } = await b.deleteOrders(a);
    if (this._isDeleting = !1, s) {
      this._errorMessage = `Failed to delete orders: ${s.message}`;
      return;
    }
    this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
  }
  async _handleExport() {
    _(this, h) && _(this, h).open(this, I, {
      data: {}
    });
  }
  _getPaymentStatusBadgeClass(e) {
    switch (e) {
      case c.Paid:
        return "paid";
      case c.PartiallyPaid:
        return "partial";
      case c.Refunded:
      case c.PartiallyRefunded:
        return "refunded";
      case c.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _getOrderHref(e) {
    return `section/merchello/workspace/merchello-order/edit/${e}`;
  }
  _renderLoadingState() {
    return n`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return n`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return n`
      <div class="empty-state">
        <uui-icon name="icon-receipt-dollar"></uui-icon>
        <h3>No orders found</h3>
        <p>Orders will appear here once customers place them.</p>
      </div>
    `;
  }
  _renderOrdersTable() {
    return n`
      <div class="table-container">
        <uui-table class="orders-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                aria-label="Select all orders"
                @change=${this._handleSelectAll}
                ?checked=${this._selectedOrders.size === this._orders.length && this._orders.length > 0}
              ></uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Order</uui-table-head-cell>
            <uui-table-head-cell>Date</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Channel</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Payment status</uui-table-head-cell>
            <uui-table-head-cell>Fulfillment status</uui-table-head-cell>
            <uui-table-head-cell>Items</uui-table-head-cell>
            <uui-table-head-cell>Delivery method</uui-table-head-cell>
          </uui-table-head>
          ${this._orders.map(
      (e) => n`
              <uui-table-row>
                <uui-table-cell class="checkbox-col">
                  <uui-checkbox
                    aria-label="Select order ${e.invoiceNumber || e.id}"
                    ?checked=${this._selectedOrders.has(e.id)}
                    @change=${(t) => this._handleSelectOrder(e.id, t)}
                  ></uui-checkbox>
                </uui-table-cell>
                <uui-table-cell class="order-number">
                  <a href=${this._getOrderHref(e.id)}>${e.invoiceNumber || e.id.substring(0, 8)}</a>
                </uui-table-cell>
                <uui-table-cell>${P(e.dateCreated)}</uui-table-cell>
                <uui-table-cell>${e.customerName}</uui-table-cell>
                <uui-table-cell>${e.channel}</uui-table-cell>
                <uui-table-cell>${C(e.total)}</uui-table-cell>
                <uui-table-cell>
                  <span class="badge ${this._getPaymentStatusBadgeClass(e.paymentStatus)}">${e.paymentStatusDisplay}</span>
                </uui-table-cell>
                <uui-table-cell>
                  <span class="badge ${e.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                    ${e.fulfillmentStatus}
                  </span>
                </uui-table-cell>
                <uui-table-cell>${e.itemCount} item${e.itemCount !== 1 ? "s" : ""}</uui-table-cell>
                <uui-table-cell>${e.deliveryMethod}</uui-table-cell>
              </uui-table-row>
            `
    )}
        </uui-table>
      </div>

      <!-- Pagination -->
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderOrdersContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    return n`
      <div class="orders-container">
        <!-- Header -->
        <div class="orders-header">
          <h1>Orders</h1>
          <div class="header-actions">
            ${this._selectedOrders.size > 0 ? n`
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Delete"
                    ?disabled=${this._isDeleting}
                    @click=${this._handleDeleteSelected}
                  >
                    ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedOrders.size})`}
                  </uui-button>
                ` : ""}
            <uui-button look="secondary" label="Export" @click=${this._handleExport}>Export</uui-button>
            <uui-button look="primary" color="positive" label="Create order">Create order</uui-button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">Orders</div>
            <div class="stat-number">${this._stats?.ordersToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Items ordered</div>
            <div class="stat-number">${this._stats?.itemsOrderedToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders fulfilled</div>
            <div class="stat-number">${this._stats?.ordersFulfilledToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders delivered</div>
            <div class="stat-number">${this._stats?.ordersDeliveredToday ?? 0}</div>
          </div>
        </div>

        <!-- Search and Tabs Row -->
        <div class="search-tabs-row">
          <!-- Search Box -->
          <div class="search-box">
            <uui-input
              type="text"
              placeholder="Search orders by invoice #, name, postcode, or email..."
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}
              label="Search orders"
            >
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? n`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}
                    >
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : ""}
            </uui-input>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              class="tab ${this._activeTab === "all" ? "active" : ""}"
              @click=${() => this._handleTabClick("all")}
            >
              All
            </button>
            <button
              class="tab ${this._activeTab === "unfulfilled" ? "active" : ""}"
              @click=${() => this._handleTabClick("unfulfilled")}
            >
              Unfulfilled
            </button>
            <button
              class="tab ${this._activeTab === "unpaid" ? "active" : ""}"
              @click=${() => this._handleTabClick("unpaid")}
            >
              Unpaid
            </button>
          </div>
        </div>

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
i.styles = y`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-background);
    }

    .orders-container {
      max-width: 100%;
    }

    .orders-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .orders-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .stats-bar {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      overflow-x: auto;
    }

    .stat-item {
      flex: 1;
      min-width: 120px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-1);
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-number {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .search-tabs-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    @media (min-width: 768px) {
      .search-tabs-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .search-box {
      flex: 1;
      max-width: 400px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .search-box uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--uui-color-text);
    }

    .tab.active {
      color: var(--uui-color-text);
      border-bottom-color: var(--uui-color-current);
    }

    .tab.add-tab {
      font-size: 1rem;
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .orders-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    uui-table-row {
      cursor: pointer;
    }

    .checkbox-col {
      width: 40px;
    }

    .order-number a {
      font-weight: 500;
      color: var(--uui-color-interactive);
      text-decoration: none;
    }

    .order-number a:hover {
      text-decoration: underline;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.paid {
      background: #d4edda;
      color: #155724;
    }

    .badge.unpaid {
      background: #f8d7da;
      color: #721c24;
    }

    .badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .badge.unfulfilled {
      background: #fff3cd;
      color: #856404;
    }

    .badge.partial {
      background: #cce5ff;
      color: #004085;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-layout-2);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
l([
  o()
], i.prototype, "_orders", 2);
l([
  o()
], i.prototype, "_isLoading", 2);
l([
  o()
], i.prototype, "_errorMessage", 2);
l([
  o()
], i.prototype, "_page", 2);
l([
  o()
], i.prototype, "_pageSize", 2);
l([
  o()
], i.prototype, "_totalItems", 2);
l([
  o()
], i.prototype, "_totalPages", 2);
l([
  o()
], i.prototype, "_activeTab", 2);
l([
  o()
], i.prototype, "_selectedOrders", 2);
l([
  o()
], i.prototype, "_stats", 2);
l([
  o()
], i.prototype, "_searchTerm", 2);
l([
  o()
], i.prototype, "_isDeleting", 2);
i = l([
  $("merchello-orders-list")
], i);
const q = i;
export {
  i as MerchelloOrdersListElement,
  q as default
};
//# sourceMappingURL=orders-list.element-D2CEQf10.js.map
