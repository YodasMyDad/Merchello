import { LitElement as m, nothing as w, html as n, css as _, property as f, customElement as x, state as l } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { I as u } from "./order.types-FU1fblt8.js";
import { M as p } from "./merchello-api-DudNt7x5.js";
import { c as $, a as k } from "./formatting-B7Ourlxi.js";
function z(e) {
  if (e.totalItems === 0)
    return "0 items";
  const t = (e.page - 1) * e.pageSize + 1, a = Math.min(e.page * e.pageSize, e.totalItems);
  return `${t}-${a} of ${e.totalItems}`;
}
function b(e) {
  return e.page > 1;
}
function v(e) {
  return e.page < e.totalPages;
}
var O = Object.defineProperty, S = Object.getOwnPropertyDescriptor, g = (e, t, a, o) => {
  for (var s = o > 1 ? void 0 : o ? S(t, a) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (o ? c(t, a, s) : c(s)) || s);
  return o && s && O(t, a, s), s;
};
let h = class extends y(m) {
  constructor() {
    super(...arguments), this.state = {
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0
    }, this.disabled = !1;
  }
  _handlePrevious() {
    b(this.state) && !this.disabled && this._dispatchPageChange(this.state.page - 1);
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
      return w;
    const e = b(this.state), t = v(this.state);
    return n`
      <div class="pagination">
        <span class="pagination-info">${z(this.state)}</span>
        <div class="pagination-controls">
          <button
            class="pagination-button"
            ?disabled=${!e || this.disabled}
            @click=${this._handlePrevious}
            aria-label="Previous page"
            title="Previous page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <span class="pagination-page">${this.state.page} / ${this.state.totalPages}</span>
          <button
            class="pagination-button"
            ?disabled=${!t || this.disabled}
            @click=${this._handleNext}
            aria-label="Next page"
            title="Next page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,6 15,12 9,18" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
};
h.styles = _`
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
  f({ type: Object })
], h.prototype, "state", 2);
g([
  f({ type: Boolean })
], h.prototype, "disabled", 2);
h = g([
  x("merchello-pagination")
], h);
var P = Object.defineProperty, T = Object.getOwnPropertyDescriptor, i = (e, t, a, o) => {
  for (var s = o > 1 ? void 0 : o ? T(t, a) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (o ? c(t, a, s) : c(s)) || s);
  return o && s && P(t, a, s), s;
};
let r = class extends y(m) {
  constructor() {
    super(...arguments), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null;
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
    const { data: t, error: a } = await p.getOrders(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    t && (this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
  }
  async _loadStats() {
    const { data: e } = await p.getOrderStats();
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
    const a = Array.from(this._selectedOrders), { error: o } = await p.deleteOrders(a);
    if (this._isDeleting = !1, o) {
      this._errorMessage = `Failed to delete orders: ${o.message}`;
      return;
    }
    this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
  }
  _getPaymentStatusBadgeClass(e) {
    switch (e) {
      case u.Paid:
        return "paid";
      case u.PartiallyPaid:
        return "partial";
      case u.Refunded:
      case u.PartiallyRefunded:
        return "refunded";
      case u.AwaitingPayment:
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
        <table class="orders-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  @change=${this._handleSelectAll}
                  .checked=${this._selectedOrders.size === this._orders.length && this._orders.length > 0}
                />
              </th>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Total</th>
              <th>Payment status</th>
              <th>Fulfillment status</th>
              <th>Items</th>
              <th>Delivery method</th>
            </tr>
          </thead>
          <tbody>
            ${this._orders.map(
      (e) => n`
                <tr>
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      .checked=${this._selectedOrders.has(e.id)}
                      @change=${(t) => this._handleSelectOrder(e.id, t)}
                    />
                  </td>
                  <td class="order-number">
                    <a href=${this._getOrderHref(e.id)}>${e.invoiceNumber || e.id.substring(0, 8)}</a>
                  </td>
                  <td>${$(e.dateCreated)}</td>
                  <td>${e.customerName}</td>
                  <td>${e.channel}</td>
                  <td>${k(e.total)}</td>
                  <td>
                    <span class="badge ${this._getPaymentStatusBadgeClass(e.paymentStatus)}">${e.paymentStatusDisplay}</span>
                  </td>
                  <td>
                    <span class="badge ${e.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                      ${e.fulfillmentStatus}
                    </span>
                  </td>
                  <td>${e.itemCount} item${e.itemCount !== 1 ? "s" : ""}</td>
                  <td>${e.deliveryMethod}</td>
                </tr>
              `
    )}
          </tbody>
        </table>
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
            <uui-button look="secondary" label="Export">Export</uui-button>
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
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search orders by invoice #, name, postcode, or email..."
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}
            />
            ${this._searchTerm ? n`
                  <button class="search-clear" @click=${this._handleSearchClear} aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                ` : ""}
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
r.styles = _`
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
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-box input {
      width: 100%;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      padding-left: 36px;
      padding-right: 36px;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--uui-color-interactive);
      box-shadow: 0 0 0 1px var(--uui-color-interactive);
    }

    .search-box input::placeholder {
      color: var(--uui-color-text-alt);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--uui-color-text-alt);
      pointer-events: none;
    }

    .search-clear {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--uui-color-text-alt);
      cursor: pointer;
      border-radius: 50%;
      transition: all 120ms ease;
    }

    .search-clear:hover {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-text);
    }

    .search-clear svg {
      width: 14px;
      height: 14px;
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
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .orders-table th,
    .orders-table td {
      padding: var(--uui-size-space-3);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
      white-space: nowrap;
    }

    .orders-table th {
      font-weight: 500;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .orders-table tbody tr {
      cursor: pointer;
      transition: background 0.2s;
    }

    .orders-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .checkbox-col {
      width: 40px;
    }

    .order-number {
      font-weight: 500;
      color: var(--uui-color-interactive);
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
i([
  l()
], r.prototype, "_orders", 2);
i([
  l()
], r.prototype, "_isLoading", 2);
i([
  l()
], r.prototype, "_errorMessage", 2);
i([
  l()
], r.prototype, "_page", 2);
i([
  l()
], r.prototype, "_pageSize", 2);
i([
  l()
], r.prototype, "_totalItems", 2);
i([
  l()
], r.prototype, "_totalPages", 2);
i([
  l()
], r.prototype, "_activeTab", 2);
i([
  l()
], r.prototype, "_selectedOrders", 2);
i([
  l()
], r.prototype, "_stats", 2);
i([
  l()
], r.prototype, "_searchTerm", 2);
i([
  l()
], r.prototype, "_isDeleting", 2);
r = i([
  x("merchello-orders-list")
], r);
const L = r;
export {
  r as MerchelloOrdersListElement,
  L as default
};
//# sourceMappingURL=orders-list.element-D_RYfRBu.js.map
