import { LitElement as h, html as d, css as b, state as s, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as g } from "@umbraco-cms/backoffice/element-api";
import { I as l } from "./order.types-FU1fblt8.js";
import { M as p } from "./merchello-api-BlCaCKcg.js";
import { c as m, a as _ } from "./formatting-Cgl2aCEX.js";
var f = Object.defineProperty, y = Object.getOwnPropertyDescriptor, r = (e, t, i, n) => {
  for (var o = n > 1 ? void 0 : n ? y(t, i) : t, c = e.length - 1, u; c >= 0; c--)
    (u = e[c]) && (o = (n ? u(t, i, o) : u(o)) || o);
  return n && o && f(t, i, o), o;
};
let a = class extends g(h) {
  constructor() {
    super(...arguments), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadOrders(), this._loadStats();
  }
  async _loadOrders() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc"
    };
    this._activeTab === "unfulfilled" ? e.fulfillmentStatus = "unfulfilled" : this._activeTab === "unpaid" && (e.paymentStatus = "unpaid");
    const { data: t, error: i } = await p.getOrders(e);
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
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
  _handleSelectAll(e) {
    e.target.checked ? this._selectedOrders = new Set(this._orders.map((i) => i.id)) : this._selectedOrders = /* @__PURE__ */ new Set(), this.requestUpdate();
  }
  _handleSelectOrder(e, t) {
    t.target.checked ? this._selectedOrders.add(e) : this._selectedOrders.delete(e), this.requestUpdate();
  }
  _getPaymentStatusBadgeClass(e) {
    switch (e) {
      case l.Paid:
        return "paid";
      case l.PartiallyPaid:
        return "partial";
      case l.Refunded:
      case l.PartiallyRefunded:
        return "refunded";
      case l.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _getOrderHref(e) {
    return `section/merchello/workspace/merchello-order/edit/${e}`;
  }
  _renderLoadingState() {
    return d`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return d`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return d`
      <div class="empty-state">
        <uui-icon name="icon-receipt-dollar"></uui-icon>
        <h3>No orders found</h3>
        <p>Orders will appear here once customers place them.</p>
      </div>
    `;
  }
  _renderOrdersTable() {
    return d`
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
      (e) => d`
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
                  <td>${m(e.dateCreated)}</td>
                  <td>${e.customerName}</td>
                  <td>${e.channel}</td>
                  <td>${_(e.total)}</td>
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
      <div class="pagination">
        <span>
          ${(this._page - 1) * this._pageSize + 1}-${Math.min(this._page * this._pageSize, this._totalItems)} of ${this._totalItems}
        </span>
        <div class="pagination-controls">
          <button
            ?disabled=${this._page === 1}
            @click=${() => {
      this._page--, this._loadOrders();
    }}
          >
            &lt;
          </button>
          <button
            ?disabled=${this._page >= this._totalPages}
            @click=${() => {
      this._page++, this._loadOrders();
    }}
          >
            &gt;
          </button>
        </div>
      </div>
    `;
  }
  _renderOrdersContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    return d`
      <div class="orders-container">
        <!-- Header -->
        <div class="orders-header">
          <h1>Orders</h1>
          <div class="header-actions">
            <uui-button look="secondary" label="Export">Export</uui-button>
            <uui-button look="secondary" label="More actions">More actions</uui-button>
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

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
      </div>
    `;
  }
};
a.styles = b`
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

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
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

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
      font-size: 0.875rem;
    }

    .pagination-controls {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .pagination-controls button {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
    }

    .pagination-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
r([
  s()
], a.prototype, "_orders", 2);
r([
  s()
], a.prototype, "_isLoading", 2);
r([
  s()
], a.prototype, "_errorMessage", 2);
r([
  s()
], a.prototype, "_page", 2);
r([
  s()
], a.prototype, "_pageSize", 2);
r([
  s()
], a.prototype, "_totalItems", 2);
r([
  s()
], a.prototype, "_totalPages", 2);
r([
  s()
], a.prototype, "_activeTab", 2);
r([
  s()
], a.prototype, "_selectedOrders", 2);
r([
  s()
], a.prototype, "_stats", 2);
a = r([
  v("merchello-orders-list")
], a);
const S = a;
export {
  a as MerchelloOrdersListElement,
  S as default
};
//# sourceMappingURL=orders-list.element-DYG4Tx1f.js.map
