import { LitElement as u, html as d, css as h, state as o, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import { M as v } from "./merchello-api-CdBya1Dq.js";
var m = Object.defineProperty, g = Object.getOwnPropertyDescriptor, s = (t, e, r, l) => {
  for (var i = l > 1 ? void 0 : l ? g(e, r) : e, c = t.length - 1, n; c >= 0; c--)
    (n = t[c]) && (i = (l ? n(e, r, i) : n(i)) || i);
  return l && i && m(e, r, i), i;
};
let a = class extends p(u) {
  constructor() {
    super(...arguments), this._orders = [], this._loading = !0, this._error = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set();
  }
  connectedCallback() {
    super.connectedCallback(), this._loadOrders();
  }
  async _loadOrders() {
    this._loading = !0, this._error = null;
    const t = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc"
    };
    this._activeTab === "unfulfilled" ? t.fulfillmentStatus = "unfulfilled" : this._activeTab === "unpaid" && (t.paymentStatus = "unpaid");
    const { data: e, error: r } = await v.getOrders(t);
    if (r) {
      this._error = r.message, this._loading = !1;
      return;
    }
    e && (this._orders = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages), this._loading = !1;
  }
  _handleTabClick(t) {
    this._activeTab = t, this._page = 1, this._loadOrders();
  }
  _handleSelectAll(t) {
    t.target.checked ? this._selectedOrders = new Set(this._orders.map((r) => r.id)) : this._selectedOrders = /* @__PURE__ */ new Set(), this.requestUpdate();
  }
  _handleSelectOrder(t, e) {
    e.target.checked ? this._selectedOrders.add(t) : this._selectedOrders.delete(t), this.requestUpdate();
  }
  _formatDate(t) {
    const e = new Date(t), l = Math.abs((/* @__PURE__ */ new Date()).getTime() - e.getTime()), i = Math.ceil(l / (1e3 * 60 * 60 * 24));
    return i === 0 ? `Today at ${e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : i === 1 ? `Yesterday at ${e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : i < 7 ? `${e.toLocaleDateString("en-US", { weekday: "long" })} at ${e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  _formatCurrency(t) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(t);
  }
  _getOrderHref(t) {
    return `section/merchello/workspace/merchello-order/edit/${t}`;
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
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Items ordered</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Returns</div>
            <div class="stat-number">US$0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders fulfilled</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders delivered</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Order to fulfillment time</div>
            <div class="stat-number">0 --</div>
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
          <button
            class="tab ${this._activeTab === "open" ? "active" : ""}"
            @click=${() => this._handleTabClick("open")}
          >
            Open
          </button>
          <button
            class="tab ${this._activeTab === "archived" ? "active" : ""}"
            @click=${() => this._handleTabClick("archived")}
          >
            Archived
          </button>
          <button class="tab add-tab">+</button>
        </div>

        <!-- Orders Table -->
        ${this._loading ? d`<div class="loading"><uui-loader></uui-loader></div>` : this._error ? d`<div class="error">${this._error}</div>` : this._orders.length === 0 ? d`<div class="empty-state">
                  <uui-icon name="icon-receipt-dollar"></uui-icon>
                  <h3>No orders found</h3>
                  <p>Orders will appear here once customers place them.</p>
                </div>` : d`
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
                          <th>Delivery status</th>
                          <th>Delivery method</th>
                          <th>Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${this._orders.map(
      (t) => d`
                            <tr>
                              <td class="checkbox-col">
                                <input
                                  type="checkbox"
                                  .checked=${this._selectedOrders.has(t.id)}
                                  @change=${(e) => this._handleSelectOrder(t.id, e)}
                                />
                              </td>
                              <td class="order-number">
                                <a href=${this._getOrderHref(t.id)}>${t.invoiceNumber || t.id.substring(0, 8)}</a>
                              </td>
                              <td>${this._formatDate(t.dateCreated)}</td>
                              <td>${t.customerName}</td>
                              <td>${t.channel}</td>
                              <td>${this._formatCurrency(t.total)}</td>
                              <td>
                                <span class="badge ${t.paymentStatus.toLowerCase()}">${t.paymentStatus}</span>
                              </td>
                              <td>
                                <span class="badge ${t.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                                  ${t.fulfillmentStatus}
                                </span>
                              </td>
                              <td>${t.itemCount} item${t.itemCount !== 1 ? "s" : ""}</td>
                              <td>${t.deliveryStatus || "--"}</td>
                              <td>${t.deliveryMethod}</td>
                              <td>${t.tags.length > 0 ? t.tags.join(", ") : "--"}</td>
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
                `}
      </div>
    `;
  }
};
a.styles = h`
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
s([
  o()
], a.prototype, "_orders", 2);
s([
  o()
], a.prototype, "_loading", 2);
s([
  o()
], a.prototype, "_error", 2);
s([
  o()
], a.prototype, "_page", 2);
s([
  o()
], a.prototype, "_pageSize", 2);
s([
  o()
], a.prototype, "_totalItems", 2);
s([
  o()
], a.prototype, "_totalPages", 2);
s([
  o()
], a.prototype, "_activeTab", 2);
s([
  o()
], a.prototype, "_selectedOrders", 2);
a = s([
  b("merchello-orders-list")
], a);
const x = a;
export {
  a as MerchelloOrdersListElement,
  x as default
};
//# sourceMappingURL=orders-list.element-CuWfjCpD.js.map
